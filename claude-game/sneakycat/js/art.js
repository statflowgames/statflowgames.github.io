// 캐릭터·물건 그림 (32px 타일 기준 좌표, 원점 = 발밑)
export const OUT = '#2a1f2e';

export function ell(c, x, y, rx, ry, fill, stroke, lw = 1.6) {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.lineWidth = lw; c.strokeStyle = stroke; c.stroke(); }
}
export function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function fillStroke(c, fill, stroke = OUT, lw = 1.6) {
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.lineWidth = lw; c.strokeStyle = stroke; c.stroke(); }
}
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; } else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

// ───────── 고양이 ─────────
export function drawCat(c, o) {
  const s = o.skin, t = o.t || 0;
  const walk = o.moving ? (o.walkT || 0) * (o.run ? 2.4 : 3.0) : 0;
  const bob = o.moving ? -Math.abs(Math.sin(walk * Math.PI)) * (o.run ? 2.4 : 1.3) : Math.sin(t * 2.2) * 0.35;
  c.save();
  ell(c, 0, 0, 10.5, 3.3, 'rgba(0,0,0,0.28)');
  c.scale(o.face || 1, 1);
  c.translate(0, bob);
  // 꼬리
  const sw = Math.sin(t * 3 + walk * 1.5) * 2.6;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-8, -7);
  c.bezierCurveTo(-14, -8, -17 + sw, -15, -12 + sw, -21);
  c.lineWidth = 5.8; c.strokeStyle = OUT; c.stroke();
  c.lineWidth = 3.4; c.strokeStyle = s.body; c.stroke();
  if (s.stripe !== s.body) {
    c.setLineDash([2.2, 2.6]); c.lineWidth = 3.4; c.strokeStyle = s.stripe; c.stroke(); c.setLineDash([]);
  }
  // 다리
  const legs = [[-6.5, 1], [3.8, 1], [-3, 0], [7, 0]];
  legs.forEach(([lx, far], i) => {
    const ph = walk * Math.PI + (i % 2 ? Math.PI : 0);
    const dx = o.moving ? Math.sin(ph) * (o.run ? 3 : 2) : 0;
    const lift = o.moving ? Math.max(0, Math.cos(ph)) * 1.4 : 0;
    rr(c, lx + dx - 1.9, -6, 3.8, 6 - lift, 1.8);
    fillStroke(c, far ? shade(s.body, -0.18) : s.body, OUT, 1.3);
    ell(c, lx + dx, -0.9 - lift, 2.1, 1.3, s.belly);
  });
  // 몸통
  ell(c, 0, -8, 10.2, 6.3, s.body, OUT);
  c.save();
  c.beginPath(); c.ellipse(0, -8, 9.4, 5.6, 0, 0, Math.PI * 2); c.clip();
  ell(c, 1.5, -4.2, 7, 3.2, s.belly);
  if (s.patches) {
    ell(c, -4, -11, 4.5, 3.5, s.patches[0]);
    ell(c, 3, -12, 3, 2.4, s.patches[1]);
  }
  if (s.stripe !== s.body) {
    c.strokeStyle = s.stripe; c.lineWidth = 1.7;
    for (let k = 0; k < 3; k++) {
      c.beginPath(); c.moveTo(-6.5 + k * 3.6, -14.5); c.quadraticCurveTo(-7.5 + k * 3.6, -11, -5.8 + k * 3.6, -8.5); c.stroke();
    }
  }
  c.restore();
  drawCatHead(c, s, t, 8.5, -14.5, o);
  if (o.fish) drawFish(c, 15.5, -10.5, 0.55, o.golden, -0.35);
  c.restore();
}

function drawCatHead(c, s, t, hx, hy, o) {
  const earIn = '#ffadc0';
  c.beginPath(); c.moveTo(hx - 5.5, hy - 3); c.lineTo(hx - 4.2, hy - 10.5); c.lineTo(hx + 0.2, hy - 5.5); c.closePath();
  fillStroke(c, s.patches ? s.patches[1] : s.body, OUT, 1.4);
  c.beginPath(); c.moveTo(hx + 1.5, hy - 5.8); c.lineTo(hx + 5.6, hy - 11); c.lineTo(hx + 6.7, hy - 3.2); c.closePath();
  fillStroke(c, s.body, OUT, 1.4);
  c.beginPath(); c.moveTo(hx - 4.3, hy - 4); c.lineTo(hx - 3.7, hy - 8.4); c.lineTo(hx - 1.3, hy - 5.3); c.closePath();
  c.fillStyle = earIn; c.fill();
  c.beginPath(); c.moveTo(hx + 2.8, hy - 5.7); c.lineTo(hx + 5.2, hy - 9); c.lineTo(hx + 5.6, hy - 4.2); c.closePath();
  c.fill();
  ell(c, hx, hy, 7.4, 6.6, s.body, OUT);
  if (s.patches) { c.save(); c.beginPath(); c.ellipse(hx, hy, 7, 6.2, 0, 0, Math.PI * 2); c.clip(); ell(c, hx - 4, hy - 4, 4, 3.5, s.patches[1]); c.restore(); }
  // 도둑 복면
  rr(c, hx - 6.9, hy - 3.9, 14.2, 4.6, 2.3);
  c.fillStyle = s.mask || '#2b2534'; c.fill();
  // 눈
  const blink = ((t + (o.blinkSeed || 0)) % 3.7) < 0.12;
  for (const ex of [hx - 2.3, hx + 3.1]) {
    if (blink) { c.strokeStyle = s.eye; c.lineWidth = 1.3; c.beginPath(); c.moveTo(ex - 1.6, hy - 1.6); c.lineTo(ex + 1.6, hy - 1.6); c.stroke(); continue; }
    ell(c, ex, hy - 1.6, 1.9, 2.1, s.eye);
    ell(c, ex + 0.45, hy - 1.5, 0.8, 1.55, '#151018');
    ell(c, ex - 0.4, hy - 2.4, 0.55, 0.55, '#ffffff');
  }
  ell(c, hx + 2.6, hy + 2.6, 3.4, 2.3, s.belly);
  c.beginPath(); c.moveTo(hx + 1.7, hy + 0.9); c.lineTo(hx + 3.5, hy + 0.9); c.lineTo(hx + 2.6, hy + 2); c.closePath();
  c.fillStyle = '#ff7f9b'; c.fill();
  c.strokeStyle = OUT; c.lineWidth = 0.9;
  c.beginPath(); c.moveTo(hx + 2.6, hy + 2); c.quadraticCurveTo(hx + 1.6, hy + 3.4, hx + 0.8, hy + 2.6);
  c.moveTo(hx + 2.6, hy + 2); c.quadraticCurveTo(hx + 3.6, hy + 3.4, hx + 4.4, hy + 2.6); c.stroke();
  c.strokeStyle = 'rgba(40,30,50,0.55)'; c.lineWidth = 0.6;
  c.beginPath();
  c.moveTo(hx + 5.5, hy + 1.6); c.lineTo(hx + 10, hy + 0.6);
  c.moveTo(hx + 5.5, hy + 2.6); c.lineTo(hx + 10, hy + 3.2);
  c.stroke();
  ell(c, hx - 3.6, hy + 2.4, 1.6, 0.9, 'rgba(255,120,150,0.35)');
}

// 상자 안에서 눈만 빼꼼
export function drawCatPeek(c, o) {
  const s = o.skin, t = o.t || 0;
  const up = Math.sin(t * 2.5) * 0.6;
  c.save();
  c.scale(o.face || 1, 1);
  c.translate(0, up);
  const hx = 0, hy = -12;
  c.beginPath(); c.moveTo(hx - 5.5, hy - 1); c.lineTo(hx - 4.4, hy - 8); c.lineTo(hx - 0.5, hy - 3.5); c.closePath();
  fillStroke(c, s.body, OUT, 1.3);
  c.beginPath(); c.moveTo(hx + 1, hy - 3.5); c.lineTo(hx + 5, hy - 8.5); c.lineTo(hx + 6, hy - 1); c.closePath();
  fillStroke(c, s.body, OUT, 1.3);
  rr(c, hx - 6.8, hy - 4, 13.6, 6, 3); fillStroke(c, s.body, OUT, 1.3);
  rr(c, hx - 6.2, hy - 2.6, 12.4, 3.6, 1.8); c.fillStyle = s.mask || '#2b2534'; c.fill();
  for (const ex of [hx - 2.2, hx + 2.6]) { ell(c, ex, hy - 0.8, 1.6, 1.7, s.eye); ell(c, ex + 0.3, hy - 0.8, 0.6, 1.3, '#151018'); }
  c.restore();
}

// ───────── 사람 ─────────
const HUMAN = {
  owner: { top: '#8ec5ff', pants: '#7fb3ef', shoe: '#ff9fb7', hair: '#6b4a3a', skin: '#ffd9b8', light: false },
  butler: { top: '#2d2f3d', pants: '#24252f', shoe: '#141418', hair: '#c9cad3', skin: '#f6d2b0', light: false },
  guard: { top: '#365887', pants: '#26385a', shoe: '#1a1d26', hair: '#3a2a22', skin: '#f2c9a3', light: true },
};
export function drawHuman(c, o) {
  const P = HUMAN[o.type];
  const sx = Math.cos(o.face), sy = Math.sin(o.face);
  const flip = sx < 0 ? -1 : 1;
  const view = sy < -0.6 ? 'back' : sy > 0.6 ? 'front' : 'side';
  const ph = o.moving ? (o.walkT || 0) * 2.2 : 0;
  const bob = o.moving ? -Math.abs(Math.sin(ph * Math.PI)) * 1.6 : Math.sin((o.t || 0) * 1.8) * 0.4;
  const alert = o.state === 'chase';
  c.save();
  ell(c, 0, 0, 10, 3.4, 'rgba(0,0,0,0.3)');
  c.scale(flip, 1);
  // 다리
  for (const i of [-1, 1]) {
    const sw = o.moving ? Math.sin(ph * Math.PI + (i > 0 ? Math.PI : 0)) * (view === 'side' ? 3 : 1.2) : 0;
    const lx = (view === 'side' ? i * 2 : i * 3.2) + (view === 'side' ? sw : 0);
    const lift = view !== 'side' ? Math.max(0, sw) * 1.2 : 0;
    rr(c, lx - 2.3, -10 - lift, 4.6, 9, 2); fillStroke(c, P.pants, OUT, 1.3);
    ell(c, lx + (view === 'side' ? 1 : 0), -1.4 - lift, 3.1, 1.9, P.shoe, OUT, 1.1);
  }
  c.translate(0, bob);
  // 몸통
  rr(c, -7.6, -22, 15.2, 14, 5.5); fillStroke(c, P.top);
  if (o.type === 'owner') {
    c.fillStyle = 'rgba(255,255,255,0.75)';
    for (const [dx, dy] of [[-4, -18], [2, -19], [-1, -13.5], [4.5, -13], [-5, -11]]) { c.beginPath(); c.arc(dx, dy, 0.9, 0, 7); c.fill(); }
  } else if (o.type === 'butler') {
    if (view !== 'back') {
      c.beginPath(); c.moveTo(-3, -22); c.lineTo(view === 'side' ? 3 : 0, -14); c.lineTo(3.2, -22); c.closePath(); c.fillStyle = '#f4f2ee'; c.fill();
      c.fillStyle = '#c8344a';
      c.beginPath(); c.moveTo(-2.4, -21.3); c.lineTo(0, -20.3); c.lineTo(-2.4, -19.2); c.fill();
      c.beginPath(); c.moveTo(2.6, -21.3); c.lineTo(0.2, -20.3); c.lineTo(2.6, -19.2); c.fill();
    }
  } else if (o.type === 'guard') {
    c.fillStyle = '#1d2a44'; c.fillRect(-7.4, -12.5, 14.8, 2.2);
    if (view !== 'back') { c.fillStyle = '#ffd34d'; c.beginPath(); c.arc(view === 'side' ? 3.5 : -3.2, -18, 1.5, 0, 7); c.fill(); }
  }
  // 팔과 손전등
  if (view !== 'back') {
    const hx = view === 'side' ? 7.5 : 5.5, hy = view === 'side' ? -14 : -11.5;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(view === 'side' ? 2 : 6, -19); c.lineTo(hx, hy);
    c.lineWidth = 5; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 3.2; c.strokeStyle = P.top; c.stroke();
    if (o.type !== 'butler' || true) {
      c.save(); c.translate(hx, hy); if (view === 'front') c.rotate(Math.PI / 2);
      rr(c, -1, -1.8, 7, 3.6, 1.2); fillStroke(c, '#55596a', OUT, 1);
      ell(c, 6.2, 0, 1.2, 2.3, alert ? '#ff8a8a' : '#fff1b0');
      c.restore();
    }
    ell(c, hx, hy, 1.9, 1.9, P.skin, OUT, 1);
  }
  // 머리
  const hy = -29;
  ell(c, 0, hy, 8.6, 8.2, P.skin, OUT);
  if (view === 'back') {
    c.beginPath(); c.ellipse(0, hy - 0.5, 8.4, 8, 0, 0, Math.PI * 2); c.fillStyle = P.hair; c.fill();
  } else {
    const fx = view === 'side' ? 2.6 : 0;
    // 머리카락
    c.fillStyle = P.hair;
    c.beginPath(); c.ellipse(-fx * 0.6, hy - 3.5, 8.3, 5.2, 0, Math.PI, Math.PI * 2); c.fill();
    if (view === 'side') { c.beginPath(); c.ellipse(-5, hy, 3.6, 6, 0, 0, Math.PI * 2); c.fill(); }
    if (o.type === 'owner') { c.beginPath(); c.moveTo(-2, hy - 8); c.lineTo(0, hy - 11); c.lineTo(1.5, hy - 7.5); c.fill(); }
    // 눈
    const sleepy = o.type === 'owner' && !alert && o.state !== 'suspicious' && o.state !== 'investigate';
    const big = alert || o.state === 'suspicious';
    for (const ex of view === 'side' ? [fx + 0.6, fx + 4.6] : [-3, 3]) {
      if (sleepy) { c.strokeStyle = OUT; c.lineWidth = 1.2; c.beginPath(); c.arc(ex, hy + 0.2, 1.4, 0.2, Math.PI - 0.2); c.stroke(); }
      else { ell(c, ex, hy, big ? 1.6 : 1.2, big ? 2 : 1.6, '#1d1620'); ell(c, ex - 0.4, hy - 0.6, 0.45, 0.45, '#fff'); }
    }
    if (o.type === 'butler') { c.fillStyle = '#9fa0aa'; c.beginPath(); c.ellipse(fx + 2.5, hy + 3.6, 3, 1.1, 0, 0, Math.PI * 2); c.fill(); }
    else if (alert) { ell(c, fx + 2.4, hy + 4, 1.4, 1.6, '#7a2b33'); }
    else { c.strokeStyle = OUT; c.lineWidth = 0.9; c.beginPath(); c.moveTo(fx + 1.4, hy + 4); c.lineTo(fx + 3.2, hy + 4); c.stroke(); }
    ell(c, (view === 'side' ? fx - 1.6 : -4.6), hy + 2.4, 1.6, 0.9, 'rgba(255,120,120,0.35)');
  }
  // 모자
  if (o.type === 'owner') {
    c.beginPath(); c.moveTo(-8, hy - 3); c.quadraticCurveTo(-2, hy - 15, 8, hy - 4); c.quadraticCurveTo(-1, hy - 6, -8, hy - 3);
    fillStroke(c, '#ff8fa3', OUT, 1.2);
    c.beginPath(); c.moveTo(-1, hy - 11); c.quadraticCurveTo(-9, hy - 14, -11, hy - 6); c.lineWidth = 3; c.strokeStyle = '#ff8fa3'; c.stroke();
    ell(c, -11, hy - 5.4, 2.2, 2.2, '#fff', OUT, 1);
  } else if (o.type === 'guard') {
    rr(c, -8.2, hy - 9.5, 16.4, 6.5, 3); fillStroke(c, '#22355a', OUT, 1.3);
    if (view !== 'back') {
      c.beginPath(); c.ellipse(view === 'side' ? 6 : 0, hy - 3.2, view === 'side' ? 5 : 8, 1.8, 0, 0, Math.PI * 2); c.fillStyle = '#16213a'; c.fill();
      ell(c, view === 'side' ? 2 : 0, hy - 6.6, 1.5, 1.5, '#ffd34d');
    }
  }
  c.restore();
}

// ───────── 강아지 ─────────
const DOGC = [
  { body: '#e8b27a', belly: '#fff3df', ear: '#c98a4e' },
  { body: '#d4813f', belly: '#fff0dc', ear: '#a85e26' },
  { body: '#3c3238', belly: '#c98f5a', ear: '#2a2226' },
];
export function drawDog(c, o) {
  const D = DOGC[(o.ch || 1) - 1];
  const t = o.t || 0;
  c.save();
  const flip = Math.cos(o.face) < 0 ? -1 : 1;
  if (o.sleep) {
    ell(c, 0, 0, 12, 3.3, 'rgba(0,0,0,0.28)');
    c.scale(flip, 1);
    const br = Math.sin(t * 2) * 0.5;
    ell(c, -1, -4.5, 11, 4.8 + br, D.body, OUT);
    ell(c, -9.5, -6, 3.2, 3.2, D.belly, OUT, 1.2);
    ell(c, 8.5, -5, 6, 5, D.body, OUT);
    ell(c, 12.5, -3.6, 3.4, 2.4, D.belly, OUT, 1.1);
    ell(c, 15.4, -4, 1, 0.8, '#1a1418');
    c.beginPath(); c.moveTo(5, -8.5); c.lineTo(6.5, -12.5); c.lineTo(9.5, -9.6); c.closePath(); fillStroke(c, D.ear, OUT, 1.1);
    c.strokeStyle = OUT; c.lineWidth = 1.1; c.beginPath(); c.arc(10, -5.5, 1.3, 0.2, Math.PI - 0.2); c.stroke();
    rr(c, 2.3, -9, 2, 6, 1); c.fillStyle = '#d43c4d'; c.fill();
    c.restore();
    return;
  }
  ell(c, 0, 0, 11, 3.3, 'rgba(0,0,0,0.28)');
  c.scale(flip, 1);
  const walk = o.moving ? (o.walkT || 0) * 2.6 : 0;
  const bob = o.moving ? -Math.abs(Math.sin(walk * Math.PI)) * 1.6 : 0;
  c.translate(0, bob);
  // 꼬리 (동그랗게 말린)
  const wag = Math.sin(t * (o.state === 'chase' ? 18 : 7)) * 0.4;
  c.save(); c.translate(-9, -12); c.rotate(wag);
  c.beginPath(); c.arc(0, -2.5, 3.2, 0.4, Math.PI * 1.9); c.lineWidth = 4.6; c.strokeStyle = OUT; c.stroke(); c.lineWidth = 2.8; c.strokeStyle = D.body; c.stroke();
  c.restore();
  [[-6.5, 1], [4.5, 1], [-3.5, 0], [7.5, 0]].forEach(([lx, far], i) => {
    const dx = o.moving ? Math.sin(walk * Math.PI + (i % 2 ? Math.PI : 0)) * 2.4 : 0;
    rr(c, lx + dx - 1.9, -6.5, 3.8, 6.5, 1.6); fillStroke(c, far ? shade(D.body, -0.18) : D.body, OUT, 1.2);
    ell(c, lx + dx, -0.9, 2.1, 1.2, D.belly);
  });
  ell(c, 0, -9, 10.5, 6.2, D.body, OUT);
  ell(c, 2, -5.6, 7, 2.6, D.belly);
  // 머리
  const hx = 9.5, hy = -15;
  c.beginPath(); c.moveTo(hx - 5.5, hy - 2.5); c.lineTo(hx - 4.5, hy - 10); c.lineTo(hx - 0.6, hy - 5); c.closePath(); fillStroke(c, D.ear, OUT, 1.2);
  c.beginPath(); c.moveTo(hx + 0.8, hy - 5.4); c.lineTo(hx + 4, hy - 10.5); c.lineTo(hx + 5.6, hy - 3); c.closePath(); fillStroke(c, D.ear, OUT, 1.2);
  ell(c, hx, hy, 6.8, 6.2, D.body, OUT);
  ell(c, hx + 5, hy + 2, 4.2, 3, D.belly, OUT, 1.2);
  ell(c, hx + 8.6, hy + 1, 1.4, 1.1, '#1a1418');
  const angry = o.state === 'chase';
  ell(c, hx + 1.8, hy - 1.8, 1.3, angry ? 1 : 1.6, '#1a1418');
  if (angry) { c.strokeStyle = OUT; c.lineWidth = 1; c.beginPath(); c.moveTo(hx - 0.2, hy - 4.6); c.lineTo(hx + 3.3, hy - 3.2); c.stroke(); }
  if (angry || o.state === 'suspicious') {
    c.beginPath(); c.moveTo(hx + 3, hy + 4); c.quadraticCurveTo(hx + 6, hy + 7.5, hx + 8.5, hy + 4); c.fillStyle = '#c8344a'; c.fill();
  }
  rr(c, hx - 5.5, hy + 3, 2.2, 5.5, 1); c.fillStyle = '#d43c4d'; c.fill();
  ell(c, hx - 4.2, hy + 7.6, 1.4, 1.4, '#ffd34d');
  c.restore();
}

// ───────── 로봇청소기 ─────────
export function drawRoomba(c, r, t) {
  c.save();
  ell(c, 0, 1, 12, 5, 'rgba(0,0,0,0.3)');
  ell(c, 0, -1, 11.5, 7.2, '#2f333f', OUT);
  ell(c, 0, -3.2, 11, 6.6, '#5b6275', OUT, 1.3);
  ell(c, 0, -3.6, 7, 4, '#444a5b');
  const fx = Math.cos(r.ang) * 8, fy = Math.sin(r.ang) * 4.5 - 3.4;
  ell(c, fx, fy, 1.6, 1.2, Math.sin(t * 6) > 0 ? '#6dff9b' : '#2b8a4d');
  c.restore();
}

// ───────── 물건 ─────────
export function drawFish(c, x, y, k = 1, golden = false, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(k, k);
  const body = golden ? '#ffd447' : '#9fd0ff', dark = golden ? '#e09a12' : '#5c93cf';
  c.beginPath(); c.moveTo(-8, 0); c.lineTo(-13, -4.5); c.lineTo(-12, 0); c.lineTo(-13, 4.5); c.closePath(); fillStroke(c, dark, OUT, 1.4);
  ell(c, 0, 0, 9, 4.8, body, OUT, 1.5);
  c.beginPath(); c.moveTo(-3, -4.4); c.quadraticCurveTo(0, -7.5, 3, -4.4); fillStroke(c, dark, OUT, 1.1);
  c.strokeStyle = dark; c.lineWidth = 1; c.beginPath(); c.arc(3.5, 0, 3, -1.2, 1.2); c.stroke();
  ell(c, 5.8, -1, 1.3, 1.3, '#fff'); ell(c, 6, -1, 0.7, 0.7, '#1a1418');
  c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(-1.5, -2, 3.5, 1, -0.1, 0, Math.PI * 2); c.fill();
  c.restore();
}
export function drawBonus(c, kind, t) {
  const b = Math.sin(t * 3) * 1.5;
  c.save(); c.translate(0, -6 + b);
  if (kind === 'yarn') {
    ell(c, 0, 0, 6, 6, '#ff8fc0', OUT, 1.4);
    c.strokeStyle = '#d65a94'; c.lineWidth = 1;
    for (const a of [-0.6, 0.1, 0.8]) { c.beginPath(); c.ellipse(0, 0, 5.5, 2.4, a, 0, Math.PI * 2); c.stroke(); }
    c.beginPath(); c.moveTo(4, 4); c.quadraticCurveTo(9, 7, 7, 10); c.lineWidth = 1.2; c.stroke();
  } else if (kind === 'tuna') {
    rr(c, -6, -5, 12, 9, 2); fillStroke(c, '#ffcf3f', OUT, 1.4);
    c.fillStyle = '#e04a5a'; c.fillRect(-5.3, -2, 10.6, 3.6);
    ell(c, 0, -5, 6, 1.8, '#fff0a8', OUT, 1.2);
    drawFish(c, 0, -0.2, 0.25, false);
  } else {
    c.beginPath(); c.moveTo(0, -7); c.lineTo(6, -2); c.lineTo(0, 7); c.lineTo(-6, -2); c.closePath(); fillStroke(c, '#7ef0ff', OUT, 1.4);
    c.beginPath(); c.moveTo(-6, -2); c.lineTo(6, -2); c.moveTo(0, -7); c.lineTo(-2, -2); c.lineTo(0, 7); c.lineTo(2, -2); c.closePath();
    c.strokeStyle = '#2aa3c7'; c.lineWidth = 0.8; c.stroke();
    ell(c, -2, -4, 1.2, 0.8, '#ffffff');
  }
  c.restore();
}
export function drawVase(c, broken, t) {
  if (broken) {
    c.fillStyle = '#7fb6e8';
    for (const [x, y, r] of [[-5, -2, 0.4], [3, -1, -0.6], [-1, 1, 1.2], [6, 2, 0.2], [-7, 3, -1]]) {
      c.save(); c.translate(x, y); c.rotate(r); c.beginPath(); c.moveTo(-2, 0); c.lineTo(0, -2.5); c.lineTo(2.5, 0.5); c.closePath(); c.fill(); c.lineWidth = 0.8; c.strokeStyle = OUT; c.stroke(); c.restore();
    }
    ell(c, 0, 1, 7, 2, 'rgba(120,180,255,0.25)');
    return;
  }
  ell(c, 0, 0, 7, 2.6, 'rgba(0,0,0,0.3)');
  rr(c, -6, -6, 12, 6, 1.5); fillStroke(c, '#8b5a3c', OUT, 1.3);
  c.beginPath(); c.moveTo(-3, -6); c.quadraticCurveTo(-7, -12, -3.5, -18); c.lineTo(3.5, -18); c.quadraticCurveTo(7, -12, 3, -6); c.closePath();
  fillStroke(c, '#d8ecff', OUT, 1.4);
  c.strokeStyle = '#4f86c6'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-5, -12); c.quadraticCurveTo(0, -9, 5, -12); c.stroke();
  const sw = Math.sin(t * 1.5) * 0.08;
  for (const [a, col] of [[-0.5, '#ff7fa8'], [0.05, '#ffd34d'], [0.55, '#ff9a5a']]) {
    c.save(); c.translate(0, -18); c.rotate(a + sw);
    c.strokeStyle = '#4f9a4a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -7); c.stroke();
    ell(c, 0, -8, 2.4, 2.4, col, OUT, 1);
    c.restore();
  }
}
export function drawSwitch(c, on, t) {
  rr(c, -7, -26, 14, 15, 2.5); fillStroke(c, '#8d95a8', OUT, 1.4);
  rr(c, -4.5, -23.5, 9, 10, 1.5); c.fillStyle = '#3c4252'; c.fill();
  rr(c, -1.8, on ? -23 : -18, 3.6, 5, 1.2); fillStroke(c, on ? '#ff5d6c' : '#6dff9b', OUT, 1);
  ell(c, 5, -24.5, 1.2, 1.2, on ? (Math.sin(t * 6) > 0 ? '#ff3b4f' : '#6a1d26') : '#41ff8a');
  c.fillStyle = '#ffd34d'; c.font = 'bold 5px sans-serif'; c.textAlign = 'center'; c.fillText('⚡', 0, -9);
}
