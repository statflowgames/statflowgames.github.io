// 🆕 2026-11-25 캠프 미니게임 두 가지
//   1) 떠돌이 상인의 상자 셋 (운 게임): 금화를 내고 섞인 상자 셋 중 하나를 고른다. 하루 3번.
//      확률은 화면에 그대로 보여 준다. 고른 상자만 연다 (다른 상자를 보여 주며 '아깝다'를 노리지 않는다).
//      ✏️ 2026-11-25 사용자 기준: 별것 아닌 것(잡템)은 자주, 꽝은 드물게, 영웅은 적게, 전설 0.3%.
//      운 쌓임: 희귀 미만이 나오면 ★ 하나, ★10개가 모이면 다음 번은 희귀 이상 장비 확정.
//   2) 훈련장 · 화살비 막기: 20초 동안 날아오는 화살을 가드로 막는다. 가드 +1 · 저스트 가드 +3 · 맞으면 하트 -1 (3개).
//      붉은 화살은 강공격이라 저스트 가드로만 막힌다. 보상은 하루 3번까지 (그 뒤는 연습).
//   저장: s.luck = { day, n, stars, plays }, s.drill = { day, n, best }

const LUCK_PER_DAY = 3, LUCK_PITY = 10;
// 확률 (%). 합 100
const LUCK_TABLE = [
  { k: 'gear0', ko: '일반 장비 (잡템 · 팔거나 분해용)', p: 30, rar: 0 },
  { k: 'cons', ko: '소모품 1~2개', p: 20 },
  { k: 'mats', ko: '하급 마석 2~3개', p: 14 },
  { k: 'gear1', ko: '고급 장비', p: 14, rar: 1 },
  { k: 'pile', ko: '금화 더미 (낸 금화의 100~150%)', p: 10 },
  { k: 'gear2', ko: '희귀 장비', p: 7, rar: 2 },
  { k: 'pouch', ko: '꽝 · 작은 금화 주머니 (낸 금화의 30~50%)', p: 3 },
  { k: 'gear3', ko: '영웅 장비', p: 1.7, rar: 3 },
  { k: 'gear4', ko: '전설 장비', p: 0.3, rar: 4 },
];
const campDay = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

const LuckChest = {
  cost(s) { return Math.round(stageIncome(s.ch) * 0.5 / 10) * 10; },
  state(s) {
    s.luck = s.luck || { day: '', n: 0, stars: 0, plays: 0 };
    if (s.luck.day !== campDay()) { s.luck.day = campDay(); s.luck.n = 0; }
    return s.luck;
  },
  roll(s) {
    const L = this.state(s);
    if (L.stars >= LUCK_PITY) return LUCK_TABLE.find(e => e.k === 'gear2');   // 운 쌓임 확정: 희귀
    let r = Math.random() * 100;
    for (const e of LUCK_TABLE) { r -= e.p; if (r < 0) return e; }
    return LUCK_TABLE[0];
  },
  // 결과를 저장에 반영하고 보여 줄 내용을 돌려준다
  give(s, e, cost) {
    const L = this.state(s), out = { e, gold: 0, items: [], cons: [] };
    if (e.k === 'pouch') out.gold = Math.round(cost * (0.3 + Math.random() * 0.2) / 5) * 5;
    else if (e.k === 'pile') out.gold = Math.round(cost * (1.0 + Math.random() * 0.5) / 5) * 5;
    else if (e.k === 'cons') { const ks = Object.keys(BELT).filter(k => k !== 'feather'), n = Math.random() < 0.5 ? 1 : 2; for (let i = 0; i < n; i++) { const k = ks[Math.floor(Math.random() * ks.length)]; s.belt[k] = Math.min(9, (s.belt[k] || 0) + 1); out.cons.push(k); } }
    else if (e.k === 'mats') { out.mats = 2 + (Math.random() < 0.5 ? 1 : 0); s.mats.low = (s.mats.low || 0) + out.mats; }
    else { const it = rollDrop(s, s.ch, 0, false, e.rar); if (e.rar === 0 && it.rar > 0) it.rar = 0; out.items.push(it); }   // rollDrop이 가방에 넣는다 (잡템은 일반 그대로)
    s.gold += out.gold;
    if ((e.rar || 0) >= 2) L.stars = 0; else L.stars = Math.min(LUCK_PITY, L.stars + 1);   // 희귀 이상이 나오면 운 쌓임 초기화
    L.plays = (L.plays || 0) + 1;
    return out;
  },
  open(scene) {
    const s = Save.data; if (!s) return;
    const D = 9500, c = scene.add.container(0, 0).setDepth(D).setScrollFactor(0);
    const close = () => { c.destroy(); if (scene.drawHud) scene.drawHud(); };
    if (typeof AppLife !== 'undefined') AppLife.modal(scene, c, close);
    c.add(UI.blocker(scene, 0.88));
    c.add(UI.panel(scene, W / 2 - 520, 40, 1040, 640));
    c.add(UI.text(scene, W / 2, 78, '떠돌이 상인의 상자 셋', 40, '#ffe7a8', { serif: true, st: 7 }).setOrigin(0.5));
    const sub = UI.text(scene, W / 2, 124, '', 20, '#e8dcc8').setOrigin(0.5); c.add(sub);
    // 확률표 (늘 보인다)
    c.add(UI.text(scene, 110, 170, '확률 (상자마다 같아요)', 20, '#ffd38a', { bold: true }));
    LUCK_TABLE.forEach((e, i) => c.add(UI.text(scene, 110, 202 + i * 29, `${e.p}%  ·  ${e.ko}`, 17, e.rar >= 4 ? '#ffb060' : e.rar >= 3 ? '#ff80c0' : e.rar >= 2 ? '#c8a0ff' : e.rar ? '#8ad0ff' : '#e8dcc8')));
    c.add(UI.text(scene, 110, 478, `운 쌓임: 희귀 미만이면 ★ +1 · ★${LUCK_PITY}개면 다음은 희귀 장비 확정`, 16, '#d8c8ff', { wrap: 420 }));
    const stars = UI.text(scene, 110, 508, '', 22, '#ffd34d'); c.add(stars);
    // 상자 셋
    const X = [620, 800, 980], Y = 360, chests = X.map((x, i) => {
      const im = scene.add.image(x, Y, 'chest/iron_closed').setScale(150 / 256).setInteractive({ useHandCursor: true });
      im.setDisplaySize(150, 150 * im.height / im.width);
      c.add(im); return im;
    });
    const info = UI.text(scene, 800, 470, '', 24, '#fff4d8', { align: 'center', wrap: 520 }).setOrigin(0.5, 0); c.add(info);
    let phase = 'pay', busy = false;
    const refresh = () => {
      const L = this.state(s), left = LUCK_PER_DAY - L.n, cost = this.cost(s);
      sub.setText(`한 번에 금화 ${cost}  ·  오늘 남은 횟수 ${Math.max(0, left)}/${LUCK_PER_DAY}  ·  가진 금화 ${s.gold}`);
      stars.setText('★'.repeat(L.stars) + '☆'.repeat(LUCK_PITY - L.stars));
      payBtn.setVisible(phase === 'pay');
      if (phase === 'pay') info.setText(left <= 0 ? '오늘은 상자가 다 떨어졌어요. 내일 다시 와요!' : s.gold < cost ? '금화가 모자라요' : '');
    };
    const payBtn = UI.button(scene, 800, 560, '금화 내고 섞기', () => {
      if (busy) return;
      const L = this.state(s), cost = this.cost(s);
      if (L.n >= LUCK_PER_DAY || s.gold < cost) { SFX.ui && SFX.ui('error'); return refresh(); }
      s.gold -= cost; L.n++; Save.write(); busy = true; phase = 'shuffle'; refresh(); info.setText('섞는 중…');
      SFX.ui && SFX.ui('chest_open');
      // 섞기: 자리를 몇 번 맞바꾼다 (모두 같은 상자라 어느 것을 골라도 확률은 같다)
      let t = 0;
      for (let i = 0; i < 6; i++) {
        const a = i % 3, b = (i + 1) % 3;
        scene.time.delayedCall(t, () => {
          scene.tweens.add({ targets: chests[a], x: chests[b].x, y: Y - 30, duration: 160, yoyo: false, onComplete: () => chests[a].setY(Y) });
          scene.tweens.add({ targets: chests[b], x: chests[a].x, y: Y + 20, duration: 160, onComplete: () => chests[b].setY(Y) });
          SFX.roll && SFX.roll();
        });
        t += 190;
      }
      scene.time.delayedCall(t + 120, () => { busy = false; phase = 'pick'; info.setText('상자 하나를 고르세요'); chests.forEach(ch => scene.tweens.add({ targets: ch, scale: ch.scale * 1.05, duration: 300, yoyo: true, repeat: 1 })); });
    }, { w: 300, h: 60, size: 24, col: 0x8a5a1a });
    c.add(payBtn);
    chests.forEach(ch => ch.on('pointerup', () => {
      if (phase !== 'pick' || busy) return;
      busy = true; phase = 'open';
      const e = this.roll(s), res = this.give(s, e, this.cost(s)); Save.write();
      chests.forEach(o => { if (o !== ch) scene.tweens.add({ targets: o, alpha: 0.25, duration: 200 }); });
      scene.tweens.add({ targets: ch, angle: { from: -6, to: 6 }, duration: 70, yoyo: true, repeat: 4, onComplete: () => {
        ch.setAngle(0).setTexture(e.rar >= 2 ? 'chest/gold_open' : e.k === 'pouch' ? 'chest/wood_open' : 'chest/iron_open');
        const big = e.rar >= 2;
        if (big) { scene.cameras.main.flash(200, 255, 230, 150); SFX.jingle && SFX.jingle('jgl_rank_s'); } else SFX.ui && SFX.ui('chest_open');
        let txt = e.ko.split(' (')[0];
        if (res.gold) txt += `  ·  금화 +${res.gold}`;
        if (res.cons.length) txt += '  ·  ' + res.cons.map(k => BELT[k].ko).join(', ');
        if (res.mats) txt += `  ·  하급 마석 +${res.mats}`;
        info.setText(txt).setColor(e.rar >= 2 ? '#c8a0ff' : e.rar ? '#8ad0ff' : '#fff4d8');
        if (res.items[0]) { const sl = UI.itemSlot(scene, ch.x, Y - 140, res.items[0], 84); sl.setScrollFactor(0); c.add(sl); res.slot = sl; }
        scene.time.delayedCall(1500, () => {
          busy = false; phase = 'pay';
          chests.forEach((o, i) => { o.setTexture('chest/iron_closed').setAlpha(1).setPosition(X[i], Y); });
          if (res.slot) res.slot.destroy();
          refresh();
        });
        refresh(); payBtn.setVisible(false);
      } });
    }));
    c.add(UI.button(scene, W / 2 + 430, 78, '닫기', close, { w: 130, h: 50, size: 22, col: 0x3a2a1a }));
    c.each(o => o.setScrollFactor && o.setScrollFactor(0));
    refresh();
  },
};

// ---------------------------------------------------------------------------
// 훈련장 · 화살비 막기 (Game 장면을 mode 'drill'로 연다)
// ---------------------------------------------------------------------------
const DRILL_DEF = { name: '화살비 막기', theme: 'forest', mode: 'drill', waves: [['grunt']], drill: true };   // ✏️ 숲 가도 (마을 배경은 불타는 마을이라)
const DRILL_MS = 20000, DRILL_PER_DAY = 3;
const Drill = {
  state(s) {
    s.drill = s.drill || { day: '', n: 0, best: 0 };
    if (s.drill.day !== campDay()) { s.drill.day = campDay(); s.drill.n = 0; }
    return s.drill;
  },
  start(scene) { scene.scene.start('game', { stage: 'drill', ch: Save.data.ch || 1, node: 'drill', def: DRILL_DEF }); },
  // Game.create 끝에서
  setup(sc) {
    if (!sc.def.drill) return;
    sc.waveIdx = 999; sc.lock = null;
    for (const pr of sc.props) for (const o of [pr.img, pr.sh, pr.star]) if (o && o.scene) o.destroy();   // 통·상자·숨은 보물은 치운다
    sc.props = [];
    const h = sc.hero; h.x = 520; h.y = 590; h.face = 1;
    sc.cameras.main.scrollX = 0; sc.bounds = { l: 120, r: W - 120 };
    sc.drill = { t: 0, next: 1600, score: 0, hearts: 3, guard: 0, parry: 0, hit: 0, arrows: [], done: false };
    // 맞은 결과를 알기 위해 takeHit 결과를 붙잡는다
    const orig = h.takeHit.bind(h);
    h.takeHit = (...a) => (sc.drill.last = orig(...a));
    sc.drill.ui = sc.add.text(W / 2, 112, '', { fontFamily: 'serif', fontSize: 30, color: '#ffe7a8', stroke: '#2a1206', strokeThickness: 7, align: 'center' }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(6900);
    sc.time.delayedCall(900, () => UI.toast(sc, '화살이 오는 쪽을 보고 가드! 맞는 순간 누르면 저스트 가드 +3 · 붉은 화살은 저스트 가드로만', '#ffe7a8', 640));
  },
  // 화살 하나: side 1 = 오른쪽에서, -1 = 왼쪽에서
  fire(sc, side, red) {
    const h = sc.hero, y = Phaser.Math.Clamp(h.y + Phaser.Math.Between(-10, 10), FLOOR_TOP + 20, FLOOR_BOT - 20);
    const cam = sc.cameras.main, x0 = side > 0 ? cam.scrollX + W + 40 : cam.scrollX - 40;
    // 0.55초 먼저 화면 끝에 '!' 예고
    const warn = sc.add.text(side > 0 ? W - 40 : 40, y - 120, '!', { fontFamily: 'serif', fontSize: 46, color: red ? '#ff5040' : '#ffe7a8', stroke: '#000', strokeThickness: 7 }).setOrigin(0.5).setScrollFactor(0).setDepth(6800);
    sc.tweens.add({ targets: warn, alpha: { from: 1, to: 0.2 }, duration: 140, yoyo: true, repeat: 1, onComplete: () => warn.destroy() });
    sc.time.delayedCall(550, () => {
      if (!sc.drill || sc.drill.done) return;
      const img = sc.add.image(x0, y - 120, 'fx/arrow_trail').setScale(red ? 0.42 : 0.32).setFlipX(side > 0).setDepth(1000 + y + 2).setBlendMode(Phaser.BlendModes.ADD);
      if (red) img.setTint(0xff4030);
      sc.drill.arrows.push({ img, x: x0, y, vx: -side * (red ? 760 : 900), red, dead: false });
    });
  },
  update(sc, dt) {
    const D = sc.drill; if (!D || D.done) return;
    const h = sc.hero; D.t += dt;
    if (h.hp < h.maxHp) h.hp = h.maxHp;   // 체력은 깎이지 않는다 (하트로 센다)
    // 화살 만들기: 점점 빨라지고, 8초부터 양쪽, 12초부터 붉은 화살, 15초부터 두 발씩
    D.next -= dt;
    if (D.t < DRILL_MS - 600 && D.next <= 0) {
      const k = D.t / DRILL_MS;
      D.next = 950 - 480 * k;
      const side = D.t > 8000 && Math.random() < 0.4 ? -1 : 1;
      const red = D.t > 12000 && Math.random() < 0.22;
      this.fire(sc, side, red);
      if (D.t > 15000 && Math.random() < 0.45) sc.time.delayedCall(260, () => this.fire(sc, side, false));
    }
    // 화살 움직임·맞음
    const s = dt / 1000, src = { x: 0, y: 0, face: 1, def: { role: 'ranged' }, height: 0 };
    for (const a of D.arrows) {
      if (a.dead) continue;
      a.x += a.vx * s; a.img.setPosition(a.x, a.y - 120);
      if (Math.abs(a.x - h.x) < 40 && Math.abs(a.y - h.y) < 30 && h.z < 120) {
        a.dead = true; a.img.destroy();
        src.x = a.x + Math.sign(a.vx) * -60; src.y = a.y; src.face = Math.sign(a.vx) || 1;
        D.last = null;
        sc.resolveHeroHit(src, 1, a.red ? 'crit' : 'light', a.x, a.y);
        const r = D.last;
        if (r === 'parry') { D.score += 3; D.parry++; sc.floatText(h.x, h.y - 300, '+3', '#ffd34d', 34); }
        else if (r === 'guard') { D.score += 1; D.guard++; sc.floatText(h.x, h.y - 300, '+1', '#fff4d8', 28); }
        else if (r === 'hit') { D.hearts--; D.hit++; sc.floatText(h.x, h.y - 300, '♥ -1', '#ff7070', 30); }
        h.hp = h.maxHp;
      } else if (a.x < sc.cameras.main.scrollX - 80 || a.x > sc.cameras.main.scrollX + W + 80) { a.dead = true; a.img.destroy(); }
    }
    D.arrows = D.arrows.filter(a => !a.dead);
    const left = Math.max(0, (DRILL_MS - D.t) / 1000);
    D.ui.setText(`화살비 막기  ${left.toFixed(1)}초\n점수 ${D.score}   ${'♥'.repeat(Math.max(0, D.hearts))}${'♡'.repeat(Math.max(0, 3 - D.hearts))}`);
    if (D.t >= DRILL_MS || D.hearts <= 0) this.finish(sc);
  },
  finish(sc) {
    const D = sc.drill; D.done = true;
    for (const a of D.arrows) a.img.destroy(); D.arrows = [];
    const s = sc.save, st = this.state(s), rewarded = st.n < DRILL_PER_DAY;
    const best = D.score > (st.best || 0); if (best) st.best = D.score;
    let gold = 0, cons = null;
    if (rewarded) {
      st.n++;
      gold = Math.round(D.score * 6 * priceMul(s.ch) / 5) * 5;
      if (D.score >= 40) { const ks = ['potion', 'dagger', 'oil']; cons = ks[Math.floor(Math.random() * ks.length)]; s.belt[cons] = Math.min(9, (s.belt[cons] || 0) + 1); }
      s.gold += gold;
    }
    Save.write();
    sc.won = true; sc.hero.state = 'win'; sc.hero.play('w_win', 120); sc.hero.setHead('head_victory');
    if (D.ui) D.ui.destroy();
    const c = sc.add.container(0, 0).setScrollFactor(0).setDepth(9000);
    c.add(sc.add.rectangle(0, 0, W, H, 0x000000, 0.7).setOrigin(0).setInteractive());
    c.add(UI.text(sc, W / 2, 110, D.hearts <= 0 ? '하트를 모두 잃었다' : '훈련 끝!', 56, '#ffe7a8', { serif: true, st: 9 }).setOrigin(0.5));
    c.add(UI.text(sc, W / 2, 200, `점수 ${D.score}${best ? '   (최고 기록!)' : `   (최고 ${st.best})`}`, 36, best ? '#ffd34d' : '#fff4d8', { bold: true }).setOrigin(0.5));
    c.add(UI.text(sc, W / 2, 262, `저스트 가드 ${D.parry}  ·  가드 ${D.guard}  ·  맞음 ${D.hit}`, 24, '#e8dcc8').setOrigin(0.5));
    c.add(UI.text(sc, W / 2, 320, rewarded ? `보상: 금화 +${gold}${cons ? '  ·  ' + BELT[cons].ko + ' 1개' : ''}   (오늘 보상 ${st.n}/${DRILL_PER_DAY})` : `오늘 보상은 다 받았어요 — 연습은 계속할 수 있어요`, 22, '#ffd38a').setOrigin(0.5));
    c.add(UI.text(sc, W / 2, 360, '점수 × 금화 · 40점 이상이면 소모품 하나 더', 17, '#a89a88').setOrigin(0.5));
    c.add(UI.button(sc, W / 2 - 170, 470, '다시 하기', () => sc.scene.restart(sc.cfg), { w: 280 }));
    c.add(UI.button(sc, W / 2 + 170, 470, '캠프로', () => sc.scene.start('camp'), { w: 280, col: 0x3a2a1a }));
    c.each(o => o.setScrollFactor && o.setScrollFactor(0));
    SFX.win && SFX.win();
  },
};
