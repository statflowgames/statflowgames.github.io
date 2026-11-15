// 옷장 장비: 생선뼈로 사서 부위마다 하나씩 입는다. 효과는 "실수를 조금 봐주는" 정도로만.
// 단계마다 3~5% 에서 시작해 조금씩 좋아진다. 어려움 스테이지에서는 효과가 절반.
import { IMG } from './assets.js?v=1115224716';

export const SLOTS = [
  { id: 'feet', name: '발', stat: '발소리', key: 'quiet', emoji: '🧦', sign: '−',
    desc: '달릴 때 발소리, 삐걱 마루·첨벙 물소리가 덜 퍼져요' },
  { id: 'body', name: '몸', stat: '들키는 속도', key: 'sneak', emoji: '🧥', sign: '−',
    desc: '경비·카메라·탐조등에 들키는 게이지가 천천히 차요' },
  { id: 'neck', name: '목', stat: '의심 풀리는 속도', key: 'calm', emoji: '📿', sign: '+',
    desc: '나를 못 보게 되면 경비의 의심이 더 빨리 풀려요' },
  { id: 'tail', name: '꼬리', stat: '도망 속도', key: 'dash', emoji: '🎀', sign: '+',
    desc: '쫓길 때만 달리기가 조금 빨라져요' },
  { id: 'head', name: '머리', stat: '야옹 대기 시간', key: 'meow', emoji: '🎩', sign: '−',
    desc: '야옹을 다시 쓸 수 있을 때까지 덜 기다려요' },
];

export const PRICES = [50, 120, 250, 450, 700];
const LIST = {
  feet: [['면 양말', 4], ['털실 양말', 6], ['솜뭉치 양말', 8], ['구름 양말', 10], ['달빛 덧신', 13]],
  body: [['풀잎 조끼', 3], ['밤색 망토', 5], ['그림자 망토', 7], ['밤하늘 망토', 9], ['달그림자 망토', 12]],
  neck: [['방울 뗀 목줄', 5], ['리본 목걸이', 8], ['조개 목걸이', 11], ['별 목걸이', 15], ['초승달 목걸이', 20]],
  tail: [['꼬리 리본', 3], ['줄무늬 꼬리띠', 5], ['깃털 꼬리장식', 7], ['번개 꼬리링', 9], ['혜성 꼬리장식', 11]],
  head: [['털모자', 5], ['도둑 두건', 10], ['탐정 모자', 15], ['마법사 모자', 20], ['밤도둑 베레모', 25]],
};
export const GEAR = SLOTS.flatMap((s) => LIST[s.id].map(([name, val], i) => ({ id: `${s.id}${i + 1}`, slot: s.id, tier: i + 1, name, val, price: PRICES[i] })));
export const gearById = (id) => GEAR.find((g) => g.id === id);
export const slotById = (id) => SLOTS.find((s) => s.id === id);

// 생선뼈 버는 양
export const EARN = { first: 20, star: 10, again: 3 };

// 입은 장비 → 게임에 넘길 효과 (0~1 비율)
export function perksOf(gear) {
  const p = {};
  for (const s of SLOTS) {
    const g = gear && gear.on && gearById(gear.on[s.id]);
    p[s.key] = g ? g.val / 100 : 0;
  }
  return p;
}

export function gearIcon(g) {
  if (IMG['gear-' + g.id]) return `<img src="img/gear-${g.id}.webp" alt="">`;
  return `<span class="emo">${slotById(g.slot).emoji}</span>`;
}

// 생선뼈 아이콘
export const BONE = `<svg class="bone" viewBox="0 0 32 16" aria-hidden="true"><path d="M3 8 L22 8 M8 3 V13 M13 3 V13 M18 3 V13" stroke="#fffbe8" stroke-width="2.4" stroke-linecap="round" fill="none"/><path d="M22 8 L29 3 V13Z" fill="#fffbe8"/><circle cx="3.5" cy="8" r="2.6" fill="#fffbe8"/></svg>`;
