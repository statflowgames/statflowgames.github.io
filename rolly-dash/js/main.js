'use strict';
/* 구르미 대시 — 화면 전환, 메뉴, 메인 루프 */
const canvas = document.getElementById('c');
ctx = canvas.getContext('2d');
let DPR = 1, SCALE = 1, OFFX = 0, OFFY = 0, PORTRAIT = false;
let screen = 'title', time = 0, mapWorld = 0, toast = null, titleCam = 0;
let UIB = [], pressAt = null, pendJ = 0, pendD = 0, acc = 0;

Save.load();

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2.5);
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = Math.round(w * DPR); canvas.height = Math.round(h * DPR);
  PORTRAIT = h > w * 1.05;
  VW = PORTRAIT ? 560 : clamp(Math.round((VH * w) / h), 480, 880);
  SCALE = Math.min((h * DPR) / VH, (w * DPR) / VW);
  OFFX = (w * DPR - VW * SCALE) / 2; OFFY = (h * DPR - VH * SCALE) / 2;
  setCacheScale(SCALE);
}
window.addEventListener('resize', resize);
resize();

function toV(e) { return [(e.clientX * DPR - OFFX) / SCALE, (e.clientY * DPR - OFFY) / SCALE]; }
const playing = () => screen === 'play' && (G.state === 'play' || G.state === 'dying' || G.state === 'clear');

canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  Sound.init();
  if (!Sound.timer && Sound.ctx) Sound.playMusic(screen === 'play' ? G.world : 0);
  const [x, y] = toV(e);
  if (e.pointerType === 'touch' || e.pointerType === 'pen') Input.touchSeen = true;
  if (playing() && Input.touchSeen) {
    const c = controlAt(x, y);
    if (c && !hitButton(x, y)) { Input.ptrs.set(e.pointerId, { ctl: c }); Input.latch[c] = 1; return; }
  }
  pressAt = { x, y };
  tapUI(x, y);
}, { passive: false });
canvas.addEventListener('pointermove', e => {
  const p = Input.ptrs.get(e.pointerId);
  if (!p) return;
  const [x, y] = toV(e);
  const c = controlAt(x, y);
  if ((p.ctl === 'l' || p.ctl === 'r') && (c === 'l' || c === 'r')) p.ctl = c;
});
const up = e => { Input.ptrs.delete(e.pointerId); pressAt = null; };
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', up);
canvas.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('keydown', e => {
  Sound.init();
  if (!Sound.timer && Sound.ctx) Sound.playMusic(screen === 'play' ? G.world : 0);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  Input.keys.add(e.code);
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (screen === 'play' && G.state === 'play') pauseGame();
    else if (screen === 'play' && G.state === 'paused') G.state = 'play';
    else if (screen !== 'title' && screen !== 'play') screen = 'title';
  }
  if (e.code === 'Enter') {
    if (screen === 'title') openMap();
    else if (screen === 'play' && G.state === 'result') nextStage();
    else if (screen === 'play' && G.state === 'over') startGame('endless', 0, 0);
  }
});
window.addEventListener('keyup', e => Input.keys.delete(e.code));
window.addEventListener('blur', () => { Input.clearAll(); if (screen === 'play' && G.state === 'play') pauseGame(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    Input.clearAll();
    if (screen === 'play' && G.state === 'play') pauseGame();
    if (Sound.ctx) Sound.ctx.suspend();
  } else if (Sound.ctx) Sound.ctx.resume();
});

// ===== 버튼 =====
function hitButton(x, y) { return UIB.some(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h); }
function tapUI(x, y) {
  for (let i = UIB.length - 1; i >= 0; i--) {
    const b = UIB[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { if (!b.silent) Sound.sfx('click'); b.cb(); return true; }
  }
  return false;
}
function button(x, y, w, h, label, cb, opt) {
  opt = opt || {};
  UIB.push({ x, y, w, h, cb, silent: opt.silent });
  const down = pressAt && pressAt.x >= x && pressAt.x <= x + w && pressAt.y >= y && pressAt.y <= y + h;
  const col = opt.color || '#ff8a3d', dark = opt.dark || '#c45a1c';
  const oy = down ? 3 : 0;
  if (!opt.flat) { ctx.fillStyle = dark; rrect(x, y + 4, w, h, opt.r || 14); ctx.fill(); }
  ctx.fillStyle = col; rrect(x, y + oy, w, h, opt.r || 14); ctx.fill();
  if (!opt.flat) { ctx.fillStyle = 'rgba(255,255,255,0.25)'; rrect(x + 4, y + oy + 3, w - 8, h * 0.35, (opt.r || 14) * 0.7); ctx.fill(); }
  if (label) text(label, x + w / 2, y + h / 2 + oy + 1, opt.size || 18, opt.textColor || '#fff', 'center', opt.stroke || dark, 4);
  if (opt.icon) opt.icon(x + w / 2, y + h / 2 + oy);
}
function roundIcon(x, y, r, draw, cb, on) {
  UIB.push({ x: x - r, y: y - r, w: r * 2, h: r * 2, cb });
  ctx.fillStyle = 'rgba(30,20,50,0.45)'; circ(x, y, r); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; circ(x, y, r); ctx.stroke();
  draw(x, y);
  if (on === false) { ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - r * 0.55, y - r * 0.55); ctx.lineTo(x + r * 0.55, y + r * 0.55); ctx.stroke(); }
}
function iconNote(x, y) {
  ctx.fillStyle = '#fff'; ell(x - 4, y + 6, 4.5, 3.5, -0.3); ctx.fill(); ctx.fillRect(x - 0.5, y - 9, 2.5, 15);
  ctx.beginPath(); ctx.moveTo(x + 2, y - 9); ctx.quadraticCurveTo(x + 9, y - 6, x + 7, y - 1); ctx.lineTo(x + 2, y - 4); ctx.fill();
}
function iconSpeaker(x, y) {
  ctx.fillStyle = '#fff'; ctx.fillRect(x - 9, y - 4, 5, 8);
  ctx.beginPath(); ctx.moveTo(x - 4, y - 4); ctx.lineTo(x + 3, y - 9); ctx.lineTo(x + 3, y + 9); ctx.lineTo(x - 4, y + 4); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 4, y, 6, -0.8, 0.8); ctx.stroke();
}
function soundToggles(x, y) {
  roundIcon(x, y, 17, iconNote, () => { Save.data.music = !Save.data.music; Sound.apply(); Save.save(); }, Save.data.music);
  roundIcon(x + 42, y, 17, iconSpeaker, () => { Save.data.sfx = !Save.data.sfx; Sound.apply(); Save.save(); }, Save.data.sfx);
}
function panel(w, h) {
  const x = (VW - w) / 2, y = (VH - h) / 2;
  ctx.fillStyle = 'rgba(20,12,40,0.55)'; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = '#3b2a63'; rrect(x, y + 5, w, h, 20); ctx.fill();
  ctx.fillStyle = '#fff8ec'; rrect(x, y, w, h, 20); ctx.fill();
  return { x, y };
}
function showToast(msg) { toast = { msg, t: 1.8 }; }

// ===== 화면 이동 =====
function openMap() {
  screen = 'map';
  mapWorld = Math.min(WORLDS.length - 1, Math.floor((Save.data.unlocked - 1) / STAGES_PER_WORLD));
}
function playStage(w, s) { Input.clearAll(); startGame('stage', w, s); screen = 'play'; acc = 0; }
function playEndless() { Input.clearAll(); startGame('endless', 0, 0); screen = 'play'; acc = 0; }
function pauseGame() { G.state = 'paused'; Input.clearAll(); }
function toTitle() { screen = 'title'; Sound.playMusic(0); }
function nextStage() {
  const idx = G.world * STAGES_PER_WORLD + G.stage + 1;
  if (idx >= STAGE_COUNT) { openMap(); Sound.playMusic(0); return; }
  playStage(Math.floor(idx / STAGES_PER_WORLD), idx % STAGES_PER_WORLD);
}

// ===== 타이틀 =====
function drawTitle(dt) {
  titleCam += dt * 70;
  const W = WORLDS[0];
  drawBackdrop(W, titleCam, 0, time);
  const gy = VH - 52;
  drawGroundStrip(0, gy, titleCam * 1.6);
  const px = ((time * 160) % (VW + 200)) - 100;
  const bounce = Math.abs(Math.sin(time * 5)) * 26;
  drawArmadillo(px, gy - bounce, { dir: 1, ball: true, rot: time * 14, skin: Save.data.skin }, time);
  for (let i = 0; i < 6; i++) drawAcorn(((i * 150 - titleCam * 1.6) % (VW + 100) + VW + 100) % (VW + 100) - 50, gy - 40 - (i % 2) * 20, Math.abs(Math.cos(time * 3 + i)));
  // 로고
  const ly = 78 + Math.sin(time * 2) * 4;
  ctx.save(); ctx.translate(VW / 2, ly); ctx.rotate(Math.sin(time * 1.4) * 0.02);
  text(t('title'), 0, 4, 56, '#3b2a63', 'center', '#3b2a63', 16);
  text(t('title'), 0, 0, 56, '#ffd84a', 'center', '#ff7a3d', 10);
  ctx.restore();
  text(t('tagline'), VW / 2, ly + 44, 16, '#fff', 'center', 'rgba(60,30,90,0.8)');
  const bw = 210, bx = VW / 2 - bw / 2;
  button(bx, 150, bw, 46, '▶  ' + t('adventure'), openMap, { size: 20 });
  button(bx, 206, bw, 42, t('endless') + (Save.data.bestRun ? `  ·  ${Save.data.bestRun}m` : ''), playEndless, { color: '#5b7cff', dark: '#3446b8', size: 17 });
  button(bx, 258, bw, 38, t('shop'), () => { screen = 'shop'; }, { color: '#ff6b9a', dark: '#c23f6c', size: 16 });
  soundToggles(28, 28);
  roundIcon(112, 28, 17, (x, y) => text(LANG === 'ko' ? 'EN' : '한', x, y + 1, 12, '#fff', 'center', false), () => {
    LANG = LANG === 'ko' ? 'en' : 'ko'; Save.data.lang = LANG; Save.save();
  });
  ctx.fillStyle = 'rgba(30,20,50,0.45)'; rrect(VW - 128, 12, 116, 32, 16); ctx.fill();
  drawAcorn(VW - 108, 28, 1);
  text(String(Save.data.bank), VW - 90, 28, 16, '#fff', 'left');
}

// ===== 지도 =====
function stageRec(w, s) { return Save.data.stages[w + '-' + s] || null; }
function drawMap() {
  const W = WORLDS[mapWorld];
  drawBackdrop(W, mapWorld * 900 + time * 20, 0, time);
  ctx.fillStyle = 'rgba(20,12,40,0.25)'; ctx.fillRect(0, 0, VW, VH);
  button(12, 12, 74, 34, t('back'), toTitle, { color: '#8a7ab8', dark: '#5a4a88', size: 14 });
  text(t('w' + mapWorld), VW / 2, 34, 26, '#fff');
  if (mapWorld > 0) button(VW / 2 - 170, 16, 40, 38, '◀', () => mapWorld--, { color: '#ffffff', dark: '#b8a8d8', textColor: '#5a4a88', stroke: '#fff', size: 18 });
  if (mapWorld < WORLDS.length - 1) button(VW / 2 + 130, 16, 40, 38, '▶', () => mapWorld++, { color: '#ffffff', dark: '#b8a8d8', textColor: '#5a4a88', stroke: '#fff', size: 18 });
  for (let i = 0; i < WORLDS.length; i++) { ctx.fillStyle = i === mapWorld ? '#fff' : 'rgba(255,255,255,0.4)'; circ(VW / 2 - 32 + i * 16, 62, 4); ctx.fill(); }
  // 별 합계
  let starSum = 0;
  for (let s = 0; s < STAGES_PER_WORLD; s++) { const r = stageRec(mapWorld, s); if (r) for (let b = 0; b < 3; b++) if (r.stars & (1 << b)) starSum++; }
  ctx.fillStyle = 'rgba(30,20,50,0.45)'; rrect(VW - 100, 12, 88, 32, 16); ctx.fill();
  ctx.fillStyle = '#ffd84a'; star5(VW - 82, 28, 9, 4, 0); ctx.fill();
  text(`${starSum}/18`, VW - 68, 28, 14, '#fff', 'left');
  const cw = Math.min(150, (VW - 60) / 3 - 12), chh = 104, gx = 14;
  const x0 = VW / 2 - (cw * 3 + gx * 2) / 2, y0 = 84;
  for (let s = 0; s < STAGES_PER_WORLD; s++) {
    const idx = mapWorld * STAGES_PER_WORLD + s, open = idx < Save.data.unlocked, rec = stageRec(mapWorld, s);
    const x = x0 + (s % 3) * (cw + gx), y = y0 + Math.floor(s / 3) * (chh + 14);
    if (!open) {
      button(x, y, cw, chh, '', () => showToast(mapWorld > 0 && s === 0 ? t('worldLocked') : t('locked')), { color: 'rgba(255,255,255,0.35)', dark: 'rgba(40,30,70,0.35)' });
      ctx.fillStyle = 'rgba(60,40,90,0.7)'; rrect(x + cw / 2 - 11, y + chh / 2 - 4, 22, 18, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(60,40,90,0.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x + cw / 2, y + chh / 2 - 5, 7, Math.PI, 0); ctx.stroke();
      continue;
    }
    const cur = idx === Save.data.unlocked - 1 && !rec;
    button(x, y, cw, chh, '', () => playStage(mapWorld, s), { color: cur ? '#ffd84a' : '#fff8ec', dark: cur ? '#d49a1a' : '#b8a8d8' });
    text(`${mapWorld + 1}-${s + 1}`, x + cw / 2, y + 28, 24, '#3b2a63', 'center', false);
    for (let b = 0; b < 3; b++) {
      const got = rec && rec.stars & (1 << b);
      ctx.fillStyle = got ? '#ffd84a' : 'rgba(60,40,90,0.18)'; ctx.strokeStyle = got ? '#d48a10' : 'rgba(60,40,90,0.3)'; ctx.lineWidth = 1.5;
      star5(x + cw / 2 - 22 + b * 22, y + 58, 9, 4, 0); ctx.fill(); ctx.stroke();
    }
    if (rec && rec.time) text(fmtTime(rec.time), x + cw / 2, y + 84, 13, '#6a5a90', 'center', false);
    else if (cur) text('NEW', x + cw / 2, y + 84, 13, '#c45a1c', 'center', false);
    if (rec && rec.rank) {
      const col = { S: '#ff5d7a', A: '#5b7cff', B: '#3fae3a' }[rec.rank];
      ctx.fillStyle = col; circ(x + cw - 14, y + 14, 12); ctx.fill();
      text(rec.rank, x + cw - 14, y + 15, 14, '#fff', 'center', false);
    }
  }
}

// ===== 꾸미기 =====
function drawShop() {
  drawBackdrop(WORLDS[4], time * 30, 0, time);
  ctx.fillStyle = 'rgba(20,12,40,0.25)'; ctx.fillRect(0, 0, VW, VH);
  button(12, 12, 74, 34, t('back'), toTitle, { color: '#8a7ab8', dark: '#5a4a88', size: 14 });
  text(t('shop'), VW / 2, 30, 26, '#fff');
  ctx.fillStyle = 'rgba(30,20,50,0.45)'; rrect(VW - 128, 12, 116, 32, 16); ctx.fill();
  drawAcorn(VW - 108, 28, 1);
  text(String(Save.data.bank), VW - 90, 28, 16, '#fff', 'left');
  const cw = Math.min(150, (VW - 60) / 3 - 12), chh = 132, gx = 14;
  const x0 = VW / 2 - (cw * 3 + gx * 2) / 2, y0 = 60;
  SKINS.forEach((k, i) => {
    const x = x0 + (i % 3) * (cw + gx), y = y0 + Math.floor(i / 3) * (chh + 12);
    const own = Save.data.skins.includes(k.id), on = Save.data.skin === k.id;
    ctx.fillStyle = '#b8a8d8'; rrect(x, y + 4, cw, chh, 16); ctx.fill();
    ctx.fillStyle = on ? '#fff3c4' : '#fff8ec'; rrect(x, y, cw, chh, 16); ctx.fill();
    if (on) { ctx.strokeStyle = '#ffb02e'; ctx.lineWidth = 3; rrect(x, y, cw, chh, 16); ctx.stroke(); }
    ctx.save(); ctx.translate(x + cw / 2, y + 62); ctx.scale(1.7, 1.7);
    drawArmadillo(0, 0, { dir: 1, skin: k.id, run: 0.6, anim: time * 8 }, time);
    ctx.restore();
    text(t('s_' + k.id), x + cw / 2, y + 80, 14, '#3b2a63', 'center', false);
    const bx = x + 12, by = y + 94, bw = cw - 24;
    if (on) button(bx, by, bw, 28, t('equipped'), () => {}, { color: '#c9bde6', dark: '#9a8cc0', size: 13 });
    else if (own) button(bx, by, bw, 28, t('equip'), () => { Save.data.skin = k.id; Save.save(); }, { color: '#5b7cff', dark: '#3446b8', size: 13 });
    else button(bx, by, bw, 28, '', () => {
      if (Save.data.bank >= k.price) {
        Save.data.bank -= k.price; Save.data.skins.push(k.id); Save.data.skin = k.id; Save.save();
        Sound.sfx('buy');
        puff(x + cw / 2 + G.cam.x, y + 50 + G.cam.y, 20, '#ffd84a', 200, 0.6, 4, 0);
      } else showToast(t('need'));
    }, { color: '#ff8a3d', dark: '#c45a1c', size: 13, icon: (cx, cy) => { drawAcorn(cx - 20, cy, 0.9); text(String(k.price), cx - 6, cy + 1, 14, '#fff', 'left', '#c45a1c', 4); } });
  });
}

// ===== 오버레이 =====
function drawPause() {
  const { x, y } = panel(260, 250);
  text(t('paused'), VW / 2, y + 32, 24, '#3b2a63', 'center', false);
  button(x + 30, y + 58, 200, 40, t('resume'), () => { G.state = 'play'; }, { size: 17 });
  button(x + 30, y + 106, 200, 36, t('retry'), () => (G.mode === 'stage' ? playStage(G.world, G.stage) : playEndless()), { color: '#5b7cff', dark: '#3446b8', size: 15 });
  button(x + 30, y + 150, 200, 36, t('quit'), () => { Sound.stopMusic(); G.mode === 'stage' ? openMap() : toTitle(); Sound.playMusic(0); }, { color: '#8a7ab8', dark: '#5a4a88', size: 15 });
  soundToggles(VW / 2 - 21, y + 222);
}
function drawResult() {
  const R = G.result, k = Math.min(1, G.stateT * 3);
  const { x, y } = panel(380, 270);
  text(t('clear'), VW / 2, y + 30, 26, '#ff7a3d', 'center', false);
  const rows = [[t('time'), fmtTime(R.time) + (R.newBest ? '  ★' : '')], [t('acorns'), String(R.acorns)]];
  rows.forEach((r, i) => {
    text(r[0], x + 40, y + 72 + i * 30, 15, '#6a5a90', 'left', false);
    text(r[1], x + 220, y + 72 + i * 30, 18, '#3b2a63', 'right', false);
  });
  if (R.newBest && G.stateT > 0.4) text(t('newBest'), x + 220, y + 52, 12, '#ff5d7a', 'right', false);
  for (let b = 0; b < 3; b++) {
    const got = R.mask & (1 << b), show = G.stateT > 0.3 + b * 0.2;
    const s = show ? 1 + Math.max(0, 0.5 - (G.stateT - 0.3 - b * 0.2) * 3) : 0.001;
    ctx.save(); ctx.translate(x + 70 + b * 46, y + 150); ctx.scale(s, s);
    ctx.fillStyle = got ? '#ffd84a' : 'rgba(60,40,90,0.15)'; ctx.strokeStyle = got ? '#d48a10' : 'rgba(60,40,90,0.3)'; ctx.lineWidth = 2.5;
    star5(0, 0, 18, 8, 0); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  // 등급 도장
  if (G.stateT > 0.9) {
    const s = 1 + Math.max(0, 1.4 - (G.stateT - 0.9) * 6);
    const col = { S: '#ff5d7a', A: '#5b7cff', B: '#3fae3a' }[R.rank];
    ctx.save(); ctx.translate(x + 300, y + 110); ctx.rotate(-0.2); ctx.scale(s, s);
    ctx.strokeStyle = col; ctx.lineWidth = 5; circ(0, 0, 40); ctx.stroke();
    text(R.rank, 0, -4, 46, col, 'center', false);
    text(t('rank' + R.rank), 0, 26, 11, col, 'center', false);
    ctx.restore();
  }
  if (R.newWorld && G.stateT > 1.2) text('🎉 ' + t('newWorld'), VW / 2, y + 190, 15, '#ff7a3d', 'center', false);
  const by = y + 212, last = G.world * STAGES_PER_WORLD + G.stage + 1 >= STAGE_COUNT;
  button(x + 20, by, 100, 40, t('retry'), () => playStage(G.world, G.stage), { color: '#5b7cff', dark: '#3446b8', size: 14 });
  button(x + 130, by, 90, 40, t('map'), () => { openMap(); Sound.playMusic(0); }, { color: '#8a7ab8', dark: '#5a4a88', size: 14 });
  button(x + 230, by, 130, 40, last ? t('map') : t('next') + ' ▶', last ? () => { openMap(); Sound.playMusic(0); } : nextStage, { size: 15 });
  ctx.globalAlpha = 1 - k + 0.0001; ctx.globalAlpha = 1;
}
function drawOver() {
  const R = G.result;
  const { x, y } = panel(360, 250);
  const title = { storm: t('overStorm'), fall: t('overFall'), hit: t('overHit') }[G.overReason] || t('overHit');
  text(title, VW / 2, y + 32, 22, '#5b4a9a', 'center', false);
  text(`${R.dist} m`, VW / 2, y + 84, 44, '#ff7a3d', 'center', '#fff', 6);
  if (R.newBest) text('★ ' + t('newBest'), VW / 2, y + 120, 15, '#ff5d7a', 'center', false);
  else text(`${t('bestRun')} ${Save.data.bestRun} m`, VW / 2, y + 120, 14, '#6a5a90', 'center', false);
  drawAcorn(VW / 2 - 50, y + 152, 1);
  text(`+${R.acorns}`, VW / 2 - 36, y + 152, 16, '#3b2a63', 'left', false);
  text(`${t('score')} ${R.score}`, VW / 2 + 60, y + 152, 14, '#6a5a90', 'center', false);
  button(x + 24, y + 186, 150, 44, t('retry'), playEndless, { size: 17 });
  button(x + 186, y + 186, 150, 44, t('quit'), toTitle, { color: '#8a7ab8', dark: '#5a4a88', size: 16 });
}

// ===== 메인 루프 =====
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now; time += dt;
  Input.poll();
  if (screen === 'play') {
    if (playing()) {
      pendJ = pendJ || Input.jP; pendD = pendD || Input.dP;
      G.inp.l = Input.cur.l; G.inp.r = Input.cur.r; G.inp.j = Input.cur.j; G.inp.d = Input.cur.d;
      acc += dt;
      while (acc >= PH.DT) {
        G.inp.jP = pendJ; G.inp.dP = pendD;
        stepGame(PH.DT);
        pendJ = 0; pendD = 0;
        acc -= PH.DT;
        if (!playing()) { acc = 0; break; }
      }
    } else if (G.state === 'result' || G.state === 'over') { G.stateT += dt; updateParts(dt); }
  } else if (G.parts.length) updateParts(dt);
  render(dt);
  requestAnimationFrame(frame);
}
function render(dt) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#120c22'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(SCALE, 0, 0, SCALE, OFFX, OFFY);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();
  UIB = [];
  if (screen === 'title') drawTitle(dt);
  else if (screen === 'map') drawMap();
  else if (screen === 'shop') { drawShop(); drawParts(G.cam.x, G.cam.y); }
  else if (screen === 'play') {
    drawWorld(time);
    drawHUD(time);
    if (playing()) {
      if (Input.touchSeen) drawControls();
      if (G.state === 'play') roundIcon(VW - 30, 26, 17, (x, y) => { ctx.fillStyle = '#fff'; ctx.fillRect(x - 6, y - 7, 4, 14); ctx.fillRect(x + 2, y - 7, 4, 14); }, pauseGame);
    }
    if (G.state === 'paused') drawPause();
    else if (G.state === 'result') drawResult();
    else if (G.state === 'over') drawOver();
  }
  if (toast) {
    toast.t -= dt;
    ctx.globalAlpha = clamp(toast.t * 3, 0, 1);
    font(15); const w = ctx.measureText(toast.msg).width + 36;
    ctx.fillStyle = 'rgba(30,20,50,0.85)'; rrect(VW / 2 - w / 2, VH - 64, w, 36, 18); ctx.fill();
    text(toast.msg, VW / 2, VH - 46, 15, '#fff', 'center', false);
    ctx.globalAlpha = 1;
    if (toast.t <= 0) toast = null;
  }
  ctx.restore();
  if (PORTRAIT) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const s = Math.min(canvas.width / 360, 2.5 * DPR);
    ctx.setTransform(s, 0, 0, s, canvas.width / 2, OFFY / 2);
    text('📱 ↻  ' + t('rotate'), 0, 0, 14, '#fff', 'center', false);
  }
}
requestAnimationFrame(frame);
