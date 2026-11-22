// 🆕 2026-11-22 게임 제목 (구 제목: 일곱 번째 달 / SEVENTH MOON)
//   main = 큰 제목, sub = 부제, store = 스토어·브라우저 탭에 쓰는 한 줄
//   ✏️ 2026-11-22 글로벌 동시 출시 → 이름을 'Blackmoon(블랙문)' 하나로. 한국어·일본어는 소리 나는 대로 크게 + 작은 글자로 흑월/黒月,
//   중국어만 뜻 글자 黑月(음역은 어색) + 작은 BLACKMOON. 나머지 언어는 Blackmoon + 번역한 부제.
//   ruby = 큰 제목 위 작은 글자, logo = assets/ui/logo_<언어>.png (없으면 en)
//   주의: 중국어는 '六月'(6월)로 읽히지 않게 '六轮明月'을 쓴다. 한국어 '여섯 달'은 흑월과 함께 쓰여 '달(moon)'로 읽힌다.
//   이야기 속 용어 '일곱 번째 달'(흑월의 다른 이름)은 그대로 둔다.
const GAME_TITLE = {
  ko: { main: '블랙문', sub: '여섯 달의 수호자', ruby: '흑월', logo: 'ko' },
  en: { main: 'Blackmoon', sub: 'Guardians of the Six Moons', logo: 'en' },
  ja: { main: 'ブラックムーン', sub: '六つの月の守護者', ruby: '黒月', logo: 'ja' },
  'zh-Hans': { main: '黑月', sub: '六轮明月的守护者', ruby: 'BLACKMOON', logo: 'zh' },
  'zh-Hant': { main: '黑月', sub: '六輪明月的守護者', ruby: 'BLACKMOON', logo: 'zht' },
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
  return { ...t, logo: 'logo_' + (t.logo || 'en'), store: `${t.main}: ${t.sub}`, brand: GAME_TITLE.en.main };
}
