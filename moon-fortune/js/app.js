// 화면 흐름: 홈 → (프로필) → 광고 관문 → 광고 → 결과
const $ = s => document.querySelector(s);
const Store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
};
let profile = Store.get('mf_profile');
let partner = Store.get('mf_partner');

function today() { const t = new Date(); return [t.getFullYear(), t.getMonth() + 1, t.getDate()]; }

const MENU = [
  { id: 'daily', ic: '☀️', nm: '오늘의 운세', ds: '하루 총운 · 행운 아이템', build: p => buildDaily(p, today()) },
  { id: 'weekly', ic: '📅', nm: '주간 운세', ds: '요일별 운세 흐름', build: p => buildWeekly(p, today()) },
  { id: 'monthly', ic: '🌙', nm: '월간 운세', ds: '이달의 운세와 시기별 흐름', build: p => buildMonthly(p, today()) },
  { id: 'saju', ic: '🔮', nm: '사주팔자', ds: '타고난 기운 · 오행 분석', build: p => buildSaju(p) },
  { id: 'zodiac', ic: '✨', nm: '별자리 운세', ds: '오늘 나의 별점', build: p => buildZodiac(p, today()) },
  { id: 'compat', ic: '💞', nm: '궁합', ds: '사주 · 띠 · 별자리 궁합', build: p => buildCompat(p, partner) },
  { id: 'tarot', ic: '🃏', nm: '오늘의 타로', ds: '카드 한 장의 메시지' },
];
const YEAR_ITEM = () => ({ id: 'yearly', ic: '🎆', nm: `${yearTarget(today())}년 신년운세`, ds: '한 해 총운 · 월별 흐름 미리 보기', build: p => buildYearly(p, today()) });
const findItem = id => id === 'yearly' ? YEAR_ITEM() : MENU.find(m => m.id === id);

// ---------- 화면 전환 ----------
function show(id, title) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
  $('#topTitle').textContent = title || '';
  $('#backBtn').style.visibility = id === 'home' ? 'hidden' : 'visible';
  $('#profileChip').style.display = id === 'home' && profile ? '' : 'none';
  window.scrollTo(0, 0);
}
function go(id, title) {
  history.pushState({ s: id }, '');
  show(id, title);
}
window.addEventListener('popstate', () => renderHome());
$('#backBtn').onclick = () => history.length > 1 ? history.back() : renderHome();

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 1800);
}

// ---------- 홈 ----------
function renderHome() {
  show('home');
  const [y, m, d] = today();
  const gz = dayPillar(y, m, d);
  let tags = '';
  if (profile) {
    const s = computeSaju(profile);
    const z = ZODIAC[zodiacOf(profile.m, profile.d)];
    tags = `<div class="tags"><span>${ANIMAL_EMOJI[s.animal]} ${ANIMALS[s.animal]}띠</span><span>${z.sym} ${z.name}</span><span>${DAY_MASTER[s.me].icon} ${DAY_MASTER[s.me].name}</span></div>`;
    $('#profileChip').textContent = `👤 ${profile.name}`;
  }
  $('#todayCard').innerHTML = `<div class="d">${y}년 ${m}월 ${d}일 ${WEEKDAYS[new Date().getDay()]}요일 · 오늘의 일진</div>
    <div class="g serif">${gz.han}일 <span style="font-size:14px;color:var(--muted)">(${gz.text}일 · ${ELEMENTS[STEM_EL[gz.s]]}의 기운)</span></div>
    ${profile ? `<div class="d" style="margin-top:4px">${esc(profile.name)}님, 오늘의 운을 확인해 보세요 🐰</div>` : '<div class="d" style="margin-top:4px">생년월일을 넣으면 나만의 운세를 볼 수 있어요</div>'}${tags}`;
  const items = [YEAR_ITEM(), ...MENU];
  $('#grid').innerHTML = items.map(it => `<button class="tile ${it.id === 'yearly' ? 'wide' : ''}" data-id="${it.id}">
      <span class="ad">🎬 AD</span><div class="ic">${it.ic}</div><div><div class="nm">${it.nm}</div><div class="ds">${it.ds}</div></div></button>`).join('');
  $('#grid').querySelectorAll('.tile').forEach(b => b.onclick = () => openItem(b.dataset.id));
}
$('#profileChip').onclick = () => openProfile();

function openItem(id) {
  if (!profile) { openProfile(id); return; }
  openGate(id);
}

// ---------- 프로필 ----------
let afterProfile = null;
function openProfile(nextId) {
  afterProfile = nextId || null;
  const p = profile || { name: '', gender: 'f', y: 1995, m: 1, d: 1, hour: null, min: 0 };
  $('#pfName').value = p.name;
  birthPicker($('#pfBirth'), p);
  $('#pfNoTime').checked = p.hour === null;
  $('#pfTime').value = p.hour === null ? '12:00' : `${String(p.hour).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`;
  $('#pfTime').disabled = p.hour === null;
  setSeg('#pfGender', p.gender);
  go('profile', '내 정보');
}
function setSeg(sel, v) { document.querySelectorAll(`${sel} button`).forEach(b => b.classList.toggle('on', b.dataset.v === v)); }
function segVal(sel) { const b = document.querySelector(`${sel} button.on`); return b ? b.dataset.v : null; }
document.querySelectorAll('#pfGender').forEach(seg => seg.querySelectorAll('button').forEach(b => b.onclick = () => {
  seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
}));
$('#pfNoTime').onchange = e => { $('#pfTime').disabled = e.target.checked; };

// ---------- 생년월일 선택 (양력/음력) ----------
const opts = (from, to, sel, unit) => Array.from({ length: to - from + 1 }, (_, i) => from + i)
  .map(v => `<option value="${v}" ${v === sel ? 'selected' : ''}>${v}${unit}</option>`).join('');
function birthPicker(el, v) {
  const cal = v.cal === 'lunar' ? 'lunar' : 'solar';
  const cur = cal === 'lunar' ? [v.ly, v.lm, v.ld] : [v.y, v.m, v.d];
  el.innerHTML = `<div class="seg cal"><button data-v="solar">양력</button><button data-v="lunar">음력</button></div>
    <div class="ymd"><select class="by">${opts(1920, new Date().getFullYear(), cur[0], '년')}</select>
      <select class="bm">${opts(1, 12, cur[1], '월')}</select><select class="bd"></select></div>
    <label class="leap"><input type="checkbox" class="bl" ${v.leap ? 'checked' : ''}><span></span></label>
    <div class="hint conv"></div>`;
  const q = s => el.querySelector(s);
  const seg = q('.cal');
  let day = cur[2] || 1;
  const update = () => {
    const lunar = q('.cal button.on').dataset.v === 'lunar';
    const y = +q('.by').value, m = +q('.bm').value;
    const max = lunar ? 30 : new Date(y, m, 0).getDate();
    day = Math.min(+q('.bd').value || day, max);
    q('.bd').innerHTML = opts(1, max, day, '일');
    const lm = lunar ? leapMonthOf(y) : 0;
    q('.leap').style.display = lunar && lm === m ? 'flex' : 'none';
    q('.leap span').textContent = `윤${m}월이에요`;
    if (!(lunar && lm === m)) q('.bl').checked = false;
    const r = readBirth(el);
    const l = !lunar && !r.error ? solarToLunar(r.y, r.m, r.d) : null;
    q('.conv').textContent = r.error ? '⚠️ ' + r.error
      : lunar ? `→ 양력 ${r.y}년 ${r.m}월 ${r.d}일` : l ? `→ 음력 ${l.y}년 ${l.leap ? '윤' : ''}${l.m}월 ${l.d}일` : '';
  };
  seg.querySelectorAll('button').forEach(b => {
    b.classList.toggle('on', b.dataset.v === cal);
    b.onclick = () => { seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); update(); };
  });
  ['.by', '.bm', '.bd', '.bl'].forEach(s => q(s).onchange = update);
  update();
}
// { cal, y, m, d (항상 양력), ly, lm, ld, leap } 또는 { error }
function readBirth(el) {
  const q = s => el.querySelector(s);
  const cal = q('.cal button.on').dataset.v;
  const y = +q('.by').value, m = +q('.bm').value, d = +q('.bd').value;
  if (cal === 'solar') return { cal, y, m, d, ly: null, lm: null, ld: null, leap: false };
  const leap = q('.bl').checked;
  const s = lunarToSolar(y, m, d, leap);
  if (s.error) return s;
  return { cal, y: s.y, m: s.m, d: s.d, ly: y, lm: m, ld: d, leap };
}

function readPerson(nameEl, birthEl, timeEl, noTimeEl, genderSel) {
  const name = nameEl.value.trim();
  if (!name) { toast('이름을 입력해 주세요'); return null; }
  const b = readBirth(birthEl);
  if (b.error) { toast(b.error); return null; }
  const t = new Date();
  if (b.y * 10000 + b.m * 100 + b.d > t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate()) { toast('오늘 이후 날짜는 넣을 수 없어요'); return null; }
  let hour = null, min = 0;
  if (timeEl && !noTimeEl.checked && timeEl.value) [hour, min] = timeEl.value.split(':').map(Number);
  return { name: name.slice(0, 12), gender: segVal(genderSel) || 'f', ...b, hour, min };
}
$('#pfSave').onclick = () => {
  const p = readPerson($('#pfName'), $('#pfBirth'), $('#pfTime'), $('#pfNoTime'), '#pfGender');
  if (!p) return;
  profile = p; Store.set('mf_profile', p);
  toast('저장했어요 🐰');
  if (afterProfile) { history.replaceState({ s: 'home' }, ''); openGateReplace(afterProfile); }
  else history.back();
};

// ---------- 광고 관문 ----------
function openGateReplace(id) { history.replaceState({ s: 'gate' }, ''); renderGate(id); }
function openGate(id) { history.pushState({ s: 'gate' }, ''); renderGate(id); }
function renderGate(id) {
  const it = findItem(id);
  show('gate', it.nm);
  const isCompat = id === 'compat';
  const q = partner || { name: '', y: 1995, m: 1, d: 1 };
  $('#gate').innerHTML = `<div class="big">${it.ic}</div>
    <h2 class="serif">${esc(profile.name)}님의 ${it.nm}</h2><p>${it.ds}</p>
    ${isCompat ? `<div class="form" style="text-align:left;margin-bottom:14px">
        <label>상대방 이름</label><input id="ptName" maxlength="12" placeholder="이름 또는 별명" value="${esc(q.name)}">
        <label>상대방 생년월일</label><div id="ptBirth"></div>
        <label>상대방 성별</label><div class="seg" id="ptGender"><button data-v="f">여성</button><button data-v="m">남성</button></div></div>`
      : `<div class="teaser"><div class="bar" style="width:60%"></div><div class="bar"></div><div class="bar" style="width:85%"></div><div class="bar" style="width:70%"></div><div class="bar" style="width:92%"></div>
        <div class="lock"><b>🔒</b>달토끼가 운세를 준비했어요</div></div>`}
    <button class="btn" id="watchBtn">🎬 광고 보고 결과 보기<span class="sub">짧은 광고 1편 시청 후 바로 확인</span></button>
    <p class="hint" style="margin-top:12px">재미로 보는 운세예요. 중요한 결정은 스스로 판단해 주세요.</p>`;
  if (isCompat) {
    const seg = $('#ptGender');
    seg.querySelectorAll('button').forEach(b => b.onclick = () => seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)));
    setSeg('#ptGender', q.gender || (profile.gender === 'f' ? 'm' : 'f'));
    birthPicker($('#ptBirth'), q);
  }
  $('#watchBtn').onclick = async () => {
    if (isCompat) {
      const pt = readPerson($('#ptName'), $('#ptBirth'), null, null, '#ptGender');
      if (!pt) return;
      partner = pt; Store.set('mf_partner', pt);
    }
    const btn = $('#watchBtn'); btn.disabled = true;
    const ok = await Ads.showRewarded();
    btn.disabled = false;
    if (!ok) { toast('광고를 끝까지 보면 결과를 볼 수 있어요'); return; }
    history.replaceState({ s: 'result' }, '');
    if (id === 'tarot') renderTarot(); else renderResult(it);
  };
}

// ---------- 결과 ----------
function loadingThen(fn) {
  show('result', $('#topTitle').textContent);
  $('#result').innerHTML = `<div class="loading"><div class="orb">🌕</div><p class="serif" style="color:var(--gold);font-size:17px">달토끼가 운세를 읽고 있어요…</p></div>`;
  setTimeout(fn, 1100);
}
function renderResult(it) {
  loadingThen(() => {
    const res = it.build(profile);
    $('#result').innerHTML = res.html + resultFooter();
    bindFooter(res.share);
    animateResult();
  });
}
function resultFooter() {
  return `<button class="btn" id="shareBtn">📤 친구에게 공유하기</button><button class="btn ghost" id="homeBtn">🏠 다른 운세 보기</button>`;
}
function bindFooter(text) {
  $('#homeBtn').onclick = () => history.back();
  $('#shareBtn').onclick = async () => {
    const msg = `🐰 달토끼 운세\n${text}\n#달토끼운세`;
    try {
      if (navigator.share) { await navigator.share({ title: '달토끼 운세', text: msg }); return; }
      await navigator.clipboard.writeText(msg); toast('복사했어요! 붙여 넣어 공유하세요');
    } catch (e) { }
  };
}
function animateResult() {
  document.querySelectorAll('.ringbar').forEach(c => {
    c.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)';
    requestAnimationFrame(() => requestAnimationFrame(() => c.setAttribute('stroke-dashoffset', c.dataset.to)));
  });
  document.querySelectorAll('[data-count]').forEach(el => {
    const to = +el.dataset.count, t0 = performance.now();
    const step = t => { const k = Math.min(1, (t - t0) / 1200); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
  document.querySelectorAll('#result .card').forEach((c, i) => c.style.animationDelay = `${0.15 + i * 0.12}s`);
}

// ---------- 타로 ----------
function renderTarot() {
  show('result', '오늘의 타로');
  const deck = TAROT.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, 3);
  $('#result').innerHTML = `<div class="res-head"><div class="lbl">마음속으로 질문을 떠올리고</div><h2 class="serif">카드 한 장을 골라 주세요</h2></div>
    <div class="tarot-pick">${deck.map(i => {
      const c = TAROT[i];
      return `<div class="tcard" data-i="${i}"><div class="bk">🌙</div><div class="f"><div class="no">${c.n}</div><div class="ic">${c.icon}</div><div class="nm">${c.name}</div></div></div>`;
    }).join('')}</div><div id="tarotOut"></div>`;
  document.querySelectorAll('.tcard').forEach(el => el.onclick = () => {
    if (document.querySelector('.tcard.flip')) return;
    const rev = Math.random() < 0.3;
    el.classList.add('flip'); if (rev) el.classList.add('rev');
    document.querySelectorAll('.tcard').forEach(o => o !== el && o.classList.add('dim'));
    const c = TAROT[+el.dataset.i];
    setTimeout(() => {
      $('#tarotOut').innerHTML = `<div class="card" style="text-align:center"><span class="tagline">${rev ? '역방향 🔄' : '정방향 ⬆️'}</span>
          <h3 style="justify-content:center;font-size:20px" class="serif">${c.n}. ${c.name}</h3>
          <p><b>${rev ? c.rev : c.up}</b></p></div>
        <div class="card"><h3>🐰 달토끼의 해석</h3><p>${rev ? `지금은 '${c.name}' 카드의 기운이 막혀 있어요. ${c.rev}에 주의하면서 한 박자 쉬어 가세요. ` : ''}${c.msg}</p></div>
        <div class="card advice">오늘의 키워드 — ${(rev ? c.rev : c.up).split(', ')[0]}</div>` + resultFooter();
      bindFooter(`오늘의 타로: ${c.name} (${rev ? '역방향' : '정방향'}) — ${rev ? c.rev : c.up}`);
      animateResult();
    }, 800);
  });
}

// ---------- 별 배경 ----------
function stars() {
  const cv = $('#stars'), cx = cv.getContext('2d');
  let W, H, list;
  const resize = () => {
    W = cv.width = innerWidth * devicePixelRatio; H = cv.height = innerHeight * devicePixelRatio;
    cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
    list = Array.from({ length: Math.round(innerWidth * innerHeight / 5000) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 1.3 + 0.3) * devicePixelRatio, p: Math.random() * 6.28, s: Math.random() * 0.02 + 0.005 }));
  };
  resize(); addEventListener('resize', resize);
  const loop = () => {
    cx.clearRect(0, 0, W, H);
    for (const s of list) {
      s.p += s.s;
      cx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(s.p));
      cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(s.x, s.y, s.r, 0, 6.28); cx.fill();
    }
    requestAnimationFrame(loop);
  };
  loop();
}

history.replaceState({ s: 'home' }, '');
stars();
renderHome();
Ads.init();
