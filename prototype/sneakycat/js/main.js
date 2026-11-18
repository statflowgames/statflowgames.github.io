// 화면 흐름, 입력, 저장, 메인 루프
import { LEVELS, CHAPTERS, SKINS, HARD_FROM, TUTORIAL } from './levels.js?v=1118013716';
import { Game } from './game.js?v=1118013716';
import { Renderer } from './render.js?v=1118013716';
import { drawCat, drawFish, drawBonus, ell } from './art.js?v=1118013716';
import { Sound } from './audio.js?v=1118013716';
import { loadAll, IMG, spriteURL, resetSprites } from './assets.js?v=1118013716';
import { actIcon, buttonHTML } from './icons.js?v=1118013716';
import { SLOTS, GEAR, gearById, slotById, perksOf, gearIcon, BONE, EARN } from './gear.js?v=1118013716';
import { startDen } from './den.js?v=1118013716';
import { initLang, setLang, getLang, LANGS, LANG_NAMES, t, tAct, tr, tf, fontStack } from './i18n.js?v=1118013716';
import { TIERS, BOX, PIECES_FOR_SKIN, condText, condOk, today, makeQuests, rerollOne } from './quests.js?v=1118013716';
import { Reward } from './reward.js?v=1118013716';
import { Ads } from './ads.js?v=1118013716';
import { inLevel, newInLevel, inChapter, newInChapter, firstOfChapter, guideIcon, entry } from './guide.js?v=1118013716';

const $ = (s) => document.querySelector(s);
const app = $('#app'), cv = $('#cv'), layer = $('#layer');
const R = new Renderer(cv);

// ───────── 저장 ─────────
const KEY = 'sneakycat.claude.v1';
let save = { stars: {}, best: {}, skin: 'gray', sound: true, music: true, vib: true, lefty: false, seenCh: {}, ending: false };
try { Object.assign(save, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* 저장소 없음 */ }
let wiping = false;
const store = () => { if (wiping) return; try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* 무시 */ } };
const starsOf = (id) => save.stars[id] || [false, false, false];
const totalStars = () => LEVELS.reduce((n, l) => n + starsOf(l.id).filter(Boolean).length, 0);
const cleared = (id) => !!save.stars[id];
const skipped = (id) => !!(save.skipped && save.skipped[id]);
const unlocked = (i) => i === 0 || cleared(LEVELS[i - 1].id) || skipped(LEVELS[i - 1].id) || cleared(LEVELS[i].id);
const skinById = (id) => SKINS.find((s) => s.id === id) || SKINS[0];
const skinOpen = (s, ts = totalStars()) => (s.ending ? !!save.ending : s.quest ? (save.pieces || 0) >= s.quest : ts >= s.need);
// 옷장 장비 + 생선뼈. 장비가 생기기 전 기록이 있으면 그만큼 생선뼈를 한 번 챙겨 준다
if (!save.gear) save.gear = { owned: {}, on: {} };
if (save.bones == null) {
  save.bones = LEVELS.filter((l) => cleared(l.id)).length * EARN.first + totalStars() * EARN.star;
  store();
}
const wearOn = () => save.gear.on;
const langReady = initLang(save.lang);
Sound.setSound(save.sound);
Sound.setMusic(save.music);
const vib = (p) => { if (save.vib && navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) try { navigator.vibrate(p); } catch { /* 무시 */ } };

// ───────── 아이콘 (코드로 그린 그림을 이미지로) ─────────
function icon(w, h, fn) {
  const c = document.createElement('canvas');
  c.width = w * 2; c.height = h * 2;
  const x = c.getContext('2d'); x.scale(2, 2); fn(x);
  return c.toDataURL();
}
const ICON = {
  fish: icon(30, 30, (c) => drawFish(c, 15, 15, 1.05, false)),
  gold: icon(30, 30, (c) => drawFish(c, 15, 15, 1.05, true)),
};
for (const ch of CHAPTERS) ICON[ch.bonus] = icon(30, 30, (c) => { c.translate(15, 22); drawBonus(c, ch.bonus, 0); });
const skinIcon = (s) => icon(70, 56, (c) => { c.translate(31, 50); c.scale(1.7, 1.7); drawCat(c, { skin: s, t: 0.5, face: 1, fish: false }); });

// ───────── 상태 ─────────
let scene = 'title';
let game = null, levelIdx = 0, paused = false, ended = false, looking = false;
const tutOn = () => !!(game && game.L.tutorial);
let titleT = 0;

function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  // 가로 화면(PC)은 넓게 쓰고 버튼을 지도 옆에 둔다. 세로 화면은 위아래를 꽉 채운다.
  const land = vw > vh * 0.95;
  const w = land ? vw : Math.min(vw, Math.round(vh * 0.66));
  app.style.width = w + 'px';
  app.classList.toggle('land', land);
  // 아래 버튼 줄(--band 92px) 만큼은 맵을 비워 둔다
  // 세로로 짧은 화면(작은 폰·브라우저 주소줄)은 위아래 줄을 얇게
  const compact = !land && vh < 720;
  app.classList.toggle('compact', compact);
  R.top = (compact ? 54 : 66) + (tutOn() ? (compact ? 50 : 58) : 0); R.bottom = compact ? 80 : 98;
  // 가로 화면은 양옆 정보판 자리를 비우고 맵을 높이보다 1.3배 크게,
  // 세로 화면은 맵을 가로 폭에 맞추고 위아래가 넘치면 카메라가 고양이를 따라간다
  R.side = land ? Math.min(440, Math.max(0, (w - vh * 0.75) / 2)) : 0;
  R.overW = land ? 1 : 1.3; R.overH = land ? 1.3 : 1.5;
  app.classList.toggle('lefty', !!save.lefty);
  R.resize(w, vh);
  placeSides();
}
window.addEventListener('resize', () => { resize(); if (scene === 'title') fitLogo(); if (game) fitHudTitle(); });
resize();

// ───────── 입력 ─────────
const joy = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0, mag: 0, run: false, R: 58, runAt: 0.68 };
const keys = new Set();
cv.addEventListener('pointerdown', (e) => {
  Sound.unlock();
  if (scene !== 'game' || paused || looking || !game || game.state !== 'play') return;
  if (joy.active) return;
  const r = cv.getBoundingClientRect();
  joy.active = true; joy.id = e.pointerId;
  joy.ox = e.clientX - r.left; joy.oy = e.clientY - r.top;
  joy.dx = joy.dy = joy.mag = 0; joy.run = false;
  try { cv.setPointerCapture(e.pointerId); } catch { /* 무시 */ }
});
cv.addEventListener('pointermove', (e) => {
  if (!joy.active || e.pointerId !== joy.id) return;
  const r = cv.getBoundingClientRect();
  const x = e.clientX - r.left - joy.ox, y = e.clientY - r.top - joy.oy;
  const d = Math.hypot(x, y);
  if (d > joy.R * 1.25) { joy.ox += (x / d) * (d - joy.R * 1.25); joy.oy += (y / d) * (d - joy.R * 1.25); }
  joy.mag = Math.min(1, d / joy.R);
  joy.dx = d > 0 ? x / d : 0; joy.dy = d > 0 ? y / d : 0;
  joy.run = joy.mag > joy.runAt;
});
const endJoy = (e) => { if (e.pointerId === joy.id) { joy.active = false; joy.mag = 0; joy.run = false; } };
cv.addEventListener('pointerup', endJoy);
cv.addEventListener('pointercancel', endJoy);
window.addEventListener('keydown', (e) => {
  Sound.unlock();
  keys.add(e.code);
  if (scene !== 'game' || !game) return;
  if (e.code === 'Tab') { e.preventDefault(); if (!e.repeat) setLook(true); return; }
  if (e.code === 'Escape' || e.code === 'KeyP') { paused ? resumeGame() : pauseGame(); }
  if (paused) return;
  if (game.state === 'intro' && (e.code === 'Space' || e.code === 'Enter')) { startPlay(); e.preventDefault(); return; }
  if (e.code === 'Space' || e.code === 'KeyE') { doAct(); e.preventDefault(); }
  if (e.code === 'KeyQ' || e.code === 'KeyM') doMeow();
  if (e.code === 'KeyR' && ended) startLevel(levelIdx);
});
window.addEventListener('keyup', (e) => { keys.delete(e.code); if (e.code === 'Tab') setLook(false); });
window.addEventListener('blur', () => { keys.clear(); joy.active = false; joy.mag = 0; setLook(false); });

function readInput() {
  let kx = 0, ky = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) kx -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) kx += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) ky -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) ky += 1;
  if (kx || ky) {
    const d = Math.hypot(kx, ky);
    return { dx: kx / d, dy: ky / d, mag: 1, run: keys.has('ShiftLeft') || keys.has('ShiftRight') };
  }
  if (joy.active) return { dx: joy.dx, dy: joy.dy, mag: joy.mag, run: joy.run };
  return { dx: 0, dy: 0, mag: 0, run: false };
}

$('#bAct').addEventListener('pointerdown', (e) => { e.preventDefault(); doAct(); });
$('#bMeow').addEventListener('pointerdown', (e) => { e.preventDefault(); doMeow(); });
$('#bPause').addEventListener('click', () => { Sound.play('click'); pauseGame(); });
// 둘러보기: 누르고 있는 동안 게임을 멈추고 맵 전체를 보여 줌
const bLook = $('#bLook');
bLook.addEventListener('pointerdown', (e) => { e.preventDefault(); try { bLook.setPointerCapture(e.pointerId); } catch { /* 무시 */ } setLook(true); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) bLook.addEventListener(ev, () => setLook(false));
// 길게 누르면 휴대폰이 그림 저장·복사 메뉴를 띄우지 않게: 버튼 영역의 길게 누르기·끌기 기본 동작을 모두 막는다
for (const ev of ['contextmenu', 'dragstart', 'selectstart']) $('#ctrl').addEventListener(ev, (e) => e.preventDefault());
bLook.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
function setLook(v) {
  v = !!v && !!game && scene === 'game' && !paused && !ended && game.state === 'play';
  if (v === looking) return;
  looking = v;
  joy.active = false; joy.mag = 0; joy.run = false;
  app.classList.toggle('looking', v);
  R.setPeek(v); placeSides();
  if (v) { vib(10); Sound.play('peek'); }
}
function doAct() { if (game && !paused && game.state === 'play') game.doAction(); }
function doMeow() { if (game && !paused && game.meow()) vib(15); }

// ───────── 토스트 ─────────
let toastT = null;
// 전면 광고: 1장이 아닌 판을 2번 끝낼 때마다, 결과 화면에서 다음으로 넘어갈 때 (2분 간격은 ads.js)
let adStages = 0;
function atBreak(go) {
  if (adStages >= 2 && Ads.canInterstitial()) { adStages = 0; Ads.interstitial().finally(go); }
  else go();
}
function toast(msg, ms = 2200) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms);
}
Reward.toast = (m) => toast(m, 2600);

// ───────── 화면들 ─────────
function show(html, cls = '') {
  layer.innerHTML = `<div class="scr ${cls}">${html}</div>`;
  return layer.firstElementChild;
}
function hideLayer() { layer.innerHTML = ''; }
function setHud(on) { for (const id of ['#hud', '#ctrl', '#sideL', '#sideR']) $(id).classList.toggle('off', !on); $('#coach').classList.toggle('off', !on || !tutOn()); if (on) fitHudTitle(); }
// 스테이지 이름이 한 줄에 안 들어가면(긴 번역) 작은 글씨 두 줄로
function fitHudTitle() {
  const el = $('#lvTitle');
  el.classList.remove('two');
  if (el.scrollWidth > el.clientWidth + 1) el.classList.add('two');
}
const on = (el, sel, fn) => el.querySelectorAll(sel).forEach((b) => b.addEventListener('click', (e) => { Sound.unlock(); Sound.play('click'); fn(e, b); }));

function titleScreen() {
  scene = 'title'; game = null; setHud(false);
  const el = show(`
    <div class="logo"><span class="lname">${t('title.name')}</span><small>${t('title.sub')}</small></div>
    <div class="tbtns">
      <button class="btn main" data-a="play">${totalStars() ? t('title.continue') : t('title.start')}</button>
      <button class="btn pink" data-a="skin">${t('title.ward')}</button>
      <button class="btn den" data-a="den">${t('title.den')}</button>
      ${questsOpen() ? `<button class="btn quest" data-a="quest">📜 ${tr('오늘의 의뢰')} <small>${questDone()}/3</small></button>` : ''}
      <div class="toggles"><button class="tg on setbtn" data-a="settings">⚙️ ${t('title.settings')}</button></div>
      <div class="credit">StatFlow Games</div>
    </div>`, 'center title');
  // 처음 설치해서 아무것도 안 깼으면 튜토리얼부터
  on(el, '[data-a=play]', () => (!save.tut && !LEVELS.some((l) => cleared(l.id) || skipped(l.id)) ? startLevel(-1) : levelScreen()));
  on(el, '[data-a=skin]', () => skinScreen());
  on(el, '[data-a=den]', () => denScreen());
  on(el, '[data-a=quest]', () => questScreen());
  on(el, '[data-a=settings]', () => settingsScreen());
  fitLogo();
  if (document.fonts) document.fonts.ready.then(fitLogo);
}
// 언어마다 게임 이름 길이가 달라서(Schleichkatze, こっそりニャン…) 화면 폭에 맞춰 글자를 줄인다.
// 한 줄을 우선하고, 너무 작아지면 띄어쓰기가 있는 이름만 두 줄로 나눈다.
const titleLay = { btn: 0, logo: 0 };
function fitLogo() {
  const nm = layer.querySelector('.logo .lname');
  if (!nm) return;
  fitLogoSize(nm);
  // 배경 그림 위치를 정하려고 제목 아래끝·버튼 윗끝을 기억해 둔다
  const lg = nm.parentElement, tb = layer.querySelector('.tbtns');
  titleLay.logo = lg.offsetTop + lg.offsetHeight;
  titleLay.btn = tb ? tb.offsetTop : 0;
}
function fitLogoSize(nm) {
  const lg = nm.parentElement, avail = lg.parentElement.clientWidth - 40;
  const base = parseFloat(getComputedStyle(lg).fontSize);
  nm.style.fontSize = ''; nm.style.whiteSpace = ''; nm.style.maxWidth = '';
  const w = nm.scrollWidth;
  if (w <= avail) return;
  let fs = Math.floor(base * avail / w);
  if (fs < base * 0.72 && /\s/.test(nm.textContent.trim())) {
    nm.style.whiteSpace = 'normal'; nm.style.maxWidth = avail + 'px'; fs = base;
  }
  nm.style.fontSize = fs + 'px';
  while (nm.scrollWidth > avail + 1 && fs > 18) nm.style.fontSize = (fs -= 2) + 'px';
}

// ───────── 설정 ─────────
const APP_VERSION = '1.0.0';
const PRIVACY_URL = 'https://statflowgames.github.io/sneakycat/privacy.html';
const CONTACT = 'statflow.games@gmail.com';
const isApp = () => !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
// 앱에서는 바깥 주소로 넘어가면 Capacitor 가 휴대폰 브라우저(메일 앱)로 열어 준다
function openLink(url) { if (isApp()) location.href = url; else window.open(url, '_blank', 'noopener'); }
function settingsScreen() {
  scene = 'settings'; game = null; setHud(false);
  const tg = (k, label) => `<button class="tg ${save[k] ? 'on' : ''}" data-t="${k}">${label}</button>`;
  const el = show(`<div class="top"><button class="back" data-a="back">‹</button><h2>${t('set.title')}</h2></div>
    <div class="sets">
      <section><h3>${t('set.sound')}</h3><div class="toggles">${tg('sound', t('tg.sound'))}${tg('music', t('tg.music'))}${tg('vib', t('tg.vib'))}</div></section>
      <section><h3>${t('set.play')}</h3><div class="toggles">${tg('lefty', t('tg.lefty'))}</div><small>${t('set.leftyDesc')}</small></section>
      <section><h3>🌐 ${t('set.lang')}</h3><div class="toggles">${LANGS.map((l) => `<button class="tg ${getLang() === l ? 'on' : ''}" data-l="${l}">${LANG_NAMES[l]}</button>`).join('')}</div></section>
      <section><h3>${t('set.info')}</h3>
        <button class="srow" data-a="privacy">🔒 ${t('set.privacy')}<span>›</span></button>
        ${Ads.privacyRequired() ? `<button class="srow" data-a="adprivacy">🛡️ ${tr('광고 개인정보 설정')}<span>›</span></button>` : ''}
        <button class="srow" data-a="mail">✉️ ${t('set.contact')}<span>${CONTACT}</span></button>
        <div class="srow">🐾 ${t('set.maker')}<span>StatFlow Games</span></div>
        <div class="srow">ℹ️ ${t('set.version')}<span class="ver">${APP_VERSION}${isApp() ? '' : ` · ${t('set.web')}`}</span></div>
      </section>
      <section class="danger"><h3>${t('set.data')}</h3><button class="btn sm warn" data-a="reset">${t('set.reset')}</button><small>${t('set.resetDesc')}</small></section>
    </div>`, 'list');
  on(el, '[data-a=back]', () => titleScreen());
  on(el, '[data-t]', (e, b) => {
    const k = b.dataset.t; save[k] = !save[k]; store();
    b.classList.toggle('on', save[k]);
    if (k === 'sound') Sound.setSound(save.sound);
    if (k === 'music') Sound.setMusic(save.music);
    if (k === 'lefty') app.classList.toggle('lefty', save.lefty);
    if (k === 'vib' && save.vib) vib(30);
  });
  on(el, '[data-l]', (e, b) => { save.lang = b.dataset.l; setLang(save.lang).then(() => { store(); paintButtons(); settingsScreen(); }); });
  on(el, '[data-a=privacy]', () => openLink(PRIVACY_URL));
  on(el, '[data-a=adprivacy]', () => Ads.showPrivacy());
  on(el, '[data-a=mail]', () => openLink(`mailto:${CONTACT}?subject=${encodeURIComponent(tf('[몰래냥] 문의 (v{v})', { v: APP_VERSION }))}`));
  on(el, '[data-a=reset]', () => confirmReset());
  // 앱이면 실제 설치된 버전을 보여 준다
  const NA = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App;
  if (NA && isApp()) NA.getInfo().then((i) => { const v = el.querySelector('.ver'); if (v) v.textContent = `${i.version} (${i.build})`; }).catch(() => {});
}
function confirmReset() {
  // '취소'를 ‹ 버튼과 같은 data-a=back 으로 두어 안드로이드 뒤로 가기도 취소가 되게 한다
  const el = show(`<div class="card">
      <div class="big">🙀</div>
      <h1>${t('set.resetQ')}</h1>
      <p>${t('set.resetWarn')}</p>
      <button class="btn warn" data-a="wipe">${t('set.resetYes')}</button>
      <button class="btn main" data-a="back">${t('set.cancel')}</button>
    </div>`, 'center dim');
  on(el, '[data-a=back]', () => settingsScreen());
  on(el, '[data-a=wipe]', () => {
    try { localStorage.removeItem(KEY); } catch { /* 무시 */ }
    wiping = true; // 새로고침 전에 다시 저장되지 않게
    location.reload();
  });
}

// 장 제목: "1장 · 작은 집"
const chTitle = (ch) => tf('{n}장 · {name}', { n: ch.id, name: tr(ch.name) });
function levelScreen() {
  scene = 'levels'; game = null; setHud(false);
  let html = `<div class="top"><button class="back" data-a="back">‹</button><h2>${tr('스테이지')}</h2><div class="starsum">★ ${totalStars()}/${LEVELS.length * 3}</div></div>`;
  if (save.ending) html += `<button class="btn endbtn" data-a="ending">🏆 ${tr('엔딩 다시 보기')}</button>`;
  html += `<button class="tutbtn ${save.tut ? 'done' : ''}" data-a="tut"><span class="ti">🎓</span><span class="nm">${tr('튜토리얼')}<small>${tr(TUTORIAL.name)}</small></span><span class="tr">${save.tut ? '✓' : `${BONE}+${TUT_BONES}`}</span></button>`;
  let nextShown = false;
  // 지금 할 스테이지가 있는 장만 펼치고 나머지는 접어 둔다
  const nextIdx = LEVELS.findIndex((l, i) => unlocked(i) && !cleared(l.id) && !skipped(l.id));
  const openCh = nextIdx >= 0 ? LEVELS[nextIdx].ch : LEVELS[LEVELS.length - 1].ch;
  for (const ch of CHAPTERS) {
    const lv = LEVELS.map((l, i) => ({ l, i })).filter((x) => x.l.ch === ch.id);
    if (!lv.length) {
      html += `<div class="chap soon"><h3>${chTitle(ch)}<span>${tr('준비 중')}</span></h3><p>${tf('{sub} — 곧 열려요!', { sub: tr(ch.sub) })}</p></div>`;
      continue;
    }
    const got = lv.reduce((n, x) => n + starsOf(x.l.id).filter(Boolean).length, 0);
    const hard = lv.some((x) => x.l.hard);
    html += `<div class="chap ${ch.id === openCh ? '' : 'fold'}" data-ch="${ch.id}">${IMG['chapter-' + ch.id] ? `<div class="banner" style="background-image:url(img/chapter-${ch.id}.webp)"></div>` : ''}<h3 data-f="${ch.id}">${chTitle(ch)}${hard ? ' <em class="hardtag">🔥</em>' : ''}<span>★ ${got}/${lv.length * 3} <b class="fa">▾</b></span></h3><p>${tr(ch.sub)}</p><button class="gbtn" data-c="${ch.id}">${tr('등장인물 · 물건 소개')}</button><div class="lvgrid">`;
    for (const { l, i } of lv) {
      const st = starsOf(l.id), ok = unlocked(i), cl = cleared(l.id);
      const sk = !cl && skipped(l.id);
      const nx = ok && !cl && !sk && !nextShown; if (nx) nextShown = true;
      if (l.no === HARD_FROM) html += `<div class="hardline">🔥 ${tr('여기부터 고난도 — 경비가 더 빠르고 더 멀리 봐요')}</div>`;
      html += `<button class="lv ${cl ? 'clear' : ''} ${ok ? '' : 'lock'} ${nx ? 'next' : ''} ${sk ? 'skipped' : ''} ${l.hard ? 'hard' : ''}" data-i="${i}"><span class="no">${l.id}</span><span class="nm">${ok ? tr(l.name) : tr('잠겨 있음')}${sk ? `<small>${tr('건너뜀')}</small>` : ''}</span><span class="st">${st.map((s) => `<i class="${s ? 'on' : ''}">★</i>`).join('')}</span></button>`;
    }
    html += '</div></div>';
  }
  const el = show(html, 'list');
  on(el, '[data-a=back]', () => titleScreen());
  on(el, '[data-a=ending]', () => endingScreen(false));
  on(el, '[data-a=tut]', () => startLevel(-1));
  el.querySelectorAll('[data-f]').forEach((h) => h.addEventListener('click', () => { Sound.play('click'); h.parentElement.classList.toggle('fold'); }));
  on(el, '[data-c]', (e, b) => chapterScreen(+b.dataset.c, null));
  on(el, '[data-i]', (e, b) => {
    const i = +b.dataset.i;
    if (!unlocked(i)) { toast(tr('앞 스테이지를 먼저 깨야 해요')); return; }
    startLevel(i);
  });
  const nx = el.querySelector('.lv.next');
  if (nx) nx.scrollIntoView({ block: 'center' });
}

let wardTab = 'skin';
const FREE_BOX = 40;
function skinScreen(tab = wardTab) {
  wardTab = tab;
  scene = 'skins'; game = null; setHud(false);
  const ts = totalStars();
  const right = tab === 'gear' ? `<div class="starsum bones">${BONE} ${save.bones}</div>` : `<div class="starsum">★ ${ts}</div>`;
  let html = `<div class="top"><button class="back" data-a="back">‹</button><h2>${t('title.ward')}</h2>${right}</div>
    <div class="wtabs"><button class="${tab === 'skin' ? 'on' : ''}" data-t="skin">${tr('털색')}</button><button class="${tab === 'gear' ? 'on' : ''}" data-t="gear">${tr('장비')}</button></div>`;
  if (tab === 'gear') html += save.freeBox === today()
    ? `<div class="freebox done">🎁 ${tr('오늘의 무료 상자는 받았어요')}<small>${tr('내일 또 열려요')}</small></div>`
    : `<button class="freebox" data-a="box">🎁 ${tr('오늘의 무료 상자')} <b>${BONE} +${FREE_BOX}</b><small>📺 ${tr('광고 보고 열기')}</small></button>`;
  if (tab === 'gear') html += gearHTML();
  else {
    html += '<div class="skins">';
    for (const s of SKINS) {
      const ok = skinOpen(s, ts);
      html += `<button class="skin ${save.skin === s.id ? 'sel' : ''} ${ok ? '' : 'lock'}" data-s="${s.id}"><img src="${spriteURL(s.crown && IMG['sprite-cat-king'] ? 'sprite-cat-king' : 'sprite-cat', s, false, ok ? wearOn() : null) || skinIcon(s)}" alt="">${ok ? (s.crown ? '👑 ' : '') + tr(s.name) : '???'}<small>${ok ? (save.skin === s.id ? tr('입는 중') : tr('입어 보기')) : s.ending ? tr('엔딩을 보면 열려요') : s.quest ? tf('의뢰 조각 {have}/{need}', { have: save.pieces || 0, need: s.quest }) : tf('별 {n}개', { n: s.need })}</small></button>`;
    }
    html += '</div>';
  }
  const el = show(html, 'list');
  animPreview(el);
  on(el, '[data-a=back]', () => titleScreen());
  on(el, '[data-t]', (e, b) => skinScreen(b.dataset.t));
  on(el, '[data-a=box]', async (e, b) => {
    b.disabled = true;
    if (!(await Reward.show('box'))) { b.disabled = false; return; }
    save.freeBox = today(); save.bones += FREE_BOX; store();
    Sound.play('coin'); toast(tf('생선뼈 +{n}!', { n: FREE_BOX })); skinScreen('gear');
  });
  on(el, '[data-s]', (e, b) => {
    const s = skinById(b.dataset.s);
    if (!skinOpen(s, ts)) { toast(s.ending ? tr('99번째 스테이지를 깨고 엔딩을 보면 열려요') : s.quest ? tf('하루 의뢰 보너스 상자에서 조각 {n}개를 모으면 열려요', { n: s.quest }) : tf('별 {n}개를 모으면 열려요', { n: s.need })); return; }
    save.skin = s.id; store(); skinScreen();
  });
  on(el, '[data-g]', (e, b) => gearTap(b.dataset.g));
}

const pct = (sl, v) => `${sl.sign}${v}%`;
// 옷장 미리보기 고양이: 가끔 기지개·꼬리 흔들기 (입은 장비 그대로)
function animPreview(el) {
  const img = el.querySelector('.gpreview img'), sk = skinById(save.skin);
  if (!img || (sk.crown && IMG['sprite-cat-king'])) return;
  const poses = ['sprite-cat', 'sprite-cat-tail', 'sprite-cat', 'sprite-cat-stretch'].filter((n) => IMG[n]);
  if (poses.length < 2) return;
  let k = 0;
  const iv = setInterval(() => {
    if (!img.isConnected) { clearInterval(iv); return; }
    k = (k + 1) % poses.length;
    img.src = spriteURL(poses[k], sk, false, wearOn());
  }, 2400);
}
function gearHTML() {
  const sk = skinById(save.skin), on = wearOn();
  const sum = SLOTS.map((sl) => { const g = gearById(on[sl.id]); return g ? `${tr(sl.stat)} ${pct(sl, g.val)}` : null; }).filter(Boolean);
  let h = `<div class="gpreview"><img src="${spriteURL(sk.crown && IMG['sprite-cat-king'] ? 'sprite-cat-king' : 'sprite-cat', sk, false, on)}" alt="">
    <div><b>${tr('지금 효과')}</b><span>${sum.length ? sum.join('<br>') : tr('아직 입은 장비가 없어요')}</span><small>🔥 ${tr('어려움 스테이지에서는 효과가 절반이에요')}<br>${BONE} ${tf('생선뼈: 처음 깬 판 +{first}, 새 별 +{star}, 다시 깨기 +{again}', { first: EARN.first, star: EARN.star, again: EARN.again })}</small></div></div>`;
  for (const sl of SLOTS) {
    h += `<div class="gslot"><h4>${sl.emoji} ${tr(sl.name)} · ${tr(sl.stat)}</h4><p>${tr(sl.desc)}</p><div class="grow">`;
    for (const g of GEAR.filter((x) => x.slot === sl.id)) {
      const own = save.gear.owned[g.id], wearing = on[sl.id] === g.id;
      const prevOk = g.tier === 1 || save.gear.owned[`${sl.id}${g.tier - 1}`];
      const st = wearing ? 'wear' : own ? 'own' : prevOk ? 'buy' : 'lock';
      const lab = wearing ? tr('입는 중') : own ? tr('입기') : prevOk ? `${BONE}${g.price}` : '🔒';
      h += `<button class="gitem t${g.tier} ${st} ${st === 'buy' && save.bones < g.price ? 'poor' : ''}" data-g="${g.id}"><span class="gic">${gearIcon(g)}</span><b>${tr(g.name)}</b><i>${pct(sl, g.val)}</i><small>${lab}</small></button>`;
    }
    h += '</div></div>';
  }
  return `<div class="gear">${h}</div>`;
}
function gearTap(id) {
  const g = gearById(id), sl = slotById(g.slot), on = wearOn();
  if (on[sl.id] === id) { delete on[sl.id]; store(); toast(tf('{name}을(를) 벗었어요', { name: tr(g.name) })); skinScreen(); return; }
  if (save.gear.owned[id]) { on[sl.id] = id; store(); skinScreen(); return; }
  if (g.tier > 1 && !save.gear.owned[`${sl.id}${g.tier - 1}`]) { toast(tr('앞 단계 장비를 먼저 사야 해요')); return; }
  if (save.bones < g.price) { toast(tf('생선뼈가 {n}개 모자라요', { n: g.price - save.bones })); return; }
  save.bones -= g.price; save.gear.owned[id] = true; on[sl.id] = id; store();
  Sound.play('star'); toast(tf('{name}을(를) 샀어요! {stat} {val}', { name: tr(g.name), stat: tr(sl.stat), val: pct(sl, g.val) }));
  skinScreen();
}

// ───────── 하루 도둑 의뢰 ─────────
const questsOpen = () => LEVELS.some((l) => cleared(l.id));
const vaseCount = {};
function questLevels() {
  return LEVELS.filter((l) => cleared(l.id)).map((l) => {
    if (vaseCount[l.id] == null) vaseCount[l.id] = new Game(l).vases.length;
    return { id: l.id, vases: vaseCount[l.id], best: save.best[l.id] };
  });
}
// 오늘 의뢰 (날짜가 바뀌면 새로 만든다)
function quests() {
  const day = today();
  if (!save.quest || save.quest.day !== day) {
    save.quest = { day, list: questsOpen() ? makeQuests(day, questLevels()) : [], rerolled: false, box: false };
    store();
  }
  return save.quest;
}
const questDone = () => quests().list.filter((q) => q.done).length;
const questsFor = (id) => (questsOpen() ? quests().list.filter((q) => q.lv === id && !q.done) : []);
function questCheck(L, win) {
  const out = [];
  if (!win || !questsOpen()) return out;
  const Q = quests(), ch = CHAPTERS[L.ch - 1];
  for (const q of Q.list) {
    if (q.lv !== L.id || q.done) continue;
    const ok = condOk(q, game), reward = TIERS[q.tier].reward;
    if (ok) { q.done = true; save.bones += reward; }
    out.push({ ok, text: condText(q, ch), reward });
  }
  if (!Q.box && Q.list.length && Q.list.every((q) => q.done)) {
    Q.box = true; save.bones += BOX.bones;
    const before = save.pieces || 0;
    save.pieces = before + BOX.pieces;
    out.box = true;
    out.skin = before < PIECES_FOR_SKIN && save.pieces >= PIECES_FOR_SKIN;
  }
  store();
  return out;
}
function questScreen() {
  scene = 'quest'; game = null; setHud(false);
  const Q = quests();
  const adRr = Math.max(0, AD_REROLLS - (Q.adRerolls || 0));
  const now = new Date(), mid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const left = Math.max(0, mid - now), hh = Math.floor(left / 3600000), mm = Math.floor((left % 3600000) / 60000);
  const lvBy = (id) => LEVELS.findIndex((l) => l.id === id);
  let html = `<div class="top"><button class="back" data-a="back">‹</button><h2>${tr('오늘의 의뢰')}</h2><div class="starsum bones">${BONE} ${save.bones}</div></div>
    <div class="qhead">${tr('이미 깬 스테이지를 조건대로 다시 깨면 생선뼈를 받아요.')}<small>${tf('새 의뢰까지 {h}시간 {m}분', { h: hh, m: mm })} · ${!Q.rerolled ? tr('바꾸기 하루 1번 무료') : adRr ? tf('바꾸기 📺 광고 보고 {n}번 더', { n: adRr }) : tr('바꾸기 오늘은 다 썼어요')}</small></div>`;
  Q.list.forEach((q, k) => {
    const i = lvBy(q.lv), L = LEVELS[i], ch = CHAPTERS[L.ch - 1], T = TIERS[q.tier];
    html += `<div class="qcard ${T.cls} ${q.done ? 'done' : ''}">
      <div class="qtop"><span class="qt">${tr(T.name)}</span><span class="qr">${BONE} +${T.reward}</span></div>
      <b>${condText(q, ch)}</b>
      <p>${L.id} ${tr(L.name)}</p>
      ${q.done ? `<div class="qdone">✓ ${tr('완료')}</div>` : `<div class="qbtns"><button class="btn sm main" data-q="${k}">${tr('도전하기')}</button>${!Q.rerolled ? `<button class="btn sm" data-r="${k}">${tr('바꾸기')}</button>` : adRr ? `<button class="btn sm ad" data-ra="${k}">📺 ${tr('바꾸기')}</button>` : ''}</div>`}
    </div>`;
  });
  const n = Q.list.filter((q) => q.done).length, pc = save.pieces || 0;
  html += `<div class="qbox ${Q.box ? 'open' : ''}">🎁 ${tr('3개 모두 완료하면 보너스 상자')} <b>${Q.box ? tr('받았어요!') : `${n} / 3`}</b>
    <small>${tf('생선뼈 +{bones} · 달빛 도둑 조각 +{pieces} — 조각 {have} / {need}', { bones: BOX.bones, pieces: BOX.pieces, have: Math.min(pc, PIECES_FOR_SKIN), need: PIECES_FOR_SKIN })}${pc >= PIECES_FOR_SKIN ? ` (${tr('해금 완료')})` : ''}</small>
    <div class="pbar"><i style="width:${Math.min(100, (pc / PIECES_FOR_SKIN) * 100)}%"></i></div></div>`;
  const el = show(html, 'list');
  on(el, '[data-a=back]', () => titleScreen());
  on(el, '[data-q]', (e, b) => startLevel(lvBy(Q.list[+b.dataset.q].lv)));
  on(el, '[data-r]', (e, b) => {
    const k = +b.dataset.r;
    Q.list[k] = rerollOne(Q.day, Q.list[k], questLevels(), Q.list); Q.rerolled = true; store();
    toast(tr('의뢰를 바꿨어요')); questScreen();
  });
  on(el, '[data-ra]', async (e, b) => {
    b.disabled = true;
    if (!(await Reward.show('reroll'))) { b.disabled = false; return; }
    const k = +b.dataset.ra;
    Q.list[k] = rerollOne(Q.day, Q.list[k], questLevels(), Q.list); Q.adRerolls = (Q.adRerolls || 0) + 1; store();
    toast(tr('의뢰를 바꿨어요')); questScreen();
  });
}
const AD_REROLLS = 2;

// ───────── 비밀 아지트 ─────────
// 애정도 0~100: 쓰다듬기·간식·놀이를 하루 한 번씩 하면 +5. 마지막으로 돌본 지 하루가 지나면 하루에 10씩 줄지만 20 아래로는 안 떨어진다.
// 하루 넘게 못 봤으면 처음 돌봐 줄 때 반가워하며 +20. 줄어들어도 표정·행동만 바뀌고 게임 진행·생선뼈는 그대로.
// 하트(0~5)가 처음 오를 때마다 아지트 장식이 하나씩 생기고(사라지지 않음), 하트 5칸이면 하루 한 번 선물(생선뼈 +20).
const LOVE = { gain: 5, back: 20, decay: 10, floor: 20, gift: 20, special: 20 }; // special: 📺 특별 간식 (하루 1번)
const DAY = 864e5;
const DECOS = ['고양이 풀 화분', '털실 바구니', '고양이 액자', '반짝이 전구 줄', '생선 쿠션'];
const heartsOf = (v) => Math.min(5, Math.floor((v + 10) / 20));
function denData() {
  const d = (save.den ||= { pets: 0, snacks: 0, plays: 0 });
  if (d.love == null) { // 예전 기록: 쓰다듬은 횟수로 시작값을 정한다
    d.love = Math.max(40, Math.min(100, (d.pets + d.snacks + d.plays) * 2));
    d.lastCare = Date.now(); d.maxHearts = heartsOf(d.love);
  }
  return d;
}
const awayLong = (d) => Date.now() - d.lastCare > DAY;
function loveNow(d) {
  const away = Date.now() - d.lastCare;
  if (away <= DAY) return d.love;
  return Math.max(Math.min(d.love, LOVE.floor), d.love - LOVE.decay * (Math.floor((away - DAY) / DAY) + 1));
}
function moodOf(d) {
  if (awayLong(d)) return 'missed';
  const v = loveNow(d);
  return v < 40 ? 'sad' : v < 70 ? 'ok' : 'happy';
}
// kind: pet | snack | play → { gain, back, newDeco }
function careFor(kind) {
  const d = denData(), back = awayLong(d), td = today();
  if (d.careDay !== td) { d.careDay = td; d.did = {}; }
  let gain = 0;
  if (kind === 'special') { d.specialDay = td; gain += LOVE.special; }
  else if (!d.did[kind]) { d.did[kind] = true; gain += LOVE.gain; }
  if (back) gain += LOVE.back;
  const before = d.maxHearts || 0;
  d.love = Math.min(100, loveNow(d) + gain); d.lastCare = Date.now();
  d.maxHearts = Math.max(before, heartsOf(d.love));
  store();
  return { gain, back, newDeco: d.maxHearts > before ? d.maxHearts : 0 };
}
let den = null;
function denScreen() {
  scene = 'den'; game = null; setHud(false);
  const D = denData();
  D.maxHearts = Math.max(D.maxHearts || 0, heartsOf(loveNow(D))); // 장식은 지금까지 오른 하트만큼
  const shelf = CHAPTERS.map((ch) => {
    const ls = LEVELS.filter((l) => l.ch === ch.id);
    return { ch, img: IMG['item-' + ch.bonus], n: ls.filter((l) => starsOf(l.id)[1]).length, all: ls.length, seen: ls.some((l) => cleared(l.id)) };
  });
  const got = shelf.reduce((n, x) => n + x.n, 0), all = shelf.reduce((n, x) => n + x.all, 0);
  const el = show(`<div class="top"><button class="back" data-a="back">‹</button><h2>${t('title.den')}</h2><div class="starsum bones">${BONE} ${save.bones}</div></div>
    <div class="denwrap"><canvas id="denCv"></canvas><div class="dentip">${tr('고양이를 톡 누르면 쓰다듬어요 · 바닥을 누르면 그쪽으로 가요')}</div></div>
    <div class="denbtns"><button class="btn sm" data-a="snack">🐟 ${tr('간식 주기')}</button><button class="btn sm" data-a="play">🧶 ${tr('놀아 주기')}</button><button class="btn sm" data-a="ward">👕 ${tr('옷장')}</button></div>
    <div class="love"></div>
    <div class="chap trophy"><h3>${tr('훔친 물건 진열장')} <span>${got} / ${all}</span></h3><p>${tr('스테이지에서 보너스 물건을 모두 챙기면 하나씩 늘어나요.')}</p><div class="tgrid">
    ${shelf.map((x) => `<div class="tcell ${x.n ? '' : 'none'}"><img src="${IMG['item-' + x.ch.bonus] ? `img/item-${x.ch.bonus}.webp` : ICON[x.ch.bonus]}" alt=""><b>${x.seen ? tr(x.ch.bonusName) : '???'}</b><small>${x.n} / ${x.all}</small></div>`).join('')}
    <div class="tcell gold ${save.ending ? '' : 'none'}"><img src="${IMG['item-fish-gold'] ? 'img/item-fish-gold.webp' : ''}" alt=""><b>${save.ending ? tr('진짜 황금 생선') : '???'}</b><small>${save.ending ? tr('전설의 보물') : tr('엔딩을 보면')}</small></div>
    </div></div>`, 'list');
  if (den) den.stop();
  den = startDen(el.querySelector('#denCv'), {
    skin: skinById(save.skin), wear: wearOn(), golden: !!save.ending,
    shelf: shelf.map((x) => ({ img: x.img, n: x.n })),
    mood: moodOf(D), deco: D.maxHearts || 0,
    onPet: () => { D.pets++; cared('pet'); },
  });
  // 돌봐 준 뒤: 반가워 연출 · 새 장식 · 하트 줄 다시 그리기
  function cared(kind) {
    const r = careFor(kind);
    if (r.back && kind !== 'special') den.cheer(); // 특별 간식은 츄릅 연출 끝에 '최고야!'로 반긴다
    den.setMood(moodOf(D)); den.setDeco(D.maxHearts || 0);
    if (r.newDeco) setTimeout(() => toast(tf('새 장식이 생겼어요: {deco}', { deco: tr(DECOS[r.newDeco - 1]) }), 2600), r.back ? 1400 : 300);
    paintLove();
  }
  function paintLove() {
    const box = el.querySelector('.love'); if (!box) return;
    const v = loveNow(D), h = heartsOf(v), m = moodOf(D), td = today();
    const did = D.careDay === td ? D.did || {} : {};
    const MOOD = { happy: '기분 최고예요', ok: '기분 좋아요', sad: '조금 심심해해요', missed: '많이 보고 싶었대요…' };
    const chk = (k, ic) => `<i class="${did[k] ? 'on' : ''}">${ic}${did[k] ? '✓' : ''}</i>`;
    const next = D.maxHearts || 0;
    const giftReady = h >= 5 && D.giftDay !== td;
    box.innerHTML = `<div class="lrow">${tr('친밀도')} <span>${'♥'.repeat(h)}${'♡'.repeat(5 - h)}</span><em class="${m}">${tr(MOOD[m])}</em></div>
      <small>${tr('오늘 돌봐 주기')} ${chk('pet', '👋')} ${chk('snack', '🐟')} ${chk('play', '🧶')}</small>
      <small>${next < 5 ? tf('다음 장식: {deco} (♥{n})', { deco: tr(DECOS[next]), n: next + 1 }) : tr('장식을 모두 모았어요')}</small>
      ${D.specialDay !== td ? `<button class="btn sm ad special" data-a="special">📺 ${tr('특별 간식')} <b>♥+${LOVE.special}</b></button>` : `<small>${tr('특별 간식은 내일 또 줄 수 있어요')}</small>`}
      ${giftReady ? `<button class="btn sm gift" data-a="gift">${IMG['item-gift'] ? '<img class="gimg" src="img/item-gift.webp" alt="">' : '🎁'} ${tf('고양이가 선물을 물어 왔어요! {bone} +{n}', { bone: BONE, n: LOVE.gift })}</button>` : ''}`;
    on(box, '[data-a=special]', async (e, b) => {
      if (den.cat.state === 'eat' || den.cat.state === 'lick' || den.cat.state === 'pounce' || den.cat.state === 'hop') { toast(tr('지금은 먹는 중이에요')); return; }
      b.disabled = true;
      if (!(await Reward.show('treat')) || !den || !den.special()) { b.disabled = false; return; }
      cared('special');
    });
    on(box, '[data-a=gift]', () => {
      D.giftDay = today(); save.bones += LOVE.gift; store();
      den.gift(); Sound.play('coin');
      const b = el.querySelector('.top .bones'); if (b) b.innerHTML = `${BONE} ${save.bones}`;
      paintLove();
    });
  }
  paintLove();
  on(el, '[data-a=back]', () => { den.stop(); den = null; titleScreen(); });
  on(el, '[data-a=ward]', () => { den.stop(); den = null; skinScreen('gear'); });
  on(el, '[data-a=snack]', () => { if (den.snack()) { D.snacks++; cared('snack'); } else toast(tr('지금은 먹는 중이에요')); });
  on(el, '[data-a=play]', () => { if (den.play()) { D.plays++; cared('play'); } else toast(tr('지금은 노는 중이에요')); });
}

// ───────── 장 소개 (등장인물·물건) ─────────
const guideRow = (e, isNew) => `<div class="gi ${isNew ? 'new' : ''}"><img src="${guideIcon(e.id)}" alt=""><div><b>${tr(e.name)}${isNew ? '<em>NEW</em>' : ''}</b><span>${tr(e.desc)}</span></div></div>`;
function chapterScreen(chId, next) {
  scene = 'chapter'; game = null; setHud(false); musicCh = chId;
  save.seenCh[chId] = true; store();
  const ch = CHAPTERS[chId - 1], all = inChapter(chId), nw = newInChapter(chId);
  const sec = (kind, title) => {
    const list = all.filter((e) => e.kind === kind);
    return list.length ? `<h4>${title}</h4>${list.map((e) => guideRow(e, chId > 1 && nw.has(e.id))).join('')}` : '';
  };
  const el = show(`<div class="top"><button class="back" data-a="back">‹</button><h2>${chTitle(ch)}</h2></div>
    <div class="chap guide">
      ${IMG['chapter-' + ch.id] ? `<div class="banner" style="background-image:url(img/chapter-${ch.id}.webp)"></div>` : ''}
      <p>${tf('{sub} — 이번 장에서 만나는 것들이에요.', { sub: tr(ch.sub) })}</p>
      ${sec('who', tr('등장인물'))}
      ${sec('item', tr('물건과 장치'))}
    </div>
    <div class="gfoot"><button class="btn main" data-a="go">${next ? tr('잠입하러 가기') : tr('알겠어요')}</button></div>`, 'list');
  on(el, '[data-a=back]', () => levelScreen());
  on(el, '[data-a=go]', () => (next ? next() : levelScreen()));
}

// ───────── 게임 ─────────
// i = -1 이면 튜토리얼
function startLevel(i, skipIntro = false) {
  const tut = i < 0, L = tut ? TUTORIAL : LEVELS[i];
  if (!tut && !skipIntro && firstOfChapter(i) && !save.seenCh[L.ch]) { chapterScreen(L.ch, () => startLevel(i, true)); return; }
  levelIdx = i; paused = false; ended = false;
  tutStep = -1; R.mark = null;
  looking = false; R.peek = false; app.classList.remove('looking');
  game = new Game(L, perksOf(save.gear));
  game.fx = (name) => {
    Sound.play(name);
    if (name === 'caught') vib([60, 40, 120]);
    else if (name === 'alert' || name === 'siren') vib(40);
    else if (name === 'fish') vib(25);
  };
  scene = 'game'; musicCh = L.ch;
  R.focus = game.fish;
  resize(); // 튜토리얼이면 위쪽에 안내줄 자리
  R.setGame(game, skinById(save.skin), wearOn());
  setHud(true);
  buildSides(L, i);
  buildGoals();
  $('#lvTitle').textContent = tut ? `🎓 ${tr(L.name)}` : `${L.id} ${tr(L.name)}`;
  fitHudTitle();
  const ch = CHAPTERS[L.ch - 1];
  const nw = tut || (skipIntro && firstOfChapter(i)) ? [] : newInLevel(i), here = inLevel(L).filter((e) => e.id !== 'door');
  if (tut) { tutIntro(L, here); return; }
  const el = show(`<div class="card intro"><div class="ibody">
      ${IMG['chapter-' + ch.id] ? `<div class="cbanner" style="background-image:url(img/chapter-${ch.id}.webp)"></div>` : ''}
      <span class="tag">${chTitle(ch)}</span>${L.hard ? `<span class="tag hardt">🔥 ${tr('고난도')}</span>` : ''}
      <h1>${tr(L.name)}</h1>
      <p class="tip">${tr(L.hint)}</p>
      ${nw.length ? `<div class="newbox"><div class="nh">${tr('새로 등장!')}</div>${nw.map((e) => guideRow(e, false)).join('')}</div>` : ''}
      <div class="chips"><span>${tr('이번 스테이지')}</span>${here.map((e) => `<button class="chip" data-e="${e.id}"><img src="${guideIcon(e.id)}" alt="${tr(e.name)}"></button>`).join('')}</div>
      <div class="goalrow on"><span class="s">★</span>${L.golden ? tr('황금 생선을 물고 고양이 문으로 탈출') : tr('생선을 물고 고양이 문으로 탈출')}</div>
      <div class="goalrow on"><span class="s">★</span>${tf('{item} 2개 모두 챙기기', { item: tr(ch.bonusName) })}</div>
      <div class="goalrow on"><span class="s">★</span>${tr('한 번도 들키지 않기 (!)')}</div>
      ${questsFor(L.id).map((q) => `<div class="qline">📜 ${tf('오늘의 의뢰: {cond}', { cond: condText(q, ch) })} <b>+${TIERS[q.tier].reward}</b></div>`).join('')}
      </div><div class="gobar"><button class="btn main" data-a="go">${tr('잠입 시작')}</button></div>
    </div>`, 'center dim');
  on(el, '[data-a=go]', () => startPlay());
  on(el, '[data-e]', (e, b) => { const g = entry(b.dataset.e); toast(`${tr(g.name)} — ${tr(g.desc)}`, 3600); });
}
// 가로 화면에서 맵 양옆 빈자리에 스테이지 정보와 조작법
function buildSides(L, i) {
  $('#sideL').innerHTML = `<h3>${L.tutorial ? '🎓' : L.id} ${tr(L.name)}</h3><p>${tr(L.hint)}</p>
    <h4>${tr('이번 스테이지')}</h4>${inLevel(L).filter((e) => e.id !== 'door').map((e) => guideRow(e, !L.tutorial && newInLevel(i).includes(e))).join('')}`;
  const k = (a, b) => `<div class="key"><span>${a}</span><kbd>${b}</kbd></div>`;
  $('#sideR').innerHTML = `<h3>${tr('조작')}</h3>${k(tr('이동 (살금살금)'), tr('방향키 · WASD'))}${k(tr('달리기'), 'Shift')}${k(tr('행동'), 'Space')}${k(tr('야옹'), 'Q')}${k(tr('맵 전체 보기'), tr('Tab 누르고 있기'))}${k(tr('일시정지'), 'Esc')}${k(tr('다시 하기 (끝난 뒤)'), 'R')}
    <h4>${tr('알아 두기')}</h4>
    <p class="tipl">· ${tr('달리기 발소리, 야옹, 꽃병 소리는 문을 돌아 퍼져요.')}</p>
    <p class="tipl">· ${tr('탁자·침대·상자 밑과 고양이 문 안은 안 보여요.')}</p>
    <p class="tipl">· ${tr('화면을 끌어서 움직여도 돼요.')}</p>`;
  placeSides();
}
function placeSides() {
  if (!game) return;
  const gap = (R.W - Math.min(R.mapW, R.W)) / 2;
  const w = Math.min(440, gap - 28);
  for (const [id, side] of [['#sideL', 'left'], ['#sideR', 'right']]) {
    const el = $(id);
    el.classList.toggle('narrow', w < 190);
    el.style.width = w + 'px'; el.style.left = el.style.right = '';
    el.style[side] = Math.max(14, gap - w - 14) + 'px';
  }
}
function startPlay() {
  if (!game || game.state !== 'intro') return;
  hideLayer();
  R.focus = null;
  game.start();
}
function buildGoals() {
  const ch = CHAPTERS[game.L.ch - 1];
  $('#goals').innerHTML = `<div class="g" id="gF"><img src="${game.L.golden ? ICON.gold : ICON.fish}" alt=""></div>` +
    game.bonus.map((_, i) => `<div class="g" id="gB${i}"><img src="${ICON[ch.bonus]}" alt=""></div>`).join('') +
    `<div class="g eye" id="gE">${t('goal.safe')}</div>`;
}
let hudCache = {};
function updateHud() {
  if (scene !== 'game' || !game) return;
  const set = (k, v, fn) => { if (hudCache[k] !== v) { hudCache[k] = v; fn(v); } };
  set('f', game.fish.taken, (v) => $('#gF').classList.toggle('on', v));
  game.bonus.forEach((b, i) => set('b' + i, b.taken, (v) => $('#gB' + i).classList.toggle('on', v)));
  set('e', game.spotted, (v) => { const e = $('#gE'); e.classList.toggle('bad', v); e.textContent = v ? t('goal.spotted') : t('goal.safe'); });
  const a = game.actionTarget();
  set('a', a ? a.label : '', (v) => {
    const b = $('#bAct'); b.classList.toggle('idle', !v); b.innerHTML = buttonHTML(actIcon(v), v ? tAct(v) : t('btn.act')); b.setAttribute('aria-label', v ? tAct(v) : t('aria.act'));
    b.classList.remove('pop'); if (v) { void b.offsetWidth; b.classList.add('pop'); }
  });
  const cd = game.cat.meowCD / game.meowMax;
  $('#bMeow').style.setProperty('--cd', cd.toFixed(3));
  const chased = game.chased(), d = game.danger();
  const st = looking ? [t('st.look'), 'warn'] : chased ? [t('st.chase'), 'bad'] : game.cat.riding ? [t('st.ride'), ''] : game.cat.hidden && game.state === 'play' ? [t('st.hide'), ''] : d > 0.3 ? [t('st.sus'), 'warn'] : game.cat.hasFish ? [t('st.fish'), ''] : [t('st.sneak'), ''];
  set('s', st.join('|'), () => {
    const s = $('#status'); s.textContent = st[0]; s.className = st[1];
    // 한 단어가 긴 번역(Saklanıyorsun…)은 칸에 맞게 글자를 줄인다
    s.style.fontSize = '';
    for (let fs = parseFloat(getComputedStyle(s).fontSize); s.scrollWidth > s.clientWidth + 1 && fs > 10;) s.style.fontSize = --fs + 'px';
  });
}
function pauseGame() {
  setLook(false);
  if (!game || paused || ended) return;
  paused = true; joy.active = false;
  const el = show(`<div class="card">
      <h1>${t('pause.title')}</h1>
      <p>${game.L.id} ${tr(game.L.name)}</p>
      <button class="btn main" data-a="resume">${t('pause.resume')}</button>
      <button class="btn" data-a="retry">${t('pause.retry')}</button>
      <button class="btn" data-a="list">${t('pause.list')}</button>
      <div class="toggles">
        <button class="tg ${save.sound ? 'on' : ''}" data-t="sound">${t('tg.sound')}</button>
        <button class="tg ${save.music ? 'on' : ''}" data-t="music">${t('tg.music')}</button>
        <button class="tg ${save.lefty ? 'on' : ''}" data-t="lefty">${t('tg.lefty')}</button>
      </div>
    </div>`, 'center dim');
  on(el, '[data-a=resume]', () => resumeGame());
  on(el, '[data-a=retry]', () => startLevel(levelIdx));
  on(el, '[data-a=list]', () => levelScreen());
  on(el, '[data-t]', (e, b) => {
    const k = b.dataset.t; save[k] = !save[k]; store(); b.classList.toggle('on', save[k]);
    Sound.setSound(save.sound); Sound.setMusic(save.music);
    app.classList.toggle('lefty', !!save.lefty);
  });
}
function resumeGame() {
  if (!paused) return;
  paused = false;
  if (game && game.state === 'intro') { startLevel(levelIdx); return; }
  hideLayer();
}

// 같은 스테이지에서 잡힌 횟수 (이번에 켠 동안만): 3번째부터 건너뛰기 버튼
const failCount = {};
const SKIP_AFTER = 3;
const REVIVE_BONES = 30; // 생선뼈로 바로 이어하기 값 (광고 대신)
const FAIL = ['생선은 다음 기회에…', '고양이 털이 너무 눈에 띄었다', '살금살금이 부족했다!', '집사의 눈은 매서웠다'];
function endLevel(win) {
  ended = true;
  const L = game.L;
  if (L.tutorial) { tutEnd(win); return; }
  if (L.ch > 1) adStages++;
  if (!win) {
    const fails = (failCount[L.id] = (failCount[L.id] || 0) + (game.revived ? 0 : 1));
    const canRevive = !game.revived;
    const freeRevive = save.freeRevive !== today();
    const canSkip = fails >= SKIP_AFTER && !cleared(L.id) && !skipped(L.id) && !!LEVELS[levelIdx + 1];
    const el = show(`<div class="card">
        ${IMG.caught ? `<img class="hero" src="${spriteURL('caught', skinById(save.skin))}" alt="">` : '<div class="big">😿</div>'}
        <h1>${tr('잡혔다!')}</h1>
        <p>${tr(FAIL[(Math.random() * FAIL.length) | 0])}</p>
        ${canRevive ? (freeRevive
          ? `<button class="btn ad free" data-a="revfree">🎁 ${tr('이어하기')}<small>${tr('오늘 1번 무료')}</small></button>`
          : `<div class="revrow"><button class="btn ad" data-a="revive">📺 ${tr('이어하기')}<small>${tr('광고 보고 무료')}</small></button><button class="btn bonebtn ${save.bones < REVIVE_BONES ? 'poor' : ''}" data-a="revbone"><span class="bv">${BONE}${REVIVE_BONES}</span><small>${tr('바로 이어하기')}</small></button></div>`)
          + `<div class="revnote">${game.cat.hasFish ? tr('생선은 잡힌 자리에 떨어져요') : tr('모은 보너스는 그대로예요')}</div>` : ''}
        <button class="btn ${canRevive ? '' : 'main'}" data-a="retry">${tr('처음부터 다시')}</button>
        ${canSkip ? `<button class="btn ad sm" data-a="skip">📺 ${tr('이 스테이지 건너뛰기')}<small>${tr('별 없이 다음 스테이지가 열려요')}</small></button>` : ''}
        <button class="btn sm" data-a="list">${tr('스테이지 목록')}</button>
      </div>`, 'center dim');
    on(el, '[data-a=retry]', () => atBreak(() => startLevel(levelIdx)));
    on(el, '[data-a=list]', () => atBreak(() => levelScreen()));
    on(el, '[data-a=revive]', async (e, b) => {
      b.disabled = true;
      if (!(await Reward.show('revive')) || !game || !game.revive()) { b.disabled = false; return; }
      ended = false; hideLayer(); vib(20);
    });
    // 하루 1번 무료 이어하기
    on(el, '[data-a=revfree]', () => {
      if (!game || !game.revive()) return;
      save.freeRevive = today(); store();
      ended = false; hideLayer(); vib(20);
      toast(tr('오늘의 무료 이어하기를 썼어요'), 1800);
    });
    // 생선뼈로 바로 이어하기
    on(el, '[data-a=revbone]', () => {
      if (save.bones < REVIVE_BONES) { toast(tf('생선뼈가 {n}개 모자라요', { n: REVIVE_BONES - save.bones })); return; }
      if (!game || !game.revive()) return;
      save.bones -= REVIVE_BONES; store();
      ended = false; hideLayer(); vib(20);
      toast(tf('생선뼈 {n}개로 이어가요', { n: REVIVE_BONES }), 1800);
    });
    on(el, '[data-a=skip]', async (e, b) => {
      b.disabled = true;
      if (!(await Reward.show('skip'))) { b.disabled = false; return; }
      (save.skipped ||= {})[L.id] = true; store();
      toast(tf('{id} 건너뜀 — 나중에 언제든 다시 깰 수 있어요', { id: L.id }), 2600);
      startLevel(levelIdx + 1);
    });
    return;
  }
  const before = totalStars();
  const got = game.stars();
  const old = starsOf(L.id);
  const wasCleared = cleared(L.id);
  const qres = questCheck(L, true);
  const newStars = got.filter((g, i) => g && !old[i]).length;
  const earn = (wasCleared ? EARN.again : EARN.first) + newStars * EARN.star;
  save.bones += earn;
  save.stars[L.id] = got.map((s, i) => s || old[i]);
  const t = game.elapsed;
  if (!save.best[L.id] || t < save.best[L.id]) save.best[L.id] = t;
  store();
  const after = totalStars();
  const newSkins = SKINS.filter((s) => !s.ending && !s.quest && s.need > before && s.need <= after);
  const ch = CHAPTERS[L.ch - 1];
  const last = !!L.final, golden = !!L.golden, fake = golden && !last;
  const nextL = LEVELS[levelIdx + 1];
  const soon = !last && !nextL;
  const labels = [tr('생선 들고 탈출'), tf('{item} 모두 챙김', { item: tr(ch.bonusName) }), tr('한 번도 안 들킴')];
  const el = show(`<div class="card">
      ${(() => { const nm = golden ? 'legend' : !nextL || nextL.ch !== L.ch ? (IMG['clear-' + L.ch] ? 'clear-' + L.ch : 'win') : 'win'; return IMG[nm] ? `<img class="hero" src="${spriteURL(nm, skinById(save.skin))}" alt="">` : ''; })()}
      <span class="tag">${L.id} · ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}</span>
      <h1>${last ? tr('전설의 도둑 고양이!') : fake ? tr('황금 생선…인데?') : tr('탈출 성공!')}</h1>
      ${last ? `<p>${tr('진짜 황금 생선을 손에 넣었다! 99스테이지 모두 클리어!')}</p>` : ''}
      ${fake ? `<p>${tr('훔친 황금 생선이 이상하게 가볍다. 톡톡… 플라스틱?!')} <b>${tr('진짜는 생선왕의 성에 있다!')}</b></p>` : ''}
      ${soon ? `<p class="soonp">${tr('다음 장은 지금 준비 중이에요. 조금만 기다려 주세요!')}</p>` : ''}
      ${labels.map((lb, i) => `<div class="goalrow hide" data-g="${i}"><span class="s">★</span>${lb}</div>`).join('')}
      <div class="earn">${BONE} ${tf('생선뼈 +{n}', { n: `<b class="en">${earn}</b>` })}<small>${tf('모두 {n}', { n: `<b class="eb">${save.bones}</b>` })}</small></div>
      <button class="btn ad sm dbl" data-a="double">📺 ${tr('생선뼈 2배 받기')} <b>+${earn}</b></button>
      ${qres.map((r) => `<div class="qres ${r.ok ? 'ok' : ''}">📜 ${r.ok ? tf('의뢰 완료: {cond}', { cond: r.text }) : tf('의뢰 실패: {cond}', { cond: r.text })}${r.ok ? ` <b>+${r.reward}</b>` : ''}</div>`).join('')}
      ${qres.box ? `<div class="unlock">🎁 ${tf('오늘의 의뢰 3개 완료! 보너스 상자: 생선뼈 +{bones}, 달빛 도둑 조각 +{pieces} ({have}/{need})', { bones: BOX.bones, pieces: BOX.pieces, have: save.pieces, need: PIECES_FOR_SKIN })}</div>` : ''}
      ${qres.skin ? `<div class="unlock">${tr('새 고양이 해금: 달빛 도둑! (옷장에서 입기)')}</div>` : ''}
      ${newSkins.map((s) => `<div class="unlock">${tf('새 고양이 해금: {name}! (옷장에서 입기)', { name: tr(s.name) })}</div>`).join('')}
      ${last ? `<button class="btn main" data-a="ending">${tr('엔딩 보기')}</button>` : soon ? '' : `<button class="btn main" data-a="next">${tr('다음 스테이지')}${nextL.no === HARD_FROM ? ' 🔥' : ''}</button>`}
      <div class="row2"><button class="btn sm" data-a="retry">${tr('다시 하기')}</button><button class="btn sm" data-a="list">${tr('목록')}</button></div>
    </div>`, 'center dim');
  got.forEach((g, i) => setTimeout(() => {
    const r = el.querySelector(`[data-g="${i}"]`);
    if (!r) return;
    r.classList.remove('hide');
    if (g) { r.classList.add('on'); Sound.play('star'); }
  }, 350 + i * 380));
  on(el, '[data-a=next]', () => atBreak(() => startLevel(levelIdx + 1)));
  on(el, '[data-a=double]', async (e, b) => {
    b.disabled = true;
    if (!(await Reward.show('double'))) { b.disabled = false; return; }
    save.bones += earn; store();
    el.querySelector('.earn .en').textContent = earn * 2;
    el.querySelector('.earn .eb').textContent = save.bones;
    b.remove(); Sound.play('coin');
  });
  on(el, '[data-a=ending]', () => endingScreen(true));
  on(el, '[data-a=retry]', () => atBreak(() => startLevel(levelIdx)));
  on(el, '[data-a=list]', () => atBreak(() => levelScreen()));
}

// ───────── 튜토리얼 ─────────
// 처음 깨면 생선뼈를 주고(설치 후 한 번), 잡혀도 광고 없이 몇 번이든 이어한다. 별·의뢰·전면 광고와는 상관없음.
const TUT_BONES = 100; // 옷장 첫 장비(100) 하나 값
// 단계: 안내 글 + 끝났는지 + 가리킬 곳(칸 좌표). 앞 단계는 한 번 끝나면 끝난 걸로 둔다 (live = 매번 확인)
const TUT_STEPS = [
  { text: '화면 아무 곳이나 누른 채 끌어 보세요. 살짝 끌면 살금살금 걸어요.',
    done: (G) => Math.hypot(G.cat.x - G.ents.cat.x, G.cat.y - G.ents.cat.y) > 1.6 },
  { text: '털실 뭉치 2개를 챙겨요. 다 챙기면 별 하나!',
    done: (G) => G.bonus.every((b) => b.taken),
    at: (G) => { const c = G.cat, d = (b) => Math.hypot(b.x - c.x, b.y - c.y); return G.bonus.filter((b) => !b.taken).sort((a, b) => d(a) - d(b))[0]; } },
  { text: '위쪽 탁자 밑으로 쏙! 숨어 있으면 불빛에 비춰도 안 보여요.',
    done: (G) => G.cat.hidden && Math.floor(G.cat.x) === 5 && Math.floor(G.cat.y) === 6,
    at: () => ({ x: 5.5, y: 6.5 }) },
  { text: '집사의 노란 불빛이 지나가면 등 뒤로 살금살금, 위쪽 부엌으로! 막히면 [야옹]으로 집사를 불러낼 수도 있어요.',
    done: (G) => G.cat.y < 4.6,
    at: () => ({ x: 5.5, y: 4.5 }) },
  { text: '생선을 물어요!', live: true,
    done: (G) => G.cat.hasFish,
    at: (G) => G.fish },
  { text: '생선을 물고 고양이 문으로 돌아가면 성공! 끝까지 끌면 달리지만 발소리가 나요.', live: true,
    done: () => false,
    at: (G) => ({ x: G.ents.cat.x, y: G.ents.cat.y }) },
];
let tutStep = -1, tutDone = [];
function tutIntro(L, here) {
  tutDone = [];
  const el = show(`<div class="card intro"><div class="ibody">
      <span class="tag">🎓 ${tr('튜토리얼')}</span>
      <h1>${tr(L.name)}</h1>
      <p class="tip">${tr('생선을 몰래 물고 고양이 문으로 돌아오는 연습이에요. 화면 위 안내와 노란 화살표를 따라가요.')}</p>
      <div class="chips"><span>${tr('이번 스테이지')}</span>${here.map((e) => `<button class="chip" data-e="${e.id}"><img src="${guideIcon(e.id)}" alt="${tr(e.name)}"></button>`).join('')}</div>
      <div class="goalrow on"><span class="s">★</span>${tr('생선을 물고 고양이 문으로 탈출')}</div>
      <div class="tutnote">🎁 ${tr('연습이라 이어하기는 몇 번이든 무료예요 (광고 없음)')}</div>
      ${save.tut ? '' : `<div class="tutnote gift">${BONE} ${tf('처음 끝내면 생선뼈 {n}개 선물!', { n: TUT_BONES })}</div>`}
      </div><div class="gobar"><button class="btn main" data-a="go">${tr('연습 시작')}</button>
      <button class="btn sm" data-a="skiptut">${save.tut ? tr('스테이지 목록') : tr('건너뛰고 1-1 바로 하기')}</button></div>
    </div>`, 'center dim');
  on(el, '[data-a=go]', () => startPlay());
  on(el, '[data-a=skiptut]', () => (save.tut ? levelScreen() : startLevel(0)));
  on(el, '[data-e]', (e, b) => { const g = entry(b.dataset.e); toast(`${tr(g.name)} — ${tr(g.desc)}`, 3600); });
}
// 매 프레임: 지금 단계 찾기 → 안내 글·화살표
function tutTick() {
  const G = game, N = TUT_STEPS.length;
  // 앞으로만 간다: 뒤 단계를 먼저 해 버리면 그 앞 단계도 끝난 걸로
  if (G.state === 'play') for (let j = N - 1; j >= 0; j--) {
    const st = TUT_STEPS[j];
    if (!st.live && !tutDone[j] && st.done(G)) { for (let m = 0; m <= j; m++) tutDone[m] = true; break; }
  }
  let k = 0;
  while (k < N - 1 && !TUT_STEPS[k].live && tutDone[k]) k++;
  if (TUT_STEPS[k].live && TUT_STEPS[k].done(G)) k = N - 1; // 생선을 물었으면 마지막 단계
  const st = TUT_STEPS[k], at = G.state === 'play' && st.at ? st.at(G) : null;
  R.mark = at ? { x: at.x, y: at.y } : null;
  if (k !== tutStep) {
    if (tutStep >= 0 && k > tutStep) Sound.play('star');
    tutStep = k;
    const el = $('#coach');
    el.innerHTML = `<b>${k + 1}/${TUT_STEPS.length}</b><span>${tr(st.text)}</span>`;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  }
}
function tutEnd(win) {
  R.mark = null;
  if (!win) {
    const el = show(`<div class="card">
        ${IMG.caught ? `<img class="hero" src="${spriteURL('caught', skinById(save.skin))}" alt="">` : '<div class="big">😿</div>'}
        <h1>${tr('잡혔다!')}</h1>
        <p>${tr('괜찮아요, 연습이니까요! 불빛에 오래 비치면 들켜요. 숨는 곳을 잘 써 봐요.')}</p>
        <button class="btn main ad free" data-a="revive">🎁 ${tr('이어하기')}<small>${tr('연습이라 몇 번이든 무료')}</small></button>
        <div class="revnote">${game.cat.hasFish ? tr('생선은 잡힌 자리에 떨어져요') : tr('모은 보너스는 그대로예요')}</div>
        <button class="btn" data-a="retry">${tr('처음부터 다시')}</button>
        <button class="btn sm" data-a="list">${tr('스테이지 목록')}</button>
      </div>`, 'center dim');
    on(el, '[data-a=revive]', () => { if (!game || !game.revive()) return; ended = false; hideLayer(); vib(20); });
    on(el, '[data-a=retry]', () => startLevel(-1));
    on(el, '[data-a=list]', () => levelScreen());
    return;
  }
  const first = !save.tut;
  save.tut = true;
  if (first) save.bones += TUT_BONES;
  store();
  const el = show(`<div class="card">
      ${IMG.win ? `<img class="hero" src="${spriteURL('win', skinById(save.skin))}" alt="">` : ''}
      <span class="tag">🎓 ${tr('튜토리얼')}</span>
      <h1>${tr('연습 완료!')}</h1>
      <p>${tr('이제 진짜 잠입이에요. 잠옷 집사네 부엌에서 첫 생선을 노려 봐요!')}</p>
      ${first ? `<div class="earn">${BONE} ${tf('생선뼈 +{n}', { n: `<b class="en">${TUT_BONES}</b>` })}<small>${tf('모두 {n}', { n: `<b class="eb">${save.bones}</b>` })}</small></div>
      <div class="unlock">${tr('옷장에서 첫 장비를 하나 살 수 있어요!')}</div>` : ''}
      <button class="btn main" data-a="next">${tr('1-1 시작하기')}</button>
      <div class="row2"><button class="btn sm" data-a="retry">${tr('다시 하기')}</button><button class="btn sm" data-a="list">${tr('목록')}</button></div>
    </div>`, 'center dim');
  if (first) Sound.play('coin');
  on(el, '[data-a=next]', () => startLevel(0));
  on(el, '[data-a=retry]', () => startLevel(-1));
  on(el, '[data-a=list]', () => levelScreen());
}

// ───────── 엔딩 ─────────
const ENDING = [
  { img: 'ending-1', text: '생선왕의 성 가장 깊은 방. 드디어 찾았다 — 진짜 황금 생선!', bg: ['#2a1d3e', '#6b4a1e'] },
  { img: 'ending-2', text: '경보가 울리고 온 성이 뒤집혔지만… 이미 늦었지롱!', bg: ['#1b1838', '#5a2240'] },
  { img: 'ending-3', text: '새벽 지붕 위. 그동안 모은 보물을 하나하나 세어 본다.', bg: ['#3a2f6b', '#f2a65a'] },
  { img: 'ending-4', text: '아침. 집사는 아무것도 모른다. 오늘도 평화로운 하루.', bg: ['#f6d9a8', '#f2b8a0'] },
];
const CREDITS = ['몰래냥', '', '기획 · 그림', 'StatFlow Games', '', '프로그램 · 레벨 디자인', 'Claude', '', '등장 인물', '잠옷 집사 · 정장 집사 · 강아지', '경비원 · 생선가게 사장님', '요리사 · 관리인 아저씨', '경비 로봇 · 생선왕의 기사', '', '그리고', '끝까지 살금살금 걸어 준 당신', '', '고마워요!'];
function endingScreen(first) {
  scene = 'ending'; game = null; setHud(false);
  if (first && !save.ending) { save.ending = true; store(); }
  Sound.play('win');
  let i = 0;
  const panel = () => {
    const p = ENDING[i];
    const art = IMG[p.img]
      ? `<div class="eart" style="background-image:url(img/${p.img}.webp)"></div>`
      : `<div class="eart code" style="background:linear-gradient(${p.bg[0]},${p.bg[1]})"><img src="${spriteURL('legend', skinById(save.skin)) || skinIcon(skinById(save.skin))}" alt=""></div>`;
    const el = show(`<div class="ending">${art}<div class="etext"><p>${tr(p.text)}</p><small>${i + 1} / ${ENDING.length} · ${tr('눌러서 계속')}</small></div></div>`, 'full');
    el.querySelector('.ending').addEventListener('click', () => { Sound.play('click'); i++; if (i < ENDING.length) panel(); else credits(); });
  };
  const credits = () => {
    const bg = IMG['ending-bg'] ? `style="background-image:url(img/ending-bg.webp)"` : '';
    const el = show(`<div class="credits" ${bg}><div class="roll">${CREDITS.map((l, k) => `<div class="${k === 0 ? 'ct' : l && CREDITS[k + 1] && !CREDITS[k - 1] ? 'ch' : ''}">${l ? tr(l) : '&nbsp;'}</div>`).join('')}</div><small class="skip">${tr('눌러서 넘기기')}</small></div>`, 'full');
    const go = () => { clearTimeout(tm); record(); };
    const tm = setTimeout(go, 16000);
    el.querySelector('.credits').addEventListener('click', go);
  };
  const record = () => {
    const ts = totalStars(), all = LEVELS.length * 3, cl = LEVELS.filter((l) => cleared(l.id)).length;
    const el = show(`<div class="card">
        <span class="tag">THE END</span>
        <h1>${tr('전설의 도둑 고양이')}</h1>
        <div class="goalrow on"><span class="s">★</span>${tf('모은 별 {n} / {all}', { n: ts, all })}</div>
        <div class="goalrow on"><span class="s">✓</span>${tf('깬 스테이지 {n} / {all}', { n: cl, all: LEVELS.length })}</div>
        <div class="unlock">${tf('엔딩 보상: {crown} 생선왕 고양이 (옷장에서 입기)', { crown: '👑' })}</div>
        <button class="btn main" data-a="skin">${tr('옷장 가기')}</button>
        <button class="btn" data-a="list">${tr('스테이지 목록')}</button>
      </div>`, 'center dim');
    on(el, '[data-a=skin]', () => skinScreen());
    on(el, '[data-a=list]', () => levelScreen());
  };
  panel();
}

// 한참 뒤에 돌아오면 브라우저가 비워 버렸을 수 있는 그림(고양이·경비 등)과 바닥 그림을 다시 만든다
let hiddenAt = 0;
function refreshArt() {
  resetSprites();
  if (R.game) R.buildStatic();
}
function backAfter() { if (hiddenAt && Date.now() - hiddenAt > 15000) refreshArt(); hiddenAt = 0; }
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); Sound.suspend(); if (scene === 'game' && game && game.state === 'play') pauseGame(); }
  else { Sound.resume(); backAfter(); }
});
// 화면 캔버스를 잃었다 되찾았을 때도 다시 만든다
cv.addEventListener('contextrestored', refreshArt);

// ───────── 앱(안드로이드)에서만 ─────────
const NativeApp = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App;
if (NativeApp) {
  // 홈 버튼·전화 등으로 앱이 뒤로 가면: 소리 멈추고 게임 중이면 일시정지 (visibilitychange 가 안 오는 기기 대비)
  NativeApp.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) { hiddenAt ||= Date.now(); Sound.suspend(); setLook(false); if (scene === 'game' && game && game.state === 'play') pauseGame(); }
    else { Sound.resume(); backAfter(); }
  });
  // 뒤로 가기: 게임 중 → 일시정지/계속, 결과·시작 카드 → 스테이지 목록, 다른 화면 → 그 화면의 ‹ 버튼, 타이틀 → 두 번 누르면 종료
  let exitAt = 0;
  NativeApp.addListener('backButton', () => {
    Sound.unlock();
    if (scene === 'game') {
      setLook(false);
      if (ended || (game && game.state === 'intro' && !paused)) levelScreen();
      else if (paused) resumeGame();
      else pauseGame();
      return;
    }
    if (scene === 'title') {
      if (performance.now() - exitAt < 2000) NativeApp.exitApp();
      else { exitAt = performance.now(); toast(t('exit.again'), 2000); }
      return;
    }
    if (scene === 'ending') {
      const step = layer.querySelector('.ending, .credits');
      if (step) step.click(); else levelScreen();
      return;
    }
    const back = layer.querySelector('[data-a=back]');
    if (back) back.click(); else titleScreen();
  });
}

// ───────── 타이틀 배경 ─────────
const STARS = Array.from({ length: 60 }, (_, i) => [((i * 97) % 100) / 100, ((i * 57) % 60) / 100, (i % 3) + 1]);
function drawTitleBg(dt) {
  titleT += dt;
  const c = R.ctx, W = R.W, H = R.H;
  c.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
  if (IMG.title) {
    const im = IMG.title, k = Math.max(W / im.width, H / im.height);
    const w = im.width * k, h = im.height * k;
    c.fillStyle = '#151228'; c.fillRect(0, 0, W, H);
    const bob = Math.sin(titleT * 0.6) * 2;
    if (W > H) {
      // 가로 화면: 흐리게 깐 배경 위에 세로 그림을 통째로
      c.globalAlpha = 0.35; c.drawImage(im, (W - w) / 2, (H - h) / 2, w, h); c.globalAlpha = 1;
      const k2 = H / im.height, w2 = im.width * k2;
      c.drawImage(im, (W - w2) / 2, bob, w2, H);
      const fade = (x0, x1) => { const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, 'rgba(21,18,40,0)'); g.addColorStop(1, 'rgba(21,18,40,0.85)'); return g; };
      c.fillStyle = fade((W + w2) / 2 - 40, (W + w2) / 2); c.fillRect((W + w2) / 2 - 40, 0, 40, H);
      c.fillStyle = fade((W - w2) / 2 + 40, (W - w2) / 2); c.fillRect((W - w2) / 2, 0, 40, H);
    } else {
      // 세로 화면: 고양이(그림 높이 46~73%)가 버튼에 가리지 않게 그림을 위로 올린다.
      // 귀는 제목 밑, 발은 첫 버튼 바로 위. 올려서 빈 아래쪽은 지붕 색으로 채운다.
      // 짧은 화면(버튼이 많을 때)은 고양이가 제목과 버튼 사이에 다 들어오게 그림을 줄이고, 양옆은 흐린 배경으로
      let dh = h, oy = (H - h) / 2;
      if (titleLay.btn) {
        const band = titleLay.btn - titleLay.logo - 12;
        if (0.27 * h > band) dh = Math.max(H * 0.45, band / 0.27);
        oy = Math.min((H - dh) / 2, Math.max(titleLay.btn - 6 - 0.73 * dh, titleLay.logo + 6 - 0.46 * dh));
      }
      const dw = im.width * dh / im.height, dx = (W - dw) / 2;
      if (dw < W) { c.globalAlpha = 0.35; c.drawImage(im, (W - w) / 2, (H - h) / 2, w, h); c.globalAlpha = 1; }
      c.drawImage(im, dx, oy + bob, dw, dh);
      if (dw < W) {
        for (const [x0, x1] of [[dx + 50, dx], [dx + dw - 50, dx + dw]]) {
          const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, 'rgba(21,18,40,0)'); g.addColorStop(1, 'rgba(21,18,40,0.85)');
          c.fillStyle = g; c.fillRect(Math.min(x0, x1), 0, 50, H);
        }
      }
      if (oy + dh < H) { c.fillStyle = '#221834'; c.fillRect(0, oy + dh + bob - 1, W, H - oy - dh + 4); }
    }
    for (const [x, y, s] of STARS.slice(0, 24)) {
      const a = Math.max(0, Math.sin(titleT * 1.3 + x * 31));
      c.globalAlpha = a * a * 0.9;
      c.fillStyle = '#fff6d8'; c.fillRect(x * W, y * H * 0.7, s, s);
    }
    c.globalAlpha = 1;
    return;
  }
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#120f2a'); g.addColorStop(0.6, '#2b2150'); g.addColorStop(1, '#3e2a55');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (const [x, y, s] of STARS) {
    c.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(titleT * 0.8 + x * 20));
    c.fillStyle = '#fff6d8'; c.fillRect(x * W, y * H, s * 0.8, s * 0.8);
  }
  c.globalAlpha = 1;
  const mx = W * 0.78, my = H * 0.13;
  const mg = c.createRadialGradient(mx, my, 10, mx, my, 110);
  mg.addColorStop(0, 'rgba(255,240,190,0.35)'); mg.addColorStop(1, 'rgba(255,240,190,0)');
  c.fillStyle = mg; c.fillRect(mx - 120, my - 120, 240, 240);
  ell(c, mx, my, 34, 34, '#fff4c8');
  ell(c, mx - 10, my - 6, 6, 5, '#efe0a8'); ell(c, mx + 9, my + 9, 4, 4, '#efe0a8');
  // 지붕 실루엣
  const base = H * 0.66;
  c.fillStyle = '#17122b';
  c.beginPath(); c.moveTo(0, H);
  const roofs = [[0, 0.1], [0.12, 0.02], [0.24, 0.1], [0.24, 0.05], [0.42, 0.05], [0.42, -0.02], [0.55, -0.08], [0.68, -0.02], [0.68, 0.06], [0.84, 0.06], [0.84, 0.0], [0.92, -0.04], [1, 0.0]];
  for (const [x, y] of roofs) c.lineTo(x * W, base + y * H);
  c.lineTo(W, H); c.closePath(); c.fill();
  c.fillStyle = '#ffd56a';
  for (const [x, y] of [[0.06, 0.16], [0.3, 0.12], [0.36, 0.2], [0.6, 0.08], [0.74, 0.14], [0.9, 0.12]]) {
    c.globalAlpha = 0.55 + 0.45 * Math.sin(titleT + x * 9) ** 2;
    c.fillRect(x * W, base + y * H, 14, 12);
  }
  c.globalAlpha = 1;
  // 고양이
  const sc = Math.min(W / 120, 4.2);
  c.save();
  c.translate(W * 0.5, base + H * 0.02 - 4);
  c.scale(sc, sc);
  drawCat(c, { skin: skinById(save.skin), t: titleT, face: 1, moving: true, walkT: titleT * 0.6, fish: true });
  c.restore();
  c.font = `14px ${fontStack()}`;
}

// ───────── 루프 ─────────
// 장마다 배경음: 집 · 박물관/백화점 · 시장/주방 · 놀이공원 · 연구소 · 성
const CH_SONG = { 1: 'house', 2: 'house', 3: 'museum', 4: 'market', 5: 'market', 6: 'museum', 7: 'park', 8: 'lab', 9: 'castle' };
let musicCh = 1;
// 주소에 ?song=lab 처럼 붙이면 그 곡만 계속 (곡 들어 보기용)
const SONG_TEST = new URLSearchParams(location.search).get('song');
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (scene === 'game' && game) {
    if (!paused && !looking) {
      game.update(dt, game.state === 'play' ? readInput() : { dx: 0, dy: 0, mag: 0, run: false });
      Sound.setMood(game.chased(), game.danger(), game.state === 'play' && !!game.cat.hidden);
      if (!ended && game.state === 'caught' && game.endT > 1.2) endLevel(false);
      if (!ended && game.state === 'win' && game.endT > 0.5) endLevel(true);
    }
    if (tutOn()) tutTick();
    R.draw(paused || looking ? 0 : dt, joy);
    updateHud();
  } else {
    Sound.setMood(false);
    drawTitleBg(dt);
  }
  Sound.setSong(SONG_TEST || scene === 'den' ? 'den' : scene === 'game' || scene === 'chapter' ? CH_SONG[musicCh] || 'house' : 'title');
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// 아래 버튼 아이콘 (ui-*.png 그림이 있으면 그걸로)
// 야옹 버튼 위 작은 고양이 귀 (B안)
const EARS = '<svg class="ears" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true"><path class="ef" d="M12 30 L18 3 Q20 0 23 2 L44 30Z M88 30 L82 3 Q80 0 77 2 L56 30Z"/><path class="es" d="M12 30 L18 3 Q20 0 23 2 L44 30 M88 30 L82 3 Q80 0 77 2 L56 30"/></svg>';
function paintButtons() {
  document.title = t('title.name');
  $('#bLook').innerHTML = buttonHTML('eye', t('btn.map'));
  $('#bMeow').innerHTML = EARS + buttonHTML('meow', t('btn.meow'));
  $('#bAct').innerHTML = buttonHTML('paw', t('btn.act'));
  $('#bPause').setAttribute('aria-label', t('aria.pause'));
  $('#bLook').setAttribute('aria-label', t('aria.map'));
  $('#bMeow').setAttribute('aria-label', t('aria.meow'));
  $('#bAct').setAttribute('aria-label', t('aria.act'));
  hudCache.a = undefined; hudCache.s = undefined; hudCache.e = undefined;
}
// 번역표와 그림을 다 불러온 뒤에 글자를 그린다
Promise.all([loadAll(), langReady]).then(() => {
  paintButtons(); titleScreen();
  // 앱: 그림을 다 불러온 뒤 첫 화면이 그려지면 시작 화면(스플래시)을 걷는다
  const SP = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.SplashScreen;
  if (SP) requestAnimationFrame(() => requestAnimationFrame(() => SP.hide({ fadeOutDuration: 250 }).catch(() => {})));

  // 광고 준비 (필요한 지역이면 Google 동의 창이 먼저 뜬다). 끝나면 설정 화면의 '광고 개인정보 설정' 버튼이 정해진다
  setTimeout(() => Ads.init(), 600);
});

// 테스트용 핸들
window.__sc = {
  get game() { return game; },
  get den() { return den; },
  denData: () => denData(),
  end: (win) => { if (!ended) endLevel(win); },
  start: (i) => { startLevel(i, true); startPlay(); },
  intro: (i) => startLevel(i),
  tut: () => startLevel(-1),
  // 화면 바로 열기 (스토어 스크린샷·시험용)
  go: { title: () => titleScreen(), levels: () => levelScreen(), den: () => denScreen(), skin: (tab) => skinScreen(tab), quest: () => questScreen() },
  step(dt = 1 / 60, inp = { dx: 0, dy: 0, mag: 0, run: false }) { game.update(dt, inp); R.draw(dt, joy); updateHud(); },
  save: () => save,
  ending: () => endingScreen(true),
};
