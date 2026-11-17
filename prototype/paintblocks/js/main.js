import { getStage, getDaily, todayStr, CHAPTERS, PER, STAGES, MIX } from './gen.js?v=1117195920';
import { Game, drawArt } from './game.js?v=1117195920';
import { Sound } from './audio.js?v=1117195920';
import { initLang, setLang, getLang, tr, tf, LANGS, LANG_NAMES } from './i18n.js?v=1117195920';

const $ = s => document.querySelector(s);
const layer = $('#layer'), hud = $('#hud'), cv = $('#cv'), coach = $('#coach'), toastEl = $('#toast');

// ---------- 저장 ----------
const SAVE_KEY = 'paintblocks.v1';
const fresh = () => ({ stars: {}, times: {}, sound: true, daily: {}, seen: {}, lang: null });
let save = (() => {
  try { return Object.assign(fresh(), JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) { return fresh(); }
})();
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* 저장 불가 환경 */ } };
Sound.set(save.sound);

const cache = {};
const stage = i => (cache[i] ||= getStage(i));
const nextStage = () => { for (let i = 0; i < STAGES; i++) if (!save.stars[i]) return i; return -1; };
const unlocked = i => i === 0 || !!save.stars[i - 1] || !!save.stars[i];
const totalStars = () => Object.values(save.stars).reduce((a, b) => a + b, 0);
const label = i => `${Math.floor(i / PER) + 1}-${(i % PER) + 1}`;
const chName = c => tr(CHAPTERS[c].name);
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const starStr = n => '★'.repeat(n) + '☆'.repeat(3 - n);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- 아이콘 ----------
const IC = {
  menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
  reset: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/></svg>',
  hint: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>',
};
$('#bMenu').innerHTML = IC.menu; $('#bUndo').innerHTML = IC.undo; $('#bReset').innerHTML = IC.reset; $('#bHint').innerHTML = IC.hint;

function applyStaticText() {
  document.title = tr('물감 블록');
  $('#bMenu').setAttribute('aria-label', tr('메뉴'));
  $('#bUndo').setAttribute('aria-label', tr('되돌리기'));
  $('#bReset').setAttribute('aria-label', tr('모두 빼기'));
  $('#bHint').setAttribute('aria-label', tr('힌트'));
}

// ---------- 게임 ----------
let mode = null; // { kind: 'stage', i } | { kind: 'daily', date }
const game = new Game(cv, {
  onWin, toast,
  onChange() { $('#bUndo').disabled = !game.canUndo; },
});

function hudTitle() {
  if (!mode) return;
  $('#lvTitle').innerHTML = mode.kind === 'stage'
    ? `<b>${label(mode.i)}</b><span>${esc(chName(Math.floor(mode.i / PER)))}</span>`
    : `<b>${esc(tr('오늘의 그림'))}</b><span>${mode.date.slice(5).replace('-', '.')}</span>`;
}

function play(m) {
  mode = m;
  const puz = m.kind === 'stage' ? stage(m.i) : getDaily(m.date);
  closeLayer();
  hud.classList.remove('off'); cv.classList.remove('off');
  hudTitle();
  game.load(puz);
  hideCoach();
  if (m.kind === 'stage' && m.i % PER === 0 && !save.seen[m.i]) {
    showCoach(tr(CHAPTERS[m.i / PER].tip), () => { save.seen[m.i] = 1; persist(); });
  }
}

function onWin({ hints, time }) {
  const stars = Math.max(1, 3 - hints);
  let first = false;
  if (mode.kind === 'stage') {
    first = !save.stars[mode.i];
    save.stars[mode.i] = Math.max(save.stars[mode.i] || 0, stars);
    if (!save.times[mode.i] || time < save.times[mode.i]) save.times[mode.i] = Math.round(time);
  } else {
    save.daily[mode.date] = Math.max(save.daily[mode.date] || 0, stars);
  }
  persist();
  const isLast = mode.kind === 'stage' && mode.i === STAGES - 1;
  const el = screen(`
    <div class="card clear">
      <h2>${esc(isLast && first ? tr('모든 그림 완성!') : tr('완성!'))}</h2>
      <canvas class="art"></canvas>
      <div class="stars">${[0, 1, 2].map(k => `<i class="${k < stars ? 'on' : ''}" style="animation-delay:${0.15 + k * 0.15}s">★</i>`).join('')}</div>
      <p class="meta">${esc(tf('시간 {t}', { t: fmtTime(time) }))} · ${esc(hints ? tf('힌트 {n}번', { n: hints }) : tr('힌트 없이!'))}</p>
      ${isLast && first ? `<p class="meta">${esc(tf('{n}장의 그림을 모두 그렸어요. 오늘의 그림은 매일 새로 나와요.', { n: STAGES }))}</p>` : ''}
      <div class="row">
        <button class="btn sm" data-a="list">${esc(tr('목록'))}</button>
        <button class="btn sm" data-a="again">${esc(tr('다시'))}</button>
        ${mode.kind === 'stage' && !isLast
          ? `<button class="btn sm primary" data-a="next">${esc(tr('다음'))}</button>`
          : `<button class="btn sm primary" data-a="title">${esc(tr('처음으로'))}</button>`}
      </div>
    </div>`, 'dim');
  drawArt(el.querySelector('.art'), game.puz, Math.min(220, window.innerWidth * 0.55));
  el.onclick = e => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    Sound.play('click');
    if (a === 'list') showLevels(mode.kind === 'stage' ? mode.i : 0);
    if (a === 'again') play(mode);
    if (a === 'next') play({ kind: 'stage', i: mode.i + 1 });
    if (a === 'title') showTitle();
  };
}

// ---------- 화면 ----------
function screen(html, cls = '') {
  layer.innerHTML = `<div class="scr ${cls}">${html}</div>`;
  layer.classList.remove('off');
  return layer.firstElementChild;
}
function closeLayer() { layer.innerHTML = ''; layer.classList.add('off'); }
function leaveGame() { game.active = false; hud.classList.add('off'); cv.classList.add('off'); hideCoach(); }
const soundLabel = () => esc(save.sound ? tr('소리 켜짐') : tr('소리 꺼짐'));

function showTitle() {
  leaveGame();
  const nx = nextStage(), today = todayStr();
  const el = screen(`
    <div class="logo">
      <div class="blobs"><i class="r"></i><i class="y"></i><i class="b"></i></div>
      <h1>${esc(tr('물감 블록'))}</h1>
      <p>${esc(tr('겹치면 색이 섞이는 두뇌 퍼즐'))}</p>
    </div>
    <div class="menu">
      ${nx >= 0
        ? `<button class="btn big primary" data-a="go">${esc(nx === 0 ? tr('시작하기') : tf('이어하기 · {s}', { s: label(nx) }))}</button>`
        : `<button class="btn big primary" data-a="daily">${esc(tr('오늘의 그림'))}</button>`}
      <button class="btn" data-a="levels">${esc(tr('스테이지'))} <small>★ ${totalStars()} / ${STAGES * 3}</small></button>
      ${nx >= 0 ? `<button class="btn" data-a="daily">${esc(tr('오늘의 그림'))} ${save.daily[today] ? `<small>${starStr(save.daily[today])}</small>` : `<small class="new">${esc(tr('새 그림'))}</small>`}</button>` : ''}
      <div class="row">
        <button class="btn sm" data-a="help">${esc(tr('하는 법'))}</button>
        <button class="btn sm" data-a="sound">${soundLabel()}</button>
      </div>
      <button class="btn sm lang" data-a="lang">${IC.globe}<span>${esc(LANG_NAMES[getLang()])}</span></button>
    </div>`, 'title');
  el.onclick = e => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    Sound.unlock(); Sound.play('click');
    if (a === 'go') play({ kind: 'stage', i: nx });
    if (a === 'levels') showLevels(nx);
    if (a === 'daily') play({ kind: 'daily', date: today });
    if (a === 'help') showHelp(showTitle);
    if (a === 'sound') { save.sound = !save.sound; Sound.set(save.sound); persist(); showTitle(); }
    if (a === 'lang') showLangs(showTitle);
  };
}

function showLangs(back) {
  const cur = getLang();
  const el = screen(`
    <div class="card langs">
      <h2>${IC.globe}<span>${esc(tr('언어'))}</span></h2>
      <div class="lgrid">${LANGS.map(l => `<button class="btn sm ${l === cur ? 'primary' : ''}" data-l="${l}" lang="${l}">${esc(LANG_NAMES[l])}</button>`).join('')}</div>
      <div class="row"><button class="btn sm" data-a="back">${esc(tr('닫기'))}</button></div>
    </div>`, 'dim');
  el.onclick = async e => {
    const b = e.target.closest('[data-l],[data-a]');
    if (!b && e.target !== el) return;
    Sound.play('click');
    if (b?.dataset.l) {
      await setLang(b.dataset.l);
      save.lang = b.dataset.l; persist();
      applyStaticText(); hudTitle();
    }
    back();
  };
}

function showLevels(focus = 0) {
  leaveGame();
  const secs = CHAPTERS.map((ch, c) => {
    let got = 0;
    const btns = [];
    for (let k = 0; k < PER; k++) {
      const i = c * PER + k, st = save.stars[i] || 0, open = unlocked(i);
      got += st;
      btns.push(`<button class="lv ${st ? 'done' : open ? 'open' : 'lock'}" data-i="${i}" ${open ? '' : 'disabled'}>
        ${st ? '<canvas></canvas>' : `<b>${k + 1}</b>`}
        <span class="st">${st ? starStr(st) : open ? '' : '🔒'}</span>
      </button>`);
    }
    return `<section class="ch" id="ch${c}">
      <h3><span>${esc(tf('{n}장 · {name}', { n: c + 1, name: chName(c) }))}</span><small>★ ${got} / ${PER * 3}</small></h3>
      <div class="grid">${btns.join('')}</div>
    </section>`;
  }).join('');
  const el = screen(`
    <div class="top"><button class="ib" data-a="back" aria-label="${esc(tr('뒤로'))}">${IC.back}</button><h2>${esc(tr('스테이지'))}</h2><span class="tot">★ ${totalStars()}</span></div>
    <div class="list">${secs}</div>`, 'levels');
  el.querySelectorAll('.lv.done').forEach(b => drawArt(b.querySelector('canvas'), stage(+b.dataset.i), 46));
  const sec = el.querySelector('#ch' + Math.floor(Math.max(0, focus) / PER));
  if (sec && focus >= PER) requestAnimationFrame(() => sec.scrollIntoView({ block: 'start' }));
  el.onclick = e => {
    const t = e.target.closest('[data-a],[data-i]');
    if (!t) return;
    Sound.unlock(); Sound.play('click');
    if (t.dataset.a === 'back') showTitle();
    else if (t.dataset.i != null) play({ kind: 'stage', i: +t.dataset.i });
  };
}

const chip = m => `<i class="chip" style="background:${MIX[m]}"></i>`;
function showHelp(back) {
  const steps = [
    '아래 서랍의 물감 블록을 끌어서 판 위에 놓아요.',
    '블록이 겹친 칸은 물감이 섞여요.',
    '위의 완성 그림과 똑같이 칠하면 성공! 블록은 모두 써야 해요.',
    '칸 속 작은 점은 그 칸에 와야 할 색이에요.',
    '3장부터는 블록을 톡 눌러 돌릴 수 있어요.',
  ];
  const el = screen(`
    <div class="card help">
      <h2>${esc(tr('하는 법'))}</h2>
      <ol>${steps.map(s => `<li>${esc(tr(s))}</li>`).join('')}</ol>
      <div class="mixes">
        <p>${chip(1)}+${chip(2)}=${chip(3)} ${esc(tr('주황'))}</p>
        <p>${chip(2)}+${chip(4)}=${chip(6)} ${esc(tr('초록'))}</p>
        <p>${chip(1)}+${chip(4)}=${chip(5)} ${esc(tr('보라'))}</p>
        <p>${chip(1)}+${chip(2)}+${chip(4)}=${chip(7)} ${esc(tr('고동'))}</p>
      </div>
      <p class="meta">${esc(tr('같은 색끼리 겹치면 색이 그대로예요. 힌트를 쓰면 별이 하나씩 줄어요.'))}</p>
      <div class="row"><button class="btn sm primary" data-a="ok">${esc(tr('알겠어요'))}</button></div>
    </div>`, 'dim');
  el.onclick = e => {
    if (e.target.closest('[data-a]') || e.target === el) { Sound.play('click'); back(); }
  };
}

function showMenu() {
  if (game.won) return;
  const el = screen(`
    <div class="card pause">
      <h2>${esc(tr('잠깐 멈춤'))}</h2>
      <button class="btn" data-a="resume">${esc(tr('계속하기'))}</button>
      <button class="btn" data-a="levels">${esc(tr('스테이지 목록'))}</button>
      <button class="btn" data-a="help">${esc(tr('하는 법'))}</button>
      <button class="btn" data-a="sound">${soundLabel()}</button>
      <button class="btn" data-a="lang">${IC.globe}<span>${esc(LANG_NAMES[getLang()])}</span></button>
      <button class="btn" data-a="title">${esc(tr('처음 화면'))}</button>
    </div>`, 'dim');
  el.onclick = e => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a && e.target !== el) return;
    Sound.play('click');
    if (!a || a === 'resume') closeLayer();
    if (a === 'levels') showLevels(mode.kind === 'stage' ? mode.i : 0);
    if (a === 'help') showHelp(closeLayer);
    if (a === 'sound') { save.sound = !save.sound; Sound.set(save.sound); persist(); showMenu(); }
    if (a === 'lang') showLangs(showMenu);
    if (a === 'title') showTitle();
  };
}

// ---------- 안내 말풍선 · 알림 ----------
let coachDone = null;
function showCoach(text, done) {
  coachDone = done;
  coach.innerHTML = `<p>${esc(text)}</p><button class="btn sm primary">${esc(tr('알겠어요'))}</button>`;
  coach.classList.remove('off');
}
function hideCoach() {
  coach.classList.add('off');
  if (coachDone) { const f = coachDone; coachDone = null; f(); }
}
coach.onclick = () => { Sound.unlock(); Sound.play('click'); hideCoach(); };

let toastT = 0;
function toast(msg) {
  toastEl.textContent = tr(msg); toastEl.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2200);
}

// ---------- HUD ----------
$('#bMenu').onclick = () => { Sound.unlock(); Sound.play('click'); showMenu(); };
$('#bUndo').onclick = () => { Sound.unlock(); game.undo(); };
$('#bReset').onclick = () => { Sound.unlock(); game.reset(); };
$('#bHint').onclick = () => {
  Sound.unlock();
  if (game.won) return;
  if (!game.hint()) toast('더 알려줄 블록이 없어요');
  else if (game.hints === 1) toast('힌트를 쓰면 별이 하나 줄어요');
};
window.addEventListener('keydown', e => {
  if (!game.active || !layer.classList.contains('off')) return;
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); game.undo(); }
  else if (k === 'z' || k === 'backspace') game.undo();
  else if (k === 'r') game.reset();
  else if (k === 'escape') showMenu();
});

// 테스트용 손잡이
window.__pb = {
  game, play, showTitle, showLevels, showHelp, showMenu, save: () => save,
  start: i => play({ kind: 'stage', i }),
  solve() { while (game.hint()); },
  lang: async l => { await setLang(l); applyStaticText(); hudTitle(); },
  all: () => { for (let i = 0; i < STAGES; i++) stage(i); return Object.keys(cache).length; },
};

(async () => {
  await initLang(save.lang);
  applyStaticText();
  showTitle();
})();
