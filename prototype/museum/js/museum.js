// 박물관 건물 단면 · 진열장 · 관람객 · HUD · 아래 탭
'use strict';

// 층 배치 (월드 좌표, 위 → 아래)
// 방 그림(1536×1024)을 가로 720 으로 줄이면 높이 480 → 위 64px 를 잘라 380px 한 층 (천장 ~45 · 벽 · 바닥 300~376)
const FLOORS = {
  roof: { y: 0, h: 170 },
  next: { y: 170, h: 380 },
  nanhaiB: { y: 550, h: 380 },
  nanhaiA: { y: 930, h: 380 },
  lobby: { y: 1310, h: 380 },
  base: { y: 1690, h: 380 },
  soil: { y: 2070, h: 80 },
};
const WORLD_H = 2150, TOP_PAD = 104, BOT_PAD = 138;
const floorLine = f => FLOORS[f].y + FLOORS[f].h - 40;
const roomBg = (key, x = 0) => `background-image:url(${A('room/' + key)});background-position:${-x}px -64px`;

// ---------- 관람객 그림: 2.5등신 관절 인형 (부위 그림 · assets/art.js 의 RIG) ----------
const Look = (() => {
  // 손 소품 붙는 방식: up = 손 위로 (양산·깃발·풍선) · down = 손 아래로 (지팡이·가방) · 나머지 = 손에 쥠
  const UP = [11, 20, 23], DOWN = [4, 7, 8, 9, 10, 19, 21];
  const BOX_W = 72, BOX_H = 125;
  function part(cls, src, x, y, w, h, ox, oy, extra) {
    return `<div class="${cls}" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${w}px;height:${h}px;transform-origin:${ox.toFixed(1)}px ${oy.toFixed(1)}px"><img src="${src}">${extra || ''}</div>`;
  }
  function build(who, back) {
    const R = RIG[who], d = R.d;
    const H = d[back ? 'hb' : 'hs'], T = d[back ? 'tb' : 'ts'], Ar = d.arm, L = d.leg;
    const src = k => A(`vis/${who}_${k}`);
    const ty = H.h * 0.9, tx = BOX_W / 2 - T.top;
    const legY = ty + T.h - L.h * 0.14, armY = ty + T.h * 0.1 - Ar.h * 0.04;
    const total = legY + L.h, top = BOX_H - 4 - total;
    const hx = tx + T.top - H.bot, legX = tx + T.bot - L.top, armX = tx + T.sh - Ar.top;
    // 손 소품 · 카메라
    let prop = '', cam = '';
    if (R.prop && !back) {
      const pm = MAN['vis/prop' + R.prop], pw = pm.w / 2, ph = pm.h / 2;
      const py = UP.includes(R.prop) ? Ar.h - ph + 4 : DOWN.includes(R.prop) ? Ar.h - 8 : Ar.h - ph * 0.6;
      prop = `<img class="prop" src="${A('vis/prop' + R.prop)}" style="left:${(Ar.bot - pw / 2).toFixed(1)}px;top:${py.toFixed(1)}px;width:${pw}px;height:${ph}px">`;
    }
    if (!back) { const cm = MAN['vis/prop1']; cam = `<img class="cam" src="${A('vis/prop1')}" style="left:${(Ar.bot - cm.w / 4).toFixed(1)}px;top:${(Ar.h - cm.h / 4).toFixed(1)}px;width:${cm.w / 2}px;height:${cm.h / 2}px">`; }
    let s = '';
    s += part('ar arB', src('arm'), armX + (back ? -3 : 3), armY, Ar.w, Ar.h, Ar.top, Ar.h * 0.05);
    s += part('lg lg2', src('leg'), legX + 3, legY, L.w, L.h, L.top, 2);
    s += part('lg lg1', src('leg'), legX - 3, legY, L.w, L.h, L.top, 2);
    s += part('torso', src(back ? 'tb' : 'ts'), tx, ty, T.w, T.h, T.bot, T.h);
    s += part('hd', src(back ? 'hb' : 'hs'), hx, 0, H.w, H.h, H.bot, H.h * 0.95, back ? '' : `<i class="tear" style="left:${(H.w * 0.72).toFixed(0)}px;top:${(H.h * 0.55).toFixed(0)}px"></i>`);
    s += part('ar arF', src('arm'), armX + (back ? 3 : -3), armY, Ar.w, Ar.h, Ar.top, Ar.h * 0.05, prop + cam);
    return `<div class="rig" style="top:${top.toFixed(1)}px;height:${total.toFixed(1)}px;transform-origin:${BOX_W / 2}px ${total.toFixed(1)}px">${s}</div>`;
  }
  // group: seasia · china · world · special / type: 0 어른 · 1 어른 · 2 어르신 · 3 아이 / who: 특정 인물 (예 special_1_3)
  function make(group, type, who) {
    if (!who) {
      let pool = RIG[group] || RIG.world;
      if (type != null) pool = pool.filter(w => w.endsWith('_' + type));
      who = pick(pool);
    }
    const R = RIG[who];
    return { who, side: build(who, false), back: build(who, true), child: R.kid, elder: R.elder, cane: R.prop === 4 };
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
    const look = Look.make(group, opts.type, opts.who);
    const v = { id: ++seq, group, look, f: 'lobby', x: -30, y: floorLine('lobby') + rand(2, 12), dir: 1, act: null, t: 0, opts };
    v.el = el('div', 'vis p-walk' + (look.child ? ' kid' : '') + (look.elder ? ' elder' : '') + (look.cane ? ' cane' : ''), `<div class="body">${look.side}</div>`, layer);
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
  // 말풍선: 아는 이모지는 새 말풍선 아이콘 그림으로
  const BUB = { '❤️': 'heart', '✨': 'sparkle', '📷': 'camera', '💭': 'book', '💧': 'tear', '😊': 'thumb', '🙂': 'thumb', '👋': 'thumb', '😆': 'thumb', '🥰': 'heart', '❓': 'question', '🪙': 'coin' };
  function bubble(v, emo, cls) {
    const ic = BUB[emo];
    const b = el('div', 'vbub ' + (cls || '') + (ic ? ' icon' : ''), ic ? `<img src="${A('icon/bub_' + ic)}">` : emo, v.el);
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

  // 직원 SD 2프레임 (A ↔ B)
  function staffSd(who, col, cls) {
    return `<div class="sdwork ${cls}"><img class="fa" src="${A(`sd/${who}_w${col}A`)}"><img class="fb" src="${A(`sd/${who}_w${col}B`)}"></div>`;
  }
  function drawStatic() {
    // 지붕
    floorsEl.roof.innerHTML = `<div class="sky" style="background-image:url(${A('bg/sky_day')})"></div>
      <div class="gulls" style="background-image:url(${A('fx/gulls')})"></div>
      <img class="roofpart" src="${A('frame/roof_flat')}">
      <div class="roofline"></div><div class="sign"><small>MONSOON MARITIME MUSEUM</small>몬순 해양 박물관<div class="stars"></div></div>`;
    floorsEl.next.innerHTML = `<div class="wall roomwall locked" style="${roomBg('hall_ceylon')}"><img class="scaffold" src="${A('frame/scaffold')}"><div class="lockmsg">🚧 <b>실론·벵골만관</b><br>다음 업데이트에서 열려요</div></div><div class="slab"></div>`;
    floorsEl.soil.innerHTML = `<div class="soilband" style="background-image:url(${A('frame/soil')})"></div>`;
    // 지하: 수장고 + 보존처리실
    floorsEl.base.innerHTML = `<div class="wall basewall">
        <div class="room storage" data-go="storage" style="${roomBg('room_storage', 0)}"><div class="rname">🗄 수장고</div><div class="badge" id="bStore"></div></div>
        <div class="room lab" data-go="lab" style="${roomBg('room_conservation', 250)}">${staffSd('kenji', 2, 'kenji')}<div class="rname">🔬 보존처리실</div><div class="badge" id="bLab"></div><div class="labq" id="labq"></div></div>
      </div><div class="slab"></div>`;
    floorsEl.base.querySelector('.storage').onclick = () => { if (!M.dragged) Store.open(); };
    floorsEl.base.querySelector('.lab').onclick = () => { if (!M.dragged) Store.open('raw'); };
  }

  function hallWall(f) {
    if (f === 'lobby') return `<div class="wall roomwall" style="${roomBg('room_lobby')}"><div class="lbanner">몬순 해양 박물관<small>MONSOON MARITIME MUSEUM</small></div>
      ${staffSd('aisha', 2, 'aisha')}<div class="counterfront" style="${roomBg('room_lobby')}"></div><div class="spotcone"></div><img class="stairimg r" src="${A('frame/stair')}"></div>`;
    if (f === 'nanhaiA') return `<div class="wall roomwall" style="${roomBg('hall_nanhai')}"><div class="hallname">남해관 <small>남해·말라카</small></div><img class="stairimg l" src="${A('frame/stair')}"></div>`;
    if (f === 'nanhaiB') return `<div class="wall roomwall" style="${roomBg('hall_daily_life')}"><div class="hallname">남해관 2 <small>바다 시장</small></div></div>`;
  }

  function render() {
    for (const f of ['lobby', 'nanhaiA', 'nanhaiB']) {
      const fe = floorsEl[f];
      const locked = (f === 'nanhaiA' && G.story < 1) || (f === 'nanhaiB' && !G.hallB);
      if (locked) {
        fe.innerHTML = `<div class="wall roomwall locked" style="${roomBg(f === 'nanhaiA' ? 'hall_nanhai' : 'hall_daily_life')}"><img class="scaffold" src="${A('frame/scaffold')}"><div class="lockmsg">${f === 'nanhaiA' ? '🚧 <b>남해관</b><br>개관식 뒤에 열려요' : `🚧 <b>남해관 2</b> 확장 공사<br><button class="btn small" id="buyB">💰 ${HALLS.nanhaiB.cost} 으로 열기</button>`}</div></div><div class="slab"></div>`;
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
        const img = r ? `<img class="relic" src="${relicImg(st.relic)}">` : '<span class="plus">+</span>';
        const kind = { case: 1, wall: 2, spot: 3 }[s.t];
        d.innerHTML = (s.t === 'spot' ? '<div class="spotlabel">오늘의 보물</div>' : '') + `<img class="cimg" src="${A(`furn/case${kind}_t${tier}`)}"><div class="rbox">${img}</div>`;
        if (r && G.sets[r.ruin]) el('div', 'medal', '🏅', d);
        if (r && Wishes.wanted(st.relic)) el('div', 'wishflag', '💌', d);
        d.onclick = e => { if (M.dragged) return; e.stopPropagation(); Store.slotTap(s.id, f); };
        // 이야기 잇기 선
        const nx = slots[i + 1];
        if (r && nx && G.slots[nx.id] && G.slots[nx.id].relic && RELICS[G.slots[nx.id].relic].ruin === r.ruin) {
          const ln = el('div', 'link', '<span>이야기 잇기 ✨</span>', box);
          ln.style.left = s.x + 'px'; ln.style.width = (nx.x - s.x) + 'px';
          ln.style.top = '322px';
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
    const c = el('div', 'coindrop', `<img src="${A('icon/m_coin')}">`, M.inner);
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
      <div class="money"><img src="${A('icon/m_coin')}"><b id="hCoins">0</b></div>
      <div class="fame"><div class="rk" id="hRank"></div><div class="bar"><i id="hFame"></i></div><div class="ft" id="hFameT"></div></div>
      <div class="vis"><img src="${A('icon/m_visitor')}"><b id="hVis">0</b></div>
      <button class="ib goal" id="hGoal">🎯<span class="dot" id="hGoalDot"></span></button>
      <button class="ib" id="hMenu"><img src="${A('icon/m_settings')}"></button>`, L);
    h.querySelector('#hGoal').onclick = () => { SFX.play('click'); Goals.open(); };
    h.querySelector('#hMenu').onclick = () => { SFX.play('click'); Menu.open(); };
    tabs = el('div', 'tabs', null, L);
    const tab = (id, icon, label, fn) => {
      const b = el('button', 'tab', `<img src="${A('icon/' + icon)}"><span>${label}</span><i class="tdot" id="t_${id}"></i>`, tabs);
      b.onclick = () => { SFX.play('click'); fn(); };
    };
    tab('exp', 'm_map', '원정', () => Expedition.open());
    tab('store', 'm_storage', '수장고', () => Store.open());
    tab('codex', 'm_codex', '도감', () => Codex.open());
    tab('wish', 'm_gift', '소원 수첩', () => Wishes.openBook());
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
