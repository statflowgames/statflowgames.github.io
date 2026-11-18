// 일곱 번째 달 — M0 손맛 프로토타입 (숲길 1스테이지)
const W = 1280, H = 720;
const Q = new URLSearchParams(location.search);
const STAGE_W = 6600;

// ---------------------------------------------------------------------------
class Boot extends Phaser.Scene {
  constructor() { super('boot'); }
  preload() {
    const t = this.add.text(W / 2, H / 2, '불러오는 중… 0%', { fontFamily: 'sans-serif', fontSize: 28, color: '#f4e4c0' }).setOrigin(0.5);
    this.load.on('progress', p => t.setText('불러오는 중… ' + Math.round(p * 100) + '%'));
    this.load.json('man', 'assets/manifest.json');
    this.load.once('filecomplete-json-man', (k, ty, data) => {
      const ext = data.__ext || '.png';
      for (const key of Object.keys(data)) if (key !== '__ext') this.load.image(key, 'assets/' + key + ext);
    });
  }
  create() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x000000, 1).fillEllipse(60, 18, 120, 36); g.generateTexture('shadow', 120, 36); g.clear();
    g.fillStyle(0xffd34d).fillCircle(12, 12, 12); g.fillStyle(0xfff3b0).fillCircle(9, 9, 5); g.lineStyle(2, 0x9a6a10).strokeCircle(12, 12, 11); g.generateTexture('coin', 24, 24); g.clear();
    g.fillStyle(0xb34dff, 0.35).fillCircle(26, 26, 26); g.fillStyle(0xd28cff).fillCircle(26, 26, 15); g.fillStyle(0xffffff).fillCircle(22, 22, 6); g.generateTexture('orb', 52, 52); g.clear();
    g.fillStyle(0xffffff).fillRect(0, 0, 4, 4); g.generateTexture('px', 4, 4); g.destroy();
    this.scene.start(Q.has('play') ? 'game' : 'title');
  }
}

// ---------------------------------------------------------------------------
class Title extends Phaser.Scene {
  constructor() { super('title'); }
  create() {
    this.add.image(W / 2, 0, 'bg/far').setOrigin(0.5, 0).setScale(0.86);
    this.add.rectangle(0, 0, W, H, 0x120a20, 0.45).setOrigin(0);
    const r = new Rig(this, RIGS.warrior());
    r.measure(P.stand);
    r.c.setPosition(230, 650 - r.foot * 0.62).setScale(0.62);
    this.rig = r; this.t = 0;
    const g = new Rig(this, RIGS.grunt()); g.measure(P.standMon);
    g.c.setPosition(1180, 650 - g.foot * 0.42).setScale(-0.42, 0.42); this.g = g;
    this.add.text(W / 2 + 120, 190, '일곱 번째 달', { fontFamily: 'serif', fontSize: 92, color: '#ffe7a8', stroke: '#3a1606', strokeThickness: 10 }).setOrigin(0.5);
    this.add.text(W / 2 + 120, 275, 'SEVENTH MOON · M0 손맛 프로토타입', { fontFamily: 'sans-serif', fontSize: 24, color: '#f0d9b0', stroke: '#2a1206', strokeThickness: 5 }).setOrigin(0.5);
    const st = this.add.text(W / 2 + 120, 400, '터치하거나 아무 키나 눌러 시작', { fontFamily: 'sans-serif', fontSize: 30, color: '#fff', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
    this.tweens.add({ targets: st, alpha: 0.3, yoyo: true, repeat: -1, duration: 700 });
    this.add.text(W / 2 + 120, 470, '이동 WASD·방향키   공격 J   점프 K   구르기 L\n가드 I (누르고 있기, 맞기 직전에 누르면 패리)   각성 O\n달리면서 공격 = 방패 돌진 · 위+공격 = 올려치기 · 아래+공격 = 내려찍기', { fontFamily: 'sans-serif', fontSize: 19, color: '#e8dcc8', align: 'center', stroke: '#000', strokeThickness: 4, lineSpacing: 8 }).setOrigin(0.5, 0);
    const go = () => { SFX.resume(); SFX.go(); this.scene.start('game'); };
    this.input.keyboard.once('keydown', go);
    this.input.once('pointerdown', go);
  }
  update(t, dt) {
    this.t += dt;
    this.rig.apply(CLIPS.idle.at(this.t));
    this.g.apply(CLIPS.m_taunt.at(this.t));
  }
}

// ---------------------------------------------------------------------------
class Game extends Phaser.Scene {
  constructor() { super('game'); }
  create() {
    this.now = 0; this.hitstop = 0; this.won = false; this.lost = false;
    this.god = Q.has('god'); this.hard = Q.has('hard');
    this.gold = 0; this.comboN = 0; this.comboT = 0; this.maxCombo = 0; this.startTime = 0;
    this.monsters = []; this.props = []; this.projs = []; this.pickups = []; this.tokens = new Set();
    this.bounds = { l: 0, r: W };
    this.cameras.main.setBounds(0, 0, STAGE_W, H);
    this.buildStage();
    this.hero = new Hero(this, 260, 600);
    this.isTouch = Q.has('touch') || this.sys.game.device.input.touch;
    this.buildHud();
    this.buildInput();
    this.waves = this.makeWaves();
    this.waveIdx = 0; this.lock = null;
    const skip = +Q.get('wave') || 0;
    if (skip) { this.waveIdx = skip; this.hero.x = this.waves[skip - 1].end - 300; }
    this.cameras.main.scrollX = Phaser.Math.Clamp(this.hero.x - W * 0.4, 0, STAGE_W - W);
    this.cameras.main.fadeIn(400);
    this.banner('1장  안개 낀 숲길', '#ffe7a8');
  }
  // ---------------- 무대 ----------------
  buildStage() {
    // 먼 배경: 좌우 반전을 번갈아 이어 붙여 이음새를 숨긴다
    const fs = 0.74, fw = 1536 * fs;
    for (let i = 0; i * fw * 0.35 < STAGE_W * 0.35 + W; i++) {
      this.add.image(i * fw, -40, 'bg/far').setOrigin(0, 0).setScale(fs).setFlipX(i % 2 === 1).setScrollFactor(0.35, 1).setDepth(0);
    }
    // 바닥
    const gt = this.add.tileSprite(0, 448, STAGE_W, H - 448, 'bg/ground').setOrigin(0).setDepth(10);
    gt.tileScaleX = 0.62; gt.tileScaleY = 0.62; gt.tilePositionY = 30;
    const edge = this.add.graphics().setDepth(11);
    edge.fillGradientStyle(0x2c3a1a, 0x2c3a1a, 0x2c3a1a, 0x2c3a1a, 0.55, 0.55, 0, 0).fillRect(0, 448, STAGE_W, 34);
    // 뒤쪽 소품 (바닥 뒤 가장자리)
    const back = [['oak', 0.95], ['bush', 0.7], ['lantern', 0.65], ['rock', 0.6], ['sign', 0.7], ['log', 0.6], ['bush', 0.8], ['oak', 1.05], ['wagon', 0.7], ['bush', 0.7]];
    let x = 120, k = 0;
    while (x < STAGE_W) {
      const [n, s] = back[k++ % back.length];
      this.add.image(x, 470, 'props/' + n).setOrigin(0.5, 1).setScale(s).setDepth(12 + (n === 'oak' ? 0 : 1));
      x += 260 + Math.random() * 260;
    }
    // 앞쪽 풀숲 (전경, 살짝 빠르게 움직임)
    for (let fx = 200; fx < STAGE_W * 1.25; fx += 420 + Math.random() * 500) {
      const n = Math.random() < 0.6 ? 'grass' : 'bush';
      this.add.image(fx, H + 30, 'props/' + n).setOrigin(0.5, 1).setScale(n === 'grass' ? 1.4 : 1.1).setScrollFactor(1.25, 1).setDepth(4500).setAlpha(0.95);
    }
    // 부서지는 통과 상자
    const br = [[700, 560, 'barrel'], [760, 600, 'crate'], [2060, 520, 'crate'], [2700, 650, 'barrel'], [3550, 540, 'barrel'], [3600, 580, 'crate'], [4300, 640, 'crate'], [4900, 520, 'barrel']];
    for (const [px, py, n] of br) this.addProp(px, py, n);
  }
  addProp(x, y, n) {
    const img = this.add.image(x, y + 6, 'props/' + n).setOrigin(0.5, 1).setScale(n === 'barrel' ? 0.85 : 0.8).setDepth(1000 + y);
    const sh = this.add.image(x, y + 2, 'shadow').setScale(0.7, 0.6).setAlpha(0.45).setDepth(999);
    this.props.push({ x, y, n, img, sh, hp: n === 'crate' ? 2 : 1, hitSet: null });
  }
  makeWaves() {
    return [
      { at: 900, l: 520, r: 1800, groups: [[['grunt', 1], ['grunt', -1], ['grunt', 1]]], end: 1800 },
      { at: 2300, l: 1950, r: 3230, groups: [[['grunt', 1], ['grunt', -1], ['spear', 1]], [['grunt', 1], ['grunt', -1]]], end: 3230 },
      { at: 3750, l: 3400, r: 4680, groups: [[['grunt', 1], ['spear', -1], ['shaman', 1]], [['grunt', -1], ['grunt', 1], ['spear', 1]]], end: 4680 },
      { at: 5250, l: 5000, r: 6280, groups: [[['barkhaul', 1]]], boss: true, end: 6280 },
    ];
  }
  spawn(kind, side) {
    const x = side > 0 ? this.bounds.r + 120 : this.bounds.l - 120;
    const y = Phaser.Math.Between(FLOOR_TOP + 20, FLOOR_BOT - 20);
    const m = new Monster(this, kind, x, kind === 'barkhaul' ? 590 : y);
    this.monsters.push(m);
    return m;
  }
  startWave(w) {
    this.lock = w; this.groupIdx = 0;
    this.bounds = { l: w.l, r: w.r };
    this.spawnGroup();
    if (w.boss) this.bossIntro();
  }
  spawnGroup() {
    const g = this.lock.groups[this.groupIdx++];
    g.forEach(([k, s], i) => this.time.delayedCall(i * 350, () => { const m = this.spawn(k, s); if (k === 'barkhaul') { this.boss = m; m.cool = 3200; } }));
  }
  checkWave() {
    if (this.lock) {
      const alive = this.monsters.filter(m => !m.dead).length;
      const pending = this.lock.groups.length > this.groupIdx;
      if (pending && alive <= 1 && !this.spawning) { this.spawning = true; this.time.delayedCall(500, () => { this.spawnGroup(); this.spawning = false; }); }
      if (!pending && alive === 0 && !this.spawning && !this.lock.boss) {
        this.lock = null; this.bounds = { l: 0, r: STAGE_W };
        this.showGo();
      }
      return;
    }
    const w = this.waves[this.waveIdx];
    if (w && this.hero.x > w.at) { this.waveIdx++; this.startWave(w); }
    if (!this.lock) this.bounds = { l: Math.max(0, this.cameras.main.scrollX), r: this.waves[this.waveIdx] ? STAGE_W : STAGE_W };
  }
  // ---------------- 입력 ----------------
  buildInput() {
    const kb = this.input.keyboard;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,J,K,L,I,O,Z,X,C,V,SHIFT,SPACE,P,ESC,R,ENTER');
    this.touch = { x: 0, y: 0, atk: false, jump: false, roll: false, guard: false, awk: false };
    this.prev = {};
    if (this.isTouch) this.buildTouch();
    this.keys.P.on('down', () => this.togglePause());
    this.keys.ESC.on('down', () => this.togglePause());
    this.input.keyboard.on('keydown', () => SFX.resume());
  }
  buildTouch() {
    this.input.addPointer(3);
    const base = this.add.image(170, 560, 'ui/stick_base').setScrollFactor(0).setDepth(6000).setAlpha(0.75).setScale(0.95);
    const knob = this.add.image(170, 560, 'ui/stick_knob').setScrollFactor(0).setDepth(6001).setAlpha(0.9).setScale(0.95);
    this.stick = { base, knob, id: null, cx: 170, cy: 560 };
    const btn = (key, x, y, s, name) => {
      const b = this.add.image(x, y, 'ui/' + key).setScrollFactor(0).setDepth(6000).setScale(s).setAlpha(0.85);
      b.r = b.displayWidth * 0.5; b.name2 = name; return b;
    };
    this.btns = [btn('attack', 1110, 590, 0.85, 'atk'), btn('jump', 960, 640, 0.6, 'jump'), btn('roll', 1180, 430, 0.55, 'roll'), btn('skill_frame', 960, 490, 0.6, 'guard'), btn('awaken', 1050, 380, 0.5, 'awk')];
    this.add.image(960, 490, 'warrior/shield_0').setScrollFactor(0).setDepth(6001).setScale(0.75);
    this.input.on('pointerdown', p => this.onPointer(p));
    this.input.on('pointermove', p => this.onPointer(p));
    this.input.on('pointerup', p => this.onPointerUp(p));
  }
  onPointer(p) {
    if (!p.isDown) return;
    SFX.resume();
    const s = this.stick;
    if (p.x < W * 0.45) {
      if (s.id === null || s.id === p.id) {
        if (s.id === null) { s.id = p.id; s.cx = Phaser.Math.Clamp(p.x, 120, 400); s.cy = Phaser.Math.Clamp(p.y, 420, 640); s.base.setPosition(s.cx, s.cy); }
        const dx = p.x - s.cx, dy = p.y - s.cy, d = Math.hypot(dx, dy), m = Math.min(d, 70);
        s.knob.setPosition(s.cx + (d ? dx / d * m : 0), s.cy + (d ? dy / d * m : 0));
        this.touch.x = Math.abs(dx) > 22 ? Math.sign(dx) : 0;
        this.touch.y = Math.abs(dy) > 26 ? Math.sign(dy) : 0;
      }
      return;
    }
    for (const b of this.btns) {
      if (Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y) < b.r * 1.1) {
        if (p.btn !== b) { this.touch[b.name2] = true; p.btn = b; b.setScale(b.scale * 0.92); this.time.delayedCall(90, () => b.setScale(b.scale / 0.92)); }
      }
    }
  }
  onPointerUp(p) {
    const s = this.stick;
    if (s.id === p.id) { s.id = null; s.knob.setPosition(s.cx, s.cy); this.touch.x = 0; this.touch.y = 0; }
    if (p.btn) { if (p.btn.name2 === 'guard') this.touch.guard = false; p.btn = null; }
  }
  readInput() {
    const k = this.keys, t = this.touch;
    const L = k.A.isDown || k.LEFT.isDown, R = k.D.isDown || k.RIGHT.isDown, U = k.W.isDown || k.UP.isDown, Dn = k.S.isDown || k.DOWN.isDown;
    const ti = window.TI || {};
    const cur = {
      atk: !!ti.atk || k.J.isDown || k.Z.isDown || t.atk, jump: !!ti.jump || k.K.isDown || k.X.isDown || t.jump, roll: !!ti.roll || k.L.isDown || k.C.isDown || t.roll,
      awk: !!ti.awk || k.O.isDown || k.V.isDown || t.awk,
    };
    const inp = {
      x: ti.x || (R ? 1 : 0) - (L ? 1 : 0) || t.x, y: ti.y || (Dn ? 1 : 0) - (U ? 1 : 0) || t.y,
      guard: !!ti.guard || k.I.isDown || k.SHIFT.isDown || k.SPACE.isDown || t.guard,
    };
    for (const n of ['atk', 'jump', 'roll', 'awk']) inp[n + 'P'] = cur[n] && !this.prev[n];
    this.prev = cur;
    t.atk = t.jump = t.roll = t.awk = false;
    return inp;
  }
  togglePause() {
    if (this.won || this.lost) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.pauseUi = this.add.container(0, 0).setScrollFactor(0).setDepth(9000);
      this.pauseUi.add(this.add.rectangle(0, 0, W, H, 0, 0.55).setOrigin(0));
      this.pauseUi.add(this.add.text(W / 2, H / 2, '일시 정지\nP 또는 ESC로 계속', { fontFamily: 'sans-serif', fontSize: 40, color: '#fff', align: 'center' }).setOrigin(0.5));
    } else if (this.pauseUi) this.pauseUi.destroy();
  }
  // ---------------- HUD ----------------
  buildHud() {
    const d = 5000, hud = this.add.container(0, 0).setScrollFactor(0).setDepth(d);
    const panel = this.add.graphics();
    panel.fillStyle(0x1a0f08, 0.78).fillRoundedRect(16, 14, 430, 112, 14).lineStyle(3, 0xc99a3c).strokeRoundedRect(16, 14, 430, 112, 14);
    panel.fillStyle(0x3a2412).fillCircle(72, 70, 46).lineStyle(4, 0xe0b45a).strokeCircle(72, 70, 46);
    hud.add(panel);
    hud.add(this.add.image(74, 74, 'warrior/head').setScale(0.95));
    hud.add(this.add.text(132, 22, '하르반', { fontFamily: 'sans-serif', fontSize: 22, color: '#ffe7a8', fontStyle: 'bold' }));
    hud.add(this.add.text(220, 26, '방패전사 Lv.1', { fontFamily: 'sans-serif', fontSize: 15, color: '#c8b08a' }));
    this.bars = this.add.graphics(); hud.add(this.bars);
    this.goldText = this.add.text(W - 24, 22, '0', { fontFamily: 'sans-serif', fontSize: 26, color: '#ffd34d', stroke: '#3a1606', strokeThickness: 5 }).setOrigin(1, 0);
    hud.add(this.add.image(W - 24 - 70, 37, 'coin').setScale(1.1)); hud.add(this.goldText);
    this.comboText = this.add.text(W - 30, 120, '', { fontFamily: 'sans-serif', fontSize: 54, color: '#fff2c0', stroke: '#7a2a06', strokeThickness: 8, fontStyle: 'bold italic' }).setOrigin(1, 0.5).setAlpha(0);
    this.comboSub = this.add.text(W - 34, 160, 'HIT', { fontFamily: 'sans-serif', fontSize: 22, color: '#ffd34d', stroke: '#3a1606', strokeThickness: 5 }).setOrigin(1, 0.5).setAlpha(0);
    hud.add(this.comboText); hud.add(this.comboSub);
    this.awkHint = this.add.text(132, 100, '', { fontFamily: 'sans-serif', fontSize: 15, color: '#ffe27a', stroke: '#000', strokeThickness: 4 });
    hud.add(this.awkHint);
    if (!this.isTouch) hud.add(this.add.text(W / 2, H - 14, '이동 WASD·방향키 · 공격 J · 점프 K · 구르기 L · 가드 I(맞기 직전=패리) · 각성 O · 일시정지 P', { fontFamily: 'sans-serif', fontSize: 15, color: '#f3e6cc', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 1).setAlpha(0.8));
    this.hud = hud;
    this.bossBar = null;
  }
  drawHud() {
    const h = this.hero, g = this.bars;
    g.clear();
    const bar = (x, y, w, hh, v, col, back = 0x2a1a10) => {
      g.fillStyle(0x000000, 0.6).fillRoundedRect(x - 2, y - 2, w + 4, hh + 4, 4);
      g.fillStyle(back).fillRect(x, y, w, hh);
      g.fillStyle(col).fillRect(x, y, w * Phaser.Math.Clamp(v, 0, 1), hh);
      g.fillStyle(0xffffff, 0.18).fillRect(x, y, w * Phaser.Math.Clamp(v, 0, 1), hh * 0.4);
    };
    this.hpShow = Phaser.Math.Linear(this.hpShow ?? h.hp, h.hp, 0.08);
    g.fillStyle(0x2a1a10).fillRect(132, 52, 296, 20);
    g.fillStyle(0xffe0a0).fillRect(132, 52, 296 * this.hpShow / h.maxHp, 20);
    bar(132, 52, 296, 20, h.hp / h.maxHp, h.hp < h.maxHp * 0.25 ? 0xff3030 : 0xd8352a, 0x00000000);
    bar(132, 78, 200, 9, h.sta / 100, 0x6fd06a);
    const full = h.awk >= 100;
    bar(132, 92, 296, 7, h.awk / 100, full ? (Math.floor(this.now / 120) % 2 ? 0xfff2a0 : 0xffb020) : 0xe0a030);
    this.awkHint.setText(full ? '각성 준비! (O)' : '').setY(102);
    if (this.boss && this.bossBar) {
      const b = this.boss;
      this.bossShow = Phaser.Math.Linear(this.bossShow ?? b.hp, Math.max(0, b.hp), 0.06);
      const x = 290, y = 636, w = 700;
      g.fillStyle(0x000000, 0.65).fillRoundedRect(x - 6, y - 6, w + 12, 30, 6);
      g.fillStyle(0xffe0a0).fillRect(x, y, w * this.bossShow / b.maxHp, 18);
      g.fillStyle(b.raged ? 0xff3a20 : 0x9a2fd0).fillRect(x, y, w * Math.max(0, b.hp) / b.maxHp, 18);
      g.fillStyle(0xffd34d).fillRect(x, y + 20, w * Math.max(0, b.poise) / 100, 4);
      if (!this.bossName) this.bossName = this.add.text(x, y - 8, '이끼거인 바크하울', { fontFamily: 'serif', fontSize: 22, color: '#f6ffd8', stroke: '#1d2a08', strokeThickness: 5 }).setOrigin(0, 1).setScrollFactor(0).setDepth(5001);
    }
    if (this.bossName && (!this.boss || this.boss.dead)) { this.bossName.destroy(); this.bossName = null; }
    if (this.comboT > 0) {
      this.comboT -= this.dtv;
      this.comboText.setAlpha(Math.min(1, this.comboT / 300)); this.comboSub.setAlpha(Math.min(1, this.comboT / 300));
      if (this.comboT <= 0) this.comboN = 0;
    }
    this.goldText.setText(String(this.gold));
  }
  addCombo() {
    this.comboN++; this.comboT = 1600; this.maxCombo = Math.max(this.maxCombo, this.comboN);
    this.comboText.setText(String(this.comboN)).setScale(1.35);
    this.tweens.add({ targets: this.comboText, scale: 1, duration: 140 });
    this.comboSub.setText(this.comboN >= 30 ? 'HIT  굉장해!' : this.comboN >= 15 ? 'HIT  멋져요!' : 'HIT');
  }
  banner(txt, color = '#fff', sub) {
    const t = this.add.text(W / 2, 250, txt, { fontFamily: 'serif', fontSize: 58, color, stroke: '#2a1206', strokeThickness: 10 }).setOrigin(0.5).setScrollFactor(0).setDepth(7000).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, y: 230, duration: 400, hold: 1300, yoyo: true, onComplete: () => t.destroy() });
    if (sub) {
      const s = this.add.text(W / 2, 300, sub, { fontFamily: 'sans-serif', fontSize: 26, color: '#f0d9b0', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setScrollFactor(0).setDepth(7000).setAlpha(0);
      this.tweens.add({ targets: s, alpha: 1, duration: 400, hold: 1300, yoyo: true, onComplete: () => s.destroy() });
    }
  }
  showGo() {
    SFX.go();
    const t = this.add.text(W - 120, 330, 'GO ▶', { fontFamily: 'sans-serif', fontSize: 60, color: '#ffe27a', stroke: '#6a2a06', strokeThickness: 9, fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(7000);
    this.tweens.add({ targets: t, x: W - 90, alpha: 0.4, yoyo: true, repeat: 5, duration: 300, onComplete: () => t.destroy() });
  }
  floatText(x, y, s, color = '#fff', size = 30) {
    const t = this.add.text(x + Phaser.Math.Between(-12, 12), y, s, { fontFamily: 'sans-serif', fontSize: size, color, stroke: '#000', strokeThickness: 6, fontStyle: 'bold' }).setOrigin(0.5).setDepth(4500);
    t.setScale(1.5);
    this.tweens.add({ targets: t, scale: 1, duration: 120 });
    this.tweens.add({ targets: t, y: y - 60, alpha: 0, delay: 350, duration: 500, onComplete: () => t.destroy() });
  }
  // ---------------- 이펙트 ----------------
  fx(key, x, y, o = {}) {
    const img = this.add.image(x, y, 'fx/' + key).setDepth(o.depth ?? 4000).setScale((o.s || 0.4) * (o.grow ? 0.7 : 0.75));
    if (o.flip) img.setFlipX(true);
    if (o.rot) img.setAngle(o.rot);
    if (o.tint) img.setTint(o.tint);
    if (o.flat) img.setScale((o.s || 0.4) * 0.6, (o.s || 0.4) * 0.22);
    if (o.add) img.setBlendMode(Phaser.BlendModes.ADD);
    const s1 = (o.s || 0.4) * (o.grow || 1);
    this.tweens.add({ targets: img, scaleX: o.flat ? s1 * 1.1 : s1, scaleY: o.flat ? s1 * 0.4 : s1, duration: (o.dur || 300) * 0.4, ease: 'Cubic.out' });
    this.tweens.add({ targets: img, alpha: 0, delay: (o.dur || 300) * 0.45, duration: (o.dur || 300) * 0.55, onComplete: () => img.destroy() });
    return img;
  }
  swingFx(h, a) {
    const f = h.face, top = h.y - h.z;
    const conf = {
      h: { dx: 115, dy: -110, rot: 10, s: 0.32 },
      u: { dx: 105, dy: -140, rot: -40, s: 0.32 },
      s: { dx: 70, dy: -120, rot: 0, s: 0.3 },
      v: { dx: 110, dy: -120, rot: 50, s: 0.38 },
    }[a.swing];
    if (!conf || a.swing === 's') return;
    const img = this.fx('smear_warrior', h.x + f * conf.dx, top + conf.dy, { s: conf.s, flip: f < 0, rot: f * conf.rot, dur: 150, depth: h.y + 1002 });
    img.setAlpha(0.8);
  }
  telegraph(x, y, s, ms) {
    const img = this.add.image(x, y, 'fx/telegraph_circle').setDepth(998).setScale(s * 0.2, s * 0.08).setAlpha(0.2);
    this.tweens.add({ targets: img, scaleX: s * 0.55, scaleY: s * 0.22, alpha: 0.85, duration: ms * 0.8, ease: 'Cubic.out' });
    this.tweens.add({ targets: img, alpha: 0.4, yoyo: true, repeat: -1, duration: 120, delay: ms * 0.6 });
    this.time.delayedCall(ms + 60, () => img.destroy());
  }
  spawnDebrisAt(x, y, n, type) {
    const keys = type === 'barrel' ? ['d00', 'd01', 'd02', 'd03', 'd16'] : type === 'crate' ? ['d04', 'd05', 'd06', 'd07', 'd12'] : ['d13', 'd14', 'd15'];
    for (let i = 0; i < n; i++) {
      const k = keys[i % keys.length];
      if (!this.textures.exists('debris/' + k)) continue;
      const img = this.add.image(x, y - 40, 'debris/' + k).setDepth(1000 + y + 2).setScale(0.9);
      const vx = Phaser.Math.Between(-280, 280), vy = Phaser.Math.Between(-620, -320), vr = Phaser.Math.Between(-720, 720);
      const groundY = y + Phaser.Math.Between(-20, 30);
      let t = 0, py = y - 40, px = x, v = vy, bounced = 0;
      const ev = this.time.addEvent({ delay: 16, loop: true, callback: () => {
        t += 16; v += 2200 * 0.016; px += vx * 0.016 * (bounced ? 0.4 : 1); py += v * 0.016; img.angle += vr * 0.016 * (bounced ? 0.3 : 1);
        if (py > groundY) { py = groundY; if (bounced++ < 1) v = -v * 0.35; else v = 0; }
        img.setPosition(px, py);
        if (t > 1300) { img.alpha -= 0.05; if (img.alpha <= 0) { img.destroy(); ev.remove(); } }
      } });
    }
  }
  // ---------------- 전투 판정 ----------------
  meleeHit(h, a) {
    const f = h.face;
    let any = false;
    const targets = [...this.monsters.filter(m => !m.dead), ...this.props.filter(p => p.hp > 0)];
    for (const m of targets) {
      if (h.hitSet.has(m)) continue;
      const rel = (m.x - h.x) * f;
      const reachMul = m.kind === 'barkhaul' ? 1.35 : 1;
      if (rel < a.reach[0] - 20 || rel > a.reach[1] * reachMul) continue;
      if (Math.abs(m.y - h.y) > (a.dz + (m.kind === 'barkhaul' ? 20 : 0))) continue;
      if (m.img) { h.hitSet.add(m); this.hitProp(m, h); any = true; continue; }
      if ((m.z || 0) > (a.zr || 170) + h.z) continue;
      if (m.state === 'down' && !a.otg) continue;
      const crit = Math.random() < 0.08 || (a.fin && this.comboN > 0 && this.comboN % 10 === 9);
      let dmg = Math.round(a.dmg * (0.9 + Math.random() * 0.2) * (crit ? 1.8 : 1) * (m.state === 'down' ? 1.4 : 1));
      if (!m.takeHit(h, a, dmg)) continue;
      h.hitSet.add(m); any = true;
      this.addCombo();
      h.awk = Math.min(100, h.awk + 3);
      const hx = m.x - f * 20, hy = m.y - m.z - m.height * (m.kind === 'barkhaul' ? 0.45 : 0.55);
      this.fx('hit_spark', hx, hy, { s: crit ? 0.42 : 0.3, rot: Phaser.Math.Between(0, 360), dur: 220, depth: 4200 });
      if (crit) { this.fx('crit_flash', hx, hy, { s: 0.45, dur: 380, depth: 4201 }); SFX.crit(); }
      if (a.type !== 'light') this.fx('impact_ring', hx, hy, { s: 0.35, dur: 300, depth: 4199 });
      this.floatText(m.x, hy - 40, String(dmg), crit ? '#ffd34d' : '#ffffff', crit ? 40 : 30);
      SFX.hit(a.type !== 'light');
      if (a.multi) { /* 돌진은 여러 명 */ }
    }
    if (any) {
      this.hitstop = Math.max(this.hitstop, a.stop || 60);
      h.shake = 0;
      if (a.shake) this.cameras.main.shake(120, a.shake * 0.0018);
      if (a.otg && h.state === 'atk') { this.fx('dust_land', h.x + f * 120, h.y, { s: 0.5, dur: 420, depth: h.y + 2 }); }
    }
    if (a === HERO_ATK.down && h.st >= a.hit[0] && !h.slamFx) {
      h.slamFx = true;
      this.fx('impact_ring', h.x + f * 120, h.y, { s: 0.5, dur: 380, depth: h.y - 1, flat: true });
      this.fx('dust_land', h.x + f * 120, h.y, { s: 0.45, dur: 420, depth: h.y + 2 });
      SFX.land(); this.cameras.main.shake(140, 0.007);
      this.time.delayedCall(400, () => h.slamFx = false);
    }
  }
  hitProp(p, h) {
    p.hp--;
    SFX.brk();
    this.hitstop = Math.max(this.hitstop, 40);
    this.tweens.add({ targets: p.img, x: p.x + h.face * 6, duration: 40, yoyo: true, repeat: 1 });
    if (p.hp > 0) return;
    this.spawnDebrisAt(p.x, p.y, 5, p.n);
    this.fx('dust_land', p.x, p.y, { s: 0.35, dur: 400, depth: p.y + 1 });
    p.img.destroy(); p.sh.destroy();
    const r = Math.random();
    if (r < 0.4) this.dropPickup(p.x, p.y, 'heal');
    const n = Phaser.Math.Between(3, 6);
    for (let i = 0; i < n; i++) this.dropPickup(p.x, p.y, 'coin');
  }
  dropPickup(x, y, type) {
    const key = type === 'coin' ? 'coin' : 'emote/heart';
    const img = this.add.image(x, y - 50, key).setScale(type === 'coin' ? 1 : 0.32).setDepth(1000 + y);
    const pk = { x: x + Phaser.Math.Between(-70, 70), y: Phaser.Math.Clamp(y + Phaser.Math.Between(-30, 30), FLOOR_TOP, FLOOR_BOT), z: 50, vz: Phaser.Math.Between(300, 500), type, img, t: 0 };
    pk.vx = (pk.x - x) * 1.6; pk.x = x;
    this.pickups.push(pk);
  }
  updatePickups(dt) {
    const s = dt / 1000, h = this.hero;
    for (const p of this.pickups) {
      p.t += dt;
      if (p.z > 0 || p.vz > 0) { p.vz -= 2000 * s; p.z += p.vz * s; p.x += p.vx * s; if (p.z < 0) { p.z = 0; p.vz = Math.abs(p.vz) > 200 ? -p.vz * 0.35 : 0; p.vx *= 0.5; } }
      const bob = p.z > 0 ? 0 : Math.sin(p.t / 200) * 3;
      p.img.setPosition(p.x, p.y - p.z - 14 + bob).setDepth(1000 + p.y);
      if (p.t > 400 && Math.abs(p.x - h.x) < 50 && Math.abs(p.y - h.y) < 30 && h.z < 40 && h.state !== 'dead') {
        p.dead = true; p.img.destroy();
        if (p.type === 'coin') { this.gold += 1; SFX.coin(); }
        else { h.hp = Math.min(h.maxHp, h.hp + 70); SFX.heal(); this.floatText(h.x, h.y - 240, '+70', '#8f8'); h.showEmote('heart', 700); }
      }
      if (p.t > 12000) { p.dead = true; p.img.destroy(); }
    }
    this.pickups = this.pickups.filter(p => !p.dead);
  }
  enemyMelee(m, a) {
    if (m.hitSet.has(this.hero)) return;
    const h = this.hero, rel = (h.x - m.x) * m.face;
    if (rel < a.reach[0] - 10 || rel > a.reach[1] || Math.abs(h.y - m.y) > a.dz || h.z > 120) return;
    m.hitSet.add(h);
    this.resolveHeroHit(m, a.dmg, a.type, m.x, m.y - m.height * 0.5);
  }
  resolveHeroHit(src, dmg, type, sx, sy) {
    const h = this.hero;
    const r = h.takeHit(src, dmg, type, Math.sign(h.x - sx) || -h.face);
    const px = h.x + h.face * 40, py = h.y - h.z - 130;
    if (r === 'parry') {
      SFX.parry(); this.fx('parry_flash', px, py, { s: 0.45, dur: 450, depth: 4300 });
      this.hitstop = 140; this.cameras.main.flash(80, 255, 230, 140);
      this.floatText(h.x, py - 60, '패리!', '#ffd34d', 36);
      if (src.takeHit && src.kind !== 'barkhaul' && !src.dead) { src.state = 'hurt'; src.st = 0; src.stun = 900; src.replay('m_flinch', 20); src.showEmote('dizzy', 900); src.releaseTok && src.releaseTok(); src.vx = -src.face * 150; }
      if (src.kind === 'barkhaul') src.poise -= 25;
    } else if (r === 'guard') {
      SFX.guard(); this.fx('guard_flash', px, py, { s: 0.32, dur: 260, depth: 4300 });
      this.hitstop = 50;
    } else if (r === 'hit') {
      SFX.hit(type === 'heavy');
      this.fx('hit_spark', h.x, h.y - h.z - 120, { s: 0.3, dur: 220, tint: 0xff8080, depth: 4300 });
      this.floatText(h.x, h.y - 250, String(dmg), '#ff6060', 30);
      this.hitstop = type === 'heavy' ? 120 : 70;
      this.cameras.main.shake(type === 'heavy' ? 220 : 110, type === 'heavy' ? 0.01 : 0.005);
      const red = this.add.rectangle(0, 0, W, H, 0xc01010, 0.22).setOrigin(0).setScrollFactor(0).setDepth(4900);
      this.tweens.add({ targets: red, alpha: 0, duration: 220, onComplete: () => red.destroy() });
      this.comboN = 0; this.comboT = Math.min(this.comboT, 300);
      return true;
    }
    return r !== 'miss';
  }
  areaHit(src, x, y, rx, ry, dmg, type) {
    const h = this.hero;
    if (Math.abs(h.x - x) < rx && Math.abs(h.y - y) < ry && h.z < 90) this.resolveHeroHit(src, dmg, type, src.x, src.y);
  }
  rootBurst(src, x, y) {
    if (this.won) return;
    this.fx('impact_ring', x, y, { s: 0.35, dur: 300, depth: y - 1, flat: true, tint: 0x9cff70 });
    this.fx('dust_land', x, y, { s: 0.35, dur: 400, depth: y + 1, tint: 0xb0d080 });
    const img = this.add.image(x, y + 10, 'barkhaul/forearm').setOrigin(0.5, 1).setScale(0.5, 0.1).setDepth(1000 + y).setTint(0xc8a070);
    this.tweens.add({ targets: img, scaleY: 0.55, duration: 120, ease: 'Back.out', yoyo: true, hold: 300, onComplete: () => img.destroy() });
    SFX.brk();
    const h = this.hero;
    if (Math.abs(h.x - x) < 70 && Math.abs(h.y - y) < 32 && h.z < 60) this.resolveHeroHit(src, 26, 'heavy', x - h.face, y);
  }
  lobRock(b, t) {
    const sx = b.x + b.face * 60, sy = b.y, sz = 300;
    const img = this.add.image(sx, sy - sz, 'barkhaul/rock').setScale(0.6).setDepth(4000);
    const sh = this.add.image(sx, sy, 'shadow').setScale(0.6, 0.5).setAlpha(0.4).setDepth(999);
    const dur = 700;
    this.tweens.addCounter({ from: 0, to: 1, duration: dur, onUpdate: tw => {
      const k = tw.getValue();
      const x = Phaser.Math.Linear(sx, t.x, k), y = Phaser.Math.Linear(sy, t.y, k), z = sz * (1 - k) + Math.sin(k * Math.PI) * 260;
      img.setPosition(x, y - z).setAngle(k * 540); sh.setPosition(x, y).setScale(0.3 + k * 0.4, 0.25 + k * 0.3);
    }, onComplete: () => {
      img.destroy(); sh.destroy();
      SFX.smash(); this.cameras.main.shake(180, 0.008);
      this.fx('dust_land', t.x, t.y, { s: 0.55, dur: 500, depth: t.y + 1 });
      this.spawnDebrisAt(t.x, t.y, 4, 'rock');
      this.areaHit(b, t.x, t.y, 100, 38, 30, 'heavy');
    } });
  }
  projectile(src, key, o) {
    const img = this.add.image(src.x + src.face * 60, src.y - o.z, key === 'orb' ? 'orb' : key).setDepth(1000 + src.y + 1);
    if (o.sc) img.setScale(o.sc);
    if (o.rot) img.setAngle(src.face > 0 ? o.rot : -o.rot);
    const sh = this.add.image(img.x, src.y, 'shadow').setScale(0.4, 0.4).setAlpha(0.3).setDepth(999);
    this.projs.push({ src, img, sh, x: img.x, y: src.y, z: o.z, vx: o.vx, vy: 0, dmg: o.dmg, life: o.life, home: o.home, key });
  }
  updateProjs(dt) {
    const s = dt / 1000, h = this.hero;
    for (const p of this.projs) {
      p.life -= dt;
      if (p.home) p.vy = Phaser.Math.Clamp((h.y - p.y) * 1.2, -60, 60);
      p.x += p.vx * s; p.y += p.vy * s;
      p.img.setPosition(p.x, p.y - p.z).setDepth(1000 + p.y + 1);
      if (p.key === 'orb') p.img.setScale(0.9 + Math.sin(p.life / 60) * 0.1);
      p.sh.setPosition(p.x, p.y);
      if (Math.abs(p.x - h.x) < 40 && Math.abs(p.y - h.y) < 24 && h.z < p.z + 40 && h.z + 200 > p.z) {
        const hit = this.resolveHeroHit(p.src, p.dmg, 'light', p.x - Math.sign(p.vx), p.y);
        if (hit) { p.life = 0; if (p.key !== 'orb') this.spawnDebrisAt(p.x, p.y, 1, 'barrel'); }
      }
      if (p.life <= 0) { p.img.destroy(); p.sh.destroy(); p.dead = true; }
    }
    this.projs = this.projs.filter(p => !p.dead);
  }
  // ---------------- 각성기: 태양의 성벽 ----------------
  awakenCutIn() {
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(8000);
    const band = this.add.graphics();
    band.fillStyle(0x000000, 0.75).fillRect(0, 230, W, 230);
    band.fillStyle(0xffb020, 1).fillRect(0, 226, W, 6).fillRect(0, 458, W, 6);
    c.add(band);
    const face = this.add.image(-200, 345, 'warrior/head_attack').setScale(2.6);
    c.add(face);
    const t1 = this.add.text(W + 300, 320, '태양의 성벽', { fontFamily: 'serif', fontSize: 76, color: '#ffe27a', stroke: '#6a2a06', strokeThickness: 10 }).setOrigin(0.5);
    const t2 = this.add.text(W + 300, 395, '각성기', { fontFamily: 'sans-serif', fontSize: 26, color: '#fff' }).setOrigin(0.5);
    c.add(t1); c.add(t2);
    this.tweens.add({ targets: face, x: 300, duration: 220, ease: 'Cubic.out' });
    this.tweens.add({ targets: [t1, t2], x: 820, duration: 260, ease: 'Cubic.out' });
    this.slowmo = 380;
    this.time.delayedCall(560, () => this.tweens.add({ targets: c, alpha: 0, duration: 160, onComplete: () => c.destroy() }));
  }
  shieldWall(h) {
    SFX.wall();
    this.cameras.main.flash(160, 255, 220, 120);
    this.cameras.main.shake(380, 0.014);
    const wx = h.x + h.face * 190;
    const wall = this.add.image(wx, h.y + 10, 'fx/shield_wall').setOrigin(0.5, 0.92).setScale(0.1).setDepth(1000 + h.y + 5).setFlipX(h.face < 0);
    this.tweens.add({ targets: wall, scale: 0.5, duration: 200, ease: 'Back.out' });
    this.tweens.add({ targets: wall, x: wx + h.face * 520, duration: 700, delay: 200, ease: 'Cubic.in' });
    this.tweens.add({ targets: wall, alpha: 0, delay: 650, duration: 300, onComplete: () => wall.destroy() });
    this.fx('impact_ring', wx, h.y, { s: 0.8, dur: 500, depth: h.y - 1, flat: true });
    const a = { dmg: 70, kb: 700, type: 'knock', stop: 120, otg: true };
    for (const m of this.monsters) {
      if (m.dead) continue;
      const rel = (m.x - h.x) * h.face;
      if (rel > -80 && rel < 900) {
        this.time.delayedCall(Math.max(0, rel) * 0.5, () => {
          if (m.dead) return;
          m.invuln = 0;
          const dmg = m.kind === 'barkhaul' ? 140 : 70;
          if (m.takeHit(h, { ...a, otg: true }, dmg)) {
            this.floatText(m.x, m.y - m.height, String(dmg), '#ffd34d', 42); this.addCombo();
            this.fx('hit_spark', m.x, m.y - m.height * 0.5, { s: 0.45, dur: 260, depth: 4200 });
            if (m.kind === 'barkhaul') m.poise -= 40;
          }
        });
      }
    }
    for (const p of this.props) if (p.hp > 0 && (p.x - h.x) * h.face > -50 && (p.x - h.x) * h.face < 900) { p.hp = 1; this.hitProp(p, h); }
  }
  // ---------------- 보스 ----------------
  bossIntro() {
    this.time.delayedCall(700, () => {
      const c = this.add.container(0, 0).setScrollFactor(0).setDepth(7500);
      const g = this.add.graphics(); g.fillStyle(0x000000, 0.7).fillRect(0, 150, W, 120); g.fillStyle(0x9a2fd0).fillRect(0, 148, W, 4);
      c.add(g);
      c.add(this.add.text(120, 178, '1장 보스', { fontFamily: 'sans-serif', fontSize: 22, color: '#d8b8ff' }));
      c.add(this.add.text(120, 206, '이끼거인 바크하울', { fontFamily: 'serif', fontSize: 48, color: '#f6ffd8', stroke: '#1d2a08', strokeThickness: 8 }));
      c.setAlpha(0); c.x = -200;
      this.tweens.add({ targets: c, alpha: 1, x: 0, duration: 300, hold: 1800, yoyo: true, onComplete: () => { c.destroy(); this.bossBar = true; } });
      SFX.roar();
      this.cameras.main.shake(500, 0.006);
    });
  }
  bossRage(b) {
    this.floatText(b.x, b.y - b.height - 40, '분노!', '#ff5a3a', 40);
    b.rig.setTintAll(0xffc8b0); b.rageTint = true;
    this.cameras.main.flash(200, 200, 40, 20);
  }
  summonGrunts(n) {
    for (let i = 0; i < n; i++) this.time.delayedCall(i * 300, () => { if (!this.won) this.spawn('grunt', i % 2 ? 1 : -1); });
  }
  bossDefeated(b) {
    this.won = true;
    this.slowmo = 1400;
    this.cameras.main.flash(300, 255, 255, 255);
    this.cameras.main.shake(800, 0.012);
    SFX.roar();
    for (const m of this.monsters) if (m !== b && !m.dead) { m.hp = 0; m.takeHit(this.hero, { dmg: 999, type: 'knock', kb: 300, otg: true }, 999); }
    this.time.delayedCall(1700, () => {
      b.die();
      this.hero.state = 'win'; this.hero.play('w_win', 120); this.hero.setHead('head_victory'); this.hero.vx = this.hero.vy = 0;
      SFX.win();
      this.time.delayedCall(900, () => this.result(true));
    });
  }
  onMonsterDead(m) {
    if (m.kind === 'barkhaul') { for (let i = 0; i < 25; i++) this.dropPickup(m.x, m.y, 'coin'); return; }
    const [a, b] = m.def.gold;
    const n = Phaser.Math.Between(a, b);
    for (let i = 0; i < Math.ceil(n / 2); i++) this.dropPickup(m.x, m.y, 'coin');
    if (Math.random() < 0.12) this.dropPickup(m.x, m.y, 'heal');
    // 동료가 쓰러지면 남은 그롤린이 움찔한다
    for (const o of this.monsters) if (!o.dead && o !== m && o.kind !== 'barkhaul' && (o.state === 'idle' || o.state === 'move') && Math.random() < 0.5) {
      o.showEmote(Math.random() < 0.5 ? 'sweat' : 'shock', 800);
      o.state = 'hurt'; o.st = 0; o.stun = 300; o.replay('m_flinch', 40); o.setHead(o.def.face + '_hurt');
    }
  }
  heroDied() {
    if (this.lost) return;
    this.lost = true; SFX.lose();
    this.time.delayedCall(1300, () => this.result(false));
  }
  result(win) {
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(9000);
    c.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0));
    const sec = Math.round(this.now / 1000);
    c.add(this.add.text(W / 2, 200, win ? '스테이지 클리어!' : '쓰러졌다…', { fontFamily: 'serif', fontSize: 76, color: win ? '#ffe27a' : '#ff9a8a', stroke: '#2a1206', strokeThickness: 10 }).setOrigin(0.5));
    c.add(this.add.text(W / 2, 320, `시간 ${Math.floor(sec / 60)}분 ${sec % 60}초   ·   최대 콤보 ${this.maxCombo}   ·   금화 ${this.gold}`, { fontFamily: 'sans-serif', fontSize: 28, color: '#fff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5));
    const b = this.add.text(W / 2, 450, '다시 하기 (Enter · 터치)', { fontFamily: 'sans-serif', fontSize: 34, color: '#1a0f08', backgroundColor: '#ffd34d', padding: { x: 24, y: 12 } }).setOrigin(0.5).setInteractive();
    c.add(b);
    const again = () => this.scene.restart();
    b.on('pointerdown', again);
    this.keys.ENTER.once('down', again);
  }
  // ---------------- 갱신 ----------------
  update(time, rawDt) {
    if (this.paused) return;
    let dt = Math.min(rawDt, 40);
    this.dtv = dt;
    if (this.slowmo > 0) { this.slowmo -= dt; dt *= 0.3; }
    this.now += dt;
    const inp = this.readInput();
    const frozen = this.hitstop > 0;
    if (frozen) {
      this.hitstop -= rawDt;
      // 맞은 쪽만 흔들리고 나머지는 멈춘다
      for (const m of this.monsters) if (!m.dead || m.state === 'dying') m.draw(dt, true);
      this.hero.draw(dt, true);
      if (inp.atkP) this.hero.buffer = 260;
      this.drawHud();
      return;
    }
    this.hero.update(dt, inp);
    for (const m of this.monsters) if (!m.dead || m.state === 'dying') { if (!m.dead) m.update(dt); }
    this.hero.draw(dt, false);
    for (const m of this.monsters) if (!m.dead) m.draw(dt, false);
    this.monsters = this.monsters.filter(m => !m.dead);
    for (const m of this.monsters) if (m.shake > 0) m.shake -= dt;
    if (this.boss && this.boss.rageTint && !this.boss.dead && this.boss.flashT <= 0) this.boss.rig.setTintAll(Math.floor(this.now / 200) % 2 ? 0xffb8a0 : 0xffd8c8);
    this.updateProjs(dt);
    this.updatePickups(dt);
    this.checkWave();
    // 카메라
    const cam = this.cameras.main;
    let target = this.hero.x - W * 0.42;
    if (this.lock) target = Phaser.Math.Clamp(target, this.lock.l, this.lock.r - W);
    cam.scrollX = Phaser.Math.Linear(cam.scrollX, Phaser.Math.Clamp(target, 0, STAGE_W - W), 0.12);
    if (!this.lock) this.bounds = { l: cam.scrollX, r: Math.max(cam.scrollX + W, this.hero.x + 40) };
    else this.bounds = { l: Math.max(this.lock.l, cam.scrollX), r: Math.min(this.lock.r, cam.scrollX + W) };
    this.drawHud();
  }
}

window.game = new Phaser.Game({
  type: Phaser.AUTO, width: W, height: H, backgroundColor: '#140c18', parent: 'game',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Boot, Title, Game],
  input: { activePointers: 4 },
  render: { antialias: true },
});

// 테스트용: 숨은 창에서도 프레임을 직접 진행한다
window.step = async (n = 1, dt = 16.6) => { window._t = Math.max(window._t || 0, performance.now()); for (let i = 0; i < n; i++) { window._t += dt; game.step(window._t, dt); if (i % 20 === 19) await new Promise(r => setTimeout(r, 0)); } };
