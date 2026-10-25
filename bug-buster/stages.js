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
  { title: '벌집 성운', sub: 'HIVE NEBULA', sky: ['#1a0b2e', '#4a1d5c', '#ff9f43'], song: 's1', bugs: ['mosquito', 'fly', 'ladybug'], boss: 'queen' },
  { title: '거미줄 소행성대', sub: 'WEB BELT', sky: ['#06131f', '#0f3a4a', '#2de2a6'], song: 's2', bugs: ['firefly', 'spider', 'beetle'], boss: 'tarantula' },
  { title: '바퀴 행성', sub: 'ROACH PRIME', sky: ['#1a0804', '#4a1a0a', '#ff6b35'], song: 's3', bugs: ['roach', 'aphid', 'grasshopper'], boss: 'emperor' },
  { title: '이슬 호수 위성', sub: 'DEW LAKE', sky: ['#041a2a', '#0a4a6a', '#7fe0ff'], song: 's4', bugs: ['dragonfly', 'gnat', 'strider'], boss: 'waterbug' },
  { title: '잿빛 먼지 구름', sub: 'ASH CLOUD', sky: ['#14121c', '#3a3448', '#d8c8f0'], song: 's5', bugs: ['pillbug', 'moth', 'wasp'], boss: 'lunamoth' },
  { title: '독안개 정글', sub: 'TOXIC JUNGLE', sky: ['#061a0c', '#1a4a1a', '#b6ff6a'], song: 's6', bugs: ['stinkbug', 'cicada', 'centipede'], boss: 'kingcentipede' },
  { title: '모래폭풍 사막', sub: 'DUNE STORM', sky: ['#2a1a08', '#6a4a1a', '#ffd27a'], song: 's7', bugs: ['dungbeetle', 'mantis', 'bombardier'], boss: 'mantisboss' },
  { title: '꽃가루 정원', sub: 'POLLEN GARDEN', sky: ['#2a0a24', '#5a1a4a', '#ff9ad8'], song: 's8', bugs: ['nest', 'flea', 'butterfly'], boss: 'termitequeen' },
  { title: '용암 협곡', sub: 'LAVA CANYON', sky: ['#1a0402', '#5a0a04', '#ff5a1a'], song: 's9', bugs: ['scorpion', 'stag', 'hornet'], boss: 'scorpionking' },
  { title: '해충 본부', sub: 'PEST CORE', sky: ['#0a0414', '#2a0a3a', '#ff2d55'], song: 's10', bugs: ['ant', 'diver', 'jewel'], boss: 'mother' },
];

const STAGES = [];
WORLDS.forEach((w, wi) => w.bugs.forEach((bug, k) => {
  const i = STAGES.length;
  // k: 월드 안 순서 (0 외곽 → 1 중심부, 환경 기믹 → 2 보스 둥지). 1·2번째 스테이지 끝에는 대장이 나옴
  STAGES.push({ i, k, world: wi, title: w.title, sub: w.sub, sky: w.sky, song: w.song, featured: bug,
    boss: k === 2 ? w.boss : null, gimmick: k === 1 ? wi : null, len: i < 3 ? 38 : k === 2 ? 50 : 45,
    area: ['외곽', '중심부', '보스 둥지'][k] });
}));

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
// 도감: [이름, 종류, 설명]
const INFO = {
  mosquito: ['삐용이', '모기', '지그재그로 날아다니며 가끔 침을 쏜다. 가장 흔한 해충.'],
  fly: ['윙윙', '똥파리', '편대를 짜고 몰려온다. 줄지어 오면 한 번에 쓸어버리자.'],
  ladybug: ['점박이 탱크', '무당벌레', '단단한 등껍질. 멈춰 서서 부채꼴로 탄을 뿌린다.'],
  firefly: ['번쩍이', '반딧불', '꽁무니가 밝아지면 곧 나를 향해 돌진한다!'],
  spider: ['실타래', '독거미', '실에 매달려 내려와 원형 탄막을 펼친다.'],
  beetle: ['뿔돌이', '장수풍뎅이', '엄청 단단한 정예. 정확한 3연발 조준탄.'],
  roach: ['쌩쌩이', '바퀴벌레', '떼로 몰려와 엄청 빠르게 달린다. 벽에 튕긴다.'],
  aphid: ['말랑이', '진딧물', '터뜨리면 새끼 진딧물 3마리로 나뉜다.'],
  grasshopper: ['폴짝이', '메뚜기', '내 쪽으로 크게 뛰어오르고, 착지할 때 원형 탄을 뿌린다.'],
  dragonfly: ['휙휙이', '잠자리', '순간 이동하듯 직선으로 날아와 멈춰 서서 조준한다.'],
  gnat: ['바글이', '날파리', '하나하나는 약하지만 수십 마리가 떼로 몰려온다.'],
  strider: ['미끄럼이', '소금쟁이', '옆에서 미끄러져 들어와 노란 조준선을 그린 뒤 저격한다.'],
  pillbug: ['데굴이', '공벌레', '몸을 말면 총알이 튕겨 나간다. 몸을 폈을 때 노려라.'],
  moth: ['펄럭이', '나방', '날갯짓할 때마다 느린 인분 가루를 흩뿌린다.'],
  wasp: ['쏘옥이', '말벌', '크게 곡선을 그리며 내 위치를 스쳐 지나간다.'],
  stinkbug: ['뿡뿡이', '노린재', '독가스 구름을 남긴다. 터질 때도 가스가 퍼진다.'],
  cicada: ['맴맴이', '매미', '음파 고리로 화면을 덮는다. 고리의 빈틈으로 빠져나가자.'],
  centipede: ['줄줄이', '지네', '머리를 따라 몸마디가 줄지어 온다. 마디마다 공격한다.'],
  dungbeetle: ['굴림이', '쇠똥구리', '똥 경단을 굴려 보낸다. 경단은 잠시 뒤 터진다.'],
  mantis: ['칼날이', '사마귀', '낫을 치켜들면 부채꼴 칼바람이 온다.'],
  bombardier: ['펑펑이', '폭탄먼지벌레', '뜨거운 분사를 부채꼴로 뿜어낸다.'],
  nest: ['우글집', '흰개미 둥지', '빨리 부수지 않으면 흰개미가 끝없이 쏟아진다.'],
  flea: ['순간이', '벼룩', '사라졌다가 원이 표시된 곳에 다시 나타난다.'],
  butterfly: ['팔랑이', '나비', '예쁜 꽃잎 모양 탄막. 보기와 달리 위험하다.'],
  scorpion: ['독침이', '전갈', '꼬리로 폭탄을 던진다. 떨어진 자리에서 터진다.'],
  stag: ['집게돌이', '사슴벌레', '내 앞에 줄을 맞춘 뒤 빨간 선을 따라 돌진한다.'],
  hornet: ['대왕침', '장수말벌', '좌우로 훑으며 독침을 연사한다. 말벌 부하를 데려온다.'],
  ant: ['줄맞춤', '병정개미', '줄을 맞춰 지그재그로 행군한다.'],
  diver: ['잠수함', '물방개', '물속에 숨으면 맞지 않는다. 떠오를 때를 노려라.'],
  jewel: ['반짝이', '비단벌레', '무지개 탄막. 맞으면 가끔 반사탄을 쏜다.'],
  queen: ['비비 퀸', '여왕벌', '벌집 성운의 여왕. 나선 탄막과 독침 부채, 모기 호위대를 부른다.'],
  tarantula: ['타란툴라 마담', '왕거미', '거미줄을 친 장본인. 회전 탄막과 끈끈한 거미줄 탄.'],
  emperor: ['로치 엠퍼러', '바퀴 황제', '빨간 경고선이 보이면 돌진이 온다. 피해라!'],
  waterbug: ['아쿠아 자이언트', '물장군', '물속으로 숨었다가 솟구치며 물방울 폭탄을 터뜨린다.'],
  lunamoth: ['루나', '나방 여제', '거대한 날개에서 달빛 가루와 눈알 광선을 쏟아낸다.'],
  kingcentipede: ['킹 센티피드', '왕지네', '긴 몸통이 총알을 막는다. 머리를 노려라!'],
  mantisboss: ['만티스 블레이드', '사마귀 검객', '순간 이동과 십자 베기. 조준선이 보이면 바로 피하자.'],
  termitequeen: ['테르미나', '흰개미 여왕', '알 폭탄을 던지고 흰개미와 병정개미를 부른다.'],
  scorpionking: ['스콜피오', '전갈 군주', '꼬리 레이저로 화면을 쓸어버린다.'],
  mother: ['마더 버그', '해충의 어머니', '모든 해충의 근원. 쓰러뜨릴 때마다 더 강한 형태로 변한다.'],
};
const BUG_ORDER = STAGES.map(s => s.featured);
const BOSS_ORDER = WORLDS.map(w => w.boss);
const firstStage = key => { const s = STAGES.find(s => s.featured === key || s.boss === key); return s ? s.i + 1 : 1; };

// 진행 저장: 열린 스테이지, 만난 해충
const Save = (() => {
  const d = { unlocked: 1, seen: {} };
  try { Object.assign(d, JSON.parse(localStorage.getItem('bugbuster.save') || '{}')); } catch (e) {}
  return {
    get unlocked() { return d.unlocked; },
    unlock(n) { if (n > d.unlocked) { d.unlocked = Math.min(STAGES.length, n); this.flush(); } },
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
