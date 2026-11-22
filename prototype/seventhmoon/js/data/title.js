// 🆕 2026-11-22 게임 제목 (구 제목: 일곱 번째 달 / SEVENTH MOON)
//   main = 큰 제목, sub = 부제, store = 스토어·브라우저 탭에 쓰는 한 줄
//   원칙: 한·중·일은 제목을 그 나라 글자로, 나머지 언어는 영어 브랜드 'Blackmoon'을 그대로 쓰고 부제만 번역 (검색·기억이 한 이름으로 모이게)
//   주의: 중국어는 '六月'(6월)로 읽히지 않게 '六轮明月'을 쓴다. 한국어 '여섯 달'은 흑월과 함께 쓰여 '달(moon)'로 읽힌다.
//   이야기 속 용어 '일곱 번째 달'(흑월의 다른 이름)은 그대로 둔다.
const GAME_TITLE = {
  ko: { main: '흑월', sub: '여섯 달의 수호자' },
  en: { main: 'Blackmoon', sub: 'Guardians of the Six Moons' },
  ja: { main: '黒月', sub: '六つの月の守護者' },
  'zh-Hans': { main: '黑月', sub: '六轮明月的守护者' },
  'zh-Hant': { main: '黑月', sub: '六輪明月的守護者' },
  es: { main: 'Blackmoon', sub: 'Guardianes de las Seis Lunas' },
  pt: { main: 'Blackmoon', sub: 'Guardiões das Seis Luas' },
  fr: { main: 'Blackmoon', sub: 'Les Gardiens des Six Lunes' },
  de: { main: 'Blackmoon', sub: 'Hüter der sechs Monde' },
  it: { main: 'Blackmoon', sub: 'Guardiani delle Sei Lune' },
  ru: { main: 'Blackmoon', sub: 'Хранители шести лун' },
  tr: { main: 'Blackmoon', sub: 'Altı Ayın Muhafızları' },
  id: { main: 'Blackmoon', sub: 'Penjaga Enam Bulan' },
  vi: { main: 'Blackmoon', sub: 'Hộ Vệ Sáu Mặt Trăng' },
  th: { main: 'Blackmoon', sub: 'ผู้พิทักษ์จันทร์ทั้งหก' },
};
// 지금은 한국어 화면만 있다. 다국어를 붙이면 lang을 넘긴다.
function gameTitle(lang = 'ko') {
  const t = GAME_TITLE[lang] || GAME_TITLE[String(lang).split('-')[0]] || GAME_TITLE.en;
  return { ...t, store: `${t.main}: ${t.sub}`, brand: GAME_TITLE.en.main };
}
