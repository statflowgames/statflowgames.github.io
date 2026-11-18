// DOM 화면: 층, 상태 바, 알림, 대화(Talk)
'use strict';

let MAN = {};                                   // assets/manifest.json
const A = key => (MAN[key] ? MAN[key].url : '');
const has = key => !!MAN[key];
const wait = ms => new Promise(r => setTimeout(r, ms));

function el(tag, cls, html, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}
function btn(label, cls, onClick, parent, icon) {
  const b = el('button', 'btn ' + (cls || ''), (icon ? `<img src="${A(icon)}">` : '') + `<span>${label}</span>`, parent);
  b.addEventListener('click', e => { e.stopPropagation(); if (b.disabled) return; SFX.play('click'); onClick && onClick(e); });
  return b;
}
const fmt = n => Math.round(n).toLocaleString('ko-KR');

const UI = {
  root: null, L: {},
  init() {
    UI.root = document.getElementById('ui');
    for (const k of ['scene', 'hud', 'panel', 'story', 'toast']) {
      UI.L[k] = el('div', 'pass', null, UI.root);
      UI.L[k].style.cssText = 'position:absolute;inset:0;';
    }
  },
  clear(...names) { for (const n of names) UI.L[n].innerHTML = ''; },
  layer(name) {                                  // 비어 있지 않으면 터치를 받음
    const L = UI.L[name];
    L.style.pointerEvents = 'none';
    return L;
  },
  toast(text, icon) {
    const t = el('div', 'toast', (icon ? `<img src="${A(icon)}">` : '') + text, UI.L.toast);
    setTimeout(() => t.remove(), 2700);
  },

  // ---------- 위쪽 상태 바 ----------
  hud(opts = {}) {
    const L = UI.L.hud; L.innerHTML = '';
    if (!G) return;
    const sh = SHIPS[G.ship];
    const h = el('div', 'hud', null, L);
    el('div', 'it date', State.dateText(), h);
    const item = (icon, txt, low, title) => {
      const i = el('div', 'it' + (low ? ' low' : ''), `<img src="${A('icon/' + icon)}">${txt}`, h);
      if (title) i.title = title;
    };
    item('dinar', fmt(G.gold), false, '금 디나르');
    item('food', G.food, G.food < State.dailyUse() * 4, '식량');
    item('water', G.water, G.water < State.dailyUse() * 4, '물');
    item('crew', `${G.crew}/${sh.crewMax}`, G.crew < sh.crewMin, '선원');
    item('morale', Math.round(G.morale), G.morale < 30, '사기');
    item('ship', `${Math.round(G.hull)}/${sh.hull}`, G.hull < sh.hull * 0.35, '선체');
    item('trade', `${State.cargoCount()}/${sh.hold}`, false, '짐칸');
    const bs = el('div', 'btns', null, h);
    const ib = (icon, fn, title) => { const b = el('button', 'ib', `<img src="${A('icon/' + icon)}">`, bs); b.title = title; b.onclick = () => { SFX.play('click'); fn(); }; };
    ib('codex', () => Codex.open(), '유물 도감');
    ib('ledger', () => UI.status(), '항해 일지');
    if (!opts.noMenu) ib('settings', () => UI.menu(), '메뉴');
  },

  panel(cls, title, onClose) {
    const L = UI.L.panel; L.innerHTML = '';
    L.style.pointerEvents = 'auto';
    const dim = el('div', 'dim', null, L);
    const p = el('div', 'panel fadein ' + cls, title ? `<h2>${title}</h2>` : '', L);
    const close = () => { L.innerHTML = ''; L.style.pointerEvents = 'none'; onClose && onClose(); };
    const x = el('button', 'x', '✕', p); x.onclick = () => { SFX.play('click'); close(); };
    dim.onclick = close;
    p.close = close;
    return p;
  },
  closePanel() { UI.L.panel.innerHTML = ''; UI.L.panel.style.pointerEvents = 'none'; },

  status() {
    const p = UI.panel('menu-panel', '항해 일지');
    const b = el('div', 'body', null, p);
    const f = G.fame;
    const sh = SHIPS[G.ship];
    const debt = G.debt > 0 ? `<b style="color:#b03a2e">남은 빚 ${G.debt} 디나르</b> (다투 스리에게, 팔렘방 관청)` : '<b style="color:#2f7d4a">빚을 모두 갚았다</b>';
    const mates = G.mates.map(m => PEOPLE[m].name).join(', ');
    b.innerHTML = `
      <p><b>${G.name}</b> · ${ORIGINS[G.origin].name} 출신 · ${State.dateText()}</p>
      <p>${debt}</p>
      <p>배: <b>${sh.name}</b> (${sh.kind}) · 짐칸 ${sh.hold} · 선원 ${G.crew}/${sh.crewMax}</p>
      <p>동료: ${mates}</p>
      <p>「바람의 책」 ${G.pages} / 32장 · 유물 기록 ${Object.keys(G.relics).length} / ${RELIC_ORDER.length}</p>
      <p>명성 — 교역 ${f.trade} · 탐험 ${f.explore} · 학문 ${f.scholar} · 해상 ${f.sea}</p>
      <p>항해 ${G.voyages}번 · 해전 승리 ${G.wins}번 · 교역 이익 ${fmt(G.stats.profit)} 디나르</p>
      <p style="color:#7a5a30;font-size:15px">이 프로토타입은 1장 「해협의 주인」까지예요. 자동으로 저장돼요.</p>`;
  },
  menu() {
    const p = UI.panel('menu-panel', '메뉴');
    const b = el('div', 'body', null, p);
    el('p', null, '진행은 항구에 들어갈 때마다 자동으로 저장돼요.', b);
    btn('타이틀로', 'paper', () => { UI.closePanel(); Game.toTitle(); }, b);
    el('span', null, ' ', b);
    btn('처음부터 다시', 'paper', async () => {
      UI.closePanel();
      if (await Talk.confirm('저장을 지우고 처음부터 시작할까요?')) { State.wipe(); Game.toTitle(); }
    }, b);
  },
};

// ---------- 대화 · 이벤트 연출 ----------
const Talk = (() => {
  let L, bgA, bgB, standBox, dlg, skipping = false, active = false, front = 'A';

  function who(id) {
    if (id === 'pc') {
      const k = State.pcKey();
      return { name: G.name, face: k, stand: k };
    }
    if (id === 'n' || !id) return null;
    return PEOPLE[id] || { name: id };
  }
  function faceUrl(w, f) {
    if (!w || !w.face) return '';
    return A(`face/${w.face}_${f || 'neutral'}`) || A(`face/${w.face}_neutral`);
  }
  function standUrl(id, pose) {
    const w = who(id);
    if (!w || !w.stand) return '';
    return (pose && A(`ch/${w.stand}_${pose}`)) || A(`ch/${w.stand}`);
  }

  function open() {
    if (active) return;
    active = true; skipping = false;
    L = UI.L.story; L.innerHTML = ''; L.style.pointerEvents = 'auto';
    const box = el('div', 'story', null, L);
    bgA = el('img', 'bg', null, box); bgB = el('img', 'bg', null, box);
    bgA.style.opacity = 0; bgB.style.opacity = 0;
    standBox = el('div', null, null, box); standBox.style.cssText = 'position:absolute;inset:0;pointer-events:none';
    dlg = null;
    const sk = el('button', 'skip', '빨리 넘기기 ▶▶', box);
    sk.onclick = e => { e.stopPropagation(); skipping = true; if (pendingNext) pendingNext(); };
  }
  function close() {
    active = false;
    if (L) { L.innerHTML = ''; L.style.pointerEvents = 'none'; }
  }
  function bg(key, cg) {
    open();
    const next = front === 'A' ? bgB : bgA, cur = front === 'A' ? bgA : bgB;
    next.src = key ? A(key) : '';
    next.className = 'bg' + (cg ? ' cg' : '');
    next.style.opacity = key ? 1 : 0; cur.style.opacity = 0;
    front = front === 'A' ? 'B' : 'A';
  }
  function bgFilter(css) { const cur = front === 'A' ? bgA : bgB; cur.style.filter = css || ''; }
  const spots = { l: 70, cl: 250, c: 460, cr: 650, r: 860 };
  function stand(list) {
    open();
    standBox.innerHTML = '';
    for (const s of list || []) {
      const [id, pos, pose] = s;
      const img = el('img', 'stand', null, standBox);
      img.src = standUrl(id, pose);
      img.dataset.who = id;
      img.style.left = (spots[pos] != null ? spots[pos] : pos) + 'px';
      if (id !== 'pc' && (pos === 'r' || pos === 'cr')) img.classList.add('flip');
    }
  }
  function setPose(id, pose) {
    const img = standBox && standBox.querySelector(`[data-who="${id}"]`);
    if (img) img.src = standUrl(id, pose);
  }
  function fx(id, kind) {
    const img = standBox && standBox.querySelector(`[data-who="${id}"]`);
    if (!img) return;
    img.classList.remove('bob', 'shake'); void img.offsetWidth; img.classList.add(kind);
    setTimeout(() => img.classList.remove(kind), 900);
  }

  let pendingNext = null;
  function typeInto(node, text) {
    return new Promise(resolve => {
      if (skipping) { node.textContent = text; resolve(); return; }
      let i = 0;
      const timer = setInterval(() => {
        i += 2; node.textContent = text.slice(0, i);
        if (i >= text.length) { clearInterval(timer); resolve(); }
      }, 22);
      node._finish = () => { clearInterval(timer); node.textContent = text; resolve(); };
    });
  }
  const sub = t => t.replace(/\{name\}/g, G ? G.name : '').replace(/\{place\}/g, G ? ORIGINS[G.origin].place : '');

  async function say(id, face, text, pose) {
    open();
    text = sub(text);
    const w = who(id);
    if (pose) setPose(id, pose);
    standBox.querySelectorAll('.stand').forEach(s => s.classList.toggle('dark', !!w && s.dataset.who !== id));
    if (dlg) dlg.remove();
    const narr = !w;
    if (narr) {
      dlg = el('div', 'narr', '', L.firstChild);
    } else {
      dlg = el('div', 'dlg' + (w.face ? '' : ' noface'), '', L.firstChild);
      if (w.face) el('img', 'face', null, dlg).src = faceUrl(w, face);
      el('div', 'name', w.name, dlg);
    }
    const txt = narr ? dlg : el('div', 'txt', '', dlg);
    let typing = true;
    const done = typeInto(txt, text).then(() => { typing = false; if (!narr) el('div', 'more', '▼', dlg); });
    await new Promise(resolve => {
      pendingNext = () => { if (typing && txt._finish) txt._finish(); resolve(); };
      if (skipping) { done.then(() => setTimeout(resolve, 30)); return; }
      dlg.parentNode.onclick = () => {
        if (typing) { txt._finish && txt._finish(); return; }
        SFX.play('click'); resolve();
      };
    });
    pendingNext = null;
    if (L.firstChild) L.firstChild.onclick = null;
  }
  const n = text => say(null, null, text);

  function choice(opts) {
    open();
    skipping = false;
    if (dlg) { dlg.remove(); dlg = null; }
    return new Promise(resolve => {
      const box = el('div', 'choices fadein', null, L.firstChild);
      for (const [label, val, dis] of opts) {
        const b = btn(sub(label), '', () => { box.remove(); resolve(val); }, box);
        if (dis) b.disabled = true;
      }
    });
  }
  async function title(subT, main) {
    open();
    if (dlg) { dlg.remove(); dlg = null; }
    const t = el('div', 'title-card', `<div class="sub">${subT}</div><div class="main">${main}</div>`, L.firstChild);
    SFX.play('page');
    await new Promise(r => { t.onclick = r; setTimeout(r, skipping ? 300 : 2600); });
    t.remove();
  }
  // 확인 창 (질문 글이 보이게)
  async function ask(text, opts) {
    open();
    if (dlg) dlg.remove();
    dlg = el('div', 'narr', sub(text), L.firstChild);
    dlg.style.bottom = '420px'; dlg.style.top = 'auto';
    const v = await choice(opts);
    return v;
  }
  return { open, close, bg, bgFilter, stand, setPose, fx, say, n, choice, title, ask, get active() { return active; },
    confirm: async text => { const v = await ask(text, [['예', true], ['아니요', false]]); close(); return v; } };
})();

// ---------- 유물 도감 ----------
const Codex = {
  open() {
    const p = UI.panel('codex', '유물 도감 — 남해·말라카');
    const grid = el('div', 'grid', null, p);
    const det = el('div', 'detail', null, p);
    const show = id => {
      const r = RELICS[id], got = G.relics[id] != null;
      const hero = A('relic/' + id + '_hero');
      det.innerHTML = got
        ? `<img src="${hero || A('relic/' + id)}"><div><b>${r.name}</b> <span class="tag ${r.rar === '보물' ? '' : r.rar === '귀중' ? 'b' : 'g'}">${r.rar}</span><br>${r.desc}<br><small style="color:#8a6a40">기록한 날: ${State.dateText(G.relics[id])}</small></div>`
        : `<div style="color:#8a6a40">아직 기록하지 못한 유물이에요. 항구 숙소의 소문과 「주변 탐사」로 찾아보세요.</div>`;
    };
    let first = null;
    for (const id of RELIC_ORDER) {
      const got = G.relics[id] != null;
      const c = el('div', 'cell' + (got ? '' : ' no'), `<img src="${A('relic/' + id)}"><span class="r">${got ? RELICS[id].rar : '?'}</span>`, grid);
      c.onclick = () => { SFX.play('click'); show(id); };
      if (got && !first) first = id;
    }
    det.innerHTML = `<div>모은 기록 <b>${Object.keys(G.relics).length}</b> / ${RELIC_ORDER.length}. 칸을 누르면 자세히 볼 수 있어요.</div>`;
    if (first) show(first);
  },
};
