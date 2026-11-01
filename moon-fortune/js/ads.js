// 보상형 광고 — 운세를 하나 열 때마다 1편
// 앱(Capacitor + @capacitor-community/admob)에서는 실제 AdMob 보상형, 웹에서는 5초짜리 테스트 광고 화면
const ADS_LIVE = false; // 출시 빌드에서만 true (실제 광고 ID 사용)
const AD_UNITS = {
  // Moon Rabbit Fortune (ca-app-pub-4276944921483964): Android 앱 ~4518280108, iOS 앱 ~3205198432
  android: { test: 'ca-app-pub-3940256099942544/5224354917', live: 'ca-app-pub-4276944921483964/5388508640' },
  ios: { test: 'ca-app-pub-3940256099942544/1712485313', live: 'ca-app-pub-4276944921483964/9192022286' },
};
const WEB_AD_SECONDS = 5;

const IS_IOS = !!(window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() === 'ios');

const Ads = {
  native() {
    const C = window.Capacitor;
    return C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.AdMob ? C.Plugins.AdMob : null;
  },
  unitId() {
    const u = IS_IOS ? AD_UNITS.ios : AD_UNITS.android;
    return ADS_LIVE && u.live ? u.live : u.test;
  },
  async init() {
    const A = this.native();
    if (!A) return;
    try { await A.initialize({}); } catch (e) { console.warn('admob init', e); return; }
    // 유럽 등 동의가 필요한 지역에서만 Google 동의 창(UMP)이 뜬다. 그런 지역은 홈 아래에 '개인정보 설정' 버튼을 보여 준다
    try {
      let info = await A.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === 'REQUIRED') info = await A.showConsentForm();
      if (info.privacyOptionsRequirementStatus === 'REQUIRED') {
        const b = document.getElementById('privacyBtn'); b.hidden = false;
        b.onclick = () => A.showPrivacyOptionsForm().catch(() => {});
      }
    } catch (e) { }
    if (IS_IOS) try { if ((await A.trackingAuthorizationStatus()).status === 'notDetermined') await A.requestTrackingAuthorization(); } catch (e) { }
    this.preload();
  },
  loaded: false,
  async preload() {
    try { await this.native().prepareRewardVideoAd({ adId: this.unitId(), isTesting: !ADS_LIVE }); this.loaded = true; }
    catch (e) { this.loaded = false; }
  },
  // 끝까지 봐서 보상을 받으면 true. 광고가 없을 때(no fill)는 사용자를 막지 않는다
  async showRewarded() {
    const A = this.native();
    if (!A) return this.showWeb();
    if (!this.loaded) { await this.preload(); if (!this.loaded) { this.preload(); return true; } }
    this.loaded = false;
    let rewarded = false, failed = false;
    const subs = [];
    try {
      const closed = new Promise(res => {
        subs.push(A.addListener('onRewardedVideoAdReward', () => { rewarded = true; }));
        subs.push(A.addListener('onRewardedVideoAdDismissed', res));
        subs.push(A.addListener('onRewardedVideoAdFailedToShow', () => { failed = true; res(); }));
        setTimeout(res, 120000);
      });
      await A.showRewardVideoAd(); await closed;
    } catch (e) { failed = true; }
    finally {
      for (const s of subs) Promise.resolve(s).then(h => h && h.remove && h.remove()).catch(() => { });
      this.preload();
    }
    return rewarded || failed;
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
