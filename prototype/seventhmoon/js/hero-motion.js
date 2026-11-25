// 하르반 외 다섯 플레이어 직업의 동작. 원본 전투 수치와 AI 동료 클립은 보존한다.
const HERO_MOTION_PROFILES = {
  mage: { contact: [150, 150, 150, 380], lean: 4,
    apex: { torso: -4, rr: -2, head: -4, thf: -22, shf: 38, thb: 8, shb: 30, cape: -16 },
    fall: { torso: 2, head: 2, thf: -12, shf: 20, thb: 10, shb: 22, cape: -10 },
    land: { torso: 4, thf: -22, shf: 30, thb: 16, shb: 22, sq: -.008 },
    evade: { torso: 0, rr: -4, uab: -28, fab: -52, uaf: -58, faf: -86, thf: -38, shf: 66, thb: 10, shb: 28 } },
  paladin: { contact: [150, 130, 150, 232], lean: 10,
    apex: { torso: 12, head: -2, thf: -36, shf: 52, thb: 8, shb: 34 },
    fall: { torso: 17, head: 4, thf: -22, shf: 30, thb: 14, shb: 24 },
    land: { torso: 20, shf: 64, sq: -.035 },
    evade: { torso: 24, rr: -8, uab: -30, fab: -115, uaf: -40, faf: -85, thf: -66, shf: 100, thb: 8, shb: 44 } },
  rogue: { contact: [82, 82, 80, 159], lean: 16, rollTurn: 360,
    apex: { torso: 30, head: -20, thf: -82, shf: 126, thb: -48, shb: 112, cape: 28 },
    fall: { torso: 28, head: -16, thf: -42, shf: 56, thb: 8, shb: 42 },
    land: { torso: 32, shf: 76, shb: 54, head: -20, sq: -.014 } },
  ranger: { contact: [180, 180, 180, 180], lean: 8, rollTurn: -360,
    apex: { torso: 10, head: -8, thf: -58, shf: 88, thb: -18, shb: 58 },
    fall: { torso: 14, head: -6, thf: -30, shf: 36, thb: 10, shb: 28 },
    land: { torso: 15, shf: 54, sq: -.016 },
    evade: { uaf: -42, faf: -100, hf: 48, uab: -55, fab: -100 } },
  hexblade: { contact: [170, 145, 180, 254], lean: 12,
    apex: { torso: 22, head: 4, thf: -34, shf: 46, thb: 12, shb: 32 },
    fall: { torso: 26, head: 8, thf: -18, shf: 28, thb: 16, shb: 22 },
    land: { torso: 30, head: 12, shf: 62, sq: -.03 },
    evade: { torso: 34, rr: -14, uab: -18, fab: -110, thf: -72, shf: 112, thb: -14, shb: 70 } },
};
function heroMotionClip(actor, phase) { return 'flow_' + actor.key + '_' + phase; }
function heroMotionAction(actor, name) {
  const phase = { w_guard: 'guard', w_parry: 'parry', w_roll: 'roll', w_jump: 'rise' }[name];
  return phase ? heroMotionClip(actor, phase) : name;
}
function heroMotionMix(a, b, t) {
  const p = motionMix(a, b, t);
  for (const name of ['hb', 'hf']) {
    const from = a[name] || 0, to = b[name] || 0;
    const delta = ((to - from + 180) % 360 + 360) % 360 - 180;
    p[name] = from + delta * t;
  }
  return p;
}
function unlagHeroPose(clip, t) {
  const p = clip.at(t), result = { ...p };
  for (const name in LAG) if (name in p) result[name] = clip.at(t + LAG[name])[name];
  return result;
}
const heroRetimedClip = (source, duration, hit, contact) => ({ loop: false, dur: duration, at(t) {
  const sourceT = t <= hit ? t * contact / hit : contact + (Math.min(t, duration) - hit) * (source.dur - contact) / (duration - hit);
  return unlagHeroPose(source, sourceT);
} });
const heroCanonical = p => ({ ...p, hb: ((p.hb || 0) + 540) % 360 - 180, hf: ((p.hf || 0) + 540) % 360 - 180 });
const HP = (key, d) => ({ ...heroCanonical(STANCE[key]), ...d });

// 방패치기와 쌍검의 마무리는 실제 접촉 때 팔이 앞으로 도달하도록 별도 키를 둔다.
const HERO_FINISHERS = {
  paladin: keyClip([
    [0, HP('paladin', {})],
    [90, HP('paladin', { ...CROUCH, torso: -12, rr: -2, uab: -180, fab: -45, hb: 75, uaf: 12, faf: -100 }), 'out'],
    [180, HP('paladin', { ...CROUCH, torso: -8, rr: -2, uab: -145, fab: -30, hb: 85, uaf: 8, faf: -100 }), 'in'],
    [232, HP('paladin', { ...LUNGE, torso: 22, rr: 3, uab: -98, fab: -20, hb: 76, uaf: -24, faf: -80, rx: 10 }), 'lin'],
    [300, HP('paladin', { ...LUNGE, torso: 30, rr: 4, uab: -35, fab: -35, hb: 70, uaf: -10, faf: -90, rx: 12 }), 'out'],
    [390, HP('paladin', { ...LUNGE_S, torso: 25, rr: 2, uab: -6, fab: -45, hb: 65, rx: 6 }), 'out'],
    [529, HP('paladin', {}), 'io'],
  ], false, false),
  rogue: keyClip([
    [0, HP('rogue', {})],
    [100, HP('rogue', { ...CROUCH, torso: -10, uab: -185, fab: -25, hb: 95, uaf: -175, faf: -25, hf: 80 }), 'out'],
    [140, HP('rogue', { ...CROUCH, torso: -4, uab: -150, fab: -18, hb: 80, uaf: -138, faf: -20, hf: 72 }), 'in'],
    [159, RW(HP('rogue', { ...LUNGE_S, torso: 26, rr: 3, uab: -104, fab: -18, uaf: -100, faf: -16, rx: 10 }), -70, -110), 'lin'],
    [220, RW(HP('rogue', { ...LUNGE_S, torso: 30, rr: 3, uab: -20, fab: -36, uaf: -40, faf: -42, rx: 6 }), 5, -25), 'out'],
    [363, HP('rogue', {}), 'io'],
  ], false, false),
  hexblade: keyClip([
    [0, HP('hexblade', {})],
    [100, HP('hexblade', { ...CROUCH, torso: -12, rr: -3, uab: -205, fab: -30, hb: 90 }), 'out'],
    [170, HP('hexblade', { ...CROUCH, torso: -6, rr: -1, uab: -145, fab: -30, hb: 85 }), 'in'],
    [254, HP('hexblade', { ...LUNGE, torso: 20, rr: 4, uab: -99, fab: -26, hb: 82, rx: 10 }), 'lin'],
    [300, HP('hexblade', { ...LUNGE, torso: 28, rr: 6, uab: -42, fab: -32, hb: 65, rx: 12 }), 'lin'],
    [370, HP('hexblade', { ...LUNGE_S, torso: 26, rr: 5, uab: 14, fab: -48, hb: 50, rx: 6 }), 'lin'],
    [430, HP('hexblade', { ...LUNGE_S, torso: 16, rr: 2, uab: 26, fab: -65, hb: 40 }), 'out'],
    [578, HP('hexblade', {}), 'io'],
  ], false, false),
};
for (const [key, profile] of Object.entries(HERO_MOTION_PROFILES)) {
  const base = heroCanonical(STANCE[key]), prefix = 'flow_' + key + '_';
  profile.attacks = {};
  for (const [name, attack] of Object.entries(classOf(key).atk)) {
    const source = CLIPS[attack.clip];
    if (!source) continue;
    const index = ['a1', 'a2', 'a3', 'a4'].indexOf(name);
    const replacement = (name === 'a4' || attack.finisherClip) && HERO_FINISHERS[key];   // ✏️ 2026-11-24 finisherClip: 회피 반격도 다듬은 마무리 동작을 쓴다
    CLIPS[prefix + name] = replacement || heroRetimedClip(source, attack.dur, attack.hit[0], index >= 0 ? profile.contact[index] : Math.min(attack.hit[0], source.dur - 20));
    profile.attacks[name] = prefix + name;
  }
  const jump = { ...heroCanonical(CLIPS[key + '_jump'].at(0)), rr: 0, sq: 0 };
  CLIPS[prefix + 'rise'] = keyClip([[0, HP(key, { ...CROUCH, torso: profile.lean })], [90, jump, 'out']], false, false);
  CLIPS[prefix + 'apex'] = { loop: true, dur: 300, at() { return { ...jump, ...profile.apex }; } };
  CLIPS[prefix + 'fall'] = { loop: true, dur: 300, at() { return { ...jump, ...profile.fall }; } };
  CLIPS[prefix + 'land'] = keyClip([[0, CLIPS[prefix + 'fall'].at(0)], [35, HP(key, { ...CROUCH, ...profile.land }), 'out'], [140, base, 'out']], false, false);
  CLIPS[prefix + 'brake'] = keyClip([[0, HP(key, { ...LUNGE_S, torso: profile.lean - 5, rr: -2 })], [65, HP(key, { ...CROUCH, torso: profile.lean - 3 }), 'out'], [150, base, 'io']], false, false);   // ✏️ 2026-11-25 'out'→'io'
  const guard = key === 'paladin' ? { uaf: -35, faf: -82, hf: 0 } : key === 'ranger' ? { uaf: -50, faf: -85, hf: -15, uab: -60, fab: -75 } : key === 'mage' ? { uaf: -64, faf: -70, uab: -30, fab: -70 } : key === 'rogue' ? RW(HP(key, { uaf: -65, faf: -75, uab: -55, fab: -80 }), -130, -110) : { uab: -70, fab: -45, hb: 100 };
  CLIPS[prefix + 'guard'] = keyClip([[0, base], [60, HP(key, { ...CROUCH, torso: profile.lean, ...guard }), 'out']], false, false);
  CLIPS[prefix + 'parry'] = keyClip([[0, CLIPS[prefix + 'guard'].at(60)], [80, HP(key, { torso: profile.lean + 6, uab: -90, fab: -20, uaf: -80, faf: -20, rx: 8 }), 'out'], [320, base, 'out']], false, false);
  const tuck = HP(key, { torso: profile.lean + 22, head: 14, thf: -100, shf: 124, thb: -80, shb: 110, uab: -40, uaf: -50, ...profile.evade });
  CLIPS[prefix + 'roll'] = keyClip([[0, HP(key, { ...CROUCH })], [55, { ...tuck, rr: profile.rollTurn ? profile.rollTurn * 0.06 : tuck.rr || 0 }, 'out'], [285, { ...tuck, rr: profile.rollTurn ? profile.rollTurn * 0.94 : tuck.rr || 0 }, 'lin'], [330, HP(key, { ...CROUCH, rr: profile.rollTurn || 0 }), 'out'], [380, { ...base, rr: (base.rr || 0) + (profile.rollTurn || 0) }, 'out']], false, false);
}

function heroPalmLocal(rig, name, rotation) {
  const b = rig.map[name], s = b.spr, angle = rotation + (b.ir || 0) * D2R;
  const x = (0.62 - s.originX) * s.width * b.sc, y = (0.5 - s.originY) * s.height * b.sc;
  return { x: x * Math.cos(angle) - y * Math.sin(angle), y: x * Math.sin(angle) + y * Math.cos(angle) };
}
function heroAttachPalm(rig, item, hand) {
  const b = rig.map[item]; if (!b) return;
  const p = heroPalmLocal(rig, hand, 0); b.p = hand; b.x = p.x; b.y = p.y;
}
function heroImageLocal(rig, name, u, v) {
  const b = rig.map[name], s = b.spr, x = (u - s.originX) * s.width * s.scaleX, y = (v - s.originY) * s.height * s.scaleY;
  return { x: s.x + x * Math.cos(s.rotation) - y * Math.sin(s.rotation), y: s.y + x * Math.sin(s.rotation) + y * Math.cos(s.rotation) };
}
function heroSupportHand(rig, p) {
  if (rig.solvingSupport) return p;
  rig.solvingSupport = true; rig.apply(p); rig.solvingSupport = false;
  let target = heroImageLocal(rig, 'wpn', 0.5, 0.97);
  const rotation = rig.map.wpn.wr, palm = heroPalmLocal(rig, 'hf', rotation), shoulder = rig.map.uaf;
  const dx = target.x - palm.x - shoulder.wx, dy = target.y - palm.y - shoulder.wy;
  const reach = rig.map.faf.y + rig.map.hf.y - 1, distance = Math.hypot(dx, dy);
  if (distance > reach) {
    // 원본 회수 자세가 손잡이를 지지 팔의 길이 밖으로 보내면 주도 팔도 함께 접는다.
    // 지지 손만 늘이거나 검과 분리하지 않고 양팔이 닿는 범위에서 같은 검 각도를 유지한다.
    const rear = rig.map.hb, grip = heroPalmLocal(rig, 'hb', rear.wr);
    p = heroSolveHand(rig, p, 'b', { x: rear.wx + grip.x + dx * (reach / distance - 1),
      y: rear.wy + grip.y + dy * (reach / distance - 1) }, rear.wr);
    rig.solvingSupport = true; rig.apply(p); rig.solvingSupport = false;
    target = heroImageLocal(rig, 'wpn', 0.5, 0.97);
  }
  return heroSolveHand(rig, p, 'f', target, rotation);
}
function heroSolveHand(rig, p, side, target, rotation) {
  const palm = heroPalmLocal(rig, 'h' + side, rotation), shoulder = rig.map['ua' + side];
  const dx = target.x - palm.x - shoulder.wx, dy = target.y - palm.y - shoulder.wy;
  const l1 = rig.map['fa' + side].y, l2 = rig.map['h' + side].y;
  const elbow = -Math.acos(Math.max(-0.98, Math.min(0.9999, (dx * dx + dy * dy - l1 * l1 - l2 * l2) / (2 * l1 * l2))));
  const upper = Math.atan2(-dx, dy) - Math.atan2(l2 * Math.sin(elbow), l1 + l2 * Math.cos(elbow));
  return { ...p, ['ua' + side]: (upper - rig.map.torso.wr) / D2R, ['fa' + side]: elbow / D2R, ['h' + side]: (rotation - upper - elbow) / D2R };
}
function heroBowHand(rig, p) {
  if (rig.solvingSupport || !(p.bowDraw > 0)) return p;
  rig.solvingSupport = true; rig.apply(p); rig.solvingSupport = false;
  const cheek = heroImageLocal(rig, 'head', 0.7, 0.78), hand = rig.map.hb;
  const palm = heroPalmLocal(rig, 'hb', hand.wr), release = p.bowRelease || 0;
  const target = { x: lerp(hand.wx + palm.x, cheek.x - release * 10, p.bowDraw),
    y: lerp(hand.wy + palm.y, cheek.y - release * 3, p.bowDraw) };
  return heroSolveHand(rig, p, 'b', target, 0);
}
function configureHeroMotion(actor) {
  const profile = HERO_MOTION_PROFILES[actor.key]; if (!profile) return;
  actor.atkSet = { ...actor.atkSet };
  for (const [key, clip] of Object.entries(profile.attacks)) actor.atkSet[key] = { ...actor.atkSet[key], clip };
  const r = actor.rig;
  heroAttachPalm(r, 'wpn', 'hb'); heroAttachPalm(r, 'fitem', 'hf'); heroAttachPalm(r, 'shd', 'hf');
  if (actor.key === 'hexblade') r.preparePose = p => heroSupportHand(r, p);
  if (actor.key === 'ranger') r.preparePose = p => heroBowHand(r, p);
}
function heroMotionPose(actor, p) {
  if (actor.key === 'hexblade' && ['hexblade_walk', 'hexblade_run'].includes(actor.anim)) {
    // 대기 때는 어깨에 메고, 이동할 때는 칼끝이 뒤·아래로 따라오는 무거운 운반 자세.
    return WA(p, actor.anim === 'hexblade_walk' ? 40 : 55);
  }
  if (actor.key === 'rogue' && (actor.anim === 'rogue_idle' || actor.anim === heroMotionClip(actor, 'brake'))) {
    // 낮은 준비 자세에서도 뒷발을 계속 공중에 들고 있지 않도록 무릎을 편다.
    const settle = actor.anim === 'rogue_idle' ? 1 : ease.io(Math.min(1, actor.animT / 150));
    return { ...p, thb: lerp(p.thb || 0, 18, settle), shb: lerp(p.shb || 0, 24 + ((p.shf || 64) - 64) * .6, settle) };
  }
  if (actor.key === 'paladin') {
    const action = actor.anim.startsWith('paladin_') ? actor.anim.slice(8) : actor.anim === heroMotionClip(actor, 'brake') ? 'harvan_brake' : actor.anim;
    return harvanShieldPose(p, action, actor.animT, actor.shieldRecoveryT);
  }
  if (actor.key === 'ranger') {
    const name = actor.anim.replace('flow_ranger_', ''), attack = classOf('ranger').atk[name];
    if (attack && attack.proj && ['a1', 'a2', 'a3', 'a4', 'jump', 'evade'].includes(name)) {
      const t = actor.animT, hit = attack.hit[0];
      const aim = Math.min(1, t / 100) * (1 - Math.max(0, Math.min(1, (t - hit - 60) / Math.max(1, attack.dur - hit - 60))));
      const uaf = lerp(p.uaf || 0, -96 - (p.torso || 0) - (p.rr || 0), aim);
      const faf = lerp(p.faf || 0, -4, aim);
      return { ...p, uaf, faf, hf: lerp(p.hf || 0, -90 - (p.torso || 0) - (p.rr || 0) - uaf - faf, aim),
        bowDraw: aim, bowRelease: Math.max(0, Math.min(1, (t - hit) / 30)) };
    }
  }
  return p;
}
