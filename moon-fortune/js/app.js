// 화면 흐름: 홈 → (프로필) → 광고 관문 → 광고 → 결과
const $ = s => document.querySelector(s);
const Store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
};
const makePersonId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const legacyProfile = Store.get('mf_profile');
let profiles = Store.get('mf_profiles');
if (!Array.isArray(profiles)) profiles = legacyProfile ? [{ ...legacyProfile, id: legacyProfile.id || makePersonId() }] : [];
profiles = profiles.slice(0, 8).map(p => ({ ...p, id: p.id || makePersonId(), loc: p.loc || 'seoul' }));
let activeProfileId = Store.get('mf_active_profile');
let profile = profiles.find(p => p.id === activeProfileId) || profiles[0] || null;
if (profile) activeProfileId = profile.id;
let partner = Store.get('mf_partner');

function persistProfiles() {
  Store.set('mf_profiles', profiles);
  Store.set('mf_active_profile', activeProfileId);
  if (profile) Store.set('mf_profile', profile); // 예전 저장 형식과도 호환
}
persistProfiles();

function today() { const t = new Date(); return [t.getFullYear(), t.getMonth() + 1, t.getDate()]; }
function dayKey() { return today().join('-'); }
// false = 모든 운세를 볼 때마다 광고 1편. true = 오늘의 운세·별자리·타로 한 장 상시 무료 + 나머지 하루 첫 1회 무료
const FREE_PERKS = false;
// false = 한국어만 (외국어는 결과 해설이 아직 요약뿐이라 숨김)
const MULTI_LANG = false;
function hasDailyFreeView() { return FREE_PERKS && Store.get('mf_free_day') !== dayKey(); }
const ALWAYS_FREE = new Set(FREE_PERKS ? ['daily', 'zodiac', 'tarot'] : []);
let tarotPaid = false; // 관문에서 광고를 본 직후의 타로 1회

const MENU_DEF = [
  { id: 'daily', ic: '☀️', build: p => buildDaily(p, today()) },
  { id: 'weekly', ic: '📅', build: p => buildWeekly(p, today()) },
  { id: 'monthly', ic: '🌙', build: p => buildMonthly(p, today()) },
  { id: 'saju', ic: '🔮', build: p => buildSaju(p, today()) },
  { id: 'zodiac', ic: '✨', build: p => buildZodiac(p, today()) },
  { id: 'compat', ic: '💞', build: p => buildCompat(p, partner) },
  { id: 'tarot', ic: '🃏' },
];
const localizedItem = x => { const [nm, ds] = menuText(x.id, { y: yearTarget(today()) }); return { ...x, nm, ds }; };
const menuItems = () => MENU_DEF.map(localizedItem);
const YEAR_ITEM = () => localizedItem({ id: 'yearly', ic: '🎆', build: p => buildYearly(p, today()) });
const findItem = id => id === 'yearly' ? YEAR_ITEM() : menuItems().find(m => m.id === id);

function applyStaticI18n() {
  const L = lang(), U = L.ui;
  document.title = L.app[0];
  $('#appName').textContent = L.app[0]; $('#appTagline').textContent = L.app[1]; $('#appFoot').textContent = L.app[2];
  $('#backBtn').setAttribute('aria-label', U.back); $('#langSelect').setAttribute('aria-label', U.language);
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = U[el.dataset.i18n] || el.textContent; });
  $('#pfName').placeholder = U.nameHint; $('#profileLimit').textContent = U.max8;
  $('#adTag').textContent = U.adTag; $('#adHere').textContent = U.adHere; $('#adNative').textContent = U.adNative;
}

$('#langSelect').innerHTML = Object.entries(LANGUAGE_META).map(([code, x]) => `<option value="${code}">${x[0]}</option>`).join('');
$('#langSelect').value = locale;
$('#langSelect').onchange = e => {
  setLocale(e.target.value); applyStaticI18n();
  history.replaceState({ s: 'home' }, ''); renderHome();
};
if (!MULTI_LANG) { setLocale('ko'); $('#langSelect').style.display = 'none'; }
applyStaticI18n();

// ---------- 화면 전환 ----------
let renderSeq = 0; // 화면이 바뀌면 늦게 끝난 이전 결과 렌더링을 버린다
function show(id, title) {
  renderSeq++;
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
  const U = lang().ui, T = terms();
  const [y, m, d] = today();
  const gz = dayPillar(y, m, d);
  let tags = '';
  if (profile) {
    const s = computeSaju(profile);
    const z = ZODIAC[zodiacOf(profile.m, profile.d)];
    tags = `<div class="tags"><span>${ANIMAL_EMOJI[s.animal]} ${T.animals[s.animal]}</span><span>${z.sym} ${T.zodiac[zodiacOf(profile.m, profile.d)]}</span><span>${DAY_MASTER[s.me].icon} ${T.masters[s.me]}</span></div>`;
    $('#profileChip').textContent = `👤 ${profile.name}`;
  }
  $('#todayCard').innerHTML = `<div class="d">${localDate(y, m, d)} · ${U.todayPillar}</div>
    <div class="g serif">${gz.han} <span style="font-size:14px;color:var(--muted)">(${T.elements[STEM_EL[gz.s]]})</span></div>
    <div class="d" style="margin-top:4px">${profile ? fmt(U.check, { name: esc(profile.name) }) : U.addBirth}</div>${tags}`;
  const items = [YEAR_ITEM(), ...menuItems()];
  $('#grid').innerHTML = items.map(it => `<button class="tile ${it.id === 'yearly' ? 'wide' : ''}" data-id="${it.id}">
      <span class="ad">${ALWAYS_FREE.has(it.id) ? U.free : hasDailyFreeView() ? U.dailyFree : U.ad}</span><div class="ic">${it.ic}</div><div><div class="nm">${it.nm}</div><div class="ds">${it.ds}</div></div></button>`).join('');
  $('#grid').querySelectorAll('.tile').forEach(b => b.onclick = () => openItem(b.dataset.id));
}
$('#profileChip').onclick = () => openProfiles();

function openItem(id) {
  if (!profile) { openProfile(id); return; }
  if (ALWAYS_FREE.has(id)) {
    const it = findItem(id);
    history.pushState({ s: 'result' }, '');
    show('result', it.nm);
    if (id === 'tarot') renderTarot(); else renderResult(it);
    return;
  }
  openGate(id);
}

// ---------- 프로필 ----------
let afterProfile = null;
let editingProfileId = null;
function openProfile(nextId = null, personId = null) {
  afterProfile = nextId || null;
  editingProfileId = personId;
  const p = profiles.find(x => x.id === personId) || { name: '', gender: 'f', y: 1995, m: 1, d: 1, hour: null, min: 0, loc: 'seoul' };
  $('#pfName').value = p.name;
  birthPicker($('#pfBirth'), p);
  $('#pfNoTime').checked = p.hour === null;
  $('#pfTime').value = p.hour === null ? '12:00' : `${String(p.hour).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`;
  $('#pfTime').disabled = p.hour === null;
  $('#pfPlace').innerHTML = Object.keys(BIRTH_PLACES).map(k => `<option value="${k}">${birthPlaceName(k)}</option>`).join('');
  $('#pfPlace').value = p.loc && BIRTH_PLACES[p.loc] ? p.loc : 'seoul';
  setSeg('#pfGender', p.gender);
  go('profile', personId ? lang().ui.editInfo : lang().ui.addPerson);
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
const pickerUnit = unit => ['ko', 'ja', 'zh'].includes(locale) ? unit : '';
function birthPicker(el, v) {
  const U = lang().ui;
  const cal = v.cal === 'lunar' ? 'lunar' : 'solar';
  const cur = cal === 'lunar' ? [v.ly, v.lm, v.ld] : [v.y, v.m, v.d];
  el.innerHTML = `<div class="seg cal" aria-label="${U.calendar}"><button data-v="solar">${U.solar}</button><button data-v="lunar">${U.lunar}</button></div>
    <div class="ymd"><select class="by" aria-label="${U.birth} ${U.year}">${opts(1920, new Date().getFullYear(), cur[0], pickerUnit(U.year))}</select>
      <select class="bm" aria-label="${U.birth} ${U.month}">${opts(1, 12, cur[1], pickerUnit(U.month))}</select><select class="bd" aria-label="${U.birth} ${U.day}"></select></div>
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
    q('.bd').innerHTML = opts(1, max, day, pickerUnit(U.day));
    const lm = lunar ? leapMonthOf(y) : 0;
    q('.leap').style.display = lunar && lm === m ? 'flex' : 'none';
    q('.leap span').textContent = fmt(U.leap, { m });
    if (!(lunar && lm === m)) q('.bl').checked = false;
    const r = readBirth(el);
    const l = !lunar && !r.error ? solarToLunar(r.y, r.m, r.d) : null;
    q('.conv').textContent = r.error ? '⚠️ ' + r.error
      : lunar ? `→ ${U.solar} ${localDate(r.y, r.m, r.d, false)}` : l ? `→ ${U.lunar} ${l.y} ${U.year} ${l.leap ? fmt(U.leap, { m: l.m }) : `${l.m}${U.month}`} ${l.d}${U.day}` : '';
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

function readPerson(nameEl, birthEl, timeEl, noTimeEl, genderSel, placeEl = null) {
  const U = lang().ui;
  const name = nameEl.value.trim();
  if (!name) { toast(U.requiredName); return null; }
  const b = readBirth(birthEl);
  if (b.error) { toast(b.error); return null; }
  const t = new Date();
  if (b.y * 10000 + b.m * 100 + b.d > t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate()) { toast(U.futureDate); return null; }
  let hour = null, min = 0;
  if (timeEl && !noTimeEl.checked && timeEl.value) [hour, min] = timeEl.value.split(':').map(Number);
  const loc = placeEl && BIRTH_PLACES[placeEl.value] ? placeEl.value : 'seoul';
  return { name: name.slice(0, 12), gender: segVal(genderSel) || 'f', ...b, hour, min, loc };
}
$('#pfSave').onclick = () => {
  const p = readPerson($('#pfName'), $('#pfBirth'), $('#pfTime'), $('#pfNoTime'), '#pfGender', $('#pfPlace'));
  if (!p) return;
  if (editingProfileId) {
    const i = profiles.findIndex(x => x.id === editingProfileId);
    p.id = editingProfileId;
    if (i >= 0) profiles[i] = p; else profiles.push(p);
  } else {
    if (profiles.length >= 8) { toast(lang().ui.limit); return; }
    p.id = makePersonId();
    profiles.push(p);
  }
  profile = p; activeProfileId = p.id; persistProfiles();
  toast(fmt(lang().ui.saved, { name: p.name }));
  if (afterProfile) {
    history.replaceState({ s: 'home' }, '');
    if (ALWAYS_FREE.has(afterProfile)) {
      const it = findItem(afterProfile);
      history.pushState({ s: 'result' }, ''); show('result', it.nm);
      if (afterProfile === 'tarot') renderTarot(); else renderResult(it);
    } else openGateReplace(afterProfile);
  }
  else history.back();
};

function openProfiles() {
  go('profiles', lang().ui.selectPerson);
  renderProfileList();
}
function renderProfileList() {
  const U = lang().ui, T = terms();
  $('#profileList').innerHTML = profiles.map(p => {
    const s = computeSaju(p), z = ZODIAC[zodiacOf(p.m, p.d)];
    return `<div class="person-card ${p.id === activeProfileId ? 'active' : ''}" data-id="${p.id}">
      <div class="person-avatar">${ANIMAL_EMOJI[s.animal]}</div>
      <div class="person-info"><b>${esc(p.name)} ${p.id === activeProfileId ? `<span class="tagline" style="display:inline-block;margin:0 0 0 5px">${U.selected}</span>` : ''}</b>
        <span>${localDate(p.y, p.m, p.d, false)} · ${z.sym} ${T.zodiac[zodiacOf(p.m, p.d)]} · ${T.masters[s.me]}</span></div>
      <div class="person-actions"><button class="use">${p.id === activeProfileId ? U.using : U.select}</button><button class="edit">${U.edit}</button>${profiles.length > 1 ? `<button class="del">${U.del}</button>` : ''}</div></div>`;
  }).join('');
  $('#profileList').querySelectorAll('.person-card').forEach(card => {
    const id = card.dataset.id;
    card.querySelector('.use').onclick = () => {
      profile = profiles.find(p => p.id === id); activeProfileId = id; persistProfiles();
      toast(fmt(U.switched, { name: profile.name })); history.back();
    };
    card.querySelector('.edit').onclick = () => openProfile(null, id);
    const del = card.querySelector('.del');
    if (del) del.onclick = () => {
      const target = profiles.find(p => p.id === id);
      if (!confirm(fmt(U.deleteAsk, { name: target.name }))) return;
      profiles = profiles.filter(p => p.id !== id);
      if (activeProfileId === id) { profile = profiles[0]; activeProfileId = profile.id; }
      persistProfiles(); renderProfileList();
    };
  });
}
$('#addProfile').onclick = () => {
  if (profiles.length >= 8) { toast(lang().ui.limit); return; }
  openProfile();
};

// ---------- 광고 관문 ----------
function openGateReplace(id) { history.replaceState({ s: 'gate' }, ''); renderGate(id); }
function openGate(id) { history.pushState({ s: 'gate' }, ''); renderGate(id); }
async function requestPremiumAccess(btn) {
  const free = hasDailyFreeView();
  if (btn) btn.disabled = true;
  const ok = free ? true : await Ads.showRewarded();
  if (btn) btn.disabled = false;
  if (!ok) { toast(lang().ui.adNeed); return false; }
  if (free) Store.set('mf_free_day', dayKey());
  return true;
}
function renderGate(id) {
  const it = findItem(id);
  const U = lang().ui;
  show('gate', it.nm);
  const isCompat = id === 'compat';
  const q = partner || { name: '', y: 1995, m: 1, d: 1 };
  const free = hasDailyFreeView();
  $('#gate').innerHTML = `<div class="big">${it.ic}</div>
    <h2 class="serif">${esc(profile.name)} · ${it.nm}</h2><p>${it.ds}</p>
    ${isCompat ? `<div class="form" style="text-align:left;margin-bottom:14px">
        <label>${U.partnerName}</label><input id="ptName" maxlength="12" placeholder="${U.nameHint}" value="${esc(q.name)}">
        <label>${U.partnerBirth}</label><div id="ptBirth"></div>
        <label>${U.partnerGender}</label><div class="seg" id="ptGender"><button data-v="f">${U.female}</button><button data-v="m">${U.male}</button></div></div>`
      : `<div class="teaser"><div class="bar" style="width:60%"></div><div class="bar"></div><div class="bar" style="width:85%"></div><div class="bar" style="width:70%"></div><div class="bar" style="width:92%"></div>
        <div class="lock"><b>🔒</b>${U.prepared}</div></div>`}
    <button class="btn" id="watchBtn">${free ? U.freeResult : U.adResult}<span class="sub">${free ? U.freeSub : U.adSub}</span></button>
    <p class="hint" style="margin-top:12px">${U.disclaimer}</p>`;
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
    const btn = $('#watchBtn');
    if (!await requestPremiumAccess(btn)) return;
    history.replaceState({ s: 'result' }, '');
    if (id === 'tarot') { tarotPaid = true; renderTarot(); } else renderResult(it);
  };
}

// ---------- 결과 ----------
function loadingThen(fn) {
  show('result', $('#topTitle').textContent);
  $('#result').innerHTML = `<div class="loading"><div class="orb">🌕</div><p class="serif" style="color:var(--gold);font-size:17px">${lang().ui.loading}</p></div>`;
  const seq = renderSeq;
  setTimeout(() => { if (seq === renderSeq) fn(); }, 1100);
}
function renderResult(it) {
  loadingThen(() => {
    const source = it.build(profile);
    const res = localizedResult(it.id, profile, partner, source);
    $('#result').innerHTML = res.html + resultFooter();
    bindFooter(res.share);
    animateResult();
  });
}
function resultFooter() {
  return `<button class="btn" id="shareBtn">${lang().ui.share}</button><button class="btn ghost" id="homeBtn">${lang().ui.home}</button>`;
}
function bindFooter(text) {
  $('#homeBtn').onclick = () => history.back();
  $('#shareBtn').onclick = async () => {
    const msg = `🐰 ${lang().app[0]}\n${text}\n#MoonRabbitFortune`;
    try {
      if (navigator.share) { await navigator.share({ title: lang().app[0], text: msg }); return; }
      await navigator.clipboard.writeText(msg); toast(lang().ui.copied);
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
const TAROT_MODES = {
  daily: { icon: '🌙' }, timeline: { icon: '🕰️' }, love: { icon: '💗' }, work: { icon: '💼' },
};
function tarotMode(key) { const [name, desc, positions] = lang().tarot.modes[key]; return { ...TAROT_MODES[key], name, desc, positions }; }

function renderTarot() {
  const U = lang().ui, R = lang().tarot;
  show('result', menuText('tarot')[0]);
  $('#result').innerHTML = `<div class="res-head"><div class="lbl">${fmt(R.label, { name: esc(profile.name) })}</div><h2 class="serif">${R.question}</h2></div>
    <div class="tarot-modes">${Object.entries(TAROT_MODES).map(([k, base]) => { const m = tarotMode(k); return `<button class="tarot-mode" data-mode="${k}"><span style="font-size:28px">${base.icon}</span><b>${m.name}</b><span>${m.desc}</span>${tarotPaid ? '' : `<span class="tagline" style="margin-top:6px">${FREE_PERKS && k === 'daily' ? U.free : hasDailyFreeView() ? U.todayFree : U.adOpen}</span>`}</button>`; }).join('')}</div>
    <div class="card calc-note"><h3>🃏 ${R.guide}</h3><p>${R.guideText}</p></div>`;
  document.querySelectorAll('.tarot-mode').forEach(b => b.onclick = async () => {
    const needAd = !(FREE_PERKS && b.dataset.mode === 'daily') && !tarotPaid;
    if (needAd && !await requestPremiumAccess(b)) return;
    tarotPaid = false;
    startTarotReading(b.dataset.mode);
  });
}

function tarotDraw(modeKey, count) {
  const r = rngFor('tarot', profile.id || profileKey(profile), profileKey(profile), dayKey(), modeKey);
  const ids = TAROT_DECK.map((_, i) => i);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, count).map(i => ({ card: TAROT_DECK[i], rev: r() < .3 }));
}

function tarotCardButton(reading, slot) {
  const c = reading.card;
  return `<button class="tcard" data-slot="${slot}" aria-label="${fmt(lang().tarot.cardAria, { n: slot + 1 })}"><span class="bk" aria-hidden="true">🌙</span><span class="f" aria-hidden="true"><span class="no">${c.n}</span><span class="ic">${c.icon}</span><span class="nm">${tarotCardName(c)}</span></span></button>`;
}

function startTarotReading(modeKey) {
  const mode = tarotMode(modeKey), single = mode.positions.length === 1;
  const readings = tarotDraw(modeKey, single ? 3 : 3);
  $('#result').innerHTML = `<div class="res-head"><div class="lbl">${mode.icon} ${mode.name}</div><h2 class="serif">${single ? lang().tarot.pickOne : lang().tarot.pickAll}</h2></div>
    <div class="tarot-pick">${readings.map((x, i) => tarotCardButton(x, i)).join('')}</div>
    ${single ? '' : `<div class="tarot-spread-labels">${mode.positions.map(x => `<span>${x}</span>`).join('')}</div>`}<div id="tarotOut"></div>`;
  document.querySelectorAll('.tcard').forEach(el => el.onclick = () => {
    if (el.classList.contains('flip') || (single && document.querySelector('.tcard.flip'))) return;
    const i = +el.dataset.slot, reading = readings[i];
    el.classList.add('flip'); if (reading.rev) el.classList.add('rev');
    el.setAttribute('aria-label', `${tarotCardName(reading.card)}, ${reading.rev ? lang().tarot.reversed : lang().tarot.upright}`);
    if (single) document.querySelectorAll('.tcard').forEach(o => o !== el && o.classList.add('dim'));
    const picked = single ? [{ ...reading, position: mode.positions[0] }] : readings.map((x, n) => ({ ...x, position: mode.positions[n] }));
    if (single || document.querySelectorAll('.tcard.flip').length === readings.length) setTimeout(() => showTarotResult(modeKey, single ? picked : picked), 650);
  });
}

function showTarotResult(modeKey, readings) {
  const mode = tarotMode(modeKey);
  const s = computeSaju(profile), gz = dayPillar(...today());
  const rel = relation(s.meEl, STEM_EL[gz.s]);
  const bridge = locale === 'ko' ? {
    in: '오늘은 도움을 받고 배우는 기운이 강하니 카드의 조언을 천천히 흡수해 보세요.',
    bi: '오늘은 내 의지가 강한 날이라 카드가 가리키는 우선순위를 분명히 정하는 게 좋아요.',
    sik: '오늘은 표현과 실행의 기운이 살아 있어 카드의 메시지를 작은 행동으로 옮기기 좋아요.',
    jae: '오늘은 현실적인 결과를 챙기는 흐름이라 시간·돈·약속을 구체적으로 점검해 보세요.',
    gwan: '오늘은 책임과 기준이 강조되니 서두르기보다 원칙을 확인하는 편이 안전해요.',
  }[rel] : tarotBridge(rel);
  const cards = readings.map(({ card: c, rev, position }) => { const tx = tarotCardText(c, rev); return `<div class="card"><span class="tagline">${position} · ${rev ? `${lang().tarot.reversed} 🔄` : `${lang().tarot.upright} ⬆️`}</span>
    <h3>${c.icon} ${tarotCardName(c)}</h3><p><b>${tx.keyword}</b></p><p>${tx.message}</p></div>`; }).join('');
  const keywords = readings.map(x => tarotCardText(x.card, x.rev).keyword).join(' · ');
  $('#tarotOut').innerHTML = `${cards}<div class="card calc-note"><h3>☯️ ${lang().tarot.sajuLink}</h3><p>${esc(profile.name)}: <b>${terms().masters[s.me]}</b> · <b>${gz.han}</b>. ${bridge}</p></div>
    <div class="card advice">${fmt(lang().tarot.keyword, { mode: mode.name })} — ${keywords}</div>
    <button class="btn ghost" id="tarotAgain">${lang().ui.anotherTarot}</button>${resultFooter()}`;
  const share = `${profile.name} · ${mode.name}: ${readings.map(x => `${tarotCardName(x.card)} (${x.rev ? lang().tarot.reversed : lang().tarot.upright})`).join(', ')}`;
  bindFooter(share);
  $('#tarotAgain').onclick = renderTarot;
  animateResult();
}

// ---------- 별 배경 ----------
function stars() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
