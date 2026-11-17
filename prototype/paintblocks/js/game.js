// 게임 판: 완성 그림 카드, 물감 판, 블록 서랍을 캔버스 하나에 그리고 끌어 놓기를 처리한다.
import { MIX, rot, dims, key, paint } from './gen.js?v=1117202354';
import { Sound } from './audio.js?v=1117202354';
import { tr, tf, fontStack } from './i18n.js?v=1117202354';
import { IMG, CELL, nine } from './assets.js?v=1117202354';

const EDGE = { 1: '#a9232a', 2: '#b98b0c', 4: '#1d4f9c' };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// 글자가 maxW 보다 넓으면 글꼴을 줄여서 쓴다
function fitText(ctx, text, x, y, maxW, size) {
  ctx.font = `${size}px ${fontStack()}`;
  const w = ctx.measureText(text).width;
  if (w > maxW) ctx.font = `${Math.max(8, size * maxW / w)}px ${fontStack()}`;
  ctx.fillText(text, x, y);
}
const inRect = (x, y, r) => r && x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h;

function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function paintCell(ctx, x, y, s, m, r) {
  const im = IMG[CELL[m]];
  if (im) { ctx.drawImage(im, x, y, s, s); return; }
  ctx.fillStyle = MIX[m];
  rr(ctx, x, y, s, s, r); ctx.fill();
  const g = ctx.createLinearGradient(x, y, x + s, y + s);
  g.addColorStop(0, 'rgba(255,255,255,.34)');
  g.addColorStop(0.45, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,.12)');
  ctx.fillStyle = g; ctx.fill();
}

// 블록 바깥 테두리를 안쪽으로 조금 들여서 그린다 (겹친 블록도 모양이 보이도록).
function outline(ctx, cells, ox, oy, cs, ins) {
  const S = new Set(cells.map(([x, y]) => x + ',' + y));
  const has = (x, y) => S.has(x + ',' + y);
  const end = (along, diag) => (!along ? ins : diag ? -ins : 0);
  ctx.beginPath();
  for (const [x, y] of cells) {
    const X = ox + x * cs, Y = oy + y * cs;
    if (!has(x, y - 1)) { const a = end(has(x - 1, y), has(x - 1, y - 1)), b = end(has(x + 1, y), has(x + 1, y - 1)); ctx.moveTo(X + a, Y + ins); ctx.lineTo(X + cs - b, Y + ins); }
    if (!has(x, y + 1)) { const a = end(has(x - 1, y), has(x - 1, y + 1)), b = end(has(x + 1, y), has(x + 1, y + 1)); ctx.moveTo(X + a, Y + cs - ins); ctx.lineTo(X + cs - b, Y + cs - ins); }
    if (!has(x - 1, y)) { const a = end(has(x, y - 1), has(x - 1, y - 1)), b = end(has(x, y + 1), has(x - 1, y + 1)); ctx.moveTo(X + ins, Y + a); ctx.lineTo(X + ins, Y + cs - b); }
    if (!has(x + 1, y)) { const a = end(has(x, y - 1), has(x + 1, y - 1)), b = end(has(x, y + 1), has(x + 1, y + 1)); ctx.moveTo(X + cs - ins, Y + a); ctx.lineTo(X + cs - ins, Y + cs - b); }
  }
  ctx.stroke();
}

function drawPiece(ctx, p, ox, oy, cs, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const gap = Math.max(1, cs * 0.04);
  for (const [x, y] of p.cells) paintCell(ctx, ox + x * cs + gap, oy + y * cs + gap, cs - gap * 2, p.color, cs * 0.16);
  ctx.strokeStyle = EDGE[p.color]; ctx.lineWidth = Math.max(1.5, cs * 0.07); ctx.lineCap = 'round';
  outline(ctx, p.cells, ox, oy, cs, gap + ctx.lineWidth / 2);
  ctx.restore();
}

// 완성 그림 작은 그림 (목록 썸네일·완성 화면용)
export function drawArt(canvas, puz, size) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr);
  canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  miniGrid(ctx, puz, 0, 0, size);
}

function miniGrid(ctx, puz, x, y, s) {
  const n = puz.n, c = s / n, holes = new Set(puz.holes), gap = Math.max(0.6, c * 0.05);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const k = j * n + i, cx = x + i * c + gap, cy = y + j * c + gap, w = c - gap * 2;
    if (holes.has(k)) {
      if (IMG.hole) ctx.drawImage(IMG.hole, cx, cy, w, w);
      else { ctx.fillStyle = '#4a3f4d'; rr(ctx, cx, cy, w, w, c * 0.2); ctx.fill(); }
    } else if (puz.target[k]) paintCell(ctx, cx, cy, w, puz.target[k], c * 0.16);
    else { ctx.fillStyle = '#efe5d5'; rr(ctx, cx, cy, w, w, c * 0.16); ctx.fill(); }
  }
}

export class Game {
  constructor(cv, hooks = {}) {
    Object.assign(this, { cv, hooks, ctx: cv.getContext('2d'), active: false, parts: [], last: 0, W: 0, H: 0, now: 0 });
    cv.addEventListener('pointerdown', e => this.down(e));
    cv.addEventListener('pointermove', e => this.move(e));
    cv.addEventListener('pointerup', e => this.up(e, false));
    cv.addEventListener('pointercancel', e => this.up(e, true));
    new ResizeObserver(() => this.resize()).observe(cv);
    const loop = ts => { this.frame(ts / 1000); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  load(puz) {
    this.puz = puz; this.n = puz.n; this.rotate = !!puz.rotate;
    this.holes = new Set(puz.holes);
    this.pieces = puz.pieces.map((p, id) => ({ id, color: p.color, cells: p.cells.map(c => [...c]), sol: p.sol, placed: false, x: 0, y: 0, locked: false }));
    this.order = []; this.hist = []; this.drag = null; this.won = false; this.winT = 0;
    this.hints = 0; this.t0 = performance.now(); this.parts = []; this.warned = false; this.rotWarned = false;
    this.active = true;
    this.resize();
    this.changed();
  }

  // ---------- 상태 ----------
  snap() { return { p: this.pieces.map(p => ({ placed: p.placed, x: p.x, y: p.y, cells: p.cells, locked: p.locked })), o: [...this.order] }; }
  restore(s) { s.p.forEach((q, i) => Object.assign(this.pieces[i], q)); this.order = [...s.o]; }
  push(s) { this.hist.push(s); if (this.hist.length > 300) this.hist.shift(); }
  changed() { this.hooks.onChange?.(); }
  get canUndo() { return !this.won && this.hist.length > 0; }

  undo() {
    if (this.won || this.drag || !this.hist.length) return;
    this.restore(this.hist.pop()); Sound.play('undo'); this.changed();
  }
  reset() {
    if (this.won || this.drag) return;
    if (!this.pieces.some(p => p.placed && !p.locked)) return;
    this.push(this.snap());
    for (const p of this.pieces) if (!p.locked) p.placed = false;
    this.order = this.order.filter(id => this.pieces[id].locked);
    Sound.play('undo'); this.changed();
  }
  hint() {
    if (this.won || this.drag) return false;
    const atSol = p => p.placed && p.x === p.sol.x && p.y === p.sol.y && key(p.cells) === key(p.sol.cells);
    const cand = this.pieces.filter(p => !p.locked && !atSol(p));
    if (!cand.length) return false;
    const p = cand.find(q => !q.placed) || cand[0];
    this.push(this.snap());
    Object.assign(p, { cells: p.sol.cells.map(c => [...c]), x: p.sol.x, y: p.sol.y, placed: true, locked: true });
    this.order = this.order.filter(i => i !== p.id).concat(p.id);
    this.hints++;
    Sound.play('hint'); this.splash(p, 10); this.changed(); this.check();
    return true;
  }

  grid(extra) {
    const list = this.pieces.filter(p => p.placed && !(this.drag && this.drag.moved && this.drag.id === p.id));
    if (extra) list.push(extra);
    return paint(this.n, list);
  }
  fits(cells, x, y) {
    const n = this.n;
    return cells.every(([a, b]) => x + a >= 0 && y + b >= 0 && x + a < n && y + b < n && !this.holes.has((y + b) * n + x + a));
  }
  check() {
    const { mix } = this.grid(), t = this.puz.target;
    for (let i = 0; i < mix.length; i++) if (mix[i] !== t[i]) return;
    if (this.pieces.some(p => !p.placed)) {
      if (!this.warned) { this.warned = true; this.hooks.toast?.('남은 블록도 모두 써야 완성이에요'); }
      return;
    }
    this.won = true; this.winT = this.now;
    this.time = (performance.now() - this.t0) / 1000;
    Sound.play('win'); this.confetti(); this.changed();
    setTimeout(() => this.hooks.onWin?.({ hints: this.hints, time: this.time }), 1150);
  }
  progress() {
    const { mix } = this.grid(), t = this.puz.target;
    let ok = 0, all = 0;
    for (let i = 0; i < t.length; i++) { if (this.holes.has(i)) continue; all++; if (mix[i] === t[i]) ok++; }
    return [ok, all];
  }

  // ---------- 배치 ----------
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const W = this.cv.clientWidth, H = this.cv.clientHeight;
    if (!W || !H) return;
    this.dpr = dpr; this.W = W; this.H = H;
    this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr);
    this.layout();
  }
  layout() {
    if (!this.puz || !this.W) return;
    const W = this.W, H = this.H, n = this.n, k = this.pieces.length;
    const pad = clamp(Math.min(W, H) * 0.035, 10, 24);
    // 판 틀 두께 + 틀과 칸 사이
    this.frameT = IMG['board-frame'] ? clamp(Math.min(W, H) * 0.035, 10, 22) : 0;
    this.frameGap = IMG['board-frame'] ? 5 : 0;
    const fx = this.frameT + this.frameGap;
    if (H >= W * 1.05) {
      const tg = Math.round(clamp(Math.min(H * 0.16, W * 0.3), 74, 140));
      this.tgtR = { x: pad, y: pad * 0.5, w: W - pad * 2, h: tg };
      const trayH = Math.max(H * 0.25, 140);
      let bs = Math.min(W - pad * 2 - fx * 2, H - this.tgtR.y - tg - pad * 1.6 - trayH - fx * 2, 560);
      bs = Math.max(bs, 140);
      this.board = { x: (W - bs) / 2, y: this.tgtR.y + tg + pad + fx, s: bs };
      const ty = this.board.y + bs + fx + pad * 0.6;
      this.trayR = { x: pad * 0.5, y: ty, w: W - pad, h: H - ty - pad * 0.4 };
    } else {
      let bs = Math.min(H - pad * 2 - fx * 2, W * 0.46, 640);
      this.board = { x: (W - bs) / 2, y: (H - bs) / 2, s: bs };
      const colW = this.board.x - fx - pad * 2;
      const th = Math.min(colW * 1.25, H - pad * 2);
      this.tgtR = { x: pad, y: Math.max(pad, (H - th) / 2), w: colW, h: th };
      const tx = this.board.x + bs + fx + pad;
      this.trayR = { x: tx, y: pad, w: W - tx - pad * 0.6, h: H - pad * 2 };
    }
    this.cs = this.board.s / n;
    // 서랍 칸 나누기
    const T = this.trayR;
    let best = { s: 0 };
    for (let c = 1; c <= k; c++) {
      const r = Math.ceil(k / c), s = Math.min(T.w / c, T.h / r);
      if (s > best.s) best = { s, c, r };
    }
    const { s, c, r } = best;
    const x0 = T.x + (T.w - c * s) / 2, y0 = T.y + (T.h - r * s) / 2;
    this.slots = this.pieces.map((p, i) => {
      // 마지막 줄은 가운데로
      const row = Math.floor(i / c), inRow = row === r - 1 ? k - row * c : c;
      const xr = x0 + (c - inRow) * s / 2;
      return { x: xr + (i % c) * s, y: y0 + row * s, w: s, h: s };
    });
    const span = Math.max(...this.pieces.map(p => Math.max(...dims(p.cells))));
    this.tcs = Math.min(this.cs * 0.8, s * 0.8 / span);
  }
  trayOrigin(p) {
    const sl = this.slots[p.id], [w, h] = dims(p.cells);
    return { x: sl.x + sl.w / 2 - w * this.tcs / 2, y: sl.y + sl.h / 2 - h * this.tcs / 2 };
  }

  // ---------- 입력 ----------
  pt(e) { const r = this.cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }

  down(e) {
    if (!this.active || this.won || this.drag || !this.puz) return;
    Sound.unlock();
    const [px, py] = this.pt(e), b = this.board, cs = this.cs;
    const gx = Math.floor((px - b.x) / cs), gy = Math.floor((py - b.y) / cs);
    let hit = null, from, offX, offY;
    for (let k = this.order.length - 1; k >= 0; k--) {
      const p = this.pieces[this.order[k]];
      if (p.cells.some(([x, y]) => p.x + x === gx && p.y + y === gy)) { hit = p; break; }
    }
    if (hit) {
      if (hit.locked) { Sound.play('bad'); hit.shake = this.now; this.hooks.toast?.('힌트로 놓은 블록은 고정이에요'); return; }
      from = 'board'; offX = (px - b.x) / cs - hit.x; offY = (py - b.y) / cs - hit.y;
    } else {
      hit = this.pieces.find(p => !p.placed && inRect(px, py, this.slots[p.id]));
      if (!hit) return;
      from = 'tray';
      const o = this.trayOrigin(hit), [w, h] = dims(hit.cells);
      offX = clamp((px - o.x) / this.tcs, 0, w); offY = clamp((py - o.y) / this.tcs, 0, h);
    }
    try { this.cv.setPointerCapture(e.pointerId); } catch (_) { /* 무시 */ }
    this.drag = {
      id: hit.id, p: hit, from, offX, offY, sx: px, sy: py, px, py, moved: false, t: performance.now(),
      touch: e.pointerType !== 'mouse', pid: e.pointerId, near: false, ok: false,
      scale: from === 'tray' ? this.tcs : cs, before: this.snap(),
    };
  }
  move(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.pid) return;
    [d.px, d.py] = this.pt(e);
    if (!d.moved && Math.hypot(d.px - d.sx, d.py - d.sy) > 7) { d.moved = true; Sound.play('pick'); }
    if (d.moved) this.snapCalc();
  }
  lift() { return this.drag && this.drag.touch ? this.cs * 0.8 : 0; }
  snapCalc() {
    const d = this.drag, p = d.p, b = this.board, cs = this.cs, n = this.n;
    const [w, h] = dims(p.cells);
    const fx = (d.px - b.x) / cs - d.offX, fy = (d.py - this.lift() - b.y) / cs - d.offY;
    const x = clamp(Math.round(fx), 0, n - w), y = clamp(Math.round(fy), 0, n - h);
    d.near = Math.abs(x - fx) <= 1.1 && Math.abs(y - fy) <= 1.1;
    d.gx = x; d.gy = y;
    d.ok = d.near && this.fits(p.cells, x, y);
  }
  up(e, cancel) {
    const d = this.drag;
    if (!d || e.pointerId !== d.pid) return;
    this.drag = null;
    const p = d.p;
    if (!d.moved) {
      if (!cancel && performance.now() - d.t < 600) this.tapRotate(p, d.before);
      return;
    }
    if (!cancel && d.ok) {
      if (!p.placed || p.x !== d.gx || p.y !== d.gy) this.push(d.before);
      p.placed = true; p.x = d.gx; p.y = d.gy;
      this.order = this.order.filter(i => i !== p.id).concat(p.id);
      Sound.play('drop'); this.splash(p, 3); this.changed(); this.check();
    } else if (!cancel && d.near && p.placed) {
      Sound.play('bad'); // 구멍 위: 원래 자리로
    } else {
      if (d.near) Sound.play('bad');
      if (p.placed) {
        this.push(d.before); p.placed = false;
        this.order = this.order.filter(i => i !== p.id);
        if (!d.near) Sound.play('back');
        this.changed();
      }
    }
  }
  tapRotate(p, before) {
    if (!this.rotate) {
      Sound.play('bad'); p.shake = this.now;
      if (!this.rotWarned) { this.rotWarned = true; this.hooks.toast?.('블록 돌리기는 3장부터 열려요'); }
      return;
    }
    const nc = rot(p.cells);
    this.push(before);
    p.spin = this.now;
    if (!p.placed) { p.cells = nc; Sound.play('rot'); this.changed(); return; }
    const [w, h] = dims(p.cells), [w2, h2] = dims(nc);
    const bx = p.x + Math.floor((w - w2) / 2), by = p.y + Math.floor((h - h2) / 2);
    const tries = [[0, 0], [0, -1], [-1, 0], [1, 0], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1], [0, -2], [-2, 0], [2, 0], [0, 2]];
    for (const [dx, dy] of tries) {
      if (this.fits(nc, bx + dx, by + dy)) {
        Object.assign(p, { cells: nc, x: bx + dx, y: by + dy });
        this.order = this.order.filter(i => i !== p.id).concat(p.id);
        Sound.play('rot'); this.changed(); this.check();
        return;
      }
    }
    p.cells = nc; p.placed = false;
    this.order = this.order.filter(i => i !== p.id);
    Sound.play('back'); this.changed();
  }

  // ---------- 효과 ----------
  splash(p, per) {
    const cs = this.cs, b = this.board;
    for (const [x, y] of p.cells) for (let i = 0; i < per; i++) {
      const a = Math.random() * Math.PI * 2, v = cs * (1 + Math.random() * 2.5);
      this.parts.push({ x: b.x + (p.x + x + 0.5) * cs, y: b.y + (p.y + y + 0.5) * cs, vx: Math.cos(a) * v, vy: Math.sin(a) * v - cs, r: cs * (0.04 + Math.random() * 0.06), c: MIX[p.color], life: 0.45 + Math.random() * 0.25, g: cs * 6 });
    }
  }
  confetti() {
    const b = this.board, cols = Object.values(MIX).slice(1);
    for (let i = 0; i < 90; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.8, v = b.s * (0.8 + Math.random() * 1.2);
      this.parts.push({ x: b.x + b.s * Math.random(), y: b.y + b.s * (0.3 + Math.random() * 0.4), vx: Math.cos(a) * v * 0.6, vy: Math.sin(a) * v, r: b.s * (0.008 + Math.random() * 0.014), c: cols[i % cols.length], life: 1.2 + Math.random() * 0.8, g: b.s * 1.6 });
    }
  }

  // ---------- 그리기 ----------
  frame(t) {
    const dt = Math.min(0.05, t - (this.last || t));
    this.last = t; this.now = t;
    if (!this.active || !this.puz || !this.W) return;
    for (const q of this.parts) { q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; }
    this.parts = this.parts.filter(q => q.life > 0);
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    const d = this.drag;
    const extra = d && d.moved && d.ok ? { cells: d.p.cells, x: d.gx, y: d.gy, color: d.p.color } : null;
    const g = this.grid(extra);
    this.drawTarget(g.mix);
    this.drawBoard(g.mix, extra);
    this.drawTray();
    this.drawDrag();
    for (const q of this.parts) {
      ctx.globalAlpha = clamp(q.life * 2.5, 0, 1);
      ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  card(r, rad) {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = 'rgba(80,56,30,.18)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#fffaf1'; rr(ctx, r.x, r.y, r.w, r.h, rad); ctx.fill();
    ctx.restore();
  }

  drawTarget(mix) {
    const ctx = this.ctx, r = this.tgtR, t = this.puz.target;
    this.card(r, 14);
    const [ok, all] = this.progress();
    const mixes = [3, 6, 5, 7].filter(m => t.includes(m));
    const horiz = r.w > r.h * 1.5;
    ctx.textBaseline = 'middle';
    if (horiz) {
      const gs = r.h - 18, gx = r.x + (r.w - gs) / 2, gy = r.y + 9;
      this.framedMini(gx, gy, gs);
      ctx.fillStyle = '#3b3340';
      // 왼쪽: 이름과 진행
      const lw = gx - r.x - 12, fs = clamp(lw * 0.15, 11, 18);
      ctx.textAlign = 'center';
      fitText(ctx, tr('완성 그림'), r.x + 6 + lw / 2, r.y + r.h * 0.36, lw - 4, fs);
      ctx.fillStyle = ok === all ? '#2f9a55' : '#8a7c6d';
      fitText(ctx, `${ok} / ${all}`, r.x + 6 + lw / 2, r.y + r.h * 0.66, lw - 4, fs * 1.15);
      // 오른쪽: 색 섞기 표
      this.legend(mixes, gx + gs + 10, r.y + 8, r.x + r.w - (gx + gs + 18), r.h - 16);
    } else {
      const fs = clamp(r.w * 0.09, 12, 20);
      ctx.fillStyle = '#3b3340'; ctx.textAlign = 'center';
      fitText(ctx, tr('완성 그림'), r.x + r.w / 2, r.y + fs * 1.1, r.w - 16, fs);
      const legH = mixes.length ? Math.min(r.h * 0.3, mixes.length * fs * 1.5) : 0;
      const gs = Math.min(r.w - 24, r.h - fs * 4.2 - legH);
      const gx = r.x + (r.w - gs) / 2, gy = r.y + fs * 2.1;
      this.framedMini(gx, gy, gs);
      ctx.fillStyle = ok === all ? '#2f9a55' : '#8a7c6d';
      fitText(ctx, tf('{ok} / {all} 칸', { ok, all }), r.x + r.w / 2, gy + gs + fs * 1.1, r.w - 16, fs * 1.1);
      if (legH) this.legend(mixes, r.x + 12, gy + gs + fs * 1.9, r.w - 24, legH);
    }
  }
  // 완성 그림: 작은 액자 안에 그린다 (액자 그림이 없으면 그냥)
  framedMini(x, y, s) {
    const ctx = this.ctx, fr = IMG['target-frame'];
    if (!fr) { miniGrid(ctx, this.puz, x, y, s); return; }
    const t = Math.max(5, s * 0.075), inset = t * 0.9 + 1;
    ctx.fillStyle = '#fbf5ea'; ctx.fillRect(x + t * 0.5, y + t * 0.5, s - t, s - t);
    miniGrid(ctx, this.puz, x + inset, y + inset, s - inset * 2);
    nine(ctx, fr, 48, x, y, s, s, t);
  }
  legend(mixes, x, y, w, h) {
    if (!mixes.length || w < 40) return;
    const ctx = this.ctx;
    const rowH = Math.min(h / mixes.length, 30), sq = Math.min(rowH * 0.74, w / 6);
    const right = x + Math.min(w, sq * 6.2) + Math.max(0, (w - sq * 6.2) / 2);
    ctx.textAlign = 'center';
    mixes.forEach((m, i) => {
      const cy = y + (h - rowH * mixes.length) / 2 + rowH * (i + 0.5);
      const parts = [1, 2, 4].filter(b => m & b);
      // 오른쪽부터: 결과 = 앞 색들
      let cx = right - sq;
      paintCell(ctx, cx, cy - sq / 2, sq, m, sq * 0.2);
      const sign = (t, at) => { ctx.fillStyle = '#6f6253'; ctx.font = `${sq * 0.95}px ${fontStack()}`; ctx.fillText(t, at, cy + sq * 0.05); };
      cx -= sq * 0.7; sign('=', cx + sq * 0.35);
      for (let j = parts.length - 1; j >= 0; j--) {
        cx -= sq; paintCell(ctx, cx, cy - sq / 2, sq, parts[j], sq * 0.2);
        if (j > 0) { cx -= sq * 0.6; sign('+', cx + sq * 0.3); }
      }
    });
  }

  drawBoard(mix, extra) {
    const ctx = this.ctx, { x: bx, y: by, s } = this.board, n = this.n, cs = this.cs, t = this.puz.target;
    const fr = IMG['board-frame'];
    if (fr) {
      const g = this.frameGap, t = this.frameT;
      ctx.save(); ctx.shadowColor = 'rgba(80,56,30,.22)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5;
      ctx.fillStyle = '#fbf5ea'; ctx.fillRect(bx - g - 2, by - g - 2, s + (g + 2) * 2, s + (g + 2) * 2);
      ctx.restore();
      nine(ctx, fr, 64, bx - g - t, by - g - t, s + (g + t) * 2, s + (g + t) * 2, t);
    } else this.card({ x: bx - 8, y: by - 8, w: s + 16, h: s + 16 }, 16);
    const gap = Math.max(1, cs * 0.045);
    const winAge = this.won ? this.now - this.winT : -1;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const k = j * n + i;
      let X = bx + i * cs + gap, Y = by + j * cs + gap, w = cs - gap * 2;
      if (winAge >= 0) {
        const ph = winAge - (i + j) * 0.05;
        if (ph > 0 && ph < 0.36) { const sc = 1 + 0.2 * Math.sin(ph / 0.36 * Math.PI); X -= w * (sc - 1) / 2; Y -= w * (sc - 1) / 2; w *= sc; }
      }
      if (this.holes.has(k)) {
        if (IMG.hole) { ctx.drawImage(IMG.hole, X, Y, w, w); continue; }
        ctx.fillStyle = '#4a3f4d'; rr(ctx, X, Y, w, w, cs * 0.18); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = Math.max(1.5, cs * 0.05); ctx.lineCap = 'round';
        const m = w * 0.32; ctx.beginPath();
        ctx.moveTo(X + m, Y + m); ctx.lineTo(X + w - m, Y + w - m); ctx.moveTo(X + w - m, Y + m); ctx.lineTo(X + m, Y + w - m); ctx.stroke();
        continue;
      }
      if (mix[k]) paintCell(ctx, X, Y, w, mix[k], cs * 0.16);
      else { ctx.fillStyle = '#efe5d5'; rr(ctx, X, Y, w, w, cs * 0.16); ctx.fill(); }
      // 칸 속 점: 이 칸에 와야 할 색 (맞으면 사라짐)
      if (!this.won && mix[k] !== t[k]) {
        const ds = cs * 0.3, dx = bx + (i + 0.5) * cs - ds / 2, dy = by + (j + 0.5) * cs - ds / 2;
        if (t[k]) {
          ctx.fillStyle = MIX[t[k]]; rr(ctx, dx, dy, ds, ds, ds * 0.3); ctx.fill();
          ctx.strokeStyle = '#fffaf1'; ctx.lineWidth = Math.max(1.5, cs * 0.045); ctx.stroke();
        } else {
          ctx.fillStyle = '#fffaf1'; ctx.beginPath(); ctx.arc(dx + ds / 2, dy + ds / 2, ds * 0.42, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#a99a8a'; ctx.lineWidth = Math.max(1.2, cs * 0.035); ctx.stroke();
        }
      }
    }
    // 놓인 블록 테두리
    ctx.lineCap = 'round';
    for (const id of this.order) {
      const p = this.pieces[id];
      if (this.drag && this.drag.moved && this.drag.id === id) continue;
      let ox = bx + p.x * cs, oy = by + p.y * cs;
      if (p.shake && this.now - p.shake < 0.3) ox += Math.sin((this.now - p.shake) * 60) * cs * 0.06;
      const lw = Math.max(2, cs * 0.075);
      ctx.strokeStyle = EDGE[p.color]; ctx.lineWidth = lw;
      outline(ctx, p.cells, ox, oy, cs, gap + lw / 2 + 1);
      if (p.locked) {
        const [cx, cy] = p.cells[0];
        const px = ox + (cx + 0.5) * cs, py = oy + (cy + 0.5) * cs;
        ctx.fillStyle = '#fffaf1'; ctx.beginPath(); ctx.arc(px, py, cs * 0.13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = EDGE[p.color]; ctx.beginPath(); ctx.arc(px, py, cs * 0.07, 0, Math.PI * 2); ctx.fill();
      }
    }
    // 놓일 자리 미리보기
    if (extra) {
      ctx.save();
      ctx.setLineDash([cs * 0.12, cs * 0.1]);
      ctx.strokeStyle = '#3b3340'; ctx.lineWidth = Math.max(2, cs * 0.06);
      outline(ctx, extra.cells, bx + extra.x * cs, by + extra.y * cs, cs, gap + 2);
      ctx.restore();
    }
  }

  drawTray() {
    const ctx = this.ctx;
    for (const p of this.pieces) {
      const sl = this.slots[p.id];
      const lifted = this.drag && this.drag.id === p.id;
      if (p.placed || (lifted && this.drag.moved)) {
        // 빈 자리: 흐린 모양만
        const o = this.trayOrigin(p);
        ctx.save(); ctx.globalAlpha = 0.13;
        ctx.fillStyle = MIX[p.color];
        for (const [x, y] of p.cells) { rr(ctx, o.x + x * this.tcs + 2, o.y + y * this.tcs + 2, this.tcs - 4, this.tcs - 4, this.tcs * 0.16); ctx.fill(); }
        ctx.restore();
        continue;
      }
      let { x, y } = this.trayOrigin(p);
      let cs = this.tcs;
      const [w, h] = dims(p.cells);
      if (lifted) { const k = 1.08; x -= w * cs * (k - 1) / 2; y -= h * cs * (k - 1) / 2; cs *= k; }
      if (p.shake && this.now - p.shake < 0.3) x += Math.sin((this.now - p.shake) * 60) * cs * 0.08;
      if (p.spin && this.now - p.spin < 0.18) {
        const a = (1 - (this.now - p.spin) / 0.18) * -Math.PI / 2;
        ctx.save(); ctx.translate(sl.x + sl.w / 2, sl.y + sl.h / 2); ctx.rotate(a); ctx.translate(-(sl.x + sl.w / 2), -(sl.y + sl.h / 2));
        drawPiece(ctx, p, x, y, cs); ctx.restore();
      } else drawPiece(ctx, p, x, y, cs);
      if (this.rotate) {
        // 돌릴 수 있다는 작은 표시
        const r = Math.max(5, this.tcs * 0.2), cx = sl.x + sl.w - r * 1.6, cy = sl.y + r * 1.6;
        ctx.strokeStyle = 'rgba(59,51,64,.32)'; ctx.lineWidth = Math.max(1.5, r * 0.28); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI * 0.9, Math.PI * 0.55); ctx.stroke();
        const ex = cx + r * Math.cos(Math.PI * 0.55), ey = cy + r * Math.sin(Math.PI * 0.55);
        ctx.beginPath(); ctx.moveTo(ex + r * 0.55, ey - r * 0.05); ctx.lineTo(ex, ey); ctx.lineTo(ex + r * 0.1, ey - r * 0.6); ctx.stroke();
      }
    }
  }

  drawDrag() {
    const d = this.drag;
    if (!d || !d.moved) return;
    const ctx = this.ctx, cs = this.cs;
    d.scale += (cs - d.scale) * 0.35;
    const ox = d.px - d.offX * d.scale, oy = d.py - this.lift() - d.offY * d.scale;
    ctx.save();
    ctx.shadowColor = 'rgba(40,30,20,.28)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 8;
    drawPiece(ctx, d.p, ox, oy, d.scale, d.ok ? 0.5 : 0.92);
    ctx.restore();
  }
}

