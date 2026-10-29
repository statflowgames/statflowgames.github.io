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

// 어떤 간지(천간·지지)가 들어올 때의 점수와 관계
function scoreFor(p, s, gz, salt) {
  const rel = relation(s.meEl, STEM_EL[gz.s]);
  const br = branchRel(s.day.b, gz.b);
  const r = rngFor(profileKey(p), salt);
  const bonus = br === 'hap' ? 6 : br === 'samhap' ? 4 : br === 'chung' ? -9 : 0;
  const score = clamp(Math.round(REL[rel].base + bonus + (r() - 0.5) * 26), 38, 97);
  return { rel, br, score, r };
}

function catLevels(rel, score, r) {
  return CATS.map(c => {
    const lv = clamp(Math.round(score / 20 + CAT_BIAS[rel][c.key] + (r() - 0.5) * 1.6), 1, 5);
    return { ...c, lv, text: pick(r, CAT_TEXT[c.key][lv - 1]) };
  });
}

function luckyFor(p, s, r) {
  const helper = mod(s.meEl + 4, 5); // 나를 돕는 오행
  const lack = s.count.indexOf(Math.min(...s.count));
  const el = r() < 0.5 ? helper : lack;
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
function relCard(rel, extra = '') {
  const R = REL[rel];
  return `<span class="tagline">${R.emoji} ${R.name} · ${R.tag}</span>${extra}`;
}

// ---------- 운세 종류별 ----------
function buildDaily(p, now) {
  const s = computeSaju(p);
  const [y, m, d] = now;
  const gz = dayPillar(y, m, d);
  const { rel, br, score, r } = scoreFor(p, s, gz, `day-${y}-${m}-${d}`);
  const cats = catLevels(rel, score, r);
  const brNote = br === 'hap' ? '<p>오늘의 일진이 당신의 일지와 <b>합(合)</b>을 이루어 인연과 화합의 기운이 더해집니다.</p>'
    : br === 'chung' ? '<p>오늘의 일진이 당신의 일지와 <b>충(沖)</b>을 이루니 이동과 말다툼을 조심하세요.</p>' : '';
  return {
    share: `${p.name}님의 ${m}월 ${d}일 운세: ${score}점 — ${pick(rngFor(profileKey(p), 'dt', y, m, d), DAILY_TITLE[rel])}`,
    html: `<div class="res-head"><div class="lbl">${y}년 ${m}월 ${d}일 (${WEEKDAYS[new Date(y, m - 1, d).getDay()]}) · ${gz.han}일</div>
      <h2 class="serif">${pick(rngFor(profileKey(p), 'dt', y, m, d), DAILY_TITLE[rel])}</h2>${ringHTML(score)}</div>
      <div class="card">${relCard(rel)}<p>${pick(r, DAILY_BODY[rel])}</p>${brNote}</div>
      ${catsHTML(cats)}${luckyHTML(luckyFor(p, s, r))}
      <div class="card advice">“${pick(r, ADVICE)}”</div>`,
  };
}

function buildWeekly(p, now) {
  const s = computeSaju(p);
  const base = new Date(now[0], now[1] - 1, now[2]);
  const off = (base.getDay() + 6) % 7; // 월요일 시작
  const days = [];
  const relCount = {};
  for (let i = 0; i < 7; i++) {
    const t = new Date(base); t.setDate(base.getDate() - off + i);
    const y = t.getFullYear(), m = t.getMonth() + 1, d = t.getDate();
    const sc = scoreFor(p, s, dayPillar(y, m, d), `day-${y}-${m}-${d}`);
    relCount[sc.rel] = (relCount[sc.rel] || 0) + 1;
    days.push({ l: WEEKDAYS[t.getDay()], v: sc.score, date: `${m}/${d}`, rel: sc.rel });
  }
  const rel = Object.keys(relCount).sort((a, b) => relCount[b] - relCount[a])[0];
  const avg = Math.round(days.reduce((a, b) => a + b.v, 0) / 7);
  const best = days.reduce((a, b) => b.v > a.v ? b : a), worst = days.reduce((a, b) => b.v < a.v ? b : a);
  const r = rngFor(profileKey(p), 'week', days[0].date, now[0]);
  const cats = catLevels(rel, avg, r);
  return {
    share: `${p.name}님의 이번 주 운세: ${avg}점 — ${WEEK_TITLE[rel]}`,
    html: `<div class="res-head"><div class="lbl">${days[0].date} ~ ${days[6].date} 주간 운세</div>
      <h2 class="serif">${WEEK_TITLE[rel]}</h2>${ringHTML(avg, '주간 평균')}</div>
      <div class="card"><h3>📅 요일별 운세 흐름</h3>${barsHTML(days)}
        <p style="margin-top:10px">👍 가장 좋은 날은 <b>${best.l}요일(${best.date})</b>, 조심할 날은 <b>${worst.l}요일(${worst.date})</b>이에요.</p></div>
      <div class="card">${relCard(rel)}<p>${WEEK_BODY[rel]}</p></div>
      ${catsHTML(cats)}${luckyHTML(luckyFor(p, s, r), '🍀 이번 주 행운')}
      <div class="card advice">“${pick(r, ADVICE)}”</div>`,
  };
}

function buildMonthly(p, now) {
  const s = computeSaju(p);
  const [y, m] = now;
  const mp = yearMonthPillars(y, m, 20).month;
  const { rel, score, r } = scoreFor(p, s, mp, `month-${y}-${m}`);
  const parts = ['상순 (1~10일)', '중순 (11~20일)', '하순 (21일~)'].map((l, i) => {
    let sum = 0;
    for (let d = i * 10 + 1; d <= i * 10 + 10; d++) {
      const dd = Math.min(d, 28);
      sum += scoreFor(p, s, dayPillar(y, m, dd), `day-${y}-${m}-${dd}`).score;
    }
    return { l: l.split(' ')[0], v: Math.round((sum / 10 + score) / 2) };
  });
  const cats = catLevels(rel, score, r);
  return {
    share: `${p.name}님의 ${m}월 운세: ${score}점 — ${MONTH_TITLE[rel]}`,
    html: `<div class="res-head"><div class="lbl">${y}년 ${m}월 · ${mp.han}월</div>
      <h2 class="serif">${MONTH_TITLE[rel]}</h2>${ringHTML(score, `${m}월 점수`)}</div>
      <div class="card">${relCard(rel)}${MONTH_BODY[rel].map(t => `<p>${t}</p>`).join('')}</div>
      <div class="card"><h3>🗓️ 시기별 흐름</h3>${barsHTML(parts)}</div>
      ${catsHTML(cats)}${luckyHTML(luckyFor(p, s, r), '🍀 이달의 행운')}
      <div class="card advice">“${pick(r, ADVICE)}”</div>`,
  };
}

function yearTarget(now) { return now[1] >= 10 ? now[0] + 1 : now[0]; }

function buildYearly(p, now) {
  const s = computeSaju(p);
  const Y = yearTarget(now);
  const yp = yearMonthPillars(Y, 6, 1).year;
  const { rel, br, score, r } = scoreFor(p, s, yp, `year-${Y}`);
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const mp = yearMonthPillars(Y, m, 20).month;
    months.push({ l: m + '', v: Math.round((scoreFor(p, s, mp, `month-${Y}-${m}`).score + score) / 2) });
  }
  const best = months.reduce((a, b) => b.v > a.v ? b : a), worst = months.reduce((a, b) => b.v < a.v ? b : a);
  const yb = branchRel(s.animal, yp.b);
  const animalNote = yb === 'chung' ? `올해는 ${ANIMALS[s.animal]}띠와 충(沖)이 드는 해예요. 이사·이직 같은 큰 변화는 신중하게 준비하세요.`
    : yb === 'hap' || yb === 'samhap' ? `${ANIMALS[s.animal]}띠와 ${ANIMALS[yp.b]}해가 서로 잘 어울려 사람 복이 따르는 해예요.`
    : s.animal === yp.b ? `자기 띠의 해(본명년)예요. 새로운 출발의 기운이 강하지만 건강 관리에 더 신경 쓰세요.`
    : `${ANIMALS[s.animal]}띠에게 ${ANIMALS[yp.b]}해는 무난하게 흐르는 해입니다. 꾸준함이 가장 큰 무기예요.`;
  const yName = `${Y}년 ${yp.text}년`;
  const cats = catLevels(rel, score, r);
  return {
    share: `${p.name}님의 ${Y}년 신년운세: ${score}점 — ${YEAR_BODY[rel].title}`,
    html: `<div class="res-head"><div class="lbl">${Y}년 ${yp.text}년 (${yp.han}) · ${ANIMAL_EMOJI[yp.b]} ${ANIMALS[yp.b]}의 해</div>
      <h2 class="serif">${YEAR_BODY[rel].title}</h2>${ringHTML(score, `${Y} 총운`)}</div>
      <div class="card">${relCard(rel)}<p>${YEAR_BODY[rel].body.replace('{Y}', yName)}</p>
        ${br === 'chung' ? '<p>일지와 세운이 부딪치는 해라 인간관계의 변화가 많을 수 있어요.</p>' : ''}</div>
      <div class="card"><h3>${ANIMAL_EMOJI[s.animal]} ${ANIMALS[s.animal]}띠의 ${Y}년</h3><p>${animalNote}</p></div>
      <div class="card"><h3>📈 월별 운세 흐름</h3>${barsHTML(months)}
        <p style="margin-top:10px">🌟 최고의 달은 <b>${best.l}월</b>, 쉬어 갈 달은 <b>${worst.l}월</b>이에요.</p></div>
      ${catsHTML(cats)}${luckyHTML(luckyFor(p, s, r), `🍀 ${Y}년 행운`)}
      <div class="card advice">“${pick(r, ADVICE)}”</div>`,
  };
}

function buildSaju(p) {
  const s = computeSaju(p);
  const dm = DAY_MASTER[s.me];
  const cols = [['시주', s.hour], ['일주', s.day], ['월주', s.month], ['년주', s.year]];
  const cell = (pp, which, me) => {
    if (!pp) return `<div class="gz none">모름</div>`;
    const idx = which === 's' ? pp.s : pp.b;
    const el = which === 's' ? STEM_EL[idx] : BRANCH_EL[idx];
    const han = which === 's' ? STEMS_H[idx] : BRANCHES_H[idx];
    const ko = which === 's' ? STEMS[idx] : BRANCHES[idx];
    return `<div class="gz ${me ? 'me' : ''}" style="background:var(--el${el})">${han}<small>${ko} · ${ELEMENTS[el]}</small></div>`;
  };
  const total = s.count.reduce((a, b) => a + b, 0);
  const maxC = Math.max(...s.count), minC = Math.min(...s.count);
  const strong = s.count.indexOf(maxC), weak = s.count.indexOf(minC);
  const W = ELEMENT_INFO[weak];
  const r = rngFor(profileKey(p), 'saju');
  const EL_DESC = ['성장과 시작', '열정과 표현', '안정과 신뢰', '결단과 원칙', '지혜와 유연함'];
  return {
    share: `${p.name}님의 사주: ${s.year.han} ${s.month.han} ${s.day.han}${s.hour ? ' ' + s.hour.han : ''} — 일간 ${dm.name}${dm.icon}`,
    html: `<div class="res-head"><div class="lbl">${p.cal === 'lunar' ? `음력 ${p.ly}.${p.leap ? '윤' : ''}${p.lm}.${p.ld} (양력 ${p.y}.${p.m}.${p.d})` : `양력 ${p.y}.${p.m}.${p.d}`} ${p.hour === null ? '(시간 모름)' : `${String(p.hour).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`}</div>
      <h2 class="serif">${dm.icon} ${dm.name}의 기운을 타고난<br>${esc(p.name)}님</h2></div>
      <div class="card"><h3>🔮 사주팔자 원국</h3>
        <div class="pillars">${cols.map(c => `<div class="h">${c[0]}</div>`).join('')}
          ${cols.map((c, i) => cell(c[1], 's', i === 1)).join('')}
          ${cols.map(c => cell(c[1], 'b', false)).join('')}</div>
        <p class="hint" style="margin-top:10px">금색 테두리가 나를 뜻하는 <b>일간(日干)</b>이에요. ${ANIMAL_EMOJI[s.animal]} ${ANIMALS[s.animal]}띠${p.hour === null ? ' · 태어난 시간을 넣으면 시주까지 볼 수 있어요.' : ''}</p></div>
      <div class="card"><span class="tagline">${dm.key}</span><h3>${dm.icon} 나의 본성 — ${STEMS_H[s.me]}${ELEMENTS_H[s.meEl]}</h3><p>${dm.desc}</p>
        <div class="lucky" style="margin-top:12px"><div><small>강점</small><b style="font-size:13px">${dm.strong}</b></div><div><small>주의할 점</small><b style="font-size:13px">${dm.weak}</b></div></div></div>
      <div class="card"><h3>☯️ 오행 분포</h3><div class="elbars">${s.count.map((c, i) =>
        `<div class="r"><span class="n">${ELEMENTS_H[i]} ${ELEMENTS[i]}</span><span class="t"><i style="width:${Math.max(4, c / total * 100)}%;background:var(--el${i})"></i></span><span class="c">${c}</span></div>`).join('')}</div>
        <p style="margin-top:10px">가장 강한 기운은 <b>${ELEMENTS[strong]}(${ELEMENTS_H[strong]})</b> — ${EL_DESC[strong]}의 힘이 두드러져요.
        ${minC === 0 ? `<b>${ELEMENTS[weak]}(${ELEMENTS_H[weak]})</b> 기운이 비어 있어` : `<b>${ELEMENTS[weak]}(${ELEMENTS_H[weak]})</b> 기운이 약해`} ${EL_DESC[weak]}을(를) 보완하면 균형이 맞습니다.</p></div>
      <div class="card"><h3>🌈 부족한 ${ELEMENTS[weak]} 기운 채우기</h3><div class="lucky">
        <div><small>색</small><b><span class="dot" style="background:${W.colorHex}"></span>${W.color}</b></div>
        <div><small>방향</small><b>${W.dir}</b></div>
        <div><small>숫자</small><b>${W.nums.join(', ')}</b></div>
        <div><small>소품</small><b style="font-size:13px">${W.item}</b></div></div>
        <p style="margin-top:10px">🍽️ ${W.food}<br>🏃 ${W.act}</p></div>
      <div class="card advice">“${pick(r, ADVICE)}”</div>`,
  };
}

function buildZodiac(p, now) {
  const zi = zodiacOf(p.m, p.d);
  const Z = ZODIAC[zi];
  const [y, m, d] = now;
  const r = rngFor('zodiac', zi, y, m, d, profileKey(p));
  const score = clamp(Math.round(45 + r() * 52), 40, 97);
  const lv = clamp(Math.ceil(score / 20), 1, 5);
  const good = ZODIAC.map((z, i) => i).filter(i => i !== zi && (ZODIAC[i].el === Z.el ||
    ({ fire: 'air', air: 'fire', earth: 'water', water: 'earth' })[Z.el] === ZODIAC[i].el));
  const mate = ZODIAC[pick(r, good)];
  const cats = [
    { icon: '💗', name: '애정운', key: 'love' }, { icon: '💰', name: '금전운', key: 'money' }, { icon: '📚', name: '일·학업운', key: 'work' },
  ].map(c => { const l = clamp(lv + Math.round((r() - 0.5) * 2.4), 1, 5); return { ...c, lv: l, text: pick(r, CAT_TEXT[c.key][l - 1]) }; });
  const colors = [['코랄', '#ff7f6e'], ['라벤더', '#b9a3ff'], ['민트', '#7fe0c0'], ['하늘색', '#7fc4ff'], ['골드', '#ffd36e'], ['로즈', '#ff8fc7'], ['아이보리', '#fff3dc'], ['네이비', '#3b4a9c']];
  const c = pick(r, colors);
  return {
    share: `${Z.sym} ${Z.name} 오늘의 운세: ${score}점`,
    html: `<div class="res-head"><div class="lbl">${y}년 ${m}월 ${d}일 별자리 운세</div>
      <div style="font-size:60px;line-height:1.2;color:var(--gold)">${Z.sym}</div>
      <h2 class="serif">${Z.name}</h2><div class="lbl">${Z.range} · ${ZEL_NAME[Z.el]}의 별자리 · ${Z.trait}</div>${ringHTML(score, '오늘의 별점')}</div>
      <div class="card"><h3>✨ 오늘의 별 메시지</h3><p>${ZODIAC_TEXT[lv - 1]}</p></div>
      ${catsHTML(cats)}
      <div class="card"><h3>🍀 오늘의 행운</h3><div class="lucky">
        <div><small>행운의 색</small><b><span class="dot" style="background:${c[1]}"></span>${c[0]}</b></div>
        <div><small>행운의 숫자</small><b>${Math.floor(r() * 45) + 1}</b></div>
        <div><small>잘 맞는 별자리</small><b>${mate.sym} ${mate.name}</b></div>
        <div><small>행운의 물건</small><b>${pick(r, LUCKY_ITEMS)}</b></div></div></div>
      <div class="card advice">“${pick(r, ADVICE)}”</div>`,
  };
}

function buildCompat(p, q) {
  const a = computeSaju(p), b = computeSaju(q);
  const za = zodiacOf(p.m, p.d), zb = zodiacOf(q.m, q.d);
  const r = rngFor('compat', profileKey(p), profileKey(q));
  // 일간 오행 관계
  const relAB = relation(a.meEl, b.meEl);
  const elScore = { in: 16, sik: 14, bi: 10, jae: 8, gwan: 2 }[relAB];
  const elText = {
    in: `상대가 당신을 북돋아 주는 관계예요. ${esc(q.name)}님 곁에 있으면 마음이 편안해지고 자신감이 생깁니다.`,
    sik: `당신이 상대에게 아낌없이 주는 관계예요. 당신의 다정함이 ${esc(q.name)}님에게 큰 힘이 됩니다.`,
    bi: '서로 닮은 기운이라 말하지 않아도 통하는 친구 같은 관계예요. 다만 고집이 부딪칠 땐 한 템포 쉬어 가세요.',
    jae: '당신이 관계를 이끌어 가는 편이에요. 상대를 아끼는 마음이 크지만 지나친 간섭은 금물입니다.',
    gwan: '상대가 당신을 단단하게 잡아 주는 관계예요. 긴장감이 설렘이 되기도 하지만, 서로의 영역을 존중해야 오래갑니다.',
  }[relAB];
  const br = branchRel(a.animal, b.animal);
  const brScore = { hap: 14, samhap: 12, none: 6, chung: -6 }[br];
  const brText = {
    hap: `${ANIMALS[a.animal]}띠와 ${ANIMALS[b.animal]}띠는 육합(六合) — 천생연분이라 불리는 찰떡 궁합이에요!`,
    samhap: `${ANIMALS[a.animal]}띠와 ${ANIMALS[b.animal]}띠는 삼합(三合) — 함께하면 큰일을 이루는 궁합이에요.`,
    none: a.animal === b.animal ? `같은 ${ANIMALS[a.animal]}띠끼리라 취향과 생활 리듬이 잘 맞아요.` : `${ANIMALS[a.animal]}띠와 ${ANIMALS[b.animal]}띠는 무난하게 어울리는 사이예요.`,
    chung: `${ANIMALS[a.animal]}띠와 ${ANIMALS[b.animal]}띠는 충(沖) — 끌림은 강하지만 부딪힘도 있어요. 대화로 풀면 더 단단해집니다.`,
  }[br];
  const ea = ZODIAC[za].el, eb = ZODIAC[zb].el;
  const pair = { fire: 'air', air: 'fire', earth: 'water', water: 'earth' };
  const zScore = ea === eb ? 10 : pair[ea] === eb ? 12 : 3;
  const score = clamp(Math.round(50 + elScore + brScore + zScore + (r() - 0.5) * 8), 45, 99);
  const verdict = score >= 90 ? '운명이 맺어 준 인연' : score >= 80 ? '서로를 빛내는 최고의 짝' : score >= 70 ? '함께 성장하는 좋은 인연' : score >= 60 ? '노력하면 깊어지는 사이' : '서로 배우며 맞춰 가는 사이';
  return {
    share: `${p.name} 💞 ${q.name} 궁합: ${score}점 — ${verdict}`,
    html: `<div class="res-head"><div class="lbl">사주 · 띠 · 별자리 종합 궁합</div>
      <div class="match"><div class="p"><b>${ANIMAL_EMOJI[a.animal]}</b><span>${esc(p.name)}</span></div><div class="heart">💞</div><div class="p"><b>${ANIMAL_EMOJI[b.animal]}</b><span>${esc(q.name)}</span></div></div>
      <h2 class="serif">${verdict}</h2>${ringHTML(score, '궁합 점수')}</div>
      <div class="card"><h3>☯️ 사주 궁합 — ${DAY_MASTER[a.me].icon} × ${DAY_MASTER[b.me].icon}</h3>
        <p>${esc(p.name)}님은 <b>${DAY_MASTER[a.me].name}</b>, ${esc(q.name)}님은 <b>${DAY_MASTER[b.me].name}</b>의 기운이에요.</p><p>${elText}</p></div>
      <div class="card"><h3>${ANIMAL_EMOJI[a.animal]} 띠 궁합</h3><p>${brText}</p></div>
      <div class="card"><h3>${ZODIAC[za].sym} 별자리 궁합</h3><p>${ZODIAC[za].name}(${ZEL_NAME[ea]}) × ${ZODIAC[zb].name}(${ZEL_NAME[eb]}) — ${
        ea === eb ? '같은 원소끼리라 가치관이 비슷해요.' : pair[ea] === eb ? '서로의 부족함을 채워 주는 환상의 조합이에요.' : '다른 매력에 끌리는 사이, 차이를 즐기면 더 재미있어요.'}</p></div>
      <div class="card advice">“${score >= 75 ? '지금처럼 서로를 아껴 주세요.' : '다름을 인정하는 순간 사랑은 깊어집니다.'}”</div>`,
  };
}
