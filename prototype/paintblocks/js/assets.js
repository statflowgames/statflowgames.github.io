// 그림 불러오기 (img/*.webp — tools/optimize.py 가 assets/*.png 에서 만든다).
// 그림이 없거나 못 불러오면 IMG 에 빠진 채로 두고, 그리는 쪽이 코드 그림으로 대신한다.
const V = new URL(import.meta.url).search;

export const CELL = { 1: 'cell-red', 2: 'cell-yellow', 4: 'cell-blue', 3: 'cell-orange', 6: 'cell-green', 5: 'cell-purple', 7: 'cell-brown' };
const NAMES = [
  ...Object.values(CELL), 'hole', 'board-frame', 'target-frame',
];
export const IMG = {};
export const imgUrl = name => `img/${name}.webp${V}`;

export function loadAll() {
  return Promise.all(NAMES.map(n => new Promise(res => {
    const im = new Image();
    im.onload = () => { IMG[n] = im; res(); };
    im.onerror = () => res();
    im.src = imgUrl(n);
  })));
}

// 9칸 나눠 늘이기: 모서리는 그대로, 변은 늘인다. b = 그림의 테두리 두께(px), t = 화면에 그릴 두께
export function nine(ctx, im, b, x, y, w, h, t) {
  const sx = [0, b, im.width - b, im.width], sy = [0, b, im.height - b, im.height];
  const dx = [x, x + t, x + w - t, x + w], dy = [y, y + t, y + h - t, y + h];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    if (i === 1 && j === 1) continue;
    ctx.drawImage(im, sx[i], sy[j], sx[i + 1] - sx[i], sy[j + 1] - sy[j], dx[i], dy[j], dx[i + 1] - dx[i], dy[j + 1] - dy[j]);
  }
}
