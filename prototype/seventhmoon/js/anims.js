// 포즈와 동작 클립. 각도는 rig.js 규약(시계 방향 +, 오른쪽을 볼 때 앞으로 들면 -).
// 뼈: root(골반·몸 전체), torso, head, uab/fab/hb/wpn(뒷팔·무기), uaf/faf/hf/shd(앞팔·방패), thb/shb/ftb, thf/shf/ftf, cape
// rx, ry: 몸 전체 이동(부품 픽셀), rr: 몸 전체 회전

const P = {
  // 하르반: 검은 앞으로, 방패는 가슴 앞
  stand: { torso: 0, head: 0, uab: -18, fab: -55, hb: 0, wpn: 0, uaf: -12, faf: -70, thb: -6, shb: 6, ftb: 0, thf: 8, shf: 4, ftf: -6, cape: 0 },
  standMon: { torso: 8, head: -6, uab: -10, fab: -45, uaf: 10, faf: -20, thb: -10, shb: 14, ftb: -4, thf: 14, shf: 10, ftf: -14, ry: 6 },
};

function lerp(a, b, t) { return a + (b - a) * t; }
function mix(a, b, t) {
  const o = {};
  for (const k in a) o[k] = lerp(a[k], b[k] ?? 0, t);
  for (const k in b) if (!(k in a)) o[k] = lerp(0, b[k], t);
  return o;
}
function add(a, b) { const o = { ...a }; for (const k in b) o[k] = (o[k] || 0) + b[k]; return o; }
const ease = {
  lin: t => t,
  out: t => 1 - (1 - t) * (1 - t),
  in: t => t * t,
  io: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  back: t => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2),
};

// 키프레임 클립: keys = [[ms, pose, easeName]]
function keyClip(keys, loop = false) {
  const dur = keys[keys.length - 1][0];
  return {
    dur, loop,
    at(t) {
      if (loop) t = t % dur; else t = Math.min(t, dur);
      for (let i = 0; i < keys.length - 1; i++) {
        const [t0, p0] = keys[i], [t1, p1, e] = keys[i + 1];
        if (t <= t1) return mix(p0, p1, (ease[e || 'io'])((t - t0) / Math.max(1, t1 - t0)));
      }
      return keys[keys.length - 1][1];
    },
  };
}

const S = (p, d) => add(P.stand, d);
const M = d => add(P.standMon, d);

const CLIPS = {
  // ---------- 공통 순환 동작 ----------
  idle: { loop: true, dur: 1600, at(t, base = P.stand) {
    const s = Math.sin(t / 1600 * Math.PI * 2);
    return add(base, { torso: s * 1.5, head: -s * 1.5, ry: s * 2.5, uab: s * 3, uaf: -s * 2, cape: s * 3, shb: s * 2, shf: s * 2, thb: -s, thf: -s });
  } },
  walk: { loop: true, dur: 640, at(t, base = P.stand) {
    const ph = t / 640 * Math.PI * 2, s = Math.sin(ph), c = Math.cos(ph);
    return add(base, {
      thf: -s * 26, shf: Math.max(0, c) * 30, ftf: s * 8,
      thb: s * 26, shb: Math.max(0, -c) * 30, ftb: -s * 8,
      uab: s * 10, uaf: -s * 6, torso: 4, ry: -Math.abs(c) * 6 + 3, cape: 8 + c * 6, rr: 2,
    });
  } },
  run: { loop: true, dur: 480, at(t, base = P.stand) {
    const ph = t / 480 * Math.PI * 2, s = Math.sin(ph), c = Math.cos(ph);
    return add(base, {
      thf: -s * 40 - 10, shf: Math.max(0, c) * 55 + 10, ftf: s * 10,
      thb: s * 40 - 10, shb: Math.max(0, -c) * 55 + 10, ftb: -s * 10,
      uab: s * 18 - 10, uaf: -s * 10, torso: 10, head: -6, ry: -Math.abs(c) * 10 + 6, cape: 25 + c * 8, rr: 4,
    });
  } },
};

// ---------- 하르반 동작 ----------
// 검 방향 = (uab + fab + hb) - 90. 0=아래, -90=앞, -180=위, 90=뒤
const A1E = { torso: 10, uab: -45, fab: -10, hb: 95, rr: 3, rx: 10, thf: -16, shf: 16, uaf: -20, faf: -60 };
const A2E = { torso: -6, uab: -140, fab: -20, hb: 100, rr: -3, rx: 8, head: -6 };
const A3E = { torso: 14, uaf: -62, faf: -30, rr: 6, rx: 24, thf: -24, shf: 20, thb: 16, uab: 20, fab: -50, hb: 0 };
const A4E = { torso: 24, uab: -40, fab: -5, hb: 85, rr: 12, rx: 30, ry: 10, thf: -36, shf: 46, thb: 28, uaf: 0, faf: -50 };
Object.assign(CLIPS, {
  w_atk1: keyClip([ // 사선 내려베기
    [0, P.stand],
    [70, S(0, { torso: -8, uab: -165, fab: -30, hb: 10, rr: -3, uaf: 0, faf: -50, head: -4 }), 'out'],
    [150, S(0, { torso: 12, uab: -75, fab: -10, hb: 80, rr: 4, rx: 12, thf: -20, shf: 20, uaf: -20, faf: -60 }), 'out'],
    [300, S(0, A1E), 'out'],
  ]),
  w_atk2: keyClip([ // 올려베기
    [0, S(0, A1E)],
    [80, S(0, { torso: 6, uab: 25, fab: -10, hb: 100, rr: 2, rx: 6, thf: -10, shf: 10 }), 'out'],
    [160, S(0, { torso: -10, uab: -155, fab: -20, hb: 95, rr: -5, rx: 10, head: -10, thf: -14, shf: 10 }), 'out'],
    [300, S(0, A2E), 'out'],
  ]),
  w_atk3: keyClip([ // 방패 치기
    [0, S(0, A2E)],
    [80, S(0, { torso: -12, uaf: 30, faf: -60, rr: -4, rx: -6, uab: 20, fab: -60, hb: 0 }), 'out'],
    [150, S(0, { torso: 18, uaf: -78, faf: -18, rr: 8, rx: 26, thf: -30, shf: 26, thb: 20, uab: 25, fab: -50, hb: 0 }), 'back'],
    [320, S(0, A3E), 'out'],
  ]),
  w_atk4: keyClip([ // 크게 내려찍기
    [0, S(0, A3E)],
    [140, S(0, { torso: -16, uab: -195, fab: -35, hb: 100, rr: -8, ry: -6, head: -10, uaf: 10, faf: -40, rx: 4 }), 'out'],
    [210, S(0, { ...A4E, uab: -50 }), 'in'],
    [460, S(0, A4E), 'out'],
  ]),
  w_dash: keyClip([ // 방패 돌진
    [0, S(0, { torso: 20, uaf: -82, faf: -10, rr: 10, thf: -30, shf: 30, thb: 30, uab: 30, fab: -40, hb: 0 })],
    [400, S(0, { torso: 22, uaf: -84, faf: -10, rr: 12, thf: -36, shf: 34, thb: 34, uab: 32, fab: -40, hb: 0 })],
  ]),
  w_up: keyClip([ // 방패 올려치기
    [0, S(0, { torso: 10, uaf: 0, faf: -40, ry: 10, thf: -20, shf: 30, thb: 10, shb: 30 })],
    [90, S(0, { torso: 18, uaf: 20, faf: -30, ry: 16, thf: -30, shf: 50, thb: 20, shb: 40, rr: 6, uab: 20, fab: -40 }), 'out'],
    [170, S(0, { torso: -16, uaf: -170, faf: -10, ry: -14, rr: -8, head: -14, thf: -10, uab: -10, fab: -40 }), 'back'],
    [380, S(0, { torso: -12, uaf: -150, faf: -20, ry: -8, rr: -6, uab: -10, fab: -40 }), 'out'],
  ]),
  w_slam: keyClip([ // 대지 내려찍기
    [0, P.stand],
    [140, S(0, { torso: -14, uab: -195, fab: -30, hb: 100, uaf: -150, faf: -20, ry: -20, rr: -6, head: -12 }), 'out'],
    [220, S(0, { torso: 36, uab: -25, fab: 0, hb: 75, uaf: -40, rr: 18, ry: 26, thf: -60, shf: 80, thb: 40, shb: 40, rx: 16 }), 'in'],
    [520, S(0, { torso: 30, uab: -25, fab: 0, hb: 75, uaf: -40, rr: 14, ry: 22, thf: -56, shf: 74, thb: 36, shb: 36, rx: 16 }), 'out'],
  ]),
  w_jumpatk: keyClip([
    [0, S(0, { thf: -50, shf: 70, thb: 20, shb: 60 })],
    [80, S(0, { torso: -10, uab: -195, fab: -35, hb: 100, thf: -50, shf: 70, thb: 20, shb: 60 }), 'out'],
    [170, S(0, { torso: 20, uab: -45, fab: -5, hb: 85, rr: 12, thf: -60, shf: 80, thb: 10, shb: 70 }), 'out'],
    [400, S(0, { torso: 16, uab: -45, fab: -5, hb: 85, rr: 10, thf: -60, shf: 80, thb: 10, shb: 70 })],
  ]),
  w_guard: keyClip([
    [0, P.stand],
    [60, S(0, { torso: 8, uaf: -50, faf: -60, ry: 8, thf: -20, shf: 24, thb: 16, shb: 16, rr: 2, uab: 10, fab: -40 }), 'out'],
  ]),
  w_parry: keyClip([
    [0, S(0, { torso: 8, uaf: -50, faf: -60, ry: 8 })],
    [80, S(0, { torso: -6, uaf: -110, faf: -40, rr: -6, rx: 12, ry: 2, head: -8 }), 'back'],
    [300, S(0, { torso: 0, uaf: -60, faf: -60, ry: 4 }), 'out'],
  ]),
  w_awaken: keyClip([
    [0, P.stand],
    [300, S(0, { torso: -20, uab: -170, fab: -10, hb: 90, uaf: -170, faf: -10, ry: -10, rr: -8, head: -20 }), 'out'],
    [450, S(0, { torso: 30, uab: -60, fab: -30, hb: 0, uaf: -90, faf: 0, rr: 14, rx: 30, ry: 16, thf: -50, shf: 60, thb: 40 }), 'in'],
    [900, S(0, { torso: 26, uab: -60, fab: -30, hb: 0, uaf: -90, faf: 0, rr: 12, rx: 30, ry: 16, thf: -46, shf: 56, thb: 36 })],
  ]),
});

// ---------- 공통 반응 (주인공·몬스터) ----------
function reactClips(base, pre) {
  const A = d => add(base, d);
  CLIPS[pre + 'hurt'] = keyClip([
    [0, base],
    [60, A({ torso: -24, head: -20, rr: -10, rx: -12, uab: 40, uaf: 30, faf: 20, cape: 20 }), 'out'],
    [260, A({ torso: -10, head: -8, rr: -4, rx: -6 }), 'io'],
  ]);
  CLIPS[pre + 'air'] = { loop: true, dur: 400, at() { return A({ rr: -40, torso: -20, head: -20, uab: 60, fab: 40, uaf: 50, faf: 30, thf: -40, shf: 50, thb: 20, shb: 40, cape: 40 }); } };
  CLIPS[pre + 'down'] = { loop: true, dur: 400, at() { return A({ rr: -88, ry: 0, torso: -6, head: -10, uab: 140, fab: 10, uaf: 130, faf: 20, thf: -10, shf: 10, thb: 6, shb: 10, cape: 70 }); } };
  CLIPS[pre + 'getup'] = keyClip([
    [0, A({ rr: -88, torso: -6, head: -10, uab: 140, uaf: 130 })],
    [220, A({ rr: -30, torso: 30, ry: 30, thf: -80, shf: 110, thb: -40, shb: 120, uab: 20, uaf: -20 }), 'out'],
    [420, base, 'io'],
  ]);
  CLIPS[pre + 'jump'] = { loop: true, dur: 400, at() { return A({ thf: -50, shf: 70, thb: 20, shb: 60, uab: -40, uaf: -40, cape: 30, torso: 4 }); } };
  CLIPS[pre + 'roll'] = { loop: false, dur: 380, at(t) { const k = Math.min(1, t / 380); return A({ rr: k * 360, torso: 30, head: 20, thf: -100, shf: 120, thb: -80, shb: 120, uab: -30, uaf: -40, ry: 30 }); } };
  CLIPS[pre + 'win'] = keyClip([[0, base], [300, A({ uab: -170, fab: -20, hb: 90, torso: -6, head: -14, ry: -4 }), 'back'], [2000, A({ uab: -168, fab: -20, hb: 90, torso: -6, head: -14 })]]);
}
reactClips(P.stand, 'w_');
reactClips(P.standMon, 'm_');

// ---------- 몬스터 동작 ----------
Object.assign(CLIPS, {
  m_idle: { loop: true, dur: 1000, at(t) { return CLIPS.idle.at(t * 1.6, P.standMon); } },
  m_walk: { loop: true, dur: 640, at(t) { return CLIPS.walk.at(t, P.standMon); } },
  m_run: { loop: true, dur: 480, at(t) { return CLIPS.run.at(t, P.standMon); } },
  m_windup: keyClip([[0, P.standMon], [200, M({ torso: -16, uab: 50, fab: -90, hb: 50, rr: -6, rx: -10, head: -6 }), 'out'], [400, M({ torso: -18, uab: 56, fab: -95, hb: 55, rr: -7, rx: -12 })]]),
  m_stab: keyClip([[0, M({ torso: -18, uab: 56, fab: -95, hb: 55, rr: -7, rx: -12 })], [90, M({ torso: 24, uab: -95, fab: -5, hb: 95, rr: 10, rx: 24, thf: -30, shf: 30, thb: 20 }), 'back'], [360, M({ torso: 18, uab: -80, fab: -10, hb: 90, rr: 8, rx: 20 }), 'out']]),
  m_throwup: keyClip([[0, P.standMon], [300, M({ torso: -20, uab: -150, fab: -70, hb: -130, rr: -8, rx: -8, head: -10 }), 'out'], [500, M({ torso: -22, uab: -155, fab: -75, hb: -130, rr: -9, rx: -10 })]]),
  m_throw: keyClip([[0, M({ torso: -22, uab: -155, fab: -75, hb: -130, rr: -9 })], [90, M({ torso: 24, uab: -60, fab: -10, rr: 10, rx: 16, thf: -24, shf: 24 }), 'out'], [400, M({ torso: 10, uab: -20, fab: -30, rr: 4, rx: 8 }), 'out']]),
  m_cast: { loop: true, dur: 500, at(t) { const s = Math.sin(t / 500 * Math.PI * 2); return M({ torso: -12 + s * 3, uab: -150 + s * 10, fab: -20, uaf: -120 - s * 10, faf: -30, head: -14, ry: -4 + s * 3 }); } },
  m_taunt: { loop: true, dur: 360, at(t) { const s = Math.sin(t / 360 * Math.PI * 2); return M({ torso: -10 + s * 6, head: -12 + s * 8, uaf: -120, faf: -40 + s * 30, ry: Math.abs(s) * -8 }); } },
  m_flinch: keyClip([[0, P.standMon], [80, M({ torso: -18, head: -18, rr: -6, rx: -8, uab: 30, uaf: 40 }), 'out'], [400, M({ torso: -8, rx: -4 }), 'io']]),
  // 바크하울
  b_smashup: keyClip([[0, P.standMon], [500, M({ torso: -18, uab: -190, fab: -30, hb: 90, uaf: -150, faf: -20, rr: -6, ry: -10, head: -16 }), 'out'], [800, M({ torso: -20, uab: -195, fab: -32, hb: 92, uaf: -155, rr: -7, ry: -12, head: -18 })]]),
  b_smash: keyClip([[0, M({ torso: -20, uab: -195, fab: -32, hb: 92, uaf: -155, rr: -7, ry: -12 })], [130, M({ torso: 36, uab: -40, fab: -10, hb: 80, uaf: -40, rr: 16, rx: 24, ry: 16, thf: -40, shf: 50, thb: 26 }), 'in'], [800, M({ torso: 30, uab: -40, fab: -10, hb: 80, uaf: -40, rr: 14, rx: 24, ry: 14, thf: -36, shf: 46, thb: 24 })], [1100, P.standMon, 'io']]),
  b_roar: { loop: true, dur: 300, at(t) { const s = Math.sin(t / 300 * Math.PI * 2); return M({ torso: -20 + s * 2, head: -24 + s * 3, uab: 30, fab: -60, uaf: 40, faf: -60, rr: -6, rx: s * 2 }); } },
  b_stomp: keyClip([[0, P.standMon], [400, M({ thf: -70, shf: 60, torso: -10, rr: -6, ry: -20, uaf: -60, uab: 20 }), 'out'], [520, M({ thf: -10, shf: 10, torso: 20, rr: 8, ry: 10, uaf: -20 }), 'in'], [900, P.standMon, 'io']]),
});

function samplePose(name, t, kind) {
  const c = CLIPS[name];
  if (!c) return {};
  return c.at(t);
}
