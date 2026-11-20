// 보스 고유 공략 장치. 보스마다 '이렇게 잡는다'가 하나씩 있다.
// 연결: Monster 생성(attach) · takeHit(damage) · bossHit 처치 순간(lethal) · bossAI 앞(update) · die(cleanup)
// 주소에 ?oldboss 를 붙이면 꺼진다.
const BOSS_GIMMICK_DEF = {
  barkhaul: { kind: 'regrow', hint: '쓰러져도 뿌리로 다시 일어난다 — 불로 마무리하라', trophy: '이끼 심장' },
  toothcrusher: { kind: null, hint: '체력이 절반이 되면 대장이 떨어져 따로 싸운다', trophy: '부러진 엄니' },
  captain_mog: { kind: 'armor', armor: 0.18, hint: '쇠갑옷을 먼저 벗겨라 — 강한 공격이 잘 든다', trophy: '녹슨 갈고리' },
  gloob: { kind: 'regrow', regrowHp: 0.25, hint: '오물이 다시 뭉친다 — 불로 태워 마무리하라', trophy: '오물 결정' },
  twinsting: { kind: 'armor', armor: 0.15, hint: '단단한 껍질 — 그로기를 노려 깨라', trophy: '쌍독침' },
  sehera: { kind: 'guarded', hint: '미라 호위병이 살아 있으면 거의 다치지 않는다', trophy: '여왕의 붕대' },
  frost_wyvern: { kind: 'flyer', hint: '하늘로 날아오른다 — 점프 공격과 원거리로 떨어뜨려라', trophy: '서리 비늘' },
  hrimgar: { kind: 'armor', armor: 0.3, rearm: true, hint: '얼음 갑옷 — 불과 강한 공격으로 깨라. 화나면 다시 얼어붙는다', trophy: '빙하 심장' },
  golem7: { kind: 'vent', hint: '광선을 쏜 뒤 몸이 열린다 — 그때가 기회', trophy: '마도 핵' },
  orvex: { kind: 'barrier', hint: '보랏빛 장막이 켜져 있을 땐 공격이 거의 막힌다', trophy: '대마법사의 깃' },
  orvex_eclipse: { kind: 'barrier', fast: true, hint: '장막이 더 자주 켜진다 — 꺼진 틈을 노려라', trophy: '일식의 파편' },
  azmal: { kind: 'flyer', phase: 0.6, hint: '체력이 줄면 하늘로 날아오른다 — 점프 공격과 원거리', trophy: '흑월 비늘' },
  void_shadow: { kind: 'barrier', fast: true, hint: '그림자 장막 — 꺼진 틈을 노려라', trophy: '공허의 조각' },
};

const BossGimmicks = {
  on() { return !(typeof Q !== 'undefined' && Q.has('oldboss')); },
  attach(m) {
    const d = BOSS_GIMMICK_DEF[m.id];
    if (!d || !this.on()) return;
    m.gimmick = { ...d, t: 0, armorHp: d.armor ? Math.round(m.maxHp * d.armor) : 0, armorMax: d.armor ? Math.round(m.maxHp * d.armor) : 0, revived: false, shieldOn: false, nextFly: 9000, nextBarrier: 3500 };
  },
  say(m, txt, col = '#ffe7a8', size = 26) {
    const now = m.scene.now || 0;
    if (m.gimmick.lastSay && now - m.gimmick.lastSay < 900 && m.gimmick.lastTxt === txt) return;
    m.gimmick.lastSay = now; m.gimmick.lastTxt = txt;
    m.scene.floatText(m.x, m.y - m.height - 30, txt, col, size);
  },
  // 피해 조정. 숫자를 돌려준다
  damage(m, src, a, dmg) {
    const g = m.gimmick, sc = m.scene, h = sc.hero;
    if (!g) return dmg;
    if (g.kind === 'armor' && g.armorHp > 0) {
      const strong = a.type === 'heavy' || a.type === 'knock' || a.type === 'launch' || a.type === 'slam' || m.state === 'stagger';
      const fire = m.lastElem === 'fire' || m.burnT > 0;
      g.armorHp -= dmg * (strong ? 1.6 : 0.8) * (fire ? 1.8 : 1);
      if (g.armorHp <= 0) {
        g.armorHp = 0;
        this.say(m, g.trophy === '빙하 심장' ? '얼음 갑옷이 깨졌다!' : '갑옷이 깨졌다!', '#ffd34d', 34);
        SFX.brk && SFX.brk(m.px, 'pot'); sc.cameras.main.shake(220, 0.01);
        m.state = 'stagger'; m.st = -900; m.vx = 0; m.play('m_down', 120); m.setHead('head_shout'); m.showEmote('dizzy', 3000);
        m.rig.setTintAll(null);
      } else this.say(m, '갑옷에 막힘', '#b8d8ff', 20);
      return Math.round(dmg * 0.25);
    }
    if (g.kind === 'guarded') {
      const guards = sc.monsters.filter(o => !o.dead && o !== m && !o.def.boss).length;
      if (guards > 0) {
        const holy = m.lastElem === 'holy' || h.key === 'paladin';
        this.say(m, `호위병 ${guards}명이 지키는 중`, '#e8d8a0', 22);
        return Math.round(dmg * (holy ? 0.45 : 0.15));
      }
    }
    if (g.kind === 'flyer' && g.flying) {
      const reach = a.proj || h.z > 60 || a.special;
      if (!reach) { this.say(m, '닿지 않는다!', '#b8d8ff', 22); return 0; }
      g.flyHits = (g.flyHits || 0) + 1;
      if (g.flyHits >= 5) this.land(m, true);
      return Math.round(dmg * 1.3);
    }
    if (g.kind === 'barrier' && g.shieldOn) { this.say(m, '장막에 막힘', '#d0b8ff', 20); return Math.round(dmg * 0.15); }
    if (g.kind === 'vent' && g.ventT > 0) return Math.round(dmg * 2);
    if (g.kind === 'vent') return Math.round(dmg * 0.6);
    return dmg;
  },
  // 쓰러지는 순간. true면 쓰러지지 않는다
  lethal(m) {
    const g = m.gimmick;
    if (!g || g.kind !== 'regrow' || g.revived) return false;
    if (m.burnT > 0 || m.lastElem === 'fire') { this.say(m, '불길에 완전히 타 버렸다!', '#ff9a3a', 32); return false; }
    g.revived = true;
    m.hp = Math.round(m.maxHp * (g.regrowHp || 0.3));
    m.state = 'roar'; m.st = 0; m.vx = m.vy = 0; m.play('b_roar', 80); m.setHead('head_shout');
    m.poise = 100; m.invuln = 900;
    this.say(m, '다시 일어났다! 불로 마무리하라', '#a0ff80', 32);
    m.scene.fx('holy_ring', m.x, m.y, { s: 0.7, dur: 700, depth: m.y - 1, flat: true, tint: 0x80ff80 });
    m.scene.cameras.main.shake(300, 0.01);
    return true;
  },
  land(m, knocked) {
    const g = m.gimmick; g.flying = false; g.flyHits = 0; g.nextFly = (m.raged ? 7000 : 10000);
    m.state = 'air'; m.st = 0; m.vz = knocked ? -200 : 0; m.gravMul = 1.4;
    if (knocked) { this.say(m, '떨어졌다!', '#ffd34d', 32); m.poise = Math.min(m.poise, 10); }
  },
  // bossAI 앞에서 부른다. true면 이번 프레임은 장치가 보스를 움직인다
  update(m, dt, rage) {
    const g = m.gimmick; if (!g) return false;
    const sc = m.scene, h = sc.hero, s = dt / 1000;
    g.t += dt;
    if (g.ventT > 0) { g.ventT -= dt; if (g.ventT <= 0) m.rig.setTintAll(null); }
    // 무장: 갑옷 막대 표시, 화나면 다시 얼어붙음
    if (g.kind === 'armor') {
      if (g.rearm && rage && !g.rearmed && g.armorHp <= 0) { g.rearmed = true; g.armorHp = g.armorMax; this.say(m, '다시 얼어붙었다!', '#b8e8ff', 32); }
      this.bar(m, g.armorHp / Math.max(1, g.armorMax), 0x9ad8ff);
    }
    // 호위: 시작하자마자 호위병을 부른다
    if (g.kind === 'guarded' && !g.called && m.state === 'idle') { g.called = true; sc.summonGrunts && sc.summonGrunts(2); }
    // 장막: 켜짐/꺼짐 반복
    if (g.kind === 'barrier') {
      g.nextBarrier -= dt;
      if (g.nextBarrier <= 0) {
        g.shieldOn = !g.shieldOn;
        g.nextBarrier = g.shieldOn ? (g.fast ? 2600 : 3200) : (g.fast ? 3000 : 4200);
        if (g.shieldOn) this.say(m, '장막!', '#d0b8ff', 28);
      }
      if (!g.aura) g.aura = sc.add.ellipse(m.x, m.y - m.height * 0.5, m.height * 0.9, m.height * 1.1, 0xb080ff, 0).setBlendMode(Phaser.BlendModes.ADD);
      g.aura.setPosition(m.x, m.y - m.z - m.height * 0.5).setDepth(m.y + 2).setFillStyle(0xb080ff, g.shieldOn ? 0.22 + 0.08 * Math.sin(g.t / 90) : 0);
    }
    // 비행
    if (g.kind === 'flyer') {
      const allowed = !g.phase || m.hp < m.maxHp * g.phase;
      if (!g.flying && allowed && ['idle', 'move'].includes(m.state)) {
        g.nextFly -= dt;
        if (g.nextFly <= 0) { g.flying = true; g.flyT = 0; g.flyHits = 0; this.say(m, '날아올랐다!', '#b8d8ff', 30); m.state = 'gfly'; m.st = 0; m.play('m_air', 80); }
      }
      if (g.flying) {
        g.flyT += dt;
        m.state = 'gfly'; m.vz = 0;
        m.z = Phaser.Math.Linear(m.z, 170, Math.min(1, dt / 220));
        const tx = h.x + (Math.sin(g.flyT / 700) * 260), ty = h.y;
        m.x += Phaser.Math.Clamp(tx - m.x, -1, 1) * Math.min(Math.abs(tx - m.x), 240 * s);
        m.y += Phaser.Math.Clamp(ty - m.y, -1, 1) * Math.min(Math.abs(ty - m.y), 120 * s);
        m.face = Math.sign(h.x - m.x) || m.face;
        // 하늘에서 내리꽂는 공격
        g.dive = (g.dive || 0) - dt;
        if (g.dive <= 0) {
          g.dive = rage ? 1400 : 1900;
          const x = h.x, y = h.y;
          sc.telegraph(x, y, 0.55, 700);
          sc.time.delayedCall(700, () => { if (m.dead) return; sc.fx('ice_shards', x, y - 40, { s: 0.45, dur: 450, depth: y + 2 }); sc.areaHit(m, x, y, 90, 45, Math.round(m.def.dmg * 0.6), 'heavy'); });
        }
        if (g.flyT > 6500) this.land(m, false);
        return true;
      }
    }
    return false;
  },
  // 쇠약 노출(골렘): 광선 특수기가 끝나면 부른다
  afterSpecial(m, name) {
    const g = m.gimmick; if (!g || g.kind !== 'vent') return;
    if (name === 'beam' || name === 'charge') { g.ventT = 2600; m.rig.setTintAll(0xff9a6a); this.say(m, '약점 노출!', '#ffb070', 30); }
  },
  bar(m, v, col) {
    const g = m.gimmick;
    if (!g.barG) g.barG = m.scene.add.graphics();
    const b = g.barG; b.clear();
    if (v <= 0) return;
    const w = 120, x = m.x - w / 2, y = m.y - m.z - m.height - 20;
    b.setDepth(m.y + 1500);
    b.fillStyle(0x0a0a14, 0.7).fillRect(x - 2, y - 2, w + 4, 10).fillStyle(col, 1).fillRect(x, y, w * v, 6);
  },
  cleanup(m) {
    const g = m.gimmick; if (!g) return;
    if (g.barG) g.barG.destroy();
    if (g.aura) g.aura.destroy();
    g.barG = g.aura = null;
  },
};

// 🆕 2부 보스 (대역 그림, 공략 장치는 원본과 같은 종류)
Object.assign(BOSS_GIMMICK_DEF, {
  glass_queen: { kind: 'armor', armor: 0.2, hint: '유리 껍질 — 강한 공격으로 깨라', trophy: '유리 독침' },
  star_colossus: { kind: 'vent', hint: '광선을 쏜 뒤 별의 핵이 드러난다 — 그때가 기회', trophy: '별똥 핵' },
  drowned_captain: { kind: 'armor', armor: 0.22, hint: '물먹은 갑옷 — 불과 강한 공격으로 벗겨라', trophy: '익사한 닻' },
  naia: { kind: 'guarded', hint: '익사 기사가 살아 있으면 여왕은 거의 다치지 않는다', trophy: '심해 진주' },
  forge_golem: { kind: 'vent', hint: '용광로가 열리는 순간을 노려라', trophy: '용광로 심장' },
  ignar: { kind: 'armor', armor: 0.3, rearm: true, hint: '용암 갑옷 — 깨도 화나면 다시 굳는다', trophy: '불의 왕관' },
  rot_warden: { kind: 'regrow', regrowHp: 0.3, hint: '썩은 뿌리로 다시 일어난다 — 불로 마무리', trophy: '썩은 뿌리' },
  mycela: { kind: 'regrow', regrowHp: 0.3, hint: '포자가 다시 뭉친다 — 불로 태워 마무리', trophy: '포자 왕관' },
  storm_wyvern: { kind: 'flyer', hint: '하늘로 날아오른다 — 점프 공격과 원거리', trophy: '폭풍 깃' },
  morgan: { kind: 'barrier', hint: '은빛 장막이 켜지면 공격이 거의 막힌다', trophy: '은빛 가면' },
  moon_azmal: { kind: 'flyer', phase: 0.7, hint: '체력이 줄면 날아오른다 — 점프 공격과 원거리', trophy: '달그림자 비늘' },
  moon_orvex: { kind: 'barrier', fast: true, hint: '일곱 번째 달의 장막 — 꺼진 틈을 노려라', trophy: '일곱 번째 달 조각' },
});
