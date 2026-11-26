// 직업마다 다른 자세·걸음·휘두르기·버릇.
// 무기 방향은 WA(자세, 각도)로 정한다: 각도 0=아래, -90=앞, -180=위, 90=뒤 (화면 기준, 오른쪽을 볼 때)
const WA = (p, a) => ({ ...p, hb: a + 90 - ((p.rr || 0) + (p.torso || 0) + (p.uab || 0) + (p.fab || 0)) });
// 지팡이(그림을 뒤집어 단 무기)는 머리 쪽 방향으로 정한다
const MWA = (p, a) => WA(p, a - 180);
const X = (base, d) => ({ ...base, ...d });
// 앞손에 든 것(단검·활)의 방향
const WF = (p, a) => ({ ...p, hf: a + 90 - ((p.rr || 0) + (p.torso || 0) + (p.uaf || 0) + (p.faf || 0)) });
const RW = (p, a, f) => WF(WA(p, a), f);
// 두 손으로 쥐는 무기: 앞팔이 뒷팔을 따라간다
const TWO = (p, du = -6, df = 4) => ({ ...p, uaf: (p.uab || 0) + du, faf: (p.fab || 0) + df });

// ---------------- 기본 자세 ----------------
const STANCE = {
  // 오델리아: 망치를 어깨에 걸치고 방패를 앞에, 다리를 넓게
  paladin: WA({ torso: 2, head: -2, uab: -24, fab: -128, uaf: -38, faf: -64, thf: -26, shf: 20, ftf: 0, thb: 26, shb: 8, ftb: 0, cape: 0 }, 135),
  // 키르: 낮게 웅크리고 단검 두 자루를 앞으로
  rogue: RW({ torso: 22, head: -16, uab: -46, fab: -70, uaf: -78, faf: -58, thf: -44, shf: 64, ftf: 0, thb: 34, shb: 42, ftb: 0, rr: 2, cape: 10 }, -120, -130),
  // 미라엘: 지팡이를 세워 들고 앞손에 마력을 모은다, 다리를 모아 가볍게
  mage: MWA({ torso: -2, head: -4, uab: -28, fab: -52, uaf: -58, faf: -86, thf: -10, shf: 10, ftf: 0, thb: 12, shb: 6, ftb: 0, cape: 0 }, -176),
  // 세릴: 활을 낮게 들고 반쯤 돌아선 사냥꾼 자세
  ranger: WF(WA({ torso: 8, head: -6, uab: 14, fab: -48, uaf: -26, faf: -12, thf: -20, shf: 18, ftf: 0, thb: 22, shb: 12, ftb: 0, cape: 0 }, 60), -165),
  // 녹타: 대검을 어깨에 메고 구부정하게
  hexblade: TWO(WA({ torso: 10, head: 8, uab: -14, fab: -124, thf: -28, shf: 26, ftf: 0, thb: 28, shb: 14, ftb: 0, cape: 4 }, 128), -22, 6),
};
STANCE.warrior = P.stand;

// ---------------- 걸음·달리기 ----------------
// up: 걸을 때 위 몸 자세(팔·무기). 없으면 기본 자세를 쓴다
function locoClips(key, o) {
  const base = STANCE[key];
  const walkUp = o.walkUp || base, runUp = o.runUp || base;
  CLIPS[key + '_walk'] = { loop: true, dur: o.walkDur, amp: o.walkAmp, at(t) {
    const ph = t / o.walkDur * Math.PI * 2, s = Math.sin(ph), c = Math.cos(ph), a = o.walkAmp, sw = sPos;   // ✏️ 2026-11-25 매끈한 꺾임
    return levelHips(add(upper(walkUp), {
      thf: -s * a - 4 + (o.knee || 0) * -0.4, shf: 8 + sw(c) * a * 1.6 + (o.knee || 0), ftf: -sw(c) * 10,
      thb: s * a - 4 + (o.knee || 0) * -0.4, shb: 8 + sw(-c) * a * 1.6 + (o.knee || 0), ftb: -sw(-c) * 10,
      uab: s * a * (o.armSwing ?? 0.3), uaf: -s * a * (o.armSwingF ?? 0.2),
      torso: (o.lean || 0) - sAbs(c) * (o.bob || 2), head: sAbs(c) * 2, cape: 10 + c * 6, rr: o.rr || 2,
      sq: sAbs(c) * (o.sq || 0.015),
    }));
  } };
  CLIPS[key + '_run'] = { loop: true, dur: o.runDur, amp: o.runAmp, at(t) {
    const ph = t / o.runDur * Math.PI * 2, s = Math.sin(ph), c = Math.cos(ph), a = o.runAmp, sw = sPos, fx = o.runFlex ?? RUN_FLEX;   // ✏️ 2026-11-26 디딘 다리 무릎
    return levelHips(add(upper(runUp), {
      thf: -s * a - 14, shf: 14 + sw(c) * a * 2.0 + sw(-c) * fx, ftf: -sw(c) * 18,
      thb: s * a - 14, shb: 14 + sw(-c) * a * 2.0 + sw(c) * fx, ftb: -sw(-c) * 18,
      uab: s * a * (o.runSwing ?? 0.3), uaf: -s * a * (o.runSwingF ?? 0.2),
      torso: (o.runLean || 12) + sAbs(c) * 3, head: o.runHead || -8, cape: 34 + c * 10, rr: o.runRr || 5,
      sq: sAbs(s) * (o.runSq || 0.03),
    }));
  } };
}
// 오델리아: 묵직한 행진, 망치는 어깨에
locoClips('paladin', { walkDur: 820, walkAmp: 18, armSwing: 0.05, armSwingF: 0.15, bob: 3, sq: 0.025, lean: 2,
  runDur: 640, runAmp: 28, runUp: WA(X(STANCE.paladin, { uab: -20, fab: -120, uaf: -60, faf: -40 }), 140), runSwing: 0.05, runSwingF: 0.1, runLean: 10, runSq: 0.04 });
// 키르: 낮고 빠른 잰걸음, 달릴 때는 팔을 뒤로 젖힌 그림자 달리기
locoClips('rogue', { walkDur: 520, walkAmp: 20, knee: 18, armSwing: 0.15, armSwingF: 0.15, lean: 20, rr: 3,
  runDur: 420, runAmp: RUN_OLD ? 40 : 30, runUp: RW(X(STANCE.rogue, { uab: 60, fab: -10, uaf: 55, faf: -10, head: -22 }), 60, 70), runSwing: 0.05, runSwingF: 0.05, runLean: 34, runHead: -24, runRr: 8, runSq: 0.02 });
// 미라엘: 사뿐한 걸음, 달릴 때 망토가 날린다
locoClips('mage', { walkDur: 700, walkAmp: 16, armSwing: 0.1, armSwingF: 0.3, bob: 1, lean: -2,
  runDur: 560, runAmp: 30, runUp: MWA(X(STANCE.mage, { uab: 20, fab: -40, uaf: -20, faf: -60 }), -140), runSwing: 0.2, runSwingF: 0.4, runLean: 10 });
// 세릴: 가볍게 튀는 사냥꾼 걸음
locoClips('ranger', { walkDur: 620, walkAmp: 24, armSwing: 0.35, armSwingF: 0.15, bob: 3, sq: 0.03,
  runDur: 480, runAmp: RUN_OLD ? 40 : 30, runUp: WF(WA(X(STANCE.ranger, { uaf: -10, faf: -20, uab: 30 }), 70), -150), runSwing: 0.4, runSwingF: 0.3, runLean: 16, runSq: 0.045 });
// 녹타: 대검을 땅에 끌며 무겁게
const HEX_DRAG = TWO(WA({ ...STANCE.hexblade, uab: 30, fab: -6, torso: 14, head: 10 }, 112), -10, 0);
locoClips('hexblade', { walkDur: 900, walkAmp: 16, armSwing: 0.02, armSwingF: 0.02, bob: 3, lean: 12, sq: 0.02, walkUp: HEX_DRAG,
  runDur: 620, runAmp: 30, runUp: TWO(WA({ ...HEX_DRAG, uab: 40, torso: 24 }, 105), -10, 0), runSwing: 0.02, runSwingF: 0.02, runLean: 26, runHead: 6 });

// ---------------- 대기 (숨쉬기) ----------------
for (const key of ['paladin', 'rogue', 'mage', 'ranger', 'hexblade']) {
  const base = STANCE[key];
  const sp = { paladin: 2000, rogue: 1100, mage: 1800, ranger: 1500, hexblade: 2300 }[key];
  CLIPS[key + '_idle'] = { loop: true, dur: sp, at(t) {
    const s = Math.sin(t / sp * Math.PI * 2);
    const extra = key === 'rogue' ? { thf: -s * 3, shf: s * 5, thb: s * 3, rr: s * 1 } : key === 'mage' ? { uaf: s * 6, faf: -s * 8 } : key === 'hexblade' ? { torso: s * 2.5, head: -s * 3 } : {};
    return add(base, { torso: s * 1.5, head: -s * 1.5, uab: s * 2, uaf: -s * 2, cape: s * 3, shb: s * 3, shf: s * 3, sq: s * 0.012, ...extra });
  } };
}

// ---------------- 공격 ----------------
// 오델리아 (망치): 공격 표 시간 a1/a2 [113,205]/346, a3 [124,216]/367, a4 [232,313]/529
const PS = STANCE.paladin;
Object.assign(CLIPS, {
  pa_atk1: keyClip([ // 머리 위에서 내려치기
    [0, PS],
    [70, WA(X(PS, { torso: -10, head: -8, uab: -195, fab: -24, uaf: -50, faf: -60, ...CROUCH, sq: -0.05 }), 150), 'out'],
    [108, WA(X(PS, { torso: -12, head: -9, uab: -200, fab: -26, uaf: -52, faf: -60, ...CROUCH, shf: 52, sq: -0.06 }), 152), 'lin'],
    [150, WA(X(PS, { torso: 30, head: 6, uab: -60, fab: -8, uaf: -20, faf: -40, ...LUNGE, sq: 0.07 }), -35), 'in'],
    [230, WA(X(PS, { torso: 28, uab: -58, fab: -8, uaf: -20, faf: -40, ...LUNGE }), -30), 'out'],
    [346, WA(X(PS, { torso: 18, uab: -50, fab: -20, ...LUNGE_S }), -45), 'io'],
  ]),
  pa_atk2: keyClip([ // 아래에서 위로 퍼올리기
    [0, WA(X(PS, { torso: 18, uab: -50, fab: -20, ...LUNGE_S }), -45)],
    [80, WA(X(PS, { torso: 16, uab: 50, fab: -24, uaf: -30, faf: -70, ...CROUCH, sq: -0.05 }), 40), 'out'],
    [108, WA(X(PS, { torso: 18, uab: 54, fab: -24, ...CROUCH, shf: 52, sq: -0.06 }), 42), 'lin'],
    [150, WA(X(PS, { torso: -14, head: -12, uab: -150, fab: -12, uaf: -40, faf: -60, ...UPL, sq: 0.07 }), -165), 'out'],
    [240, WA(X(PS, { torso: -12, uab: -145, fab: -14, ...UPL }), -160), 'out'],
    [346, WA(X(PS, { torso: -6, uab: -120, fab: -30 }), -140), 'io'],
  ]),
  pa_atk3: keyClip([ // 방패로 들이받기
    [0, WA(X(PS, { torso: -6, uab: -120, fab: -30 }), -140)],
    [80, WA(X(PS, { torso: -14, uaf: 30, faf: -70, uab: -30, fab: -120, ...CROUCH, sq: -0.06 }), 140), 'out'],
    [118, WA(X(PS, { torso: -16, uaf: 34, faf: -72, uab: -30, fab: -120, ...CROUCH, shf: 52 }), 140), 'lin'],
    [150, WA(X(PS, { torso: 26, uaf: -92, faf: -8, uab: -20, fab: -120, rr: 4, ...LUNGE, sq: 0.06 }), 135), 'back'],
    [367, WA(X(PS, { torso: 14, uaf: -60, faf: -40, uab: -24, fab: -125, ...LUNGE_S }), 135), 'io'],
  ]),
  pa_atk4: keyClip([ // 망치를 크게 한 바퀴 돌려 땅을 내리찍기
    [0, PS],
    [120, WA(X(PS, { torso: 20, uab: 40, fab: -10, uaf: -30, faf: -60, rr: 4, ...CROUCH, sq: -0.05 }), 40), 'out'],
    [190, WA(X(PS, { torso: -20, head: -16, uab: -200, fab: -10, uaf: -150, faf: -20, rr: -6, ...UPL, sq: 0.08 }), 170), 'out'],
    [225, WA(X(PS, { torso: -22, head: -18, uab: -205, fab: -10, uaf: -155, faf: -20, rr: -6, ...UPL }), 175), 'lin'],
    [262, WA(X(PS, { torso: 44, head: 12, uab: -40, fab: 0, uaf: -30, faf: -10, rr: 8, thf: -72, shf: 96, thb: 46, shb: 50, sq: -0.09 }), 5), 'in'],
    [420, WA(X(PS, { torso: 40, uab: -40, fab: 0, rr: 7, thf: -68, shf: 92, thb: 44, shb: 46 }), 8), 'out'],
    [529, WA(X(PS, { torso: 26, uab: -40, fab: -20, rr: 4, ...LUNGE_S }), -20), 'io'],
  ]),
});

// 키르 (쌍단검): a1/a2 [78,141]/237, a3 [85,148]/252, a4 [159,215]/363, dash [90,150]/330
const RS = STANCE.rogue;
Object.assign(CLIPS, {
  ro_atk1: keyClip([ // 뒷손 찌르기
    [0, WF(RS, -130)],
    [45, WF(WA(X(RS, { torso: 14, uab: 30, fab: -110, uaf: -90, faf: -40, ...CROUCH, sq: -0.04 }), -60), -60), 'out'],
    [82, WF(WA(X(RS, { torso: 34, head: -22, uab: -98, fab: 0, uaf: -40, faf: -90, ...LUNGE, sq: 0.05 }), -92), -40), 'back'],
    [237, WF(WA(X(RS, { torso: 28, uab: -80, fab: -20, ...LUNGE_S }), -95), -60), 'io'],
  ]),
  ro_atk2: keyClip([ // 앞손 찌르기 (반대 손)
    [0, WF(WA(X(RS, { torso: 28, uab: -80, fab: -20, ...LUNGE_S }), -95), -60)],
    [45, WF(WA(X(RS, { torso: 10, uaf: 30, faf: -100, uab: -70, fab: -60, ...CROUCH, sq: -0.04 }), -110), 40), 'out'],
    [82, WF(WA(X(RS, { torso: 34, head: -22, uaf: -100, faf: 0, uab: 20, fab: -60, rr: 3, ...LUNGE, sq: 0.05 }), 20), -92), 'back'],
    [237, WF(WA(X(RS, { torso: 26, uaf: -80, faf: -20, uab: 0, fab: -70, ...LUNGE_S }), -20), -80), 'io'],
  ]),
  ro_atk3: keyClip([ // 몸을 돌리며 가로 베기
    [0, WF(RS, -130)],
    [50, WF(WA(X(RS, { torso: 0, rr: 10, uab: -150, fab: -20, uaf: -150, faf: -10, ...CROUCH }), -170), -170), 'out'],
    [90, WF(WA(X(RS, { torso: 30, rr: -14, uab: -40, fab: -10, uaf: 30, faf: -10, ...LUNGE_S, sq: 0.05 }), -30), -30), 'in'],
    [150, WF(WA(X(RS, { torso: 26, rr: -10, uab: 20, fab: -10, uaf: 40, faf: -10, ...LUNGE_S }), 30), 40), 'out'],
    [252, WF(RS, -130), 'io'],
  ]),
  ro_atk4: keyClip([ // 두 자루를 엇갈려 X자로 베기
    [0, WF(RS, -130)],
    [110, WF(WA(X(RS, { torso: -14, head: -10, uab: -185, fab: -10, uaf: -175, faf: -10, ...UPL, sq: 0.06 }), -180), -175), 'out'],
    [150, WF(WA(X(RS, { torso: -16, uab: -190, fab: -10, uaf: -180, faf: -10, ...UPL }), -182), -178), 'lin'],
    [175, WF(WA(X(RS, { torso: 42, head: -10, uab: -20, fab: 0, uaf: 10, faf: 0, rr: 6, ...LUNGE, sq: -0.07 }), -10), 10), 'in'],
    [280, WF(WA(X(RS, { torso: 38, uab: -20, fab: 0, uaf: 10, faf: 0, rr: 5, ...LUNGE }), -10), 10), 'out'],
    [363, WF(RS, -130), 'io'],
  ]),
  ro_dash: keyClip([ // 그림자 이동 뒤 등 찌르기
    [0, WF(X(RS, { torso: 40, head: -30, uab: 50, fab: -10, uaf: 40, faf: -10, ...LUNGE }), 60)],
    [90, WF(WA(X(RS, { torso: 30, uab: -100, fab: 0, uaf: -60, faf: -60, ...LUNGE, sq: 0.06 }), -95), -90), 'back'],
    [330, WF(RS, -130), 'io'],
  ]),
});

// 녹타 (대검): a1/a2 [124,224]/378, a3 [136,236]/401, a4 [254,342]/578
const HS = STANCE.hexblade;
Object.assign(CLIPS, {
  hx_atk1: keyClip([ // 두 손으로 크게 가로 휩쓸기
    [0, HS],
    [90, TWO(WA(X(HS, { torso: -16, head: 0, uab: 50, fab: -30, rr: -4, ...CROUCH, sq: -0.05 }), 95)), 'out'],
    [120, TWO(WA(X(HS, { torso: -18, uab: 54, fab: -30, rr: -4, ...CROUCH, shf: 52 }), 98)), 'lin'],
    [170, TWO(WA(X(HS, { torso: 30, head: 10, uab: -90, fab: -4, rr: 6, ...LUNGE, sq: 0.06 }), -85)), 'out'],
    [260, TWO(WA(X(HS, { torso: 34, uab: -40, fab: -10, rr: 6, ...LUNGE }), -20)), 'out'],
    [378, TWO(WA(X(HS, { torso: 22, uab: -20, fab: -20, ...LUNGE_S }), 10)), 'io'],
  ]),
  hx_atk2: keyClip([ // 땅에서 하늘로 베어 올리기
    [0, TWO(WA(X(HS, { torso: 22, uab: -20, fab: -20, ...LUNGE_S }), 10))],
    [100, TWO(WA(X(HS, { torso: 30, uab: 20, fab: -10, ...CROUCH, sq: -0.06 }), 30)), 'out'],
    [124, TWO(WA(X(HS, { torso: 32, uab: 22, fab: -10, ...CROUCH, shf: 52 }), 32)), 'lin'],
    [170, TWO(WA(X(HS, { torso: -20, head: -14, uab: -170, fab: -10, ...UPL, sq: 0.08 }), -175)), 'out'],
    [270, TWO(WA(X(HS, { torso: -18, uab: -165, fab: -12, ...UPL }), -170)), 'out'],
    [378, TWO(WA(X(HS, { torso: -6, uab: -150, fab: -20 }), 160)), 'io'],
  ]),
  hx_atk3: keyClip([ // 머리 위에서 쪼개기
    [0, TWO(WA(X(HS, { torso: -6, uab: -150, fab: -20 }), 160))],
    [110, TWO(WA(X(HS, { torso: -22, head: -16, uab: -200, fab: -20, rr: -5, ...UPL, sq: 0.06 }), 165)), 'out'],
    [136, TWO(WA(X(HS, { torso: -24, uab: -204, fab: -20, rr: -5, ...UPL }), 168)), 'lin'],
    [180, TWO(WA(X(HS, { torso: 46, head: 14, uab: -50, fab: 0, rr: 8, thf: -66, shf: 90, thb: 44, shb: 46, sq: -0.09 }), -15)), 'in'],
    [300, TWO(WA(X(HS, { torso: 42, uab: -50, fab: 0, rr: 7, thf: -62, shf: 86, thb: 42, shb: 42 }), -12)), 'out'],
    [401, HS, 'io'],
  ]),
  hx_atk4: keyClip([ // 한 바퀴 돌며 베기
    [0, HS],
    [150, TWO(WA(X(HS, { torso: 10, uab: 40, fab: -20, rr: 20, ...CROUCH, sq: -0.06 }), 100)), 'out'],
    [220, TWO(WA(X(HS, { torso: 20, uab: -90, fab: 0, rr: -150, ...LUNGE_S }), -90)), 'lin'],
    [270, TWO(WA(X(HS, { torso: 24, uab: -90, fab: 0, rr: -330, ...LUNGE, sq: 0.06 }), -90)), 'lin'],
    [300, TWO(WA(X(HS, { torso: 30, uab: -80, fab: 0, rr: -360, ...LUNGE }), -80)), 'out'],
    [460, TWO(WA(X(HS, { torso: 30, uab: -70, fab: -10, rr: -360, ...LUNGE }), -60)), 'out'],
    [578, X(HS, { rr: -360 }), 'io'],
  ]),
});

// 미라엘 (지팡이·마법): 모두 [150,160]/300
const MS = STANCE.mage;
Object.assign(CLIPS, {
  mg_atk1: keyClip([ // 지팡이를 앞으로 찔러 화염탄
    [0, MS],
    [90, MWA(X(MS, { torso: -10, uab: -40, fab: -100, uaf: -30, faf: -90, ...CROUCH, sq: -0.04 }), 160), 'out'],
    [150, MWA(X(MS, { torso: 20, uab: -95, fab: -6, uaf: -60, faf: -70, ...LUNGE_S, sq: 0.05 }), -92), 'back'],
    [300, MWA(X(MS, { torso: 12, uab: -80, fab: -20, ...LUNGE_S }), -110), 'io'],
  ]),
  mg_atk2: keyClip([ // 앞손을 뻗어 냉기탄 (지팡이는 뒤로)
    [0, MWA(X(MS, { torso: 12, uab: -80, fab: -20, ...LUNGE_S }), -110)],
    [90, MWA(X(MS, { torso: -8, uab: 10, fab: -60, uaf: 20, faf: -110, ...CROUCH, sq: -0.04 }), -160), 'out'],
    [150, MWA(X(MS, { torso: 22, uab: 20, fab: -50, uaf: -96, faf: 0, rr: 3, ...LUNGE_S, sq: 0.05 }), -150), 'back'],
    [300, MWA(X(MS, { torso: 14, uab: 10, fab: -50, uaf: -80, faf: -20 }), -160), 'io'],
  ]),
  mg_atk3: keyClip([ // 지팡이를 머리 위에서 돌려 번개
    [0, MWA(X(MS, { torso: 14, uab: 10, fab: -50, uaf: -80, faf: -20 }), -160)],
    [80, MWA(X(MS, { torso: -14, head: -16, uab: -170, fab: -10, uaf: -150, faf: -20, ...UPL, sq: 0.05 }), -170), 'out'],
    [120, MWA(X(MS, { torso: -14, uab: -170, fab: -10, uaf: -150, faf: -20, ...UPL }), 10), 'lin'],
    [150, MWA(X(MS, { torso: 24, uab: -100, fab: 0, uaf: -90, faf: -10, ...LUNGE, sq: 0.06 }), -95), 'out'],
    [300, MS, 'io'],
  ]),
});
// 큰 마법(4타)도 지팡이 방향을 맞춘다
CLIPS.mg_big = keyClip([
  [0, MS],
  [200, MWA(X(MS, { torso: -16, head: -18, uab: -175, fab: -10, uaf: -170, faf: -10, ...UPL, sq: 0.05 }), -178), 'out'],
  [300, MWA(X(MS, { torso: -18, head: -20, uab: -178, fab: -10, uaf: -175, faf: -8, ...UPL }), -178), 'lin'],
  [380, MWA(X(MS, { torso: 24, uab: -80, fab: -10, uaf: -90, faf: 0, ...LUNGE, sq: -0.05 }), -88), 'in'],
  [560, MWA(X(MS, { torso: 18, uab: -75, fab: -10, uaf: -80, ...LUNGE }), -95), 'io'],
]);

// 세릴 (활): a1/a2/a3 [180,190]/300, a4 [180,190]/460
const RG = STANCE.ranger;
const AIM = { torso: 6, head: -2, uaf: -88, faf: -4, uab: -70, fab: -110, hb: 60 };
Object.assign(CLIPS, {
  rg_atk1: CLIPS.r_shoot,
  rg_atk2: keyClip([ // 한쪽 무릎을 꿇고 빠르게
    [0, X(RG, {})],
    [100, X(RG, { ...AIM, torso: 14, thf: -70, shf: 100, thb: 60, shb: 70, uab: -80, fab: -100, sq: -0.04 }), 'out'],
    [180, X(RG, { ...AIM, torso: 14, thf: -70, shf: 100, thb: 60, shb: 70, uab: -40, fab: -40 }), 'lin'],
    [300, X(RG, { ...AIM, torso: 10, thf: -60, shf: 80, thb: 50, shb: 60, uab: -30, fab: -30 }), 'io'],
  ]),
  rg_atk3: keyClip([ // 몸을 젖히며 위로 쏘아 올리듯
    [0, X(RG, {})],
    [100, WF(X(RG, { ...AIM, torso: -12, head: -14, uaf: -110, faf: -4, uab: -90, fab: -110, ...LUNGE_S, sq: -0.03 }), -205), 'out'],
    [180, WF(X(RG, { ...AIM, torso: -12, head: -14, uaf: -110, faf: -4, uab: -60, fab: -40, ...LUNGE_S }), -205), 'lin'],
    [300, WF(X(RG, { ...AIM, torso: -4, uaf: -96, faf: -4, uab: -40, fab: -30 }), -190), 'io'],
  ]),
  rg_atk4: keyClip([ // 크게 당겨 세 발
    [0, X(RG, {})],
    [130, X(RG, { ...AIM, torso: 14, uab: -60, fab: -150, ...CROUCH, sq: -0.06 }), 'out'],
    [180, X(RG, { ...AIM, torso: 10, uab: -30, fab: -30, rr: -4, ...LUNGE_S, sq: 0.05 }), 'back'],
    [460, X(RG, { ...AIM, torso: 6, uab: -20, fab: -30 }), 'io'],
  ]),
});

// ---------------- 점프·구르기 ----------------
Object.assign(CLIPS, {
  rogue_jump: { loop: true, dur: 500, at(t) { return X(RS, { rr: -(t / 500 * 360) % 360, torso: 40, head: 20, thf: -110, shf: 130, thb: -90, shb: 130, uab: -60, uaf: -60 }); } },
  rogue_roll: { loop: false, dur: 380, at(t) { const k = Math.min(1, t / 300); return X(RS, { rr: k * 540, torso: 40, head: 26, thf: -110, shf: 130, thb: -90, shb: 130, uab: -40, uaf: -40 }); } },
  mage_roll: { loop: false, dur: 380, at(t) { const k = Math.sin(Math.min(1, t / 380) * Math.PI); return MWA(X(MS, { torso: 34 * k, head: -10, uab: 40, fab: -20, uaf: 40, faf: -10, thf: -20, shf: 40, thb: 50, shb: 30, sq: 0.1 * k }), -120); } },
  ranger_roll: { loop: false, dur: 380, at(t) { const k = Math.min(1, t / 380); return X(RG, { rr: -k * 360, torso: 30, head: 20, thf: -100, shf: 120, thb: -80, shb: 120, uab: -40, uaf: -40 }); } },
  hexblade_roll: { loop: false, dur: 380, at(t) { const k = Math.sin(Math.min(1, t / 380) * Math.PI); return TWO(WA(X(HS, { torso: -10 * k, rr: -14 * k, uab: 30, fab: -6, thf: -80 * k, shf: 30, thb: 40 * k, shb: 70 * k, sq: -0.06 * k }), 110), -10, 0); } },
  paladin_jump: { loop: true, dur: 400, at() { return WA(X(PS, { thf: -40, shf: 60, thb: 20, shb: 50, uaf: -70, faf: -40, uab: -150, fab: -30 }), 165); } },
  hexblade_jump: { loop: true, dur: 400, at() { return TWO(WA(X(HS, { thf: -50, shf: 70, thb: 20, shb: 60, uab: -170, fab: -20, torso: -10 }), 170)); } },
  mage_jump: { loop: true, dur: 400, at() { return MWA(X(MS, { thf: -30, shf: 50, thb: 10, shb: 70, uab: -40, fab: -60, uaf: -120, faf: -20 }), -170); } },
  ranger_jump: { loop: true, dur: 400, at() { return X(RG, { thf: -60, shf: 80, thb: 30, shb: 70, uab: -30, uaf: -50, torso: 10 }); } },
});

// ---------------- 대기 버릇 (기획서 10-1절) ----------------
Object.assign(CLIPS, {
  // 하르반: 방패 두드리기, 목 돌리기
  warrior_habit1: keyClip([[0, P.stand], [200, X(P.stand, { uab: -60, fab: -90, uaf: -50, faf: -70 }), 'out'], [300, X(P.stand, { uab: -50, fab: -80, uaf: -50, faf: -70, sq: -0.03 }), 'in'], [400, X(P.stand, { uab: -60, fab: -90, uaf: -50, faf: -70 }), 'out'], [500, X(P.stand, { uab: -50, fab: -80, uaf: -50, faf: -70, sq: -0.03 }), 'in'], [900, P.stand, 'io']]),
  warrior_habit2: keyClip([[0, P.stand], [300, X(P.stand, { head: -20, torso: 2 }), 'io'], [600, X(P.stand, { head: 16 }), 'io'], [900, X(P.stand, { head: -10 }), 'io'], [1200, P.stand, 'io']]),
  // 미라엘: 수정 저글링, 하품
  mage_habit1: keyClip([[0, MS], [200, X(MS, { uaf: -100, faf: -60 }), 'out'], [400, X(MS, { uaf: -60, faf: -90 }), 'in'], [600, X(MS, { uaf: -110, faf: -50 }), 'out'], [800, X(MS, { uaf: -60, faf: -90 }), 'in'], [1100, MS, 'io']]),
  mage_habit2: keyClip([[0, MS], [400, X(MS, { head: -24, torso: -6, uaf: -150, faf: -60, sq: 0.03 }), 'out'], [900, X(MS, { head: -26, torso: -7, uaf: -155, faf: -60 }), 'lin'], [1300, MS, 'io']]),
  // 오델리아: 짧은 기도, 망치를 고쳐 메기
  paladin_habit1: keyClip([[0, PS], [400, X(PS, { head: 18, torso: 6, uaf: -110, faf: -100 }), 'io'], [1300, X(PS, { head: 20, torso: 6, uaf: -110, faf: -100 }), 'lin'], [1700, PS, 'io']]),
  paladin_habit2: keyClip([[0, PS], [250, WA(X(PS, { uab: -100, fab: -60 }), -150), 'out'], [450, WA(X(PS, { uab: -40, fab: -120, sq: -0.03 }), 140), 'in'], [800, PS, 'io']]),
  // 키르: 단검 돌리기, 주변 살피기
  rogue_habit1: { loop: false, dur: 900, at(t) { const k = Math.min(1, t / 900); return WA(X(RS, { uab: -60, fab: -80 }), -120 + k * 720); } },
  rogue_habit2: keyClip([[0, RS], [300, X(RS, { head: -30 }), 'io'], [700, X(RS, { head: 0, torso: 14 }), 'io'], [1000, X(RS, { head: -24 }), 'io'], [1300, RS, 'io']]),
  // 세릴: 화살 깃 고르기, 바람 냄새 맡기
  ranger_habit1: keyClip([[0, RG], [300, X(RG, { uab: -160, fab: -40, head: -10 }), 'out'], [700, X(RG, { uab: -150, fab: -60, head: -12 }), 'lin'], [1000, RG, 'io']]),
  ranger_habit2: keyClip([[0, RG], [400, X(RG, { head: -30, torso: -6 }), 'io'], [1100, X(RG, { head: -32, torso: -7 }), 'lin'], [1400, RG, 'io']]),
  // 녹타: 검을 짚고 기침, 손의 균열 바라보기
  hexblade_habit1: keyClip([[0, HS], [300, TWO(WA(X(HS, { torso: 30, head: 24, uab: -40, fab: -10 }), -2), -10, 0), 'out'], [500, TWO(WA(X(HS, { torso: 36, head: 30, uab: -40, fab: -10, sq: -0.04 }), -2), -10, 0), 'in'], [700, TWO(WA(X(HS, { torso: 30, head: 24, uab: -40, fab: -10 }), -2), -10, 0), 'out'], [1200, HS, 'io']]),
  hexblade_habit2: keyClip([[0, HS], [400, X(HS, { uaf: -120, faf: -110, head: 24 }), 'io'], [1300, X(HS, { uaf: -122, faf: -112, head: 26 }), 'lin'], [1700, HS, 'io']]),
});
// 직업마다 바꿔 쓰는 동작 이름 (리그의 clips 표)
const HERO_CLIPMAP = {};
for (const key of ['paladin', 'rogue', 'mage', 'ranger', 'hexblade']) {
  const m = { idle: key + '_idle', walk: key + '_walk', run: key + '_run' };
  if (CLIPS[key + '_roll']) m.w_roll = key + '_roll';
  if (CLIPS[key + '_jump']) m.w_jump = key + '_jump';
  HERO_CLIPMAP[key] = m;
}
const HABITS = { warrior: ['warrior_habit1', 'warrior_habit2'], mage: ['mage_habit1', 'mage_habit2'], paladin: ['paladin_habit1', 'paladin_habit2'], rogue: ['rogue_habit1', 'rogue_habit2'], ranger: ['ranger_habit1', 'ranger_habit2'], hexblade: ['hexblade_habit1', 'hexblade_habit2'] };
// 직업별 이동 속도 [걷기, 달리기, 점프 힘]
const HERO_MOVE = { warrior: [200, 330, 860], paladin: [180, 300, 800], rogue: [235, 395, 930], mage: [205, 320, 860], ranger: [215, 350, 900], hexblade: [185, 315, 820] };
