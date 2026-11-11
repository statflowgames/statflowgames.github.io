// 등장인물·물건 소개 (도감). 장 시작 화면과 스테이지 시작 카드에서 쓴다.
import { LEVELS, CHAPTERS } from './levels.js?v=1111102508';
import { drawHuman, drawDog, drawRoomba, drawFish, drawBonus, drawVase, drawSwitch, drawCatPeek, ell, rr, OUT } from './art.js?v=1111102508';
import { sprite } from './assets.js?v=1111102508';

const has = (L, chars) => L.map.some((row) => [...chars].some((k) => row.includes(k)));
const guard = (L, t, sleep = false) => L.guards.some((g) => g.t === t && !!g.sleep === sleep);

// kind: who = 등장인물, item = 물건·장치. in(L) = 이 스테이지에 나오는가
export const GUIDE = [
  { id: 'owner', kind: 'who', name: '잠옷 집사', in: (L) => guard(L, 'owner'),
    desc: '느릿느릿 집 안을 순찰해요. 손전등 불빛(노란 부채꼴)에 오래 비치면 들켜요.' },
  { id: 'sleeper', kind: 'who', name: '잠든 식구', in: (L) => L.guards.some((g) => g.sleep),
    desc: 'Zz 하고 자는 중. 옆을 지나가도 괜찮지만, 가까이서 소리가 나면 깨서 둘러봐요.' },
  { id: 'dog', kind: 'who', name: '강아지', in: (L) => guard(L, 'dog'),
    desc: '빠르고 넓게 봐요. 코가 좋아서 등 뒤로 바짝 붙어도 들켜요. 쫓을 땐 짖어서 사람을 불러요.' },
  { id: 'butler', kind: 'who', name: '정장 집사', in: (L) => guard(L, 'butler'),
    desc: '잠옷 집사보다 조금 빠르고 더 멀리 봐요. 둘이서 엇갈려 다니기도 해요.' },
  { id: 'guard', kind: 'who', name: '경비원', in: (L) => guard(L, 'guard'),
    desc: '손전등이 제일 멀리 닿아요. 대신 불빛 폭은 좁으니 옆으로 비켜 가요.' },

  { id: 'fish', kind: 'item', name: '생선', in: (L) => !L.golden,
    desc: '오늘의 목표! 물고 고양이 문으로 돌아오면 성공이에요.' },
  { id: 'gold', kind: 'item', name: '황금 생선', in: (L) => !!L.golden,
    desc: '전설의 생선. 이걸 훔치면 모든 스테이지 클리어!' },
  { id: 'yarn', kind: 'item', name: '털실 뭉치', in: (L) => L.ch === 1,
    desc: '1장 보너스 보물. 스테이지마다 2개, 다 챙기면 별 하나.' },
  { id: 'tuna', kind: 'item', name: '황금 참치캔', in: (L) => L.ch === 2,
    desc: '2장 보너스 보물. 스테이지마다 2개, 다 챙기면 별 하나.' },
  { id: 'gem', kind: 'item', name: '보석', in: (L) => L.ch === 3,
    desc: '3장 보너스 보물. 스테이지마다 2개, 다 챙기면 별 하나.' },
  { id: 'door', kind: 'item', name: '고양이 문', in: () => true,
    desc: '들어온 곳이자 나가는 곳. 문 안에 있으면 들키지 않아요.' },
  { id: 'hide', kind: 'item', name: '숨는 곳', in: (L) => has(L, 'TDB'),
    desc: '탁자·침대·상자 밑은 고양이만 들어가요. 안에 있으면 불빛에 비춰도 안 보여요.' },
  { id: 'vase', kind: 'item', name: '꽃병', in: (L) => has(L, 'v'),
    desc: '옆에서 "넘어뜨리기"를 누르면 쨍그랑! 큰 소리로 경비를 그쪽으로 끌어내요.' },
  { id: 'creak', kind: 'item', name: '삐걱 마루', in: (L) => has(L, '%'),
    desc: '금 간 마룻바닥. 살금살금 걸어도 삐걱 소리가 나서 근처 경비가 들어요.' },
  { id: 'roomba', kind: 'item', name: '로봇청소기', in: (L) => has(L, 'r'),
    desc: '옆에서 "타기". 타고 있는 동안은 아무도 못 보고 레이저도 안 걸려요.' },
  { id: 'vent', kind: 'item', name: '환풍구', in: (L) => has(L, 'V'),
    desc: '위에서 "환풍구"를 누르면 이어진 다른 환풍구로 쏙! 안에선 숨은 상태예요.' },
  { id: 'camera', kind: 'item', name: '감시 카메라', in: (L) => has(L, 'c'),
    desc: '고개를 좌우로 돌려요. 파란 불빛에 오래 비치면 경보가 울려 경비가 몰려와요.' },
  { id: 'laser', kind: 'item', name: '레이저', in: (L) => has(L, '=!'),
    desc: '켜졌다 꺼졌다 깜빡여요. 빨간 줄이 꺼진 틈에 지나가요. 닿으면 경보!' },
  { id: 'switch', kind: 'item', name: '보안 전원', in: (L) => has(L, 's'),
    desc: '옆에서 "전원 끄기"를 누르면 카메라와 레이저가 한꺼번에 꺼져요.' },
];
const byId = Object.fromEntries(GUIDE.map((e) => [e.id, e]));
export const entry = (id) => byId[id];

// 스테이지별 등장 목록과 처음 나오는 것
export const inLevel = (L) => GUIDE.filter((e) => e.in(L));
const firstAt = {};
LEVELS.forEach((L, i) => { for (const e of inLevel(L)) if (!(e.id in firstAt)) firstAt[e.id] = i; });
export const newInLevel = (i) => inLevel(LEVELS[i]).filter((e) => firstAt[e.id] === i);
export const inChapter = (ch) => GUIDE.filter((e) => LEVELS.some((L) => L.ch === ch && e.in(L)));
export const newInChapter = (ch) => new Set(inChapter(ch).filter((e) => LEVELS[firstAt[e.id]].ch === ch).map((e) => e.id));
export const firstOfChapter = (i) => LEVELS[i].ch !== (LEVELS[i - 1] || {}).ch;
export { CHAPTERS };

// ───────── 아이콘 ─────────
function draw(w, h, fn) {
  const cv = document.createElement('canvas');
  cv.width = w * 2; cv.height = h * 2;
  const c = cv.getContext('2d'); c.scale(2, 2); c.lineJoin = 'round'; c.lineCap = 'round'; fn(c);
  return cv.toDataURL();
}
const S = 48;
const DRAW = {
  owner: (c) => { c.translate(24, 44); c.scale(1.35, 1.35); drawHuman(c, { type: 'owner', face: Math.PI / 2, t: 0 }); },
  butler: (c) => { c.translate(24, 44); c.scale(1.35, 1.35); drawHuman(c, { type: 'butler', face: Math.PI / 2, t: 0 }); },
  guard: (c) => { c.translate(24, 44); c.scale(1.35, 1.35); drawHuman(c, { type: 'guard', face: Math.PI / 2, t: 0 }); },
  dog: (c) => { c.translate(24, 38); c.scale(1.4, 1.4); drawDog(c, { face: 0, t: 0, ch: 2 }); },
  sleeper: (c) => { c.translate(24, 38); c.scale(1.4, 1.4); drawDog(c, { face: 0, t: 0, ch: 1, sleep: true }); },
  fish: (c) => drawFish(c, 24, 24, 1.6, false),
  gold: (c) => drawFish(c, 24, 24, 1.6, true),
  yarn: (c) => { c.translate(24, 34); c.scale(1.6, 1.6); drawBonus(c, 'yarn', 0); },
  tuna: (c) => { c.translate(24, 34); c.scale(1.6, 1.6); drawBonus(c, 'tuna', 0); },
  gem: (c) => { c.translate(24, 34); c.scale(1.6, 1.6); drawBonus(c, 'gem', 0); },
  vase: (c) => { c.translate(24, 45); c.scale(1.5, 1.5); drawVase(c, false, 0); },
  switch: (c) => { c.translate(24, 52); c.scale(1.6, 1.6); drawSwitch(c, true, 0); },
  roomba: (c) => { c.translate(24, 30); c.scale(1.6, 1.6); drawRoomba(c, { ang: 0.4 }, 0.2); },
  door: (c) => {
    c.fillStyle = '#3b2f45'; c.fillRect(2, 8, 44, 34);
    c.fillStyle = '#b9806a'; c.fillRect(2, 22, 44, 20);
    rr(c, 13, 18, 22, 24, 9); c.fillStyle = '#2a1f2e'; c.fill();
    rr(c, 15, 20, 18, 21, 7); c.fillStyle = '#ffd56a'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = OUT; c.stroke();
    ell(c, 24, 31, 3, 3, '#e0a43a');
  },
  hide: (c) => {
    c.save(); c.translate(24, 36); c.scale(1.5, 1.5);
    drawCatPeek(c, { skin: { body: '#8f8b99', eye: '#9be86a' }, t: 0, face: 1 });
    c.restore();
    rr(c, 8, 26, 32, 18, 3); c.fillStyle = '#c99257'; c.fill(); c.lineWidth = 1.8; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = '#e2b07a'; c.fillRect(10, 27, 28, 4);
    c.strokeStyle = '#8a5a32'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(24, 31); c.lineTo(24, 43); c.stroke();
  },
  creak: (c) => {
    for (let r = 0; r < 3; r++) {
      c.save(); c.translate(24, 12 + r * 12); c.rotate((r - 1) * 0.06);
      c.fillStyle = r % 2 ? '#c99566' : '#bb8657'; c.fillRect(-20, -5, 40, 10);
      c.strokeStyle = 'rgba(42,31,46,0.6)'; c.lineWidth = 1; c.strokeRect(-20, -5, 40, 10);
      c.restore();
    }
    c.strokeStyle = '#5a3a22'; c.lineWidth = 2; c.beginPath();
    c.moveTo(10, 12); c.lineTo(20, 20); c.lineTo(17, 28); c.lineTo(28, 36); c.stroke();
    c.fillStyle = '#fff2d8'; c.font = '14px sans-serif'; c.textAlign = 'center'; c.fillText('~', 36, 22);
  },
  vent: (c) => {
    rr(c, 6, 6, 36, 36, 5); c.fillStyle = '#20232e'; c.fill(); c.lineWidth = 2.4; c.strokeStyle = '#8f98ad'; c.stroke();
    c.strokeStyle = '#6c7489'; c.lineWidth = 3;
    for (let i = 1; i < 5; i++) { const y = 6 + i * 7.2; c.beginPath(); c.moveTo(11, y); c.lineTo(37, y); c.stroke(); }
    c.fillStyle = '#b9c1d3';
    for (const [x, y] of [[10, 10], [38, 10], [10, 38], [38, 38]]) { c.beginPath(); c.arc(x, y, 1.8, 0, 7); c.fill(); }
  },
  camera: (c) => {
    c.save(); c.translate(24, 24);
    c.beginPath(); c.moveTo(4, 0); c.arc(4, 0, 22, -0.42, 0.42); c.closePath(); c.fillStyle = 'rgba(140,200,255,0.35)'; c.fill();
    rr(c, -18, -6, 8, 12, 2); c.fillStyle = '#4a5068'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.4; c.stroke();
    rr(c, -12, -7, 20, 14, 3); c.fillStyle = '#d9dde6'; c.fill(); c.stroke();
    ell(c, 9, 0, 3.6, 4.6, '#1c2030', OUT, 1.4);
    ell(c, -7, -3, 2, 2, '#ff3b4f');
    c.restore();
  },
  laser: (c) => {
    for (const x of [6, 42]) { rr(c, x - 4, 14, 8, 20, 2); c.fillStyle = '#4a5068'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.4; c.stroke(); ell(c, x, 24, 2, 2, '#ff3b4f'); }
    c.strokeStyle = 'rgba(255,60,80,0.35)'; c.lineWidth = 6; c.beginPath(); c.moveTo(8, 24); c.lineTo(40, 24); c.stroke();
    c.strokeStyle = '#ff5266'; c.lineWidth = 2; c.stroke();
  },
};
const SPRITE = { owner: 'sprite-owner', butler: 'sprite-butler', guard: 'sprite-guard', dog: 'sprite-dog', sleeper: 'sprite-dog-sleep' };
const iconCache = {};
// 그림 파일이 있으면 그려진 부분만 잘라 정사각형 아이콘으로
function cropIcon(name) {
  const s = SPRITE[name] && sprite(SPRITE[name]);
  if (!s) return null;
  const side = Math.max(s.bw, s.bh) * 1.06, cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const k = 128 / side, c = cv.getContext('2d');
  c.drawImage(s.cv, s.bx, s.by, s.bw, s.bh, (128 - s.bw * k) / 2, (128 - s.bh * k) / 2, s.bw * k, s.bh * k);
  return cv.toDataURL();
}
export function guideIcon(id) {
  if (!iconCache[id]) iconCache[id] = cropIcon(id) || draw(S, S, DRAW[id]);
  return iconCache[id];
}
