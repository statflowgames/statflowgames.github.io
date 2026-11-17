// 퍼즐 만들기: 물감 블록을 무작위로 겹쳐 놓아 '완성 그림'을 만들고, 그 블록들을 섞어서 내준다.
// 같은 번호의 스테이지는 언제나 같은 퍼즐이 나오도록 시드 난수를 쓴다.

export const R = 1, Y = 2, B = 4;

// 색 = 겹친 물감의 조합 (비트 OR). 같은 색끼리 겹치면 그대로.
export const MIX = {
  0: '#f4ecdf',
  1: '#e5484d', // 빨강
  2: '#f5c33b', // 노랑
  4: '#3b7dd8', // 파랑
  3: '#f08c2e', // 주황 = 빨강 + 노랑
  6: '#3daa5c', // 초록 = 노랑 + 파랑
  5: '#8b55c9', // 보라 = 빨강 + 파랑
  7: '#6b4432', // 고동 = 셋 다
};
export const MIXNAME = { 1: '빨강', 2: '노랑', 4: '파랑', 3: '주황', 6: '초록', 5: '보라', 7: '고동' };

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RAW = {
  2: ['XX'],
  3: ['XXX', 'X.|XX'],
  4: ['XXXX', 'XX|XX', 'XXX|.X.', 'XX.|.XX', 'XXX|X..'],
  5: ['XX|XX|X.', 'XXXX|X...', 'XXX|.X.|.X.', 'X.X|XXX', 'X..|X..|XXX', 'X..|XX.|.XX',
      'XX.|.X.|.XX', '.XX|XX.|.X.', 'XXXX|.X..', 'XX..|.XXX', '.X.|XXX|.X.'],
};
const parse = s => {
  const out = [];
  s.split('|').forEach((row, y) => [...row].forEach((c, x) => { if (c === 'X') out.push([x, y]); }));
  return out;
};
export const SHAPES = {};
for (const k in RAW) SHAPES[k] = RAW[k].map(parse);

export function norm(cells) {
  let mx = Infinity, my = Infinity;
  for (const [x, y] of cells) { if (x < mx) mx = x; if (y < my) my = y; }
  return cells.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}
// 시계 방향 90도 (화면 좌표: y 아래쪽)
export const rot = cells => norm(cells.map(([x, y]) => [-y, x]));
export function rotN(c, k) { for (let i = 0; i < k; i++) c = rot(c); return c; }
export function dims(cells) {
  let w = 0, h = 0;
  for (const [x, y] of cells) { if (x + 1 > w) w = x + 1; if (y + 1 > h) h = y + 1; }
  return [w, h];
}
export const key = c => norm(c).map(p => p.join(',')).join(';');

export function paint(n, list) {
  const mix = new Array(n * n).fill(0), cnt = new Array(n * n).fill(0);
  for (const p of list) for (const [cx, cy] of p.cells) {
    const i = (p.y + cy) * n + p.x + cx;
    cnt[i]++; mix[i] |= p.color;
  }
  return { mix, cnt };
}
const bits = m => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1);

export const CHAPTERS = [
  { name: '첫 붓질', n: 4, count: [2, 3], sizes: [2, 4], rotate: false, holes: [0, 0], overlap: [1, 2], cov: [0.35, 0.8], same: 0, all: false,
    tip: '블록을 끌어서 판 위에 놓아 보세요. 칸 속 작은 점은 그 칸에 와야 할 색이에요. 빨강과 노랑이 겹치면 주황이 돼요!' },
  { name: '세 가지 물감', n: 5, count: [3, 3], sizes: [3, 4], rotate: false, holes: [0, 0], overlap: [2, 3], cov: [0.35, 0.8], same: 0, all: true,
    tip: '판이 5칸으로 커졌어요. 노랑+파랑 = 초록, 빨강+파랑 = 보라. 모든 블록을 다 써야 완성이에요.' },
  { name: '빙글빙글', n: 5, count: [3, 4], sizes: [3, 5], rotate: true, holes: [0, 0], overlap: [2, 4], cov: [0.4, 0.85], same: 1, all: true,
    tip: '이제 블록을 톡 누르면 시계 방향으로 돌아가요. 판 위에 놓인 블록도 톡 누르면 그 자리에서 돌아요.' },
  { name: '구멍 난 종이', n: 6, count: [4, 4], sizes: [3, 5], rotate: true, holes: [3, 5], overlap: [3, 5], cov: [0.35, 0.75], same: 1, all: true,
    tip: '종이에 구멍이 났어요! 어두운 구멍 칸에는 블록을 놓을 수 없어요.' },
  { name: '세 겹 물감', n: 6, count: [4, 5], sizes: [4, 5], rotate: true, holes: [0, 3], overlap: [3, 5], cov: [0.4, 0.8], same: 2, all: true, brown: true,
    tip: '빨강·노랑·파랑이 한 칸에 모두 겹치면 고동색이 돼요. 세 겹을 찾아보세요.' },
  { name: '명작', n: 7, count: [5, 6], sizes: [4, 5], rotate: true, holes: [3, 6], overlap: [5, 8], cov: [0.35, 0.75], same: 2, all: true, brown: true,
    tip: '마지막 장, 7칸짜리 큰 그림이에요. 겹치는 색부터 차근차근!' },
];
export const PER = 10;
export const STAGES = CHAPTERS.length * PER;

export function stageCfg(i) {
  const ch = CHAPTERS[Math.floor(i / PER)], k = i % PER, f = k / (PER - 1);
  const lerp = ([a, b]) => Math.round(a + (b - a) * f);
  return {
    n: ch.n, count: lerp(ch.count), sizes: ch.sizes, rotate: ch.rotate, holes: lerp(ch.holes),
    overlap: lerp(ch.overlap), cov: ch.cov, same: ch.same, all: ch.all, brown: !!ch.brown,
    colors: i < 4 ? [R, Y] : [R, Y, B],
  };
}

export function dailyCfg() {
  return { n: 6, count: 5, sizes: [3, 5], rotate: true, holes: 3, overlap: 5, cov: [0.4, 0.8], same: 2, all: true, brown: true, colors: [R, Y, B] };
}

function fromSolution(n, sol, rotate) {
  const { mix } = paint(n, sol);
  return { n, rotate, target: mix, holes: [], pieces: sol.map(s => ({ color: s.color, cells: s.cells, sol: s })) };
}

export function getStage(i) {
  if (i === 0) {
    // 첫 스테이지는 손으로: 빨강 막대와 노랑 막대가 한 칸에서 겹친다.
    return fromSolution(4, [
      { color: Y, cells: [[0, 0], [0, 1], [0, 2]], x: 2, y: 0 },
      { color: R, cells: [[0, 0], [1, 0], [2, 0]], x: 0, y: 1 },
    ], false);
  }
  return generate(stageCfg(i), 1000 + i * 7919);
}

export function generate(cfg, seed) {
  const r = rng(seed);
  const ri = (a, b) => a + Math.floor(r() * (b - a + 1));
  const pick = a => a[Math.floor(r() * a.length)];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const n = cfg.n, N = n * n;

  for (let att = 0; att < 40000; att++) {
    // 오래 못 찾으면 겹침 조건을 조금씩 푼다 (같은 시드면 결과는 늘 같다)
    const needOverlap = Math.max(1, cfg.overlap - Math.floor(att / 6000));
    const cols = shuffle([...cfg.colors]);
    const sol = [];
    let bad = false;
    for (let i = 0; i < cfg.count; i++) {
      const size = ri(cfg.sizes[0], cfg.sizes[1]);
      const cells = rotN(pick(SHAPES[size]), ri(0, 3));
      const [w, h] = dims(cells);
      if (w > n || h > n) { bad = true; break; }
      sol.push({ cells, x: ri(0, n - w), y: ri(0, n - h), color: i < cols.length ? cols[i] : pick(cfg.colors) });
    }
    if (bad) continue;

    const { mix, cnt } = paint(n, sol);
    let covered = 0, mixed = 0, same = 0, brown = 0;
    for (let i = 0; i < N; i++) {
      if (cnt[i]) covered++;
      const b = bits(mix[i]);
      if (b >= 2) mixed++; else if (cnt[i] >= 2) same++;
      if (mix[i] === 7) brown++;
    }
    const cov = covered / N;
    if (cov < cfg.cov[0] || cov > cfg.cov[1]) continue;
    if (mixed < needOverlap || same > cfg.same) continue;
    if (cfg.brown && !brown) continue;

    // 모든 블록이 꼭 필요해야 한다 (빼면 그림이 달라진다), 그리고 (조건이면) 다른 블록과 한 칸 이상 겹친다.
    let ok = true;
    for (let k = 0; k < sol.length && ok; k++) {
      const p = sol[k];
      const without = paint(n, sol.filter((_, j) => j !== k)).mix;
      if (without.every((m, i) => m === mix[i])) ok = false;
      if (ok && cfg.all && !p.cells.some(([cx, cy]) => cnt[(p.y + cy) * n + p.x + cx] >= 2)) ok = false;
    }
    if (!ok) continue;
    // 같은 모양·같은 색 블록이 둘이면 헷갈리기만 하니 뺀다
    const sig = sol.map(p => p.color + ':' + key(p.cells));
    if (new Set(sig).size !== sig.length) continue;

    // 구멍: 비어 있어야 하는 칸 중에서, 색칠된 칸 옆을 먼저 고른다 (그래야 놓을 자리를 막는다)
    let holes = [];
    if (cfg.holes) {
      const free = [];
      for (let i = 0; i < N; i++) if (!cnt[i]) free.push(i);
      const near = i => {
        const x = i % n, y = (i / n) | 0;
        return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
          const a = x + dx, b = y + dy;
          return a >= 0 && b >= 0 && a < n && b < n && cnt[b * n + a];
        });
      };
      const pool = shuffle(free.filter(near)).concat(shuffle(free.filter(i => !near(i))));
      if (pool.length < cfg.holes) continue;
      holes = pool.slice(0, cfg.holes).sort((a, b) => a - b);
    }

    const order = shuffle(sol.map((_, i) => i));
    return {
      n, rotate: cfg.rotate, target: mix, holes,
      pieces: order.map(i => {
        const s = sol[i];
        return { color: s.color, cells: cfg.rotate ? rotN(s.cells, ri(1, 3)) : s.cells, sol: s };
      }),
    };
  }
  throw new Error('퍼즐을 만들지 못함: ' + JSON.stringify(cfg));
}

export function todayStr(d = new Date()) {
  const z = v => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
export function getDaily(date) {
  return generate(dailyCfg(), Number(date.replace(/-/g, '')) * 31 + 7);
}
