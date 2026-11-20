// 저장, 성장, 장비. 저장은 localStorage(나중에 Capacitor Preferences로 바꾼다).
const SAVE_KEY = 'seventhmoon.save.v1';
const SLOTS = ['weapon', 'offhand', 'head', 'body', 'acc1', 'acc2'];
const SLOT_KO = { weapon: '무기', offhand: '보조', head: '머리', body: '몸', acc1: '장신구', acc2: '장신구' };
const RARITY = [
  { ko: '일반', col: '#e8e4dc', hex: 0xe8e4dc, aff: 0 },
  { ko: '고급', col: '#7ee07a', hex: 0x7ee07a, aff: 1 },
  { ko: '희귀', col: '#6ab0ff', hex: 0x6ab0ff, aff: 2 },
  { ko: '영웅', col: '#c87aff', hex: 0xc87aff, aff: 3 },
  { ko: '전설', col: '#ff9a3a', hex: 0xff9a3a, aff: 3 },
  { ko: '세트', col: '#3ae0c8', hex: 0x3ae0c8, aff: 2 },
];
const MATS = { low: '하급 마석', mid: '중급 마석', high: '상급 마석', abyss: '심연 마석' };
// 아이템 벨트에 넣는 소모품 (DB.consumables 이름과 맞춘다)
const BELT = {
  potion: { ko: '회복약', fx: '체력 40% 회복', price: 40, icon: 'potion' },
  dagger: { ko: '투척 단검', fx: '일직선 관통', price: 25, icon: 'dagger' },
  oil: { ko: '기름병', fx: '깨지면 화염 장판', price: 45, icon: 'oil' },
  scroll: { ko: '화염 두루마리', fx: '전방 화염 폭발', price: 90, icon: 'scroll_fire' },
  feather: { ko: '부활 깃털', fx: '쓰러지면 자동 부활', price: 150, icon: 'feather' },
  // 🆕 전투 중 쓰는 소모품 (개수 제한, 상황에 맞게 골라 쓴다)
  hammer: { ko: '투척 망치', fx: '던져서 띄워 날림', price: 40, icon: 'hammer' },
  bomb: { ko: '마석 폭탄', fx: '넓은 범위 폭발', price: 70, icon: 'bolt' },
  holy: { ko: '성수', fx: '신성 피해·언데드에 강함', price: 55, icon: 'holy' },
  antidote: { ko: '해독초', fx: '상태이상 해제·3초 무적', price: 35, icon: 'antidote' },
  smoke: { ko: '연막탄', fx: '주변 기절·뒤로 빠짐', price: 50, icon: 'smoke' },
  scroll_ice: { ko: '서리 두루마리', fx: '앞쪽 적을 얼림', price: 90, icon: 'scroll_ice' },
  scroll_bolt: { ko: '번개 두루마리', fx: '번개 5번 낙뢰', price: 95, icon: 'scroll_bolt' },
  scroll_heal: { ko: '치유 두루마리', fx: '나와 동료 30% 회복', price: 80, icon: 'scroll_heal' },
  scroll_guard: { ko: '보호 두루마리', fx: '6초간 피해 60% 감소', price: 85, icon: 'scroll_guard' },
};
const BELT_ORDER = ['potion', 'dagger', 'oil', 'scroll'];
// 🆕 벨트 4칸은 고를 수 있다 (상점에서 바꿈). 저장에 없으면 기본 순서
function beltSlots(s) { return (s && Array.isArray(s.beltSlots) && s.beltSlots.length === 4) ? s.beltSlots : BELT_ORDER; }

// 숨은 직업 해금은 저장을 새로 만들어도 남는다
const UNLOCK_KEY = 'seventhmoon.unlock';
function globalUnlocks() { try { return JSON.parse(localStorage.getItem(UNLOCK_KEY) || '{}'); } catch (e) { return {}; } }
function addGlobalUnlock(k) { try { const u = globalUnlocks(); u[k] = true; const t = JSON.stringify(u); localStorage.setItem(UNLOCK_KEY, t); NativeStore.mirror(UNLOCK_KEY, t); } catch (e) { /* 무시 */ } }
// 직업 바꾸기: 장비와 스킬은 직업마다 따로 기억한다 (레벨·금화·가방은 함께)
function switchHero(s, key) {
  if (s.hero === key) return;
  s.eqBy = s.eqBy || {}; s.skillsBy = s.skillsBy || {};
  s.eqBy[s.hero] = s.eq; s.skillsBy[s.hero] = { skills: s.skills, active: s.active };
  s.hero = key;
  if (s.eqBy[key]) s.eq = s.eqBy[key];
  else { s.eq = {}; for (const slot of ['weapon', 'offhand', 'head', 'body']) { const it = makeItem(s, { cls: key, slot, tier: Math.min(3, Math.floor((s.ch - 1) / 2)), rar: 0 }); s.eq[slot] = it.id; } }
  // 장신구는 함께 쓴다
  const prev = s.eqBy[Object.keys(s.eqBy).find(k => k !== key) || key] || {};
  if (!s.eq.acc1 && prev.acc1) s.eq.acc1 = prev.acc1;
  if (!s.eq.acc2 && prev.acc2) s.eq.acc2 = prev.acc2;
  const sk = s.skillsBy[key];
  // 스킬 포인트는 레벨에서 나오므로, 처음 쓰는 직업은 전체 포인트를 새로 받는다
  if (sk) { s.skills = sk.skills; s.active = sk.active; s.sp = Math.max(0, s.lv - 1 - Object.keys(s.skills).length); }
  else { s.skills = {}; s.active = [null, null]; s.sp = s.lv - 1; }
}
// 난이도: 0 견습, 1 기사(기본), 2 영웅(엔딩 1개 이상), 3 전설(엔딩 2개 이상)
const DIFFS = [
  { ko: '견습', desc: '적이 약하다. 처음 해 보는 분께', loot: -1 },
  { ko: '기사', desc: '기본 난이도', loot: 0 },
  { ko: '영웅', desc: '정예 몬스터 등장, 심연 장비가 나온다', loot: 2 },
  { ko: '전설', desc: '정예가 자주 나오고 더 강하다, 보상 최고', loot: 4 },
];
function diffOpen(s, d) {
  if (d <= 1) return true;
  const u = globalUnlocks(), ends = Object.keys((s && s.endings) || {}).length;
  return d === 2 ? (ends >= 1 || u.diff2) : (ends >= 2 || u.diff3);
}
// 정예 접두사 (영웅 이상)
const ELITES = {
  split: { ko: '분열하는', col: '#a0ff80' },
  fire: { ko: '화염 흔적', col: '#ff9050' },
  shield: { ko: '방패막', col: '#a0d8ff' },
  vamp: { ko: '흡혈', col: '#ff6080' },
  blink: { ko: '순간이동', col: '#d0a0ff' },
};
const expNeed = lv => Math.round(90 * Math.pow(1.12, lv));
const LV_CAP = 30;

function newSave(hero = 'warrior') {
  const s = {
    v: 1, hero, lv: 1, exp: 0, gold: 0, mats: { low: 0, mid: 0, high: 0, abyss: 0 },
    bag: [], eq: {}, nextId: 1, belt: { potion: 2, dagger: 3, oil: 0, scroll: 0, feather: 0 },
    sp: 0, skills: {}, active: [null, null],
    ch: 1, at: 'camp', cleared: {}, route: {}, grades: {}, moons: {}, flags: {}, lise: 0,
    endings: {}, unlocked: { warrior: true, mage: true, paladin: true, rogue: true, ...globalUnlocks() }, seen: {}, play: 0, runs: 1, eqBy: {}, skillsBy: {},
  };
  // 시작 장비: 견습 무기·보조·머리·몸 (일반)
  for (const slot of ['weapon', 'offhand', 'head', 'body']) {
    const it = makeItem(s, { cls: hero, slot, tier: 0, rar: 0 });
    s.eq[slot] = it.id;
  }
  return s;
}

const Save = {
  data: null,
  has() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },
  load() {
    try { const t = localStorage.getItem(SAVE_KEY); if (t) this.data = JSON.parse(t); } catch (e) { this.data = null; }
    if (this.data && this.data.v !== 1) this.data = null;
    return this.data;
  },
  write() { try { const t = JSON.stringify(this.data); localStorage.setItem(SAVE_KEY, t); NativeStore.mirror(SAVE_KEY, t); } catch (e) { /* 저장 실패는 조용히 */ } },
  fresh(hero) { this.data = newSave(hero); this.write(); return this.data; },
  wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 무시 */ } this.data = null; },
  // 백업 코드 (내보내기·불러오기)
  exportCode() { return btoa(unescape(encodeURIComponent(JSON.stringify(this.data)))); },
  importCode(code) { const d = JSON.parse(decodeURIComponent(escape(atob(code.trim())))); if (d.v !== 1) throw new Error('버전'); this.data = d; this.write(); },
};

// ---------------- 아이템 ----------------
const AFF_ROLL = DB.affixes.map(a => {
  const m = a.range.match(/(-?)([\d.]+)~([\d.]+)/);
  const neg = !!m && m[1] === '-';
  return { lo: m ? +m[2] : 1, hi: m ? +m[3] : 1, neg, unit: a.range.includes('초') ? '초' : a.range.includes('%') ? '%' : '' };
});
function affText(a) {
  const d = DB.affixes[a.i], r = AFF_ROLL[a.i];
  const sign = r.neg ? '-' : d.range.startsWith('+') ? '+' : '';
  return `${d.name} ${sign}${a.v}${r.unit}`;
}
function rollAffixes(cls, n) {
  const pool = DB.affixes.map((a, i) => i).filter(i => {
    const nm = DB.affixes[i].name;
    if (!nm.startsWith('[')) return true;
    return nm.startsWith('[' + DB.heroes[cls]?.name + ']');
  });
  const out = [];
  while (out.length < n && pool.length) {
    const i = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    const r = AFF_ROLL[i];
    const step = r.hi - r.lo <= 1 ? 0.1 : 1;
    const v = Math.round((r.lo + Math.random() * (r.hi - r.lo)) / step) * step;
    out.push({ i, v: +v.toFixed(1) });
  }
  return out;
}
const BASE_STAT = {
  weapon: [8, 18, 30, 46], offhand: [4, 9, 15, 22], head: [3, 7, 12, 18], body: [6, 14, 24, 36], acc: [0, 0, 0, 0],
};
// o: { cls, slot, tier, rar, legend:bool }
function makeItem(s, o) {
  const id = s.nextId++;
  const slot = o.slot.startsWith('acc') ? 'acc' : o.slot;
  const rar = o.rar ?? 0, tier = o.tier ?? 0;
  const it = { id, cls: slot === 'acc' ? 'acc' : o.cls, slot, tier, rar, plus: 0 };
  if (slot === 'acc') {
    const kind = o.kind || (Math.random() < 0.5 ? 'ring' : 'amulet');
    it.kind = kind;
    if (rar === 4) { const L = DB.accessory.legend.filter(l => l.kind === kind); const l = L[Math.floor(Math.random() * L.length)]; it.name = l.name; it.fx = l.fx; }
    else if (rar === 5) { const S = DB.accessory.sets[Math.floor(Math.random() * DB.accessory.sets.length)]; it.name = S.pieces[kind === 'ring' ? 0 : 1]; it.set = S.name; }
    else it.name = DB.accessory[kind][tier];
  } else {
    const g = DB.gear[it.cls];
    if (rar === 4) { it.name = g.legend[slot].name; it.fx = g.legend[slot].fx; }
    else if (rar === 5) { it.name = g.set.pieces[slot]; it.set = g.set.name; }
    else it.name = g.tiers[slot][tier];
  }
  it.base = Math.round(BASE_STAT[slot][tier] * (1 + rar * 0.1));
  it.aff = rollAffixes(it.cls === 'acc' ? s.hero : it.cls, RARITY[rar].aff + (slot === 'acc' ? 1 : 0));
  s.bag.push(it);
  return it;
}
function itemById(s, id) { return s.bag.find(i => i.id === id); }
function itemPower(it) { return Math.round(it.base * (1 + it.plus * 0.08)); }
function itemLabel(it) { return (it.plus ? `+${it.plus} ` : '') + it.name; }
// 드롭 희귀도: bonus는 스테이지 등급·보스 보정
function rollRarity(ch, bonus = 0, boss = false) {
  const w = [50, 30, 14 + bonus * 3, 5 + bonus * 2, boss ? 4 + bonus : 0, boss && ch >= 3 ? 3 : 0];
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return i; }
  return 0;
}
function rollDrop(s, ch, bonus = 0, boss = false) {
  const d = s.diff ?? 1;
  bonus += DIFFS[d].loot;
  const tier = Math.min(3, Math.floor((ch - 1) / 2) + (d >= 2 ? 1 : 0));
  const slots = ['weapon', 'offhand', 'head', 'body', 'acc'];
  const slot = slots[Math.floor(Math.random() * slots.length)];
  // 지금 직업 장비 70%, 나머지는 다른 직업(나중에 그 직업으로 할 때 쓴다)
  const owned = Object.keys(s.unlocked).filter(k => s.unlocked[k]);
  const cls = Math.random() < 0.7 ? s.hero : owned[Math.floor(Math.random() * owned.length)];
  let rar = rollRarity(ch, bonus, boss);
  if (rar < 4 && typeof GearFx !== 'undefined' && GearFx.codes(s).has('luck') && Math.random() < (boss ? 0.04 : 0.006)) rar = 4;   // 🆕 은방울 행운 목걸이
  return makeItem(s, { cls, slot, tier, rar });
}

// ---------------- 능력치 ----------------
// 장비 옵션 이름 → 능력치 키
const AFF_KEY = {
  '공격력': 'atkPct', '치명타 확률': 'crit', '치명타 피해': 'critDmg', '공격 속도': 'aspd', '띄운 적에게 피해': 'vsAir',
  '다운된 적에게 피해': 'vsDown', '등 뒤 공격 피해': 'vsBack', '10콤보 이상일 때 피해': 'vsCombo', '정예에게 피해': 'vsElite',
  '보스에게 피해': 'vsBoss', '최대 체력': 'hpPct', '방어력': 'defPct', '원거리 피해 감소': 'redRange', '근접 피해 감소': 'redMelee',
  '가드 스태미나 소모': 'guardCost', '일어날 때 무적 시간': 'getupInv', '받는 회복 효과': 'healPct', '처치 시 체력 회복': 'leech',
  '금화 획득': 'goldPct', '경험치': 'expPct', '이동 속도': 'spd', '스태미나 회복': 'staRegen', '각성 충전': 'awkPct',
  '스킬 쿨다운': 'cdr', '투척 아이템 피해': 'throwPct', '[하르반] 저스트 가드 판정': 'parryWin',
  // 🆕 그동안 이름만 있던 옵션
  '화염 피해': 'fireDmg', '냉기 피해': 'iceDmg', '번개 피해': 'boltDmg', '신성 피해': 'holyDmg', '암흑 피해': 'darkDmg', '독 피해': 'poisonDmg',
  '상태이상 지속시간': 'statusRed', '상태이상 부여 확률': 'procPct', '처치 시 원소 폭발 확률': 'killBoom',
  '[미라엘] 주문 횟수': 'mageExtra', '[오델리아] 신앙 축적': 'faith', '[키르] 출혈 피해': 'bleed', '[세릴] 차지 속도': 'chargeSpd', '[녹타] 체력 소모 기술 비용': 'hpCost',
};
function heroStats(s) {
  const st = { lv: s.lv, atk: 10 + s.lv * 2, def: 0, hp: 340 + s.lv * 20, crit: 8, critDmg: 80 };
  for (const k of Object.values(AFF_KEY)) st[k] = st[k] || 0;
  const sets = {};
  for (const slot of SLOTS) {
    const it = s.eq[slot] && itemById(s, s.eq[slot]);
    if (!it) continue;
    const p = itemPower(it);
    if (it.slot === 'weapon') st.atk += p; else st.def += p;
    if (it.slot === 'body') st.hp += p * 3;
    for (const a of it.aff) {
      const nm = DB.affixes[a.i].name, k = AFF_KEY[nm];
      if (k) st[k] += Math.abs(a.v);
    }
    if (it.set) sets[it.set] = (sets[it.set] || 0) + 1;
  }
  // 스킬 패시브와 직업 보정
  applyPassives(s, st);
  if (typeof GearFx !== 'undefined') GearFx.stats(s, st);   // 🆕 전설·세트·보스 장비 효과
  const cls = classOf(s.hero);
  st.hp *= cls.hp || 1;
  st.crit += cls.critAdd || 0;
  st.atk = Math.round(st.atk * (1 + st.atkPct / 100));
  st.def = Math.round(st.def * (1 + st.defPct / 100));
  st.hp = Math.round(st.hp * (1 + st.hpPct / 100));
  st.crit += 0; st.sets = sets;
  st.dmgMul = st.atk / 20;
  st.red = st.def / (st.def + 60);
  st.power = Math.round(st.atk * 3 + st.def * 2 + st.hp / 10);
  return st;
}
function gainExp(s, n) {
  const ups = [];
  s.exp += n;
  while (s.lv < LV_CAP && s.exp >= expNeed(s.lv)) { s.exp -= expNeed(s.lv); s.lv++; s.sp++; ups.push(s.lv); }
  if (s.lv >= LV_CAP) s.exp = Math.min(s.exp, expNeed(s.lv));
  return ups;
}

// ---------------- 대장간 ----------------
function matOf(it) { return it.rar >= 4 ? 'abyss' : ['low', 'low', 'mid', 'high'][it.tier]; }
function enhanceCost(it) {
  const n = it.plus + 1;
  return { gold: 20 * n * (it.tier + 1), mat: n <= 4 ? 'low' : n <= 7 ? 'mid' : 'high', cnt: n <= 4 ? n : n <= 7 ? n - 4 : n - 7 };
}
function enhanceRate(it) { return [100, 100, 100, 90, 80, 70, 60, 50, 40, 30][it.plus] || 0; }
function tryEnhance(s, it) {
  if (it.plus >= 10) return 'max';
  const c = enhanceCost(it);
  if (s.gold < c.gold || (s.mats[c.mat] || 0) < c.cnt) return 'cost';
  s.gold -= c.gold; s.mats[c.mat] -= c.cnt;
  if (Math.random() * 100 < enhanceRate(it)) { it.plus++; return 'ok'; }
  return 'fail';   // 실패해도 부서지지 않는다
}
function dismantle(s, it) {
  if (Object.values(s.eq).includes(it.id)) return null;
  const m = matOf(it), n = 1 + it.rar + Math.floor(it.plus / 2);
  s.mats[m] = (s.mats[m] || 0) + n;
  s.bag = s.bag.filter(x => x !== it);
  return { m, n };
}
function rerollCost(it) { return { mat: it.rar >= 4 ? 'abyss' : 'mid', cnt: 1, gold: 60 * (it.tier + 1) }; }
function reroll(s, it, k) {
  const c = rerollCost(it);
  if (!it.aff[k] || s.gold < c.gold || (s.mats[c.mat] || 0) < c.cnt) return false;
  s.gold -= c.gold; s.mats[c.mat] -= c.cnt;
  const keep = it.aff.filter((_, i) => i !== k).map(a => a.i);
  let a;
  for (let t = 0; t < 30; t++) { a = rollAffixes(it.cls === 'acc' ? s.hero : it.cls, 1)[0]; if (!keep.includes(a.i)) break; }
  it.aff[k] = a;
  return true;
}

// ---------------- 진행 ----------------
function nodeCleared(s, ch, id) { return (s.cleared['c' + ch] || []).includes(id); }
function clearNode(s, ch, id) {
  const k = 'c' + ch;
  s.cleared[k] = s.cleared[k] || [];
  if (!s.cleared[k].includes(id)) s.cleared[k].push(id);
}
// 지금 갈 수 있는 노드
function openNodes(s, ch) {
  const nodes = chapterNodes(ch), done = s.cleared['c' + ch] || [];
  if (!done.length) return ['s1'];
  const out = new Set();
  for (const id of done) for (const nx of nodes[id].next) {
    if (done.includes(nx)) continue;
    // 갈림길은 한 번 고르면 그 장에서는 다른 쪽을 막는다
    const r = nodes[nx].route, chosen = s.route['c' + ch];
    if (r && chosen && r !== chosen) continue;
    out.add(nx);
  }
  return [...out];
}
function endingFor(s) {
  if (s.flags.accepted) return 'end_dark';
  const moons = Object.keys(s.moons).length;
  // ✏️ 진 엔딩: 월석 6개 + 리세 신뢰 4 이상 (오르벡스 제안을 거절했을 때)
  if (moons >= 6 && s.lise >= 4) return 'end_true';
  if (s.lise >= 3) return 'end_sacrifice';
  return 'end_seal';
}
