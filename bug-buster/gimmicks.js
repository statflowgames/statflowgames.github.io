// 은하 방역대 - 월드별 환경 기믹 (각 월드 2번째 스테이지에서 켜짐)
const GIMMICKS = [
  {
    update(g, dt) {
      if ((g.cd -= dt) <= 0) { g.cd = 0.6; g.objs.push({ x: rand(20, G.W - 20), y: -10 }); }
      for (const o of g.objs) {
        o.y += 75 * dt;
        if ((o.x - G.p.x) ** 2 + (o.y - G.p.y) ** 2 < 20 * 20) {
          o.gone = true; const pts = 300 * (1 + G.loop); G.score += pts; G.combo += 2; G.comboT = 2.2;
          text(o.x, o.y - 10, `+${pts}`, '#ffd23f', 12); Sound.play('pickup');
        }
      }
    },
    under(g, c) {
      for (const o of g.objs) {
        c.fillStyle = '#ffc93c'; c.beginPath(); c.moveTo(o.x, o.y - 9); c.quadraticCurveTo(o.x + 7, o.y + 2, o.x, o.y + 6); c.quadraticCurveTo(o.x - 7, o.y + 2, o.x, o.y - 9); c.fill();
        Art.ell(c, o.x - 2, o.y, 1.6, 2.4, 0, '#fff6c8');
      }
    } },
  {
    update(g, dt) {
      if ((g.cd -= dt) <= 0) { g.cd = 2.8; g.objs.push({ x: rand(40, G.W - 40), y: -70, r: rand(45, 65), rot: rand(0, 6) }); }
      for (const o of g.objs) { o.y += 40 * dt; if ((o.x - G.p.x) ** 2 + (o.y - G.p.y) ** 2 < o.r * o.r) G.slowMul = 0.45; }
    },
    under(g, c) {
      c.strokeStyle = 'rgba(240,235,255,0.7)'; c.lineWidth = 1.6;
      for (const o of g.objs) {
        const slow = (o.x - G.p.x) ** 2 + (o.y - G.p.y) ** 2 < o.r * o.r;
        Art.ell(c, o.x, o.y, o.r, o.r, 0, slow ? 'rgba(255,90,120,0.16)' : 'rgba(230,225,255,0.08)');
        c.beginPath();
        for (let i = 0; i < 8; i++) { const a = o.rot + i * Math.PI / 4; c.moveTo(o.x, o.y); c.lineTo(o.x + Math.cos(a) * o.r, o.y + Math.sin(a) * o.r); }
        for (let k = 1; k <= 3; k++) c.arc(o.x, o.y, o.r * k / 3, 0, Math.PI * 2);
        c.stroke();
      }
    } },
  {
    update(g, dt) {
      if ((g.cd -= dt) <= 0) { g.cd = 4; g.objs.push({ y: rand(G.H * 0.35, G.H - 70), s: Math.random() < 0.5 ? 1 : -1, warn: 1.1 }); }
      for (const o of g.objs) {
        if (o.warn > 0 && (o.warn -= dt) <= 0) {
          o.gone = true;
          for (let i = 0; i < 6; i++) { const k = spawnEnemy('roach', o.s > 0 ? -20 - i * 34 : G.W + 20 + i * 34, o.y + rand(-8, 8), { vx: o.s * 300, vy: 0.01 }); k.bounces = 0; }
        }
      }
    },
    over(g, c) {
      for (const o of g.objs) {
        c.fillStyle = `rgba(255,45,85,${0.15 + 0.12 * Math.sin(G.time * 25)})`; c.fillRect(0, o.y - 14, G.W, 28);
        c.fillStyle = 'rgba(255,90,110,0.9)'; c.font = `16px ${I18n.font().display}`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(o.s > 0 ? '▶ ▶ ▶' : '◀ ◀ ◀', G.W / 2, o.y);
      }
    } },
  {
    update(g, dt) {
      if ((g.cd -= dt) <= 0) { g.cd = 0.55; eShoot(rand(10, G.W - 10), G.H + 10, -Math.PI / 2, rand(50, 80), { c: '#7fe0ff', r: rand(6, 10), shape: 'bubble', life: 16 }); }
    } },
  {
    update(g, dt) {
      if ((g.cd -= dt) <= 0) { g.cd = 1.6; g.objs.push({ x: rand(0, G.W), y: -80, r: rand(60, 100), v: rand(30, 50) }); }
      for (const o of g.objs) o.y += o.v * dt;
    },
    over(g, c) {
      for (const o of g.objs) {
        const gr = c.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
        gr.addColorStop(0, 'rgba(170,160,190,0.75)'); gr.addColorStop(1, 'rgba(170,160,190,0)');
        c.fillStyle = gr; c.fillRect(o.x - o.r, o.y - o.r, o.r * 2, o.r * 2);
      }
    } },
  {
    update() {},
    over(g, c) {
      const p = G.p, r = 150 + Math.sin(G.time * 2) * 8, gr = c.createRadialGradient(p.x, p.y, r * 0.45, p.x, p.y, r);
      gr.addColorStop(0, 'rgba(4,18,8,0)'); gr.addColorStop(1, 'rgba(4,18,8,0.9)');
      c.fillStyle = gr; c.fillRect(0, 0, G.W, G.H);
    } },
  {
    start(g) { g.dir = 1; g.wind = 0; },
    update(g, dt) {
      if ((g.cd -= dt) <= 0) { g.cd = 6; g.dir = Math.random() < 0.5 ? 1 : -1; }
      g.wind += (g.dir * 75 - g.wind) * Math.min(1, dt * 1.5);
      G.p.x += g.wind * dt;
      if (g.objs.length < 40) g.objs.push({ x: g.dir > 0 ? -10 : G.W + 10, y: rand(0, G.H), l: rand(10, 30) });
      for (const o of g.objs) { o.x += g.wind * 4 * dt; if (o.x < -40 || o.x > G.W + 40) o.gone = true; }
    },
    over(g, c) {
      c.strokeStyle = 'rgba(255,215,140,0.35)'; c.lineWidth = 1.5; c.beginPath();
      for (const o of g.objs) { c.moveTo(o.x, o.y); c.lineTo(o.x - Math.sign(g.wind || 1) * o.l, o.y); }
      c.stroke();
      c.fillStyle = 'rgba(255,215,140,0.85)'; c.font = `13px ${I18n.font().body}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(g.wind > 0 ? t('windR') : t('windL'), G.W / 2, 52);
    } },
  {
    start() { G.xpMul *= 2; },
    update(g, dt) {
      if ((g.cd -= dt) <= 0) { g.cd = 0.4; g.objs.push({ x: rand(0, G.W), y: -10, r: rand(0, 6), v: rand(40, 70) }); }
      for (const o of g.objs) { o.y += o.v * dt; o.x += Math.sin(G.time + o.r) * 20 * dt; o.r += dt; }
    },
    under(g, c) {
      for (const o of g.objs) { c.save(); c.translate(o.x, o.y); c.rotate(o.r); Art.ell(c, 0, 0, 5, 2.6, 0, 'rgba(255,154,216,0.6)'); c.restore(); }
    } },
  {
    update(g, dt) {
      if ((g.cd -= dt) <= 0) { g.cd = 2.2; g.objs.push({ x: Math.random() < 0.4 ? G.p.x : rand(20, G.W - 20), warn: 1.0 }); }
      for (const o of g.objs) {
        if ((o.warn -= dt) <= 0) { o.gone = true; eShoot(o.x, -20, Math.PI / 2, 520, { c: '#ff6a2a', r: 14, hr: 12 }); G.shake = Math.max(G.shake, 3); }
      }
    },
    over(g, c) {
      for (const o of g.objs) { c.fillStyle = `rgba(255,90,30,${0.12 + 0.1 * Math.sin(G.time * 30)})`; c.fillRect(o.x - 18, 0, 36, G.H); }
    } },
  {
    update(g, dt) {
      const w = g.well = { x: G.W / 2 + Math.sin(g.t * 0.5) * (G.W / 2 - 60), y: G.H * 0.5 + Math.sin(g.t * 0.7) * 120 };
      const dx = w.x - G.p.x, dy = w.y - G.p.y, d = Math.hypot(dx, dy) || 1, f = 90 / (1 + d / 120);
      G.p.x += dx / d * f * dt; G.p.y += dy / d * f * dt;
      for (const b of G.eb) {
        const bx = w.x - b.x, by = w.y - b.y, bd = bx * bx + by * by;
        if (bd < 130 * 130) { const k = 160 * dt / Math.sqrt(bd + 1); b.vx += bx * k; b.vy += by * k; }
      }
    },
    under(g, c) {
      const w = g.well; if (!w) return;
      for (let i = 0; i < 4; i++) {
        const k = (G.time * 0.6 + i / 4) % 1;
        c.strokeStyle = `rgba(199,125,255,${0.5 * k})`; c.lineWidth = 2;
        c.beginPath(); c.arc(w.x, w.y, 10 + (1 - k) * 60, G.time * 3 + i, G.time * 3 + i + 4.2); c.stroke();
      }
      Art.ell(c, w.x, w.y, 8, 8, 0, '#1a0a24'); Art.ell(c, w.x, w.y, 4, 4, 0, '#c77dff');
    } },
];

const Gimmick = {
  cur: null, objs: [], t: 0, cd: 1,
  start(S) {
    this.cur = S.gimmick != null ? GIMMICKS[S.gimmick] : null;
    this.objs = []; this.t = 0; this.cd = 1.5; this.well = null; G.slowMul = 1;
    if (this.cur && this.cur.start) this.cur.start(this);
  },
  update(dt) {
    G.slowMul = 1;
    if (!this.cur || !G.p) return;
    this.t += dt; this.cur.update(this, dt);
    this.objs = this.objs.filter(o => !o.gone && !(o.y > G.H + 120));
    G.p.x = clamp(G.p.x, 14, G.W - 14); G.p.y = clamp(G.p.y, 60, G.H - 30);
  },
  under(c) { if (this.cur && this.cur.under) this.cur.under(this, c); },
  over(c) { if (this.cur && this.cur.over) this.cur.over(this, c); },
};
