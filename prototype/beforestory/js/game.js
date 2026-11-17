// 게임 규칙 (화면과 분리 — 밸런스 봇도 이 파일을 그대로 씀). docs/systems.md 4~6절
(function (root) {
  'use strict';
  const D = root.DATA;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function newState() {
    return {
      v: 1,
      year: 1, month: 1, turn: 1,
      stats: { grace: 40, int: 30, magic: 20, might: 10, charm: 35, vit: 30 },
      stress: 20, trust: 12, notoriety: 30, fate: 80,
      temp: -40, self: -20,
      father: 5, rel: {},            // rel.kairen 등 (만나면 열림)
      gold: 300, ink: 60,            // 잉크 60 = 체험판 지급
      mastery: {},                   // 활동별 횟수
      tools: {},                     // 수업 → 효율
      outfits: { velvet: true }, outfit: 'velvet',
      bag: {},                       // 아이템 개수
      flags: {}, pages: [], seen: {}, prophecy: {},
      month_: { talk: 0, gifts: {}, buff: {}, delta: {}, boosted: false },
      next: { rebel: false, sick: false },
      stress100: 0, sickCount: 0,
      limits: { hourglass: 5, quill: 2, adBoost: 10, adPersuade: 3 },
      log: [],
    };
  }

  function personality(s) {
    if (s.temp < 0) return s.self < 0 ? 'ice' : 'thorn';
    return s.self < 0 ? 'green' : 'wild';
  }

  function allowance(s) { return Math.round(50 + s.father * 1.5); }

  function isWinter(s) { return s.month === 12 || s.month <= 2; }

  function monthStart(s) {
    s.month_ = { talk: 0, gifts: {}, buff: {}, delta: {}, boosted: false };
    const a = allowance(s);
    s.gold += a;
    return { allowance: a };
  }

  // 이번 달 강제 칸
  function forcedSlots(s) {
    if (s.next.sick) return ['sick', 'sick', 'sick'];
    if (s.next.rebel) return ['sulk', null, null];
    return [null, null, null];
  }

  function outfitEff(s, act) {
    const o = D.OUTFITS[s.outfit];
    return (o && o.eff && o.eff[act]) || 0;
  }
  function stressMul(s, act) {
    let m = 1;
    const o = D.OUTFITS[s.outfit];
    if (o && o.stressMul) m *= o.stressMul;
    if (o && o.winter && isWinter(s)) m *= 0.9;
    if (s.month_.buff.stressMul) m *= s.month_.buff.stressMul;
    // 수업복 3벌 세트
    if (D.ACTIVITIES[act] && D.ACTIVITIES[act].cat === 'lesson') {
      const n = Object.keys(s.outfits).filter(k => s.outfits[k] && D.OUTFITS[k] && D.OUTFITS[k].series === '수업복').length;
      if (n >= 3) m *= 0.9;
    }
    return m;
  }
  function masteryMul(s, act) {
    const n = (s.mastery[act] || 0) + 1;
    return n <= 5 ? 1 : n <= 14 ? 1.2 : 1.4;
  }
  function conditionMul(stress) {
    return stress < 40 ? 1 : stress < 70 ? 0.8 : stress < 90 ? 0.5 : 0.5;
  }

  // 신뢰는 높을수록 천천히 오른다 (3년에 걸쳐 쌓이도록)
  function trustGain(s, act) {
    const a = D.ACTIVITIES[act];
    if (!a || !a.trust) return 0;
    if (act === 'walk') return s.trust < 50 ? 1 : 0;
    return s.trust < 40 ? a.trust : s.trust < 70 ? Math.ceil(a.trust / 2) : 1;
  }

  // 미리 보기 (랜덤 없이)
  function preview(s, act) {
    const a = D.ACTIVITIES[act];
    const out = {};
    const mul = a.cat === 'lesson'
      ? masteryMul(s, act) * conditionMul(s.stress) * (1 + outfitEff(s, act)) * (1 + (s.tools[act] || 0)) * (1 + (s.month_.buff.lesson || 0))
      : 1;
    for (const k in (a.gain || {})) out[k] = Math.round(a.gain[k] * mul);
    for (const k in (a.lose || {})) out[k] = (out[k] || 0) + a.lose[k];
    const st = a.stress > 0 ? Math.round(a.stress * stressMul(s, act) * (s.month_.buff.lesson ? 1.15 : 1)) : a.stress;
    return { stats: out, stress: st, trust: trustGain(s, act), cost: a.cost || 0, income: a.income || 0, mul };
  }

  function canUse(s, act, slotsSoFar) {
    const a = D.ACTIVITIES[act];
    if (!a || a.locked) return { ok: false, why: a ? a.locked : '없음' };
    if (a.perMonth) {
      const used = slotsSoFar.filter(x => x === act).length;
      if (used >= a.perMonth) return { ok: false, why: '한 달에 한 번' };
    }
    return { ok: true };
  }

  function planCost(plan) {
    return plan.reduce((t, a) => t + ((a && D.ACTIVITIES[a] && D.ACTIVITIES[a].cost) || 0), 0);
  }

  function addDelta(s, k, v) { s.month_.delta[k] = (s.month_.delta[k] || 0) + v; }

  function applyStat(s, k, v) {
    if (D.STATS[k]) { s.stats[k] = clamp(s.stats[k] + v, 0, 500); addDelta(s, k, v); }
    else if (k === 'stress') { s.stress = clamp(s.stress + v, 0, 100); }
    else if (k === 'trust') { s.trust = clamp(s.trust + v, 0, 100); }
    else if (k === 'notoriety') { s.notoriety = clamp(s.notoriety + v, 0, 100); }
    else if (k === 'fate') { s.fate = clamp(s.fate + v, 0, 100); }
    else if (k === 'temp') { s.temp = clamp(s.temp + v, -100, 100); }
    else if (k === 'self') { s.self = clamp(s.self + v, -100, 100); }
    else if (k === 'father') { s.father = clamp(s.father + v, 0, 100); }
    else if (k === 'gold') { s.gold = Math.max(0, s.gold + v); }
    else if (k === 'ink') { s.ink = Math.max(0, s.ink + v); }
    else if (k.startsWith('rel_')) { const n = k.slice(4); s.rel[n] = clamp((s.rel[n] || 0) + v, -100, 100); }
  }
  function applyEff(s, eff) { for (const k in (eff || {})) applyStat(s, k, eff[k]); }

  // 활동 한 칸 진행
  function runSlot(s, act, rng) {
    rng = rng || Math.random;
    const before = { stress: s.stress, trust: s.trust };
    const f = D.FORCED[act];
    if (f) {
      applyStat(s, 'stress', f.stress || 0);
      if (f.trust) applyStat(s, 'trust', f.trust);
      return { act, forced: true, result: 'normal', stats: {}, stress: s.stress - before.stress, trust: s.trust - before.trust };
    }
    const a = D.ACTIVITIES[act];
    // 스트레스 90 이상이면 수업 거부 50%
    if (a.cat === 'lesson' && s.stress >= 90 && rng() < 0.5) {
      const r = D.FORCED.refuse;
      applyStat(s, 'stress', r.stress); applyStat(s, 'trust', r.trust);
      return { act, refused: true, result: 'fail', stats: {}, stress: s.stress - before.stress, trust: s.trust - before.trust, cost: 0 };
    }
    const cost = a.cost || 0;
    s.gold = Math.max(0, s.gold - cost);
    if (a.income) s.gold += a.income;

    let result = 'normal', rmul = 1;
    if (a.cat === 'lesson') {
      const greatP = 0.10 + (s.month_.buff.great || 0);
      if (rng() < greatP) { result = 'great'; rmul = 2; }
      else if (s.stress >= 70 && rng() < 0.2) { result = 'fail'; rmul = 0.5; }
    } else if (a.cat === 'rest') {
      if (rng() < 0.15) result = 'great';
    }
    const pv = preview(s, act);
    const got = {};
    for (const k in (a.gain || {})) {
      const v = Math.max(1, Math.round(a.gain[k] * pv.mul * rmul));
      applyStat(s, k, v); got[k] = v;
    }
    for (const k in (a.lose || {})) { applyStat(s, k, a.lose[k]); got[k] = (got[k] || 0) + a.lose[k]; }
    let st = pv.stress;
    if (a.cat === 'rest' && result === 'great') st -= 5;
    applyStat(s, 'stress', st);
    const tg = trustGain(s, act);
    if (tg) applyStat(s, 'trust', tg + (result === 'great' && act === 'talk' ? 1 : 0));
    for (const k in (a.axis || {})) applyStat(s, k, a.axis[k]);
    if (a.cat === 'lesson') s.mastery[act] = (s.mastery[act] || 0) + 1;
    return { act, result, stats: got, stress: s.stress - before.stress, trust: s.trust - before.trust, cost, income: a.income || 0 };
  }

  // 월말: 광고 1.5배 (이번 달 능력치 증가분의 절반을 더함)
  function adBoost(s) {
    if (s.month_.boosted || s.limits.adBoost <= 0) return null;
    const add = {};
    for (const k of D.STAT_KEYS) {
      const d = s.month_.delta[k] || 0;
      if (d > 0) { const v = Math.round(d * 0.5); s.stats[k] = clamp(s.stats[k] + v, 0, 500); add[k] = v; }
    }
    s.month_.boosted = true; s.limits.adBoost--;
    return add;
  }

  // 월말 상태 판정 → 다음 달
  function monthEnd(s, rng) {
    rng = rng || Math.random;
    const res = { rebel: false, sick: false, runaway: false };
    s.next = { rebel: false, sick: false };
    if (s.stress >= 100) s.stress100++; else s.stress100 = 0;
    if (s.stress100 >= 2) res.runaway = true;
    if (s.stress >= 90) { s.next.rebel = true; res.rebel = true; applyStat(s, 'trust', -5); }
    if (s.stats.vit < 50 && s.stress > 60 && rng() < 0.3) { s.next.sick = true; res.sick = true; s.sickCount++; }
    return res;
  }

  function advance(s) {
    s.turn++; s.month++;
    if (s.month > 12) { s.month = 1; s.year++; }
  }

  // 판정 (systems.md 5절)
  // def: { label, w: {grace:1,...} 또는 value: fn(s), th, pers: ['ice','green'] }
  function check(s, def, rng) {
    rng = rng || Math.random;
    let base = 0;
    if (def.value) base = def.value(s);
    else for (const k in def.w) base += (s.stats[k] || 0) * def.w[k];
    const r = def.fixed ? 1 : 0.9 + rng() * 0.2;
    let val = base * r;
    const parts = [{ name: '능력', v: Math.round(base * r) }];
    // 의상 판정 보너스
    const o = D.OUTFITS[s.outfit];
    if (o && o.judge && def.w) {
      let b = 0;
      for (const k in def.w) b += (o.judge[k] || 0);
      b = Math.min(b, def.th * 0.25);
      if (b > 0) { val += b; parts.push({ name: '의상', v: Math.round(b) }); }
    }
    if (def.pers && def.pers.includes(personality(s))) {
      const b = def.th * 0.1; val += b; parts.push({ name: '성격', v: Math.round(b) });
    }
    val = Math.round(val);
    const pass = val >= def.th;
    return { val, th: def.th, pass, near: !pass && val >= def.th * 0.85, parts };
  }

  // 원작 비틀기: 운명도 60 이상이면 (운명도-50)% 확률로 보정 이벤트
  function correctionChance(s) { return s.fate >= 60 ? (s.fate - 50) / 100 : 0; }

  // 아이템
  function buy(s, id) {
    const it = D.ITEMS[id];
    if (it.ink) { if (s.ink < it.ink) return { ok: false, why: '잉크가 부족해요' }; s.ink -= it.ink; }
    else { if (s.gold < it.price) return { ok: false, why: '골드가 부족해요' }; s.gold -= it.price; }
    if (it.cat === 'tool') { s.tools[it.tool] = Math.max(s.tools[it.tool] || 0, 0.1); return { ok: true, tool: true }; }
    s.bag[id] = (s.bag[id] || 0) + 1;
    return { ok: true };
  }
  function owns(s, id) { return (s.bag[id] || 0) > 0; }
  function useItem(s, id) {
    const it = D.ITEMS[id];
    if (!owns(s, id)) return { ok: false, why: '가지고 있지 않아요' };
    if (it.cure && !s.next.sick) return { ok: false, why: '지금은 아프지 않아요' };
    let mul = 1;
    if (it.cat === 'gift') {
      if (it.once && s.flags['used_' + id]) return { ok: false, why: '이미 준 선물이에요' };
      if (s.month_.gifts[id]) mul = 0.5;
      s.month_.gifts[id] = true;
      if (it.once) s.flags['used_' + id] = true;
    }
    s.bag[id]--;
    const got = {};
    for (const k in (it.eff || {})) { const v = Math.round(it.eff[k] * mul) || Math.sign(it.eff[k]); applyStat(s, k, v); got[k] = v; }
    if (it.buff) Object.assign(s.month_.buff, it.buff);
    if (it.cure) s.next.sick = false;
    return { ok: true, got, half: mul < 1 };
  }

  function buyOutfit(s, id) {
    const o = D.OUTFITS[id];
    if (s.outfits[id]) return { ok: false, why: '이미 있어요' };
    if (s.gold < o.price) return { ok: false, why: '골드가 부족해요' };
    s.gold -= o.price; s.outfits[id] = true;
    return { ok: true };
  }

  // 하트 (신뢰 20당 1칸, 반칸 10)
  function hearts(trust) { return Math.min(5, trust / 20); }

  const G = { newState, personality, allowance, monthStart, forcedSlots, preview, canUse, planCost, runSlot, adBoost, monthEnd, advance,
    check, correctionChance, applyEff, applyStat, buy, useItem, owns, buyOutfit, hearts, outfitEff, clamp };
  root.G = G;
  if (typeof module !== 'undefined') module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
