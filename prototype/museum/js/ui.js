// DOM 도우미, 패널, 알림, 효과, 대화(Talk) — 세로 720×1280
'use strict';

let MAN = {};
const A = key => (MAN[key] ? MAN[key].url : '');
const has = key => !!MAN[key];
const wait = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const fmt = n => Math.round(n).toLocaleString('ko-KR');
const relicImg = id => A('relic/' + id);
// 원정 종류 아이콘 (새 그림)
const kindIcon = k => `<img class="ki" src="${A('icon/x_' + { record: 'archive', dig: 'survey', dive: 'dive' }[k])}">`;

function el(tag, cls, html, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}
function btn(label, cls, onClick, parent) {
  const b = el('button', 'btn ' + (cls || ''), `<span>${label}</span>`, parent);
  b.addEventListener('click', e => { e.stopPropagation(); if (b.disabled) return; SFX.play('click'); onClick && onClick(e); });
  return b;
}
// me = 관장 (G.dir: m/f)
const person = id => id === 'me' ? PEOPLE['director_' + ((typeof G !== 'undefined' && G && G.dir) || 'm')] : PEOPLE[id];
// 원작 표정 이름 → 현대 인물 표정 8종
const FACE_ALIAS = { laugh: 'smile', sad: 'worried', determined: 'proud', angry: 'worried', scared: 'surprised', special: 'moved' };
const faceSrc = (p, f) => A(`face/${p.face}_${f || 'neutral'}`) || A(`face/${p.face}_${FACE_ALIAS[f]}`) || A(`face/${p.face}_neutral`);
function avatar(id, size = 120) {
  const p = person(id);
  if (p && p.face) return `<img class="ava" style="width:${size}px;height:${size}px" src="${A('face/' + p.face + '_smile')}">`;
  return `<div class="ava temp" style="width:${size}px;height:${size}px;background:${p ? p.color : '#888'};font-size:${size * 0.42}px">${p ? p.mark : '?'}</div>`;
}

const UI = {
  L: {},
  init() {
    const root = document.getElementById('ui');
    for (const k of ['hud', 'scene', 'panel', 'story', 'fx', 'toast']) {
      UI.L[k] = el('div', 'layer L-' + k, null, root);
    }
  },
  toast(text, kind) {
    const t = el('div', 'toast ' + (kind || ''), text, UI.L.toast);
    setTimeout(() => t.classList.add('out'), 2400);
    setTimeout(() => t.remove(), 2900);
  },
  banner(title, sub, kind) {               // 화면 가운데 큰 띠 (사건 · 세트 완성)
    const b = el('div', 'banner ' + (kind || ''), `<b>${title}</b>${sub ? `<span>${sub}</span>` : ''}`, UI.L.toast);
    setTimeout(() => b.classList.add('out'), 2600);
    setTimeout(() => b.remove(), 3200);
  },
  panel(cls, title, onClose) {
    const L = UI.L.panel; L.innerHTML = '';
    L.classList.add('on');
    const dim = el('div', 'dim', null, L);
    const p = el('div', 'panel pop ' + (cls || ''), title ? `<h2>${title}</h2>` : '', L);
    const close = () => { L.innerHTML = ''; L.classList.remove('on'); onClose && onClose(); };
    const x = el('button', 'x', '✕', p); x.onclick = e => { e.stopPropagation(); SFX.play('click'); close(); };
    dim.onclick = close;
    p.close = close;
    return p;
  },
  closePanel() { UI.L.panel.innerHTML = ''; UI.L.panel.classList.remove('on'); },
  get panelOpen() { return UI.L.panel.classList.contains('on'); },

  // 떠오르는 글자 (+5, ❤)
  float(text, x, y, cls) {
    const f = el('div', 'float ' + (cls || ''), text, UI.L.fx);
    f.style.left = x + 'px'; f.style.top = y + 'px';
    setTimeout(() => f.remove(), 1300);
  },
  confetti(n = 60) {
    const cols = ['#e8a33d', '#1e7f86', '#c2603f', '#f5dfa6', '#9dbfa4', '#c9a227', '#ffffff'];
    for (let i = 0; i < n; i++) {
      const c = el('div', 'confetti', null, UI.L.fx);
      c.style.left = rand(0, 720) + 'px';
      c.style.background = pick(cols);
      c.style.animationDuration = rand(1.6, 3) + 's';
      c.style.animationDelay = rand(0, .5) + 's';
      c.style.setProperty('--dx', rand(-120, 120) + 'px');
      c.style.setProperty('--r', rand(-720, 720) + 'deg');
      setTimeout(() => c.remove(), 3800);
    }
  },
  // 손가락 안내 (튜토리얼)
  point(x, y, text) {
    UI.unpoint();
    const p = el('div', 'pointer', `<div class="hand">👆</div>${text ? `<div class="tip">${text}</div>` : ''}`, UI.L.fx);
    p.style.left = x + 'px'; p.style.top = y + 'px';
    UI._ptr = p;
  },
  unpoint() { if (UI._ptr) { UI._ptr.remove(); UI._ptr = null; } },
};

// ---------- 대화 · 회상 ----------
const Talk = (() => {
  let L, box, bgEl, standBox, dlg, active = false, skipping = false, waiter = null;
  function open() {
    if (active) return;
    active = true; skipping = false;
    L = UI.L.story; L.innerHTML = ''; L.classList.add('on');
    box = el('div', 'story', null, L);
    bgEl = el('div', 'sbg', null, box);
    standBox = el('div', 'stands', null, box);
    dlg = null;
    const sk = el('button', 'skip', '넘기기 ▶▶', box);
    sk.onclick = e => { e.stopPropagation(); skipping = true; if (waiter) waiter(); };
    box.onclick = () => { if (waiter) waiter(); };
  }
  function end() {
    active = false; waiter = null;
    if (L) { L.innerHTML = ''; L.classList.remove('on'); }
  }
  function bg(key, cg) {
    open();
    const n = el('div', 'sbg' + (cg ? ' cg' : '') + (key ? '' : ' none'), null, box);
    if (key) n.style.backgroundImage = `url(${A(key)})`;
    box.insertBefore(n, standBox);
    const old = bgEl; bgEl = n;
    requestAnimationFrame(() => n.classList.add('in'));
    setTimeout(() => old && old.remove(), 700);
  }
  const spots = { l: -40, c: 120, r: 280 };
  function stand(list) {
    open();
    standBox.innerHTML = '';
    for (const [id, pos, pose] of list || []) {
      const p = person(id);
      if (!p || !p.stand) continue;
      const img = el('img', 'stand', null, standBox);
      img.src = (pose && A(`ch/${p.stand}_${pose}`)) || A('ch/' + p.stand);
      img.dataset.who = id;
      img.style.left = (spots[pos] != null ? spots[pos] : pos) + 'px';
      if (pos === 'r') img.classList.add('flip');
    }
  }
  function waitClick() { return new Promise(r => { waiter = () => { waiter = null; r(); }; if (skipping) setTimeout(() => waiter && waiter(), 0); }); }
  function typeInto(node, text) {
    return new Promise(resolve => {
      if (skipping) { node.textContent = text; resolve(); return; }
      let i = 0, done = false;
      const fin = () => { if (done) return; done = true; clearInterval(t); node.textContent = text; waiter = null; resolve(); };
      const t = setInterval(() => { i += 2; node.textContent = text.slice(0, i); if (i >= text.length) fin(); }, 24);
      waiter = fin;
    });
  }
  const sub = t => t.replace(/\{name\}/g, G ? G.name : '관장');
  async function say(id, face, text, pose) {
    open();
    text = sub(text);
    const p = person(id);
    if (pose && p && p.stand) { const img = standBox.querySelector(`[data-who="${id}"]`); if (img) img.src = A(`ch/${p.stand}_${pose}`) || img.src; }
    for (const img of standBox.querySelectorAll('.stand')) img.classList.toggle('dark', img.dataset.who !== id);
    if (dlg) dlg.remove();
    let faceHtml = '';
    if (p && p.face) faceHtml = `<img class="face" src="${faceSrc(p, face)}">`;
    else if (p) faceHtml = `<div class="face temp" style="background:${p.color}">${p.mark}</div>`;
    const nm = id === 'me' ? sub('{name}') : (p ? p.name + (p.role ? ` <small>${p.role}</small>` : '') : '');
    dlg = el('div', 'dlg' + (faceHtml ? '' : ' noface') + (id === 'me' ? ' me' : ''), `${faceHtml}<div class="name">${nm}</div><div class="txt"></div><div class="more">▼</div>`, box);
    await typeInto(dlg.querySelector('.txt'), text);
    await waitClick();
  }
  async function n(text) {
    open();
    if (dlg) dlg.remove();
    for (const img of standBox.querySelectorAll('.stand')) img.classList.remove('dark');
    dlg = el('div', 'narr', '<div class="txt"></div>', box);
    await typeInto(dlg.querySelector('.txt'), sub(text));
    await waitClick();
  }
  async function title(small, big) {
    open();
    if (dlg) { dlg.remove(); dlg = null; }
    const t = el('div', 'title-card', `<div class="sub">${small}</div><div class="main">${big}</div>`, box);
    SFX.play('page');
    await wait(skipping ? 0 : 1600);
    if (!skipping) await waitClick();
    t.remove();
  }
  function choice(opts) {
    open();
    if (dlg) { dlg.querySelector('.more') && dlg.querySelector('.more').remove(); }
    const c = el('div', 'choices', null, box);
    return new Promise(r => opts.forEach((o, i) => btn(o, '', () => { c.remove(); r(i); }, c)));
  }
  function input(label, def) {
    open();
    if (dlg) { dlg.remove(); dlg = null; }
    const c = el('div', 'namebox', `<p>${label}</p><input maxlength="8" value="${def}">`, box);
    const inp = c.querySelector('input');
    setTimeout(() => inp.focus(), 50);
    return new Promise(r => btn('정했어요', '', () => { const v = inp.value.trim() || def; c.remove(); r(v); }, c));
  }
  function setPose(id, pose) {
    const p = PEOPLE[id]; const img = standBox && standBox.querySelector(`[data-who="${id}"]`);
    if (img && p) img.src = A(`ch/${p.stand}_${pose}`) || A('ch/' + p.stand);
  }
  return { bg, stand, say, n, title, choice, input, end, setPose, get active() { return active; } };
})();

// 무대 크기 맞추기 (세로 720×1280)
function fitStage() {
  const st = document.getElementById('stage');
  const W = window.innerWidth, H = window.innerHeight;
  const s = Math.min(W / 720, H / 1280);
  st.style.transform = `translate(${(W - 720 * s) / 2}px, ${(H - 1280 * s) / 2}px) scale(${s})`;
  UI.scale = s;
}
