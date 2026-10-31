// 보상형 광고 — 운세를 하나 열 때마다 1편
// 앱(Capacitor + @capacitor-community/admob)에서는 실제 AdMob 보상형, 웹에서는 5초짜리 테스트 광고 화면
const ADS_LIVE = false; // 출시 빌드에서만 true (실제 광고 ID 사용)
const AD_UNITS = {
  android: { test: 'ca-app-pub-3940256099942544/5224354917', live: '' }, // TODO: AdMob 앱 만든 뒤 실제 ID
  ios: { test: 'ca-app-pub-3940256099942544/1712485313', live: '' },
};
const WEB_AD_SECONDS = 5;

const Ads = {
  native() {
    const C = window.Capacitor;
    return C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.AdMob ? C.Plugins.AdMob : null;
  },
  unitId() {
    const ios = window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() === 'ios';
    const u = ios ? AD_UNITS.ios : AD_UNITS.android;
    return ADS_LIVE && u.live ? u.live : u.test;
  },
  async init() {
    const A = this.native();
    if (!A) return;
    try {
      await A.initialize({});
      this.preload();
    } catch (e) { console.warn('admob init', e); }
  },
  _ready: null,
  preload() {
    const A = this.native();
    if (!A) return;
    this._ready = A.prepareRewardVideoAd({ adId: this.unitId(), isTesting: !ADS_LIVE }).catch(e => { this._ready = null; throw e; });
  },
  // 보상을 받으면 true
  async showRewarded() {
    const A = this.native();
    if (!A) return this.showWeb();
    try {
      if (!this._ready) this.preload();
      await this._ready;
      const r = await A.showRewardVideoAd();
      this._ready = null;
      this.preload();
      return !!r;
    } catch (e) {
      // 광고가 없을 때(no fill)는 사용자를 막지 않는다
      console.warn('rewarded', e);
      this._ready = null;
      this.preload();
      return true;
    }
  },
  showWeb() {
    return new Promise(resolve => {
      const L = document.getElementById('adlayer');
      const cnt = L.querySelector('.cnt'), prog = L.querySelector('.prog i');
      let left = WEB_AD_SECONDS, done = false;
      L.classList.add('on');
      prog.style.transition = 'none'; prog.style.width = '0';
      requestAnimationFrame(() => { prog.style.transition = `width ${WEB_AD_SECONDS}s linear`; prog.style.width = '100%'; });
      cnt.textContent = left;
      const tick = setInterval(() => {
        left--;
        if (left > 0) { cnt.textContent = left; return; }
        clearInterval(tick); done = true; cnt.textContent = typeof lang === 'function' ? lang().ui.close : '✕ 닫기';
      }, 1000);
      cnt.onclick = () => {
        if (!done) return;
        L.classList.remove('on');
        resolve(true);
      };
    });
  },
};
