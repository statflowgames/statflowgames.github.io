// 화면 글자 번역.
// 원문은 코드에 한국어 그대로 두고, 보여 줄 때 tr('한국어 원문') / tf('원문 {n}', { n }) 로 감싼다.
// 다른 언어는 lang/<코드>.js 의 { '한국어 원문': '번역' } 표에서 찾고, 없으면 한국어를 그대로 보여 준다.
// 표 만들기·빠진 문장 찾기: python tools/i18n.py
const V = new URL(import.meta.url).search; // 같은 ?v= 로 번역표도 새로 받기

export const LANGS = ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'es', 'pt-BR', 'de', 'fr', 'it', 'ru', 'uk', 'pl', 'nl', 'sv', 'tr', 'id', 'ms', 'vi', 'th', 'hi'];
export const LANG_NAMES = {
  ko: '한국어', en: 'English', ja: '日本語', 'zh-CN': '简体中文', 'zh-TW': '繁體中文', es: 'Español', 'pt-BR': 'Português (Brasil)',
  de: 'Deutsch', fr: 'Français', it: 'Italiano', ru: 'Русский', uk: 'Українська', pl: 'Polski', nl: 'Nederlands', sv: 'Svenska',
  tr: 'Türkçe', id: 'Bahasa Indonesia', ms: 'Bahasa Melayu', vi: 'Tiếng Việt', th: 'ไทย', hi: 'हिन्दी',
};
let lang = 'ko';
let TAB = {};

// 이름표로 찾는 글자 (원문 한국어). 다른 언어는 이 원문을 번역표에서 찾는다.
const S = {
  'btn.map': '전체 보기', 'btn.meow': '야옹', 'btn.act': '행동',
  'aria.pause': '일시정지', 'aria.map': '맵 전체 보기 (누르고 있기)', 'aria.meow': '야옹 — 경비를 소리로 꾀어내기', 'aria.act': '행동',
  'st.look': '둘러보는 중…', 'st.chase': '쫓기는 중! 숨어요!', 'st.ride': '청소기 탑승 중', 'st.hide': '숨는 중',
  'st.sus': '수상하게 여기는 중…', 'st.fish': '생선 확보! 고양이 문으로', 'st.sneak': '살금살금…',
  'goal.safe': '안 들킴', 'goal.spotted': '들켰다',
  'title.name': '몰래냥', 'title.sub': '오늘 밤도 생선은 내 거야', 'title.start': '시작하기', 'title.continue': '이어하기',
  'title.ward': '고양이 옷장', 'title.den': '비밀 아지트',
  'tg.sound': '효과음', 'tg.music': '음악', 'tg.vib': '진동', 'tg.lefty': '왼손',
  'pause.title': '일시정지', 'pause.resume': '계속하기', 'pause.retry': '처음부터', 'pause.list': '스테이지 목록',
  'exit.again': '한 번 더 누르면 게임을 끝내요',
  'title.settings': '설정',
  'set.title': '설정', 'set.sound': '🔊 소리와 진동', 'set.play': '🎮 조작', 'set.leftyDesc': '야옹·행동 버튼을 왼쪽에 두고 오른손으로 고양이를 움직여요',
  'set.lang': '언어', 'set.info': '정보', 'set.privacy': '개인정보처리방침', 'set.contact': '문의하기', 'set.maker': '만든 곳', 'set.version': '버전', 'set.web': '웹 체험판',
  'set.data': '💾 데이터', 'set.reset': '모든 기록 지우기', 'set.resetDesc': '별·생선뼈·옷장·아지트·의뢰 기록이 모두 사라지고 처음부터 시작해요',
  'set.resetQ': '정말 다 지울까요?', 'set.resetWarn': '지운 기록은 되돌릴 수 없어요.', 'set.resetYes': '네, 모두 지울래요', 'set.cancel': '취소',
};

// 언어별 글꼴 (한국어·영어는 Jua). 고를 때만 Google Fonts 에서 받는다. 중국어·일본어는 쓰는 글자만 나눠 받는다.
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
    if (l.startsWith('nb') || l.startsWith('no')) continue;
    const base = l.split('-')[0];
    const hit = LANGS.find((c) => c.toLowerCase() === base);
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
  document.documentElement.dataset.lang = l;
  applyFont(l);
}
export const getLang = () => lang;

// 한국어 원문 → 지금 언어
export const tr = (s) => (lang === 'ko' || s == null ? s : TAB[s] ?? s);
// 자리표시 {이름} 채우기: tf('생선뼈가 {n}개 모자라요', { n: 3 })
export const tf = (s, vars = {}) => tr(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
export const t = (k) => (k in S ? tr(S[k]) : k);
// 행동 버튼 이름 (게임 규칙 쪽은 한국어 이름을 그대로 쓰고, 보여 줄 때만 바꾼다)
export const tAct = (label) => tr(label);
