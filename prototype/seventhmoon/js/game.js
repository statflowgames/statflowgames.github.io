// 일곱 번째 달 — 스테이지 전투 (데이터: js/data/campaign.js 의 STAGES)
const W = 1280, H = 720;
const Q = new URLSearchParams(location.search);
let STAGE_W = 6600;

// 구현된 스킬 (나머지는 '효과 준비 중'으로 보인다)
const SKILL_IMPL = {
  warrior: { '도발의 외침': 1, '대지 가르기': 1, '전투 함성': 1, '강철 피부': 1, '약점 포착': 1, '백전노장': 1, '철벽의 달인': 1, '불굴': 1, '최후의 보루': 1 },
};
const SKILL_CD = { '도발의 외침': 12000, '대지 가르기': 8000, '전투 함성': 20000 };

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
    // 테스트 진입: ?stage=c2_s1 / ?scene=map|camp / ?play
    const st = Q.get('stage') || (Q.has('play') ? 'c1_s1' : null);
    if (st || Q.get('scene')) {
      if (!Save.load()) Save.fresh('warrior');
      if (Q.get('lv')) { Save.data.lv = +Q.get('lv'); Save.data.sp = Save.data.lv - 1; }
      if (Q.get('ch')) Save.data.ch = +Q.get('ch');
    }
    if (st) { const ch = +(st.match(/^c(\d)/) || [0, 6])[1]; this.scene.start('game', { stage: st, ch, node: st.split('_')[1] }); return; }
    this.scene.start(Q.get('scene') || 'title');
  }
}

// ---------------------------------------------------------------------------
class Game extends Phaser.Scene {
  constructor() { super('game'); }
  init(d) { this.cfg = d && d.stage ? d : { stage: 'c1_s1', ch: 1, node: 's1' }; }
  create() {
    const s = Save.data || Save.load() || Save.fresh('warrior');
    this.save = s;
    this.stats = heroStats(s);
    this.def = STAGES[this.cfg.stage] || STAGES.c1_s1;
    this.ch = this.cfg.ch;
    this.theme = THEMES[this.def.theme] || THEMES.forest;
    this.monScale = chapterScale(this.ch, Q.has('hard') ? 2 : 1);
    this.now = 0; this.hitstop = 0; this.won = false; this.lost = false; this.paused = false;
    this.god = Q.has('god');
    this.gold = 0; this.expGain = 0; this.loot = []; this.dmgTaken = 0;
    this.comboN = 0; this.comboT = 0; this.maxCombo = 0;
    this.monsters = []; this.props = []; this.projs = []; this.pickups = []; this.tokens = new Set(); this.zones = [];
    this.buffs = {}; this.cds = [0, 0]; this.featherUsed = false; this.unyielding = false;
    this.boss = null; this.bossBar = null; this.bossName = null;
    this.spawning = false; this.quake = false; this.slowmo = 0; this.hpShow = undefined; this.bossShow = undefined; this.pauseUi = null;
    this.bounds = { l: 0, r: W };
    this.waves = this.makeWaves();
    this.cameras.main.setBounds(0, 0, STAGE_W, H);
    this.buildStage();
    this.hero = new Hero(this, 260, 600);
    this.isTouch = Q.has('touch') || this.sys.game.device.input.touch;
    this.buildHud();
    this.buildInput();
    this.waveIdx = 0; this.lock = null;
    const skip = +Q.get('wave') || 0;
    if (skip) { this.waveIdx = skip; this.hero.x = this.waves[skip - 1].end - 300; }
    this.cameras.main.scrollX = Phaser.Math.Clamp(this.hero.x - W * 0.4, 0, STAGE_W - W);
    this.cameras.main.fadeIn(400);
    this.banner(`${this.ch}장  ${this.def.name}`, '#ffe7a8');
    SFX.ambience(this.theme.amb);
    SFX.music(this.theme.bgm);
    SFX.heartbeat(false);
  }
  // ---------------- 무대 ----------------
  tex(key, fb) { return this.textures.exists(key) ? key : fb; }
  buildStage() {
    const far = this.tex(this.theme.far, 'bg/far'), ground = this.tex(this.theme.ground, 'bg/ground');
    const tint = this.theme.tint;
    const fs = 0.74, fw = 1536 * fs;
    for (let i = 0; i * fw * 0.35 < STAGE_W * 0.35 + W; i++) {
      const im = this.add.image(i * fw, -40, far).setOrigin(0, 0).setScale(fs).setFlipX(i % 2 === 1).setScrollFactor(0.35, 1).setDepth(0);
      if (this.theme.standin) im.setTint(tint);
    }
    const gt = this.add.tileSprite(0, 448, STAGE_W, H - 448, ground).setOrigin(0).setDepth(10);
    gt.tileScaleX = 0.62; gt.tileScaleY = 0.62; gt.tilePositionY = 30;
    if (this.theme.standin) gt.setTint(tint);
    const edge = this.add.graphics().setDepth(11);
    edge.fillGradientStyle(0x1a1a10, 0x1a1a10, 0x1a1a10, 0x1a1a10, 0.5, 0.5, 0, 0).fillRect(0, 448, STAGE_W, 34);
    const back = [['oak', 0.95], ['bush', 0.7], ['lantern', 0.65], ['rock', 0.6], ['sign', 0.7], ['log', 0.6], ['bush', 0.8], ['oak', 1.05], ['wagon', 0.7], ['bush', 0.7]];
    let x = 120, k = Math.floor(Math.random() * back.length);
    while (x < STAGE_W) {
      const [n, sc] = back[k++ % back.length];
      if (this.def.theme === 'forest' || n !== 'oak') this.add.image(x, 470, 'props/' + n).setOrigin(0.5, 1).setScale(sc).setDepth(12 + (n === 'oak' ? 0 : 1)).setTint(tint);
      x += 260 + Math.random() * 260;
    }
    for (let fx = 200; fx < STAGE_W * 1.25; fx += 420 + Math.random() * 500) {
      const n = Math.random() < 0.6 ? 'grass' : 'bush';
      this.add.image(fx, H + 30, 'props/' + n).setOrigin(0.5, 1).setScale(n === 'grass' ? 1.4 : 1.1).setScrollFactor(1.25, 1).setDepth(4500).setAlpha(0.95).setTint(tint);
    }
    // 부서지는 물체: 잠금 전투 사이 길목에 2~3개씩
    let px = 600;
    for (const w of this.waves) {
      const n = 2 + (Math.random() < 0.5 ? 1 : 0);
      for (let i = 0; i < n; i++) this.addProp(Phaser.Math.Between(px, w.at - 80), Phaser.Math.Between(FLOOR_TOP + 30, FLOOR_BOT - 30), Math.random() < 0.5 ? 'barrel' : 'crate');
      px = w.r + 100;
    }
    if (this.def.treasure) this.addProp(STAGE_W - 260, 580, 'crate', true);
  }
  addProp(x, y, n, chest) {
    const img = this.add.image(x, y + 6, 'props/' + n).setOrigin(0.5, 1).setScale(chest ? 1.1 : n === 'barrel' ? 0.85 : 0.8).setDepth(1000 + y).setTint(chest ? 0xffd890 : this.theme.tint);
    const sh = this.add.image(x, y + 2, 'shadow').setScale(0.7, 0.6).setAlpha(0.45).setDepth(999);
    this.props.push({ x, y, n, img, sh, hp: chest ? 3 : n === 'crate' ? 2 : 1, chest });
  }
  makeWaves() {
    const out = [];
    let at = 900;
    this.def.waves.forEach((gs, i) => {
      const boss = !!this.def.boss && i === this.def.waves.length - 1;
      const groups = gs.map(g => {
        const list = [];
        for (const tok of g.split(',')) { const [k, n] = tok.trim().split('*'); for (let j = 0; j < (+n || 1); j++) list.push(k); }
        return list.map((k, j) => [k, j % 2 ? -1 : 1]);
      });
      const l = at - 380, r = l + 1280;
      out.push({ at, l, r, groups, boss, end: r });
      at = r + 520;
    });
    STAGE_W = out[out.length - 1].r + (this.def.boss ? 0 : 420);
    return out;
  }
  spawn(kind, side) {
    const def = MONDEF[kind] || MONDEF.grunt;
    const x = side > 0 ? this.bounds.r + 120 : this.bounds.l - 120;
    const y = def.boss ? 590 : Phaser.Math.Between(FLOOR_TOP + 20, FLOOR_BOT - 20);
    const m = new Monster(this, kind, x, y);
    this.monsters.push(m);
    return m;
  }
  startWave(w) {
    this.lock = w; this.groupIdx = 0;
    this.bounds = { l: w.l, r: w.r };
    this.spawnGroup();
    if (w.boss) this.bossIntro(w.groups[0][0][0]);
  }
  spawnGroup() {
    const g = this.lock.groups[this.groupIdx++];
    g.forEach(([k, s], i) => this.time.delayedCall(i * 350, () => { const m = this.spawn(k, s); if (m.def.boss) { this.boss = m; m.cool = 3200; } }));
  }
  checkWave() {
    if (this.won || this.lost) return;
    if (this.lock) {
      const alive = this.monsters.filter(m => !m.dead).length;
      const pending = this.lock.groups.length > this.groupIdx;
      if (pending && alive <= 1 && !this.spawning) { this.spawning = true; this.time.delayedCall(500, () => { this.spawnGroup(); this.spawning = false; }); }
      if (!pending && alive === 0 && !this.spawning && !this.lock.boss) {
        this.lock = null; this.bounds = { l: 0, r: STAGE_W };
        if (this.waveIdx >= this.waves.length) this.stageClear(); else this.showGo();
      }
      return;
    }
    const w = this.waves[this.waveIdx];
    if (w && this.hero.x > w.at) { this.waveIdx++; this.startWave(w); }
  }
  stageClear() {
    if (this.won) return;
    this.won = true;
    this.banner('STAGE CLEAR', '#ffe27a');
    this.hero.state = 'win'; this.hero.play('w_win', 120); this.hero.setHead('head_victory'); this.hero.vx = this.hero.vy = 0;
    SFX.win(); SFX.heroWin(); SFX.heartbeat(false);
    this.time.delayedCall(1800, () => this.result(true));
  }
  // ---------------- 입력 ----------------
  buildInput() {
    const kb = this.input.keyboard;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,J,K,L,I,O,U,H,Z,X,C,V,SHIFT,SPACE,P,ESC,R,ENTER,ONE,TWO,THREE,FOUR');
    this.touch = { x: 0, y: 0, atk: false, jump: false, roll: false, guard: false, awk: false, sk1: false, sk2: false, item: 0 };
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
    // 스킬 버튼 2개
    const s = this.save;
    [[850, 400, 'sk1'], [1180, 300, 'sk2']].forEach(([x, y, n], k) => {
      const idx = s.active[k];
      if (idx === null || idx === undefined) return;
      const b = btn('skill_frame', x, y, 0.45, n); this.btns.push(b);
      const ic = UI.img(this, x, y, `icon/skill_${s.hero}_${idx}`); if (ic) ic.setScrollFactor(0).setDepth(6001).setScale(56 / ic.height);
    });
    this.input.on('pointerdown', p => this.onPointer(p));
    this.input.on('pointermove', p => this.onPointer(p));
    this.input.on('pointerup', p => this.onPointerUp(p));
  }
  onPointer(p) {
    if (!p.isDown) return;
    SFX.resume();
    // 아이템 벨트 (화면 위 가운데)
    if (p.y < 110 && this.beltUi) {
      for (const b of this.beltUi) if (Math.abs(p.x - b.x) < 36 && Math.abs(p.y - b.y) < 36 && !p.btn) { this.touch.item = b.n; p.btn = b; }
      return;
    }
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
    if (s && s.id === p.id) { s.id = null; s.knob.setPosition(s.cx, s.cy); this.touch.x = 0; this.touch.y = 0; }
    if (p.btn) { if (p.btn.name2 === 'guard') this.touch.guard = false; p.btn = null; }
  }
  readInput() {
    const k = this.keys, t = this.touch;
    const L = k.A.isDown || k.LEFT.isDown, R = k.D.isDown || k.RIGHT.isDown, U = k.W.isDown || k.UP.isDown, Dn = k.S.isDown || k.DOWN.isDown;
    const ti = window.TI || {};
    const cur = {
      atk: !!ti.atk || k.J.isDown || k.Z.isDown || t.atk, jump: !!ti.jump || k.K.isDown || k.X.isDown || t.jump, roll: !!ti.roll || k.L.isDown || k.C.isDown || t.roll,
      awk: !!ti.awk || k.O.isDown || k.V.isDown || t.awk, sk1: !!ti.sk1 || k.U.isDown || t.sk1, sk2: !!ti.sk2 || k.H.isDown || t.sk2,
      i1: k.ONE.isDown, i2: k.TWO.isDown, i3: k.THREE.isDown, i4: k.FOUR.isDown,
    };
    const inp = {
      x: ti.x || (R ? 1 : 0) - (L ? 1 : 0) || t.x, y: ti.y || (Dn ? 1 : 0) - (U ? 1 : 0) || t.y,
      guard: !!ti.guard || k.I.isDown || k.SHIFT.isDown || k.SPACE.isDown || t.guard,
    };
    for (const n of ['atk', 'jump', 'roll', 'awk', 'sk1', 'sk2']) inp[n + 'P'] = cur[n] && !this.prev[n];
    inp.itemN = t.item || ti.item || [1, 2, 3, 4].find(i => cur['i' + i] && !this.prev['i' + i]) || 0;
    this.prev = cur;
    t.atk = t.jump = t.roll = t.awk = t.sk1 = t.sk2 = false; t.item = 0;
    if (ti.item) ti.item = 0;
    return inp;
  }
  togglePause() {
    if (this.won || this.lost) return;
    this.paused = !this.paused;
    if (this.paused) {
      const c = this.add.container(0, 0).setScrollFactor(0).setDepth(9000);
      c.add(this.add.rectangle(0, 0, W, H, 0, 0.6).setOrigin(0).setInteractive());
      c.add(UI.text(this, W / 2, 200, '일시 정지', 54, '#ffe7a8', { serif: true }).setOrigin(0.5));
      c.add(UI.button(this, W / 2, 330, '계속하기', () => this.togglePause(), { w: 320 }));
      c.add(UI.button(this, W / 2, 410, '처음부터 다시', () => this.scene.restart(this.cfg), { w: 320, col: 0x4a2a14 }));
      c.add(UI.button(this, W / 2, 490, '지도로 나가기', () => { SFX.heartbeat(false); this.scene.start('map'); }, { w: 320, col: 0x3a2a1a }));
      c.add(UI.text(this, W / 2, 560, '스테이지 도중에 나가면 그 스테이지를 처음부터 다시 해요', 18, '#c8b8a0').setOrigin(0.5));
      c.each(o => o.setScrollFactor && o.setScrollFactor(0));
      this.pauseUi = c;
    } else if (this.pauseUi) this.pauseUi.destroy();
  }
  // ---------------- HUD ----------------
  buildHud() {
    const s = this.save;
    const d = 5000, hud = this.add.container(0, 0).setScrollFactor(0).setDepth(d);
    const panel = this.add.graphics();
    panel.fillStyle(0x1a0f08, 0.78).fillRoundedRect(16, 14, 430, 112, 14).lineStyle(3, 0xc99a3c).strokeRoundedRect(16, 14, 430, 112, 14);
    panel.fillStyle(0x3a2412).fillCircle(72, 70, 46).lineStyle(4, 0xe0b45a).strokeCircle(72, 70, 46);
    hud.add(panel);
    hud.add(this.add.image(74, 74, 'warrior/head').setScale(0.95));
    hud.add(this.add.text(132, 22, DB.heroes[s.hero].name, { fontFamily: 'sans-serif', fontSize: 22, color: '#ffe7a8', fontStyle: 'bold' }));
    hud.add(this.add.text(220, 26, `${DB.heroes[s.hero].ko.split(' ')[0]} Lv.${s.lv}`, { fontFamily: 'sans-serif', fontSize: 15, color: '#c8b08a' }));
    this.bars = this.add.graphics(); hud.add(this.bars);
    this.goldText = this.add.text(W - 24, 22, '0', { fontFamily: 'sans-serif', fontSize: 26, color: '#ffd34d', stroke: '#3a1606', strokeThickness: 5 }).setOrigin(1, 0);
    hud.add(this.add.image(W - 24 - 70, 37, 'coin').setScale(1.1)); hud.add(this.goldText);
    this.comboText = this.add.text(W - 30, 120, '', { fontFamily: 'sans-serif', fontSize: 54, color: '#fff2c0', stroke: '#7a2a06', strokeThickness: 8, fontStyle: 'bold italic' }).setOrigin(1, 0.5).setAlpha(0);
    this.comboSub = this.add.text(W - 34, 160, 'HIT', { fontFamily: 'sans-serif', fontSize: 22, color: '#ffd34d', stroke: '#3a1606', strokeThickness: 5 }).setOrigin(1, 0.5).setAlpha(0);
    hud.add(this.comboText); hud.add(this.comboSub);
    this.awkHint = this.add.text(132, 100, '', { fontFamily: 'sans-serif', fontSize: 15, color: '#ffe27a', stroke: '#000', strokeThickness: 4 });
    hud.add(this.awkHint);
    // 아이템 벨트
    this.beltUi = [];
    BELT_ORDER.forEach((k, i) => {
      const x = 520 + i * 78, y = 52;
      const g = this.add.graphics();
      g.fillStyle(0x1a0f08, 0.8).fillRoundedRect(x - 32, y - 32, 64, 64, 10).lineStyle(2, 0xc99a3c).strokeRoundedRect(x - 32, y - 32, 64, 64, 10);
      hud.add(g);
      const ic = UI.img(this, x, y, 'icon/' + BELT[k].icon) || UI.img(this, x, y, 'icon/' + k);
      if (ic) { ic.setScale(52 / ic.height); hud.add(ic); }
      const n = this.add.text(x + 28, y + 28, '', { fontFamily: 'sans-serif', fontSize: 18, color: '#fff', stroke: '#000', strokeThickness: 4, fontStyle: 'bold' }).setOrigin(1, 1);
      hud.add(n);
      if (!this.isTouch) hud.add(this.add.text(x - 28, y - 30, String(i + 1), { fontFamily: 'sans-serif', fontSize: 14, color: '#ffd34d', stroke: '#000', strokeThickness: 3 }));
      this.beltUi.push({ x, y, n: i + 1, k, t: n, ic });
    });
    // 스킬 칸 (키보드)
    this.skillUi = [];
    if (!this.isTouch) [0, 1].forEach(k => {
      const idx = s.active[k];
      if (idx === null || idx === undefined) return;
      const x = 860 + k * 78, y = 52;
      const g = this.add.graphics(); hud.add(g);
      const ic = UI.img(this, x, y, `icon/skill_${s.hero}_${idx}`); if (ic) { ic.setScale(56 / ic.height); hud.add(ic); }
      hud.add(this.add.text(x - 28, y - 30, k === 0 ? 'U' : 'H', { fontFamily: 'sans-serif', fontSize: 14, color: '#9ae0ff', stroke: '#000', strokeThickness: 3 }));
      this.skillUi.push({ g, x, y, k });
    });
    if (!this.isTouch) hud.add(this.add.text(W / 2, H - 14, '이동 WASD · 공격 J · 점프 K · 구르기 L · 가드 I · 각성 O · 스킬 U H · 아이템 1~4 · 일시정지 P', { fontFamily: 'sans-serif', fontSize: 15, color: '#f3e6cc', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5, 1).setAlpha(0.8));
    this.hud = hud;
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
    // 버프 표시
    const bt = Object.entries(this.buffs).filter(([, v]) => v > 0).map(([k]) => ({ shout: '함성', taunt: '도발' }[k])).join(' ');
    if (bt) this.awkHint.setText((full ? '각성 준비! (O)  ' : '') + bt);
    for (const b of this.beltUi) { const n = this.save.belt[b.k] || 0; b.t.setText(String(n)); if (b.ic) b.ic.setAlpha(n ? 1 : 0.3); }
    for (const sk of this.skillUi) {
      sk.g.clear();
      const cd = this.cds[sk.k], max = SKILL_CD[DB.skills[this.save.hero].list[this.save.active[sk.k]].name] || 1;
      sk.g.fillStyle(0x1a0f08, 0.8).fillRoundedRect(sk.x - 32, sk.y - 32, 64, 64, 10).lineStyle(2, cd > 0 ? 0x5a4a38 : 0x7ad0ff).strokeRoundedRect(sk.x - 32, sk.y - 32, 64, 64, 10);
      if (cd > 0) sk.g.fillStyle(0x000000, 0.6).fillRect(sk.x - 30, sk.y - 30, 60, 60 * cd / max);
    }
    if (this.boss && this.bossBar) {
      const b = this.boss;
      this.bossShow = Phaser.Math.Linear(this.bossShow ?? b.hp, Math.max(0, b.hp), 0.06);
      const x = 290, y = 636, w = 700;
      g.fillStyle(0x000000, 0.65).fillRoundedRect(x - 6, y - 6, w + 12, 30, 6);
      g.fillStyle(0xffe0a0).fillRect(x, y, w * this.bossShow / b.maxHp, 18);
      g.fillStyle(b.raged ? 0xff3a20 : 0x9a2fd0).fillRect(x, y, w * Math.max(0, b.hp) / b.maxHp, 18);
      g.fillStyle(0xffd34d).fillRect(x, y + 20, w * Math.max(0, b.poise) / 100, 4);
      if (!this.bossName) this.bossName = this.add.text(x, y - 8, b.def.ko, { fontFamily: 'serif', fontSize: 22, color: '#f6ffd8', stroke: '#1d2a08', strokeThickness: 5 }).setOrigin(0, 1).setScrollFactor(0).setDepth(5001);
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
    if (this.comboN % 10 === 0) SFX.combo(this.comboN);
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
    if (!this.textures.exists('fx/' + key)) return this.add.image(x, y, 'px').setVisible(false);
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
    SFX.telegraph(x - this.cameras.main.scrollX);
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
  heroDamage(base, m, crit) {
    const st = this.stats, h = this.hero;
    let k = st.dmgMul * (crit ? 1 + st.critDmg / 100 : 1);
    if (m.state === 'down' || m.state === 'hurt' && m.stun > 500) k *= 1 + st.vsDown / 100;
    if (m.z > 0) k *= 1 + st.vsAir / 100;
    if (m.def.boss) k *= 1 + st.vsBoss / 100;
    if (this.comboN >= 10) k *= 1 + st.vsCombo / 100;
    if (this.buffs.shout > 0) k *= 1.2;
    if (this.hasSkill('최후의 보루') && h.hp < h.maxHp * 0.3) k *= 1.3;
    return Math.max(1, Math.round(base * k));
  }
  meleeHit(h, a) {
    const f = h.face;
    let any = false;
    const targets = [...this.monsters.filter(m => !m.dead), ...this.props.filter(p => p.hp > 0)];
    for (const m of targets) {
      if (h.hitSet.has(m)) continue;
      const rel = (m.x - h.x) * f;
      const big = m.kind === 'barkhaul';
      const reachMul = big ? 1.35 : 1;
      if (rel < a.reach[0] - 20 || rel > a.reach[1] * reachMul) continue;
      if (Math.abs(m.y - h.y) > (a.dz + (big ? 20 : 0))) continue;
      if (m.img) { h.hitSet.add(m); this.hitProp(m, h); any = true; continue; }
      if ((m.z || 0) > (a.zr || 170) + h.z) continue;
      if (m.state === 'down' && !a.otg) continue;
      const crit = Math.random() * 100 < this.stats.crit || (a.fin && this.comboN > 0 && this.comboN % 10 === 9);
      const dmg = this.heroDamage(a.dmg * (0.9 + Math.random() * 0.2) * (m.state === 'down' ? 1.4 : 1), m, crit);
      if (!m.takeHit(h, a, dmg)) continue;
      h.hitSet.add(m); any = true;
      this.addCombo();
      h.awk = Math.min(100, h.awk + 3 * (1 + this.stats.awkPct / 100));
      const hx = m.x - f * 20, hy = m.y - m.z - m.height * (big ? 0.45 : 0.55);
      this.fx('hit_spark', hx, hy, { s: crit ? 0.42 : 0.3, rot: Phaser.Math.Between(0, 360), dur: 220, depth: 4200 });
      if (crit) { this.fx('crit_flash', hx, hy, { s: 0.45, dur: 380, depth: 4201 }); SFX.crit(hx - this.cameras.main.scrollX); }
      if (a.type !== 'light') this.fx('impact_ring', hx, hy, { s: 0.35, dur: 300, depth: 4199 });
      this.floatText(m.x, hy - 40, String(dmg), crit ? '#ffd34d' : '#ffffff', crit ? 40 : 30);
      const hpx = m.x - this.cameras.main.scrollX;
      if (a.swing === 's' || this.hero.atkName === 'dash' || h.state === 'parry') SFX.bash(hpx);
      if (a.type === 'launch' && !big) SFX.launch(hpx);
      SFX.hit(a.type !== 'light', hpx, a.swing === 's' || this.hero.atkName === 'dash' ? 'blunt' : 'blade');
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
      if (this.quake) { this.quake = false; this.shockwave(h); }
      this.time.delayedCall(400, () => h.slamFx = false);
    }
  }
  hitProp(p, h) {
    p.hp--;
    SFX.brk(p.x - this.cameras.main.scrollX, 'wood');
    this.hitstop = Math.max(this.hitstop, 40);
    this.tweens.add({ targets: p.img, x: p.x + h.face * 6, duration: 40, yoyo: true, repeat: 1 });
    if (p.hp > 0) return;
    this.spawnDebrisAt(p.x, p.y, 5, p.n);
    this.fx('dust_land', p.x, p.y, { s: 0.35, dur: 400, depth: p.y + 1 });
    p.img.destroy(); p.sh.destroy();
    if (p.chest) {
      SFX.ui('chest_open');
      for (let i = 0; i < 12; i++) this.dropPickup(p.x, p.y, 'coin');
      this.dropPickup(p.x, p.y, 'loot', { rar: 2 });
      this.dropPickup(p.x, p.y, 'loot');
      return;
    }
    const r = Math.random();
    if (r < 0.35) this.dropPickup(p.x, p.y, 'heal');
    else if (r < 0.42) this.dropPickup(p.x, p.y, 'loot');
    const n = Phaser.Math.Between(3, 6);
    for (let i = 0; i < n; i++) this.dropPickup(p.x, p.y, 'coin');
  }
  dropPickup(x, y, type, o = {}) {
    let img;
    if (type === 'coin') img = this.add.image(x, y - 50, 'coin');
    else if (type === 'heal') img = this.add.image(x, y - 50, 'emote/heart').setScale(0.32);
    else {
      // 장비: 미리 뽑아 둔다(희귀도 색으로 빛난다)
      const it = rollDrop(this.save, this.ch, (o.rar || 0) + (Q.has('hard') ? 2 : 0), !!o.boss);
      this.save.bag = this.save.bag.filter(b => b !== it);
      o.item = it;
      img = this.add.container(x, y - 50);
      const glow = this.add.circle(0, 0, 26, RARITY[it.rar].hex, 0.35).setBlendMode(Phaser.BlendModes.ADD);
      const ic = UI.img(this, 0, 0, UI.itemIcon(it)); if (ic) ic.setScale(46 / ic.height);
      img.add(glow); if (ic) img.add(ic);
      this.tweens.add({ targets: glow, scale: 1.3, alpha: 0.15, yoyo: true, repeat: -1, duration: 500 });
    }
    img.setDepth(1000 + y);
    const pk = { x: x + Phaser.Math.Between(-70, 70), y: Phaser.Math.Clamp(y + Phaser.Math.Between(-30, 30), FLOOR_TOP, FLOOR_BOT), z: 50, vz: Phaser.Math.Between(300, 500), type, img, t: 0, item: o.item };
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
      const reach = p.type === 'loot' ? 70 : 50;
      if (p.t > 400 && Math.abs(p.x - h.x) < reach && Math.abs(p.y - h.y) < 34 && h.z < 40 && h.state !== 'dead') {
        p.dead = true; p.img.destroy();
        if (p.type === 'coin') { this.gold += Math.max(1, Math.round(3 * (1 + this.stats.goldPct / 100) * (1 + (this.ch - 1) * 0.35))); SFX.coin(p.x - this.cameras.main.scrollX); }
        else if (p.type === 'heal') { const v = Math.round(h.maxHp * 0.18 * (1 + this.stats.healPct / 100)); h.hp = Math.min(h.maxHp, h.hp + v); SFX.heal(); this.floatText(h.x, h.y - 240, '+' + v, '#8f8'); h.showEmote('heart', 700); }
        else {
          this.loot.push(p.item);
          SFX.ui(p.item.rar >= 4 ? 'equip_jewel' : 'equip_weapon');
          if (p.item.rar >= 4) SFX.jingle('jgl_legendary');
          this.floatText(h.x, h.y - 250, p.item.name, RARITY[p.item.rar].col, 26);
        }
      }
      if (p.t > 15000 && p.type !== 'loot') { p.dead = true; p.img.destroy(); }
    }
    this.pickups = this.pickups.filter(p => !p.dead);
  }
  enemyMelee(m, a) {
    if (m.hitSet.has(this.hero)) return;
    const h = this.hero, rel = (h.x - m.x) * m.face;
    if (rel < a.reach[0] - 10 || rel > a.reach[1] || Math.abs(h.y - m.y) > a.dz || h.z > 120) return;
    m.hitSet.add(h);
    if (this.resolveHeroHit(m, a.dmg, a.type, m.x, m.y - m.height * 0.5) && m.def.drainAwk) { h.awk = Math.max(0, h.awk - 25); this.floatText(h.x, h.y - 200, '각성 흡수!', '#c8a0ff', 24); }
  }
  resolveHeroHit(src, dmg, type, sx, sy) {
    const h = this.hero, st = this.stats;
    let k = 1 - st.red;
    if (this.buffs.taunt > 0) k *= 0.7;
    if (this.hasSkill('최후의 보루') && h.hp < h.maxHp * 0.3) k *= 0.7;
    k *= 1 - (src.def && src.def.role === 'ranged' ? st.redRange : st.redMelee) / 100;
    dmg = Math.max(1, Math.round(dmg * k));
    // 불굴: 스테이지당 1회, 치명상을 체력 1로 버틴다
    if (this.hasSkill('불굴') && !this.unyielding && h.hp - dmg <= 0 && h.hp > 1 && !this.god) { this.unyielding = true; dmg = h.hp - 1; this.time.delayedCall(10, () => { this.floatText(h.x, h.y - 280, '불굴!', '#ffd34d', 40); h.invuln = 1500; }); }
    const before = h.hp;
    const r = h.takeHit(src, dmg, type, Math.sign(h.x - sx) || -h.face);
    this.dmgTaken += Math.max(0, before - h.hp);
    const px = h.x + h.face * 40, py = h.y - h.z - 130;
    if (r === 'parry') {
      SFX.parry(h.x - this.cameras.main.scrollX); this.fx('parry_flash', px, py, { s: 0.45, dur: 450, depth: 4300 });
      this.hitstop = 140; this.cameras.main.flash(80, 255, 230, 140);
      this.floatText(h.x, py - 60, '패리!', '#ffd34d', 36);
      if (src.takeHit && src.kind !== 'barkhaul' && !src.dead) { src.state = 'hurt'; src.st = 0; src.stun = 900; src.replay('m_flinch', 20); src.showEmote('dizzy', 900); src.releaseTok && src.releaseTok(); src.vx = -src.face * 150; }
      if (src.kind === 'barkhaul') src.poise -= 25;
    } else if (r === 'guard') {
      SFX.guard(h.x - this.cameras.main.scrollX); this.fx('guard_flash', px, py, { s: 0.32, dur: 260, depth: 4300 });
      this.hitstop = 50;
    } else if (r === 'hit') {
      SFX.hit(type === 'heavy', h.x - this.cameras.main.scrollX, 'blunt');
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
  // 주인공 쪽 범위 공격 (스킬·아이템)
  heroArea(x, y, rx, ry, base, o = {}) {
    const h = this.hero;
    let n = 0;
    for (const m of this.monsters) {
      if (m.dead || (o.hitSet && o.hitSet.has(m))) continue;
      if (Math.abs(m.x - x) > rx + (m.kind === 'barkhaul' ? 60 : 0) || Math.abs(m.y - y) > ry) continue;
      const crit = Math.random() * 100 < this.stats.crit;
      const dmg = this.heroDamage(base * (o.raw ? 1 / this.stats.dmgMul : 1), m, crit);
      m.invuln = 0;
      if (m.takeHit(h, { dmg: base, kb: o.kb ?? 300, type: o.type || 'knock', stop: 60, otg: true }, dmg)) {
        n++; if (o.hitSet) o.hitSet.add(m);
        this.addCombo();
        this.floatText(m.x, m.y - m.height * 0.7, String(dmg), o.col || '#ffb060', crit ? 38 : 32);
        if (m.kind === 'barkhaul') m.poise -= o.poise || 8;
      }
    }
    return n;
  }
  rootBurst(src, x, y) {
    if (this.won) return;
    this.fx('impact_ring', x, y, { s: 0.35, dur: 300, depth: y - 1, flat: true, tint: 0x9cff70 });
    this.fx('dust_land', x, y, { s: 0.35, dur: 400, depth: y + 1, tint: 0xb0d080 });
    const img = this.add.image(x, y + 10, 'barkhaul/forearm').setOrigin(0.5, 1).setScale(0.5, 0.1).setDepth(1000 + y).setTint(src.def.tint || 0xc8a070);
    this.tweens.add({ targets: img, scaleY: 0.55, duration: 120, ease: 'Back.out', yoyo: true, hold: 300, onComplete: () => img.destroy() });
    SFX.roots(x - this.cameras.main.scrollX);
    const h = this.hero;
    if (Math.abs(h.x - x) < 70 && Math.abs(h.y - y) < 32 && h.z < 60) this.resolveHeroHit(src, Math.round(26 * (src.dmgK || 1)), 'heavy', x - h.face, y);
  }
  lobRock(b, t) {
    const sx = b.x + b.face * 60, sy = b.y, sz = 300;
    const img = this.add.image(sx, sy - sz, 'barkhaul/rock').setScale(0.6).setDepth(4000);
    if (b.def.tint) img.setTint(b.def.tint);
    const sh = this.add.image(sx, sy, 'shadow').setScale(0.6, 0.5).setAlpha(0.4).setDepth(999);
    const dur = 700;
    this.tweens.addCounter({ from: 0, to: 1, duration: dur, onUpdate: tw => {
      const k = tw.getValue();
      const x = Phaser.Math.Linear(sx, t.x, k), y = Phaser.Math.Linear(sy, t.y, k), z = sz * (1 - k) + Math.sin(k * Math.PI) * 260;
      img.setPosition(x, y - z).setAngle(k * 540); sh.setPosition(x, y).setScale(0.3 + k * 0.4, 0.25 + k * 0.3);
    }, onComplete: () => {
      img.destroy(); sh.destroy();
      SFX.smash(t.x - this.cameras.main.scrollX); this.cameras.main.shake(180, 0.008);
      this.fx('dust_land', t.x, t.y, { s: 0.55, dur: 500, depth: t.y + 1 });
      this.spawnDebrisAt(t.x, t.y, 4, 'rock');
      this.areaHit(b, t.x, t.y, 100, 38, Math.round(30 * (b.dmgK || 1)), 'heavy');
    } });
  }
  projectile(src, key, o) {
    const img = this.add.image(src.x + src.face * 60, src.y - o.z, key === 'orb' ? 'orb' : key).setDepth(1000 + src.y + 1);
    if (o.sc) img.setScale(o.sc);
    if (o.rot) img.setAngle(src.face > 0 ? o.rot : -o.rot);
    if (src.def && src.def.tint && key !== 'orb') img.setTint(src.def.tint);
    const sh = this.add.image(img.x, src.y, 'shadow').setScale(0.4, 0.4).setAlpha(0.3).setDepth(999);
    this.projs.push({ src, img, sh, x: img.x, y: src.y, z: o.z, vx: o.vx, vy: 0, dmg: o.dmg, life: o.life, home: o.home, key, mine: o.mine, hit: new Set() });
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
      if (p.mine) {
        // 주인공이 던진 것: 몬스터를 꿰뚫는다
        for (const m of this.monsters) {
          if (m.dead || p.hit.has(m) || Math.abs(p.x - m.x) > 50 || Math.abs(p.y - m.y) > 34) continue;
          p.hit.add(m);
          const dmg = this.heroDamage(p.dmg * (1 + this.stats.throwPct / 100), m, false);
          m.invuln = 0;
          if (m.takeHit(h, { dmg: p.dmg, kb: 160, type: 'light', stop: 40 }, dmg)) { this.addCombo(); this.floatText(m.x, m.y - m.height * 0.7, String(dmg), '#fff', 28); SFX.hit(false, m.px, 'blade'); }
        }
      } else if (Math.abs(p.x - h.x) < 40 && Math.abs(p.y - h.y) < 24 && h.z < p.z + 40 && h.z + 200 > p.z) {
        const hit = this.resolveHeroHit(p.src, p.dmg, 'light', p.x - Math.sign(p.vx), p.y);
        if (hit && p.key === 'orb') SFX.orbHit(p.x - this.cameras.main.scrollX);
        if (hit) { p.life = 0; if (p.key !== 'orb') this.spawnDebrisAt(p.x, p.y, 1, 'barrel'); }
      }
      if (p.life <= 0) { p.img.destroy(); p.sh.destroy(); p.dead = true; }
    }
    this.projs = this.projs.filter(p => !p.dead);
  }
  // 바닥 불길 같은 지속 장판
  updateZones(dt) {
    for (const z of this.zones) {
      z.t -= dt; z.tick -= dt;
      if (z.tick <= 0) { z.tick = 400; this.heroArea(z.x, z.y, z.rx, z.ry, z.dmg, { kb: 40, type: 'light', col: '#ff9a3a' }); }
      if (z.t <= 0) { z.dead = true; this.tweens.add({ targets: z.img, alpha: 0, duration: 300, onComplete: () => z.img.destroy() }); }
    }
    this.zones = this.zones.filter(z => !z.dead);
  }
  // ---------------- 아이템 벨트 ----------------
  useItem(i) {
    const k = BELT_ORDER[i], s = this.save, h = this.hero;
    if (!k || !(s.belt[k] > 0) || this.won || this.lost) return;
    s.belt[k]--;
    const f = h.face;
    if (k === 'potion') {
      const v = Math.round(h.maxHp * 0.4 * (1 + this.stats.healPct / 100));
      h.hp = Math.min(h.maxHp, h.hp + v); SFX.ui('potion'); SFX.heal();
      this.floatText(h.x, h.y - 240, '+' + v, '#8f8', 34); h.showEmote('heart', 700);
      this.fx('levelup_burst', h.x, h.y - 100, { s: 0.35, dur: 500, tint: 0x80ff80, depth: h.y + 1001 });
    } else if (k === 'dagger') {
      SFX.throwS(h.px);
      for (let j = 0; j < 3; j++) this.time.delayedCall(j * 90, () => this.projectile(h, 'warrior/weapon_0', { vx: f * 900, z: 110, dmg: 16, rot: 90, sc: 0.28, life: 900, mine: true }));
    } else if (k === 'oil') {
      SFX.throwS(h.px);
      const tx = h.x + f * 260, ty = h.y;
      this.time.delayedCall(350, () => {
        SFX.ui('fire_explode', tx - this.cameras.main.scrollX);
        this.fx('fire_burst', tx, ty - 60, { s: 0.45, dur: 500, depth: ty + 1001 });
        const img = UI.img(this, tx, ty, 'fx/fire_ground') || this.add.image(tx, ty, 'px');
        img.setDepth(999).setScale(0.6, 0.35).setAlpha(0.9);
        this.zones.push({ x: tx, y: ty, rx: 140, ry: 40, dmg: 9, t: 4000, tick: 0, img });
      });
    } else if (k === 'scroll') {
      SFX.ui('use_scroll'); SFX.ui('fire_explode');
      this.cameras.main.flash(120, 255, 140, 60); this.cameras.main.shake(300, 0.01);
      for (let j = 0; j < 4; j++) this.time.delayedCall(j * 110, () => {
        const x = h.x + f * (120 + j * 140);
        this.fx('fire_burst', x, h.y - 70, { s: 0.5, dur: 500, depth: h.y + 1001 });
        this.heroArea(x, h.y, 90, 60, 45, { kb: 380, type: 'knock', col: '#ff9a3a', poise: 12 });
      });
    }
  }
  // ---------------- 스킬 ----------------
  hasSkill(name) { const s = this.save; return (DB.skills[s.hero]?.list || []).some((x, i) => x.name === name && s.skills[i]); }
  useSkill(k) {
    const s = this.save, idx = s.active[k];
    if (idx === null || idx === undefined || this.cds[k] > 0) return false;
    const name = DB.skills[s.hero].list[idx].name, h = this.hero;
    if (!SKILL_IMPL[s.hero]?.[name]) { this.floatText(h.x, h.y - 260, '준비 중인 스킬', '#c8b8a0', 22); this.cds[k] = 1000; return false; }
    this.cds[k] = SKILL_CD[name] * (1 - this.stats.cdr / 100);
    if (name === '도발의 외침') {
      this.buffs.taunt = 3000; SFX.heroAtk(2, h.px); SFX.roar && SFX.cheer(h.px);
      this.fx('impact_ring', h.x, h.y - 120, { s: 0.6, dur: 450, tint: 0xff5a3a, depth: h.y + 1001 });
      for (const m of this.monsters) if (!m.dead && Math.abs(m.x - h.x) < 500) { m.showEmote('anger', 900); m.face = Math.sign(h.x - m.x) || 1; m.cool = Math.min(m.cool, 200); }
      h.showEmote('anger', 800);
    } else if (name === '전투 함성') {
      this.buffs.shout = 8000; SFX.heroAtk(2, h.px); SFX.ui('use_scroll');
      this.fx('levelup_burst', h.x, h.y - 120, { s: 0.5, dur: 600, tint: 0xff7050, depth: h.y + 1001 });
      this.floatText(h.x, h.y - 280, '공격력 +20%', '#ff9a6a', 30);
    } else if (name === '대지 가르기') {
      this.quake = true;
      h.startAttack('down');
      return true;
    }
    return false;
  }
  shockwave(h) {
    const f = h.face, hitSet = new Set();
    for (let j = 0; j < 5; j++) this.time.delayedCall(j * 90, () => {
      const x = h.x + f * (170 + j * 120);
      this.fx('ground_crack', x, h.y, { s: 0.4, dur: 500, depth: h.y - 1, flip: f < 0 });
      this.fx('dust_land', x, h.y, { s: 0.4, dur: 420, depth: h.y + 2 });
      this.spawnDebrisAt(x, h.y, 1, 'rock');
      this.heroArea(x, h.y, 80, 60, 34, { kb: 260, type: 'launch', hitSet, poise: 10 });
    });
    this.cameras.main.shake(400, 0.01);
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
          const dmg = this.heroDamage(m.def.boss ? 140 : 70, m, false);
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
  bossMusic(kind) {
    const d = MONDEF[kind];
    if (kind === 'azmal') return 'bgm_boss_azmal';
    if (kind === 'void_shadow') return 'bgm_boss_void';
    if (kind === 'orvex' || kind === 'orvex_eclipse') return 'bgm_boss_orvex';
    if (d.mid) return 'bgm_boss_mid';
    return this.ch >= 3 ? 'bgm_boss_b' : 'bgm_boss_a';
  }
  bossIntro(kind) {
    const d = MONDEF[kind] || MONDEF.barkhaul;
    SFX.bossWarning();
    this.time.delayedCall(700, () => {
      const c = this.add.container(0, 0).setScrollFactor(0).setDepth(7500);
      const g = this.add.graphics(); g.fillStyle(0x000000, 0.7).fillRect(0, 150, W, 120); g.fillStyle(0x9a2fd0).fillRect(0, 148, W, 4);
      c.add(g);
      c.add(this.add.text(120, 178, d.mid ? '중간 보스' : kind === 'void_shadow' ? '숨은 보스' : `${this.ch}장 보스`, { fontFamily: 'sans-serif', fontSize: 22, color: '#d8b8ff' }));
      c.add(this.add.text(120, 206, d.ko, { fontFamily: 'serif', fontSize: 48, color: '#f6ffd8', stroke: '#1d2a08', strokeThickness: 8 }));
      c.setAlpha(0); c.x = -200;
      this.tweens.add({ targets: c, alpha: 1, x: 0, duration: 300, hold: 1800, yoyo: true, onComplete: () => { c.destroy(); this.bossBar = true; } });
      SFX.roar(this.boss ? this.boss.px : 900);
      SFX.ambience('boss');
      this.time.delayedCall(2600, () => { if (!this.won && !this.lost) SFX.music(this.bossMusic(kind)); });
      this.cameras.main.shake(500, 0.006);
    });
  }
  bossRage(b) {
    SFX.bossPhase();
    this.floatText(b.x, b.y - b.height - 40, '분노!', '#ff5a3a', 40);
    b.rig.setTintAll(0xffc8b0); b.rageTint = true;
    this.cameras.main.flash(200, 200, 40, 20);
    if (b.id === 'azmal') SFX.music('bgm_boss_azmal_rage');
  }
  summonGrunts(n) {
    const kind = (this.boss && this.boss.def.summon) || 'grunt';
    SFX.cheer(this.boss ? this.boss.px : 640);
    for (let i = 0; i < n; i++) this.time.delayedCall(i * 300, () => { if (!this.won) this.spawn(kind, i % 2 ? 1 : -1); });
  }
  bossDefeated(b) {
    if (b.defeated) return;
    b.defeated = true;
    this.won = true;
    SFX.bossDown(b.px); SFX.music(null, { fade: 1.2 }); SFX.heartbeat(false);
    this.slowmo = 1400;
    this.cameras.main.flash(300, 255, 255, 255);
    this.cameras.main.shake(800, 0.012);
    SFX.roar();
    for (const m of this.monsters) if (m !== b && !m.dead) { m.hp = 0; m.takeHit(this.hero, { dmg: 999, type: 'knock', kb: 300, otg: true }, 999); }
    this.time.delayedCall(1700, () => {
      b.die();
      this.hero.state = 'win'; this.hero.play('w_win', 120); this.hero.setHead('head_victory'); this.hero.vx = this.hero.vy = 0;
      SFX.win(); SFX.heroWin(); SFX.ambience(this.theme.amb);
      this.time.delayedCall(1400, () => this.result(true));
    });
  }
  onMonsterDead(m) {
    const d = m.def;
    this.expGain += Math.round((d.exp || 6) * (1 + this.stats.expPct / 100));
    if (this.stats.leech) { const h = this.hero; h.hp = Math.min(h.maxHp, h.hp + Math.round(h.maxHp * this.stats.leech / 100)); }
    if (d.boss) {
      for (let i = 0; i < 25; i++) this.dropPickup(m.x, m.y, 'coin');
      const n = d.mid ? 1 : 2;
      for (let i = 0; i < n; i++) this.dropPickup(m.x, m.y, 'loot', { rar: d.mid ? 1 : 2, boss: !d.mid });
      return;
    }
    const [a, b] = d.gold;
    const n = Phaser.Math.Between(a, b);
    for (let i = 0; i < Math.ceil(n / 2); i++) this.dropPickup(m.x, m.y, 'coin');
    if (Math.random() < 0.1) this.dropPickup(m.x, m.y, 'heal');
    if (Math.random() < (d.sc >= 1.3 ? 0.18 : 0.04)) this.dropPickup(m.x, m.y, 'loot');
    // 동료가 쓰러지면 남은 졸개가 움찔한다
    for (const o of this.monsters) if (!o.dead && o !== m && o.kind !== 'barkhaul' && (o.state === 'idle' || o.state === 'move') && Math.random() < 0.5) {
      o.showEmote(Math.random() < 0.5 ? 'sweat' : 'shock', 800);
      o.state = 'hurt'; o.st = 0; o.stun = 300; o.replay('m_flinch', 40); o.setHead(o.def.face + '_hurt');
    }
  }
  heroDied() {
    if (this.lost) return;
    const s = this.save, h = this.hero;
    // 부활 깃털: 스테이지당 1개
    if (!this.featherUsed && (s.belt.feather || 0) > 0) {
      this.featherUsed = true; s.belt.feather--;
      this.time.delayedCall(1100, () => {
        h.hp = Math.round(h.maxHp * 0.5); h.state = 'getup'; h.st = 0; h.replay('w_getup', 60); h.invuln = 2500; h.setHead(null);
        SFX.ui('revive'); this.cameras.main.flash(300, 255, 240, 200);
        this.fx('levelup_burst', h.x, h.y - 120, { s: 0.6, dur: 800, tint: 0xffd080, depth: h.y + 1001 });
        this.floatText(h.x, h.y - 280, '부활!', '#ffe27a', 44);
        for (const m of this.monsters) if (!m.dead && Math.abs(m.x - h.x) < 400) { m.invuln = 0; m.takeHit(h, { dmg: 1, kb: 500, type: 'knock', otg: true }, 1); }
      });
      return;
    }
    this.lost = true; SFX.heartbeat(false); SFX.lose(); SFX.ambience('off');
    this.time.delayedCall(1300, () => this.result(false));
  }
  // ---------------- 결과 ----------------
  grade() {
    const sec = this.now / 1000, par = this.waves.length * 55 + (this.def.boss ? 60 : 0);
    const tP = sec <= par ? 3 : sec <= par * 1.5 ? 2 : 1;
    const dr = this.dmgTaken / this.hero.maxHp;
    const dP = dr < 0.15 ? 3 : dr < 0.5 ? 2 : 1;
    const cP = this.maxCombo >= 40 ? 3 : this.maxCombo >= 20 ? 2 : 1;
    const sum = tP + dP + cP;
    return sum >= 8 ? 'S' : sum >= 6 ? 'A' : sum >= 4 ? 'B' : 'C';
  }
  result(win) {
    const s = this.save;
    // 바닥에 남은 금화와 장비는 자동으로 줍는다
    for (const p of this.pickups) {
      if (p.type === 'loot') this.loot.push(p.item);
      else if (p.type === 'coin') this.gold += Math.round(3 * (1 + this.stats.goldPct / 100) * (1 + (this.ch - 1) * 0.35));
      p.img.destroy();
    }
    this.pickups = [];
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(9000);
    c.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.7).setOrigin(0).setInteractive());
    const sec = Math.round(this.now / 1000);
    if (!win) {
      c.add(UI.text(this, W / 2, 200, '쓰러졌다…', 76, '#ff9a8a', { serif: true, st: 10 }).setOrigin(0.5));
      c.add(UI.text(this, W / 2, 300, '얻은 금화와 장비는 절반만 챙겨 돌아갔어요', 24, '#e8dcc8').setOrigin(0.5));
      s.gold += Math.floor(this.gold / 2);
      this.loot.slice(0, Math.floor(this.loot.length / 2)).forEach(it => s.bag.push(it));
      gainExp(s, Math.floor(this.expGain / 2));
      Save.write();
      c.add(UI.button(this, W / 2 - 170, 460, '다시 도전', () => this.scene.restart(this.cfg), { w: 280 }));
      c.add(UI.button(this, W / 2 + 170, 460, '지도로', () => this.scene.start('map'), { w: 280, col: 0x3a2a1a }));
      this.input.keyboard.once('keydown-ENTER', () => this.scene.restart(this.cfg));
      return;
    }
    const g = this.grade();
    const bonus = { S: 3, A: 2, B: 1, C: 0 }[g];
    const chests = { S: 3, A: 2, B: 1, C: 1 }[g];
    const prev = s.grades[this.cfg.stage];
    if (!prev || 'SABC'.indexOf(g) < 'SABC'.indexOf(prev)) s.grades[this.cfg.stage] = g;
    const reward = [];
    for (let i = 0; i < chests; i++) { const it = rollDrop(s, this.ch, bonus); s.bag = s.bag.filter(b => b !== it); reward.push(it); }
    const all = [...this.loot, ...reward];
    all.forEach(it => s.bag.push(it));
    s.gold += this.gold;
    const lv0 = s.lv;
    const ups = gainExp(s, this.expGain);
    // 마석: 스테이지마다 조금
    s.mats.low += 1 + bonus; if (this.ch >= 3) s.mats.mid += Math.floor(bonus / 2) + 1; if (this.ch >= 5) s.mats.high += 1;
    if (this.cfg.node && this.cfg.node !== 'void') clearNode(s, this.ch, this.cfg.node);
    Save.write();
    // 화면
    c.add(UI.text(this, W / 2, 86, '스테이지 클리어!', 60, '#ffe27a', { serif: true, st: 10 }).setOrigin(0.5));
    const gT = UI.text(this, W - 200, 180, g, 150, { S: '#ffd34d', A: '#9ae07a', B: '#8ac8ff', C: '#d8c8b0' }[g], { serif: true, st: 12, bold: true }).setOrigin(0.5).setScale(3).setAlpha(0);
    c.add(gT);
    this.tweens.add({ targets: gT, scale: 1, alpha: 1, duration: 300, delay: 500, ease: 'Back.out', onComplete: () => { this.cameras.main.shake(150, 0.006); if (g === 'S') SFX.jingle('jgl_rank_s'); } });
    c.add(UI.text(this, 120, 160, [
      `시간 ${Math.floor(sec / 60)}분 ${sec % 60}초`,
      `받은 피해 ${Math.round(this.dmgTaken)}`,
      `최대 콤보 ${this.maxCombo}`,
      `금화 +${this.gold}   경험치 +${this.expGain}`,
    ].join('\n'), 26, '#fff', { ls: 12 }));
    c.add(UI.text(this, 120, 352, `보상 상자 ${chests}개 (등급 ${g})  ·  주운 장비 ${this.loot.length}개`, 22, '#ffe7a8'));
    all.slice(0, 10).forEach((it, i) => {
      const slot = UI.itemSlot(this, 160 + i * 96, 420, it, 84);
      slot.setScrollFactor(0).setAlpha(0).setScale(0.6);
      c.add(slot);
      this.tweens.add({ targets: slot, alpha: 1, scale: 1, duration: 200, delay: 900 + i * 140, ease: 'Back.out', onStart: () => SFX.ui(it.rar >= 3 ? 'equip_jewel' : 'chest_open') });
      c.add(UI.text(this, 160 + i * 96, 470, it.name.slice(0, 6), 14, RARITY[it.rar].col).setOrigin(0.5, 0));
    });
    if (ups.length) {
      const t = UI.text(this, W / 2, 530, `레벨 업!  Lv.${lv0} → Lv.${s.lv}   (스킬 포인트 +${ups.length})`, 32, '#7ad0ff', { bold: true, st: 6 }).setOrigin(0.5).setAlpha(0);
      c.add(t);
      this.time.delayedCall(1600, () => { SFX.jingle('jgl_level_up'); this.tweens.add({ targets: t, alpha: 1, y: 520, duration: 300 }); this.fx('levelup_burst', this.hero.x, this.hero.y - 120, { s: 0.7, dur: 900, depth: 9500 }); });
    }
    const go = () => this.scene.start('map', { after: { ch: this.ch, node: this.cfg.node, win: true }, ch: this.ch });
    c.add(UI.button(this, W / 2 + 160, 640, '계속 ▶', go, { w: 280 }));
    c.add(UI.button(this, W / 2 - 160, 640, '다시 하기', () => this.scene.restart(this.cfg), { w: 240, col: 0x3a2a1a }));
    c.each(o => o.setScrollFactor && o.setScrollFactor(0));
    this.time.delayedCall(600, () => this.input.keyboard.once('keydown-ENTER', go));
  }
  // ---------------- 갱신 ----------------
  update(time, rawDt) {
    if (this.paused) return;
    let dt = Math.min(rawDt, 40);
    this.dtv = dt;
    if (this.slowmo > 0) { this.slowmo -= dt; dt *= 0.3; }
    this.now += dt;
    for (const k in this.buffs) if (this.buffs[k] > 0) this.buffs[k] -= dt;
    this.cds = this.cds.map(c => Math.max(0, c - dt));
    const inp = this.readInput();
    const frozen = this.hitstop > 0;
    if (frozen) {
      this.hitstop -= rawDt;
      for (const m of this.monsters) if (!m.dead || m.state === 'dying') m.draw(dt, true);
      this.hero.draw(dt, true);
      if (inp.atkP) this.hero.buffer = 260;
      this.drawHud();
      return;
    }
    this.hero.update(dt, inp);
    for (const m of this.monsters) if (!m.dead) m.update(dt);
    this.hero.draw(dt, false);
    for (const m of this.monsters) if (!m.dead) m.draw(dt, false);
    this.monsters = this.monsters.filter(m => !m.dead);
    for (const m of this.monsters) if (m.shake > 0) m.shake -= dt;
    if (this.boss && this.boss.rageTint && !this.boss.dead && this.boss.flashT <= 0) this.boss.rig.setTintAll(Math.floor(this.now / 200) % 2 ? 0xffb8a0 : 0xffd8c8);
    this.updateProjs(dt);
    this.updateZones(dt);
    SFX.heartbeat(!this.won && !this.lost && this.hero.hp > 0 && this.hero.hp < this.hero.maxHp * 0.25);
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
  scene: [Boot, Title, MapScene, Camp, Game, Talk, Bag, Smithy, Shop, Skills, LiseMenu, Credits],
  input: { activePointers: 4 },
  render: { antialias: true },
});

// 테스트용: 숨은 창에서도 프레임을 직접 진행한다
window.step = async (n = 1, dt = 16.6) => { window._t = Math.max(window._t || 0, performance.now()); for (let i = 0; i < n; i++) { window._t += dt; game.step(window._t, dt); if (i % 20 === 19) await new Promise(r => setTimeout(r, 0)); } };
