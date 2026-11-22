// 공용 UI 도구와 대화 장면(talk)
const UI = {
  text(sc, x, y, s, size = 24, color = '#f4e4c0', o = {}) {
    return sc.add.text(x, y, s, {
      fontFamily: o.serif ? 'serif' : 'sans-serif', fontSize: size, color,
      stroke: o.stroke ?? '#000', strokeThickness: o.st ?? Math.max(2, Math.round(size / 7)),
      align: o.align || 'left', fontStyle: o.bold ? 'bold' : '', lineSpacing: o.ls ?? 6,
      wordWrap: o.wrap ? { width: o.wrap, useAdvancedWrap: true } : undefined,
    });
  },
  panel(sc, x, y, w, h, o = {}) {
    const g = sc.add.graphics();
    g.fillStyle(o.fill ?? 0x1a0f08, o.alpha ?? 0.9).fillRoundedRect(x, y, w, h, o.r ?? 14);
    g.lineStyle(o.lw ?? 3, o.line ?? 0xc99a3c, 1).strokeRoundedRect(x, y, w, h, o.r ?? 14);
    if (o.inner !== false) g.lineStyle(1, 0x5a3a18, 1).strokeRoundedRect(x + 5, y + 5, w - 10, h - 10, Math.max(4, (o.r ?? 14) - 4));
    return g;
  },
  // 버튼: 컨테이너(배경+글자). o.w/h/size/col/disabled
  button(sc, x, y, label, cb, o = {}) {
    const w = o.w || 220, h = o.h || 60, c = sc.add.container(x, y);
    const g = sc.add.graphics();
    const draw = hov => {
      g.clear();
      const base = o.disabled ? 0x3a3028 : (o.col ?? 0x7a3a10);
      g.fillStyle(0x000000, 0.5).fillRoundedRect(-w / 2 + 3, -h / 2 + 5, w, h, 12);
      g.fillStyle(base, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 12);
      g.fillStyle(0xffffff, hov && !o.disabled ? 0.22 : 0.1).fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h * 0.42, 8);
      g.lineStyle(3, o.disabled ? 0x6a5a48 : 0xe0b45a).strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    };
    draw(false);
    const t = UI.text(sc, 0, 0, label, o.size || 26, o.disabled ? '#9a8a78' : (o.tcol || '#fff4d8'), { bold: true, align: 'center' }).setOrigin(0.5);
    c.add([g, t]);
    c.setSize(w, h).setInteractive({ useHandCursor: !o.disabled });
    c.on('pointerover', () => draw(true));
    c.on('pointerout', () => { draw(false); c.setScale(1); });
    c.on('pointerdown', () => { if (o.disabled) return; c.setScale(0.95); });
    c.on('pointerup', () => { if (o.disabled) return; c.setScale(1); SFX.resume(); SFX.go(); cb(); });
    c.label = t; c.redraw = draw;
    return c;
  },
  toast(sc, msg, color = '#fff4d8', y = 120) {
    const t = UI.text(sc, W / 2, y, msg, 28, color, { bold: true, align: 'center', st: 6 }).setOrigin(0.5).setDepth(9900).setScrollFactor(0).setAlpha(0);
    sc.tweens.add({ targets: t, alpha: 1, y: y - 20, duration: 250, hold: 1500, yoyo: true, onComplete: () => t.destroy() });
    return t;
  },
  // 아이템 아이콘 텍스처 키
  itemIcon(it) {
    let k;
    if (it.boss) {
      k = 'icon/bossgear_' + it.boss;
      if (typeof game !== 'undefined' && game.textures && !game.textures.exists(k)) k = it.kind === 'ring' ? 'icon/acc_legend_1' : 'icon/acc_legend_5';
    } else if (it.cls === 'acc') {
      if (it.rar === 4) k = 'icon/acc_legend_' + DB.accessory.legend.findIndex(l => l.name === (it.legendOf || it.name));   // ✏️ 이야기 전설은 빌려 온 전설 그림
      else if (it.rar === 5) { const si = DB.accessory.sets.findIndex(x => x.name === it.set); k = `icon/set_${si ? 'b' : 'a'}${it.kind === 'ring' ? 0 : 1}`; }
      else k = `icon/${it.kind}_${it.tier}`;
    } else if (it.rar === 4) k = `icon/${it.cls}_legend_${it.slot}`;
    else if (it.rar === 5) k = `icon/${it.cls}_set_${it.slot}`;
    else k = `icon/${it.cls}_${it.slot}_${it.tier}`;
    return k;
  },
  // 아이콘 칸 (희귀도 테두리). 반환: 컨테이너
  itemSlot(sc, x, y, it, size = 84, cb) {
    const c = sc.add.container(x, y), g = sc.add.graphics();
    const col = it ? RARITY[it.rar].hex : 0x5a4030;
    g.fillStyle(0x0e0805, 0.95).fillRoundedRect(-size / 2, -size / 2, size, size, 10);
    if (it) g.fillStyle(col, 0.16).fillRoundedRect(-size / 2, -size / 2, size, size, 10);
    g.lineStyle(it && it.rar >= 3 ? 4 : 2, col).strokeRoundedRect(-size / 2, -size / 2, size, size, 10);
    c.add(g);
    if (it) {
      const key = UI.itemIcon(it);
      if (sc.textures.exists(key)) { const im = sc.add.image(0, 0, key); im.setScale((size - 12) / Math.max(im.width, im.height)); c.add(im); }
      else c.add(UI.text(sc, 0, 0, it.name.slice(0, 2), 22, RARITY[it.rar].col, { bold: true }).setOrigin(0.5));
      if (it.plus) c.add(UI.text(sc, size / 2 - 6, -size / 2 + 2, '+' + it.plus, 16, '#ffe27a', { bold: true }).setOrigin(1, 0));
      if (it.lock) { const lk = sc.add.graphics(), lx = -size / 2 + 14, ly = size / 2 - 14;   // 🆕 잠금 자물쇠
        lk.lineStyle(3, 0xffd34d).beginPath().arc(lx, ly - 5, 5, Math.PI, 0).strokePath(); lk.fillStyle(0xffd34d).fillRoundedRect(lx - 7, ly - 4, 14, 11, 2); c.add(lk); }
    }
    if (cb) { c.setSize(size, size).setInteractive({ useHandCursor: true }); c.on('pointerup', () => { SFX.resume(); SFX.go(); cb(); }); }
    return c;
  },
  // 이미지가 있으면 이미지, 없으면 null
  img(sc, x, y, key) { return sc.textures.exists(key) ? sc.add.image(x, y, key) : null; },
  // 장면 위에 덮는 어두운 바닥 (아래 입력을 막는다)
  blocker(sc, a = 0.6) { return sc.add.rectangle(0, 0, W, H, 0x000000, a).setOrigin(0).setInteractive(); },
};

// 보상 적용 (대사 속 give, 스테이지 보상 공용). 화면에 띄울 문구 목록을 돌려준다.
function applyGive(g) {
  const s = Save.data, out = [];
  if (!s || !g) return out;
  if (g.gold) { s.gold += g.gold; out.push(`금화 +${g.gold}`); }
  if (g.exp) { const ups = gainExp(s, g.exp); out.push(`경험치 +${g.exp}`); if (ups.length) out.push(`레벨 업! Lv.${s.lv}`); }
  if (g.moon && !s.moons[g.moon]) { s.moons[g.moon] = true; out.push(`${MOONS[g.moon].ko}의 월석을 얻었다!`); }
  if (g.seed && typeof SEEDS !== 'undefined') { s.seeds = s.seeds || {}; if (!s.seeds[g.seed]) { s.seeds[g.seed] = true; out.push(`${SEEDS[g.seed].ko}를 정화했다!`); if (typeof SFX !== 'undefined' && SFX.jingle) SFX.jingle('jgl_seed'); } }
  if (g.item) { const rar = { uncommon: 1, rare: 2, epic: 3, legend: 4 }[g.item] ?? 2; const it = makeItem(s, { cls: s.hero, slot: ['weapon', 'offhand', 'head', 'body'][Math.floor(Math.random() * 4)], tier: Math.min(3, Math.floor((s.ch - 1) / 2)), rar }); out.push(`${RARITY[rar].ko} 장비 「${it.name}」`); }
  if (g.gear) { const it = makeStoryGear(s, g.gear); if (it) out.push(`${RARITY[it.rar].ko} 장비 「${it.name}」`); }   // 🆕 이야기 고유 장비
  if (g.mats) for (const [k, n] of Object.entries(g.mats)) { s.mats[k] = (s.mats[k] || 0) + n; out.push(`${MATS[k]} +${n}`); }
  if (g.unlock && !s.unlocked[g.unlock]) { s.unlocked[g.unlock] = true; addGlobalUnlock(g.unlock); out.push(`새 직업 해금: ${DB.heroes[g.unlock].ko}`); }
  if (g.flag) s.flags[g.flag] = true;
  if (g.lise) s.lise += g.lise;
  Save.write();
  return out;
}

// ---------------------------------------------------------------------------
// 대화 장면: this.scene.launch('talk', { key, then(flag) })
// 부른 장면은 멈춰 두고, 끝나면 다시 움직인 뒤 then을 부른다.
// ---------------------------------------------------------------------------
class Talk extends Phaser.Scene {
  constructor() { super('talk'); }
  init(d) { this.d = d; this.done = false; this.typing = false; this.choiceUi = null; }
  create() {
    this.lines = [...(STORY[this.d.key] || [])];
    this.flag = null;
    this.back = UI.blocker(this, this.d.dim ?? 0.55);
    this.bg = null;
    this.portrait = null;
    const box = this.add.container(0, 0).setDepth(10);
    box.add(UI.panel(this, 40, 520, W - 80, 180, { alpha: 0.94 }));
    this.nameBg = this.add.graphics(); box.add(this.nameBg);
    this.nameT = UI.text(this, 80, 498, '', 26, '#ffe7a8', { bold: true, st: 5 }); box.add(this.nameT);
    this.body = UI.text(this, 80, 552, '', 27, '#fff8ea', { wrap: W - 200, ls: 10, st: 3 }); box.add(this.body);
    this.more = UI.text(this, W - 80, 676, '▼', 22, '#ffd34d').setOrigin(1, 0.5); box.add(this.more);
    this.tweens.add({ targets: this.more, y: 684, yoyo: true, repeat: -1, duration: 400 });
    this.skipB = UI.button(this, W - 90, 40, '건너뛰기', () => this.finish(true), { w: 150, h: 46, size: 20, col: 0x3a2a1a }).setDepth(20);
    this.box = box;
    this.choiceUi = null;
    this.back.on('pointerup', () => this.tap());
    this.input.keyboard.on('keydown-ENTER', () => this.tap());
    this.input.keyboard.on('keydown-SPACE', () => this.tap());
    this.input.keyboard.on('keydown-J', () => this.tap());
    this.next();
  }
  tap() {
    if (this.choiceUi) return;
    if (this.typing) { this.typing = false; this.body.setText(this.full); return; }
    this.next();
  }
  speaker(w) {
    if (w === 'hero') {
      const h = Save.data ? Save.data.hero : 'warrior';
      return { ko: DB.heroes[h].name, portrait: 'portrait/' + h, faces: 'portrait/' + h + '_', hero: true };
    }
    // 🆕 2부: 1부를 희생 엔딩으로 끝냈다면 리세는 월석 속 목소리
    const s = Save.data;
    if (w === 'lise' && s && s.lastEnding === 'end_sacrifice' && s.ch >= 7 && !s.endings.p2_true && CAST.lise_stone) return CAST.lise_stone;
    return CAST[w] || { ko: w };
  }
  next() {
    const L = this.lines.shift();
    if (!L) return this.finish();
    // 🆕 조건 줄: if/ifNot = 깃발, ifLise = 리세 신뢰 이상, onlyFor = 그 직업일 때만
    if (!talkLineOk(L)) return this.next();
    if (L.bg) {
      if (this.bg) this.bg.destroy();
      this.bg = UI.img(this, W / 2, H / 2 - 40, L.bg);
      if (this.bg) { this.bg.setDisplaySize(W, W * this.bg.height / this.bg.width).setDepth(1).setAlpha(0); this.tweens.add({ targets: this.bg, alpha: 1, duration: 500 }); this.back.setFillStyle(0x000000, 1); }
      return this.next();
    }
    if (L.music !== undefined) { SFX.music(L.music); return this.next(); }
    if (L.give) {
      const out = applyGive(L.give);
      out.forEach((m, i) => this.time.delayedCall(i * 500, () => UI.toast(this, m, '#ffe27a', 300)));
      return this.next();
    }
    if (L.choice) return this.showChoice(L.choice);
    const hk = Save.data ? Save.data.hero : 'warrior';
    if (L.skipFor && L.skipFor.includes(hk)) return this.next();
    const HERO_OF = { odelia: 'paladin', seril: 'ranger' };
    const sp = this.speaker(L.asHero && HERO_OF[L.w] === hk ? 'hero' : L.w);
    this.nameT.setText(sp.ko || '');
    this.nameBg.clear();
    if (sp.ko) { this.nameBg.fillStyle(0x3a1a08, 1).fillRoundedRect(64, 488, this.nameT.width + 32, 44, 10); this.nameBg.lineStyle(2, 0xe0b45a).strokeRoundedRect(64, 488, this.nameT.width + 32, 44, 10); }
    this.nameT.setColor(sp.col || '#ffe7a8');
    this.body.setFontStyle(L.w === 'narr' ? 'italic' : '');
    // 초상화: 주인공은 왼쪽, 나머지는 오른쪽(그림이 오른쪽을 보므로 뒤집는다)
    if (this.portrait) { const p = this.portrait; this.tweens.add({ targets: p, alpha: 0, duration: 120, onComplete: () => p.destroy() }); this.portrait = null; }
    let key = sp.portrait;
    if (key && L.f && sp.faces && this.textures.exists(sp.faces + L.f)) key = sp.faces + L.f;
    if (key && this.textures.exists(key)) {
      const left = !!sp.hero;
      const im = this.add.image(left ? 250 : W - 250, 530, key).setOrigin(0.5, 1).setDepth(5);
      im.setScale(400 / im.height).setFlipX(!left).setAlpha(0);
      im.x += left ? -30 : 30;
      this.tweens.add({ targets: im, alpha: 1, x: left ? 250 : W - 250, duration: 160 });
      this.portrait = im;
    }
    this.full = (L.by && L.by[hk]) || L.t; this.body.setText(''); this.typing = true; this.ci = 0;
    if (this.typeEv) this.typeEv.remove();
    this.typeEv = this.time.addEvent({ delay: 28, loop: true, callback: () => {
      if (!this.typing) { this.typeEv.remove(); return; }
      this.ci += 1; this.body.setText(this.full.slice(0, this.ci));
      if (this.ci >= this.full.length) { this.typing = false; this.typeEv.remove(); }
    } });
  }
  showChoice(opts) {
    const c = this.add.container(0, 0).setDepth(30);
    opts.forEach(([label, key], i) => {
      c.add(UI.button(this, W / 2, 300 + i * 84, label, () => {
        c.destroy(); this.choiceUi = null;
        this.flag = key;
        if (STORY[key]) this.lines = [...STORY[key], ...this.lines];
        this.next();
      }, { w: 620, h: 66, size: 26 }));
    });
    this.choiceUi = c;
  }
  finish(skip) {
    if (this.done || (skip && this.choiceUi)) return;
    // 건너뛰어도 선택지와 보상은 지나칠 수 없다
    if (skip) {
      while (this.lines.length) {
        const L = this.lines.shift();
        if (L.give && talkLineOk(L)) applyGive(L.give);
        if (L.choice) { this.lines.unshift(L); this.typing = false; return this.next(); }
      }
    }
    this.done = true;
    const d = this.d;
    this.scene.stop();
    if (d.from) this.scene.resume(d.from);
    if (d.then) d.then(this.flag);
  }
}

// 🆕 조건 줄 판정 (대화·말풍선 공용)
function talkLineOk(L) {
  const s = Save.data || { flags: {}, lise: 0, hero: 'warrior' };
  if (L.if && !(s.flags || {})[L.if]) return false;
  if (L.ifNot && (s.flags || {})[L.ifNot]) return false;
  if (L.ifLise !== undefined && (s.lise || 0) < L.ifLise) return false;
  if (L.ifLiseBelow !== undefined && (s.lise || 0) >= L.ifLiseBelow) return false;
  if (L.onlyFor && !L.onlyFor.includes(s.hero)) return false;
  if (L.ifEnd && s.lastEnding !== L.ifEnd) return false;   // 🆕 1부 마지막으로 본 엔딩
  if (L.ifNotEnd && s.lastEnding === L.ifNotEnd) return false;
  if (L.ifSeeds !== undefined && Object.keys(s.seeds || {}).length < L.ifSeeds) return false;
  if (L.ifMoons !== undefined && Object.keys(s.moons || {}).length < L.ifMoons) return false;   // 🆕 월석 n개 이상
  if (L.ifMoonsBelow !== undefined && Object.keys(s.moons || {}).length >= L.ifMoonsBelow) return false;
  return true;
}
// 다른 장면에서 대화를 띄운다
function runTalk(scene, key, then, o = {}) {
  if (!STORY[key]) { if (then) then(null); return; }
  const s = Save.data;
  if (s && o.once) { if (s.seen[key]) { if (then) then(null); return; } s.seen[key] = true; Save.write(); }
  // 대화에 나오는 그림을 먼저 불러온다
  Assets.ensure(scene, Assets.forTalk(key, s), () => {
    scene.scene.pause();
    scene.scene.launch('talk', { key, then, from: scene.scene.key, dim: o.dim });
    scene.scene.bringToTop('talk');
  });
}
