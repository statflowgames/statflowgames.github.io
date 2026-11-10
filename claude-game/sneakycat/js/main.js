// 화면 흐름, 입력, 저장, 메인 루프
import { LEVELS, CHAPTERS, SKINS } from './levels.js?v=1110225610';
import { Game } from './game.js?v=1110225610';
import { Renderer, FONT } from './render.js?v=1110225610';
import { drawCat, drawFish, drawBonus, ell } from './art.js?v=1110225610';
import { Sound } from './audio.js?v=1110225610';
import { loadAll, IMG, spriteURL } from './assets.js?v=1110225610';
import { inLevel, newInLevel, inChapter, newInChapter, firstOfChapter, guideIcon, entry } from './guide.js?v=1110225610';

const $ = (s) => document.querySelector(s);
const app = $('#app'), cv = $('#cv'), layer = $('#layer');
const R = new Renderer(cv);

// ───────── 저장 ─────────
const KEY = 'sneakycat.claude.v1';
let save = { stars: {}, best: {}, skin: 'gray', sound: true, music: true, vib: true, lefty: false, seenCh: {} };
try { Object.assign(save, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* 저장소 없음 */ }
const store = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* 무시 */ } };
const starsOf = (id) => save.stars[id] || [false, false, false];
const totalStars = () => LEVELS.reduce((n, l) => n + starsOf(l.id).filter(Boolean).length, 0);
const cleared = (id) => !!save.stars[id];
const unlocked = (i) => i === 0 || cleared(LEVELS[i - 1].id) || cleared(LEVELS[i].id);
const skinById = (id) => SKINS.find((s) => s.id === id) || SKINS[0];
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
  yarn: icon(30, 30, (c) => { c.translate(15, 22); drawBonus(c, 'yarn', 0); }),
  tuna: icon(30, 30, (c) => { c.translate(15, 22); drawBonus(c, 'tuna', 0); }),
  gem: icon(30, 30, (c) => { c.translate(15, 22); drawBonus(c, 'gem', 0); }),
};
const skinIcon = (s) => icon(70, 56, (c) => { c.translate(31, 50); c.scale(1.7, 1.7); drawCat(c, { skin: s, t: 0.5, face: 1, fish: false }); });

// ───────── 상태 ─────────
let scene = 'title';
let game = null, levelIdx = 0, paused = false, ended = false;
let titleT = 0;

function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  // 가로 화면(PC)은 넓게 쓰고 버튼을 지도 옆에 둔다. 세로 화면은 위아래를 꽉 채운다.
  const land = vw > vh * 0.95;
  const w = land ? Math.min(vw, Math.round(vh * 1.45)) : Math.min(vw, Math.round(vh * 0.66));
  app.style.width = w + 'px';
  app.classList.toggle('land', land);
  // 아래 버튼 줄(--band 92px) 만큼은 맵을 비워 둔다
  R.top = 66; R.bottom = 98; R.side = 0; R.overW = land ? 1 : 1.3;
  app.classList.toggle('lefty', !!save.lefty);
  R.resize(w, vh);
}
window.addEventListener('resize', resize);
resize();

// ───────── 입력 ─────────
const joy = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0, mag: 0, run: false, R: 58, runAt: 0.68 };
const keys = new Set();
cv.addEventListener('pointerdown', (e) => {
  Sound.unlock();
  if (scene !== 'game' || paused || !game || game.state !== 'play') return;
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
  if (e.code === 'Escape' || e.code === 'KeyP') { paused ? resumeGame() : pauseGame(); }
  if (paused) return;
  if (game.state === 'intro' && (e.code === 'Space' || e.code === 'Enter')) { startPlay(); e.preventDefault(); return; }
  if (e.code === 'Space' || e.code === 'KeyE') { doAct(); e.preventDefault(); }
  if (e.code === 'KeyQ' || e.code === 'KeyM') doMeow();
  if (e.code === 'KeyR' && ended) startLevel(levelIdx);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); joy.active = false; joy.mag = 0; });

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
function setHud(on) { $('#hud').classList.toggle('off', !on); $('#ctrl').classList.toggle('off', !on); }
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
  let nextShown = false;
  for (const ch of CHAPTERS) {
    const lv = LEVELS.map((l, i) => ({ l, i })).filter((x) => x.l.ch === ch.id);
    const got = lv.reduce((n, x) => n + starsOf(x.l.id).filter(Boolean).length, 0);
    html += `<div class="chap">${IMG['chapter-' + ch.id] ? `<div class="banner" style="background-image:url(img/chapter-${ch.id}.webp)"></div>` : ''}<h3>${ch.id}장 · ${ch.name}<span>★ ${got}/${lv.length * 3}</span></h3><p>${ch.sub}</p><button class="gbtn" data-c="${ch.id}">등장인물 · 물건 소개</button><div class="lvgrid">`;
    for (const { l, i } of lv) {
      const st = starsOf(l.id), ok = unlocked(i), cl = cleared(l.id);
      const nx = ok && !cl && !nextShown; if (nx) nextShown = true;
      html += `<button class="lv ${cl ? 'clear' : ''} ${ok ? '' : 'lock'} ${nx ? 'next' : ''}" data-i="${i}"><span class="no">${l.id}</span><span class="nm">${ok ? l.name : '잠겨 있음'}</span><span class="st">${st.map((s) => `<i class="${s ? 'on' : ''}">★</i>`).join('')}</span></button>`;
    }
    html += '</div></div>';
  }
  const el = show(html, 'list');
  on(el, '[data-a=back]', () => titleScreen());
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
    const ok = ts >= s.need;
    html += `<button class="skin ${save.skin === s.id ? 'sel' : ''} ${ok ? '' : 'lock'}" data-s="${s.id}"><img src="${spriteURL('sprite-cat', s) || skinIcon(s)}" alt="">${ok ? s.name : '???'}<small>${ok ? (save.skin === s.id ? '입는 중' : '입어 보기') : `별 ${s.need}개`}</small></button>`;
  }
  const el = show(html + '</div>', 'list');
  on(el, '[data-a=back]', () => titleScreen());
  on(el, '[data-s]', (e, b) => {
    const s = skinById(b.dataset.s);
    if (ts < s.need) { toast(`별 ${s.need}개를 모으면 열려요`); return; }
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
  buildGoals();
  $('#lvTitle').textContent = `${L.id} ${L.name}`;
  const ch = CHAPTERS[L.ch - 1];
  const nw = skipIntro && firstOfChapter(i) ? [] : newInLevel(i), here = inLevel(L).filter((e) => e.id !== 'door');
  const el = show(`<div class="card">
      ${IMG['chapter-' + ch.id] ? `<div class="cbanner" style="background-image:url(img/chapter-${ch.id}.webp)"></div>` : ''}
      <span class="tag">${ch.id}장 · ${ch.name}</span>
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
  const st = chased ? ['쫓기는 중! 숨어요!', 'bad'] : game.cat.riding ? ['청소기 탑승 중', ''] : game.cat.hidden && game.state === 'play' ? ['숨는 중', ''] : d > 0.3 ? ['수상하게 여기는 중…', 'warn'] : game.cat.hasFish ? ['생선 확보! 고양이 문으로', ''] : ['살금살금…', ''];
  set('s', st.join('|'), () => { const s = $('#status'); s.textContent = st[0]; s.className = st[1]; });
}
function pauseGame() {
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
  const newSkins = SKINS.filter((s) => s.need > before && s.need <= after);
  const ch = CHAPTERS[L.ch - 1];
  const last = levelIdx === LEVELS.length - 1;
  const labels = ['생선 들고 탈출', `${ch.bonusName} 모두 챙김`, '한 번도 안 들킴'];
  const el = show(`<div class="card">
      ${IMG[last ? 'legend' : 'win'] ? `<img class="hero" src="${spriteURL(last ? 'legend' : 'win', skinById(save.skin))}" alt="">` : ''}
      <span class="tag">${L.id} · ${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}</span>
      <h1>${last ? '전설의 도둑 고양이!' : '탈출 성공!'}</h1>
      ${last ? '<p>황금 생선까지 훔쳐 냈다! 모든 스테이지 클리어!</p>' : ''}
      ${labels.map((lb, i) => `<div class="goalrow hide" data-g="${i}"><span class="s">★</span>${lb}</div>`).join('')}
      ${newSkins.map((s) => `<div class="unlock">새 고양이 해금: ${s.name}! (옷장에서 입기)</div>`).join('')}
      ${last ? '' : '<button class="btn main" data-a="next">다음 스테이지</button>'}
      <div class="row2"><button class="btn sm" data-a="retry">다시 하기</button><button class="btn sm" data-a="list">목록</button></div>
    </div>`, 'center dim');
  got.forEach((g, i) => setTimeout(() => {
    const r = el.querySelector(`[data-g="${i}"]`);
    if (!r) return;
    r.classList.remove('hide');
    if (g) { r.classList.add('on'); Sound.play('star'); }
  }, 350 + i * 380));
  on(el, '[data-a=next]', () => startLevel(levelIdx + 1));
  on(el, '[data-a=retry]', () => startLevel(levelIdx));
  on(el, '[data-a=list]', () => levelScreen());
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
    if (!paused) {
      game.update(dt, game.state === 'play' ? readInput() : { dx: 0, dy: 0, mag: 0, run: false });
      Sound.setTension(game.chased() ? 1 : 0);
      if (!ended && game.state === 'caught' && game.endT > 1.2) endLevel(false);
      if (!ended && game.state === 'win' && game.endT > 0.5) endLevel(true);
    }
    R.draw(paused ? 0 : dt, joy);
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
};
