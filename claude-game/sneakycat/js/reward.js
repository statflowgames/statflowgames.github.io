// 보상형 광고 자리 — 게임은 이 파일의 Reward.show(kind) 만 부른다.
// 지금은 광고가 없어서 잠깐 '광고 자리' 화면을 보여 준 뒤 보상을 준다.
// AdMob 을 붙일 때는 show() 안만 보상형 광고(끝까지 봤으면 true, 닫았거나 실패면 false)로 바꾸면 된다.
import { Sound } from './audio.js?v=1117102242';

// 보상 종류 (광고 단위 하나를 같이 쓰고, 기록·분석할 때 구분용)
export const KINDS = {
  double: '생선뼈 2배',
  revive: '이어하기',
  skip: '스테이지 건너뛰기',
  reroll: '의뢰 한 번 더 바꾸기',
  box: '오늘의 무료 상자',
};

let busy = false;
export const Reward = {
  // 광고를 보여 줄 수 있는지 (광고를 붙이면 '불러온 광고가 있는지'로 바뀜)
  ready() { return !busy; },
  async show(kind) {
    if (busy) return false;
    busy = true;
    Sound.suspend();
    try {
      return await placeholder(kind);
    } finally {
      busy = false;
      Sound.resume();
    }
  },
};

// 광고 연결 전 자리 표시: 1.2초 뒤 보상
function placeholder(kind) {
  return new Promise((done) => {
    const el = document.createElement('div');
    el.className = 'adph';
    el.innerHTML = `<div><b>📺 광고 자리</b><p>${KINDS[kind] || ''}</p><small>광고를 붙이기 전이라 지금은 그냥 드려요</small></div>`;
    document.getElementById('app').appendChild(el);
    setTimeout(() => { el.remove(); done(true); }, 1200);
  });
}
