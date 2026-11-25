// 🆕 2026-11-25 여섯 달 무기 · 달의 무기 · 달의 시련 · 숨은 최종 보스 「깨어난 일곱 번째 달」
//
//   여섯 달 무기: 2부(7~12장) 장 보스를 쓰러뜨리면 그 장에 「달의 시련」(어려운 특별 스테이지)이 열린다.
//     시련을 처음 깨면 '지금 주인공'의 그 달 무기를 얻는다. 같은 주인공에게 같은 달 무기는 딱 한 번만 (합쳐서 없어져도 다시 안 나온다).
//     주인공마다 모양이 다르다 (하르반 검 · 오델리아 망치 · 미라엘 지팡이 · 키르 단검 · 세릴 활 · 녹타 대검), 달마다 색·능력이 다르다.
//   달의 무기(신화): 여섯 달 무기를 모두 +10까지 키우면 대장간에서 하나로 벼린다. 쓰면서 3단계로 깨어난다.
//   본편 마지막 보스(12장)는 달의 무기 없이도 깰 수 있다. 있으면 그 보스에게 피해 +30%, 대사가 바뀐다.
//   숨은 최종 보스: 2부 엔딩을 본 뒤, 달의 무기를 든 주인공만 12장 「달 너머」로 갈 수 있다.
//
//   그림이 오기 전에는 전설 무기 그림에 달 색을 입혀 쓴다. 그림 이름은 docs/art-brief-moon-weapons.md
//     전투: <직업>/<부품>_moon_<달> · <직업>/<부품>_mythic   아이콘: icon/moonw_<직업>_<달> · icon/mythic_<직업>
//   주소에 ?moonw 를 붙이면 (시험용) 지금 주인공에게 여섯 달 무기 +10을 모두 준다.

const MoonW = {
  // 장 → 달 (그 장의 풍경과 맞춘다)
  CH: { 7: 'silver', 8: 'blue', 9: 'red', 10: 'green', 11: 'yellow', 12: 'white' },
  ORDER: ['red', 'yellow', 'white', 'blue', 'silver', 'green'],
  INFO: {
    red: { ko: '적월', col: 0xff6a4a, css: '#ff8a6a', stat: { atkPct: 10 }, fx: '공격력 +10% · 공격 5번마다 불꽃 폭발' },
    yellow: { ko: '황월', col: 0xffd84a, css: '#ffe27a', stat: { aspd: 10 }, fx: '공격 속도 +10% · 공격 5번마다 번개 (적 셋)' },
    white: { ko: '백월', col: 0xfff6e0, css: '#fff6e0', stat: { healPct: 20 }, fx: '받는 회복 +20% · 공격 5번마다 빛, 체력 3% 회복' },
    blue: { ko: '청월', col: 0x6ab8ff, css: '#8ac8ff', stat: { dmgRed: 8 }, fx: '받는 피해 -8% · 공격 5번마다 냉기 폭발' },
    silver: { ko: '은월', col: 0xd8e0ff, css: '#dfe6ff', stat: { crit: 10, critDmg: 20 }, fx: '치명타 +10% · 치명타 피해 +20% · 공격 5번마다 검기' },
    green: { ko: '녹월', col: 0x7ae07a, css: '#9ae07a', stat: { hpPct: 12 }, fx: '최대 체력 +12% · 공격 5번마다 독, 체력 1.5% 회복' },
  },
  NOUN: { warrior: '검', paladin: '망치', mage: '지팡이', rogue: '단검', ranger: '활', hexblade: '대검' },
  // 달의 무기: 주인공마다 다른 달의 모양
  MYTH: {
    warrior: { name: '달의 검 「만월」', skill: '만월' },
    paladin: { name: '달의 망치 「상현」', skill: '상현' },
    mage: { name: '달의 지팡이 「월식」', skill: '월식' },
    rogue: { name: '달의 단검 「초승」', skill: '초승' },
    ranger: { name: '달의 활 「하현」', skill: '하현' },
    hexblade: { name: '달의 대검 「그믐」', skill: '그믐' },
  },
  MYTH_COL: 0xcfe0ff,
  STAGE2_BOSS: 10,         // 달의 무기를 들고 보스 10마리 → 2단계
  FINAL_BOSSES: ['moon_orvex', 'true_moon'],

  // ---------------- 저장 ----------------
  got(s, cls) { s.moonGot = s.moonGot || {}; return (s.moonGot[cls] = s.moonGot[cls] || {}); },
  myth(s, cls) { return s.mythic && s.mythic[cls]; },
  owned(s, cls) { return s.bag.filter(it => it.moon && it.cls === cls); },
  ready(s, cls) {
    const own = this.owned(s, cls), by = {};
    for (const it of own) if (!by[it.moon] || it.plus > by[it.moon].plus) by[it.moon] = it;
    const have = this.ORDER.filter(m => by[m]), maxed = have.filter(m => by[m].plus >= 10);
    return { by, have: have.length, maxed: maxed.length, ok: maxed.length === 6 && !this.myth(s, cls) };
  },
  // 장착한 무기가 달 무기·달의 무기면 그 아이템
  wep(sc) {
    const s = sc.save || (typeof Save !== 'undefined' && Save.data);
    const it = s && s.eq && s.eq.weapon && itemById(s, s.eq.weapon);
    return it && (it.moon || it.mythic) && it.cls === s.hero ? it : null;
  },
  stageOf(s, it) { return it && it.mythic ? ((this.myth(s, it.cls) || {}).stage || 1) : 0; },

  // ---------------- 아이템 ----------------
  make(s, cls, moon) {
    const it = makeItem(s, { cls, slot: 'weapon', tier: 3, rar: 4 });
    const M = this.INFO[moon];
    it.moon = moon; delete it.legendOf; this.text(it);
    it.base = Math.round(it.base * 1.1);
    return it;
  },
  forge(s, cls) {
    const R = this.ready(s, cls);
    if (!R.ok) return null;
    const mats = this.ORDER.map(m => R.by[m]);
    for (const it of mats) { for (const k of Object.keys(s.eq)) if (s.eq[k] === it.id) s.eq[k] = null; }
    s.bag = s.bag.filter(x => !mats.includes(x));
    const it = makeItem(s, { cls, slot: 'weapon', tier: 3, rar: 4 });
    it.rar = 6; it.mythic = true; it.plus = 10; delete it.legendOf; this.text(it);
    it.base = Math.round(BASE_STAT.weapon[3] * 1.7);
    s.mythic = s.mythic || {}; s.mythic[cls] = { stage: 1, boss: 0, id: it.id };
    if (s.hero === cls) s.eq.weapon = it.id;
    return it;
  },
  // ✏️ 2026-11-25 이름·설명 (가방 상세 창 폭에 맞게 짧게). 저장을 불러올 때도 다시 붙여 예전 문구를 바꾼다
  text(it) {
    if (it.moon) {
      const M = this.INFO[it.moon];
      it.name = `${M.ko}의 ${this.NOUN[it.cls]}`; it.fx = M.fx;
      it.desc = '여섯 자루를 모두 +10까지 키우면 「달의 무기」로.';
    } else if (it.mythic) {
      it.name = this.MYTH[it.cls].name;
      it.fx = '여섯 달 능력치 60% · 공격 4번마다 여섯 달이 터진다';
      it.desc = '여섯 달을 하나로 묶은 무기. 쓸수록 깨어난다.';
    }
    return it;
  },
  stageKo(st) { return ['', '1단계 · 깨어남', '2단계 · 달무리', '3단계 · 만월'][st] || ''; },
  stageFx(cls, st) {
    return [
      '공격 4번마다 여섯 달이 차례로 터진다 (적월→황월→백월→청월→은월→녹월)',
      st >= 2 ? '공격 8번마다 커다란 달빛 초승달을 날린다' : `2단계: 달의 무기로 보스 ${this.STAGE2_BOSS}마리를 쓰러뜨리면`,
      st >= 3 ? `각성하면 12초간 「${this.MYTH[cls].skill}」 — 공격 2번마다 달이 터진다` : '3단계: 숨은 최종 보스 「깨어난 일곱 번째 달」을 쓰러뜨리면',
    ];
  },

  // ---------------- 전투 효과 ----------------
  stats(s, st) {
    const it = s.eq && s.eq.weapon && itemById(s, s.eq.weapon);
    if (!it || it.cls !== s.hero) return;
    const add = (o, k) => { for (const [n, v] of Object.entries(o)) st[n] = (st[n] || 0) + v * k; };
    if (it.moon) add(this.INFO[it.moon].stat, 1);
    if (it.mythic) for (const m of this.ORDER) add(this.INFO[m].stat, 0.6);
  },
  afterHit(sc, m, dmg, elem) {
    if (sc.mwBusy || !m || m.dead) return;
    const it = this.wep(sc); if (!it) return;
    const g = sc.mw || (sc.mw = { hits: 0, cd: 0, cyc: 0, full: 0 });
    g.hits++;
    const st = this.stageOf(sc.save, it), every = it.mythic ? (g.full > sc.now ? 2 : 4) : 5;
    if (g.hits % every === 0 && sc.now >= g.cd) {
      g.cd = sc.now + 300;
      this.burst(sc, m, it.mythic ? this.ORDER[g.cyc++ % 6] : it.moon, it.mythic ? 0.85 : 1);
    }
    if (it.mythic && st >= 2 && g.hits % 8 === 0) this.crescent(sc, 1.6);
  },
  burst(sc, m, moon, k = 1) {
    const M = this.INFO[moon], h = sc.hero;
    sc.mwBusy = true;
    try {
      sc.fx('fire_burst', m.x, m.y - 60, { s: 0.5, dur: 480, tint: M.col, add: true, depth: m.y + 1002 });
      if (moon === 'red') sc.heroArea(m.x, m.y, 150, 70, 26 * k, { elem: 'fire', kb: 220, type: 'knock', col: M.css });
      else if (moon === 'blue') { sc.fx('ice_shards', m.x, m.y - 50, { s: 0.4, dur: 500, depth: m.y + 1002 }); sc.heroArea(m.x, m.y, 150, 70, 22 * k, { elem: 'ice', kb: 120, col: M.css }); for (const o of sc.monsters) if (!o.dead && Math.abs(o.x - m.x) < 150 && Math.abs(o.y - m.y) < 70) o.chill = (o.chill || 0) + 1; }
      else if (moon === 'yellow') sc.chainBolt(m, 22 * k * sc.stats.dmgMul, 3);
      else if (moon === 'white') { sc.heroArea(m.x, m.y, 160, 70, 22 * k, { elem: 'holy', kb: 160, col: M.css }); this.heal(sc, 0.03); }
      else if (moon === 'green') { sc.heroArea(m.x, m.y, 170, 75, 16 * k, { elem: 'poison', kb: 60, col: M.css }); this.heal(sc, 0.015); }
      else if (moon === 'silver') this.crescent(sc, 1, k);
    } finally { sc.mwBusy = false; }
  },
  crescent(sc, size = 1, k = 1) {
    const h = sc.hero;
    sc.mwBusy = true;
    try { sc.heroShoot(h, { img: 'fx/slash_arc', vx: 950, dmg: Math.round(26 * k * size), pierce: true, sc: 0.5 * size, tint: this.INFO.silver.col, life: 600, gear: true }); }
    finally { sc.mwBusy = false; }
  },
  heal(sc, pct) {
    const h = sc.hero, add = Math.round(h.maxHp * pct);
    if (h.hp >= h.maxHp || add <= 0) return;
    h.hp = Math.min(h.maxHp, h.hp + add);
    sc.floatText(h.x, h.y - 250, '+' + add, '#9ae07a', 22);
  },
  dmgK(sc, m) {
    const it = this.wep(sc);
    return it && it.mythic && m && this.FINAL_BOSSES.includes(m.id) ? 1.3 : 1;
  },
  onKill(sc, m) {
    const it = this.wep(sc), s = sc.save;
    if (!it || !it.mythic || !m.def || !m.def.boss) return;
    const M = this.myth(s, it.cls); if (!M) return;
    M.boss = (M.boss || 0) + 1;
    if (M.stage < 2 && M.boss >= this.STAGE2_BOSS) {
      M.stage = 2; Save.write();
      sc.time.delayedCall(800, () => sc.banner('달의 무기가 깨어난다', '#dfe8ff', `${this.stageKo(2)} — 공격 8번마다 커다란 달빛 초승달`));
    }
  },
  onAwaken(sc) {
    const it = this.wep(sc);
    if (!it || !it.mythic || this.stageOf(sc.save, it) < 3) return;
    const g = sc.mw || (sc.mw = { hits: 0, cd: 0, cyc: 0, full: 0 });
    g.full = sc.now + 12000;
    sc.floatText(sc.hero.x, sc.hero.y - 300, `「${this.MYTH[it.cls].skill}」`, '#dfe8ff', 34);
  },
  // 보스가 나올 때: 12장 마지막 보스·숨은 최종 보스의 대사
  onBossSpawn(sc, m) {
    if (!this.FINAL_BOSSES.includes(m.id) || sc.def.moonTrial) return;
    // 깨어난 일곱 번째 달: 은빛 후광 (그림이 오기 전까지 오르벡스 그림과 구별되게)
    if (m.id === 'true_moon' && m.rig.c.postFX) m.trueGlow = m.rig.c.postFX.addGlow(this.MYTH_COL, 3, 0, false, 0.1, 14);
    const it = this.wep(sc);
    const line = m.id === 'true_moon'
      ? '…여섯 달을 하나로 묶은 빛. 그래, 그 빛으로 나를 깨웠구나.'
      : it && it.mythic ? '…그 빛. 여섯 달을 하나로 묶었구나. 그렇다면 나도 온 힘으로 맞서겠다.'
        : '…그 달빛이 없구나. 여섯 달을 하나로 묶지 못한 자가, 나를 막을 수 있을까.';
    sc.time.delayedCall(1600, () => { if (!m.dead) sc.floatText(m.x, m.y - (m.height || 260) - 40, line, '#d8e0ff', 22); });
    if (it && it.mythic) sc.time.delayedCall(3400, () => sc.banner('달의 무기가 공명한다', '#dfe8ff', '일곱 번째 달에게 주는 피해 +30%'));
  },
  // 달의 시련 보스: 달빛으로 강해진다
  empower(sc, m) {
    if (!sc.def.moonTrial || !m.def.boss) return;
    const M = this.INFO[sc.def.moonTrial];
    m.maxHp = Math.round(m.maxHp * 1.3 * (sc.def.trialHp || 1)); m.hp = m.maxHp;
    for (const b of m.rig.bones) b.baseTint = mulTint(b.baseTint, M.col);
    m.rig.setTintAll(null);
    sc.time.delayedCall(900, () => sc.banner(`${M.ko}의 빛을 두른 ${m.def.ko}`, M.css, '달빛으로 강해졌다 — 체력 +30%'));
  },
  // 결과 화면: 시련을 처음 깼을 때 보상
  trialReward(sc, s, reward) {
    const moon = sc.def.moonTrial; if (!moon || sc.mode !== 'story') return null;
    const G = this.got(s, s.hero);
    if (G[moon]) return null;
    G[moon] = true;
    const it = this.make(s, s.hero, moon);
    s.bag = s.bag.filter(b => b !== it); reward.push(it);
    sc.time.delayedCall(1800, () => UI.itemCard(sc, it, () => {}, '여섯 달 무기를 얻었다!'));
    return `★ ${it.name} 획득!  (여섯 달 무기 ${Object.keys(G).length}/6)`;
  },
  // ✏️ 2026-11-25 임시 그림: 전설 그림을 흑백(밝게)으로 바꾼 사본에 달 색을 입힌다 — 원래 색이 강한 무기(불꽃 칼 등)도 달 색이 또렷하게
  lum(sc, key) {
    const T = sc.textures, k = key + '__lum';
    if (T.exists(k)) return k;
    if (!T.exists(key)) return key;
    try {
      const src = T.get(key).getSourceImage(), cv = document.createElement('canvas');
      cv.width = src.width; cv.height = src.height;
      const x = cv.getContext('2d'); x.drawImage(src, 0, 0);
      const im = x.getImageData(0, 0, cv.width, cv.height), d = im.data;
      for (let i = 0; i < d.length; i += 4) {
        if (!d[i + 3]) continue;
        const l = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255, v = Math.round(36 + 219 * Math.pow(l, 0.7));
        d[i] = d[i + 1] = d[i + 2] = v;
      }
      x.putImageData(im, 0, 0);
      T.addCanvas(k, cv);
      return k;
    } catch (e) { return key; }   // 그림을 읽을 수 없으면 (다른 곳에서 온 그림 등) 원래 그림에 색만
  },
  // ?moonw 시험용
  debugGive(s) {
    for (const m of this.ORDER) { const it = this.make(s, s.hero, m); it.plus = 10; this.got(s, s.hero)[m] = true; }
  },

  // ---------------- 지도 ----------------
  mapDesc(ch, id) {
    const s = Save.data, moon = this.CH[ch];
    if (id === 'moon' && moon) {
      const M = this.INFO[moon], got = this.got(s, s.hero)[moon];
      return `   · 정예↑ · 적 체력 +25% · 피해 +20% · 하트 없음\n처음 깨면 「${M.ko}의 ${this.NOUN[s.hero]}」 (${DB.heroes[s.hero].name}) — ${got ? '✓ 이미 얻었어요' : '주인공마다 한 번'}`;
    }
    if (id === 'beyond') {
      const end2 = this.part2Done(s), my = this.heldMythic(s);
      return `\n숨은 최종 보스 · 조건: 2부 엔딩 ${end2 ? '✓' : '✗'} · 지금 주인공이 달의 무기를 장착 ${my ? '✓' : '✗'}`;
    }
    return '';
  },
  // 지도 노드 위: 달 색 고리 + 이름
  mapMark(scn, L, nodes, ch) {
    const s = Save.data;
    for (const id of ['moon', 'beyond']) {
      if (!nodes[id]) continue;
      const [x, y] = scn.pos(id), moon = this.CH[ch];
      const col = id === 'moon' ? this.INFO[moon].col : this.MYTH_COL, css = id === 'moon' ? this.INFO[moon].css : '#dfe8ff';
      const open = nodeCleared(s, ch, 'boss') && (id === 'moon' || this.canBeyond(s));
      const ring = scn.add.circle(x, y, 34).setStrokeStyle(4, col, open ? 0.9 : 0.3);
      L.add(ring);
      if (open) scn.tweens.add({ targets: ring, scale: 1.25, alpha: 0.3, yoyo: true, repeat: -1, duration: 900 });
      const got = id === 'moon' && this.got(s, s.hero)[moon];
      L.add(UI.text(scn, x, y - 52, id === 'moon' ? `달의 시련 · ${this.INFO[moon].ko}${got ? ' ✓' : ''}` : '달 너머', 17, open ? css : '#7a7088', { bold: true, st: 5 }).setOrigin(0.5));
    }
  },
  // 숨은 최종 보스를 쓰러뜨린 뒤
  afterBeyond(scn) {
    const s = Save.data, M = this.myth(s, s.hero);
    const first = !s.flags.moonx_done;
    s.flags.moonx_done = true;
    if (M && M.stage < 3) M.stage = 3;
    if (first) { s.books = (s.books || 0) + 1; s.mats.abyss = (s.mats.abyss || 0) + 5; s.gold += 5000; }
    Save.write();
    runTalk(scn, 'end_moonx', () => {
      if (first) UI.toast(scn, '숨은 결말 「달을 쥔 자」 · 스킬의 서 +1 · 심연 마석 +5 · 금화 +5000', '#dfe8ff', 150);
      if (M) scn.time.delayedCall(first ? 2600 : 300, () => UI.toast(scn, `${this.MYTH[s.hero].name} — ${this.stageKo(3)}! 각성하면 12초간 「${this.MYTH[s.hero].skill}」`, '#ffe27a', 210));
      scn.time.delayedCall(5200, () => scn.scene.restart({ ch: 12 }));
    });
  },
  part2Done(s) { return ['p2_true', 'p2_dark', 'p2_dawn'].some(k => s.endings && s.endings[k]); },
  heldMythic(s) { const it = s.eq && s.eq.weapon && itemById(s, s.eq.weapon); return !!(it && it.mythic && it.cls === s.hero); },
  canBeyond(s) { return this.part2Done(s) && this.heldMythic(s); },

  // ---------------- 대장간 「달의 무기」 탭 ----------------
  drawForge(scn) {
    const s = Save.data, cls = s.hero, R = this.ready(s, cls), M = this.myth(s, cls);
    UI.text(scn, 70, 100, `여섯 달 무기 · ${DB.heroes[cls].name}`, 24, '#ffe7a8', { bold: true });
    UI.text(scn, 70, 132, '2부 장 보스를 쓰러뜨리면 그 장에 「달의 시련」이 열려요. 시련을 처음 깨면 그 달의 무기를 얻어요 (주인공마다 한 번).', 15, '#8f8070', { wrap: 600 });
    const cx = 360, cy = 410, rad = 175;
    const g = scn.add.graphics();
    g.lineStyle(2, 0x5a4a70, 0.8).strokeCircle(cx, cy, rad);
    this.ORDER.forEach((moon, i) => {
      const a = -Math.PI / 2 + i * Math.PI / 3, x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
      const I = this.INFO[moon], it = R.by[moon], ch = Object.keys(this.CH).find(c => this.CH[c] === moon);
      g.lineStyle(3, I.col, it ? 0.9 : 0.35).lineBetween(cx + Math.cos(a) * 70, cy + Math.sin(a) * 70, x - Math.cos(a) * 46, y - Math.sin(a) * 46);
      if (it) UI.itemSlot(scn, x, y, it, 84);
      else { const e = scn.add.circle(x, y, 40, 0x0e0805, 0.95).setStrokeStyle(3, I.col, M ? 0.25 : 0.5); UI.text(scn, x, y, M ? '✓' : '?', 30, I.css, { bold: true }).setOrigin(0.5); }
      UI.text(scn, x, y + 50, `${I.ko} · ${ch}장`, 15, I.css, { bold: true }).setOrigin(0.5, 0);
      if (it) UI.text(scn, x, y + 70, it.plus >= 10 ? '+10 완료' : `+${it.plus} / 10`, 14, it.plus >= 10 ? '#9ae07a' : '#c8b8a0').setOrigin(0.5, 0);
    });
    // 가운데: 달의 무기
    const glow = scn.add.circle(cx, cy, 70, this.MYTH_COL, M ? 0.35 : R.ok ? 0.25 : 0.08).setBlendMode(Phaser.BlendModes.ADD);
    scn.tweens.add({ targets: glow, scale: 1.12, yoyo: true, repeat: -1, duration: 900 });
    const myIt = M && itemById(s, M.id);
    if (myIt) UI.itemSlot(scn, cx, cy, myIt, 110);
    else {
      const pv = { cls, slot: 'weapon', tier: 3, rar: 6, mythic: true, name: this.MYTH[cls].name, aff: [], plus: 0 };
      const c = UI.itemSlot(scn, cx, cy, pv, 110); c.setAlpha(R.ok ? 1 : 0.4);
    }
    // 오른쪽 안내
    UI.panel(scn, 640, 110, 580, 560, { alpha: 0.6, line: 0x6a5a90 });
    UI.text(scn, 668, 132, this.MYTH[cls].name, 28, '#dfe8ff', { bold: true, serif: true, st: 5 });
    UI.text(scn, 668, 172, '신화 · 무기 · 여섯 달 무기 능력치 60%를 모두 갖는다', 16, '#b8c0e0');
    if (M) {
      UI.text(scn, 668, 210, this.stageKo(M.stage), 24, '#ffe27a', { bold: true });
      let y = 250;
      this.stageFx(cls, M.stage).forEach((t, i) => { const o = UI.text(scn, 668, y, (i < M.stage ? '✓ ' : '· ') + t, 17, i < M.stage ? '#dfe8ff' : '#8f8aa8', { wrap: 530 }); y += Math.round(o.height) + 12; });
      if (M.stage < 2) { UI.text(scn, 668, y, `보스 ${M.boss || 0} / ${this.STAGE2_BOSS}`, 18, '#ffe7a8', { bold: true }); y += 36; }
      UI.text(scn, 668, y + 10, '12장 마지막 보스에게 피해 +30%.\n2부 엔딩을 본 뒤 12장 지도의 「달 너머」에서 숨은 최종 보스와 싸울 수 있어요.', 16, '#c8b8ff', { wrap: 530, ls: 4 });
      return;
    }
    const line = (y, ok, t) => UI.text(scn, 668, y, (ok ? '✓ ' : '✗ ') + t, 20, ok ? '#9ae07a' : '#ff9a8a', { bold: true });
    line(220, R.have === 6, `여섯 달 무기 모으기 ${R.have}/6`);
    line(256, R.maxed === 6, `모두 +10 강화 ${R.maxed}/6`);
    UI.text(scn, 668, 300, '벼리면 여섯 자루는 하나가 되어 사라져요 (+10 그대로, 되돌릴 수 없어요).', 15, '#c8b8a0', { wrap: 530 });
    let y = 340;
    this.stageFx(cls, 1).forEach(t => { const o = UI.text(scn, 668, y, '· ' + t, 16, '#b8c0e0', { wrap: 530 }); y += Math.round(o.height) + 10; });
    if (R.ok) UI.button(scn, 930, 600, '달의 무기 벼리기', () => {
      const it = this.forge(s, cls); if (!it) return;
      Save.write(); SFX.parry && SFX.parry(); scn.cameras.main.flash(500, 220, 230, 255);
      UI.itemCard(scn, it, () => scn.draw(), '여섯 달이 하나가 되었다!');
    }, { w: 300, h: 64, size: 26, col: 0x3a3a6a });
    else UI.text(scn, 930, 600, '강화는 「장비 손질」 탭에서', 18, '#8f8070').setOrigin(0.5);
  },
};

// 저장을 불러올 때 달 무기 문구를 지금 것으로
(() => {
  const ld = Save.load;
  Save.load = function (...a) { const r = ld.apply(this, a); try { for (const it of (this.data && this.data.bag) || []) if (it.moon || it.mythic) MoonW.text(it); } catch (e) { /* 무시 */ } return r; };
})();

// ---------------- 등급 「신화」 ----------------
RARITY[6] = { ko: '신화', col: '#dfe8ff', hex: 0xcfe0ff, aff: 3 };

// ---------------- 스테이지: 달의 시련 7~12 · 숨은 최종 보스 ----------------
for (const [c, pool, , tB, , midB, bossB] of P2_STAGES) {
  const moon = MoonW.CH[c], M = MoonW.INFO[moon];
  // ✏️ 12장은 마지막 보스(오르벡스) 대신 달그림자 아즈말 — 오르벡스는 본편 마지막·숨은 최종 보스에만 (체력은 장 보스만큼 올린다)
  const tb = c === 12 ? midB : bossB;
  STAGES[`c${c}_moon`] = {
    name: `달의 시련 · ${M.ko}`, theme: c === 12 ? 'moonside' : tB, boss: true, moonTrial: moon, trialHp: c === 12 ? 1.35 : 1,
    waves: [[`${pool[3]}*2,${pool[0]}*2`], [`${pool[1]}*2,${pool[2]}*2,${pool[3]}`], [tb]],
    rule: { eliteAdd: 0.45, hpMul: 1.25, dmgMul: 1.2, noHeart: true, ko: '달의 시련 — 정예 크게 증가 · 적 체력 +25% · 피해 +20% · 회복 하트 없음' },
  };
}
MONDEF.true_moon = { ...MONDEF.moon_orvex, ko: '깨어난 일곱 번째 달', tint: 0xe8f0ff, hp: Math.round(MONDEF.moon_orvex.hp * 1.6), dmg: Math.round(MONDEF.moon_orvex.dmg * 1.2), exp: MONDEF.moon_orvex.exp * 2 };
STAGES.x_moon = { name: '달 너머', theme: 'moonside', boss: true, moonFinal: true,
  waves: [['moon_shade*2,star_imp*2'], ['moon_hound*2,void_leech*2,moon_shade'], ['true_moon']],
  rule: { hpMul: 1.15, dmgMul: 1.15, noHeart: true, ko: '달 너머 — 적 체력·피해 +15% · 회복 하트 없음' } };
for (let c = 7; c <= 12; c++) {
  const N = MAP_NODES[c]; if (!N) continue;
  N.moon = [N.boss[0] - 70, N.boss[1] - 150];
  if (c === 12) N.beyond = [N.boss[0] - 70, N.boss[1] + 150];
}
// 노드: 장 보스 → 달의 시련 (12장은 달 너머도)
const _chapterNodesMW = chapterNodes;
chapterNodes = function (n) {
  const o = _chapterNodesMW(n);
  if (n >= 7 && n <= 12) {
    o.moon = { type: 'trial', stage: `c${n}_moon`, next: [] };
    o.boss = { ...o.boss, next: [...o.boss.next, 'moon'] };
    if (n === 12) { o.beyond = { type: 'final', stage: 'x_moon', next: [] }; o.boss.next.push('beyond'); }
  }
  return o;
};
const _openNodesMW = openNodes;
openNodes = function (s, ch) {
  const out = _openNodesMW(s, ch);
  return ch === 12 && !MoonW.canBeyond(s) ? out.filter(id => id !== 'beyond') : out;
};
// 달 무기·달의 무기는 분해 못 한다
const _dismantleMW = dismantle;
dismantle = function (s, it) { if (it && (it.moon || it.mythic)) return null; return _dismantleMW(s, it); };

// ---------------- 장비 효과 연결 (GearFx 감싸기) ----------------
(() => {
  const G = GearFx;
  const st0 = G.stats, ah0 = G.afterHit, dk0 = G.dmgK, ok0 = G.onKill, aw0 = G.onAwaken;
  G.stats = function (s, st) { st0.call(this, s, st); MoonW.stats(s, st); };
  G.afterHit = function (sc, m, dmg, elem) { ah0.call(this, sc, m, dmg, elem); MoonW.afterHit(sc, m, dmg, elem); };
  G.dmgK = function (sc, m, crit, elem) { return dk0.call(this, sc, m, crit, elem) * MoonW.dmgK(sc, m); };
  G.onKill = function (sc, m) { ok0.call(this, sc, m); MoonW.onKill(sc, m); };
  G.onAwaken = function (sc, h) { aw0.call(this, sc, h); MoonW.onAwaken(sc, h); };
})();

// ---------------- 아이콘 (그림이 오기 전엔 전설 무기 아이콘에 색) ----------------
(() => {
  const ic0 = UI.itemIcon;
  UI.itemIcon = function (it) {
    if (it && it.moon) { const k = `icon/moonw_${it.cls}_${it.moon}`; return typeof MAN !== 'undefined' && MAN[k] ? k : `icon/${it.cls}_legend_weapon`; }
    if (it && it.mythic) { const k = `icon/mythic_${it.cls}`; return typeof MAN !== 'undefined' && MAN[k] ? k : `icon/${it.cls}_legend_weapon`; }
    return ic0.call(this, it);
  };
  UI.iconTint = function (it, key) {
    if (!it || key.includes('moonw_') || key.includes('mythic_')) return null;
    return it.moon ? MoonW.INFO[it.moon].col : it.mythic ? MoonW.MYTH_COL : null;
  };
})();

// ---------------- 이야기: 숨은 최종 보스 ----------------
Object.assign(STORY, {
  pre_moonx: [
    { w: 'narr', t: '— 싸움이 끝나고 처음 맞는 고요한 밤. 그런데 달 너머, 아무도 본 적 없는 어둠 속에서 무언가가 눈을 떴다.' },
    { w: 'lise', f: 'surprise', t: '…들려요. 여섯 달이 아니라, 일곱 번째 달이 우는 소리예요. 아직 다 잠들지 못한 거예요.' },
    { w: 'hero', t: '이 무기가 떨리고 있어. 여섯 달이 저쪽을 가리키는 것 같아.' },
    { w: 'lise', t: '그 빛이라면 닿을 수 있을 거예요. 이번엔… 끝까지 같이 가요.' },
  ],
  end_moonx: [
    { w: 'narr', t: '여섯 달의 빛이 하나로 모여 일곱 번째 달의 깊은 곳까지 비췄다. 남아 있던 울음이, 조용히 잦아들었다.' },
    { w: 'orvex', t: '…이것이 네가 고른 빛인가. 나는 끝내 혼자 정해 버렸는데, 너는 여섯을 하나로 묶었구나.' },
    { w: 'lise', f: 'tearsmile', t: '이제 정말 괜찮아요. 일곱 번째 달도, 이제는 울지 않고 잠들 수 있어요.' },
    { w: 'narr', t: '— 숨은 결말 「달을 쥔 자」. 그날 이후, 벨카라의 밤에는 달빛이 한 번도 끊기지 않았다.' },
  ],
});
