'use strict';
/* 펭귄 썰매 활강 — 화면 전환, 버튼, 입력 연결, 메인 루프 */
const canvas = document.getElementById('c');
ctx = canvas.getContext('2d');
let DPR = 1, SCALE = 1, OFFX = 0, OFFY = 0, PORTRAIT = false;
let screen = 'title', time = 0, acc = 0, UIB = [], pressAt = null;

Save.load();
newGame(true);

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2.5);
  const w = window.innerWidth, h = window.innerHeight;
  canvas.width = Math.round(w * DPR); canvas.height = Math.round(h * DPR);
  PORTRAIT = h > w * 1.05;
  VW = PORTRAIT ? 560 : clamp(Math.round((VH * w) / h), 480, 880);
  SCALE = Math.min((h * DPR) / VH, (w * DPR) / VW);
  OFFX = (w * DPR - VW * SCALE) / 2; OFFY = (h * DPR - VH * SCALE) / 2;
}
window.addEventListener('resize', resize);
resize();

function toV(e) { return [(e.clientX * DPR - OFFX) / SCALE, (e.clientY * DPR - OFFY) / SCALE]; }
const playing = () => screen === 'play' && G.state === 'play';

function wake() {
  Sound.init();
  if (Sound.ctx) Sound.playMusic();
}
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  wake();
  const [x, y] = toV(e);
  pressAt = { x, y };
  if (tapUI(x, y)) return;
  if (screen === 'title') { startRun(); return; }
  if (playing()) Input.ptrs.add(e.pointerId);
}, { passive: false });
const up = e => { Input.ptrs.delete(e.pointerId); pressAt = null; };
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', up);
canvas.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('keydown', e => {
  wake();
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (screen === 'shop') { toTitle(); return; }
    if (playing()) pauseGame();
    else if (screen === 'play' && G.state === 'paused') resumeGame();
    return;
  }
  if (screen === 'title' && (e.code === 'Space' || e.code === 'Enter')) { startRun(); return; }
  if (screen === 'play' && G.state === 'over' && G.stateT > 0.6 && (e.code === 'Space' || e.code === 'Enter')) { startRun(); return; }
  Input.keys.add(e.code);
});
window.addEventListener('keyup', e => Input.keys.delete(e.code));
window.addEventListener('blur', () => { Input.clearAll(); if (playing()) pauseGame(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    Input.clearAll();
    if (playing()) pauseGame();
    if (Sound.ctx) Sound.ctx.suspend();
  } else if (Sound.ctx) Sound.ctx.resume();
});

// ===== 버튼 =====
function tapUI(x, y) {
  for (let i = UIB.length - 1; i >= 0; i--) {
    const b = UIB[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { Sound.sfx('click'); b.cb(); return true; }
  }
  return false;
}
function button(x, y, w, h, label, cb, opt) {
  opt = opt || {};
  UIB.push({ x, y, w, h, cb });
  const down = pressAt && pressAt.x >= x && pressAt.x <= x + w && pressAt.y >= y && pressAt.y <= y + h;
  const col = opt.color || '#ff8a3d', dark = opt.dark || '#c45a1c', oy = down ? 3 : 0;
  ctx.fillStyle = dark; rrect(x, y + 4, w, h, 14); ctx.fill();
  ctx.fillStyle = col; rrect(x, y + oy, w, h, 14); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; rrect(x + 4, y + oy + 3, w - 8, h * 0.35, 10); ctx.fill();
  text(label, x + w / 2, y + h / 2 + oy + 1, opt.size || 18, '#fff', 'center', dark, 4);
}
function roundIcon(x, y, r, draw, cb, on) {
  UIB.push({ x: x - r - 4, y: y - r - 4, w: r * 2 + 8, h: r * 2 + 8, cb });
  ctx.fillStyle = 'rgba(20,30,70,0.45)'; circ(x, y, r); ctx.fill();
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
function iconPause(x, y) { ctx.fillStyle = '#fff'; ctx.fillRect(x - 6, y - 7, 4, 14); ctx.fillRect(x + 2, y - 7, 4, 14); }
function soundToggles(x, y) {
  roundIcon(x, y, 17, iconNote, () => { Save.data.music = !Save.data.music; Sound.apply(); Save.save(); }, Save.data.music);
  roundIcon(x + 42, y, 17, iconSpeaker, () => { Save.data.sfx = !Save.data.sfx; Sound.apply(); Save.save(); }, Save.data.sfx);
}
function panel(w, h) {
  const x = (VW - w) / 2, y = (VH - h) / 2;
  ctx.fillStyle = 'rgba(10,20,50,0.5)'; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = '#2b4a86'; rrect(x, y + 5, w, h, 20); ctx.fill();
  ctx.fillStyle = '#f4f9ff'; rrect(x, y, w, h, 20); ctx.fill();
  return { x, y };
}

// ===== 화면 이동 =====
function startRun() {
  Input.clearAll(); pressAt = null;
  newGame(false);
  screen = 'play'; acc = 0;
  Sound.sfx('start');
}
function pauseGame() { G.state = 'paused'; Input.clearAll(); }
function resumeGame() { G.state = 'play'; Input.clearAll(); }
function toTitle() { Input.clearAll(); if (screen !== 'shop') newGame(true); screen = 'title'; }
function openShop() { Input.clearAll(); shopSel = null; screen = 'shop'; }

// ===== 타이틀 =====
function drawTitle() {
  ctx.fillStyle = 'rgba(10,20,60,0.12)'; ctx.fillRect(0, 0, VW, VH);
  const ly = 74 + Math.sin(time * 2) * 3;
  ctx.save(); ctx.translate(VW / 2, ly); ctx.rotate(Math.sin(time * 1.3) * 0.02);
  const sz = LANG === 'ko' ? 46 : 50;
  text(t('title'), 0, 5, sz, '#1d3a78', 'center', '#1d3a78', 16);
  text(t('title'), 0, 0, sz, '#ffffff', 'center', '#3a7bd5', 10);
  ctx.restore();
  text(t('tagline'), VW / 2, 118, 15, '#fff', 'center', 'rgba(20,40,90,0.85)', 5);
  if (Save.data.bestDist > 0) {
    ctx.fillStyle = 'rgba(20,30,70,0.45)'; rrect(VW / 2 - 90, 134, 180, 24, 12); ctx.fill();
    text(`🏔 ${t('bestDist')} ${Save.data.bestDist} m`, VW / 2, 146, 12, '#fff', 'center', false);
  }
  // 미션
  ensureMissions();
  const mw = Math.min(330, VW - 60), mx = VW / 2 - mw / 2;
  text('🎯 ' + t('missions'), mx + 4, 180, 13, '#ffe066', 'left', 'rgba(20,30,70,0.85)', 3);
  drawMissionList(mx, 200, mw);
  const pulse = 0.6 + 0.4 * Math.sin(time * 4);
  ctx.globalAlpha = pulse;
  text('▶ ' + t('tapStart'), VW / 2, VH - 34, 20, '#ffe066', 'center', 'rgba(20,30,70,0.9)', 5);
  ctx.globalAlpha = 1;
  button(14, VH - 58, 104, 40, '🛷 ' + t('shop'), openShop, { color: '#ff6b9a', dark: '#c23f6c', size: 15 });
  soundToggles(30, 28);
  roundIcon(114, 28, 17, (x, y) => text(t('langBtn'), x, y + 1, 12, '#fff', 'center', false), () => {
    LANG = LANG === 'ko' ? 'en' : 'ko'; Save.data.lang = LANG; Save.save();
  });
  bankChip(VW - 14, 28);
}

function drawPause() {
  const { x, y } = panel(300, 190);
  text(t('paused'), VW / 2, y + 40, 24, '#2b4a86', 'center', false);
  button(x + 30, y + 78, 240, 44, t('resume'), resumeGame, { color: '#4a9cff', dark: '#2a62c4' });
  button(x + 30, y + 132, 240, 38, t('home'), toTitle, { color: '#8a9ab8', dark: '#5a6a88', size: 16 });
  soundToggles(x + 30, y - 26);
}

function drawOver() {
  const k = smooth01(G.stateT / 0.35);
  ctx.save();
  ctx.globalAlpha = k;
  const pw = Math.min(400, VW - 24), { x, y } = panel(pw, 312);
  const cx = VW / 2;
  text(t('caught'), cx, y + 24, 16, '#2b4a86', 'center', false);
  text(`${G.dist} m`, cx, y + 60, 40, '#ff7a3d', 'center', '#fff', 6);
  if (G.newBest) text('★ ' + t('newBest') + ' ★', cx, y + 93, 15, '#ff4d6a', 'center', false);
  else text(`${t('bestDist')} ${Save.data.bestDist} m`, cx, y + 93, 13, '#5a6a90', 'center', false);
  const sy = y + 120, col = pw / 4;
  drawFish(x + col * 0.5 - 16, sy, 0.9, false, 0);
  text(`${G.fish}`, x + col * 0.5 - 2, sy, 15, '#22335a', 'left', false);
  text(`${t('perfects')} ${G.st.perfect}`, x + col * 1.5, sy, 12, '#22335a', 'center', false);
  text(`${t('flips')} ${G.st.flip}`, x + col * 2.5, sy, 12, '#22335a', 'center', false);
  text(`${t('score')} ${G.score}`, x + col * 3.5, sy, 12, '#22335a', 'center', false);
  // 이번 판에 번 생선 (미션 보상 포함)
  ctx.fillStyle = 'rgba(255,214,90,0.35)'; rrect(cx - 90, y + 136, 180, 24, 12); ctx.fill();
  text(`${t('earned')} +${G.earned}`, cx - 6, y + 148, 13, '#8a5a00', 'center', false);
  drawFish(cx + 56, y + 148, 0.7, false, 0);
  drawMissionList(x + 16, y + 180, pw - 32, { list: G.mList, done: G.mDone, prog: G.mList.map(missionProg), dark: true });
  if (G.stateT > 0.5) {
    const bw = pw - 48 - 130;
    button(x + 24, y + 250, bw, 46, t('retry'), startRun, { size: 20 });
    button(x + 36 + bw, y + 250, 118, 46, t('home'), toTitle, { color: '#8a9ab8', dark: '#5a6a88', size: 16 });
  }
  ctx.restore();
}

// ===== 메인 루프 (물리는 120Hz 고정) =====
let last = performance.now();
function frame(now) {
  const dt = clamp((now - last) / 1000, 0, 0.05);
  last = now; time += dt;
  G.inp.held = Input.held;
  const run = screen === 'title' || screen === 'shop' || (screen === 'play' && (G.state === 'play' || G.state === 'caught'));
  if (run) {
    acc += dt;
    while (acc >= PH.DT) {
      stepGame(PH.DT);
      acc -= PH.DT;
      if (screen !== 'play' && G.P.x > 60000) newGame(true);
    }
  } else if (G.state === 'over') { G.stateT += dt; stepParts(dt); }
  updateLoops();
  render(dt);
  requestAnimationFrame(frame);
}
function updateLoops() {
  if (!Sound.ctx) return;
  const P = G.P, act = screen === 'play' && G.state === 'play';
  if (!act) { Sound.setLoops(0, 600, 0, screen === 'play' && G.state === 'caught' ? 0.5 : 0); return; }
  const sp = speedOf(P), gap = P.x - G.A.x;
  const slide = P.ground ? clamp(sp / 1300, 0.05, 1) * 0.22 : 0;
  const wind = !P.ground ? clamp(sp / 1300, 0, 1) * 0.16 : 0.02;
  const rumble = clamp(1 - gap / 1000, 0, 1) * 0.55;
  Sound.setLoops(slide, 500 + sp * 0.9 + P.tuck * 200, wind, rumble);
}
function render(dt) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0a1430'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(SCALE, 0, 0, SCALE, OFFX, OFFY);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();
  UIB = [];
  drawWorld(time, dt);
  if (screen === 'title') drawTitle();
  else if (screen === 'shop') drawShop();
  else {
    drawHUD(time);
    if (G.state === 'play') roundIcon(VW - 30, 28, 17, iconPause, pauseGame);
    else if (G.state === 'paused') drawPause();
    else if (G.state === 'over') drawOver();
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
