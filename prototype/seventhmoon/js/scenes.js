// 타이틀, 챕터 지도, 캠프, 메뉴(가방·대장간·상점·스킬·리세), 엔딩
const HERO_PLAYABLE = { warrior: true, mage: true, paladin: true, rogue: true, ranger: true, hexblade: true };
const HERO_KEYS = ['warrior', 'mage', 'paladin', 'rogue', 'ranger', 'hexblade'];
// 직업 전용 방이 나오는 장 (해당 장 두 번째 스테이지를 깨면)
const CLASS_ROOM = { warrior: 1, rogue: 2, paladin: 3, ranger: 4, mage: 5, hexblade: 6 };
const HERO_STAR = { warrior: 1, mage: 3, paladin: 2, rogue: 2, ranger: 2, hexblade: 3 };
const HERO_HINT = { ranger: '3장 모래폭풍 협곡에서 구출', hexblade: '다크 엔딩을 보면 열림' };
function heroOpen(k, s) { return !HERO_HINT[k] || (s && s.unlocked[k]) || globalUnlocks()[k]; }

// ---------------------------------------------------------------------------
class Title extends Phaser.Scene {
  constructor() { super('title'); }
  preload() { Assets.preloadFor(this, Assets.forTitle(Save.has() ? Save.load() : null)); }
  create() {
    const bg = UI.img(this, W / 2, H / 2, 'story/opening') || this.add.image(W / 2, 0, 'bg/far').setOrigin(0.5, 0);
    bg.setDisplaySize(W, W * bg.height / bg.width);
    this.add.rectangle(0, 0, W, H, 0x120a20, 0.5).setOrigin(0);
    const hk = Save.has() && Save.load() ? Save.data.hero : 'warrior';
    const r = new Rig(this, RIGS[hk]());
    r.measure(P.stand);
    const ts = 0.62 * 0.5 / r.def.scale * (r.def.scale / 0.5);
    r.c.setPosition(230, 690 - r.foot * r.def.scale * 1.24).setScale(r.def.scale * 1.24);
    this.rig = r; this.t = 0;
    UI.text(this, W / 2 + 120, 150, '일곱 번째 달', 96, '#ffe7a8', { serif: true, stroke: '#3a1606', st: 12 }).setOrigin(0.5);
    UI.text(this, W / 2 + 120, 232, 'SEVENTH MOON', 26, '#f0d9b0', { stroke: '#2a1206', st: 5 }).setOrigin(0.5);
    const has = Save.has() && Save.load();
    let y = 340;
    if (has) {
      const s = Save.data;
      UI.button(this, W / 2 + 120, y, '이어하기', () => this.cont(), { w: 360, h: 70, size: 30 });
      UI.text(this, W / 2 + 120, y + 48, `${DB.heroes[s.hero].name} Lv.${s.lv} · ${s.ch}장 ${CHAPTERS[s.ch - 1].name}`, 18, '#e8dcc8').setOrigin(0.5);
      y += 110;
    }
    UI.button(this, W / 2 + 120, y, '새로 시작', () => this.newGame(has), { w: 360, h: 66, size: 28, col: has ? 0x4a2a14 : 0x7a3a10 });
    y += 90;
    UI.button(this, W / 2 + 30, y, '조작법', () => this.help(), { w: 175, h: 56, size: 22, col: 0x3a2a1a });
    UI.button(this, W / 2 + 210, y, '설정', () => openSettings(this), { w: 175, h: 56, size: 22, col: 0x2a3a5a });
    SFX.music('bgm_title');
    this.input.keyboard.once('keydown-ENTER', () => (has ? this.cont() : this.newGame(false)));
  }
  cont() { SFX.resume(); this.scene.start('map'); }
  newGame(confirm) {
    SFX.resume();
    if (confirm) {
      const c = this.add.container(0, 0).setDepth(100);
      c.add(UI.blocker(this, 0.7));
      c.add(UI.panel(this, W / 2 - 330, 230, 660, 250));
      c.add(UI.text(this, W / 2, 290, '저장된 모험이 지워져요.\n새로 시작할까요?', 30, '#fff', { align: 'center' }).setOrigin(0.5));
      c.add(UI.button(this, W / 2 - 130, 410, '새로 시작', () => { c.destroy(); this.pickHero(); }, { w: 220, col: 0x8a2a10 }));
      c.add(UI.button(this, W / 2 + 130, 410, '취소', () => c.destroy(), { w: 220, col: 0x3a2a1a }));
      return;
    }
    this.pickHero();
  }
  pickHero() {
    const c = this.add.container(0, 0).setDepth(100);
    c.add(UI.blocker(this, 0.82));
    c.add(UI.text(this, W / 2, 60, '직업 선택', 44, '#ffe7a8', { serif: true, st: 8 }).setOrigin(0.5));
    const keys = ['warrior', 'mage', 'paladin', 'rogue', 'ranger', 'hexblade'];
    const star = { warrior: 1, mage: 3, paladin: 2, rogue: 2, ranger: 2, hexblade: 3 };
    keys.forEach((k, i) => {
      const x = 130 + i * 204, y = 340;
      const ok = HERO_PLAYABLE[k] && heroOpen(k, null);
      const hidden = !heroOpen(k, null);
      c.add(UI.panel(this, x - 92, y - 220, 184, 420, { line: ok ? 0xe0b45a : 0x5a4a38, alpha: 0.95 }));
      const p = UI.img(this, x, y + 40, 'portrait/' + k);
      if (p && !hidden) { p.setOrigin(0.5, 1).setScale(Math.min(220 / p.height, 176 / p.width)); c.add(p); }
      else if (p) { p.setOrigin(0.5, 1).setScale(Math.min(220 / p.height, 176 / p.width)).setTint(0x101010).setAlpha(0.8); c.add(p); }
      else c.add(UI.text(this, x, y - 60, hidden ? '?' : '…', 90, '#6a5a48', { bold: true }).setOrigin(0.5));
      c.add(UI.text(this, x, y + 64, hidden ? '숨은 직업' : DB.heroes[k].name, 26, ok ? '#ffe7a8' : '#9a8a78', { bold: true }).setOrigin(0.5));
      c.add(UI.text(this, x, y + 98, hidden ? HERO_HINT[k] : DB.heroes[k].ko.split(' ')[0], 16, '#d8c8b0', { align: 'center', wrap: 170 }).setOrigin(0.5));
      c.add(UI.text(this, x, y + 126, '★'.repeat(star[k]) + '☆'.repeat(3 - star[k]), 20, '#ffd34d').setOrigin(0.5));
      if (ok) c.add(UI.button(this, x, y + 172, '선택', () => this.begin(k), { w: 150, h: 52, size: 24 }));
      else c.add(UI.text(this, x, y + 172, '잠김', 18, '#9a8a78').setOrigin(0.5));
    });
    c.add(UI.button(this, W / 2, 650, '뒤로', () => c.destroy(), { w: 200, h: 52, size: 22, col: 0x3a2a1a }));
  }
  begin(hero) {
    Save.fresh(hero);
    SFX.music(null, { fade: 0.6 });
    runTalk(this, 'opening', () => this.scene.start('game', { stage: 'c1_s1', ch: 1, node: 's1' }));
  }
  help() {
    // 실제 전투 화면의 버튼 자리를 그대로 그려서 보여 준다
    const c = this.add.container(0, 0).setDepth(100);
    c.add(UI.blocker(this, 0.96));
    c.add(UI.text(this, W / 2, 40, '조작법', 38, '#ffe7a8', { serif: true }).setOrigin(0.5));
    const g = this.add.graphics(); c.add(g);
    g.lineStyle(2, 0x8a7a68, 0.8).strokeRoundedRect(60, 80, W - 120, 560, 16);
    const sx = x => 60 + x * (W - 120) / W, sy = y => 80 + y * 560 / H;
    const circ = (x, y, r, col, label, sub, left) => {
      g.fillStyle(col, 0.85).fillCircle(sx(x), sy(y), r).lineStyle(3, 0xffe7a8).strokeCircle(sx(x), sy(y), r);
      c.add(UI.text(this, sx(x), sy(y), label, Math.min(22, r * 0.55), '#fff', { bold: true, align: 'center' }).setOrigin(0.5));
      if (sub && left) c.add(UI.text(this, sx(x) - r - 8, sy(y), sub, 14, '#e8dcc8', { align: 'right' }).setOrigin(1, 0.5));
      else if (sub) c.add(UI.text(this, sx(x), sy(y) + r + 4, sub, 14, '#e8dcc8', { align: 'center', wrap: 200 }).setOrigin(0.5, 0));
    };
    // 왼쪽: 이동 패드
    g.fillStyle(0x3a2a1a, 0.6).fillCircle(sx(170), sy(560), 70).lineStyle(3, 0xffe7a8, 0.8).strokeCircle(sx(170), sy(560), 70);
    g.fillStyle(0xffe7a8, 0.8).fillCircle(sx(170), sy(560), 26);
    c.add(UI.text(this, sx(170), sy(560) - 100, '이동 패드', 22, '#ffe7a8', { bold: true }).setOrigin(0.5));
    c.add(UI.text(this, sx(170) + 90, sy(560) - 40, '화면 왼쪽 어디든 누른 채 끌기\n위아래로 끌면 깊이 이동\n한쪽으로 오래 밀면 달리기', 17, '#e8dcc8', { ls: 6 }));
    // 오른쪽 버튼들 (전투 화면과 같은 자리)
    circ(1110, 590, 50, 0x8a2a10, '공격', '연달아 누르면 4연타');
    circ(960, 640, 32, 0x2a5a8a, '점프', '점프 중 공격 = 점프 공격', true);
    circ(960, 500, 32, 0x5a5a6a, '가드', '누르고 있기 · 맞기 직전 = 패리', true);
    circ(1190, 440, 30, 0x2a6a4a, '구르기', '구르는 동안 무적');
    circ(1065, 395, 28, 0xa07010, '각성', '게이지 가득일 때');
    circ(850, 420, 26, 0x4a3a7a, '스킬1', '스킬 (캠프 천막에서 장착)', true);
    circ(1190, 300, 26, 0x4a3a7a, '스킬2', null);
    circ(1228, 150, 18, 0x3a2a1a, 'II', '일시 정지');
    // 위쪽 칸들
    g.fillStyle(0x3a2a1a, 0.8).fillRoundedRect(sx(490), sy(20), sx(800) - sx(490), 50, 8);
    c.add(UI.text(this, (sx(490) + sx(800)) / 2, sy(20) + 25, '아이템 벨트 (눌러서 사용)', 18, '#ffe7a8', { bold: true }).setOrigin(0.5));
    g.fillStyle(0x1a2a3a, 0.8).fillRoundedRect(sx(16), sy(132), sx(316) - sx(16), 44, 8);
    c.add(UI.text(this, (sx(16) + sx(316)) / 2, sy(132) + 22, '동료 칸: 눌러서 명령 바꾸기', 16, '#9ae0ff', { bold: true }).setOrigin(0.5));
    // 커맨드
    c.add(UI.text(this, W / 2, 668, '패드를 앞으로 밀며 공격 = 돌진  ·  패드 위 + 공격 = 올려치기  ·  패드 아래 + 공격 = 내려찍기', 19, '#ffd34d', { bold: true }).setOrigin(0.5));
    c.add(UI.button(this, W - 130, 40, '닫기', () => c.destroy(), { w: 160, h: 50, size: 22 }));
  }
  update(t, dt) { this.t += dt; this.rig.apply(CLIPS.idle.at(this.t)); }
}

// ---------------------------------------------------------------------------
// 챕터 지도
// ---------------------------------------------------------------------------
class MapScene extends Phaser.Scene {
  constructor() { super('map'); }
  init(d) { this.after = d && d.after; this.view = (d && d.ch) || null; this.sel = null; }
  preload() { const s = Save.data || Save.load(); Assets.preloadFor(this, Assets.forMap(s, this.view || (s ? s.ch : 1))); }
  create() {
    const s = Save.data || Save.load();
    if (!s) { this.scene.start('title'); return; }
    this.cameras.main.setBackgroundColor('#1a120a');
    const ch = this.view || s.ch;
    this.ch = ch;
    const C = CHAPTERS[ch - 1];
    const m = UI.img(this, W / 2, H / 2, C.map) || UI.img(this, W / 2, H / 2, 'map/c1');
    const k = 0.84;
    if (m) m.setScale(k);
    this.mx = W / 2 - 1280 * k / 2; this.my = H / 2 - 853 * k / 2; this.mk = k;
    // 장 제목 리본
    const rib = this.add.graphics();
    rib.fillStyle(0x3a1408, 0.95).fillRoundedRect(W / 2 - 260, 8, 520, 64, 12).lineStyle(3, 0xe0b45a).strokeRoundedRect(W / 2 - 260, 8, 520, 64, 12);
    UI.text(this, W / 2, 40, `${ch}장  ${C.name}`, 32, '#ffe7a8', { serif: true, st: 6 }).setOrigin(0.5);
    if (ch > 1) UI.button(this, W / 2 - 300, 40, '◀', () => this.scene.restart({ ch: ch - 1 }), { w: 56, h: 52, size: 24, col: 0x3a2a1a });
    if (ch < s.ch) UI.button(this, W / 2 + 300, 40, '▶', () => this.scene.restart({ ch: ch + 1 }), { w: 56, h: 52, size: 24, col: 0x3a2a1a });
    this.drawHud();
    this.drawNodes();
    SFX.music('bgm_map');
    SFX.ambience('off');
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('camp'));
    if (this.after) this.time.delayedCall(50, () => this.afterStage(this.after));
    else if (ch === s.ch) this.time.delayedCall(50, () => this.chapterIntro());
  }
  drawHud() {
    const s = Save.data;
    if (this.hud) this.hud.destroy();
    const c = this.add.container(0, 0).setDepth(50);
    c.add(UI.panel(this, 12, 90, 300, 96, { alpha: 0.88 }));
    const p = UI.img(this, 62, 138, 'portrait/' + s.hero);
    if (p) { p.setScale(80 / p.height); c.add(p); }
    c.add(UI.text(this, 112, 102, `${DB.heroes[s.hero].name}  Lv.${s.lv}`, 22, '#ffe7a8', { bold: true }));
    const g = this.add.graphics();
    g.fillStyle(0x2a1a10).fillRect(112, 136, 180, 10).fillStyle(0x7ad0ff).fillRect(112, 136, 180 * Math.min(1, s.exp / expNeed(s.lv)), 10);
    c.add(g);
    c.add(UI.text(this, 112, 152, `금화 ${s.gold}   SP ${s.sp}`, 18, '#ffd34d'));
    c.add(UI.button(this, W - 110, 120, '캠프', () => this.scene.start('camp'), { w: 180, h: 56, size: 24 }));
    c.add(UI.button(this, W - 110, 186, '가방', () => openMenu(this, 'bag'), { w: 180, h: 52, size: 22, col: 0x4a2a14 }));
    const moons = Object.keys(s.moons).length;
    c.add(UI.text(this, W - 110, 232, `월석 ${moons}/6`, 20, '#d8c8ff').setOrigin(0.5, 0));
    if (towerOpen(s)) c.add(UI.button(this, W - 110, 300, '탑 · 도전', () => this.scene.start('towergate'), { w: 180, h: 56, size: 22, col: 0x4a2a7a }));
    else c.add(UI.text(this, W - 110, 286, '심연의 탑\n1장을 깨면 열려요', 15, '#8a7a98', { align: 'center' }).setOrigin(0.5, 0));
    this.hud = c;
  }
  pos(id) { const [x, y] = (MAP_NODES[this.ch] || MAP_POS)[id]; return [this.mx + x * this.mk, this.my + y * this.mk]; }
  drawNodes() {
    const s = Save.data, ch = this.ch;
    const nodes = chapterNodes(ch);
    const replay = ch < s.ch;
    const open = replay ? Object.keys(nodes) : openNodes(s, ch);
    const chosen = s.route['c' + ch];
    if (this.nodeLayer) this.nodeLayer.destroy();
    const L = this.add.container(0, 0).setDepth(20);
    // 캠프(출발점)
    const [cx, cy] = this.pos('camp');
    const campImg = UI.img(this, cx, cy, 'uiset/node_camp');
    if (campImg) { campImg.setScale(60 / campImg.height); L.add(campImg); }
    else { L.add(this.add.circle(cx, cy, 26, 0x3a2a1a).setStrokeStyle(3, 0xe0b45a)); const tent = UI.img(this, cx, cy, 'icon/tent'); if (tent) { tent.setScale(44 / tent.height); L.add(tent); } }
    for (const [id, n] of Object.entries(nodes)) {
      const [x, y] = this.pos(id);
      const done = nodeCleared(s, ch, id);
      const isOpen = open.includes(id) && !(!replay && done);
      const closed = !replay && n.route && chosen && n.route !== chosen;
      const big = n.type === 'boss';
      const r = big ? 34 : 24;
      const col = done ? 0xe0b45a : isOpen ? 0xfff2c0 : 0x6a5a48;
      const nodeImg = 'uiset/' + (closed ? 'node_locked' : { stage: 'node_battle', midboss: 'node_elite', event: 'node_event', treasure: 'node_moonstone', boss: 'node_boss' }[n.type]);
      let circ;
      if (this.textures.exists(nodeImg)) {
        circ = this.add.image(x, y, nodeImg); circ.setScale(r * 2.3 / circ.height);
        if (!isOpen && !done && !replay) circ.setTint(0x8a8070);
        L.add(circ);
        if (done) { const d = UI.img(this, x + r * 0.7, y + r * 0.6, 'uiset/node_done'); if (d) { d.setScale(r * 1.1 / d.height); L.add(d); } }
      } else {
        circ = this.add.circle(x, y, r, done ? 0x7a5a20 : isOpen ? 0xb04010 : 0x2a2018, closed ? 0.4 : 1).setStrokeStyle(4, col, closed ? 0.4 : 1);
        L.add(circ);
        L.add(UI.text(this, x, y, done ? '✓' : String(Object.keys(nodes).indexOf(id) + 1), 22, '#fff', { bold: true }).setOrigin(0.5));
      }
      const g = n.stage && s.grades[n.stage];
      if (g) L.add(UI.text(this, x + r - 4, y - r - 6, g, 22, { S: '#ffd34d', A: '#9ae07a', B: '#8ac8ff', C: '#d8c8b0' }[g], { bold: true, st: 5 }).setOrigin(0.5));
      if (isOpen) {
        this.tweens.add({ targets: circ, scale: circ.scale * 1.15, yoyo: true, repeat: -1, duration: 600 });
        circ.setInteractive({ useHandCursor: true }).on('pointerup', () => this.select(id));
      } else if (done || replay) circ.setInteractive({ useHandCursor: true }).on('pointerup', () => this.select(id));
    }
    // 갈림길 이름
    const [ax, ay] = this.pos('a2'), [bx, by] = this.pos('b2');
    const C = CHAPTERS[ch - 1];
    L.add(UI.text(this, ax, ay - 52, 'A · ' + C.routeA, 20, chosen === 'B' && !replay ? '#8a7a68' : '#fff2c0', { bold: true, st: 5 }).setOrigin(0.5));
    L.add(UI.text(this, bx, by - 46, 'B · ' + C.routeB, 20, chosen === 'A' && !replay ? '#8a7a68' : '#fff2c0', { bold: true, st: 5 }).setOrigin(0.5));
    this.nodeLayer = L;
    // 처음 열린 노드를 고른다
    const first = open.find(id => !nodeCleared(s, ch, id));
    if (first && !this.sel) this.select(first, true);
  }
  select(id, quiet) {
    const s = Save.data, ch = this.ch, n = chapterNodes(ch)[id];
    this.sel = id;
    if (this.info) this.info.destroy();
    const c = this.add.container(0, 0).setDepth(60);
    c.add(UI.panel(this, W / 2 - 400, H - 150, 800, 140, { alpha: 0.94 }));
    const st = n.stage && STAGES[n.stage];
    const typeKo = { stage: '전투', midboss: '중간 보스', event: '이벤트', treasure: '보물 · 월석', boss: '챕터 보스' }[n.type];
    const title = st ? st.name : n.type === 'event' ? (CHAPTERS[ch - 1].routeB + ' 이벤트') : '';
    c.add(UI.text(this, W / 2 - 370, H - 138, `[${typeKo}]  ${title}`, 26, '#ffe7a8', { bold: true }));
    let desc = '';
    if (st) {
      const kinds = [...new Set(st.waves.flat().join(',').split(',').map(x => x.split('*')[0]))];
      desc = '등장: ' + kinds.map(k => MONDEF[k]?.ko || k).join(', ');
      desc += `\n권장 Lv.${CHAPTERS[ch - 1].lv + (id.startsWith('s') ? 0 : id === 'boss' ? 4 : 2)}`;
      if (s.grades[n.stage]) desc += `   최고 등급 ${s.grades[n.stage]}`;
    } else desc = '이야기와 선택이 기다린다.';
    if (n.route && !s.route['c' + ch] && ch === s.ch) desc += '\n※ 이 길을 고르면 이번 회차의 다른 길은 막혀요';
    c.add(UI.text(this, W / 2 - 370, H - 98, desc, 19, '#e8dcc8', { wrap: 560, ls: 4 }));
    const replay = ch < s.ch;
    const can = replay ? true : openNodes(s, ch).includes(id) && !nodeCleared(s, ch, id);
    if (can || (replay && n.type !== 'event')) c.add(UI.button(this, W / 2 + 300, H - 80, replay || nodeCleared(s, ch, id) ? '다시 하기' : '출발', () => this.startNode(id), { w: 170, h: 64, size: 28 }));
    this.info = c;
    if (!quiet) SFX.go();
  }
  startNode(id) {
    const s = Save.data, ch = this.ch, node = chapterNodes(ch)[id];
    if (node.route && ch === s.ch && !s.route['c' + ch]) { s.route['c' + ch] = node.route; Save.write(); }
    if (node.type === 'event') {
      runTalk(this, `c${ch}_event`, () => { clearNode(s, ch, id); Save.write(); this.scene.restart({ ch }); });
      return;
    }
    const go = () => { SFX.music(null, { fade: 0.4 }); this.scene.start('game', { stage: node.stage, ch, node: id }); };
    if (node.type === 'boss') runTalk(this, `c${ch}_preboss`, go, { once: true }); else go();
  }
  chapterIntro() {
    const s = Save.data, ch = this.ch;
    // 1장 소개는 첫 스테이지를 깬 뒤(프롤로그 전투 다음)에 나온다
    if (ch === 1 && !nodeCleared(s, 1, 's1')) return;
    runTalk(this, `c${ch}_intro`, null, { once: true });
  }
  afterStage(a) {
    const s = Save.data, ch = a.ch;
    if (!a.win) return;
    const node = chapterNodes(ch)[a.node];
    const chain = [];
    if (a.node === 'void') { s.flags.void_done = true; Save.write(); return this.ending('end_true'); }
    if (node && node.type === 'treasure') chain.push(`c${ch}_moon`);
    if (a.node === 's2' && CLASS_ROOM[s.hero] === ch) chain.push('cls_' + s.hero);
    if (node && node.type === 'boss') {
      chain.push(`c${ch}_end`);
      if (ch === 5) chain.push('c5_choice');
    }
    const finish = () => {
      if (node && node.type === 'boss' && ch === s.ch) {
        if (ch === 6) return this.finalEnding();
        s.ch = Math.min(6, s.ch + 1); Save.write();
        UI.toast(this, `${s.ch}장 「${CHAPTERS[s.ch - 1].name}」이 열렸어요`, '#ffe27a', 300);
        this.time.delayedCall(1200, () => this.scene.start('map'));
        return;
      }
      if (node && node.type === 'boss' && ch === 6) return this.finalEnding();
      this.scene.restart({ ch });
    };
    const runNext = () => {
      const k = chain.shift();
      if (!k) return finish();
      runTalk(this, k, runNext, { once: true });
    };
    runNext();
  }
  finalEnding() {
    const s = Save.data, e = endingFor(s);
    if (e === 'end_true' && !s.flags.void_done) {
      runTalk(this, 'pre_void', () => this.scene.start('game', { stage: 'x_void', ch: 6, node: 'void' }));
      return;
    }
    this.ending(e);
  }
  ending(e) {
    const s = Save.data;
    s.endings[e] = true;
    const ne = Object.keys(s.endings).length;
    if (ne >= 1) addGlobalUnlock('diff2');
    if (ne >= 2) addGlobalUnlock('diff3');
    if (e === 'end_dark') { s.unlocked.hexblade = true; addGlobalUnlock('hexblade'); }
    Save.write();
    runTalk(this, e, () => runTalk(this, 'ep_' + s.hero, () => this.scene.start('credits', { e }), { dim: 0.85 }), { dim: 0.85 });
  }
}

// ---------------------------------------------------------------------------
// 캠프
// ---------------------------------------------------------------------------
class Camp extends Phaser.Scene {
  constructor() { super('camp'); }
  preload() { Assets.preloadFor(this, Assets.forCamp(Save.data || Save.load())); }
  create() {
    const s = Save.data || Save.load();
    if (!s) { this.scene.start('title'); return; }
    const bg = UI.img(this, W / 2, -60, 'bg/camp_far') || this.add.image(W / 2, -40, 'bg/far');
    bg.setOrigin(0.5, 0).setScale(W / bg.width);
    const shade = this.add.graphics();
    shade.fillGradientStyle(0, 0, 0, 0, 0, 0, 0.55, 0.55).fillRect(0, 420, W, 300);
    // 모닥불 빛
    const glow = this.add.circle(535, 400, 130, 0xff9a3a, 0.12).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, alpha: 0.2, scale: 1.08, yoyo: true, repeat: -1, duration: 700 });
    // NPC
    const npcs = [
      ['tabel', 200, '대장간', 'smithy'], ['merchant', 430, '상점', 'shop'],
      ['lise', 900, '리세', 'lise'], ['fortune', 1110, '마법 천막', 'skills'],
    ];
    for (const [k, x, label, menu] of npcs) {
      const im = UI.img(this, x, 660, 'npc/' + k);
      if (!im) continue;
      im.setOrigin(0.5, 1).setScale(270 / im.height).setInteractive({ useHandCursor: true, pixelPerfect: false });
      if (k === 'fortune' || k === 'lise') im.setFlipX(true);
      this.tweens.add({ targets: im, scaleY: im.scaleY * 1.012, yoyo: true, repeat: -1, duration: 1400 + Math.random() * 400 });
      im.on('pointerover', () => im.setTint(0xfff0c0)); im.on('pointerout', () => im.clearTint());
      im.on('pointerup', () => { SFX.resume(); SFX.go(); openMenu(this, menu); });
      const tag = UI.text(this, x, 380, label, 24, '#ffe7a8', { bold: true, st: 6 }).setOrigin(0.5);
      this.tweens.add({ targets: tag, y: 372, yoyo: true, repeat: -1, duration: 900 });
    }
    // 주인공
    const r = new Rig(this, RIGS[s.hero]());
    r.measure(P.stand);
    r.c.setPosition(660, 668 - r.foot * r.def.scale).setScale(r.def.scale);
    this.rig = r; this.t = 0;
    this.ar = null;
    if (s.ally && s.ally !== s.hero && RIGS[s.ally]) {
      const a = new Rig(this, RIGS[s.ally]()); a.measure(P.stand);
      a.c.setPosition(760, 690 - a.foot * a.def.scale).setScale(a.def.scale);
      this.ar = a;
    }
    // 위 HUD와 아래 버튼
    this.drawHud();
    UI.button(this, 160, 50, '◀ 지도로', () => this.scene.start('map'), { w: 220, h: 60, size: 26 });
    UI.button(this, W - 870, 50, '도감', () => openMenu(this, 'codex'), { w: 150, h: 56, size: 24, col: 0x4a3a1a });
    UI.button(this, W - 700, 50, '동료', () => this.pickAlly(), { w: 150, h: 56, size: 24, col: 0x2a4a3a });
    UI.button(this, W - 530, 50, '직업', () => this.pickClass(), { w: 150, h: 56, size: 24, col: 0x2a3a5a });
    UI.button(this, W - 360, 50, '가방', () => openMenu(this, 'bag'), { w: 150, h: 56, size: 24, col: 0x4a2a14 });
    UI.button(this, W - 190, 50, '메뉴', () => this.sysMenu(), { w: 150, h: 56, size: 24, col: 0x3a2a1a });
    SFX.music('bgm_camp');
    SFX.ambience('camp');
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('map'));
    runTalk(this, 'camp_tabel', null, { once: true });
  }
  drawHud() {
    const s = Save.data;
    if (this.hudT) this.hudT.destroy();
    this.hudT = UI.text(this, W / 2 - 100, 110, `${DB.heroes[s.hero].name} Lv.${s.lv} · ${DIFFS[s.diff ?? 1].ko}   금화 ${s.gold}   SP ${s.sp}   월석 ${Object.keys(s.moons).length}/6`, 22, '#ffe7a8', { bold: true, st: 5 }).setOrigin(0.5, 0.5);
  }
  pickDiff() {
    const s = Save.data;
    const c = this.add.container(0, 0).setDepth(200);
    c.add(UI.blocker(this, 0.8));
    c.add(UI.panel(this, W / 2 - 360, 110, 720, 500));
    c.add(UI.text(this, W / 2, 150, '난이도', 38, '#ffe7a8', { serif: true }).setOrigin(0.5));
    DIFFS.forEach((d, i) => {
      const y = 230 + i * 90, open = diffOpen(s, i), cur = (s.diff ?? 1) === i;
      c.add(UI.button(this, W / 2 - 200, y, d.ko, () => { if (!open) return; s.diff = i; Save.write(); c.destroy(); this.drawHud(); UI.toast(this, `난이도: ${d.ko}`); }, { w: 180, h: 60, size: 26, disabled: !open, col: cur ? 0x8a3a1a : 0x4a2a14 }));
      c.add(UI.text(this, W / 2 - 90, y, open ? d.desc : (i === 2 ? '엔딩을 하나 보면 열려요' : '엔딩을 두 개 보면 열려요'), 19, open ? '#f4e4c0' : '#8a7a68', { wrap: 430 }).setOrigin(0, 0.5));
    });
    c.add(UI.button(this, W / 2, 575, '닫기', () => c.destroy(), { w: 200, h: 50, size: 22, col: 0x3a2a1a }));
  }
  pickAlly() {
    const s = Save.data;
    const c = this.add.container(0, 0).setDepth(200);
    c.add(UI.blocker(this, 0.82));
    c.add(UI.text(this, W / 2, 64, '동료 고르기', 40, '#ffe7a8', { serif: true, st: 7 }).setOrigin(0.5));
    c.add(UI.text(this, W / 2, 110, '지금 직업이 아닌 한 명이 함께 싸워요. 전투 중 왼쪽 위 동료 칸을 누르면 명령이 바뀌어요: 엄호 · 돌격 · 회복 우선', 17, '#d8c8b0', { align: 'center', wrap: 1100 }).setOrigin(0.5));
    HERO_KEYS.forEach((k, i) => {
      const x = 130 + i * 204, y = 360, open = heroOpen(k, s) && k !== s.hero;
      const sel = s.ally === k;
      c.add(UI.panel(this, x - 92, y - 190, 184, 380, { line: sel ? 0x7ae0ff : open ? 0xc99a3c : 0x4a3a30, alpha: 0.95 }));
      const p = UI.img(this, x, y + 30, 'portrait/' + k);
      if (p) { p.setOrigin(0.5, 1).setScale(Math.min(200 / p.height, 176 / p.width)); if (!open) p.setTint(k === s.hero ? 0x707070 : 0x101010); c.add(p); }
      c.add(UI.text(this, x, y + 54, heroOpen(k, s) ? DB.heroes[k].name : '???', 24, open ? '#ffe7a8' : '#8a7a68', { bold: true }).setOrigin(0.5));
      const combo = open ? allyCombo(s.hero, k) : null;
      c.add(UI.text(this, x, y + 86, k === s.hero ? '지금 직업' : combo ? `조합 「${combo}」\n피해 +15%` : heroOpen(k, s) ? DB.heroes[k].ko.split(' ')[0] : HERO_HINT[k], 15, combo ? '#7ae0ff' : '#d8c8b0', { align: 'center', wrap: 170 }).setOrigin(0.5, 0));
      if (sel) c.add(UI.text(this, x, y + 150, '함께하는 중', 18, '#7ae0ff').setOrigin(0.5));
      else if (open) c.add(UI.button(this, x, y + 150, '데려가기', () => { s.ally = k; Save.write(); c.destroy(); this.scene.restart(); }, { w: 150, h: 50, size: 21, col: 0x2a4a3a }));
    });
    if (s.ally) c.add(UI.button(this, W / 2 - 130, 650, '혼자 가기', () => { s.ally = null; Save.write(); c.destroy(); this.scene.restart(); }, { w: 220, h: 52, size: 21, col: 0x4a2a14 }));
    c.add(UI.button(this, W / 2 + (s.ally ? 130 : 0), 650, '닫기', () => c.destroy(), { w: 200, h: 52, size: 22, col: 0x3a2a1a }));
  }
  pickClass() {
    const s = Save.data;
    const c = this.add.container(0, 0).setDepth(200);
    c.add(UI.blocker(this, 0.8));
    c.add(UI.text(this, W / 2, 70, '직업 바꾸기', 40, '#ffe7a8', { serif: true, st: 7 }).setOrigin(0.5));
    c.add(UI.text(this, W / 2, 118, '레벨·금화·가방은 함께 쓰고, 장비와 스킬은 직업마다 따로 기억해요', 18, '#d8c8b0').setOrigin(0.5));
    HERO_KEYS.forEach((k, i) => {
      const x = 130 + i * 204, y = 380, open = heroOpen(k, s);
      c.add(UI.panel(this, x - 92, y - 200, 184, 360, { line: k === s.hero ? 0xffe27a : open ? 0xc99a3c : 0x5a4a38, alpha: 0.95 }));
      const p = UI.img(this, x, y + 30, 'portrait/' + k);
      if (p) { p.setOrigin(0.5, 1).setScale(Math.min(200 / p.height, 176 / p.width)); if (!open) p.setTint(0x101010); c.add(p); }
      c.add(UI.text(this, x, y + 54, open ? DB.heroes[k].name : '???', 24, open ? '#ffe7a8' : '#8a7a68', { bold: true }).setOrigin(0.5));
      c.add(UI.text(this, x, y + 84, open ? DB.heroes[k].ko.split(' ')[0] : HERO_HINT[k], 15, '#d8c8b0', { align: 'center', wrap: 170 }).setOrigin(0.5));
      if (k === s.hero) c.add(UI.text(this, x, y + 128, '지금 직업', 18, '#ffe27a').setOrigin(0.5));
      else if (open) c.add(UI.button(this, x, y + 128, '바꾸기', () => { switchHero(s, k); if (s.ally === k) s.ally = null; Save.write(); this.scene.restart(); }, { w: 150, h: 50, size: 22 }));
    });
    c.add(UI.button(this, W / 2, 650, '닫기', () => c.destroy(), { w: 200, h: 52, size: 22, col: 0x3a2a1a }));
  }
  sysMenu() {
    const s = Save.data;
    const c = this.add.container(0, 0).setDepth(200);
    c.add(UI.blocker(this, 0.7));
    c.add(UI.panel(this, W / 2 - 280, 160, 560, 400));
    c.add(UI.text(this, W / 2, 205, '메뉴', 34, '#ffe7a8', { serif: true }).setOrigin(0.5));
    c.add(UI.button(this, W / 2, 280, '백업 코드 복사', () => {
      const code = Save.exportCode();
      try { navigator.clipboard.writeText(code); UI.toast(this, '백업 코드를 복사했어요'); } catch (e) { UI.toast(this, '복사하지 못했어요'); }
    }, { w: 380, h: 56, size: 22, col: 0x3a2a1a }));
    c.add(UI.button(this, W / 2, 350, '백업 코드로 불러오기', () => {
      const code = window.prompt('백업 코드를 붙여 넣으세요');
      if (!code) return;
      try { Save.importCode(code); this.scene.restart(); } catch (e) { UI.toast(this, '코드가 올바르지 않아요', '#ff9a8a'); }
    }, { w: 380, h: 56, size: 22, col: 0x3a2a1a }));
    c.add(UI.button(this, W / 2, 420, '설정', () => openSettings(this), { w: 185, h: 56, size: 22, col: 0x2a3a5a }));
    c.add(UI.button(this, W / 2 + 195, 420, `난이도: ${DIFFS[s.diff ?? 1].ko}`, () => { c.destroy(); this.pickDiff(); }, { w: 185, h: 56, size: 20, col: 0x5a2a2a }));
    c.add(UI.button(this, W / 2, 470, '타이틀로', () => this.scene.start('title'), { w: 380, h: 44, size: 20, col: 0x4a2a14 }));
    c.add(UI.button(this, W / 2, 500, '닫기', () => c.destroy(), { w: 200, h: 52, size: 22 }));
  }
  update(t, dt) { this.t += dt; if (this.rig) this.rig.apply(CLIPS.idle.at(this.t)); if (this.ar) this.ar.apply(CLIPS.idle.at(this.t + 700)); }
}

// 메뉴 창을 띄운다 (부른 장면 위에 겹친다)
function openMenu(scene, key) {
  if (scene.scene.isActive(key)) return;
  Assets.ensure(scene, Assets.portraits(['lise']), () => {
    scene.scene.launch(key, { from: scene.scene.key });
    scene.scene.bringToTop(key);
  });
}

// 메뉴 창 공통 바탕
class MenuBase extends Phaser.Scene {
  init(d) { this.from = d && d.from; this.sel = null; this.page = 0; }
  frame(title) {
    this.children.removeAll(true);
    UI.blocker(this, 0.7);
    UI.panel(this, 30, 24, W - 60, H - 48, { alpha: 0.97 });
    UI.text(this, 70, 44, title, 34, '#ffe7a8', { serif: true, st: 6 });
    UI.button(this, W - 90, 66, '닫기', () => this.close(), { w: 120, h: 52, size: 22, col: 0x3a2a1a });
    const s = Save.data;
    UI.text(this, W - 180, 66, `금화 ${s.gold}`, 22, '#ffd34d', { bold: true }).setOrigin(1, 0.5);
    if (!this.escBound) { this.escBound = true; this.input.keyboard.on('keydown-ESC', () => this.close()); }
  }
  close() {
    Save.write();
    this.scene.stop();
    const f = this.from && this.scene.get(this.from);
    if (f && f.drawHud) f.drawHud();
  }
  statsText(st) {
    return [
      `전투력 ${st.power}`,
      `공격력 ${st.atk}`, `방어력 ${st.def}  (받는 피해 -${Math.round(st.red * 100)}%)`, `최대 체력 ${st.hp}`,
      `치명타 ${st.crit + st.critDmg * 0 }% · 피해 +${st.critDmg}%`,
      ...Object.entries({ vsBoss: '보스 피해', vsDown: '다운 피해', vsAir: '띄운 적 피해', leech: '처치 회복', goldPct: '금화', expPct: '경험치', awkPct: '각성 충전', spd: '이동 속도' })
        .filter(([k]) => st[k]).map(([k, n]) => `${n} +${st[k]}%`),
      ...Object.entries(st.sets).map(([n, c]) => `세트 「${n}」 ${c}조각`),
    ].join('\n');
  }
  itemDetail(it, x, y, w) {
    const out = [];
    const r = RARITY[it.rar];
    out.push(UI.text(this, x, y, itemLabel(it), 26, r.col, { bold: true, wrap: w }));
    const slotKo = it.cls === 'acc' ? (it.kind === 'ring' ? '반지' : '목걸이') : SLOT_KO[it.slot];
    const owner = it.cls === 'acc' ? '공용' : DB.heroes[it.cls].name;
    out.push(UI.text(this, x, y + 38, `${r.ko} ${slotKo} · ${owner} · T${it.tier + 1}`, 18, '#c8b8a0'));
    let yy = y + 68;
    if (it.base) { out.push(UI.text(this, x, yy, `${it.slot === 'weapon' ? '공격력' : '방어력'} +${itemPower(it)}${it.slot === 'body' ? `  · 체력 +${itemPower(it) * 3}` : ''}`, 21, '#fff')); yy += 32; }
    for (const a of it.aff) { out.push(UI.text(this, x, yy, '· ' + affText(a), 19, '#9ae0ff')); yy += 27; }
    if (it.fx) { out.push(UI.text(this, x, yy, '★ ' + it.fx, 19, '#ffb060', { wrap: w })); yy += 50; }
    if (it.set) {
      const S = it.cls === 'acc' ? DB.accessory.sets.find(x => x.name === it.set) : DB.gear[it.cls].set;
      out.push(UI.text(this, x, yy, `세트 「${it.set}」\n2조각: ${S.two}${S.four ? '\n4조각: ' + S.four : ''}`, 17, '#5ae8d0', { wrap: w })); yy += 80;
    }
    return { objs: out, y: yy };
  }
}

// ---------------- 가방 (장비) ----------------
class Bag extends MenuBase {
  constructor() { super('bag'); }
  create() { this.draw(); }
  list() {
    const s = Save.data, eq = Object.values(s.eq);
    return s.bag.filter(i => !eq.includes(i.id) && (this.all || i.cls === s.hero || i.cls === 'acc'))
      .sort((a, b) => b.rar - a.rar || b.tier - a.tier || b.id - a.id);
  }
  draw() {
    const s = Save.data;
    this.frame('가방 · 장비');
    // 장착 칸
    SLOTS.forEach((slot, i) => {
      const x = 110 + (i % 3) * 104, y = 170 + Math.floor(i / 3) * 124;
      const it = s.eq[slot] && itemById(s, s.eq[slot]);
      UI.itemSlot(this, x, y, it, 88, () => { if (it) { this.sel = it; this.draw(); } });
      UI.text(this, x, y + 50, SLOT_KO[slot], 16, '#c8b8a0').setOrigin(0.5, 0);
    });
    const st = heroStats(s);
    UI.text(this, 64, 420, this.statsText(st), 19, '#f4e4c0', { ls: 7 });
    // 가방 칸
    const items = this.list(), per = 24, pages = Math.max(1, Math.ceil(items.length / per));
    this.page = Math.min(this.page, pages - 1);
    UI.text(this, 420, 100, `가방 ${s.bag.length - Object.keys(s.eq).length}칸`, 20, '#c8b8a0');
    UI.button(this, 690, 100, this.all ? '모든 직업' : '이 직업만', () => { this.all = !this.all; this.draw(); }, { w: 150, h: 40, size: 17, col: 0x3a2a1a });
    items.slice(this.page * per, this.page * per + per).forEach((it, i) => {
      const x = 460 + (i % 6) * 92, y = 175 + Math.floor(i / 6) * 96;
      const c = UI.itemSlot(this, x, y, it, 80, () => { this.sel = it; this.draw(); });
      if (this.sel === it) c.add(this.add.rectangle(0, 0, 86, 86).setStrokeStyle(3, 0xffffff));
    });
    if (!items.length) UI.text(this, 600, 300, '가방이 비었어요', 22, '#8a7a68').setOrigin(0.5);
    if (pages > 1) {
      UI.button(this, 560, 560, '◀', () => { this.page = (this.page + pages - 1) % pages; this.draw(); }, { w: 70, h: 46, size: 22, col: 0x3a2a1a });
      UI.text(this, 640, 560, `${this.page + 1}/${pages}`, 20, '#fff').setOrigin(0.5);
      UI.button(this, 720, 560, '▶', () => { this.page = (this.page + 1) % pages; this.draw(); }, { w: 70, h: 46, size: 22, col: 0x3a2a1a });
    }
    // 고른 아이템
    UI.panel(this, 1000, 110, 230, 560, { alpha: 0.6, line: 0x7a5a30 });
    if (this.sel && s.bag.includes(this.sel)) {
      const it = this.sel;
      const { y } = this.itemDetail(it, 1014, 124, 204);
      const eqSlot = Object.keys(s.eq).find(k => s.eq[k] === it.id);
      const canEq = it.cls === 'acc' || it.cls === s.hero;
      if (eqSlot) UI.button(this, 1115, 600, '해제', () => { delete s.eq[eqSlot]; Save.write(); this.draw(); }, { w: 190, h: 54, size: 22, col: 0x3a2a1a });
      else if (canEq) {
        const cur = this.targetSlot(it), curIt = s.eq[cur] && itemById(s, s.eq[cur]);
        if (curIt) UI.text(this, 1014, Math.min(y + 6, 520), `지금: ${itemLabel(curIt)}\n전투력 ${this.powerDiff(it, cur)}`, 16, '#c8b8a0', { wrap: 204 });
        UI.button(this, 1115, 600, '장착', () => { s.eq[cur] = it.id; Save.write(); SFX.ui('ui_equip'); this.draw(); }, { w: 190, h: 54, size: 22 });
      } else UI.text(this, 1014, 560, `${DB.heroes[it.cls].name} 전용`, 18, '#ff9a8a');
    } else UI.text(this, 1115, 380, '아이템을\n누르면\n자세히 보여요', 20, '#8a7a68', { align: 'center' }).setOrigin(0.5);
  }
  targetSlot(it) {
    const s = Save.data;
    if (it.cls !== 'acc') return it.slot;
    if (!s.eq.acc1) return 'acc1';
    if (!s.eq.acc2) return 'acc2';
    const a = itemById(s, s.eq.acc1), b = itemById(s, s.eq.acc2);
    return (a.rar + a.plus * 0.1) <= (b.rar + b.plus * 0.1) ? 'acc1' : 'acc2';
  }
  powerDiff(it, slot) {
    const s = Save.data, before = heroStats(s).power, keep = s.eq[slot];
    s.eq[slot] = it.id; const after = heroStats(s).power;
    if (keep) s.eq[slot] = keep; else delete s.eq[slot];
    const d = after - before;
    return (d >= 0 ? '+' : '') + d;
  }
}

// ---------------- 대장간 (타벨) ----------------
class Smithy extends MenuBase {
  constructor() { super('smithy'); }
  create() { this.draw(); }
  draw() {
    const s = Save.data;
    this.frame('대장간 · 타벨');
    const mats = Object.entries(MATS).map(([k, n]) => `${n} ${s.mats[k] || 0}`).join('   ');
    UI.text(this, 70, 96, mats, 19, '#d8c8ff');
    const eqIds = Object.values(s.eq);
    const items = [...s.bag].sort((a, b) => (eqIds.includes(b.id) - eqIds.includes(a.id)) || b.rar - a.rar || b.id - a.id);
    const per = 30, pages = Math.max(1, Math.ceil(items.length / per));
    this.page = Math.min(this.page, pages - 1);
    items.slice(this.page * per, this.page * per + per).forEach((it, i) => {
      const x = 100 + (i % 6) * 96, y = 180 + Math.floor(i / 6) * 96;
      const c = UI.itemSlot(this, x, y, it, 82, () => { this.sel = it; this.draw(); });
      if (eqIds.includes(it.id)) c.add(UI.text(this, -36, 26, 'E', 16, '#ffe27a', { bold: true }));
      if (this.sel === it) c.add(this.add.rectangle(0, 0, 88, 88).setStrokeStyle(3, 0xffffff));
    });
    if (pages > 1) {
      UI.button(this, 240, 660, '◀', () => { this.page = (this.page + pages - 1) % pages; this.draw(); }, { w: 70, h: 44, size: 22, col: 0x3a2a1a });
      UI.text(this, 330, 660, `${this.page + 1}/${pages}`, 20, '#fff').setOrigin(0.5);
      UI.button(this, 420, 660, '▶', () => { this.page = (this.page + 1) % pages; this.draw(); }, { w: 70, h: 44, size: 22, col: 0x3a2a1a });
    }
    UI.button(this, 640, 660, '일반·고급 모두 분해', () => {
      let n = 0;
      for (const it of [...s.bag]) if (it.rar <= 1 && !eqIds.includes(it.id) && dismantle(s, it)) n++;
      UI.toast(this, n ? `${n}개를 분해했어요` : '분해할 장비가 없어요'); this.sel = null; Save.write(); this.draw();
    }, { w: 300, h: 50, size: 20, col: 0x4a2a14 });
    UI.panel(this, 700, 110, 520, 520, { alpha: 0.6, line: 0x7a5a30 });
    const it = this.sel && s.bag.includes(this.sel) ? this.sel : null;
    if (!it) { UI.text(this, 960, 360, '손볼 장비를 고르게.\n강화는 실패해도 부서지지 않아.', 22, '#c8b8a0', { align: 'center' }).setOrigin(0.5); return; }
    const { y } = this.itemDetail(it, 720, 124, 480);
    // 강화
    const c = enhanceCost(it), rate = enhanceRate(it);
    const yy = Math.max(y + 10, 380);
    if (it.plus < 10) {
      UI.text(this, 720, yy, `강화 +${it.plus} → +${it.plus + 1}   성공 ${rate}%\n비용: 금화 ${c.gold}, ${MATS[c.mat]} ${c.cnt}`, 19, '#fff');
      UI.button(this, 1110, yy + 26, '강화', () => {
        const r = tryEnhance(s, it);
        UI.toast(this, { ok: `강화 성공! +${it.plus}`, fail: '강화 실패… (장비는 무사해요)', cost: '재료가 모자라요', max: '최대 강화' }[r], r === 'ok' ? '#ffe27a' : '#ff9a8a');
        if (r === 'ok') SFX.parry(); else SFX.guard();
        if (r === 'ok' && it.plus >= 10) { Codex.init(s); s.stats.enh10++; Codex.check(s).forEach(x => UI.toast(this, `업적 달성! 「${x.ko}」`, '#ffe27a', 600)); }
        Save.write(); this.draw();
      }, { w: 150, h: 52, size: 22 });
    } else UI.text(this, 720, yy, '최대 강화 (+10)', 20, '#ffe27a');
    // 옵션 재설정
    const rc = rerollCost(it);
    it.aff.forEach((a, k) => {
      UI.button(this, 790, yy + 92 + k * 46, '재설정', () => {
        if (reroll(s, it, k)) { UI.toast(this, '새 옵션: ' + affText(it.aff[k]), '#9ae0ff'); SFX.coin(); } else UI.toast(this, '재료가 모자라요', '#ff9a8a');
        Save.write(); this.draw();
      }, { w: 120, h: 40, size: 17, col: 0x2a3a5a });
      UI.text(this, 860, yy + 92 + k * 46, affText(a), 17, '#9ae0ff').setOrigin(0, 0.5);
    });
    if (it.aff.length) UI.text(this, 720, yy + 62, `옵션 하나 재설정: 금화 ${rc.gold}, ${MATS[rc.mat]} ${rc.cnt}`, 16, '#c8b8a0');
    // 분해
    if (!eqIds.includes(it.id)) UI.button(this, 1110, 590, '분해', () => {
      const r = dismantle(s, it);
      if (r) { UI.toast(this, `${MATS[r.m]} +${r.n}`, '#d8c8ff'); SFX.brk(640); }
      this.sel = null; Save.write(); this.draw();
    }, { w: 150, h: 50, size: 22, col: 0x5a2a2a });
  }
}

// ---------------- 상점 (행상인) ----------------
class Shop extends MenuBase {
  constructor() { super('shop'); }
  create() {
    const s = Save.data;
    // 장마다 장비 4개를 새로 들여온다
    if (!s.shop || s.shop.ch !== s.ch || !s.shop.stock) {
      s.shop = { ch: s.ch, stock: [] };
      for (let i = 0; i < 4; i++) {
        const it = rollDrop(s, s.ch, 1);
        s.bag = s.bag.filter(x => x !== it);
        s.shop.stock.push(it);
      }
      Save.write();
    }
    this.draw();
  }
  price(it) { return Math.round((40 + it.tier * 60) * [1, 1.6, 2.6, 4.2, 9, 8][it.rar]); }
  draw() {
    const s = Save.data;
    this.frame('포포 상회');
    // ✏️ 소모품 14종을 2열로. 아이콘을 누르면 벨트 4칸 중 하나로 넣는다 (부활 깃털은 벨트 없이 자동)
    UI.text(this, 70, 96, '소모품', 24, '#ffe7a8', { bold: true });
    const slots = [...beltSlots(s)];
    UI.text(this, 190, 102, '벨트', 17, '#c8b8a0');
    slots.forEach((k, i) => {
      const x = 260 + i * 62, y = 108;
      UI.panel(this, x - 26, y - 26, 52, 52, { alpha: 0.75, line: i === (s.beltNext || 0) % 4 ? 0xffd34d : 0x7a5a30, inner: false });
      const ic = UI.img(this, x, y, 'icon/' + (BELT[k] ? BELT[k].icon : k)); if (ic) ic.setScale(42 / ic.height);
    });
    UI.text(this, 486, 106, '아이콘을 누르면 벨트 장착', 13, '#8f8070');
    Object.entries(BELT).forEach(([k, b], i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x0 = 60 + col * 286, y = 176 + row * 70;
      const inBelt = slots.includes(k);
      UI.panel(this, x0, y - 31, 278, 64, { alpha: 0.6, line: inBelt ? 0xffd34d : 0x7a5a30, inner: false });
      const ic = UI.img(this, x0 + 32, y + 1, 'icon/' + b.icon) || UI.img(this, x0 + 32, y + 1, 'icon/' + k);
      if (ic) {
        ic.setScale(48 / ic.height);
        if (k !== 'feather') ic.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          if (inBelt) return UI.toast(this, '이미 벨트에 있어요');
          const n = (s.beltNext || 0) % 4; slots[n] = k; s.beltSlots = slots; s.beltNext = n + 1;
          SFX.ui && SFX.ui('ui_equip'); Save.write(); UI.toast(this, `벨트 ${n + 1}번 칸에 「${b.ko}」`); this.draw();
        });
      }
      UI.text(this, x0 + 64, y - 25, `${b.ko} ×${s.belt[k] || 0}`, 17, '#fff', { bold: true });
      UI.text(this, x0 + 64, y - 2, b.fx, 13, '#c8b8a0', { wrap: 140 });
      UI.button(this, x0 + 236, y + 1, `${b.price}`, () => {
        if (s.gold < b.price) return UI.toast(this, '금화가 모자라요', '#ff9a8a');
        if (k === 'feather' && (s.belt.feather || 0) >= 3) return UI.toast(this, '부활 깃털은 3개까지', '#ff9a8a');
        if ((s.belt[k] || 0) >= 9) return UI.toast(this, '9개까지 가질 수 있어요', '#ff9a8a');
        s.gold -= b.price; s.belt[k] = (s.belt[k] || 0) + 1; SFX.coin(); Save.write(); this.draw();
      }, { w: 70, h: 44, size: 17 });
    });
    UI.text(this, 680, 100, '오늘의 장비', 24, '#ffe7a8', { bold: true });
    s.shop.stock.forEach((it, i) => {
      const y = 190 + i * 118;
      UI.panel(this, 670, y - 50, 540, 104, { alpha: 0.6, line: 0x7a5a30, inner: false });
      UI.itemSlot(this, 726, y + 2, it, 84);
      UI.text(this, 780, y - 40, itemLabel(it), 21, RARITY[it.rar].col, { bold: true });
      const owner = it.cls === 'acc' ? '공용 장신구' : `${DB.heroes[it.cls].name} ${SLOT_KO[it.slot]}`;
      UI.text(this, 780, y - 10, `${owner} · ${it.slot === 'weapon' ? '공격' : '방어'} +${itemPower(it)}`, 17, '#c8b8a0');
      UI.text(this, 780, y + 14, it.aff.map(affText).join(', '), 15, '#9ae0ff', { wrap: 270 });
      const p = this.price(it);
      UI.button(this, 1140, y + 2, `${p}금`, () => {
        if (s.gold < p) return UI.toast(this, '금화가 모자라요', '#ff9a8a');
        s.gold -= p; s.bag.push(it); s.shop.stock.splice(i, 1); SFX.coin(); Save.write(); UI.toast(this, `「${it.name}」을 샀어요`); this.draw();
      }, { w: 120, h: 48, size: 20 });
    });
    if (!s.shop.stock.length) UI.text(this, 940, 300, '다 팔렸소! 다음 장에서 또 보세.', 22, '#c8b8a0').setOrigin(0.5);
  }
}

// ---------------- 마법 천막 (스킬) ----------------
class Skills extends MenuBase {
  constructor() { super('skills'); }
  create() { this.draw(); }
  draw() {
    const s = Save.data, sk = DB.skills[s.hero];
    this.frame('마법 천막 · 스킬');
    UI.text(this, 400, 66, `스킬 포인트 ${s.sp}`, 24, '#9ae0ff', { bold: true }).setOrigin(0, 0.5);
    sk.branches.forEach((b, bi) => {
      const x = 130 + bi * 210;
      UI.text(this, x, 110, b, 24, '#ffe7a8', { bold: true }).setOrigin(0.5);
      for (let r = 0; r < 5; r++) {
        const i = bi * 5 + r, info = sk.list[i];
        const learned = !!s.skills[i], avail = r === 0 || s.skills[i - 1];
        const y = 170 + r * 100;
        const c = this.add.container(x, y);
        const g = this.add.graphics();
        g.fillStyle(learned ? 0x3a2a10 : 0x140c08, 1).fillRoundedRect(-40, -40, 80, 80, 12);
        g.lineStyle(learned ? 4 : 2, learned ? 0xffd34d : avail ? 0x8a7a68 : 0x3a3028).strokeRoundedRect(-40, -40, 80, 80, 12);
        c.add(g);
        const ic = UI.img(this, 0, 0, `icon/skill_${s.hero}_${i}`);
        if (ic) { ic.setScale(70 / ic.height); if (!learned) ic.setTint(avail ? 0x9a9a9a : 0x404040); c.add(ic); }
        c.add(UI.text(this, 0, 44, info.name, 15, learned ? '#ffe7a8' : '#a89a88', { align: 'center' }).setOrigin(0.5, 0));
        if (this.sel === i) c.add(this.add.rectangle(0, 0, 88, 88).setStrokeStyle(3, 0xffffff));
        if (r < 4) { const ln = this.add.rectangle(x, y + 60, 4, 16, s.skills[i] ? 0xffd34d : 0x3a3028); ln.setDepth(-1); }
        c.setSize(80, 80).setInteractive({ useHandCursor: true }).on('pointerup', () => { this.sel = i; SFX.go(); this.draw(); });
      }
    });
    // 각성기
    const aw = sk.list[15];
    UI.text(this, 740, 110, '각성기', 24, '#ffe7a8', { bold: true }).setOrigin(0.5);
    const ai = UI.img(this, 740, 180, `icon/skill_${s.hero}_15`); if (ai) ai.setScale(80 / ai.height);
    UI.text(this, 740, 232, aw.name, 18, '#ffd34d').setOrigin(0.5, 0);
    // 장착한 액티브
    UI.text(this, 740, 300, '스킬 버튼 2칸', 20, '#ffe7a8', { bold: true }).setOrigin(0.5);
    s.active.forEach((a, k) => {
      const x = 690 + k * 100;
      UI.panel(this, x - 40, 330, 80, 80, { alpha: 0.8, inner: false, r: 10 });
      if (a !== null && a !== undefined) { const im = UI.img(this, x, 370, `icon/skill_${s.hero}_${a}`); if (im) im.setScale(70 / im.height); }
      UI.text(this, x, 418, '스킬 ' + (k + 1), 16, '#c8b8a0').setOrigin(0.5, 0);
    });
    // 고른 스킬 설명
    UI.panel(this, 850, 110, 380, 440, { alpha: 0.6, line: 0x7a5a30 });
    if (this.sel !== null && this.sel !== undefined) {
      const i = this.sel, info = sk.list[i], learned = !!s.skills[i];
      const r = i % 5, avail = r === 0 || s.skills[i - 1];
      UI.text(this, 870, 128, info.name, 26, '#ffe7a8', { bold: true });
      UI.text(this, 870, 166, `${sk.branches[Math.floor(i / 5)]} · ${info.kind}`, 17, '#c8b8a0');
      UI.text(this, 870, 200, info.fx, 20, '#fff', { wrap: 340 });
      if (!learned) UI.button(this, 1040, 470, avail ? '배우기 (SP 1)' : '앞 단계 먼저', () => {
        if (!avail || s.sp < 1) return UI.toast(this, s.sp < 1 ? '스킬 포인트가 없어요' : '앞 단계를 먼저 배워요', '#ff9a8a');
        s.sp--; s.skills[i] = true; SFX.heal(); Save.write(); this.draw();
      }, { w: 260, h: 56, size: 22, disabled: !avail || s.sp < 1 });
      else if (info.kind === '액티브') {
        [0, 1].forEach(k => UI.button(this, 960 + k * 150, 470, `${k + 1}번에 장착`, () => {
          s.active = s.active.map(a => (a === i ? null : a)); s.active[k] = i; Save.write(); this.draw();
        }, { w: 140, h: 52, size: 19 }));
      } else UI.text(this, 870, 460, '배운 패시브는 바로 적용돼요', 18, '#9ae07a');
    } else UI.text(this, 1040, 330, '스킬을 누르면\n설명이 보여요', 22, '#8a7a68', { align: 'center' }).setOrigin(0.5);
    // 초기화
    const cost = 50 * s.lv;
    UI.button(this, 1040, 610, `초기화 ${cost}금`, () => {
      const n = Object.keys(s.skills).length;
      if (!n) return;
      if (s.gold < cost) return UI.toast(this, '금화가 모자라요', '#ff9a8a');
      s.gold -= cost; s.sp += n; s.skills = {}; s.active = [null, null]; Save.write(); this.draw();
    }, { w: 260, h: 50, size: 20, col: 0x4a2a14 });
    UI.button(this, 740, 520, '할멈과 이야기', () => runTalk(this, 'camp_fortune'), { w: 200, h: 50, size: 19, col: 0x3a2a1a });
  }
}

// ---------------- 리세 (월석, 이야기) ----------------
class LiseMenu extends MenuBase {
  constructor() { super('lise'); }
  create() { this.draw(); }
  draw() {
    const s = Save.data;
    this.frame('리세 · 월석');
    const p = UI.img(this, 230, 640, 'portrait/lise');
    if (p) p.setOrigin(0.5, 1).setScale(500 / p.height);
    const keys = ['red', 'white', 'yellow', 'blue', 'silver', 'green'];
    UI.text(this, 520, 120, '여섯 달의 월석', 28, '#ffe7a8', { bold: true });
    keys.forEach((k, i) => {
      const x = 560 + (i % 3) * 200, y = 230 + Math.floor(i / 3) * 170;
      const has = !!s.moons[k];
      this.add.circle(x, y, 58, 0x0e0805).setStrokeStyle(3, has ? MOONS[k].col : 0x3a3028);
      const im = UI.img(this, x, y, 'icon/moon_' + k);
      if (im) { im.setScale(96 / im.height); if (!has) im.setTint(0x202020).setAlpha(0.6); }
      UI.text(this, x, y + 66, has ? MOONS[k].ko : '???', 20, has ? '#fff' : '#6a5a48', { bold: true }).setOrigin(0.5, 0);
    });
    UI.text(this, 520, 560, `리세와의 신뢰 ${'♥'.repeat(Math.min(3, s.lise))}${'♡'.repeat(Math.max(0, 3 - s.lise))}`, 22, '#ff9ab0');
    UI.button(this, 1040, 600, '이야기하기', () => runTalk(this, `camp_lise_${Math.min(6, s.ch)}`), { w: 240, h: 60, size: 24 });
  }
}

// ---------------- 엔딩 크레딧 ----------------
class Credits extends Phaser.Scene {
  constructor() { super('credits'); }
  init(d) { this.e = d.e; }
  create() {
    const s = Save.data;
    this.cameras.main.setBackgroundColor('#0a0610');
    const name = { end_seal: '봉인 엔딩', end_true: '진 엔딩', end_dark: '다크 엔딩', end_sacrifice: '희생 엔딩' }[this.e];
    UI.text(this, W / 2, 180, name, 64, '#ffe7a8', { serif: true, st: 8 }).setOrigin(0.5);
    const seen = ['end_seal', 'end_true', 'end_dark', 'end_sacrifice'].filter(k => s.endings[k]).length;
    UI.text(this, W / 2, 300, `${DB.heroes[s.hero].name} Lv.${s.lv} · 월석 ${Object.keys(s.moons).length}/6 · 본 엔딩 ${seen}/4`, 26, '#f4e4c0').setOrigin(0.5);
    UI.text(this, W / 2, 380, '일곱 번째 달 — 끝까지 함께해 주셔서 고마워요\n다른 선택, 다른 길, 다른 직업으로 또 다른 결말을 찾아보세요', 22, '#c8b8a0', { align: 'center' }).setOrigin(0.5);
    UI.button(this, W / 2, 540, '타이틀로', () => this.scene.start('title'), { w: 280, h: 64, size: 26 });
    // 회차: 6장을 다시 열어 다른 엔딩을 볼 수 있게 한다
    s.cleared.c6 = []; s.route.c6 = null; s.flags.void_done = false; s.runs = (s.runs || 1) + 1;
    // 5장 보스를 다시 깨면 오르벡스의 제안을 다시 고를 수 있다
    s.flags.accepted = false; s.flags.refused = false; delete s.seen.c5_choice; delete s.seen.c5_end;
    Save.write();
    SFX.music('bgm_title');
  }
}

// ---------------------------------------------------------------------------
// 심연의 탑 입구
// ---------------------------------------------------------------------------
function towerOpen(s) { return s && (s.ch > 1 || (s.cleared.c1 || []).includes('boss')); }
class TowerGate extends Phaser.Scene {
  constructor() { super('towergate'); }
  preload() { Assets.preloadFor(this, ['bg/abyss_far', 'bg/far']); }
  create() {
    const s = Save.data || Save.load();
    if (!s) { this.scene.start('title'); return; }
    s.tower = s.tower || { best: 0 };
    const bg = UI.img(this, W / 2, H / 2, 'bg/abyss_far') || this.add.image(W / 2, H / 2, 'bg/far');
    bg.setDisplaySize(W, W * bg.height / bg.width);
    this.add.rectangle(0, 0, W, H, 0x0a0614, 0.55).setOrigin(0);
    const ic = UI.img(this, W / 2 - 330, 300, 'icon/tower'); if (ic) ic.setScale(220 / ic.height);
    UI.text(this, W / 2 + 80, 90, '심연의 탑', 72, '#e0c8ff', { serif: true, st: 10 }).setOrigin(0.5);
    UI.text(this, W / 2 + 80, 160, '끝없이 오르는 탑. 층마다 규칙이 바뀌고, 10층마다 강화 보스가 기다린다.\n높이 오를수록 전설과 세트 장비가 잘 나온다.', 20, '#e8dcf8', { align: 'center', ls: 8 }).setOrigin(0.5, 0);
    UI.text(this, W / 2 + 80, 250, `최고 기록  ${s.tower.best}층`, 34, '#ffe27a', { bold: true, st: 6 }).setOrigin(0.5);
    const ally = s.ally && s.ally !== s.hero ? `동료: ${DB.heroes[s.ally].name}` : '동료 없음 (캠프에서 고를 수 있어요)';
    UI.text(this, W / 2 + 80, 296, `${DB.heroes[s.hero].name} Lv.${s.lv} · ${ally}`, 20, '#c8b8e0').setOrigin(0.5);
    const cps = towerCheckpoints(s.tower.best);
    UI.text(this, W / 2 + 80, 350, '시작할 층', 22, '#d8c8ff').setOrigin(0.5);
    cps.slice(-5).forEach((f, i, arr) => {
      const x = W / 2 + 80 + (i - (arr.length - 1) / 2) * 170;
      const fl = towerFloor(f, s.tower.seed || 7);
      UI.button(this, x, 410, `${f}층`, () => this.start(f), { w: 150, h: 60, size: 26, col: 0x4a2a7a });
      UI.text(this, x, 450, fl.rule ? fl.rule.ko.split(' · ')[0] : '규칙 없음', 13, '#b8a8d0', { align: 'center', wrap: 160 }).setOrigin(0.5, 0);
    });
    // 다른 도전
    const dd = dailyDef(s), today = s.daily && s.daily.date === dayKey() && s.daily.done;
    UI.button(this, W / 2 - 120, 545, '오늘의 도전', () => { SFX.music(null, { fade: 0.3 }); this.scene.start('game', { stage: 'daily', ch: dd.chScale, node: 'daily', def: dailyDef(s) }); }, { w: 240, h: 58, size: 22, col: 0x6a4a14 });
    UI.text(this, W / 2 - 120, 580, today ? '오늘 보상 받음' : (dd.rule ? dd.rule.ko.split(' · ')[0] : ''), 13, today ? '#9ae07a' : '#e0c890', { align: 'center', wrap: 240 }).setOrigin(0.5, 0);
    const wk = s.rush && s.rush.week === weekKey() ? s.rush : null;
    UI.button(this, W / 2 + 280, 545, '주간 보스 러시', () => { SFX.music(null, { fade: 0.3 }); const d = rushDef(s); this.scene.start('game', { stage: 'rush', ch: d.chScale, node: 'rush', def: d }); }, { w: 260, h: 58, size: 22, col: 0x6a1a1a });
    UI.text(this, W / 2 + 280, 580, wk && wk.best ? `이번 주 기록 ${fmtTime(wk.best)}` : '이번 주 첫 완주 시 전설 장비', 13, '#e0c890').setOrigin(0.5, 0);
    UI.button(this, W / 2 - 150, 660, '◀ 지도로', () => this.scene.start('map'), { w: 220, h: 50, size: 22, col: 0x3a2a1a });
    UI.button(this, W / 2 + 110, 660, '캠프', () => this.scene.start('camp'), { w: 180, h: 50, size: 22, col: 0x4a2a14 });
    SFX.music('bgm_tower_a'); SFX.ambience('abyss');
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('map'));
  }
  start(f) {
    const s = Save.data, def = towerFloor(f, s.tower.seed || 7);
    SFX.music(null, { fade: 0.3 });
    this.scene.start('game', { stage: 'tower', ch: def.chScale, node: 'tower', def, seed: s.tower.seed || 7 });
  }
}
