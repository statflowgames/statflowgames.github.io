// 은하 방역대 - 다국어 처리. 언어 문구는 lang-*.js에 있고, 새 언어는 파일 하나 + 아래 세 표에 한 줄씩 추가
const I18N = {};
// 젤리도쿠와 같은 8개 언어
const LANGS = { ko: '한국어', en: 'English', ja: '日本語', zh: '简体中文', 'zh-Hant': '繁體中文', es: 'Español', de: 'Deutsch', vi: 'Tiếng Việt' };
const LOCALE = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', zh: 'zh-CN', 'zh-Hant': 'zh-TW', es: 'es-ES', de: 'de-DE', vi: 'vi-VN' };
// 언어별 폰트. css는 Google Fonts에서 그 언어를 고를 때만 불러온다 (한국어·영어 폰트는 index.html에서 미리 불러옴)
const LATIN = { display: "'Lilita One', 'Fredoka', sans-serif", body: "'Fredoka', sans-serif" };
const FONTS = {
  ko: { display: "'Black Han Sans', 'Jua', sans-serif", body: "'Jua', sans-serif" },
  en: LATIN, es: LATIN, de: LATIN,
  ja: { display: "'Dela Gothic One', 'M PLUS Rounded 1c', sans-serif", body: "'M PLUS Rounded 1c', sans-serif", css: 'Dela+Gothic+One&family=M+PLUS+Rounded+1c:wght@400;700' },
  zh: { display: "'ZCOOL QingKe HuangYou', 'ZCOOL KuaiLe', sans-serif", body: "'ZCOOL KuaiLe', sans-serif", css: 'ZCOOL+QingKe+HuangYou&family=ZCOOL+KuaiLe' },
  'zh-Hant': { display: "'Noto Sans TC', sans-serif", body: "'Noto Sans TC', sans-serif", css: 'Noto+Sans+TC:wght@400;700;900' },
  // 베트남어 성조 표시가 있는 폰트
  vi: { display: "'Paytone One', 'Baloo 2', sans-serif", body: "'Baloo 2', sans-serif", css: 'Paytone+One&family=Baloo+2:wght@400;600' },
};

const I18n = {
  lang: 'ko',
  detect() {
    try { const s = localStorage.getItem('bugbuster.lang'); if (s && I18N[s]) return s; } catch (e) {}
    const n = (navigator.language || 'en').toLowerCase(), base = n.split('-')[0];
    // 중국어: 대만·홍콩·마카오·번체 설정이면 번체, 나머지는 간체
    if (base === 'zh') return /hant|tw|hk|mo/.test(n) ? 'zh-Hant' : 'zh';
    return I18N[base] ? base : 'en';
  },
  font() { return FONTS[this.lang] || FONTS.en; },
  loadCss(f) {
    if (!f.css || document.querySelector(`link[data-font="${this.lang}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.dataset.font = this.lang;
    l.href = `https://fonts.googleapis.com/css2?family=${f.css}&display=swap`;
    document.head.appendChild(l);
  },
  set(lang, save) {
    this.lang = I18N[lang] ? lang : 'en';
    if (save) try { localStorage.setItem('bugbuster.lang', this.lang); } catch (e) {}
    const f = this.font(), root = document.documentElement;
    this.loadCss(f);
    root.lang = this.lang;
    root.style.setProperty('--f-display', f.display); root.style.setProperty('--f-body', f.body);
    Render.setFonts(f.display, f.body);
    document.title = t('title');
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  },
  // 게임 데이터의 이름·설명을 현재 언어에서 읽도록 연결
  bind() {
    const get = (obj, prop, fn) => Object.defineProperty(obj, prop, { get: fn, configurable: true });
    WORLDS.forEach((w, i) => { get(w, 'title', () => tl('worlds')[i]); get(w, 'sub', () => tl('worldSubs')[i]); });
    UPGRADES.forEach(u => { get(u, 'name', () => tl('upgrades')[u.id][0]); get(u, 'desc', () => tl('upgrades')[u.id][1].replace('{s}', DIFFS[G.diff || DIFF].shieldT)); });
    GIMMICKS.forEach((g, i) => { get(g, 'name', () => tl('gimmicks')[i][0]); get(g, 'desc', () => tl('gimmicks')[i][1]); });
    for (const k in BOSSES) get(BOSSES[k], 'name', () => t('bossTitle', { name: INFO[k][0], kind: INFO[k][1] }));
  },
};

// 문구 찾기: 현재 언어 → 한국어 → 키 그대로. {이름} 자리는 p 값으로 채움
function t(key, p) {
  const L = I18N[I18n.lang], s = (L && L.ui[key]) ?? I18N.ko.ui[key] ?? key;
  return p ? s.replace(/\{(\w+)\}/g, (_, k) => p[k] ?? '') : s;
}
// 목록형 문구 (도감, 월드 이름 등)
const tl = group => { const L = I18N[I18n.lang]; return (L && L[group]) || I18N.ko[group]; };
const fmt = n => Number(n).toLocaleString(LOCALE[I18n.lang] || 'en-US');
// 도감 정보 [이름, 종류, 설명]. 현재 언어에 없으면 한국어로
const INFO = new Proxy({}, { get: (_, k) => tl('info')[k] || I18N.ko.info[k] });
