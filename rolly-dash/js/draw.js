'use strict';
/* 구르미 대시 — 그리기 (그림 파일 없이 전부 코드로 그린다) */
let ctx = null;
const FONT = '"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR","Noto Sans CJK KR",system-ui,sans-serif';
function font(sz, w) { ctx.font = `${w || 800} ${sz}px ${FONT}`; }
function text(s, x, y, sz, col, align, stroke, sw) {
  font(sz);
  ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  if (stroke !== false) {
    ctx.lineJoin = 'round'; ctx.lineWidth = sw || Math.max(3, sz * 0.24);
    ctx.strokeStyle = stroke || 'rgba(40,20,60,0.9)'; ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y);
}
function rrect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function ell(x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); }
function circ(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
function star5(x, y, r1, r2, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i * Math.PI) / 5 - Math.PI / 2, r = i % 2 ? r2 : r1;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

// ===== 배경 =====
function cloud(x, y, s, col) {
  ctx.fillStyle = col;
  circ(x, y, 18 * s); ctx.fill(); circ(x + 20 * s, y - 8 * s, 22 * s); ctx.fill();
  circ(x + 42 * s, y, 17 * s); ctx.fill(); ctx.fillRect(x, y - 2 * s, 42 * s, 18 * s);
}
function ridge(col, f, base, amp, freq, cx, cy, shape) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, VH);
  const ox = cx * f, oy = base - cy * f * 0.6;
  for (let x = -20; x <= VW + 20; x += 12) {
    const wx = x + ox;
    let v;
    if (shape === 'peak') v = 1 - Math.abs(Math.sin(wx * freq)) * 1.6 + Math.sin(wx * freq * 3.1) * 0.15;
    else if (shape === 'mesa') v = clamp(Math.sin(wx * freq) * 2.2, -1, 0.6) + Math.sin(wx * freq * 4) * 0.05;
    else if (shape === 'jag') v = Math.sin(wx * freq) * 0.6 + (Math.abs(((wx * freq * 2.5) % 2) - 1) - 0.5) * 0.7;
    else if (shape === 'puff') v = Math.abs(Math.sin(wx * freq)) * 0.9 + Math.abs(Math.sin(wx * freq * 2.7 + 1)) * 0.4;
    else v = Math.sin(wx * freq) + Math.sin(wx * freq * 2.3 + 1.3) * 0.45;
    ctx.lineTo(x, oy - v * amp);
  }
  ctx.lineTo(VW + 20, VH); ctx.closePath(); ctx.fill();
}
function drawBackdrop(W, cx, cy, time) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, W.sky[0]); g.addColorStop(1, W.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  const sy = 70 - cy * 0.05;
  ctx.fillStyle = W.sun; ctx.globalAlpha = 0.22; circ(VW * 0.8, sy, 56); ctx.fill();
  ctx.globalAlpha = 0.95; circ(VW * 0.8, sy, 32); ctx.fill(); ctx.globalAlpha = 1;
  if (W.kind === 'lava') {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 30; i++) { const x = (hash2(i, 3) * 2000 - cx * 0.05) % VW; ctx.fillRect((x + VW) % VW, hash2(i, 9) * 150, 1.5, 1.5); }
  }
  const ccol = W.kind === 'lava' ? 'rgba(130,60,90,0.45)' : 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 6; i++) {
    const span = VW + 320;
    const x = ((((i * 270 - cx * 0.12 - time * 7) % span) + span) % span) - 160;
    cloud(x, 38 + ((i * 53) % 90) - cy * 0.05, 0.6 + (i % 3) * 0.25, ccol);
  }
  const shapes = { forest: ['smooth', 'smooth'], desert: ['mesa', 'mesa'], ice: ['peak', 'peak'], lava: ['jag', 'jag'], sky: ['puff', 'puff'] }[W.kind];
  ridge(W.far, 0.12, 225, 46, 0.0042, cx, cy, shapes[0]);
  ridge(W.mid, 0.28, 268, 30, 0.0075, cx, cy, shapes[1]);
  drawNearDecor(W, cx, cy, time);
}
function drawNearDecor(W, cx, cy, time) {
  const f = 0.5, ox = cx * f, base = 330 - cy * 0.35, step = 120;
  ctx.fillStyle = W.near;
  ctx.fillRect(0, base, VW, VH - base);
  const i0 = Math.floor(ox / step) - 1, i1 = Math.floor((ox + VW) / step) + 1;
  for (let i = i0; i <= i1; i++) {
    const h = hash2(i, 77);
    if (h < 0.25) continue;
    const x = i * step - ox + h * 60, s = 0.7 + hash2(i, 5) * 0.6;
    ctx.fillStyle = W.near;
    switch (W.kind) {
      case 'forest':
        ctx.fillRect(x - 4 * s, base - 30 * s, 8 * s, 32 * s);
        circ(x, base - 44 * s, 24 * s); ctx.fill(); circ(x - 16 * s, base - 30 * s, 16 * s); ctx.fill(); circ(x + 16 * s, base - 30 * s, 16 * s); ctx.fill();
        break;
      case 'desert':
        rrect(x - 6 * s, base - 52 * s, 12 * s, 54 * s, 6 * s); ctx.fill();
        rrect(x - 22 * s, base - 38 * s, 8 * s, 22 * s, 4 * s); ctx.fill(); ctx.fillRect(x - 22 * s, base - 22 * s, 18 * s, 7 * s);
        rrect(x + 14 * s, base - 44 * s, 8 * s, 24 * s, 4 * s); ctx.fill(); ctx.fillRect(x + 4 * s, base - 26 * s, 18 * s, 7 * s);
        break;
      case 'ice':
        for (let k = 0; k < 3; k++) {
          ctx.beginPath(); ctx.moveTo(x, base - (70 - k * 18) * s);
          ctx.lineTo(x - (14 + k * 6) * s, base - (36 - k * 14) * s); ctx.lineTo(x + (14 + k * 6) * s, base - (36 - k * 14) * s); ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.beginPath(); ctx.moveTo(x, base - 70 * s); ctx.lineTo(x - 7 * s, base - 58 * s); ctx.lineTo(x + 7 * s, base - 58 * s); ctx.fill();
        break;
      case 'lava':
        ctx.fillRect(x - 10 * s, base - 80 * s, 20 * s, 82 * s);
        ctx.fillStyle = 'rgba(255,120,40,0.55)'; ctx.fillRect(x - 6 * s, base - 70 * s, 12 * s, 4 * s);
        ctx.fillStyle = 'rgba(80,60,70,0.35)';
        circ(x + Math.sin(time + i) * 6, base - 92 * s - ((time * 20 + i * 30) % 40), 9 * s); ctx.fill();
        break;
      case 'sky':
        cloud(x - 30 * s, base - 10 * s, 1.1 * s, W.near);
        break;
    }
  }
}

// ===== 타일 =====
function drawTiles(L, W, cx, cy, time) {
  const x0 = Math.max(0, Math.floor(cx / T)), x1 = Math.floor((cx + VW) / T) + 1;
  const y0 = Math.max(0, Math.floor(cy / T)), y1 = Math.min(ROWS - 1, Math.floor((cy + VH) / T));
  if (W.pit) {
    const py = ROWS * T - 20 - cy;
    for (let tx = x0; tx <= x1; tx++) {
      if (L.get(tx, ROWS - 1) !== 0) continue;
      const sx = tx * T - cx;
      ctx.fillStyle = W.pit;
      ctx.fillRect(sx, py + Math.sin(time * 3 + tx) * 2, T + 1, 30);
      ctx.fillStyle = W.kind === 'lava' ? 'rgba(255,230,120,0.7)' : 'rgba(255,255,255,0.45)';
      ctx.fillRect(sx + ((time * 20 + tx * 7) % 24), py + 4 + Math.sin(time * 3 + tx) * 2, 6, 2);
    }
  }
  for (let tx = x0; tx <= x1; tx++) {
    for (let ty = y0; ty <= y1; ty++) {
      const c = L.get(tx, ty);
      if (!c) continue;
      let sx = tx * T - cx, sy = ty * T - cy;
      if (c >= 4 && c <= 6) for (const b of G.bumps) if (b.tx === tx && b.ty === ty && b.t < 0.16) sy -= Math.sin((b.t / 0.16) * Math.PI) * 8;
      switch (c) {
        case 1: groundTile(L, W, tx, ty, sx, sy); break;
        case 2: case 3: slopeTile(W, c, sx, sy); break;
        case 4: brickTile(sx, sy); break;
        case 5: boxTile(sx, sy, time, tx); break;
        case 6: usedTile(sx, sy); break;
        case 7: onewayTile(sx, sy); break;
        case 8: spikeTile(L, W, tx, ty, sx, sy); break;
        case 9: stoneTile(W, sx, sy); break;
      }
    }
  }
}
const isOpen = c => !SOLID[c] && c !== 2 && c !== 3;
function groundTile(L, W, tx, ty, sx, sy) {
  ctx.fillStyle = W.ground; ctx.fillRect(sx, sy, T + 0.5, T + 0.5);
  const h = hash2(tx, ty);
  ctx.fillStyle = W.dots;
  if (h < 0.7) ctx.fillRect(sx + 4 + ((h * 20) | 0), sy + 12 + ((h * 137) % 14), 5, 3);
  if (h > 0.4) ctx.fillRect(sx + 20 - ((h * 13) | 0), sy + 22 + ((h * 71) % 6), 3, 3);
  if (isOpen(L.get(tx - 1, ty))) { ctx.fillStyle = W.groundDark; ctx.fillRect(sx, sy, 4, T); }
  if (isOpen(L.get(tx + 1, ty))) { ctx.fillStyle = W.groundDark; ctx.fillRect(sx + T - 4, sy, 4, T); }
  if (isOpen(L.get(tx, ty - 1))) {
    ctx.fillStyle = W.topDark; ctx.fillRect(sx, sy, T + 0.5, 12);
    ctx.fillStyle = W.top; ctx.fillRect(sx, sy, T + 0.5, 8);
    ctx.fillStyle = W.topDark;
    for (let i = 0; i < 4; i++) { circ(sx + 4 + i * 8, sy + 12, 3); ctx.fill(); }
  }
}
function slopeTile(W, c, sx, sy) {
  ctx.fillStyle = W.ground; ctx.beginPath();
  if (c === 2) { ctx.moveTo(sx, sy + T + 0.5); ctx.lineTo(sx + T + 0.5, sy); ctx.lineTo(sx + T + 0.5, sy + T + 0.5); }
  else { ctx.moveTo(sx, sy); ctx.lineTo(sx + T + 0.5, sy + T + 0.5); ctx.lineTo(sx, sy + T + 0.5); }
  ctx.fill();
  ctx.beginPath();
  if (c === 2) { ctx.moveTo(sx, sy + T); ctx.lineTo(sx + T + 0.5, sy); ctx.lineTo(sx + T + 0.5, sy + 12); ctx.lineTo(sx + 12, sy + T + 0.5); ctx.lineTo(sx, sy + T + 0.5); }
  else { ctx.moveTo(sx, sy); ctx.lineTo(sx + T + 0.5, sy + T); ctx.lineTo(sx + T + 0.5, sy + T + 0.5); ctx.lineTo(sx + T - 12, sy + T + 0.5); ctx.lineTo(sx, sy + 12); }
  ctx.fillStyle = W.topDark; ctx.fill();
  ctx.beginPath();
  if (c === 2) { ctx.moveTo(sx, sy + T); ctx.lineTo(sx + T + 0.5, sy); ctx.lineTo(sx + T + 0.5, sy + 8); ctx.lineTo(sx + 8, sy + T + 0.5); ctx.lineTo(sx, sy + T + 0.5); }
  else { ctx.moveTo(sx, sy); ctx.lineTo(sx + T + 0.5, sy + T); ctx.lineTo(sx + T + 0.5, sy + T + 0.5); ctx.lineTo(sx + T - 8, sy + T + 0.5); ctx.lineTo(sx, sy + 8); }
  ctx.fillStyle = W.top; ctx.fill();
}
function brickTile(sx, sy) {
  ctx.fillStyle = '#c8643c'; ctx.fillRect(sx, sy, T, T);
  ctx.fillStyle = '#e48a5c'; ctx.fillRect(sx, sy, T, 3);
  ctx.fillStyle = '#8a3d22';
  ctx.fillRect(sx, sy + 15, T, 2); ctx.fillRect(sx, sy + T - 2, T, 2);
  ctx.fillRect(sx + 15, sy, 2, 15); ctx.fillRect(sx + 6, sy + 17, 2, 13); ctx.fillRect(sx + 24, sy + 17, 2, 13);
}
function boxTile(sx, sy, time, tx) {
  ctx.fillStyle = '#c98a12'; rrect(sx, sy, T, T, 5); ctx.fill();
  ctx.fillStyle = '#ffc83d'; rrect(sx + 2, sy + 2, T - 4, T - 5, 4); ctx.fill();
  ctx.fillStyle = '#ffe48a'; ctx.fillRect(sx + 4, sy + 4, T - 8, 3);
  ctx.fillStyle = '#c98a12';
  for (const [a, b] of [[5, 5], [T - 7, 5], [5, T - 8], [T - 7, T - 8]]) { circ(sx + a + 1, sy + b + 1, 1.6); ctx.fill(); }
  const bob = Math.sin(time * 4 + tx) * 1.5;
  text('?', sx + T / 2, sy + T / 2 + bob, 20, '#ffffff', 'center', '#b0700c', 4);
}
function usedTile(sx, sy) {
  ctx.fillStyle = '#7a5638'; rrect(sx, sy, T, T, 5); ctx.fill();
  ctx.fillStyle = '#a07850'; rrect(sx + 2, sy + 2, T - 4, T - 5, 4); ctx.fill();
}
function onewayTile(sx, sy) {
  ctx.fillStyle = '#8a5a30'; ctx.fillRect(sx + 6, sy + 8, 4, 12); ctx.fillRect(sx + T - 10, sy + 8, 4, 12);
  ctx.fillStyle = '#c08048'; rrect(sx, sy, T + 0.5, 10, 3); ctx.fill();
  ctx.fillStyle = '#e0a868'; ctx.fillRect(sx + 1, sy + 1, T - 1, 3);
}
function spikeTile(L, W, tx, ty, sx, sy) {
  ctx.fillStyle = '#e2e7f0'; ctx.strokeStyle = '#6e7486'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const x = sx + i * (T / 3);
    ctx.beginPath(); ctx.moveTo(x + 1, sy + T); ctx.lineTo(x + T / 6, sy + 12); ctx.lineTo(x + T / 3 - 1, sy + T); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
}
function stoneTile(W, sx, sy) {
  ctx.fillStyle = W.stone; ctx.fillRect(sx, sy, T + 0.5, T + 0.5);
  ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(sx, sy, T, 3); ctx.fillRect(sx, sy, 3, T);
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(sx, sy + T - 3, T, 3); ctx.fillRect(sx + T - 3, sy, 3, T);
  ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(sx + 8, sy + 8, T - 16, T - 16);
}

// ===== 물건 =====
function drawAcorn(x, y, s, alpha) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, 1);
  if (alpha != null) ctx.globalAlpha = alpha;
  ctx.fillStyle = '#c47a32'; ell(0, 3, 8, 8.5); ctx.fill();
  ctx.fillStyle = '#e59d52'; ell(-3, 3, 2.5, 4.5); ctx.fill();
  ctx.fillStyle = '#7a4a22'; ell(0, -4, 9.5, 5); ctx.fill();
  ctx.fillStyle = '#9c6534'; ctx.fillRect(-6, -6, 12, 1.5);
  ctx.fillStyle = '#5a3418'; ctx.fillRect(-1, -12, 2.5, 5);
  ctx.restore();
}
function drawStar(x, y, time, ghost) {
  ctx.save(); ctx.translate(x, y + Math.sin(time * 3) * 3);
  ctx.globalAlpha = ghost ? 0.45 : 1;
  ctx.fillStyle = 'rgba(255,240,120,0.25)'; circ(0, 0, 20 + Math.sin(time * 5) * 3); ctx.fill();
  ctx.fillStyle = ghost ? '#c8d8ff' : '#ffd84a'; ctx.strokeStyle = ghost ? '#8aa0d8' : '#d48a10'; ctx.lineWidth = 2.5;
  star5(0, 0, 14, 6.5, Math.sin(time * 2) * 0.3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff8c8'; circ(-4, -4, 2.5); ctx.fill();
  ctx.restore();
}
function drawThing(s, cx, cy, time) {
  const x = s.x - cx, y = s.y - cy;
  switch (s.k) {
    case 'spring': {
      const k = s.t > 0 ? 0.55 : 1;
      ctx.fillStyle = '#5a5f73'; rrect(x - 14, y - 5, 28, 5, 2); ctx.fill();
      ctx.strokeStyle = '#c9ced8'; ctx.lineWidth = 3; ctx.beginPath();
      const h = 12 * k;
      for (let i = 0; i <= 4; i++) ctx.lineTo(x + (i % 2 ? 8 : -8), y - 5 - (h * i) / 4);
      ctx.stroke();
      ctx.fillStyle = '#ff4f5e'; rrect(x - 15, y - 9 - h, 30, 6, 3); ctx.fill();
      ctx.fillStyle = '#ff9aa3'; ctx.fillRect(x - 12, y - 8 - h, 24, 2);
      break;
    }
    case 'pad': {
      ctx.fillStyle = '#3a3550'; rrect(x - 16, y - 6, 32, 6, 3); ctx.fill();
      for (let i = 0; i < 3; i++) {
        const on = (Math.floor(time * 8) - i + 30) % 3 === 0;
        ctx.fillStyle = on ? '#ffe14a' : '#ff8a2a';
        const ax = x - 9 + i * 8;
        ctx.beginPath(); ctx.moveTo(ax - 3 * s.d, y - 6); ctx.lineTo(ax + 4 * s.d, y - 3); ctx.lineTo(ax - 3 * s.d, y); ctx.closePath(); ctx.fill();
      }
      break;
    }
    case 'check': {
      ctx.fillStyle = '#6a6f80'; ctx.fillRect(x - 2, y - 64, 4, 64);
      circ(x, y - 66, 4); ctx.fill();
      const wave = Math.sin(time * 6) * 3;
      ctx.fillStyle = s.on ? '#5fdc5a' : '#b9bdc9';
      ctx.beginPath(); ctx.moveTo(x + 2, y - 62); ctx.lineTo(x + 26, y - 55 + wave); ctx.lineTo(x + 2, y - 46); ctx.closePath(); ctx.fill();
      break;
    }
    case 'goal': {
      ctx.fillStyle = '#3a3550'; rrect(x - 12, y - 10, 24, 10, 3); ctx.fill();
      ctx.fillStyle = '#e9ecf3'; ctx.fillRect(x - 3, y - 150, 6, 142);
      ctx.fillStyle = '#ffd34d'; circ(x, y - 154, 7); ctx.fill();
      const wv = Math.sin(time * 5);
      ctx.fillStyle = '#ff5d7a';
      ctx.beginPath(); ctx.moveTo(x + 3, y - 146);
      ctx.quadraticCurveTo(x + 26, y - 152 + wv * 5, x + 52, y - 142 + wv * 3);
      ctx.lineTo(x + 52, y - 110 + wv * 3);
      ctx.quadraticCurveTo(x + 26, y - 120 + wv * 5, x + 3, y - 114); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; star5(x + 27, y - 130 + wv * 3, 8, 3.5, 0); ctx.fill();
      break;
    }
    case 'sign': {
      ctx.fillStyle = '#8a5a30'; ctx.fillRect(x - 2, y - 26, 4, 26);
      ctx.fillStyle = '#d9a466'; rrect(x - 14, y - 40, 28, 18, 4); ctx.fill();
      ctx.fillStyle = '#8a5a30'; ctx.fillRect(x - 1.5, y - 37, 3, 7); ctx.fillRect(x - 1.5, y - 28, 3, 3);
      const near = Math.abs(G.p.x - s.x) < 260;
      if (near) {
        const msg = t(s.text);
        font(13);
        const w = Math.min(VW - 40, ctx.measureText(msg).width + 24);
        const bx = clamp(x - w / 2, 10, VW - w - 10), by = y - 86 + Math.sin(time * 3) * 2;
        ctx.fillStyle = 'rgba(255,255,255,0.95)'; rrect(bx, by, w, 28, 10); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - 6, by + 27); ctx.lineTo(x, by + 36); ctx.lineTo(x + 6, by + 27); ctx.fill();
        text(msg, bx + w / 2, by + 14, 13, '#3a2a55', 'center', false);
      }
      break;
    }
  }
}
function drawPow(w, cx, cy, time) {
  const x = w.x - cx, y = w.y - cy + (w.rise > 0 ? 0 : Math.sin(time * 4 + w.t) * 3);
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; circ(0, 0, 15); ctx.fill();
  if (w.type === 'shield') {
    ctx.fillStyle = 'rgba(120,220,255,0.6)'; circ(0, 0, 11); ctx.fill();
    ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 2; circ(0, 0, 11); ctx.stroke();
    ctx.fillStyle = '#fff'; circ(-4, -4, 3); ctx.fill();
  } else if (w.type === 'chili') {
    ctx.rotate(-0.5);
    ctx.fillStyle = '#ff3b3b'; ell(0, 2, 6, 11); ctx.fill();
    ctx.fillStyle = '#ff9a8a'; ell(-2, -1, 1.6, 5); ctx.fill();
    ctx.fillStyle = '#3fae3a'; ctx.fillRect(-2, -14, 4, 6); ell(0, -8, 5, 2.5); ctx.fill();
  } else {
    ctx.lineWidth = 6; ctx.strokeStyle = '#ff4f5e';
    ctx.beginPath(); ctx.arc(0, -1, 8, Math.PI, 0, true); ctx.stroke();
    ctx.fillStyle = '#d8dde8'; ctx.fillRect(-11, -3, 6, 7); ctx.fillRect(5, -3, 6, 7);
  }
  ctx.restore();
}

// ===== 아르마딜로 =====
function skinColors(skinId, time) {
  const s = SKINS.find(k => k.id === skinId) || SKINS[0];
  const shell = s.shell === 'rainbow' ? `hsl(${(time * 140) % 360},85%,64%)` : s.shell;
  return { shell, band: s.shell === 'rainbow' ? `hsl(${(time * 140 + 120) % 360},80%,50%)` : s.band, skin: s.skin, sparkle: s.sparkle };
}
function drawArmadillo(x, y, o, time) {
  const C = skinColors(o.skin, time);
  ctx.save(); ctx.translate(x, y);
  if (o.shield) {
    ctx.fillStyle = 'rgba(140,225,255,0.22)'; circ(0, -14, 24); ctx.fill();
    ctx.strokeStyle = 'rgba(200,245,255,0.8)'; ctx.lineWidth = 2; circ(0, -14, 24 + Math.sin(time * 6)); ctx.stroke();
  }
  if (o.chili) { ctx.fillStyle = 'rgba(255,120,40,0.28)'; circ(0, -14, 22 + Math.sin(time * 20) * 2); ctx.fill(); }
  if (o.ball) {
    ctx.translate(0, -13);
    ctx.scale(o.sqx || 1, o.sqy || 1);
    ctx.rotate(o.rot || 0);
    ctx.fillStyle = C.shell; circ(0, 0, 13); ctx.fill();
    ctx.save(); circ(0, 0, 13); ctx.clip();
    ctx.fillStyle = C.band;
    for (let i = -2; i <= 2; i++) ctx.fillRect(i * 6 - 1.2, -14, 2.6, 28);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; circ(-4, -5, 6); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(40,20,40,0.35)'; ctx.lineWidth = 1.5; circ(0, 0, 13); ctx.stroke();
    ctx.restore();
    return;
  }
  ctx.scale((o.dir || 1) * (o.sqx || 1), o.sqy || 1);
  const run = o.run || 0, leg = Math.sin(o.anim || 0) * 4 * run, air = o.air;
  ctx.fillStyle = C.band;
  if (air) { ell(-7, -4, 4, 3); ctx.fill(); ell(7, -5, 4, 3); ctx.fill(); }
  else { ell(-6 + leg, -3, 4, 3.4); ctx.fill(); ell(6 - leg, -3, 4, 3.4); ctx.fill(); }
  // 꼬리
  ctx.fillStyle = C.shell;
  ctx.beginPath(); ctx.moveTo(-11, -10); ctx.lineTo(-19, -5 + Math.sin(time * 8) * run); ctx.lineTo(-10, -6); ctx.closePath(); ctx.fill();
  // 등껍질
  ctx.beginPath(); ctx.ellipse(-1, -12, 13, 10.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = C.shell; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = C.band;
  for (let i = -1; i <= 1; i++) ctx.fillRect(i * 6 - 2.2, -24, 2.8, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ell(-4, -18, 6, 3); ctx.fill();
  ctx.fillStyle = C.skin; ell(1, -3.5, 11, 4.5); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(40,20,40,0.3)'; ctx.lineWidth = 1.2; ell(-1, -12, 13, 10.5); ctx.stroke();
  // 머리
  ctx.fillStyle = C.skin;
  ell(11, -11, 7, 6.2); ctx.fill();
  ell(17, -9, 5.5, 3.4, 0.15); ctx.fill();
  ctx.fillStyle = '#5a3a3a'; circ(22, -8.6, 1.8); ctx.fill();
  ctx.fillStyle = C.shell; ell(8.5, -17, 2.6, 4.4, -0.35); ctx.fill();
  ctx.fillStyle = '#ffffff'; circ(13.5, -13, 2.8); ctx.fill();
  ctx.fillStyle = '#2a1a2a'; circ(14.4, -13, 1.6); ctx.fill();
  ctx.fillStyle = '#ffffff'; circ(14.9, -13.7, 0.6); ctx.fill();
  ctx.fillStyle = 'rgba(255,120,140,0.45)'; circ(12.5, -8.5, 1.8); ctx.fill();
  ctx.restore();
  if (C.sparkle && Math.random() < 0.12) G.parts.push({ type: 'dot', x: x + G.cam.x + (Math.random() - 0.5) * 26, y: y + G.cam.y - 6 - Math.random() * 22, vx: 0, vy: -20, life: 0.5, max: 0.5, color: '#fffbd0', size: 2.5, grav: 0 });
}
function drawPlayer(cx, cy, time) {
  const p = G.p;
  if (p.inv > 0 && !p.dead && Math.floor(time * 16) % 2 === 0) return;
  const x = p.x - cx, y = p.y - cy;
  if (p.dead) {
    ctx.save(); ctx.translate(x, y - 14); ctx.rotate(p.rot); ctx.translate(-x, -(y - 14));
    drawArmadillo(x, y, { dir: p.dir, skin: Save.data.skin, air: true }, time);
    ctx.restore();
    return;
  }
  if (p.charging) {
    const k = p.charge;
    ctx.fillStyle = `rgba(255,255,255,${0.25 + k * 0.4})`;
    ell(x - p.dir * 6, y - 4, 16 + k * 10, 5); ctx.fill();
  }
  drawArmadillo(x, y, {
    dir: p.dir, ball: p.ball || p.charging, rot: p.rot, anim: p.anim, sqx: p.sqx, sqy: p.sqy,
    skin: Save.data.skin, shield: p.shield, chili: p.chili > 0, run: Math.min(1, Math.abs(p.vx) / 120), air: !p.ground,
  }, time);
}

// ===== 적 =====
function drawEnemy(e, cx, cy, time) {
  const x = e.x - cx, y = e.y - cy;
  ctx.save(); ctx.translate(x, y);
  if (e.dead && e.squish <= 0) { ctx.translate(0, -10); ctx.rotate(e.rot); ctx.scale(1, -1); ctx.translate(0, 10); }
  if (e.dead && e.squish > 0) ctx.scale(1.3, 0.35);
  const f = e.face || -1;
  switch (e.type) {
    case 'beetle': {
      const lg = Math.sin(e.t * 14) * 2;
      ctx.fillStyle = '#2a1a2a';
      for (let i = -1; i <= 1; i++) ctx.fillRect(i * 7 - 1 + lg * (i % 2 ? 1 : -1), -5, 2.5, 5);
      ctx.fillStyle = '#e8434f'; ell(-2 * f, -11, 13, 10); ctx.fill();
      ctx.fillStyle = '#ff8a92'; ell(-6 * f, -15, 4, 2.5); ctx.fill();
      ctx.fillStyle = '#2a1a2a'; ctx.fillRect(-2 * f - 0.8, -20, 1.6, 18);
      circ(-6 * f, -8, 2); ctx.fill(); circ(3 * f, -14, 1.8); ctx.fill();
      ell(10 * f, -9, 6, 5.5); ctx.fill();
      ctx.fillStyle = '#fff'; circ(12 * f, -11, 2.2); ctx.fill();
      ctx.fillStyle = '#2a1a2a'; circ(12.8 * f, -11, 1.1); ctx.fill();
      break;
    }
    case 'spiky': {
      const r = 10;
      ctx.translate(0, -12);
      ctx.rotate(e.t * 2.5 * -f);
      ctx.fillStyle = '#5a3a1e';
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.25) * r, Math.sin(a - 0.25) * r);
        ctx.lineTo(Math.cos(a) * (r + 7), Math.sin(a) * (r + 7)); ctx.lineTo(Math.cos(a + 0.25) * r, Math.sin(a + 0.25) * r); ctx.fill();
      }
      ctx.fillStyle = '#9a6234'; circ(0, 0, r + 0.5); ctx.fill();
      ctx.rotate(-e.t * 2.5 * -f);
      ctx.fillStyle = '#fff'; circ(-4 + 2 * f, -1, 3); ctx.fill(); circ(4 + 2 * f, -1, 3); ctx.fill();
      ctx.fillStyle = '#2a1a2a'; circ(-4 + 3 * f, -0.5, 1.5); ctx.fill(); circ(4 + 3 * f, -0.5, 1.5); ctx.fill();
      ctx.strokeStyle = '#2a1a2a'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-7 + 2 * f, -6); ctx.lineTo(-2 + 2 * f, -4); ctx.moveTo(7 + 2 * f, -6); ctx.lineTo(2 + 2 * f, -4); ctx.stroke();
      break;
    }
    case 'frog': {
      const air = !e.ground;
      ctx.fillStyle = '#3fa63a';
      if (air) { ctx.fillRect(-12, -6, 6, 8); ctx.fillRect(6, -6, 6, 8); }
      else { ell(-9, -3, 6, 3.5); ctx.fill(); ell(9, -3, 6, 3.5); ctx.fill(); }
      ctx.fillStyle = '#5fd35a'; ell(0, -10, 12, air ? 10 : 8.5); ctx.fill();
      ctx.fillStyle = '#c8f5a0'; ell(2 * f, -6, 7, 4); ctx.fill();
      ctx.fillStyle = '#5fd35a'; circ(-5, -18, 5); ctx.fill(); circ(5, -18, 5); ctx.fill();
      ctx.fillStyle = '#fff'; circ(-5 + f, -19, 3.4); ctx.fill(); circ(5 + f, -19, 3.4); ctx.fill();
      ctx.fillStyle = '#2a1a2a'; circ(-5 + 2 * f, -19, 1.7); ctx.fill(); circ(5 + 2 * f, -19, 1.7); ctx.fill();
      break;
    }
    case 'bee': {
      const wing = Math.sin(time * 40) * 4;
      ctx.fillStyle = 'rgba(230,245,255,0.8)';
      ell(-3, -18 - wing * 0.5, 6, 4 + wing * 0.3, -0.5); ctx.fill(); ell(4, -18 + wing * 0.5, 6, 4 - wing * 0.3, 0.5); ctx.fill();
      ctx.fillStyle = '#ffcb2e'; ell(0, -10, 12, 8.5); ctx.fill();
      ctx.fillStyle = '#2a1a2a';
      ctx.save(); ell(0, -10, 12, 8.5); ctx.clip();
      ctx.fillRect(-4, -20, 3.5, 20); ctx.fillRect(3, -20, 3.5, 20); ctx.restore();
      ctx.beginPath(); ctx.moveTo(-12 * f, -10); ctx.lineTo(-17 * f, -9); ctx.lineTo(-12 * f, -7); ctx.fill();
      ctx.fillStyle = '#fff'; circ(8 * f, -12, 2.6); ctx.fill();
      ctx.fillStyle = '#2a1a2a'; circ(8.8 * f, -12, 1.3); ctx.fill();
      break;
    }
  }
  ctx.restore();
}

// ===== 파티클 =====
function drawParts(cx, cy) {
  for (const q of G.parts) {
    const a = clamp(q.life / q.max, 0, 1), x = q.x - cx, y = q.y - cy;
    switch (q.type) {
      case 'dot': ctx.globalAlpha = a; ctx.fillStyle = q.color; circ(x, y, q.size * (0.5 + a * 0.5)); ctx.fill(); break;
      case 'ring': ctx.globalAlpha = a; ctx.strokeStyle = q.color; ctx.lineWidth = 3 * a + 0.5; circ(x, y, q.size * (1.4 - a * 0.6)); ctx.stroke(); break;
      case 'text': ctx.globalAlpha = Math.min(1, a * 2); text(q.text, x, y, q.size, q.color); break;
      case 'streak': ctx.globalAlpha = a * 0.7; ctx.fillStyle = q.color; ctx.fillRect(x - (q.vx > 0 ? 0 : q.size), y, q.size, 2); break;
      case 'debris':
        ctx.globalAlpha = 1; ctx.save(); ctx.translate(x, y); ctx.rotate(q.rot);
        ctx.fillStyle = q.color; ctx.fillRect(-q.size / 2, -q.size / 2, q.size, q.size);
        ctx.fillStyle = '#8a3d22'; ctx.fillRect(-q.size / 2, q.size / 2 - 2, q.size, 2); ctx.restore(); break;
      case 'acornpop': ctx.globalAlpha = Math.min(1, a * 2); drawAcorn(x, y, Math.abs(Math.cos(q.life * 20)) * 0.8 + 0.2); break;
    }
  }
  ctx.globalAlpha = 1;
}

// ===== 먹구름 (무한 질주) =====
function drawStorm(cx, cy, time) {
  const x = G.storm - cx;
  if (x < -120) return;
  const g = ctx.createLinearGradient(x - 120, 0, x + 40, 0);
  g.addColorStop(0, 'rgba(30,20,50,0.95)'); g.addColorStop(0.75, 'rgba(50,35,80,0.85)'); g.addColorStop(1, 'rgba(60,40,90,0)');
  ctx.fillStyle = g; ctx.fillRect(-10, 0, Math.max(0, x + 40 + 10), VH);
  ctx.fillStyle = 'rgba(70,50,105,0.95)';
  for (let i = 0; i < 9; i++) {
    const yy = i * 44 + Math.sin(time * 2 + i) * 8;
    circ(x + Math.sin(time * 3 + i * 1.7) * 8, yy, 26 + Math.sin(time * 4 + i) * 5); ctx.fill();
  }
  if (Math.sin(time * 7) > 0.97) {
    ctx.strokeStyle = 'rgba(255,250,170,0.9)'; ctx.lineWidth = 2.5; ctx.beginPath();
    let lx = x - 10, ly = 20;
    ctx.moveTo(lx, ly);
    for (let i = 0; i < 6; i++) { lx += (Math.random() - 0.5) * 30; ly += 40; ctx.lineTo(lx, ly); }
    ctx.stroke();
  }
  ctx.fillStyle = '#fff'; circ(x - 12, VH * 0.45, 5); ctx.fill(); circ(x + 6, VH * 0.45, 5); ctx.fill();
  ctx.fillStyle = '#2a1a2a'; circ(x - 10, VH * 0.45, 2.5); ctx.fill(); circ(x + 8, VH * 0.45, 2.5); ctx.fill();
}

// ===== 게임 화면 전체 =====
function drawWorld(time) {
  const W = WORLDS[G.world];
  let cx = G.cam.x, cy = G.cam.y;
  if (G.shake > 0) { cx += (Math.random() - 0.5) * G.shake * 2; cy += (Math.random() - 0.5) * G.shake * 2; }
  cx = Math.round(cx); cy = Math.round(cy);
  drawBackdrop(W, cx, cy, time);
  drawTiles(G.L, W, cx, cy, time);
  const vis = x => x > cx - 80 && x < cx + VW + 80;
  for (const s of G.things) if (vis(s.x)) drawThing(s, cx, cy, time);
  for (const a of G.acornsArr) if (a.alive && vis(a.x)) drawAcorn(a.x - cx, a.y - cy + Math.sin(time * 3 + a.x * 0.02) * 1.5, Math.max(0.25, Math.abs(Math.cos(time * 3 + a.x * 0.01))));
  const prevMask = G.mode === 'stage' ? (Save.data.stages[G.world + '-' + G.stage] || {}).stars || 0 : 0;
  for (const s of G.starsObj) if (s.alive && vis(s.x)) drawStar(s.x - cx, s.y - cy, time, prevMask & (1 << s.i));
  for (const w of G.pows) if (w.alive && vis(w.x)) drawPow(w, cx, cy, time);
  for (const e of G.enemies) if (!e.gone && vis(e.x)) drawEnemy(e, cx, cy, time);
  for (const a of G.loose) if (!a.dead) drawAcorn(a.x - cx, a.y - cy, 0.9, a.t > 3.2 && Math.floor(a.t * 12) % 2 ? 0.3 : 1);
  drawPlayer(cx, cy, time);
  drawParts(cx, cy);
  if (G.mode === 'endless') drawStorm(cx, cy, time);
  if (G.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${G.flash * 1.6})`; ctx.fillRect(0, 0, VW, VH); }
}

// ===== HUD =====
function drawHUD(time) {
  const p = G.p;
  ctx.fillStyle = 'rgba(30,20,50,0.35)'; rrect(8, 8, 112, 30, 15); ctx.fill();
  drawAcorn(26, 23, 1);
  text(String(G.acorns), 44, 23, 18, '#fff', 'left');
  if (G.mode === 'stage') {
    text(fmtTime(G.time), 14, 52, 13, '#fff', 'left');
    for (let i = 0; i < 3; i++) {
      const x = VW / 2 - 28 + i * 28, y = 22;
      ctx.fillStyle = G.starGot[i] ? '#ffd84a' : 'rgba(30,20,50,0.35)';
      ctx.strokeStyle = G.starGot[i] ? '#d48a10' : 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
      star5(x, y, 10, 4.5, 0); ctx.fill(); ctx.stroke();
    }
  } else {
    text(`${G.dist} m`, VW / 2, 22, 20, '#fff');
    text(`${t('best')} ${Save.data.bestRun} m`, VW / 2, 42, 11, 'rgba(255,255,255,0.85)');
    const gap = p.x - G.storm;
    if (gap < 200 && G.state === 'play') {
      ctx.globalAlpha = 0.5 + Math.sin(time * 12) * 0.3;
      text('⚡ ' + t('stormWarn'), VW / 2, 64, 13, '#ffe27a');
      ctx.globalAlpha = 1;
    }
  }
  let ix = 14;
  const iy = G.mode === 'stage' ? 74 : 56;
  const bar = (frac, col) => { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(ix + 18, iy - 3, 34, 6); ctx.fillStyle = col; ctx.fillRect(ix + 18, iy - 3, 34 * frac, 6); };
  if (p.shield) { drawPow({ type: 'shield', x: ix + 6, y: iy, rise: 1, t: 0 }, 0, 0, time); ix += 30; }
  if (p.chili > 0) { drawPow({ type: 'chili', x: ix + 6, y: iy, rise: 1, t: 0 }, 0, 0, time); bar(p.chili / 8, '#ff6a3a'); ix += 62; }
  if (p.magnet > 0) { drawPow({ type: 'magnet', x: ix + 6, y: iy, rise: 1, t: 0 }, 0, 0, time); bar(p.magnet / 12, '#ff4f5e'); ix += 62; }
  if (G.banner) {
    const a = Math.min(1, G.banner.t * 2, (2.6 - G.banner.t) * 4 + 0.2);
    ctx.globalAlpha = clamp(a, 0, 1);
    text(G.banner.text, VW / 2, VH * 0.3, 26, '#fff');
    ctx.globalAlpha = 1;
  }
}
function drawControls() {
  const L = ctlLayout(), cur = Input.cur;
  const pad = (c, on, draw) => {
    ctx.fillStyle = on ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.16)';
    circ(c.x, c.y, c.r); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2; circ(c.x, c.y, c.r); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; draw(c);
  };
  pad(L.l, cur.l, c => { ctx.beginPath(); ctx.moveTo(c.x - 14, c.y); ctx.lineTo(c.x + 8, c.y - 14); ctx.lineTo(c.x + 8, c.y + 14); ctx.fill(); });
  pad(L.r, cur.r, c => { ctx.beginPath(); ctx.moveTo(c.x + 14, c.y); ctx.lineTo(c.x - 8, c.y - 14); ctx.lineTo(c.x - 8, c.y + 14); ctx.fill(); });
  pad(L.j, cur.j, c => { ctx.beginPath(); ctx.moveTo(c.x, c.y - 16); ctx.lineTo(c.x + 15, c.y + 6); ctx.lineTo(c.x - 15, c.y + 6); ctx.fill(); ctx.fillRect(c.x - 5, c.y + 6, 10, 8); });
  pad(L.d, cur.d, c => {
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(c.x, c.y, 13, 0.3, Math.PI * 1.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c.x + 14, c.y - 12); ctx.lineTo(c.x + 15, c.y - 2); ctx.lineTo(c.x + 5, c.y - 5); ctx.fill();
    if (G.p && G.p.charging) { ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(c.x, c.y, c.r - 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * G.p.charge); ctx.stroke(); }
  });
}
