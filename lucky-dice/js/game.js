'use strict';
const ROUND_HANDS = 4, ROUND_REROLLS = 4, MAX_CHARMS = 5;
const BLIND_NAMES = ['작은 고비', '큰 고비', '보스'];
const BLIND_PAY = [3, 4, 5];
const BOOK_PRICE = 3;
const rnd6 = () => 1 + Math.floor(Math.random() * 6);
const pick = a => a[Math.floor(Math.random() * a.length)];
const hasCharm = (st, id) => st.charms.some(c => c.id === id);
const sellPrice = c => Math.max(1, Math.floor(CHARMS[c.id].p / 2));

function pickBoss(prev) {
  let i;
  do { i = Math.floor(Math.random() * BOSSES.length); } while (i === prev);
  return i;
}

const Game = {
  st: null,

  newRun() {
    this.st = {
      ante: 1, blind: 0, money: 4, charms: [], levels: {}, played: {}, boss: pickBoss(-1),
      phase: 'intro', target: targetFor(1, 0), score: 0, hands: 0, rerolls: 0,
      dice: [1, 2, 3, 4, 5], sel: [false, false, false, false, false],
      offers: null, shopCost: 5, bestHit: 0, endless: false, reward: null,
    };
    return this.st;
  },

  bossDef() { return this.st.blind === 2 ? BOSSES[this.st.boss] : null; },

  startRound() {
    const st = this.st, b = bossId(st);
    st.target = targetFor(st.ante, st.blind);
    st.score = 0;
    st.hands = ROUND_HANDS + (hasCharm(st, 'guanyin') ? 1 : 0) - (b === 'heavy' ? 1 : 0);
    let rr = ROUND_REROLLS + (hasCharm(st, 'gourd') ? 2 : 0);
    if (b === 'miser') rr = Math.floor(rr / 2);
    st.rerolls = rr;
    st.phase = 'play';
    this.rollAll();
  },

  rollAll() {
    const st = this.st;
    st.dice = st.dice.map(rnd6);
    st.sel = st.dice.map(() => false);
  },

  toggle(i) {
    const st = this.st;
    if (st.phase !== 'play' || st.rerolls <= 0) return false;
    st.sel[i] = !st.sel[i];
    return true;
  },

  reroll() {
    const st = this.st, idx = [];
    st.sel.forEach((s, i) => { if (s) idx.push(i); });
    if (!idx.length || st.rerolls <= 0) return null;
    idx.forEach(i => { st.dice[i] = rnd6(); });
    st.rerolls--;
    st.sel = st.dice.map(() => false);
    st.charms.forEach(c => { if (c.id === 'snow') c.v += 6; });
    return idx;
  },

  // 족보를 내고 결과까지 상태에 바로 반영한다 (화면 연출은 그 뒤에 따라간다)
  play() {
    const st = this.st, pips = st.dice.slice(), old = st.score;
    const res = scoreHand(st, pips);
    st.score += res.total;
    st.hands--;
    st.played[res.id] = (st.played[res.id] || 0) + 1;
    if (res.total > st.bestHit) st.bestHit = res.total;
    let tax = false;
    if (bossId(st) === 'tax' && st.money > 0) { st.money--; tax = true; }
    let out;
    if (st.score >= st.target) out = 'win';
    else if (st.hands > 0) out = 'next';
    else {
      const pi = st.charms.findIndex(c => c.id === 'phoenix');
      if (pi >= 0 && st.score * 2 >= st.target) { st.charms.splice(pi, 1); out = 'saved'; }
      else out = 'over';
    }
    if (out === 'win' || out === 'saved') this.winRound(out === 'saved');
    else if (out === 'next') this.rollAll();
    else st.phase = 'over';
    return { res, pips, old, out, tax };
  },

  winRound(saved) {
    const st = this.st, lines = [];
    lines.push([BLIND_NAMES[st.blind] + ' 돌파', BLIND_PAY[st.blind]]);
    if (st.hands > 0) lines.push(['남은 기회 ' + st.hands + '번', st.hands]);
    const interest = Math.min(5, Math.floor(st.money / 5));
    if (interest) lines.push(['이자 (5엽전마다 1)', interest]);
    st.charms.forEach(c => { if (c.id === 'toad') lines.push(['금두꺼비', 3]); });
    const sum = lines.reduce((t, l) => t + l[1], 0);
    st.money += sum;
    st.reward = { lines, sum, saved, final: st.ante === 8 && st.blind === 2 && !st.endless, score: st.score, target: st.target };
    st.phase = 'win';
  },

  toShop() {
    const st = this.st;
    st.phase = 'shop';
    st.shopCost = 5;
    st.offers = this.charmOffers().concat(this.bookOffers());
  },

  charmOffers() {
    const st = this.st, offers = [];
    const pool = Object.keys(CHARMS).filter(id => !hasCharm(st, id));
    for (let k = 0; k < 3 && pool.length; k++) {
      const roll = Math.random(), r = roll < 0.62 ? 1 : roll < 0.92 ? 2 : 3;
      let cand = pool.filter(id => CHARMS[id].r === r);
      if (!cand.length) cand = pool;
      const id = pick(cand);
      pool.splice(pool.indexOf(id), 1);
      offers.push({ t: 'charm', id, p: CHARMS[id].p, sold: false });
    }
    return offers;
  },

  bookOffers() {
    const bag = ['pair', 'pair', 'two', 'two', 'three', 'three', 'sstr', 'full', 'full', 'lstr', 'four', 'five', 'high'];
    const a = pick(bag);
    let b;
    do { b = pick(bag); } while (b === a);
    return [a, b].map(h => ({ t: 'book', h, p: BOOK_PRICE, sold: false }));
  },

  refreshShop() {
    const st = this.st;
    if (st.money < st.shopCost) return false;
    st.money -= st.shopCost;
    st.shopCost++;
    st.offers = this.charmOffers().concat(st.offers.filter(o => o.t === 'book'));
    return true;
  },

  canBuy(o) {
    const st = this.st;
    return !o.sold && st.money >= o.p && (o.t === 'book' || st.charms.length < MAX_CHARMS);
  },

  buy(i) {
    const st = this.st, o = st.offers[i];
    if (!o || !this.canBuy(o)) return false;
    st.money -= o.p;
    o.sold = true;
    if (o.t === 'charm') {
      const d = CHARMS[o.id], c = { id: o.id };
      if (d.v !== undefined) c.v = d.v;
      st.charms.push(c);
    } else {
      st.levels[o.h] = (st.levels[o.h] || 1) + 1;
    }
    return true;
  },

  sell(i) {
    const st = this.st, c = st.charms[i];
    if (!c) return 0;
    const p = sellPrice(c);
    st.charms.splice(i, 1);
    st.money += p;
    return p;
  },

  move(i, d) {
    const a = this.st.charms, j = i + d;
    if (j < 0 || j >= a.length) return false;
    [a[i], a[j]] = [a[j], a[i]];
    return true;
  },

  next() {
    const st = this.st;
    st.blind++;
    if (st.blind > 2) { st.blind = 0; st.ante++; st.boss = pickBoss(st.boss); }
    st.target = targetFor(st.ante, st.blind);
    st.phase = 'intro';
    st.offers = null;
    st.reward = null;
  },
};
