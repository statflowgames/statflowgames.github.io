// 포즈와 동작 클립. 각도는 rig.js 규약(시계 방향 +, 오른쪽을 볼 때 앞으로 들면 -).
// 뼈: root(골반·몸 전체), torso, head, uab/fab/hb/wpn(뒷팔·무기), uaf/faf/hf/shd(앞팔·방패), thb/shb/ftb, thf/shf/ftf, cape
// rx, ry: 몸 전체 이동(부품 픽셀), rr: 몸 전체 회전

const P = {
  // 하르반 (발 각도 ftf/ftb는 몸 기준 절대 각도, 0이면 바닥과 평행)
  stand: { torso: 4, head: -2, uab: -8, fab: -32, hb: 78, wpn: 0, uaf: -24, faf: -78, thf: -20, shf: 22, ftf: 0, thb: 18, shb: 10, ftb: 0, cape: 0 },
  // 그롤린: 구부정하게 웅크린 자세
  standMon: { torso: 12, head: -10, uab: -10, fab: -45, uaf: 10, faf: -24, thf: -16, shf: 26, ftf: 0, thb: 14, shb: 16, ftb: 0 },
};
const LEGS = ['thf', 'shf', 'ftf', 'thb', 'shb', 'ftb'];
function upper(base) { const o = { ...base }; for (const k of LEGS) delete o[k]; return o; }

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

// 🆕 2026-11-25 매끈한 꺾임: max(0,v)·|v|는 0을 지나는 순간 각이 져서 무릎·몸이 '툭' 꺾인다.
//   0 근처(±SOFT)만 곡선으로 이어 붙인다 (값이 음수로 내려가지 않고, 1에서는 그대로 1).
//   주소에 ?oldmotion 을 붙이면 예전 움직임(비교용)
const MOTION_OLD = typeof location !== 'undefined' && /[?&]oldmotion/.test(location.search);
const SOFT = MOTION_OLD ? 0 : 0.45;
// 동작 전환 설정 (시험용으로 바꿔 볼 수 있게 한곳에): smooth = 가속·감속 전환, carry = 이전 동작 기세 잇기
//   minDur: 이 길이(ms) 이상인 전환에만 (걷기·달리기·대기). 공격·점프처럼 짧고 빠른 전환은 예전대로 — 재어 보니 그쪽이 더 매끈했다
const MOTION_CFG = { smooth: !MOTION_OLD, carry: !MOTION_OLD, carryMax: 25, minDur: 100 };
const sPos = v => v >= SOFT ? v : v <= -SOFT ? 0 : (v + SOFT) * (v + SOFT) / (4 * SOFT);
const sAbs = v => Math.abs(v) >= SOFT ? Math.abs(v) : (v * v + SOFT * SOFT) / (2 * SOFT);

// 부위별 시간차(ms): 몸통이 먼저 움직이고 팔·손·머리·망토가 한 박자씩 늦게 따라온다
const LAG = { head: 30, uab: 12, fab: 24, hb: 36, wpn: 36, uaf: 10, faf: 20, hf: 30, cape: 60, shd: 30, neck: 40 };

// ✏️ 2026-11-25 더 부드럽게: 예전엔 키마다 속도가 0이 됐다(io) → 같은 방향으로 계속 가는 키에서 '멈칫'.
//   기본(io) 구간끼리 이어지는 키는 단조 3차 곡선(넘치지 않음)으로 속도를 이어 간다.
//   방향이 바뀌는 키·멈춤(같은 값)·'out'/'in'/'lin'/'back'을 지정한 구간은 예전과 똑같다 (때리는 타이밍 그대로).
const KEY_SLOPE = new WeakMap();
function keySlopes(keys, k) {
  let m = KEY_SLOPE.get(keys); if (!m) KEY_SLOPE.set(keys, m = {});
  if (m[k]) return m[k];
  if (MOTION_OLD) return (m[k] = new Array(keys.length).fill(0));
  const n = keys.length, v = keys.map(q => q[1][k] ?? 0), sl = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    const eIn = keys[i][2] || 'io', eOut = keys[i + 1][2] || 'io';
    if (eIn !== 'io' || eOut !== 'io') continue;
    const d0 = (v[i] - v[i - 1]) / Math.max(1, keys[i][0] - keys[i - 1][0]), d1 = (v[i + 1] - v[i]) / Math.max(1, keys[i + 1][0] - keys[i][0]);
    if (d0 * d1 <= 0) continue;                          // 방향이 바뀌거나 멈추는 키: 속도 0 (예전과 같음)
    sl[i] = 2 / (1 / d0 + 1 / d1);                        // 조화 평균: 넘치지 않는다
  }
  return (m[k] = sl);
}
function sampleKeys(keys, t, k) {
  if (t <= keys[0][0]) return keys[0][1][k] ?? 0;
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, p0] = keys[i], [t1, p1, e] = keys[i + 1];
    if (t <= t1) {
      const a = p0[k] ?? 0, b = p1[k] ?? 0, u = (t - t0) / Math.max(1, t1 - t0);
      if ((e || 'io') !== 'io') return lerp(a, b, ease[e](u));
      const sl = keySlopes(keys, k), h = Math.max(1, t1 - t0), m0 = sl[i] * h, m1 = sl[i + 1] * h;
      if (!m0 && !m1) return lerp(a, b, ease.io(u));
      const u2 = u * u, u3 = u2 * u;                      // 에르미트 3차 곡선
      return (2 * u3 - 3 * u2 + 1) * a + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * b + (u3 - u2) * m1;
    }
  }
  return keys[keys.length - 1][1][k] ?? 0;
}
// 키프레임 클립: keys = [[ms, pose, easeName]]
function keyClip(keys, loop = false, lag = true) {
  const dur = keys[keys.length - 1][0];
  const names = new Set();
  for (const [, p] of keys) for (const k in p) names.add(k);
  return {
    dur, loop,
    at(t) {
      if (loop) t = t % dur; else t = Math.min(t, dur + 80);
      const o = {};
      for (const k of names) o[k] = sampleKeys(keys, t - (lag ? (LAG[k] || 0) : 0), k);
      return o;
    },
  };
}

// 공격·행동 자세는 기본 자세 위에 값을 '덮어쓴다' (더하지 않는다). 적은 값이 곧 실제 각도.
const S = (p, d) => ({ ...P.stand, ...d });
const M = d => ({ ...P.standMon, ...d });

const CLIPS = {
  // ---------- 공통 순환 동작 ----------
  idle: { loop: true, dur: 1600, at(t, base = P.stand) {
    const s = Math.sin(t / 1600 * Math.PI * 2);
    return add(base, { torso: s * 1.5, head: -s * 1.5, uab: s * 3, uaf: -s * 2, cape: s * 3, thb: -s * 2, shb: s * 4, thf: -s * 2, shf: s * 4, sq: s * 0.012 });
  } },
  walk: { loop: true, dur: 680, amp: 24, at(t, base = P.stand, amp = 24) {
    const ph = t / 680 * Math.PI * 2, s = Math.sin(ph), c = Math.cos(ph);
    const sw = sPos;                                // 앞으로 옮기는 다리만 무릎을 접는다 (✏️ 매끈하게)
    return add(upper(base), {
      thf: -s * amp - 4, shf: 8 + sw(c) * amp * 1.6, ftf: -sw(c) * 10 + sw(-c) * sw(s) * 8,
      thb: s * amp - 4, shb: 8 + sw(-c) * amp * 1.6, ftb: -sw(-c) * 10 + sw(c) * sw(-s) * 8,
      uab: s * amp * 0.35, fab: -s * 6, uaf: -s * amp * 0.2,
      torso: 6 - sAbs(c) * 2, head: sAbs(c) * 2, cape: 10 + c * 6, rr: 2,
      sq: sAbs(c) * 0.015,
    });
  } },
  run: { loop: true, dur: 540, amp: 36, at(t, base = P.stand, amp = 36) {
    const ph = t / 540 * Math.PI * 2, s = Math.sin(ph), c = Math.cos(ph);
    const sw = sPos;
    return add(upper(base), {
      thf: -s * amp - 14, shf: 14 + sw(c) * amp * 2.0, ftf: -sw(c) * 18,
      thb: s * amp - 14, shb: 14 + sw(-c) * amp * 2.0, ftb: -sw(-c) * 18,
      // 달릴 때는 칼을 뒤로 늘어뜨리고 방패를 앞으로 (레퍼런스 달리기 포즈)
      uab: 26 + s * amp * 0.5, fab: -20 - s * 10, hb: 76, uaf: -36 - s * 8, faf: 10,
      torso: 16 + sAbs(c) * 3, head: -10, cape: 34 + c * 10, rr: 5,
      sq: sAbs(s) * 0.03,
    });
  } },
};

// ---------- 하르반 동작 ----------
// 검 방향 = (uab + fab + hb) - 90. 0=아래, -90=앞, -180=위, 90=뒤
// 다리 자세
const CROUCH = { thf: -30, shf: 46, ftf: 0, thb: 26, shb: 30, ftb: 0 };            // 웅크린 준비
const LUNGE = { thf: -52, shf: 58, ftf: 0, thb: 46, shb: 4, ftb: 12 };             // 크게 내딛음
const LUNGE_S = { thf: -40, shf: 44, ftf: 0, thb: 36, shb: 8, ftb: 8 };            // 작게 내딛음
const UPL = { thf: -16, shf: 10, ftf: 0, thb: 22, shb: 0, ftb: 10 };               // 펴고 일어섬
const A1E = { torso: 18, uab: -70, fab: -6, hb: 86, rr: 2, uaf: -4, faf: -62, ...LUNGE_S };
const A2E = { torso: -8, uab: -150, fab: -22, hb: 108, rr: -2, head: -8, uaf: -30, faf: -70, ...UPL };
const A3E = { torso: 16, uaf: -66, faf: -26, rr: 3, uab: 40, fab: -20, hb: 96, ...LUNGE_S };
const A4E = { torso: 30, uab: -60, fab: -4, hb: 72, rr: 4, uaf: 6, faf: -54, head: 4, ...LUNGE };
Object.assign(CLIPS, {
  // 칼 방향(화면 기준) = rr + torso + uab + fab + hb - 90. 0=아래, -90=앞, -180=위, 90=뒤
  // 박자: 준비(빠르게) → 잠깐 멈춤 → 휘두름(아주 빠르게) → 끝자세 멈춤 → 복귀
  w_atk1: keyClip([ // 사선 내려베기
    [0, P.stand],
    [55, S(0, { torso: -6, head: -4, uab: -172, fab: -26, hb: 72, uaf: -30, faf: -72, rr: -2, ...CROUCH, sq: -0.04 }), 'out'],
    [85, S(0, { torso: -8, head: -5, uab: -178, fab: -28, hb: 70, uaf: -32, faf: -72, rr: -2, ...CROUCH, shf: 50, sq: -0.05 }), 'lin'],
    [125, S(0, { ...A1E, torso: 22, uab: -95, fab: -5, sq: 0.04 }), 'out'],
    [200, S(0, { ...A1E, torso: 20, uab: -82 }), 'out'],
    [320, S(0, A1E), 'io'],
  ]),
  w_atk2: keyClip([ // 올려베기
    [0, S(0, A1E)],
    [60, S(0, { torso: 14, uab: 34, fab: -10, hb: 100, uaf: -10, faf: -66, rr: 2, ...CROUCH, sq: -0.05 }), 'out'],
    [85, S(0, { torso: 16, uab: 38, fab: -10, hb: 102, uaf: -10, faf: -66, rr: 2, ...CROUCH, shf: 50, sq: -0.06 }), 'lin'],
    [125, S(0, { ...A2E, torso: -12, uab: -160, hb: 112, head: -12, sq: 0.06 }), 'out'],
    [200, S(0, A2E), 'out'],
    [320, S(0, A2E), 'io'],
  ]),
  w_atk3: keyClip([ // 방패 치기
    [0, S(0, A2E)],
    [70, S(0, { torso: -12, uaf: 30, faf: -70, rr: -3, uab: 30, fab: -50, hb: 70, ...CROUCH, sq: -0.05 }), 'out'],
    [100, S(0, { torso: -14, uaf: 34, faf: -70, rr: -3, uab: 32, fab: -50, hb: 70, ...CROUCH, shf: 50, sq: -0.06 }), 'lin'],
    [135, S(0, { ...A3E, torso: 22, uaf: -86, faf: -12, ...LUNGE, sq: 0.05 }), 'back'],
    [210, S(0, { ...A3E, torso: 20, uaf: -76, ...LUNGE }), 'out'],
    [330, S(0, A3E), 'io'],
  ]),
  w_atk4: keyClip([ // 크게 내려찍기
    [0, S(0, A3E)],
    [140, S(0, { torso: -14, head: -10, uab: -190, fab: -30, hb: 66, uaf: -40, faf: -70, rr: -4, ...CROUCH, thf: -34, shf: 56, shb: 36, sq: -0.08 }), 'out'],
    [190, S(0, { torso: -16, head: -12, uab: -196, fab: -32, hb: 64, uaf: -42, faf: -70, rr: -4, ...CROUCH, thf: -36, shf: 60, shb: 38, sq: -0.09 }), 'lin'],
    [235, S(0, { ...A4E, uab: -70, sq: 0.06 }), 'in'],
    [360, S(0, { ...A4E, sq: -0.04 }), 'out'],
    [490, S(0, A4E), 'io'],
  ]),
  w_dash: keyClip([ // 방패 돌진
    [0, S(0, { torso: 24, head: -6, uaf: -84, faf: -10, rr: 6, uab: 34, fab: -20, hb: 40, ...LUNGE, sq: -0.04 })],
    [400, S(0, { torso: 26, head: -6, uaf: -86, faf: -10, rr: 7, uab: 36, fab: -20, hb: 40, ...LUNGE, thf: -56 })],
  ]),
  w_up: keyClip([ // 방패 올려치기
    [0, S(0, { torso: 10, uaf: 0, faf: -40, thf: -30, shf: 50, thb: 16, shb: 40, sq: -0.04 })],
    [90, S(0, { torso: 20, uaf: 20, faf: -30, thf: -44, shf: 76, thb: 26, shb: 60, rr: 4, uab: 20, fab: -40, sq: -0.07 }), 'out'],
    [170, S(0, { torso: -16, uaf: -170, faf: -10, rr: -5, head: -14, thf: -4, shf: 0, thb: 4, shb: 0, uab: -10, fab: -40, sq: 0.07 }), 'back'],
    [380, S(0, { torso: -12, uaf: -150, faf: -20, rr: -4, uab: -10, fab: -40 }), 'out'],
  ]),
  w_slam: keyClip([ // 대지 내려찍기
    [0, P.stand],
    [150, S(0, { torso: -16, uab: -195, fab: -30, hb: 100, uaf: -150, faf: -20, rr: -4, head: -12, sq: 0.06 }), 'out'],
    [200, S(0, { torso: -18, uab: -200, fab: -32, hb: 102, uaf: -155, faf: -20, rr: -4, head: -13, sq: 0.07 }), 'lin'],
    [245, S(0, { torso: 40, uab: -25, fab: 0, hb: 75, uaf: -40, rr: 6, thf: -70, shf: 95, thb: 46, shb: 50, sq: -0.08 }), 'in'],
    [420, S(0, { torso: 36, uab: -25, fab: 0, hb: 75, uaf: -40, rr: 5, thf: -66, shf: 90, thb: 44, shb: 46 }), 'out'],
    [540, S(0, { torso: 30, uab: -25, fab: 0, hb: 75, uaf: -40, rr: 4, thf: -56, shf: 74, thb: 36, shb: 36 }), 'io'],
  ]),
  w_jumpatk: keyClip([
    [0, S(0, { thf: -50, shf: 70, thb: 20, shb: 60 })],
    [70, S(0, { torso: -12, uab: -195, fab: -35, hb: 100, thf: -50, shf: 70, thb: 20, shb: 60 }), 'out'],
    [110, S(0, { torso: -14, uab: -200, fab: -36, hb: 102, thf: -52, shf: 72, thb: 20, shb: 62 }), 'lin'],
    [160, S(0, { torso: 22, uab: -45, fab: -5, hb: 85, rr: 10, thf: -60, shf: 80, thb: 10, shb: 70, sq: 0.05 }), 'out'],
    [400, S(0, { torso: 16, uab: -45, fab: -5, hb: 85, rr: 8, thf: -60, shf: 80, thb: 10, shb: 70 })],
  ]),
  w_guard: keyClip([
    [0, P.stand],
    [60, S(0, { torso: 12, uaf: -60, faf: -62, ...CROUCH, rr: 1, uab: 14, fab: -30, hb: 80, head: 6, sq: -0.03 }), 'out'],
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
    [50, A({ torso: -26, head: -24, rr: -6, uab: 40, uaf: 30, faf: 20, cape: 20, thf: -10, shb: 16, sq: -0.06 }), 'out'],
    [110, A({ torso: -20, head: -16, rr: -5, uab: 30, uaf: 24, sq: -0.03 }), 'lin'],
    [280, A({ torso: -6, head: -4, rr: -2 }), 'io'],
  ]);
  CLIPS[pre + 'air'] = { loop: true, dur: 400, at() { return A({ rr: -40, torso: -20, head: -20, uab: 60, fab: 40, uaf: 50, faf: 30, thf: -40, shf: 50, thb: 20, shb: 40, cape: 40 }); } };
  CLIPS[pre + 'down'] = { loop: true, dur: 400, at() { return A({ rr: -88, ry: 0, torso: -6, head: -10, uab: 140, fab: 10, uaf: 130, faf: 20, thf: -10, shf: 10, thb: 6, shb: 10, cape: 70 }); } };
  CLIPS[pre + 'getup'] = keyClip([
    [0, A({ rr: -88, torso: -6, head: -10, uab: 140, uaf: 130, thf: -10, shf: 10 })],
    [180, A({ rr: -50, torso: 40, head: 10, thf: -90, shf: 120, thb: -60, shb: 120, uab: 60, uaf: 40 }), 'out'],
    [320, A({ rr: -8, torso: 30, thf: -70, shf: 100, thb: -10, shb: 90, uab: 20, uaf: -20, sq: -0.06 }), 'io'],
    [440, base, 'out'],
  ]);
  CLIPS[pre + 'jump'] = { loop: true, dur: 400, at() { return A({ thf: -50, shf: 70, thb: 20, shb: 60, uab: -40, uaf: -40, cape: 30, torso: 4 }); } };
  CLIPS[pre + 'roll'] = { loop: false, dur: 380, at(t) { const k = Math.min(1, t / 380); return A({ rr: k * 360, torso: 30, head: 20, thf: -100, shf: 120, thb: -80, shb: 120, uab: -30, uaf: -40, ry: 30 }); } };
  CLIPS[pre + 'win'] = keyClip([[0, base], [300, A({ uab: -170, fab: -20, hb: 90, torso: -6, head: -14, ry: -4 }), 'back'], [2000, A({ uab: -168, fab: -20, hb: 90, torso: -6, head: -14 })]]);
}
reactClips(P.stand, 'w_');
reactClips(P.standMon, 'm_');

// 고블린은 손·발로 몸을 떠받치던 공통 다운 자세 대신 몸통을 바닥에 내려놓는다.
// 원래 공중 넉백/바운스와 전투 상태 시간은 유지하고, 이 자세는 착지 후에만 사용한다.
const GOBLIN_PRONE = M({ rr: -88, torso: 0, head: 40,
  uab: -120, fab: 130, hb: 70, uaf: -108, faf: 124,
  thf: -18, shf: 26, thb: -32, shb: 60, ftf: 0, ftb: 0, prone: 1 });
CLIPS.gob_down = { loop: true, dur: 400, at() { return GOBLIN_PRONE; } };
CLIPS.gob_getup = keyClip([
  [0, GOBLIN_PRONE],
  [180, M({ rr: -50, torso: 40, head: 0, thf: -106, shf: 146, thb: -46, shb: 136, uab: 50, uaf: 50, prone: 0.5 }), 'out'],
  [320, M({ rr: -8, torso: 42, thf: -86, shf: 126, thb: 4, shb: 106, uab: 10, uaf: -10, sq: -0.06 }), 'io'],
  [440, P.standMon, 'out'],
], false, false);

// ---------- 몬스터 동작 ----------
Object.assign(CLIPS, {
  m_idle: { loop: true, dur: 1000, at(t) { return CLIPS.idle.at(t * 1.6, P.standMon); } },
  m_walk: { loop: true, dur: 640, amp: 26, at(t) { return CLIPS.walk.at(t, P.standMon, 26); } },
  b_walk: { loop: true, dur: 900, amp: 15, at(t) { const p = CLIPS.walk.at(t * 640 / 900, P.standMon, 15); p.sq = -Math.abs(Math.cos(t / 900 * Math.PI * 2)) * 0.03; return p; } },
  m_run: { loop: true, dur: 520, amp: 32, at(t) { return CLIPS.run.at(t, P.standMon, 32); } },
  m_windup: keyClip([[0, P.standMon], [200, M({ torso: -16, uab: 50, fab: -90, hb: 50, rr: -6, rx: -10, head: -6 }), 'out'], [400, M({ torso: -18, uab: 56, fab: -95, hb: 55, rr: -7, thb: -4, shb: 24, sq: -0.06 })]]),
  m_stab: keyClip([[0, M({ torso: -18, uab: 56, fab: -95, hb: 55, rr: -7, rx: -12 })], [70, M({ torso: 26, uab: -95, fab: -5, hb: 95, rr: 4, thf: -36, shf: 36, thb: 24, sq: 0.06 }), 'back'], [360, M({ torso: 18, uab: -80, fab: -10, hb: 90, rr: 8, rx: 20 }), 'out']]),
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

