// 보상형 광고 — 게임은 이 파일의 Reward.show(kind) 만 부른다. 끝까지 봤으면 true.
// 앱: AdMob 보상형 광고 (ads.js). 웹 체험판: 광고 없이 바로 보상.
import { Ads } from './ads.js?v=1118010407';
import { tr } from './i18n.js?v=1118010407';

// 보상 종류 (광고 단위 하나를 같이 쓰고, 기록·분석할 때 구분용)
export const KINDS = {
  double: '생선뼈 2배',
  revive: '이어하기',
  skip: '스테이지 건너뛰기',
  reroll: '의뢰 한 번 더 바꾸기',
  box: '오늘의 무료 상자',
  treat: '특별 간식',
};

let busy = false;
export const Reward = {
  toast: null, // main.js 가 넣어 준다 (광고를 못 불러왔을 때 안내)
  ready() { return !busy && Ads.rewardReady(); },
  async show(kind) {
    if (busy) return false;
    busy = true;
    try {
      const r = await Ads.rewarded(kind);
      if (r === null) { if (this.toast) this.toast(tr('광고를 불러오지 못했어요. 잠시 뒤에 다시 해 주세요')); return false; }
      return !!r;
    } finally {
      busy = false;
    }
  },
};
