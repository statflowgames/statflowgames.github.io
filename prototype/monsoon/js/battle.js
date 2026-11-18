// 해전: 옆에서 보는 배 대 배. 9세기라 대포 없음 — 화살 · 불단지(나프타) · 들이받기 · 갈고리와 백병전
'use strict';

const ENEMIES = {
  pirate: { name: '해협 해적선', ship: 'pirate_s', hull: 70, crew: 10, loot: [25, 60], fame: 15 },
  seri:   { name: '세리의 붉은 돛', ship: 'pirate_s', hull: 90, crew: 12, loot: [30, 30], fame: 30, boss: true },
};
const DIST = ['멀다', '활 거리', '붙었다'];
const XPOS = [[250, 1030], [340, 940], [470, 810]];

class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }
  init(data) { this.foeId = data.foe; this.onEnd = data.onEnd; }

  create() {
    SFX.music('battle');
    SFX.play('drum');
    const E = ENEMIES[this.foeId];
    this.me = { hull: G.hull, max: SHIPS[G.ship].hull, crew: G.crew, max0: Math.max(G.crew, 1), fire: 0 };
    this.foe = { hull: E.hull, max: E.hull, crew: E.crew, max0: E.crew, fire: 0 };
    this.d = 0; this.turn = 0; this.busy = false; this.over = false;
    if (G.pots == null) G.pots = 2;

    this.add.image(640, 360, 'bg/sky_day').setDisplaySize(1280, 720);
    this.add.rectangle(640, 600, 1280, 260, 0x1f8f9a);
    this.far = this.add.tileSprite(640, 420, 1280, 280, 'sea/sea_far_nanhai').setTileScale(0.9);
    this.mySh = this.add.image(XPOS[0][0], 440, 'ship/' + G.ship).setScale(this.shipScale(G.ship));
    this.foeSh = this.add.image(XPOS[0][1], 440, 'ship/' + E.ship).setScale(this.shipScale(E.ship)).setFlipX(true);
    for (const [s, delay] of [[this.mySh, 0], [this.foeSh, 500]]) {
      s.setOrigin(0.5, 0.82);
      this.tweens.add({ targets: s, y: '+=9', angle: { from: -1.6, to: 1.6 }, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay });
    }
    this.near = this.add.tileSprite(640, 620, 1280, 260, 'sea/sea_near_calm').setTileScale(0.85).setDepth(5);
    this.dmgG = this.add.group();
    this.dom();
  }
  shipScale(key) { return key === 'perahu' ? 0.52 : key === 'pirate_s' ? 0.5 : 0.48; }
  update(t, dt) {
    this.far.tilePositionX += dt * 0.012;
    this.near.tilePositionX += dt * 0.05;
    this.near.y = 620 + Math.sin(t / 700) * 5;
  }

  // ---------- 화면 ----------
  dom() {
    UI.clear('scene', 'panel', 'hud');
    const L = UI.L.scene; L.style.pointerEvents = 'auto';
    const E = ENEMIES[this.foeId];
    this.hl = el('div', 'bhud l', null, L);
    this.hr = el('div', 'bhud r', null, L);
    this.dl = el('div', 'distlbl', '', L);
    this.lg = el('div', 'blog', '', L);
    this.cmd = el('div', 'bcmd', null, L);
    this.refresh();
    this.say(`${E.name}이(가) 다가온다! 활 거리에서 불단지를 던지세요. 사람이 적으면 백병전은 피하는 게 좋아요.`);
  }
  bar(cls, v, max, label) { return `<div class="bar ${cls}"><i style="width:${Math.max(0, v / max * 100)}%"></i><span>${label} ${Math.max(0, Math.round(v))}/${max}</span></div>`; }
  refresh() {
    const E = ENEMIES[this.foeId];
    this.hl.innerHTML = `<div class="nm">${SHIPS[G.ship].name}</div>${this.bar('hull', this.me.hull, this.me.max, '선체')}${this.bar('crew', this.me.crew, this.me.max0, '선원')}<small>불단지 ${G.pots}개${this.me.fire ? ' · 🔥불이 붙었다' : ''}</small>`;
    this.hr.innerHTML = `<div class="nm">${E.name}</div>${this.bar('hull', this.foe.hull, this.foe.max, '선체')}${this.bar('crew', this.foe.crew, this.foe.max0, '선원')}<small>${this.foe.fire ? '🔥불이 붙었다' : '&nbsp;'}</small>`;
    this.dl.textContent = `거리: ${DIST[this.d]}`;
    this.foeSh.setTexture('ship/' + E.ship + (this.foe.hull < this.foe.max * 0.45 ? '_damaged' : ''));
    this.mySh.setTexture('ship/' + G.ship + (this.me.hull < this.me.max * 0.45 && MAN['ship/' + G.ship + '_damaged'] ? '_damaged' : ''));
    this.cmd.innerHTML = '';
    if (this.over) return;
    const c = (label, sub, fn, ok = true) => { const b = btn(`${label}<small>${sub}</small>`, '', () => this.act(fn), this.cmd); b.disabled = !ok || this.busy; };
    const d = this.d;
    c('활 쏘기', d === 0 ? '멀어서 약함' : '선원을 맞힘', 'shoot', true);
    c('불단지', G.pots ? `활 거리 이내 · ${G.pots}개` : '없음', 'pot', d >= 1 && G.pots > 0);
    c('다가가기', '거리 좁히기', 'close', d < 2);
    c('물러서기', d === 0 ? '달아나기' : '거리 벌리기', 'back', true);
    c('들이받기', '붙었을 때', 'ram', d === 2 && this.me.hull > 15);
    c('갈고리 · 백병전', '붙었을 때', 'board', d === 2);
  }
  say(t) { this.lg.textContent = t; }

  // ---------- 행동 ----------
  async act(kind) {
    if (this.busy || this.over) return;
    this.busy = true; this.refresh();
    this.turn++;
    const r = await this[kind](true);
    if (r === 'end') return;
    if (this.check()) return;
    await wait(350);
    await this.burn();
    if (this.check()) return;
    await this.foeTurn();
    if (this.check()) return;
    this.busy = false; this.refresh();
  }
  windOk() { const w = State.wind(); return 0.55 + (G.mates.includes('dayang') ? 0.15 : 0) + (w.calm ? -0.05 : 0.05); }
  async shoot(mine) {
    const att = mine ? this.me : this.foe, def = mine ? this.foe : this.me;
    const archers = mine ? Math.ceil(att.crew / 2) + (G.mates.includes('dayang') ? 1 : 0) : Math.ceil(att.crew / 3);
    const mul = [0.45, 1, 1.15][this.d] * (mine && G.origin === 'silla' ? 1.2 : 1);
    const hit = Math.max(0, Math.round(archers * rand(0.18, 0.4) * mul));
    SFX.play('arrow');
    await this.projectile('fx/arrows', mine, 0.55, 520);
    def.crew = Math.max(0, def.crew - hit);
    this.pop(mine ? this.foeSh : this.mySh, hit ? `선원 -${hit}` : '빗나감', hit ? '#ffd27a' : '#cfe');
    if (!hit) SFX.play('splash');
    this.say(mine ? `화살을 쏘았다! ${hit ? `적 선원 ${hit}명이 쓰러졌다.` : '빗나갔다.'}` : `적이 화살을 쏘았다! ${hit ? `우리 선원 ${hit}명이 다쳤다.` : '빗나갔다.'}`);
    this.refresh();
  }
  async pot(mine) {
    if (mine) G.pots--;
    const def = mine ? this.foe : this.me;
    SFX.play('arrow');
    await this.projectile('fx/fire_arrow', mine, 0.5, 600);
    if (Math.random() < 0.8) {
      const dmg = irand(14, 22);
      def.hull -= dmg; def.fire = 2;
      SFX.play('boom');
      this.burst(mine ? this.foeSh : this.mySh, 'fx/naphtha', 0.55);
      this.cameras.main.shake(260, 0.006);
      this.pop(mine ? this.foeSh : this.mySh, `선체 -${dmg}`, '#ff9b6a');
      this.say(mine ? `불단지가 터졌다! 적 배에 불이 붙었다.` : '적의 불단지가 터졌다! 불을 꺼라!');
    } else {
      SFX.play('splash'); this.burst(mine ? this.foeSh : this.mySh, 'fx/splash', 0.4);
      this.say('불단지가 바다에 떨어졌다.');
    }
    this.refresh();
  }
  async close(mine) {
    const ok = Math.random() < (mine ? this.windOk() + 0.15 : 0.7);
    if (ok) { this.d = Math.min(2, this.d + 1); await this.moveShips(); }
    this.say(mine ? (ok ? '돛을 당겨 다가갔다!' : '바람이 받쳐 주지 않는다…') : (ok ? '적이 노를 저어 다가온다!' : '적이 다가오려다 물결에 밀렸다.'));
    this.refresh();
  }
  async back(mine) {
    if (mine && this.d === 0) {
      const p = 0.3 + (SHIPS[G.ship].speed - 1.1) + (G.mates.includes('dayang') ? 0.15 : 0) + (ENEMIES[this.foeId].boss ? -0.1 : 0);
      if (Math.random() < p) {
        SFX.play('sail');
        this.tweens.add({ targets: this.mySh, x: -300, duration: 1200, ease: 'Sine.in' });
        this.say('바람을 타고 빠져나왔다!');
        await wait(1300);
        this.finish('flee');
        return 'end';
      }
      this.say('달아나지 못했다!');
      return;
    }
    const ok = Math.random() < (mine ? this.windOk() : 0.6);
    if (ok) { this.d = Math.max(0, this.d - 1); await this.moveShips(); }
    this.say(mine ? (ok ? '거리를 벌렸다.' : '물러서지 못했다!') : (ok ? '적이 물러난다.' : '적이 물러서지 못했다.'));
    this.refresh();
  }
  async ram(mine) {
    const att = mine ? this.me : this.foe, def = mine ? this.foe : this.me;
    const sh = mine ? this.mySh : this.foeSh;
    const x0 = sh.x;
    await new Promise(r => this.tweens.add({ targets: sh, x: x0 + (mine ? 90 : -90), duration: 260, yoyo: true, ease: 'Quad.in', onYoyo: () => {
      SFX.play('hit'); this.cameras.main.shake(320, 0.012);
      this.burst(mine ? this.foeSh : this.mySh, 'fx/splinters', 0.5);
    }, onComplete: r }));
    const dmg = Math.round(att.max * rand(0.18, 0.28) + 6), self = irand(5, 10);
    def.hull -= dmg; att.hull -= self;
    this.pop(mine ? this.foeSh : this.mySh, `선체 -${dmg}`, '#ff9b6a');
    this.say(mine ? `들이받았다! 적 선체 -${dmg}, 우리도 -${self}.` : `적이 들이받았다! 선체 -${dmg}.`);
    this.refresh();
  }
  async board(mine) {
    SFX.play('clash');
    await this.projectile('fx/hook', mine, 0.45, 420);
    this.burst(this.foeSh, 'fx/smoke', 0.6, (this.mySh.x + this.foeSh.x) / 2 - this.foeSh.x);
    let rounds = 0;
    const myPow = () => this.me.crew * (1 + (G.origin === 'silla' ? 0.2 : 0) + (G.morale - 50) / 200);
    const foePow = () => this.foe.crew * (ENEMIES[this.foeId].boss ? 1.15 : 1);
    while (rounds < 3 && this.me.crew > 0 && this.foe.crew > 0) {
      rounds++;
      SFX.play('clash');
      this.cameras.main.shake(200, 0.004);
      const a = myPow(), b = foePow();
      const lossFoe = Math.max(1, Math.round(a * rand(0.15, 0.3))), lossMe = Math.max(0, Math.round(b * rand(0.08, 0.19)));
      this.foe.crew = Math.max(0, this.foe.crew - lossFoe); this.me.crew = Math.max(0, this.me.crew - lossMe);
      this.pop(this.foeSh, `-${lossFoe}`, '#ffd27a'); this.pop(this.mySh, `-${lossMe}`, '#ffd27a');
      this.say(`백병전! (${rounds}합) 적 -${lossFoe}, 우리 -${lossMe}`);
      this.refresh();
      await wait(650);
      if (this.foe.crew <= this.foe.max0 * 0.25 || this.me.crew <= 1) break;
    }
    if (this.foe.crew <= this.foe.max0 * 0.3) { this.foe.crew = 0; }
    this.refresh();
  }
  async burn() {
    for (const [s, sh, mine] of [[this.foe, this.foeSh, true], [this.me, this.mySh, false]]) {
      if (s.fire > 0) {
        s.fire--; s.hull -= 5;
        this.burst(sh, 'fx/sail_fire', 0.35, 0, -120);
        this.pop(sh, '불 -5', '#ff9b6a');
        await wait(300);
      }
    }
    this.refresh();
  }
  async foeTurn() {
    await wait(300);
    const E = ENEMIES[this.foeId], f = this.foe, m = this.me;
    if (E.boss && this.turn >= 2 && (f.hull < f.max * 0.45 || f.crew < f.max0 * 0.45)) return; // check() 가 처리
    if (this.d < 2 && Math.random() < (f.crew > m.crew * 0.9 ? 0.55 : 0.3)) return this.close(false);
    if (this.d === 2) {
      if (f.crew >= m.crew * 0.8 && Math.random() < 0.45) { this.say('적이 갈고리를 던졌다! 백병전이다!'); await wait(600); return this.board(false); }
      if (Math.random() < 0.4) return this.ram(false);
    }
    if (this.d === 1 && this.foeId === 'seri' && Math.random() < 0.25) return this.pot(false);
    return this.shoot(false);
  }
  check() {
    const E = ENEMIES[this.foeId], f = this.foe, m = this.me;
    if (f.hull <= 0 || f.crew <= 0) { this.finish('win'); return true; }
    const th = E.boss ? 0.45 : 0.3;     // 이만큼 줄면 적이 물러남
    if (f.hull < f.max * th || f.crew < f.max0 * th) { this.finish('win'); return true; }
    if (m.hull <= 0 || m.crew <= 0) { this.finish('lose'); return true; }
    if (E.boss && this.turn >= 8) { this.finish(m.hull / m.max >= f.hull / f.max ? 'win' : 'lose'); return true; }
    return false;
  }

  // ---------- 연출 ----------
  async moveShips() {
    SFX.play('wave');
    await new Promise(r => {
      this.tweens.add({ targets: this.mySh, x: XPOS[this.d][0], duration: 700, ease: 'Sine.inOut' });
      this.tweens.add({ targets: this.foeSh, x: XPOS[this.d][1], duration: 700, ease: 'Sine.inOut', onComplete: r });
    });
  }
  projectile(key, mine, sc, dur) {
    const from = mine ? this.mySh : this.foeSh, to = mine ? this.foeSh : this.mySh;
    const img = this.add.image(from.x, from.y - 150, key).setScale(sc).setDepth(4).setFlipX(!mine);
    return new Promise(r => {
      this.tweens.add({ targets: img, x: to.x, duration: dur, ease: 'Linear' });
      this.tweens.add({ targets: img, y: { from: from.y - 150, to: to.y - 200 }, duration: dur / 2, yoyo: true, ease: 'Sine.out' });
      this.time.delayedCall(dur, () => { img.destroy(); r(); });
    });
  }
  burst(target, key, sc, dx = 0, dy = -90) {
    const img = this.add.image(target.x + dx, target.y + dy, key).setScale(sc * 0.6).setDepth(4).setAlpha(1);
    this.tweens.add({ targets: img, scale: sc, alpha: 0, duration: 900, ease: 'Quad.out', onComplete: () => img.destroy() });
  }
  pop(target, text, color) {
    const t = this.add.text(target.x, target.y - 230, text, { fontFamily: 'sans-serif', fontSize: 30, fontStyle: 'bold', color, stroke: '#2b1a0a', strokeThickness: 6 }).setOrigin(0.5).setDepth(6);
    this.tweens.add({ targets: t, y: t.y - 60, alpha: 0, duration: 1300, ease: 'Quad.out', onComplete: () => t.destroy() });
  }

  finish(res) {
    if (this.over) return;
    this.over = true;
    const E = ENEMIES[this.foeId];
    G.hull = clamp(this.me.hull, 5, this.me.max);
    G.crew = Math.max(1, this.me.crew);
    let msg = '';
    if (res === 'win') {
      const loot = irand(E.loot[0], E.loot[1]);
      G.gold += loot; G.fame.sea += E.fame; G.wins++;
      G.morale = Math.min(100, G.morale + 10);
      SFX.play('win');
      if (!E.boss) this.tweens.add({ targets: this.foeSh, x: 1500, alpha: 0.5, duration: 1600, ease: 'Sine.in' });
      msg = E.boss ? `세리의 배가 물러난다! 해상 명성 +${E.fame}, 금 ${loot} 디나르를 떨어뜨리고 갔다.` : `해적선이 달아난다! 버리고 간 상자에서 금 ${loot} 디나르를 얻었다. 해상 명성 +${E.fame}`;
    } else if (res === 'lose') {
      SFX.play('lose');
      const lost = Math.round(G.gold * 0.3); G.gold -= lost;
      const goods = Object.keys(G.cargo);
      let gl = '';
      if (goods.length) { const g = pick(goods); const n = Math.ceil(G.cargo[g].n / 2); G.cargo[g].n -= n; if (G.cargo[g].n <= 0) delete G.cargo[g]; gl = `${GOODS[g].name} ${n}짐`; }
      G.crew = Math.max(G.crew, 2); G.morale = Math.max(10, G.morale - 15);
      msg = `졌다… 해적에게 ${gl ? `금 ${lost} 디나르와 ${gl}을` : `금 ${lost} 디나르를`} 빼앗겼다. 목숨은 건졌다.`;
    } else {
      msg = '무사히 달아났다.';
    }
    this.say(msg);
    State.save();
    this.refresh();
    const b = btn('계속', '', () => { UI.clear('scene'); const cb = this.onEnd; this.scene.stop(); cb && cb(res === 'win'); }, this.cmd);
    b.style.minWidth = '220px';
  }
}
