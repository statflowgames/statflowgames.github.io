'use strict';
// 족보: chips(기본 점수) / mult(배수), lc·lm = 비급 1레벨마다 오르는 값
const HANDS = [
  { id: 'high',  name: '꽝',              chips: 5,   mult: 1,  lc: 10, lm: 1, desc: '족보 없음 — 가장 큰 주사위 하나만' },
  { id: 'pair',  name: '원페어',          chips: 10,  mult: 2,  lc: 15, lm: 1, desc: '같은 눈 2개' },
  { id: 'two',   name: '투페어',          chips: 20,  mult: 2,  lc: 20, lm: 1, desc: '같은 눈 2개 + 2개' },
  { id: 'three', name: '트리플',          chips: 30,  mult: 3,  lc: 20, lm: 2, desc: '같은 눈 3개' },
  { id: 'sstr',  name: '작은 스트레이트', chips: 30,  mult: 4,  lc: 25, lm: 2, desc: '4개 연속 (예: 2·3·4·5)' },
  { id: 'full',  name: '풀하우스',        chips: 40,  mult: 4,  lc: 25, lm: 2, desc: '같은 눈 3개 + 2개' },
  { id: 'lstr',  name: '큰 스트레이트',   chips: 50,  mult: 5,  lc: 30, lm: 3, desc: '5개 연속' },
  { id: 'four',  name: '포카드',          chips: 60,  mult: 7,  lc: 35, lm: 3, desc: '같은 눈 4개' },
  { id: 'five',  name: '오복',            chips: 100, mult: 12, lc: 50, lm: 4, desc: '5개 모두 같은 눈' },
];
const HAND = {};
HANDS.forEach((h, i) => { h.rank = i; HAND[h.id] = h; });

// 부적: r = 등급(1 보통, 2 희귀, 3 전설), p = 값, v = 자라는 값의 처음 값
// die(api, 눈, 부적, ctx) = 점수 주사위 하나마다, fin(api, ctx, 부적) = 주사위 계산이 끝난 뒤 왼쪽부터
const CHARMS = {
  pouch:   { n: '복주머니',     ic: '👛', r: 1, p: 4, d: '배수 +4', fin(a) { a.mul(4); } },
  even:    { n: '짝수 도깨비',  ic: '👹', r: 1, p: 5, d: '짝수 눈이 점수에 들어갈 때마다 배수 +2', die(a, p) { if (p % 2 === 0) a.mul(2); } },
  odd:     { n: '홀수 여우',    ic: '🦊', r: 1, p: 5, d: '홀수 눈이 점수에 들어갈 때마다 +15점', die(a, p) { if (p % 2) a.add(15); } },
  six:     { n: '육복 풍경',    ic: '🎐', r: 1, p: 5, d: '6이 점수에 들어갈 때마다 배수 +4', die(a, p) { if (p === 6) a.mul(4); } },
  one:     { n: '짚신 한 짝',   ic: '🩴', r: 1, p: 4, d: '1이 점수에 들어갈 때마다 +40점', die(a, p) { if (p === 1) a.add(40); } },
  bell:    { n: '쌍방울',       ic: '🔔', r: 1, p: 5, d: '같은 눈이 2개 이상이면 배수 +8', fin(a, c) { if (c.maxCount >= 2) a.mul(8); } },
  fan:     { n: '태극 부채',    ic: '🪭', r: 1, p: 6, d: '같은 눈이 3개 이상이면 배수 +15', fin(a, c) { if (c.maxCount >= 3) a.mul(15); } },
  stairs:  { n: '돌계단',       ic: '🪜', r: 1, p: 5, d: '스트레이트면 배수 +12', fin(a, c) { if (c.straight) a.mul(12); } },
  thrift:  { n: '알뜰 주머니',  ic: '🧧', r: 1, p: 5, d: '남은 다시 굴리기 1회당 배수 +3', fin(a, c) { if (c.rerolls > 0) a.mul(3 * c.rerolls); } },
  bust:    { n: '꽝 부적',      ic: '🎫', r: 1, p: 4, d: '꽝(족보 없음)이면 배수 ×5', fin(a, c) { if (c.hand === 'high') a.x(5); } },
  toad:    { n: '금두꺼비',     ic: '🐸', r: 1, p: 5, d: '라운드를 이기면 엽전 +3' },
  lastshot:{ n: '배수진 깃발',  ic: '🚩', r: 2, p: 6, d: '마지막 기회에서 배수 ×3', fin(a, c) { if (c.last) a.x(3); } },
  bamboo:  { n: '쑥쑥 대나무',  ic: '🎋', r: 2, p: 6, v: 0, d: '족보를 낼 때마다 배수 +1씩 자란다 (지금 +{v})', fin(a, c, i) { i.v += 1; a.note('쑥!'); a.mul(i.v); } },
  snow:    { n: '눈덩이',       ic: '⛄', r: 2, p: 6, v: 0, d: '다시 굴릴 때마다 +6점씩 커진다 (지금 +{v}점)', fin(a, c, i) { if (i.v) a.add(i.v); } },
  bag:     { n: '잡화 보따리',  ic: '🎒', r: 2, p: 6, d: '가진 부적 1개당 배수 +3', fin(a, c) { a.mul(3 * c.nCharms); } },
  cat:     { n: '복고양이',     ic: '🐱', r: 2, p: 7, v: 1, d: '6이 점수에 들어갈 때마다 ×0.1씩 자란다 (지금 ×{v})',
             die(a, p, i) { if (p === 6) { i.v = Math.round((i.v + 0.1) * 10) / 10; a.note('냥!'); } },
             fin(a, c, i) { if (i.v > 1) a.x(i.v); } },
  mirror:  { n: '청동 거울',    ic: '🪞', r: 2, p: 7, d: '첫 번째 점수 주사위가 한 번 더 발동' },
  echo:    { n: '메아리 종',    ic: '🛎️', r: 2, p: 7, d: '가장 큰 점수 주사위가 한 번 더 발동' },
  scale:   { n: '홀짝 저울',    ic: '⚖️', r: 2, p: 6, d: '점수 주사위가 모두 짝수거나 모두 홀수면 배수 ×2',
             fin(a, c) { const l = c.idx.map(i => c.pips[i] % 2); if (l.length && l.every(x => x === l[0])) a.x(2); } },
  piggy:   { n: '돼지 저금통',  ic: '🐷', r: 2, p: 6, d: '가진 엽전 1개당 +4점', fin(a, c) { if (c.money > 0) a.add(4 * c.money); } },
  unity:   { n: '한마음 끈',    ic: '🧶', r: 2, p: 6, d: '족보에 안 쓰인 주사위도 모두 점수에 들어간다' },
  gourd:   { n: '신선 호리병',  ic: '🍶', r: 2, p: 6, d: '라운드마다 다시 굴리기 +2' },
  pearl:   { n: '용의 여의주',  ic: '🐉', r: 3, p: 9, d: '배수 ×2', fin(a) { a.x(2); } },
  dipper:  { n: '북두칠성',     ic: '✨', r: 3, p: 8, d: '점수 주사위 눈의 합이 7의 배수면 배수 ×3',
             fin(a, c) { const s = c.idx.reduce((t, i) => t + c.pips[i], 0); if (s > 0 && s % 7 === 0) a.x(3); } },
  flag:    { n: '오방기',       ic: '🎏', r: 3, p: 9, d: '5가 점수에 들어갈 때마다 배수 ×1.5', die(a, p) { if (p === 5) a.x(1.5); } },
  rainbow: { n: '무지개 다리',  ic: '🌈', r: 3, p: 8, d: '스트레이트면 배수 ×3', fin(a, c) { if (c.straight) a.x(3); } },
  phoenix: { n: '불사조 깃털',  ic: '🪶', r: 3, p: 8, d: '목표의 절반을 넘기고 지면 한 번 살려주고 사라진다' },
  guanyin: { n: '천수관음',     ic: '🙏', r: 3, p: 10, d: '라운드마다 기회 +1' },
};

const BOSSES = [
  { id: 'rust',     n: '녹슨 자물쇠', ic: '🔒', d: '1과 2는 점수가 없다' },
  { id: 'miser',    n: '구두쇠 영감', ic: '👴', d: '다시 굴리기가 절반으로 줄어든다' },
  { id: 'heavy',    n: '무거운 짐',   ic: '🪨', d: '기회가 1번 줄어든다' },
  { id: 'oddban',   n: '홀수 귀신',   ic: '👻', d: '홀수 눈은 점수가 없다' },
  { id: 'evenban',  n: '짝수 귀신',   ic: '💀', d: '짝수 눈은 점수가 없다' },
  { id: 'halfpair', n: '쌍둥이 저주', ic: '🪆', d: '원페어·투페어는 족보 점수와 배수가 절반' },
  { id: 'fog',      n: '짙은 안개',   ic: '🌫️', d: '맨 왼쪽 부적이 힘을 잃는다' },
  { id: 'tax',      n: '세금 징수원', ic: '📜', d: '족보를 낼 때마다 엽전 -1' },
];

const ANTE_TARGET = [150, 420, 1200, 3200, 8500, 20000, 45000, 100000];
const BLIND_MUL = [1, 1.5, 2];

function niceRound(n) {
  if (n < 1000) return Math.round(n / 10) * 10;
  const p = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / p) * p;
}

function targetFor(ante, blind) {
  const base = ante <= 8 ? ANTE_TARGET[ante - 1] : ANTE_TARGET[7] * Math.pow(2.4, ante - 8);
  return niceRound(base * BLIND_MUL[blind]);
}

function bossId(st) { return st.blind === 2 ? BOSSES[st.boss].id : null; }

function deadPip(st, p) {
  const b = bossId(st);
  return (b === 'rust' && p <= 2) || (b === 'oddban' && p % 2 === 1) || (b === 'evenban' && p % 2 === 0);
}

function handBase(st, id) {
  const H = HAND[id], lv = st.levels[id] || 1;
  let chips = H.chips + H.lc * (lv - 1), mult = H.mult + H.lm * (lv - 1);
  if (bossId(st) === 'halfpair' && (id === 'pair' || id === 'two')) {
    chips = Math.floor(chips / 2); mult = Math.max(1, Math.floor(mult / 2));
  }
  return { chips, mult, lv };
}

function evalHand(p) {
  const cnt = {};
  p.forEach((v, i) => (cnt[v] = cnt[v] || []).push(i));
  const g = Object.keys(cnt).map(v => ({ v: +v, ix: cnt[v] }))
    .sort((a, b) => b.ix.length - a.ix.length || b.v - a.v);
  const maxCount = g[0].ix.length;
  const run = vs => vs.every(v => cnt[v]) ? vs.map(v => cnt[v][0]) : null;
  const out = (id, idx) => ({ id, idx, maxCount });
  if (maxCount === 5) return out('five', g[0].ix);
  if (maxCount === 4) return out('four', g[0].ix);
  const big = run([2, 3, 4, 5, 6]) || run([1, 2, 3, 4, 5]);
  if (big) return out('lstr', big);
  if (maxCount === 3 && g[1].ix.length === 2) return out('full', [0, 1, 2, 3, 4]);
  const small = run([3, 4, 5, 6]) || run([2, 3, 4, 5]) || run([1, 2, 3, 4]);
  if (small) return out('sstr', small);
  if (maxCount === 3) return out('three', g[0].ix);
  if (maxCount === 2 && g[1].ix.length === 2) return out('two', g[0].ix.concat(g[1].ix));
  if (maxCount === 2) return out('pair', g[0].ix);
  return out('high', [g[0].ix[0]]);
}

// 족보 계산. 부적의 자라는 값(v)을 바꾸므로 족보를 낼 때 한 번만 부른다.
function scoreHand(st, pips) {
  const ev = evalHand(pips), b = bossId(st);
  const base = handBase(st, ev.id);
  let chips = base.chips, mult = base.mult;
  const events = [];
  const act = st.charms.map((c, i) => ({ c, d: CHARMS[c.id], i })).filter(x => !(b === 'fog' && x.i === 0));
  const has = id => act.some(x => x.c.id === id);
  const idx = (has('unity') ? [0, 1, 2, 3, 4] : ev.idx.slice()).sort((x, y) => x - y);
  const live = idx.filter(i => !deadPip(st, pips[i]));
  const ctx = {
    hand: ev.id, pips, idx: live, maxCount: ev.maxCount, straight: ev.id === 'sstr' || ev.id === 'lstr',
    last: st.hands === 1, rerolls: st.rerolls, money: st.money, nCharms: st.charms.length,
  };
  let src = null;
  const api = {
    add(n) { chips += n; events.push({ k: 'c', n, chips, mult, ...src }); },
    mul(n) { mult += n; events.push({ k: 'm', n, chips, mult, ...src }); },
    x(n) { mult *= n; events.push({ k: 'x', n, chips, mult, ...src }); },
    note(t) { events.push({ k: 't', t, chips, mult, ...src }); },
  };
  const extra = {};
  if (live.length) {
    for (const a of act) {
      if (a.c.id === 'mirror') extra[live[0]] = (extra[live[0]] || 0) + 1;
      if (a.c.id === 'echo') {
        let top = live[0];
        live.forEach(i => { if (pips[i] > pips[top]) top = i; });
        extra[top] = (extra[top] || 0) + 1;
      }
    }
  }
  for (const i of idx) {
    if (deadPip(st, pips[i])) { events.push({ k: 'dead', die: i, chips, mult }); continue; }
    const times = 1 + (extra[i] || 0);
    for (let t = 0; t < times; t++) {
      src = { die: i };
      if (t > 0) api.note('한 번 더!');
      api.add(pips[i]);
      for (const a of act) if (a.d.die) { src = { charm: a.i, die: i }; a.d.die(api, pips[i], a.c, ctx); }
    }
  }
  for (const a of act) if (a.d.fin) { src = { charm: a.i }; a.d.fin(api, ctx, a.c); }
  return { id: ev.id, name: HAND[ev.id].name, lv: base.lv, idx, base, events, chips, mult, total: Math.floor(chips * mult) };
}
