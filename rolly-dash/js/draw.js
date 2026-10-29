'use strict';
/* 구르미 대시 — 그리기 (그림 파일 없이 전부 코드로 그린다)
   지형 조각·배경 레이어·장식은 처음 한 번 작은 캔버스에 그려 두고(캐시) 재사용한다. */
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
function ell(x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, Math.PI * 2); }
function circ(x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.01, r), 0, Math.PI * 2); }
function star5(x, y, r1, r2, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i * Math.PI) / 5 - Math.PI / 2, r = i % 2 ? r2 : r1;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}
function vgrad(y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}
function rgrad(x, y, r0, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}
// 바깥선 먼저 굵게 칠하고 그 위에 채우면 여러 도형이 한 덩어리 외곽선을 갖는다
function outlined(shapes, ol, lw) {
  ctx.strokeStyle = ol; ctx.lineWidth = lw; ctx.lineJoin = 'round';
  for (const s of shapes) { s.path(); ctx.stroke(); }
  for (const s of shapes) { s.path(); ctx.fillStyle = s.fill; ctx.fill(); }
}

// ===== 색 도구 =====
const _rgb = new Map(), _mix = new Map();
function rgbOf(c) {
  let v = _rgb.get(c);
  if (v === undefined) {
    v = c && c[0] === '#' && c.length === 7 ? [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)] : null;
    _rgb.set(c, v);
  }
  return v;
}
function mix(a, b, k) {
  const key = a + b + k;
  let v = _mix.get(key);
  if (v === undefined) {
    const A = rgbOf(a), B = rgbOf(b);
    v = !A || !B ? a : '#' + A.map((x, i) => Math.round(x + (B[i] - x) * k).toString(16).padStart(2, '0')).join('');
    _mix.set(key, v);
  }
  return v;
}
const shade = (c, k) => (k < 0 ? mix(c, '#000000', -k) : mix(c, '#ffffff', k));
function alpha(c, a) { const A = rgbOf(c); return A ? `rgba(${A[0]},${A[1]},${A[2]},${a})` : c; }

// ===== 그림 캐시 =====
let CS = 2;
const SPR = new Map();
function setCacheScale(s) { const n = clamp(Math.ceil(s - 0.2), 1, 3); if (n !== CS) { CS = n; SPR.clear(); } }
function sprite(key, w, h, fn, maxScale) {
  let c = SPR.get(key);
  if (!c) {
    const sc = Math.min(CS, maxScale || 9);
    c = document.createElement('canvas');
    c.width = Math.ceil(w * sc); c.height = Math.ceil(h * sc);
    const g = c.getContext('2d'), old = ctx;
    ctx = g; g.scale(sc, sc);
    try { fn(w, h); } finally { ctx = old; }
    c.vw = w; c.vh = h;
    SPR.set(key, c);
  }
  return c;
}

// 월드별 추가 정보
const WX = {
  forest: { cap: 'grass', deco: ['tuft', 'tuft', 'flowerR', 'flowerY', 'flowerW', 'bush', 'rock', 'tuft'], amb: 'pollen' },
  desert: { cap: 'sand', deco: ['cactus', 'rock', 'drytuft', 'drytuft', 'barrel', 'rock'], amb: 'dust' },
  ice: { cap: 'snow', deco: ['snowpile', 'crystal', 'pine', 'snowpile', 'icetuft'], amb: 'snow' },
  lava: { cap: 'rock', deco: ['ember', 'vent', 'rock', 'ember', 'rock'], amb: 'ember' },
  sky: { cap: 'cloud', deco: ['puff', 'starflower', 'puff', 'flowerP'], amb: 'sparkle' },
};
const SIDE = 3, PAD = 8;
const OLC = '#2e1c38';

// ===== 지형 조각 =====
function soilTexture(W, v, depth, clipW) {
  const r = mulberry(v * 97 + depth * 13 + 3);
  const peb = mix(W.ground, W.groundDark, 0.55 + depth * 0.15), hi = shade(W.ground, 0.12);
  if (W.kind === 'lava') {
    ctx.strokeStyle = 'rgba(255,120,40,0.38)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); let x = r() * T, y = 4;
    ctx.moveTo(x, y);
    for (let i = 0; i < 4; i++) { x += (r() - 0.5) * 14; y += 7; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  const n = W.kind === 'sky' ? 2 : 3;
  for (let i = 0; i < n; i++) {
    const x = 4 + r() * (clipW - 8), y = 7 + r() * 20, rx = 2 + r() * 3.5;
    if (W.kind === 'sky') { ctx.fillStyle = 'rgba(255,255,255,0.45)'; circ(x, y, rx + 1); ctx.fill(); continue; }
    if (W.kind === 'ice') { ctx.fillStyle = 'rgba(220,240,255,0.35)'; ctx.beginPath(); ctx.moveTo(x, y - rx); ctx.lineTo(x + rx * 0.6, y); ctx.lineTo(x, y + rx); ctx.lineTo(x - rx * 0.6, y); ctx.fill(); continue; }
    ctx.fillStyle = peb; ell(x, y, rx, rx * 0.7); ctx.fill();
    ctx.fillStyle = hi; ell(x - rx * 0.25, y - rx * 0.3, rx * 0.45, rx * 0.25); ctx.fill();
  }
}
function capInfo(W) {
  const cap = WX[W.kind].cap;
  return { cap, h: { grass: 9, sand: 8, snow: 11, rock: 7, cloud: 10 }[cap], bump: cap === 'cloud' ? 7 : cap === 'snow' ? 5 : 4 };
}
function capPath(L0, R0, h, bump, v) {
  ctx.beginPath();
  ctx.moveTo(L0, h);
  if (L0 < 0) { ctx.lineTo(L0, 4); ctx.quadraticCurveTo(L0, 0, L0 + 5, 0); } else ctx.lineTo(L0, 0);
  if (R0 > T) { ctx.lineTo(R0 - 5, 0); ctx.quadraticCurveTo(R0, 0, R0, 4); } else ctx.lineTo(R0, 0);
  ctx.lineTo(R0, h); ctx.lineTo(T, h);
  for (let x = T; x > 0; x -= 8) ctx.quadraticCurveTo(x - 4, h + bump + ((x * 7 + v * 3) % 3), x - 8, h);
  ctx.lineTo(L0, h); ctx.closePath();
}
function drawCap(W, lo, ro, v) {
  const ci = capInfo(W), L0 = lo ? -2 : 0, R0 = ro ? T + 2 : T;
  // 덮개 아래 그림자
  ctx.save(); ctx.translate(0, 3); capPath(L0, R0, ci.h, ci.bump, v); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fill(); ctx.restore();
  if (ci.cap === 'snow') {
    ctx.fillStyle = '#dff1ff';
    for (let i = 0; i < 2; i++) { const x = 6 + ((v * 11 + i * 17) % 22); ctx.beginPath(); ctx.moveTo(x - 2.5, ci.h + 2); ctx.lineTo(x, ci.h + 9 + ((v + i) % 3) * 2); ctx.lineTo(x + 2.5, ci.h + 2); ctx.fill(); }
  }
  capPath(L0, R0, ci.h, ci.bump, v);
  ctx.fillStyle = vgrad(0, ci.h + ci.bump, [shade(W.top, 0.18), W.top, W.topDark]); ctx.fill();
  ctx.strokeStyle = shade(W.topDark, -0.35); ctx.lineWidth = 1.4; ctx.stroke();
  // 위쪽 굵은 외곽선
  ctx.strokeStyle = shade(W.groundDark, -0.55); ctx.lineWidth = 2.2; ctx.beginPath();
  if (lo) { ctx.moveTo(L0, ci.h); ctx.lineTo(L0, 4); ctx.quadraticCurveTo(L0, 0, L0 + 5, 0); } else ctx.moveTo(0, 0);
  if (ro) { ctx.lineTo(R0 - 5, 0); ctx.quadraticCurveTo(R0, 0, R0, 4); ctx.lineTo(R0, ci.h); } else ctx.lineTo(T, 0);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(L0 + (lo ? 5 : 0), 2.6); ctx.lineTo(R0 - (ro ? 5 : 0), 2.6); ctx.stroke();
  if (ci.cap === 'grass') {
    for (let i = 0; i < 4; i++) {
      const x = 3 + i * 8 + ((v * 3 + i * 5) % 4), h = 3 + ((v + i) % 3) * 1.6;
      ctx.fillStyle = shade(W.top, 0.08); ctx.beginPath(); ctx.moveTo(x - 2.2, 1); ctx.lineTo(x + 0.6, -h); ctx.lineTo(x + 2.2, 1); ctx.fill();
    }
  } else if (ci.cap === 'sand') {
    ctx.strokeStyle = alpha(W.topDark, 0.7); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(4, 6); ctx.quadraticCurveTo(10, 4, 16, 6); ctx.moveTo(18, 7); ctx.quadraticCurveTo(24, 5, 30, 7); ctx.stroke();
  } else if (ci.cap === 'rock') {
    ctx.strokeStyle = alpha(shade(W.topDark, -0.3), 0.6); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(8 + v * 3, 0.5); ctx.lineTo(10 + v * 3, 5); ctx.moveTo(22 - v, 0.5); ctx.lineTo(20 - v, 4); ctx.stroke();
  } else if (ci.cap === 'cloud') {
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; circ(8 + v * 4, 3, 3); ctx.fill();
  }
}
function groundSprite(wi, mask, depth, v) {
  return sprite(`g${wi}|${mask}|${depth}|${v}`, T + 2 * SIDE, T + PAD + 2, () => {
    const W = WORLDS[wi], top = mask & 1, lo = mask & 2, ro = mask & 4;
    ctx.translate(SIDE, PAD);
    const rl = top && lo ? 9 : 0, rr = top && ro ? 9 : 0, rw = ro ? T : T + 1;
    ctx.beginPath();
    ctx.moveTo(0, rl);
    if (rl) ctx.quadraticCurveTo(0, 0, rl, 0); else ctx.lineTo(0, 0);
    ctx.lineTo(rw - rr, 0);
    if (rr) ctx.quadraticCurveTo(rw, 0, rw, rr); else ctx.lineTo(rw, 0);
    ctx.lineTo(rw, T + 1); ctx.lineTo(0, T + 1); ctx.closePath();
    // depth: -1 기본 땅보다 위(언덕), 0~2 기본 땅 줄. 줄마다 이어지는 그라데이션
    const lv = [W.ground, W.ground, mix(W.ground, W.groundDark, 0.45), mix(W.ground, W.groundDark, 0.8), shade(W.groundDark, -0.06)];
    const c0 = lv[depth + 1], c1 = lv[depth + 2];
    ctx.fillStyle = vgrad(0, T, [c0, c1]); ctx.fill();
    ctx.save(); ctx.clip();
    soilTexture(W, v, Math.max(0, depth), T);
    if (lo) { const g = ctx.createLinearGradient(0, 0, 9, 0); g.addColorStop(0, 'rgba(0,0,0,0.28)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 9, T + 1); }
    if (ro) { const g = ctx.createLinearGradient(T, 0, T - 9, 0); g.addColorStop(0, 'rgba(0,0,0,0.28)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(T - 9, 0, 9, T + 1); }
    ctx.restore();
    ctx.strokeStyle = shade(W.groundDark, -0.55); ctx.lineWidth = 2.2;
    if (lo) { ctx.beginPath(); ctx.moveTo(0, T + 1); ctx.lineTo(0, rl || 0); ctx.stroke(); }
    if (ro) { ctx.beginPath(); ctx.moveTo(T, T + 1); ctx.lineTo(T, rr || 0); ctx.stroke(); }
    if (top) drawCap(W, lo, ro, v);
  });
}
function slopeSprite(wi, up, v) {
  const ci = capInfo(WORLDS[wi]);
  return sprite(`s${wi}|${up}|${v}`, T + 2 * SIDE, T + PAD + ci.h + 8, () => {
    const W = WORLDS[wi];
    ctx.translate(SIDE, PAD);
    if (!up) { ctx.translate(T, 0); ctx.scale(-1, 1); }
    ctx.beginPath(); ctx.moveTo(0, T + 1); ctx.lineTo(T + 1, -0.5); ctx.lineTo(T + 1, T + 1); ctx.closePath();
    ctx.fillStyle = W.ground; ctx.fill();
    ctx.save(); ctx.clip();
    soilTexture(W, v, 0, T);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.moveTo(0, T + 3); ctx.lineTo(T, 3); ctx.lineTo(T, ci.h + 6); ctx.lineTo(0, T + ci.h + 6); ctx.fill();
    ctx.restore();
    const band = () => {
      ctx.beginPath(); ctx.moveTo(0, T); ctx.lineTo(T, 0); ctx.lineTo(T, ci.h);
      for (let x = T; x > 0; x -= 8) ctx.quadraticCurveTo(x - 4, T - (x - 4) + ci.h + ci.bump * 0.8, x - 8, T - (x - 8) + ci.h);
      ctx.lineTo(0, T); ctx.closePath();
    };
    band();
    const g = ctx.createLinearGradient(16, 16, 16 + ci.h * 0.55, 16 + ci.h * 0.55);
    g.addColorStop(0, shade(W.top, 0.18)); g.addColorStop(0.5, W.top); g.addColorStop(1, W.topDark);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = shade(W.topDark, -0.35); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.strokeStyle = shade(W.groundDark, -0.55); ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(0, T); ctx.lineTo(T, 0); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(2, T + 0.6); ctx.lineTo(T - 1, 3.2); ctx.stroke();
    if (ci.cap === 'grass') {
      ctx.fillStyle = shade(W.top, 0.08);
      for (let i = 0; i < 4; i++) { const x = 4 + i * 8, y = T - x; ctx.beginPath(); ctx.moveTo(x - 2.5, y + 2.5); ctx.lineTo(x - 1, y - 4); ctx.lineTo(x + 2, y - 1); ctx.fill(); }
    }
  });
}
function stoneSprite(wi) {
  return sprite('x' + wi, T, T, () => {
    const W = WORLDS[wi], s = W.stone;
    rrect(1, 1, T - 2, T - 2, 5);
    ctx.fillStyle = vgrad(0, T, [shade(s, 0.18), s, shade(s, -0.18)]); ctx.fill();
    ctx.strokeStyle = shade(s, -0.55); ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(5, T - 7); ctx.lineTo(5, 5); ctx.lineTo(T - 7, 5); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.moveTo(7, T - 4.5); ctx.lineTo(T - 4.5, T - 4.5); ctx.lineTo(T - 4.5, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; circ(T - 10, 11, 1.6); ctx.fill(); circ(10, T - 11, 1.2); ctx.fill();
  });
}
function brickSprite() {
  return sprite('brick', T, T, () => {
    ctx.fillStyle = '#6e2f18'; rrect(0.5, 0.5, T - 1, T - 1, 3); ctx.fill();
    const b = (x, y, w) => {
      rrect(x + 1, y + 1, w - 2, 14, 2.5);
      ctx.fillStyle = vgrad(y, y + 15, ['#f08a56', '#c95a2f']); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(x + 3, y + 2.5, w - 6, 2);
    };
    ctx.save(); rrect(0.5, 0.5, T - 1, T - 1, 3); ctx.clip();
    b(0, 0, 16); b(16, 0, 16); b(-8, 16, 16); b(8, 16, 16); b(24, 16, 16);
    ctx.restore();
    ctx.strokeStyle = '#4a1e0c'; ctx.lineWidth = 2; rrect(0.5, 0.5, T - 1, T - 1, 3); ctx.stroke();
  });
}
function boxSprite(used) {
  return sprite(used ? 'used' : 'box', T, T, () => {
    rrect(1, 1, T - 2, T - 2, 6);
    ctx.fillStyle = used ? vgrad(0, T, ['#b48a62', '#7e5838']) : vgrad(0, T, ['#ffe680', '#ffc23a', '#e99a14']); ctx.fill();
    ctx.strokeStyle = used ? '#4a2f1c' : '#7a4606'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = used ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5;
    rrect(4, 4, T - 8, T - 8, 4); ctx.stroke();
    ctx.fillStyle = used ? '#5a3a22' : '#a86410';
    for (const [a, b] of [[6, 6], [T - 6, 6], [6, T - 6], [T - 6, T - 6]]) { circ(a, b, 1.7); ctx.fill(); }
    if (!used) text('?', T / 2, T / 2 + 1, 21, '#ffffff', 'center', '#a05a06', 5);
  });
}
function onewaySprite() {
  return sprite('oneway', T, 22, () => {
    ctx.fillStyle = '#6a4020';
    ctx.beginPath(); ctx.moveTo(5, 9); ctx.lineTo(11, 9); ctx.lineTo(8, 20); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(T - 11, 9); ctx.lineTo(T - 5, 9); ctx.lineTo(T - 8, 20); ctx.closePath(); ctx.fill();
    rrect(0, 0.5, T, 10, 4);
    ctx.fillStyle = vgrad(0, 11, ['#e6aa6a', '#b97a42', '#8e5a2c']); ctx.fill();
    ctx.strokeStyle = '#4e2c12'; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.strokeStyle = 'rgba(80,40,10,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(4, 5.5); ctx.lineTo(14, 5.5); ctx.moveTo(18, 7); ctx.lineTo(28, 7); ctx.stroke();
    ctx.fillStyle = '#5a5f73'; circ(5, 5.5, 1.3); ctx.fill(); circ(T - 5, 5.5, 1.3); ctx.fill();
  });
}
function spikeSprite() {
  return sprite('spike', T, T, () => {
    for (let i = 0; i < 3; i++) {
      const x = i * (T / 3), m = x + T / 6;
      ctx.beginPath(); ctx.moveTo(x + 1, T); ctx.lineTo(m, 10); ctx.lineTo(x + T / 3 - 1, T); ctx.closePath();
      const g = ctx.createLinearGradient(x, 0, x + T / 3, 0);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#aeb4c6'); g.addColorStop(1, '#4a4f66');
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = '#1e1a2e'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.fillStyle = '#e8303f'; ctx.beginPath(); ctx.moveTo(m - 2.2, 15); ctx.lineTo(m, 10); ctx.lineTo(m + 2.2, 15); ctx.fill();
    }
    ctx.fillStyle = '#3a3550'; ctx.fillRect(0, T - 4, T, 4);
  });
}

// ===== 장식 =====
function decoSprite(kind) {
  return sprite('d' + kind, 30, 32, () => {
    ctx.translate(15, 30);
    const ol = OLC;
    const flower = (petal, center) => {
      ctx.strokeStyle = '#3f8a2e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(2, -8, 0, -14); ctx.stroke();
      ctx.fillStyle = '#5cc44a'; ell(-4, -6, 4, 2, -0.5); ctx.fill(); ell(4, -8, 4, 2, 0.5); ctx.fill();
      ctx.lineWidth = 1.3; ctx.strokeStyle = shade(petal, -0.45);
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; circ(Math.cos(a) * 4, -16 + Math.sin(a) * 4, 3.2); ctx.fillStyle = petal; ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = center; circ(0, -16, 2.6); ctx.fill();
    };
    switch (kind) {
      case 'tuft': case 'drytuft': case 'icetuft': {
        const col = kind === 'tuft' ? '#5ccf4a' : kind === 'drytuft' ? '#d8b866' : '#bfe6ff';
        ctx.fillStyle = col; ctx.strokeStyle = shade(col, -0.45); ctx.lineWidth = 1.2;
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 3 - 2, 1); ctx.quadraticCurveTo(i * 4, -6, i * 5 + 1, -10 - (2 - Math.abs(i)) * 2); ctx.lineTo(i * 3 + 2, 1); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        break;
      }
      case 'flowerR': flower('#ff6b7d', '#ffe27a'); break;
      case 'flowerY': flower('#ffd84a', '#ff9a3a'); break;
      case 'flowerW': flower('#ffffff', '#ffcf4a'); break;
      case 'flowerP': flower('#ffb3dc', '#ffffff'); break;
      case 'bush':
        outlined([{ path: () => circ(-7, -6, 7), fill: '#4fb648' }, { path: () => circ(6, -6, 7), fill: '#4fb648' }, { path: () => circ(0, -11, 8), fill: '#5fcf55' }], ol, 3);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; circ(-2, -14, 3); ctx.fill();
        break;
      case 'rock':
        outlined([{ path: () => ell(0, -5, 9, 6), fill: '#9aa0b4' }], ol, 2.5);
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ell(-3, -8, 4, 2); ctx.fill();
        break;
      case 'cactus':
        outlined([
          { path: () => rrect(-4, -24, 8, 25, 4), fill: '#4fae5a' },
          { path: () => rrect(-12, -18, 6, 11, 3), fill: '#4fae5a' },
          { path: () => rrect(-12, -10, 9, 5, 2.5), fill: '#4fae5a' },
          { path: () => rrect(6, -21, 6, 12, 3), fill: '#4fae5a' },
          { path: () => rrect(3, -12, 9, 5, 2.5), fill: '#4fae5a' },
        ], ol, 2.5);
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(-2.5, -21, 1.5, 18);
        break;
      case 'barrel':
        outlined([{ path: () => ell(0, -7, 8, 7.5), fill: '#5cba5a' }], ol, 2.5);
        ctx.strokeStyle = 'rgba(0,60,20,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-3, -14); ctx.lineTo(-3, 0); ctx.moveTo(3, -14); ctx.lineTo(3, 0); ctx.stroke();
        ctx.fillStyle = '#ff7aa8'; circ(0, -15, 3); ctx.fill();
        break;
      case 'snowpile':
        outlined([{ path: () => ell(0, -3, 11, 6), fill: '#f4faff' }], '#5a6f9e', 2);
        ctx.fillStyle = '#cfe2f5'; ell(3, -1, 7, 2.5); ctx.fill();
        break;
      case 'crystal': case 'ember': {
        const c1 = kind === 'crystal' ? '#9fe0ff' : '#ff8a3a', c2 = kind === 'crystal' ? '#4f9fe0' : '#d0401a';
        if (kind === 'ember') { ctx.fillStyle = 'rgba(255,120,40,0.3)'; circ(0, -8, 12); ctx.fill(); }
        const shard = (x, h, w, a) => { ctx.save(); ctx.translate(x, 0); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(-w * 0.8, -h * 0.7); ctx.lineTo(0, -h); ctx.lineTo(w * 0.8, -h * 0.7); ctx.lineTo(w, 0); ctx.closePath(); const g = ctx.createLinearGradient(-w, 0, w, 0); g.addColorStop(0, shade(c1, 0.4)); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = shade(c2, -0.5); ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore(); };
        shard(-5, 12, 3, -0.35); shard(5, 10, 3, 0.4); shard(0, 17, 4, 0);
        break;
      }
      case 'pine':
        ctx.fillStyle = '#6a4a30'; ctx.fillRect(-1.5, -4, 3, 4);
        outlined([0, 1, 2].map(k => ({ path: () => { ctx.beginPath(); ctx.moveTo(0, -24 + k * 6); ctx.lineTo(-8 + k * -1, -10 + k * 4); ctx.lineTo(8 + k, -10 + k * 4); ctx.closePath(); }, fill: '#3f8f6a' })), '#1e3a3a', 2);
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(-3, -19); ctx.lineTo(3, -19); ctx.fill();
        break;
      case 'vent':
        outlined([{ path: () => rrect(-6, -13, 12, 14, 2), fill: '#4a3a44' }, { path: () => rrect(-8, -16, 16, 4, 2), fill: '#5c4a56' }], '#140c12', 2);
        ctx.fillStyle = 'rgba(255,140,60,0.8)'; ctx.fillRect(-3, -8, 6, 3);
        ctx.fillStyle = 'rgba(120,100,110,0.5)'; circ(1, -20, 4); ctx.fill(); circ(-2, -26, 3); ctx.fill();
        break;
      case 'puff':
        outlined([{ path: () => circ(-6, -5, 6), fill: '#ffffff' }, { path: () => circ(5, -5, 6), fill: '#ffffff' }, { path: () => circ(0, -9, 7), fill: '#ffffff' }], '#b9a6e0', 2);
        ctx.fillStyle = 'rgba(220,200,255,0.6)'; ell(0, -2, 9, 2); ctx.fill();
        break;
      case 'starflower':
        ctx.strokeStyle = '#5fbf6a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -12); ctx.stroke();
        ctx.fillStyle = '#ffe27a'; ctx.strokeStyle = '#c4861a'; ctx.lineWidth = 1.4; star5(0, -16, 6, 2.8, 0); ctx.fill(); ctx.stroke();
        break;
    }
  });
}

// ===== 배경 레이어 (가로로 이어지게 1024px 단위) =====
const LW = 1024, LP = (Math.PI * 2) / LW;
function sun(W, x, y, time) {
  const glow = sprite('sun' + W.kind, 200, 200, () => {
    ctx.fillStyle = rgrad(100, 100, 10, 100, [alpha(W.sun, 0.55), alpha(W.sun, 0.18), alpha(W.sun, 0)]);
    ctx.fillRect(0, 0, 200, 200);
  });
  ctx.drawImage(glow, x - 100, y - 100, 200, 200);
  ctx.save(); ctx.translate(x, y); ctx.rotate(time * 0.08);
  ctx.fillStyle = alpha(W.sun, 0.12);
  for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-9, -150); ctx.lineTo(9, -150); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = rgrad(x - 8, y - 8, 4, 34, [shade(W.sun, 0.5), W.sun]); circ(x, y, 30); ctx.fill();
}
function cloudSprite(wi, v) {
  return sprite(`c${wi}|${v}`, 140, 70, () => {
    const W = WORLDS[wi], dark = W.kind === 'lava';
    const base = dark ? '#6a3a55' : '#ffffff', sh = dark ? '#4a2440' : mix(W.sky[0], '#ffffff', 0.55);
    const r = mulberry(v * 31 + 7), pts = [];
    for (let i = 0; i < 6; i++) pts.push([22 + i * 18 + r() * 6, 44 - Math.sin((i / 5) * Math.PI) * (14 + r() * 8), 13 + Math.sin((i / 5) * Math.PI) * 9 + r() * 4]);
    ctx.fillStyle = base;
    for (const [x, y, rr] of pts) { circ(x, y, rr); ctx.fill(); }
    rrect(14, 40, 112, 18, 9); ctx.fill();
    ctx.save();
    ctx.beginPath(); for (const [x, y, rr] of pts) { ctx.moveTo(x + rr, y); ctx.arc(x, y, rr, 0, Math.PI * 2); } ctx.rect(14, 40, 112, 18); ctx.clip();
    ctx.fillStyle = alpha(sh, dark ? 0.8 : 0.75); ctx.fillRect(0, 46, 140, 30);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; for (const [x, y, rr] of pts) { circ(x - rr * 0.3, y - rr * 0.35, rr * 0.45); ctx.fill(); }
    ctx.restore();
  });
}
function layerSprite(wi, idx) {
  const H = [250, 210, 180][idx];
  return sprite(`L${wi}|${idx}`, LW, H, () => {
    const W = WORLDS[wi], k = W.kind, rnd = mulberry(wi * 50 + idx * 7 + 1);
    const ridgeFn = idx === 0
      ? x => Math.sin(2 * LP * x + 0.5) * 0.55 + Math.sin(5 * LP * x + 1.7) * 0.3 + Math.sin(11 * LP * x + 0.3) * 0.15
      : idx === 1 ? x => Math.sin(3 * LP * x + 2) * 0.6 + Math.sin(7 * LP * x + 0.4) * 0.3 + Math.sin(13 * LP * x) * 0.1
      : x => Math.sin(2 * LP * x + 1) * 0.5 + Math.sin(5 * LP * x + 2.2) * 0.25;
    const base = [140, 110, 120][idx], amp = [62, 30, 12][idx];
    let shape = ridgeFn;
    if (idx === 0 && k === 'ice') shape = x => 1 - Math.abs(Math.sin(3 * LP * x + 0.3)) * 1.7 + Math.sin(17 * LP * x) * 0.08;
    if (idx === 0 && k === 'desert') shape = x => clamp(Math.sin(4 * LP * x + 0.5) * 2.4, -0.9, 0.55) + Math.sin(23 * LP * x) * 0.03;
    if (idx === 0 && k === 'lava') shape = x => Math.sin(3 * LP * x) * 0.5 + (Math.abs(((x * 9 * LP) / Math.PI) % 2 - 1) - 0.5) * 0.9;
    const col = [W.far, W.mid, W.near][idx];
    const y = x => base - shape(x) * amp;
    const path = () => { ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= LW; x += 8) ctx.lineTo(x, y(x)); ctx.lineTo(LW, H); ctx.closePath(); };
    if (k === 'sky' && idx === 0) {
      ctx.fillStyle = col;
      for (let i = 0; i < 16; i++) { const x = i * 64 + 32; for (const dx of [-LW, 0, LW]) { circ(x + dx, base - 10 + Math.sin(i * 2.3) * 22, 40 + Math.sin(i * 1.7) * 12); ctx.fill(); } }
      ctx.fillRect(0, base + 10, LW, H);
    } else {
      path();
      ctx.fillStyle = vgrad(base - amp, H, [shade(col, 0.08), col, mix(col, W.sky[1], 0.25)]); ctx.fill();
      ctx.save(); path(); ctx.clip();
      if (idx === 0 && (k === 'ice' || k === 'forest')) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath(); ctx.moveTo(0, 0);
        for (let x = 0; x <= LW; x += 8) ctx.lineTo(x, base - amp * 0.45 + Math.sin(x * 0.15) * 3);
        ctx.lineTo(LW, 0); ctx.closePath(); ctx.fill();
      }
      if (idx === 0 && k === 'lava') { ctx.fillStyle = 'rgba(255,110,40,0.4)'; ctx.fillRect(0, 0, LW, base - amp * 0.4); }
      ctx.restore();
      ctx.strokeStyle = alpha(shade(col, 0.35), 0.7); ctx.lineWidth = 2;
      ctx.beginPath(); for (let x = 0; x <= LW; x += 8) ctx.lineTo(x, y(x) + 1.5); ctx.stroke();
    }
    // 실루엣 장식 (먼 산에는 없음)
    if (idx === 0) return;
    const step = idx === 1 ? 64 : 128;
    for (let i = 0; i < LW / step; i++) {
      const h = hash2(i + wi * 100, idx * 31);
      if (idx === 1 && h < 0.35) continue;
      if (idx === 2 && h < 0.2) continue;
      const bx = i * step + hash2(i, idx + 9) * step * 0.5, s = 0.7 + hash2(i, 5 + idx) * 0.6;
      for (const dx of [-LW, 0, LW]) {
        const x = bx + dx;
        if (x < -80 || x > LW + 80) continue;
        const gy = y(((x % LW) + LW) % LW) + 4;
        if (idx === 1) midSil(W, x, gy, s, col);
        else nearObj(W, x, gy, s, col, i);
      }
    }
  }, 1.5);
}
function midSil(W, x, gy, s, col) {
  ctx.fillStyle = col;
  switch (W.kind) {
    case 'forest': circ(x, gy - 14 * s, 14 * s); ctx.fill(); circ(x + 13 * s, gy - 8 * s, 11 * s); ctx.fill(); circ(x - 12 * s, gy - 7 * s, 10 * s); ctx.fill(); break;
    case 'desert': rrect(x - 4 * s, gy - 30 * s, 8 * s, 32 * s, 4 * s); ctx.fill(); rrect(x - 13 * s, gy - 22 * s, 6 * s, 12 * s, 3 * s); ctx.fill(); ctx.fillRect(x - 13 * s, gy - 13 * s, 12 * s, 5 * s); break;
    case 'ice': for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.moveTo(x + k * 14 * s, gy - 34 * s); ctx.lineTo(x + k * 14 * s - 11 * s, gy + 2); ctx.lineTo(x + k * 14 * s + 11 * s, gy + 2); ctx.fill(); } break;
    case 'lava': ctx.fillRect(x - 16 * s, gy - 22 * s, 32 * s, 24 * s); ctx.fillRect(x + 6 * s, gy - 46 * s, 7 * s, 26 * s); ctx.fillStyle = 'rgba(255,140,60,0.5)'; ctx.fillRect(x - 10 * s, gy - 14 * s, 5 * s, 4 * s); ctx.fillRect(x, gy - 14 * s, 5 * s, 4 * s); break;
    case 'sky': ctx.fillRect(x - 6 * s, gy - 40 * s, 12 * s, 42 * s); ctx.beginPath(); ctx.moveTo(x - 9 * s, gy - 40 * s); ctx.lineTo(x, gy - 56 * s); ctx.lineTo(x + 9 * s, gy - 40 * s); ctx.fill(); break;
  }
}
function nearObj(W, x, gy, s, col, i) {
  const dark = shade(col, -0.18), lite = shade(col, 0.16);
  switch (W.kind) {
    case 'forest': {
      ctx.fillStyle = shade('#6a4a34', -0.1); ctx.fillRect(x - 4 * s, gy - 34 * s, 8 * s, 36 * s);
      const blobs = [[0, -52, 24], [-18, -38, 17], [18, -38, 17], [0, -36, 20]];
      ctx.fillStyle = dark; for (const [dx, dy, r] of blobs) { circ(x + dx * s, gy + dy * s + 3, r * s); ctx.fill(); }
      ctx.fillStyle = col; for (const [dx, dy, r] of blobs) { circ(x + dx * s, gy + dy * s, r * s); ctx.fill(); }
      ctx.fillStyle = lite; circ(x - 7 * s, gy - 60 * s, 9 * s); ctx.fill(); circ(x - 20 * s, gy - 42 * s, 5 * s); ctx.fill();
      break;
    }
    case 'desert':
      ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(x - 40 * s, gy + 2); ctx.lineTo(x - 30 * s, gy - 46 * s); ctx.lineTo(x + 26 * s, gy - 50 * s); ctx.lineTo(x + 38 * s, gy + 2); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 36 * s, gy + 2); ctx.lineTo(x - 28 * s, gy - 42 * s); ctx.lineTo(x + 22 * s, gy - 46 * s); ctx.lineTo(x + 32 * s, gy + 2); ctx.fill();
      ctx.fillStyle = lite; ctx.fillRect(x - 28 * s, gy - 42 * s, 50 * s, 4 * s);
      ctx.fillStyle = shade(col, -0.3); ctx.fillRect(x - 30 * s, gy - 24 * s, 60 * s, 2);
      break;
    case 'ice':
      ctx.fillStyle = shade('#5a4030', -0.2); ctx.fillRect(x - 3 * s, gy - 10 * s, 6 * s, 12 * s);
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = k % 2 ? col : dark;
        ctx.beginPath(); ctx.moveTo(x, gy - (78 - k * 20) * s); ctx.lineTo(x - (18 + k * 7) * s, gy - (38 - k * 14) * s); ctx.lineTo(x + (18 + k * 7) * s, gy - (38 - k * 14) * s); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.moveTo(x, gy - (78 - k * 20) * s); ctx.lineTo(x - (8 + k * 3) * s, gy - (62 - k * 18) * s); ctx.lineTo(x + (8 + k * 3) * s, gy - (62 - k * 18) * s); ctx.fill();
      }
      break;
    case 'lava':
      ctx.fillStyle = dark; ctx.fillRect(x - 22 * s, gy - 40 * s, 44 * s, 42 * s);
      ctx.fillStyle = col; rrect(x - 20 * s, gy - 44 * s, 40 * s, 44 * s, 6 * s); ctx.fill();
      ctx.fillStyle = 'rgba(255,150,60,0.75)'; for (let k = 0; k < 3; k++) ctx.fillRect(x - 14 * s + k * 11 * s, gy - 34 * s, 6 * s, 8 * s);
      ctx.fillStyle = dark; ctx.fillRect(x + 8 * s, gy - 86 * s, 9 * s, 44 * s); ctx.fillRect(x - 40 * s, gy - 20 * s, 22 * s, 5 * s);
      break;
    case 'sky': {
      ctx.fillStyle = col;
      for (const [dx, dy, r] of [[-20, -18, 18], [0, -28, 24], [22, -18, 18]]) { circ(x + dx * s, gy + dy * s, r * s); ctx.fill(); }
      ctx.fillRect(x - 38 * s, gy - 18 * s, 76 * s, 20 * s);
      ctx.fillStyle = lite; circ(x - 6 * s, gy - 40 * s, 9 * s); ctx.fill();
      if (i % 3 === 0) { ctx.fillStyle = '#ffd1ea'; ctx.fillRect(x - 5 * s, gy - 78 * s, 10 * s, 50 * s); ctx.fillStyle = '#ff9ac8'; ctx.beginPath(); ctx.moveTo(x - 8 * s, gy - 78 * s); ctx.lineTo(x, gy - 96 * s); ctx.lineTo(x + 8 * s, gy - 78 * s); ctx.fill(); }
      break;
    }
  }
}
function drawLayer(img, f, y0, cx, cy, fillCol) {
  const ox = (((cx * f) % LW) + LW) % LW, y = Math.round(y0 - cy * f * 0.5);
  ctx.drawImage(img, -ox, y, LW, img.vh);
  ctx.drawImage(img, -ox + LW, y, LW, img.vh);
  if (y + img.vh < VH) { ctx.fillStyle = fillCol; ctx.fillRect(0, y + img.vh - 1, VW, VH - y - img.vh + 1); }
}
let bgWorld = -1;
function drawBackdrop(W, cx, cy, time) {
  const wi = Math.max(0, WORLDS.indexOf(W));
  if (wi !== bgWorld) {
    // 다른 월드의 큰 배경 그림은 메모리에서 비운다
    for (const k of [...SPR.keys()]) if (k[0] === 'L' && !k.startsWith('L' + wi + '|')) SPR.delete(k);
    bgWorld = wi;
  }
  ctx.fillStyle = vgrad(0, VH, [W.sky[0], mix(W.sky[0], W.sky[1], 0.6), W.sky[1]]); ctx.fillRect(0, 0, VW, VH);
  if (W.kind === 'lava' || W.kind === 'sky') {
    for (let i = 0; i < 40; i++) {
      const tw = 0.5 + 0.5 * Math.sin(time * 2 + i * 1.3);
      ctx.fillStyle = W.kind === 'lava' ? `rgba(255,255,255,${0.3 + tw * 0.5})` : `rgba(255,255,255,${tw * 0.6})`;
      const x = ((hash2(i, 3) * 2400 - cx * 0.03) % VW + VW) % VW;
      ctx.fillRect(x, hash2(i, 9) * 170, 1.6, 1.6);
    }
  }
  sun(W, VW * 0.8, 72 - cy * 0.05, time);
  for (let i = 0; i < 6; i++) {
    const span = VW + 340;
    const x = ((((i * 270 - cx * 0.1 - time * 7) % span) + span) % span) - 170;
    const s = 0.55 + (i % 3) * 0.2;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(cloudSprite(wi, i % 3), x, 18 + ((i * 53) % 80) - cy * 0.05, 140 * s, 70 * s);
  }
  ctx.globalAlpha = 1;
  drawLayer(layerSprite(wi, 0), 0.1, 92, cx, cy, mix(W.far, W.sky[1], 0.25));
  ctx.fillStyle = vgrad(150, VH, [alpha(W.sky[1], 0), alpha(W.sky[1], 0.35)]); ctx.fillRect(0, 150, VW, VH - 150);
  drawLayer(layerSprite(wi, 1), 0.25, 165, cx, cy, mix(W.mid, W.sky[1], 0.25));
  ctx.fillStyle = vgrad(220, VH, [alpha(W.sky[1], 0), alpha(W.sky[1], 0.25)]); ctx.fillRect(0, 220, VW, VH - 220);
  drawLayer(layerSprite(wi, 2), 0.5, 206, cx, cy, mix(W.near, W.sky[1], 0.25));
}
function drawAmbient(W, cx, cy, time, front) {
  const type = WX[W.kind].amb, n = front ? 8 : 22;
  for (let i = 0; i < n; i++) {
    const h1 = hash2(i, front ? 71 : 11), h2 = hash2(i, 23), h3 = hash2(i, 37);
    const par = front ? 1.1 : 0.4 + h2 * 0.4;
    let x, y, a = 1;
    const wrapX = v => ((v % (VW + 40)) + VW + 40) % (VW + 40) - 20;
    switch (type) {
      case 'snow':
        x = wrapX(h1 * 3000 + Math.sin(time + i) * 20 - time * 15 - cx * par); y = (h3 * VH + time * (25 + h2 * 35)) % (VH + 10) - 5;
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; circ(x, y, front ? 2.6 : 1.2 + h2 * 1.4); ctx.fill(); break;
      case 'ember':
        x = wrapX(h1 * 3000 + Math.sin(time * 2 + i) * 15 - cx * par); y = VH - ((h3 * VH + time * (30 + h2 * 40)) % (VH + 10));
        a = 0.5 + 0.5 * Math.sin(time * 6 + i);
        ctx.fillStyle = `rgba(255,${120 + (h2 * 100) | 0},40,${0.4 + a * 0.5})`; circ(x, y, front ? 2.4 : 1 + h2 * 1.5); ctx.fill(); break;
      case 'dust':
        x = wrapX(h1 * 3000 - time * (40 + h2 * 50) - cx * par); y = h3 * VH + Math.sin(time + i) * 8;
        ctx.fillStyle = 'rgba(255,235,190,0.55)'; circ(x, y, front ? 2 : 1 + h2); ctx.fill(); break;
      case 'pollen':
        x = wrapX(h1 * 3000 + Math.sin(time * 0.7 + i) * 30 - cx * par); y = (h3 * VH + Math.sin(time * 0.9 + i * 2) * 20 + VH) % VH;
        a = 0.4 + 0.6 * Math.abs(Math.sin(time * 1.5 + i));
        ctx.fillStyle = `rgba(255,250,170,${a * 0.7})`; circ(x, y, front ? 2.4 : 1.4 + h2); ctx.fill(); break;
      case 'sparkle':
        x = wrapX(h1 * 3000 - cx * par); y = h3 * VH;
        a = Math.max(0, Math.sin(time * 2 + i * 1.7));
        ctx.fillStyle = `rgba(255,255,255,${a * 0.9})`; star5(x, y, (front ? 4 : 2.5) * a + 0.5, 1, 0); ctx.fill(); break;
    }
  }
}

// ===== 타일 =====
const isOpen = c => !SOLID[c] && c !== 2 && c !== 3;
function drawTiles(L, wi, cx, cy, time) {
  const W = WORLDS[wi];
  const x0 = Math.max(0, Math.floor(cx / T)), x1 = Math.floor((cx + VW) / T) + 1;
  const y0 = Math.max(0, Math.floor(cy / T) - 1), y1 = Math.min(ROWS - 1, Math.floor((cy + VH) / T));
  if (W.pit) {
    const py = ROWS * T - 22 - cy;
    for (let tx = x0; tx <= x1; tx++) {
      if (L.get(tx, ROWS - 1) !== 0) continue;
      const sx = tx * T - cx;
      const lava = W.kind === 'lava';
      if (lava) { ctx.fillStyle = vgrad(py - 40, py, ['rgba(255,100,30,0)', 'rgba(255,100,30,0.35)']); ctx.fillRect(sx, py - 40, T + 1, 40); }
      ctx.fillStyle = vgrad(py, py + 30, lava ? ['#ffd04a', '#ff6a1f', '#c02a10'] : [shade(W.pit, 0.25), W.pit, shade(W.pit, -0.3)]);
      ctx.fillRect(sx, py, T + 1, 30);
      ctx.strokeStyle = lava ? '#fff2a0' : 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= T; x += 4) { const wx = tx * T + x; ctx.lineTo(sx + x, py + Math.sin(wx * 0.08 + time * 3) * 2); }
      ctx.stroke();
      ctx.fillStyle = lava ? 'rgba(255,240,150,0.8)' : 'rgba(255,255,255,0.5)';
      ctx.fillRect(sx + ((time * 18 + tx * 7) % 26), py + 8 + (tx % 3) * 5, 5, 1.5);
    }
  }
  const slopes = [], decos = [];
  for (let tx = x0; tx <= x1; tx++) {
    for (let ty = y0; ty <= y1; ty++) {
      const c = L.get(tx, ty);
      if (!c) continue;
      const sx = tx * T - cx;
      let sy = ty * T - cy;
      if (c >= 4 && c <= 6) for (const b of G.bumps) if (b.tx === tx && b.ty === ty && b.t < 0.16) sy -= Math.sin((b.t / 0.16) * Math.PI) * 8;
      const v = (hash2(tx, ty) * 4) | 0;
      switch (c) {
        case 1: {
          const up = L.get(tx, ty - 1), top = isOpen(up);
          const mask = (top ? 1 : 0) | (isOpen(L.get(tx - 1, ty)) ? 2 : 0) | (isOpen(L.get(tx + 1, ty)) ? 4 : 0);
          const depth = clamp(ty - (ROWS - 3), -1, 2);
          ctx.drawImage(groundSprite(wi, mask, depth, v), sx - SIDE, sy - PAD, T + 2 * SIDE, T + PAD + 2);
          if (top && up === 0 && hash2(tx, 7) < 0.34) decos.push([tx, sx, sy]);
          break;
        }
        case 2: case 3: slopes.push([c, sx, sy, v]); break;
        case 4: ctx.drawImage(brickSprite(), sx, sy, T, T); break;
        case 5: {
          ctx.drawImage(boxSprite(false), sx, sy, T, T);
          const ph = (time * 0.9 + tx * 0.13) % 2.2;
          if (ph < 0.5) {
            ctx.save(); rrect(sx + 2, sy + 2, T - 4, T - 4, 5); ctx.clip();
            const bx = sx - 12 + (ph / 0.5) * (T + 24);
            ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.moveTo(bx, sy); ctx.lineTo(bx + 7, sy); ctx.lineTo(bx - 3, sy + T); ctx.lineTo(bx - 10, sy + T); ctx.fill();
            ctx.restore();
          }
          break;
        }
        case 6: ctx.drawImage(boxSprite(true), sx, sy, T, T); break;
        case 7: ctx.drawImage(onewaySprite(), sx, sy, T, 22); break;
        case 8: ctx.drawImage(spikeSprite(), sx, sy, T, T); break;
        case 9: ctx.drawImage(stoneSprite(wi), sx, sy, T, T); break;
      }
    }
  }
  const capH = capInfo(W).h;
  for (const [c, sx, sy, v] of slopes) ctx.drawImage(slopeSprite(wi, c === 2, v), sx - SIDE, sy - PAD, T + 2 * SIDE, T + PAD + capH + 8);
  const kinds = WX[W.kind].deco;
  for (const [tx, sx, sy] of decos) {
    const kind = kinds[Math.floor(hash2(tx, 13) * kinds.length)];
    ctx.drawImage(decoSprite(kind), sx + 1 + hash2(tx, 17) * 6, sy - 28, 30, 32);
  }
}

// ===== 물건 =====
function acornSprite() {
  return sprite('acorn', 24, 28, () => {
    ctx.translate(12, 15);
    outlined([
      { path: () => ell(0, 3, 8, 8.8), fill: '#d0843a' },
      { path: () => ell(0, -4, 9.8, 5.4), fill: '#7a4a22' },
      { path: () => rrect(-1.4, -12.5, 2.8, 6, 1.4), fill: '#5a3418' },
    ], '#3a200e', 2.6);
    ctx.fillStyle = vgrad(-2, 12, ['#eaa560', '#c47a32', '#9c5a22']); ell(0, 3.4, 7, 7.8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.65)'; ell(-3.2, 2, 1.8, 3.4, 0.2); ctx.fill();
    ctx.fillStyle = vgrad(-9, 1, ['#a26a38', '#6a3c1a']); ell(0, -4, 8.8, 4.4); ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,170,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-6, -5); ctx.lineTo(6, -5); ctx.moveTo(-4, -2.5); ctx.lineTo(4, -2.5); ctx.stroke();
  });
}
function drawAcorn(x, y, s, alphaV) {
  const img = acornSprite();
  const w = 24 * Math.max(0.12, s);
  if (alphaV != null) ctx.globalAlpha = alphaV;
  ctx.drawImage(img, x - w / 2, y - 15, w, 28);
  if (alphaV != null) ctx.globalAlpha = 1;
}
function starGlow() {
  return sprite('starglow', 64, 64, () => { ctx.fillStyle = rgrad(32, 32, 4, 32, ['rgba(255,240,140,0.7)', 'rgba(255,220,90,0.25)', 'rgba(255,220,90,0)']); ctx.fillRect(0, 0, 64, 64); });
}
function drawStar(x, y, time, ghost) {
  const yy = y + Math.sin(time * 3) * 3, pulse = 1 + Math.sin(time * 5) * 0.08;
  if (!ghost) ctx.drawImage(starGlow(), x - 32 * pulse, yy - 32 * pulse, 64 * pulse, 64 * pulse);
  ctx.save(); ctx.translate(x, yy); ctx.rotate(Math.sin(time * 2) * 0.25);
  ctx.globalAlpha = ghost ? 0.5 : 1;
  star5(0, 0, 15, 7, 0);
  ctx.fillStyle = ghost ? vgrad(-15, 15, ['#e8f0ff', '#9fb4e8']) : vgrad(-15, 15, ['#fff6a8', '#ffd23a', '#f09a10']); ctx.fill();
  ctx.strokeStyle = ghost ? '#5a6fa8' : '#9a5a06'; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ell(-4, -5, 3, 2, -0.5); ctx.fill();
  ctx.fillStyle = '#5a3a06'; circ(-3, 1, 1.4); ctx.fill(); circ(3, 1, 1.4); ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}
function drawThing(s, cx, cy, time) {
  const x = s.x - cx, y = s.y - cy;
  switch (s.k) {
    case 'spring': {
      const k = s.t > 0 ? 0.5 : 1, h = 12 * k;
      outlined([{ path: () => rrect(x - 14, y - 6, 28, 6, 2), fill: '#5a5f73' }], OLC, 3);
      ctx.strokeStyle = OLC; ctx.lineWidth = 5; ctx.beginPath();
      for (let i = 0; i <= 4; i++) ctx.lineTo(x + (i % 2 ? 8 : -8), y - 6 - (h * i) / 4);
      ctx.stroke();
      ctx.strokeStyle = '#d8dde8'; ctx.lineWidth = 2.6; ctx.beginPath();
      for (let i = 0; i <= 4; i++) ctx.lineTo(x + (i % 2 ? 8 : -8), y - 6 - (h * i) / 4);
      ctx.stroke();
      rrect(x - 16, y - 12 - h, 32, 7, 3.5);
      ctx.fillStyle = vgrad(y - 12 - h, y - 5 - h, ['#ff8a96', '#e8303f']); ctx.fill();
      ctx.strokeStyle = OLC; ctx.lineWidth = 2; ctx.stroke();
      break;
    }
    case 'pad': {
      rrect(x - 17, y - 7, 34, 7, 3.5); ctx.fillStyle = '#3a3550'; ctx.fill(); ctx.strokeStyle = OLC; ctx.lineWidth = 2; ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const on = (Math.floor(time * 8) - i + 30) % 3 === 0;
        ctx.fillStyle = on ? '#fff27a' : '#ff8a2a';
        const ax = x - 9 + i * 8;
        ctx.beginPath(); ctx.moveTo(ax - 3 * s.d, y - 6); ctx.lineTo(ax + 4 * s.d, y - 3.5); ctx.lineTo(ax - 3 * s.d, y - 1); ctx.closePath(); ctx.fill();
      }
      if (Math.floor(time * 8) % 3 === 0) { ctx.fillStyle = 'rgba(255,220,90,0.2)'; ell(x, y - 4, 22, 6); ctx.fill(); }
      break;
    }
    case 'check': {
      rrect(x - 3, y - 66, 6, 66, 3); ctx.fillStyle = vgrad(0, 1, ['#d8dde8', '#d8dde8']); ctx.fillStyle = '#c4c9d6'; ctx.fill(); ctx.strokeStyle = OLC; ctx.lineWidth = 2; ctx.stroke();
      const wave = Math.sin(time * 6) * 3;
      ctx.beginPath(); ctx.moveTo(x + 3, y - 64); ctx.quadraticCurveTo(x + 16, y - 62 + wave, x + 30, y - 56 + wave); ctx.quadraticCurveTo(x + 16, y - 50 + wave, x + 3, y - 46); ctx.closePath();
      ctx.fillStyle = s.on ? vgrad(y - 64, y - 46, ['#8af07a', '#3fbf3a']) : vgrad(y - 64, y - 46, ['#e0e3ea', '#a8adbb']); ctx.fill();
      ctx.strokeStyle = OLC; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = s.on ? '#ffe27a' : '#9aa0b4'; circ(x, y - 68, 5); ctx.fill(); ctx.stroke();
      break;
    }
    case 'goal': {
      outlined([{ path: () => rrect(x - 14, y - 10, 28, 10, 4), fill: '#4a4466' }], OLC, 3);
      rrect(x - 3.5, y - 152, 7, 144, 3.5); ctx.fillStyle = vgrad(0, 1, ['#fff', '#fff']); ctx.fillStyle = '#eef0f6'; ctx.fill(); ctx.strokeStyle = OLC; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(x - 1.5, y - 148, 1.5, 136);
      const wv = Math.sin(time * 5);
      ctx.beginPath(); ctx.moveTo(x + 3, y - 148);
      ctx.quadraticCurveTo(x + 28, y - 156 + wv * 5, x + 58, y - 144 + wv * 3);
      ctx.lineTo(x + 58, y - 108 + wv * 3);
      ctx.quadraticCurveTo(x + 28, y - 120 + wv * 5, x + 3, y - 112); ctx.closePath();
      ctx.fillStyle = vgrad(y - 150, y - 110, ['#ff8aa0', '#ff4a6e', '#d82a52']); ctx.fill();
      ctx.strokeStyle = OLC; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#d82a52'; ctx.lineWidth = 1.5; star5(x + 30, y - 130 + wv * 4, 9, 4, 0); ctx.fill(); ctx.stroke();
      ctx.drawImage(starGlow(), x - 16, y - 172, 32, 32);
      outlined([{ path: () => circ(x, y - 156, 7), fill: '#ffd34d' }], OLC, 3.5);
      break;
    }
    case 'sign': {
      outlined([{ path: () => rrect(x - 2.5, y - 26, 5, 26, 2), fill: '#8a5a30' }, { path: () => rrect(x - 15, y - 42, 30, 20, 5), fill: '#e2ae6e' }], OLC, 3.5);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x - 12, y - 39, 24, 3);
      text('!', x, y - 31, 14, '#8a4a20', 'center', false);
      const near = Math.abs(G.p.x - s.x) < 260;
      if (near) {
        const msg = t(s.text);
        font(13);
        const w = Math.min(VW - 40, ctx.measureText(msg).width + 26);
        const bx = clamp(x - w / 2, 10, VW - w - 10), by = y - 90 + Math.sin(time * 3) * 2;
        ctx.fillStyle = 'rgba(46,28,56,0.25)'; rrect(bx + 2, by + 4, w, 30, 12); ctx.fill();
        ctx.fillStyle = '#ffffff'; rrect(bx, by, w, 30, 12); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x - 7, by + 29); ctx.lineTo(x, by + 38); ctx.lineTo(x + 7, by + 29); ctx.fill();
        ctx.strokeStyle = OLC; ctx.lineWidth = 2; rrect(bx, by, w, 30, 12); ctx.stroke();
        text(msg, bx + w / 2, by + 15, 13, '#3a2a55', 'center', false);
      }
      break;
    }
  }
}
function drawPow(w, cx, cy, time) {
  const x = w.x - cx, y = w.y - cy + (w.rise > 0 ? 0 : Math.sin(time * 4 + w.t) * 3);
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = rgrad(0, 0, 4, 18, ['rgba(255,255,255,0.6)', 'rgba(255,255,255,0)']); circ(0, 0, 18); ctx.fill();
  if (w.type === 'shield') {
    ctx.fillStyle = rgrad(-3, -3, 1, 12, ['#e8fbff', '#7fd8ff', '#3a9fe0']); circ(0, 0, 11); ctx.fill();
    ctx.strokeStyle = '#1e5a9a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ell(-4, -4, 3, 2, -0.6); ctx.fill();
  } else if (w.type === 'chili') {
    ctx.rotate(-0.5);
    outlined([{ path: () => ell(0, 2, 6.5, 11.5), fill: '#ff3b3b' }, { path: () => ell(0, -9, 5.5, 2.8), fill: '#3fae3a' }], OLC, 3);
    ctx.fillStyle = '#ff9a8a'; ell(-2.5, -1, 1.8, 5); ctx.fill();
  } else {
    ctx.lineWidth = 9; ctx.strokeStyle = OLC; ctx.beginPath(); ctx.arc(0, -1, 8, Math.PI, 0, true); ctx.stroke();
    ctx.lineWidth = 6; ctx.strokeStyle = '#ff4f5e'; ctx.beginPath(); ctx.arc(0, -1, 8, Math.PI, 0, true); ctx.stroke();
    outlined([{ path: () => ctx.rect(-11, -2, 6, 7), fill: '#e8ecf3' }, { path: () => ctx.rect(5, -2, 6, 7), fill: '#e8ecf3' }], OLC, 2);
  }
  ctx.restore();
}

// ===== 아르마딜로 =====
function skinColors(skinId, time) {
  const s = SKINS.find(k => k.id === skinId) || SKINS[0];
  if (s.shell === 'rainbow') {
    const h = (time * 140) % 360;
    return { shell: `hsl(${h},85%,64%)`, shellHi: `hsl(${h},90%,80%)`, shellLo: `hsl(${h},70%,45%)`, band: `hsl(${(h + 120) % 360},80%,52%)`, skin: s.skin, sparkle: true };
  }
  return { shell: s.shell, shellHi: shade(s.shell, 0.35), shellLo: shade(s.shell, -0.22), band: s.band, skin: s.skin, sparkle: s.sparkle };
}
function drawArmadillo(x, y, o, time) {
  const C = skinColors(o.skin, time), OL = '#3a2236';
  ctx.save(); ctx.translate(x, y);
  if (o.chili) { ctx.fillStyle = rgrad(0, -14, 6, 28, ['rgba(255,200,60,0.5)', 'rgba(255,90,30,0.3)', 'rgba(255,90,30,0)']); circ(0, -14, 28 + Math.sin(time * 20) * 2); ctx.fill(); }
  if (o.ball) {
    ctx.translate(0, -13);
    ctx.scale(o.sqx || 1, o.sqy || 1);
    const r = 13;
    ctx.fillStyle = OL; circ(0, 0, r + 1.6); ctx.fill();
    ctx.fillStyle = rgrad(-4, -5, 1, r + 2, [C.shellHi, C.shell, C.shellLo]); circ(0, 0, r); ctx.fill();
    ctx.save(); circ(0, 0, r); ctx.clip();
    ctx.rotate(o.rot || 0);
    ctx.strokeStyle = C.band; ctx.lineWidth = 2.6;
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(-r * 1.7, 0, r * (1.05 + k * 0.42), -0.75, 0.75); ctx.stroke(); }
    ctx.fillStyle = C.skin; circ(r - 3, 0, 3.4); ctx.fill();
    ctx.fillStyle = OL; circ(r - 1.6, -0.6, 0.9); ctx.fill();
    ctx.rotate(-(o.rot || 0));
    ctx.fillStyle = 'rgba(255,255,255,0.42)'; ell(-4, -6, 5, 3, -0.5); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ell(3, 7, 10, 5); ctx.fill();
    ctx.restore();
    ctx.restore();
    if (o.shield) drawBubble(x, y, time);
    return;
  }
  const run = o.run || 0, air = o.air, an = o.anim || 0;
  ctx.scale((o.dir || 1) * (o.sqx || 1), o.sqy || 1);
  ctx.translate(0, -Math.abs(Math.sin(an)) * 1.6 * run);
  const leg = Math.sin(an) * 4.5 * run;
  const legs = air ? [[-7, -4], [7, -5]] : [[-6 + leg, -3], [6 - leg, -3]];
  const legCol = shade(C.band, -0.1);
  // 외곽선을 먼저 한 덩어리로
  const parts = [
    { path: () => ell(legs[0][0], legs[0][1], 4.2, 3.6), fill: legCol },
    { path: () => ell(legs[1][0], legs[1][1], 4.2, 3.6), fill: legCol },
    { path: () => { ctx.beginPath(); ctx.moveTo(-11, -11); ctx.quadraticCurveTo(-19, -8 + Math.sin(time * 8) * run, -20, -4); ctx.quadraticCurveTo(-15, -5, -10, -6); ctx.closePath(); }, fill: C.shell },
    { path: () => ell(-1, -12.5, 13.5, 11), fill: C.shell },
    { path: () => ell(18, -9, 6.2, 3.8, 0.12), fill: C.skin },
    { path: () => ell(11, -11.5, 7.6, 7), fill: C.skin },
    { path: () => ell(8.2, -18, 2.8, 4.6, -0.35), fill: C.shell },
  ];
  ctx.strokeStyle = OL; ctx.lineWidth = 3.2; ctx.lineJoin = 'round';
  for (const s of parts) { s.path(); ctx.stroke(); }
  for (const s of parts.slice(0, 3)) { s.path(); ctx.fillStyle = s.fill; ctx.fill(); }
  // 등껍질
  ctx.save(); ell(-1, -12.5, 13.5, 11); ctx.clip();
  ctx.fillStyle = vgrad(-24, -1, [C.shellHi, C.shell, C.shellLo]); ctx.fillRect(-16, -25, 30, 26);
  ctx.strokeStyle = C.band; ctx.lineWidth = 2.6;
  for (let i = -1; i <= 1; i++) { const bx = i * 6.4 - 1; ctx.beginPath(); ctx.moveTo(bx - 2.5, -24); ctx.quadraticCurveTo(bx + 1.5, -13, bx - 1, -1); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = -2; i <= 1; i++) { circ(i * 6.4 + 2.2, -16, 1.2); ctx.fill(); circ(i * 6.4 + 2, -9, 1); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ell(-5, -19.5, 6, 2.6, -0.15); ctx.fill();
  ctx.fillStyle = C.skin; ell(1, -2.5, 12, 4.4); ctx.fill();
  ctx.restore();
  // 머리
  ctx.fillStyle = C.skin; ell(18, -9, 6.2, 3.8, 0.12); ctx.fill();
  ctx.fillStyle = vgrad(-18, -4, [shade(C.skin, 0.25), C.skin]); ell(11, -11.5, 7.6, 7); ctx.fill();
  ctx.fillStyle = C.shell; ell(8.2, -18, 2.8, 4.6, -0.35); ctx.fill();
  ctx.fillStyle = '#ffb0c0'; ell(8.4, -17.6, 1.2, 2.6, -0.35); ctx.fill();
  ctx.fillStyle = OL; ell(24, -8.8, 2.2, 1.9); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; circ(23.4, -9.6, 0.7); ctx.fill();
  // 눈
  const blink = (time % 3.4) < 0.1;
  if (blink) { ctx.strokeStyle = OL; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(11.5, -13); ctx.quadraticCurveTo(14, -11.5, 16.5, -13); ctx.stroke(); }
  else {
    ctx.fillStyle = '#ffffff'; ell(14, -13.2, 3.3, 3.8); ctx.fill();
    ctx.fillStyle = OL; ell(14.9, -12.9, 2.2, 2.7); ctx.fill();
    ctx.fillStyle = '#ffffff'; circ(15.7, -14.2, 1); ctx.fill(); circ(14.2, -11.6, 0.5); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,110,140,0.45)'; ell(12.5, -8, 2.2, 1.4); ctx.fill();
  ctx.strokeStyle = OL; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(19.5, -6.8, 1.8, 0.2, Math.PI - 0.6); ctx.stroke();
  ctx.restore();
  if (o.shield) drawBubble(x, y, time);
  if (C.sparkle && G.parts && Math.random() < 0.12) G.parts.push({ type: 'spark', x: x + G.cam.x + (Math.random() - 0.5) * 26, y: y + G.cam.y - 6 - Math.random() * 22, vx: 0, vy: -20, life: 0.6, max: 0.6, color: '#fffbd0', size: 3, grav: 0 });
}
function drawBubble(x, y, time) {
  const r = 24 + Math.sin(time * 6) * 0.8;
  ctx.fillStyle = rgrad(x - 7, y - 22, 2, r, ['rgba(220,250,255,0.35)', 'rgba(140,225,255,0.12)', 'rgba(140,225,255,0.3)']); circ(x, y - 14, r); ctx.fill();
  ctx.strokeStyle = 'rgba(200,245,255,0.85)'; ctx.lineWidth = 1.8; circ(x, y - 14, r); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ell(x - 9, y - 26, 5, 2.5, -0.6); ctx.fill();
}
function shadowAt(x, footY, w, cx, cy) {
  if (!G.L) return;
  const g = probeGround(G.L, { x, w: 14 }, footY - 4, footY + 170, true);
  if (!g) return;
  const d = clamp((g.y - footY) / 170, 0, 1);
  ctx.fillStyle = `rgba(30,15,40,${0.28 * (1 - d)})`;
  ell(x - cx, g.y - cy - 1, w * (1 - d * 0.5), 3.2 * (1 - d * 0.4)); ctx.fill();
}
const trail = [];
function drawPlayer(cx, cy, time) {
  const p = G.p;
  if (!p.dead) shadowAt(p.x, p.y, 12, cx, cy);
  const fast = (p.ball || p.chili > 0) && Math.abs(p.vx) > 380;
  trail.push({ x: p.x, y: p.y, rot: p.rot });
  if (trail.length > 6) trail.shift();
  if (p.inv > 0 && !p.dead && Math.floor(time * 16) % 2 === 0) return;
  const x = p.x - cx, y = p.y - cy;
  if (p.dead) {
    ctx.save(); ctx.translate(x, y - 14); ctx.rotate(p.rot); ctx.translate(-x, -(y - 14));
    drawArmadillo(x, y, { dir: p.dir, skin: Save.data.skin, air: true }, time);
    ctx.restore();
    return;
  }
  if (fast && p.ball) {
    for (let i = 0; i < trail.length - 1; i++) {
      const q = trail[i];
      ctx.globalAlpha = 0.08 + i * 0.05;
      const C = skinColors(Save.data.skin, time);
      ctx.fillStyle = C.shell; circ(q.x - cx, q.y - cy - 13, 12); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (p.charging) {
    const k = p.charge;
    ctx.fillStyle = `rgba(255,255,255,${0.3 + k * 0.4})`;
    ell(x - p.dir * 8, y - 3, 14 + k * 12, 4.5); ctx.fill();
    ctx.strokeStyle = `rgba(255,240,150,${0.3 + k * 0.6})`; ctx.lineWidth = 2;
    circ(x, y - 13, 17 + k * 4 + Math.sin(time * 40) * 1.5); ctx.stroke();
  }
  ctx.save(); ctx.translate(x, y); ctx.scale(1.12, 1.12); ctx.translate(-x, -y);
  drawArmadillo(x, y, {
    dir: p.dir, ball: p.ball || p.charging, rot: p.rot, anim: p.anim, sqx: p.sqx, sqy: p.sqy,
    skin: Save.data.skin, shield: p.shield, chili: p.chili > 0, run: Math.min(1, Math.abs(p.vx) / 120), air: !p.ground,
  }, time);
  ctx.restore();
}

// ===== 적 =====
function drawEnemy(e, cx, cy, time) {
  const x = e.x - cx, y = e.y - cy;
  if (!e.dead) shadowAt(e.x, e.type === 'bee' ? e.y + 8 : e.y, 11, cx, cy);
  ctx.save(); ctx.translate(x, y);
  if (e.dead && e.squish <= 0) { ctx.translate(0, -10); ctx.rotate(e.rot); ctx.scale(1, -1); ctx.translate(0, 10); }
  if (e.dead && e.squish > 0) ctx.scale(1.3, 0.35);
  const f = e.face || -1;
  const eye = (ex, ey, r, look) => {
    ctx.fillStyle = '#fff'; ell(ex, ey, r, r * 1.12); ctx.fill();
    ctx.strokeStyle = OLC; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = OLC; circ(ex + look, ey + 0.4, r * 0.55); ctx.fill();
    ctx.fillStyle = '#fff'; circ(ex + look + r * 0.2, ey - r * 0.25, r * 0.2); ctx.fill();
  };
  switch (e.type) {
    case 'beetle': {
      const lg = Math.sin(e.t * 14) * 2.2;
      ctx.strokeStyle = OLC; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 7, -6); ctx.lineTo(i * 7 + lg * (i % 2 ? 1 : -1), 0); ctx.stroke(); }
      ctx.lineCap = 'butt';
      outlined([{ path: () => ell(10 * f, -9, 6.5, 6), fill: '#3a2a3e' }, { path: () => ell(-2 * f, -11, 13, 10.5), fill: '#e8434f' }], OLC, 3);
      ctx.fillStyle = vgrad(-22, -1, ['#ff7a82', '#e8434f', '#b02a36']); ell(-2 * f, -11, 13, 10.5); ctx.fill();
      ctx.strokeStyle = OLC; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-2 * f, -21); ctx.lineTo(-2 * f, -1); ctx.stroke();
      ctx.fillStyle = OLC; circ(-7 * f, -9, 2.2); ctx.fill(); circ(3 * f, -14, 2); ctx.fill(); circ(-5 * f, -16, 1.5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ell(-6 * f, -16.5, 4, 2, -0.3 * f); ctx.fill();
      eye(12 * f, -11, 2.6, f);
      break;
    }
    case 'spiky': {
      const r = 10.5;
      ctx.translate(0, -12.5);
      ctx.save(); ctx.rotate(e.t * 2.5 * -f);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.28) * r, Math.sin(a - 0.28) * r);
        ctx.lineTo(Math.cos(a) * (r + 8), Math.sin(a) * (r + 8)); ctx.lineTo(Math.cos(a + 0.28) * r, Math.sin(a + 0.28) * r);
        ctx.fillStyle = '#f0e2c8'; ctx.fill(); ctx.strokeStyle = OLC; ctx.lineWidth = 1.5; ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = OLC; circ(0, 0, r + 1.5); ctx.fill();
      ctx.fillStyle = rgrad(-3, -4, 1, r, ['#d8925a', '#9a5a2a', '#6a3a16']); circ(0, 0, r); ctx.fill();
      eye(-4 + 2 * f, -1, 3, f * 0.8); eye(4 + 2 * f, -1, 3, f * 0.8);
      ctx.strokeStyle = OLC; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-8 + 2 * f, -6.5); ctx.lineTo(-2 + 2 * f, -4.5); ctx.moveTo(8 + 2 * f, -6.5); ctx.lineTo(2 + 2 * f, -4.5); ctx.stroke();
      ctx.lineCap = 'butt';
      break;
    }
    case 'frog': {
      const air = !e.ground;
      const parts = air
        ? [{ path: () => rrect(-13, -7, 6, 10, 3), fill: '#3fa63a' }, { path: () => rrect(7, -7, 6, 10, 3), fill: '#3fa63a' }]
        : [{ path: () => ell(-9, -3, 6.5, 3.8), fill: '#3fa63a' }, { path: () => ell(9, -3, 6.5, 3.8), fill: '#3fa63a' }];
      parts.push({ path: () => ell(0, -10, 12.5, air ? 10 : 9), fill: '#5fd35a' }, { path: () => circ(-5.5, -18, 5.5), fill: '#5fd35a' }, { path: () => circ(5.5, -18, 5.5), fill: '#5fd35a' });
      outlined(parts, OLC, 3);
      ctx.fillStyle = vgrad(-20, 0, ['#8af07a', '#4fc248']); ell(0, -10, 11, air ? 8.5 : 7.5); ctx.fill();
      ctx.fillStyle = '#d6f8b0'; ell(2 * f, -5.5, 7, 3.8); ctx.fill();
      eye(-5.5 + f, -19, 3.4, f); eye(5.5 + f, -19, 3.4, f);
      ctx.fillStyle = '#ff8aa0'; circ(-8, -10, 1.6); ctx.fill(); circ(8, -10, 1.6); ctx.fill();
      break;
    }
    case 'bee': {
      const wing = Math.sin(time * 40) * 4;
      ctx.fillStyle = 'rgba(235,248,255,0.85)'; ctx.strokeStyle = 'rgba(80,110,150,0.7)'; ctx.lineWidth = 1.2;
      ell(-3, -19 - wing * 0.5, 7, 4 + wing * 0.3, -0.5); ctx.fill(); ctx.stroke();
      ell(4, -19 + wing * 0.5, 7, 4 - wing * 0.3, 0.5); ctx.fill(); ctx.stroke();
      outlined([{ path: () => { ctx.beginPath(); ctx.moveTo(-11 * f, -12); ctx.lineTo(-18 * f, -10); ctx.lineTo(-11 * f, -7); ctx.closePath(); }, fill: '#3a2a3e' }, { path: () => ell(0, -10, 12.5, 9), fill: '#ffcb2e' }], OLC, 3);
      ctx.save(); ell(0, -10, 12.5, 9); ctx.clip();
      ctx.fillStyle = vgrad(-19, -1, ['#ffe680', '#ffc21e', '#e09a10']); ctx.fillRect(-13, -20, 26, 20);
      ctx.fillStyle = OLC; ctx.fillRect(-4.5, -20, 3.6, 20); ctx.fillRect(2.6, -20, 3.6, 20);
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ell(-3, -15, 5, 2); ctx.fill();
      eye(8 * f, -12, 2.8, f);
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
      case 'spark': ctx.globalAlpha = a; ctx.fillStyle = q.color; star5(x, y, q.size * (0.4 + a * 0.6), q.size * 0.35, 0); ctx.fill(); break;
      case 'ring': ctx.globalAlpha = a; ctx.strokeStyle = q.color; ctx.lineWidth = 3 * a + 0.5; circ(x, y, q.size * (1.4 - a * 0.6)); ctx.stroke(); break;
      case 'text': ctx.globalAlpha = Math.min(1, a * 2); text(q.text, x, y, q.size, q.color, 'center', OLC); break;
      case 'streak': ctx.globalAlpha = a * 0.7; ctx.fillStyle = q.color; ctx.fillRect(x - (q.vx > 0 ? 0 : q.size), y, q.size, 2); break;
      case 'debris':
        ctx.globalAlpha = 1; ctx.save(); ctx.translate(x, y); ctx.rotate(q.rot);
        ctx.fillStyle = '#e07a4a'; ctx.fillRect(-q.size / 2, -q.size / 2, q.size, q.size);
        ctx.strokeStyle = '#4a1e0c'; ctx.lineWidth = 1.5; ctx.strokeRect(-q.size / 2, -q.size / 2, q.size, q.size);
        ctx.restore(); break;
      case 'acornpop': ctx.globalAlpha = Math.min(1, a * 2); drawAcorn(x, y, Math.abs(Math.cos(q.life * 20)) * 0.8 + 0.2); break;
    }
  }
  ctx.globalAlpha = 1;
}

// ===== 먹구름 (무한 질주) =====
function drawStorm(cx, cy, time) {
  const x = G.storm - cx;
  if (x < -120) return;
  const g = ctx.createLinearGradient(x - 140, 0, x + 50, 0);
  g.addColorStop(0, 'rgba(26,16,46,0.97)'); g.addColorStop(0.7, 'rgba(48,32,80,0.88)'); g.addColorStop(1, 'rgba(60,40,90,0)');
  ctx.fillStyle = g; ctx.fillRect(-10, 0, Math.max(0, x + 50 + 10), VH);
  for (let i = 0; i < 10; i++) {
    const yy = i * 40 + Math.sin(time * 2 + i) * 8, xx = x + Math.sin(time * 3 + i * 1.7) * 8, r = 26 + Math.sin(time * 4 + i) * 5;
    ctx.fillStyle = '#2a1c44'; circ(xx - 6, yy + 4, r); ctx.fill();
    ctx.fillStyle = rgrad(xx - 8, yy - 10, 2, r, ['#7a62a8', '#4a3672']); circ(xx, yy, r); ctx.fill();
  }
  if (Math.sin(time * 7) > 0.97) {
    ctx.strokeStyle = 'rgba(255,250,170,0.95)'; ctx.lineWidth = 3; ctx.beginPath();
    let lx = x - 10, ly = 20;
    ctx.moveTo(lx, ly);
    for (let i = 0; i < 6; i++) { lx += (Math.random() - 0.5) * 30; ly += 40; ctx.lineTo(lx, ly); }
    ctx.stroke();
  }
  const ey = VH * 0.45;
  ctx.fillStyle = '#fff'; ell(x - 12, ey, 7, 5); ctx.fill(); ell(x + 10, ey, 7, 5); ctx.fill();
  ctx.fillStyle = '#ff4a5a'; circ(x - 9, ey + 1, 3); ctx.fill(); circ(x + 13, ey + 1, 3); ctx.fill();
  ctx.strokeStyle = '#1a102e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 20, ey - 9); ctx.lineTo(x - 5, ey - 5); ctx.moveTo(x + 18, ey - 9); ctx.lineTo(x + 3, ey - 5); ctx.stroke();
}
function vignette() {
  return sprite('vig' + VW, VW, VH, () => {
    const g = ctx.createRadialGradient(VW / 2, VH * 0.45, VH * 0.45, VW / 2, VH * 0.45, VW * 0.72);
    g.addColorStop(0, 'rgba(20,10,40,0)'); g.addColorStop(1, 'rgba(20,10,40,0.28)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  });
}

// ===== 게임 화면 전체 =====
function drawWorld(time) {
  const W = WORLDS[G.world];
  let cx = G.cam.x, cy = G.cam.y;
  if (G.shake > 0) { cx += (Math.random() - 0.5) * G.shake * 2; cy += (Math.random() - 0.5) * G.shake * 2; }
  cx = Math.round(cx); cy = Math.round(cy);
  drawBackdrop(W, cx, cy, time);
  drawAmbient(W, cx, cy, time, false);
  drawTiles(G.L, G.world, cx, cy, time);
  const vis = x => x > cx - 80 && x < cx + VW + 80;
  for (const s of G.things) if (vis(s.x)) drawThing(s, cx, cy, time);
  for (const a of G.acornsArr) if (a.alive && vis(a.x)) drawAcorn(a.x - cx, a.y - cy + Math.sin(time * 3 + a.x * 0.02) * 1.5, Math.max(0.2, Math.abs(Math.cos(time * 2.6 + a.x * 0.01))));
  const prevMask = G.mode === 'stage' ? (Save.data.stages[G.world + '-' + G.stage] || {}).stars || 0 : 0;
  for (const s of G.starsObj) if (s.alive && vis(s.x)) drawStar(s.x - cx, s.y - cy, time, prevMask & (1 << s.i));
  for (const w of G.pows) if (w.alive && vis(w.x)) drawPow(w, cx, cy, time);
  for (const e of G.enemies) if (!e.gone && vis(e.x)) drawEnemy(e, cx, cy, time);
  for (const a of G.loose) if (!a.dead) drawAcorn(a.x - cx, a.y - cy, 0.9, a.t > 3.2 && Math.floor(a.t * 12) % 2 ? 0.3 : 1);
  drawPlayer(cx, cy, time);
  drawParts(cx, cy);
  drawAmbient(W, cx, cy, time, true);
  if (G.mode === 'endless') drawStorm(cx, cy, time);
  ctx.drawImage(vignette(), 0, 0, VW, VH);
  if (G.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${G.flash * 1.6})`; ctx.fillRect(0, 0, VW, VH); }
}
// 타이틀용 땅 한 줄
function drawGroundStrip(wi, gy, ox) {
  const n = Math.ceil(VW / T) + 2, start = Math.floor(ox / T);
  for (let i = 0; i < n; i++) {
    const tx = start + i, sx = tx * T - ox;
    for (let d = 0; d < 3; d++) ctx.drawImage(groundSprite(wi, d === 0 ? 1 : 0, d, (hash2(tx, d) * 4) | 0), sx - SIDE, gy + d * T - PAD, T + 2 * SIDE, T + PAD + 2);
    if (hash2(tx, 7) < 0.3) { const k = WX[WORLDS[wi].kind].deco; ctx.drawImage(decoSprite(k[Math.floor(hash2(tx, 13) * k.length)]), sx + 2, gy - 28, 30, 32); }
  }
}

// ===== HUD =====
function hudPill(x, y, w, h) {
  ctx.fillStyle = 'rgba(30,18,50,0.28)'; rrect(x + 1, y + 3, w, h, h / 2); ctx.fill();
  ctx.fillStyle = vgrad(y, y + h, ['rgba(70,50,110,0.72)', 'rgba(40,26,70,0.72)']); rrect(x, y, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
}
function drawHUD(time) {
  const p = G.p;
  hudPill(8, 8, 108, 30);
  drawAcorn(26, 23, 1);
  text(String(G.acorns), 44, 23, 18, '#fff', 'left', OLC);
  if (G.mode === 'stage') {
    text(fmtTime(G.time), 16, 52, 13, '#fff', 'left', OLC);
    for (let i = 0; i < 3; i++) {
      const x = VW / 2 - 30 + i * 30, y = 22;
      star5(x, y, 11, 5, 0);
      ctx.fillStyle = G.starGot[i] ? vgrad(y - 11, y + 11, ['#fff6a8', '#ffd23a', '#f09a10']) : 'rgba(40,26,70,0.45)'; ctx.fill();
      ctx.strokeStyle = G.starGot[i] ? '#9a5a06' : 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
    }
  } else {
    text(`${G.dist} m`, VW / 2, 22, 22, '#fff', 'center', OLC);
    text(`${t('best')} ${Save.data.bestRun} m`, VW / 2, 43, 11, 'rgba(255,255,255,0.9)', 'center', OLC);
    const gap = p.x - G.storm;
    if (gap < 200 && G.state === 'play') {
      ctx.globalAlpha = 0.6 + Math.sin(time * 12) * 0.35;
      text('⚡ ' + t('stormWarn'), VW / 2, 66, 13, '#ffe27a', 'center', OLC);
      ctx.globalAlpha = 1;
    }
  }
  let ix = 14;
  const iy = G.mode === 'stage' ? 76 : 58;
  const bar = (frac, col) => { ctx.fillStyle = 'rgba(0,0,0,0.35)'; rrect(ix + 18, iy - 3, 34, 6, 3); ctx.fill(); ctx.fillStyle = col; rrect(ix + 18, iy - 3, Math.max(3, 34 * frac), 6, 3); ctx.fill(); };
  if (p.shield) { drawPow({ type: 'shield', x: ix + 6, y: iy, rise: 1, t: 0 }, 0, 0, time); ix += 30; }
  if (p.chili > 0) { drawPow({ type: 'chili', x: ix + 6, y: iy, rise: 1, t: 0 }, 0, 0, time); bar(p.chili / 8, '#ff6a3a'); ix += 62; }
  if (p.magnet > 0) { drawPow({ type: 'magnet', x: ix + 6, y: iy, rise: 1, t: 0 }, 0, 0, time); bar(p.magnet / 12, '#ff4f5e'); ix += 62; }
  if (G.banner) {
    const a = Math.min(1, G.banner.t * 2, (2.6 - G.banner.t) * 4 + 0.2);
    ctx.globalAlpha = clamp(a, 0, 1);
    const s = 1 + Math.max(0, (G.banner.t - 2.2)) * 0.6;
    ctx.save(); ctx.translate(VW / 2, VH * 0.3); ctx.scale(s, s);
    text(G.banner.text, 0, 3, 28, OLC, 'center', OLC, 9);
    text(G.banner.text, 0, 0, 28, '#ffffff', 'center', '#ff7a3d', 6);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
function drawControls() {
  const L = ctlLayout(), cur = Input.cur;
  const pad = (c, on, draw) => {
    ctx.fillStyle = on ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.16)';
    circ(c.x, c.y + (on ? 1 : 0), c.r); ctx.fill();
    ctx.strokeStyle = on ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; draw(c);
  };
  pad(L.l, cur.l, c => { ctx.beginPath(); ctx.moveTo(c.x - 14, c.y); ctx.lineTo(c.x + 8, c.y - 14); ctx.lineTo(c.x + 8, c.y + 14); ctx.fill(); });
  pad(L.r, cur.r, c => { ctx.beginPath(); ctx.moveTo(c.x + 14, c.y); ctx.lineTo(c.x - 8, c.y - 14); ctx.lineTo(c.x - 8, c.y + 14); ctx.fill(); });
  pad(L.j, cur.j, c => { ctx.beginPath(); ctx.moveTo(c.x, c.y - 16); ctx.lineTo(c.x + 15, c.y + 6); ctx.lineTo(c.x - 15, c.y + 6); ctx.fill(); ctx.fillRect(c.x - 5, c.y + 6, 10, 8); });
  pad(L.d, cur.d, c => {
    ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(c.x, c.y, 13, 0.3, Math.PI * 1.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c.x + 14, c.y - 12); ctx.lineTo(c.x + 15, c.y - 2); ctx.lineTo(c.x + 5, c.y - 5); ctx.fill();
    if (G.p && G.p.charging) { ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(c.x, c.y, c.r - 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * G.p.charge); ctx.stroke(); }
  });
}
