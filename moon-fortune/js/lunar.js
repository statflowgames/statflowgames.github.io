// 한국 음력 ↔ 양력 — 삭(합삭)과 중기를 직접 계산 (Meeus 49장 + saju.js 의 sunLongitude)
// 달의 첫날 = 한국 시간으로 합삭이 든 날, 동지가 든 달 = 11월, 중기 없는 첫 달 = 윤달

// 한국 표준시 (1908~1911, 1954~1961 은 UTC+8:30)
function kstOffsetHours(jd) {
  const y = 2000 + (jd - 2451545) / 365.25;
  if ((y >= 1908.25 && y < 1912) || (y >= 1954.22 && y < 1961.6)) return 8.5;
  return 9;
}
// ΔT (지구 자전 지연, 초) — 대략값이면 충분
function deltaT(jd) {
  const y = 2000 + (jd - 2451545) / 365.25;
  if (y < 1950) return 24 + (y - 1920) * 0.2;
  if (y < 1986) return 29 + (y - 1950) * 0.75;
  if (y < 2005) return 56 + (y - 1986) * 0.4;
  return 64 + (y - 2005) * 0.3;
}
// 율리우스일(UT) → 한국 날짜의 JDN
function jdToLocalJdn(jdUT) { return Math.floor(jdUT + kstOffsetHours(jdUT) / 24 + 0.5); }

// k번째 합삭의 시각 (UT, 율리우스일). k=0 은 2000-01-06
function newMoonJD(k) {
  const T = k / 1236.85, T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  const rad = Math.PI / 180, sin = x => Math.sin(x * rad);
  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2 - 0.00000015 * T3 + 0.00000000073 * T4;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const M = 2.5534 + 29.1053567 * k - 0.0000014 * T2 - 0.00000011 * T3;
  const Mp = 201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4;
  const F = 160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4;
  const Om = 124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3;
  jde += -0.4072 * sin(Mp) + 0.17241 * E * sin(M) + 0.01608 * sin(2 * Mp) + 0.01039 * sin(2 * F)
    + 0.00739 * E * sin(Mp - M) - 0.00514 * E * sin(Mp + M) + 0.00208 * E * E * sin(2 * M)
    - 0.00111 * sin(Mp - 2 * F) - 0.00057 * sin(Mp + 2 * F) + 0.00056 * E * sin(2 * Mp + M)
    - 0.00042 * sin(3 * Mp) + 0.00042 * E * sin(M + 2 * F) + 0.00038 * E * sin(M - 2 * F)
    - 0.00024 * E * sin(2 * Mp - M) - 0.00017 * sin(Om) - 0.00007 * sin(Mp + 2 * M)
    + 0.00004 * sin(2 * Mp - 2 * F) + 0.00004 * sin(3 * M) + 0.00003 * sin(Mp + M - 2 * F)
    + 0.00003 * sin(2 * Mp + 2 * F) - 0.00003 * sin(Mp + M + 2 * F) + 0.00003 * sin(Mp - M + 2 * F)
    - 0.00002 * sin(Mp - M - 2 * F) - 0.00002 * sin(3 * Mp + M) + 0.00002 * sin(4 * Mp);
  const A = [[299.77, 0.107408, 0.000325], [251.88, 0.016321, 0.000165], [251.83, 26.651886, 0.000164],
    [349.42, 36.412478, 0.000126], [84.66, 18.206239, 0.00011], [141.74, 53.303771, 0.000062],
    [207.14, 2.453732, 0.00006], [154.84, 7.30686, 0.000056], [34.52, 27.261239, 0.000047],
    [207.19, 0.121824, 0.000042], [291.34, 1.844379, 0.00004], [161.72, 24.198154, 0.000037],
    [239.56, 25.513099, 0.000035], [331.55, 3.592518, 0.000023]];
  for (const [a, b, c] of A) jde += c * sin(a + b * k);
  return jde - deltaT(jde) / 86400;
}
const newMoonDay = k => jdToLocalJdn(newMoonJD(k));
// 해당 날짜(JDN)와 같거나 앞선 마지막 초하루의 k
function newMoonOnOrBefore(dayJdn) {
  let k = Math.floor((dayJdn - 2451550.1) / 29.530588861) + 1;
  while (newMoonDay(k) > dayJdn) k--;
  while (newMoonDay(k + 1) <= dayJdn) k++;
  return k;
}
// 태양 황경이 lon 이 되는 순간 (UT) — 근처 날짜 jdGuess 부터 뉴턴법
function solarTermJD(lon, jdGuess) {
  let jd = jdGuess;
  for (let i = 0; i < 8; i++) {
    let diff = lon - sunLongitude(jd + deltaT(jd) / 86400);
    diff = ((diff + 540) % 360) - 180;
    jd += diff / 0.98564736;
  }
  return jd;
}
const winterSolsticeDay = y => jdToLocalJdn(solarTermJD(270, jdn(y, 12, 21)));

// 음력 y년 정월 앞의 동지달(11월)부터 다음 동지달 직전까지의 달 목록
const _suiCache = {};
function lunarSui(y) {
  if (_suiCache[y]) return _suiCache[y];
  const k0 = newMoonOnOrBefore(winterSolsticeDay(y - 1));
  const k1 = newMoonOnOrBefore(winterSolsticeDay(y));
  const starts = [];
  for (let k = k0; k <= k1; k++) starts.push(newMoonDay(k));
  const n = k1 - k0;
  let leapIdx = -1;
  if (n === 13) {
    for (let i = 1; i < n; i++) {
      // 이 달 안에 중기(황경 30°의 배수)가 있는지
      const a = starts[i], b = starts[i + 1];
      const lon0 = sunLongitude(a - 0.5 - kstOffsetHours(a) / 24 + deltaT(a) / 86400);
      const lon1 = sunLongitude(b - 0.5 - kstOffsetHours(b) / 24 + deltaT(b) / 86400);
      if (Math.floor(lon0 / 30) === Math.floor(lon1 / 30)) { leapIdx = i; break; }
    }
  }
  const months = [];
  let num = 10;
  for (let i = 0; i < n; i++) {
    const leap = i === leapIdx;
    if (!leap) num = num % 12 + 1;
    // 11·12월은 앞 해(y-1) 소속
    months.push({ year: (i < 3 && num >= 11) ? y - 1 : y, month: num, leap, start: starts[i], days: starts[i + 1] - starts[i] });
  }
  return (_suiCache[y] = months);
}

function jdnToYmd(J) {
  const a = J + 32044, b = Math.floor((4 * a + 3) / 146097), c = a - Math.floor(146097 * b / 4);
  const d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor(1461 * d / 4), m = Math.floor((5 * e + 2) / 153);
  return [100 * b + d - 4800 + Math.floor(m / 10), m + 3 - 12 * Math.floor(m / 10), e - Math.floor((153 * m + 2) / 5) + 1];
}

// 음력 → 양력. 없는 날짜면 { error }
function lunarToSolar(ly, lm, ld, leap = false) {
  const sui = lunarSui(lm >= 11 ? ly + 1 : ly);
  const mo = sui.find(x => x.year === ly && x.month === lm && x.leap === !!leap);
  if (!mo) return { error: leap ? `${ly}년에는 윤${lm}월이 없어요` : '날짜를 확인해 주세요' };
  if (ld < 1 || ld > mo.days) return { error: `${ly}년 음력 ${leap ? '윤' : ''}${lm}월은 ${mo.days}일까지예요` };
  const [y, m, d] = jdnToYmd(mo.start + ld - 1);
  return { y, m, d };
}

// 양력 → 음력
function solarToLunar(y, m, d) {
  const J = jdn(y, m, d);
  for (const sy of [y, y + 1]) {
    for (const mo of lunarSui(sy)) {
      if (J >= mo.start && J < mo.start + mo.days) return { y: mo.year, m: mo.month, d: J - mo.start + 1, leap: mo.leap };
    }
  }
  return null;
}
// 그 해의 윤달 (없으면 0)
function leapMonthOf(ly) {
  for (const sy of [ly, ly + 1]) {
    const mo = lunarSui(sy).find(x => x.leap && x.year === ly);
    if (mo) return mo.month;
  }
  return 0;
}
