// 운세 결과 만들기 — 같은 사람·같은 날짜·같은 종류면 언제 봐도 같은 결과
function hashStr(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  return h1 >>> 0;
}
function rngFor(...parts) {
  let a = hashStr(parts.join('|'));
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function profileKey(p) { return [p.y, p.m, p.d, p.hour, p.min, p.gender].join('-'); }

// ---------- 십신 ----------
const BRANCH_MAIN = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8]; // 지지의 본기(정기) 천간
// 지장간과 계절 내 상대 비중(정기·중기·여기). 신강·십신 계산에 본기 하나만 쓰던 방식을 보완한다.
const BRANCH_HIDDEN = [
  [[9, 1]], [[5, .6], [9, .3], [7, .1]], [[0, .6], [2, .3], [4, .1]], [[1, 1]],
  [[4, .6], [1, .3], [9, .1]], [[2, .6], [4, .3], [6, .1]], [[3, .7], [5, .3]],
  [[5, .6], [3, .3], [1, .1]], [[6, .6], [8, .3], [4, .1]], [[7, 1]],
  [[4, .6], [7, .3], [3, .1]], [[8, .7], [0, .3]],
];
const TG_BY_REL = { bi: ['bigyeon', 'geopjae'], sik: ['siksin', 'sanggwan'], jae: ['pyeonjae', 'jeongjae'], gwan: ['pyeongwan', 'jeonggwan'], in: ['pyeonin', 'jeongin'] };
function tenGod(me, stem) {
  return TG_BY_REL[relation(STEM_EL[me], STEM_EL[stem])][me % 2 === stem % 2 ? 0 : 1];
}
const tgOfBranch = (me, b) => tenGod(me, BRANCH_MAIN[b]);

// 사주 원국 분석: 십신 배치, 신강·신약, 용신, 대운
function analyzeSaju(p) {
  const s = computeSaju(p);
  const me = s.me, meEl = s.meEl;
  const cols = [s.hour, s.day, s.month, s.year];
  const groups = { bi: 0, sik: 0, jae: 0, gwan: 0, in: 0 };
  const weightedCount = [0, 0, 0, 0, 0];
  weightedCount[meEl] = 1; // 일간 자체는 오행 분포에는 포함하되 신강 비율의 분모에서는 제외한다.
  let support = 0, total = 0;
  cols.forEach((pp, i) => {
    if (!pp) return;
    if (i !== 1) {
      groups[TEN_GODS[tenGod(me, pp.s)].group]++;
      weightedCount[STEM_EL[pp.s]]++;
    }
    const branchWeight = i === 2 ? 3 : i === 1 ? 1.5 : 1;
    const items = [];
    BRANCH_HIDDEN[pp.b].forEach(([stem, share]) => {
      const w = branchWeight * share;
      groups[TEN_GODS[tenGod(me, stem)].group] += w;
      weightedCount[STEM_EL[stem]] += w;
      items.push([STEM_EL[stem], w]);
    });
    if (i !== 1) items.push([STEM_EL[pp.s], 1]);
    for (const [el, w] of items) {
      total += w;
      if (el === meEl || el === mod(meEl + 4, 5)) support += w;
    }
  });
  const ratio = support / total;
  const strength = ratio >= 0.55 ? 'strong' : ratio <= 0.4 ? 'weak' : 'balanced';
  const lowest = els => els.reduce((a, b) => weightedCount[b] < weightedCount[a] ? b : a);
  const yong = strength === 'strong' ? lowest([mod(meEl + 1, 5), mod(meEl + 2, 5), mod(meEl + 3, 5)])
    : strength === 'weak' ? lowest([mod(meEl + 4, 5), meEl]) : lowest([0, 1, 2, 3, 4]);
  return { s, groups, weightedCount, ratio, strength, yong, daeun: computeDaeun(p, s) };
}

// 대운: 년간 음양 + 성별로 순행/역행, 다음(이전) 절기까지 날수 ÷ 3 = 대운 시작 나이
function computeDaeun(p, s) {
  const hasTime = p.hour !== null && p.hour !== undefined;
  const jdB = localCivilJD(p.y, p.m, p.d, hasTime ? p.hour : 12, hasTime ? p.min : 0);
  const lon = sunLongitude(jdB);
  const forward = (s.year.s % 2 === 0) === (p.gender === 'm');
  let days;
  if (forward) {
    const target = mod(15 + 30 * Math.floor((lon - 15) / 30) + 30, 360);
    days = solarTermJD(target, jdB + mod(target - lon, 360) / 0.9856) - jdB;
  } else {
    const target = mod(15 + 30 * Math.floor((lon - 15) / 30), 360);
    days = jdB - solarTermJD(target, jdB - mod(lon - target, 360) / 0.9856);
  }
  // 3일=1년, 1일=4개월로 환산해 시작 시점을 월 단위로 보존한다.
  const startMonths = clamp(Math.round(days * 4), 1, 120);
  let m60 = 0;
  while (m60 % 10 !== s.month.s || m60 % 12 !== s.month.b) m60++;
  const list = [];
  for (let n = 1; n <= 9; n++) {
    const gz = pillarIdx(mod(m60 + (forward ? n : -n), 60));
    const tg = tenGod(s.me, gz.s), tgB = tgOfBranch(s.me, gz.b);
    const sc = Math.round((TEN_GODS[tg].base * 2 + TEN_GODS[tgB].base) / 3);
    const totalMonths = startMonths + (n - 1) * 120;
    list.push({ age: Math.floor(totalMonths / 12), ageMonth: totalMonths % 12, totalMonths, gz, tg, tgB, score: sc });
  }
  return { start: Math.floor(startMonths / 12), startMonth: startMonths % 12, startMonths, forward, list };
}

function ageNow(p, now) {
  return now[0] - p.y - ((now[1] * 100 + now[2]) < (p.m * 100 + p.d) ? 1 : 0);
}
function ageMonthsNow(p, now) {
  return Math.max(0, (now[0] - p.y) * 12 + now[1] - p.m - (now[2] < p.d ? 1 : 0));
}
const ageLabel = x => `${x.age}세${x.ageMonth ? ` ${x.ageMonth}개월` : ''}`;

// 어떤 간지가 들어올 때의 점수 (천간 십신 2 : 지지 십신 1, 일지와 합·충, 용신이면 가산)
function scoreFor(p, s, gz, salt, yong) {
  const tg = tenGod(s.me, gz.s), tgB = tgOfBranch(s.me, gz.b);
  const br = branchRel(s.day.b, gz.b);
  const r = rngFor(profileKey(p), salt);
  const bonus = (br === 'hap' ? 6 : br === 'samhap' ? 4 : br === 'chung' ? -9 : 0)
    + (yong !== undefined && STEM_EL[gz.s] === yong ? 5 : 0);
  const base = (TEN_GODS[tg].base * 2 + TEN_GODS[tgB].base) / 3;
  const score = clamp(Math.round(base + bonus + (r() - 0.5) * 22), 38, 97);
  return { tg, tgB, rel: TEN_GODS[tg].group, br, score, r };
}

function catLevels(tg, score, r) {
  const T = TEN_GODS[tg];
  return CATS.map(c => {
    const lv = clamp(Math.round(score / 20 + CAT_BIAS[T.group][c.key] + (r() - 0.5) * 1.6), 1, 5);
    return { ...c, lv, text: `${pick(r, CAT_TEXT[c.key][lv - 1])} ${T.cat[c.key]}` };
  });
}

function luckyFor(p, s, r, yong) {
  const lack = s.count.indexOf(Math.min(...s.count));
  const el = yong !== undefined ? (r() < 0.7 ? yong : lack) : lack;
  const info = ELEMENT_INFO[el];
  const hourBranches = BRANCHES.map((_, i) => i).filter(i => BRANCH_EL[i] === el);
  const hb = hourBranches.length ? pick(r, hourBranches) : 6;
  return {
    color: info.color, hex: info.colorHex, dir: info.dir,
    num: pick(r, info.nums) + (r() < 0.4 ? 10 * Math.floor(r() * 4 + 1) : 0),
    item: pick(r, LUCKY_ITEMS), food: pick(r, LUCKY_FOODS),
    time: HOUR_NAMES[hb].replace(/\s.*$/, '') + ' ' + HOUR_NAMES[hb].match(/\((.*)\)/)[1],
  };
}

// ---------- 화면 조각 ----------
function ringHTML(score, label = '종합 점수') {
  const C = 2 * Math.PI * 64;
  return `<div class="ring"><svg viewBox="0 0 150 150">
    <circle cx="75" cy="75" r="64" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="12"/>
    <circle cx="75" cy="75" r="64" fill="none" stroke="url(#gg)" stroke-width="12" stroke-linecap="round"
      stroke-dasharray="${C}" stroke-dashoffset="${C}" data-to="${C * (1 - score / 100)}" class="ringbar"/>
    <defs><linearGradient id="gg"><stop offset="0" stop-color="#ffb347"/><stop offset="1" stop-color="#ffd36e"/></linearGradient></defs>
  </svg><div class="v"><b data-count="${score}">0</b><span>${label}</span></div></div>`;
}
function starsHTML(lv) { return `<span class="stars">${'★'.repeat(lv)}<i>${'★'.repeat(5 - lv)}</i></span>`; }
const lvOf = sc => clamp(Math.round((sc - 30) / 14), 1, 5);
function catsHTML(cats) {
  return `<div class="card"><h3>📊 분야별 운세</h3>${cats.map(c =>
    `<div class="cat"><div class="row"><span>${c.icon} ${c.name}</span>${starsHTML(c.lv)}</div><p>${c.text}</p></div>`).join('')}</div>`;
}
function luckyHTML(L, title = '🍀 행운 아이템') {
  return `<div class="card"><h3>${title}</h3><div class="lucky">
    <div><small>행운의 색</small><b><span class="dot" style="background:${L.hex}"></span>${L.color}</b></div>
    <div><small>행운의 숫자</small><b>${L.num}</b></div>
    <div><small>행운의 방향</small><b>${L.dir}</b></div>
    <div><small>행운의 시간</small><b>${L.time}</b></div>
    <div><small>행운의 물건</small><b>${L.item}</b></div>
    <div><small>행운의 음식</small><b>${L.food}</b></div>
  </div></div>`;
}
function barsHTML(items) {
  const max = Math.max(...items.map(i => i.v)), min = Math.min(...items.map(i => i.v));
  return `<div class="bars">${items.map((it, i) => {
    const h = 20 + (it.v - 30) / 70 * 80;
    return `<div class="b ${it.v === max ? 'best' : it.v === min ? 'low' : ''}"><em>${it.v}</em><i style="height:${h}%;animation-delay:${i * 60}ms"></i><span>${it.l}</span></div>`;
  }).join('')}</div>`;
}
function tgTag(tg) {
  const T = TEN_GODS[tg];
  return `<span class="tagline">${T.name}(${T.han}) · ${T.kw}</span>`;
}
function doDontHTML(tg, r, title = '오늘') {
  const T = TEN_GODS[tg];
  return `<div class="card"><h3>✅ ${title} 하면 좋은 일</h3><ul class="dl good">${T.do.map(x => `<li>${x}</li>`).join('')}</ul>
    <h3 style="margin-top:12px">⛔ ${title} 피할 일</h3><ul class="dl bad">${T.dont.map(x => `<li>${x}</li>`).join('')}</ul></div>`;
}
function rowsHTML(rows) {
  return `<div class="rows">${rows.map(x => `<div class="rw ${x.cls || ''}"><div class="rl">${x.l}</div><div class="rc"><b>${x.t}</b><span>${x.d}</span></div><div class="rs">${x.v}</div></div>`).join('')}</div>`;
}
const brNoteHTML = (br, what) => br === 'hap' ? `<p>${what}이 당신의 일지(배우자 자리)와 <b>합(合)</b>을 이루어 인연과 화합의 기운이 더해집니다. 협력과 만남에 특히 좋습니다.</p>`
  : br === 'samhap' ? `<p>${what}이 당신의 일지와 <b>삼합(三合)</b>의 기운으로 이어져 주변의 힘을 모으기 좋습니다.</p>`
  : br === 'chung' ? `<p>${what}이 당신의 일지와 <b>충(沖)</b>을 이루니 이동, 다툼, 계획 변경이 생기기 쉽습니다. 서두르지 말고 한 번 더 확인하세요.</p>` : '';

// ---------- 운세 종류별 ----------
function buildDaily(p, now) {
  const A = analyzeSaju(p), s = A.s;
  const [y, m, d] = now;
  const gz = dayPillar(y, m, d);
  const { tg, tgB, br, score, r } = scoreFor(p, s, gz, `day-${y}-${m}-${d}`, A.yong);
  const T = TEN_GODS[tg];
  const title = pick(rngFor(profileKey(p), 'dt', y, m, d), DAILY_TITLE[T.group]);
  const cats = catLevels(tg, score, r);
  const slots = TIME_SLOTS.map(t => {
    const hb = Math.floor(mod(t.h * 60 + 60, 1440) / 120);
    const hs = mod((gz.s % 5) * 2 + hb, 10);
    const htg = tenGod(s.me, hs);
    const sc = clamp(Math.round((score + TEN_GODS[htg].base) / 2 + (r() - 0.5) * 10), 35, 97);
    return { l: `${t.icon} ${t.name}`, t: `${TEN_GODS[htg].name}의 시간`, d: TEN_GODS[htg].short, v: starsHTML(lvOf(sc)) };
  });
  return {
    share: `${p.name}님의 ${m}월 ${d}일 운세: ${score}점 — ${title}`,
    html: `<div class="res-head"><div class="lbl">${y}년 ${m}월 ${d}일 (${WEEKDAYS[new Date(y, m - 1, d).getDay()]}) · ${gz.han}일</div>
      <h2 class="serif">${title}</h2>${ringHTML(score)}</div>
      <div class="card"><h3>🔮 오늘의 일진 해설</h3>${tgTag(tg)}
        <p>오늘의 일진은 <b>${gz.text}(${gz.han})</b>입니다. 당신의 일간 <b>${STEMS[s.me]}${ELEMENTS[s.meEl]}(${STEMS_H[s.me]})</b>에게 오늘의 천간은 <b>${T.name}</b>, 지지는 <b>${TEN_GODS[tgB].name}</b>의 기운으로 들어옵니다.</p>
        <p>${pick(r, T.day)}</p><p>${pick(r, DAILY_BODY[T.group])}</p>${brNoteHTML(br, '오늘의 일진')}</div>
      <div class="card"><h3>⏰ 시간대별 운세</h3>${rowsHTML(slots)}</div>
      ${catsHTML(cats)}${doDontHTML(tg, r)}${luckyHTML(luckyFor(p, s, r, A.yong))}
      <div class="card advice">“${pick(r, ADVICE)}”</div>`,
  };
}

function buildWeekly(p, now) {
  const A = analyzeSaju(p), s = A.s;
  const base = new Date(now[0], now[1] - 1, now[2]);
  const off = (base.getDay() + 6) % 7;
  const days = [], cnt = {};
  for (let i = 0; i < 7; i++) {
    const t = new Date(base); t.setDate(base.getDate() - off + i);
    const y = t.getFullYear(), m = t.getMonth() + 1, d = t.getDate();
    const sc = scoreFor(p, s, dayPillar(y, m, d), `day-${y}-${m}-${d}`, A.yong);
    cnt[sc.tg] = (cnt[sc.tg] || 0) + sc.score;
    days.push({ l: WEEKDAYS[t.getDay()], v: sc.score, date: `${m}/${d}`, tg: sc.tg, gz: dayPillar(y, m, d), today: i === off });
  }
  const tg = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
  const T = TEN_GODS[tg];
  const avg = Math.round(days.reduce((a, b) => a + b.v, 0) / 7);
  const best = days.reduce((a, b) => b.v > a.v ? b : a), worst = days.reduce((a, b) => b.v < a.v ? b : a);
  const r = rngFor(profileKey(p), 'week', days[0].date, now[0]);
  return {
    share: `${p.name}님의 이번 주 운세: ${avg}점 — ${WEEK_TITLE[T.group]}`,
    html: `<div class="res-head"><div class="lbl">${days[0].date} ~ ${days[6].date} 주간 운세</div>
      <h2 class="serif">${WEEK_TITLE[T.group]}</h2>${ringHTML(avg, '주간 평균')}</div>
      <div class="card"><h3>🔮 이번 주의 기운</h3>${tgTag(tg)}<p>${WEEK_BODY[T.group]}</p><p>${T.month.split('. ').slice(0, 2).join('. ')}.</p></div>
      <div class="card"><h3>📅 요일별 운세 흐름</h3>${barsHTML(days)}
        <p style="margin-top:10px">👍 가장 좋은 날은 <b>${best.l}요일(${best.date})</b>, 조심할 날은 <b>${worst.l}요일(${worst.date})</b>이에요.</p></div>
      <div class="card"><h3>🗓️ 하루하루 미리 보기</h3>${rowsHTML(days.map(x => ({
        cls: x.today ? 'now' : '', l: `${x.l}<small>${x.date}</small>`, t: `${x.gz.han}일 · ${TEN_GODS[x.tg].name}`, d: TEN_GODS[x.tg].short, v: `<b class="sc">${x.v}</b>`,
      })))}</div>
      ${catsHTML(catLevels(tg, avg, r))}${doDontHTML(tg, r, '이번 주')}${luckyHTML(luckyFor(p, s, r, A.yong), '🍀 이번 주 행운')}
      <div class="card advice">“${pick(r, ADVICE)}”</div>`,
  };
}

function buildMonthly(p, now) {
  const A = analyzeSaju(p), s = A.s;
  const [y, m] = now;
  const mp = yearMonthPillars(y, m, 20).month;
  const { tg, tgB, br, score, r } = scoreFor(p, s, mp, `month-${y}-${m}`, A.yong);
  const T = TEN_GODS[tg];
  const parts = ['상순', '중순', '하순'].map((l, i) => {
    let sum = 0, best = null;
    for (let d = i * 10 + 1; d <= i * 10 + 10; d++) {
      const dd = Math.min(d, 28);
      const sc = scoreFor(p, s, dayPillar(y, m, dd), `day-${y}-${m}-${dd}`, A.yong);
      sum += sc.score;
      if (!best || sc.score > best.v) best = { v: sc.score, d: dd, tg: sc.tg };
    }
    return { l, v: Math.round((sum / 10 + score) / 2), best };
  });
  return {
    share: `${p.name}님의 ${m}월 운세: ${score}점 — ${MONTH_TITLE[T.group]}`,
    html: `<div class="res-head"><div class="lbl">${y}년 ${m}월 · ${mp.han}월</div>
      <h2 class="serif">${MONTH_TITLE[T.group]}</h2>${ringHTML(score, `${m}월 점수`)}</div>
      <div class="card"><h3>🔮 이달의 기운</h3>${tgTag(tg)}
        <p>${m}월의 월건은 <b>${mp.text}(${mp.han})</b>으로, 당신에게 <b>${T.name}</b>과 <b>${TEN_GODS[tgB].name}</b>의 기운이 함께 들어옵니다.</p>
        <p>${T.month}</p>${MONTH_BODY[T.group].map(t => `<p>${t}</p>`).join('')}${brNoteHTML(br, '이달의 월건')}</div>
      <div class="card"><h3>🗓️ 시기별 흐름</h3>${barsHTML(parts)}
        ${rowsHTML(parts.map(x => ({ l: x.l, t: `${TEN_GODS[x.best.tg].name}의 기운이 강한 때`, d: `가장 좋은 날은 ${m}월 ${x.best.d}일 — ${TEN_GODS[x.best.tg].short}`, v: `<b class="sc">${x.v}</b>` })))}</div>
      ${catsHTML(catLevels(tg, score, r))}${doDontHTML(tg, r, '이달')}${luckyHTML(luckyFor(p, s, r, A.yong), '🍀 이달의 행운')}
      <div class="card advice">“${pick(r, ADVICE)}”</div>`,
  };
}

function yearTarget(now) { return now[1] >= 10 ? now[0] + 1 : now[0]; }

function buildYearly(p, now) {
  const A = analyzeSaju(p), s = A.s;
  const Y = yearTarget(now);
  const yp = yearMonthPillars(Y, 6, 1).year;
  const { tg, tgB, br, score, r } = scoreFor(p, s, yp, `year-${Y}`, A.yong);
  const T = TEN_GODS[tg];
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const mp = yearMonthPillars(Y, m, 20).month;
    const sc = scoreFor(p, s, mp, `month-${Y}-${m}`, A.yong);
    months.push({ l: m + '', v: Math.round((sc.score + score) / 2), tg: sc.tg, gz: mp });
  }
  const best = months.reduce((a, b) => b.v > a.v ? b : a), worst = months.reduce((a, b) => b.v < a.v ? b : a);
  const yb = branchRel(s.animal, yp.b);
  const animalNote = yb === 'chung' ? `올해는 ${ANIMALS[s.animal]}띠와 충(沖)이 드는 해예요. 이사·이직 같은 큰 변화가 생기기 쉬우니 충분히 준비하고 움직이세요. 변화를 두려워하기보다 계획적으로 맞이하면 오히려 새로운 기회가 됩니다.`
    : yb === 'hap' || yb === 'samhap' ? `${ANIMALS[s.animal]}띠와 ${ANIMALS[yp.b]}해가 서로 잘 어울려 사람 복이 따르는 해예요. 새로운 인연, 협력, 모임에서 좋은 기회를 얻습니다.`
    : s.animal === yp.b ? `자기 띠의 해(본명년)예요. 새로운 출발의 기운이 강하지만 몸과 마음이 쉽게 지칠 수 있으니 건강 관리에 더 신경 쓰세요.`
    : `${ANIMALS[s.animal]}띠에게 ${ANIMALS[yp.b]}해는 무난하게 흐르는 해입니다. 큰 변수 없이 꾸준함이 가장 큰 무기가 됩니다.`;
  const age = ageNow(p, [Y, 7, 1]);
  const ageMonths = ageMonthsNow(p, [Y, 7, 1]);
  const du = A.daeun.list.filter(x => x.totalMonths <= ageMonths).pop();
  return {
    share: `${p.name}님의 ${Y}년 신년운세: ${score}점 — ${YEAR_BODY[T.group].title}`,
    html: `<div class="res-head"><div class="lbl">${Y}년 ${yp.text}년 (${yp.han}) · ${ANIMAL_EMOJI[yp.b]} ${ANIMALS[yp.b]}의 해</div>
      <h2 class="serif">${YEAR_BODY[T.group].title}</h2>${ringHTML(score, `${Y} 총운`)}</div>
      <div class="card"><h3>🔮 ${Y}년 총운</h3>${tgTag(tg)}
        <p>${Y}년의 세운 <b>${yp.text}(${yp.han})</b>은 당신에게 <b>${T.name}</b>(천간)과 <b>${TEN_GODS[tgB].name}</b>(지지)의 해입니다.</p>
        <p>${YEAR_BODY[T.group].body.replace('{Y}', `${Y}년 ${yp.text}년`)}</p><p>${T.year}</p>${brNoteHTML(br, '올해의 세운')}</div>
      ${du ? `<div class="card"><h3>🌊 지금 지나고 있는 대운</h3><span class="tagline">${ageLabel(du)}부터 · ${du.gz.text}(${du.gz.han}) 대운</span>
        <p>${TEN_GODS[du.tg].daeun} 올해의 세운과 함께 보면, ${du.score >= 70 === score >= 70 ? '큰 흐름과 올해의 흐름이 같은 방향이라 기회를 잡기 좋습니다.' : '큰 흐름과 올해의 흐름이 엇갈리니 무리한 확장보다 내실을 다지는 편이 좋습니다.'}</p></div>` : ''}
      <div class="card"><h3>${ANIMAL_EMOJI[s.animal]} ${ANIMALS[s.animal]}띠의 ${Y}년</h3><p>${animalNote}</p></div>
      <div class="card"><h3>📈 월별 운세 흐름</h3>${barsHTML(months)}
        <p style="margin-top:10px">🌟 최고의 달은 <b>${best.l}월</b>, 쉬어 갈 달은 <b>${worst.l}월</b>이에요.</p></div>
      <div class="card"><h3>🗓️ 달마다 미리 보기</h3>${rowsHTML(months.map(x => ({
        cls: x === best ? 'now' : '', l: `${x.l}월`, t: `${x.gz.han}월 · ${TEN_GODS[x.tg].name}`, d: TEN_GODS[x.tg].short, v: `<b class="sc">${x.v}</b>`,
      })))}</div>
      ${catsHTML(catLevels(tg, score, r))}${doDontHTML(tg, r, '올해')}${luckyHTML(luckyFor(p, s, r, A.yong), `🍀 ${Y}년 행운`)}
      <div class="card advice">“${pick(r, ADVICE)}”</div>`,
  };
}

function buildSaju(p, now) {
  const A = analyzeSaju(p), s = A.s;
  const dm = DAY_MASTER[s.me], dd = DM_DETAIL[s.me];
  const cols = [['시주', s.hour], ['일주', s.day], ['월주', s.month], ['년주', s.year]];
  const cell = (pp, which, i) => {
    if (!pp) return `<div class="gz none">모름</div>`;
    const idx = which === 's' ? pp.s : pp.b;
    const el = which === 's' ? STEM_EL[idx] : BRANCH_EL[idx];
    const han = which === 's' ? STEMS_H[idx] : BRANCHES_H[idx];
    const ko = which === 's' ? STEMS[idx] : BRANCHES[idx];
    return `<div class="gz ${which === 's' && i === 1 ? 'me' : ''}" style="background:var(--el${el})">${han}<small>${ko} · ${ELEMENTS[el]}</small></div>`;
  };
  const tgLabel = (pp, which, i) => !pp ? '<div class="tgl">-</div>'
    : `<div class="tgl">${which === 's' ? (i === 1 ? '나(일간)' : TEN_GODS[tenGod(s.me, pp.s)].name) : TEN_GODS[tgOfBranch(s.me, pp.b)].name}</div>`;
  const total = s.count.reduce((a, b) => a + b, 0);
  const maxC = Math.max(...s.count), minC = Math.min(...s.count);
  const strong = s.count.indexOf(maxC), weak = s.count.indexOf(minC);
  const Y = ELEMENT_INFO[A.yong];
  const r = rngFor(profileKey(p), 'saju');
  const gKeys = ['bi', 'sik', 'jae', 'gwan', 'in'];
  const gMax = gKeys.reduce((a, b) => A.groups[b] > A.groups[a] ? b : a);
  const gMissing = gKeys.filter(k => A.groups[k] === 0);
  const gTotal = gKeys.reduce((a, k) => a + A.groups[k], 0);
  const season = SEASON.find(x => x.branches.includes(s.month.b));
  const age = ageNow(p, now), ageMonths = ageMonthsNow(p, now);
  const curIdx = A.daeun.list.findIndex((x, i) => ageMonths >= x.totalMonths && (i === A.daeun.list.length - 1 || ageMonths < A.daeun.list[i + 1].totalMonths));
  const cur = A.daeun.list[curIdx];
  const thisY = now[0], nextY = now[0] + 1;
  const yearLine = Y2 => { const yp = yearMonthPillars(Y2, 6, 1).year; const t = tenGod(s.me, yp.s); return { l: `${Y2}년`, t: `${yp.text}(${yp.han})년 · ${TEN_GODS[t].name}`, d: TEN_GODS[t].short, v: starsHTML(lvOf(scoreFor(p, s, yp, `year-${Y2}`, A.yong).score)) }; };
  const strengthPct = Math.round(A.ratio * 100);
  const boundaryWarning = sajuBoundaryWarning(p);
  const solarInfo = s.solarClock ? (() => {
    const mins = mod(Math.round(s.solarClock.minutes), 1440);
    const hh = String(Math.floor(mins / 60)).padStart(2, '0'), mm = String(mins % 60).padStart(2, '0');
    const corr = Math.round(s.solarClock.correction);
    return `${s.solarClock.place.name} · 지역 보정 시간 ${hh}:${mm} (표준시 ${corr >= 0 ? '+' : ''}${corr}분)`;
  })() : `${(BIRTH_PLACES[p.loc] || BIRTH_PLACES.seoul).name} · 시간 미상`;
  const GN = { bi: '비겁', sik: '식상', jae: '재성', gwan: '관성', in: '인성' };
  return {
    share: `${p.name}님의 사주: ${s.year.han} ${s.month.han} ${s.day.han}${s.hour ? ' ' + s.hour.han : ''} — 일간 ${dm.name}${dm.icon}`,
    html: `<div class="res-head"><div class="lbl">${p.cal === 'lunar' ? `음력 ${p.ly}.${p.leap ? '윤' : ''}${p.lm}.${p.ld} (양력 ${p.y}.${p.m}.${p.d})` : `양력 ${p.y}.${p.m}.${p.d}`} ${p.hour === null ? '(시간 모름)' : `${String(p.hour).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`} · ${p.gender === 'm' ? '남' : '여'}</div>
      <h2 class="serif">${dm.icon} ${dm.name}의 기운을 타고난<br>${esc(p.name)}님</h2>
      <div class="lbl">${solarInfo}</div>${boundaryWarning ? `<div class="calc-warning">⚠️ ${boundaryWarning}</div>` : ''}</div>
      <div class="toc">${['원국', '성격', '연애', '직업', '재물', '건강', '오행', '강약', '십신', '대운'].map((x, i) => `<a href="#sj${i}">${x}</a>`).join('')}</div>

      <div class="card" id="sj0"><h3>🔮 사주팔자 원국</h3>
        <div class="pillars">${cols.map(c => `<div class="h">${c[0]}</div>`).join('')}
          ${cols.map((c, i) => tgLabel(c[1], 's', i)).join('')}
          ${cols.map((c, i) => cell(c[1], 's', i)).join('')}
          ${cols.map((c, i) => cell(c[1], 'b', i)).join('')}
          ${cols.map((c, i) => tgLabel(c[1], 'b', i)).join('')}</div>
        <p class="hint" style="margin-top:10px">금색 테두리가 나를 뜻하는 <b>일간(日干)</b>, 위아래 글자는 나를 기준으로 본 <b>십신(十神)</b>이에요. ${ANIMAL_EMOJI[s.animal]} ${ANIMALS[s.animal]}띠 · ${season.name} 생${p.hour === null ? ' · 태어난 시간을 넣으면 시주까지 볼 수 있어요.' : ''}</p></div>

      <div class="card" id="sj1"><span class="tagline">${dm.key}</span><h3>${dm.icon} 타고난 성격 — ${STEMS[s.me]}${ELEMENTS[s.meEl]}(${STEMS_H[s.me]}${ELEMENTS_H[s.meEl]})</h3>
        <p>${dm.desc}</p><p>${dd.more}</p>
        <div class="lucky" style="margin-top:12px"><div><small>강점</small><b style="font-size:13px">${dm.strong}</b></div><div><small>주의할 점</small><b style="font-size:13px">${dm.weak}</b></div></div>
        <h3 style="margin-top:14px">🍂 ${season.name}에 태어난 사람</h3><p>${season.text}</p></div>

      <div class="card" id="sj2"><h3>💗 연애와 결혼</h3><p>${dd.love}</p><p>${ILJI[s.day.b]}</p>
        <p>${p.gender === 'm' ? (A.groups.jae >= 2 ? '남성에게 재성은 이성 인연을 뜻하는데, 재성이 넉넉해 이성에게 인기가 많고 연애 기회도 많은 편입니다. 한 사람에게 집중할 때 복이 커집니다.' : A.groups.jae === 0 ? '남성에게 재성은 이성 인연을 뜻하는데, 원국에 재성이 드러나지 않아 연애에 늦게 눈뜨는 편입니다. 재성 운이 들어오는 해에 좋은 인연을 만나기 쉽습니다.' : '이성 인연을 뜻하는 재성이 알맞게 있어, 인연이 오면 자연스럽게 안정적인 관계로 이어집니다.')
          : (A.groups.gwan >= 2 ? '여성에게 관성은 연인·남편의 인연을 뜻하는데, 관성이 넉넉해 이성의 관심을 많이 받는 편입니다. 서두르기보다 나를 존중하는 사람을 고르세요.' : A.groups.gwan === 0 ? '여성에게 관성은 연인·남편의 인연을 뜻하는데, 원국에 관성이 드러나지 않아 연애보다 자기 일에 집중하는 편입니다. 관성 운이 들어오는 해에 좋은 인연을 만나기 쉽습니다.' : '연인·남편의 인연을 뜻하는 관성이 알맞게 있어, 믿음직한 인연과 안정적인 관계를 맺기 좋습니다.')}</p></div>

      <div class="card" id="sj3"><h3>💼 직업과 적성</h3><p>${dd.work}</p><p>${GROUP_INFO[gMax].strong}</p>
        <div class="lucky" style="margin-top:12px;grid-template-columns:1fr"><div><small>잘 맞는 분야</small><b style="font-size:14px">${dd.jobs}</b></div></div></div>

      <div class="card" id="sj4"><h3>💰 재물운</h3><p>${dd.money}</p>
        <p>${A.groups.jae >= 3 ? '원국에 재성이 많아 돈을 버는 기회가 많지만, 내 힘보다 재물이 크면 관리가 버거울 수 있습니다. 욕심을 줄이고 지키는 데 집중하세요.' : A.groups.jae === 0 ? '원국에 재성이 드러나지 않아 돈보다 명예나 가치를 따르는 편입니다. 대신 재성 운이 들어올 때 크게 버는 경우가 많으니 그때를 위해 준비해 두세요.' : '재성이 알맞게 있어 노력한 만큼 재물이 따르는 안정적인 구조입니다.'}
        ${A.groups.sik >= 2 ? ' 식상이 재성을 받쳐 주어 재능이 곧 돈이 되는 흐름입니다.' : ''}</p></div>

      <div class="card" id="sj5"><h3>🍀 건강 상징</h3><p>전통 명리의 오행 상징으로 보면 ${dd.health}</p>
        <p>표면 오행 중 <b>${ELEMENTS[strong]}</b> 기운이 강하고 <b>${ELEMENTS[weak]}</b> 기운이 약한 편입니다.</p>
        <p class="hint">의학적 진단이 아니며, 실제 증상이나 건강 결정은 의료 전문가와 상의해 주세요.</p></div>

      <div class="card" id="sj6"><h3>☯️ 오행 분포</h3><div class="elbars">${s.count.map((c, i) =>
        `<div class="r"><span class="n">${ELEMENTS_H[i]} ${ELEMENTS[i]}</span><span class="t"><i style="width:${Math.max(4, c / total * 100)}%;background:var(--el${i})"></i></span><span class="c">${c}</span></div>`).join('')}</div>
        ${maxC >= 3 ? `<p style="margin-top:10px"><b>${ELEMENTS[strong]}(${ELEMENTS_H[strong]}) 과다</b> — ${EL_EXCESS[strong]}</p>` : ''}
        <p style="margin-top:8px"><b>${ELEMENTS[weak]}(${ELEMENTS_H[weak]}) ${minC === 0 ? '없음' : '부족'}</b> — ${EL_LACK[weak]}</p></div>

      <div class="card" id="sj7"><h3>⚖️ 신강·신약 — ${STRENGTH[A.strength].name}</h3>
        <div class="meter"><i style="left:${clamp(strengthPct, 4, 96)}%"></i></div><div class="meterl"><span>신약</span><span>중화</span><span>신강</span></div>
        <p>${STRENGTH[A.strength].text}</p>
        <h3 style="margin-top:14px">🌈 나를 돕는 기운(용신) — ${ELEMENTS[A.yong]}(${ELEMENTS_H[A.yong]})</h3>
        <div class="lucky"><div><small>색</small><b><span class="dot" style="background:${Y.colorHex}"></span>${Y.color}</b></div>
          <div><small>방향</small><b>${Y.dir}</b></div><div><small>숫자</small><b>${Y.nums.join(', ')}</b></div><div><small>소품</small><b style="font-size:13px">${Y.item}</b></div></div>
        <p style="margin-top:10px">🍽️ ${Y.food}<br>🏃 ${Y.act}</p>
        <p class="hint">용신은 사주의 균형을 맞춰 주는 오행이에요. 이 기운이 들어오는 날·달·해에 운이 좋아집니다.</p></div>

      <div class="card" id="sj8"><h3>🧭 십신 분포</h3><div class="elbars">${gKeys.map((k, i) =>
        `<div class="r"><span class="n">${GN[k]}</span><span class="t"><i style="width:${Math.max(4, A.groups[k] / gTotal * 100)}%;background:var(--el${mod(s.meEl + [0, 1, 2, 3, 4][i], 5)})"></i></span><span class="c">${A.groups[k].toFixed(1)}</span></div>`).join('')}</div>
        <p style="margin-top:10px"><b>${GROUP_INFO[gMax].name}이 가장 강해요.</b> ${GROUP_INFO[gMax].strong}</p>
        ${gMissing.length ? `<p><b>${gMissing.map(k => GROUP_INFO[k].name).join(', ')}이 없어요.</b> ${GROUP_INFO[gMissing[0]].lack}</p>` : '<p>다섯 가지 십신이 모두 갖춰져 다방면에 재능이 있는 균형 잡힌 구조입니다.</p>'}
        <p><b>일간이 보는 ${TEN_GODS[tenGod(s.me, s.month.s)].name}(월간)</b> — ${TEN_GODS[tenGod(s.me, s.month.s)].desc}</p></div>

      <div class="card" id="sj9"><h3>🌊 대운 — 10년마다 바뀌는 큰 흐름</h3>
        <p class="hint">${A.daeun.forward ? '순행' : '역행'} 대운 · ${A.daeun.start}세 ${A.daeun.startMonth}개월 시작 · 현재 만 ${age}세</p>
        <div class="tl">${A.daeun.list.map((x, i) => `<div class="du ${i === curIdx ? 'now' : ''}"><small>${ageLabel(x)}~</small><b class="serif">${x.gz.han}</b><span>${TEN_GODS[x.tg].name}</span>${starsHTML(lvOf(x.score))}</div>`).join('')}</div>
        ${cur ? `<p style="margin-top:10px"><b>지금은 ${cur.gz.text}(${cur.gz.han}) 대운 (${ageLabel(cur)}부터)</b> — ${TEN_GODS[cur.tg].daeun}</p>` : `<p style="margin-top:10px">아직 첫 대운(${A.daeun.start}세 ${A.daeun.startMonth}개월)이 시작되기 전이에요. 지금은 타고난 원국의 기운대로 흘러갑니다.</p>`}
        ${A.daeun.list[curIdx + 1] ? `<p><b>다음 대운 ${A.daeun.list[curIdx + 1].gz.text}(${ageLabel(A.daeun.list[curIdx + 1])}부터)</b> — ${TEN_GODS[A.daeun.list[curIdx + 1].tg].daeun}</p>` : ''}
        <h3 style="margin-top:14px">📆 올해와 내년</h3>${rowsHTML([yearLine(thisY), yearLine(nextY)])}</div>

      <div class="card"><h3>🐰 달토끼의 총평</h3>
        <p>${esc(p.name)}님은 <b>${dm.name}</b>처럼 ${dm.key.replace(/ /g, ' ')}의 기운을 타고났고, <b>${STRENGTH[A.strength].name}</b> 사주에 <b>${GROUP_INFO[gMax].name}</b>이 두드러집니다. ${ELEMENTS[A.yong]}(${ELEMENTS_H[A.yong]})의 기운을 가까이할수록 삶의 균형이 맞춰지고, ${cur ? `지금 지나는 ${TEN_GODS[cur.tg].name} 대운에는 ${TEN_GODS[cur.tg].kw.split(' · ')[0]}에 힘을 쏟으면 좋습니다.` : '첫 대운이 오기 전까지 타고난 재능을 차분히 키워 가세요.'}</p></div>
      <div class="card calc-note"><h3>ℹ️ 계산 기준</h3><p>연주·월주·일주·시주와 대운은 절기·간지 규칙으로 계산하고, 성격 문장과 점수·행운 아이템은 전통 해석을 바탕으로 구성한 재미 콘텐츠예요. 절기 경계와 야자시 기준은 만세력마다 조금 다를 수 있습니다.</p></div>
      <div class="card advice">“${pick(r, ADVICE)}”</div>`,
  };
}

function zodiacScore(p, zi, y, m, d) {
  const r = rngFor('zodiac', zi, y, m, d, profileKey(p));
  const jd = localCivilJD(y, m, d, 12, 0);
  const transit = Math.floor(mod(sunLongitude(jd), 360) / 30); // 0° 양자리부터 현재 태양 별자리
  const distance = Math.min(mod(transit - zi, 12), mod(zi - transit, 12));
  const aspect = { 0: 7, 1: 1, 2: 6, 3: -7, 4: 10, 5: 1, 6: -5 }[distance];
  const natalEl = ZODIAC[zi].el, transitEl = ZODIAC[transit].el;
  const pair = { fire: 'air', air: 'fire', earth: 'water', water: 'earth' };
  const element = natalEl === transitEl ? 5 : pair[natalEl] === transitEl ? 7 : -3;
  const weekdayEl = ['fire', 'water', 'fire', 'air', 'fire', 'earth', 'earth'][new Date(y, m - 1, d).getDay()];
  const weekday = natalEl === weekdayEl ? 3 : pair[natalEl] === weekdayEl ? 4 : -2;
  const score = clamp(Math.round(65 + aspect + element + weekday + (r() - .5) * 14), 42, 95);
  const aspectName = { 0: '합', 2: '조화', 3: '긴장', 4: '큰 조화', 6: '마주 보는 흐름' }[distance] || '중립';
  return { score, r, transit, aspectName, element };
}
const Z_COLORS = [['코랄', '#ff7f6e'], ['라벤더', '#b9a3ff'], ['민트', '#7fe0c0'], ['하늘색', '#7fc4ff'], ['골드', '#ffd36e'], ['로즈', '#ff8fc7'], ['아이보리', '#fff3dc'], ['네이비', '#3b4a9c']];

function buildZodiac(p, now) {
  const zi = zodiacOf(p.m, p.d);
  const Z = ZODIAC[zi], D = ZODIAC_DETAIL[zi];
  const [y, m, d] = now;
  const { score, r, transit, aspectName } = zodiacScore(p, zi, y, m, d);
  const lv = clamp(Math.round((score - 29) / 12), 1, 5); // 별점 42~95 를 1~5단계에 고르게
  const cats = [
    { icon: '💗', name: '애정운', key: 'love' }, { icon: '💰', name: '금전운', key: 'money' },
    { icon: '📚', name: '일·학업운', key: 'work' }, { icon: '🍀', name: '건강운', key: 'health' },
  ].map(c => { const l = clamp(lv + Math.round((r() - 0.5) * 2.4), 1, 5); return { ...c, lv: l, text: `${pick(r, CAT_TEXT[c.key][l - 1])} ${ZEL_CAT[Z.el][c.key]}` }; });
  const good = ZODIAC.map((z, i) => i).filter(i => i !== zi && (ZODIAC[i].el === Z.el || ({ fire: 'air', air: 'fire', earth: 'water', water: 'earth' })[Z.el] === ZODIAC[i].el));
  const mate = ZODIAC[pick(r, good)];
  const c = pick(r, Z_COLORS);
  const base = new Date(y, m - 1, d), off = (base.getDay() + 6) % 7;
  const week = [];
  for (let i = 0; i < 7; i++) {
    const t = new Date(base); t.setDate(base.getDate() - off + i);
    week.push({ l: WEEKDAYS[t.getDay()], v: zodiacScore(p, zi, t.getFullYear(), t.getMonth() + 1, t.getDate()).score });
  }
  const bestDay = week.reduce((a, b) => b.v > a.v ? b : a);
  const hb = Math.floor(r() * 12);
  const signList = arr => arr.map(i => `${ZODIAC[i].sym} ${ZODIAC[i].name}`).join(', ');
  return {
    share: `${Z.sym} ${Z.name} 오늘의 운세: ${score}점`,
    html: `<div class="res-head"><div class="lbl">${y}년 ${m}월 ${d}일 별자리 운세</div>
      <div style="font-size:60px;line-height:1.2;color:var(--gold)">${Z.sym}</div>
      <h2 class="serif">${Z.name}</h2><div class="lbl">${Z.range} · ${ZEL_NAME[Z.el]}의 별자리 · 수호성 ${D.planet}</div>${ringHTML(score, '오늘의 별점')}</div>
      <div class="card"><h3>✨ 오늘의 별 메시지</h3><span class="tagline">${Z.trait}</span><p>${pick(r, ZODIAC_DAY[lv - 1])}</p>
        <p class="hint">오늘 태양은 ${ZODIAC[transit].sym} ${ZODIAC[transit].name}에 있고, ${Z.name}와는 ‘${aspectName}’ 각도예요. 별점은 이 각도·원소·요일 흐름을 함께 반영합니다.</p></div>
      ${catsHTML(cats)}
      <div class="card"><h3>📅 이번 주 별점 흐름</h3>${barsHTML(week)}<p style="margin-top:10px">🌟 이번 주 가장 빛나는 날은 <b>${bestDay.l}요일</b>이에요.</p></div>
      <div class="card"><h3>🍀 오늘의 행운</h3><div class="lucky">
        <div><small>행운의 색</small><b><span class="dot" style="background:${c[1]}"></span>${c[0]}</b></div>
        <div><small>행운의 숫자</small><b>${Math.floor(r() * 45) + 1}</b></div>
        <div><small>오늘 잘 맞는 별자리</small><b>${mate.sym} ${mate.name}</b></div>
        <div><small>행운의 시간</small><b>${HOUR_NAMES[hb].match(/\((.*)\)/)[1]}</b></div>
        <div><small>행운의 물건</small><b>${pick(r, LUCKY_ITEMS)}</b></div>
        <div><small>탄생석</small><b>${D.stone}</b></div></div></div>
      <div class="card"><h3>${Z.sym} ${Z.name} 이야기</h3><p>${D.me}</p>
        <h3 style="margin-top:14px">💗 연애 스타일</h3><p>${D.love}</p>
        <h3 style="margin-top:14px">💼 일과 적성</h3><p>${D.work}</p>
        <h3 style="margin-top:14px">💰 돈 관리</h3><p>${D.money}</p>
        <h3 style="margin-top:14px">🍀 건강 상징</h3><p>${D.health}</p><p class="hint">별자리 전통에 따른 상징적 설명이며 의학적 진단이 아닙니다.</p></div>
      <div class="card"><h3>💞 별자리 궁합</h3><div class="lucky" style="grid-template-columns:1fr">
        <div><small>찰떡궁합</small><b>${signList(D.best)}</b></div><div><small>조금 노력이 필요한 사이</small><b>${signList(D.worst)}</b></div></div></div>
      <div class="card advice">“${pick(r, ADVICE)}”</div>`,
  };
}

function buildCompat(p, q, now = today()) {
  const A = analyzeSaju(p), B = analyzeSaju(q);
  const a = A.s, b = B.s;
  const za = zodiacOf(p.m, p.d), zb = zodiacOf(q.m, q.d);
  const r = rngFor('compat', profileKey(p), profileKey(q));
  const P = esc(p.name), Q = esc(q.name);
  const relAB = relation(a.meEl, b.meEl);
  const sameYY = a.me % 2 === b.me % 2;
  const elScore = { in: 16, sik: 14, bi: 10, jae: 8, gwan: 2 }[relAB] + (sameYY ? 0 : 4);
  const br = branchRel(a.animal, b.animal);
  const brScore = { hap: 14, samhap: 12, none: 6, chung: -6 }[br];
  const brText = {
    hap: `${ANIMALS[a.animal]}띠와 ${ANIMALS[b.animal]}띠는 육합(六合) — 천생연분이라 불리는 찰떡 궁합이에요! 서로를 끌어당기고 감싸 주는 기운이 강합니다.`,
    samhap: `${ANIMALS[a.animal]}띠와 ${ANIMALS[b.animal]}띠는 삼합(三合) — 뜻을 모으면 큰일을 이루는 궁합이에요. 함께 목표를 세우면 시너지가 큽니다.`,
    none: a.animal === b.animal ? `같은 ${ANIMALS[a.animal]}띠끼리라 취향과 생활 리듬이 잘 맞아요. 다만 단점도 닮았으니 서로 보완해 주세요.` : `${ANIMALS[a.animal]}띠와 ${ANIMALS[b.animal]}띠는 무난하게 어울리는 사이예요. 큰 충돌 없이 정이 쌓이는 관계입니다.`,
    chung: `${ANIMALS[a.animal]}띠와 ${ANIMALS[b.animal]}띠는 충(沖) — 끌림은 강하지만 부딪힘도 있어요. 대화로 풀면 오히려 서로를 단단하게 만드는 관계가 됩니다.`,
  }[br];
  const ib = a.day.b === b.day.b ? 'same' : branchRel(a.day.b, b.day.b);
  const ibScore = { hap: 10, samhap: 7, same: 5, none: 4, chung: -5 }[ib];
  const ea = ZODIAC[za].el, eb = ZODIAC[zb].el;
  const pair = { fire: 'air', air: 'fire', earth: 'water', water: 'earth' };
  const zScore = ea === eb ? 10 : pair[ea] === eb ? 12 : 3;
  const zBest = ZODIAC_DETAIL[za].best.includes(zb), zWorst = ZODIAC_DETAIL[za].worst.includes(zb);
  // 오행 보완: 서로의 부족한 오행을 채워 주는지
  const weakA = a.count.indexOf(Math.min(...a.count)), weakB = b.count.indexOf(Math.min(...b.count));
  const fillAB = b.count[weakA] >= 2, fillBA = a.count[weakB] >= 2;
  const fillScore = (fillAB ? 5 : 0) + (fillBA ? 5 : 0);
  const score = clamp(Math.round(42 + elScore + brScore * 0.7 + ibScore + zScore * 0.6 + fillScore + (r() - 0.5) * 6), 45, 99);
  const verdict = score >= 90 ? '운명이 맺어 준 인연' : score >= 80 ? '서로를 빛내는 최고의 짝' : score >= 70 ? '함께 성장하는 좋은 인연' : score >= 60 ? '노력하면 깊어지는 사이' : '서로 배우며 맞춰 가는 사이';
  const sub = (b0, extra) => clamp(Math.round(b0 + extra + (r() - 0.5) * 14), 40, 99);
  const subs = [
    { l: '💬 성격', v: sub(score, sameYY ? 4 : 0), d: sameYY ? '닮은 성향이라 말이 잘 통해요' : '다른 성향이 서로를 채워 줘요' },
    { l: '💗 연애', v: sub(score, (zScore - 6) + (br === 'hap' ? 5 : 0)), d: '설렘과 끌림의 크기' },
    { l: '💍 결혼', v: sub(score, ibScore), d: '함께 살 때의 생활 궁합' },
    { l: '🗣️ 소통', v: sub(score, (ea === 'air' || eb === 'air') ? 5 : 0), d: '대화와 갈등 해결' },
    { l: '💰 재물', v: sub(score, fillScore - 3), d: '함께 모으고 쓰는 돈의 흐름' },
  ];
  const yLine = (X, name) => { const Y = yearTarget(now); const yp = yearMonthPillars(Y, 6, 1).year; const t = tenGod(X.s.me, yp.s); return { l: name, t: `${Y}년 · ${TEN_GODS[t].name}의 해`, d: TEN_GODS[t].short, v: '' }; };
  const tips = COMPAT_TIPS[relAB];
  return {
    share: `${p.name} 💞 ${q.name} 궁합: ${score}점 — ${verdict}`,
    html: `<div class="res-head"><div class="lbl">사주 · 띠 · 별자리 종합 궁합</div>
      <div class="match"><div class="p"><b>${ANIMAL_EMOJI[a.animal]}</b><span>${P}</span></div><div class="heart">💞</div><div class="p"><b>${ANIMAL_EMOJI[b.animal]}</b><span>${Q}</span></div></div>
      <h2 class="serif">${verdict}</h2>${ringHTML(score, '궁합 점수')}</div>
      <div class="card"><h3>📊 분야별 궁합</h3>${rowsHTML(subs.map(x => ({ l: x.l.split(' ')[0], t: x.l.split(' ')[1], d: x.d, v: `<b class="sc">${x.v}</b>` })))}</div>
      <div class="card"><h3>☯️ 사주 궁합 — ${DAY_MASTER[a.me].icon} × ${DAY_MASTER[b.me].icon}</h3>
        <p>${P}님은 <b>${STEMS[a.me]}${ELEMENTS[a.meEl]}(${STEMS_H[a.me]}) · ${DAY_MASTER[a.me].name}</b>, ${Q}님은 <b>${STEMS[b.me]}${ELEMENTS[b.meEl]}(${STEMS_H[b.me]}) · ${DAY_MASTER[b.me].name}</b>의 기운이에요.</p>
        <p>${COMPAT_EL_DETAIL[relAB]}</p><p>${sameYY ? COMPAT_YY.same : COMPAT_YY.diff}</p>
        <p>${P}님에게 ${Q}님은 <b>${TEN_GODS[tenGod(a.me, b.me)].name}</b>, ${Q}님에게 ${P}님은 <b>${TEN_GODS[tenGod(b.me, a.me)].name}</b>의 존재예요.</p></div>
      <div class="card"><h3>🏠 배우자 자리(일지) 궁합</h3><span class="tagline">${BRANCHES_H[a.day.b]} × ${BRANCHES_H[b.day.b]}</span><p>${COMPAT_ILJI[ib]}</p></div>
      <div class="card"><h3>🌈 오행 보완</h3>
        <p>${P}님에게 부족한 <b>${ELEMENTS[weakA]}(${ELEMENTS_H[weakA]})</b> 기운을 ${Q}님이 ${fillAB ? '<b>넉넉히 채워 줍니다.</b> 함께 있으면 마음이 편안해지고 부족했던 힘이 생겨요.' : '많이 가지고 있지는 않아요. 함께 그 기운을 채우는 활동을 해 보세요.'}</p>
        <p>${Q}님에게 부족한 <b>${ELEMENTS[weakB]}(${ELEMENTS_H[weakB]})</b> 기운은 ${P}님이 ${fillBA ? '<b>넉넉히 채워 줍니다.</b> 서로가 서로의 보약 같은 존재예요.' : '많이 가지고 있지는 않아요.'}</p>
        <p class="hint">함께하면 좋은 활동: ${ELEMENT_INFO[weakA].act.split(', ')[0]}, ${ELEMENT_INFO[weakB].act.split(', ')[0]}</p></div>
      <div class="card"><h3>${ANIMAL_EMOJI[a.animal]} 띠 궁합</h3><p>${brText}</p></div>
      <div class="card"><h3>${ZODIAC[za].sym} 별자리 궁합</h3><span class="tagline">${ZODIAC[za].name}(${ZEL_NAME[ea]}) × ${ZODIAC[zb].name}(${ZEL_NAME[eb]})</span>
        <p>${ea === eb ? '같은 원소끼리라 가치관과 감정의 온도가 비슷해요. 말하지 않아도 통하는 편안한 사이입니다.' : pair[ea] === eb ? '서로의 원소를 살려 주는 조합이에요. 함께 있으면 각자의 장점이 더 커집니다.' : '다른 원소의 매력에 끌리는 사이예요. 차이를 즐기면 서로에게 새로운 세계를 열어 줍니다.'}
        ${zBest ? ' 게다가 서로 손꼽히는 <b>찰떡궁합 별자리</b>예요!' : zWorst ? ' 별자리로는 노력이 필요한 조합이지만, 사주가 그 차이를 메워 줍니다.' : ''}</p>
        <p>${ZODIAC[za].name}는 ${ZODIAC[za].trait}, ${ZODIAC[zb].name}는 ${ZODIAC[zb].trait}예요.</p></div>
      <div class="card"><h3>💗 연애 스타일 비교</h3>
        <p><b>${P}님</b> — ${DM_DETAIL[a.me].love.split('. ')[0]}.</p><p><b>${Q}님</b> — ${DM_DETAIL[b.me].love.split('. ')[0]}.</p></div>
      <div class="card"><h3>📆 다가오는 해의 두 사람</h3>${rowsHTML([yLine(A, P), yLine(B, Q)])}</div>
      <div class="card"><h3>🔑 더 좋은 관계를 위한 열쇠</h3><ul class="dl good">${tips.map(x => `<li>${x}</li>`).join('')}${br === 'chung' || ib === 'chung' ? '<li>다툰 날은 그날 안에 풀기</li>' : '<li>함께하는 작은 루틴 만들기</li>'}</ul></div>
      <div class="card advice">“${score >= 75 ? '지금처럼 서로를 아껴 주세요.' : '다름을 인정하는 순간 사랑은 깊어집니다.'}”</div>`,
  };
}
