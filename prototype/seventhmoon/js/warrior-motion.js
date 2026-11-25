// 하르반 동작 보정. 다른 직업/AI 동료는 기존 클립과 조작을 유지한다.
// 각도 정규화는 상태 사이의 블렌드에만 적용: 클립 안의 의도된 360도 회전은 보존.
function motionMix(a, b, t) {
  const p = mix(a, b, t);
  const from = a.rr || 0, to = b.rr || 0;
  const delta = ((to - from + 180) % 360 + 360) % 360 - 180;
  p.rr = from + delta * t;
  return p;
}
function motionApproach(value, target, amount) {
  return value < target ? Math.min(target, value + amount) : Math.max(target, value - amount);
}
function harvanRollTravel(ms) {
  const t = Math.max(0, Math.min(380, ms)), tail = Math.max(0, t - 230);
  // 속도 곡선의 적분. 30/60fps 모두 약 212.7px (기존 212.8px).
  return 635 * (t / 1000 - 0.3 * tail * tail / 150000);
}
// 팔꿈치는 몸 옆에 두고 전완으로 방패를 받친다. 다른 직업의 P.stand는 바꾸지 않는다.
const HARVAN_STAND = { ...P.stand, uaf: 18, faf: -110, hf: 0 };
const harvanPose = d => ({ ...HARVAN_STAND, ...d });
const HARVAN_RELAXED_ANIMS = new Set(['idle', 'walk', 'run', 'harvan_brake']);
const HARVAN_SHIELD_RECOVERY = { hold: 600, lower: 800 };
function harvanShieldPose(p, anim, t, recoveryT) {
  if (!HARVAN_RELAXED_ANIMS.has(anim)) return p;
  const running = anim === 'run', walking = anim === 'walk', cycle = running ? 540 : walking ? 680 : 1600;
  const phase = t / cycle * Math.PI * 2;
  // 평상시에는 허리 옆으로 내려 든다. 공격·가드는 이 보정 없이 준비 자세로 바로 연결한다.
  const relaxed = { ...p, uaf: (running ? -4 : 8) + Math.sin(phase) * (running ? 4 : walking ? 5 : 1.2),
    faf: (running ? -38 : -28) + Math.cos(phase) * (running || walking ? 3 : 1.2), hf: -8 };
  if (recoveryT === undefined) return relaxed;
  const release = ease.io(Math.max(0, Math.min(1, (recoveryT - HARVAN_SHIELD_RECOVERY.hold) / HARVAN_SHIELD_RECOVERY.lower)));
  // 공격 뒤 잠깐 대비한 채 유지하고, 팔꿈치를 천천히 풀어 허리 옆으로 내린다.
  // 이동 중에도 상체 기울기 때문에 방패가 갑자기 떨어지지 않게 위팔을 보정한다.
  const readyArm = HARVAN_STAND.uaf + HARVAN_STAND.torso - (p.root || 0) - (p.torso || 0) - (p.rr || 0);
  return { ...relaxed, uaf: lerp(readyArm, relaxed.uaf, release),
    faf: lerp(HARVAN_STAND.faf, relaxed.faf, release), hf: lerp(HARVAN_STAND.hf, relaxed.hf, release) };
}
function harvanGripRig(rig) {
  const hand = rig.map.hf, shield = rig.map.shd, s = hand.spr;
  // 방패 중앙 손잡이를 실제 주먹 중심(이미지 62%, 50%)에 고정한다.
  // 전완 중간에 붙이면 손이 방패 테두리 바깥으로 튀어나온다.
  const x = (0.62 - s.originX) * s.width * hand.sc;
  const y = (0.5 - s.originY) * s.height * hand.sc;
  const a = (hand.ir || 0) * D2R;
  shield.p = 'hf'; shield.x = x * Math.cos(a) - y * Math.sin(a);
  shield.y = x * Math.sin(a) + y * Math.cos(a);
  rig.finishPose = p => harvanWeaponLayer(rig, p);
  rig.apply(HARVAN_STAND);
  rig.supportFeet = { floor: rig.bodyBounds(['ftf', 'ftb']).bottom };
  for (const side of ['f', 'b']) rig.supportFeet[side] = rig.map['ft' + side].wx;
  rig.preparePose = p => harvanPlantFeet(rig, p);
}
function harvanPlantFeet(rig, p) {
  const weight = Math.max(0, Math.min(1, p.power || 0));
  if (!weight) return p;
  const pose = { ...p }, rootAngle = ((p.rr || 0) + (p.root || 0)) * D2R;
  const cr = Math.cos(rootAngle), sr = Math.sin(rootAngle);
  for (const side of ['f', 'b']) {
    const thigh = rig.map['th' + side], shin = rig.map['sh' + side], foot = rig.map['ft' + side];
    const s = foot.spr, angle = (p['ft' + side] || 0) * D2R;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    // 발끝을 축으로 뒤꿈치를 들되 발바닥이 땅 아래로 파고들지 않게 한다.
    const toeX = (0.85 - s.originX) * s.width * foot.sc;
    const toeY = (0.85 - s.originY) * s.height * foot.sc;
    let sole = -Infinity;
    for (const [u, v] of CORNERS) {
      const x = (u - s.originX) * s.width * foot.sc, y = (v - s.originY) * s.height * foot.sc;
      sole = Math.max(sole, x * sa + y * ca);
    }
    const targetX = rig.supportFeet[side] + (p['step' + side.toUpperCase()] || 0) - (p['plantShift' + side.toUpperCase()] || 0) + toeX - (toeX * ca - toeY * sa);
    const targetY = rig.supportFeet.floor - sole - (p['lift' + side.toUpperCase()] || 0);
    const hipX = (p.rx || 0) + (p.hipX || 0) + thigh.x * cr - thigh.y * sr;
    const hipY = (p.ry || 0) + (p.hipY || 0) + thigh.x * sr + thigh.y * cr;
    const dx = targetX - hipX, dy = targetY - hipY;
    const localX = dx * cr + dy * sr, localY = -dx * sr + dy * cr;
    const l1 = shin.y, l2 = foot.y;
    const cosKnee = Math.max(-0.98, Math.min(0.995, (dx * dx + dy * dy - l1 * l1 - l2 * l2) / (2 * l1 * l2)));
    const knee = Math.acos(cosKnee);
    const hip = Math.atan2(-localX, localY) - Math.atan2(l2 * Math.sin(knee), l1 + l2 * Math.cos(knee));
    pose['th' + side] = lerp(p['th' + side] || 0, hip / D2R, weight);
    pose['sh' + side] = lerp(p['sh' + side] || 0, knee / D2R, weight);
    pose['ft' + side] = lerp(p['ft' + side] || 0, angle / D2R - rootAngle / D2R, weight);
  }
  return pose;
}
function harvanTrackFeet(actor, pose) {
  if (actor.state !== 'atk' || (pose.power || 0) < 0.999) { actor.plantedFeet = null; return; }
  const previous = actor.plantedFeet;
  const plants = { face: actor.face };
  for (const side of ['F', 'B']) {
    const step = pose['step' + side] || 0, lift = pose['lift' + side] || 0;
    const old = previous && previous.face === actor.face ? previous[side] : null;
    // 발을 들 때도 같은 월드 기준에서 step/lift 경로를 따라간다.
    // 이때 전진 보정을 즉시 없애면 회수하는 발이 몸 쪽으로 순간이동한다.
    const x = old ? old.x : actor.x;
    pose['plantShift' + side] = (actor.x - x) * actor.face / actor.sc * (1 - (pose.releaseFeet || 0));
    plants[side] = { x, step, lift };
  }
  actor.plantedFeet = plants;
}
function harvanWeaponLayer(rig, p) {
  // 칼은 손목의 회전·길이를 그대로 따른다. 손과 별개인 가짜 원근 회전은 사용하지 않는다.
  const front = (p.swordFront || 0) > 0.5;
  if (rig.swordInFront !== front) {
    rig.swordInFront = front;
    // 위팔은 뒤쪽 어깨에 남는다. 위팔까지 맨 앞으로 옮기면 어깨가 순간적으로 분리돼 보인다.
    const order = b => front && ['fab', 'wpn', 'hb'].includes(b.n) ? b.z + 76 : b.z;
    for (const b of [...rig.bones].sort((a, b) => order(a) - order(b))) rig.c.bringToTop(b.spr);
  }
}
const HARVAN_ACTION_CLIPS = { w_guard: 'harvan_guard', w_parry: 'harvan_parry' };
const HARVAN_ATTACK_CLIPS = {};
const HARVAN_PLANTED_ATTACKS = new Set(['a1', 'a2', 'a3']);
// 전투 수치는 HERO_ATK를 그대로 쓴다. 관절별 지연 때문에 칼이 판정보다 늦게
// 도착하지 않도록 네 기본타의 키프레임은 같은 시계로 샘플링한다.
const harvanPower = d => ({ power: 1, hipX: 0, hipY: 0, stepF: 0, stepB: 0, liftF: 0, liftB: 0,
  ftf: 0, ftb: 0, rx: 0, ry: 0, root: 0, torso: 4, rr: 0, head: -2, bodyTwist: 0, sq: 0, releaseFeet: 0, ...d });
// 4타의 통과 스텝 뒤에는 무기 쪽 다리가 앞선 자세로 선다. 다음 행동에서 자연스럽게 연결한다.
const HARVAN_SWITCH_WEIGHT = harvanPower({ hipY: 12, stepF: -62, stepB: 92, releaseFeet: 1 });
const HARVAN_SWITCH_STAND = harvanPose(HARVAN_SWITCH_WEIGHT);
function harvanStancePose(p, name, t, base) {
  if (base !== HARVAN_SWITCH_STAND) return p;
  const pose = { ...p };
  // 반대 발이 앞서도 같은 검 원호를 쓴다. 지지하는 다리와 뒤꿈치 회전의 역할을 바꾼다.
  pose.stepF = HARVAN_SWITCH_WEIGHT.stepF + (p.stepB || 0);
  pose.stepB = HARVAN_SWITCH_WEIGHT.stepB + (p.stepF || 0);
  pose.liftF = p.liftB || 0; pose.liftB = p.liftF || 0;
  pose.ftf = p.ftb || 0; pose.ftb = p.ftf || 0;
  pose.hipY = (p.hipY || 0) + HARVAN_SWITCH_WEIGHT.hipY;
  if (HARVAN_PLANTED_ATTACKS.has(name)) {
    // 다음 1~3타도 교대한 보폭을 유지한다. 시작·끝에서 원래 발 배치로 되돌리지 않는다.
    pose.power = 1;
    pose.releaseFeet = 1 - (p.power || 0);
  } else {
    // 반대 발에서 시작하는 4타는 다시 발을 통과시켜 원래 발 순서로 착지한다.
    const settle = Math.max(0, Math.min(1, (t - 330) / 145));
    pose.stepF -= 30 * settle; pose.stepB -= 30 * settle;
    pose.power = 1 - Math.max(0, Math.min(1, (t - 445) / 45));
    pose.hipY = Math.max(pose.hipY - 24 * settle, 12 * pose.power);
    pose.releaseFeet = Math.max(p.releaseFeet || 0, Math.max(0, Math.min(1, (t - 330) / 100)));
  }
  return pose;
}
const harvanPowerAt = (clip, t) => {
  const p = CLIPS[clip].at(t), d = {};
  for (const key in harvanPower({})) d[key] = p[key] || 0;
  return d;
};
const harvanAttack = (name, keys, powerKeys) => {
  const clipName = 'harvan_' + name;
  const arms = keyClip(keys, false, false), body = keyClip(powerKeys, false, false);
  CLIPS[clipName] = { dur: arms.dur, loop: false, at(t, base = HARVAN_STAND) {
    const p = arms.at(t), q = body.at(t);
    // 승인된 큰 팔 원호는 유지하면서 골반→몸통이 먼저 힘을 전달한다.
    const turn = (p.torso || 0) + (p.rr || 0) + (p.root || 0) - q.torso - q.rr - q.root;
    return harvanStancePose({ ...p, ...q, uab: p.uab + turn, uaf: p.uaf + turn }, name, t, base);
  } };
  HARVAN_ATTACK_CLIPS[name] = clipName;
};
harvanAttack('a1', [
  [0, HARVAN_STAND],
  // 팔꿈치를 부드럽게 편 채 어깨를 중심으로 크게 회전한다. 정면에서 멈추지 않는다.
  [45, harvanPose({ ...CROUCH, torso: -10, uab: -208, fab: -35, hb: 90, rr: -2, rx: -8, bodyTwist: -1 }), 'out'],
  [75, harvanPose({ ...CROUCH, torso: -2, uab: -153, fab: -30, hb: 85, rr: 0, rx: -3, bodyTwist: -0.5, swordFront: 0.4 }), 'in'],
  [105, harvanPose({ ...LUNGE_S, torso: 10, uab: -87, fab: -30, hb: 85, rr: 2, rx: 12, bodyTwist: 0.2, swordFront: 1 }), 'lin'],
  [130, harvanPose({ ...LUNGE_S, torso: 20, uab: -48, fab: -35, hb: 75, rr: 3, rx: 14, bodyTwist: 0.6, swordFront: 1 }), 'lin'],
  [160, harvanPose({ ...LUNGE_S, torso: 24, uab: -7, fab: -40, hb: 65, rr: 3, rx: 12, bodyTwist: 1, swordFront: 1 }), 'lin'],
  [185, harvanPose({ ...LUNGE_S, torso: 18, uab: 30, fab: -55, hb: 40, rr: 2, rx: 8, bodyTwist: 0.9, swordFront: 1 }), 'out'],
  [220, harvanPose({ ...LUNGE_S, torso: 10, uab: 44, fab: -85, hb: 40, rr: 1, rx: 4, bodyTwist: 0.6 }), 'out'],
  [320, HARVAN_STAND, 'io'],
], [
  [0, harvanPower({ power: 0 })],
  // 보폭은 유지한다. 뒤꿈치와 골반이 먼저 풀리고, 몸통이 뒤따라 검에 힘을 보낸다.
  [40, harvanPower({ hipX: -10, hipY: 12, root: -5, torso: -12, ftb: 2, head: 6, bodyTwist: -1 }), 'out'],
  [70, harvanPower({ hipX: -2, hipY: 12, root: 1, torso: -10, ftb: 12, head: 4, bodyTwist: -0.5 }), 'in'],
  [100, harvanPower({ hipX: 10, hipY: 16, root: 5, torso: 10, rr: 1, ftb: 22, head: -6, bodyTwist: 0.5 }), 'lin'],
  [130, harvanPower({ hipX: 14, hipY: 20, root: 5, torso: 20, rr: 1, ftb: 26, head: -8, bodyTwist: 1 }), 'out'],
  [170, harvanPower({ hipX: 6, hipY: 16, root: 3, torso: 16, ftb: 18, head: -6, bodyTwist: 0.7 }), 'out'],
  [215, harvanPower({ hipY: 10, torso: 10, ftb: 8, bodyTwist: 0.3 }), 'out'],
  [320, harvanPower({ power: 0 }), 'io'],
]);
harvanAttack('a2', [
  [0, CLIPS.harvan_a1.at(160)],
  // 반대쪽 원호로 되벤다. 정면 접촉 후에도 어깨 위쪽까지 계속 빠져나간다.
  [55, harvanPose({ ...CROUCH, torso: 16, uab: 32, fab: -45, hb: 30, rr: 2, rx: -6, bodyTwist: 1, swordFront: 1 }), 'out'],
  [80, harvanPose({ ...CROUCH, torso: 8, uab: -24, fab: -35, hb: 70, rr: 1, rx: 0, bodyTwist: 0.5, swordFront: 1 }), 'in'],
  [105, harvanPose({ ...UPL, torso: 0, uab: -75, fab: -30, hb: 100, rr: 0, rx: 8, bodyTwist: -0.2, swordFront: 1 }), 'lin'],
  [135, harvanPose({ ...UPL, torso: -6, uab: -128, fab: -35, hb: 100, rr: -1, rx: 6, bodyTwist: -0.7, swordFront: 1 }), 'lin'],
  [165, harvanPose({ ...UPL, torso: -8, uab: -140, fab: -45, hb: 100, rr: -2, rx: 2, bodyTwist: -1 }), 'out'],
  [205, harvanPose({ ...UPL, torso: -4, uab: -105, fab: -90, hb: 110, rr: -1, bodyTwist: -0.7 }), 'out'],
  [245, harvanPose({ ...UPL, torso: 0, uab: -50, fab: -100, hb: 110, rr: 0, bodyTwist: -0.3 }), 'out'],
  [320, HARVAN_STAND, 'io'],
], [
  [0, harvanPowerAt('harvan_a1', 160)],
  [45, harvanPower({ hipX: 4, hipY: 20, root: 3, torso: 16, ftb: 18, head: -6, bodyTwist: 0.9 }), 'out'],
  [75, harvanPower({ hipX: -2, hipY: 16, root: -3, torso: 4, ftf: 4, ftb: 6 }), 'in'],
  [105, harvanPower({ hipX: -10, hipY: 12, root: -6, torso: -8, rr: -1, ftf: 14, head: 4, bodyTwist: -0.6 }), 'lin'],
  [140, harvanPower({ hipX: -12, hipY: 10, root: -4, torso: -16, rr: -1, ftf: 18, head: 6, bodyTwist: -1 }), 'out'],
  [180, harvanPower({ hipX: -6, hipY: 12, root: -1, torso: -8, ftf: 10, head: 4, bodyTwist: -0.6 }), 'out'],
  [230, harvanPower({ hipY: 8, torso: 0, ftf: 4, bodyTwist: -0.2 }), 'out'],
  [320, harvanPower({ power: 0 }), 'io'],
]);
harvanAttack('a3', [
  [0, CLIPS.harvan_a2.at(160)],
  [75, harvanPose({ ...CROUCH, torso: -12, uaf: 30, faf: -125, rr: -3, uab: 20, fab: -50, hb: 70, rx: -10 }), 'out'],
  [90, harvanPose({ ...CROUCH, torso: -12, uaf: 30, faf: -125, rr: -3, uab: 20, fab: -50, hb: 70, rx: -12 }), 'lin'],
  [115, harvanPose({ ...LUNGE, torso: 18, uaf: -76, faf: -30, rr: 3, uab: 20, fab: -50, hb: 70, rx: 14, sq: 0.02 }), 'in'],
  [170, harvanPose({ ...LUNGE, torso: 18, uaf: -70, faf: -36, rr: 3, uab: 18, fab: -46, hb: 70, rx: 12 }), 'out'],
  [220, harvanPose({ ...LUNGE_S, torso: 12, uaf: -34, faf: -68, rr: 2, uab: 8, fab: -40, hb: 76, rx: 8 }), 'out'],
  [340, HARVAN_STAND, 'io'],
], [
  [0, harvanPowerAt('harvan_a2', 160)],
  [75, harvanPower({ hipX: -10, hipY: 18, root: -4, torso: -14, rr: -1, ftf: 6, ftb: 2, head: 6, bodyTwist: -0.6 }), 'out'],
  [95, harvanPower({ hipX: -2, hipY: 18, root: 2, torso: -4, ftb: 12 }), 'in'],
  [115, harvanPower({ hipX: 12, hipY: 22, root: 6, torso: 20, rr: 1, ftb: 26, head: -8, bodyTwist: 0.8 }), 'lin'],
  [165, harvanPower({ hipX: 14, hipY: 24, root: 5, torso: 24, rr: 1, ftb: 28, head: -10, bodyTwist: 1 }), 'out'],
  [220, harvanPower({ hipX: 6, hipY: 16, root: 2, torso: 14, ftb: 14, head: -4, bodyTwist: 0.5 }), 'out'],
  [340, harvanPower({ power: 0 }), 'io'],
]);
harvanAttack('a4', [
  [0, CLIPS.harvan_a3.at(180)],
  // 크게 감은 검을 원호로 보내며 뒷발이 앞발을 통과한다. 215ms에 발과 검이 함께 도착한다.
  [85, harvanPose({ torso: -14, uab: -208, fab: -35, hb: 90, rr: -3, swordFront: 0 }), 'out'],
  [145, harvanPose({ torso: -18, uab: -166, fab: -28, hb: 85, rr: -4 }), 'in'],
  [180, harvanPose({ torso: -4, uab: -130, fab: -28, hb: 85, rr: -1, swordFront: 0.4 }), 'in'],
  [215, harvanPose({ torso: 24, uab: -103, fab: -25, hb: 80, rr: 4, swordFront: 1 }), 'lin'],
  [245, harvanPose({ torso: 28, uab: -53, fab: -32, hb: 76, rr: 5, swordFront: 1 }), 'lin'],
  [285, harvanPose({ torso: 30, uab: -6, fab: -45, hb: 62, rr: 6, swordFront: 1 }), 'lin'],
  [330, harvanPose({ torso: 18, uab: 34, fab: -68, hb: 50, rr: 3, swordFront: 1 }), 'out'],
  [410, harvanPose({ torso: 8, uab: 20, fab: -72, hb: 70 }), 'out'],
  [490, HARVAN_STAND, 'io'],
], [
  [0, harvanPowerAt('harvan_a3', 180)],
  [85, harvanPower({ hipX: -8, hipY: 28, torso: -18, rr: -4, stepF: 36, stepB: 4, ftb: 12, head: 6, bodyTwist: -1 }), 'out'],
  [145, harvanPower({ hipX: 4, hipY: 34, torso: -16, rr: -3, stepF: 36, stepB: 30, liftB: 34, ftb: -8, head: 6, bodyTwist: -0.8 }), 'in'],
  [180, harvanPower({ hipX: 24, hipY: 30, torso: 0, rr: 1, stepF: 36, stepB: 105, liftB: 40, ftb: -10, head: 0, bodyTwist: -0.2 }), 'in'],
  [215, harvanPower({ hipX: 48, hipY: 34, torso: 28, rr: 6, stepF: 36, stepB: 186, ftf: 14, head: -10, bodyTwist: 0.8 }), 'lin'],
  [260, harvanPower({ hipX: 56, hipY: 40, torso: 34, rr: 7, stepF: 36, stepB: 186, ftf: 18, head: -12, bodyTwist: 1 }), 'out'],
  [300, harvanPower({ hipX: 46, hipY: 32, torso: 26, rr: 5, stepF: 36, stepB: 186, ftf: 18, head: -10, bodyTwist: 0.8 }), 'out'],
  [365, harvanPower({ hipX: 22, hipY: 22, torso: 12, rr: 2, stepF: -44, stepB: 186, liftF: 16, head: -4, bodyTwist: 0.4 }), 'out'],
  [405, harvanPower({ hipX: 10, hipY: 18, torso: 8, rr: 1, stepF: -62, stepB: 186, bodyTwist: 0.2 }), 'out'],
  [445, harvanPower({ hipX: 2, hipY: 14, torso: 5, stepF: -62, stepB: 112, liftB: 8, releaseFeet: 0.5 }), 'out'],
  [475, harvanPower({ hipY: 12, stepF: -62, stepB: 92, releaseFeet: 1 }), 'out'],
  [490, HARVAN_SWITCH_WEIGHT, 'lin'],
]);
const HARVAN_RISE = S(0, { torso: -5, head: -4, thf: -44, shf: 66, thb: 18, shb: 42, uab: -35, uaf: -34, cape: 22 });
const HARVAN_APEX = S(0, { torso: 2, head: 2, thf: -58, shf: 84, thb: -16, shb: 68, uab: -48, uaf: -45, cape: 28 });
const HARVAN_FALL = S(0, { torso: 10, head: 5, thf: -24, shf: 28, thb: 12, shb: 24, uab: -28, uaf: -44, cape: 34 });
Object.assign(CLIPS, {
  harvan_guard: keyClip([
    [0, HARVAN_STAND],
    [60, harvanPose({ ...CROUCH, torso: 12, uaf: -35, faf: -82, rr: 1, uab: 14, fab: -30, hb: 80, head: 6, sq: -0.03 }), 'out'],
  ], false, false),
  harvan_parry: keyClip([
    [0, harvanPose({ torso: 12, uaf: -35, faf: -82, rr: 1 })],
    [80, harvanPose({ torso: -4, uaf: -64, faf: -48, rr: -3, rx: 10, head: -4 }), 'out'],
    [300, harvanPose({ torso: 8, uaf: -30, faf: -84, rr: 1 }), 'out'],
  ], false, false),
  harvan_rise: keyClip([[0, S(0, { ...CROUCH, torso: 10, uaf: -32 })], [90, HARVAN_RISE, 'out']], false, false),
  harvan_apex: { loop: true, dur: 300, at() { return HARVAN_APEX; } },
  harvan_fall: { loop: true, dur: 300, at() { return HARVAN_FALL; } },
  harvan_land: keyClip([
    [0, HARVAN_FALL],
    [35, S(0, { ...CROUCH, shf: 58, shb: 40, torso: 16, head: 5, uaf: -36, cape: 16, sq: -0.025 }), 'out'],
    [140, HARVAN_STAND, 'out'],
  ], false, false),
  harvan_brake: keyClip([
    [0, S(0, { ...LUNGE_S, torso: -6, head: 4, uaf: -36, rr: -3, cape: 28 })],
    [65, S(0, { ...CROUCH, torso: -4, head: 2, rr: -2, cape: 18 }), 'out'],
    [150, HARVAN_STAND, 'io'],   // ✏️ 2026-11-25 'out'→'io': 웅크렸다 일어설 때 툭 튀지 않게
  ], false, false),
  harvan_roll: keyClip([
    [0, S(0, { ...CROUCH, torso: 18, uab: -40, uaf: -52 })],
    [50, S(0, { torso: 34, head: 20, thf: -100, shf: 126, thb: -84, shb: 118, uab: -48, fab: -72, uaf: -62, faf: -70, rr: 20 }), 'out'],
    [275, S(0, { torso: 34, head: 20, thf: -100, shf: 126, thb: -84, shb: 118, uab: -48, fab: -72, uaf: -62, faf: -70, rr: 340 }), 'lin'],
    [330, S(0, { ...CROUCH, torso: 14, rr: 360, uaf: -40, cape: 12 }), 'out'],
    [380, { ...HARVAN_STAND, rr: 360 }, 'out'],
  ], false, false),
});
