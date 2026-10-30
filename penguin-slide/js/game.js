'use strict';
/* 펭귄 썰매 활강 — 지형 생성, 물리(120Hz 고정), 착지 판정, 공중제비, 장애물·아이템, 눈사태, 미션 */
const PH = {
  DT: 1 / 120,
  G_LIGHT: 640,   // 손을 뗐을 때 (가볍다)
  G_HEAVY: 1800,  // 꾹 눌렀을 때 (무겁다)
  FRIC: 16, DRAG: 0.00015, AIR_DRAG: 0.00004,
  VMIN: 90, VMAX: 1250, VSTART: 300,
  HOLD_UP: 550,   // 오르막에서 누르고 있으면 썰매가 눈을 밀어 더 느려진다
  PERFECT: 0.42, GOOD: 0.75, CRASH: 1.12, // 착지 각도 차이 (라디안)
  FLIP: 7.5,      // 공중제비 회전 속도 (rad/s, 올라가며 누르는 동안)
  FLIP_GO: 2.1,   // 이만큼 넘게 돌았으면 저절로 마저 돈다
  FLIP_AUTO: 8.5, // 저절로 마저 돌거나 펴지는 속도
  FLIP_OK: 0.9,   // 회전이 이만큼 덜 끝난 채 땅에 닿으면 넘어진다
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
  gen(items, obs, ice) {
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
    const fishAt = (x, y, gold) => items.push({ x, y, gold: !!gold, kind: 'fish', taken: false, ph: r() * 6 });
    const roll = r();
    const late = top.x > 2600;
    // 얼음길: 내리막에서 골짜기까지 미끄러워서 쭉 빨라진다
    if (late && r() < 0.17) ice.push({ x0: top.x + w1 * 0.15, x1: v.x + w2 * 0.45 });
    // 장애물: 꼭대기 바로 너머 — 꼭대기에서 손을 떼고 날아오르면 넘어가고, 눌러 붙어 내려가면 부딪힌다
    if (late && roll >= 0.42 && r() < 0.22 + d * 0.2) obs.push({ x: top.x + w1 * (0.12 + r() * 0.16), kind: r() < 0.55 ? 'rock' : 'snowman', hit: false });
    // 아이템
    if (late && r() < 0.13) {
      const kinds = ['magnet', 'shield', 'rocket'], x = v.x + w2 * 0.35;
      items.push({ x, y: this.y(x) - 30, kind: kinds[Math.floor(r() * 3)], taken: false, ph: r() * 6 });
    }
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
    items.sort((a, b) => a.x - b.x);
  },
  onIce(x, ice) {
    for (const z of ice) if (x >= z.x0 && x <= z.x1) return true;
    return false;
  },
};

// ===== 게임 상태 =====
const G = {
  state: 'play', demo: false, t: 0, stateT: 0,
  P: null, A: null, items: [], obs: [], ice: [], parts: [], pops: [], cam: { x: 0, y: 0, z: 1, shake: 0 },
  dist: 0, fish: 0, score: 0, bonus: 0, perfects: 0, combo: 0, maxSpeed: 0, fever: false,
  phase: 0, warnT: 0, newBest: false, passedBest: false, tut: 0, tutT: 0, inp: { held: false },
  banner: null,
};

function newGame(demo) {
  Terr.reset(demo ? 777 : (Date.now() & 0xffffff));
  G.demo = demo; G.state = 'play'; G.t = 0; G.stateT = 0;
  G.items = []; G.obs = []; G.ice = []; G.parts = []; G.pops = []; G.banner = null;
  G.P = { x: -60, y: 0, vx: PH.VSTART, vy: 0, v: PH.VSTART, ground: true, ang: 0, airT: 0, relT: 0, upT: 0, stun: 0, spin: 0, tuck: 0, flap: 0, heldT: 0,
    flip: 0, spinOn: false, noFlip: false, bump: 0, onIce: false };
  G.P.y = Terr.y(G.P.x);
  G.A = { x: G.P.x - 760, v: 0 };
  G.dist = 0; G.fish = 0; G.score = 0; G.bonus = 0; G.perfects = 0; G.combo = 0; G.maxSpeed = 0; G.fever = false;
  G.phase = 0; G.warnT = 0; G.tipUp = false; G.newBest = false; G.passedBest = false;
  G.tut = !demo && !Save.data.tut ? 1 : 0; G.tutT = 0;
  G.inp.held = false;
  G.magT = 0; G.rocketT = 0; G.shield = false; G.tipFlipShown = false;
  G.st = { dist: 0, fish: 0, perfect: 0, flip: 0, item: 0, fever: 0, golden: 0 };
  ensureMissions();
  G.mDone = [false, false, false]; G.mList = Save.data.missions.map(m => Object.assign({}, m)); G.earned = 0;
  while (Terr.last().x < 4000) Terr.gen(G.items, G.obs, G.ice);
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
  if (G.demo && P.spinOn && P.vy < 0) return true;
  let x = P.x, y = P.y, vx = P.vx, vy = P.vy, n = 0;
  for (let i = 0; i < 400; i++) {
    vy += PH.G_LIGHT / 60; x += vx / 60; y += vy / 60; n++;
    if (y >= Terr.y(x)) break;
  }
  if (G.demo && !P.noFlip && P.vy < -120 && n > 80 && P.flip === 0) return true; // 데모: 오래 날 때 공중제비
  return Terr.slope(x) < 0.25;
}

function stepGame(dt) {
  G.t += dt; G.stateT += dt;
  const P = G.P;
  if (G.state === 'play') {
    const held = (G.demo ? botHeld(P) : G.inp.held) && P.stun <= 0;
    stepPlayer(P, held, dt);
    stepHazards(P, dt);
    if (!G.demo) { stepAvalanche(dt); checkMissions(); }
    collect(P);
    if (G.tut) stepTutorial(P, held, dt);
  } else if (G.state === 'caught') {
    G.A.x += 900 * dt;
    if (G.A.x > P.x - 20) { P.x = G.A.x - 20 + Math.sin(G.stateT * 9) * 6; P.y = Terr.y(P.x) - 60 - Math.sin(G.stateT * 5) * 20; P.spin += dt * 12; }
    if (G.stateT > 1.5) { G.state = 'over'; G.stateT = 0; }
  }
  // 앞쪽 지형 만들기, 뒤쪽 정리
  const ahead = G.cam.x + (VW / Math.max(G.cam.z, 0.3)) + 1500;
  while (Terr.last().x < ahead) Terr.gen(G.items, G.obs, G.ice);
  const behind = Math.min(G.A.x, G.cam.x - VW / Math.max(G.cam.z, 0.3)) - 1800;
  while (Terr.pts.length > 6 && Terr.pts[2].x < behind) Terr.pts.shift();
  while (G.items.length && G.items[0].x < behind) G.items.shift();
  while (G.obs.length && G.obs[0].x < behind) G.obs.shift();
  while (G.ice.length && G.ice[0].x1 < behind) G.ice.shift();
  stepParts(dt);
  stepCamera(dt);
}

function stepPlayer(P, held, dt) {
  // 공중에서 누르면 늘 무거워진다(빨리 내려오기). 올라가는 중에 새로 누르면 몸도 앞으로 돈다:
  // 짧게 누르면 도로 펴지고, 길게 누르면 공중제비가 된다
  if (!P.ground) {
    if (!held) P.noFlip = false;
    if (held && !P.noFlip && !P.spinOn && P.vy < -150 && P.stun <= 0) { P.spinOn = true; if (!G.demo) Sound.sfx('flip'); }
  }
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
    if (Terr.onIce(P.x, G.ice)) { a += PH.FRIC + PH.DRAG * P.v * P.v * 0.5 + 110; P.onIce = true; } else P.onIce = false;
    if (G.rocketT > 0) a += P.v < PH.VMAX ? 900 : 0;
    P.v += a * dt;
    if (P.stun > 0) P.v = approach(P.v, PH.VMIN * 1.2, 260 * dt);
    if (P.v < PH.VMIN) P.v = PH.VMIN; // 지느러미로 영차영차, 멈추거나 뒤로 밀리지 않는다
    P.v = Math.min(P.v, G.rocketT > 0 ? PH.VMAX * 1.15 : PH.VMAX);
    P.x += P.v * Math.cos(th) * dt;
    P.y = Terr.y(P.x);
    const s2 = Terr.slope(P.x), th2 = Math.atan(s2);
    P.vx = P.v * Math.cos(th2); P.vy = P.v * Math.sin(th2);
    P.ang += wrapA(th2 - P.ang) * Math.min(1, dt * 14);
    // 볼록한 꼭대기에서 원심력이 중력을 이기면 날아오른다
    const k = Terr.curv(P.x) / Math.pow(1 + s2 * s2, 1.5);
    if (P.v > 140 && P.v * P.v * k > g * Math.cos(th2)) {
      P.ground = false; P.airT = 0; P.relT = 0; P.y -= 0.5;
      P.flip = 0; P.spinOn = false; P.noFlip = held; // 누른 채로 떠오르면 한 번 뗐다 눌러야 돈다
      if (P.v > 380 && th2 < -0.12) {
        if (!G.demo) Sound.sfx('takeoff');
        burst(P.x, P.y, 8, 120, '#ffffff', 3, 40);
      }
    }
    // 눈보라 꼬리
    if (P.v > 230 && Math.random() < clamp(P.v / 900, 0.15, 0.9)) {
      addPart(P.x - 14 * Math.cos(th2), P.y - 2, -P.vx * 0.25 + (Math.random() - 0.5) * 60, -40 - Math.random() * 90, 0.5 + Math.random() * 0.4, 2 + Math.random() * 3, G.fever || P.onIce ? '#bff4ff' : '#ffffff');
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
    if (G.rocketT > 0) { const sp2 = Math.hypot(P.vx, P.vy) || 1; P.vx += (P.vx / sp2) * 500 * dt; P.vy += (P.vy / sp2) * 200 * dt - 300 * dt; }
    // 공중제비 회전: 올라가는 동안 누르고 있으면 돈다. 그 밖에는 저절로 정리된다 —
    // 1/3 바퀴 넘게 돌았으면 마저 돌고, 아니면 도로 펴진다 (내려올 때 눌러도 안전하게)
    if (P.spinOn) {
      const TAU = Math.PI * 2, base = Math.floor(P.flip / TAU) * TAU, rem = P.flip - base;
      if (held && P.vy < 0) P.flip += PH.FLIP * dt;
      else if (rem > PH.FLIP_GO) P.flip = Math.min(P.flip + PH.FLIP_AUTO * dt, base + TAU);
      else P.flip = Math.max(P.flip - PH.FLIP_AUTO * dt, base);
      const r2 = P.flip - Math.floor(P.flip / TAU + 1e-9) * TAU;
      if (!(held && P.vy < 0) && r2 < 1e-6) P.spinOn = false;
    }
    // 아직 공중제비를 못 해 본 사람에게 안내
    if (!G.demo && !Save.data.tipFlip && !G.tipFlipShown && !G.tut && P.airT > 0.15 && P.vy < -250) { G.tipFlipShown = true; pop(t('tipFlip'), '#bff4ff', 17); }
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
  const turns = P.flip / (Math.PI * 2), nFlip = Math.round(turns), flipBad = Math.abs(turns - nFlip) * Math.PI * 2 > PH.FLIP_OK;
  P.flip = 0; P.spinOn = false;
  if (!flipBad && (air < 0.32 || sp < 200)) { P.v = Math.max(vt, PH.VMIN); return; } // 작은 통통 튐은 판정 없음
  const fx = P.x, fy = P.y;
  if (phi > PH.CRASH || flipBad || (P.stun <= 0 && Math.abs(wrapA(P.ang - th)) > 1.5)) {
    if (G.shield) { useShield(fx, fy); P.v = Math.max(vt, PH.VMIN); return; }
    // 넘어짐
    P.v = Math.max(vt * 0.32, PH.VMIN); P.stun = 1.0; P.spin = 0;
    G.combo = 0; G.fever = false;
    G.cam.shake = 9;
    burst(fx, fy - 8, 26, 260, '#ffffff', 4, 120);
    if (!G.demo) { Sound.sfx('crash'); pop(t('crash'), '#ff8a8a', 26); }
    return;
  }
  const airBonus = air > 1.0 ? Math.floor(air * 20) : 0;
  let flipV = 0;
  if (nFlip > 0) {
    const pts = 300 * nFlip * nFlip;
    G.bonus += pts; G.st.flip += nFlip; flipV = 70 * nFlip;
    burst(fx, fy - 10, 14 * nFlip, 240, '#ffd0f0', 3, 80);
    if (!G.demo) {
      Sound.sfx('flipLand');
      pop((nFlip > 1 ? tn('flipN', nFlip) : t('flip')) + ' +' + pts, '#ff9df0', 15, true);
      if (!Save.data.tipFlip) { Save.data.tipFlip = true; Save.save(); }
    }
  }
  if (phi < PH.PERFECT && th > 0.12 && P.relT > 0.2) {
    G.combo++; G.perfects++; G.st.perfect++;
    P.v = Math.min(PH.VMAX, vt + flipV + 70 + Math.min(G.combo, 6) * 14);
    const pts = 50 * Math.min(G.combo, 10) + airBonus;
    G.bonus += pts;
    burst(fx, fy - 6, 18, 220, '#fff7a8', 3, 60);
    burst(fx, fy - 6, 12, 160, '#9ff0ff', 2.5, 40);
    if (!G.fever && G.combo >= 3) { G.fever = true; G.st.fever++; if (!G.demo) { Sound.sfx('fever'); banner(t('fever'), '#7ff5ff'); } }
    if (!G.demo) {
      Sound.sfx('perfect', G.combo);
      pop(t('perfect') + (G.combo > 1 ? ` x${G.combo}` : ''), '#ffe45c', 24);
      pop('+' + pts, '#fff', 15, true);
    }
    if (G.tut === 3) tutNext();
  } else if (phi < PH.GOOD) {
    P.v = Math.max(vt + flipV, PH.VMIN);
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
  if (gap < 14 && G.shield) {
    G.shield = false; A.x = P.x - 700; G.cam.shake = 10;
    Sound.sfx('shield'); pop(t('shieldAva'), '#9fd8ff', 18);
    burst(P.x - 20, P.y - 20, 30, 300, '#9fd8ff', 4, 100);
  } else if (gap < 14) {
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
  checkMissions();
  G.earned = G.fish;
  for (let i = 0; i < 3; i++) if (G.mDone[i]) G.earned += G.mList[i].reward;
  d.bank += G.earned;
  for (let i = 0; i < 3; i++) if (G.mDone[i]) d.missions[i] = makeMission(d.mIdx++);
  Save.save();
}

// ===== 미션 진행 =====
function missionProg(m) { return m.type === 'dist' ? G.dist : m.type === 'fish' ? G.fish : G.st[m.type]; }
function checkMissions() {
  G.mList.forEach((m, i) => {
    if (!G.mDone[i] && missionProg(m) >= m.goal) {
      G.mDone[i] = true;
      if (G.state === 'play') { Sound.sfx('mission'); banner(t('mDone') + ' +' + m.reward + '🐟', '#ffe066'); }
    }
  });
}

// ===== 장애물·얼음·아이템 =====
function useShield(x, y) {
  G.shield = false;
  if (!G.demo) { Sound.sfx('shield'); pop(t('shieldUsed'), '#9fd8ff', 18); }
  burst(x, y - 14, 24, 240, '#9fd8ff', 3.5, 80);
}
const OBS_H = { rock: 20, snowman: 36 };
function stepHazards(P, dt) {
  if (G.magT > 0) G.magT -= dt;
  if (G.rocketT > 0) {
    G.rocketT -= dt;
    const a = P.ang;
    addPart(P.x - Math.cos(a) * 18, P.y - 8 - Math.sin(a) * 18, -P.vx * 0.3 + (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, 0.35, 3 + Math.random() * 3, Math.random() < 0.5 ? '#ffb347' : '#ff6a3d');
  }
  for (const o of G.obs) {
    if (o.hit) continue;
    if (o.x > P.x + 30) break;
    if (Math.abs(o.x - P.x) > 16) continue;
    const gy = Terr.y(o.x);
    if (P.y < gy - OBS_H[o.kind]) continue;
    o.hit = true;
    const breaks = G.rocketT > 0 || G.shield || (G.fever && o.kind === 'snowman');
    if (breaks) {
      if (G.shield && G.rocketT <= 0 && !(G.fever && o.kind === 'snowman')) useShield(o.x, gy);
      o.gone = true;
      burst(o.x, gy - 16, 22, 260, o.kind === 'rock' ? '#a0a8b8' : '#ffffff', 4, 140);
      if (!G.demo) { Sound.sfx('smash'); pop(t('smash'), '#ffffff', 14, true); }
      continue;
    }
    // 부딪힘: 속도가 크게 줄고 잠깐 휘청
    if (P.ground) P.v = Math.max(P.v * 0.62, PH.VMIN); else { P.vx *= 0.62; P.vy = Math.min(P.vy, 0) - 120; }
    P.stun = Math.max(P.stun, 0.35);
    G.combo = 0; G.fever = false; G.cam.shake = 8;
    if (o.kind === 'snowman') o.gone = true;
    burst(o.x, gy - 14, 20, 220, o.kind === 'rock' ? '#a0a8b8' : '#ffffff', 4, 120);
    if (!G.demo) { Sound.sfx(o.kind === 'rock' ? 'bump' : 'smash'); pop(t('bump'), '#ffd0a8', 22); }
  }
}

function collect(P) {
  const cx = P.x + Math.sin(P.ang) * 14, cy = P.y - Math.cos(P.ang) * 16;
  const reach = G.magT > 0 ? 200 : 40;
  for (const it of G.items) {
    if (it.taken) continue;
    if (it.x > cx + reach) break;
    if (it.x < cx - reach) continue;
    let dx = it.x - cx, dy = it.y - cy;
    if (G.magT > 0 && it.kind === 'fish' && dx * dx + dy * dy < 200 * 200) {
      // 자석: 생선이 펭귄 쪽으로 끌려온다
      const dd = Math.hypot(dx, dy) || 1, pull = Math.min(dd, 900 * PH.DT);
      it.x -= dx / dd * pull; it.y -= dy / dd * pull; dx = it.x - cx; dy = it.y - cy;
    }
    if (dx * dx + dy * dy < 28 * 28) {
      it.taken = true;
      if (it.kind !== 'fish') { takePower(it, P); continue; }
      const val = (it.gold ? 50 : 10) * (G.fever ? 2 : 1);
      G.fish += it.gold ? 5 : 1; G.bonus += val;
      if (it.gold) G.st.golden++;
      burst(it.x, it.y, it.gold ? 16 : 6, it.gold ? 200 : 110, it.gold ? '#ffd84a' : '#bfe9ff', 2.5, 20);
      if (!G.demo) {
        if (it.gold) { Sound.sfx('golden'); pop(t('golden'), '#ffd84a', 20); }
        else Sound.sfx('fish', G.fishChain = (G.t - (G.lastFishT || 0) < 0.6 ? (G.fishChain || 0) + 1 : 0));
        G.lastFishT = G.t;
      }
    }
  }
}

function takePower(it, P) {
  G.st.item++;
  if (it.kind === 'magnet') G.magT = 8;
  else if (it.kind === 'shield') G.shield = true;
  else if (it.kind === 'rocket') { G.rocketT = 2.6; if (P.ground) P.v = Math.max(P.v, 700); }
  burst(it.x, it.y, 18, 220, it.kind === 'magnet' ? '#ff8a8a' : it.kind === 'shield' ? '#9fd8ff' : '#ffb347', 3, 40);
  if (!G.demo) { Sound.sfx(it.kind === 'rocket' ? 'rocket' : 'item'); pop(t(it.kind), '#ffffff', 18); }
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
