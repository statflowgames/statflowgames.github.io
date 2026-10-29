'use strict';
/* 펭귄 썰매 활강 — 그리기 (그림 파일 없이 전부 코드로 그린다) */
const FONT = '"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR","Noto Sans CJK KR",system-ui,sans-serif';
function font(sz, w) { ctx.font = `${w || 800} ${sz}px ${FONT}`; }
function text(s, x, y, sz, col, align, stroke, sw) {
  font(sz);
  ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  if (stroke !== false) {
    ctx.lineJoin = 'round'; ctx.lineWidth = sw || Math.max(3, sz * 0.24);
    ctx.strokeStyle = stroke || 'rgba(20,30,60,0.85)'; ctx.strokeText(s, x, y);
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

// ===== 시간대 색 (낮 → 노을 → 밤 → 오로라 → 다시 낮) =====
const PHASES = [
  { skyT: '#3f9cf5', skyB: '#cdeeff', far: '#9fc0e6', farSnow: '#f2f8ff', mid: '#7aa0d2', tree: '#3f6f9a', snow: '#ffffff', shade: '#d5e7f8', deep: '#a9c8ea', line: '#ffffff', sun: 1, moon: 0, stars: 0, aurora: 0, sunY: 64, sunC: '#fff7cf', fog: '#e8f6ff' },
  { skyT: '#4b3f92', skyB: '#ffae78', far: '#b07a9c', farSnow: '#ffd6c0', mid: '#7f5a8c', tree: '#4f3b66', snow: '#ffeee4', shade: '#f6c4b4', deep: '#cf93a8', line: '#fff6ee', sun: 1, moon: 0, stars: 0.2, aurora: 0, sunY: 210, sunC: '#ffd27a', fog: '#ffc9a4' },
  { skyT: '#0a1132', skyB: '#2a3c78', far: '#2c3b6c', farSnow: '#90a4d8', mid: '#1d2a54', tree: '#121c3c', snow: '#cfdaf6', shade: '#93a8da', deep: '#5c70ad', line: '#e8efff', sun: 0, moon: 1, stars: 1, aurora: 0, sunY: 70, sunC: '#f4f1d8', fog: '#33467e' },
  { skyT: '#051226', skyB: '#0f3b56', far: '#1b3850', farSnow: '#8fd3c6', mid: '#10273c', tree: '#0a1a2a', snow: '#d4f2ec', shade: '#8fcac6', deep: '#4c8798', line: '#eafffb', sun: 0, moon: 1, stars: 0.9, aurora: 1, sunY: 60, sunC: '#f0f6ee', fog: '#16465e' },
];
const PHASE_RGB = PHASES.map(p => {
  const o = {};
  for (const k in p) o[k] = typeof p[k] === 'string' ? hex2rgb(p[k]) : p[k];
  return o;
});
function palette(distM) {
  const f = distM / PHASE_LEN, i = Math.floor(f), k = smooth01((f - i - 0.8) / 0.2);
  const a = PHASE_RGB[((i % 4) + 4) % 4], b = PHASE_RGB[(((i + 1) % 4) + 4) % 4], o = {};
  for (const key in a) o[key] = Array.isArray(a[key]) ? mixRGB(a[key], b[key], k) : lerp(a[key], b[key], k);
  return o;
}

// ===== 하늘과 먼 배경 (화면 좌표) =====
const STARS = [];
for (let i = 0; i < 90; i++) STARS.push({ x: hash1(i * 3 + 1), y: hash1(i * 3 + 2) * 0.62, s: 0.6 + hash1(i * 3 + 3) * 1.4, p: hash1(i + 99) * 6 });
const FLAKES = [];
for (let i = 0; i < 70; i++) FLAKES.push({ x: Math.random() * 900, y: Math.random() * VH, s: 0.8 + Math.random() * 2, v: 20 + Math.random() * 40, p: Math.random() * 6 });

function drawSky(pal, camX, time) {
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, rgb(pal.skyT)); g.addColorStop(1, rgb(pal.skyB));
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  // 별
  if (pal.stars > 0.02) {
    ctx.fillStyle = '#ffffff';
    for (const s of STARS) {
      ctx.globalAlpha = pal.stars * (0.55 + 0.45 * Math.sin(time * 2 + s.p));
      ctx.fillRect(((s.x * VW - camX * 0.005) % VW + VW) % VW, s.y * VH, s.s, s.s);
    }
    ctx.globalAlpha = 1;
  }
  // 오로라
  if (pal.aurora > 0.02) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const cols = [[90, 255, 170], [60, 220, 255], [190, 120, 255]];
    for (let r = 0; r < 3; r++) {
      const gr = ctx.createLinearGradient(0, 20, 0, 210);
      gr.addColorStop(0, rgb(cols[r], 0)); gr.addColorStop(0.35, rgb(cols[r], 0.32 * pal.aurora)); gr.addColorStop(1, rgb(cols[r], 0));
      ctx.fillStyle = gr;
      ctx.beginPath();
      const yb = x => 60 + r * 22 + Math.sin(x * 0.006 + time * 0.35 + r * 2) * 26 + Math.sin(x * 0.019 - time * 0.6 + r) * 9;
      for (let x = -10; x <= VW + 10; x += 14) ctx.lineTo(x, yb(x + camX * 0.01));
      for (let x = VW + 10; x >= -10; x -= 14) ctx.lineTo(x, yb(x + camX * 0.01) + 70 + Math.sin(x * 0.013 + time + r) * 30);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  // 해와 달
  const sx = VW * 0.74;
  if (pal.sun > 0.02) {
    ctx.globalAlpha = pal.sun;
    const gl = ctx.createRadialGradient(sx, pal.sunY, 4, sx, pal.sunY, 90);
    gl.addColorStop(0, rgb(pal.sunC, 0.65)); gl.addColorStop(1, rgb(pal.sunC, 0));
    ctx.fillStyle = gl; ctx.fillRect(sx - 90, pal.sunY - 90, 180, 180);
    ctx.fillStyle = rgb(pal.sunC); circ(sx, pal.sunY, 26); ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (pal.moon > 0.02) {
    ctx.globalAlpha = pal.moon;
    const my = 62;
    const gl = ctx.createRadialGradient(sx, my, 4, sx, my, 60);
    gl.addColorStop(0, 'rgba(240,240,220,0.35)'); gl.addColorStop(1, 'rgba(240,240,220,0)');
    ctx.fillStyle = gl; ctx.fillRect(sx - 60, my - 60, 120, 120);
    ctx.fillStyle = rgb(pal.sunC); circ(sx, my, 17); ctx.fill();
    ctx.fillStyle = 'rgba(160,170,190,0.35)'; circ(sx - 5, my - 4, 4); ctx.fill(); circ(sx + 6, my + 5, 3); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawMountains(pal, camX, z) {
  // 먼 산맥
  const base = VH * 0.62 + (1 - z) * 30;
  const farX = camX * 0.04;
  ctx.fillStyle = rgb(pal.far);
  ctx.beginPath(); ctx.moveTo(0, VH);
  const top = [];
  for (let x = 0; x <= VW + 8; x += 8) {
    const u = (x + farX) / 90;
    const r = Math.abs(noise1(u, 1) - 0.5) * 2, r2 = noise1(u * 2.7, 2);
    const y = base - 40 - Math.pow(1 - r, 1.4) * 95 - r2 * 28;
    top.push(y); ctx.lineTo(x, y);
  }
  ctx.lineTo(VW + 8, VH); ctx.closePath(); ctx.fill();
  // 눈 덮인 봉우리
  ctx.fillStyle = rgb(pal.farSnow);
  ctx.beginPath();
  for (let i = 0; i < top.length; i++) ctx.lineTo(i * 8, top[i]);
  for (let i = top.length - 1; i >= 0; i--) ctx.lineTo(i * 8, top[i] + Math.max(0, (base - 70 - top[i])) * 0.55 + 2);
  ctx.closePath(); ctx.fill();
  // 가까운 언덕과 전나무
  const midX = camX * 0.16, mb = VH * 0.78 + (1 - z) * 24;
  const hy = x => mb - noise1((x + midX) / 160, 5) * 70 - noise1((x + midX) / 55, 6) * 14;
  ctx.fillStyle = rgb(pal.mid);
  ctx.beginPath(); ctx.moveTo(0, VH);
  for (let x = 0; x <= VW + 8; x += 8) ctx.lineTo(x, hy(x));
  ctx.lineTo(VW + 8, VH); ctx.closePath(); ctx.fill();
  const step = 46, i0 = Math.floor(midX / step) - 1;
  for (let i = i0; i < i0 + VW / step + 3; i++) {
    if (hash1(i * 7 + 3) < 0.45) continue;
    const x = i * step - midX + hash1(i) * 30, h = 18 + hash1(i * 5) * 26, y = hy(x) + 4;
    ctx.fillStyle = rgb(pal.tree);
    ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + h * 0.32, y); ctx.lineTo(x - h * 0.32, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgb(pal.farSnow, 0.85);
    ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + h * 0.13, y - h * 0.6); ctx.lineTo(x - h * 0.13, y - h * 0.6); ctx.closePath(); ctx.fill();
  }
  // 옅은 안개
  const fg = ctx.createLinearGradient(0, VH * 0.55, 0, VH);
  fg.addColorStop(0, rgb(pal.fog, 0)); fg.addColorStop(1, rgb(pal.fog, 0.35));
  ctx.fillStyle = fg; ctx.fillRect(0, VH * 0.55, VW, VH * 0.45);
}

// ===== 월드 좌표 그리기 =====
function view() {
  const c = G.cam, z = c.z;
  const l = c.x - (VW * 0.38) / z, r = c.x + (VW * 0.62) / z, top = c.y - (VH * 0.5) / z, bot = c.y + (VH * 0.5) / z;
  return { l, r, top, bot, z };
}
function camTransform() {
  const c = G.cam, sh = c.shake;
  ctx.translate(VW * 0.38 + (sh ? (Math.random() - 0.5) * sh : 0), VH * 0.5 + (sh ? (Math.random() - 0.5) * sh : 0));
  ctx.scale(c.z, c.z);
  ctx.translate(-c.x, -c.y);
}

function drawTerrain(pal, v, time) {
  const stepX = 6 / v.z, x0 = Math.floor(v.l / stepX) * stepX - stepX, x1 = v.r + stepX * 2, bot = v.bot + 40;
  const xs = [], ys = [];
  for (let x = x0; x <= x1; x += stepX) { xs.push(x); ys.push(Terr.y(x)); }
  const band = (off, col) => {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(xs[0], bot);
    for (let i = 0; i < xs.length; i++) ctx.lineTo(xs[i], ys[i] + off);
    ctx.lineTo(xs[xs.length - 1], bot); ctx.closePath(); ctx.fill();
  };
  band(0, rgb(pal.snow));
  band(18, rgb(pal.shade));
  band(60, rgb(pal.deep));
  band(130, rgb(mixRGB(pal.deep, pal.skyT, 0.35)));
  // 위쪽 반짝이는 테두리
  ctx.strokeStyle = rgb(pal.line); ctx.lineWidth = 2.5 / v.z;
  ctx.beginPath();
  for (let i = 0; i < xs.length; i++) ctx.lineTo(xs[i], ys[i] + 1);
  ctx.stroke();
  // 눈 결 무늬
  ctx.fillStyle = rgb(pal.shade, 0.7);
  const st = 70, j0 = Math.floor(v.l / st);
  for (let j = j0; j < v.r / st + 1; j++) {
    const x = j * st + hash1(j) * 40, y = Terr.y(x);
    ell(x, y + 9 + hash1(j * 3) * 10, 10 + hash1(j * 5) * 14, 1.6, Math.atan(Terr.slope(x)));
    ctx.fill();
  }
  // 반짝임
  for (let j = j0; j < v.r / st + 1; j++) {
    const x = j * st + 20 + hash1(j * 11) * 30;
    const tw = Math.sin(time * 4 + j * 1.7);
    if (tw < 0.6) continue;
    const y = Terr.y(x) + 4 + hash1(j * 13) * 6, s = (tw - 0.6) * 6;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - s / 2, y - 0.6, s, 1.2); ctx.fillRect(x - 0.6, y - s / 2, 1.2, s);
  }
}

function drawMarkers(v) {
  // 100 m 마다 표지판, 최고 기록 깃발
  const m0 = Math.ceil((v.l + 60) / (100 * M)), m1 = Math.floor((v.r + 60) / (100 * M));
  for (let m = Math.max(1, m0); m <= m1; m++) {
    const x = m * 100 * M - 60, y = Terr.y(x);
    ctx.fillStyle = '#7a4f32'; ctx.fillRect(x - 2, y - 34, 4, 34);
    ctx.fillStyle = '#c98b58'; rrect(x - 20, y - 46, 40, 18, 4); ctx.fill();
    text(m * 100 + 'm', x, y - 37, 10, '#fff', 'center', '#7a4f32', 3);
  }
  const bd = Save.data.bestDist;
  if (bd > 0 && !G.demo) {
    const x = bd * M - 60;
    if (x > v.l - 50 && x < v.r + 50) {
      const y = Terr.y(x);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1.5, y - 64, 3, 64);
      const wv = Math.sin(G.t * 6) * 3;
      ctx.fillStyle = '#ff5a6e';
      ctx.beginPath(); ctx.moveTo(x + 1.5, y - 64); ctx.quadraticCurveTo(x + 18, y - 60 + wv, x + 34, y - 56); ctx.lineTo(x + 1.5, y - 44); ctx.closePath(); ctx.fill();
      text('★', x + 13, y - 55, 10, '#fff', 'center', false);
      text(t('best'), x, y - 74, 11, '#fff', 'center', '#ff5a6e', 3);
    }
  }
}

function drawFish(x, y, s, gold, wob) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(wob) * 0.25); ctx.scale(s, s);
  const body = gold ? '#ffd23f' : '#5ab8f0', dark = gold ? '#e09a12' : '#2f86c6', belly = gold ? '#fff2a8' : '#cfeeff';
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-15, -6); ctx.lineTo(-13, 0); ctx.lineTo(-15, 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = body; ell(0, 0, 10, 6); ctx.fill();
  ctx.fillStyle = belly; ell(1, 2, 7, 3); ctx.fill();
  ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-2, -5); ctx.lineTo(3, -9); ctx.lineTo(4, -5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; circ(5, -1.5, 2.2); ctx.fill();
  ctx.fillStyle = '#16233a'; circ(5.6, -1.5, 1.1); ctx.fill();
  if (gold) { ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.6 + Math.sin(wob * 3) * 0.4; ctx.fillRect(-4, -4, 2, 2); ctx.globalAlpha = 1; }
  ctx.restore();
}
function drawItems(v, time) {
  for (const it of G.items) {
    if (it.taken || it.x < v.l - 30) continue;
    if (it.x > v.r + 30) break;
    const bob = Math.sin(time * 3 + it.ph) * 3;
    if (it.gold) {
      const gl = ctx.createRadialGradient(it.x, it.y + bob, 2, it.x, it.y + bob, 26);
      gl.addColorStop(0, 'rgba(255,230,120,0.6)'); gl.addColorStop(1, 'rgba(255,230,120,0)');
      ctx.fillStyle = gl; ctx.fillRect(it.x - 26, it.y + bob - 26, 52, 52);
    }
    drawFish(it.x, it.y + bob, it.gold ? 1.25 : 1, it.gold, time * 3 + it.ph);
  }
}

function drawAvalanche(v, time) {
  const A = G.A;
  if (A.x < v.l - 500) return;
  const fx = A.x;
  const top = d => Terr.y(fx - d) - Math.min(250, 26 + d * 1.1) - Math.sin(time * 3 + d * 0.05) * 6;
  // 몸통
  ctx.fillStyle = '#e9f1fb';
  ctx.beginPath(); ctx.moveTo(fx + 6, Terr.y(fx + 6) + 4);
  for (let d = 0; d <= 1400; d += 30) ctx.lineTo(fx - d, top(d));
  for (let d = 1400; d >= 0; d -= 60) ctx.lineTo(fx - d, Terr.y(fx - d) + 24);
  ctx.closePath(); ctx.fill();
  // 뭉게뭉게 눈덩이
  for (let i = 0; i < 26; i++) {
    const d = i * 46 + ((time * 120) % 46), r = 24 + hash1(i * 3 + Math.floor((time * 120) / 46)) * 22 + Math.min(d * 0.05, 30);
    const y = top(d) + r * 0.55;
    ctx.fillStyle = '#c4d4ea'; circ(fx - d + 4, y + 6, r); ctx.fill();
    ctx.fillStyle = '#ffffff'; circ(fx - d, y, r); ctx.fill();
  }
  // 앞머리
  for (let i = 0; i < 7; i++) {
    const r = 14 + i * 5, d = 4 + i * 16, y = Terr.y(fx - d) - r * 0.7 - i * 22 + Math.sin(time * 9 + i) * 3;
    ctx.fillStyle = '#d3e0f2'; circ(fx - d + 3, y + 4, r); ctx.fill();
    ctx.fillStyle = '#ffffff'; circ(fx - d, y, r); ctx.fill();
  }
  // 튀는 눈덩이
  if (Math.random() < 0.5) addPart(fx - Math.random() * 40, Terr.y(fx) - 20 - Math.random() * 90, 120 + Math.random() * 220, -80 - Math.random() * 160, 0.7, 3 + Math.random() * 5, '#ffffff', 1);
}

// 펭귄 + 썰매 (발밑 접점이 원점, 오른쪽을 본다)
function drawPenguin(P, time) {
  ctx.save();
  ctx.translate(P.x, P.y);
  let ang = P.ang;
  if (P.stun > 0 || G.state === 'caught') ang += P.spin;
  ctx.rotate(ang);
  const tk = P.tuck, air = !P.ground, sp = speedOf(P);
  // 썰매
  ctx.fillStyle = '#7a3324';
  ctx.beginPath(); ctx.moveTo(-17, -1); ctx.lineTo(13, -1); ctx.quadraticCurveTo(21, -1, 20, -9); ctx.lineTo(18, -9); ctx.quadraticCurveTo(18, -3, 12, -3); ctx.lineTo(-17, -3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d9573d'; rrect(-16, -9, 29, 6, 2.5); ctx.fill();
  ctx.fillStyle = '#f08a5d'; ctx.fillRect(-14, -8.5, 25, 1.6);
  // 몸 (웅크리면 앞으로 숙이고 납작해진다)
  ctx.save();
  ctx.translate(-2, -9);
  ctx.rotate(tk * 0.55);
  const by = -11 + tk * 3, rx = 10 + tk * 1.5, ry = 13 - tk * 3;
  // 목도리 꼬리
  const sl = 10 + clamp(sp / 60, 0, 16);
  ctx.strokeStyle = '#e8394d'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-2, by - 5);
  for (let i = 1; i <= 4; i++) ctx.lineTo(-2 - (sl * i) / 4, by - 5 + Math.sin(time * 18 - i * 1.3) * (1 + i * 0.8) - i * 0.6);
  ctx.stroke();
  // 몸통
  ctx.fillStyle = '#1e2a46'; ell(0, by, rx, ry); ctx.fill();
  ctx.fillStyle = '#34466e'; ell(-3, by - 4, rx * 0.5, ry * 0.5); ctx.fill();
  ctx.fillStyle = '#ffffff'; ell(3.5, by + 2, rx * 0.62, ry * 0.72); ctx.fill();
  // 목도리
  ctx.fillStyle = '#e8394d'; rrect(-rx + 1, by - ry * 0.45 - 2, rx * 2 - 2, 4.5, 2); ctx.fill();
  ctx.fillStyle = '#ffd34d'; ctx.fillRect(-rx + 4, by - ry * 0.45 - 1.4, 2, 3.4); ctx.fillRect(-rx + 9, by - ry * 0.45 - 1.4, 2, 3.4);
  // 날개
  ctx.fillStyle = '#16203a';
  if (air && tk < 0.5) {
    const fl = Math.sin(P.flap) * 0.5;
    ctx.save(); ctx.translate(-3, by); ctx.rotate(-2.1 + fl); ell(0, -8, 3.4, 9); ctx.fill(); ctx.restore();
  } else {
    ctx.save(); ctx.translate(-2, by + 1); ctx.rotate(0.5 - tk * 0.4); ell(0, 5, 3.2, 8); ctx.fill(); ctx.restore();
  }
  // 눈과 부리
  const hy = by - ry * 0.62;
  const dizzy = P.stun > 0 || G.state === 'caught';
  if (dizzy) {
    ctx.strokeStyle = '#16203a'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(3, hy - 2); ctx.lineTo(7, hy + 2); ctx.moveTo(7, hy - 2); ctx.lineTo(3, hy + 2); ctx.stroke();
  } else {
    ctx.fillStyle = '#ffffff'; circ(5, hy, 3); ctx.fill();
    ctx.fillStyle = '#10182c'; circ(5.9, hy + 0.3, 1.7); ctx.fill();
    ctx.fillStyle = '#ffffff'; circ(6.5, hy - 0.6, 0.6); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,140,160,0.6)'; ell(5, hy + 4.5, 2.4, 1.3); ctx.fill();
  ctx.fillStyle = '#ff9a2e';
  ctx.beginPath(); ctx.moveTo(rx - 2, hy + 0.5); ctx.lineTo(rx + 5, hy + 2.5); ctx.lineTo(rx - 2, hy + 4); ctx.closePath(); ctx.fill();
  // 털모자 방울
  ctx.fillStyle = '#4fb3ff'; ell(-1, by - ry + 1, rx * 0.75, 3.5); ctx.fill();
  ctx.fillStyle = '#ffffff'; circ(-3, by - ry - 3, 3); ctx.fill();
  ctx.restore();
  // 발
  ctx.fillStyle = '#ff9a2e'; ell(9, -10, 4, 2); ctx.fill();
  ctx.restore();
  if (P.stun > 0) {
    for (let i = 0; i < 3; i++) {
      const a = time * 6 + i * 2.1;
      text('★', P.x + Math.cos(a) * 14, P.y - 34 + Math.sin(a) * 4, 9, '#ffe066', 'center', false);
    }
  }
  if (G.fever) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createRadialGradient(P.x, P.y - 14, 2, P.x, P.y - 14, 34);
    gl.addColorStop(0, 'rgba(120,240,255,0.35)'); gl.addColorStop(1, 'rgba(120,240,255,0)');
    ctx.fillStyle = gl; ctx.fillRect(P.x - 34, P.y - 48, 68, 68);
    ctx.restore();
  }
}

function drawParts() {
  for (const p of G.parts) {
    ctx.globalAlpha = clamp(p.life / p.max * 1.5, 0, 1);
    ctx.fillStyle = p.col;
    circ(p.x, p.y, p.size * (0.5 + 0.5 * p.life / p.max));
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const p of G.pops) {
    if (!p.world) continue;
    ctx.globalAlpha = clamp(p.life / p.max * 2, 0, 1);
    text(p.txt, p.x, p.y, p.size / G.cam.z, p.col, 'center', 'rgba(20,30,60,0.8)', 3 / G.cam.z);
  }
  ctx.globalAlpha = 1;
}

function drawFlakes(pal, dt, wind) {
  const a = 0.35 + pal.stars * 0.4;
  ctx.fillStyle = '#ffffff';
  for (const f of FLAKES) {
    f.y += f.v * dt; f.x -= (wind * 0.4 + 10) * dt * f.s; f.p += dt;
    if (f.y > VH + 4) { f.y = -4; f.x = Math.random() * (VW + 200); }
    if (f.x < -10) { f.x = VW + Math.random() * 100; f.y = Math.random() * VH; }
    ctx.globalAlpha = a * (f.s / 2.8);
    circ(f.x + Math.sin(f.p * 2) * 6, f.y, f.s); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// 한 장면 전체 그리기
function drawWorld(time, dt) {
  const pal = palette(G.dist);
  const v = view();
  drawSky(pal, G.cam.x, time);
  drawMountains(pal, G.cam.x, G.cam.z);
  ctx.save();
  camTransform();
  drawTerrain(pal, v, time);
  drawMarkers(v);
  drawItems(v, time);
  drawPenguin(G.P, time);
  drawAvalanche(v, time);
  drawParts();
  ctx.restore();
  drawFlakes(pal, dt, speedOf(G.P));
  // 속도선
  const sp = speedOf(G.P);
  if (sp > 900) {
    ctx.strokeStyle = 'rgba(255,255,255,' + clamp((sp - 900) / 1200, 0, 0.35) + ')'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const y = (hash1(i * 17 + Math.floor(time * 12)) * VH), x = hash1(i * 31 + Math.floor(time * 12)) * VW;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 60 - sp * 0.04, y); ctx.stroke();
    }
  }
  return pal;
}

// ===== 게임 화면 위 표시 =====
function drawFishIcon(x, y, s) { drawFish(x, y, s || 1, false, 0); }
function drawHUD(time) {
  const P = G.P;
  // 눈사태 경고 (왼쪽이 붉게)
  const gap = P.x - G.A.x;
  const danger = clamp(1 - (gap - 60) / 520, 0, 1);
  if (danger > 0 && G.state === 'play') {
    const gr = ctx.createLinearGradient(0, 0, VW * 0.35, 0);
    gr.addColorStop(0, `rgba(255,60,60,${0.45 * danger * (0.75 + 0.25 * Math.sin(time * 10))})`); gr.addColorStop(1, 'rgba(255,60,60,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, VW * 0.35, VH);
  }
  // 거리
  text(`${G.dist} m`, VW / 2, 28, 28, '#ffffff', 'center', 'rgba(20,30,70,0.85)', 6);
  const bd = Save.data.bestDist;
  if (bd > 0) text(`${t('best')} ${Math.max(bd, G.passedBest ? G.dist : 0)} m`, VW / 2, 54, 12, G.passedBest ? '#ffe066' : '#e8f2ff', 'center', 'rgba(20,30,70,0.8)', 3);
  // 생선과 점수
  ctx.fillStyle = 'rgba(20,30,70,0.35)'; rrect(12, 12, 118, 50, 14); ctx.fill();
  drawFishIcon(34, 28, 1);
  text(String(G.fish), 52, 28, 17, '#fff', 'left', 'rgba(20,30,70,0.8)', 3);
  text(`${t('score')} ${G.score}`, 24, 50, 11, '#dfeaff', 'left', false);
  // 연속 완벽 착지
  if (G.combo >= 2) {
    const fv = G.fever;
    ctx.fillStyle = fv ? 'rgba(40,190,230,0.75)' : 'rgba(255,170,40,0.75)'; rrect(12, 68, 118, 24, 12); ctx.fill();
    text((fv ? '🔥 ' : '') + `${t('perfect').replace('!', '')} x${G.combo}`, 71, 80, 11, '#fff', 'center', false);
  }
  // 눈사태까지 거리
  if (G.state === 'play') {
    const gm = Math.max(0, Math.floor(gap / M));
    const col = danger > 0.5 ? '#ff8a80' : '#dfeaff';
    ctx.fillStyle = 'rgba(20,30,70,0.35)'; rrect(12, VH - 38, 120, 26, 13); ctx.fill();
    text(`◀ ${t('avalanche')} ${gm}m`, 72, VH - 25, 12, col, 'center', false);
  }
  // 화면 가운데 알림
  for (const p of G.pops) {
    if (p.world) continue;
    const k = p.life / p.max, sc = 1 + Math.max(0, (k - 0.85)) * 3;
    ctx.globalAlpha = clamp(k * 3, 0, 1);
    text(p.txt, VW / 2, VH * 0.3 - (1 - k) * 18, p.size * sc, p.col, 'center', 'rgba(20,30,70,0.85)', 5);
  }
  ctx.globalAlpha = 1;
  if (G.banner) {
    const b = G.banner, k = b.life / 1.4;
    ctx.globalAlpha = clamp(Math.min(k * 4, (1 - k) * 8), 0, 1);
    ctx.fillStyle = 'rgba(20,30,70,0.45)'; rrect(VW / 2 - 130, 76, 260, 34, 17); ctx.fill();
    text(b.txt, VW / 2, 93, 18, b.col, 'center', false);
    ctx.globalAlpha = 1;
  }
  // 튜토리얼
  if (G.tut && G.state === 'play') {
    const msg = t('tut' + G.tut);
    font(15); const w = Math.min(VW - 40, ctx.measureText(msg).width + 40);
    const y = VH - 74 + Math.sin(time * 3) * 2;
    ctx.fillStyle = 'rgba(20,30,70,0.7)'; rrect(VW / 2 - w / 2, y - 18, w, 36, 18); ctx.fill();
    text(msg, VW / 2, y, 15, '#ffffff', 'center', false);
    // 누르기 손가락 표시
    if (G.tut === 1 || G.tut === 3) {
      const pr = (Math.sin(time * 5) + 1) / 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3;
      circ(VW / 2, y - 48, 10 + pr * 8); ctx.stroke();
    }
  }
}
