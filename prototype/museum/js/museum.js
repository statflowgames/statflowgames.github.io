// 박물관 건물 단면 · 진열장 · 관람객 · HUD · 아래 탭
'use strict';

// 층 배치 (월드 좌표, 위 → 아래)
const FLOORS = {
  roof: { y: 0, h: 170 },
  next: { y: 170, h: 320 },
  nanhaiB: { y: 490, h: 320 },
  nanhaiA: { y: 810, h: 320 },
  lobby: { y: 1130, h: 320 },
  base: { y: 1450, h: 300 },
  soil: { y: 1750, h: 80 },
};
const WORLD_H = 1830, TOP_PAD = 104, BOT_PAD = 138;
const floorLine = f => FLOORS[f].y + FLOORS[f].h - 30;

// ---------- 관람객 그림 (임시 SVG SD) ----------
const Look = (() => {
  const SK = ['#f3d2b3', '#e8b98f', '#d19a6c', '#a86f48', '#7a4b2e', '#5a3620'];
  const HAIR = ['#1d1612', '#3a2618', '#6b4426', '#a8743c', '#d8c3a0', '#8a8a8a'];
  // 그룹별 4종
  const TYPES = {
    seasia: [
      { skin: [2, 3], hair: [0], top: ['#b5532d', '#2b6e8a', '#7d5a2a'], pants: '#3a3a48', batik: true },
      { skin: [2, 3], hijab: ['#e8a3b6', '#9dbfa4', '#e8c27a', '#7fa7d8'], top: ['#f1e6d0', '#d9c6e8'], dress: true },
      { skin: [3, 4], hair: [5], songkok: true, top: ['#6b3a2a', '#2d5a4a'], batik: true, pants: '#2a2a2a', elder: true },
      { skin: [2, 3], hair: [0], top: ['#f2c94c', '#f28d8d', '#8fd1c9'], dress: true, child: true },
    ],
    china: [
      { skin: [0, 1], hair: [0, 1], top: ['#e6e1d6', '#f0b7a4', '#a7c4e0'], pants: '#4a4a5a', tote: true, long: true },
      { skin: [0, 1], hair: [0], top: ['#3d6e9e', '#7a8a3a', '#c0392b'], pants: '#2b2b33', windbreaker: true },
      { skin: [1], hair: [5], sunhat: true, top: ['#b8a9d9', '#e0a96d'], pants: '#5a4a4a', elder: true },
      { skin: [0, 1], hair: [0], cap: ['#d64541', '#3a7bd5'], top: ['#ffd166', '#06d6a0'], pants: '#3a3a6a', child: true },
    ],
    world: [
      { skin: [0, 2, 4], hair: [2, 3], sunhat: true, backpack: true, top: ['#7a9a5a', '#c97b3a'], pants: '#5a5040' },
      { skin: [1, 4, 5], hair: [0, 1], curly: true, top: ['#d65db1', '#ff9671', '#4ecdc4'], pants: '#2f3e46', long: true },
      { skin: [0, 3], hair: [5], glasses: true, top: ['#9d8189', '#6d8299'], pants: '#3d405b', elder: true },
      { skin: [2, 4, 5], hair: [0], cap: ['#ef476f', '#118ab2'], top: ['#ffd166', '#ffffff'], pants: '#264653', child: true },
    ],
  };
  const c = a => pick(a);
  function make(group, typeIdx) {
    const T = TYPES[group][typeIdx == null ? irand(0, 3) : typeIdx];
    const o = {
      skin: SK[c(T.skin)], hair: T.hair ? HAIR[c(T.hair)] : '#222', top: c(T.top), pants: T.pants || '#3a3a48',
      T, child: !!T.child, elder: !!T.elder,
      hijab: T.hijab ? c(T.hijab) : null, cap: T.cap ? c(T.cap) : null,
    };
    return { side: svg(o, false), back: svg(o, true), child: o.child, elder: o.elder };
  }
  // 2.5등신 관절 인형: 머리(hd) · 눈(eyes) · 몸통(torso) · 앞팔(arF) · 뒷팔(arB) · 두 다리(lg1, lg2)
  // 각 부위가 따로 움직여요 (CSS: 걷기 · 숨쉬기 · 깜빡임 · 감상 · 사진 · 박수 · 가리키기 · 생각 · 계단 · 울기 · 손 흔들기)
  function svg(o, back) {
    const T = o.T;
    const leg = (cls, x) => {
      if (T.dress && !o.child) return `<g class="lg ${cls}"><rect x="${x + 1}" y="78" width="7" height="14" rx="3" fill="${o.skin}"/><rect x="${x - 1}" y="89" width="11" height="6" rx="3" fill="#2a2420"/></g>`;
      const c = T.dress ? o.skin : o.pants;
      return `<g class="lg ${cls}"><rect x="${x}" y="68" width="8.5" height="23" rx="4" fill="${c}"/><rect x="${x - 2}" y="88" width="13" height="7" rx="3.5" fill="#2a2420"/></g>`;
    };
    const arm = (cls, x, shade) => `<g class="ar ${cls}"><rect x="${x}" y="45" width="8.5" height="23" rx="4.2" fill="${o.top}" ${shade ? 'filter="brightness(.8)" opacity=".92"' : ''}/>
      <circle cx="${x + 4.2}" cy="68" r="4.3" fill="${o.skin}"/>
      ${cls === 'arF' && !back ? `<g class="cam"><rect x="${x - 4}" y="64" width="15" height="10" rx="2" fill="#2d2d33"/><circle cx="${x + 9}" cy="69" r="3" fill="#8ab4d8"/></g>` : ''}
      ${cls === 'arF' && o.elder && !o.child && !back ? `<path class="cane" d="M${x + 5} 67 L${x + 11} 95" stroke="#6b4a2a" stroke-width="3" stroke-linecap="round"/>` : ''}</g>`;
    let s = '';
    // 뒤쪽 부위
    if (T.backpack) s += `<rect class="pack" x="${back ? 17 : 5}" y="43" width="${back ? 26 : 14}" height="27" rx="5" fill="#8a5a2a"/>`;
    s += back ? arm('arB', 8, false) : arm('arB', 25, true);
    s += leg('lg2', back ? 31 : 31) + leg('lg1', back ? 21 : 22);
    // 몸통
    let tor = '';
    if (T.dress) tor += `<path d="M17 44 Q30 38 43 44 L48 ${o.child ? 78 : 82} Q30 ${o.child ? 84 : 88} 12 ${o.child ? 78 : 82} Z" fill="${o.top}"/>`;
    else tor += `<rect x="15" y="42" width="30" height="${T.windbreaker ? 32 : 30}" rx="10" fill="${o.top}"/>`;
    if (T.batik) tor += `<path d="M18 50 h24 M18 58 h24 M18 66 h24" stroke="rgba(255,240,200,.55)" stroke-width="2.5" stroke-dasharray="3 3"/>`;
    if (T.windbreaker) tor += `<path d="M30 44 v28" stroke="rgba(255,255,255,.6)" stroke-width="2"/>`;
    if (T.tote && !back) tor += `<path d="M8 56 h11 v13 h-11 Z" fill="#e8d9b8" stroke="#a08a60"/><path d="M10 56 q3.5 -8 7 0" stroke="#a08a60" fill="none"/>`;
    s += `<g class="torso">${tor}</g>`;
    // 머리
    let hd = '';
    if (T.long && !o.hijab) hd += `<path d="M10 24 Q7 50 18 54 L30 46 Z" fill="${o.hair}"/>`;
    if (o.hijab) {
      hd += `<ellipse cx="30" cy="28" rx="21" ry="23" fill="${o.hijab}"/><path d="M12 36 Q30 56 48 36 L46 48 Q30 56 14 48 Z" fill="${o.hijab}"/>`;
      if (!back) hd += `<ellipse cx="34" cy="28" rx="13" ry="14" fill="${o.skin}"/>`;
    } else {
      hd += `<circle cx="29" cy="25" r="20" fill="${o.hair}"/>`;
      if (T.curly) hd += `<circle cx="14" cy="18" r="8" fill="${o.hair}"/><circle cx="20" cy="8" r="8" fill="${o.hair}"/><circle cx="32" cy="6" r="8" fill="${o.hair}"/><circle cx="12" cy="30" r="7" fill="${o.hair}"/>`;
      if (!back) {
        hd += `<circle cx="32" cy="28" r="17" fill="${o.skin}"/>`;
        hd += `<path d="M14 24 Q20 6 40 10 Q48 14 49 22 Q40 16 30 18 Q22 19 18 28 Z" fill="${o.hair}"/>`;
      }
    }
    if (!back) {
      hd += `<g class="eyes"><circle cx="36" cy="29" r="2.4" fill="#2a1a10"/><circle cx="44" cy="29" r="2.4" fill="#2a1a10"/></g>`;
      hd += `<ellipse cx="46" cy="35" rx="3.2" ry="2" fill="#f08a7a" opacity=".55"/><path class="mouth" d="M38 36 q3 3 6 0" stroke="#7a3a2a" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
      hd += `<g class="tear"><path d="M45 32 q-2 5 0 7 q2 -2 0 -7" fill="#7cc4f0"/></g>`;
      if (T.glasses) hd += `<circle cx="36" cy="29" r="4.5" fill="none" stroke="#333" stroke-width="1.4"/><circle cx="45" cy="29" r="4.5" fill="none" stroke="#333" stroke-width="1.4"/>`;
    }
    if (T.songkok) hd += `<rect x="14" y="2" width="30" height="12" rx="2" fill="#1a1a1a"/>`;
    if (T.sunhat) hd += `<ellipse cx="30" cy="11" rx="27" ry="6" fill="#e8d29a"/><ellipse cx="30" cy="7" rx="14" ry="9" fill="#e8d29a"/><rect x="16" y="8" width="28" height="3" fill="#c0392b"/>`;
    if (o.cap) hd += `<path d="M11 16 Q30 -4 47 16 Z" fill="${o.cap}"/>${back ? '' : `<path d="M44 15 h12 q2 3 -2 4 h-12 Z" fill="${o.cap}"/>`}`;
    s += `<g class="hd">${hd}</g>`;
    s += back ? arm('arF', 43, false) : arm('arF', 36, false);
    const sc = o.child ? 0.72 : (o.elder ? 0.95 : 1);
    return `<svg viewBox="0 -6 60 104" width="72" height="125"><g transform="translate(${30 - 30 * sc} ${98 - 98 * sc}) scale(${sc})"><g class="rig">${s}</g></g></svg>`;
  }
  return { make };
})();

// ---------- 관람객 ----------
const Visitors = (() => {
  const list = [];
  let layer, seq = 0;
  const SPEED = 62;
  function init(l) { layer = l; }

  function plan(v) {
    const q = [];
    const looks = (hall, desc) => {
      const ss = HALLS[hall].slots.filter(s => G.slots[s.id] && G.slots[s.id].relic).slice();
      ss.sort((a, b) => desc ? b.x - a.x : a.x - b.x);
      for (const s of ss) if (Math.random() < 0.85) { q.push({ t: 'walk', x: s.x - 8 + rand(-6, 6) }); q.push({ t: 'look', slot: s.id }); }
    };
    looks('lobby');
    if (G.story >= 1) {
      q.push({ t: 'walk', x: 692 }); q.push({ t: 'climb', f: 'nanhaiA', x: 692 });
      looks('nanhaiA', true);
      q.push({ t: 'walk', x: 28 });
      if (G.hallB) { q.push({ t: 'climb', f: 'nanhaiB', x: 28 }); looks('nanhaiB'); q.push({ t: 'walk', x: 692 }); }
    } else q.push({ t: 'walk', x: 700 });
    q.push({ t: 'exit' });
    v.q = q;
  }

  function spawn(opts = {}) {
    if (list.length >= 22 && !opts.force) return null;
    const group = opts.group || pick(['seasia', 'seasia', 'china', 'world']);
    const look = Look.make(group, opts.type);
    const v = { id: ++seq, group, look, f: 'lobby', x: -30, y: floorLine('lobby') + rand(2, 12), dir: 1, act: null, t: 0, opts };
    v.el = el('div', 'vis p-walk' + (look.child ? ' kid' : '') + (look.elder ? ' elder' : ''), `<div class="body">${look.side}</div>`, layer);
    v.pose = 'walk';
    v.el.style.zIndex = Math.round(v.y);
    if (opts.wish) { v.wish = opts.wish; v.mark = el('div', 'vmark wish', '!', v.el); }
    if (opts.kid) { v.mark = el('div', 'vmark cry', '😢', v.el); }
    if (opts.reporter) { v.mark = el('div', 'vmark rep', '📰', v.el); }
    v.el.addEventListener('click', e => { if (Museum.dragged) return; e.stopPropagation(); tap(v); });
    plan(v);
    if (opts.kid) { v.q = [{ t: 'walk', x: rand(200, 520) }, { t: 'cry' }]; v.f = opts.kidFloor || 'nanhaiA'; v.y = floorLine(v.f) + 8; v.x = 700; }
    list.push(v);
    if (!opts.free && !opts.kid) {
      const tk = State.ticket();
      G.coins += tk; HUD.update();
      if (Museum.visible('lobby')) Museum.floatAt('+' + tk, 40, floorLine('lobby') - 110, 'coin');
    }
    G.today = (G.today || 0) + 1;
    State.stat('visitors');
    place(v);
    return v;
  }

  function place(v) {
    v.el.style.transform = `translate(${v.x - 36}px, ${v.y - 121}px)`;
    const f = v.dir < 0 ? 'scaleX(-1)' : 'scaleX(1)';
    if (v._f !== f) { v._f = f; v.el.firstChild.style.transform = f; }
  }
  // 자세 (CSS 가 부위별로 움직임): walk · idle · look · photo · clap · heart · point · think · climb · cry · wave
  const POSES = ['walk', 'idle', 'look', 'photo', 'clap', 'heart', 'point', 'think', 'climb', 'cry', 'wave'];
  function pose(v, name) {
    if (v.pose === name) return;
    for (const p of POSES) v.el.classList.remove('p-' + p);
    v.el.classList.add('p-' + name); v.pose = name;
  }
  function setBack(v, back) {
    if (v.back === back) return;
    v.back = back;
    v.el.firstChild.innerHTML = back ? v.look.back : v.look.side;
  }
  function bubble(v, emo, cls) {
    const b = el('div', 'vbub ' + (cls || ''), emo, v.el);
    setTimeout(() => b.remove(), 1700);
  }

  // 감상 반응 → 자세 이름
  function react(v, slotId) {
    const s = G.slots[slotId]; if (!s || !s.relic) return 'idle';
    Events.onLook(v);
    const score = State.slotScore(slotId);
    const like = VISITORS[v.group].likes(s.relic);
    const ph = Math.min(0.92, 0.2 + score / 90 + like * 0.25);
    const r = Math.random();
    if (r < ph) {
      let p;
      if (Math.random() < 0.22 + like * 0.12) {
        p = 'photo';
        setTimeout(() => { if (!v.el.isConnected) return; bubble(v, '📷', 'cam'); SFX.play('camera'); Museum.flash(v.x + 22, v.y - 62); }, 450);
        State.stat('photos');
      } else if (like && Math.random() < 0.5) { p = 'point'; bubble(v, `<small>${pick(VISITORS[v.group].says)}</small>`, 'heart'); SFX.play('heart'); }
      else { p = Math.random() < 0.5 ? 'clap' : 'heart'; bubble(v, '❤️', 'heart'); SFX.play('heart'); }
      State.stat('hearts'); G.fameBit = (G.fameBit || 0) + (like ? 0.5 : 0.3);
      if (G.fameBit >= 1) { const f = Math.floor(G.fameBit); G.fameBit -= f; State.addFame(f); }
      if (Math.random() < 0.3 + like * 0.1) Museum.dropCoin(v.f, v.x + rand(-10, 20), irand(4, 10) + Math.round(score / 12));
      Museum.pulseSlot(slotId);
      Story.emit('heart');
      Wishes.check(s.relic);
      return p;
    } else if (r < ph + 0.25) { bubble(v, '✨'); return 'think'; }
    bubble(v, '💭'); return Math.random() < 0.5 ? 'think' : 'idle';
  }

  function tap(v) {
    SFX.play('pop');
    if (v.wish && !v.wishTaken) { Wishes.open(v); return; }
    if (v.opts.kid && v.act && v.act.t === 'cry') { Events.kidFound(v); return; }
    bubble(v, pick(['😊', '👋', '🙂']));
    if (v.act && v.act.t === 'walk') { v.q.unshift({ t: 'wave' }, { ...v.act }); v.act = null; }
  }

  function step(v, dt) {
    if (!v.act) {
      v.act = v.q.shift();
      if (!v.act) { remove(v); return; }
      v.t = 0;
      const t = v.act.t;
      if (t === 'walk') { setBack(v, false); pose(v, 'walk'); }
      if (t === 'look') { setBack(v, true); pose(v, 'look'); }
      if (t === 'climb') { v.from = { x: v.x, y: v.y }; v.to = { x: v.act.x, y: floorLine(v.act.f) + rand(2, 12) }; setBack(v, true); pose(v, 'climb'); }
      if (t === 'exit') { pose(v, 'walk'); v.el.classList.add('fadeout'); }
      if (t === 'cry') { setBack(v, false); pose(v, 'cry'); }
      if (t === 'wave') { setBack(v, false); pose(v, 'wave'); }
    }
    const a = v.act; v.t += dt;
    if (a.t === 'walk') {
      const d = a.x - v.x; v.dir = d < 0 ? -1 : 1;
      const mv = SPEED * (v.look.child ? 1.25 : v.look.elder ? 0.65 : 1) * dt;
      if (Math.abs(d) <= mv) { v.x = a.x; v.act = null; pose(v, 'idle'); } else v.x += Math.sign(d) * mv;
    } else if (a.t === 'look') {
      // 1) 뒤돌아 몸 기울여 감상 → 2) 돌아서서 반응 자세 → 3) 잠깐 숨 고르기
      if (v.t > 1.1 && !a.done) { a.done = true; v.dir = 1; setBack(v, false); pose(v, react(v, a.slot)); }
      if (v.t > 2.5 && !a.rest) { a.rest = true; pose(v, 'idle'); }
      if (v.t > 2.8) v.act = null;
    } else if (a.t === 'climb') {
      const k = Math.min(1, v.t / 1.6);
      v.x = v.from.x + (v.to.x - v.from.x) * k; v.y = v.from.y + (v.to.y - v.from.y) * k;
      if (k >= 1) { v.f = a.f; v.act = null; v.el.style.zIndex = Math.round(v.y); }
    } else if (a.t === 'exit') {
      if (v.t > 0.6) { remove(v); return; }
    } else if (a.t === 'cry') {
      if (v.t > 1.5) { v.t = 0; bubble(v, '💧'); }
    } else if (a.t === 'wave') {
      if (v.t > 1.0) v.act = null;
    }
    place(v);
  }
  function remove(v) { v.el.remove(); const i = list.indexOf(v); if (i >= 0) list.splice(i, 1); }
  function update(dt) { for (const v of list.slice()) step(v, dt); }
  function clear() { for (const v of list.slice()) remove(v); }
  return { init, spawn, update, list, remove, bubble, clear, place };
})();

// ---------- 박물관 화면 ----------
const Museum = (() => {
  let wrap, world, vlayer, floorsEl = {};
  const M = { dragged: false };

  function build() {
    const sc = document.getElementById('scene');
    sc.innerHTML = '';
    wrap = el('div', 'wwrap', null, sc);
    world = el('div', 'world', null, wrap);
    world.style.height = (WORLD_H + TOP_PAD + BOT_PAD) + 'px';
    const inner = el('div', 'winner', null, world);
    inner.style.top = TOP_PAD + 'px';
    for (const f in FLOORS) {
      const fe = el('div', 'floor f-' + f, null, inner);
      fe.style.top = FLOORS[f].y + 'px'; fe.style.height = FLOORS[f].h + 'px';
      floorsEl[f] = fe;
    }
    vlayer = el('div', 'vlayer', null, inner);
    Visitors.init(vlayer);
    M.inner = inner; M.wrap = wrap;
    drawStatic();
    render();
    dragScroll();
    M.scrollTo('lobby', true);
  }

  function drawStatic() {
    // 지붕
    floorsEl.roof.innerHTML = `<div class="sky" style="background-image:url(${A('bg/sky_day')})"></div>
      <div class="gulls" style="background-image:url(${A('fx/gulls')})"></div>
      <div class="roofline"></div><div class="sign"><small>MONSOON MARITIME MUSEUM</small>몬순 해양 박물관<div class="stars"></div></div>`;
    floorsEl.next.innerHTML = `<div class="wall locked"><div class="lockmsg">🚧 <b>실론·벵골만관</b><br>다음 업데이트에서 열려요</div></div><div class="slab"></div>`;
    floorsEl.soil.innerHTML = '<div class="soilband"></div>';
    // 지하
    floorsEl.base.innerHTML = `<div class="wall basewall">
        <div class="room storage" data-go="storage"><div class="shelves"></div><div class="rname">🗄 수장고</div><div class="badge" id="bStore"></div></div>
        <div class="room lab" data-go="lab"><div class="labtable"></div><div class="kenji">${avatar('kenji', 70)}</div><div class="rname">🔬 보존처리실</div><div class="badge" id="bLab"></div><div class="labq" id="labq"></div></div>
      </div><div class="slab"></div>`;
    floorsEl.base.querySelector('.storage').onclick = () => { if (!M.dragged) Store.open(); };
    floorsEl.base.querySelector('.lab').onclick = () => { if (!M.dragged) Store.open('raw'); };
  }

  function hallWall(f) {
    if (f === 'lobby') return `<div class="wall lobbywall"><div class="waveband"></div><div class="door"></div><div class="counter"><div class="cman">${avatar('aisha', 46)}</div></div><div class="spotcone"></div><div class="stairs r"></div></div>`;
    if (f === 'nanhaiA') return `<div class="wall hallwall"><div class="mural" style="background-image:url(${A('bg/bg_port_palembang')})"></div><div class="hallname">남해관 <small>남해·말라카</small></div><div class="stairs r"></div><div class="stairs l"></div></div>`;
    if (f === 'nanhaiB') return `<div class="wall hallwall b"><div class="mural" style="background-image:url(${A('bg/bg_market_nanhai')})"></div><div class="hallname">남해관 2 <small>바다 시장</small></div><div class="stairs l"></div></div>`;
  }

  function render() {
    for (const f of ['lobby', 'nanhaiA', 'nanhaiB']) {
      const fe = floorsEl[f];
      const locked = (f === 'nanhaiA' && G.story < 1) || (f === 'nanhaiB' && !G.hallB);
      if (locked) {
        fe.innerHTML = `<div class="wall locked"><div class="lockmsg">${f === 'nanhaiA' ? '🚧 <b>남해관</b><br>개관식 뒤에 열려요' : `🚧 <b>남해관 2</b> 확장 공사<br><button class="btn small" id="buyB">💰 ${HALLS.nanhaiB.cost} 으로 열기</button>`}</div></div><div class="slab"></div>`;
        const b = fe.querySelector('#buyB');
        if (b) b.onclick = e => { e.stopPropagation(); buyHallB(); };
        continue;
      }
      fe.innerHTML = hallWall(f) + '<div class="slots"></div><div class="slab"></div>';
      const box = fe.querySelector('.slots');
      const slots = HALLS[f].slots;
      slots.forEach((s, i) => {
        const st = G.slots[s.id] || {};
        const r = st.relic && RELICS[st.relic];
        const tier = st.tier || 0;
        const d = el('div', `slot ${s.t} t${tier} ${r ? 'full ' + RAR[r.rar].cls : 'empty'}`, null, box);
        d.style.left = s.x + 'px';
        d.dataset.slot = s.id;
        const img = r ? `<img src="${relicImg(st.relic)}">` : '<span class="plus">+</span>';
        if (s.t === 'wall') d.innerHTML = `<div class="frame">${img}</div>`;
        else if (s.t === 'spot') d.innerHTML = `<div class="spotlabel">오늘의 보물</div><div class="glass">${img}</div><div class="plinth"></div>`;
        else d.innerHTML = `<div class="glass">${img}</div><div class="plinth"></div>`;
        if (r && G.sets[r.ruin]) el('div', 'medal', '🏅', d);
        if (r && Wishes.wanted(st.relic)) el('div', 'wishflag', '💌', d);
        d.onclick = e => { if (M.dragged) return; e.stopPropagation(); Store.slotTap(s.id, f); };
        // 이야기 잇기 선
        const nx = slots[i + 1];
        if (r && nx && G.slots[nx.id] && G.slots[nx.id].relic && RELICS[G.slots[nx.id].relic].ruin === r.ruin) {
          const ln = el('div', 'link', '<span>이야기 잇기 ✨</span>', box);
          ln.style.left = s.x + 'px'; ln.style.width = (nx.x - s.x) + 'px';
          ln.style.top = (s.t === 'wall' || nx.t === 'wall' ? 92 : 112) + 'px';
        }
      });
    }
    // 지붕 별
    const stars = floorsEl.roof.querySelector('.stars');
    if (stars) stars.textContent = '★'.repeat(G.rank) + '☆'.repeat(Math.max(0, 5 - G.rank));
    badges();
  }

  function badges() {
    const raw = RELIC_ORDER.filter(r => G.relics[r] && G.relics[r].st === 'raw');
    const ready = RELIC_ORDER.filter(r => G.relics[r] && G.relics[r].st === 'ready');
    const bS = document.getElementById('bStore'), bL = document.getElementById('bLab');
    if (bS) { bS.textContent = ready.length ? `전시 대기 ${ready.length}` : ''; bS.style.display = ready.length ? '' : 'none'; }
    if (bL) { bL.textContent = raw.length ? `처리 대기 ${raw.length}` : ''; bL.style.display = raw.length ? '' : 'none'; }
    const q = document.getElementById('labq');
    if (q) {
      const busy = RELIC_ORDER.filter(r => G.relics[r] && G.relics[r].st === 'raw' && G.relics[r].t);
      q.innerHTML = busy.map(r => `<img src="${relicImg(r)}">`).join('');
    }
    HUD.tabs();
  }

  function buyHallB() {
    if (G.coins < HALLS.nanhaiB.cost) { UI.toast('💰 돈이 모자라요'); SFX.play('bad'); return; }
    G.coins -= HALLS.nanhaiB.cost; G.hallB = true;
    SFX.play('fanfare'); UI.confetti(40); UI.banner('남해관 2 개관!', '진열장 6칸이 늘었어요');
    render(); HUD.update(true); State.save();
  }

  // 화면에 보이는 층인지
  function visible(f) {
    if (!wrap) return false;
    const top = wrap.scrollTop - TOP_PAD, bot = top + 1280;
    const y = FLOORS[f].y;
    return y + FLOORS[f].h > top && y < bot;
  }
  // 월드 좌표 → 화면(fx 층) 좌표
  function toScreen(x, y) { return { x, y: y + TOP_PAD - wrap.scrollTop }; }
  function floatAt(text, x, y, cls) { const p = toScreen(x, y); UI.float(text, p.x, p.y, cls); }

  function dropCoin(f, x, n) {
    const y = floorLine(f) + rand(4, 14);
    const c = el('div', 'coindrop', `<img src="${A('icon/dinar')}">`, M.inner);
    c.style.left = (x - 20) + 'px'; c.style.top = (y - 40) + 'px'; c.style.zIndex = 5000;
    let got = false;
    const take = (tapped) => {
      if (got) return; got = true;
      G.coins += n; HUD.update(true);
      if (tapped) { SFX.play('coin'); State.stat('coins'); floatAt('+' + n, x, y - 60, 'coin'); }
      c.classList.add('take'); setTimeout(() => c.remove(), 400);
    };
    c.onpointerdown = e => { e.stopPropagation(); take(true); };
    c.onclick = e => e.stopPropagation();
    setTimeout(() => take(false), 9000);
  }
  function flash(x, y) {
    const f = el('div', 'camflash', null, M.inner);
    f.style.left = (x - 40) + 'px'; f.style.top = (y - 40) + 'px';
    setTimeout(() => f.remove(), 500);
  }
  function pulseSlot(id) {
    const d = M.inner && M.inner.querySelector(`[data-slot="${id}"]`);
    if (!d) return;
    d.classList.remove('pulse'); void d.offsetWidth; d.classList.add('pulse');
  }
  function scrollTo(f, instant) {
    if (!wrap) return;
    const target = Math.max(0, FLOORS[f].y + TOP_PAD - (f === 'lobby' ? 560 : 330));
    if (instant) wrap.scrollTop = target; else wrap.scrollTo({ top: target, behavior: 'smooth' });
  }
  function slotScreen(id) {
    const d = M.inner.querySelector(`[data-slot="${id}"]`);
    if (!d) return null;
    const r = d.getBoundingClientRect(), s = document.getElementById('stage').getBoundingClientRect();
    return { x: (r.left - s.left) / UI.scale + r.width / UI.scale / 2, y: (r.top - s.top) / UI.scale };
  }
  // PC 마우스 끌어서 스크롤
  function dragScroll() {
    let down = false, sy = 0, st = 0, moved = 0;
    wrap.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; sy = e.clientY; st = wrap.scrollTop; moved = 0; M.dragged = false; });
    window.addEventListener('pointermove', e => {
      if (!down) return;
      const d = (e.clientY - sy) / (UI.scale || 1); moved = Math.max(moved, Math.abs(d));
      if (moved > 8) { M.dragged = true; wrap.scrollTop = st - d; }
    });
    window.addEventListener('pointerup', () => { down = false; setTimeout(() => { M.dragged = false; }, 30); });
  }
  return Object.assign(M, { build, render, badges, visible, floatAt, dropCoin, flash, pulseSlot, scrollTo, slotScreen });
})();

// ---------- 위 HUD · 아래 탭 ----------
const HUD = (() => {
  let h, tabs, last = 0;
  function build() {
    const L = UI.L.hud; L.innerHTML = '';
    h = el('div', 'hud', `
      <div class="money"><img src="${A('icon/dinar')}"><b id="hCoins">0</b></div>
      <div class="fame"><div class="rk" id="hRank"></div><div class="bar"><i id="hFame"></i></div><div class="ft" id="hFameT"></div></div>
      <div class="vis">👥 <b id="hVis">0</b></div>
      <button class="ib goal" id="hGoal">🎯<span class="dot" id="hGoalDot"></span></button>
      <button class="ib" id="hMenu">⚙</button>`, L);
    h.querySelector('#hGoal').onclick = () => { SFX.play('click'); Goals.open(); };
    h.querySelector('#hMenu').onclick = () => { SFX.play('click'); Menu.open(); };
    tabs = el('div', 'tabs', null, L);
    const tab = (id, icon, label, fn) => {
      const b = el('button', 'tab', `<img src="${A('icon/' + icon)}"><span>${label}</span><i class="tdot" id="t_${id}"></i>`, tabs);
      b.onclick = () => { SFX.play('click'); fn(); };
    };
    tab('exp', 'map', '원정', () => Expedition.open());
    tab('store', 'ledger', '수장고', () => Store.open());
    tab('codex', 'codex', '도감', () => Codex.open());
    tab('wish', 'inn', '소원 수첩', () => Wishes.openBook());
    update(true); goalBadge();
  }
  function update(force) {
    const t = performance.now();
    if (!force && t - last < 250) return; last = t;
    if (!h || !G) return;
    h.querySelector('#hCoins').textContent = fmt(G.coins);
    h.querySelector('#hVis').textContent = Visitors.list.length;
    const nx = RANKS[G.rank + 1];
    h.querySelector('#hRank').textContent = G.rank ? '★'.repeat(G.rank) : '☆';
    const need = nx && nx.need ? nx.need.fame : Math.max(1, G.fame);
    h.querySelector('#hFame').style.width = Math.min(100, G.fame / need * 100) + '%';
    h.querySelector('#hFameT').textContent = nx && nx.need ? `명성 ${G.fame}/${need}` : `명성 ${G.fame}`;
  }
  function goalBadge() {
    const d = document.getElementById('hGoalDot');
    if (d) d.style.display = G && G.goals.some(g => g.ready && !g.got) ? 'block' : 'none';
  }
  function tabsBadges() {
    if (!G) return;
    const set = (id, on, txt) => { const d = document.getElementById('t_' + id); if (d) { d.style.display = on ? 'block' : 'none'; d.textContent = txt || ''; } };
    const back = G.exps.filter(e => State.now() >= e.end).length;
    set('exp', back > 0, back ? '!' : '');
    const n = RELIC_ORDER.filter(r => G.relics[r] && G.relics[r].st !== 'shown').length;
    set('store', n > 0, n);
    set('wish', G.wishes.length > 0, G.wishes.length);
  }
  return { build, update, goalBadge, tabs: tabsBadges };
})();
