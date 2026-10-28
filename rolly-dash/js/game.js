'use strict';
/* 구르미 대시 — 물리, 플레이어, 적, 아이템 */
const PH = { G: 1750, JUMP: 640, TOP: 300, ACC: 950, FRIC: 1300, SKID: 2600, AIR: 800, BALLF: 190, SLOPE: 560, MAXV: 920, SPRING: 1120, DT: 1 / 120 };
const SOLID = new Uint8Array(16);
for (const i of [1, 4, 5, 6, 9]) SOLID[i] = 1;

const G = {
  mode: 'stage', world: 0, stage: 0, L: null, p: null, state: 'play', stateT: 0,
  inp: { l: 0, r: 0, j: 0, d: 0, jP: 0, dP: 0 },
  acornsArr: [], enemies: [], things: [], starsObj: [], loose: [], pows: [], bumps: [], parts: [],
  cam: { x: 0, y: 0 }, shake: 0, freeze: 0, flash: 0, banner: null,
};

function newPlayer(x, y) {
  return {
    x, y, vx: 0, vy: 0, w: 20, h: 28, ground: false, slope: 0, dir: 1, ball: false, charging: false, charge: 0,
    airDash: false, inv: 0, shield: false, chili: 0, magnet: 0, coyote: 0, jumpBuf: 0, jumping: false,
    rot: 0, anim: 0, sqx: 1, sqy: 1, prevY: y, combo: 0, comboT: 0, dead: false, revT: 0,
  };
}

// ===== 충돌 도구 =====
function moveX(L, o, dx, margin) {
  o.x += dx;
  const top = o.y - o.h + 1, bot = o.y - margin;
  if (bot <= top) return null;
  const ty0 = Math.floor(top / T), ty1 = Math.floor((bot - 0.001) / T);
  const edge = dx > 0 ? o.x + o.w / 2 : o.x - o.w / 2;
  const tx = Math.floor(edge / T);
  for (let ty = ty0; ty <= ty1; ty++) {
    if (SOLID[L.get(tx, ty)]) {
      o.x = dx > 0 ? tx * T - o.w / 2 - 0.01 : (tx + 1) * T + o.w / 2 + 0.01;
      return { tx, ty };
    }
  }
  return null;
}
// yTop~yBot 사이에서 가장 높은 바닥면. 가운데 칸에 비탈이 있으면 비탈이 우선.
function probeGround(L, o, yTop, yBot, oneway) {
  const cx = o.x, ctx_ = Math.floor(cx / T), lx = cx - ctx_ * T;
  const ty0 = Math.floor(yTop / T), ty1 = Math.floor(yBot / T);
  let best = Infinity, kind = 0;
  for (let ty = ty0; ty <= ty1; ty++) {
    const c = L.get(ctx_, ty);
    let s;
    if (c === 2) s = ty * T + T - lx;
    else if (c === 3) s = ty * T + lx;
    else continue;
    if (s >= yTop && s <= yBot && s < best) { best = s; kind = c; }
  }
  if (best < Infinity) return { y: best, kind };
  const xs = [o.x - o.w / 2 + 2, o.x, o.x + o.w / 2 - 2];
  for (const x of xs) {
    const tx = Math.floor(x / T);
    for (let ty = ty0; ty <= ty1; ty++) {
      const c = L.get(tx, ty);
      if (SOLID[c] || (c === 7 && oneway)) {
        const s = ty * T;
        if (s >= yTop && s <= yBot && s < best) { best = s; kind = c; }
      }
    }
  }
  return best < Infinity ? { y: best, kind } : null;
}
function headCheck(L, p) {
  const top = p.y - p.h, ty = Math.floor(top / T);
  const lx = p.x - p.w / 2 + 1, rx = p.x + p.w / 2 - 1;
  const ltx = Math.floor(lx / T), rtx = Math.floor(rx / T);
  const lh = SOLID[L.get(ltx, ty)], rh = SOLID[L.get(rtx, ty)];
  if (!lh && !rh) return null;
  // 모서리에 살짝 걸리면 옆으로 밀어서 통과시킨다
  if (lh && !rh && ltx !== rtx) { const ov = (ltx + 1) * T - lx; if (ov < 9) { p.x += ov + 0.1; return null; } }
  if (rh && !lh && ltx !== rtx) { const ov = rx - rtx * T; if (ov < 9) { p.x -= ov + 0.1; return null; } }
  let tx = lh && rh ? Math.floor(p.x / T) : lh ? ltx : rtx;
  if (!SOLID[L.get(tx, ty)]) tx = lh ? ltx : rtx;
  return { tx, ty };
}

// ===== 시작 =====
function startGame(mode, world, stage) {
  G.mode = mode; G.world = world; G.stage = stage;
  G.acornsArr = []; G.enemies = []; G.things = []; G.starsObj = []; G.loose = []; G.pows = []; G.bumps = []; G.parts = [];
  G.acorns = 0; G.time = 0; G.state = 'play'; G.stateT = 0; G.deaths = 0; G.kills = 0; G.score = 0;
  G.freeze = 0; G.shake = 0; G.flash = 0; G.banner = null; G.result = null; G.pruneT = 0;
  G.starGot = [false, false, false];
  if (mode === 'stage') {
    G.L = genStage(world, stage);
    ingest(G.L.objs); G.L.objs = [];
  } else {
    G.L = newEndlessLevel();
    G.er = mulberry((Date.now() & 0xffffff) + 17);
    G.lastChunk = null;
  }
  const s = G.L.start;
  G.p = newPlayer(s.x, s.y);
  G.p.shield = true;
  G.respawn = { x: s.x, y: s.y };
  G.cam = { x: Math.max(0, s.x - VW * 0.35), y: ROWS * T - VH };
  if (mode === 'endless') {
    G.startX = s.x; G.dist = 0; G.storm = s.x - 560;
    streamEndless();
    G.banner = { text: t('endlessHint'), t: 2.6 };
  } else {
    G.banner = { text: `${world + 1}-${stage + 1}  ${t('w' + world)}`, t: 2.2 };
  }
  Sound.playMusic(world);
}
function makeEnemy(type, x, y) {
  const e = { type, x, y, vx: 0, vy: 0, w: 24, h: 22, ground: false, dead: false, gone: false, active: false, t: Math.random() * 6, bx: x, by: y - 14, timer: 0.8, face: -1, squish: 0, rot: 0 };
  if (type === 'spiky') e.h = 24;
  if (type === 'bee') { e.h = 20; e.y = e.by; }
  return e;
}
function ingest(objs) {
  for (const o of objs) {
    switch (o.k) {
      case 'acorn': G.acornsArr.push({ x: o.x, y: o.y, alive: true }); break;
      case 'starspot': G.acornsArr.push({ x: o.x, y: o.y, alive: true }); break;
      case 'star': G.starsObj.push({ x: o.x, y: o.y, i: o.i, alive: true }); break;
      case 'enemy': G.enemies.push(makeEnemy(o.type, o.x, o.y)); break;
      default: G.things.push(Object.assign({ t: 0, on: false }, o));
    }
  }
}
function streamEndless() {
  const L = G.L;
  while (L.w * T < G.cam.x + VW + 900 && L.w + 60 < L.cap) {
    const dist = L.w - G.L.start.x / T;
    const tier = Math.min(3, Math.floor(dist / 160));
    const w = Math.floor(Math.max(0, dist) / 500) % WORLDS.length;
    if (G.er() < 0.5) L.addFlat(1 + Math.floor(G.er() * 3));
    const c = pickChunk(G.er, tier, w, G.lastChunk);
    G.lastChunk = c.name;
    const objs = L.addChunk(c, G.er);
    if (objs) ingest(objs);
  }
}

// ===== 효과 =====
function puff(x, y, n, color, spd, life, size, grav) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = spd * (0.4 + Math.random() * 0.6);
    G.parts.push({ type: 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color, size: size * (0.6 + Math.random() * 0.6), grav: grav || 0 });
  }
}
function popText(x, y, text, color, big) {
  G.parts.push({ type: 'text', x, y, vx: 0, vy: -50, life: 1.1, max: 1.1, color: color || '#fff', text, size: big ? 18 : 14 });
}
function sparkle(x, y, color) {
  G.parts.push({ type: 'ring', x, y, vx: 0, vy: 0, life: 0.3, max: 0.3, color: color || '#fff6a0', size: 16 });
  puff(x, y, 5, color || '#fff6a0', 120, 0.35, 3, 0);
}
function gainAcorn(n, x, y, quiet) {
  G.acorns += n; G.score += 10 * n;
  if (!quiet) Sound.sfx('acorn');
  if (x != null) sparkle(x, y, '#ffe27a');
}

// ===== 한 단계 진행 =====
function stepGame(dt) {
  if (G.freeze > 0) { G.freeze -= dt; return; }
  G.stateT += dt;
  if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
  if (G.flash > 0) G.flash -= dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 20);
  const p = G.p;
  if (G.state === 'play') {
    G.time += dt;
    updatePlayer(dt, G.inp);
    interact(dt);
  } else if (G.state === 'dying') {
    p.vy += PH.G * dt; p.y += p.vy * dt; p.rot += dt * 8;
    if (G.stateT > 1.3) {
      if (G.mode === 'stage') respawn();
      else { G.state = 'over'; G.stateT = 0; finishEndless(); }
    }
  } else if (G.state === 'clear') {
    updatePlayer(dt, { l: 0, r: G.stateT < 1.6 ? 1 : 0, j: 0, d: 0, jP: 0, dP: 0 });
    if (Math.random() < dt * 5) {
      const x = G.cam.x + 60 + Math.random() * (VW - 120), y = G.cam.y + 40 + Math.random() * 120;
      const cols = ['#ff6b8b', '#ffd34d', '#6be0ff', '#a6ff6b', '#d68bff'];
      puff(x, y, 22, cols[Math.floor(Math.random() * cols.length)], 260, 0.9, 3.5, 200);
      Sound.tone(300 + Math.random() * 500, 0.2, 'triangle', 0.05, 80);
    }
    if (G.stateT > 2.6) { G.state = 'result'; G.stateT = 0; }
  }
  updateEnemies(dt);
  updateLoose(dt);
  updatePows(dt);
  for (const b of G.bumps) b.t += dt;
  if (G.bumps.length && G.bumps[0].t > 0.3) G.bumps = G.bumps.filter(b => b.t < 0.3);
  updateParts(dt);
  updateCam(dt);
  if (G.mode === 'endless') endlessStep(dt);
  G.pruneT += dt;
  if (G.pruneT > 1.5) { G.pruneT = 0; prune(); }
}
function prune() {
  const minX = G.cam.x - 600;
  G.acornsArr = G.acornsArr.filter(a => a.alive && (G.mode === 'stage' || a.x > minX));
  G.enemies = G.enemies.filter(e => !e.gone && (G.mode === 'stage' || e.x > minX));
  if (G.mode === 'endless') G.things = G.things.filter(s => s.x > minX);
}

function updatePlayer(dt, inp) {
  const p = G.p, L = G.L, W = WORLDS[G.world];
  p.prevY = p.y;
  if (p.inv > 0) p.inv -= dt;
  if (p.chili > 0) { p.chili -= dt; if (Math.random() < dt * 30) G.parts.push({ type: 'dot', x: p.x + (Math.random() - 0.5) * 16, y: p.y - 8 - Math.random() * 16, vx: -p.vx * 0.2, vy: -60, life: 0.4, max: 0.4, color: Math.random() < 0.5 ? '#ff7a2a' : '#ffd04a', size: 4, grav: -100 }); }
  if (p.magnet > 0) p.magnet -= dt;
  if (p.comboT > 0) p.comboT -= dt; else if (p.ground) p.combo = 0;
  if (p.ground) { p.coyote = 0.1; p.airDash = false; } else p.coyote -= dt;
  if (inp.jP) p.jumpBuf = 0.13; else p.jumpBuf -= dt;

  const dirIn = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
  const top = PH.TOP * (p.chili > 0 ? 1.35 : 1);
  let acc = PH.ACC * (p.chili > 0 ? 1.3 : 1), fric = PH.FRIC, skid = PH.SKID;
  if (W.ice) { acc *= 0.45; fric *= 0.12; skid *= 0.3; }

  // 구르기 / 모으기
  if (p.charging) {
    if (dirIn) p.dir = dirIn;
    if (!inp.d || !p.ground) {
      p.charging = false; p.ball = true;
      p.vx = p.dir * (430 + 340 * p.charge);
      Sound.sfx('roll'); G.shake = Math.max(G.shake, 2 + p.charge * 3);
      puff(p.x - p.dir * 10, p.y - 4, 10, '#ffffff', 160, 0.4, 4, 0);
    } else {
      p.charge = Math.min(1, p.charge + dt * 2.2);
      p.vx *= 0.85;
      p.revT -= dt;
      if (p.revT <= 0) { p.revT = 0.16; Sound.sfx('rev', p.charge); G.parts.push({ type: 'dot', x: p.x - p.dir * 12, y: p.y - 3, vx: -p.dir * (80 + Math.random() * 120), vy: -40 - Math.random() * 60, life: 0.35, max: 0.35, color: '#fff', size: 4, grav: 300 }); }
    }
  } else if (inp.dP) {
    if (p.ground && Math.abs(p.vx) < 110 && !p.ball) { p.charging = true; p.charge = 0; p.revT = 0; }
    else if (p.ground) {
      p.ball = true;
      if (Math.abs(p.vx) < top + 120) p.vx += sign(p.vx || p.dir) * 170;
      Sound.sfx('roll');
    } else if (!p.airDash) {
      p.airDash = true; p.ball = true;
      const d = dirIn || p.dir; p.dir = d;
      p.vx = d * Math.max(Math.abs(p.vx), 470);
      p.vy = Math.min(p.vy, 0) * 0.3 - 140;
      Sound.sfx('roll');
      puff(p.x, p.y - 14, 8, '#ffffff', 140, 0.35, 4, 0);
    }
  }

  if (!p.charging) {
    if (p.ground) {
      if (p.ball) {
        p.vx = approach(p.vx, 0, (W.ice ? 60 : PH.BALLF) * dt);
        if (dirIn && dirIn !== sign(p.vx)) p.vx += dirIn * 420 * dt;
        if (Math.abs(p.vx) < 60) p.ball = false;
      } else if (dirIn) {
        if (p.vx * dirIn < 0) {
          p.vx += dirIn * skid * dt;
          if (Math.abs(p.vx) > 140 && Math.random() < dt * 30) G.parts.push({ type: 'dot', x: p.x, y: p.y - 2, vx: -dirIn * 40, vy: -40, life: 0.3, max: 0.3, color: '#ffffff', size: 4, grav: 0 });
        } else if (Math.abs(p.vx) < top) {
          p.vx += dirIn * acc * dt;
          if (Math.abs(p.vx) > top) p.vx = dirIn * top;
        } else p.vx = approach(p.vx, dirIn * top, 260 * dt);
        p.dir = dirIn;
      } else p.vx = approach(p.vx, 0, fric * dt);
      if (p.slope) p.vx += (p.slope === 3 ? 1 : -1) * PH.SLOPE * (p.ball ? 1.6 : 1) * dt;
    } else if (dirIn) {
      if (p.vx * dirIn < 0) p.vx += dirIn * PH.AIR * 1.4 * dt;
      else if (Math.abs(p.vx) < top) { p.vx += dirIn * PH.AIR * dt; if (Math.abs(p.vx) > top) p.vx = dirIn * top; }
      p.dir = dirIn;
    }
  }
  if (p.ball && Math.abs(p.vx) > 20) p.dir = sign(p.vx);

  // 점프
  if (p.jumpBuf > 0 && p.coyote > 0 && !p.charging) {
    p.vy = -(PH.JUMP + Math.min(Math.abs(p.vx), 600) * 0.12);
    p.ground = false; p.coyote = 0; p.jumpBuf = 0; p.jumping = true; p.slope = 0;
    p.sqx = 0.75; p.sqy = 1.3;
    Sound.sfx('jump');
    puff(p.x, p.y, 4, '#ffffff', 60, 0.3, 4, 0);
  }
  if (p.jumping && !inp.j && p.vy < -230) { p.vy = -230; p.jumping = false; }
  if (p.vy >= 0) p.jumping = false;

  p.vy = Math.min(p.vy + PH.G * dt, 1000);
  p.vx = clamp(p.vx, -PH.MAXV, PH.MAXV);

  // 가로 이동
  const wasGround = p.ground;
  const margin = wasGround || p.vy >= 0 ? 13 : 2;
  const hw = moveX(L, p, p.vx * dt, margin);
  if (hw) {
    const c = L.get(hw.tx, hw.ty);
    if (p.ball && Math.abs(p.vx) > 330 && c === 4) breakBrick(hw.tx, hw.ty);
    else {
      if (Math.abs(p.vx) > 450) { Sound.sfx('bump'); G.shake = Math.max(G.shake, 3); }
      p.vx = 0;
    }
  }

  // 세로 이동
  if (p.vy < 0) {
    p.y += p.vy * dt; p.ground = false; p.slope = 0;
    const h = headCheck(L, p);
    if (h) {
      p.y = (h.ty + 1) * T + p.h + 0.01; p.vy = 40; p.jumping = false;
      bumpTile(h.tx, h.ty);
    }
  } else {
    p.y += p.vy * dt;
    const g = probeGround(L, p, p.y - 14, p.y + (wasGround ? 14 : 0), true);
    if (g) {
      if (!wasGround) {
        const imp = p.vy;
        p.sqx = 1.25; p.sqy = 0.8;
        if (imp > 420) puff(p.x, g.y - 2, 6, '#ffffff', 90, 0.3, 4, 0);
      }
      p.y = g.y; p.vy = 0; p.ground = true;
      p.slope = g.kind === 2 || g.kind === 3 ? g.kind : 0;
    } else {
      if (wasGround) {
        if (p.slope === 2 && p.vx > 0) p.vy = -p.vx * 0.8;
        else if (p.slope === 3 && p.vx < 0) p.vy = p.vx * 0.8;
      }
      p.ground = false; p.slope = 0;
    }
  }

  // 모양 애니메이션
  p.sqx = lerp(p.sqx, 1, Math.min(1, dt * 12)); p.sqy = lerp(p.sqy, 1, Math.min(1, dt * 12));
  if (p.ball || p.charging) p.rot += (p.charging ? 30 * p.dir : p.vx / 13) * dt;
  else p.rot = 0;
  if (p.ground) p.anim += Math.abs(p.vx) * dt * 0.06;
  if (Math.abs(p.vx) > 520 && Math.random() < dt * 40) G.parts.push({ type: 'streak', x: p.x - p.dir * 14, y: p.y - 6 - Math.random() * 18, vx: -p.vx * 0.15, vy: 0, life: 0.25, max: 0.25, color: 'rgba(255,255,255,0.8)', size: 18 });

  if (p.y > ROWS * T + 40 && G.state === 'play') die('fall');
}

function bumpTile(tx, ty) {
  const L = G.L, c = L.get(tx, ty), cx = tx * T + T / 2;
  G.bumps.push({ tx, ty, t: 0 });
  for (const e of G.enemies) if (!e.dead && Math.abs(e.x - cx) < 26 && Math.abs(e.y - ty * T) < 6) killEnemy(e, sign(e.x - cx) || 1, false);
  for (const a of G.acornsArr) if (a.alive && Math.abs(a.x - cx) < 20 && a.y < ty * T && a.y > ty * T - 40) { a.alive = false; gainAcorn(1, a.x, a.y); }
  if (c === 5) {
    L.set(tx, ty, 6);
    const what = L.box.get(tx * ROWS + ty) || 'acorns';
    if (what === 'acorns') {
      for (let i = 0; i < 3; i++) G.parts.push({ type: 'acornpop', x: cx + (i - 1) * 10, y: ty * T - 6, vx: (i - 1) * 40, vy: -420 - i * 40, life: 0.6, max: 0.6, size: 1, grav: 1500 });
      gainAcorn(3, null, null);
      Sound.sfx('box');
    } else {
      G.pows.push({ type: what, x: cx, y: ty * T + T / 2, rise: 34, t: 0, alive: true });
      Sound.sfx('box');
    }
  } else if (c === 4) breakBrick(tx, ty);
  else Sound.sfx('bump');
}
function breakBrick(tx, ty) {
  G.L.set(tx, ty, 0);
  for (let i = 0; i < 4; i++) {
    G.parts.push({ type: 'debris', x: tx * T + 8 + (i % 2) * 16, y: ty * T + 8 + Math.floor(i / 2) * 16, vx: (i % 2 ? 1 : -1) * (80 + Math.random() * 80), vy: -380 + Math.floor(i / 2) * 120, life: 1, max: 1, color: '#c8643c', size: 9, grav: 1500, rot: 0 });
  }
  Sound.sfx('brick'); G.shake = Math.max(G.shake, 3); G.score += 20;
}

// ===== 상호작용 =====
function interact(dt) {
  const p = G.p, L = G.L;
  const pl = p.x - p.w / 2, pr = p.x + p.w / 2, pt = p.y - p.h, pb = p.y;
  const cx = p.x, cy = p.y - p.h / 2;
  // 도토리
  const mag = p.magnet > 0, magR = 170;
  for (const a of G.acornsArr) {
    if (!a.alive) continue;
    const dx = a.x - cx;
    if (dx > 240 || dx < -240) continue;
    const dy = a.y - cy, d2 = dx * dx + dy * dy;
    if (mag && d2 < magR * magR) { const d = Math.sqrt(d2) || 1; a.x -= (dx / d) * 560 * dt; a.y -= (dy / d) * 560 * dt; }
    if (d2 < 22 * 22) { a.alive = false; gainAcorn(1, a.x, a.y); }
  }
  // 별 조각
  for (const s of G.starsObj) {
    if (!s.alive) continue;
    const dx = s.x - cx, dy = s.y - cy;
    if (dx * dx + dy * dy < 28 * 28) {
      s.alive = false; G.starGot[s.i] = true;
      Sound.sfx('star'); G.freeze = 0.06;
      puff(s.x, s.y, 24, '#fff27a', 240, 0.7, 4, 0);
      G.parts.push({ type: 'ring', x: s.x, y: s.y, vx: 0, vy: 0, life: 0.5, max: 0.5, color: '#fff27a', size: 40 });
      popText(s.x, s.y - 26, t('starGet'), '#fff27a', true);
      G.score += 500;
    }
  }
  // 가시
  if (p.inv <= 0 && p.chili <= 0) {
    const tx0 = Math.floor(pl / T), tx1 = Math.floor((pr - 0.01) / T), ty0 = Math.floor(pt / T), ty1 = Math.floor((pb - 0.01) / T);
    let hit = false;
    for (let tx = tx0; tx <= tx1 && !hit; tx++) for (let ty = ty0; ty <= ty1 && !hit; ty++) {
      if (L.get(tx, ty) === 8) {
        const sx = tx * T, sy = ty * T;
        if (pr > sx + 5 && pl < sx + T - 5 && pb > sy + 14) hit = true;
      }
    }
    if (hit) hurt();
  }
  // 적
  for (const e of G.enemies) {
    if (e.dead || !e.active) continue;
    const el = e.x - e.w / 2 + 2, er = e.x + e.w / 2 - 2, et = e.y - e.h + 2, eb = e.y;
    if (pr <= el || pl >= er || pb <= et || pt >= eb) continue;
    if (p.chili > 0 || p.ball) {
      killEnemy(e, sign(e.x - p.x) || p.dir, false);
      if (!p.ground) p.vy = Math.min(p.vy, -330);
    } else if (e.type !== 'spiky' && p.vy > 0 && p.prevY <= e.y - e.h + 12) {
      killEnemy(e, 0, true);
      p.vy = G.inp.j ? -700 : -440; p.jumping = !!G.inp.j; p.airDash = false;
      p.sqx = 1.3; p.sqy = 0.75;
    } else if (p.inv <= 0) {
      hurt();
    }
    if (G.state !== 'play') return;
  }
  // 흩어진 도토리 다시 줍기
  for (const a of G.loose) {
    if (a.t < 0.6 || a.dead) continue;
    const dx = a.x - cx, dy = a.y - cy;
    if (dx * dx + dy * dy < 24 * 24) { a.dead = true; gainAcorn(1, a.x, a.y); }
  }
  // 파워업
  for (const w of G.pows) {
    if (!w.alive || w.rise > 0) continue;
    const dx = w.x - cx, dy = w.y - cy;
    if (dx * dx + dy * dy < 26 * 26) {
      w.alive = false;
      if (w.type === 'shield') p.shield = true;
      else if (w.type === 'chili') p.chili = 8;
      else if (w.type === 'magnet') p.magnet = 12;
      Sound.sfx('power');
      popText(w.x, w.y - 24, t(w.type), '#9ff3ff', true);
      puff(w.x, w.y, 16, '#9ff3ff', 200, 0.5, 4, 0);
      G.score += 200;
    }
  }
  // 스프링·가속판·체크포인트·골
  for (const s of G.things) {
    if (Math.abs(s.x - p.x) > 80) { if (s.t > 0) s.t -= dt; continue; }
    switch (s.k) {
      case 'spring':
        if (s.t > 0) s.t -= dt;
        if (p.vy >= 0 && Math.abs(p.x - s.x) < 18 && p.y >= s.y - 20 && p.y <= s.y + 2) {
          p.y = s.y - 14; p.vy = -PH.SPRING; p.ground = false; p.slope = 0; p.jumping = false; p.airDash = false;
          s.t = 0.25; p.sqx = 0.7; p.sqy = 1.35;
          Sound.sfx('spring');
        }
        break;
      case 'pad':
        if (s.t > 0) s.t -= dt;
        if (p.ground && Math.abs(p.x - s.x) < 20 && Math.abs(p.y - s.y) < 10 && s.t <= 0) {
          p.vx = s.d * Math.max(sign(p.vx) === s.d ? Math.abs(p.vx) : 0, 740);
          p.ball = true; p.dir = s.d; s.t = 0.4;
          Sound.sfx('boost'); G.shake = Math.max(G.shake, 3);
        }
        break;
      case 'check':
        if (!s.on && p.x >= s.x - 8) {
          s.on = true; G.respawn = { x: s.x, y: s.y };
          Sound.sfx('check');
          popText(s.x, s.y - 74, t('check'), '#fff6a0', true);
          puff(s.x + 10, s.y - 56, 14, '#a6ff6b', 180, 0.5, 4, 0);
        }
        break;
      case 'goal':
        if (G.state === 'play' && p.x >= s.x - 4) clearStage();
        break;
    }
  }
}

function hurt() {
  const p = G.p;
  if (p.inv > 0 || p.chili > 0 || G.state !== 'play') return;
  if (p.shield) {
    p.shield = false; p.inv = 1.3;
    Sound.sfx('hurt'); G.shake = 5;
    puff(p.x, p.y - 14, 18, '#9ff3ff', 220, 0.5, 4, 0);
    p.vy = -300;
    return;
  }
  if (G.acorns > 0) {
    const n = Math.min(G.acorns, 14);
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (0.15 + 0.7 * (i / Math.max(1, n - 1))) + (Math.random() - 0.5) * 0.2;
      const s = 260 + Math.random() * 160;
      G.loose.push({ x: p.x, y: p.y - 16, vx: Math.cos(a) * s, vy: -Math.sin(a) * s - 120, t: 0, dead: false });
    }
    G.acorns = 0;
    p.inv = 2; p.vy = -380; p.vx = -p.dir * 220; p.ball = false; p.charging = false; p.ground = false;
    Sound.sfx('lose'); G.shake = 6; G.freeze = 0.05;
    return;
  }
  die('hit');
}
function die(reason) {
  if (G.state !== 'play') return;
  const p = G.p;
  G.state = 'dying'; G.stateT = 0; G.overReason = reason;
  p.dead = true; p.ball = false; p.charging = false; p.vx = 0;
  p.vy = reason === 'fall' ? 0 : -620;
  Sound.sfx('die'); G.shake = 7;
  G.deaths++;
}
function respawn() {
  const r = G.respawn;
  const keep = Math.floor(G.acorns / 2);
  G.p = newPlayer(r.x, r.y);
  G.p.inv = 1.5;
  G.p.shield = true;
  G.acorns = keep;
  G.state = 'play'; G.stateT = 0;
  G.cam.x = Math.max(0, r.x - VW * 0.35);
}
function killEnemy(e, dir, stomp) {
  if (e.dead) return;
  e.dead = true; G.kills++;
  if (stomp) { e.squish = 0.5; e.vx = 0; e.vy = 0; } else { e.vy = -420; e.vx = (dir || 1) * 190; e.squish = 0; }
  const p = G.p;
  p.combo++; p.comboT = 1.2;
  const n = Math.min(p.combo, 8);
  gainAcorn(n, null, null, true);
  G.score += 100 * p.combo;
  popText(e.x, e.y - 34, p.combo > 1 ? `${t('combo')} ${p.combo}! +${n}` : `+${n}`, p.combo > 1 ? '#ffd34d' : '#ffffff', p.combo > 2);
  puff(e.x, e.y - 10, 10, '#ffffff', 200, 0.35, 4, 0);
  G.parts.push({ type: 'ring', x: e.x, y: e.y - 10, vx: 0, vy: 0, life: 0.25, max: 0.25, color: '#ffffff', size: 22 });
  G.freeze = 0.035; G.shake = Math.max(G.shake, 4);
  Sound.sfx(stomp ? 'stomp' : 'kill');
  if (p.combo > 1) Sound.sfx('combo', p.combo);
}

function updateEnemies(dt) {
  const L = G.L, p = G.p, spd = G.mode === 'endless' ? 1 + Math.min(0.5, G.dist / 3000) : 1 + G.world * 0.08;
  for (const e of G.enemies) {
    if (e.gone) continue;
    if (e.dead) {
      if (e.squish > 0) { e.squish -= dt; if (e.squish <= 0) e.gone = true; continue; }
      e.vy += PH.G * dt; e.y += e.vy * dt; e.x += e.vx * dt; e.rot += dt * 10;
      if (e.y > ROWS * T + 80) e.gone = true;
      continue;
    }
    if (!e.active) { if (e.x - G.cam.x < VW + 120) e.active = true; else continue; }
    e.t += dt;
    if (e.type === 'bee') {
      const px = e.x;
      e.x = e.bx + Math.sin(e.t * 1.1) * 70;
      e.y = e.by + Math.sin(e.t * 3.2) * 22;
      e.face = e.x < px ? -1 : 1;
      continue;
    }
    if (e.type === 'frog') {
      if (e.ground) {
        e.vx = 0; e.timer -= dt;
        e.face = p.x < e.x ? -1 : 1;
        if (e.timer <= 0) { e.vy = -560 - Math.random() * 120; e.vx = e.face * 90 * spd; e.timer = 1.1 + Math.random() * 0.8; e.ground = false; }
      }
    } else {
      if (e.vx === 0) e.vx = -(e.type === 'spiky' ? 40 : 60) * spd;
      e.face = sign(e.vx);
    }
    e.vy = Math.min(e.vy + PH.G * dt, 900);
    if (moveX(L, e, e.vx * dt, 8)) e.vx = e.type === 'frog' ? 0 : -e.vx;
    const was = e.ground;
    if (e.vy < 0) { e.y += e.vy * dt; e.ground = false; }
    else {
      e.y += e.vy * dt;
      const g = probeGround(L, e, e.y - 12, e.y + (was ? 12 : 0), true);
      if (g) { e.y = g.y; e.vy = 0; e.ground = true; } else e.ground = false;
    }
    // 낭떠러지에서 돌아서기
    if (e.ground && e.type !== 'frog') {
      const ahead = { x: e.x + sign(e.vx) * (e.w / 2 + 3), w: 2 };
      if (!probeGround(L, ahead, e.y - 12, e.y + 20, true)) e.vx = -e.vx;
    }
    if (e.y > ROWS * T + 60) e.gone = true;
  }
}
function updateLoose(dt) {
  const L = G.L;
  for (const a of G.loose) {
    if (a.dead) continue;
    a.t += dt;
    a.vy = Math.min(a.vy + PH.G * 0.8 * dt, 800);
    a.x += a.vx * dt; a.y += a.vy * dt;
    if (a.vy > 0) {
      const g = probeGround(L, { x: a.x, w: 8 }, a.y + 8 - 12, a.y + 8, true);
      if (g) { a.y = g.y - 8; a.vy = -a.vy * 0.55; a.vx *= 0.8; }
    }
    if (a.t > 4.5 || a.y > ROWS * T + 40) a.dead = true;
  }
  if (G.loose.length > 40 || (G.loose.length && G.loose.every(a => a.dead))) G.loose = G.loose.filter(a => !a.dead);
}
function updatePows(dt) {
  for (const w of G.pows) {
    w.t += dt;
    if (w.rise > 0) { const d = Math.min(w.rise, 70 * dt); w.y -= d; w.rise -= d; }
  }
}
function updateParts(dt) {
  for (const q of G.parts) {
    q.life -= dt;
    q.vy += (q.grav || 0) * dt;
    q.x += q.vx * dt; q.y += q.vy * dt;
    if (q.rot != null) q.rot += dt * 12;
  }
  if (G.parts.length) G.parts = G.parts.filter(q => q.life > 0);
  if (G.parts.length > 500) G.parts.splice(0, G.parts.length - 500);
}
function updateCam(dt) {
  const p = G.p, c = G.cam, L = G.L;
  if (G.state !== 'dying') {
    const look = clamp(p.vx * 0.45, -150, 190);
    const tx = p.x - VW * 0.38 + look;
    c.x += (tx - c.x) * Math.min(1, dt * 4.5);
    const ty = clamp(p.y - VH * 0.62, 0, ROWS * T - VH);
    c.y += (ty - c.y) * Math.min(1, dt * 4);
  }
  const maxX = L.endless ? 1e9 : L.w * T - VW;
  c.x = clamp(c.x, 0, Math.max(0, maxX));
}

// ===== 무한 질주 =====
function endlessStep(dt) {
  streamEndless();
  const p = G.p;
  G.dist = Math.max(G.dist, Math.floor((p.x - G.startX) / T));
  if (G.state === 'play') {
    const sp = Math.min(290, 150 + G.dist * 0.11);
    G.storm += sp * dt;
    if (G.storm < p.x - VW * 0.78) G.storm = p.x - VW * 0.78;
    if (p.x - p.w / 2 < G.storm + 6) die('storm');
  }
  const w = Math.floor(G.dist / 500) % WORLDS.length;
  if (w !== G.world) {
    G.world = w; G.flash = 0.5;
    G.banner = { text: t('w' + w), t: 2 };
    Sound.sfx('world'); Sound.playMusic(w);
  }
}
function finishEndless() {
  const d = Save.data;
  G.result = { dist: G.dist, score: G.score + G.dist * 10, acorns: G.acorns, newBest: G.dist > d.bestRun };
  if (G.dist > d.bestRun) d.bestRun = G.dist;
  if (G.result.score > d.bestScore) d.bestScore = G.result.score;
  d.bank += G.acorns;
  Save.save();
  Sound.stopMusic();
}
function clearStage() {
  const p = G.p, d = Save.data;
  G.state = 'clear'; G.stateT = 0;
  p.ball = false; p.charging = false;
  Sound.stopMusic(); Sound.sfx('clear');
  const id = G.world + '-' + G.stage;
  const rec = d.stages[id] || {};
  const time = G.time, par = G.L.par;
  const rank = time <= par ? 'S' : time <= par * 1.4 ? 'A' : 'B';
  const mask = (G.starGot[0] ? 1 : 0) | (G.starGot[1] ? 2 : 0) | (G.starGot[2] ? 4 : 0);
  const newBest = !rec.time || time < rec.time;
  const order = { S: 3, A: 2, B: 1 };
  rec.clear = true;
  if (newBest) rec.time = time;
  if (!rec.rank || order[rank] > order[rec.rank]) rec.rank = rank;
  rec.stars = (rec.stars || 0) | mask;
  d.stages[id] = rec;
  const idx = G.world * STAGES_PER_WORLD + G.stage;
  const unlockedBefore = d.unlocked;
  d.unlocked = Math.max(d.unlocked, Math.min(STAGE_COUNT, idx + 2));
  const newWorld = d.unlocked > unlockedBefore && (d.unlocked - 1) % STAGES_PER_WORLD === 0 && idx + 1 < STAGE_COUNT;
  d.bank += G.acorns;
  Save.save();
  G.result = { time, rank, par, acorns: G.acorns, mask, newBest, newWorld, deaths: G.deaths };
  puff(p.x, p.y - 30, 30, '#ffd34d', 300, 0.8, 4, 300);
}
