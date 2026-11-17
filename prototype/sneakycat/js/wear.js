// 장비를 고양이 그림 위에 그린다. 그림 파일(img/gear-<id>.webp)이 있으면 그 그림을, 없으면 코드 그림을 쓴다.
// 위치는 동작 그림마다 (0~1 비율, 오른쪽을 보는 그림 기준) 미리 재 둔 값.
//  head: [x, y(머리 꼭대기), 머리 너비, 기울기]   neck: [x, y, 목걸이 너비]   tail: [꼬리 끝 x, y]
//  cape: [어깨 x, y, 엉덩이 x, y]   paws: 양말을 칠할 발 영역 [x0, y0, x1, y1] 목록
export const POSE = {
  'sprite-cat': { head: [0.69, 0.37, 0.34, 0], neck: [0.62, 0.68, 0.24], tail: [0.27, 0.36], cape: [0.58, 0.6, 0.24, 0.66], paws: [[0.2, 0.86, 0.74, 0.99]] },
  'sprite-cat-run': { head: [0.8, 0.38, 0.28, 0.05], neck: [0.76, 0.61, 0.2], tail: [0.11, 0.44], cape: [0.7, 0.5, 0.33, 0.52], paws: [[0.78, 0.58, 0.98, 0.74], [0.15, 0.58, 0.37, 0.72]] },
  'sprite-cat-peek': { head: [0.5, 0.42, 0.4, 0], paws: [[0.04, 0.84, 0.35, 0.99], [0.65, 0.84, 0.96, 0.99]] },
  'sprite-cat-fish': { head: [0.79, 0.41, 0.3, 0], neck: [0.72, 0.74, 0.2], tail: [0.19, 0.41], cape: [0.62, 0.67, 0.3, 0.72], paws: [[0.2, 0.88, 0.74, 0.99]] },
  'sprite-cat-yawn': { head: [0.62, 0.34, 0.32, -0.12], neck: [0.56, 0.7, 0.22], tail: [0.2, 0.36], cape: [0.48, 0.69, 0.2, 0.76], paws: [[0.25, 0.86, 0.74, 0.99], [0.66, 0.68, 0.8, 0.8]] },
  'sprite-cat-groom': { head: [0.6, 0.31, 0.36, 0], neck: [0.6, 0.67, 0.22], tail: [0.16, 0.36], cape: [0.5, 0.67, 0.2, 0.78], paws: [[0.22, 0.86, 0.74, 0.99], [0.68, 0.6, 0.8, 0.73]] },
  'sprite-cat-loaf': { head: [0.66, 0.62, 0.34, 0], neck: [0.52, 0.88, 0.18], tail: [0.1, 0.8], cape: [0.48, 0.68, 0.12, 0.78], paws: [] },
  'sprite-cat-crouch': { head: [0.78, 0.73, 0.3, 0.05], neck: [0.66, 0.9, 0.16], tail: [0.07, 0.86], cape: [0.62, 0.76, 0.25, 0.8], paws: [[0.44, 0.91, 0.58, 1], [0.78, 0.9, 0.95, 1]] },
  'sprite-cat-scared': { head: [0.71, 0.42, 0.32, 0.12], neck: [0.7, 0.68, 0.24], tail: [0.28, 0.24], cape: [0.55, 0.5, 0.25, 0.55], paws: [[0.25, 0.86, 0.74, 0.99]] },
  'sprite-cat-happy-pet': { head: [0.6, 0.25, 0.32, -0.08], neck: [0.55, 0.56, 0.22], tail: [0.17, 0.22], cape: [0.5, 0.55, 0.2, 0.6], paws: [[0.18, 0.78, 0.68, 0.87]] },
  'sprite-cat-sad': { head: [0.62, 0.19, 0.36, 0.05], neck: [0.58, 0.56, 0.22], tail: [0.12, 0.72], cape: [0.48, 0.52, 0.14, 0.64], paws: [[0.2, 0.74, 0.68, 0.84]] },
  'sprite-cat-lick': { head: [0.64, 0.31, 0.34, 0], neck: [0.6, 0.62, 0.22], tail: [0.16, 0.3], cape: [0.55, 0.62, 0.22, 0.68], paws: [[0.2, 0.79, 0.64, 0.87]] },
  'sprite-cat-stretch': { head: [0.64, 0.41, 0.36, 0.05], neck: [0.56, 0.72, 0.2], tail: [0.2, 0.3], cape: [0.42, 0.5, 0.12, 0.45], paws: [[0.08, 0.78, 0.32, 0.87], [0.68, 0.78, 0.92, 0.87]] },
  'sprite-cat-tail': { head: [0.67, 0.28, 0.38, -0.1], neck: [0.65, 0.6, 0.22], tail: [0.15, 0.3], cape: [0.5, 0.52, 0.2, 0.62], paws: [[0.19, 0.8, 0.68, 0.88]] },
  'sprite-cat-happy': { head: [0.73, 0.32, 0.34, 0], neck: [0.7, 0.7, 0.22], tail: [0.25, 0.36], cape: [0.55, 0.57, 0.22, 0.65], paws: [[0.25, 0.8, 0.85, 0.96]] },
  // 생선왕은 왕관이 있으니 모자를 씌우지 않는다
  'sprite-cat-king': { neck: [0.63, 0.72, 0.24], tail: [0.24, 0.37], cape: [0.58, 0.62, 0.25, 0.72], paws: [[0.2, 0.88, 0.74, 0.99]] },
};

// 양말 색 (단계별). stripe: 흰 줄무늬
export const SOCKS = { feet1: ['#9fd3ff'], feet2: ['#ff7a7a', true], feet3: ['#ffb3d1'], feet4: ['#c9b8ff', true], feet5: ['#ffd34d'] };

const OUT = '#2a1f2e';
const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

// 원래(회색) 그림에서 하얀 발 픽셀을 찾아 둔다 → 털색을 바꾼 뒤 양말 색으로 칠한다
export function sockMask(d, W, H, name) {
  const P = POSE[name];
  if (!P || !P.paws.length) return null;
  const m = new Float32Array(W * H);
  for (const [a, b, e, f] of P.paws) {
    for (let y = Math.floor(b * H); y < Math.min(H, Math.ceil(f * H)); y++) for (let x = Math.floor(a * W); x < Math.min(W, Math.ceil(e * W)); x++) {
      const i = (y * W + x) * 4;
      if (d[i + 3] < 8) continue;
      const r = d[i], g = d[i + 1], bl = d[i + 2], mx = Math.max(r, g, bl), mn = Math.min(r, g, bl);
      const lum = (0.299 * r + 0.587 * g + 0.114 * bl) / 255;
      if (lum > 0.62 && (mx ? (mx - mn) / mx : 0) < 0.25) m[y * W + x] = Math.min(1.12, lum / 0.88);
    }
  }
  return m;
}
export function paintSocks(d, W, m, id) {
  const [hex, stripe] = SOCKS[id] || SOCKS.feet1;
  const c = rgb(hex);
  for (let p = 0; p < m.length; p++) {
    const k = m[p];
    if (!k) continue;
    const y = (p / W) | 0, white = stripe && (y >> 2) % 2 === 0;
    const col = white ? [250, 248, 244] : c, i = p * 4;
    d[i] = Math.min(255, col[0] * k); d[i + 1] = Math.min(255, col[1] * k); d[i + 2] = Math.min(255, col[2] * k);
  }
}

// ───── 코드 그림 ─────
function line(c, lw) { c.lineWidth = lw; c.strokeStyle = OUT; c.lineJoin = 'round'; c.lineCap = 'round'; }
function fs(c, fill, lw) { c.fillStyle = fill; c.fill(); line(c, lw); c.stroke(); }
function star(c, x, y, r, fill, lw) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); fs(c, fill, lw);
}

// 모자: (0,0) = 머리 꼭대기, s = 머리 너비
function hat(c, id, s, lw) {
  if (id === 'head1') { // 털모자
    c.beginPath(); c.ellipse(0, -s * 0.02, s * 0.44, s * 0.36, 0, Math.PI, 0); c.closePath(); fs(c, '#6fb7ff', lw);
    c.beginPath(); c.roundRect(-s * 0.47, -s * 0.06, s * 0.94, s * 0.13, s * 0.06); fs(c, '#fffbe8', lw);
    c.beginPath(); c.arc(0, -s * 0.4, s * 0.09, 0, 7); fs(c, '#fffbe8', lw);
  } else if (id === 'head2') { // 도둑 두건
    c.beginPath(); c.ellipse(0, 0, s * 0.46, s * 0.3, 0, Math.PI, 0); c.closePath(); fs(c, '#4a3f86', lw);
    c.beginPath(); c.moveTo(-s * 0.42, -s * 0.06); c.lineTo(-s * 0.68, -s * 0.2); c.lineTo(-s * 0.62, s * 0.06); c.closePath(); fs(c, '#4a3f86', lw);
    c.fillStyle = '#fffbe8';
    for (const [x, y] of [[-0.22, -0.14], [0.05, -0.2], [0.26, -0.1], [-0.05, -0.06]]) { c.beginPath(); c.arc(x * s, y * s, s * 0.035, 0, 7); c.fill(); }
  } else if (id === 'head3') { // 탐정 모자
    c.beginPath(); c.ellipse(0, 0, s * 0.6, s * 0.11, 0, 0, 7); fs(c, '#8a6a42', lw);
    c.beginPath(); c.ellipse(0, -s * 0.04, s * 0.38, s * 0.34, 0, Math.PI, 0); c.closePath(); fs(c, '#b08a5a', lw);
    c.beginPath(); c.rect(-s * 0.37, -s * 0.12, s * 0.74, s * 0.08); fs(c, '#5b3f22', lw * 0.6);
  } else if (id === 'head4') { // 마법사 모자
    c.beginPath(); c.moveTo(-s * 0.36, 0); c.quadraticCurveTo(-s * 0.1, -s * 0.4, -s * 0.22, -s * 0.78); c.quadraticCurveTo(s * 0.12, -s * 0.36, s * 0.36, 0); c.closePath(); fs(c, '#7a5cff', lw);
    c.beginPath(); c.ellipse(0, 0, s * 0.56, s * 0.11, 0, 0, 7); fs(c, '#6347d6', lw);
    star(c, s * 0.02, -s * 0.24, s * 0.1, '#ffd34d', lw * 0.6);
  } else { // 밤도둑 베레모
    c.save(); c.rotate(-0.18);
    c.beginPath(); c.ellipse(-s * 0.06, -s * 0.1, s * 0.5, s * 0.2, 0, 0, 7); fs(c, '#2b2350', lw);
    c.beginPath(); c.moveTo(-s * 0.06, -s * 0.3); c.lineTo(-s * 0.04, -s * 0.4); line(c, lw); c.stroke();
    star(c, s * 0.24, -s * 0.1, s * 0.07, '#ffd34d', lw * 0.5);
    c.restore();
  }
}
// 목걸이: (0,0) = 목, w = 너비
function neck(c, id, w, lw) {
  const col = { neck1: '#ff5d6c', neck2: '#ff8fc0', neck3: '#6fb7ff', neck4: '#9a7bff', neck5: '#2f3474' }[id];
  c.beginPath(); c.moveTo(-w / 2, -w * 0.12); c.quadraticCurveTo(0, w * 0.22, w / 2, -w * 0.12);
  line(c, lw * 3.2); c.stroke(); c.strokeStyle = col; c.lineWidth = lw * 1.6; c.stroke();
  const py = w * 0.12, r = w * 0.13;
  if (id === 'neck1') { c.beginPath(); c.arc(0, py + r * 0.4, r * 0.7, 0, 7); fs(c, '#d9dde8', lw); }
  else if (id === 'neck2') {
    c.beginPath(); c.moveTo(0, py); c.lineTo(-r * 1.3, py - r * 0.8); c.lineTo(-r * 1.3, py + r * 0.8); c.closePath(); fs(c, '#ff5fa2', lw);
    c.beginPath(); c.moveTo(0, py); c.lineTo(r * 1.3, py - r * 0.8); c.lineTo(r * 1.3, py + r * 0.8); c.closePath(); fs(c, '#ff5fa2', lw);
    c.beginPath(); c.arc(0, py, r * 0.4, 0, 7); fs(c, '#ffd6ea', lw);
  } else if (id === 'neck3') {
    c.beginPath(); c.moveTo(0, py + r * 1.2); c.arc(0, py + r * 1.2, r * 1.2, -Math.PI * 0.85, -Math.PI * 0.15); c.closePath(); fs(c, '#ffd6c4', lw);
  } else if (id === 'neck4') star(c, 0, py + r * 0.6, r * 1.15, '#ffd34d', lw);
  else {
    c.beginPath(); c.arc(0, py + r * 0.6, r * 1.1, Math.PI * 0.3, Math.PI * 1.7); c.arc(r * 0.5, py + r * 0.4, r * 0.85, Math.PI * 1.55, Math.PI * 0.45, true); c.closePath(); fs(c, '#ffd34d', lw);
  }
}
// 꼬리 장식: (0,0) = 꼬리 끝, u = 크기
function tail(c, id, u, lw) {
  if (id === 'tail1' || id === 'tail2') {
    const col = id === 'tail1' ? '#ff5d6c' : '#ffd34d';
    if (id === 'tail2') { c.beginPath(); c.roundRect(-u * 0.5, -u * 0.3, u, u * 0.6, u * 0.2); fs(c, col, lw); c.beginPath(); c.rect(-u * 0.12, -u * 0.3, u * 0.24, u * 0.6); fs(c, '#6fb7ff', lw * 0.6); return; }
    c.beginPath(); c.moveTo(0, 0); c.lineTo(-u * 0.7, -u * 0.45); c.lineTo(-u * 0.7, u * 0.45); c.closePath(); fs(c, col, lw);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(u * 0.7, -u * 0.45); c.lineTo(u * 0.7, u * 0.45); c.closePath(); fs(c, col, lw);
    c.beginPath(); c.arc(0, 0, u * 0.18, 0, 7); fs(c, '#ffd6ea', lw);
  } else if (id === 'tail3') {
    c.save(); c.rotate(-0.6);
    c.beginPath(); c.ellipse(0, -u * 0.5, u * 0.28, u * 0.62, 0, 0, 7); fs(c, '#5fd3c4', lw);
    c.beginPath(); c.moveTo(0, u * 0.1); c.lineTo(0, -u * 1.0); line(c, lw * 0.7); c.stroke();
    c.restore();
  } else if (id === 'tail4') {
    c.beginPath(); c.ellipse(0, 0, u * 0.5, u * 0.3, 0, 0, 7); fs(c, '#ffd34d', lw);
    c.beginPath(); c.moveTo(-u * 0.12, -u * 0.22); c.lineTo(u * 0.08, -u * 0.02); c.lineTo(-u * 0.06, u * 0.02); c.lineTo(u * 0.12, u * 0.22); line(c, lw * 0.8); c.stroke();
  } else {
    c.strokeStyle = '#fff2a8'; c.lineWidth = lw * 1.2; c.lineCap = 'round';
    for (const k of [-0.3, 0, 0.3]) { c.beginPath(); c.moveTo(u * 0.2, k * u); c.lineTo(u * 1.1, k * u * 1.6); c.stroke(); }
    star(c, 0, 0, u * 0.6, '#ffd34d', lw);
  }
}
// 망토: 어깨 S → 엉덩이 R
function cape(c, id, S, R, W, lw) {
  const col = { body1: '#6fbf73', body2: '#8a5a3c', body3: '#3b3355', body4: '#2f3474', body5: '#1d1736' }[id];
  const dep = (id === 'body1' ? 0.08 : 0.15) * W;
  const mx = (S[0] + R[0]) / 2, my = Math.min(S[1], R[1]) - 0.05 * W;
  c.beginPath();
  c.moveTo(S[0], S[1]);
  c.quadraticCurveTo(mx, my, R[0], R[1]);
  c.lineTo(R[0] - 0.03 * W, R[1] + dep);
  const n = 3;
  for (let i = 1; i <= n; i++) {
    const t = i / n, x = R[0] - 0.03 * W + (S[0] - R[0] + 0.03 * W) * t, y = R[1] + dep + (S[1] + dep * 0.45 - R[1] - dep) * t;
    c.quadraticCurveTo(x - (S[0] - R[0]) / n / 2, y + 0.035 * W, x, y);
  }
  c.closePath(); fs(c, col, lw);
  if (id === 'body4' || id === 'body5') {
    for (const [t, k] of [[0.3, 0.45], [0.55, 0.7], [0.75, 0.4]]) star(c, R[0] + (S[0] - R[0]) * t, my + 0.04 * W + dep * k, 0.022 * W, '#ffe45c', lw * 0.4);
  }
  if (id === 'body5') { c.beginPath(); c.moveTo(S[0], S[1]); c.quadraticCurveTo(mx, my, R[0], R[1]); c.strokeStyle = '#ffd34d'; c.lineWidth = lw * 1.1; c.stroke(); }
  c.beginPath(); c.arc(S[0], S[1] + 0.01 * W, 0.028 * W, 0, 7); fs(c, '#ffd34d', lw * 0.7);
}

// 그림 파일이 있으면 그 그림을 쓴다 (모자: 아래쪽 가운데가 머리 꼭대기 / 목걸이·꼬리: 가운데 / 망토: 오른쪽 위가 어깨)
function art(c, im, x, y, w, ax, ay, rot = 0) {
  const h = (w * im.naturalHeight) / im.naturalWidth;
  c.save(); c.translate(x, y); c.rotate(rot); c.drawImage(im, -w * ax, -h * ay, w, h); c.restore();
}

// 고양이 그림(c, W×H) 위에 장비를 그린다. on = { head: 'head2', ... }
export function drawWear(c, name, W, H, on, IMG) {
  const P = POSE[name];
  if (!P || !on) return;
  const lw = W * 0.014;
  const im = (id) => id && IMG['gear-' + id];
  if (on.body && P.cape) {
    const [sx, sy, rx, ry] = P.cape, S = [sx * W, sy * H], R = [rx * W, ry * H];
    const pic = im(on.body);
    if (pic) {
      // 망토 그림: 오른쪽 위 목깃 가운데(0.8, 0.22) → 왼쪽 끝(0.06, 0.62)이 어깨 → 엉덩이 선에 오게 늘이고 돌린다
      const ar = pic.naturalHeight / pic.naturalWidth, vx = -0.74, vy = 0.4 * ar;
      const w = Math.hypot(R[0] - S[0], R[1] - S[1]) / Math.hypot(vx, vy);
      art(c, pic, S[0], S[1], w, 0.8, 0.22, Math.atan2(R[1] - S[1], R[0] - S[0]) - Math.atan2(vy, vx));
    }
    else cape(c, on.body, S, R, W, lw);
  }
  if (on.tail && P.tail) {
    const [x, y] = P.tail, pic = im(on.tail);
    if (pic) art(c, pic, x * W, y * H, W * 0.2, 0.5, 0.5);
    else { c.save(); c.translate(x * W, y * H); tail(c, on.tail, W * 0.1, lw); c.restore(); }
  }
  if (on.neck && P.neck) {
    const [x, y, w] = P.neck, pic = im(on.neck);
    if (pic) art(c, pic, x * W, y * H, w * W * 1.15, 0.5, 0.4);
    else { c.save(); c.translate(x * W, y * H); neck(c, on.neck, w * W, lw); c.restore(); }
  }
  if (on.head && P.head) {
    const [x, y, s, rot] = P.head, pic = im(on.head);
    if (pic) art(c, pic, x * W, y * H + s * W * 0.06, s * W * 1.15, 0.5, 0.92, rot);
    else { c.save(); c.translate(x * W, y * H); c.rotate(rot); hat(c, on.head, s * W, lw); c.restore(); }
  }
}
