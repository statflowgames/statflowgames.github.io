// 화면 흐름, 입력, 저장, 메인 루프
import { LEVELS, CHAPTERS, SKINS, HARD_FROM } from './levels.js?v=1112011451';
import { Game } from './game.js?v=1112011451';
import { Renderer, FONT } from './render.js?v=1112011451';
import { drawCat, drawFish, drawBonus, ell } from './art.js?v=1112011451';
import { Sound } from './audio.js?v=1112011451';
import { loadAll, IMG, spriteURL } from './assets.js?v=1112011451';
import { inLevel, newInLevel, inChapter, newInChapter, firstOfChapter, guideIcon, entry } from './guide.js?v=1112011451';

const $ = (s) => document.querySelector(s);
const app = $('#app'), cv = $('#cv'), layer = $('#layer');
const R = new Renderer(cv);

// ───────── 저장 ─────────
const KEY = 'sneakycat.claude.v1';
let save = { stars: {}, best: {}, skin: 'gray', sound: true, music: true, vib: true, lefty: false, seenCh: {}, ending: false };
try { Object.assign(save, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* 저장소 없음 */ }
const store = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* 무시 */ } };
const starsOf = (id) => save.stars[id] || [false, false, false];
const totalStars = () => LEVELS.reduce((n, l) => n + starsOf(l.id).filter(Boolean).length, 0);
const cleared = (id) => !!save.stars[id];
const unlocked = (i) => i === 0 || cleared(LEVELS[i - 1].id) || cleared(LEVELS[i].id);
const skinById = (id) => SKINS.find((s) => s.id === id) || SKINS[0];
const skinOpen = (s, ts = totalStars()) => (s.ending ? !!save.ending : ts >= s.need);
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
  R.top = compact ? 54 : 66; R.bottom = compact ? 80 : 98;
  // 가로 화면은 양옆 정보판 자리를 비우고 맵을 높이보다 1.3배 크게,
  // 세로 화면은 맵을 가로 폭에 맞추고 위아래가 넘치면 카메라가 고양이를 따라간다
  R.side = land ? Math.min(440, Math.max(0, (w - vh * 0.75) / 2)) : 0;
  R.overW = land ? 1 : 1.3; R.overH = land ? 1.3 : 1.5;
  app.classList.toggle('lefty', !!save.lefty);
  R.resize(w, vh);
  placeSides();
}
window.addEventListener('resize', resize);
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
bLook.addEventListener('contextmenu', (e) => e.preventDefault());
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
function toast(msg, ms = 2200) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms);
}

// ───────── 화면들 ─────────
function show(html, cls = '') {
  layer.innerHTML = `<div class="scr ${cls}">${html}</div>`;
  return layer.firstElementChild;
}
function hideLayer() { layer.innerHTML = ''; }
function setHud(on) { for (const id of ['#hud', '#ctrl', '#sideL', '#sideR']) $(id).classList.toggle('off', !on); }
const on = (el, sel, fn) => el.querySelectorAll(sel).forEach((b) => b.addEventListener('click', (e) => { Sound.unlock(); Sound.play('click'); fn(e, b); }));

function titleScreen() {
  scene = 'title'; game = null; setHud(false);
  const el = show(`
    <div class="logo">도둑 고양이<small>오늘 밤도 생선은 내 거야</small></div>
    <div class="tbtns">
      <button class="btn main" data-a="play">${totalStars() ? '이어하기' : '시작하기'}</button>
      <button class="btn pink" data-a="skin">고양이 옷장</button>
      <div class="toggles">
        <button class="tg ${save.sound ? 'on' : ''}" data-t="sound">효과음</button>
        <button class="tg ${save.music ? 'on' : ''}" data-t="music">음악</button>
        <button class="tg ${save.vib ? 'on' : ''}" data-t="vib">진동</button>
        <button class="tg ${save.lefty ? 'on' : ''}" data-t="lefty">왼손</button>
      </div>
      <div class="credit">StatFlow Games</div>
    </div>`, 'center title');
  on(el, '[data-a=play]', () => levelScreen());
  on(el, '[data-a=skin]', () => skinScreen());
  on(el, '[data-t]', (e, b) => {
    const k = b.dataset.t; save[k] = !save[k]; store();
    b.classList.toggle('on', save[k]);
    if (k === 'sound') Sound.setSound(save.sound);
    if (k === 'music') Sound.setMusic(save.music);
    if (k === 'lefty') app.classList.toggle('lefty', save.lefty);
  });
}

function levelScreen() {
  scene = 'levels'; game = null; setHud(false);
  let html = `<div class="top"><button class="back" data-a="back">‹</button><h2>스테이지</h2><div class="starsum">★ ${totalStars()}/${LEVELS.length * 3}</div></div>`;
  if (save.ending) html += `<button class="btn endbtn" data-a="ending">🏆 엔딩 다시 보기</button>`;
  let nextShown = false;
  // 지금 할 스테이지가 있는 장만 펼치고 나머지는 접어 둔다
  const nextIdx = LEVELS.findIndex((l, i) => unlocked(i) && !cleared(l.id));
  const openCh = nextIdx >= 0 ? LEVELS[nextIdx].ch : LEVELS[LEVELS.length - 1].ch;
  for (const ch of CHAPTERS) {
    const lv = LEVELS.map((l, i) => ({ l, i })).filter((x) => x.l.ch === ch.id);
    if (!lv.length) {
      html += `<div class="chap soon"><h3>${ch.id}장 · ${ch.name}<span>준비 중</span></h3><p>${ch.sub} — 곧 열려요!</p></div>`;
      continue;
    }
    const got = lv.reduce((n, x) => n + starsOf(x.l.id).filter(Boolean).length, 0);
    const hard = lv.some((x) => x.l.hard);
    html += `<div class="chap ${ch.id === openCh ? '' : 'fold'}" data-ch="${ch.id}">${IMG['chapter-' + ch.id] ? `<div class="banner" style="background-image:url(img/chapter-${ch.id}.webp)"></div>` : ''}<h3 data-f="${ch.id}">${ch.id}장 · ${ch.name}${hard ? ' <em class="hardtag">🔥</em>' : ''}<span>★ ${got}/${lv.length * 3} <b class="fa">▾</b></span></h3><p>${ch.sub}</p><button class="gbtn" data-c="${ch.id}">등장인물 · 물건 소개</button><div class="lvgrid">`;
    for (const { l, i } of lv) {
      const st = starsOf(l.id), ok = unlocked(i), cl = cleared(l.id);
      const nx = ok && !cl && !nextShown; if (nx) nextShown = true;
      if (l.no === HARD_FROM) html += `<div class="hardline">🔥 여기부터 고난도 — 경비가 더 빠르고 더 멀리 봐요</div>`;
      html += `<button class="lv ${cl ? 'clear' : ''} ${ok ? '' : 'lock'} ${nx ? 'next' : ''} ${l.hard ? 'hard' : ''}" data-i="${i}"><span class="no">${l.id}</span><span class="nm">${ok ? l.name : '잠겨 있음'}</span><span class="st">${st.map((s) => `<i class="${s ? 'on' : ''}">★</i>`).join('')}</span></button>`;
    }
    html += '</div></div>';
  }
  const el = show(html, 'list');
  on(el, '[data-a=back]', () => titleScreen());
  on(el, '[data-a=ending]', () => endingScreen(false));
  el.querySelectorAll('[data-f]').forEach((h) => h.addEventListener('click', () => { Sound.play('click'); h.parentElement.classList.toggle('fold'); }));
  on(el, '[data-c]', (e, b) => chapterScreen(+b.dataset.c, null));
  on(el, '[data-i]', (e, b) => {
    const i = +b.dataset.i;
    if (!unlocked(i)) { toast('앞 스테이지를 먼저 깨야 해요'); return; }
    startLevel(i);
  });
  const nx = el.querySelector('.lv.next');
  if (nx) nx.scrollIntoView({ block: 'center' });
}

function skinScreen() {
  scene = 'skins'; game = null; setHud(false);
  const ts = totalStars();
  let html = `<div class="top"><button class="back" data-a="back">‹</button><h2>고양이 옷장</h2><div class="starsum">★ ${ts}</div></div><div class="skins">`;
  for (const s of SKINS) {
    const ok = skinOpen(s, ts);
    html += `<button class="skin ${save.skin === s.id ? 'sel' : ''} ${ok ? '' : 'lock'}" data-s="${s.id}"><img src="${spriteURL(s.crown && IMG['sprite-cat-king'] ? 'sprite-cat-king' : 'sprite-cat', s) || skinIcon(s)}" alt="">${ok ? (s.crown ? '👑 ' : '') + s.name : '???'}<small>${ok ? (save.skin === s.id ? '입는 중' : '입어 보기') : s.ending ? '엔딩을 보면 열려요' : `별 ${s.need}개`}</small></button>`;
  }
  const el = show(html + '</div>', 'list');
  on(el, '[data-a=back]', () => titleScreen());
  on(el, '[data-s]', (e, b) => {
    const s = skinById(b.dataset.s);
    if (!skinOpen(s, ts)) { toast(s.ending ? '99번째 스테이지를 깨고 엔딩을 보면 열려요' : `별 ${s.need}개를 모으면 열려요`); return; }
    save.skin = s.id; store(); skinScreen();
  });
}

// ───────── 장 소개 (등장인물·물건) ─────────
const guideRow = (e, isNew) => `<div class="gi ${isNew ? 'new' : ''}"><img src="${guideIcon(e.id)}" alt=""><div><b>${e.name}${isNew ? '<em>NEW</em>' : ''}</b><span>${e.desc}</span></div></div>`;
function chapterScreen(chId, next) {
  scene = 'chapter'; game = null; setHud(false);
  save.seenCh[chId] = true; store();
  const ch = CHAPTERS[chId - 1], all = inChapter(chId), nw = newInChapter(chId);
  const sec = (kind, title) => {
    const list = all.filter((e) => e.kind === kind);
    return list.length ? `<h4>${title}</h4>${list.map((e) => guideRow(e, chId > 1 && nw.has(e.id))).join('')}` : '';
  };
  const el = show(`<div class="top"><button class="back" data-a="back">‹</button><h2>${ch.id}장 · ${ch.name}</h2></div>
    <div class="chap guide">
      ${IMG['chapter-' + ch.id] ? `<div class="banner" style="background-image:url(img/chapter-${ch.id}.webp)"></div>` : ''}
      <p>${ch.sub} — 이번 장에서 만나는 것들이에요.</p>
      ${sec('who', '등장인물')}
      ${sec('item', '물건과 장치')}
    </div>
    <div class="gfoot"><button class="btn main" data-a="go">${next ? '잠입하러 가기' : '알겠어요'}</button></div>`, 'list');
  on(el, '[data-a=back]', () => levelScreen());
  on(el, '[data-a=go]', () => (next ? next() : levelScreen()));
}

// ───────── 게임 ─────────
function startLevel(i, skipIntro = false) {
  const L = LEVELS[i];
  if (!skipIntro && firstOfChapter(i) && !save.seenCh[L.ch]) { chapterScreen(L.ch, () => startLevel(i, true)); return; }
  levelIdx = i; paused = false; ended = false;
  looking = false; R.peek = false; app.classList.remove('looking');
  game = new Game(L);
  game.fx = (name) => {
    Sound.play(name);
    if (name === 'caught') vib([60, 40, 120]);
    else if (name === 'alert' || name === 'siren') vib(40);
    else if (name === 'fish') vib(25);
  };
  scene = 'game';
  R.focus = game.fish;
  R.setGame(game, skinById(save.skin));
  setHud(true);
  buildSides(L, i);
  buildGoals();
  $('#lvTitle').textContent = `${L.id} ${L.name}`;
  const ch = CHAPTERS[L.ch - 1];
  const nw = skipIntro && firstOfChapter(i) ? [] : newInLevel(i), here = inLevel(L).filter((e) => e.id !== 'door');
  const el = show(`<div class="card">
      ${IMG['chapter-' + ch.id] ? `<div class="cbanner" style="background-image:url(img/chapter-${ch.id}.webp)"></div>` : ''}
      <span class="tag">${ch.id}장 · ${ch.name}</span>${L.hard ? '<span class="tag hardt">🔥 고난도</span>' : ''}
      <h1>${L.name}</h1>
      <p class="tip">${L.hint}</p>
      ${nw.length ? `<div class="newbox"><div class="nh">새로 등장!</div>${nw.map((e) => guideRow(e, false)).join('')}</div>` : ''}
      <div class="chips"><span>이번 스테이지</span>${here.map((e) => `<button class="chip" data-e="${e.id}"><img src="${guideIcon(e.id)}" alt="${e.name}"></button>`).join('')}</div>
      <div class="goalrow on"><span class="s">★</span>${L.golden ? '황금 생선' : '생선'}을 물고 고양이 문으로 탈출</div>
      <div class="goalrow on"><span class="s">★</span>${ch.bonusName} 2개 모두 챙기기</div>
      <div class="goalrow on"><span class="s">★</span>한 번도 들키지 않기 (!)</div>
      <button class="btn main" data-a="go">잠입 시작</button>
    </div>`, 'center dim');
  on(el, '[data-a=go]', () => startPlay());
  on(el, '[data-e]', (e, b) => { const g = entry(b.dataset.e); toast(`${g.name} — ${g.desc}`, 3600); });
}
// 가로 화면에서 맵 양옆 빈자리에 스테이지 정보와 조작법
function buildSides(L, i) {
  $('#sideL').innerHTML = `<h3>${L.id} ${L.name}</h3><p>${L.hint}</p>
    <h4>이번 스테이지</h4>${inLevel(L).filter((e) => e.id !== 'door').map((e) => guideRow(e, newInLevel(i).includes(e))).join('')}`;
  const k = (a, b) => `<div class="key"><span>${a}</span><kbd>${b}</kbd></div>`;
  $('#sideR').innerHTML = `<h3>조작</h3>${k('이동 (살금살금)', '방향키 · WASD')}${k('달리기', 'Shift')}${k('행동', 'Space')}${k('야옹', 'Q')}${k('맵 전체 보기', 'Tab 누르고 있기')}${k('일시정지', 'Esc')}${k('다시 하기 (끝난 뒤)', 'R')}
    <h4>알아 두기</h4>
    <p class="tipl">· 달리기 발소리, 야옹, 꽃병 소리는 문을 돌아 퍼져요.</p>
    <p class="tipl">· 탁자·침대·상자 밑과 고양이 문 안은 안 보여요.</p>
    <p class="tipl">· 화면을 끌어서 움직여도 돼요.</p>`;
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
    `<div class="g eye" id="gE">안 들킴</div>`;
}
let hudCache = {};
function updateHud() {
  if (scene !== 'game' || !game) return;
  const set = (k, v, fn) => { if (hudCache[k] !== v) { hudCache[k] = v; fn(v); } };
  set('f', game.fish.taken, (v) => $('#gF').classList.toggle('on', v));
  game.bonus.forEach((b, i) => set('b' + i, b.taken, (v) => $('#gB' + i).classList.toggle('on', v)));
  set('e', game.spotted, (v) => { const e = $('#gE'); e.classList.toggle('bad', v); e.textContent = v ? '들켰다' : '안 들킴'; });
  const a = game.actionTarget();
  set('a', a ? a.label : '', (v) => {
    const b = $('#bAct'); b.classList.toggle('idle', !v); b.textContent = v || '행동';
    b.classList.remove('pop'); if (v) { void b.offsetWidth; b.classList.add('pop'); }
  });
  const cd = game.cat.meowCD / 3.5;
  $('#bMeow').style.setProperty('--cd', cd.toFixed(3));
  const chased = game.chased(), d = game.danger();
  const st = looking ? ['둘러보는 중…', 'warn'] : chased ? ['쫓기는 중! 숨어요!', 'bad'] : game.cat.riding ? ['청소기 탑승 중', ''] : game.cat.hidden && game.state === 'play' ? ['숨는 중', ''] : d > 0.3 ? ['수상하게 여기는 중…', 'warn'] : game.cat.hasFish ? ['생선 확보! 고양이 문으로', ''] : ['살금살금…', ''];
  set('s', st.join('|'), () => { const s = $('#status'); s.textContent = st[0]; s.className = st[1]; });
}
function pauseGame() {
  setLook(false);
  if (!game || paused || ended) return;
  paused = true; joy.active = false;
  const el = show(`<div class="card">
      <h1>일시정지</h1>
      <p>${game.L.id} ${game.L.name}</p>
      <button class="btn main" data-a="resume">계속하기</button>
      <button class="btn" data-a="retry">처음부터</button>
      <button class="btn" data-a="list">스테이지 목록</button>
      <div class="toggles">
        <button class="tg ${save.sound ? 'on' : ''}" data-t="sound">효과음</button>
        <button class="tg ${save.music ? 'on' : ''}" data-t="music">음악</button>
        <button class="tg ${save.lefty ? 'on' : ''}" data-t="lefty">왼손</button>
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

const FAIL = ['생선은 다음 기회에…', '고양이 털이 너무 눈에 띄었다', '살금살금이 부족했다!', '집사의 눈은 매서웠다'];
function endLevel(win) {
  ended = true;
  const L = game.L;
  if (!win) {
    const el = show(`<div class="card">
        ${IMG.caught ? `<img class="hero" src="${spriteURL('caught', skinById(save.skin))}" alt="">` : '<div class="big">😿</div>'}
        <h1>잡혔다!</h1>
        <p>${FAIL[(Math.random() * FAIL.length) | 0]}</p>
        <button class="btn main" data-a="retry">다시 도전</button>
        <button class="btn" data-a="list">스테이지 목록</button>
      </div>`, 'center dim');
    on(el, '[data-a=retry]', () => startLevel(levelIdx));
    on(el, '[data-a=list]', () => levelScreen());
    return;
  }
  const before = totalStars();
  const got = game.stars();
  const old = starsOf(L.id);
  save.stars[L.id] = got.map((s, i) => s || old[i]);
  const t = game.elapsed;
  if (!save.best[L.id] || t < save.best[L.id]) save.best[L.id] = t;
  store();
  const after = totalStars();
  const newSkins = SKINS.filter((s) => !s.ending && s.need > before && s.need <= after);
  const ch = CHAPTERS[L.ch - 1];
  const last = !!L.final, golden = !!L.golden, fake = golden && !last;
  const nextL = LEVELS[levelIdx + 1];
  const soon = !last && !nextL;
  const labels = ['생선 들고 탈출', `${ch.bonusName} 모두 챙김`, '한 번도 안 들킴'];
  const el = show(`<div class="card">
      ${(() => { const nm = golden ? 'legend' : !nextL || nextL.ch !== L.ch ? (IMG['clear-' + L.ch] ? 'clear-' + L.ch : 'win') : 'win'; return IMG[nm] ? `<img class="hero" src="${spriteURL(nm, skinById(save.skin))}" alt="">` : ''; })()}
      <span class="tag">${L.id} · ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}</span>
      <h1>${last ? '전설의 도둑 고양이!' : fake ? '황금 생선…인데?' : '탈출 성공!'}</h1>
      ${last ? '<p>진짜 황금 생선을 손에 넣었다! 99스테이지 모두 클리어!</p>' : ''}
      ${fake ? '<p>훔친 황금 생선이 이상하게 가볍다. 톡톡… 플라스틱?! <b>진짜는 생선왕의 성에 있다!</b></p>' : ''}
      ${soon ? '<p class="soonp">다음 장은 지금 준비 중이에요. 조금만 기다려 주세요!</p>' : ''}
      ${labels.map((lb, i) => `<div class="goalrow hide" data-g="${i}"><span class="s">★</span>${lb}</div>`).join('')}
      ${newSkins.map((s) => `<div class="unlock">새 고양이 해금: ${s.name}! (옷장에서 입기)</div>`).join('')}
      ${last ? '<button class="btn main" data-a="ending">엔딩 보기</button>' : soon ? '' : `<button class="btn main" data-a="next">다음 스테이지${nextL.no === HARD_FROM ? ' 🔥' : ''}</button>`}
      <div class="row2"><button class="btn sm" data-a="retry">다시 하기</button><button class="btn sm" data-a="list">목록</button></div>
    </div>`, 'center dim');
  got.forEach((g, i) => setTimeout(() => {
    const r = el.querySelector(`[data-g="${i}"]`);
    if (!r) return;
    r.classList.remove('hide');
    if (g) { r.classList.add('on'); Sound.play('star'); }
  }, 350 + i * 380));
  on(el, '[data-a=next]', () => startLevel(levelIdx + 1));
  on(el, '[data-a=ending]', () => endingScreen(true));
  on(el, '[data-a=retry]', () => startLevel(levelIdx));
  on(el, '[data-a=list]', () => levelScreen());
}

// ───────── 엔딩 ─────────
const ENDING = [
  { img: 'ending-1', text: '생선왕의 성 가장 깊은 방. 드디어 찾았다 — 진짜 황금 생선!', bg: ['#2a1d3e', '#6b4a1e'] },
  { img: 'ending-2', text: '경보가 울리고 온 성이 뒤집혔지만… 이미 늦었지롱!', bg: ['#1b1838', '#5a2240'] },
  { img: 'ending-3', text: '새벽 지붕 위. 그동안 모은 보물을 하나하나 세어 본다.', bg: ['#3a2f6b', '#f2a65a'] },
  { img: 'ending-4', text: '아침. 집사는 아무것도 모른다. 오늘도 평화로운 하루.', bg: ['#f6d9a8', '#f2b8a0'] },
];
const CREDITS = ['도둑 고양이', '', '기획 · 그림', 'StatFlow Games', '', '프로그램 · 레벨 디자인', 'Claude', '', '등장 인물', '잠옷 집사 · 정장 집사 · 강아지', '경비원 · 생선가게 사장님', '요리사 · 관리인 아저씨', '경비 로봇 · 생선왕의 기사', '', '그리고', '끝까지 살금살금 걸어 준 당신', '', '고마워요!'];
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
    const el = show(`<div class="ending">${art}<div class="etext"><p>${p.text}</p><small>${i + 1} / ${ENDING.length} · 눌러서 계속</small></div></div>`, 'full');
    el.querySelector('.ending').addEventListener('click', () => { Sound.play('click'); i++; if (i < ENDING.length) panel(); else credits(); });
  };
  const credits = () => {
    const bg = IMG['ending-bg'] ? `style="background-image:url(img/ending-bg.webp)"` : '';
    const el = show(`<div class="credits" ${bg}><div class="roll">${CREDITS.map((l, k) => `<div class="${k === 0 ? 'ct' : l && CREDITS[k + 1] && !CREDITS[k - 1] ? 'ch' : ''}">${l || '&nbsp;'}</div>`).join('')}</div><small class="skip">눌러서 넘기기</small></div>`, 'full');
    const go = () => { clearTimeout(tm); record(); };
    const tm = setTimeout(go, 16000);
    el.querySelector('.credits').addEventListener('click', go);
  };
  const record = () => {
    const ts = totalStars(), all = LEVELS.length * 3, cl = LEVELS.filter((l) => cleared(l.id)).length;
    const el = show(`<div class="card">
        <span class="tag">THE END</span>
        <h1>전설의 도둑 고양이</h1>
        <div class="goalrow on"><span class="s">★</span>모은 별 ${ts} / ${all}</div>
        <div class="goalrow on"><span class="s">✓</span>깬 스테이지 ${cl} / ${LEVELS.length}</div>
        <div class="unlock">엔딩 보상: 👑 생선왕 고양이 (옷장에서 입기)</div>
        <button class="btn main" data-a="skin">옷장 가기</button>
        <button class="btn" data-a="list">스테이지 목록</button>
      </div>`, 'center dim');
    on(el, '[data-a=skin]', () => skinScreen());
    on(el, '[data-a=list]', () => levelScreen());
  };
  panel();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { Sound.suspend(); if (scene === 'game' && game && game.state === 'play') pauseGame(); }
  else Sound.resume();
});

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
    } else c.drawImage(im, (W - w) / 2, (H - h) / 2 + bob, w, h);
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
  c.font = `14px ${FONT}`;
}

// ───────── 루프 ─────────
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (scene === 'game' && game) {
    if (!paused && !looking) {
      game.update(dt, game.state === 'play' ? readInput() : { dx: 0, dy: 0, mag: 0, run: false });
      Sound.setTension(game.chased() ? 1 : 0);
      if (!ended && game.state === 'caught' && game.endT > 1.2) endLevel(false);
      if (!ended && game.state === 'win' && game.endT > 0.5) endLevel(true);
    }
    R.draw(paused || looking ? 0 : dt, joy);
    updateHud();
  } else {
    Sound.setTension(0);
    drawTitleBg(dt);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
loadAll().then(() => titleScreen());

// 테스트용 핸들
window.__sc = {
  get game() { return game; },
  start: (i) => { startLevel(i, true); startPlay(); },
  intro: (i) => startLevel(i),
  step(dt = 1 / 60, inp = { dx: 0, dy: 0, mag: 0, run: false }) { game.update(dt, inp); R.draw(dt, joy); updateHud(); },
  save: () => save,
  ending: () => endingScreen(true),
};
