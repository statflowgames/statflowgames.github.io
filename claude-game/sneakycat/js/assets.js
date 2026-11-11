// 그림 파일 불러오기 + 고양이 색 바꾸기. 파일이 없으면 null 을 돌려주고, 그 자리는 코드 그림이 대신한다.
const NAMES = ['title', 'chapter-1', 'chapter-2', 'chapter-3', 'win', 'caught', 'legend',
  'sprite-cat', 'sprite-cat-fish',
  'sprite-owner', 'sprite-owner-side', 'sprite-owner-back', 'sprite-owner-alert',
  'sprite-butler', 'sprite-butler-side', 'sprite-butler-back', 'sprite-butler-alert',
  'sprite-guard', 'sprite-guard-side', 'sprite-guard-back', 'sprite-guard-alert',
  'sprite-dog', 'sprite-dog-sleep',
  'chapter-4', 'chapter-5', 'chapter-6', 'chapter-7', 'chapter-8', 'chapter-9',
  'ending-1', 'ending-2', 'ending-3', 'ending-4', 'ending-bg', 'sprite-cat-king',
  ...['fishmonger', 'chef', 'keeper', 'robot', 'knight'].flatMap((n) => ['', '-side', '-back', '-alert'].map((p) => `sprite-${n}${p}`))];
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
// 외곽선·복면(어두움), 눈·코·생선(채도 높음), 하이라이트(아주 흰색)는 그대로 둔다.
function recolor(d, skin, golden) {
  const st = rgb(skin.stripe), bo = rgb(skin.body), be = rgb(skin.belly);
  const doSkin = skin.id !== 'gray';
  const gold = [[224, 154, 18], [255, 212, 71], [255, 243, 176]];
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
    } else if (doSkin && sat < 0.22 && lum > 0.22 && lum < 0.955) {
      const base = mix(mix(st, bo, sm(0.42, 0.5, lum)), be, sm(0.72, 0.82, lum));
      const ref = lum < 0.46 ? 0.38 : lum < 0.77 ? 0.55 : 0.9;
      const k = Math.min(1.35, lum / ref);
      out = [base[0] * k, base[1] * k, base[2] * k];
    }
    if (out) { d[i] = Math.min(255, out[0]); d[i + 1] = Math.min(255, out[1]); d[i + 2] = Math.min(255, out[2]); }
  }
}

const cache = new Map();
// 그림 + 실제 그려진 영역(bbox). skin 을 주면 고양이 털색을 바꾼다.
export function sprite(name, skin = null, golden = false) {
  const key = `${name}|${skin ? skin.id : ''}|${golden ? 1 : 0}`;
  if (cache.has(key)) return cache.get(key);
  const im = IMG[name];
  if (!im) return null;
  const cv = document.createElement('canvas');
  cv.width = im.naturalWidth; cv.height = im.naturalHeight;
  const c = cv.getContext('2d', { willReadFrequently: true });
  c.drawImage(im, 0, 0);
  const data = c.getImageData(0, 0, cv.width, cv.height);
  const d = data.data;
  if ((skin && skin.id !== 'gray') || golden) { recolor(d, skin || { id: 'gray' }, golden); c.putImageData(data, 0, 0); }
  let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0;
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
    if (d[(y * cv.width + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const s = { cv, bx: x0, by: y0, bw: x1 - x0 + 1, bh: y1 - y0 + 1 };
  cache.set(key, s);
  return s;
}
const urlCache = new Map();
export function spriteURL(name, skin, golden) {
  const key = `${name}|${skin ? skin.id : ''}|${golden ? 1 : 0}`;
  if (!urlCache.has(key)) {
    const s = sprite(name, skin, golden);
    urlCache.set(key, s ? s.cv.toDataURL('image/png') : null);
  }
  return urlCache.get(key);
}
