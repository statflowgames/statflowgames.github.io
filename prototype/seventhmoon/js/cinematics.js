// 🆕 2026-11-24 짧은 연출 두 가지 (사용자: '필살기 때 짧은 애니메이션', '보스 등장도 비슷하게')
//   1) 각성기(필살기) 컷인 — 약 0.8초, 그동안 전투가 멈춘다. 같은 스테이지 두 번째부터는 0.45초.
//      직업색 사선 띠 + 속도선 → 얼굴(또는 전용 컷인 그림)이 미끄러져 들어오고 눈이 번쩍 → 기술 이름이 쾅 → 하얗게 번쩍하며 발동
//   2) 보스 등장 — 이야기 모드에서 그 보스를 처음 만날 때만 약 2.3초 (화면 누르면 건너뜀). 다시 만나거나 탑·도전·중간 보스는 예전 이름 띠만.
//      경고(붉은 테두리·경고 띠) → 위아래 검은 띠 + 화면이 보스로 이동 → 포효·흔들림 → 이름·별명·공략 힌트 찍기 → 주인공에게 돌아옴
//   설정 '필살기·보스 연출'을 끄면 둘 다 예전 방식.
//   전용 그림이 들어오면 자동으로 쓴다: 영웅 cutin/<직업>, 보스 bosscut/<보스 id> (없으면 지금 그림)
//   게임 쪽 연결: game.js update() 맨 앞 `if (this.cutin) return Cinema.update(this, rawDt)`, awakenCutIn → Cinema.hero, bossIntro → Cinema.boss

// 보스 별명 (이름 아래 한 줄)
const BOSS_EPITHET = {
  barkhaul: '광기에 물든 숲의 수호자', toothcrusher: '그롤린 떼의 대장', captain_mog: '갈고리를 휘두르는 해적왕',
  gloob: '저수조를 삼킨 오물의 왕', twinsting: '두 독침의 사막 사냥꾼', sehera: '모래 속에 잠든 여왕',
  frost_wyvern: '얼음 둥지의 날개', hrimgar: '서리 산맥의 왕', golem7: '마도탑의 일곱 번째 심장',
  orvex: '사슬에 묶인 대마법사', orvex_eclipse: '흑월에 삼켜진 현자', azmal: '심연에서 깨어난 흑월룡',
  void_shadow: '300년의 순환, 그 자체',
  glass_queen: '유리 사막의 여왕', star_colossus: '별똥으로 빚은 거상', drowned_captain: '바다 밑에서 돌아온 선장',
  naia: '노래로 잠재우는 바다의 여왕', forge_golem: '꺼지지 않는 용광로', ignar: '대장간 산의 불꽃 수호자',
  rot_warden: '거꾸로 자란 숲의 문지기', mycela: '포자 왕관의 여왕', storm_wyvern: '번개를 삼킨 날개',
  morgan: '은실로 꿰맨 은빛 사도', moon_azmal: '달의 뒷면에 남은 그림자', moon_orvex: '일곱 번째 달이 되려는 자',
};
// 장마다 강조색
const CH_COL = [0xb080ff, 0x9ad060, 0x60b8e0, 0xe0b050, 0x90d0ff, 0xb0a0ff, 0xc060ff, 0xb8e8ff, 0x60c8d8, 0xff8a50, 0xc090ff, 0xf0e8a0, 0xd8e0ff];

const Cinema = {
  on() { return !(typeof Settings !== 'undefined' && Settings.d && Settings.d.cine === false) && !(typeof Q !== 'undefined' && Q.has('nocine')); },

  // ---------------- 공용: 멈춘 동안 화면 그리기 ----------------
  update(sc, rawDt) {
    const c = sc.cutin, dt = Math.min(rawDt, 40);
    c.t += dt;
    for (const m of sc.monsters) if (!m.dead || m.state === 'dying') m.draw(dt, m !== c.live);
    sc.hero.draw(dt, true);
    if (sc.ally) sc.ally.draw(dt, true);
    if (c.tick) c.tick(c.t, dt);
    sc.drawHud();
    if (c.t >= c.dur) this.end(sc);
  },
  end(sc) {
    const c = sc.cutin; if (!c) return;
    sc.cutin = null;
    for (const o of c.objs || []) if (o && o.scene) o.destroy();
    this.showUi(sc);
    if (c.onEnd) c.onEnd();
  },
  // 🆕 2026-11-24 연출 동안 터치 버튼·안내 상자·말풍선·콤보 숫자를 숨기고, 끝나면 바로 다시 보인다 (버튼은 살짝 페이드 인)
  //   연출 동안은 전투가 통째로 멈춰 있어서 남은 몬스터도 움직이거나 공격하지 못한다
  hideUi(sc) {
    if (sc.cineHidden) return;
    const list = sc.children.list.filter(o => o.visible && ((o.depth >= 5200 && o.depth <= 6105) || o.depth === 7600));
    for (const o of [sc.comboText, sc.comboSub]) if (o && o.visible) list.push(o);
    for (const o of list) o.setVisible(false);
    sc.cineHidden = list;
    if (sc.resetTouchControls) sc.resetTouchControls();
  },
  showUi(sc) {
    const list = sc.cineHidden; if (!list) return;
    sc.cineHidden = null;
    for (const o of list) if (o && o.scene) o.setVisible(true);
    for (const b of sc.btns || []) b.fadeK = 0;   // updateTouchFade가 0 → 원래 진하기로 부드럽게 되돌린다
  },
  // 사선 띠 꼭짓점 (왼쪽 아래 → 오른쪽 위로 기운다)
  band(y0, h, tilt) { return [{ x: -40, y: y0 + tilt }, { x: W + 40, y: y0 - tilt }, { x: W + 40, y: y0 - tilt + h }, { x: -40, y: y0 + tilt + h }]; },

  // ---------------- 1) 각성기 컷인 ----------------
  hero(sc, h) {
    const key = (h && h.key) || 'warrior';
    const sig = HERO_SIGNATURE[key], aw = DB.skills[key].list[15].name;
    sc.cutinCount = (sc.cutinCount || 0) + 1;
    const short = sc.cutinCount > 1, dur = short ? 460 : 800;
    const S = v => v * (dur / 800);   // 짧은 판은 시간 비율을 줄인다
    const c = sc.add.container(0, 0).setScrollFactor(0).setDepth(8000);
    const dim = sc.add.rectangle(0, 0, W, H, 0x000000, 0).setOrigin(0);
    const band = sc.add.graphics(), lines = sc.add.graphics();
    const P = this.band(230, 270, 70);
    band.fillStyle(0x0a0610, 0.92).fillPoints(P, true);
    band.fillStyle(sig.color, 0.9).fillPoints(this.band(240, 250, 70), true);
    band.fillStyle(0x000000, 0.58).fillPoints(this.band(290, 150, 70), true);   // 기술 이름 뒤를 어둡게 (글자가 띠 색에 묻히지 않게)
    band.lineStyle(5, 0xffffff, 0.9).lineBetween(P[0].x, P[0].y, P[1].x, P[1].y).lineBetween(P[3].x, P[3].y, P[2].x, P[2].y);
    const bandC = sc.add.container(-W - 80, 0, [band, lines]);
    // 얼굴: 전용 컷인 그림 → 새 그림 외침 얼굴 → 옛 그림
    let face, art = false, mg = null;
    if (sc.textures.exists('cutin/' + key)) {
      // ✏️ 2026-11-24 전용 컷인 그림: 띠보다 조금 큰 사선 창 안에서만 보이게 (위아래 잘린 모서리가 사선으로 깔끔하게)
      art = true;
      face = sc.add.image(-420, 396, 'cutin/' + key); face.setScale(Math.min(372 / face.height, 760 / face.width));
      mg = sc.make.graphics({ x: 0, y: 0, add: false }); mg.fillStyle(0xffffff).fillPoints(this.band(200, 330, 70), true); mg.setScrollFactor(0);
      face.setMask(mg.createGeometryMask());
    } else {
      const cf = typeof CuteHeroes !== 'undefined' && CuteHeroes.face(sc, key, 'shout');
      const ck = sc.textures.exists(key + '/cutin') ? key + '/cutin' : sc.textures.exists(key + '/head_attack') ? key + '/head_attack' : 'warrior/head_attack';
      face = cf ? sc.add.image(-320, 365, cf[0], cf[1]) : sc.add.image(-320, 365, ck);
      face.setScale(270 / face.height);
    }
    const fs0 = face.scale;
    const glint = sc.add.graphics().setVisible(false);
    const tx = art ? 900 : 820;
    const t1 = sc.add.text(tx, 330, aw, { fontFamily: 'serif', fontSize: 80, color: sig.css, stroke: sig.edge, strokeThickness: 11 }).setOrigin(0.5).setAlpha(0).setScale(2.4);
    const t2 = sc.add.text(tx, 410, `${DB.heroes[key].name} · 각성기`, { fontFamily: 'sans-serif', fontSize: 26, color: '#fff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setAlpha(0);
    const flash = sc.add.rectangle(0, 0, W, H, 0xffffff, 0).setOrigin(0);
    c.add([dim, bandC, face, glint, t1, t2, flash]);
    sc.tweens.add({ targets: dim, fillAlpha: 0.5, duration: S(110) });
    sc.tweens.add({ targets: bandC, x: 0, duration: S(150), ease: 'Cubic.out' });
    sc.tweens.add({ targets: face, x: art ? 350 : 330, duration: S(200), delay: S(70), ease: 'Back.out' });
    sc.tweens.add({ targets: face, scale: { from: fs0 * 1.18, to: fs0 }, duration: S(260), delay: S(70) });
    sc.tweens.add({ targets: t1, alpha: 1, scale: 1, duration: S(150), delay: S(230), ease: 'Back.out', onComplete: () => sc.cameras.main.shake(short ? 80 : 130, 0.008) });
    sc.tweens.add({ targets: t2, alpha: 1, duration: S(120), delay: S(330) });
    sc.tweens.add({ targets: flash, fillAlpha: { from: 0, to: 0.85 }, duration: S(90), delay: dur - S(150), yoyo: true });
    // 속도선 + 눈 번쩍
    const seeds = Array.from({ length: 16 }, () => ({ y: 250 + Math.random() * 230, x: Math.random() * W, len: 120 + Math.random() * 260, sp: 2.2 + Math.random() * 2.2, w: 2 + Math.random() * 3 }));
    const tick = (t) => {
      lines.clear();
      for (const s of seeds) {
        const x = ((s.x - t * s.sp) % (W + 400) + W + 400) % (W + 400) - 200;
        const yy = s.y + 70 - 140 * (x / W);   // 띠 기울기를 따라
        lines.lineStyle(s.w, 0xffffff, 0.55).lineBetween(x, yy, x + s.len, yy - 140 * (s.len / W));
      }
      const gt = (t - S(250)) / S(220);
      if (!short && !art && gt > 0 && gt < 1) {
        const k = Math.sin(Math.PI * gt), R = 46 * k, w = R * 0.16, gx = face.x + face.displayWidth * 0.08, gy = face.y - face.displayHeight * 0.12;
        glint.setVisible(true).clear().fillStyle(0xffffff, 0.95)
          .fillPoints([{ x: gx, y: gy - R }, { x: gx + w, y: gy }, { x: gx, y: gy + R }, { x: gx - w, y: gy }], true)
          .fillPoints([{ x: gx - R * 1.3, y: gy }, { x: gx, y: gy - w }, { x: gx + R * 1.3, y: gy }, { x: gx, y: gy + w }], true);
      } else glint.setVisible(false);
    };
    this.hideUi(sc);
    sc.cutin = {
      kind: 'hero', t: 0, dur, tick, objs: [c, mg],
      // ✏️ 2026-11-24 컷인이 끝나는 번쩍임 바로 뒤에 기술이 터지게 (예전엔 0.6초쯤 비었다)
      onEnd: () => { if (h && h.state === 'awaken') h.st = Math.max(h.st, 420); },
    };
  },

  // ---------------- 2) 보스 등장 ----------------
  bossFirst(sc, kind) {
    const s = sc.save;
    // ✏️ 2026-11-24 중간 보스도 컷인 그림이 생겨서 처음 만날 때는 전체 연출
    return this.on() && sc.mode === 'story' && !sc.tower && MONDEF[kind] && !(s && s.seen && s.seen['bi_' + kind]);
  },
  boss(sc, kind, after) {
    const d = MONDEF[kind] || MONDEF.barkhaul, s = sc.save;
    if (s) { s.seen = s.seen || {}; s.seen['bi_' + kind] = true; }
    const cam = sc.cameras.main, col = CH_COL[Math.min(12, sc.ch || 0)] || 0xb080ff;
    const colCss = '#' + col.toString(16).padStart(6, '0');
    const T = { warnEnd: 520, panIn: 480, roar: 900, name: 960, back: 1950, end: 2350 };
    SFX.bossWarning();
    // 경고: 붉은 테두리 + 위·아래 경고 띠
    const warn = sc.add.graphics().setScrollFactor(0).setDepth(7450);
    const tapeTxt = '⚠ 경고  ·  강한 적이 다가온다  ·  ';
    const mkTape = (y) => sc.add.text(0, y, tapeTxt.repeat(6), { fontFamily: 'sans-serif', fontSize: 22, color: '#1a0606', fontStyle: 'bold', backgroundColor: '#e8402a', padding: { x: 0, y: 6 } }).setScrollFactor(0).setDepth(7451).setAlpha(0);
    const tapeA = mkTape(96), tapeB = mkTape(H - 136);
    // 위아래 검은 띠
    const barT = sc.add.rectangle(0, -80, W, 80, 0x000000, 1).setOrigin(0).setScrollFactor(0).setDepth(7440);
    const barB = sc.add.rectangle(0, H, W, 80, 0x000000, 1).setOrigin(0).setScrollFactor(0).setDepth(7440);
    // 이름 카드 (왼쪽 아래)
    const card = sc.add.container(-520, 0).setScrollFactor(0).setDepth(7500);
    const cg = sc.add.graphics();
    cg.fillStyle(0x000000, 0.72).fillPoints([{ x: 0, y: 432 }, { x: 720, y: 432 }, { x: 660, y: 606 }, { x: 0, y: 606 }], true);
    cg.fillStyle(col, 1).fillRect(0, 428, 720, 5);
    card.add(cg);
    const label = sc.add.text(80, 446, d.mid ? '중간 보스' : kind === 'void_shadow' ? '숨은 보스' : `${sc.ch}장 보스`, { fontFamily: 'sans-serif', fontSize: 22, color: colCss });
    const name = sc.add.text(80, 508, d.ko, { fontFamily: 'serif', fontSize: 58, color: '#f6ffd8', stroke: '#1d0a2a', strokeThickness: 9 }).setOrigin(0, 0.5);
    const epi = sc.add.text(84, 550, BOSS_EPITHET[kind] || '', { fontFamily: 'sans-serif', fontSize: 22, color: '#e8dcff', stroke: '#000', strokeThickness: 4 });
    card.add([label, name, epi]);
    const gd = typeof BOSS_GIMMICK_DEF !== 'undefined' && BossGimmicks.on() && BOSS_GIMMICK_DEF[kind];
    const hint = gd && gd.hint ? sc.add.text(84, 580, '◆ ' + gd.hint, { fontFamily: 'sans-serif', fontSize: 18, color: '#ffd890', stroke: '#000', strokeThickness: 4 }) : null;
    if (hint) card.add(hint);
    // 전용 보스 컷인 그림이 있으면 오른쪽에서 (없으면 화면 속 보스를 비추는 것으로 충분)
    const bk = 'bosscut/' + kind;
    let art = null;
    // ✏️ 아래쪽은 화면 아래 검은 띠 뒤로 숨겨 그림의 잘린 끝이 안 보이게
    if (sc.textures.exists(bk)) { art = sc.add.image(W + 520, H - 56, bk).setOrigin(0.5, 1).setScrollFactor(0).setDepth(7435); art.setScale(Math.min(600 / art.height, 860 / art.width)); }
    const skipHint = sc.add.text(W - 24, H - 30, '화면을 누르면 건너뛰기', { fontFamily: 'sans-serif', fontSize: 16, color: '#bbb' }).setOrigin(1, 1).setScrollFactor(0).setDepth(7501).setAlpha(0);
    const objs = [warn, tapeA, tapeB, barT, barB, card, skipHint, art].filter(Boolean);
    const camFrom = cam.scrollX;
    let camTo = null, roared = false, named = false, backed = false, boss = null;
    const findBoss = () => sc.boss || sc.monsters.find(m => m.def && m.def.boss && !m.dead);
    sc.tweens.add({ targets: [tapeA, tapeB], alpha: 1, duration: 120 });
    sc.tweens.add({ targets: [barT], y: 0, duration: 260, delay: 380, ease: 'Cubic.out' });
    sc.tweens.add({ targets: [barB], y: H - 80, duration: 260, delay: 380, ease: 'Cubic.out' });
    sc.tweens.add({ targets: skipHint, alpha: 0.8, duration: 300, delay: 600 });
    const tick = (t) => {
      // 경고 테두리 맥박
      warn.clear();
      if (t < T.warnEnd + 300) {
        const a = (t < T.warnEnd ? 0.55 + 0.35 * Math.sin(t / 60) : 0.9 * (1 - (t - T.warnEnd) / 300)) * 0.8;
        for (let i = 0; i < 6; i++) warn.lineStyle(14, 0xff2a10, a * (1 - i / 6)).strokeRect(i * 12, i * 12, W - i * 24, H - i * 24);
        tapeA.x = -((t * 0.25) % 400); tapeB.x = -400 + ((t * 0.25) % 400);
      } else if (tapeA.visible) { tapeA.setVisible(false); tapeB.setVisible(false); }
      boss = boss || findBoss();
      // 화면을 보스 쪽으로
      if (t >= T.warnEnd && t < T.back) {
        if (camTo === null && boss) {
          const lo = sc.lock ? sc.lock.l : 0, hi = (sc.lock ? sc.lock.r : STAGE_W) - W;
          camTo = Phaser.Math.Clamp(boss.x - W * 0.66, Math.max(0, lo), Math.max(0, hi));
          // 보스가 아직 화면 밖(등장 걸음 전)이면 무대 안쪽으로 당겨 와서 보이게 한다
          if (boss.x > camTo + W - 230) boss.x = camTo + W - 260;
        }
        if (camTo !== null) { const u = Math.min(1, (t - T.warnEnd) / T.panIn), e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2; cam.scrollX = camFrom + (camTo - camFrom) * e; }
      }
      if (!roared && t >= T.roar) {
        roared = true;
        if (boss) {
          sc.cutin.live = boss;   // 보스만 움직이게
          if (boss.play) boss.play('m_windup', 60);
          if (boss.kick) boss.kick(-16, 0, -0.2);
          sc.fx && sc.fx('dust_land', boss.x, boss.y, { s: 0.7, dur: 600, depth: boss.y - 1 });
          SFX.roar(boss.px, boss.id);
        }
        cam.shake(420, 0.012);
        cam.flash(120, 255, 80, 60);
      }
      if (!named && t >= T.name) {
        named = true;
        sc.tweens.add({ targets: card, x: 0, duration: 220, ease: 'Cubic.out' });
        name.setScale(1.9).setAlpha(0);
        sc.tweens.add({ targets: name, scale: 1, alpha: 1, duration: 170, delay: 120, ease: 'Back.out', onComplete: () => cam.shake(120, 0.006) });
        if (art) sc.tweens.add({ targets: art, x: W - 380, duration: 260, ease: 'Back.out' });
      }
      if (t >= T.back) {
        if (!backed) { backed = true; sc.tweens.add({ targets: card, x: -760, alpha: 0, duration: 260, ease: 'Cubic.in' }); if (art) sc.tweens.add({ targets: art, x: W + 520, duration: 240 }); sc.tweens.add({ targets: barT, y: -80, duration: 300, delay: 120 }); sc.tweens.add({ targets: barB, y: H, duration: 300, delay: 120 }); }
        const heroTo = Phaser.Math.Clamp(sc.hero.x - W * 0.42, 0, STAGE_W - W);
        const u = Math.min(1, (t - T.back) / (T.end - T.back)), e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
        const from = camTo === null ? camFrom : camTo;
        cam.scrollX = from + (heroTo - from) * e;
      }
    };
    const skip = () => { if (sc.cutin && sc.cutin.kind === 'boss' && sc.cutin.t > 250) { if (!roared && boss) SFX.roar(boss.px, boss.id); this.end(sc); } };
    sc.input.once('pointerdown', skip);
    this.hideUi(sc);
    sc.cutin = {
      kind: 'boss', t: 0, dur: T.end, tick, objs,
      // ✏️ 끝나면 주인공 0.6초 무적 (멈췄던 몬스터가 다시 움직이는 순간 바로 맞지 않게)
      onEnd: () => { sc.input.off('pointerdown', skip); sc.bossBar = true; sc.hero.invuln = Math.max(sc.hero.invuln || 0, 600); if (after) after(); },
    };
  },
};
