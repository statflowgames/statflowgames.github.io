// 아래 버튼 아이콘. assets 에 ui-<이름>.png 가 들어오면 그 그림을, 없으면 아래 코드 그림(SVG)을 쓴다.
import { IMG } from './assets.js?v=1115234513';

const L = 'stroke="#2a1f2e" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
const svg = (body) => `<svg viewBox="0 0 48 48" aria-hidden="true">${body}</svg>`;

const SVG = {
  // 크게 뜬 고양이 눈
  eye: svg(`<path d="M3 24 Q24 4 45 24 Q24 44 3 24Z" fill="#fffbe8" ${L}/>
    <circle cx="24" cy="24" r="11" fill="#7fd36b" ${L}/>
    <ellipse cx="24" cy="24" rx="3.2" ry="9" fill="#2a1f2e"/>
    <circle cx="28.5" cy="19" r="2.6" fill="#fff"/>`),
  // 말풍선 + 음표
  meow: svg(`<path d="M10 8 H38 a6 6 0 0 1 6 6 V29 a6 6 0 0 1 -6 6 H22 L13 42 V35 H10 a6 6 0 0 1 -6 -6 V14 a6 6 0 0 1 6 -6Z" fill="#fff" ${L}/>
    <path d="M24 27 V14 L33 17" fill="none" ${L}/>
    <ellipse cx="20.5" cy="27.5" rx="4.2" ry="3.4" fill="#ff5fa2" ${L}/>`),
  // 고양이 발바닥 (할 일이 없을 때)
  paw: svg(`<ellipse cx="24" cy="32" rx="11" ry="9" fill="#ffb3cf" ${L}/>
    <ellipse cx="11" cy="20" rx="4.2" ry="5.2" fill="#ffb3cf" ${L}/>
    <ellipse cx="19" cy="12.5" rx="4.2" ry="5.4" fill="#ffb3cf" ${L}/>
    <ellipse cx="29" cy="12.5" rx="4.2" ry="5.4" fill="#ffb3cf" ${L}/>
    <ellipse cx="37" cy="20" rx="4.2" ry="5.2" fill="#ffb3cf" ${L}/>`),
  // 환풍구
  vent: svg(`<rect x="5" y="7" width="38" height="34" rx="6" fill="#b9c2d6" ${L}/>
    <path d="M12 17 H36 M12 24 H36 M12 31 H36" fill="none" ${L}/>`),
  // 로봇청소기 타기
  ride: svg(`<circle cx="24" cy="26" r="17" fill="#dde1ea" ${L}/>
    <circle cx="24" cy="26" r="8" fill="#9aa3b8" ${L}/>
    <circle cx="24" cy="13.5" r="2.6" fill="#5be37a" stroke="#2a1f2e" stroke-width="2"/>`),
  // 배식 카트 (은색 뚜껑)
  cart: svg(`<path d="M8 33 a16 15 0 0 1 32 0Z" fill="#e2e6ef" ${L}/>
    <rect x="4" y="33" width="40" height="5" rx="2.5" fill="#fffbe8" ${L}/>
    <circle cx="24" cy="15.5" r="3" fill="#e2e6ef" ${L}/>
    <path d="M15 28 a10 9 0 0 1 6 -7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`),
  // 회전목마
  carousel: svg(`<path d="M5 18 L24 5 L43 18Z" fill="#ff8fb8" ${L}/>
    <path d="M24 18 V36" fill="none" ${L}/>
    <path d="M12 18 V30 M36 18 V30" fill="none" stroke="#2a1f2e" stroke-width="2.5"/>
    <ellipse cx="24" cy="39" rx="19" ry="5" fill="#ffd27a" ${L}/>
    <circle cx="24" cy="5" r="2.5" fill="#ffd27a" stroke="#2a1f2e" stroke-width="2"/>`),
  // 내리기
  unride: svg(`<path d="M24 6 V30 M14 21 L24 31 L34 21" fill="none" ${L}/>
    <path d="M8 40 H40" fill="none" ${L}/>`),
  // 꽃병 넘어뜨리기
  vase: svg(`<path d="M17 20 Q11 30 15 40 H33 Q37 30 31 20 V16 H17Z" fill="#8ec5f0" ${L}/>
    <path d="M17 29 H31" fill="none" stroke="#fff" stroke-width="2.5"/>
    <circle cx="18" cy="9" r="4" fill="#ff8fb8" ${L}/>
    <circle cx="30" cy="9" r="4" fill="#ffd27a" ${L}/>`),
  // 보안 전원 끄기
  switch: svg(`<path d="M15 13 A15 15 0 1 0 33 13" fill="none" stroke="#2a1f2e" stroke-width="7" stroke-linecap="round"/>
    <path d="M15 13 A15 15 0 1 0 33 13" fill="none" stroke="#ff5f6d" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M24 5 V23" fill="none" stroke="#2a1f2e" stroke-width="7" stroke-linecap="round"/>
    <path d="M24 5 V23" fill="none" stroke="#ff5f6d" stroke-width="3.5" stroke-linecap="round"/>`),
};

// 행동 버튼 글씨 → 아이콘
const ACT = { '환풍구': 'vent', '타기': 'ride', '카트에 숨기': 'cart', '목마 타기': 'carousel', '내리기': 'unride', '넘어뜨리기': 'vase', '전원 끄기': 'switch' };
export const actIcon = (label) => ACT[label] || 'paw';

// 버튼 B안 그림(전체 보기 = 방 배치도, 야옹 = 입 벌린 복면 고양이, 기본 행동 = 발바닥)이 있으면 그걸 먼저 쓴다
const B = { eye: 'map-b', meow: 'meow-b', paw: 'paw-b' };
export function iconHTML(key) {
  if (B[key] && IMG['ui-' + B[key]]) key = B[key];
  return IMG['ui-' + key] ? `<img src="img/ui-${key}.webp" alt="">` : SVG[key] || SVG.paw;
}
export function buttonHTML(key, label) {
  return `<span class="ic">${iconHTML(key)}</span><small>${label}</small>`;
}
