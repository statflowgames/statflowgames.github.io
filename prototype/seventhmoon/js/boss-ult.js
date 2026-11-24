// 🆕 2026-11-24 보스 강공격·필살기 (사용자: '보스들이 조금 약하고 크리티컬 공격이 없는 듯')
//   1) 강공격(치명타): 내려찍기 중 일부가 붉게 달아오르며 더 오래 모았다가 친다.
//      맞으면 피해 1.8배 + 쓰러짐 + '치명타!'. 보통 가드는 깨진다(가드 브레이크, 피해 60%). 저스트 가드(패리)는 그대로 막힌다.
//   2) 필살기: 장 보스는 체력 50%·20%에, 중간 보스는 40%에 한 번씩.
//      화면 위에 '필살기' 띠 → 바닥 전체가 붉게 물들고 '안전' 자리 하나만 남는다 → 모으는 시간 뒤 폭발.
//      안전 자리 밖에 있으면 최대 체력의 38%를 치명타로 맞는다 (구르기 무적·패리로도 피할 수 있다). 필살기 중 보스는 그로기에 빠지지 않는다.
//   주소에 ?oldboss 면 둘 다 끈다 (예전 보스).
const BOSS_ULT_NAME = {
  barkhaul: '대지 붕괴', toothcrusher: '돌격 대난동', captain_mog: '일제 포격', gloob: '오물 해일', twinsting: '모래 지옥',
  sehera: '황금 모래 폭풍', frost_wyvern: '빙하 낙하', hrimgar: '만년설 붕괴', golem7: '과부하 광선', orvex: '사슬 낙인',
  orvex_eclipse: '흑월 일식', azmal: '흑월의 숨결', void_shadow: '순환의 끝',
  glass_queen: '유리 폭풍', star_colossus: '유성 낙하', drowned_captain: '심해 포격', naia: '잠의 노래', forge_golem: '용광로 폭발',
  ignar: '화산 분화', rot_warden: '썩은 뿌리 지옥', mycela: '포자 폭발', storm_wyvern: '천둥 낙하', morgan: '은빛 심판',
  moon_azmal: '달그림자 숨결', moon_orvex: '일곱 번째 달',
};
const BossUlt = {
  on() { return !(typeof Q !== 'undefined' && Q.has('oldboss')); },
  // 내려찍기를 강공격으로 할지
  rollEmpower(m) { return this.on() && Math.random() < (m.raged ? 0.45 : 0.3); },
  // 필살기를 쓸 차례인지 (idle/move에서 부름)
  due(m) {
    if (!this.on() || m.dead) return false;
    const marks = m.def.mid ? [0.4] : [0.5, 0.2];
    m.ultUsed = m.ultUsed || 0;
    return m.ultUsed < marks.length && m.hp < m.maxHp * marks[m.ultUsed];
  },
  start(m) {
    const sc = m.scene, h = sc.hero;
    m.ultUsed = (m.ultUsed || 0) + 1;
    m.state = 'ult'; m.st = 0; m.vx = m.vy = 0; m.hitDone = false;
    m.play('b_roar', 80); m.setHead('head_shout');
    SFX.roar(m.px, m.id); SFX.bossWarning && SFX.bossWarning();
    sc.cameras.main.shake(500, 0.008);
    const warn = (sc.ch >= 7 ? 1700 : 2000) - (m.ultUsed > 1 ? 200 : 0);
    // 안전 자리: 보스에게서 먼 쪽, 화면 안
    const cx = sc.cameras.main.scrollX, lo = cx + 170, hi = cx + W - 170;
    let sx = m.x > cx + W / 2 ? lo + Math.random() * 220 : hi - Math.random() * 220;
    if (Math.abs(sx - m.x) < 380) sx = Phaser.Math.Clamp(m.x + (m.x > cx + W / 2 ? -1 : 1) * 420, lo, hi);
    const sy = Phaser.Math.Clamp(FLOOR_TOP + 40 + Math.random() * (FLOOR_BOT - FLOOR_TOP - 80), FLOOR_TOP + 30, FLOOR_BOT - 30);
    const RX = 150, RY = 52;
    // 바닥 위험 표시 + 안전 자리
    const g = sc.add.graphics().setDepth(997), top = sc.add.graphics().setDepth(4950);
    const dim = sc.add.rectangle(0, 0, W, H, 0x200000, 0).setOrigin(0).setScrollFactor(0).setDepth(3800);
    sc.tweens.add({ targets: dim, fillAlpha: 0.28, duration: 300 });
    const safeT = sc.add.text(sx, sy - RY - 26, '안전', { fontFamily: 'sans-serif', fontSize: 24, color: '#eaffea', stroke: '#0a3a10', strokeThickness: 6, fontStyle: 'bold' }).setOrigin(0.5).setDepth(4951);
    // 화면 위 '필살기' 띠
    const band = sc.add.container(W + 40, 0).setScrollFactor(0).setDepth(7550);
    const bg = sc.add.graphics(); bg.fillStyle(0x000000, 0.78).fillRect(0, 150, W, 96); bg.fillStyle(0xff3a20, 1).fillRect(0, 146, W, 4).fillRect(0, 246, W, 4);
    band.add(bg);
    band.add(sc.add.text(W / 2, 170, `${m.def.ko}의 필살기`, { fontFamily: 'sans-serif', fontSize: 20, color: '#ffc8b8' }).setOrigin(0.5, 0));
    band.add(sc.add.text(W / 2, 196, BOSS_ULT_NAME[m.id] || BOSS_ULT_NAME[m.def.like] || '필살기', { fontFamily: 'serif', fontSize: 40, color: '#ffeedd', stroke: '#7a0a00', strokeThickness: 8 }).setOrigin(0.5, 0));
    // 🆕 2026-11-24 보스 컷인 그림이 있으면 띠 오른쪽 위로 얼굴을 내민다
    const bk = 'bosscut/' + m.id;
    if (sc.textures.exists(bk)) { const im = sc.add.image(W - 190, 250, bk).setOrigin(0.5, 1); im.setScale(Math.min(250 / im.height, 380 / im.width)); band.add(im); }
    sc.tweens.add({ targets: band, x: 0, duration: 220, ease: 'Cubic.out' });
    sc.tweens.add({ targets: band, alpha: 0, duration: 250, delay: 1150, onComplete: () => band.destroy() });
    m.ult = { warn, sx, sy, RX, RY, g, top, dim, safeT, band };
    sc.onceHint && sc.onceHint('ult', '보스 필살기! 초록색 「안전」 자리로 피하세요.\n폭발 순간에 구르면 무적으로도 피할 수 있어요.', 3200);
    m.rig.setTintAll(0xff6050);
    sc.statUlt = (sc.statUlt || 0) + 1;
  },
  // 필살기 진행 (bossAI에서 state === 'ult' 일 때)
  update(m, dt) {
    const sc = m.scene, u = m.ult;
    if (!u) { m.toIdle(); return; }
    const t = m.st, k = Math.min(1, t / u.warn);
    const cx = sc.cameras.main.scrollX;
    // 위험 바닥 (맥박이 점점 빨라진다)
    const pulse = 0.5 + 0.5 * Math.sin(t / (140 - 90 * k));
    u.g.clear();
    if (!m.hitDone) {
      u.g.fillStyle(0xff2a10, 0.18 + 0.22 * k + 0.1 * pulse).fillRect(cx - 40, FLOOR_TOP - 20, W + 80, FLOOR_BOT - FLOOR_TOP + 50);
      u.g.fillStyle(0xe8ffe8, 0.35 + 0.15 * pulse).fillEllipse(u.sx, u.sy, u.RX * 2, u.RY * 2);
      u.top.clear().lineStyle(5, 0x8aff9a, 0.95).strokeEllipse(u.sx, u.sy, u.RX * 2, u.RY * 2);
      u.top.lineStyle(3, 0xff5030, 0.5 + 0.5 * pulse).strokeRect(cx + 6, FLOOR_TOP - 16, W - 12, FLOOR_BOT - FLOOR_TOP + 42);
      // 남은 시간 고리 (안전 자리 위)
      u.top.lineStyle(6, 0xffffff, 0.9).beginPath().arc(u.sx, u.sy - u.RY - 62, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - k)).strokePath();
      if (t % 400 < dt) m.kick(-4, 0, -0.05);
    }
    if (!m.hitDone && t >= u.warn) {
      m.hitDone = true;
      SFX.smash(m.px); SFX.bossGrunt && SFX.bossGrunt(m.px, m.id);
      sc.tintFlash(0xff4020, 0.5, 320); sc.cameras.main.shake(600, 0.02);
      for (let i = 0; i < 7; i++) { const x = cx + 90 + i * (W - 180) / 6; sc.fx('impact_ring', x, FLOOR_TOP + 90 + (i % 2) * 90, { s: 0.9, dur: 600, depth: FLOOR_TOP, flat: true }); sc.fx('dust_land', x, FLOOR_BOT - 40, { s: 0.7, dur: 600, depth: FLOOR_BOT }); }
      const h = sc.hero, inSafe = ((h.x - u.sx) / u.RX) ** 2 + ((h.y - u.sy) / u.RY) ** 2 <= 1;
      if (!inSafe && h.z < 140) sc.resolveHeroHit(m, Math.round(h.maxHp * 0.38), 'crit', m.x, m.y);
      const al = sc.ally;
      if (al && !(((al.x - u.sx) / u.RX) ** 2 + ((al.y - u.sy) / u.RY) ** 2 <= 1)) al.takeHit(m, Math.round(m.def.dmg * 1.6), 'heavy', Math.sign(al.x - m.x) || 1);
      sc.tweens.add({ targets: u.dim, fillAlpha: 0, duration: 400 });
      sc.tweens.add({ targets: u.safeT, alpha: 0, duration: 200 });
      u.top.clear();
    }
    if (t >= u.warn + 750) {
      this.cleanup(m);
      m.rig.setTintAll(null); m.cool = 500; m.toIdle();
    }
  },
  cleanup(m) {
    const u = m.ult; if (!u) return;
    for (const o of [u.g, u.top, u.dim, u.safeT, u.band]) if (o && o.scene) o.destroy();   // ✏️ 2026-11-24 띠도 (필살기 직후 보스가 쓰러지면 결과 화면까지 남았다)
    m.ult = null;
  },
};
