// 화면 글자: 언어별 묶음. 처음엔 기기 언어(한국어가 아니면 영어), 타이틀의 언어 버튼으로 바꿀 수 있다.
// 지금은 버튼·상태 줄·타이틀·일시정지 메뉴까지. 스테이지 이름·설명·도감·대사는 아직 한국어만 있다.
export const LANGS = ['ko', 'en'];
let lang = 'ko';

const S = {
  ko: {
    'btn.map': '전체 보기', 'btn.meow': '야옹', 'btn.act': '행동',
    'aria.pause': '일시정지', 'aria.map': '맵 전체 보기 (누르고 있기)', 'aria.meow': '야옹 — 경비를 소리로 꾀어내기', 'aria.act': '행동',
    'st.look': '둘러보는 중…', 'st.chase': '쫓기는 중! 숨어요!', 'st.ride': '청소기 탑승 중', 'st.hide': '숨는 중',
    'st.sus': '수상하게 여기는 중…', 'st.fish': '생선 확보! 고양이 문으로', 'st.sneak': '살금살금…',
    'goal.safe': '안 들킴', 'goal.spotted': '들켰다',
    'title.name': '도둑 고양이', 'title.sub': '오늘 밤도 생선은 내 거야', 'title.start': '시작하기', 'title.continue': '이어하기',
    'title.ward': '고양이 옷장', 'title.den': '비밀 아지트',
    'tg.sound': '효과음', 'tg.music': '음악', 'tg.vib': '진동', 'tg.lefty': '왼손', 'tg.lang': '한국어',
    'pause.title': '일시정지', 'pause.resume': '계속하기', 'pause.retry': '처음부터', 'pause.list': '스테이지 목록',
  },
  en: {
    'btn.map': 'Map', 'btn.meow': 'Meow', 'btn.act': 'Action',
    'aria.pause': 'Pause', 'aria.map': 'View the whole map (hold)', 'aria.meow': 'Meow — lure guards with sound', 'aria.act': 'Action',
    'st.look': 'Looking around…', 'st.chase': 'Chased! Hide!', 'st.ride': 'Riding the robot vacuum', 'st.hide': 'Hiding',
    'st.sus': 'Someone is suspicious…', 'st.fish': 'Got the fish! To the cat door', 'st.sneak': 'Sneaking…',
    'goal.safe': 'Unseen', 'goal.spotted': 'Spotted',
    'title.name': 'Sneaky Cat', 'title.sub': 'Tonight, the fish is mine again', 'title.start': 'Start', 'title.continue': 'Continue',
    'title.ward': 'Wardrobe', 'title.den': 'Secret Hideout',
    'tg.sound': 'Sound', 'tg.music': 'Music', 'tg.vib': 'Vibration', 'tg.lefty': 'Left hand', 'tg.lang': 'English',
    'pause.title': 'Paused', 'pause.resume': 'Resume', 'pause.retry': 'Restart', 'pause.list': 'Stage list',
  },
};
// 행동 버튼 이름 (게임 규칙 쪽은 한국어 이름을 그대로 쓰고, 보여 줄 때만 바꾼다)
const ACT = {
  en: { '환풍구': 'Vent', '타기': 'Ride', '카트에 숨기': 'Hide in cart', '목마 타기': 'Ride horse', '내리기': 'Get off', '넘어뜨리기': 'Knock over', '전원 끄기': 'Power off' },
};

export function initLang(saved) {
  const dev = (navigator.language || 'ko').toLowerCase();
  setLang(LANGS.includes(saved) ? saved : dev.startsWith('ko') ? 'ko' : 'en');
}
export function setLang(l) { lang = l; document.documentElement.lang = l; }
export const getLang = () => lang;
export const nextLang = () => LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length];
export const t = (k) => (S[lang] && S[lang][k]) ?? S.ko[k] ?? k;
export const tAct = (label) => (ACT[lang] && ACT[lang][label]) || label;
