// 그림 파일 불러오기 + 고양이 색 바꾸기. 파일이 없으면 null 을 돌려주고, 그 자리는 코드 그림이 대신한다.
import { drawWear, sockMask, paintSocks } from './wear.js?v=1122001644';
const NAMES = ['title', 'chapter-1', 'chapter-2', 'chapter-3', 'win', 'caught', 'legend',
  'sprite-cat', 'sprite-cat-fish', 'sprite-cat-run', 'sprite-cat-peek',
  'sprite-owner', 'sprite-owner-side', 'sprite-owner-back', 'sprite-owner-alert',
  'sprite-butler', 'sprite-butler-side', 'sprite-butler-back', 'sprite-butler-alert',
  'sprite-guard', 'sprite-guard-side', 'sprite-guard-back', 'sprite-guard-alert',
  'sprite-dog', 'sprite-dog-sleep',
  'chapter-4', 'chapter-5', 'chapter-6', 'chapter-7', 'chapter-8', 'chapter-9',
  'ending-1', 'ending-2', 'ending-3', 'ending-4', 'ending-bg', 'sprite-cat-king',
  ...['fishmonger', 'chef', 'keeper', 'robot', 'knight'].flatMap((n) => ['', '-side', '-back', '-alert'].map((p) => `sprite-${n}${p}`)),
  ...['fish', 'fish-gold', 'yarn', 'tuna', 'gem', 'shrimp', 'sushi', 'bell', 'cotton', 'battery', 'crown',
    'box', 'vase', 'vase-broken', 'roomba', 'camera', 'switch-on', 'switch-off', 'vent', 'cart', 'carousel', 'plate']
    .map((n) => `item-${n}`),
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => `clear-${i}`),
  ...['yawn', 'groom', 'loaf', 'crouch', 'scared', 'happy', 'happy-pet', 'sad', 'lick', 'stretch', 'tail'].map((n) => `sprite-cat-${n}`),
  ...['pot', 'basket', 'frame', 'lights', 'cushion'].map((n) => `deco-${n}`), 'item-gift',
  ...['eye', 'meow', 'paw', 'vent', 'ride', 'cart', 'carousel', 'unride', 'vase', 'switch', 'map-b', 'meow-b', 'paw-b'].map((n) => `ui-${n}`),
  ...['feet', 'body', 'neck', 'tail', 'head'].flatMap((s) => [1, 2, 3, 4, 5].map((i) => `gear-${s}${i}`)), 'den-bg'];
export const IMG = {};

export function loadAll(timeout = 3000) {
  const all = Promise.all(NAMES.map((n) => new Promise((res) => {
    const im = new Image();
    im.onload = () => { IMG[n] = im; res(); };
    im.onerror = () => res();
    im.src = `img/${n}.webp`;
  })));
  return Promise.race([all, new Promise((r) => setTimeout(r, timeout))]);
}

const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sm = (e0, e1, x) => Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));

// 회색 고양이 그림의 밝기 띠 (줄무늬 ~0.38, 몸 ~0.55, 배 ~0.9) 를 고른 털색으로 바꾼다.
// 외곽선·복면(어두움), 코·생선(채도 높음), 하이라이트(아주 흰색)는 그대로 둔다.
// box 가 있으면(고양이 그림) 눈 색, 삼색 얼룩, 샴 고양이 끝 색까지 칠한다.
const hash = (x, y, sd) => { let h = (x * 374761393 + y * 668265263 + sd * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function noise(x, y, sd) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi, sd), b = hash(xi + 1, yi, sd), c = hash(xi, yi + 1, sd), e = hash(xi + 1, yi + 1, sd);
  return a + (b - a) * u + (c - a) * v + (a - b - c + e) * u * v;
}
const EYE_REF = 0.81; // 원래 초록 눈동자 밝기
function recolor(d, skin, golden, box) {
  const st = rgb(skin.stripe), bo = rgb(skin.body), be = rgb(skin.belly);
  const doSkin = skin.id !== 'gray';
  const gold = [[224, 154, 18], [255, 212, 71], [255, 243, 176]];
  const eye = box && doSkin && skin.eye ? rgb(skin.eye) : null;
  const pat = box && skin.patches ? skin.patches.map(rgb) : null;
  const pts = box && skin.points ? rgb(skin.points) : null;
  const bw = box ? Math.max(1, box.x1 - box.x0) : 1, bh = box ? Math.max(1, box.y1 - box.y0) : 1;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const sat = mx ? (mx - mn) / mx : 0;
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    let out = null;
    if (golden && sat > 0.25 && lum > 0.25 && b - r > 50 && b >= g * 0.95) {
      // 파란 생선 → 황금 생선
      out = lum < 0.5 ? mix(gold[0], gold[1], lum / 0.5) : mix(gold[1], gold[2], (lum - 0.5) / 0.5);
    } else if (eye && sat > 0.3 && g > 60 && g > r * 1.12 && g > b * 1.4) {
      // 초록 눈동자 → 털색마다 다른 눈 색
      const k = Math.min(1.3, lum / EYE_REF);
      out = [eye[0] * k, eye[1] * k, eye[2] * k];
    } else if (doSkin && sat < 0.22 && lum > 0.22 && lum < 0.955) {
      let base = mix(mix(st, bo, sm(0.42, 0.5, lum)), be, sm(0.72, 0.82, lum));
      if (box && (pat || pts)) {
        const p = i >> 2, x = p % box.w, y = (p / box.w) | 0;
        const nx = (x - box.x0) / bw, ny = (y - box.y0) / bh;
        // 삼색이: 주황·검정 얼룩. 배와 앞가슴·앞발(오른쪽 아래)은 하얗게 두어
        // 목에 띠를 두른 것처럼 보이지 않게 하고, 검정은 등·꼬리(왼쪽)에만.
        if (pat && lum < 0.77) {
          const n = noise(nx * 3 + 0.5, ny * 3 + 0.5, 3), right = sm(0.38, 0.62, nx);
          if (n - right * sm(0.24, 0.44, ny) * 0.6 > 0.56) base = pat[0];
          else if (n + right * 0.5 < 0.36) base = pat[1];
        }
        if (pts) {
          // 샴: 몸 가운데서 먼 귀·꼬리·발끝을 짙게
          const dist = Math.hypot((nx - 0.5) / 0.5, (ny - 0.58) / 0.5);
          base = mix(base, pts, sm(0.6, 0.95, dist) * (lum < 0.77 ? 1 : 0.75));
        }
      }
      const ref = lum < 0.46 ? 0.38 : lum < 0.77 ? 0.55 : 0.9;
      const k = Math.min(1.35, lum / ref);
      out = [base[0] * k, base[1] * k, base[2] * k];
    }
    if (out) { d[i] = Math.min(255, out[0]); d[i + 1] = Math.min(255, out[1]); d[i + 2] = Math.min(255, out[2]); }
  }
}

const cache = new Map();
// 그림 + 실제 그려진 영역(bbox). skin 을 주면 고양이 털색을 바꾼다.
// on: 입은 장비 { feet, body, neck, tail, head } — 고양이 그림 위에 그려 넣는다
const wearKey = (on) => (on ? ['feet', 'body', 'neck', 'tail', 'head'].map((k) => on[k] || '').join(',') : '');
export function sprite(name, skin = null, golden = false, on = null) {
  if (on && !name.startsWith('sprite-cat')) on = null;
  const key = `${name}|${skin ? skin.id : ''}|${golden ? 1 : 0}|${wearKey(on)}`;
  if (cache.has(key)) return cache.get(key);
  const im = IMG[name];
  if (!im) return null;
  const cv = document.createElement('canvas');
  cv.width = im.naturalWidth; cv.height = im.naturalHeight;
  const c = cv.getContext('2d', { willReadFrequently: true });
  c.drawImage(im, 0, 0);
  const data = c.getImageData(0, 0, cv.width, cv.height);
  const d = data.data;
  let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0;
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
    if (d[(y * cv.width + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const socks = on && on.feet ? sockMask(d, cv.width, cv.height, name) : null;
  if ((skin && skin.id !== 'gray') || golden || socks) {
    const box = name.startsWith('sprite-cat') ? { x0, y0, x1, y1, w: cv.width } : null;
    if ((skin && skin.id !== 'gray') || golden) recolor(d, skin || { id: 'gray' }, golden, box);
    if (socks) paintSocks(d, cv.width, socks, on.feet);
    c.putImageData(data, 0, 0);
  }
  // bx..bh: 고양이 몸 크기(그리는 크기 기준), ox..oh: 장비까지 포함해 실제로 그릴 영역
  const s = { cv, bx: x0, by: y0, bw: x1 - x0 + 1, bh: y1 - y0 + 1, ox: x0, oy: y0, ow: x1 - x0 + 1, oh: y1 - y0 + 1 };
  if (on && (on.body || on.neck || on.tail || on.head)) {
    drawWear(c, name, cv.width, cv.height, on, IMG);
    const e = c.getImageData(0, 0, cv.width, cv.height).data;
    let a0 = cv.width, b0 = cv.height, a1 = 0, b1 = 0;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
      if (e[(y * cv.width + x) * 4 + 3] > 24) { if (x < a0) a0 = x; if (x > a1) a1 = x; if (y < b0) b0 = y; if (y > b1) b1 = y; }
    }
    Object.assign(s, { ox: a0, oy: b0, ow: a1 - a0 + 1, oh: b1 - b0 + 1 });
  }
  cache.set(key, s);
  return s;
}
// 오래 뒤로 가 있던 사이 브라우저가 캔버스 메모리를 비우면 저장해 둔 그림이 투명해진다 → 다시 만들게 비운다
export function resetSprites() { cache.clear(); }
const urlCache = new Map();
export function spriteURL(name, skin, golden, on = null) {
  const key = `${name}|${skin ? skin.id : ''}|${golden ? 1 : 0}|${wearKey(on)}`;
  if (!urlCache.has(key)) {
    const s = sprite(name, skin, golden, on);
    urlCache.set(key, s ? s.cv.toDataURL('image/png') : null);
  }
  return urlCache.get(key);
}
