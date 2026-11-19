// 사람이 아닌 몸 (네발짐승·덩어리·전갈·용·거인). 몬스터 AI는 m_*/b_* 이름을 부르고
// 리그의 clips 표가 아래 클립으로 바꿔 준다.

// ---------------- 네발짐승 ----------------
const QS = { torso: 0, head: 0, thf: 6, shf: -6, thb: -16, shb: 26, uaf: 10, faf: -8, uab: -12, fab: 22, tail: 0 };
const QD = d => ({ ...QS, ...d });
Object.assign(CLIPS, {
  q_idle: { loop: true, dur: 1200, at(t) { const s = Math.sin(t / 1200 * Math.PI * 2); return QD({ torso: s * 1.5, head: -s * 3, sq: s * 0.015 }); } },
  q_walk: { loop: true, dur: 640, amp: 22, at(t) {
    const ph = t / 640 * Math.PI * 2, s = Math.sin(ph), c = Math.cos(ph), a = 22, sw = v => Math.max(0, v);
    return QD({ thf: -s * a, shf: sw(c) * a * 1.2, uaf: s * a, faf: sw(-c) * a * 1.2, thb: s * a, shb: -sw(-c) * a * 0.6, uab: -s * a, fab: -sw(c) * a * 0.6, head: c * 3, torso: s * 2, sq: Math.abs(c) * 0.02 });
  } },
  q_run: { loop: true, dur: 460, amp: 34, at(t) {
    const ph = t / 460 * Math.PI * 2, s = Math.sin(ph), c = Math.cos(ph), a = 34;
    return QD({
      thf: -s * a - 6, shf: Math.max(0, c) * a, uaf: -Math.sin(ph - 0.5) * a - 6, faf: Math.max(0, Math.cos(ph - 0.5)) * a,
      thb: c * a, shb: -Math.max(0, s) * a * 0.5, uab: Math.cos(ph - 0.5) * a, fab: -Math.max(0, Math.sin(ph - 0.5)) * a * 0.5,
      rr: s * 5, torso: c * 4, head: -c * 5, sq: Math.abs(s) * 0.04,
    });
  } },
  q_windup: keyClip([[0, QS], [220, QD({ rr: 4, head: 14, torso: 4, thf: 24, shf: -34, uaf: 20, faf: -30, thb: -24, shb: 44, uab: -20, fab: 40, sq: -0.08 }), 'out'], [420, QD({ rr: 5, head: 16, torso: 4, thf: 26, shf: -36, uaf: 22, faf: -32, thb: -26, shb: 46, uab: -22, fab: 42, sq: -0.1 })]]),
  q_stab: keyClip([[0, QD({ rr: 5, head: 16, thf: 26, shf: -36, thb: -26, shb: 46, sq: -0.1 })], [90, QD({ rr: -14, head: -12, torso: -4, thf: -75, shf: -20, uaf: -70, faf: -15, thb: 55, shb: 20, uab: 50, fab: 20, sq: 0.08 }), 'back'], [360, QD({ rr: -4, head: 4, thf: -20, uaf: -16, thb: 14, uab: 12 }), 'out']]),
  q_flinch: keyClip([[0, QS], [80, QD({ rr: 8, head: 22, torso: 6, sq: -0.06 }), 'out'], [380, QD({ rr: 2, head: 6 }), 'io']]),
  q_air: { loop: true, dur: 400, at() { return QD({ rr: 28, head: 20, thf: -40, shf: 30, uaf: -30, thb: 40, shb: 20, uab: 50, tail: 30 }); } },
  q_down: { loop: true, dur: 400, at() { return QD({ head: 22, thf: -85, shf: 10, uaf: -78, faf: 10, thb: 85, shb: -10, uab: 80, fab: -10, tail: 20, sq: -0.06 }); } },
  q_getup: keyClip([[0, QD({ head: 22, thf: -85, uaf: -78, thb: 85, uab: 80 })], [220, QD({ rr: -6, head: 6, thf: -30, shf: 30, thb: 30, shb: 30, sq: -0.06 }), 'out'], [420, QS, 'io']]),
  q_howl: { loop: true, dur: 500, at(t) { const s = Math.sin(t / 500 * Math.PI * 2); return QD({ rr: -8, torso: -10, head: -40 + s * 4, thf: -8, uaf: -6, sq: s * 0.02 }); } },
  q_rear: keyClip([[0, QS], [380, QD({ rr: -30, thf: -80, shf: 40, uaf: -70, faf: 40, head: -10, thb: 20, uab: 16 }), 'out'], [520, QD({ rr: 6, thf: -10, shf: 0, uaf: -6, head: 14, sq: -0.1 }), 'in'], [900, QS, 'io']]),
});
const QUAD_MAP = { m_idle: 'q_idle', idle: 'q_idle', m_walk: 'q_walk', b_walk: 'q_walk', m_run: 'q_run', m_windup: 'q_windup', m_stab: 'q_stab', m_flinch: 'q_flinch', m_hurt: 'q_flinch', m_air: 'q_air', m_down: 'q_down', m_getup: 'q_getup', m_taunt: 'q_howl', m_cast: 'q_howl', m_throwup: 'q_windup', m_throw: 'q_stab', b_smashup: 'q_windup', b_smash: 'q_stab', b_roar: 'q_howl', b_stomp: 'q_rear' };

// ---------------- 덩어리 ----------------
Object.assign(CLIPS, {
  bl_idle: { loop: true, dur: 900, at(t) { const s = Math.sin(t / 900 * Math.PI * 2); return { sq: s * 0.07, rr: s * 2, head: -s * 2 }; } },
  bl_move: { loop: true, dur: 420, at(t) { const s = Math.sin(t / 420 * Math.PI * 2); return { sq: s * 0.12, rr: 5 + s * 3, head: s * 3 }; } },
  bl_windup: keyClip([[0, {}], [300, { sq: -0.16, rr: -8, head: 6 }, 'out'], [420, { sq: -0.18, rr: -9, head: 8 }]]),
  bl_stab: keyClip([[0, { sq: -0.18, rr: -9 }], [80, { sq: 0.18, rr: 12, head: -6 }, 'back'], [360, { sq: 0.02, rr: 2 }, 'out']]),
  bl_flinch: keyClip([[0, {}], [70, { sq: -0.14, rr: -12 }, 'out'], [360, { sq: 0, rr: 0 }, 'io']]),
  bl_air: { loop: true, dur: 400, at(t) { return { rr: -30 + Math.sin(t / 100) * 6, sq: 0.08 }; } },
  bl_down: { loop: true, dur: 400, at() { return { sq: -0.18, rr: 0, head: 10 }; } },
  bl_getup: keyClip([[0, { sq: -0.18 }], [200, { sq: 0.14 }, 'out'], [420, { sq: 0 }, 'io']]),
  bl_cast: { loop: true, dur: 400, at(t) { const s = Math.sin(t / 400 * Math.PI * 2); return { sq: s * 0.12, rr: s * 4, head: s * 6 }; } },
});
const BLOB_MAP = { m_idle: 'bl_idle', idle: 'bl_idle', m_walk: 'bl_move', b_walk: 'bl_move', m_run: 'bl_move', m_windup: 'bl_windup', m_stab: 'bl_stab', m_flinch: 'bl_flinch', m_hurt: 'bl_flinch', m_air: 'bl_air', m_down: 'bl_down', m_getup: 'bl_getup', m_taunt: 'bl_cast', m_cast: 'bl_cast', m_throwup: 'bl_windup', m_throw: 'bl_stab', b_smashup: 'bl_windup', b_smash: 'bl_stab', b_roar: 'bl_cast', b_stomp: 'bl_stab' };

// ---------------- 전갈 ----------------
const SCS = { t0: 0, t1: 0, t2: 0, t3: 0, st: 0, uaf: 0, faf: 0, hf: 0 };
const SC = d => ({ ...SCS, ...d });
const scLegs = (ph, a) => { const o = {}; for (let i = 0; i < 3; i++) { o['lf' + i] = Math.sin(ph + i * 2.1) * a; o['lb' + i] = Math.sin(ph + i * 2.1 + Math.PI) * a; } return o; };
Object.assign(CLIPS, {
  sc_idle: { loop: true, dur: 1000, at(t) { const s = Math.sin(t / 1000 * Math.PI * 2); return SC({ t0: s * 4, faf: 8 + s * 8, hf: -8 - s * 8, uaf: s * 4 }); } },
  sc_walk: { loop: true, dur: 420, amp: 18, at(t) { const ph = t / 420 * Math.PI * 2; return SC({ ...scLegs(ph, 18), t0: Math.sin(ph) * 3, uaf: Math.cos(ph) * 4 }); } },
  sc_windup: keyClip([[0, SCS], [300, SC({ t0: 20, t1: 15, st: 25, uaf: -30, faf: 20, hf: -20, rr: 3, sq: -0.05 }), 'out'], [420, SC({ t0: 22, t1: 17, st: 28, uaf: -32, faf: 22, hf: -22, rr: 3 })]]),
  sc_stab: keyClip([[0, SC({ t0: 22, t1: 17, st: 28, uaf: -32 })], [80, SC({ t0: -35, t1: -40, t2: -30, st: -50, uaf: -60, faf: -10, hf: 10, rr: -4, sq: 0.06 }), 'back'], [380, SC({ t0: -5, t1: -5, st: -5 }), 'out']]),
  sc_flinch: keyClip([[0, SCS], [80, SC({ rr: 6, t0: 15, uaf: 20, sq: -0.06 }), 'out'], [360, SCS, 'io']]),
  sc_air: { loop: true, dur: 400, at() { return SC({ rr: 30, t0: 30, uaf: 30, lf0: 40, lf1: 40, lf2: 40, lb0: -40, lb1: -40, lb2: -40 }); } },
  sc_down: { loop: true, dur: 400, at() { return SC({ t0: -40, t1: -20, uaf: 30, lf0: -70, lf1: -70, lf2: -70, lb0: 70, lb1: 70, lb2: 70, sq: -0.06 }); } },
  sc_getup: keyClip([[0, SC({ t0: -40, lf0: -70, lf1: -70, lf2: -70 })], [300, SCS, 'out']]),
  sc_cast: { loop: true, dur: 400, at(t) { const s = Math.sin(t / 400 * Math.PI * 2); return SC({ t0: 15 + s * 10, uaf: -40 + s * 10, faf: 20, hf: -20 }); } },
});
const SCORP_MAP = { m_idle: 'sc_idle', idle: 'sc_idle', m_walk: 'sc_walk', b_walk: 'sc_walk', m_run: 'sc_walk', m_windup: 'sc_windup', m_stab: 'sc_stab', m_flinch: 'sc_flinch', m_hurt: 'sc_flinch', m_air: 'sc_air', m_down: 'sc_down', m_getup: 'sc_getup', m_taunt: 'sc_cast', m_cast: 'sc_cast', m_throwup: 'sc_windup', m_throw: 'sc_stab', b_smashup: 'sc_windup', b_smash: 'sc_stab', b_roar: 'sc_cast', b_stomp: 'sc_stab' };

// ---------------- 용·와이번 ----------------
const WYS = { neck: 0, neck1: 0, neck2: 0, head: 0, jaw: 0, thf: 0, shf: 0, uaf: 4, faf: 0, thb: 0, shb: 0, uab: -4, fab: 0 };
const WY = d => ({ ...WYS, ...d });
Object.assign(CLIPS, {
  wy_idle: { loop: true, dur: 1600, at(t) { const s = Math.sin(t / 1600 * Math.PI * 2); return WY({ neck: s * 4, neck1: s * 3, head: -s * 5, jaw: Math.max(0, s) * 4, sq: s * 0.01 }); } },
  wy_walk: { loop: true, dur: 900, amp: 18, at(t) { const ph = t / 900 * Math.PI * 2, s = Math.sin(ph), c = Math.cos(ph), a = 18; return WY({ thb: s * a, shb: Math.max(0, -c) * a, uab: -s * a, fab: Math.max(0, c) * a, thf: -s * a, uaf: s * a, neck: c * 4, head: -c * 4, rr: s * 2 }); } },
  wy_windup: keyClip([[0, WYS], [500, WY({ neck: -30, neck1: -15, head: -20, jaw: 6, rr: -6, sq: -0.04 }), 'out'], [800, WY({ neck: -34, neck1: -18, head: -24, jaw: 10, rr: -7 })]]),
  wy_stab: keyClip([[0, WY({ neck: -34, neck1: -18, head: -24 })], [120, WY({ neck: 30, neck1: 20, head: 10, jaw: 35, rr: 8, sq: 0.05 }), 'in'], [700, WY({ neck: 24, neck1: 16, head: 6, jaw: 30, rr: 6 })], [1000, WYS, 'io']]),
  wy_roar: { loop: true, dur: 300, at(t) { const s = Math.sin(t / 300 * Math.PI * 2); return WY({ neck: -24 + s * 3, neck1: -12, head: -30 + s * 4, jaw: 38, rr: -5 }); } },
  wy_rear: keyClip([[0, WYS], [400, WY({ rr: -22, thf: -60, uaf: -50, neck: -10, head: -10 }), 'out'], [520, WY({ rr: 6, neck: 16, head: 10, sq: -0.08 }), 'in'], [900, WYS, 'io']]),
  wy_flinch: keyClip([[0, WYS], [90, WY({ rr: 5, neck: -20, head: -20, jaw: 20 }), 'out'], [420, WYS, 'io']]),
  wy_air: { loop: true, dur: 400, at() { return WY({ rr: 15, neck: -20, head: -20, jaw: 20 }); } },
  wy_down: { loop: true, dur: 400, at() { return WY({ neck: 40, neck1: 20, head: 20, jaw: 10, thf: -70, uaf: -70, thb: 70, uab: 70, sq: -0.05 }); } },
  wy_getup: keyClip([[0, WY({ neck: 40, head: 20, thf: -70, uaf: -70, thb: 70, uab: 70 })], [500, WYS, 'out']]),
});
const WYRM_MAP = { m_idle: 'wy_idle', idle: 'wy_idle', m_walk: 'wy_walk', b_walk: 'wy_walk', m_run: 'wy_walk', m_windup: 'wy_windup', m_stab: 'wy_stab', m_flinch: 'wy_flinch', m_hurt: 'wy_flinch', m_air: 'wy_air', m_down: 'wy_down', m_getup: 'wy_getup', m_taunt: 'wy_roar', m_cast: 'wy_roar', m_throwup: 'wy_windup', m_throw: 'wy_stab', b_smashup: 'wy_windup', b_smash: 'wy_stab', b_roar: 'wy_roar', b_stomp: 'wy_rear' };

// ---------------- 거인 상반신 ----------------
const GS = { torso: 0, head: 0, uab: -40, fab: -70, hb: 0, uaf: -55, faf: -75, hf: 0 };
const GI = d => ({ ...GS, ...d });
Object.assign(CLIPS, {
  g_idle: { loop: true, dur: 2000, at(t) { const s = Math.sin(t / 2000 * Math.PI * 2); return GI({ torso: s * 2, head: -s * 2, uab: -40 + s * 4, uaf: -55 - s * 4, sq: s * 0.01 }); } },
  g_walk: { loop: true, dur: 1200, at(t) { const s = Math.sin(t / 1200 * Math.PI * 2); return GI({ torso: s * 5, head: -s * 3, uab: -40 + s * 8, uaf: -55 + s * 8 }); } },
  g_smashup: keyClip([[0, GS], [600, GI({ torso: -16, head: -12, uab: -170, fab: -20, uaf: -165, faf: -20, sq: 0.04 }), 'out'], [800, GI({ torso: -18, head: -14, uab: -175, fab: -22, uaf: -170, faf: -22 })]]),
  g_smash: keyClip([[0, GI({ torso: -18, uab: -175, uaf: -170 })], [140, GI({ torso: 34, head: 14, uab: -50, fab: -10, uaf: -45, faf: -10, sq: -0.06 }), 'in'], [800, GI({ torso: 30, head: 12, uab: -50, uaf: -45 })], [1100, GS, 'io']]),
  g_roar: { loop: true, dur: 300, at(t) { const s = Math.sin(t / 300 * Math.PI * 2); return GI({ torso: -12 + s * 2, head: -26 + s * 3, uab: -60, fab: -50, uaf: 50, faf: -50 }); } },
  g_windup: keyClip([[0, GS], [300, GI({ torso: -10, uaf: 40, faf: -100, sq: -0.03 }), 'out'], [420, GI({ torso: -12, uaf: 44, faf: -105 })]]),
  g_stab: keyClip([[0, GI({ torso: -12, uaf: 44, faf: -105 })], [90, GI({ torso: 20, uaf: -95, faf: -5, head: 6 }), 'back'], [420, GI({ torso: 10, uaf: -70 }), 'out']]),
  g_flinch: keyClip([[0, GS], [90, GI({ torso: -16, head: -16 }), 'out'], [420, GS, 'io']]),
  g_down: { loop: true, dur: 400, at() { return GI({ torso: 40, head: 26, uab: -30, uaf: -60, faf: -10 }); } },
  g_getup: keyClip([[0, GI({ torso: 40, head: 26 })], [600, GS, 'out']]),
});
const GIANT_MAP = { m_idle: 'g_idle', idle: 'g_idle', m_walk: 'g_walk', b_walk: 'g_walk', m_run: 'g_walk', m_windup: 'g_windup', m_stab: 'g_stab', m_flinch: 'g_flinch', m_hurt: 'g_flinch', m_air: 'g_flinch', m_down: 'g_down', m_getup: 'g_getup', m_taunt: 'g_roar', m_cast: 'g_roar', m_throwup: 'g_smashup', m_throw: 'g_smash', b_smashup: 'g_smashup', b_smash: 'g_smash', b_roar: 'g_roar', b_stomp: 'g_smash' };

// ---------------- 주인공 직업별 동작 ----------------
// 활: 앞팔을 앞으로 뻗고 뒷팔로 시위를 당긴다
const BOW_AIM = { torso: 6, head: 0, uaf: -88, faf: -4, uab: -70, fab: -110, hb: 60 };
Object.assign(CLIPS, {
  r_shoot: keyClip([
    [0, S(0, { torso: 4, uaf: -60, faf: -30 })],
    [90, S(0, { ...BOW_AIM, uab: -78, fab: -100, ...LUNGE_S, sq: -0.03 }), 'out'],
    [150, S(0, { ...BOW_AIM, uab: -60, fab: -130, ...LUNGE_S }), 'lin'],
    [190, S(0, { ...BOW_AIM, uab: -40, fab: -40, torso: 2, ...LUNGE_S, sq: 0.03 }), 'out'],
    [320, S(0, { ...BOW_AIM, uab: -30, fab: -30 }), 'io'],
  ]),
  r_volley: keyClip([
    [0, S(0, {})],
    [140, S(0, { torso: -20, head: -26, uaf: -150, faf: -10, uab: -130, fab: -90, hb: 60, ...CROUCH }), 'out'],
    [220, S(0, { torso: -22, head: -28, uaf: -155, faf: -8, uab: -110, fab: -30, hb: 60, ...UPL }), 'out'],
    [420, S(0, { torso: -10, uaf: -120, faf: -20 }), 'io'],
  ]),
  // 마법: 지팡이를 앞으로 내밀고 앞손을 편다
  c_cast: keyClip([
    [0, S(0, {})],
    [90, S(0, { torso: -8, uab: -150, fab: -30, hb: -100, uaf: -40, faf: -60, ...CROUCH, sq: -0.04 }), 'out'],
    [150, S(0, { torso: 18, uab: -95, fab: -10, hb: -90, uaf: -95, faf: -5, ...LUNGE_S, sq: 0.05 }), 'back'],
    [320, S(0, { torso: 12, uab: -85, fab: -10, hb: -92, uaf: -80, faf: -10, ...LUNGE_S }), 'io'],
  ]),
  c_big: keyClip([
    [0, S(0, {})],
    [200, S(0, { torso: -16, head: -18, uab: -175, fab: -10, hb: -90, uaf: -170, faf: -10, ry: -8, ...UPL, sq: 0.05 }), 'out'],
    [300, S(0, { torso: -18, head: -20, uab: -178, fab: -10, hb: -90, uaf: -175, faf: -8, ...UPL }), 'lin'],
    [380, S(0, { torso: 24, uab: -80, fab: -10, hb: -90, uaf: -90, faf: 0, ...LUNGE, sq: -0.05 }), 'in'],
    [560, S(0, { torso: 18, uab: -75, uaf: -80, ...LUNGE }), 'io'],
  ]),
});
