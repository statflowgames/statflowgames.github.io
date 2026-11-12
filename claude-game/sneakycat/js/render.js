// 화면 그리기: 맵(정적 레이어), 시야, 캐릭터, 효과
import { drawCat, drawCatPeek, drawHuman, drawDog, drawRoomba, drawCart, drawRobot, drawCarousel, drawFish, drawBonus, drawVase, drawSwitch, ell, rr, OUT } from './art.js?v=1112094939';
import { sprite, IMG } from './assets.js?v=1112094939';

const hash = (x, y, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const CARPET = ['#c0605f', '#6c3150', '#34477a', '#2f6b73', '#7a2f3a', '#3d5a8a', '#6a3d8a', '#2d5a4a', '#5a2a5a'];
const CARPET_EDGE = ['#f0c27a', '#d8b45a', '#c9d6f0', '#bfe6e0', '#f0d08a', '#e6e6f0', '#ffd27a', '#9ff0c8', '#ffd700'];
const SOFA = ['#d06b5f', '#4f7a5a', '#7a3346', '#3f7f8a', '#8a4a3a', '#4a5f9a', '#a04a7a', '#4a6a7a', '#7a2a3a'];
const BED = ['#7aa0e0', '#b04a6a', '#5d6f9a', '#5aa0a8', '#e0e0e8', '#8a7ad0', '#e07aa0', '#7ab0a0', '#c0a050'];
export const FONT = '"Jua", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

export class Renderer {
  constructor(cv) {
    this.cv = cv;
    this.ctx = cv.getContext('2d');
    this.W = 0; this.H = 0; this.dpr = 1;
    this.game = null;
    this.ts = 32;
    this.ox = 0; this.oy = 0;
    this.focus = null;
    this.top = 70; this.bottom = 150; this.side = 0; this.overW = 1; this.overH = 1; this.peek = false;
    this.skin = null;
  }
  resize(w, h) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.W = w; this.H = h;
    this.cv.width = Math.round(w * this.dpr);
    this.cv.height = Math.round(h * this.dpr);
    if (this.game) this.layout(true);
  }
  setGame(g, skin) {
    this.game = g; this.skin = skin;
    this.layout(true);
  }
  layout(snap) {
    const g = this.game.grid;
    const availH = this.H - this.top - this.bottom;
    const availW = this.W - this.side * 2;
    // 세로 화면은 좌우가 조금 넘쳐도(카메라가 따라감) 위아래를 꽉 채운다
    const fit = Math.min(availW / g.w, availH / g.h), big = Math.min(availW / g.w * this.overW, availH / g.h * this.overH);
    // 맵 전체가 거의 같은 크기로 들어가면 통째로 보이게, 아니면 조금 넘겨(카메라가 따라감) 크게
    let ts = clamp(fit >= big * 0.9 ? fit : big, 20, 84);
    // 넓은 맵은 조금 좌우로 스크롤되더라도 너무 작아지지 않게
    ts = Math.max(ts, Math.min(28, availH / g.h));
    // 둘러보기: 맵 전체를 한 화면에
    if (this.peek) ts = Math.min(84, fit);
    this.ts = Math.floor(ts);
    this.mapW = g.w * this.ts;
    this.mapH = g.h * this.ts;
    this.buildStatic();
    if (snap) { const [x, y] = this.camTarget(); this.ox = x; this.oy = y; }
  }
  camTarget() {
    const G = this.game, ts = this.ts;
    const f = this.focus || G.cat;
    let x, y;
    if (this.mapW <= this.W) x = (this.W - this.mapW) / 2;
    else x = clamp(this.W / 2 - f.x * ts, this.W - this.mapW, 0);
    const areaH = this.H - this.top - this.bottom;
    if (this.mapH <= areaH) y = this.top + (areaH - this.mapH) / 2;
    else {
      const lo = this.top + areaH - this.mapH;
      y = clamp(this.top + areaH / 2 - f.y * ts, Math.min(lo, this.top), this.top);
    }
    return [x, y];
  }

  // ───────── 정적 레이어 ─────────
  buildStatic() {
    const G = this.game, g = G.grid, ts = this.ts;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(this.mapW * this.dpr);
    cv.height = Math.ceil(this.mapH * this.dpr);
    const c = cv.getContext('2d');
    c.scale(this.dpr, this.dpr);
    const ch = G.L.ch - 1, pal = G.chapter.pal;
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (g.ch[y][x] === '#' || g.ch[y][x] === 'C') continue;
      this.floorTile(c, x, y, g.floor[y][x], ch);
    }
    // 삐걱 마루, 환풍구
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      const k = g.ch[y][x];
      if (k === '%') this.creakTile(c, x, y);
      else if (k === 'V') this.ventTile(c, x, y);
      else if (k === '~') this.iceTile(c, x, y);
      else if (k === 'w') this.puddleTile(c, x, y);
    }
    // 고양이 문 앞 발판
    const s = G.ents.cat;
    {
      const X = s.tx * ts, Y = (s.ty - 1) * ts;
      rr(c, X + ts * 0.12, Y + ts * 0.5, ts * 0.76, ts * 0.42, 4);
      c.fillStyle = '#5f8a4c'; c.fill();
      c.strokeStyle = '#3e5f31'; c.lineWidth = 1; c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 3; i++) c.fillRect(X + ts * (0.22 + i * 0.2), Y + ts * 0.58, ts * 0.12, ts * 0.26);
    }
    // 벽
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      const k = g.ch[y][x];
      if (k !== '#' && k !== 'C') continue;
      this.wallTile(c, x, y, k, pal, ch);
    }
    // 가구 (덩어리 단위)
    const seen = new Set();
    const comps = [];
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      const k = g.ch[y][x];
      if (!'TDBSKHPOX'.includes(k) || seen.has(x + ',' + y)) continue;
      let x1 = x, y1 = y;
      const q = [[x, y]]; seen.add(x + ',' + y);
      while (q.length) {
        const [px, py] = q.pop();
        x1 = Math.max(x1, px); y1 = Math.max(y1, py);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = px + dx, ny = py + dy;
          if (g.c(nx, ny) === k && !seen.has(nx + ',' + ny) && k !== 'P' && k !== 'O' && k !== 'B') { seen.add(nx + ',' + ny); q.push([nx, ny]); }
        }
      }
      comps.push({ k, x, y, w: x1 - x + 1, h: y1 - y + 1 });
    }
    comps.sort((a, b) => a.y + a.h - (b.y + b.h));
    for (const p of comps) this.furniture(c, p.k, p.x * ts, p.y * ts, p.w * ts, p.h * ts, ch, hash(p.x, p.y, 7));
    this.staticCv = cv;
  }
  floorTile(c, x, y, k, ch) {
    const ts = this.ts, X = x * ts, Y = y * ts, g = this.game.grid;
    if (k === '.') {
      const ph = ts / 3;
      for (let r = 0; r < 3; r++) {
        const h = hash(x, y * 3 + r);
        c.fillStyle = h < 0.33 ? '#ad784d' : h < 0.66 ? '#a36d44' : '#b37f53';
        c.fillRect(X, Y + r * ph, ts, ph + 0.5);
        c.fillStyle = '#7c5233';
        c.fillRect(X, Y + (r + 1) * ph - 1, ts, 1);
        if (hash(x, y, r) < 0.45) c.fillRect(X + Math.floor(hash(y, x, r) * ts), Y + r * ph, 1, ph);
      }
    } else if (k === ',') {
      const hs = ts / 2;
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        c.fillStyle = (i + j + x + y) % 2 ? '#e9dfc3' : '#d3c39d';
        c.fillRect(X + i * hs, Y + j * hs, hs, hs);
      }
      c.strokeStyle = 'rgba(150,130,90,0.5)'; c.lineWidth = 1;
      c.strokeRect(X + 0.5, Y + 0.5, ts - 1, ts - 1);
    } else if (k === '_') {
      c.fillStyle = CARPET[ch]; c.fillRect(X, Y, ts, ts);
      c.fillStyle = 'rgba(255,255,255,0.1)';
      c.beginPath(); c.moveTo(X + ts / 2, Y + ts * 0.3); c.lineTo(X + ts * 0.7, Y + ts / 2); c.lineTo(X + ts / 2, Y + ts * 0.7); c.lineTo(X + ts * 0.3, Y + ts / 2); c.fill();
      c.fillStyle = CARPET_EDGE[ch];
      const b = Math.max(2, ts * 0.09);
      const not = (dx, dy) => g.floor[y + dy] && g.floor[y + dy][x + dx] !== '_' || '#'.includes(g.c(x + dx, y + dy));
      if (not(-1, 0)) c.fillRect(X + 2, Y, b, ts);
      if (not(1, 0)) c.fillRect(X + ts - 2 - b, Y, b, ts);
      if (not(0, -1)) c.fillRect(X, Y + 2, ts, b);
      if (not(0, 1)) c.fillRect(X, Y + ts - 2 - b, ts, b);
    } else {
      c.fillStyle = (x + y) % 2 ? '#d7dae1' : '#c9cdd6'; c.fillRect(X, Y, ts, ts);
      c.strokeStyle = 'rgba(160,166,180,0.6)'; c.lineWidth = 1;
      c.beginPath();
      c.moveTo(X + hash(x, y, 1) * ts, Y); c.quadraticCurveTo(X + ts / 2, Y + hash(x, y, 2) * ts, X + ts, Y + hash(x, y, 3) * ts);
      c.stroke();
      c.strokeStyle = 'rgba(120,126,140,0.5)'; c.strokeRect(X + 0.5, Y + 0.5, ts - 1, ts - 1);
    }
  }
  creakTile(c, x, y) {
    const ts = this.ts, X = x * ts, Y = y * ts, s = ts / 32;
    c.save();
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(X + 1, Y + 2, ts - 2, ts - 3);
    for (let r = 0; r < 3; r++) {
      const py = Y + r * ts / 3 + 1;
      c.fillStyle = r % 2 ? '#c99566' : '#bb8657';
      c.save(); c.translate(X + ts / 2, py + ts / 6); c.rotate((r - 1) * 0.06);
      c.fillRect(-ts / 2 + 1, -ts / 6 + 0.5, ts - 2, ts / 3 - 1.5);
      c.restore();
    }
    c.strokeStyle = '#5a3a22'; c.lineWidth = 1.2 * s; c.beginPath();
    c.moveTo(X + ts * 0.2, Y + ts * 0.3); c.lineTo(X + ts * 0.42, Y + ts * 0.45); c.lineTo(X + ts * 0.36, Y + ts * 0.62); c.lineTo(X + ts * 0.6, Y + ts * 0.78);
    c.moveTo(X + ts * 0.7, Y + ts * 0.15); c.lineTo(X + ts * 0.8, Y + ts * 0.32);
    c.stroke();
    c.fillStyle = 'rgba(255,220,170,0.7)'; c.font = `${Math.round(8 * s)}px ${FONT}`; c.textAlign = 'center';
    c.fillText('~', X + ts * 0.78, Y + ts * 0.62);
    c.restore();
  }
  findBelts(G) {
    const out = [], g = G.grid;
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) { const k = g.ch[y][x]; if ('<>^y'.includes(k)) out.push({ x, y, k }); }
    return out;
  }
  drawBelt(c, b, t) {
    const ts = this.ts, s = ts / 32, X = b.x * ts, Y = b.y * ts;
    const dir = { '<': [-1, 0], '>': [1, 0], '^': [0, -1], 'y': [0, 1] }[b.k];
    c.save();
    c.fillStyle = '#3a3f50'; c.fillRect(X, Y, ts, ts);
    c.beginPath(); c.rect(X + 2 * s, Y + 2 * s, ts - 4 * s, ts - 4 * s); c.clip();
    c.fillStyle = '#4a5066'; c.fillRect(X, Y, ts, ts);
    c.translate(X + ts / 2, Y + ts / 2); c.rotate(Math.atan2(dir[1], dir[0]));
    const off = ((t * 1.7) % 0.5) * ts;
    c.strokeStyle = 'rgba(255,214,107,0.85)'; c.lineWidth = 2.4 * s; c.lineCap = 'round';
    for (let i = -2; i <= 1; i++) {
      const x = i * ts * 0.5 + off;
      c.beginPath(); c.moveTo(x - 4 * s, -7 * s); c.lineTo(x + 2 * s, 0); c.lineTo(x - 4 * s, 7 * s); c.stroke();
    }
    c.restore();
    c.strokeStyle = '#9aa3b8'; c.lineWidth = 1.5 * s;
    if (dir[0]) { c.beginPath(); c.moveTo(X, Y + 1); c.lineTo(X + ts, Y + 1); c.moveTo(X, Y + ts - 1); c.lineTo(X + ts, Y + ts - 1); c.stroke(); }
    else { c.beginPath(); c.moveTo(X + 1, Y); c.lineTo(X + 1, Y + ts); c.moveTo(X + ts - 1, Y); c.lineTo(X + ts - 1, Y + ts); c.stroke(); }
  }
  drawDoor(c, d, G) {
    const ts = this.ts, s = ts / 32, X = d.tx * ts, Y = d.ty * ts, o = d.amt;
    c.save();
    c.fillStyle = 'rgba(30,26,40,0.35)'; c.fillRect(X, Y, ts, ts);
    const pane = (x, y, w, h) => { rr(c, x, y, w, h, 2 * s); c.fillStyle = 'rgba(190,225,240,0.75)'; c.fill(); c.lineWidth = 1.6 * s; c.strokeStyle = '#5f6f82'; c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1 * s; c.beginPath(); c.moveTo(x + w * 0.25, y + h * 0.75); c.lineTo(x + w * 0.6, y + h * 0.25); c.stroke(); };
    const half = ts / 2, gap = half * o * 0.92, th = 7 * s;
    if (d.across) { pane(X - gap + 1, Y + half - th / 2, half - 1, th); pane(X + half + gap, Y + half - th / 2, half - 1, th); }
    else { pane(X + half - th / 2, Y - gap + 1, th, half - 1); pane(X + half - th / 2, Y + half + gap, th, half - 1); }
    // 남은 시간 고리 (초록 = 열려 있는 시간, 빨강 = 닫혀 있는 시간)
    const per = G.doorOpen + G.doorShut, ph = (G.t + d.phase) % per, timed = ph < G.doorOpen;
    const left = timed ? 1 - ph / G.doorOpen : 1 - (ph - G.doorOpen) / G.doorShut;
    c.beginPath(); c.arc(X + ts * 0.82, Y + ts * 0.18, 4 * s, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2);
    c.strokeStyle = timed ? '#7bff9a' : '#ff6d7a'; c.lineWidth = 2.2 * s; c.stroke();
    c.restore();
  }
  iceTile(c, x, y) {
    const ts = this.ts, X = x * ts, Y = y * ts, s = ts / 32, g = this.game.grid;
    c.fillStyle = (x + y) % 2 ? '#bfe3f2' : '#b2dbee'; c.fillRect(X, Y, ts, ts);
    const ice = (dx, dy) => g.c(x + dx, y + dy) === '~';
    c.fillStyle = 'rgba(70,130,170,0.45)';
    if (!ice(-1, 0)) c.fillRect(X, Y, 2 * s, ts);
    if (!ice(1, 0)) c.fillRect(X + ts - 2 * s, Y, 2 * s, ts);
    if (!ice(0, -1)) c.fillRect(X, Y, ts, 2 * s);
    if (!ice(0, 1)) c.fillRect(X, Y + ts - 2 * s, ts, 2 * s);
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1.6 * s; c.lineCap = 'round';
    const h = hash(x, y, 5);
    c.beginPath(); c.moveTo(X + ts * (0.15 + h * 0.3), Y + ts * 0.7); c.lineTo(X + ts * (0.35 + h * 0.3), Y + ts * 0.45); c.stroke();
    c.beginPath(); c.moveTo(X + ts * (0.45 + h * 0.2), Y + ts * 0.8); c.lineTo(X + ts * (0.55 + h * 0.2), Y + ts * 0.68); c.stroke();
    c.strokeStyle = 'rgba(120,170,200,0.5)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(X + ts * 0.7, Y + ts * 0.2); c.lineTo(X + ts * 0.82, Y + ts * 0.36); c.lineTo(X + ts * 0.74, Y + ts * 0.5); c.stroke();
  }
  puddleTile(c, x, y) {
    const ts = this.ts, X = x * ts + ts / 2, Y = y * ts + ts / 2, s = ts / 32, h = hash(x, y, 9);
    c.save(); c.translate(X, Y); c.rotate((h - 0.5) * 0.6);
    c.beginPath(); c.ellipse(0, 1 * s, 13 * s, 9 * s, 0, 0, 7); c.fillStyle = 'rgba(40,90,140,0.55)'; c.fill();
    c.beginPath(); c.ellipse(-2 * s, 0, 11 * s, 7 * s, 0, 0, 7); c.fillStyle = 'rgba(110,180,230,0.6)'; c.fill();
    c.strokeStyle = 'rgba(230,248,255,0.8)'; c.lineWidth = 1.3 * s;
    c.beginPath(); c.ellipse(-5 * s, -2 * s, 4 * s, 1.6 * s, -0.3, Math.PI, Math.PI * 1.9); c.stroke();
    c.beginPath(); c.ellipse(4 * s, 3 * s, 2.5 * s, 1 * s, 0, 0, Math.PI); c.stroke();
    c.restore();
  }
  ventTile(c, x, y) {
    const ts = this.ts, X = x * ts, Y = y * ts, s = ts / 32;
    rr(c, X + 3 * s, Y + 4 * s, ts - 6 * s, ts - 7 * s, 3 * s);
    c.fillStyle = '#20232e'; c.fill(); c.lineWidth = 1.6 * s; c.strokeStyle = '#8f98ad'; c.stroke();
    c.strokeStyle = '#6c7489'; c.lineWidth = 2 * s;
    for (let i = 1; i < 5; i++) { const yy = Y + 4 * s + i * (ts - 7 * s) / 5; c.beginPath(); c.moveTo(X + 6 * s, yy); c.lineTo(X + ts - 6 * s, yy); c.stroke(); }
    c.fillStyle = '#b9c1d3';
    for (const [dx, dy] of [[5, 6], [ts / s - 5, 6], [5, ts / s - 5], [ts / s - 5, ts / s - 5]]) { c.beginPath(); c.arc(X + dx * s, Y + dy * s, 1.3 * s, 0, 7); c.fill(); }
  }
  wallTile(c, x, y, k, pal, ch) {
    const ts = this.ts, X = x * ts, Y = y * ts, g = this.game.grid;
    const isWall = (xx, yy) => !g.in(xx, yy) || '#C'.includes(g.c(xx, yy));
    c.fillStyle = pal.wallTop; c.fillRect(X, Y, ts, ts);
    c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(X, Y, ts, ts * 0.12);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    if (!isWall(x - 1, y)) c.fillRect(X, Y, 2, ts);
    if (!isWall(x + 1, y)) c.fillRect(X + ts - 2, Y, 2, ts);
    if (!isWall(x, y - 1)) c.fillRect(X, Y, ts, 2);
    // 아래쪽 칸에 벽 앞면
    if (y + 1 < g.h && !isWall(x, y + 1)) {
      const f = ts * 0.34, FY = Y + ts;
      c.fillStyle = pal.wallFront; c.fillRect(X, FY, ts, f);
      if (ch === 0) {
        c.fillStyle = 'rgba(255,255,255,0.12)';
        for (let i = 0; i < 4; i++) c.fillRect(X + i * ts / 4 + 2, FY, ts / 10, f);
      } else if (ch === 1) {
        c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 1; c.strokeRect(X + 3.5, FY + 2.5, ts - 7, f - 6);
      } else {
        c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(X, FY + f / 2, ts, 1); c.fillRect(X + (x % 2 ? ts / 2 : 0), FY, 1, f / 2);
      }
      c.fillStyle = pal.trim; c.fillRect(X, FY + f - 3, ts, 3);
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(X, FY + f, ts, 2);
    }
    if (k === 'C') {
      rr(c, X + ts * 0.18, Y + ts * 0.16, ts * 0.64, ts * 0.72, ts * 0.3);
      c.fillStyle = '#140f1c'; c.fill();
      rr(c, X + ts * 0.24, Y + ts * 0.26, ts * 0.52, ts * 0.58, ts * 0.24);
      c.fillStyle = '#c99358'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = '#7a4f2a';
      const px = X + ts / 2, py = Y + ts * 0.58, r = ts * 0.05;
      c.beginPath(); c.arc(px, py + r, r * 1.6, 0, 7); c.fill();
      for (const [dx, dy] of [[-1.6, -1.2], [-0.55, -2], [0.55, -2], [1.6, -1.2]]) { c.beginPath(); c.arc(px + dx * r * 1.1, py + dy * r, r * 0.7, 0, 7); c.fill(); }
    }
  }
  furniture(c, k, X, Y, W, H, ch, seed) {
    const ts = this.ts, f = ts * 0.28, s = ts / 32;
    c.save();
    c.lineJoin = 'round';
    const lw = Math.max(1, 1.4 * s);
    const box = (x, y, w, h, r, fill, stroke = OUT) => { rr(c, x, y, w, h, r); c.fillStyle = fill; c.fill(); if (stroke) { c.lineWidth = lw; c.strokeStyle = stroke; c.stroke(); } };
    c.fillStyle = 'rgba(0,0,0,0.25)';
    if (k !== 'P' && k !== 'O') { rr(c, X + 3 * s, Y + 5 * s, W - 4 * s, H - 4 * s, 4 * s); c.fill(); }
    switch (k) {
      case 'K': {
        box(X + 1, Y + 1, W - 2, H - f, 3 * s, '#ece6d8');
        box(X + 1, Y + H - f, W - 2, f - 1, 2 * s, '#8f6a4c');
        c.fillStyle = 'rgba(0,0,0,0.25)';
        for (let i = 1; i < W / ts; i++) c.fillRect(X + i * ts, Y + H - f + 2, 1, f - 4);
        for (let i = 0; i < W / ts; i++) { c.fillStyle = '#e9c46a'; c.fillRect(X + i * ts + ts / 2 - 3 * s, Y + H - f / 2 - 1, 6 * s, 2 * s); }
        if (W >= ts * 2) { box(X + ts * 0.18, Y + ts * 0.18, ts * 0.64, H - f - ts * 0.3, 4 * s, '#aab8c6'); ell(c, X + ts * 0.5, Y + ts * 0.3, 2 * s, 1.5 * s, '#d9e2ea'); }
        if (W >= ts * 3) for (const [dx, dy] of [[0.3, 0.3], [0.7, 0.3]]) ell(c, X + W - ts + dx * ts, Y + dy * ts + 2, 5 * s, 4 * s, '#3d3a42', OUT, lw);
        if (H >= ts * 2) { box(X + ts * 0.2, Y + ts * 1.15, ts * 0.6, ts * 0.4, 3 * s, '#c9a27a'); }
        break;
      }
      case 'T': {
        c.fillStyle = '#6b3f1f';
        c.fillRect(X + 4 * s, Y + H - f, 3 * s, f - 2 * s);
        c.fillRect(X + W - 7 * s, Y + H - f, 3 * s, f - 2 * s);
        box(X + 2, Y + 2, W - 4, H - f - 1, 5 * s, '#c1874c');
        c.fillStyle = '#8a5427'; c.fillRect(X + 3 * s, Y + H - f, W - 6 * s, 3 * s);
        c.strokeStyle = 'rgba(120,70,30,0.35)'; c.lineWidth = 1;
        for (let i = 1; i < 3; i++) { c.beginPath(); c.moveTo(X + 6 * s, Y + i * (H - f) / 3); c.lineTo(X + W - 6 * s, Y + i * (H - f) / 3); c.stroke(); }
        if (seed < 0.5) { ell(c, X + W * 0.35, Y + (H - f) * 0.5, 5 * s, 3 * s, '#f6f1e6', OUT, lw * 0.7); drawFish(c, X + W * 0.35, Y + (H - f) * 0.48, 0.3 * s, false); }
        else { box(X + W * 0.62, Y + (H - f) * 0.3, 6 * s, 7 * s, 2 * s, '#f6f1e6'); }
        break;
      }
      case 'D': {
        const col = BED[ch];
        box(X + 1, Y + 1, W - 2, H - 2, 4 * s, '#8b5a3c');
        box(X + 3 * s, Y + 3 * s, W - 6 * s, H - 6 * s - f * 0.4, 3 * s, '#f3efe6', null);
        for (let i = 0; i < Math.round(W / ts); i++) box(X + i * ts + 5 * s, Y + 5 * s, ts - 10 * s, ts * 0.42, 5 * s, '#ffffff');
        box(X + 3 * s, Y + ts * 0.62, W - 6 * s, H - ts * 0.62 - f * 0.4 - 3 * s, 3 * s, col);
        c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(X + 3 * s, Y + ts * 0.62, W - 6 * s, 3 * s);
        c.fillStyle = '#6e4229'; c.fillRect(X + 2, Y + H - f * 0.4 - 1, W - 4, f * 0.4);
        break;
      }
      case 'B': {
        box(X + 4 * s, Y + 7 * s, W - 8 * s, H - 9 * s, 2 * s, '#c99358');
        c.fillStyle = '#a8743f'; c.fillRect(X + 4 * s + 1, Y + H - f - 1, W - 8 * s - 2, f - 2 * s);
        c.fillStyle = '#ddb07a';
        c.beginPath(); c.moveTo(X + 4 * s, Y + 7 * s); c.lineTo(X + 1 * s, Y + 2 * s); c.lineTo(X + W / 2, Y + 4 * s); c.lineTo(X + W / 2, Y + 7 * s); c.closePath(); c.fill(); c.lineWidth = lw * 0.8; c.strokeStyle = OUT; c.stroke();
        c.beginPath(); c.moveTo(X + W - 4 * s, Y + 7 * s); c.lineTo(X + W - 1 * s, Y + 2 * s); c.lineTo(X + W / 2, Y + 4 * s); c.lineTo(X + W / 2, Y + 7 * s); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#efd3a0'; c.fillRect(X + W / 2 - 2 * s, Y + H - f - 1, 4 * s, f - 2 * s);
        c.fillStyle = '#7a4f2a'; c.font = `${7 * s}px ${FONT}`; c.textAlign = 'center'; c.fillText('냥', X + W / 2 + 7 * s, Y + H - 6 * s);
        break;
      }
      case 'S': {
        const col = SOFA[ch];
        box(X + 1, Y + 4 * s, W - 2, H - 5 * s, 6 * s, col);
        box(X + 1, Y + 1, W - 2, ts * 0.42, 6 * s, shadeHex(col, -0.18));
        for (let i = 0; i < Math.round(W / ts); i++) box(X + i * ts + 5 * s, Y + ts * 0.42, ts - 8 * s, H - ts * 0.42 - f * 0.6, 4 * s, shadeHex(col, 0.12), 'rgba(0,0,0,0.25)');
        box(X + 1, Y + 4 * s, ts * 0.22, H - 6 * s, 4 * s, shadeHex(col, -0.08));
        box(X + W - ts * 0.22 - 1, Y + 4 * s, ts * 0.22, H - 6 * s, 4 * s, shadeHex(col, -0.08));
        break;
      }
      case 'H': {
        box(X + 1, Y + 1, W - 2, H - 2, 2 * s, '#5a3b28');
        const cols = ['#d65a5a', '#4f86c6', '#e8b04a', '#5aa86a', '#9a6ad0', '#e07a3a'];
        for (const sy of [0.12, 0.55]) {
          let bx = X + 4 * s;
          let i = 0;
          while (bx < X + W - 6 * s) {
            const bw = (2.5 + hash(bx | 0, Y | 0, i) * 2.5) * s, bh = ts * (0.28 + hash(i, bx | 0) * 0.08);
            c.fillStyle = cols[(hash(bx | 0, sy * 10 | 0) * cols.length) | 0];
            c.fillRect(bx, Y + ts * sy + (ts * 0.36 - bh), bw, bh);
            bx += bw + 0.6 * s; i++;
          }
          c.fillStyle = '#3e2618'; c.fillRect(X + 2, Y + ts * (sy + 0.36), W - 4, 2 * s);
        }
        break;
      }
      case 'P': {
        const cx = X + W / 2;
        c.beginPath(); c.moveTo(cx - 8 * s, Y + H - 14 * s); c.lineTo(cx + 8 * s, Y + H - 14 * s); c.lineTo(cx + 6 * s, Y + H - 2 * s); c.lineTo(cx - 6 * s, Y + H - 2 * s); c.closePath();
        c.fillStyle = '#c8693f'; c.fill(); c.lineWidth = lw; c.strokeStyle = OUT; c.stroke();
        const greens = ['#3c7d3a', '#4f9a4a', '#6cc15f'];
        for (let i = 0; i < 7; i++) {
          const a = -Math.PI / 2 + (i - 3) * 0.42;
          c.save(); c.translate(cx, Y + H - 14 * s); c.rotate(a + Math.PI / 2);
          ell(c, 0, -11 * s, 4.5 * s, 11 * s, greens[i % 3], OUT, lw * 0.7);
          c.restore();
        }
        break;
      }
      case 'O': {
        box(X + 3 * s, Y + H - 9 * s, W - 6 * s, 8 * s, 2 * s, '#b9bec9');
        const g2 = c.createLinearGradient(X + 7 * s, 0, X + W - 7 * s, 0);
        g2.addColorStop(0, '#c9ced8'); g2.addColorStop(0.4, '#f2f4f8'); g2.addColorStop(1, '#a9afbb');
        rr(c, X + 7 * s, Y - ts * 0.55, W - 14 * s, H + ts * 0.5 - 8 * s, 2 * s);
        c.fillStyle = g2; c.fill(); c.lineWidth = lw; c.strokeStyle = OUT; c.stroke();
        c.strokeStyle = 'rgba(120,126,140,0.5)'; c.lineWidth = 1;
        for (const fx of [0.38, 0.5, 0.62]) { c.beginPath(); c.moveTo(X + W * fx, Y - ts * 0.45); c.lineTo(X + W * fx, Y + H - 10 * s); c.stroke(); }
        box(X + 4 * s, Y - ts * 0.68, W - 8 * s, 7 * s, 2 * s, '#e6e9ef');
        break;
      }
      case 'X': {
        box(X + 3 * s, Y + H * 0.48, W - 6 * s, H * 0.5 - 2, 2 * s, '#3e4660');
        c.fillStyle = '#d8b45a'; c.fillRect(X + 3 * s, Y + H * 0.48, W - 6 * s, 2 * s);
        const cx = X + W / 2, cy = Y + H * 0.42;
        if (seed < 0.33) { ell(c, cx, cy - 2 * s, 4 * s, 6 * s, '#ffcf3f', OUT, lw * 0.8); ell(c, cx, cy - 9 * s, 3 * s, 3 * s, '#ffcf3f', OUT, lw * 0.8); }
        else if (seed < 0.66) { c.beginPath(); c.moveTo(cx - 6 * s, cy + 2 * s); c.lineTo(cx - 6 * s, cy - 5 * s); c.lineTo(cx - 3 * s, cy - 1 * s); c.lineTo(cx, cy - 7 * s); c.lineTo(cx + 3 * s, cy - 1 * s); c.lineTo(cx + 6 * s, cy - 5 * s); c.lineTo(cx + 6 * s, cy + 2 * s); c.closePath(); c.fillStyle = '#ffcf3f'; c.fill(); c.lineWidth = lw * 0.8; c.strokeStyle = OUT; c.stroke(); }
        else { c.beginPath(); c.moveTo(cx - 4 * s, cy + 2 * s); c.quadraticCurveTo(cx - 8 * s, cy - 5 * s, cx - 3 * s, cy - 9 * s); c.lineTo(cx + 3 * s, cy - 9 * s); c.quadraticCurveTo(cx + 8 * s, cy - 5 * s, cx + 4 * s, cy + 2 * s); c.closePath(); c.fillStyle = '#4fb3a6'; c.fill(); c.lineWidth = lw * 0.8; c.strokeStyle = OUT; c.stroke(); }
        rr(c, X + 4 * s, Y + 1, W - 8 * s, H * 0.5, 2 * s);
        c.fillStyle = 'rgba(170,220,255,0.22)'; c.fill(); c.lineWidth = 1; c.strokeStyle = 'rgba(220,240,255,0.8)'; c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.moveTo(X + 7 * s, Y + H * 0.35); c.lineTo(X + 12 * s, Y + 4 * s); c.stroke();
        break;
      }
    }
    c.restore();
  }

  // ───────── 매 프레임 ─────────
  draw(dt, joy) {
    const c = this.ctx, G = this.game;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = '#0f0d1a';
    c.fillRect(0, 0, this.W, this.H);
    if (!G) return;
    const [tx, ty] = this.camTarget();
    const k = Math.min(1, dt * 5);
    this.ox += (tx - this.ox) * k;
    this.oy += (ty - this.oy) * k;
    const ts = this.ts, s = ts / 32, t = G.t;
    c.save();
    c.translate(Math.round(this.ox), Math.round(this.oy));
    c.drawImage(this.staticCv, 0, 0, this.mapW, this.mapH);
    c.fillStyle = G.chapter.pal.night;
    c.fillRect(0, 0, this.mapW, this.mapH);
    for (const d of G.doors) this.drawDoor(c, d, G);
    if (G.belts === undefined) G.belts = this.findBelts(G);
    for (const b of G.belts) this.drawBelt(c, b, t);
    for (const p of G.plates) {
      const X = p.tx * ts, Y = p.ty * ts;
      if (this.topDown(c, 'item-plate', p.x, p.y, 0.9, 0)) { if (p.hot > 0) { c.fillStyle = 'rgba(255,60,80,0.35)'; c.fillRect(X, Y, ts, ts); } continue; }
      rr(c, X + 4 * s, Y + 4 * s, ts - 8 * s, ts - 8 * s, 3 * s); c.fillStyle = p.hot > 0 ? '#7a2a33' : '#4a5068'; c.fill(); c.lineWidth = 1.4 * s; c.strokeStyle = '#9aa3b8'; c.stroke();
      rr(c, X + 9 * s, Y + 9 * s, ts - 18 * s, ts - 18 * s, 2 * s); c.fillStyle = p.hot > 0 ? '#ff4d6d' : G.power || true ? '#c05060' : '#555'; c.fill();
      ell(c, X + ts / 2, Y + ts / 2, 2 * s, 2 * s, Math.sin(t * 5 + p.tx) > 0 ? '#ff9aa8' : '#ff4d6d');
    }
    for (const r of G.rides) { if (!this.topDown(c, 'item-carousel', r.cx, r.cy, 3, r.ang)) { c.save(); c.translate(r.cx * ts, r.cy * ts); drawCarousel(c, r, ts, t); c.restore(); } if (G.cat.riding === r) { ell(c, r.x * ts - 2 * s, r.y * ts - 3 * s, 1.4 * s, 1.2 * s, this.skin.eye); ell(c, r.x * ts + 2 * s, r.y * ts - 3 * s, 1.4 * s, 1.2 * s, this.skin.eye); } }

    // 시야 (손전등 빛)
    c.globalCompositeOperation = 'lighter';
    for (const g of G.guards) {
      if (g.state === 'sleep') continue;
      const col = g.state === 'chase' ? '255,70,80' : g.meter > 0.05 || g.state === 'suspicious' ? '255,170,60' : '255,226,140';
      this.cone(c, g.x, g.y, g.face, g.T.fov, g.T.range, col, g.state === 'chase' ? 0.4 : 0.3);
      const nose = G.noseOf(g);
      if (nose) { c.fillStyle = `rgba(${g.T.fishNose && G.cat.hasFish ? '120,220,255' : col},${g.T.fishNose && G.cat.hasFish ? 0.1 : 0.07})`; c.beginPath(); c.arc(g.x * ts, g.y * ts, nose * ts, 0, 7); c.fill(); }
    }
    if (G.power) for (const cam of G.cams) {
      const col = cam.alarmT > 0 ? '255,60,70' : cam.meter > 0.05 ? '255,170,60' : '140,200,255';
      this.cone(c, cam.ox, cam.oy, cam.ang, cam.fov, cam.range, col, 0.28);
    }
    if (G.power) for (const sp of G.spots) {
      const X = sp.x * ts, Y = sp.y * ts, R0 = sp.r * ts, al = sp.alarmT > 0, warn = sp.meter > 0.05;
      const col = al ? '255,70,80' : warn ? '255,180,70' : '255,250,215';
      const gr = c.createRadialGradient(X, Y, R0 * 0.2, X, Y, R0);
      gr.addColorStop(0, `rgba(${col},0.42)`); gr.addColorStop(0.8, `rgba(${col},0.26)`); gr.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = gr; c.beginPath(); c.arc(X, Y, R0, 0, 7); c.fill();
      c.strokeStyle = `rgba(${col},0.55)`; c.lineWidth = 1.5 * s; c.setLineDash([4 * s, 4 * s]); c.beginPath(); c.arc(X, Y, R0 * 0.96, t * 0.8, t * 0.8 + 7); c.stroke(); c.setLineDash([]);
    }
    // 레이저
    for (const l of G.lasers) {
      const on = G.laserActive(l);
      const X = l.tx * ts, Y = l.ty * ts;
      if (on) {
        c.strokeStyle = 'rgba(255,40,80,0.35)'; c.lineWidth = 6 * s;
        c.beginPath();
        if (l.dir === 'h') { c.moveTo(X, Y + ts / 2); c.lineTo(X + ts, Y + ts / 2); } else { c.moveTo(X + ts / 2, Y); c.lineTo(X + ts / 2, Y + ts); }
        c.stroke();
        c.strokeStyle = '#ff6d8a'; c.lineWidth = 1.6 * s; c.stroke();
      }
    }
    c.globalCompositeOperation = 'source-over';
    for (const l of G.lasers) {
      const X = l.tx * ts, Y = l.ty * ts, on = G.laserActive(l);
      if (!on) {
        c.strokeStyle = 'rgba(255,90,120,0.28)'; c.lineWidth = 1; c.setLineDash([3, 4]);
        c.beginPath();
        if (l.dir === 'h') { c.moveTo(X, Y + ts / 2); c.lineTo(X + ts, Y + ts / 2); } else { c.moveTo(X + ts / 2, Y); c.lineTo(X + ts / 2, Y + ts); }
        c.stroke(); c.setLineDash([]);
      }
      const g = G.grid;
      const ends = l.dir === 'h' ? [[-1, 0], [1, 0]] : [[0, -1], [0, 1]];
      for (const [dx, dy] of ends) if (g.c(l.tx + dx, l.ty + dy) === '#') {
        const ex = X + ts / 2 + dx * ts * 0.5, ey = Y + ts / 2 + dy * ts * 0.5;
        rr(c, ex - 3 * s, ey - 4 * s, 6 * s, 8 * s, 2 * s); c.fillStyle = '#4a5068'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1; c.stroke();
        ell(c, ex, ey, 1.6 * s, 1.6 * s, G.power ? (on ? '#ff4d6d' : '#7a2433') : '#333');
      }
    }

    if (this.peek) this.peekPaths(c);

    // 바닥 물건 (은은히 빛남)
    const glow = (x, y, col, r) => {
      const gr = c.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    };
    c.globalCompositeOperation = 'lighter';
    if (!G.fish.taken) glow(G.fish.x * ts, G.fish.y * ts, G.L.golden ? 'rgba(255,210,80,0.55)' : 'rgba(150,210,255,0.45)', ts * (0.9 + Math.sin(t * 3) * 0.1));
    for (const b of G.bonus) if (!b.taken) glow(b.x * ts, b.y * ts, 'rgba(255,160,220,0.35)', ts * 0.7);
    c.globalCompositeOperation = 'source-over';

    const list = [];
    if (!G.fish.taken) list.push({ y: G.fish.y, f: () => { if (G.L.golden && this.sprite(c, sprite('item-fish-gold'), G.fish.x, G.fish.y + 0.3 + Math.sin(t * 3) * 0.04, 0.8, false, { t })) return; this.at(c, G.fish.x, G.fish.y + 0.15); ell(c, 0, 0, 11, 3.6, '#f4f1ea', OUT, 1.2); drawFish(c, 0, -3 + Math.sin(t * 3) * 1, 0.9, G.L.golden, 0); c.restore(); } });
    for (const b of G.bonus) if (!b.taken) list.push({ y: b.y, f: () => { if (this.sprite(c, sprite('item-' + G.chapter.bonus), b.x, b.y + 0.25 + Math.sin(t * 3) * 0.04, 0.62, true, { t })) return; this.at(c, b.x, b.y + 0.2); ell(c, 0, 0, 6, 2, 'rgba(0,0,0,0.3)'); drawBonus(c, G.chapter.bonus, t); c.restore(); } });
    for (const v of G.vases) list.push({ y: v.y + (v.broken ? -0.4 : 0.1), f: () => { this.at(c, v.x, v.y + 0.3); drawVase(c, v.broken, t); c.restore(); } });
    for (const sw of G.switches) list.push({ y: sw.y - 0.3, f: () => { this.at(c, sw.x, sw.y + 0.25); drawSwitch(c, sw.on, t); c.restore(); } });
    if (G.roomba) list.push({ y: G.roomba.y - 0.01, f: () => { this.at(c, G.roomba.x, G.roomba.y + 0.2); drawRoomba(c, G.roomba, t); c.restore(); } });
    for (const g of G.guards) list.push({ y: g.y, f: () => this.drawGuard(c, g, t) });
    for (const k of G.carts) list.push({ y: k.y, f: () => { if (this.topDown(c, 'item-cart', k.x, k.y, 1.15, k.ang)) { if (G.cat.riding === k) { ell(c, k.x * ts - 2 * s, k.y * ts, 1.4 * s, 1.2 * s, this.skin.eye); ell(c, k.x * ts + 2 * s, k.y * ts, 1.4 * s, 1.2 * s, this.skin.eye); } return; } this.at(c, k.x, k.y + 0.25); drawCart(c, k, t, G.cat.riding === k ? this.skin : null); c.restore(); } });
    if (!(G.cat.riding && (G.cat.riding.cart || G.cat.riding.ride))) list.push({ y: G.cat.riding ? G.cat.riding.y + 0.01 : G.cat.y, f: () => this.drawCatNow(c, t) });
    list.sort((a, b) => a.y - b.y);
    for (const e of list) e.f();
    for (const cam of G.cams) this.drawCam(c, cam, t);

    // 말풍선
    for (const g of G.guards) if (g.bubble) this.bubble(c, g.x, g.y - (g.type === 'dog' ? 0.95 : 1.45), g.bubble, g.meter, t);
    if (G.cat.bubble) this.bubble(c, G.cat.x, G.cat.y - 1.05, { text: G.cat.bubble.text, kind: 'cat' }, 0, t);
    // 소리 고리
    for (const n of G.noises) {
      const p = n.t / 0.9;
      const col = { step: '255,255,255', meow: '255,150,210', crash: '255,220,100', bark: '255,160,80', creak: '233,185,138', splash: '150,215,255', chop: '235,235,245', clank: '200,210,230' }[n.kind] || '255,90,90';
      c.strokeStyle = `rgba(${col},${(1 - p) * (n.kind === 'step' ? 0.35 : 0.7) * (n.muted ? 0.3 : 1)})`;
      c.lineWidth = (n.kind === 'step' ? 1.2 : 2.5) * s;
      c.beginPath(); c.arc(n.x * ts, n.y * ts, n.r * ts * (0.25 + 0.75 * Math.sqrt(p)), 0, 7); c.stroke();
    }
    for (const p of G.parts) { c.fillStyle = p.color; c.globalAlpha = 1 - p.t / p.life; c.fillRect(p.x * ts - 2 * s, p.y * ts - 2 * s, 4 * s, 4 * s); }
    c.globalAlpha = 1;
    for (const p of G.popups) {
      const a = p.t < 1 ? 1 : 1 - (p.t - 1) / 0.4;
      c.globalAlpha = Math.max(0, a);
      c.font = `${Math.round(15 * Math.max(0.85, s))}px ${FONT}`; c.textAlign = 'center';
      c.lineWidth = 4; c.strokeStyle = 'rgba(20,14,30,0.9)';
      const y = p.y * ts - p.t * 22;
      c.strokeText(p.text, p.x * ts, y); c.fillStyle = p.color; c.fillText(p.text, p.x * ts, y);
    }
    c.globalAlpha = 1;
    if (this.peek) this.peekRings(c);
    c.restore();

    // 화면 효과
    const chased = G.chased();
    const danger = G.danger();
    if (chased || danger > 0.35) {
      const a = chased ? 0.35 + Math.sin(t * 8) * 0.12 : (danger - 0.35) * 0.4;
      const gr = c.createRadialGradient(this.W / 2, this.H / 2, Math.min(this.W, this.H) * 0.35, this.W / 2, this.H / 2, Math.max(this.W, this.H) * 0.72);
      gr.addColorStop(0, 'rgba(255,40,60,0)'); gr.addColorStop(1, chased ? `rgba(255,40,60,${a})` : `rgba(255,150,40,${a})`);
      c.fillStyle = gr; c.fillRect(0, 0, this.W, this.H);
    }
    if (G.fw) {
      for (const b of G.fw.bursts) {
        if (b.t < 0) continue;
        const k = b.t / 1.4, X = b.x * this.W, Y = this.top + 20 + b.y * this.H * 0.4, R0 = 20 + k * 70;
        c.globalAlpha = Math.max(0, 1 - k);
        for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; c.fillStyle = `hsl(${b.hue + i * 6},100%,70%)`; c.beginPath(); c.arc(X + Math.cos(a) * R0, Y + Math.sin(a) * R0 + k * k * 30, 2.6, 0, 7); c.fill(); }
        c.globalAlpha = 1;
      }
      if (G.boomFlash > 0) { c.fillStyle = `rgba(255,230,200,${G.boomFlash * 0.12})`; c.fillRect(0, 0, this.W, this.H); }
      const f = G.fw, txt = f.on ? '🎆 펑! 지금은 소리가 안 들려요' : `🎆 다음 불꽃 ${f.t.toFixed(1)}초`;
      c.font = `14px ${FONT}`; c.textAlign = 'center';
      const w = c.measureText(txt).width + 24, y = this.top + 16;
      rr(c, this.W / 2 - w / 2, y - 13, w, 26, 13); c.fillStyle = f.on ? 'rgba(120,40,90,0.9)' : 'rgba(16,12,34,0.8)'; c.fill();
      c.fillStyle = f.on ? '#ffe08a' : '#d8e2ff'; c.fillText(txt, this.W / 2, y + 5);
    }
    if (G.alarmFlash > 0) { c.fillStyle = `rgba(255,40,60,${G.alarmFlash * 0.22 * (0.6 + 0.4 * Math.sin(t * 20))})`; c.fillRect(0, 0, this.W, this.H); }
    if (this.peek) this.peekEye(c);
    this.edgeMarks(c, t);
    if (joy && joy.active) this.drawJoy(c, joy);
  }
  setPeek(v) {
    this.peek = v; this.peekT0 = performance.now() / 1000; this.peekCache = null;
    this.layout(true);
  }
  // 둘러보기: 경비가 걸어갈 길, 카메라가 고개 돌리는 범위 (게임은 멈춰 있으니 실제 시간으로 움직임)
  peekPaths(c) {
    const G = this.game, ts = this.ts, s = ts / 32, now = performance.now() / 1000;
    const a = Math.min(1, (now - this.peekT0) / 0.3);
    const P = (p) => [p.x * ts, p.y * ts];
    const leg = (from, to) => G.grid.path(from.x, from.y, to.x, to.y) || [];
    const loopOf = (pts) => { const l = [pts[0]]; pts.forEach((p, i) => l.push(...leg(p, pts[(i + 1) % pts.length]))); return l; };
    if (!this.peekCache) {
      this.peekCache = G.guards.map((g) => (g.pts.length < 2 ? null : loopOf(g.pts)));
      this.peekRoomba = G.roomba && G.roomba.pts.length > 1 ? loopOf(G.roomba.pts) : null;
      this.peekCarts = G.carts.filter((k) => k.pts.length > 1).map((k) => loopOf(k.pts));
      this.peekSpots = G.spots.filter((k) => k.pts.length > 1).map((k) => loopOf(k.pts));
    }
    const line = (pts, col, w, dash, off) => {
      if (pts.length < 2) return;
      c.beginPath(); pts.forEach((p, i) => { const [x, y] = P(p); if (i) c.lineTo(x, y); else c.moveTo(x, y); });
      c.strokeStyle = col; c.lineWidth = w; c.setLineDash(dash); c.lineDashOffset = off; c.stroke(); c.setLineDash([]);
    };
    const arrow = (p, q, col, sz) => {
      const [x0, y0] = P(p), [x1, y1] = P(q);
      c.save(); c.translate((x0 + x1) / 2, (y0 + y1) / 2); c.rotate(Math.atan2(y1 - y0, x1 - x0));
      c.beginPath(); c.moveTo(sz, 0); c.lineTo(-sz * 0.7, -sz * 0.75); c.lineTo(-sz * 0.7, sz * 0.75); c.closePath();
      c.fillStyle = col; c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(20,14,30,0.8)'; c.stroke(); c.restore();
    };
    const COL = ['255,214,107', '127,212,255', '255,157,226', '157,255,170', '255,179,122', '200,170,255'];
    c.save(); c.globalAlpha = a; c.lineCap = 'round'; c.lineJoin = 'round';
    if (this.peekRoomba) line(this.peekRoomba, 'rgba(200,210,230,0.35)', 2 * s, [2 * s, 5 * s], 0);
    for (const l of this.peekCarts || []) line(l, 'rgba(255,240,200,0.5)', 2.5 * s, [3 * s, 5 * s], -now * 12 * s);
    if (G.power) for (const l of this.peekSpots || []) line(l, 'rgba(255,250,200,0.75)', 3 * s, [8 * s, 6 * s], -now * 26 * s);
    // 카메라: 고개를 돌리는 전체 범위와 양쪽 화살표
    if (G.power) for (const cam of G.cams) {
      c.globalCompositeOperation = 'lighter';
      this.cone(c, cam.ox, cam.oy, cam.base, cam.sweep * 2 + cam.fov, cam.range, '140,200,255', 0.1 * a);
      c.globalCompositeOperation = 'source-over';
      const R0 = cam.range * ts * 0.55, a0 = cam.base - cam.sweep, a1 = cam.base + cam.sweep, cx = cam.ox * ts, cy = cam.oy * ts;
      c.beginPath(); c.arc(cx, cy, R0, a0, a1);
      c.strokeStyle = 'rgba(160,215,255,0.9)'; c.lineWidth = 2 * s; c.setLineDash([5 * s, 4 * s]); c.lineDashOffset = -now * 18 * s; c.stroke(); c.setLineDash([]);
      for (const [an, d] of [[a0, -1], [a1, 1]]) {
        c.save(); c.translate(cx + Math.cos(an) * R0, cy + Math.sin(an) * R0); c.rotate(an + (d * Math.PI) / 2);
        c.beginPath(); c.moveTo(6 * s, 0); c.lineTo(-4 * s, -5 * s); c.lineTo(-4 * s, 5 * s); c.closePath();
        c.fillStyle = 'rgba(160,215,255,0.95)'; c.fill(); c.restore();
      }
    }
    G.guards.forEach((g, i) => {
      if (g.state === 'sleep') return;
      const col = COL[i % COL.length];
      if (g.state !== 'patrol') {
        // 수상해서 다른 데로 가는 중: 지금 가는 길만 주황색
        if (g.route && g.route.length) line([{ x: g.x, y: g.y }, ...g.route], 'rgba(255,150,60,0.95)', 3 * s, [6 * s, 5 * s], -now * 30 * s);
        return;
      }
      // 서 있는 경비: 번갈아 보는 방향을 모두 옅게
      if (g.pts.length < 2) {
        if (g.look.length > 1) {
          c.globalCompositeOperation = 'lighter';
          for (const d of g.look) this.cone(c, g.x, g.y, d, g.T.fov, g.T.range, col, 0.09 * a);
          c.globalCompositeOperation = 'source-over';
        }
        return;
      }
      line(this.peekCache[i], `rgba(${col},0.28)`, 2 * s, [2 * s, 6 * s], 0);
      // 다음에 걸어갈 길 (지금 → 다음 지점 → 그다음 지점)
      const n = g.pts.length, A = g.pts[g.wi], B = g.pts[(g.wi + 1) % n];
      const cur = { x: g.x, y: g.y };
      const next = [cur, ...(g.route && g.route.length ? g.route : leg(cur, A))];
      const after = [A, ...leg(A, B)];
      line(after, `rgba(${col},0.55)`, 2.5 * s, [5 * s, 5 * s], -now * 22 * s);
      line(next, `rgba(${col},0.95)`, 3.5 * s, [7 * s, 5 * s], -now * 30 * s);
      for (let k = 2; k < next.length; k += 3) arrow(next[k - 1], next[k], `rgb(${col})`, 5 * s);
      for (let k = 2; k < after.length; k += 4) arrow(after[k - 1], after[k], `rgba(${col},0.7)`, 4 * s);
      for (const [p, big] of [[A, true], [B, false]]) {
        const [x, y] = P(p);
        c.beginPath(); c.arc(x, y, (big ? 5 : 3.5) * s, 0, 7); c.fillStyle = `rgba(${col},${big ? 0.95 : 0.6})`; c.fill();
        c.lineWidth = 1.5; c.strokeStyle = 'rgba(20,14,30,0.8)'; c.stroke();
      }
    });
    c.restore();
  }
  // 둘러보기: 생선·보너스·경비를 반짝 고리로
  peekRings(c) {
    const G = this.game, ts = this.ts, s = ts / 32, now = performance.now() / 1000;
    const ring = (x, y, col, ph) => {
      const k = (now * 1.2 + ph) % 1;
      c.beginPath(); c.arc(x * ts, y * ts, ts * (0.45 + k * 0.6), 0, 7);
      c.strokeStyle = `rgba(${col},${(1 - k) * 0.9})`; c.lineWidth = 2.5 * s; c.stroke();
    };
    if (!G.fish.taken) ring(G.fish.x, G.fish.y, G.L.golden ? '255,215,90' : '150,215,255', 0);
    G.bonus.forEach((b, i) => { if (!b.taken) ring(b.x, b.y, '255,160,220', 0.3 + i * 0.2); });
    G.guards.forEach((g, i) => { if (g.state !== 'sleep') ring(g.x, g.y - 0.3, '255,236,170', 0.5 + i * 0.17); });
  }
  // 둘러보기: 고양이가 눈을 크게 뜨는 느낌 (가장자리 어둡게, 열리면서 넓어짐)
  peekEye(c) {
    const now = performance.now() / 1000, e = Math.min(1, (now - this.peekT0) / 0.35);
    const o = 1 - Math.pow(1 - e, 3), W = this.W, H = this.H, cx = W / 2, cy = (this.top + H - this.bottom) / 2;
    const rx = W * (0.25 + 0.4 * o), ry = H * (0.12 + 0.36 * o), k = rx / ry;
    c.save(); c.translate(cx, cy); c.scale(1, 1 / k);
    const gr = c.createRadialGradient(0, 0, rx * 0.72, 0, 0, rx * 1.25);
    gr.addColorStop(0, 'rgba(10,8,30,0)'); gr.addColorStop(1, `rgba(10,8,30,${0.75 - 0.2 * o})`);
    c.fillStyle = gr; c.fillRect(-W, -H * k, W * 2, H * 2 * k);
    c.restore();
    c.fillStyle = `rgba(110,150,255,${0.06 * o})`; c.fillRect(0, 0, W, H);
    c.globalAlpha = o; c.font = `14px ${FONT}`; c.textAlign = 'center';
    const msg = '고양이 눈으로 살피는 중 · 손을 떼면 계속';
    const y = this.top + 18, w = c.measureText(msg).width + 26;
    rr(c, cx - w / 2, y - 13, w, 26, 13); c.fillStyle = 'rgba(16,12,34,0.82)'; c.fill();
    c.fillStyle = '#d8e2ff'; c.fillText(msg, cx, y + 5); c.globalAlpha = 1;
  }
  // 맵이 화면보다 길 때, 화면 밖 경비가 어느 쪽에 있는지 가장자리에 화살표로
  edgeMarks(c, t) {
    const G = this.game, ts = this.ts;
    const y0 = this.top, y1 = this.H - this.bottom;
    if (this.mapH <= y1 - y0 + 2) return;
    for (const g of G.guards) {
      const sx = this.ox + g.x * ts, sy = this.oy + g.y * ts;
      const up = sy < y0 + 4, down = sy > y1 - 4;
      if (!up && !down) continue;
      const col = g.state === 'sleep' ? '#9aa3c7' : g.state === 'chase' ? '#ff5d6c' : g.meter > 0.05 || g.state === 'suspicious' || g.state === 'investigate' ? '#ffb347' : '#ffe08c';
      const x = Math.max(16, Math.min(this.W - 16, sx)), y = up ? y0 + 12 : y1 - 12, d = up ? -1 : 1;
      const pulse = g.state === 'chase' ? 1 + Math.sin(t * 10) * 0.15 : 1;
      c.save(); c.translate(x, y); c.scale(pulse, pulse);
      c.globalAlpha = g.state === 'sleep' ? 0.55 : 0.92;
      c.beginPath(); c.moveTo(0, d * 9); c.lineTo(-9, -d * 4); c.lineTo(9, -d * 4); c.closePath();
      c.fillStyle = col; c.fill(); c.lineWidth = 2; c.strokeStyle = '#1a1428'; c.stroke();
      c.restore();
    }
  }
  at(c, x, y, k = 0.92) {
    const s = this.ts / 32;
    c.save();
    c.translate(x * this.ts, y * this.ts);
    c.scale(s * k, s * k);
  }
  cone(c, x, y, face, fov, range, col, alpha) {
    const ts = this.ts, n = 24, g = this.game.grid;
    c.beginPath();
    c.moveTo(x * ts, y * ts);
    for (let i = 0; i <= n; i++) {
      const a = face - fov / 2 + (fov * i) / n;
      const [ex, ey] = g.ray(x, y, a, range);
      c.lineTo(ex * ts, ey * ts);
    }
    c.closePath();
    const gr = c.createRadialGradient(x * ts, y * ts, ts * 0.2, x * ts, y * ts, range * ts);
    gr.addColorStop(0, `rgba(${col},${alpha})`);
    gr.addColorStop(0.75, `rgba(${col},${alpha * 0.55})`);
    gr.addColorStop(1, `rgba(${col},${alpha * 0.2})`);
    c.fillStyle = gr; c.fill();
    c.strokeStyle = `rgba(${col},${alpha * 0.7})`; c.lineWidth = 1; c.stroke();
  }
  // 그림 파일 캐릭터: 발밑(bbox 아래 가운데)을 (x,y)에 맞추고 size(타일) 크기로. 걷기는 통통 튀기·기울이기로 흉내낸다.
  // 위에서 본 그림을 가운데 맞춰 돌려 그리기 (그림이 없으면 false)
  topDown(c, name, x, y, size, ang) {
    const spr = sprite(name);
    if (!spr) return false;
    const ts = this.ts, k = (size * ts) / Math.max(spr.bw, spr.bh);
    c.save(); c.translate(x * ts, y * ts); c.rotate(ang || 0); c.scale(k, k);
    c.drawImage(spr.cv, spr.bx, spr.by, spr.bw, spr.bh, -spr.bw / 2, -spr.bh / 2, spr.bw, spr.bh);
    c.restore();
    return true;
  }
  sprite(c, spr, x, y, size, byHeight, o) {
    if (!spr) return false;
    const ts = this.ts;
    const k = (size * ts) / (byHeight ? spr.bh : spr.bw);
    const ph = o.moving ? (o.walkT || 0) * (o.rate || 3) * Math.PI : 0;
    const bob = o.moving ? -Math.abs(Math.sin(ph)) * (o.amp || 0.09) * ts : 0;
    const tilt = o.moving ? Math.sin(ph) * 0.07 : 0;
    const breathe = o.moving ? 1 : 1 + Math.sin((o.t || 0) * 2.4) * 0.018;
    const fx = x * ts, fy = y * ts;
    c.save();
    c.fillStyle = 'rgba(0,0,0,0.28)';
    c.beginPath(); c.ellipse(fx, fy, spr.bw * k * 0.36, spr.bw * k * 0.1, 0, 0, 7); c.fill();
    c.translate(fx, fy + bob);
    c.rotate(tilt + (o.rot || 0));
    c.scale((o.flip ? -1 : 1) * k, k * breathe);
    c.imageSmoothingQuality = 'high';
    c.drawImage(spr.cv, spr.bx, spr.by, spr.bw, spr.bh, -spr.bw / 2, -spr.bh, spr.bw, spr.bh);
    c.restore();
    return true;
  }
  drawGuard(c, g, t) {
    const fx = Math.cos(g.face), fy = Math.sin(g.face);
    const flip = fx < 0;
    if (g.type === 'dog') {
      const sleep = g.state === 'sleep';
      if (this.sprite(c, sprite(sleep ? 'sprite-dog-sleep' : 'sprite-dog'), g.x, g.y + 0.3, 1.15, false, { t, moving: g.moving, walkT: g.walkT, rate: 2.6, flip })) return;
    } else {
      let pose = '';
      if (g.state === 'chase') pose = '-alert';
      else if (Math.abs(fx) > Math.abs(fy)) pose = '-side';
      else if (fy < 0) pose = '-back';
      const spr = sprite('sprite-' + g.type + pose) || sprite('sprite-' + g.type);
      if (this.sprite(c, spr, g.x, g.y + 0.3, 1.32, true, { t, moving: g.moving, walkT: g.walkT, rate: 2.2, amp: 0.06, flip: pose === '-side' && flip })) return;
    }
    this.at(c, g.x, g.y + 0.22);
    const o = { face: g.face, t, moving: g.moving, walkT: g.walkT, state: g.state, type: g.type, sleep: g.state === 'sleep', ch: this.game.L.ch };
    if (g.type === 'dog') drawDog(c, o); else if (g.type === 'robot') drawRobot(c, o); else drawHuman(c, o);
    c.restore();
  }
  drawCatNow(c, t) {
    const G = this.game, cat = G.cat, s = this.ts / 32;
    const tile = G.grid.c(Math.floor(cat.x), Math.floor(cat.y));
    const o = { skin: this.skin, t, face: cat.face, moving: cat.moving, run: cat.run, walkT: cat.walkT, fish: cat.hasFish, golden: G.L.golden };
    if (G.state === 'caught') { o.moving = false; }
    const spr = sprite(cat.hasFish ? 'sprite-cat-fish' : this.skin && this.skin.crown && IMG['sprite-cat-king'] ? 'sprite-cat-king' : 'sprite-cat', this.skin, cat.hasFish && G.L.golden);
    const so = { t, moving: o.moving, walkT: cat.walkT, rate: cat.run ? 2.6 : 3.2, amp: cat.run ? 0.12 : 0.07, flip: cat.face < 0 };
    if (cat.riding) {
      if (spr) { this.sprite(c, spr, cat.x, cat.y - 0.02, 0.85, false, so); return; }
      this.at(c, cat.x, cat.y + 0.12, 0.8); c.translate(0, -5); drawCat(c, o); c.restore();
      return;
    }
    if ((tile === 'B' || tile === 'V') && cat.hidden) {
      this.at(c, Math.floor(cat.x) + 0.5, Math.floor(cat.y) + 0.62); drawCatPeek(c, o); c.restore();
      return;
    }
    // 고양이 위치를 찾기 쉽게 발밑에 은은한 동그라미
    c.fillStyle = cat.hidden ? 'rgba(160,255,190,0.18)' : 'rgba(255,255,255,0.13)';
    c.beginPath(); c.ellipse(cat.x * this.ts, (cat.y + 0.22) * this.ts, 13 * s, 5 * s, 0, 0, 7); c.fill();
    if (cat.hidden) c.globalAlpha = tile === 'C' ? 0.75 : 0.5;
    if (spr) {
      if (G.state === 'caught') so.rot = Math.sin(t * 30) * 0.06;
      this.sprite(c, spr, cat.x, cat.y + 0.24, 1.08, false, so);
    } else {
      this.at(c, cat.x, cat.y + 0.22, 0.88);
      if (G.state === 'caught') c.rotate(Math.sin(t * 30) * 0.05);
      drawCat(c, o);
      c.restore();
    }
    c.globalAlpha = 1;
    if (this.skin && this.skin.crown && !(this.skin && IMG['sprite-cat-king'])) { this.at(c, cat.x + cat.face * 0.12, cat.y - 0.55, 0.7); drawBonus(c, 'crown', 0); c.restore(); }
    if (cat.hidden && tile !== 'C') {
      c.font = `${Math.round(10 * Math.max(0.9, s))}px ${FONT}`; c.textAlign = 'center';
      c.fillStyle = 'rgba(170,255,200,0.9)'; c.fillText('숨는 중', cat.x * this.ts, (cat.y - 0.55) * this.ts);
    }
  }
  drawCam(c, cam, t) {
    const ts = this.ts, s = ts / 32, G = this.game;
    c.save();
    c.translate(cam.ox * ts, cam.oy * ts);
    rr(c, -4 * s + cam.wall.x * 4 * s, -4 * s + cam.wall.y * 4 * s, 8 * s, 8 * s, 2 * s);
    c.fillStyle = '#4a5068'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1; c.stroke();
    c.rotate(cam.ang);
    rr(c, -3 * s, -4 * s, 12 * s, 8 * s, 2 * s);
    c.fillStyle = G.power ? '#d9dde6' : '#7a7f8c'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.2; c.stroke();
    ell(c, 9 * s, 0, 2.4 * s, 3 * s, '#1c2030', OUT, 1);
    if (G.power) ell(c, -0.5 * s, -2 * s, 1.3 * s, 1.3 * s, cam.alarmT > 0 || Math.sin(t * 5) > 0 ? '#ff3b4f' : '#5a1820');
    c.restore();
  }
  bubble(c, x, y, b, meter, t) {
    const ts = this.ts, s = Math.max(0.85, ts / 32);
    const X = x * ts, Y = y * ts;
    c.save();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    if (b.kind === 'z') {
      c.font = `${Math.round(11 * s)}px ${FONT}`;
      for (let i = 0; i < 3; i++) {
        const p = ((t * 0.5 + i / 3) % 1);
        c.globalAlpha = Math.sin(p * Math.PI);
        c.fillStyle = '#cfe0ff';
        c.fillText('z', X + 6 * s + p * 10 * s, Y + 8 * s - p * 18 * s);
      }
      c.restore();
      return;
    }
    if (b.kind === '?' || b.kind === '!') {
      const r = 10 * s;
      const red = b.kind === '!';
      c.beginPath(); c.arc(X, Y, r, 0, 7);
      c.fillStyle = red ? '#ff4d5e' : '#fff6dc'; c.fill();
      if (!red && meter > 0) {
        c.save(); c.clip();
        c.fillStyle = meter > 0.66 ? '#ff7a4d' : '#ffc94d';
        c.fillRect(X - r, Y + r - 2 * r * meter, 2 * r, 2 * r * meter);
        c.restore();
      }
      c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
      c.font = `${Math.round(15 * s)}px ${FONT}`;
      c.fillStyle = red ? '#fff' : '#3a2730';
      c.fillText(red ? '!' : '?', X, Y + 1);
      if (b.text && b.text !== '?' && b.text !== '!') this.say(c, X, Y - r - 12 * s, b.text, s, red);
      c.restore();
      return;
    }
    this.say(c, X, Y, b.text, s, false, b.kind === 'cat');
    c.restore();
  }
  say(c, X, Y, text, s, red, cat) {
    c.font = `${Math.round(11 * s)}px ${FONT}`;
    const w = c.measureText(text).width + 12 * s, h = 18 * s;
    rr(c, X - w / 2, Y - h / 2, w, h, 8 * s);
    c.fillStyle = cat ? '#ffe3f1' : red ? '#ffe1e4' : 'rgba(255,255,255,0.94)'; c.fill();
    c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke();
    c.beginPath(); c.moveTo(X - 3 * s, Y + h / 2 - 0.5); c.lineTo(X, Y + h / 2 + 5 * s); c.lineTo(X + 3 * s, Y + h / 2 - 0.5); c.fill();
    c.fillStyle = '#2a1f2e'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, X, Y + 0.5);
  }
  drawJoy(c, j) {
    const R = j.R;
    c.save();
    c.beginPath(); c.arc(j.ox, j.oy, R, 0, 7);
    c.fillStyle = 'rgba(255,255,255,0.07)'; c.fill();
    c.lineWidth = 2; c.strokeStyle = 'rgba(255,190,90,0.45)'; c.stroke();
    c.beginPath(); c.arc(j.ox, j.oy, R * j.runAt, 0, 7);
    c.setLineDash([4, 5]); c.strokeStyle = 'rgba(160,240,140,0.6)'; c.stroke(); c.setLineDash([]);
    const kx = j.ox + j.dx * j.mag * R, ky = j.oy + j.dy * j.mag * R;
    c.beginPath(); c.arc(kx, ky, 20, 0, 7);
    c.fillStyle = j.run ? 'rgba(255,170,70,0.85)' : 'rgba(160,240,140,0.8)'; c.fill();
    c.lineWidth = 2; c.strokeStyle = 'rgba(30,20,40,0.6)'; c.stroke();
    c.font = `12px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#2a1f2e';
    c.fillText(j.run ? '달리기' : '살금', kx, ky + 1);
    c.restore();
  }
}

function shadeHex(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
