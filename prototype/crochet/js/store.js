// 이 기기에만 저장 (localStorage). 못 쓰는 환경이어도 앱은 돌아가게 try 로 감싼다.
const KEY = 'crochet-patterns.v1';
let data = { unlocked: {}, progress: {}, counter: { row: 0, st: 0 }, calc: {} };
try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) data = { ...data, ...s }; } catch (e) { /* 무시 */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 무시 */ } };

export const Store = {
  isUnlocked: (id) => !!data.unlocked[id],
  unlock(id) { data.unlocked[id] = Date.now(); save(); },
  unlockedIds: () => Object.keys(data.unlocked).sort((a, b) => data.unlocked[b] - data.unlocked[a]),
  progress: (id) => data.progress[id] || { step: 1, st: 0, done: false, touched: 0 },
  setProgress(id, pr) { data.progress[id] = { ...pr, touched: Date.now() }; save(); },
  counter: () => data.counter,
  setCounter(c) { data.counter = c; save(); },
  calc: () => data.calc,
  setCalc(c) { data.calc = c; save(); },
};
