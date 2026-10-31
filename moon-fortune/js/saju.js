// 만세력 계산 — 년주(입춘 기준), 월주(절기 = 태양황경), 일주(율리우스일), 시주(한국 표준시 -30분 보정)
const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
const STEMS_H = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
const BRANCHES_H = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ANIMALS = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];
const ANIMAL_EMOJI = ['🐭', '🐮', '🐯', '🐰', '🐲', '🐍', '🐴', '🐑', '🐵', '🐔', '🐶', '🐷'];
// 오행: 0 목, 1 화, 2 토, 3 금, 4 수
const ELEMENTS = ['목', '화', '토', '금', '수'];
const ELEMENTS_H = ['木', '火', '土', '金', '水'];
const STEM_EL = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
const BRANCH_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
const HOUR_NAMES = ['자시 (23:30~01:29)', '축시 (01:30~03:29)', '인시 (03:30~05:29)', '묘시 (05:30~07:29)',
  '진시 (07:30~09:29)', '사시 (09:30~11:29)', '오시 (11:30~13:29)', '미시 (13:30~15:29)',
  '신시 (15:30~17:29)', '유시 (17:30~19:29)', '술시 (19:30~21:29)', '해시 (21:30~23:29)'];

// 대한민국 주요 지역 경도. 저장된 예전 프로필은 서울을 기본값으로 사용한다.
const BIRTH_PLACES = {
  seoul: { name: '서울·경기', lon: 126.9780 }, incheon: { name: '인천', lon: 126.7052 },
  gangneung: { name: '강원·강릉', lon: 128.8761 }, daejeon: { name: '대전·충청', lon: 127.3845 },
  daegu: { name: '대구·경북', lon: 128.6014 }, busan: { name: '부산·경남', lon: 129.0756 },
  ulsan: { name: '울산', lon: 129.3114 }, gwangju: { name: '광주·전라', lon: 126.8526 },
  jeju: { name: '제주', lon: 126.5312 },
};

function mod(n, m) { return ((n % m) + m) % m; }

function jdn(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a, mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

// IANA Asia/Seoul 자료를 이용해 과거 UTC+8:30 및 서머타임까지 반영한다.
function offsetAtUtc(utcMs) {
  try {
    const z = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', timeZoneName: 'longOffset' })
      .formatToParts(new Date(utcMs)).find(x => x.type === 'timeZoneName').value;
    const m = z.match(/GMT([+-])(\d{2}):(\d{2})/);
    if (m) return (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +m[3]);
  } catch (e) { }
  return 540;
}

function koreaOffsetMinutes(y, m, d, hour = 12, min = 0) {
  const wall = Date.UTC(y, m - 1, d, hour, min);
  let off = 540;
  for (let i = 0; i < 2; i++) off = offsetAtUtc(wall - off * 60000);
  return off;
}

function localCivilJD(y, m, d, hour = 12, min = 0) {
  return jdn(y, m, d) - 0.5 + (hour * 60 + min - koreaOffsetMinutes(y, m, d, hour, min)) / 1440;
}

function solarClock(p) {
  const place = BIRTH_PLACES[p.loc] || BIRTH_PLACES.seoul;
  const offset = koreaOffsetMinutes(p.y, p.m, p.d, p.hour || 0, p.min || 0);
  const correction = place.lon * 4 - offset;
  return { place, correction, minutes: (p.hour || 0) * 60 + (p.min || 0) + correction };
}

// 태양의 겉보기 황경 (Meeus 저정밀 공식, 오차 약 0.01°)
function sunLongitude(jd) {
  const T = (jd - 2451545) / 36525;
  const rad = Math.PI / 180;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * rad;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
  const om = (125.04 - 1934.136 * T) * rad;
  return mod(L0 + C - 0.00569 - 0.00478 * Math.sin(om), 360);
}

function pillar(stem, branch) {
  return { s: stem, b: branch, text: STEMS[stem] + BRANCHES[branch], han: STEMS_H[stem] + BRANCHES_H[branch] };
}
function pillarIdx(i60) { return pillar(i60 % 10, i60 % 12); }

function dayPillar(y, m, d) { return pillarIdx(mod(jdn(y, m, d) + 49, 60)); }

// 해당 시각(한국 표준시)의 년주·월주
function yearMonthPillars(y, m, d, hour = 12, min = 0) {
  const jd = localCivilJD(y, m, d, hour, min);
  const lon = sunLongitude(jd);
  const k = Math.floor(mod(lon - 315, 360) / 30); // 0 = 인월(입춘) … 11 = 축월(소한)
  const sy = (m <= 2 && k >= 10) ? y - 1 : y;
  const ys = mod(sy - 4, 10), yb = mod(sy - 4, 12);
  const ms = mod((ys % 5) * 2 + 2 + k, 10), mb = mod(2 + k, 12);
  return { year: pillar(ys, yb), month: pillar(ms, mb), sajuYear: sy };
}

function addDays(y, m, d, n) {
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()];
}

// profile: { y, m, d, hour (null = 모름), min }
function computeSaju(p) {
  const hasTime = p.hour !== null && p.hour !== undefined;
  const h = hasTime ? p.hour : 12, mi = hasTime ? (p.min || 0) : 0;
  const ym = yearMonthPillars(p.y, p.m, p.d, h, mi);
  // 출생지 경도·당시 표준시를 반영한 진태양시. 야자시는 진태양시 23:00부터 다음 날 일진으로 본다.
  const sc = hasTime ? solarClock(p) : null;
  const solarDayShift = sc ? Math.floor(sc.minutes / 1440) : 0;
  const solarMin = sc ? mod(sc.minutes, 1440) : h * 60 + mi;
  const solarDate = solarDayShift ? addDays(p.y, p.m, p.d, solarDayShift) : [p.y, p.m, p.d];
  const late = hasTime && solarMin >= 23 * 60;
  const dd = late ? addDays(solarDate[0], solarDate[1], solarDate[2], 1) : solarDate;
  const day = dayPillar(dd[0], dd[1], dd[2]);
  let hourP = null;
  if (hasTime) {
    const hb = Math.floor(mod(solarMin + 60, 1440) / 120);
    hourP = pillar(mod((day.s % 5) * 2 + hb, 10), hb);
  }
  const pillars = [hourP, day, ym.month, ym.year];
  const count = [0, 0, 0, 0, 0];
  pillars.forEach(pp => { if (pp) { count[STEM_EL[pp.s]]++; count[BRANCH_EL[pp.b]]++; } });
  return { year: ym.year, month: ym.month, day, hour: hourP, count, me: day.s, meEl: STEM_EL[day.s], animal: ym.year.b, solarClock: sc };
}

// 월주가 바뀌는 절입(315°부터 30° 간격)과의 대략적인 거리. 경계 오차 안내에만 사용한다.
function sajuBoundaryWarning(p) {
  const hasTime = p.hour !== null && p.hour !== undefined;
  const h = hasTime ? p.hour : 12, mi = hasTime ? (p.min || 0) : 0;
  const lon = sunLongitude(localCivilJD(p.y, p.m, p.d, h, mi));
  const rem = mod(lon - 315, 30);
  const minutes = Math.min(rem, 30 - rem) / 0.98564736 * 1440;
  if (!hasTime && minutes <= 12 * 60) return '태어난 시간이 없는 절기 경계일이라 연주·월주가 달라질 수 있어요.';
  if (hasTime && minutes <= 30) return '절기 전환 시각과 가까워 전문 만세력과 연주·월주가 다를 수 있어요.';
  return '';
}

// 나(일간 오행) 기준으로 상대 오행과의 관계
// in: 나를 돕는 기운(인성), bi: 같은 기운(비겁), sik: 내가 만드는 기운(식상), jae: 내가 다스리는 기운(재성), gwan: 나를 다스리는 기운(관성)
function relation(me, other) {
  if (me === other) return 'bi';
  if (mod(other + 1, 5) === me) return 'in';
  if (mod(me + 1, 5) === other) return 'sik';
  if (mod(me + 2, 5) === other) return 'jae';
  return 'gwan';
}

// 지지 관계: 육합 / 충 / 삼합
const SIX_HARMONY = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
function branchRel(a, b) {
  if (SIX_HARMONY.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) return 'hap';
  if (mod(a - b, 12) === 6) return 'chung';
  if (a !== b && mod(a - b, 4) === 0) return 'samhap';
  return 'none';
}

// 양력 생일 → 별자리 인덱스 (0 양자리 … 11 물고기자리)
function zodiacOf(m, d) {
  const STARTS = [[120, 10], [219, 11], [321, 0], [420, 1], [521, 2], [622, 3], [723, 4], [823, 5], [923, 6], [1023, 7], [1123, 8], [1222, 9]];
  const v = m * 100 + d;
  let sign = 9;
  for (const [start, idx] of STARTS) if (v >= start) sign = idx;
  return sign;
}
