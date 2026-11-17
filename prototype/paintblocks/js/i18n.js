// 화면 글자 번역 (21개 언어, 몰래냥과 같은 방식).
// 원문은 코드에 한국어 그대로 두고, 보여 줄 때 tr('한국어 원문') / tf('원문 {n}', { n }) 로 감싼다.
// 다른 언어는 lang/<코드>.js 의 { '한국어 원문': '번역' } 표에서 찾고, 없으면 한국어를 그대로 보여 준다.
// 표 만들기·빠진 문장 찾기: python tools/i18n.py check
const V = new URL(import.meta.url).search; // 같은 ?v= 로 번역표도 새로 받기

export const LANGS = ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'es', 'pt-BR', 'de', 'fr', 'it', 'ru', 'uk', 'pl', 'nl', 'sv', 'tr', 'id', 'ms', 'vi', 'th', 'hi'];
export const LANG_NAMES = {
  ko: '한국어', en: 'English', ja: '日本語', 'zh-CN': '简体中文', 'zh-TW': '繁體中文', es: 'Español', 'pt-BR': 'Português (Brasil)',
  de: 'Deutsch', fr: 'Français', it: 'Italiano', ru: 'Русский', uk: 'Українська', pl: 'Polski', nl: 'Nederlands', sv: 'Svenska',
  tr: 'Türkçe', id: 'Bahasa Indonesia', ms: 'Bahasa Melayu', vi: 'Tiếng Việt', th: 'ไทย', hi: 'हिन्दी',
};
let lang = 'ko';
let TAB = {};

// 언어별 글꼴 (한국어·영어는 Jua). 고를 때만 Google Fonts 에서 받는다.
const FONTS = {
  ja: ['M PLUS Rounded 1c', 'M+PLUS+Rounded+1c:wght@800'],
  'zh-CN': ['Noto Sans SC', 'Noto+Sans+SC:wght@700'],
  'zh-TW': ['Noto Sans TC', 'Noto+Sans+TC:wght@700'],
  th: ['Mitr', 'Mitr:wght@500'],
  hi: ['Baloo 2', 'Baloo+2:wght@700'],
};
const LATIN = ['Nunito', 'Nunito:wght@800']; // 악센트·키릴·베트남 글자까지 있는 둥근 글꼴
const BASE = '"Jua", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
let stack = BASE;
function applyFont(l) {
  const f = l === 'ko' || l === 'en' ? null : FONTS[l] || LATIN;
  stack = f ? `"${f[0]}", ${BASE}` : BASE;
  document.documentElement.style.setProperty('--font', stack);
  if (!f) return;
  const id = 'font-' + f[0].replace(/\W/g, '');
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id; link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${f[1]}&display=swap`;
  document.head.appendChild(link);
}
// 캔버스에 글자 쓸 때 쓰는 글꼴 목록
export const fontStack = () => stack;

// 기기 언어 → 게임 언어
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

export async function initLang(saved) {
  await setLang(LANGS.includes(saved) ? saved : fromDevice());
}
export async function setLang(l) {
  if (!LANGS.includes(l)) l = 'en';
  let tab = {};
  if (l !== 'ko') {
    try { tab = (await import(`../lang/${l}.js${V}`)).default || {}; } catch (e) { console.warn('번역표를 못 읽었어요', l, e); }
  }
  lang = l; TAB = tab;
  document.documentElement.lang = l;
  applyFont(l);
}
export const getLang = () => lang;

// 한국어 원문 → 지금 언어
export const tr = s => (lang === 'ko' || s == null ? s : TAB[s] ?? s);
// 자리표시 {이름} 채우기: tf('힌트 {n}번', { n: 2 })
export const tf = (s, vars = {}) => tr(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
