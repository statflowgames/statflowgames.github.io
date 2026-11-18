// 바다 지도: 실제 해안선 · 계절풍 · 항해 · 바다 사건
'use strict';

class SeaScene extends Phaser.Scene {
  constructor() { super('Sea'); }

  create(data) {
    SFX.music('sea');
    this.paused = false;
    const W = GEO.W, H = GEO.H;
    this.cameras.main.setBounds(0, 0, W, H);
    this.sailing = null;
    // 바다
    this.add.tileSprite(0, 0, W, H, 'map/sea').setOrigin(0).setTileScale(0.7).setAlpha(0.95);
    // 얕은 바다 테두리 + 땅
    const shallow = this.add.graphics();
    const landG = this.make.graphics({ add: false });
    for (const k in GEO.LAND) {
      const pts = GEO.LAND[k].map(([lo, la]) => GEO.px(lo, la));
      shallow.lineStyle(26, 0x7fe0d6, 0.35); shallow.strokePoints(pts, true, true);
      shallow.lineStyle(12, 0xbff3e6, 0.45); shallow.strokePoints(pts, true, true);
      landG.fillStyle(0xffffff); landG.fillPoints(pts, true, true);
    }
    const paper = this.add.tileSprite(0, 0, W, H, 'map/paper').setOrigin(0).setTileScale(1.2);
    paper.setMask(landG.createGeometryMask());
    const coast = this.add.graphics();
    for (const k in GEO.LAND) {
      const pts = GEO.LAND[k].map(([lo, la]) => GEO.px(lo, la));
      coast.lineStyle(3, 0x6b4a2a, 0.9); coast.strokePoints(pts, true, true);
    }
    // 강
    const riv = this.add.graphics();
    for (const k in GEO.RIVERS) {
      const pts = GEO.RIVERS[k].map(([lo, la]) => GEO.px(lo, la));
      riv.lineStyle(5, 0x3f8fa0, 0.85); riv.strokePoints(pts, false, true);
    }
    // 땅 이름
    const label = (t, lon, lat, size = 30, rot = 0) => {
      const p = GEO.px(lon, lat);
      this.add.text(p.x, p.y, t, { fontFamily: 'Gowun Batang, Noto Serif KR, serif', fontSize: size, color: '#7a5530', fontStyle: 'bold' })
        .setOrigin(0.5).setAlpha(0.55).setAngle(rot);
    };
    label('수마트라 (금의 섬)', 101.4, -1.2, 30, 47);
    label('말레이반도', 102.0, 4.3, 26, 60);
    label('자바', 109.6, -7.35, 30, -8);
    label('보르네오', 112.6, 0.4, 34, 0);
    label('방카', 106.0, -2.25, 16, 0);
    label('벨리퉁', 107.9, -2.9, 16, 0);
    const sea = (t, lon, lat, s = 22) => {
      const p = GEO.px(lon, lat);
      this.add.text(p.x, p.y, t, { fontFamily: 'Gowun Batang, Noto Serif KR, serif', fontSize: s, color: '#e9fbff', fontStyle: 'italic' })
        .setOrigin(0.5).setAlpha(0.7);
    };
    sea('말라카 해협', 100.0, 3.3); sea('남해 (남중국해)', 108.5, 2.0, 26); sea('자바해', 110.0, -5.1, 26); sea('인도양 · 바람의 문 너머', 97.2, -2.5, 22);
    // 장식
    const deco = (key, lon, lat, sc, alpha = 0.9) => { const p = GEO.px(lon, lat); return this.add.image(p.x, p.y, key).setScale(sc).setAlpha(alpha); };
    deco('mapdeco/compass', 96.3, -7.6, 0.75);
    const serp = deco('mapdeco/serpent', 96.6, -4.7, 0.5, 0.75);
    const whale = deco('mapdeco/whale', 113.3, -1.2, 0.45, 0.8);
    deco('mapdeco/turtle', 106.0, -5.0, 0.32, 0.8);
    deco('mapdeco/birds', 104.0, 3.2, 0.35, 0.7);
    deco('mapdeco/fish', 110.7, 4.8, 0.32, 0.75);
    deco('mapdeco/coral', 108.6, -2.0, 0.3, 0.85);
    deco('mapdeco/waves', 116.5, -6.0, 0.4, 0.8);
    this.tweens.add({ targets: [serp, whale], y: '-=8', duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // 보로부두르 (육지 표시)
    const bp = GEO.px(110.2, -7.6);
    this.add.circle(bp.x, bp.y, 6, 0x8a5a2a);
    this.add.text(bp.x + 10, bp.y, '보로부두르', { fontFamily: 'sans-serif', fontSize: 15, color: '#6b4a2a' }).setOrigin(0, 0.5);

    // 안개 (아직 안 가 본 곳)
    this.fog = this.add.renderTexture(0, 0, W, H).setOrigin(0).setDepth(5);
    this.fog.fill(0xe8d6ad, 1).setAlpha(0.78);
    this.fogBrush = this.make.image({ x: 0, y: 0, key: 'fogbrush', add: false });
    for (const [lo, la] of G.seen) this.reveal(lo, la, true);
    for (const k in GEO.NODES) if (k !== 'shabdiz_wreck') this.reveal(GEO.NODES[k][0], GEO.NODES[k][1], true);
    this.fogTex = this.add.tileSprite(0, 0, W, H, 'map/paper').setOrigin(0).setDepth(5.1).setAlpha(0.35).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.fogTex.setMask(new Phaser.Display.Masks.BitmapMask(this, this.fog));

    // 항구 · 유적 표시
    this.markers = {};
    for (const pid in PORTS) this.addPort(pid);
    this.addWreck();

    // 배
    const at = GEO.px(G.at.lon, G.at.lat);
    this.ship = this.add.image(at.x, at.y, 'shipicon/' + (G.ship === 'perahu' ? 'perahu' : G.ship)).setScale(0.42).setDepth(8);
    this.wake = this.add.particles(0, 0, 'dot', { speed: 6, lifespan: 1600, scale: { start: 0.6, end: 0 }, alpha: { start: 0.6, end: 0 }, frequency: 90, follow: this.ship, emitting: false }).setDepth(7);
    this.tweens.add({ targets: this.ship, angle: { from: -3, to: 3 }, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.routeG = this.add.graphics().setDepth(6);
    this.cameras.main.centerOn(at.x, at.y);
    if (data && data.resume && data.resume.path) {
      this.sailing = data.resume; this.wake.emitting = true;
      this.cameras.main.startFollow(this.ship, true, 0.08, 0.08);
    }

    // 끌어서 지도 움직이기
    this.input.on('pointermove', p => {
      if (!p.isDown) return;
      const c = this.cameras.main;
      c.scrollX -= (p.x - p.prevPosition.x); c.scrollY -= (p.y - p.prevPosition.y);
      if (Math.abs(p.x - p.downX) + Math.abs(p.y - p.downY) > 10) this.dragged = true;
    });
    this.input.on('pointerdown', () => { this.dragged = false; });
    this.hudDom();
    this.events.on('shutdown', () => { UI.clear('scene'); });
  }

  addPort(pid) {
    const P = PORTS[pid], p = GEO.px(P.lon, P.lat);
    const ic = this.add.image(p.x, p.y - 18, 'mapicon/' + P.icon).setScale(0.5).setDepth(6).setInteractive({ useHandCursor: true });
    const t = this.add.text(p.x, p.y + 20, P.name, { fontFamily: 'Gowun Batang, Noto Serif KR, serif', fontSize: 22, color: '#3b2614', fontStyle: 'bold', stroke: '#f6e6c4', strokeThickness: 5 }).setOrigin(0.5, 0).setDepth(6);
    ic.on('pointerup', () => { if (!this.dragged) this.choose(pid); });
    t.setInteractive({ useHandCursor: true }).on('pointerup', () => { if (!this.dragged) this.choose(pid); });
    this.markers[pid] = ic;
  }
  addWreck() {
    if (!G.flags.rumor_wreck) return;
    const R = RUINS.shabdiz_wreck, p = GEO.px(R.lon, R.lat);
    const done = G.flags.wreck_done;
    const ic = this.add.image(p.x, p.y, 'fx/whirlpool').setScale(0.22).setDepth(6).setAlpha(done ? 0.6 : 1).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: ic, angle: 360, duration: 6000, repeat: -1 });
    this.add.text(p.x, p.y + 26, done ? '샤브디즈호 (기록함)' : '샤브디즈호 침몰 지점', { fontFamily: 'Gowun Batang, serif', fontSize: 17, color: '#fff', stroke: '#2b3a67', strokeThickness: 5 }).setOrigin(0.5, 0).setDepth(6);
    ic.on('pointerup', () => { if (!this.dragged) this.choose('shabdiz_wreck'); });
  }
  reveal(lon, lat, quiet) {
    const p = GEO.px(lon, lat);
    this.fog.erase('fogbrush', p.x - 240, p.y - 240);
    if (!quiet) G.seen.push([+lon.toFixed(2), +lat.toFixed(2)]);
  }

  hudDom() {
    UI.clear('scene', 'panel');
    UI.hud();
    const L = UI.L.scene;
    const w = State.wind();
    const wb = el('div', 'windbox', `<img class="rose" src="${A('ui/wind_rose')}"><div class="arrow" style="transform:rotate(${w.toward}deg)"></div>`, L);
    this.windEl = wb;
    this.windLbl = el('div', 'windlbl', '', L);
    this.updWind();
    const bs = el('div', 'seabtns', null, L);
    if (!this.sailing && PORTS[G.port]) {
      btn(PORTS[G.port].name + '(으)로 돌아가기', 'paper', () => Game.toPort(G.port), bs, 'icon/inn');
    }
    this.tipEl = el('div', 'goal', this.sailing ? '' : '<b>지도에서 항구를 누르세요.</b> 끌어서 지도를 움직일 수 있어요.<br>바람과 같은 방향으로 가면 빠르고, 맞바람이면 2~3배 걸려요.', L);
    this.tipEl.style.bottom = '84px';
  }
  updWind() {
    const w = State.wind();
    this.windEl.querySelector('.arrow').style.transform = `rotate(${w.toward}deg)`;
    this.windLbl.innerHTML = `<b>${w.from}</b><br>${w.season}${w.calm ? ' · 폭풍 주의' : ''}`;
  }

  // ---------- 목적지 고르기 ----------
  choose(dest) {
    if (this.sailing) return;
    SFX.play('click');
    if (dest === G.port) return Game.toPort(dest);
    const path = GEO.route(G.port, dest);
    if (!path) return;
    const days = State.estimate(path);
    const food = Math.min(G.food, G.water) / State.dailyUse();
    this.routeG.clear();
    this.routeG.lineStyle(4, 0xb03a2e, 0.85);
    for (let i = 1; i < path.length; i++) {
      const a = GEO.px(path[i - 1].lon, path[i - 1].lat), b = GEO.px(path[i].lon, path[i].lat);
      const n = Math.max(1, Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 14));
      for (let k = 0; k < n; k += 2) {
        const t0 = k / n, t1 = Math.min(1, (k + 1) / n);
        this.routeG.lineBetween(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0, a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1);
      }
    }
    const name = PORTS[dest] ? PORTS[dest].name : RUINS[dest].name;
    const head = GEO.bearing(path[0], path[path.length - 1]);
    const wf = State.windFactor(head);
    const windTxt = wf > 1.0 ? '<span class="up">순풍</span>' : wf > 0.7 ? '옆바람' : '<span class="dn">맞바람</span>';
    UI.clear('panel');
    const L = UI.L.panel; L.style.pointerEvents = 'auto';
    const dim = el('div', 'dim', null, L); dim.style.background = 'transparent';
    const pop = el('div', 'pop fadein', `<h3>${name}</h3>예상 <b>${days}일</b> · 바람: ${windTxt} (${GEO.dirName(head)}쪽으로)<br>식량·물 약 <b class="${food < days + 2 ? 'dn' : ''}">${Math.floor(food)}일</b> 분량${food < days + 2 ? ' — <b class="dn">모자랄 수 있어요!</b>' : ''}<br>선원 ${G.crew}명 · 짐 ${State.cargoCount()}/${State.hold()}`, L);
    pop.style.cssText += ';left:50%;top:50%;transform:translate(-50%,-50%)';
    const bb = el('div', 'btns', null, pop);
    const close = () => { UI.clear('panel'); L.style.pointerEvents = 'none'; this.routeG.clear(); };
    dim.onclick = close;
    btn('출항!', '', () => { UI.clear('panel'); L.style.pointerEvents = 'none'; this.sail(path, dest); }, bb, 'icon/sail');
    btn('그만두기', 'paper', close, bb);
  }

  // ---------- 항해 ----------
  sail(path, dest) {
    SFX.play('sail');
    G.voyagesStarted = (G.voyagesStarted || 0) + 1;
    this.sailing = { path, dest, seg: 1, t: 0, dayAcc: 0, days: 0 };
    this.wake.emitting = true;
    this.hudDom();
    this.tipEl.innerHTML = `<b>${PORTS[dest] ? PORTS[dest].name : RUINS[dest].name}</b>(으)로 항해 중…`;
    this.cameras.main.startFollow(this.ship, true, 0.08, 0.08);
  }
  update(time, dtMs) {
    const s = this.sailing;
    if (!s || this.paused) return;
    const dt = Math.min(dtMs, 50) / 1000;
    const DAY = 0.55;                       // 하루 = 0.55초
    const a = s.path[s.seg - 1], b = s.path[s.seg];
    const head = GEO.bearing(a, b);
    const segLen = Math.hypot(b.lon - a.lon, b.lat - a.lat);
    const v = State.speed(head);           // 도/일
    s.t += (v * dt / DAY) / segLen;
    const t = Math.min(1, s.t);
    const lon = a.lon + (b.lon - a.lon) * t, lat = a.lat + (b.lat - a.lat) * t;
    const p = GEO.px(lon, lat);
    this.ship.setPosition(p.x, p.y);
    this.ship.setFlipX(b.lon < a.lon);
    G.at = { lon, lat };
    s.dayAcc += dt;
    if (s.dayAcc >= DAY) {
      s.dayAcc -= DAY; s.days++;
      const msgs = State.passDay(true);
      msgs.forEach(m => UI.toast(m));
      if (s.days % 2 === 0) this.reveal(lon, lat);
      UI.hud(); this.updWind();
      const ev = SeaEvents.roll(lon, lat, s);
      if (ev) { this.paused = true; ev().then(r => { if (r !== 'battle') this.paused = false; }); return; }
    }
    if (s.t >= 1) {
      s.seg++; s.t = 0;
      if (s.seg >= s.path.length) this.arrive(s.dest);
    }
  }
  async arrive(dest) {
    this.sailing = null; this.wake.emitting = false;
    this.cameras.main.stopFollow();
    this.reveal(G.at.lon, G.at.lat);
    G.voyages++;
    State.save();
    if (dest === 'shabdiz_wreck') {
      if (!G.flags.wreck_done) await Story.wreck();
      else { Talk.bg('bg/ruin_shabdiz_wreck', true); await Talk.n('맑은 물 아래, 스승의 배가 조용히 잠들어 있다.'); Talk.close(); }
      // 가장 가까운 항구로 돌아갈 수 있게: 지금 자리를 기준 항구로 삼지 않고 지도에 머무름
      G.port = 'shabdiz_wreck';
      this.scene.restart();
      return;
    }
    if (dest === 'kalah' && !G.flags.seri) {
      await Story.seriIntro();
      Game.toBattle('seri', async won => { await Story.seriAfter(won); Game.toPort('kalah'); });
      return;
    }
    Game.toPort(dest);
  }
}

// ---------- 바다 사건 ----------
const SeaEvents = {
  roll(lon, lat, s) {
    if (s.days < 2) return null;
    const m = State.month();
    const strait = lat > 0.3 && lon < 104.5;                   // 말라카 해협
    const r = Math.random();
    const stormP = (m === 4 || m === 10) ? 0.06 : 0.012;
    let acc = 0;
    if (r < (acc += strait ? 0.03 : 0.012)) return () => SeaEvents.pirate();
    if (r < (acc += stormP)) return () => SeaEvents.storm();
    if (r < (acc += 0.014)) return () => SeaEvents.drift();
    if (r < (acc += 0.008)) return () => SeaEvents.castaway();
    if (r < (acc += 0.03)) return () => SeaEvents.dolphins();
    return null;
  },
  async pirate() {
    SFX.play('drum');
    Talk.bg('bg/sky_day');
    Talk.stand([]);
    await Talk.n('수평선에 붉은 돛이 보인다. 노를 가득 단 해적선이 다가온다!');
    const toll = Math.max(10, Math.round(G.gold * 0.2));
    const v = await Talk.choice([['맞서 싸운다', 'fight'], ['바람을 타고 달아난다', 'run'], [`통행료를 낸다 (${toll} 디나르)`, 'pay', G.gold < toll]]);
    Talk.close();
    if (v === 'pay') { G.gold -= toll; UI.toast(`해적에게 ${toll} 디나르를 주었다`); UI.hud(); return; }
    if (v === 'run') {
      const chance = 0.35 + (SHIPS[G.ship].speed - 1) + (G.mates.includes('dayang') ? 0.15 : 0) + State.wind().str * 0.1;
      if (Math.random() < chance) { SFX.play('sail'); UI.toast('바람을 타고 따돌렸다!'); return; }
      UI.toast('따라잡혔다! 싸울 수밖에 없다');
    }
    return new Promise(res => {
      const sea = Game.game.scene.getScene('Sea');
      const snap = { ...sea.sailing };
      res('battle');
      Game.toBattle('pirate', () => Game.toSea(snap));
    });
  },
  async storm() {
    SFX.play('storm');
    Talk.bg('bg/sky_storm');
    await Talk.n('하늘이 갑자기 검게 변했다. 바람이 미친 듯이 돛을 때린다!');
    let dmg = irand(8, 22);
    if (G.mates.includes('dayang')) { dmg = Math.round(dmg * 0.7); await Talk.say('dayang', 'determined', '돛을 내려! 파도를 비스듬히 받아!'); }
    G.hull = Math.max(5, G.hull - dmg);
    let lost = '';
    const goods = Object.keys(G.cargo);
    if (goods.length && Math.random() < 0.35) {
      const g = pick(goods), n = Math.min(G.cargo[g].n, irand(1, 4));
      G.cargo[g].n -= n; if (G.cargo[g].n <= 0) delete G.cargo[g];
      lost = ` 파도에 ${GOODS[g].name} ${n}짐을 잃었다.`;
    }
    G.morale = Math.max(0, G.morale - 8);
    await Talk.n(`폭풍이 지나갔다. 선체 -${dmg}.${lost}`);
    Talk.close(); UI.hud();
  },
  async drift() {
    const room = State.hold() - State.cargoCount();
    const g = pick(['coconut', 'cinnamon', 'tin', 'changsha_bowl', 'camphor']);
    const n = Math.min(room, irand(2, 5));
    Talk.bg('bg/sky_day');
    await Talk.n('물 위에 떠다니는 나무 상자를 발견했다.');
    if (n > 0) {
      const c = G.cargo[g] || { n: 0, cost: 0 };
      c.cost = c.cost * c.n / (c.n + n); c.n += n; G.cargo[g] = c;
      SFX.play('discover');
      await Talk.n(`상자 안에 ${GOODS[g].name} ${n}짐이 들어 있었다! 짐칸에 실었다.`);
    } else await Talk.n('짐칸이 가득 차서 실을 수 없었다. 아쉽게 흘려보냈다.');
    Talk.close(); UI.hud();
  },
  async castaway() {
    Talk.bg('bg/sky_day');
    await Talk.n('부서진 뗏목에 매달린 어부 두 사람을 건져 올렸다.');
    const room = SHIPS[G.ship].crewMax - G.crew;
    if (room > 0) {
      const n = Math.min(room, 2);
      G.crew += n; G.morale = Math.min(100, G.morale + 5);
      await Talk.n(`"은혜를 갚겠소!" 어부 ${n}명이 선원이 되었다.`);
    } else await Talk.n('"다음 항구까지만 태워 주시오." 어부들은 고마워했다.');
    G.fame.sea += 5;
    Talk.close(); UI.hud();
  },
  async dolphins() {
    SFX.play('splash');
    G.morale = Math.min(100, G.morale + 6);
    UI.toast('돌고래 떼가 배를 따라온다! 선원들이 웃는다 (사기 +6)', 'fx/dolphins');
  },
};
