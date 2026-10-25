// 은하 방역대 - 광고 (젤리도쿠와 같은 구조: 언제 보여 줄지 정하는 규칙 + 웹 테스트용 / AdMob 구현)
const ADS_ENABLED = true;

// 전면 광고 규칙
// - 스테이지를 클리어하고 다음 스테이지로 넘어갈 때만 (게임 도중에는 절대 안 나옴)
// - 스테이지마다 1번
// 첫인상을 지키려면 freeStages를 늘리고 (예: 설치 후 처음 3번은 광고 없음),
// 스테이지가 아주 빨리 끝날 때 연달아 나오는 게 싫으면 minInterval(초)을 늘린다
const AdPolicy = {
  freeStages: 0, minInterval: 0,
  cleared: 0, last: -Infinity,
  shouldShow() {
    this.cleared++;
    if (this.cleared <= this.freeStages) return false;
    return performance.now() / 1000 - this.last >= this.minInterval;
  },
  onShown() { this.last = performance.now() / 1000; },
};

// 웹(폰 브라우저) 테스트용: 실제 광고 대신 "테스트 광고 자리" 화면을 3초 보여 준다
const WebTestAds = {
  async init() {},
  show() {
    return new Promise(resolve => {
      const box = $('ad'), btn = $('adClose');
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

// 앱(Capacitor + @capacitor-community/admob)용 AdMob 전면 광고.
// 지금은 Google 공식 **테스트 광고 ID**. 출시 전에 AdMob 콘솔에서 만든 실제 ID로 교체해야 한다.
// 앱으로 감싼 뒤 실제 기기에서 동작을 꼭 확인할 것 (웹에서는 이 코드가 실행되지 않음)
const AdMobAds = {
  adId: 'ca-app-pub-3940256099942544/1033173712', // 테스트용
  ready: false,
  plugin: () => window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob,
  async init() {
    const A = this.plugin(); if (!A) return;
    await A.initialize({});
    // 유럽 등 동의가 필요한 지역에서만 Google 동의 창(UMP)이 뜬다
    try { const info = await A.requestConsentInfo(); if (info.isConsentFormAvailable && info.status === 'REQUIRED') await A.showConsentForm(); } catch (e) {}
    this.prepare();
  },
  async prepare() {
    try { await this.plugin().prepareInterstitial({ adId: this.adId, isTesting: true }); this.ready = true; }
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
  // 스테이지 사이: 광고를 보여 줄 차례면 보여 주고 닫힌 뒤 done, 아니면 바로 done
  async between(done) {
    if (!ADS_ENABLED || !AdPolicy.shouldShow()) return done();
    G.state = 'ad'; Sound.suspend();
    let shown = false;
    try { shown = await this.impl.show(); } catch (e) {}
    if (shown) AdPolicy.onShown();
    Sound.resume();
    if (G.state === 'ad') { G.state = 'play'; done(); }
  },
};
