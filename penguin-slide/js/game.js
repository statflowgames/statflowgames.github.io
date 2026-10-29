'use strict';
/* 펭귄 썰매 활강 — 지형 생성, 물리(120Hz 고정), 착지 판정, 눈사태, 수집품 */
const PH = {
  DT: 1 / 120,
  G_LIGHT: 640,   // 손을 뗐을 때 (가볍다)
  G_HEAVY: 1800,  // 꾹 눌렀을 때 (무겁다)
  FRIC: 16, DRAG: 0.00015, AIR_DRAG: 0.00004,
  VMIN: 90, VMAX: 1250, VSTART: 300,
  HOLD_UP: 550,   // 오르막에서 누르고 있으면 썰매가 눈을 밀어 더 느려진다
  PERFECT: 0.42, GOOD: 0.75, CRASH: 1.12, // 착지 각도 차이 (라디안)
};
const PHASE_LEN = 500; // m 마다 시간대가 바뀐다

// ===== 지형: 코사인 보간으로 이은 끝없는 언덕 =====
const Terr = {
  pts: [], rng: null, kind: 0,
  reset(seed) {
    this.rng = mulberry(seed);
    this.pts = [{ x: -3200, y: -40 }, { x: -2200, y: 60 }, { x: -1300, y: -10 }, { x: -620, y: 70 }, { x: 0, y: 0 }];
  },
  seg(x) {
    const p = this.pts;
    let lo = 0, hi = p.length - 2;
    if (x <= p[0].x) return 0;
    if (x >= p[hi + 1].x) return hi;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (p[mid].x <= x) lo = mid; else hi = mid - 1;
    }
    return lo;
  },
  y(x) {
    const i = this.seg(x), a = this.pts[i], b = this.pts[i + 1], k = clamp((x - a.x) / (b.x - a.x), 0, 1);
    return a.y + (b.y - a.y) * (1 - Math.cos(Math.PI * k)) / 2;
  },
  slope(x) {
    const i = this.seg(x), a = this.pts[i], b = this.pts[i + 1], W = b.x - a.x, k = clamp((x - a.x) / W, 0, 1);
    return (b.y - a.y) * Math.PI / (2 * W) * Math.sin(Math.PI * k);
  },
  curv(x) {
    const i = this.seg(x), a = this.pts[i], b = this.pts[i + 1], W = b.x - a.x, k = clamp((x - a.x) / W, 0, 1);
    return (b.y - a.y) * Math.PI * Math.PI / (2 * W * W) * Math.cos(Math.PI * k);
  },
  last() { return this.pts[this.pts.length - 1]; },
  // 내리막 하나 + 오르막 하나를 이어 붙이고 생선을 놓는다
  gen(items) {
    const r = this.rng, top = this.last();
    const d = clamp(top.x / (M * 4000), 0, 1);
    let down, up, w1, w2, kind = r();
    if (top.x < 1800) { down = 150; up = 70; w1 = 430; w2 = 330; kind = 1; }
    else {
      down = 130 + r() * 120 + d * 100;
      if (kind < 0.16) { down += 120; up = down * 0.36; }          // 급경사 낭떠러지
      else if (kind < 0.34) up = down * 0.85 + 10;                 // 점프대 언덕
      else up = down * (0.45 + r() * 0.3);
      up = Math.max(40, up);
      w1 = Math.max(330 + r() * 300 + d * 80, down * Math.PI / 2 / 1.15);
      w2 = Math.max(200 + r() * 180, up * Math.PI / 2 / 1.0);
    }
    const v = { x: top.x + w1, y: top.y + down }, p = { x: v.x + w2, y: v.y - up };
    this.pts.push(v, p);
    if (top.x < 300) return;
    // 생선 놓기
    const fishAt = (x, y, gold) => items.push({ x, y, gold: !!gold, taken: false, ph: r() * 6 });
    const roll = r();
    if (roll < 0.42) {
      // 내리막을 따라 한 줄
      const n = 5 + Math.floor(r() * 4), x0 = top.x + w1 * 0.25;
      for (let i = 0; i < n; i++) { const x = x0 + i * 36; fishAt(x, this.y(x) - 18); }
    } else if (roll < 0.8) {
      // 언덕 꼭대기에서 뛰어야 먹는 공중 아치
      const n = 7 + Math.floor(r() * 3), L = 300 + r() * 260, H = 70 + r() * 90 + d * 40, x0 = top.x + 50;
      const gi = r() < 0.12 ? Math.floor(n / 2) : -1;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1), x = x0 + u * L;
        const y = Math.min(top.y - 40 - H * Math.sin(Math.PI * u), this.y(x) - 40);
        fishAt(x, y, i === gi);
      }
    } else {
      // 오르막을 따라 한 줄
      const n = 4 + Math.floor(r() * 3), x0 = v.x + w2 * 0.15;
      for (let i = 0; i < n; i++) { const x = x0 + i * 34; fishAt(x, this.y(x) - 18); }
    }
  },
};

// ===== 게임 상태 =====
const G = {
  state: 'play', demo: false, t: 0, stateT: 0,
  P: null, A: null, items: [], parts: [], pops: [], cam: { x: 0, y: 0, z: 1, shake: 0 },
  dist: 0, fish: 0, score: 0, bonus: 0, perfects: 0, combo: 0, maxSpeed: 0, fever: false,
  phase: 0, warnT: 0, newBest: false, passedBest: false, tut: 0, tutT: 0, inp: { held: false },
  banner: null,
};

function newGame(demo) {
  Terr.reset(demo ? 777 : (Date.now() & 0xffffff));
  G.demo = demo; G.state = 'play'; G.t = 0; G.stateT = 0;
  G.items = []; G.parts = []; G.pops = []; G.banner = null;
  G.P = { x: -60, y: 0, vx: PH.VSTART, vy: 0, v: PH.VSTART, ground: true, ang: 0, airT: 0, relT: 0, upT: 0, stun: 0, spin: 0, tuck: 0, flap: 0, heldT: 0 };
  G.P.y = Terr.y(G.P.x);
  G.A = { x: G.P.x - 760, v: 0 };
  G.dist = 0; G.fish = 0; G.score = 0; G.bonus = 0; G.perfects = 0; G.combo = 0; G.maxSpeed = 0; G.fever = false;
  G.phase = 0; G.warnT = 0; G.tipUp = false; G.newBest = false; G.passedBest = false;
  G.tut = !demo && !Save.data.tut ? 1 : 0; G.tutT = 0;
  G.inp.held = false;
  while (Terr.last().x < 4000) Terr.gen(G.items);
  G.cam.x = G.P.x + 80; G.cam.y = G.P.y; G.cam.z = 1; G.cam.shake = 0;
}

const speedOf = P => (P.ground ? P.v : Math.hypot(P.vx, P.vy));

function pop(txt, col, size, world) {
  const P = G.P;
  if (!world) for (let i = G.pops.length - 1; i >= 0; i--) if (!G.pops[i].world) G.pops.splice(i, 1); // 가운데 알림은 하나만
  G.pops.push({ txt, col: col || '#fff', size: size || 16, life: 1.2, max: 1.2, x: world ? P.x : 0, y: world ? P.y - 50 : 0, world: !!world });
}
function banner(txt, col) { G.banner = { txt, col: col || '#fff', life: 1.4 }; }

function addPart(x, y, vx, vy, life, size, col, kind) {
  if (G.parts.length > 420) G.parts.shift();
  G.parts.push({ x, y, vx, vy, life, max: life, size, col, kind: kind || 0 });
}
function burst(x, y, n, spd, col, size, up) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = spd * (0.3 + Math.random() * 0.7);
    addPart(x, y, Math.cos(a) * s, Math.sin(a) * s - (up || 0), 0.5 + Math.random() * 0.5, size * (0.6 + Math.random() * 0.8), col);
  }
}

// 데모(타이틀 화면)용 자동 조종
function botHeld(P) {
  if (P.ground) return Terr.slope(P.x + 30) > 0.04;
  let x = P.x, y = P.y, vx = P.vx, vy = P.vy;
  for (let i = 0; i < 400; i++) {
    vy += PH.G_LIGHT / 60; x += vx / 60; y += vy / 60;
    if (y >= Terr.y(x)) return Terr.slope(x) < 0.25;
  }
  return true;
}

function stepGame(dt) {
  G.t += dt; G.stateT += dt;
  const P = G.P;
  if (G.state === 'play') {
    const held = (G.demo ? botHeld(P) : G.inp.held) && P.stun <= 0;
    stepPlayer(P, held, dt);
    if (!G.demo) stepAvalanche(dt);
    collect(P);
    if (G.tut) stepTutorial(P, held, dt);
  } else if (G.state === 'caught') {
    G.A.x += 900 * dt;
    if (G.A.x > P.x - 20) { P.x = G.A.x - 20 + Math.sin(G.stateT * 9) * 6; P.y = Terr.y(P.x) - 60 - Math.sin(G.stateT * 5) * 20; P.spin += dt * 12; }
    if (G.stateT > 1.5) { G.state = 'over'; G.stateT = 0; }
  }
  // 앞쪽 지형 만들기, 뒤쪽 정리
  const ahead = G.cam.x + (VW / Math.max(G.cam.z, 0.3)) + 1500;
  while (Terr.last().x < ahead) Terr.gen(G.items);
  const behind = Math.min(G.A.x, G.cam.x - VW / Math.max(G.cam.z, 0.3)) - 1800;
  while (Terr.pts.length > 6 && Terr.pts[2].x < behind) Terr.pts.shift();
  while (G.items.length && G.items[0].x < behind) G.items.shift();
  stepParts(dt);
  stepCamera(dt);
}

function stepPlayer(P, held, dt) {
  const g = held ? PH.G_HEAVY : PH.G_LIGHT;
  P.tuck = approach(P.tuck, held ? 1 : 0, dt * 7);
  P.heldT = held ? P.heldT + dt : 0;
  if (P.stun > 0) { P.stun -= dt; P.spin = P.stun > 0 ? P.spin + dt * 14 : 0; }
  if (P.ground) {
    const s = Terr.slope(P.x), th = Math.atan(s);
    let a = g * Math.sin(th) - PH.FRIC - PH.DRAG * P.v * P.v;
    if (held && th < -0.03) {
      a -= PH.HOLD_UP * Math.min(1, -th * 4);
      P.upT += PH.DT;
      if (P.upT > 1.2 && !G.tipUp && !G.demo) { G.tipUp = true; pop(t('tipUp'), '#bff4ff', 17); }
    } else P.upT = 0;
    if (G.fever) a += 30;
    P.v += a * dt;
    if (P.stun > 0) P.v = approach(P.v, PH.VMIN * 1.2, 260 * dt);
    if (P.v < PH.VMIN) P.v = PH.VMIN; // 지느러미로 영차영차, 멈추거나 뒤로 밀리지 않는다
    P.v = Math.min(P.v, PH.VMAX);
    P.x += P.v * Math.cos(th) * dt;
    P.y = Terr.y(P.x);
    const s2 = Terr.slope(P.x), th2 = Math.atan(s2);
    P.vx = P.v * Math.cos(th2); P.vy = P.v * Math.sin(th2);
    P.ang += wrapA(th2 - P.ang) * Math.min(1, dt * 14);
    // 볼록한 꼭대기에서 원심력이 중력을 이기면 날아오른다
    const k = Terr.curv(P.x) / Math.pow(1 + s2 * s2, 1.5);
    if (P.v > 140 && P.v * P.v * k > g * Math.cos(th2)) {
      P.ground = false; P.airT = 0; P.relT = 0; P.y -= 0.5;
      if (P.v > 380 && th2 < -0.12) {
        if (!G.demo) Sound.sfx('takeoff');
        burst(P.x, P.y, 8, 120, '#ffffff', 3, 40);
      }
    }
    // 눈보라 꼬리
    if (P.v > 230 && Math.random() < clamp(P.v / 900, 0.15, 0.9)) {
      addPart(P.x - 14 * Math.cos(th2), P.y - 2, -P.vx * 0.25 + (Math.random() - 0.5) * 60, -40 - Math.random() * 90, 0.5 + Math.random() * 0.4, 2 + Math.random() * 3, G.fever ? '#bff4ff' : '#ffffff');
    }
  } else {
    P.airT += dt;
    if (!held) P.relT += dt; // 공중에서 손을 뗀 시간 (계속 누르기만 하면 완벽 착지가 안 된다)
    P.vy += g * dt;
    const sp = Math.hypot(P.vx, P.vy);
    P.vx -= PH.AIR_DRAG * P.vx * sp * dt; P.vy -= PH.AIR_DRAG * P.vy * sp * dt;
    P.x += P.vx * dt; P.y += P.vy * dt;
    const va = Math.atan2(P.vy, P.vx);
    if (P.stun <= 0) P.ang += wrapA(va * 0.85 - P.ang) * Math.min(1, dt * 5);
    P.flap += dt * (held ? 4 : 16);
    if (P.y >= Terr.y(P.x)) land(P);
  }
  const sp = speedOf(P);
  G.maxSpeed = Math.max(G.maxSpeed, sp);
  G.dist = Math.max(G.dist, Math.floor((P.x + 60) / M));
  // 시간대 변화
  const ph = Math.floor(G.dist / PHASE_LEN);
  if (ph !== G.phase) { G.phase = ph; if (!G.demo) { banner(t('ph' + (ph % 4)), '#fff'); Sound.sfx('phase'); } }
  if (!G.demo && !G.passedBest && Save.data.bestDist > 50 && G.dist > Save.data.bestDist) {
    G.passedBest = true; banner('★ ' + t('newBest'), '#ffe066'); Sound.sfx('record');
  }
  G.score = G.dist + G.bonus;
}

function land(P) {
  const s = Terr.slope(P.x), th = Math.atan(s);
  P.y = Terr.y(P.x);
  const va = Math.atan2(P.vy, P.vx), phi = Math.abs(wrapA(va - th));
  const vt = P.vx * Math.cos(th) + P.vy * Math.sin(th);
  const air = P.airT, sp = Math.hypot(P.vx, P.vy);
  P.ground = true;
  if (air < 0.32 || sp < 200) { P.v = Math.max(vt, PH.VMIN); return; } // 작은 통통 튐은 판정 없음
  const fx = P.x, fy = P.y;
  if (phi > PH.CRASH || (P.stun <= 0 && Math.abs(wrapA(P.ang - th)) > 1.5)) {
    // 넘어짐
    P.v = Math.max(vt * 0.32, PH.VMIN); P.stun = 1.0; P.spin = 0;
    G.combo = 0; G.fever = false;
    G.cam.shake = 9;
    burst(fx, fy - 8, 26, 260, '#ffffff', 4, 120);
    if (!G.demo) { Sound.sfx('crash'); pop(t('crash'), '#ff8a8a', 26); }
    return;
  }
  const airBonus = air > 1.0 ? Math.floor(air * 20) : 0;
  if (phi < PH.PERFECT && th > 0.12 && P.relT > 0.2) {
    G.combo++; G.perfects++;
    P.v = Math.min(PH.VMAX, vt + 70 + Math.min(G.combo, 6) * 14);
    const pts = 50 * Math.min(G.combo, 10) + airBonus;
    G.bonus += pts;
    burst(fx, fy - 6, 18, 220, '#fff7a8', 3, 60);
    burst(fx, fy - 6, 12, 160, '#9ff0ff', 2.5, 40);
    if (!G.fever && G.combo >= 3) { G.fever = true; if (!G.demo) { Sound.sfx('fever'); banner(t('fever'), '#7ff5ff'); } }
    if (!G.demo) {
      Sound.sfx('perfect', G.combo);
      pop(t('perfect') + (G.combo > 1 ? ` x${G.combo}` : ''), '#ffe45c', 24);
      pop('+' + pts, '#fff', 15, true);
    }
    if (G.tut === 3) tutNext();
  } else if (phi < PH.GOOD) {
    P.v = Math.max(vt, PH.VMIN);
    if (air > 0.7) { G.combo = 0; G.fever = false; }
    G.bonus += airBonus;
    burst(fx, fy - 4, 10, 140, '#ffffff', 3, 50);
    if (!G.demo) { Sound.sfx('land'); if (airBonus) pop('+' + airBonus, '#fff', 14, true); }
  } else {
    P.v = Math.max(vt * 0.85, PH.VMIN);
    G.combo = 0; G.fever = false;
    G.cam.shake = 5;
    burst(fx, fy - 4, 16, 180, '#ffffff', 3.5, 60);
    if (!G.demo) { Sound.sfx('hard'); pop(t('hard'), '#d0e4ff', 20); }
  }
}

function stepAvalanche(dt) {
  const A = G.A, P = G.P;
  const base = G.tut ? 210 : 260;
  A.v = base + Math.min(520, G.t * 2.6);
  A.x += A.v * dt;
  A.x = Math.max(A.x, P.x - 1350);
  const gap = P.x - A.x;
  G.warnT -= dt;
  if (gap < 420 && G.warnT <= 0) { G.warnT = 6; Sound.sfx('warn'); pop(t('warn'), '#ffb3a8', 17); }
  if (gap < 14) {
    G.state = 'caught'; G.stateT = 0; G.cam.shake = 14;
    Sound.sfx('caught');
    burst(P.x, P.y - 20, 40, 320, '#ffffff', 5, 160);
    finishRun();
  }
}

function finishRun() {
  const d = Save.data;
  G.newBest = G.dist > d.bestDist;
  if (G.newBest) d.bestDist = G.dist;
  d.bestScore = Math.max(d.bestScore, G.score);
  d.fishTotal += G.fish; d.plays++;
  Save.save();
}

function collect(P) {
  const cx = P.x + Math.sin(P.ang) * 14, cy = P.y - Math.cos(P.ang) * 16;
  for (const it of G.items) {
    if (it.taken) continue;
    if (it.x > cx + 40) break;
    if (it.x < cx - 40) continue;
    const dx = it.x - cx, dy = it.y - cy;
    if (dx * dx + dy * dy < 28 * 28) {
      it.taken = true;
      const val = (it.gold ? 50 : 10) * (G.fever ? 2 : 1);
      G.fish += it.gold ? 5 : 1; G.bonus += val;
      burst(it.x, it.y, it.gold ? 16 : 6, it.gold ? 200 : 110, it.gold ? '#ffd84a' : '#bfe9ff', 2.5, 20);
      if (!G.demo) {
        if (it.gold) { Sound.sfx('golden'); pop(t('golden'), '#ffd84a', 20); }
        else Sound.sfx('fish', G.fishChain = (G.t - (G.lastFishT || 0) < 0.6 ? (G.fishChain || 0) + 1 : 0));
        G.lastFishT = G.t;
      }
    }
  }
}

// ===== 튜토리얼 (처음 한 번) =====
function tutNext() {
  G.tut++; G.tutT = 0;
  if (G.tut > 3) {
    G.tut = 0; Save.data.tut = true; Save.save();
    pop(t('tutDone'), '#bff4ff', 17);
  }
}
function stepTutorial(P, held, dt) {
  G.tutT += dt;
  if (G.tut === 1 && P.ground && held && Terr.slope(P.x) > 0.1 && P.heldT > 0.5) tutNext();
  else if (G.tut === 2 && !P.ground && P.airT > 0.55) tutNext();
  else if (G.tut === 3 && G.tutT > 25) tutNext();
}

function stepParts(dt) {
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i];
    p.life -= dt;
    if (p.life <= 0) { G.parts.splice(i, 1); continue; }
    p.vy += 420 * dt; p.vx *= 1 - dt * 1.5;
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  for (let i = G.pops.length - 1; i >= 0; i--) {
    const p = G.pops[i];
    p.life -= dt;
    if (p.world) p.y -= 40 * dt;
    if (p.life <= 0) G.pops.splice(i, 1);
  }
  if (G.banner) { G.banner.life -= dt; if (G.banner.life <= 0) G.banner = null; }
}

// 카메라: 속도가 빠르거나 높이 날면 멀리 보이게 줌 아웃
function stepCamera(dt) {
  const P = G.P, c = G.cam, sp = speedOf(P);
  let maxG = Terr.y(P.x);
  for (let k = 1; k <= 4; k++) maxG = Math.max(maxG, Terr.y(P.x + k * 110 * (0.6 + sp / 900)));
  const h = Math.max(0, maxG - P.y);
  let zT = lerp(1.0, 0.74, clamp((sp - 300) / 900, 0, 1));
  zT = Math.min(zT, (VH * 0.66) / (h + 120));
  zT = clamp(zT, 0.48, 1.05);
  c.z += (zT - c.z) * Math.min(1, dt * 2.6);
  const fx = P.x + 30 + Math.min(sp, 1400) * 0.1;
  const fy = P.y * 0.55 + maxG * 0.45 - 20;
  c.x += (fx - c.x) * Math.min(1, dt * 9);
  c.y += (fy - c.y) * Math.min(1, dt * 6);
  c.shake = Math.max(0, c.shake - dt * 30);
}
