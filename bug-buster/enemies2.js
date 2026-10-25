// 은하 방역대 - 추가 해충 23종 행동 + 편대
const TAU = Math.PI * 2;
function ringShot(x, y, n, spd, o, off = 0) { for (let i = 0; i < n; i++) eShoot(x, y, off + i * TAU / n, spd, o); }
function fanShot(x, y, a, n, step, spd, o) { for (let i = 0; i < n; i++) eShoot(x, y, a + (i - (n - 1) / 2) * step, spd, o); }
function pathAt(path, d) {
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], len = Math.hypot(b.x - a.x, b.y - a.y);
    if (d <= len || i === path.length - 1) { const k = d / len; return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; }
    d -= len;
  }
}
const toward = (e, tx, ty, k) => { e.x += (tx - e.x) * k; e.y += (ty - e.y) * k; };
const flip = (e, m) => { if ((e.x < m && e.vx < 0) || (e.x > G.W - m && e.vx > 0)) e.vx *= -1; };
const descend = (e, dt, spd) => { if (e.stay === 0 && e.y < e.ty) { e.y += spd * dt; return true; } e.stay += dt; return false; };
const GAS = { c: 'rgba(182,255,106,0.45)', r: 9, hr: 6, shape: 'gas' };

Object.assign(ENEMIES, {
  aphid: { hp: 6, r: 11, score: 150, xp: 1, draw: Art.aphid,
    init(e) { e.vy = e.vy || rand(55, 75); e.vx = e.vx || 0; e.ph = rand(0, 6); },
    update(e, dt) {
      e.y += e.vy * dt; e.x += e.vx * dt + Math.sin(e.t * 2 + e.ph) * 30 * dt; e.vx *= 0.97;
      if (e.t > 0.8 && Math.random() < dt * 0.22 * G.fire) eShoot(e.x, e.y + 8, aim(e), 140, { c: '#c6ff4d' });
    },
    onDeath(e) {
      if (e.small) return;
      for (let i = 0; i < 3; i++) { const k = spawnEnemy('aphid', e.x, e.y, { small: true, vx: (i - 1) * 110, vy: 120 }); k.r = 7; k.hp = k.maxHp = e.maxHp * 0.25; }
    },
    waves: [() => { for (let i = 0; i < 4; i++) spawnEnemy('aphid', (i + 0.5) * G.W / 4, -20 - i * 30, {}); },
      () => { const x = rand(60, G.W - 60); for (let i = 0; i < 3; i++) spawnEnemy('aphid', x + (i - 1) * 30, -20 - i * 20, {}); }] },

  grasshopper: { hp: 8, r: 12, score: 250, xp: 2, draw: Art.grasshopper,
    init(e) { e.from = { x: e.x, y: e.y }; e.to = { x: rand(40, G.W - 40), y: rand(80, 200) }; e.jp = 0; e.air = true; e.jumps = 0; },
    update(e, dt) {
      if (e.air) {
        e.jp = Math.min(1, e.jp + dt / 0.7); const k = e.jp;
        e.x = e.from.x + (e.to.x - e.from.x) * k; e.y = e.from.y + (e.to.y - e.from.y) * k - Math.sin(k * Math.PI) * 45;
        if (k >= 1) { e.air = false; e.wait = 0.8; if (e.jumps > 0) { ringShot(e.x, e.y, 8 + G.loop * 4, 110, { c: '#8fe05a' }, rand(0, 1)); G.shake = Math.max(G.shake, 2); } }
        return;
      }
      if ((e.wait -= dt) <= 0) {
        e.jumps++; e.from = { x: e.x, y: e.y };
        if (e.jumps > 4) e.to = { x: e.x + rand(-60, 60), y: G.H + 80 };
        else e.to = { x: Math.max(30, Math.min(G.W - 30, G.p.x + rand(-70, 70))), y: Math.max(60, Math.min(G.p.y - 150, e.y + rand(20, 110))) };
        e.jp = 0; e.air = true;
      }
    },
    waves: [() => { spawnEnemy('grasshopper', rand(40, G.W / 2), -20, {}); spawnEnemy('grasshopper', rand(G.W / 2, G.W - 40), -40, {}); },
      () => { for (let i = 0; i < 3; i++) spawnEnemy('grasshopper', (i + 0.5) * G.W / 3, -20 - i * 20, {}); }] },

  dragonfly: { hp: 5, r: 11, score: 220, xp: 1, draw: Art.dragonfly, rotate: true,
    init(e) { e.mode = 'pause'; e.mt = e.mt0 || 0.2; e.n = 0; e.vx = 0; e.vy = 1; e.fired = true; },
    update(e, dt) {
      e.mt -= dt;
      if (e.mode === 'dash') { e.x += e.vx * dt; e.y += e.vy * dt; if (e.mt <= 0) { e.mode = 'pause'; e.mt = 0.55; e.fired = false; } return; }
      if (!e.fired && e.mt < 0.3) { e.fired = true; fanShot(e.x, e.y, aim(e), 2, 0.16, 200, { c: '#47e0ff' }); }
      if (e.mt <= 0) {
        e.n++;
        const tx = e.n > 5 ? e.x + rand(-50, 50) : rand(30, G.W - 30), ty = e.n > 5 ? G.H + 100 : rand(60, G.H * 0.5);
        const d = Math.hypot(tx - e.x, ty - e.y) || 1;
        e.vx = (tx - e.x) / d * 380; e.vy = (ty - e.y) / d * 380; e.mt = d / 380; e.mode = 'dash';
      }
    },
    waves: [() => { for (let i = 0; i < 3; i++) spawnEnemy('dragonfly', rand(30, G.W - 30), -20, { mt0: 0.2 + i * 0.45 }); }] },

  gnat: { hp: 1, r: 6, score: 40, xp: 0, draw: Art.gnat,
    init(e) { e.rr = rand(8, 34); e.ph = rand(0, TAU); },
    update(e, dt) {
      e.x = e.x0 + Math.sin(e.t * 0.9 + e.g) * 100 + Math.cos(e.t * 5 + e.ph) * e.rr;
      e.y = -30 + e.t * 65 + Math.sin(e.t * 5 + e.ph) * e.rr * 0.6;
      if (Math.random() < dt * 0.06 * G.fire) eShoot(e.x, e.y, aim(e), 130, { c: '#ff8a8a', r: 3 });
    },
    onDeath(e) { if (Math.random() < 0.35) dropItem(e.x, e.y, 'xp'); },
    waves: [() => { const n = 12 + Math.min(10, G.stage >> 1), x0 = rand(110, G.W - 110), g = rand(0, 6); for (let i = 0; i < n; i++) spawnEnemy('gnat', x0, -30, { x0, g }); }] },

  strider: { hp: 10, r: 12, score: 300, xp: 2, draw: Art.strider,
    init(e) { e.cd = 1.0; e.tele = 0; },
    update(e, dt) {
      e.x += e.vx * dt;
      if (e.tele > 0) {
        if ((e.tele -= dt) <= 0) { for (let i = 0; i < 4; i++) eShoot(e.x, e.y, e.aimA, 300 + i * 40, { c: '#ffd23f', r: 3.5 }); e.aimLine = null; Sound.play('hit'); }
        return;
      }
      if ((e.cd -= dt) <= 0) { e.cd = 2.0 / G.fire; e.tele = 0.7; e.aimA = e.aimLine = aim(e); }
    },
    waves: [() => { const y = rand(70, 200); spawnEnemy('strider', -20, y, { vx: 70 }); spawnEnemy('strider', G.W + 20, y + 50, { vx: -70 }); },
      () => { const s = Math.random() < 0.5 ? 1 : -1; for (let i = 0; i < 2; i++) spawnEnemy('strider', s > 0 ? -20 - i * 50 : G.W + 20 + i * 50, rand(70, 220), { vx: s * 75 }); }] },

  pillbug: { hp: 18, r: 13, score: 400, xp: 3, elite: true, draw: Art.pillbug,
    init(e) { e.rolled = e.invul = true; e.vx = e.vx || (Math.random() < 0.5 ? 120 : -120); e.vy = 140; e.st = 3.2; e.cycles = 0; },
    update(e, dt) {
      e.st -= dt;
      if (e.rolled) {
        e.x += e.vx * dt; e.y += e.vy * dt; flip(e, 14);
        if (e.cycles < 2 && ((e.y < 40 && e.vy < 0) || (e.y > G.H * 0.55 && e.vy > 0))) e.vy *= -1;
        if (e.st <= 0 && e.cycles < 2) { e.rolled = e.invul = false; e.st = 2.6; e.cd = 0.5; }
        return;
      }
      if ((e.cd -= dt) <= 0) { e.cd = 1.0 / G.fire; fanShot(e.x, e.y + 10, aim(e), 5, 0.2, 150, { c: '#c0cad8' }); }
      if (e.st <= 0) { e.rolled = e.invul = true; e.cycles++; e.st = 3; e.vy = e.cycles >= 2 ? 200 : -140; }
    },
    waves: [() => spawnEnemy('pillbug', rand(40, G.W - 40), -20, {}),
      () => { spawnEnemy('pillbug', 60, -20, { vx: 120 }); spawnEnemy('pillbug', G.W - 60, -40, { vx: -120 }); }] },

  moth: { hp: 14, r: 16, score: 350, xp: 3, draw: Art.moth,
    init(e) { e.cd = 0.5; e.x0 = e.x; },
    update(e, dt) {
      e.y += 32 * dt; e.x = e.x0 + Math.sin(e.t * 0.8) * 40;
      if ((e.cd -= dt) <= 0) { e.cd = 0.13 / G.fire; eShoot(e.x + rand(-14, 14), e.y, Math.PI / 2 + rand(-1.3, 1.3), rand(40, 70), { c: '#e0c8f0', r: 3, shape: 'dust', ay: 18, life: 6 }); }
    },
    waves: [() => spawnEnemy('moth', rand(60, G.W - 60), -20, {}),
      () => { spawnEnemy('moth', G.W * 0.25, -20, {}); spawnEnemy('moth', G.W * 0.75, -50, {}); }] },

  wasp: { hp: 6, r: 11, score: 260, xp: 1, draw: Art.wasp, rotate: true,
    init(e) { e.delay = e.delay || 0; e.u = 0; e.vy = 1; },
    update(e, dt) {
      if (e.delay > 0) { e.delay -= dt; return; }
      if (!e.p0) {
        const P = G.p; e.p0 = { x: e.x, y: e.y }; e.p2 = { x: G.W - e.x, y: -50 };
        e.p1 = { x: 2 * P.x - 0.5 * (e.p0.x + e.p2.x), y: 2 * P.y - 0.5 * (e.p0.y + e.p2.y) };
      }
      e.u += dt / 1.6; const u = Math.min(1, e.u), a = (1 - u) ** 2, b = 2 * (1 - u) * u, c2 = u * u;
      const nx = a * e.p0.x + b * e.p1.x + c2 * e.p2.x, ny = a * e.p0.y + b * e.p1.y + c2 * e.p2.y;
      if (dt > 0) { e.vx = (nx - e.x) / dt; e.vy = (ny - e.y) / dt; }
      e.x = nx; e.y = ny;
      if (!e.shot && u > 0.22) { e.shot = true; eShoot(e.x, e.y, aim(e), 220, { c: '#ffb000', shape: 'sting' }); }
      if (u >= 1) e.dead = true;
    },
    waves: [() => { const s = Math.random() < 0.5; for (let i = 0; i < 3; i++) spawnEnemy('wasp', s ? 30 : G.W - 30, -20, { delay: i * 0.35 }); }] },

  stinkbug: { hp: 12, r: 13, score: 300, xp: 2, draw: Art.stinkbug,
    init(e) { e.cd = 0.6; e.vx = e.vx || (Math.random() < 0.5 ? 50 : -50); },
    update(e, dt) {
      e.y += 45 * dt; e.x += e.vx * dt; flip(e, 20);
      if ((e.cd -= dt) <= 0) { e.cd = 0.55 / G.fire; eShoot(e.x, e.y - 8, rand(0, TAU), rand(15, 35), { ...GAS, life: 3.2 }); }
    },
    onDeath(e) { ringShot(e.x, e.y, 8, 55, { ...GAS, life: 2.2 }); },
    waves: [() => spawnEnemy('stinkbug', rand(40, G.W - 40), -20, {}),
      () => { spawnEnemy('stinkbug', G.W * 0.3, -20, { vx: 50 }); spawnEnemy('stinkbug', G.W * 0.7, -40, { vx: -50 }); }] },

  cicada: { hp: 16, r: 14, score: 380, xp: 3, elite: true, draw: Art.cicada,
    init(e) { e.ty = rand(80, 190); e.stay = 0; e.cd = 0.8; },
    update(e, dt) {
      if (descend(e, dt, 90)) return;
      if (e.stay > 7.5) { e.y -= 100 * dt; if (e.y < -40) e.dead = true; return; }
      e.x += Math.sin(e.stay) * 20 * dt;
      if ((e.cd -= dt) <= 0) {
        e.cd = 1.8 / G.fire;
        const n = 30, base = aim(e) + rand(-0.7, 0.7), k0 = Math.round((((base % TAU) + TAU) % TAU) / (TAU / n));
        for (let i = 0; i < n; i++) { const d = Math.min(Math.abs(i - k0), n - Math.abs(i - k0)); if (d > 2) eShoot(e.x, e.y, i * TAU / n, 100, { c: '#ffe9a8', r: 3.5 }); }
        Sound.play('hit');
      }
    },
    waves: [() => spawnEnemy('cicada', rand(60, G.W - 60), -20, {})] },

  centipede: { hp: 10, r: 10, score: 300, xp: 2, draw: Art.centipede, rotate: true,
    init(e) { e.trail = []; e.x0 = e.x; e.cd = 1.2; e.vy = 1; },
    update(e, dt) {
      const ox = e.x, oy = e.y;
      e.y += 70 * dt; e.x = e.x0 + Math.sin(e.t * 1.6) * 110;
      if (dt > 0) { e.vx = (e.x - ox) / dt; e.vy = (e.y - oy) / dt; }
      const last = e.trail[0];
      if (!last || Math.hypot(last.x - e.x, last.y - e.y) >= 2) { e.trail.unshift({ x: e.x, y: e.y }); if (e.trail.length > 100) e.trail.pop(); }
      if ((e.cd -= dt) <= 0) { e.cd = 1.3 / G.fire; fanShot(e.x, e.y + 8, aim(e), 3, 0.18, 170, { c: '#ffd23f' }); }
    },
    waves: [() => {
      const h = spawnEnemy('centipede', rand(130, G.W - 130), -20, {}), n = 7 + Math.min(6, (G.stage / 5) | 0);
      for (let i = 0; i < n; i++) spawnEnemy('centseg', h.x, -20, { seg: true, head: h, idx: i + 1 });
    }] },
  centseg: { hidden: true, hp: 6, r: 9, score: 80, xp: 1, draw: Art.centipede, rotate: true,
    update(e, dt) {
      const h = e.head;
      if (h && !h.dead) {
        const p = h.trail[Math.min(h.trail.length - 1, e.idx * 6)];
        if (p) { e.vx = p.x - e.x || e.vx; e.vy = p.y - e.y || e.vy || 1; e.x = p.x; e.y = p.y; }
      } else { e.y += 70 * dt; e.x += Math.sin(e.t * 2 + e.idx) * 40 * dt; e.vx = 0; e.vy = 1; }
      if (Math.random() < dt * 0.06 * G.fire) eShoot(e.x, e.y, aim(e), 130, { c: '#ffb347', r: 3.5 });
    } },

  dungbeetle: { hp: 14, r: 12, score: 330, xp: 2, draw: Art.dungbeetle,
    init(e) { e.ty = rand(110, 230); e.hasBall = true; e.balls = 0; e.wait = 0; },
    update(e, dt) {
      if (e.hasBall) {
        if (e.y < e.ty) { e.y += 70 * dt; return; }
        eShoot(e.x, e.y + 20, aim(e), 110, { c: '#7a5a3a', r: 11, shape: 'dung', fuse: rand(1.4, 1.9), burst: 10 + G.loop * 4, bspd: 110, bc: '#c8a070' });
        e.hasBall = false; e.balls++; e.wait = 2.2; Sound.play('hit'); return;
      }
      e.wait -= dt;
      if (e.balls >= 2) { e.y -= 60 * dt; if (e.y < -40) e.dead = true; return; }
      if (e.wait <= 0) { e.hasBall = true; e.ty = e.y + rand(20, 60); }
    },
    waves: [() => spawnEnemy('dungbeetle', rand(40, G.W - 40), -20, {}),
      () => { spawnEnemy('dungbeetle', G.W * 0.3, -20, {}); spawnEnemy('dungbeetle', G.W * 0.7, -50, {}); }] },

  mantis: { hp: 30, r: 14, score: 700, xp: 5, elite: true, draw: Art.mantis,
    init(e) { e.ty = rand(90, 180); e.st = 'in'; e.n = 0; e.dir = 1; },
    update(e, dt) {
      if (e.st === 'in') { e.y += 90 * dt; if (e.y >= e.ty) { e.st = 'idle'; e.k = 1.2; } return; }
      if (e.st === 'leave') { e.y += 110 * dt; return; }
      e.k -= dt;
      if (e.st === 'idle') { e.x += Math.sin(e.t * 1.5) * 30 * dt; if (e.k <= 0) { e.st = 'tele'; e.k = 0.45; e.slash = true; } }
      else if (e.st === 'tele') { if (e.k <= 0) { e.st = 'slash'; e.k = 0.35; e.a0 = aim(e) - 0.95 * e.dir; e.ec = 0; } }
      else {
        if ((e.ec -= dt) <= 0) { e.ec = 0.018; eShoot(e.x, e.y + 10, e.a0 + 1.9 * e.dir * (1 - Math.max(0, e.k) / 0.35), 210, { c: '#b6ff6a', shape: 'blade' }); }
        if (e.k <= 0) { e.slash = false; e.dir *= -1; e.n++; e.st = e.n >= 3 ? 'leave' : 'idle'; e.k = 1.0 / G.fire; Sound.play('missile'); }
      }
    },
    waves: [() => spawnEnemy('mantis', rand(60, G.W - 60), -20, {})] },

  bombardier: { hp: 9, r: 11, score: 280, xp: 2, draw: Art.bombardier,
    init(e) { e.cd = 1.0; e.spray = 0; },
    update(e, dt) {
      e.y += 75 * dt; e.x += Math.sin(e.t * 1.2) * 30 * dt;
      if (e.spray > 0) { e.spray -= dt; if ((e.ec -= dt) <= 0) { e.ec = 0.03; eShoot(e.x, e.y + 14, e.sa + rand(-0.35, 0.35), rand(170, 250), { c: '#fff3b0', r: 3 }); } return; }
      if ((e.cd -= dt) <= 0) { e.cd = 1.7 / G.fire; e.spray = 0.35; e.ec = 0; e.sa = aim(e); Sound.play('missile'); }
    },
    waves: [() => { for (let i = 0; i < 2; i++) spawnEnemy('bombardier', rand(30, G.W - 30), -20 - i * 40, {}); },
      () => { for (let i = 0; i < 3; i++) spawnEnemy('bombardier', (i + 0.5) * G.W / 3, -20, {}); }] },

  nest: { hp: 40, r: 18, score: 900, xp: 6, elite: true, draw: Art.nest,
    init(e) { e.ty = rand(80, 150); e.cd = 1; e.stay = 0; },
    update(e, dt) {
      if (descend(e, dt, 50)) return;
      if (e.stay > 9) { e.y += 60 * dt; return; }
      if ((e.cd -= dt) <= 0) { e.cd = 0.65 / G.fire; spawnEnemy('termite', e.x + rand(-10, 10), e.y + 8, {}); }
    },
    waves: [() => spawnEnemy('nest', rand(60, G.W - 60), -30, {})] },
  termite: { hidden: true, hp: 1.5, r: 6, score: 30, xp: 0, draw: Art.termite, rotate: true,
    init(e) { const a = aim(e) + rand(-0.4, 0.4); e.vx = Math.cos(a) * 200; e.vy = Math.max(60, Math.sin(a) * 200); },
    update(e, dt) {
      if (e.t < 0.5) { const a = aim(e), s = Math.hypot(e.vx, e.vy); e.vx += (Math.cos(a) * s - e.vx) * dt * 3; e.vy += (Math.sin(a) * s - e.vy) * dt * 3; }
      e.x += e.vx * dt; e.y += e.vy * dt;
    },
    onDeath(e) { if (Math.random() < 0.25) dropItem(e.x, e.y, 'xp'); } },

  flea: { hp: 7, r: 10, score: 280, xp: 2, draw: Art.flea,
    init(e) { e.st = 'fall'; e.ty = rand(70, 220); e.n = 0; },
    update(e, dt) {
      if (e.st === 'fall') { e.y += 200 * dt; if (e.y >= e.ty) { e.st = 'show'; e.k = 1.2; e.shot = false; } return; }
      e.k -= dt;
      if (e.st === 'show') {
        if (!e.shot && e.k < 0.8) { e.shot = true; fanShot(e.x, e.y, aim(e), 3, 0.2, 190, { c: '#ff8c42' }); }
        if (e.k <= 0) {
          part(e.x, e.y, '#c0583a', 8, 100, 2);
          if (++e.n >= 4) { e.dead = true; return; }
          e.st = 'hide'; e.ghost = true; e.k = 0.55; e.warnAt = { x: rand(30, G.W - 30), y: rand(60, G.H * 0.5) };
        }
      } else if (e.k <= 0) { e.x = e.warnAt.x; e.y = e.warnAt.y; e.warnAt = null; e.ghost = false; e.st = 'show'; e.k = 1.1; e.shot = false; }
    },
    waves: [() => { for (let i = 0; i < 2; i++) spawnEnemy('flea', rand(30, G.W - 30), -20 - i * 30, {}); },
      () => { for (let i = 0; i < 3; i++) spawnEnemy('flea', rand(30, G.W - 30), -20 - i * 30, {}); }] },

  butterfly: { hp: 8, r: 14, score: 300, xp: 2, draw: Art.butterfly,
    init(e) { e.hue = e.hue ?? rand(0, 360); e.x0 = e.x; e.cd = 1; e.rot = 0; },
    update(e, dt) {
      e.y += 50 * dt; e.x = e.x0 + Math.sin(e.t * 1.2) * 90;
      if ((e.cd -= dt) <= 0) { e.cd = 1.5 / G.fire; e.rot += 0.35; for (let i = 0; i < 10; i++) eShoot(e.x, e.y, e.rot + i * TAU / 10, i % 2 ? 120 : 85, { c: `hsl(${e.hue},90%,70%)` }); }
    },
    waves: [() => spawnEnemy('butterfly', rand(100, G.W - 100), -20, {}),
      () => { const h = rand(0, 360); spawnEnemy('butterfly', 110, -20, { hue: h }); spawnEnemy('butterfly', G.W - 110, -60, { hue: h + 60 }); }] },

  scorpion: { hp: 34, r: 15, score: 750, xp: 5, elite: true, draw: Art.scorpion,
    init(e) { e.ty = rand(90, 170); e.cd = 1.2; e.pc = 0.6; e.vx = 60; e.stay = 0; },
    update(e, dt) {
      if (descend(e, dt, 80)) return;
      if (e.stay > 9) { e.y += 90 * dt; return; }
      e.x += e.vx * dt; flip(e, 30);
      if ((e.cd -= dt) <= 0) {
        e.cd = 2.0 / G.fire; const f = 0.9, d = Math.hypot(G.p.x - e.x, G.p.y - e.y);
        eShoot(e.x, e.y - 20, aim(e), Math.min(300, d / f), { c: '#ffb347', r: 6, shape: 'egg', fuse: f / G.bspd, burst: 8 + G.loop * 4, bspd: 115, bc: '#ff8c42' });
      }
      if ((e.pc -= dt) <= 0) { e.pc = 1.1 / G.fire; fanShot(e.x, e.y + 20, aim(e), 2, 0.3, 170, { c: '#d4a03a' }); }
    },
    waves: [() => spawnEnemy('scorpion', rand(60, G.W - 60), -20, {})] },

  stag: { hp: 36, r: 15, score: 800, xp: 5, elite: true, draw: Art.stag,
    init(e) { e.st = 'in'; e.ty = rand(80, 150); },
    update(e, dt) {
      if (e.st === 'in') { e.y += 90 * dt; if (e.y >= e.ty) { e.st = 'align'; e.k = 1.0; } return; }
      if (e.st === 'align') {
        e.k -= dt; const dx = G.p.x - e.x; e.x += Math.sign(dx) * Math.min(Math.abs(dx), 170 * dt);
        if (e.k <= 0) { e.st = 'tele'; e.k = 0.6; e.aimLine = Math.PI / 2; }
        return;
      }
      if (e.st === 'tele') {
        e.k -= dt; e.x += Math.sin(e.t * 60) * 0.6;
        if (e.k <= 0) { e.st = 'charge'; e.charging = true; e.aimLine = null; ringShot(e.x, e.y, 10, 120, { c: '#ff8c42' }); Sound.play('missile'); }
        return;
      }
      e.y += 540 * dt;
    },
    waves: [() => spawnEnemy('stag', rand(60, G.W - 60), -20, {}),
      () => { spawnEnemy('stag', 80, -20, {}); spawnEnemy('stag', G.W - 80, -60, {}); }] },

  hornet: { hp: 50, r: 17, score: 1000, xp: 7, elite: true, draw: Art.hornet,
    init(e) { e.ty = rand(90, 150); e.vx = 140; e.cyc = 0; e.stay = 0; e.ec = 0; },
    update(e, dt) {
      if (descend(e, dt, 100)) return;
      if (e.stay > 10) { e.y -= 120 * dt; if (e.y < -40) e.dead = true; return; }
      e.x += e.vx * dt; flip(e, 30); e.cyc += dt;
      if (e.cyc % 2.2 < 1.2 && (e.ec -= dt) <= 0) { e.ec = 0.09 / G.fire; eShoot(e.x, e.y + 18, aim(e), 230, { c: '#ffa000', shape: 'sting' }); }
    },
    waves: [() => { spawnEnemy('hornet', G.W / 2, -20, {}); for (let i = 0; i < 2; i++) spawnEnemy('wasp', i ? 30 : G.W - 30, -20, { delay: 0.8 + i * 0.5 }); }] },

  ant: { hp: 5, r: 9, score: 120, xp: 1, draw: Art.ant, rotate: true,
    init(e) { e.delay = e.delay || 0; e.d = 0; e.vy = 1; },
    update(e, dt) {
      if (e.delay > 0) { e.delay -= dt; return; }
      e.d += 110 * dt; const p = pathAt(e.path, e.d);
      e.vx = p.x - e.x || e.vx; e.vy = p.y - e.y || e.vy; e.x = p.x; e.y = p.y;
      if (e.d > 40 && Math.random() < dt * 0.2 * G.fire) eShoot(e.x, e.y, aim(e), 140, { c: '#ffcc66', r: 3.5 });
    },
    waves: [() => {
      const s = Math.random() < 0.5, x0 = s ? 50 : G.W - 50, x1 = s ? G.W - 50 : 50, y1 = rand(90, 160), y2 = y1 + rand(110, 170);
      const path = [{ x: x0, y: -20 }, { x: x0, y: y1 }, { x: x1, y: y1 }, { x: x1, y: y2 }, { x: x0, y: y2 }, { x: x0, y: G.H + 80 }];
      for (let i = 0; i < 8; i++) spawnEnemy('ant', x0, -20, { path, delay: i * 0.22 });
    }] },

  diver: { hp: 16, r: 12, score: 400, xp: 3, draw: Art.diver,
    init(e) { e.ty = rand(90, 220); e.st = 'in'; e.n = 0; },
    update(e, dt) {
      if (e.st === 'in') { e.y += 100 * dt; if (e.y >= e.ty) { e.st = 'up'; e.k = 2; e.s1 = e.s2 = false; } return; }
      if (e.st === 'gone') { e.y += 80 * dt; return; }
      e.k -= dt;
      if (e.st === 'up') {
        if (!e.s1 && e.k < 1.5) { e.s1 = true; ringShot(e.x, e.y, 12 + G.loop * 4, 105, { c: '#7fe0ff' }, rand(0, 1)); }
        if (!e.s2 && e.k < 0.5) { e.s2 = true; fanShot(e.x, e.y, aim(e), 3, 0.15, 190, { c: '#ffd23f' }); }
        if (e.k <= 0) { e.ghost = true; e.k = 1.5; e.tx = rand(30, G.W - 30); e.ty2 = rand(80, G.H * 0.5); e.st = ++e.n >= 3 ? 'gone' : 'down'; }
      } else if (e.st === 'down') {
        toward(e, e.tx, e.ty2, Math.min(1, dt * 1.5));
        if (e.k <= 0) { e.ghost = false; e.st = 'up'; e.k = 2; e.s1 = e.s2 = false; }
      }
    },
    waves: [() => spawnEnemy('diver', rand(40, G.W - 40), -20, {}),
      () => { spawnEnemy('diver', G.W * 0.3, -20, {}); spawnEnemy('diver', G.W * 0.7, -40, {}); }] },

  jewel: { hp: 45, r: 15, score: 1100, xp: 7, elite: true, draw: Art.jewel,
    init(e) { e.ty = rand(90, 160); e.stay = 0; e.cd = 1; e.sp = 0; e.rcd = 0; },
    update(e, dt) {
      e.rcd -= dt;
      if (descend(e, dt, 80)) return;
      if (e.stay > 9) { e.y += 90 * dt; return; }
      e.x += Math.sin(e.stay * 0.9) * 40 * dt;
      if ((e.cd -= dt) <= 0) { e.cd = 1.5 / G.fire; const a = aim(e); for (let i = 0; i < 7; i++) eShoot(e.x, e.y + 12, a + (i - 3) * 0.16, 160, { c: `hsl(${i * 50},95%,65%)` }); }
      if ((e.sp -= dt) <= 0) { e.sp = 0.12 / G.fire; eShoot(e.x, e.y, e.stay * 2.2, 95, { c: `hsl(${(e.stay * 120) % 360 | 0},95%,70%)`, r: 3 }); }
    },
    onHit(e) { if (e.rcd <= 0 && Math.random() < 0.2) { e.rcd = 0.2; eShoot(e.x, e.y + 10, aim(e), 240, { c: '#ffffff', r: 3.5 }); } },
    waves: [() => spawnEnemy('jewel', rand(60, G.W - 60), -20, {})] },
});
