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
  bomb: { ko: '마석 폭탄', fx: '넓은 범위 폭발', price: 70, icon: 'bomb' },
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
// ✏️ 30레벨까지는 그대로, 그 뒤는 완만하게 (2부)
const expNeed = lv => lv <= 30 ? Math.round(90 * Math.pow(1.12, lv)) : Math.round(90 * Math.pow(1.12, 30) * (1 + (lv - 30) * 0.09));
const LV_CAP = 60;
// 🆕 체력 이어가기: 다음 스테이지는 이 비율 아래로 시작하지 않는다 (막혀서 못 깨는 일을 막는다)
const HP_CARRY_MIN = 0.3;   // ✏️ 2부: 30 → 60

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
    // ✏️ 2026-11-22 4장·9장 선택이 공통 장면으로 옮겨짐: 예전에 이미 고른 저장이면 다시 묻지 않는다
    const f = this.data && this.data.flags;
    if (f) { if (f.c4_truth || f.c4_hide) f.c4_decided = true; if (f.kael_ally || f.kael_alone) f.c9_decided = true; }
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
// 🆕 2026-11-22 이야기 장면에서 받는 고유 장비 (이름·부위·등급·설명 고정, 옵션은 무작위)
//   rar: 1 고급 · 2 희귀 · 3 영웅 · 4 전설. legendOf: 전설 효과를 빌려 올 전설 장비 이름(GEAR_LEGEND)
const STORY_GEAR = {
  cls_warrior: { slot: 'offhand', rar: 1, name: '방패수의 방패', desc: '300년 전 국경을 지킨 방패수의 방패. 이끼 아래에서도 문양이 빛난다.' },
  cls_rogue: { slot: 'weapon', rar: 1, name: '길드장의 비수', desc: '일곱 자물쇠 금고에서 챙긴 "위자료". 손잡이에 옛 길드 문장이 새겨져 있다.' },
  cls_paladin: { slot: 'offhand', rar: 1, name: '백월 성당의 방패', desc: '모래에 묻힌 성당 제단 아래에서 찾은 방패. 백월의 빛이 깃들어 있다.' },
  cls_ranger: { slot: 'weapon', rar: 2, name: '달빛 샘의 활', desc: '얼지 않는 엘프의 샘에서 떠오른 활. 시위가 은빛으로 떨린다.' },
  cls_mage: { slot: 'offhand', rar: 2, name: '카엘의 질문 노트', desc: '"스승님, 희생 없는 봉인은 정말 있나요?" 어린 제자의 글씨가 빼곡하다.' },
  cls_hexblade: { slot: 'offhand', rar: 2, name: '부서진 흑월 부적', desc: '심연의 제단을 부수고 남은 조각. 이제 속삭임은 들리지 않는다.' },
  c6_seah: { slot: 'acc', kind: 'amulet', rar: 3, name: '세아의 맹세', desc: '마지막 싸움 앞에서 공명석이 빚어낸 목걸이. 300년 전 영웅의 온기가 남아 있다.' },
  // ✏️ 2026-11-22 곁가지·사건·B길 보물 (docs/story-items.md)
  c1_hunter: { slot: 'acc', kind: 'amulet', rar: 1, name: '사냥꾼 가족의 부적', desc: '늙은 사냥꾼이 손주 목에 걸어 주던 나무 부적. 약초 냄새가 난다.' },
  c1_hunter_broken: { slot: 'acc', kind: 'amulet', rar: 0, name: '부러진 활시위 부적', desc: '무너진 오두막에서 주운 활시위 매듭. 늦은 걸음을 잊지 않게.' },
  c2_key: { slot: 'acc', kind: 'ring', rar: 1, name: '항구의 열쇠', desc: '"항구의 열쇠는 우리 손에." 교단 편지와 함께 나온 열쇠를 반지로 꿴 것.' },
  c3_hood: { slot: 'head', rar: 1, name: '대상의 모래 두건', desc: '구해 낸 대상이 건넨 두건. 별이 떨어진 동쪽 사막의 냄새가 밴다.' },
  c4_ella_knot: { slot: 'acc', kind: 'amulet', rar: 2, name: '엘라의 매듭', desc: '엘라가 리세의 요람에 묶어 두었던 매듭. 타벨이 다시 엮어 주었다.' },
  c4_tabel_coat: { slot: 'body', rar: 2, name: '타벨이 기운 외투', desc: '타벨이 말없이 기워 준 외투. 바늘땀마다 하지 못한 말이 박혀 있다.' },
  c4_keeper: { slot: 'head', rar: 2, name: '월석 지기의 머리띠', desc: '엘라와 타벨이 월석을 지키던 시절의 머리띠. 안쪽에 두 사람의 이름이 있다.' },
  c4_brothers: { slot: 'acc', kind: 'ring', rar: 2, name: '얼음 광산 형제의 반지', desc: '얼음에서 풀려난 드워프들이 건넨 증표. "타벨 형님 친구라면 우리 친구지."' },
  c5_cloak: { slot: 'body', rar: 2, name: '마도탑 견습생의 망토', desc: '하피 둥지에서 찾은 망토. 마도탑 문장이 아직 희미하게 빛난다.' },
  c6_shard: { slot: 'acc', kind: 'amulet', rar: 2, name: '방패수의 마지막 조각', desc: '300년을 기다린 그림자가 남긴 방패 조각. 고개를 숙인 채 흩어졌다.' },
  c7_starring: { slot: 'acc', kind: 'ring', rar: 2, name: '오르벡스의 별자리 반지', desc: '관측소 상자 속 반지. 안쪽에 일곱 번째 별자리가 새겨져 있다.' },
  c8_diver: { slot: 'head', rar: 2, name: '산호 잠수부의 두건', desc: '잠수부들이 산호 속 보물 상자에서 꺼내 준 두건. 바닷물이 마르지 않는다.' },
  c9_apron: { slot: 'body', rar: 2, name: '엘라의 대장장이 앞치마', desc: '엘라의 매듭으로 싸여 있던 앞치마. 젊은 타벨과 엘라가 처음 만난 대장간의 것.' },
  c9_ember: { slot: 'acc', kind: 'ring', rar: 2, name: '마지막 화로의 불씨', desc: '다시 붙은 화로의 불씨를 담은 반지. 손가락이 늘 따뜻하다.' },
  c10_seed: { slot: 'acc', kind: 'amulet', rar: 2, name: '빛나는 씨앗 장식', desc: '정령 아이들이 건넨 씨앗 장식. 가만히 두면 작게 싹이 튼다.' },
  c10_seed_dim: { slot: 'acc', kind: 'amulet', rar: 0, name: '빛 잃은 씨앗 장식', desc: '지키지 못한 정령 아이가 남긴 장식. 언젠가 다시 빛날까.' },
  c11_coat: { slot: 'body', rar: 2, name: '은빛 정원사의 외투', desc: '은빛 인형들이 정원을 가꿀 때 입던 외투. 밤이슬이 맺히지 않는다.' },
  c11_painted: { slot: 'acc', kind: 'ring', rar: 2, name: '밤하늘을 그린 반지', desc: '풀려난 화가들이 별을 그려 넣은 반지. 들여다보면 별이 하나씩 늘어난다.' },
  c12_memory: { slot: 'acc', kind: 'amulet', rar: 2, name: '첫 달의 기억', desc: '여섯 달이 처음 떠오르던 날의 빛 조각. 달은 밤을 지키려고 떠올랐다.' },
  c10_spirit: { slot: 'acc', kind: 'ring', rar: 4, name: '숲 정령의 맹세', legendOf: '불사조의 반지', desc: '되살아난 숲의 정령들이 빛을 모아 빚은 반지. 쓰러져도 숲처럼 다시 일어선다.' },
};
function makeStoryGear(s, key) {
  const d = STORY_GEAR[key]; if (!d) return null;
  const it = makeItem(s, { cls: s.hero, slot: d.slot, kind: d.kind, tier: Math.min(3, Math.floor((s.ch - 1) / 2)), rar: d.rar });
  it.name = d.name; it.desc = d.desc; it.story = key; it.storyRar = d.rar;
  if (d.legendOf) { it.legendOf = d.legendOf; const L = DB.accessory.legend.find(l => l.name === d.legendOf) || (DB.gear[it.cls] && Object.values(DB.gear[it.cls].legend).find(l => l.name === d.legendOf)); if (L) it.fx = L.fx; }
  return it;
}
function itemById(s, id) { return s.bag.find(i => i.id === id); }
function itemPower(it) { return Math.round(it.base * (1 + it.plus * 0.08)); }
function itemLabel(it) { return (it.plus ? `+${it.plus} ` : '') + it.name; }
// ✏️ 2026-11-22 장별 드롭 확률표 (일반·고급·희귀·영웅·전설 %). 영웅은 6장부터 드물게, 전설은 드롭으로 거의 안 나온다(앞으로 조합으로 얻는다)
const DROP_TABLE = [
  { upTo: 3, w: [90, 10, 0, 0, 0] },
  { upTo: 5, w: [70, 20, 10, 0, 0] },
  { upTo: 6, w: [60, 25, 14, 1, 0] },
  { upTo: 9, w: [50, 30, 17, 3, 0] },
  { upTo: 12, w: [40, 33, 22, 5, 0] },
];
function dropWeights(ch) { return (DROP_TABLE.find(r => ch <= r.upTo) || DROP_TABLE[DROP_TABLE.length - 1]).w; }
// bonus(난이도·S등급·도전 과제)는 가끔 한 단계 위로 올려 준다 — 그 장에서 나올 수 있는 최고 등급까지만
// boss·special(보스·숨은 보물): 최소 고급
function rollRarity(ch, bonus = 0, boss = false, special = false) {
  const w = dropWeights(ch);
  let r = Math.random() * w.reduce((a, b) => a + b, 0), rar = 0;
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) { rar = i; break; } }
  const top = w.reduce((m, x, i) => (x > 0 ? i : m), 0);
  if (boss || special) rar = Math.max(rar, 1);
  if (bonus > 0 && rar < top && Math.random() < Math.min(0.4, bonus * 0.06)) rar++;
  if (boss && ch >= 3 && Math.random() < 0.03) rar = 5;   // 세트 장비: 3장 이후 보스에서 가끔
  if (boss && ch >= 12 && Math.random() < 0.005) rar = 4;   // 전설: 2부 마지막 보스에서만 아주 드물게
  return rar;
}
// min: 이 등급 아래로는 안 나온다 (보스·중간 보스·숨은 보물 = 희귀 이상) / special: 1장에서도 영웅이 나올 수 있다
function rollDrop(s, ch, bonus = 0, boss = false, min = 0, special = false, o = {}) {   // ✏️ 2026-11-22 o.cls·o.slot: 상점 진열용으로 직업·부위를 정할 수 있다
  const d = s.diff ?? 1;
  bonus += DIFFS[d].loot;
  const tier = Math.min(3, Math.floor((ch - 1) / 2) + (d >= 2 ? 1 : 0));
  const slots = ['weapon', 'offhand', 'head', 'body', 'acc'];
  const slot = o.slot || slots[Math.floor(Math.random() * slots.length)];
  // 지금 직업 장비 70%, 나머지는 다른 직업(나중에 그 직업으로 할 때 쓴다)
  const owned = Object.keys(s.unlocked).filter(k => s.unlocked[k]);
  const cls = o.cls || (Math.random() < 0.7 ? s.hero : owned[Math.floor(Math.random() * owned.length)]);
  let rar = Math.max(min, rollRarity(ch, bonus, boss, special));
  if (rar < 4 && typeof GearFx !== 'undefined' && GearFx.codes(s).has('luck') && Math.random() < (boss ? 0.015 : 0.002)) rar = 4;   // 🆕 은방울 행운 목걸이 (✏️ 드롭표에 맞춰 낮춤)
  const it = makeItem(s, { cls, slot, tier, rar });
  if (ch >= 7) it.plus = Math.min(10, Math.max(it.plus, ch - 6 + (Math.random() < 0.3 ? 1 : 0)));   // 🆕 2부 장비는 강화가 붙어 나온다
  return it;
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
// 🆕 2026-11-22 장비 조합: 같은 등급 2개 → 한 단계 위 도전 (일반~영웅). 확률은 화면에 그대로 보여 준다.
//   lose: 실패하면 none(없음) / one(두 번째 재료) / both(둘 다, 마석 조금 돌려받음)
//   cost: 그 장 스테이지 한 판 수입 × 배율 (상점 일반 2개 값 + 조합비 > 상점 고급 값)
//   pity: 실패할 때마다 다음 확률 +pity%p (최대 pityMax), 성공하면 처음으로
const FUSE_RULE = [
  { rate: 100, lose: 'none', cost: 1.6 },
  { rate: 70, lose: 'one', cost: 2.5, pity: 10, pityMax: 30 },
  { rate: 25, lose: 'both', cost: 5, pity: 3, pityMax: 20 },
  { rate: 2, lose: 'both', cost: 4, abyss: 3, pity: 0.5, pityMax: 10 },   // 평균 약 15번 (영웅 30개쯤) · ✏️ 2026-11-22 한 번에 15판 값 → 4판 값(합치면 상점 전설값과 비슷)
];
// ✏️ 2026-11-22 경제 맞추기: 가격 기준(한 판 값). 1부는 예전 그대로(장마다 +35%),
//   2부는 실제 수입(몬스터 금화·상자 10~12개·클리어 보상, 1장 대비 배율)에 맞춘 표. 1장 한 판 ≈ 280금 → 기준 350
const PART2_UNIT = { 7: 2400, 8: 2700, 9: 3100, 10: 3300, 11: 4200, 12: 4600 };
function stageIncome(ch) { ch = Math.max(1, Math.min(12, ch || 1)); return PART2_UNIT[ch] || 350 * (1 + (ch - 1) * 0.35); }
// 소모품 가격 배율: 수입이 오른 만큼의 절반쯤 따라 오른다 (1장 1배 · 6장 약 1.9배 · 12장 약 7배)
function priceMul(ch) { return 1 + (stageIncome(ch) / 350 - 1) * 0.5; }
function beltPrice(k, s) { const b = BELT[k]; return Math.round(b.price * priceMul(s ? s.ch : 1) / 5) * 5; }
function canFuse(s, it) { return !!it && it.rar <= 3 && !it.boss && !it.lock && !Object.values(s.eq).includes(it.id); }
function fuseInfo(s, rar, ad) {
  const R = FUSE_RULE[rar], pity = Math.min(R.pityMax || 0, ((s.fusePity || {})[rar] || 0) * (R.pity || 0)), adB = ad ? (rar >= 3 ? 1 : 10) : 0;
  return { rate: Math.min(100, R.rate + pity + adB), base: R.rate, pity, adB, gold: Math.round(stageIncome(s.ch) * R.cost / 10) * 10, abyss: R.abyss || 0, lose: R.lose };
}
// ✏️ 2026-11-22 고유 장비(이야기 장비)는 조합에서 사라지지 않는다. 실패하면 다른 재료만 사라지고,
//   희귀→영웅·영웅→전설 도전이었다면 고유 장비가 한 단계 떨어진다 (처음 받은 등급 아래로는 안 떨어진다). 고유 장비끼리는 조합 불가.
function storyFloor(it) { return it.storyRar ?? ((typeof STORY_GEAR !== 'undefined' && STORY_GEAR[it.story]) ? STORY_GEAR[it.story].rar : it.rar); }
function fuseStoryRisk(a, b) {
  const st = a && a.story ? a : b && b.story ? b : null;
  if (!st) return null;
  return { item: st, drop: st.rar >= 2 && st.rar > storyFloor(st) };
}
function downgradeItem(it) {
  it.rar--;
  const want = RARITY[it.rar].aff + (it.slot === 'acc' ? 1 : 0);
  while (it.aff.length > want) it.aff.pop();
  it.base = Math.round(BASE_STAT[it.slot][it.tier] * (1 + it.rar * 0.1));
  if (it.rar < 4) { delete it.fx; delete it.legendOf; }
}
// 🆕 2026-11-22 조합으로 나올 수 있는 부위 (화면 미리 보기용): 이야기 장비가 있으면 그 부위, 같은 부위면 하나, 다르면 둘 중 하나
function fuseSlotKo(it) { return it.cls === 'acc' ? (it.kind === 'ring' ? '반지' : '목걸이') : SLOT_KO[it.slot]; }
function fuseOutcomes(a, b) {
  if (!a) return [];
  const st = a.story ? a : b && b.story ? b : null;
  const list = st ? [st] : b ? [a, b] : [a];
  const out = [];
  for (const it of list) { const ko = fuseSlotKo(it); if (!out.some(o => o.ko === ko)) out.push({ it, ko }); }
  return out;
}
function tryFuse(s, a, b, ad) {
  if (!canFuse(s, a) || !canFuse(s, b) || a === b || a.rar !== b.rar) return { r: 'bad' };
  if (a.story && b.story) return { r: 'twoStory' };
  const f = fuseInfo(s, a.rar, ad);
  if (s.gold < f.gold || (s.mats.abyss || 0) < f.abyss) return { r: 'cost' };
  s.gold -= f.gold; if (f.abyss) s.mats.abyss -= f.abyss;
  s.fusePity = s.fusePity || {};
  if (Math.random() * 100 < f.rate) {
    // 이야기 장비가 섞이면 그 이름·설명을 이어받는다 (기념 장비가 자란다)
    const story = a.story ? a : b.story ? b : null, base = story || (Math.random() < 0.5 ? a : b), acc = base.cls === 'acc';
    const it = makeItem(s, { cls: s.hero, slot: acc ? 'acc' : base.slot, kind: base.kind, tier: Math.max(a.tier, b.tier), rar: a.rar + 1 });
    it.plus = Math.floor(Math.max(a.plus, b.plus) / 2);
    if (story) { if (it.rar === 4) it.legendOf = it.name; it.name = story.name; it.desc = story.desc; it.story = story.story; it.storyRar = storyFloor(story); it.lock = story.lock; }
    s.bag = s.bag.filter(x => x !== a && x !== b);
    s.fusePity[a.rar] = 0;
    s.stats = s.stats || {}; s.stats.fused = (s.stats.fused || 0) + 1;
    return { r: 'ok', it };
  }
  s.fusePity[a.rar] = (s.fusePity[a.rar] || 0) + 1;
  const risk = fuseStoryRisk(a, b);
  let lost = f.lose === 'both' ? [a, b] : f.lose === 'one' ? [b] : [], refund = {}, down = null;
  if (risk) {
    lost = f.lose === 'none' ? [] : [risk.item === a ? b : a];   // 고유 장비는 남고 다른 재료만 사라진다
    if (risk.drop) { downgradeItem(risk.item); down = risk.item; }
  }
  for (const x of lost) { const m = matOf(x); refund[m] = (refund[m] || 0) + 1 + x.rar; s.mats[m] = (s.mats[m] || 0) + 1 + x.rar; }
  s.bag = s.bag.filter(x => !lost.includes(x));
  return { r: 'fail', lost, refund, down };
}
function matOf(it) { return it.rar >= 4 ? 'abyss' : ['low', 'low', 'mid', 'high'][it.tier]; }
// ✏️ 2026-11-22 강화비는 지금 장의 한 판 값을 따라간다 (1장은 예전과 거의 같고, 2부에서 +10까지면 몇 판 분량)
function enhanceCost(it, s) {
  const n = it.plus + 1, ch = (s || (typeof Save !== 'undefined' && Save.data) || {}).ch || 1;
  return { gold: Math.max(20, Math.round(stageIncome(ch) * 0.06 * n * (1 + 0.15 * Math.min(it.rar, 4)) / 10) * 10), mat: n <= 4 ? 'low' : n <= 7 ? 'mid' : 'high', cnt: n <= 4 ? n : n <= 7 ? n - 4 : n - 7 };
}
function enhanceRate(it) { return [100, 100, 100, 90, 80, 70, 60, 50, 40, 30][it.plus] || 0; }
function tryEnhance(s, it) {
  if (it.plus >= 10) return 'max';
  const c = enhanceCost(it, s);
  if (s.gold < c.gold || (s.mats[c.mat] || 0) < c.cnt) return 'cost';
  s.gold -= c.gold; s.mats[c.mat] -= c.cnt;
  if (Math.random() * 100 < enhanceRate(it)) { it.plus++; return 'ok'; }
  return 'fail';   // 실패해도 부서지지 않는다
}
function dismantle(s, it) {
  if (Object.values(s.eq).includes(it.id) || it.lock || it.story) return null;   // ✏️ 고유 장비는 분해 불가
  const m = matOf(it), n = 1 + it.rar + Math.floor(it.plus / 2);
  s.mats[m] = (s.mats[m] || 0) + n;
  s.bag = s.bag.filter(x => x !== it);
  return { m, n };
}
function rerollCost(it, s) { const ch = (s || (typeof Save !== 'undefined' && Save.data) || {}).ch || 1; return { mat: it.rar >= 4 ? 'abyss' : 'mid', cnt: 1, gold: Math.max(60, Math.round(stageIncome(ch) * 0.17 / 10) * 10) }; }   // ✏️ 장에 따라
function reroll(s, it, k) {
  const c = rerollCost(it, s);
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
