// 🆕 2026-11-26 다국어 (21개 언어 — 몰래냥과 같은 목록)
//   원문은 코드에 한국어 그대로 둔다. 번역표 lang/<코드>.js 는 { '한국어 원문': '번역' } 이다.
//   ① 화면 글자(Phaser Text)는 setText 한 곳에서 문장째 바꾼다 → 그냥 '한국어' 글은 코드를 고칠 필요가 없다.
//      여러 줄 글은 통째로 없으면 줄마다 찾는다.
//   ② 값이 끼는 글만 tf('금화 {0} · 경험치 {1}', gold, exp) 로 쓴다. 끼워 넣는 값이 한국어(이름 등)면 그것도 번역한다.
//   ③ 표에 없는 한국어가 화면에 나오면 I18N.missing 에 모은다 (시험: ?lang=xx 가짜 긴 언어 → I18N.report()).
//   언어 바꾸기: I18N.set(코드) → 저장하고 새로 시작. 주소 ?lang=en 으로 시험.
//   표 관리: python tools/i18n.py (뽑기·검사·번역 묶음 만들기·합치기)
const I18N = (() => {
  const LANGS = ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'es', 'pt-BR', 'de', 'fr', 'it', 'ru', 'uk', 'pl', 'nl', 'sv', 'tr', 'id', 'ms', 'vi', 'th', 'hi'];
  const NAMES = {
    ko: '한국어', en: 'English', ja: '日本語', 'zh-CN': '简体中文', 'zh-TW': '繁體中文', es: 'Español', 'pt-BR': 'Português (Brasil)',
    de: 'Deutsch', fr: 'Français', it: 'Italiano', ru: 'Русский', uk: 'Українська', pl: 'Polski', nl: 'Nederlands', sv: 'Svenska',
    tr: 'Türkçe', id: 'Bahasa Indonesia', ms: 'Bahasa Melayu', vi: 'Tiếng Việt', th: 'ไทย', hi: 'हिन्दी',
  };
  const KEY = 'seventhmoon.lang', H = /[가-힣]/;
  const q = new URLSearchParams(location.search);
  function fromDevice() {
    for (const raw of navigator.languages || [navigator.language || 'en']) {
      const l = String(raw).toLowerCase();
      if (l.startsWith('zh')) return /tw|hk|mo|hant/.test(l) ? 'zh-TW' : 'zh-CN';
      if (l.startsWith('pt')) return 'pt-BR';
      const base = l.split('-')[0];
      const hit = LANGS.find(c => c.toLowerCase() === base);
      if (hit) return hit;
      if (base === 'in') return 'id';
    }
    return 'en';
  }
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* 무시 */ }
  // 번역을 마친 언어만 고를 수 있다 (tools/i18n.py ready 가 고친다).
  const READY = ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'es', 'pt-BR', 'de', 'fr', 'it', 'ru', 'uk', 'pl', 'nl', 'sv', 'tr', 'id', 'ms', 'vi', 'th', 'hi'];
  // ?lang=xx 는 시험용 가짜 언어 (원문을 1.6배쯤 길게 늘인 글자) — 넘침 찾기. ?lang=<코드> 는 덜 된 언어도 시험으로 켠다
  const pick = l => (READY.includes(l) ? l : READY.includes('en') ? 'en' : 'ko');
  const forced = q.get('lang');
  const lang = forced && (forced === 'xx' || LANGS.includes(forced)) ? forced : pick(saved || fromDevice());
  const TAB = {}, missing = new Map();
  const on = lang !== 'ko';
  // 번역표는 다른 스크립트보다 먼저 (index.html 에서 이 파일 바로 다음에 읽힌다)
  if (on) document.write(`<script src="lang/${lang}.js${document.currentScript ? new URL(document.currentScript.src).search : ''}"><\/script>`);
  const miss = s => { if (on && H.test(s)) missing.set(s, (missing.get(s) || 0) + 1); };
  // 표에 통째로 없는 글(이름을 이어 붙인 글 등): ① 줄마다 ② ' · ' ' — ' 로 나눠서 ③ 띄어쓰기 낱말 묶음 중 표에 있는 가장 긴 것부터 바꾼다
  const cache = new Map();
  function words(p) {
    const tk = p.split(/(\s+)/);   // 낱말과 빈칸이 번갈아
    let out = '', i = 0;
    while (i < tk.length) {
      if (!H.test(tk[i])) { out += tk[i]; i++; continue; }
      let hit = -1;
      for (let j = tk.length - 1; j >= i; j--) { const c = tk.slice(i, j + 1).join(''); if (H.test(c) && TAB[c] != null) { hit = j; out += TAB[c]; break; } }
      if (hit < 0) {   // 낱말 안의 한글 덩어리마다 (「만월」·일반→고급·(준비 같은 것)
        out += tk[i].replace(/[가-힣]+/g, w => TAB[w] ?? w); i++;
      } else i = hit + 1;
    }
    return out;
  }
  // 나누는 기호: 넓은 것부터 (두 칸 띄운 · → 한 칸 띄운 · — | → '이름: 값')
  const SEPS = [/(\s{2,}[·—|]\s{2,})/, /(\s+[·—|→]\s+)/, /(:\s+)/];
  function loose(p, lv = 0) {
    if (TAB[p] != null) return TAB[p];
    const m = p.match(/^([^가-힣]*)(.*?)([^가-힣]*)$/);   // 앞뒤 기호·숫자(★ +6 「 」 ( ) 등)를 떼고
    if (m && (m[1] || m[3]) && TAB[m[2]] != null) return m[1] + TAB[m[2]] + m[3];
    // ✏️ 2026-11-28 앞 기호만 / 뒤 기호만 떼기 (「★ 」+ 「…(적 셋)」처럼 끝 괄호가 원문의 일부인 경우)
    if (m) for (let i = 1; i <= m[1].length; i++) if (TAB[p.slice(i)] != null) return p.slice(0, i) + TAB[p.slice(i)];   // 「· 3단계…」처럼 숫자가 원문 첫 글자일 때도
    if (m) for (let i = 1; i <= m[3].length; i++) if (TAB[p.slice(0, p.length - i)] != null) return TAB[p.slice(0, p.length - i)] + p.slice(p.length - i);
    for (let k = lv; k < SEPS.length; k++) {
      const seg = p.split(SEPS[k]);
      if (seg.length > 1) return seg.map((x, i) => (i % 2 ? x : loose(x, k + 1))).join('');
    }
    return words(p);
  }
  function tr(s) {
    if (!on || typeof s !== 'string' || !H.test(s)) return s;
    const t = TAB[s];
    if (t != null) return t;
    const c = cache.get(s);
    if (c != null) return c;
    const r = s.split('\n').map(p => (H.test(p) ? loose(p) : p)).join('\n');
    if (H.test(r)) miss(s);   // 그래도 한국어가 남으면 시험 목록에
    if (cache.size > 4000) cache.clear();
    cache.set(s, r);
    return r;
  }
  // 값 끼우기: tf('금화 {0}', n). 값이 한국어 글이면 그것도 번역
  function tf(src, ...args) {
    const pat = on ? (TAB[src] ?? (miss(src), src)) : src;
    return pat.replace(/\{(\d+)\}/g, (m, i) => { const v = args[+i]; return v == null ? '' : typeof v === 'string' ? tr(v) : v; });
  }
  return {
    LANGS, NAMES, READY, lang, on, missing,
    add(tab) { Object.assign(TAB, tab); },
    tr, tf,
    has: s => s in TAB,
    set(l) {
      try { localStorage.setItem(KEY, l); } catch (e) { /* 무시 */ }
      const u = new URL(location.href); u.searchParams.delete('lang'); location.href = u.toString();   // 시험용 ?lang= 은 떼고 새로 시작
    },
    // 제목·로고 쪽 언어 이름 (data/title.js)
    titleLang() { return lang === 'zh-CN' ? 'zh-Hans' : lang === 'zh-TW' ? 'zh-Hant' : lang === 'pt-BR' ? 'pt' : lang === 'xx' ? 'en' : lang; },
    // 시험: 화면에 나왔는데 표에 없는 한국어
    report() { return [...missing.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) => `${n}× ${s}`); },
    // Phaser 글자 한 곳에서 바꾸기 (phaser.min.js 다음에 부른다)
    hookPhaser() {
      if (!on || typeof Phaser === 'undefined') return;
      const T = Phaser.GameObjects.Text.prototype, orig = T.setText;
      T.setText = function (v) { return orig.call(this, Array.isArray(v) ? v.map(tr) : typeof v === 'string' ? tr(v) : v); };
    },
  };
})();
const tr = I18N.tr, tf = I18N.tf;
I18N.hookPhaser();
// 브라우저 탭 제목도 그 언어로 (data/title.js 가 읽힌 뒤)
if (I18N.on) window.addEventListener('DOMContentLoaded', () => { try { if (typeof gameTitle === 'function') document.title = gameTitle(I18N.titleLang()).store; document.documentElement.lang = I18N.lang; } catch (e) { /* 무시 */ } });
