'use strict';
// 길 생성과 물리. 화면 높이는 논리 좌표 360 고정, 가로는 화면 비율에 따라 바뀜.

const H = 360, TOP = 62, BOT = 298, PR = 13, GRAV = 2700, PXM = 40;
const JAR = 30;                 // 배달 한 번에 필요한 꿈 조각
const LOOP_M = 600;             // 저녁→아침 한 바퀴 거리(m)
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rnd = (a, b) => a + Math.random() * (b - a);

const Game = {
  reset() {
    this.x = 0; this.y = BOT - PR; this.vy = 0; this.g = 1;
    this.ground = true; this.coyote = 0; this.buf = 0;
    this.dist = 0; this.frags = 0; this.deliv = 0; this.jar = 0; this.flips = 0;
    this.shield = false; this.inv = 0;
    this.cells = []; this.blobs = []; this.gems = []; this.parts = []; this.pops = [];
    this.genX = -400; this.lastSide = 'f';
    this.dead = false; this.deadT = 0; this.time = 0;
    this.spin = 0; this.face = 0; this.squash = 0; this.combo = 0; this.comboT = 0; this.trailT = 0;
    this.phaseIdx = 0; this.loop = 1; this.banner = null;
    this.speed = this.speedAt(0);
    while (this.genX < 700) this.pushCell('s', 's', 300, true);
    this.fill();
  },

  speedAt(m) { return Math.min(700, 290 + m * 0.085); },
  flipTime() { return Math.sqrt(2 * (BOT - TOP - 2 * PR) / GRAV); },
  get score() { return Math.floor(this.dist) + this.frags * 5 + this.deliv * 50; },

  // ---------- 길 생성 ----------
  // 길은 칸(cell)의 연속. 칸마다 바닥(f)과 천장(c)이 's' 단단함, 'g' 구멍, 'k' 가시 중 하나.
  // 모든 칸에 안전한 쪽이 적어도 하나 있고, 안전한 쪽이 한쪽뿐인 칸은 뒤집기 2번 거리보다 길게 만들어
  // 어떤 배치든 반드시 지나갈 수 있다.
  pushCell(f, c, L, plain) {
    const cell = { x0: this.genX, x1: this.genX + Math.round(L), f, c, plain: !!plain };
    this.cells.push(cell);
    this.genX = cell.x1;
    return cell;
  },
  safe(cell) { return { f: cell.f === 's', c: cell.c === 's' }; },
  fill() {
    while (this.genX < this.x + 1700) this.genNext();
    const cut = this.x - 500;
    while (this.cells.length && this.cells[0].x1 < cut) this.cells.shift();
    this.gems = this.gems.filter(g => g.x > cut && !g.gone);
    this.blobs = this.blobs.filter(b => b.x > cut);
  },
  genNext() {
    const m = Math.max(0, this.genX / PXM), d = Math.min(1, m / 2500);
    const prev = this.cells[this.cells.length - 1];
    const v = this.speedAt(m), base = v * this.flipTime();
    let f = 's', c = 's';
    if (Math.random() > 0.62 - 0.36 * d) {
      const ps = this.safe(prev);
      const prevSide = ps.f && !ps.c ? 'f' : ps.c && !ps.f ? 'c' : this.lastSide;
      const side = Math.random() < 0.62 ? (prevSide === 'f' ? 'c' : 'f') : prevSide;
      const bad = Math.random() < 0.5 ? 'g' : 'k';
      if (side === 'f') c = bad; else f = bad;
      this.lastSide = side;
    }
    const both = f === 's' && c === 's';
    const L = both ? base * rnd(0.7, 2.0) + 40 : base * rnd(2.15, 2.9) + 30;
    const cell = this.pushCell(f, c, L);
    this.placeGems(cell, base, v);

    // 바로 앞 칸이 양쪽 다 안전하면 가운데에 악몽 구름을 띄울 수 있다 (그 칸에서 뒤집기만 막음)
    const n = this.cells.length;
    if (n >= 3 && d > 0.06) {
      const a = this.cells[n - 3], b = this.cells[n - 2];
      const sa = this.safe(a), sc = this.safe(cell);
      const aSide = sa.f && !sa.c ? 'f' : sa.c && !sa.f ? 'c' : null;
      const bx = b.x0 + Math.max(base * 0.9 + 34, (b.x1 - b.x0) / 2);
      if (!b.plain && b.f === 's' && b.c === 's' && aSide && sc[aSide] && bx < b.x1 - 30 &&
          Math.random() < 0.3 + 0.45 * d) {
        const blob = { x: bx, y0: H / 2, amp: rnd(10, 34) * (d > 0.3 ? 1 : 0.5), ph: Math.random() * 6.28, r: 21, y: H / 2 };
        this.blobs.push(blob);
        this.gems.forEach(g => { if (Math.abs(g.x - bx) < 60 && Math.abs(g.y - H / 2) < 110) g.gone = true; });
      }
    }
  },
  placeGems(cell, base, v) {
    const top = TOP + PR + 4, bot = BOT - PR - 4;
    const row = (y, x0, x1) => { for (let x = x0; x <= x1; x += 34) this.gems.push({ x, y, v: 1 }); };
    const len = cell.x1 - cell.x0;
    if (cell.f !== 's' || cell.c !== 's') {
      if (Math.random() < 0.75) {
        const y = cell.f === 's' ? bot : top;
        const a = cell.x0 + 40 + Math.random() * len * 0.2, b = cell.x1 - 40 - Math.random() * len * 0.3;
        row(y, a, b);
      }
      return;
    }
    const r = Math.random();
    if (r < 0.45 && len > base + 90) {
      // 뒤집기 궤적을 따라 놓은 조각: 따라가면 다 먹을 수 있다
      const fromTop = Math.random() < 0.5;
      const sx = cell.x0 + 30 + Math.random() * Math.max(0, len - base - 80);
      for (let tt = 0; tt <= this.flipTime() + 0.001; tt += 0.055) {
        const dy = 0.5 * GRAV * tt * tt + 120 * tt;
        if (dy > bot - top) break;
        this.gems.push({ x: sx + v * tt, y: fromTop ? top + dy : bot - dy, v: 1 });
      }
    } else if (r < 0.8) {
      row(Math.random() < 0.5 ? top : bot, cell.x0 + 30, cell.x1 - 30);
    }
    if (Math.random() < 0.12) this.gems.push({ x: (cell.x0 + cell.x1) / 2, y: H / 2, v: 5, big: true });
  },
  cellAt(x) {
    for (const c of this.cells) if (x >= c.x0 && x < c.x1) return c;
    return null;
  },
  solid(side, x) { const c = this.cellAt(x); return !c || c[side] !== 'g'; },

  // ---------- 조작 ----------
  tap() {
    if (this.dead) return;
    this.buf = 0.13;
    if (this.ground || this.coyote > 0) this.flip();
  },
  flip() {
    this.g = -this.g; this.vy = this.g * 120;
    this.ground = false; this.coyote = 0; this.buf = 0; this.flips++;
    Sound.sfx('flip');
    for (let i = 0; i < 6; i++) this.part(this.x, this.y, rnd(-80, 30), rnd(-60, 60) - this.g * 60, 0.4, '#fff6c8', 2);
  },

  // ---------- 매 틱 ----------
  update(dt) {
    this.time += dt;
    this.updParts(dt);
    if (this.dead) { this.deadT += dt; return; }

    this.speed = this.speedAt(this.dist);
    this.x += this.speed * dt;
    this.dist = Math.max(0, this.x / PXM);
    if (this.inv > 0) this.inv -= dt;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }

    if (this.buf > 0) { this.buf -= dt; if (this.ground || this.coyote > 0) this.flip(); }

    const py = this.y, wasGround = this.ground;
    this.vy = clamp(this.vy + GRAV * this.g * dt, -1500, 1500);
    this.y += this.vy * dt;
    this.ground = false;
    const side = this.g > 0 ? 'f' : 'c';
    const tgt = this.g > 0 ? BOT - PR : TOP + PR;
    const past = this.g > 0 ? this.y >= tgt : this.y <= tgt;
    if (past) {
      if (this.solid(side, this.x)) {
        const fromAbove = this.g > 0 ? py <= tgt + 2 : py >= tgt - 2;
        if (fromAbove) {
          this.y = tgt; this.vy = 0; this.ground = true;
          if (!wasGround) this.land();
        }
      }
      // 구멍 속으로 빠진 뒤 다음 땅의 옆면에 부딪힘
      const deep = this.g > 0 ? this.y > tgt + 5 : this.y < tgt - 5;
      if (deep && this.solid(side, this.x + PR * 0.7)) return this.hit('wall');
    }
    if (wasGround && !this.ground && this.vy * this.g >= 0) this.coyote = 0.09;
    else if (this.coyote > 0) this.coyote -= dt;
    if (this.y > H + 40 || this.y < -40) return this.hit('fall');

    // 가시
    for (const c of this.cells) {
      if (c.x0 > this.x + 40) break;
      if (c.x1 < this.x - 40) continue;
      const inSp = this.x > c.x0 + 10 - PR * 0.5 && this.x < c.x1 - 10 + PR * 0.5;
      if (inSp && c.f === 'k' && this.y + PR > BOT - 9) return this.hit('spike');
      if (inSp && c.c === 'k' && this.y - PR < TOP + 9) return this.hit('spike');
    }
    // 악몽 구름
    for (const b of this.blobs) {
      b.y = b.y0 + Math.sin(this.time * 1.6 + b.ph) * b.amp;
      if (Math.abs(b.x - this.x) < 60 && Math.hypot(b.x - this.x, b.y - this.y) < b.r + PR - 4) return this.hit('blob', b);
    }
    // 꿈 조각
    for (const g of this.gems) {
      if (g.gone || Math.abs(g.x - this.x) > 24) continue;
      if (Math.abs(g.y - this.y) < (g.big ? 28 : 22)) this.collect(g);
    }

    // 시간대
    const pi = Math.floor((this.dist % LOOP_M) / (LOOP_M / 5)), lp = Math.floor(this.dist / LOOP_M) + 1;
    if (pi !== this.phaseIdx || lp !== this.loop) {
      this.phaseIdx = pi;
      if (lp !== this.loop) { this.loop = lp; this.banner = { text: t('night', { n: lp }), t: 0 }; }
      else this.banner = { text: t('phases')[pi], t: 0 };
      Sound.sfx('phase');
    }
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 2.4) this.banner = null; }

    // 보기용
    this.spin += this.speed * dt / PR * 0.35;
    this.face += ((this.g > 0 ? 0 : Math.PI) - this.face) * Math.min(1, dt * 16);
    this.squash *= Math.pow(0.002, dt);
    this.trailT -= dt;
    if (this.trailT <= 0) {
      this.trailT = 0.035;
      this.part(this.x - 8, this.y + rnd(-5, 5), rnd(-60, -20), rnd(-15, 15), rnd(0.4, 0.7), Math.random() < 0.5 ? '#ffe98a' : '#c9b8ff', rnd(1.5, 3));
    }
    this.fill();
  },
  land() {
    this.squash = 1;
    Sound.sfx('land');
    for (let i = 0; i < 5; i++) this.part(this.x + rnd(-8, 8), this.y + this.g * PR, rnd(-90, 40), -this.g * rnd(10, 60), 0.35, '#ffffff', 2);
  },
  collect(g) {
    g.gone = true;
    this.combo++; this.comboT = 0.7;
    this.frags += g.v; this.jar += g.v;
    Sound.sfx(g.big ? 'big' : 'gem', this.combo);
    const n = g.big ? 14 : 5;
    for (let i = 0; i < n; i++) this.part(g.x, g.y, rnd(-120, 120), rnd(-120, 120), 0.45, g.big ? '#ffd86b' : '#9ff3ff', 2);
    if (g.big) this.pops.push({ x: g.x, y: g.y - 20, text: '+5', t: 0, col: '#ffd86b' });
    while (this.jar >= JAR) {
      this.jar -= JAR; this.deliv++;
      const had = this.shield; this.shield = true;
      Sound.sfx('deliver');
      this.pops.push({ x: this.x + 40, y: H / 2 - 30, text: t('delivered') + ' +50', t: 0, col: '#fff3a8', big: true });
      if (!had) this.pops.push({ x: this.x + 40, y: H / 2, text: t('shieldOn'), t: -0.25, col: '#a8e4ff' });
      for (let i = 0; i < 24; i++) this.part(this.x, this.y, rnd(-200, 200), rnd(-200, 200), 0.8, i % 2 ? '#fff3a8' : '#ffb3e6', 3);
    }
  },
  hit(kind, blob) {
    if (this.inv > 0 && kind !== 'fall' && kind !== 'wall') return;
    if (this.shield) {
      this.shield = false; this.inv = 1.3;
      Sound.sfx('pop');
      for (let i = 0; i < 20; i++) this.part(this.x, this.y, rnd(-220, 220), rnd(-220, 220), 0.6, '#a8e4ff', 2.5);
      if (blob) blob.x = -9999;
      if (kind !== 'blob') {
        // 반대편으로 튕겨 보낸다. 위험한 쪽의 반대편은 규칙상 항상 안전하다.
        this.y = this.g > 0 ? Math.min(this.y, BOT - PR - 1) : Math.max(this.y, TOP + PR + 1);
        this.g = -this.g; this.vy = this.g * 700; this.ground = false;
      }
      return;
    }
    this.dead = true; this.deadT = 0;
    Sound.sfx('die');
    for (let i = 0; i < 36; i++) this.part(this.x, clamp(this.y, 10, H - 10), rnd(-260, 260), rnd(-260, 260), rnd(0.6, 1.2), i % 3 ? '#ffe98a' : '#c9b8ff', rnd(2, 4));
  },
  part(x, y, vx, vy, life, col, s) {
    if (this.parts.length > 400) return;
    this.parts.push({ x, y, vx, vy, life, max: life, col, s });
  },
  updParts(dt) {
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy *= 0.97; p.life -= dt; }
    this.parts = this.parts.filter(p => p.life > 0);
    for (const p of this.pops) { p.t += dt; }
    this.pops = this.pops.filter(p => p.t < 1.4);
  }
};
