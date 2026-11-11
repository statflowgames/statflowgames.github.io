// 맵 해석, 길찾기, 시야 계산
const FLOORS = '.,_:';

export function tileInfo(c) {
  switch (c) {
    case '#': case 'H': case 'P': case 'O': case 'M':
      return { cat: false, hum: false, vis: true, hide: false };
    case 'S': case 'K': case 'X': case 'v':
      return { cat: false, hum: false, vis: false, hide: false };
    case 'T': case 'D': case 'B': case 'V':
      return { cat: true, hum: false, vis: false, hide: true };
    case 'C':
      return { cat: true, hum: false, vis: true, hide: true };
    case 'm':
      return { cat: true, hum: false, vis: false, hide: false };
    default:
      return { cat: true, hum: true, vis: false, hide: false };
  }
}

const SHUT = { cat: false, hum: false, vis: true, hide: false };

export class Grid {
  constructor(rows) {
    this.h = rows.length;
    this.w = rows[0].length;
    this.ch = rows.map((r) => r.split(''));
    this.knocked = new Set();
    this.shut = new Set();
    this.info = this.ch.map((row) => row.map(tileInfo));
    // 바닥 무늬: 가구·물건 칸은 가장 가까운 바닥 무늬를 물려받는다
    this.floor = this.ch.map((row) => row.map((c) => (FLOORS.includes(c) ? c : null)));
    const q = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.floor[y][x]) q.push([x, y]);
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h || this.floor[ny][nx]) continue;
        if (this.ch[ny][nx] === '#') continue;
        this.floor[ny][nx] = this.floor[y][x];
        q.push([nx, ny]);
      }
    }
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (!this.floor[y][x]) this.floor[y][x] = '.';
  }
  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  c(x, y) { return this.in(x, y) ? this.ch[y][x] : '#'; }
  get(x, y) {
    if (!this.in(x, y)) return tileInfo('#');
    if (this.ch[y][x] === 'v' && this.knocked.has(x + ',' + y)) return tileInfo('.');
    if (this.ch[y][x] === 'A' && this.shut.has(x + ',' + y)) return SHUT;
    return this.info[y][x];
  }
  catOK(x, y) { return this.get(x, y).cat; }
  humOK(x, y) { return this.in(x, y) && this.ch[y][x] === 'A' ? true : this.get(x, y).hum; }
  blocksVis(x, y) { return this.get(x, y).vis; }
  hideAt(px, py) { return this.get(Math.floor(px), Math.floor(py)).hide; }

  // 두 점 사이 시야가 트였는지 (가구가 아닌 벽·책장·기둥만 막는다)
  los(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const d = Math.hypot(dx, dy);
    const n = Math.ceil(d / 0.12);
    const sx = Math.floor(x1), sy = Math.floor(y1), ex = Math.floor(x2), ey = Math.floor(y2);
    for (let i = 1; i < n; i++) {
      const px = x1 + (dx * i) / n, py = y1 + (dy * i) / n;
      const tx = Math.floor(px), ty = Math.floor(py);
      if ((tx === sx && ty === sy) || (tx === ex && ty === ey)) continue;
      if (this.blocksVis(tx, ty)) return false;
    }
    return true;
  }
  // 한 방향으로 시야가 닿는 끝점
  ray(x, y, a, range) {
    const cx = Math.cos(a), cy = Math.sin(a);
    const sx = Math.floor(x), sy = Math.floor(y);
    let d = 0.1;
    for (; d < range; d += 0.08) {
      const tx = Math.floor(x + cx * d), ty = Math.floor(y + cy * d);
      if (tx === sx && ty === sy) continue;
      if (this.blocksVis(tx, ty)) break;
    }
    d = Math.min(d, range);
    return [x + cx * d, y + cy * d];
  }

  // 사람·개가 다닐 수 있는 칸 사이 최단 경로 (8방향, 모서리 끼기 금지)
  path(sx, sy, tx, ty) {
    const W = this.w, N = W * this.h;
    const s = Math.floor(sx) + Math.floor(sy) * W;
    const dist = new Float32Array(N).fill(Infinity);
    const prev = new Int32Array(N).fill(-1);
    const done = new Uint8Array(N);
    if (!this.humOK(Math.floor(sx), Math.floor(sy))) {
      // 시작 칸이 막혀 있으면 (밀려난 경우) 가장 가까운 열린 칸에서 시작
      return null;
    }
    dist[s] = 0;
    const open = [s];
    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (dist[open[i]] < dist[open[bi]]) bi = i;
      const cur = open[bi];
      open[bi] = open[open.length - 1];
      open.pop();
      if (done[cur]) continue;
      done[cur] = 1;
      const cx = cur % W, cy = (cur / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (!this.humOK(nx, ny)) continue;
        if (dx && dy && (!this.humOK(cx + dx, cy) || !this.humOK(cx, cy + dy))) continue;
        const ni = nx + ny * W;
        const nd = dist[cur] + (dx && dy ? 1.414 : 1);
        if (nd < dist[ni]) { dist[ni] = nd; prev[ni] = cur; open.push(ni); }
      }
    }
    let gx = Math.floor(tx), gy = Math.floor(ty);
    let goal = gx + gy * W;
    if (!this.in(gx, gy) || dist[goal] === Infinity) {
      // 목표 칸에 못 들어가면 (탁자 밑 등) 가장 가까운 이웃 칸으로
      let best = -1, bd = Infinity;
      for (let r = 1; r <= 2 && best < 0; r++) {
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          const nx = gx + dx, ny = gy + dy;
          if (!this.in(nx, ny)) continue;
          const ni = nx + ny * W;
          if (dist[ni] === Infinity) continue;
          const score = Math.hypot(nx + 0.5 - tx, ny + 0.5 - ty) * 10 + dist[ni] * 0.01;
          if (score < bd) { bd = score; best = ni; }
        }
      }
      if (best < 0) return null;
      goal = best;
    }
    const out = [];
    for (let i = goal; i !== s && i >= 0; i = prev[i]) out.push({ x: (i % W) + 0.5, y: ((i / W) | 0) + 0.5 });
    out.reverse();
    return this.smooth(sx, sy, out);
  }
  // 소리는 벽을 돌아 문으로 퍼진다: 소리 난 곳에서 각 칸까지의 거리 지도
  soundMap(x, y, maxD) {
    const W = this.w, N = W * this.h;
    const dist = new Float32Array(N).fill(Infinity);
    const s = Math.floor(x) + Math.floor(y) * W;
    dist[s] = 0;
    const open = [s];
    const passable = (tx, ty) => this.in(tx, ty) && this.ch[ty][tx] !== '#' && this.ch[ty][tx] !== 'C';
    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (dist[open[i]] < dist[open[bi]]) bi = i;
      const cur = open[bi];
      open[bi] = open[open.length - 1];
      open.pop();
      const cx = cur % W, cy = (cur / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (!passable(nx, ny)) continue;
        if (dx && dy && (!passable(cx + dx, cy) || !passable(cx, cy + dy))) continue;
        const ni = nx + ny * W, nd = dist[cur] + (dx && dy ? 1.414 : 1);
        if (nd < dist[ni] && nd <= maxD + 1) { dist[ni] = nd; open.push(ni); }
      }
    }
    return (px, py) => dist[Math.floor(px) + Math.floor(py) * W];
  }
  clear(x1, y1, x2, y2, r = 0.32) {
    const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy);
    if (d < 0.01) return true;
    const nx = -dy / d, ny = dx / d;
    const n = Math.ceil(d / 0.2);
    for (let i = 0; i <= n; i++) {
      const px = x1 + (dx * i) / n, py = y1 + (dy * i) / n;
      for (const o of [-r, 0, r]) {
        if (!this.humOK(Math.floor(px + nx * o), Math.floor(py + ny * o))) return false;
      }
    }
    return true;
  }
  smooth(sx, sy, pts) {
    if (pts.length < 2) return pts;
    const out = [];
    let ax = sx, ay = sy, i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !this.clear(ax, ay, pts[j].x, pts[j].y)) j--;
      out.push(pts[j]);
      ax = pts[j].x; ay = pts[j].y;
      i = j + 1;
    }
    return out;
  }
}

export function parseLevel(L) {
  const grid = new Grid(L.map);
  const ents = { cat: null, fish: null, bonus: [], vases: [], cams: [], lasers: [], switches: [], wps: {}, roomba: null, vents: [], doors: [], rides: [], plates: [] };
  for (let y = 0; y < grid.h; y++) for (let x = 0; x < grid.w; x++) {
    const c = grid.ch[y][x];
    const p = { x: x + 0.5, y: y + 0.5, tx: x, ty: y };
    if (c === 'C') ents.cat = p;
    else if (c === 'F') ents.fish = p;
    else if (c === '$') ents.bonus.push(p);
    else if (c === 'v') ents.vases.push(p);
    else if (c === 's') ents.switches.push(p);
    else if (c === 'V') ents.vents.push(p);
    else if (c === 'M') ents.rides.push(p);
    else if (c === '+') ents.plates.push(p);
    else if (c === 'A') ents.doors.push({ ...p, across: grid.c(x - 1, y) === '#' && grid.c(x + 1, y) === '#' });
    else if (c === 'r') ents.roomba = p;
    else if (c === '=' || c === '!') ents.lasers.push({ ...p, dir: c === '=' ? 'h' : 'v' });
    else if (c === 'c') {
      // 붙어 있는 벽의 반대쪽을 바라본다
      let vx = 0, vy = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (grid.c(x + dx, y + dy) === '#') { vx -= dx; vy -= dy; }
      if (!vx && !vy) vy = 1;
      const wall = { x: -Math.sign(vx), y: -Math.sign(vy) };
      ents.cams.push({ ...p, base: Math.atan2(vy, vx), wall });
    } else if (c >= '0' && c <= '9') ents.wps[c] = p;
  }
  return { grid, ents };
}

export const DIRS = { r: 0, d: Math.PI / 2, l: Math.PI, u: -Math.PI / 2 };

export function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
