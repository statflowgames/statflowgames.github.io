// 게임 상태 · 달력 · 계절풍 · 시세 · 저장
'use strict';

const SAVE_KEY = 'monsoon_road_m0_v1';
let G = null;

const rand = (a, b) => a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const State = {
  newGame(origin, gender, name) {
    G = {
      v: 1, origin, gender, name,
      day: 15,                       // 0 = 826년 8월 1일 (구조 뒤 팔렘방 도착 무렵)
      gold: 100, debt: DEBT_TOTAL,
      ship: 'perahu', hull: SHIPS.perahu.hull, crew: 6, food: 40, water: 40, morale: 70, pots: 2,
      cargo: {},                     // good -> { n, cost }
      port: 'palembang', at: { lon: PORTS.palembang.lon, lat: PORTS.palembang.lat },
      heat: {}, drift: {},           // 시세 압력, 항구별 변동
      flags: {}, relics: {}, ruins: {}, rumorSeen: {},
      fame: { trade: 0, explore: 0, scholar: 0, sea: 0 },
      mates: ['dayang'], pages: 1, voyages: 0, wins: 0,
      seen: [],                      // 지도 안개를 걷은 점 [lon, lat]
      stats: { profit: 0, days0: 15 },
    };
    for (const p in PORTS) G.seen.push([PORTS[p].lon, PORTS[p].lat]);
    State.rollDrift();
    State.save();
  },
  save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) { /* 저장 불가 환경 */ } },
  load() {
    try { const s = localStorage.getItem(SAVE_KEY); if (s) { G = JSON.parse(s); return true; } } catch (e) { /* */ }
    return false;
  },
  hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },
  wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* */ } },

  // ---------- 달력 (한 달 30일로 단순화) ----------
  date(d = G.day) {
    const mi = 7 + Math.floor(d / 30);
    return { y: 826 + Math.floor(mi / 12), m: mi % 12 + 1, d: d % 30 + 1 };
  },
  dateText(d = G.day) { const t = State.date(d); return `${t.y}년 ${t.m}월 ${t.d}일`; },
  month() { return State.date().m; },

  // ---------- 계절풍 ----------
  // toward: 바람이 불어 가는 방위, str: 세기 0~1.2
  wind(d = G.day) {
    const m = State.date(d).m;
    const wob = Math.sin(d * 0.9) * 18 + Math.sin(d * 0.37) * 10;
    if (m >= 5 && m <= 9) return { toward: 20 + wob, str: m === 7 || m === 8 ? 1.15 : 1.0, season: '여름 몬순', from: '남서풍' };
    if (m === 11 || m === 12 || m <= 3) return { toward: 200 + wob, str: m === 1 || m === 2 ? 1.15 : 1.0, season: '겨울 몬순', from: '북동풍' };
    // 4월 · 10월: 바람이 바뀌는 달 — 방향이 제멋대로이고 약함
    const t = (Math.floor(d / 4) * 137) % 360;
    return { toward: t + wob, str: 0.45, season: '바람이 바뀌는 달', from: GEO.dirName(t + 180) + '풍', calm: true };
  },
  // 이 방향으로 갈 때 속도 배율
  windFactor(heading, d = G.day) {
    const w = State.wind(d), sh = SHIPS[G.ship];
    const c = (1 + Math.cos(GEO.angDiff(heading, w.toward) * Math.PI / 180)) / 2;   // 0 맞바람 ~ 1 뒷바람
    const f = sh.upwind + (1.25 - sh.upwind) * c;
    return w.calm ? 0.55 + 0.25 * c : clamp(f * (0.75 + 0.25 * w.str), 0.3, 1.35);
  },
  speed(heading) {
    const sh = SHIPS[G.ship];
    let s = sh.speed * State.windFactor(heading);
    if (G.mates.includes('dayang')) s *= 1.1;
    if (G.origin === 'persia') s *= 1.05;
    if (G.crew < sh.crewMin) s *= 0.6 + 0.4 * G.crew / sh.crewMin;
    if (G.hull < SHIPS[G.ship].hull * 0.35) s *= 0.8;
    return s;
  },
  // 경로를 따라갈 때 걸리는 날수 (지금 날씨 기준 예상)
  estimate(path) {
    let days = 0;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      days += Math.hypot(b.lon - a.lon, b.lat - a.lat) / State.speed(GEO.bearing(a, b));
    }
    return Math.max(1, Math.round(days));
  },
  dailyUse() { return Math.max(1, Math.ceil(G.crew / 4)); },

  // ---------- 시세 ----------
  rollDrift() {
    for (const p in PORTS) {
      G.drift[p] = G.drift[p] || {};
      for (const g in GOODS) G.drift[p][g] = 1 + rand(-0.09, 0.09);
    }
    G.driftDay = G.day;
  },
  heat(p, g) { return (G.heat[p] && G.heat[p][g]) || 0; },
  addHeat(p, g, v) { G.heat[p] = G.heat[p] || {}; G.heat[p][g] = clamp(State.heat(p, g) + v, -0.55, 0.9); },
  buyPrice(p, g, h = State.heat(p, g)) {
    const mul = PORTS[p].buy[g];
    if (!mul) return null;
    let v = GOODS[g].base * mul * G.drift[p][g] * (1 + h);
    if (G.origin === 'tang' && GOODS[g].kind === '도자기') v *= 0.95;
    return Math.max(1, Math.round(v));
  },
  sellPrice(p, g, h = State.heat(p, g)) {
    const P = PORTS[p];
    const mul = P.want[g] || (P.buy[g] ? P.buy[g] * 0.88 : 0.95);
    let v = GOODS[g].base * mul * G.drift[p][g] * (1 + h);
    if (G.origin === 'arab') v *= 1.05;
    if (G.mates.includes('weishao')) v *= 1.08;
    return Math.max(1, Math.round(v));
  },
  cargoCount() { let n = 0; for (const g in G.cargo) n += G.cargo[g].n; return n; },
  hold() { return SHIPS[G.ship].hold; },
  buy(p, g, n) {
    let total = 0;
    for (let i = 0; i < n; i++) total += State.buyPrice(p, g, State.heat(p, g) + i * 0.025);
    if (total > G.gold || State.cargoCount() + n > State.hold()) return false;
    G.gold -= total;
    State.addHeat(p, g, n * 0.025);
    const c = G.cargo[g] || { n: 0, cost: 0 };
    c.cost = (c.cost * c.n + total) / (c.n + n); c.n += n;
    G.cargo[g] = c;
    return total;
  },
  sell(p, g, n) {
    const c = G.cargo[g];
    if (!c || c.n < n) return false;
    let total = 0;
    for (let i = 0; i < n; i++) total += State.sellPrice(p, g, State.heat(p, g) - i * 0.03);
    G.gold += total;
    State.addHeat(p, g, -n * 0.03);
    const profit = total - c.cost * n;
    G.stats.profit += profit;
    if (profit > 0) G.fame.trade += Math.round(profit / 8);
    c.n -= n;
    if (c.n <= 0) delete G.cargo[g];
    return { total, profit: Math.round(profit) };
  },

  // ---------- 하루가 지남 ----------
  passDay(atSea) {
    G.day++;
    for (const p in G.heat) for (const g in G.heat[p]) G.heat[p][g] *= 0.92;
    if (G.day - G.driftDay >= 15) State.rollDrift();
    const out = [];
    if (atSea) {
      const use = State.dailyUse();
      G.food = Math.max(0, G.food - use);
      G.water = Math.max(0, G.water - use);
      if (G.food === 0 || G.water === 0) {
        G.morale = Math.max(0, G.morale - 6);
        if (Math.random() < 0.25 && G.crew > 1) { G.crew--; out.push('굶주림과 목마름에 선원 한 명이 쓰러졌다.'); }
      } else if (G.morale > 50) G.morale = Math.max(50, G.morale - 0.5);
      if (G.morale < 20 && Math.random() < 0.1 && G.crew > 2) { G.crew--; out.push('사기가 떨어진 선원 한 명이 몰래 떠났다.'); }
    }
    return out;
  },

  addRelic(id) {
    if (G.relics[id]) return false;
    G.relics[id] = G.day;
    const r = RELICS[id].rar;
    G.fame.scholar += r === '보물' ? 30 : r === '귀중' ? 18 : 8;
    return true;
  },
  fameTotal() { const f = G.fame; return f.trade + f.explore + f.scholar + f.sea; },
  pcKey() { return `pc_${G.origin}_${G.gender}`; },
};
