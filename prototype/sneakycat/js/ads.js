// 광고 (AdMob, @capacitor-community/admob). 은하 방역대 ads.js 와 같은 구조.
// - 앱: 보상형(📺 버튼 6곳) + 전면(2판마다, 사진형만 — AdMob 콘솔의 광고 단위에서 '동영상' 끔)
// - 웹 체험판: 광고 없음. 📺 보상은 바로 준다.
// ADS_LIVE=false(개발 중)면 Google 공식 테스트 광고. ⚠ 원본은 늘 false — 출시 빌드(npm run release)가 www 사본에서만 true 로 바꾼다.
// 본인 광고를 누르면 계정 정지 위험이 있으니 개발 중에는 꼭 테스트 광고로.
import { Sound } from './audio.js?v=1118010407';

const ADS_LIVE = false;
const UNITS = {
  // Sneaky Cat (앱 ca-app-pub-4276944921483964~4025680266). 전면은 콘솔에서 '동영상' 끈 이미지 전용 단위
  live: { reward: 'ca-app-pub-4276944921483964/1207945235', inter: 'ca-app-pub-4276944921483964/9291942675' },
  // Google 공식 테스트 광고 단위 (보상형, 전면)
  test: { reward: 'ca-app-pub-3940256099942544/5224354917', inter: 'ca-app-pub-3940256099942544/1033173712' },
};
const U = ADS_LIVE ? UNITS.live : UNITS.test;
const GAP = 120; // 전면 광고는 마지막 광고(보상형 포함) 뒤 2분 넘게 지나야

const plugin = () => window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.AdMob;
const isNative = () => !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform() && plugin());
const now = () => performance.now() / 1000;

let started = false, privacy = false;
let rewardLoaded = false, loadingR = false, interLoaded = false, loadingI = false;
let lastAd = now(); // 켠 직후 2분도 전면 광고는 쉰다

async function prepareReward() {
  if (!isNative() || rewardLoaded || loadingR) return;
  loadingR = true;
  try { await plugin().prepareRewardVideoAd({ adId: U.reward, isTesting: !ADS_LIVE }); rewardLoaded = true; loadingR = false; }
  catch (e) { rewardLoaded = false; setTimeout(() => { loadingR = false; prepareReward(); }, 30000); }
}
async function prepareInter() {
  if (!isNative() || interLoaded || loadingI) return;
  loadingI = true;
  try { await plugin().prepareInterstitial({ adId: U.inter, isTesting: !ADS_LIVE }); interLoaded = true; loadingI = false; }
  catch (e) { interLoaded = false; setTimeout(() => { loadingI = false; prepareInter(); }, 30000); }
}

export const Ads = {
  get native() { return isNative(); },
  // 시작할 때 한 번: 초기화 → (필요한 지역이면) Google 동의 창 → 광고 미리 불러 두기
  async init() {
    if (started || !isNative()) return;
    started = true;
    const A = plugin();
    try { await A.initialize({}); } catch (e) { return; }
    try {
      let info = await A.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === 'REQUIRED') info = await A.showConsentForm();
      privacy = info.privacyOptionsRequirementStatus === 'REQUIRED';
    } catch (e) { /* 동의 창을 못 띄워도 게임은 계속 */ }
    prepareReward(); prepareInter();
  },
  // 설정의 '광고 개인정보 설정' 버튼을 보여 줘야 하는지 (유럽 등 동의가 필요한 지역)
  privacyRequired: () => privacy,
  async showPrivacy() { try { await plugin().showPrivacyOptionsForm(); } catch (e) { /* 무시 */ } },

  rewardReady: () => !isNative() || rewardLoaded,
  // 보상형: 끝까지 봐서 보상을 받으면 true. 웹은 바로 true. 아직 못 불러왔으면 false (다시 불러오기 시작)
  async rewarded() {
    if (!isNative()) return true;
    const A = plugin();
    if (!rewardLoaded) { prepareReward(); return null; }
    rewardLoaded = false;
    let got = false;
    const subs = [];
    Sound.suspend();
    try {
      const closed = new Promise((res) => {
        A.addListener('onRewardedVideoAdReward', () => { got = true; }).then((h) => subs.push(h));
        A.addListener('onRewardedVideoAdDismissed', res).then((h) => subs.push(h));
        A.addListener('onRewardedVideoAdFailedToShow', res).then((h) => subs.push(h));
        setTimeout(res, 90000);
      });
      await A.showRewardVideoAd(); await closed;
    } catch (e) { /* 실패하면 보상 없음 */ }
    finally { subs.forEach((h) => h.remove && h.remove()); Sound.resume(); lastAd = now(); prepareReward(); }
    return got;
  },

  // 전면: 차례가 됐고 2분이 지났고 불러 둔 광고가 있을 때만 보여 주고 true
  canInterstitial: () => isNative() && interLoaded && now() - lastAd >= GAP,
  async interstitial() {
    if (!this.canInterstitial()) { prepareInter(); return false; }
    const A = plugin();
    interLoaded = false;
    const subs = [];
    Sound.suspend();
    try {
      const closed = new Promise((res) => {
        A.addListener('interstitialAdDismissed', res).then((h) => subs.push(h));
        A.addListener('interstitialAdFailedToShow', res).then((h) => subs.push(h));
        setTimeout(res, 60000);
      });
      await A.showInterstitial(); await closed;
      return true;
    } catch (e) { return false; }
    finally { subs.forEach((h) => h.remove && h.remove()); Sound.resume(); lastAd = now(); prepareInter(); }
  },
};
