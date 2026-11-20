// 장비 효과를 실제로 작동시킨다.
// 전설 24 · 직업 세트 6 · 장신구 전설 8 · 장신구 세트 2 · 보스 전리품 장비 13 · 장비 옵션 보정
// 연결: heroStats(stats) · Game.create(start) · heroDamage(dmgK) · 치명타 판정(critAdd) · meleeHit(onMelee)
//       afterHeroHit(afterHit·overheal) · resolveHeroHit(incoming·lethal·onParry·onHurt) · onMonsterDead(onKill)
//       useItem(onItem) · startRoll(onRoll) · heroSpecial(onSpecial) · awakenFire(onAwaken) · useSkill(onSkill) · update
// 설명 글은 여기 글이 기준이다 (db.js의 옛 설명은 쓰지 않는다).

const GEAR_LEGEND = {
  // 하르반
  '태양의 맹세': { code: 'sunWave', fx: '마무리 공격마다 화염 검기를 날린다' },
  '서약의 방패': { code: 'oathStun', fx: '저스트 가드에 성공하면 주변 적이 기절한다' },
  '불굴의 왕관투구': { code: 'crownLethal', fx: '치명상을 한 번 체력 1로 버티고 3초 무적 (스테이지당 1번)' },
  '거인의 흉갑': { code: 'giantQuake', fx: '받는 피해 -12%, 맞으면 25% 확률로 충격파' },
  // 미라엘
  '불사조 깃털 지팡이': { code: 'phoenixFire', fx: '화염 피해 +35%, 화상이 2배 오래 간다' },
  '금단의 마도서': { code: 'forbidden', fx: '모든 피해 +25%, 대신 최대 체력 -15%' },
  '별을 읽는 관': { code: 'starBlink', fx: '순간이동 뒤 3초간 피해 +50%' },
  '원소 폭풍의 로브': { code: 'elemStorm', fx: '화상 중인 적이 냉기에 맞으면 원소 폭발' },
  // 오델리아
  '백월의 대망치': { code: 'moonPillar', fx: '마무리 공격마다 빛기둥이 솟는다' },
  '백월의 방패': { code: 'moonShield', fx: '체력이 40% 아래로 떨어지면 25% 회복 (스테이지당 1번)' },
  '천익 투구': { code: 'wingHelm', fx: '공중의 적에게 피해 +40%, 공중 점프 1회 추가' },
  '성녀의 갑주': { code: 'saintArmor', fx: '받는 피해 -8%, 맞을수록 각성 게이지가 빨리 찬다' },
  // 키르
  '그림자 송곳니': { code: 'shadowFang', fx: '등 뒤 치명타가 터지면 그림자 분신이 한 번 더 벤다' },
  '달그림자 투척검': { code: 'boomerang', fx: '던지는 소모품(단검·망치·폭탄)을 50% 확률로 돌려받는다' },
  '얼굴 없는 두건': { code: 'faceless', fx: '적을 처치하면 1초간 투명해져 공격받지 않는다' },
  '밤바람 가죽옷': { code: 'nightRoll', fx: '구르기 거리 +50%, 구르며 지나간 적이 중독된다' },
  // 세릴
  '별빛의 활': { code: 'starSplit', fx: '마무리 화살이 3갈래로 한 번 더 분열한다' },
  '끝없는 화살통': { code: 'endlessQuiver', fx: '화살을 쏠 때 25% 확률로 한 발 더' },
  '달 사냥꾼의 관': { code: 'hunterRange', fx: '멀리 있는 적일수록 피해 증가 (최대 +40%)' },
  '숲 정령의 갑옷': { code: 'vineArmor', fx: '맞으면 30% 확률로 덩굴이 주변 적을 묶는다' },
  // 녹타
  '일곱 번째 달 대검': { code: 'voidBlade', fx: '각성기 후 10초간 공격마다 「공허 베기」를 날린다' },
  '저주받은 심장': { code: 'curseHeart', fx: '공격에 낙인을 찍고, 낙인 찍힌 적이 죽으면 낙인이 주변으로 퍼진다' },
  '흑월의 가면': { code: 'moonMask', fx: '체력 50% 이하에서 치명타 확률 +30%' },
  '피의 계약 갑주': { code: 'bloodPact', fx: '최대 체력을 넘긴 흡혈량은 보호막이 된다 (최대 체력 30%까지)' },
  // 장신구 전설
  '도둑왕의 반지': { code: 'thiefKing', fx: '상자에서 장비가 1개 더 나온다' },
  '불사조의 반지': { code: 'phoenixRing', fx: '스테이지마다 부활 1회 추가' },
  '시간 장인의 반지': { code: 'timeRing', fx: '스킬 쿨다운 -20%' },
  '폭풍 추적자의 반지': { code: 'stormRing', fx: '30콤보 이상일 때 이동·공격 속도 +20%' },
  '여섯 달의 목걸이': { code: 'sixMoons', fx: '모은 월석 1개당 모든 피해 +4%' },
  '거인 사냥꾼의 목걸이': { code: 'giantHunter', fx: '보스에게 주는 피해 +25%' },
  '메아리 목걸이': { code: 'echo', fx: '던지는 소모품이 한 번 더 발사된다' },
  '은방울 행운 목걸이': { code: 'luck', fx: '전설 장비가 더 자주 나오고 금화 +15%' },
};
const GEAR_SET = {
  '태양 기사단': { two: '받는 피해 -10%', four: '저스트 가드에 성공하면 4초간 「태양의 성벽」 (받는 피해 -60%, 10초에 1번)' },
  '삼월의 예복': { two: '원소 피해 +15%', four: '공격을 8번 맞힐 때마다 원소 수정이 주변 적에게 연쇄 번개' },
  '백월 순례단': { two: '받는 회복 효과 +25%', four: '크게 회복할 때마다 주변에 신성 폭발' },
  '밤까마귀': { two: '치명타 확률 +10%', four: '구르기 후 첫 공격은 확정 치명타' },
  '은빛 숲지기': { two: '공격 속도 +10%', four: '마무리 공격 때 늑대 정령이 앞으로 달려가며 벤다' },
  '일곱 번째 서약': { two: '흡혈 +5%', four: '체력 30% 이하일 때 각성 게이지가 저절로 찬다' },
  '쌍월의 서약': { two: '동료와 같은 적을 공격하면 피해 +20%' },
  '순례자의 증표': { two: '심연의 탑에서 층을 오를 때 체력 회복 +10%' },
};
// 🆕 보스 전리품 장비: 대장간에서 전리품 + 금화 + 마석으로 만든다
const BOSS_GEAR = {
  barkhaul: { name: '이끼심장 목걸이', kind: 'amulet', code: 'mossRegen', ch: 1, fx: '체력이 초당 0.5% 재생, 체력 30% 이하에서는 3배' },
  toothcrusher: { name: '부러진 엄니 반지', kind: 'ring', code: 'tusk', ch: 1, fx: '다운된 적에게 피해 +35%, 치명타 피해 +15%' },
  captain_mog: { name: '녹슨 갈고리 반지', kind: 'ring', code: 'hook', ch: 2, fx: '마무리 공격이 주변 적을 앞으로 끌어당긴다' },
  gloob: { name: '오물 결정 목걸이', kind: 'amulet', code: 'sludge', ch: 2, fx: '공격에 20% 확률로 독, 중독된 적이 죽으면 독 폭발' },
  twinsting: { name: '쌍독침 반지', kind: 'ring', code: 'twinSting', ch: 3, fx: '중독된 적에게 치명타 확률 +20%' },
  sehera: { name: '여왕의 붕대 목걸이', kind: 'amulet', code: 'queenWrap', ch: 3, fx: '언데드에게 피해 +35%, 받는 피해 -8%' },
  frost_wyvern: { name: '서리 비늘 반지', kind: 'ring', code: 'frostScale', ch: 4, fx: '모든 공격이 냉기를 띤다 (3번 맞히면 빙결)' },
  hrimgar: { name: '빙하 심장 목걸이', kind: 'amulet', code: 'glacier', ch: 4, fx: '체력 50% 이상일 때 받는 피해 -20%' },
  golem7: { name: '마도 핵 반지', kind: 'ring', code: 'arcCore', ch: 5, fx: '스킬 쿨다운 -15%, 스킬을 쓰면 각성 게이지 +10' },
  orvex: { name: '대마법사의 깃 목걸이', kind: 'amulet', code: 'sageVeil', ch: 5, fx: '8초마다 받는 공격 한 번을 장막이 막는다' },
  orvex_eclipse: { name: '일식의 반지', kind: 'ring', code: 'eclipse', ch: 6, fx: '각성 지속시간 +50%, 각성 중 피해 +20%' },
  azmal: { name: '흑월 비늘 목걸이', kind: 'amulet', code: 'dragonScale', ch: 6, fx: '공중 점프 1회 추가, 공중의 적에게 피해 +30%' },
  void_shadow: { name: '공허의 반지', kind: 'ring', code: 'voidRing', ch: 7, fx: '적을 처치하면 15% 확률로 공허 폭발' },
};
const ELEM_DMG_KEY = { fire: 'fireDmg', ice: 'iceDmg', bolt: 'boltDmg', holy: 'holyDmg', poison: 'poisonDmg', dark: 'darkDmg', void: 'darkDmg', shadow: 'darkDmg' };

// 보스 장비 제작 비용
function bossGearCost(id) {
  const g = BOSS_GEAR[id], ch = g.ch;
  return { trophy: 2, gold: 150 + ch * 120, mat: ch <= 2 ? 'mid' : ch <= 4 ? 'high' : 'abyss', cnt: ch <= 2 ? 3 : ch <= 4 ? 3 : 2 };
}
function craftBossGear(s, id) {
  const g = BOSS_GEAR[id], c = bossGearCost(id);
  s.trophies = s.trophies || {};
  if ((s.trophies[id] || 0) < c.trophy) return 'trophy';
  if (s.gold < c.gold || (s.mats[c.mat] || 0) < c.cnt) return 'cost';
  s.trophies[id] -= c.trophy; s.gold -= c.gold; s.mats[c.mat] -= c.cnt;
  const tier = Math.min(3, Math.max(1, Math.floor((g.ch - 1) / 2) + 1));
  const it = makeItem(s, { cls: s.hero, slot: 'acc', tier, rar: 4, kind: g.kind });
  it.name = g.name; it.fx = g.fx; it.boss = id;
  s.crafted = s.crafted || {}; s.crafted[id] = (s.crafted[id] || 0) + 1;
  return it;
}

const GearFx = {
  codes(s) {
    const out = new Set(), sets = {};
    if (!s || !s.eq) return out;
    for (const slot of SLOTS) {
      const it = s.eq[slot] && itemById(s, s.eq[slot]);
      if (!it) continue;
      if (it.boss && BOSS_GEAR[it.boss]) { if (BOSS_GEAR[it.boss].code) out.add(BOSS_GEAR[it.boss].code); }
      else if (it.rar === 4 && GEAR_LEGEND[it.name]) out.add(GEAR_LEGEND[it.name].code);
      if (it.set) sets[it.set] = (sets[it.set] || 0) + 1;
    }
    for (const [n, c] of Object.entries(sets)) { if (c >= 2) out.add('set2:' + n); if (c >= 4) out.add('set4:' + n); }
    return out;
  },
  has(sc, code) { return !!(sc.gfx && sc.gfx.c.has(code)); },
  desc(it) {
    if (it.boss && BOSS_GEAR[it.boss]) return BOSS_GEAR[it.boss].fx;
    return (GEAR_LEGEND[it.name] || {}).fx || it.fx;
  },
  setDesc(name, fallback) { return GEAR_SET[name] || fallback; },
  // heroStats 안: 고정 능력치
  stats(s, st) {
    const c = this.codes(s);
    for (const k of ['dmgRed', 'allDmg', 'fireDmg', 'iceDmg', 'boltDmg', 'holyDmg', 'poisonDmg', 'darkDmg', 'statusRed', 'procPct', 'killBoom', 'vsUndead', 'lifesteal'])
      st[k] = st[k] || 0;
    // 직업 전용 옵션은 지금 있는 능력으로 바꿔 쓴다
    if (st.mageExtra && s.hero === 'mage') st.elemPct += st.mageExtra * 10;
    if (st.faith && s.hero === 'paladin') st.awkPct += st.faith;
    if (st.bleed && s.hero === 'rogue') st.vsBack += st.bleed;
    if (st.chargeSpd && s.hero === 'ranger') st.aspd += Math.round(st.chargeSpd / 2);
    if (st.hpCost && s.hero === 'hexblade') st.lifesteal += Math.round(st.hpCost / 10);
    if (c.has('forbidden')) { st.hpPct -= 15; st.allDmg += 25; }
    if (c.has('giantQuake')) st.dmgRed += 12;
    if (c.has('saintArmor')) st.dmgRed += 8;
    if (c.has('wingHelm')) { st.vsAir += 40; st.doubleJump = 1; }
    if (c.has('timeRing')) st.cdr += 20;
    if (c.has('giantHunter')) st.vsBoss += 25;
    if (c.has('luck')) st.goldPct += 15;
    if (c.has('phoenixFire')) st.fireDmg += 35;
    if (c.has('tusk')) { st.vsDown += 35; st.critDmg += 15; }
    if (c.has('queenWrap')) { st.vsUndead += 35; st.dmgRed += 8; }
    if (c.has('arcCore')) st.cdr += 15;
    if (c.has('dragonScale')) { st.vsAir += 30; st.doubleJump = 1; }
    if (c.has('set2:태양 기사단')) st.dmgRed += 10;
    if (c.has('set2:삼월의 예복')) st.elemPct += 15;
    if (c.has('set2:백월 순례단')) st.healPct += 25;
    if (c.has('set2:밤까마귀')) st.crit += 10;
    if (c.has('set2:은빛 숲지기')) st.aspd += 10;
    if (c.has('set2:일곱 번째 서약')) st.lifesteal += 5;
    // 🆕 보스 장신구 고정 능력치 (2부)
    for (const slot of SLOTS) {
      const it = s.eq && s.eq[slot] && itemById(s, s.eq[slot]);
      const g = it && it.boss && BOSS_GEAR[it.boss];
      if (g && g.stats) for (const [k, v] of Object.entries(g.stats)) st[k] = (st[k] || 0) + v;
    }
    st.cdr = Math.min(50, st.cdr);
    st.dmgRed = Math.min(45, st.dmgRed);
  },
  start(sc) {
    const s = sc.save, st = sc.stats;
    sc.gfx = {
      c: this.codes(s), blinkT: 0, voidT: 0, veilT: 0, shield: 0, sunCd: 0, hits: 0, rollCritT: 0, rollPoisonT: 0,
      crownUsed: false, moonShieldUsed: false, ringRevUsed: false, prevHp: sc.hero.hp, burstCd: 0,
      baseSpd: st.spd || 0, baseAspd: st.aspd || 0, moons: Object.keys(s.moons || {}).length, swAtk: null, swSt: 0,
    };
    if (sc.gfx.c.has('eclipse') && typeof AWAKEN_BUFF !== 'undefined') sc.gfx.awkMs = AWAKEN_BUFF.ms * 1.5;
  },
  near(sc, x, y, r, ry = 90) { return sc.monsters.filter(m => !m.dead && m.state !== 'enter' && Math.abs(m.x - x) < r && Math.abs(m.y - y) < ry); },
  stun(m, ms) {
    if (m.dead) return;
    if (m.def.boss) { m.slowT = Math.max(m.slowT || 0, ms); return; }
    m.state = 'hurt'; m.st = 0; m.stun = ms; m.vx = m.vy = 0; m.showEmote && m.showEmote('dizzy', ms);
  },
  // 공격 배율
  dmgK(sc, m, crit, elem) {
    const g = sc.gfx; if (!g || !m) return 1;
    const st = sc.stats, h = sc.hero, c = g.c;
    let k = 1;
    if (st.allDmg) k *= 1 + st.allDmg / 100;
    if (m.elite && st.vsElite) k *= 1 + st.vsElite / 100;
    const ek = ELEM_DMG_KEY[elem]; if (ek && st[ek]) k *= 1 + st[ek] / 100;
    if (g.blinkT > 0) k *= 1.5;
    if (c.has('hunterRange')) k *= 1 + Math.min(0.4, Math.max(0, Math.abs(m.x - h.x) - 150) / 1000);
    if (c.has('sixMoons')) k *= 1 + 0.04 * g.moons;
    if (c.has('eclipse') && sc.buffs.awk > 0) k *= 1.2;
    if (c.has('set2:쌍월의 서약') && sc.ally && !sc.ally.dead && sc.ally.tgt === m) k *= 1.2;
    return k;
  },
  critAdd(sc, m) {
    const g = sc.gfx; if (!g) return 0;
    const h = sc.hero; let v = 0;
    if (g.rollCritT > 0) { g.rollCritT = 0; return 100; }
    if (g.c.has('moonMask') && h.hp < h.maxHp * 0.5) v += 30;
    if (g.c.has('twinSting') && m && m.poisonT > 0) v += 20;
    return v;
  },
  // 근접 공격이 맞은 순간 (주인공만)
  onMelee(sc, h, m, a, dmg, crit, behind) {
    const g = sc.gfx; if (!g || h !== sc.hero) return;
    const c = g.c, f = h.face;
    const fresh = g.swAtk !== h.atk || h.st < g.swSt;
    g.swAtk = h.atk; g.swSt = h.st;
    if (fresh) {
      if (a.fin) {
        if (c.has('sunWave')) sc.heroShoot(h, { img: 'fx/slash_arc', vx: 900, dmg: 24, pierce: true, elem: 'fire', sc: 0.55, tint: 0xff9040, life: 650, gear: true });
        if (c.has('moonPillar')) {
          sc.fx('holy_pillar', m.x, m.y - 80, { s: 0.45, dur: 600, depth: m.y + 1001 });
          sc.time.delayedCall(120, () => sc.heroArea(m.x, m.y, 110, 60, 26, { kb: 200, type: 'launch', col: '#fff3a0', elem: 'holy', poise: 10 }));
        }
        if (c.has('hook')) for (const o of this.near(sc, h.x, h.y, 340, 140)) if (!o.def.boss && o !== m) { o.x = Phaser.Math.Linear(o.x, h.x + f * 110, 0.7); o.y = Phaser.Math.Linear(o.y, h.y, 0.6); this.stun(o, 500); }
        if (c.has('set4:은빛 숲지기')) {
          sc.fx('dash_trail', h.x + f * 160, h.y - 60, { s: 0.55, flip: f < 0, dur: 420, depth: h.y + 1001, tint: 0xc8e8ff });
          sc.heroArea(h.x + f * 220, h.y, 200, 60, 22, { kb: 260, type: 'knock', col: '#c8e8ff', poise: 8 });
        }
      }
      if (g.voidT > 0 && c.has('voidBlade')) sc.heroShoot(h, { img: 'fx/slash_arc', vx: 1000, dmg: 20, pierce: true, elem: 'dark', sc: 0.6, tint: 0xb070ff, life: 600, gear: true });
    }
    if (c.has('shadowFang') && behind && crit) sc.time.delayedCall(140, () => {
      if (m.dead) return;
      const d = Math.round(dmg * 0.6); m.invuln = 0;
      sc.fx('shadow_smoke', m.x - f * 40, m.y - 90, { s: 0.45, dur: 400, depth: m.y + 1002, tint: 0x9070c0 });
      if (m.takeHit(h, { dmg: d, kb: 120, type: 'light', otg: true }, d)) sc.floatText(m.x, m.y - m.height * 0.8, String(d), '#c8a0ff', 28);
    });
  },
  // 모든 공격(근접·투사체·범위)이 맞은 뒤
  afterHit(sc, m, dmg, elem) {
    const g = sc.gfx; if (!g || m.dead) return;
    const c = g.c, st = sc.stats;
    if (c.has('curseHeart')) { m.markT = Math.max(m.markT || 0, 5000); m.markV = Math.max(m.markV || 0, 0.15); }
    if (c.has('sludge') && Math.random() < 0.2) m.poisonT = 4000;
    if (elem === 'fire' && c.has('phoenixFire')) m.burnT = 6000;
    if (!elem && st.procPct && Math.random() * 100 < st.procPct) { if (Math.random() < 0.5) m.burnT = 3000; else m.poisonT = 4000; }
    if (c.has('set4:삼월의 예복') && ++g.hits % 8 === 0) sc.chainBolt(m, 20 * st.dmgMul, 3);
    if (c.has('elemStorm') && elem === 'ice' && m.burnT > 0) {
      m.burnT = 0;
      sc.fx('fire_burst', m.x, m.y - 70, { s: 0.55, dur: 500, depth: m.y + 1001, tint: 0xc0e0ff });
      sc.floatText(m.x, m.y - m.height - 20, '원소 폭발!', '#c0e0ff', 26);
      sc.time.delayedCall(30, () => sc.heroArea(m.x, m.y, 140, 70, 40, { kb: 300, type: 'knock', col: '#c0e0ff', poise: 15 }));
    }
  },
  // 서리 비늘: 원소가 없는 공격도 냉기
  elemOf(sc, elem) { return !elem && this.has(sc, 'frostScale') ? 'ice' : elem; },
  // 흡혈이 최대 체력을 넘긴 만큼 (피의 계약)
  overheal(sc, v) {
    const g = sc.gfx; if (!g || !g.c.has('bloodPact')) return;
    const h = sc.hero, cap = h.maxHp * 0.3, was = g.shield;
    g.shield = Math.min(cap, g.shield + v);
    if (was < cap * 0.5 && g.shield >= cap * 0.5) sc.floatText(h.x, h.y - 250, '피의 보호막', '#ff7090', 22);
  },
  // 받는 피해 조정. 0이면 막았다
  incoming(sc, src, dmg) {
    const g = sc.gfx; if (!g) return dmg;
    const h = sc.hero, st = sc.stats, c = g.c;
    if (st.dmgRed) dmg *= 1 - st.dmgRed / 100;
    if (c.has('glacier') && h.hp > h.maxHp * 0.5) dmg *= 0.8;
    const exposed = !(h.invuln > 0) && !['roll', 'guard', 'parry', 'awaken', 'dead', 'down', 'getup'].includes(h.state);
    if (exposed && c.has('sageVeil') && g.veilT <= 0) {
      g.veilT = 8000;
      sc.fx('holy_ring', h.x, h.y - 100, { s: 0.5, dur: 450, depth: h.y + 1002, tint: 0xb090ff });
      sc.floatText(h.x, h.y - 250, '장막!', '#d0b8ff', 26);
      return 0;
    }
    if (exposed && g.shield > 0) {
      const a = Math.min(g.shield, dmg); g.shield -= a; dmg -= a;
      if (dmg <= 0) { sc.floatText(h.x, h.y - 250, '흡수', '#ff7090', 22); return 0; }
    }
    return Math.max(1, Math.round(dmg));
  },
  lethal(sc, dmg) {
    const g = sc.gfx, h = sc.hero;
    if (!g || !g.c.has('crownLethal') || g.crownUsed || sc.god || h.hp - dmg > 0 || h.hp <= 1) return dmg;
    g.crownUsed = true;
    sc.time.delayedCall(10, () => { sc.floatText(h.x, h.y - 290, '불굴의 왕관!', '#ffd34d', 40); h.invuln = 3000; sc.cameras.main.flash(200, 255, 220, 120); });
    return h.hp - 1;
  },
  onParry(sc, src) {
    const g = sc.gfx; if (!g) return;
    const h = sc.hero;
    if (g.c.has('oathStun')) {
      sc.fx('impact_ring', h.x, h.y, { s: 0.6, dur: 450, depth: h.y - 1, flat: true, tint: 0xffe080 });
      for (const m of this.near(sc, h.x, h.y, 230, 110)) this.stun(m, 1500);
    }
    if (g.c.has('set4:태양 기사단') && g.sunCd <= 0) {
      g.sunCd = 10000; sc.buffs.shield = 4000; sc.shieldRed = 0.6;
      sc.floatText(h.x, h.y - 290, '태양의 성벽', '#ffd34d', 30);
      sc.fx('holy_ring', h.x, h.y, { s: 0.6, dur: 700, depth: h.y - 1, flat: true, tint: 0xffd060 });
    }
  },
  onHurt(sc, src, dmg) {
    const g = sc.gfx; if (!g) return;
    const h = sc.hero, c = g.c;
    if (c.has('giantQuake') && Math.random() < 0.25) sc.shockwave(h);
    if (c.has('vineArmor') && Math.random() < 0.3) {
      sc.fx('holy_ring', h.x, h.y, { s: 0.6, dur: 600, depth: h.y - 1, flat: true, tint: 0x70d060 });
      for (const m of this.near(sc, h.x, h.y, 240, 110)) this.stun(m, 1500);
      sc.floatText(h.x, h.y - 280, '덩굴!', '#90e070', 24);
    }
    if (c.has('saintArmor')) h.awk = Math.min(100, h.awk + dmg / h.maxHp * 80);
    if (c.has('moonShield') && !g.moonShieldUsed && h.hp > 0 && h.hp < h.maxHp * 0.4) {
      g.moonShieldUsed = true;
      const v = Math.round(h.maxHp * 0.25); h.hp = Math.min(h.maxHp, h.hp + v);
      sc.floatText(h.x, h.y - 290, '백월의 가호 +' + v, '#fff3a0', 30);
      sc.fx('holy_ring', h.x, h.y, { s: 0.6, dur: 700, depth: h.y - 1, flat: true, tint: 0xfff0a0 });
    }
  },
  onKill(sc, m) {
    const g = sc.gfx; if (!g || sc.won) return;
    const h = sc.hero, c = g.c, st = sc.stats;
    if (c.has('faceless')) {
      h.invuln = Math.max(h.invuln, 1000);
      const ct = h.rig && h.rig.c; if (ct && ct.setAlpha) { ct.setAlpha(0.45); sc.time.delayedCall(1000, () => ct.setAlpha(1)); }
    }
    if (c.has('curseHeart') && m.markT > 0) {
      const ns = this.near(sc, m.x, m.y, 240, 110);
      for (const o of ns) { o.markT = 6000; o.markV = Math.max(o.markV || 0, 0.25); }
      if (ns.length) { sc.fx('shadow_smoke', m.x, m.y - 60, { s: 0.5, dur: 500, depth: m.y + 1001, tint: 0x9050c0 }); sc.floatText(m.x, m.y - 120, '낙인 전이', '#c890ff', 22); }
    }
    if (c.has('sludge') && m.poisonT > 0) {
      sc.fx('impact_ring', m.x, m.y, { s: 0.5, dur: 400, depth: m.y - 1, flat: true, tint: 0x90e070 });
      sc.time.delayedCall(20, () => { for (const o of this.near(sc, m.x, m.y, 170, 80)) o.poisonT = 4000; sc.heroArea(m.x, m.y, 150, 70, 18, { kb: 160, type: 'light', col: '#90e070', elem: 'poison' }); });
    }
    const boom = (c.has('voidRing') && Math.random() < 0.15) ? 'void' : (st.killBoom && Math.random() * 100 < st.killBoom) ? 'fire' : null;
    if (boom) sc.time.delayedCall(40, () => {
      sc.fx(boom === 'void' ? 'shadow_smoke' : 'fire_burst', m.x, m.y - 70, { s: 0.6, dur: 500, depth: m.y + 1001, tint: boom === 'void' ? 0x8040c0 : undefined });
      sc.heroArea(m.x, m.y, 170, 80, boom === 'void' ? 50 : 30, { kb: 320, type: 'knock', col: boom === 'void' ? '#c890ff' : '#ff9a3a', elem: boom === 'void' ? 'dark' : 'fire', poise: 15 });
    });
  },
  // 소모품을 쓴 뒤
  onItem(sc, k, i) {
    const g = sc.gfx; if (!g) return;
    const h = sc.hero, s = sc.save, thrown = ['dagger', 'hammer', 'bomb'].includes(k);
    if (!thrown || g.echoing) return;
    if (g.c.has('boomerang') && Math.random() < 0.5) { s.belt[k] = (s.belt[k] || 0) + 1; sc.time.delayedCall(500, () => sc.floatText(h.x, h.y - 260, '돌아왔다!', '#c8a0ff', 22)); }
    if (g.c.has('echo')) sc.time.delayedCall(380, () => {
      if (sc.won || sc.lost) return;
      g.echoing = true; s.belt[k] = (s.belt[k] || 0) + 1;
      sc.useItem(i);
      g.echoing = false;
    });
  },
  onRoll(sc, h) {
    const g = sc.gfx; if (!g || h !== sc.hero) return;
    if (g.c.has('nightRoll')) { h.vx *= 1.5; g.rollPoisonT = 420; }
    if (g.c.has('set4:밤까마귀')) g.rollCritT = 1800;
  },
  onSpecial(sc, h, name) {
    const g = sc.gfx; if (!g || h !== sc.hero) return;
    if (name === 'blink' && g.c.has('starBlink')) { g.blinkT = 3000; sc.floatText(h.x, h.y - 260, '별읽기 · 피해 +50%', '#c8d8ff', 22); }
  },
  onShoot(sc, h, o) {
    const g = sc.gfx; if (!g || h !== sc.hero || o.gear || !sc.cls.ranged) return;
    if (h.key === 'ranger') {
      if (g.c.has('endlessQuiver') && Math.random() < 0.25) sc.time.delayedCall(90, () => sc.heroShoot(h, { ...o, n: 1, gear: true }));
      if (g.c.has('starSplit') && h.atk && h.atk.fin) sc.time.delayedCall(140, () => sc.heroShoot(h, { ...o, n: 3, spread: 90, dmg: o.dmg * 0.7, gear: true }));
    }
  },
  onAwaken(sc, h) {
    const g = sc.gfx; if (!g || h !== sc.hero) return;
    if (g.c.has('voidBlade')) { g.voidT = 10000; sc.floatText(h.x, h.y - 300, '공허 베기 10초', '#c890ff', 26); }
    if (g.awkMs) sc.buffs.awk = g.awkMs;
  },
  onSkill(sc) {
    const g = sc.gfx; if (!g) return;
    if (g.c.has('arcCore')) sc.hero.awk = Math.min(100, sc.hero.awk + 10);
  },
  update(sc, dt) {
    const g = sc.gfx; if (!g || sc.won || sc.lost) return;
    const h = sc.hero, st = sc.stats, c = g.c, s = dt / 1000;
    for (const k of ['blinkT', 'voidT', 'veilT', 'sunCd', 'rollCritT', 'rollPoisonT', 'burstCd']) if (g[k] > 0) g[k] -= dt;
    if (h.hp <= 0 || h.state === 'dead') return;
    if (c.has('mossRegen')) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.005 * s * (h.hp < h.maxHp * 0.3 ? 3 : 1));
    if (c.has('set4:일곱 번째 서약') && h.hp < h.maxHp * 0.3) h.awk = Math.min(100, h.awk + 8 * s);
    if (c.has('stormRing')) { const on = sc.comboN >= 30; st.spd = g.baseSpd + (on ? 20 : 0); st.aspd = g.baseAspd + (on ? 20 : 0); }
    if (g.rollPoisonT > 0) for (const m of this.near(sc, h.x, h.y, 70, 50)) if (!(m.poisonT > 0)) { m.poisonT = 4000; sc.floatText(m.x, m.y - m.height - 10, '중독', '#90e070', 20); }
    if (st.statusRed) for (const k of ['poisonT', 'burnT', 'slowT', 'freezeT']) if (h[k] > 0) h[k] -= dt * st.statusRed / 100;
    // 크게 회복한 순간 (백월 순례단 4세트)
    if (c.has('set4:백월 순례단') && h.hp - g.prevHp >= h.maxHp * 0.08 && g.burstCd <= 0) {
      g.burstCd = 1500;
      sc.fx('holy_ring', h.x, h.y, { s: 0.8, dur: 600, depth: h.y - 1, flat: true, tint: 0xfff0a0 });
      sc.heroArea(h.x, h.y, 230, 100, 30, { kb: 280, type: 'knock', col: '#fff3a0', elem: 'holy', poise: 10 });
    }
    g.prevHp = h.hp;
  },
  // 부활 1회 추가 (불사조의 반지)
  extraRevive(sc) {
    const g = sc.gfx; if (!g || !g.c.has('phoenixRing') || g.ringRevUsed) return false;
    g.ringRevUsed = true; return true;
  },
};

// 🆕 2부 보스 장신구 (stats = 고정 능력치, code = 특수 효과)
Object.assign(BOSS_GEAR, {
  glass_queen: { name: '유리 독침 반지', kind: 'ring', ch: 7, fx: '치명타 확률 +8%, 치명타 피해 +25%', stats: { crit: 8, critDmg: 25 } },
  star_colossus: { name: '별똥 핵 목걸이', kind: 'amulet', ch: 7, fx: '각성 충전 +30%, 보스에게 피해 +10%', stats: { awkPct: 30, vsBoss: 10 } },
  drowned_captain: { name: '익사한 닻 반지', kind: 'ring', ch: 8, fx: '방어력 +12%, 다운된 적에게 피해 +20%', stats: { defPct: 12, vsDown: 20 } },
  naia: { name: '심해 진주 목걸이', kind: 'amulet', ch: 8, code: 'mossRegen', fx: '받는 회복 +30%, 체력이 초당 0.5% 재생', stats: { healPct: 30 } },
  forge_golem: { name: '용광로 심장 반지', kind: 'ring', ch: 9, fx: '화염 피해 +30%, 공격에 15% 확률로 상태이상', stats: { fireDmg: 30, procPct: 15 } },
  ignar: { name: '불의 왕관 목걸이', kind: 'amulet', ch: 9, fx: '공격력 +12%, 받는 피해 -10%', stats: { atkPct: 12, dmgRed: 10 } },
  rot_warden: { name: '썩은 뿌리 반지', kind: 'ring', ch: 10, fx: '처치 시 체력 회복 +3%, 흡혈 +3%', stats: { leech: 3, lifesteal: 3 } },
  mycela: { name: '포자 왕관 목걸이', kind: 'amulet', ch: 10, code: 'sludge', fx: '독 피해 +40%, 공격에 20% 확률로 독, 중독된 적이 죽으면 독 폭발', stats: { poisonDmg: 40 } },
  storm_wyvern: { name: '폭풍 깃 반지', kind: 'ring', ch: 11, fx: '이동 속도 +15%, 공격 속도 +10%', stats: { spd: 15, aspd: 10 } },
  morgan: { name: '은빛 가면 목걸이', kind: 'amulet', ch: 11, fx: '스킬 쿨다운 -20%, 보스에게 피해 +15%', stats: { cdr: 20, vsBoss: 15 } },
  moon_azmal: { name: '달그림자 비늘 반지', kind: 'ring', ch: 12, code: 'dragonScale', fx: '공중 점프 1회 추가, 공중의 적에게 피해 +30%' },
  moon_orvex: { name: '일곱 번째 달 목걸이', kind: 'amulet', ch: 12, code: 'eclipse', fx: '모든 피해 +20%, 각성 지속시간 +50%, 각성 중 피해 +20%', stats: { allDmg: 20 } },
});
