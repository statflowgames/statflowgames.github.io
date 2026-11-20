// 심연의 탑: 끝없이 오르는 층. 한 층은 1~2분, 10층마다 강화 보스, 층마다 무작위 규칙 하나.
const TOWER_POOLS = [
  ['grunt', 'spear', 'shaman', 'wolf'],
  ['ratkin_blade', 'ratkin_xbow', 'pirate', 'slime'],
  ['mummy', 'scorpion', 'skeleton_archer', 'snakeman'],
  ['frostwolf', 'snow_brute', 'ice_spirit', 'dwarf_miner'],
  ['gargoyle', 'construct', 'harpy', 'cultist', 'shadow_knight'],
  ['imp', 'hound', 'leech', 'shade_hero'],
];
const TOWER_BOSSES = ['barkhaul', 'toothcrusher', 'captain_mog', 'gloob', 'twinsting', 'sehera', 'frost_wyvern', 'hrimgar', 'golem7', 'orvex', 'orvex_eclipse', 'azmal'];
const TOWER_THEMES = ['forest', 'village', 'swamp', 'harbor', 'sewer', 'desert', 'tomb', 'snow', 'dwarf', 'tower', 'abyss'];
const TOWER_RULES = [
  { id: 'brutal', ko: '적의 공격이 50% 아프다 · 보상 2배', dmgMul: 1.5, reward: 2 },
  { id: 'tough', ko: '적 체력 +60% · 보상 1.5배', hpMul: 1.6, reward: 1.5 },
  { id: 'noheal', ko: '체력 회복 불가 · 대신 주는 피해 +50%', noHeal: true, heroDmg: 1.5 },
  { id: 'swift', ko: '적이 빨라진다', speedMul: 1.35 },
  { id: 'awaken', ko: '각성 게이지가 두 배로 찬다', awkMul: 2 },
  { id: 'gold', ko: '금화 3배', goldMul: 3 },
  { id: 'crowd', ko: '적이 더 많이 몰려온다 · 보상 1.5배', extra: 2, reward: 1.5 },
  { id: 'glass', ko: '서로 주는 피해 2배', dmgMul: 2, heroDmg: 2 },
];
// 시드가 있는 난수 (같은 층은 같은 구성)
function seeded(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function towerFloor(n, runSeed = 7) {
  const r = seeded(n * 9301 + runSeed * 49297);
  const pick = a => a[Math.floor(r() * a.length)];
  const tier = Math.min(5, Math.floor((n - 1) / 5));
  const pool = [...TOWER_POOLS[tier], ...(tier > 0 ? TOWER_POOLS[tier - 1].slice(0, 2) : [])];
  const boss = n % 10 === 0;
  const rule = n >= 3 ? pick(TOWER_RULES) : null;
  const group = cnt => Array.from({ length: cnt }, () => pick(pool)).join(',');
  const extra = rule && rule.extra ? rule.extra : 0;
  const size = 3 + Math.min(3, Math.floor(n / 8)) + extra;
  const waves = boss
    ? [[group(size)], [TOWER_BOSSES[(n / 10 - 1) % TOWER_BOSSES.length]]]
    : [[group(size), group(size - 1)], [group(size), group(size)]];
  return {
    name: boss ? `${n}층 · 강화 보스` : `${n}층`, theme: pick(TOWER_THEMES), waves, boss, tower: n, rule,
    // 장 배율 대신 층 배율: 5층마다 장이 하나씩 오르고, 층마다 4%씩 더 세진다
    chScale: Math.min(12, 1 + tier), floorMul: 1 + n * 0.04 + (boss ? 0.3 : 0),
  };
}
// 10층마다 이어서 시작할 수 있다
function towerCheckpoints(best) { const out = [1]; for (let f = 11; f <= best + 1; f += 10) out.push(f); return out; }

// ---------------- 일일 도전 · 주간 보스 러시 ----------------
function dayKey(d = new Date()) { return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
function weekKey(d = new Date()) { return Math.floor((d.getTime() / 86400000 + 3) / 7); }
// 오늘의 도전: 날짜로 정해지는 고정 던전과 규칙. 하루 한 번 큰 보상
function dailyDef(s) {
  const key = dayKey(), r = seeded(key);
  const n = Math.max(3, 5 * (s.ch - 1) + 3);
  const def = towerFloor(n, key % 100000);
  def.rule = TOWER_RULES[Math.floor(r() * TOWER_RULES.length)];
  def.mode = 'daily'; def.tower = 0; def.name = `오늘의 도전 (${String(key).slice(4, 6)}월 ${String(key).slice(6)}일)`;
  def.waves = [...def.waves.filter(w => w.length > 1 || w[0].includes(',')), [def.waves[0][0], def.waves[0][0]]];
  def.boss = false;
  return def;
}
// 주간 보스 러시: 챕터 보스 6마리를 연달아. 기록을 잰다
function rushDef(s) {
  const ch = Math.max(1, Math.min(12, s.ch));
  return {
    name: '주간 보스 러시', theme: 'abyss', mode: 'rush', tower: 0, boss: true, allBoss: true,
    waves: [['barkhaul'], ['gloob'], ['sehera'], ['hrimgar'], ['orvex'], ['azmal']],
    chScale: ch, floorMul: 0.55 + ch * 0.12, rule: null,
  };
}
function fmtTime(ms) { const t = Math.round(ms / 1000); return `${Math.floor(t / 60)}분 ${String(t % 60).padStart(2, '0')}초`; }
