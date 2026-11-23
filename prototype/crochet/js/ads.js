// 광고 (AdMob, @capacitor-community/admob) — 몰래냥 ads.js 와 같은 구조, 보상형만 쓴다.
// - 앱: 도안 열기 = 보상형 광고 1회
// - 웹 체험판: 광고 없음. 바로 열어 준다.
// ADS_LIVE=false(개발 중)면 Google 공식 테스트 광고. ⚠ 원본은 늘 false — 출시 빌드가 www 사본에서만 true 로 바꾼다.
const ADS_LIVE = false;
const UNITS = {
  live: { reward: '' }, // TODO: AdMob 에서 이 앱의 보상형 광고 단위를 만든 뒤 넣기
  test: { reward: 'ca-app-pub-3940256099942544/5224354917' },
};
const U = ADS_LIVE ? UNITS.live : UNITS.test;

const plugin = () => window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.AdMob;
const isNative = () => !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform() && plugin());

let started = false, privacy = false, loaded = false, loading = false;

async function prepare() {
  if (!isNative() || loaded || loading) return;
  loading = true;
  try { await plugin().prepareRewardVideoAd({ adId: U.reward, isTesting: !ADS_LIVE }); loaded = true; loading = false; }
  catch (e) { loaded = false; setTimeout(() => { loading = false; prepare(); }, 30000); }
}

export const Ads = {
  get native() { return isNative(); },
  async init() {
    if (started || !isNative()) return;
    started = true;
    const A = plugin();
    try { await A.initialize({}); } catch (e) { return; }
    try {
      let info = await A.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === 'REQUIRED') info = await A.showConsentForm();
      privacy = info.privacyOptionsRequirementStatus === 'REQUIRED';
    } catch (e) { /* 동의 창을 못 띄워도 계속 */ }
    prepare();
  },
  privacyRequired: () => privacy,
  async showPrivacy() { try { await plugin().showPrivacyOptionsForm(); } catch (e) { /* 무시 */ } },
  // 끝까지 보면 true, 중간에 닫으면 false, 아직 광고가 없으면 null. 웹은 바로 true.
  async rewarded() {
    if (!isNative()) return true;
    const A = plugin();
    if (!loaded) { prepare(); return null; }
    loaded = false;
    let got = false;
    const subs = [];
    try {
      const closed = new Promise((res) => {
        A.addListener('onRewardedVideoAdReward', () => { got = true; }).then((h) => subs.push(h));
        A.addListener('onRewardedVideoAdDismissed', res).then((h) => subs.push(h));
        A.addListener('onRewardedVideoAdFailedToShow', res).then((h) => subs.push(h));
        setTimeout(res, 90000);
      });
      await A.showRewardVideoAd(); await closed;
    } catch (e) { /* 실패하면 보상 없음 */ }
    finally { subs.forEach((h) => h.remove && h.remove()); prepare(); }
    return got;
  },
};
