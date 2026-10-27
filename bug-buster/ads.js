// 은하 방역대 - 광고 (젤리도쿠와 같은 구조: 언제 보여 줄지 정하는 규칙 + 웹 테스트용 / AdMob 구현)
const ADS_ENABLED = true;

// 전면 광고 규칙
// - 쉬는 지점에서만: 월드 클리어(보스 처치 → 다음 월드) 또는 게임 오버 뒤 "다시 출동 / 처음부터"
//   (게임 도중, 같은 월드 안의 스테이지 사이에는 안 나옴)
// - 마지막 광고(보상형 포함) 후 3분은 쉼. 게임을 켠 직후 3분도 쉼 (첫 월드를 깨는 데 걸리는 시간 정도)
const AdPolicy = {
  minInterval: 180,
  last: performance.now() / 1000,
  shouldShow() { return performance.now() / 1000 - this.last >= this.minInterval; },
  onShown() { this.last = performance.now() / 1000; },
};

// 웹(폰 브라우저) 테스트용: 실제 광고 대신 "테스트 광고 자리" 화면을 3초 보여 준다
const WebTestAds = {
  async init() {},
  rewardReady: () => true,
  // 보상형도 같은 화면 (끝까지 보면 보상)
  showRewarded() { return this.show('adTestRewardDesc'); },
  show(descKey = 'adTestDesc') {
    return new Promise(resolve => {
      const box = $('ad'), btn = $('adClose');
      $('adDesc').textContent = t(descKey);
      let n = 3;
      const tick = () => {
        btn.disabled = n > 0;
        btn.textContent = n > 0 ? t('adWait', { n }) : t('adClose');
        if (n-- > 0) setTimeout(tick, 1000);
      };
      btn.onclick = () => { box.hidden = true; resolve(true); };
      box.hidden = false; tick();
    });
  },
};

// 앱(Capacitor + @capacitor-community/admob)용 AdMob 전면·보상형 광고.
// ADS_LIVE=false(개발 중)면 Google 공식 테스트 광고, true 면 실제 광고 (본인 광고를 누르면 계정 정지 위험).
// ⚠ 출시용 빌드(.aab)를 만들 때만 true 로 바꾸고, 다시 개발할 때는 false 로 돌려 놓을 것.
// AdMob 앱 ID(ca-app-pub-4276944921483964~9363013291)는 Capacitor 안드로이드 AndroidManifest.xml 에 넣는다.
// 앱으로 감싼 뒤 실제 기기에서 동작을 꼭 확인할 것 (웹에서는 이 코드가 실행되지 않음)
const ADS_LIVE = false;
const AdMobAds = {
  adId: ADS_LIVE
    ? 'ca-app-pub-4276944921483964/5262444199' // 실제: Galaxy Pest Control 전면 interstitial_break
    : 'ca-app-pub-3940256099942544/1033173712', // 전면, 테스트용
  rewardId: ADS_LIVE
    ? 'ca-app-pub-4276944921483964/1268900853' // 실제: Galaxy Pest Control 보상형 rewarded_revive
    : 'ca-app-pub-3940256099942544/5224354917', // 보상형(부활), 테스트용
  ready: false,
  rewardLoaded: false,
  plugin: () => window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob,
  async init() {
    const A = this.plugin(); if (!A) return;
    await A.initialize({});
    // 유럽 등 동의가 필요한 지역에서만 Google 동의 창(UMP)이 뜬다
    try { const info = await A.requestConsentInfo(); if (info.isConsentFormAvailable && info.status === 'REQUIRED') await A.showConsentForm(); } catch (e) {}
    this.prepare();
    this.prepareReward();
  },
  rewardReady() { return this.rewardLoaded; },
  async prepareReward() {
    try { await this.plugin().prepareRewardVideoAd({ adId: this.rewardId, isTesting: !ADS_LIVE }); this.rewardLoaded = true; }
    catch (e) { this.rewardLoaded = false; setTimeout(() => this.prepareReward(), 30000); }
  },
  // 끝까지 봐서 보상을 받았으면 true
  async showRewarded() {
    const A = this.plugin();
    if (!A || !this.rewardLoaded) { this.prepareReward(); return false; }
    this.rewardLoaded = false;
    let rewarded = false;
    try {
      const closed = new Promise(res => {
        A.addListener('onRewardedVideoAdReward', () => { rewarded = true; });
        A.addListener('onRewardedVideoAdDismissed', res);
        A.addListener('onRewardedVideoAdFailedToShow', res);
        setTimeout(res, 90000);
      });
      await A.showRewardVideoAd(); await closed;
    } catch (e) {}
    finally { A.removeAllListeners && A.removeAllListeners(); this.prepareReward(); }
    return rewarded;
  },
  async prepare() {
    try { await this.plugin().prepareInterstitial({ adId: this.adId, isTesting: !ADS_LIVE }); this.ready = true; }
    catch (e) { this.ready = false; setTimeout(() => this.prepare(), 30000); }
  },
  async show() {
    const A = this.plugin();
    if (!A || !this.ready) { this.prepare(); return false; }
    this.ready = false;
    try {
      // 광고가 닫힐 때까지 기다린다 (안 닫히는 경우를 대비해 60초 뒤에는 그냥 진행)
      const closed = new Promise(res => { A.addListener('interstitialAdDismissed', res); setTimeout(res, 60000); });
      await A.showInterstitial(); await closed; return true;
    } catch (e) { return false; }
    finally { A.removeAllListeners && A.removeAllListeners(); this.prepare(); }
  },
};

const Ads = {
  impl: window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() ? AdMobAds : WebTestAds,
  init() { if (ADS_ENABLED) this.impl.init().catch(() => {}); },
  busy: false,
  // 쉬는 지점(월드 클리어, 게임 오버 뒤 다시 시작): 광고 차례면 보여 주고 닫힌 뒤 done, 아니면 바로 done
  async atBreak(done) {
    if (this.busy) return; // 버튼 연타 방지
    if (!ADS_ENABLED || !AdPolicy.shouldShow()) return done();
    this.busy = true;
    const prev = G.state; G.state = 'ad'; Sound.suspend();
    let shown = false;
    try { shown = await this.impl.show(); } catch (e) {}
    if (shown) AdPolicy.onShown();
    Sound.resume(); this.busy = false;
    if (G.state === 'ad') { G.state = prev; done(); }
  },
  canRevive() { return ADS_ENABLED && this.impl.rewardReady(); },
  // 보상형 광고(부활). 끝까지 봤으면 true
  async rewarded() {
    if (this.busy || !ADS_ENABLED) return false;
    this.busy = true; Sound.suspend();
    let ok = false;
    try { ok = await this.impl.showRewarded(); } catch (e) {}
    AdPolicy.onShown(); // 바로 뒤에 전면 광고가 또 나오지 않게
    Sound.resume(); this.busy = false;
    return ok;
  },
};
