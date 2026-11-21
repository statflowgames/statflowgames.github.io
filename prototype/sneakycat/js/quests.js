// 하루 도둑 의뢰: 날짜로 정해지는 의뢰 3개(쉬움·보통·어려움). 이미 깬 판에서만 나온다.
// 같은 날이면 누구에게나 같은 의뢰가 나온다. 하루 한 번 의뢰 하나를 다른 것으로 바꿀 수 있다.
import { tr, tf } from './i18n.js?v=1122001644';

export const TIERS = [
  { name: '쉬움', reward: 30, cls: 'easy' },
  { name: '보통', reward: 60, cls: 'mid' },
  { name: '어려움', reward: 120, cls: 'hard' },
];
export const BOX = { bones: 80, pieces: 1 };
export const PIECES_FOR_SKIN = 7;

// 조건: 판 하나를 이 방법으로 깨기
const CONDS = {
  nomeow: { tier: 0, text: () => tr('야옹 없이 깨기'), ok: (g) => g.stats.meows === 0 },
  bonus: { tier: 0, text: (q, ch) => tf('{item} 모두 챙겨서 깨기', { item: tr(ch.bonusName) }), ok: (g) => g.bonus.every((b) => b.taken) },
  norun: { tier: 1, text: () => tr('한 번도 달리지 않고 깨기'), ok: (g) => !g.stats.ran },
  novase: { tier: 1, text: () => tr('꽃병을 깨뜨리지 않고 깨기'), ok: (g) => g.stats.vases === 0, need: (info) => info.vases > 0 },
  time: { tier: 1, text: (q) => tf('{sec}초 안에 깨기', { sec: q.param }), ok: (g, q) => g.elapsed <= q.param },
  unseen: { tier: 2, text: () => tr('한 번도 들키지 않고 깨기'), ok: (g) => !g.spotted },
  ghost: { tier: 2, text: () => tr('안 들키고, 달리지도 않고 깨기'), ok: (g) => !g.spotted && !g.stats.ran },
  naked: { tier: 2, text: () => tr('장비를 모두 벗고 안 들키고 깨기'), ok: (g) => g.naked && !g.spotted },
};
export const condText = (q, ch) => CONDS[q.cond].text(q, ch);
export const condOk = (q, g) => CONDS[q.cond].ok(g, q);

export function today(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function rng(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// levels: 깬 판 목록 [{ id, vases, best }]
function pickOne(r, tier, levels, used) {
  const conds = Object.keys(CONDS).filter((k) => CONDS[k].tier === tier);
  for (let tries = 0; tries < 40; tries++) {
    const L = levels[Math.floor(r() * levels.length)];
    const cond = conds[Math.floor(r() * conds.length)];
    if (used.has(L.id) && tries < 30) continue;
    if (CONDS[cond].need && !CONDS[cond].need(L)) continue;
    const q = { lv: L.id, cond, tier, done: false };
    if (cond === 'time') q.param = Math.max(20, Math.ceil(((L.best || 60) * 1.3 + 5) / 5) * 5);
    return q;
  }
  return { lv: levels[0].id, cond: tier === 0 ? 'nomeow' : tier === 1 ? 'norun' : 'unseen', tier, done: false };
}
export function makeQuests(day, levels) {
  const r = rng('sneakycat-' + day), used = new Set();
  return [0, 1, 2].map((tier) => { const q = pickOne(r, tier, levels, used); used.add(q.lv); return q; });
}
export function rerollOne(day, q, levels, list) {
  const r = rng(`sneakycat-${day}-re-${q.lv}-${q.cond}`), used = new Set(list.map((x) => x.lv));
  let n = pickOne(r, q.tier, levels, used);
  for (let i = 0; i < 5 && n.lv === q.lv && n.cond === q.cond; i++) n = pickOne(r, q.tier, levels, used);
  return n;
}
