'use strict';
// 그림 파일 없이 모두 코드로 그린다.

// 시간대 색: 하늘 위, 하늘 아래, 별 밝기, 구름길 색, 창문 불빛
const PAL = [
  { top: [43, 29, 92], bot: [240, 138, 93], star: 0.35, cloud: [255, 214, 222], win: 0.6, sun: 1, moon: 0 },   // 저녁
  { top: [16, 22, 58], bot: [59, 47, 122], star: 0.85, cloud: [196, 188, 255], win: 1, sun: 0, moon: 1 },     // 밤
  { top: [6, 9, 31], bot: [26, 24, 71], star: 1, cloud: [160, 152, 236], win: 0.45, sun: 0, moon: 1 },        // 한밤
  { top: [45, 42, 110], bot: [247, 166, 184], star: 0.4, cloud: [255, 210, 232], win: 0.3, sun: 0.6, moon: 0.3 }, // 새벽
  { top: [111, 184, 255], bot: [255, 230, 179], star: 0, cloud: [255, 255, 255], win: 0, sun: 1, moon: 0 }      // 아침
];
const mix = (a, b, k) => a + (b - a) * k;
const mixc = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
const rgb = (c, a) => a === undefined ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

function palAt(dist) {
  const p = ((dist % LOOP_M) / (LOOP_M / 5));
  const i = Math.floor(p) % 5, f = p - Math.floor(p);
  const k = f < 0.7 ? 0 : (f - 0.7) / 0.3, s = k * k * (3 - 2 * k);
  const A = PAL[i], B = PAL[(i + 1) % 5];
  return {
    top: mixc(A.top, B.top, s), bot: mixc(A.bot, B.bot, s), cloud: mixc(A.cloud, B.cloud, s),
    star: mix(A.star, B.star, s), win: mix(A.win, B.win, s), sun: mix(A.sun, B.sun, s), moon: mix(A.moon, B.moon, s)
  };
}

const STARS = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random() * 0.8, s: Math.random() * 1.4 + 0.4, tw: Math.random() * 6.28 }));
// 집 실루엣 (반복 패턴)
const HOUSES = (() => {
  const a = []; let x = 0;
  while (x < 2400) {
    const w = rnd(46, 90), h = rnd(50, 120);
    a.push({ x, w, h, roof: Math.random() < 0.7, wins: Array.from({ length: 4 }, () => Math.random() < 0.55), chim: Math.random() < 0.4 });
    x += w + rnd(4, 26);
  }
  return { list: a, len: x };
})();

const Draw = {
  ctx: null, W: 640,

  world(G, camX, time, showPlayer) {
    const c = this.ctx, W = this.W;
    const P = palAt(G.dist);
    // 하늘
    const sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, rgb(P.top)); sky.addColorStop(1, rgb(P.bot));
    c.fillStyle = sky; c.fillRect(0, 0, W, H);
    // 별
    if (P.star > 0.01) {
      for (const s of STARS) {
        const x = ((s.x * W * 1.5 - camX * 0.03) % (W * 1.5) + W * 1.5) % (W * 1.5) - W * 0.25;
        const a = P.star * (0.55 + 0.45 * Math.sin(time * 2 + s.tw));
        c.fillStyle = `rgba(255,255,240,${a})`;
        c.fillRect(x, s.y * H, s.s, s.s);
      }
    }
    // 달과 해
    if (P.moon > 0.01) {
      const mx = W * 0.78, my = 70;
      c.globalAlpha = P.moon;
      const gl = c.createRadialGradient(mx, my, 10, mx, my, 70);
      gl.addColorStop(0, 'rgba(255,250,210,0.35)'); gl.addColorStop(1, 'rgba(255,250,210,0)');
      c.fillStyle = gl; c.fillRect(mx - 70, my - 70, 140, 140);
      c.save(); c.beginPath(); c.arc(mx, my, 22, 0, 6.283); c.clip();
      c.fillStyle = '#fff6cf'; c.beginPath(); c.arc(mx, my, 22, 0, 6.283); c.arc(mx + 10, my - 6, 19, 0, 6.283); c.fill('evenodd');
      c.restore();
      c.globalAlpha = 1;
    }
    if (P.sun > 0.01) {
      const sx = W * 0.2, sy = 120 - P.sun * 30;
      c.globalAlpha = P.sun * (P.star < 0.2 ? 0.9 : 0.6);
      const gl = c.createRadialGradient(sx, sy, 10, sx, sy, 90);
      gl.addColorStop(0, 'rgba(255,230,160,0.6)'); gl.addColorStop(1, 'rgba(255,230,160,0)');
      c.fillStyle = gl; c.fillRect(sx - 90, sy - 90, 180, 180);
      c.fillStyle = '#ffe6a0'; c.beginPath(); c.arc(sx, sy, 26, 0, 6.283); c.fill();
      c.globalAlpha = 1;
    }
    // 먼 구름
    c.fillStyle = rgb(P.cloud, 0.18);
    for (let i = 0; i < 6; i++) {
      const x = ((i * 260 - camX * 0.12) % 1560 + 1560) % 1560 - 200, y = 100 + (i % 3) * 40;
      this.puff(x, y, 60 + (i % 2) * 20);
    }
    // 마을
    this.town(camX * 0.35, P, 0.55, 300, 0.9);
    this.town(camX * 0.6 + 700, P, 0.85, 330, 1.15);

    // 구름길 (천장과 바닥)
    const runs = side => {
      const r = []; let cur = null;
      for (const cell of G.cells) {
        if (cell.x1 < camX - 40 || cell.x0 > camX + W + 40) continue;
        if (cell[side] === 'g') { cur = null; continue; }
        if (cur && cur.x1 === cell.x0) cur.x1 = cell.x1;
        else { cur = { x0: cell.x0, x1: cell.x1 }; r.push(cur); }
      }
      return r;
    };
    const cl = rgb(P.cloud), cl2 = rgb(mixc(P.cloud, P.top, 0.25));
    for (const s of ['f', 'c']) {
      for (const r of runs(s)) this.ribbon(r.x0 - camX, r.x1 - camX, s, camX, cl, cl2);
    }
    // 가시
    for (const cell of G.cells) {
      if (cell.x1 < camX - 40 || cell.x0 > camX + W + 40) continue;
      if (cell.f === 'k') this.spikes(cell.x0 + 10 - camX, cell.x1 - 10 - camX, BOT + 3, -1, time);
      if (cell.c === 'k') this.spikes(cell.x0 + 10 - camX, cell.x1 - 10 - camX, TOP - 3, 1, time);
    }
    // 꿈 조각
    for (const g of G.gems) {
      if (g.gone) continue;
      const x = g.x - camX;
      if (x < -20 || x > W + 20) continue;
      if (g.big) this.bigGem(x, g.y, time); else this.gem(x, g.y, time + g.x * 0.01);
    }
    // 악몽 구름
    for (const b of G.blobs) {
      const x = b.x - camX;
      if (x < -40 || x > W + 40) continue;
      this.nightmare(x, b.y, b.r, time);
    }
    // 파티클
    for (const p of G.parts) {
      c.globalAlpha = Math.max(0, p.life / p.max);
      c.fillStyle = p.col;
      c.fillRect(p.x - camX - p.s / 2, p.y - p.s / 2, p.s, p.s);
    }
    c.globalAlpha = 1;
    if (showPlayer && !G.dead) this.player(G, G.x - camX, G.y, time);
    // 떠오르는 글자
    for (const p of G.pops) {
      if (p.t < 0) continue;
      c.globalAlpha = Math.min(1, (1.4 - p.t) * 2);
      this.text(p.text, p.x - camX, p.y - p.t * 30, p.big ? 22 : 15, p.col, 'center');
    }
    c.globalAlpha = 1;
  },

  puff(x, y, r) {
    const c = this.ctx;
    c.beginPath();
    c.arc(x, y, r * 0.5, 0, 6.283); c.arc(x + r * 0.5, y - r * 0.2, r * 0.6, 0, 6.283);
    c.arc(x + r, y, r * 0.5, 0, 6.283); c.rect(x, y - r * 0.1, r, r * 0.6);
    c.fill();
  },
  town(off, P, shade, base, scale) {
    const c = this.ctx, W = this.W, L = HOUSES.len * scale;
    const col = mixc(P.top, [10, 8, 30], shade * 0.7);
    c.fillStyle = rgb(col);
    const start = -((off % L) + L) % L;
    for (let rep = start; rep < W; rep += L) {
      for (const h of HOUSES.list) {
        const x = rep + h.x * scale, w = h.w * scale, hh = h.h * scale * 0.8;
        if (x > W || x + w < 0) continue;
        c.fillStyle = rgb(col);
        c.fillRect(x, base - hh, w, H - base + hh);
        if (h.roof) { c.beginPath(); c.moveTo(x - 4, base - hh); c.lineTo(x + w / 2, base - hh - w * 0.35); c.lineTo(x + w + 4, base - hh); c.fill(); }
        if (h.chim) c.fillRect(x + w * 0.7, base - hh - w * 0.3, 7 * scale, w * 0.25);
        if (P.win > 0.02) {
          for (let i = 0; i < 4; i++) {
            if (!h.wins[i]) continue;
            c.fillStyle = `rgba(255,214,120,${P.win * (shade > 0.7 ? 0.9 : 0.55)})`;
            c.fillRect(x + 8 * scale + (i % 2) * (w - 24 * scale), base - hh + 12 * scale + Math.floor(i / 2) * 22 * scale, 8 * scale, 10 * scale);
          }
        }
      }
    }
  },
  ribbon(x0, x1, side, camX, col, col2) {
    const c = this.ctx;
    const top = side === 'f';
    const edge = top ? BOT : TOP, dir = top ? 1 : -1;
    if (x1 < -30 || x0 > this.W + 30) return;
    if (x0 < -60) x0 = -60;
    if (x1 > this.W + 60) x1 = this.W + 60;
    // 아래쪽 그림자 띠
    c.fillStyle = col2;
    c.beginPath();
    if (top) c.rect(x0, edge + 14, x1 - x0, H - edge); else c.rect(x0, 0, x1 - x0, edge - 14);
    const step = 26;
    for (let wx = Math.ceil((x0 + camX + 14) / step) * step; wx <= x1 + camX - 14; wx += step) {
      const sx = wx - camX, r = 15 + Math.sin(wx * 0.37) * 2;
      c.moveTo(sx + r, edge + dir * 22); c.arc(sx, edge + dir * 22, r, 0, 6.283);
    }
    c.fill();
    c.fillStyle = col;
    c.beginPath();
    if (top) c.rect(x0 + 2, edge + 8, x1 - x0 - 4, H - edge); else c.rect(x0 + 2, 0, x1 - x0 - 4, edge - 8);
    for (let wx = Math.ceil((x0 + camX + 13) / step) * step; wx <= x1 + camX - 13; wx += step) {
      const sx = wx - camX, r = 14 + Math.sin(wx * 0.53) * 1.5;
      c.moveTo(sx + r, edge + dir * 14); c.arc(sx, edge + dir * 14, r, 0, 6.283);
    }
    c.fill();
    // 반짝임
    c.fillStyle = 'rgba(255,255,255,0.45)';
    for (let wx = Math.ceil((x0 + camX + 13) / (step * 3)) * step * 3; wx <= x1 + camX - 13; wx += step * 3) {
      c.beginPath(); c.arc(wx - camX - 4, edge + dir * 6, 3, 0, 6.283); c.fill();
    }
  },
  spikes(x0, x1, y, dir, time) {
    const c = this.ctx;
    if (x1 < -20 || x0 > this.W + 20) return;
    const n = Math.max(1, Math.round((x1 - x0) / 18)), w = (x1 - x0) / n;
    c.fillStyle = '#2a1340';
    c.strokeStyle = `rgba(255,90,150,${0.6 + 0.3 * Math.sin(time * 5)})`;
    c.lineWidth = 1.5;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const a = x0 + i * w, hh = 17 + ((i * 7) % 3) * 2;
      c.moveTo(a, y); c.lineTo(a + w / 2, y + dir * hh); c.lineTo(a + w, y);
    }
    c.closePath(); c.fill(); c.stroke();
  },
  gem(x, y, t) {
    const c = this.ctx, s = 6 + Math.sin(t * 5) * 1;
    c.save(); c.translate(x, y); c.rotate(t * 1.5);
    c.fillStyle = 'rgba(160,240,255,0.25)';
    c.beginPath(); c.arc(0, 0, 11, 0, 6.283); c.fill();
    c.fillStyle = '#bff6ff';
    c.beginPath();
    c.moveTo(0, -s * 1.5); c.lineTo(s * 0.4, -s * 0.4); c.lineTo(s * 1.5, 0); c.lineTo(s * 0.4, s * 0.4);
    c.lineTo(0, s * 1.5); c.lineTo(-s * 0.4, s * 0.4); c.lineTo(-s * 1.5, 0); c.lineTo(-s * 0.4, -s * 0.4);
    c.closePath(); c.fill();
    c.fillStyle = '#ffffff'; c.fillRect(-1.5, -1.5, 3, 3);
    c.restore();
  },
  bigGem(x, y, t) {
    const c = this.ctx;
    c.save(); c.translate(x, y + Math.sin(t * 3) * 4);
    const gl = c.createRadialGradient(0, 0, 4, 0, 0, 30);
    gl.addColorStop(0, 'rgba(255,220,120,0.6)'); gl.addColorStop(1, 'rgba(255,220,120,0)');
    c.fillStyle = gl; c.fillRect(-30, -30, 60, 60);
    c.rotate(Math.sin(t * 2) * 0.3);
    this.starPath(0, 0, 14, 6.5);
    c.fillStyle = '#ffd86b'; c.fill();
    c.strokeStyle = '#fff6d0'; c.lineWidth = 2; c.stroke();
    c.restore();
  },
  starPath(x, y, ro, ri) {
    const c = this.ctx;
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ri : ro;
      c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    c.closePath();
  },
  nightmare(x, y, r, t) {
    const c = this.ctx;
    c.save(); c.translate(x, y);
    const gl = c.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 1.9);
    gl.addColorStop(0, 'rgba(120,30,140,0.45)'); gl.addColorStop(1, 'rgba(120,30,140,0)');
    c.fillStyle = gl; c.fillRect(-r * 2, -r * 2, r * 4, r * 4);
    c.fillStyle = '#2b1640';
    c.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * 6.283 + t * 0.6, rr = r * (0.95 + 0.12 * Math.sin(t * 4 + i * 2));
      c.moveTo(Math.cos(a) * rr * 0.55 + r * 0.42, Math.sin(a) * rr * 0.55);
      c.arc(Math.cos(a) * rr * 0.55, Math.sin(a) * rr * 0.55, r * 0.42, 0, 6.283);
    }
    c.arc(0, 0, r * 0.7, 0, 6.283);
    c.fill();
    // 눈
    c.fillStyle = '#ff4f8b';
    c.beginPath(); c.ellipse(-6, -2, 4, 2.6, 0.35, 0, 6.283); c.ellipse(6, -2, 4, 2.6, -0.35, 0, 6.283); c.fill();
    c.strokeStyle = '#ff4f8b'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(-6, 7); c.lineTo(-2, 5); c.lineTo(2, 7); c.lineTo(6, 5); c.stroke();
    c.restore();
  },
  player(G, x, y, time) {
    const c = this.ctx;
    const blink = G.inv > 0 && Math.floor(time * 16) % 2 === 0;
    c.save(); c.translate(x, y);
    // 빛
    const gl = c.createRadialGradient(0, 0, 4, 0, 0, 34);
    gl.addColorStop(0, 'rgba(255,240,170,0.55)'); gl.addColorStop(1, 'rgba(255,240,170,0)');
    c.fillStyle = gl; c.fillRect(-34, -34, 68, 68);
    c.rotate(G.face);
    const sq = G.squash * 0.25;
    c.scale(1 + sq, 1 - sq);
    c.translate(0, sq * PR * 0.5);
    if (!blink) {
      // 꿈 보따리
      c.fillStyle = '#8a7cff';
      c.beginPath(); c.arc(-11, -2, 7, 0, 6.283); c.fill();
      c.fillStyle = '#b9afff'; c.fillRect(-13, -10, 4, 4);
      // 몸 (별)
      c.save(); c.rotate(G.spin * 0.15 % 6.283 * 0 + Math.sin(time * 10) * 0.08);
      this.starPath(0, 0, PR + 3, PR * 0.62);
      c.fillStyle = '#ffd94a'; c.fill();
      c.strokeStyle = '#fff3b0'; c.lineWidth = 2; c.stroke();
      c.restore();
      // 수면 모자
      c.fillStyle = '#5b6cff';
      c.beginPath(); c.moveTo(-6, -8); c.quadraticCurveTo(4, -22, 14, -18); c.lineTo(7, -7); c.closePath(); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(14, -18, 3, 0, 6.283); c.fill();
      // 얼굴
      c.fillStyle = '#3a2a10';
      c.beginPath(); c.arc(1, -1, 1.8, 0, 6.283); c.arc(7, -1, 1.8, 0, 6.283); c.fill();
      c.strokeStyle = '#3a2a10'; c.lineWidth = 1.4;
      c.beginPath(); c.arc(4, 2.5, 2.5, 0.2, Math.PI - 0.2); c.stroke();
      c.fillStyle = 'rgba(255,120,120,0.5)';
      c.beginPath(); c.arc(-2, 3, 2, 0, 6.283); c.arc(10, 3, 2, 0, 6.283); c.fill();
    }
    c.restore();
    if (G.shield) {
      c.strokeStyle = `rgba(168,228,255,${0.6 + 0.25 * Math.sin(time * 6)})`;
      c.lineWidth = 2.5;
      c.beginPath(); c.arc(x, y, PR + 10, 0, 6.283); c.stroke();
      c.fillStyle = 'rgba(168,228,255,0.12)'; c.fill();
    }
  },

  text(s, x, y, size, col, align, weight) {
    const c = this.ctx;
    c.font = `${weight || 'bold'} ${size}px ${FONT}`;
    c.textAlign = align || 'left'; c.textBaseline = 'middle';
    c.lineWidth = Math.max(3, size * 0.18); c.strokeStyle = 'rgba(10,8,40,0.75)'; c.lineJoin = 'round';
    c.strokeText(s, x, y);
    c.fillStyle = col || '#fff'; c.fillText(s, x, y);
  },
  button(b, hot) {
    const c = this.ctx;
    c.fillStyle = b.primary ? '#ffd94a' : 'rgba(255,255,255,0.14)';
    c.strokeStyle = b.primary ? '#fff3b0' : 'rgba(255,255,255,0.5)';
    c.lineWidth = 2;
    this.round(b.x, b.y, b.w, b.h, b.h / 2); c.fill(); c.stroke();
    c.font = `bold ${b.size || 18}px ${FONT}`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = b.primary ? '#3a2a10' : '#fff';
    c.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
  },
  round(x, y, w, h, r) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  },
  panel(x, y, w, h) {
    const c = this.ctx;
    c.fillStyle = 'rgba(16,14,52,0.86)'; c.strokeStyle = 'rgba(200,190,255,0.5)'; c.lineWidth = 2;
    this.round(x, y, w, h, 18); c.fill(); c.stroke();
  },

  hud(G) {
    const c = this.ctx, W = this.W;
    this.text(String(G.score), 18, 26, 26, '#fff');
    this.gem(24, 54, 0);
    this.text(String(G.frags), 38, 55, 15, '#bff6ff');
    this.text(Math.floor(G.dist) + 'm', 92, 55, 15, '#ffe9a8');
    // 배달 진행 막대
    const bx = 18, by = 70, bw = 120;
    c.fillStyle = 'rgba(0,0,0,0.35)'; this.round(bx, by, bw, 8, 4); c.fill();
    c.fillStyle = '#ffb3e6'; this.round(bx, by, Math.max(8, bw * G.jar / JAR), 8, 4); c.fill();
    this.text('✉ ' + G.deliv, bx + bw + 8, by + 4, 13, '#ffd1ef');
    // 일시정지 버튼
    c.fillStyle = 'rgba(20,16,60,0.45)';
    c.beginPath(); c.arc(W - 30, 30, 18, 0, 6.283); c.fill();
    c.fillStyle = '#fff'; c.fillRect(W - 36, 22, 4, 16); c.fillRect(W - 28, 22, 4, 16);
    if (G.banner) {
      const k = G.banner.t, a = k < 0.3 ? k / 0.3 : k > 1.9 ? Math.max(0, (2.4 - k) / 0.5) : 1;
      c.globalAlpha = a;
      this.text(G.banner.text, W / 2, 104, 24, '#fff6cf', 'center');
      c.globalAlpha = 1;
    }
  }
};
