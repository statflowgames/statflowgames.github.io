'use strict';
// 화면 전환, 메뉴, 루프

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
Draw.ctx = ctx;

const App = {
  state: 'title', scale: 1, W: 640, buttons: [], titleT: 0, camX: 0, overShown: false, newBest: false, portrait: false,

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = window.innerWidth, h = window.innerHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    this.scale = cv.height / H;
    this.W = Draw.W = cv.width / this.scale;
    this.cssScale = h / H;
    this.portrait = w / h < 1.15;
  },

  start() {
    Game.reset();
    this.state = 'play'; this.overShown = false; this.newBest = false;
    Sound.startMusic();
    Game.banner = { text: t('phases')[0], t: 0 };
  },
  finish() {
    const d = Save.data;
    d.plays++; d.frags += Game.frags; d.deliv += Game.deliv;
    if (Game.score > d.best) { d.best = Game.score; this.newBest = true; }
    if (Game.dist > d.bestDist) d.bestDist = Math.floor(Game.dist);
    Save.save();
  },

  down(px, py) {
    const x = px / this.cssScale, y = py / this.cssScale;
    if (this.portrait) return;
    for (const b of this.buttons) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { Sound.sfx('click'); b.act(); return; }
    }
    if (this.state === 'title') { Sound.sfx('click'); this.start(); }
    else if (this.state === 'play') {
      if (x > this.W - 60 && y < 60) { this.pause(); return; }
      Game.tap();
    }
  },
  key(code) {
    if (code === 'Escape' || code === 'KeyP') {
      if (this.state === 'play') this.pause(); else if (this.state === 'pause') this.state = 'play';
      return;
    }
    if (!['Space', 'ArrowUp', 'ArrowDown', 'Enter', 'KeyW', 'KeyS'].includes(code)) return;
    if (this.state === 'title') this.start();
    else if (this.state === 'play') Game.tap();
    else if (this.state === 'pause') this.state = 'play';
    else if (this.state === 'over' && this.overShown) this.start();
  },
  pause() { if (this.state === 'play' && !Game.dead) this.state = 'pause'; },

  update(dt) {
    this.titleT += dt;
    if (this.portrait || this.simShot) return;
    if (this.state === 'play') {
      Game.update(dt);
      if (Game.dead && Game.deadT > 0.9) { this.state = 'over'; this.finish(); }
    } else if (this.state === 'over') {
      Game.update(dt);
      if (Game.deadT > 1.3) this.overShown = true;
    } else if (this.state === 'title') {
      this.camX += 150 * dt;
    }
  },

  render() {
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    const W = this.W;
    this.buttons = [];
    if (this.state === 'title') this.drawTitle();
    else {
      const camX = Game.x - W * 0.26;
      Draw.world(Game, camX, Game.time, true);
      if (this.state === 'play' || this.state === 'pause') Draw.hud(Game);
      if (this.state === 'pause') this.drawPause();
      if (this.state === 'over') this.drawOver();
    }
    if (this.portrait) {
      ctx.fillStyle = 'rgba(8,8,30,0.92)'; ctx.fillRect(0, 0, W, H);
      Draw.text('↻', W / 2, H / 2 - 40, 48, '#ffd94a', 'center');
      Draw.text(t('rotate'), W / 2, H / 2 + 20, 18, '#fff', 'center');
    }
  },

  drawTitle() {
    const W = this.W, tt = this.titleT;
    if (!this.demo) { this.demo = Object.create(Game); this.demo.reset(); }
    const D = this.demo;
    D.time = tt;
    D.dist = (this.camX / PXM * 1.2) % LOOP_M;   // 배경 시간대가 천천히 돈다
    D.x = this.camX + W * 0.3;
    D.cells = [{ x0: -1e9, x1: 1e9, f: 's', c: 's' }];
    D.gems = []; D.blobs = []; D.pops = [];
    D.y = BOT - PR + Math.sin(tt * 3) * 2; D.face = 0; D.squash = 0; D.inv = 0; D.shield = false; D.dead = false;
    Draw.world(D, this.camX, tt, true);
    const c = ctx;
    c.fillStyle = 'rgba(10,8,40,0.25)'; c.fillRect(0, 0, W, H);
    Draw.text(t('title'), W / 2, 118 + Math.sin(tt * 1.5) * 4, 52, '#fff3a8', 'center');
    Draw.text(t('sub'), W / 2, 160, 14, '#d9d0ff', 'center');
    c.globalAlpha = 0.6 + 0.4 * Math.sin(tt * 4);
    Draw.text(t('tap'), W / 2, 214, 20, '#ffffff', 'center');
    c.globalAlpha = 1;
    Draw.text(t('how'), W / 2, 246, 14, '#bff6ff', 'center');
    if (Save.data.best > 0) Draw.text(`${t('best')} ${Save.data.best}  ·  ${Save.data.bestDist}m`, W / 2, 20 + 6, 14, '#ffd1ef', 'center');
    const d = Save.data;
    const mk = (x, label, on, act) => this.buttons.push({ x, y: H - 46, w: 92, h: 32, size: 13, label: `${label} ${on ? 'ON' : 'OFF'}`, act });
    mk(W - 210, t('sound'), d.sfx, () => { d.sfx = d.sfx ? 0 : 1; Save.save(); Sound.apply(); });
    mk(W - 110, t('music'), d.music, () => { d.music = d.music ? 0 : 1; Save.save(); Sound.apply(); });
    for (const b of this.buttons) Draw.button(b);
  },
  drawPause() {
    const W = this.W;
    ctx.fillStyle = 'rgba(8,8,30,0.55)'; ctx.fillRect(0, 0, W, H);
    Draw.text(t('paused'), W / 2, 120, 32, '#fff', 'center');
    this.buttons.push({ x: W / 2 - 90, y: 160, w: 180, h: 44, label: t('resume'), primary: true, act: () => { this.state = 'play'; } });
    this.buttons.push({ x: W / 2 - 90, y: 216, w: 180, h: 40, label: t('home'), act: () => { this.state = 'title'; Sound.stopMusic(); } });
    for (const b of this.buttons) Draw.button(b);
  },
  drawOver() {
    if (!this.overShown) return;
    const W = this.W, G = Game, d = Save.data;
    const pw = 340, ph = 270, px = W / 2 - pw / 2, py = 44;
    Draw.panel(px, py, pw, ph);
    Draw.text(t('over'), W / 2, py + 32, 24, '#fff3a8', 'center');
    Draw.text(String(G.score), W / 2, py + 76, 40, '#ffffff', 'center');
    if (this.newBest) Draw.text(t('newBest'), W / 2 + 95, py + 66, 15, '#ff9ad5', 'center');
    const row = (i, k, v, col) => {
      Draw.text(k, px + 50, py + 118 + i * 24, 15, '#cfc8ff');
      Draw.text(v, px + pw - 50, py + 118 + i * 24, 15, col || '#fff', 'right');
    };
    row(0, t('dist'), Math.floor(G.dist) + 'm', '#ffe9a8');
    row(1, t('frag'), String(G.frags), '#bff6ff');
    row(2, t('deliv'), String(G.deliv), '#ffd1ef');
    row(3, t('best'), String(d.best));
    this.buttons.push({ x: W / 2 - 150, y: py + ph - 56, w: 170, h: 42, label: t('retry'), primary: true, act: () => this.start() });
    this.buttons.push({ x: W / 2 + 30, y: py + ph - 56, w: 120, h: 42, label: t('home'), act: () => { this.state = 'title'; Sound.stopMusic(); } });
    for (const b of this.buttons) Draw.button(b);
  }
};

App.resize();
window.addEventListener('resize', () => App.resize());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { App.pause(); Sound.stopMusic(); }
  else if (App.state !== 'title') Sound.startMusic();
});
Input.onDown = (x, y) => App.down(x, y);
Input.onKey = c => App.key(c);
Input.init(cv);

// 개발용: 주소 끝에 #sim=초 를 붙이면 봇이 그만큼 달린 장면에서 멈춘다 (스크린샷 확인용)
const STEP_SIM = 1 / 120;
(() => {
  const m = /sim=(\d+)(?:&over)?/.exec(location.hash);
  if (!m) return;
  App.start();
  const end = +m[1] * 120;
  for (let i = 0; i < end && !Game.dead; i++) {
    if (Game.ground) {
      const side = Game.g > 0 ? 'f' : 'c';
      let danger = false;
      for (let k = 0; k <= 24; k += 4) { const c = Game.cellAt(Game.x + PR + Game.speed * 0.03 + k); if (c && c[side] !== 's') danger = true; }
      if (danger && !Game.blobs.some(b => b.x - Game.x > -30 && b.x - Game.x < Game.speed * Game.flipTime() + 30)) Game.tap();
    }
    Game.update(STEP_SIM);
  }
  if (/&over/.test(location.hash)) { Game.hit('fall'); Game.shield = false; Game.dead = true; Game.deadT = 2; App.state = 'over'; App.finish(); App.overShown = true; }
  else App.simShot = true;
})();

let last = performance.now(), acc = 0;
const STEP = 1 / 120;
function frame(now) {
  acc += Math.min(0.25, (now - last) / 1000);
  last = now;
  try {
    while (acc >= STEP) { App.update(STEP); acc -= STEP; }
    App.render();
  } catch (e) { console.error(e); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
