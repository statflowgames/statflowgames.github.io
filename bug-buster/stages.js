// 은하 방역대 - 30스테이지 구성 / 도감 정보 / 진행 저장
ENEMIES.mosquito.waves = [F.mosqLine, F.mosqRain];
ENEMIES.fly.waves = [F.flyV, F.flySnake, F.flyCross];
ENEMIES.ladybug.waves = [F.ladybug, F.ladyPair];
ENEMIES.firefly.waves = [F.fireflies];
ENEMIES.spider.waves = [F.spiders];
ENEMIES.beetle.waves = [F.beetle];
ENEMIES.roach.waves = [F.roachRush, F.roachWall];

// 월드 10개 × 스테이지 3개. 스테이지마다 새 해충 1종, 월드 마지막 스테이지에 보스
const WORLDS = [
  { sky: ['#1a0b2e', '#4a1d5c', '#ff9f43'], song: 's1', bugs: ['mosquito', 'fly', 'ladybug'], boss: 'queen' },
  { sky: ['#06131f', '#0f3a4a', '#2de2a6'], song: 's2', bugs: ['firefly', 'spider', 'beetle'], boss: 'tarantula' },
  { sky: ['#1a0804', '#4a1a0a', '#ff6b35'], song: 's3', bugs: ['roach', 'aphid', 'grasshopper'], boss: 'emperor' },
  { sky: ['#041a2a', '#0a4a6a', '#7fe0ff'], song: 's4', bugs: ['dragonfly', 'gnat', 'strider'], boss: 'waterbug' },
  { sky: ['#14121c', '#3a3448', '#d8c8f0'], song: 's5', bugs: ['pillbug', 'moth', 'wasp'], boss: 'lunamoth' },
  { sky: ['#061a0c', '#1a4a1a', '#b6ff6a'], song: 's6', bugs: ['stinkbug', 'cicada', 'centipede'], boss: 'kingcentipede' },
  { sky: ['#2a1a08', '#6a4a1a', '#ffd27a'], song: 's7', bugs: ['dungbeetle', 'mantis', 'bombardier'], boss: 'mantisboss' },
  { sky: ['#2a0a24', '#5a1a4a', '#ff9ad8'], song: 's8', bugs: ['nest', 'flea', 'butterfly'], boss: 'termitequeen' },
  { sky: ['#1a0402', '#5a0a04', '#ff5a1a'], song: 's9', bugs: ['scorpion', 'stag', 'hornet'], boss: 'scorpionking' },
  { sky: ['#0a0414', '#2a0a3a', '#ff2d55'], song: 's10', bugs: ['ant', 'diver', 'jewel'], boss: 'mother' },
];

const STAGES = [];
WORLDS.forEach((w, wi) => w.bugs.forEach((bug, k) => {
  const i = STAGES.length;
  // k: 월드 안 순서 (0 외곽 → 1 중심부, 환경 기믹 → 2 보스 둥지). 1·2번째 스테이지 끝에는 대장이 나옴
  STAGES.push({ i, k, world: wi, get title() { return WORLDS[wi].title; }, get sub() { return WORLDS[wi].sub; }, sky: w.sky, song: w.song, featured: bug,
    boss: k === 2 ? w.boss : null, gimmick: k === 1 ? wi : null, len: i < 3 ? 38 : k === 2 ? 50 : 45,
    get area() { return tl('areas')[k]; } });
}));
// 이야기 모드는 30스테이지. 마지막 보스를 잡으면 엔딩, 그 뒤로는 무한 모드
const STORY = STAGES.length;

// 무한 모드(31스테이지~): 월드를 차례로 돌며 30종을 섞어 내보내고, 3스테이지마다 강화된 보스
function stageAt(i) {
  while (STAGES.length <= i) {
    const n = STAGES.length, e = n - STORY, k = e % 3, wi = Math.floor(e / 3) % WORLDS.length, w = WORLDS[wi];
    STAGES.push({ i: n, k, world: wi, endless: true, get title() { return WORLDS[wi].title; }, get sub() { return t('endlessSub'); },
      sky: w.sky, song: w.song, featured: BUG_ORDER[(Math.random() * BUG_ORDER.length) | 0],
      boss: k === 2 ? w.boss : null, gimmick: k === 1 ? wi : null, len: k === 2 ? 45 : 40, get area() { return tl('areas')[k]; } });
  }
  return STAGES[i];
}

// 스테이지에 나올 편대 고르기: 이번 스테이지 새 해충 위주 + 최근 해충 + 가끔 옛날 해충
function stageWave(si) {
  const list = [];
  for (let j = 0; j <= si; j++) {
    const key = STAGES[j].featured, age = si - j;
    let w = age === 0 ? 4 : age <= 3 ? 2 : age <= 8 ? 1 : 0.35;
    if (ENEMIES[key].elite) w *= 0.6;
    list.push([key, w]);
  }
  let r = Math.random() * list.reduce((a, x) => a + x[1], 0);
  for (const [key, w] of list) if ((r -= w) <= 0) { const ws = ENEMIES[key].waves; return ws[(Math.random() * ws.length) | 0](); }
}
const BUG_ORDER = STAGES.map(s => s.featured);
const BOSS_ORDER = WORLDS.map(w => w.boss);
const firstStage = key => { const s = STAGES.find(s => s.featured === key || s.boss === key); return s ? s.i + 1 : 1; };

// 진행 저장: 열린 스테이지, 만난 해충
const Save = (() => {
  const d = { unlocked: 1, seen: {}, cleared: {} };
  try { Object.assign(d, JSON.parse(localStorage.getItem('bugbuster.save') || '{}')); } catch (e) {}
  return {
    get unlocked() { return d.unlocked; },
    unlock(n) { if (n > d.unlocked) { d.unlocked = Math.min(STORY, n); this.flush(); } },
    // 30스테이지(엔딩)까지 깬 난이도
    clear(diff) { d.cleared[diff] = 1; this.flush(); },
    isCleared: diff => !!d.cleared[diff],
    anyCleared: () => Object.keys(d.cleared).length > 0,
    see(k) { if (INFO[k] && !d.seen[k]) d.seen[k] = 1; },
    seen: k => !!d.seen[k],
    count: () => Object.keys(d.seen).filter(k => INFO[k]).length,
    flush() { try { localStorage.setItem('bugbuster.save', JSON.stringify(d)); } catch (e) {} },
  };
})();

// 중간 스테이지부터 시작할 때 자동 보급되는 업그레이드 순서
const AUTO_BUILD = ['dmg', 'rate', 'spread', 'dmg', 'drone', 'rate', 'homing', 'dmg', 'shield', 'spread', 'hpmax', 'dmg', 'rate', 'pierce',
  'drone', 'magnet', 'homing', 'dmg', 'spread', 'rate', 'shield', 'hpmax', 'dmg', 'homing', 'drone', 'pierce', 'rate', 'dmg', 'spread',
  'magnet', 'homing', 'dmg', 'hpmax', 'rate', 'pierce', 'dmg', 'magnet', 'rate', 'magnet'];
const nextXp = x => Math.round(x * 1.12 + 4);
function autoBuild(p, n) {
  let i = 0, done = 0;
  while (done < n && i < AUTO_BUILD.length * 3) {
    const id = AUTO_BUILD[i++ % AUTO_BUILD.length], u = UPGRADES.find(x => x.id === id);
    if ((p.lv[u.id] || 0) >= u.max) continue;
    u.apply(p); p.lv[u.id] = (p.lv[u.id] || 0) + 1; done++;
  }
  p.level = 1 + done; p.xpNext = 6;
  for (let k = 0; k < done; k++) p.xpNext = nextXp(p.xpNext);
  p.hp = p.hpMax; p.bombs = 3;
  return done;
}
