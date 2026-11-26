// 저장 상태 G 와 계산
'use strict';

const SAVE_KEY = 'monsoon-museum-m0';
let G = null;

const State = {
  newGame(name) {
    G = {
      v: 1, name: name || '관장', coins: 100, fame: 0, rank: 0,
      relics: {},            // id → { st: 'raw' | 'ready' | 'shown', t?: 맡긴 처리 끝 시각 }
      slots: {},             // slotId → { relic, tier }
      hallB: false,
      exps: [],              // { ruin, end }
      teams: 2,
      pity: {}, trips: {},
      flash: {},             // 본 회상
      sets: {},              // 완성한 유적 세트
      wishes: [],            // { relic, from, msg }
      goals: [], goalsDone: 0,
      st: { visitors: 0, hearts: 0, coins: 0, restore: 0, exps: 0, wishes: 0, photos: 0, quiz: 0 },
      story: 0,              // 0 서장 진행 중, 1 서장 끝(1성), 2 2성
      lastSeen: Date.now(), tOff: 0,
      ended: false,
    };
    State.newGoals();
    return G;
  },
  save() { if (!G) return; G.lastSeen = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) { /* */ } },
  load() { try { const s = localStorage.getItem(SAVE_KEY); if (s) { G = JSON.parse(s); return true; } } catch (e) { /* */ } return false; },
  hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } },
  wipe() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* */ } G = null; },
  now() { return Date.now() + (G ? G.tOff : 0); },

  coins(n, x, y) {
    G.coins = Math.max(0, G.coins + n);
    if (n > 0 && x != null) UI.float('+' + n, x, y, 'coin');
    HUD.update(true);
  },
  addFame(n, x, y) {
    G.fame += n;
    if (x != null) UI.float('★+' + n, x, y, 'fame');
    HUD.update(true);
    Story.checkRank();
  },

  // ---------- 전시 ----------
  allSlots() {
    const out = [];
    for (const h of ['lobby', 'nanhaiA', 'nanhaiB']) {
      if (h === 'nanhaiB' && !G.hallB) continue;
      if (h === 'nanhaiA' && G.story < 1) continue;
      for (const s of HALLS[h].slots) out.push({ ...s, hall: h });
    }
    return out;
  },
  slotOf(relic) { for (const k in G.slots) if (G.slots[k].relic === relic) return k; return null; },
  shownCount() { return Object.values(G.slots).filter(s => s.relic).length; },
  // 같은 유적 유물이 바로 옆 칸에 있으면 「이야기 잇기」
  linked(slotId) {
    const s = G.slots[slotId]; if (!s || !s.relic) return false;
    const ruin = RELICS[s.relic].ruin;
    for (const h of Object.values(HALLS)) {
      const i = h.slots.findIndex(x => x.id === slotId);
      if (i < 0) continue;
      for (const j of [i - 1, i + 1]) {
        const o = h.slots[j]; if (!o) continue;
        const os = G.slots[o.id];
        if (os && os.relic && RELICS[os.relic].ruin === ruin) return true;
      }
    }
    return false;
  },
  slotScore(slotId) {
    const s = G.slots[slotId]; if (!s || !s.relic) return 0;
    const r = RELICS[s.relic];
    let v = RAR[r.rar].base * TIER[s.tier || 0].mult;
    if (slotId === 'L0') v *= 1.5;                  // 오늘의 보물 조명
    if (State.linked(slotId)) v *= 1.3;
    if (G.sets[r.ruin]) v *= 1.2;
    return Math.round(v);
  },
  attraction() { let t = 0; for (const k in G.slots) t += State.slotScore(k); return t; },
  ticket() { return [3, 5, 8][G.rank] || 8; },
  spawnEvery() {                                    // 관람객 오는 간격(초)
    const a = State.attraction();
    let s = 14 / (1 + a / 45);
    if (Events.active === 'bus') s /= 3;
    if (Events.active === 'rain') s /= 1.5;
    return Math.max(1.6, s);
  },

  // 유적 세트 확인 (새로 완성되면 true)
  checkSets() {
    const done = [];
    for (const ruin of RUIN_ORDER) {
      if (G.sets[ruin]) continue;
      if (RUINS[ruin].relics.every(r => State.slotOf(r))) { G.sets[ruin] = true; done.push(ruin); }
    }
    return done;
  },
  setCount() { return Object.keys(G.sets).length; },

  // ---------- 오늘의 목표 ----------
  newGoals() {
    const pool = GOAL_POOL.slice().sort(() => Math.random() - 0.5).slice(0, 3);
    G.goals = pool.map(g => ({ id: g.id, n: pick(g.n), reward: g.reward, from: G.st[g.id] || 0, got: false }));
  },
  goalProg(g) { return Math.min(g.n, (G.st[g.id] || 0) - g.from); },
  stat(id, n = 1) {
    G.st[id] = (G.st[id] || 0) + n;
    for (const g of G.goals) if (!g.got && g.id === id && State.goalProg(g) >= g.n && !g.ready) { g.ready = true; HUD.goalBadge(); UI.toast(`🎯 목표 달성! 「목표」에서 보상을 받으세요`, 'good'); SFX.play('discover'); }
  },
};
