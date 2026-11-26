// 수장고 · 전시 배치 · 유물 카드 · 도감 · 보존처리 미니게임
'use strict';

const fits = (slotT, relic) => slotT === 'spot' || RELICS[relic].slot === slotT;
const slotName = id => {
  for (const h in HALLS) { const i = HALLS[h].slots.findIndex(s => s.id === id); if (i >= 0) return id === 'L0' ? '로비 「오늘의 보물」' : `${HALLS[h].name} ${i + 1}번 ${HALLS[h].slots[i].t === 'wall' ? '액자' : '진열장'}`; }
  return id;
};

const Store = (() => {
  let placing = null;

  function open(filter) {
    Story.emit('storeOpen');
    const p = UI.panel('store-panel', '🗄 수장고');
    const tabs = el('div', 'ptabs', null, p);
    const body = el('div', 'grid', null, p);
    const F = [['all', '전체'], ['raw', '처리 대기'], ['ready', '전시 대기'], ['shown', '전시 중']];
    let cur = filter || 'all';
    const draw = () => {
      tabs.innerHTML = '';
      for (const [k, n] of F) {
        const b = el('button', 'ptab' + (k === cur ? ' on' : ''), n, tabs);
        b.onclick = () => { SFX.play('click'); cur = k; draw(); };
      }
      body.innerHTML = '';
      if (G.crate) {
        const c = el('div', 'rcard crate', `<div class="rimg">📦</div><b>1998년 상자</b><span>열어 보기</span>`, body);
        c.onclick = () => { SFX.play('open'); p.close(); Story.openCrate(); };
      }
      const ids = RELIC_ORDER.filter(r => G.relics[r] && (cur === 'all' || G.relics[r].st === cur));
      if (!ids.length && !G.crate) el('p', 'empty', cur === 'raw' ? '처리할 유물이 없어요. 원정을 보내 보세요!' : '아직 없어요. 원정을 보내 유물을 찾아 보세요!', body);
      for (const r of ids) {
        const R = RELICS[r], st = G.relics[r];
        const label = st.st === 'raw' ? (st.t ? `⏳ ${Math.max(0, Math.ceil((st.t - State.now()) / 1000))}초` : '🔬 처리 대기') : st.st === 'ready' ? '✅ 전시 대기' : '🏛 전시 중';
        const c = el('div', `rcard ${RAR[R.rar].cls} st-${st.st}`, `<div class="rimg"><img src="${relicImg(r)}"></div><b>${R.name}</b><span>${label}</span>${Wishes.wanted(r) ? '<i class="wf">💌</i>' : ''}`, body);
        c.onclick = () => { SFX.play('click'); cardAction(r, p); };
      }
    };
    draw();
    p.redraw = draw;
  }

  function cardAction(r, p) {
    const st = G.relics[r];
    if (st.st === 'raw') {
      const q = UI.panel('relic-panel', '🔬 보존처리');
      const m = MG[RELICS[r].mg];
      el('div', 'rbig', `<img src="${relicImg(r)}" class="dirty">`, q);
      el('p', 'center', `<b>${RELICS[r].name}</b><br>처리 방법: <b>${m.name}</b>`, q);
      const row = el('div', 'row', null, q);
      btn('🖐 직접 처리하기', '', async () => { q.close(); const ok = await Conserve.play(r); if (ok) await Conserve.done(r); }, row);
      if (G.story >= 1) {
        if (st.t) el('p', 'center small', `${m.who}가 처리하는 중이에요 · ${Math.max(0, Math.ceil((st.t - State.now()) / 1000))}초 남음`, q);
        else btn(`🧑‍🔬 ${m.who}에게 맡기기 (${m.wait}초)`, 'paper', () => { st.t = State.now() + m.wait * 1000; State.save(); q.close(); UI.toast(`${m.who}: 맡겨 주세요!`); Museum.badges(); }, row);
      }
    } else if (st.st === 'ready') {
      if (p) p.close(); else UI.closePanel();
      startPlace(r);
    } else card(r, Store.slotOfRelic(r));
  }

  // 유물 카드 (자세히)
  function card(r, slotId) {
    const R = RELICS[r];
    const q = UI.panel('relic-panel', null);
    const hero = has('relic/' + r + '_hero') ? A('relic/' + r + '_hero') : relicImg(r);
    el('div', `rbig glow ${RAR[R.rar].cls}`, `<img src="${hero}">`, q);
    el('div', 'rtitle', `<span class="rar" style="background:${RAR[R.rar].color}">${R.rar}</span><b>${R.name}</b><small>${RUINS[R.ruin].name} · ${R.cat}</small>`, q);
    el('p', 'rdesc', R.desc, q);
    el('p', 'rsrc', '📚 고증 근거: ' + R.src, q);
    if (slotId) {
      const s = G.slots[slotId];
      const linked = State.linked(slotId);
      el('p', 'rinfo', `🏛 ${slotName(slotId)} · 매력 <b>${State.slotScore(slotId)}</b>${linked ? ' · <span class="gold">이야기 잇기 ✨ +30%</span>' : ''}${G.sets[R.ruin] ? ' · <span class="gold">🏅 세트 +20%</span>' : ''}`, q);
      const row = el('div', 'row', null, q);
      if (slotId !== 'L0') {
        const t = s.tier || 0;
        if (t < 2) {
          const nx = TIER[t + 1];
          const b = btn(`⬆ ${nx.name} (💰${nx.cost})`, '', () => {
            if (G.coins < nx.cost) { UI.toast('💰 돈이 모자라요'); SFX.play('bad'); return; }
            G.coins -= nx.cost; s.tier = t + 1; SFX.play('stamp'); UI.toast(`${nx.name}로 바꿨어요! 매력 ×${nx.mult}`, 'good');
            Museum.render(); HUD.update(true); State.save(); q.close(); Museum.pulseSlot(slotId);
          }, row);
          if (G.coins < nx.cost) b.classList.add('faded');
        } else el('span', 'small', '최고급 진열장이에요 ✨', row);
      }
      btn('수장고로 내리기', 'paper', () => { s.relic = null; G.relics[r].st = 'ready'; Museum.render(); State.save(); q.close(); }, row);
    }
  }

  function slotOfRelic(r) { return State.slotOf(r); }

  // ---------- 전시 배치 ----------
  function startPlace(r) {
    placing = r;
    const targets = State.allSlots().filter(s => fits(s.t, r));
    if (!targets.length) { UI.toast('놓을 수 있는 칸이 없어요'); placing = null; return; }
    for (const o of UI.L.hud.querySelectorAll('.placebar')) o.remove();
    document.body.classList.add('placing');
    const hall = targets.find(s => !(G.slots[s.id] && G.slots[s.id].relic)) || targets[0];
    if (G.story >= 1 || r !== 'changsha_bird_bowl') Museum.scrollTo(hall.hall);
    Museum.render();
    for (const s of targets) { const d = Museum.inner.querySelector(`[data-slot="${s.id}"]`); if (d) d.classList.add('target'); }
    const bar = el('div', 'placebar', `<img src="${relicImg(r)}"><span><b>${RELICS[r].name}</b><br>빛나는 칸을 눌러 전시하세요</span>`, UI.L.hud);
    btn('취소', 'small paper', () => endPlace(), bar);
  }
  function endPlace() {
    placing = null; document.body.classList.remove('placing');
    for (const b of UI.L.hud.querySelectorAll('.placebar')) b.remove();
    Museum.render();
  }
  async function place(slotId) {
    const r = placing;
    endPlace();
    const s = G.slots[slotId] || (G.slots[slotId] = { relic: null, tier: 0 });
    if (s.relic) { G.relics[s.relic].st = 'ready'; UI.toast(`「${RELICS[s.relic].name}」은 수장고로 돌아갔어요`); }
    s.relic = r; G.relics[r].st = 'shown';
    SFX.play('stamp');
    const first = !G.relics[r].shownOnce; G.relics[r].shownOnce = true;
    Museum.render(); Museum.pulseSlot(slotId);
    const p = Museum.slotScreen(slotId);
    if (first && p) { UI.float('첫 전시! ★+2', p.x, p.y - 20, 'fame'); State.addFame(2); }
    if (State.linked(slotId)) { SFX.play('discover'); if (p) UI.float('이야기 잇기 ✨', p.x, p.y - 60, 'gold'); }
    Story.emit('placed', slotId);
    Wishes.check(r);
    const sets = State.checkSets();
    for (const ruin of sets) {
      SFX.play('fanfare'); UI.confetti(50);
      UI.banner(`🏅 세트 완성 — ${RUINS[ruin].name}`, '그 유적 유물 모두 매력 +20% · 명성 +10');
      State.addFame(10); Museum.render();
    }
    State.save();
    Story.afterPlace(r, sets);
  }

  function slotTap(slotId, hall) {
    const slot = HALLS[hall].slots.find(s => s.id === slotId);
    if (placing) {
      if (!fits(slot.t, placing)) { UI.toast(RELICS[placing].slot === 'wall' ? '종이·그림은 벽 액자에 걸어요' : '물건은 진열장에 놓아요'); SFX.play('bad'); return; }
      place(slotId); return;
    }
    const st = G.slots[slotId];
    if (st && st.relic) { SFX.play('click'); card(st.relic, slotId); return; }
    // 빈 칸: 놓을 수 있는 유물 고르기
    const ready = RELIC_ORDER.filter(r => G.relics[r] && G.relics[r].st === 'ready' && fits(slot.t, r));
    if (!ready.length) {
      const any = RELIC_ORDER.some(r => G.relics[r] && G.relics[r].st === 'ready');
      UI.toast(any ? (slot.t === 'wall' ? '벽 액자에는 탁본·그림·문서를 걸어요' : '진열장에 놓을 물건이 없어요') : '전시할 유물이 없어요 — 원정을 보내거나 보존처리를 해 보세요');
      return;
    }
    const q = UI.panel('pick-panel', `${slotName(slotId)}에 전시하기`);
    const g = el('div', 'grid', null, q);
    for (const r of ready) {
      const c = el('div', `rcard ${RAR[RELICS[r].rar].cls}`, `<div class="rimg"><img src="${relicImg(r)}"></div><b>${RELICS[r].name}</b><span>${RELICS[r].rar}</span>`, g);
      c.onclick = () => { q.close(); placing = r; place(slotId); };
    }
  }
  return { open, card, slotTap, startPlace, endPlace, slotOfRelic, get placing() { return placing; } };
})();

// ---------- 도감 ----------
const Codex = {
  open() {
    const p = UI.panel('codex-panel', '📖 남해관 도감');
    const got = RELIC_ORDER.filter(r => G.relics[r]).length;
    el('p', 'center', `찾은 유물 <b>${got}</b> / ${RELIC_ORDER.length} · 완성한 세트 <b>${State.setCount()}</b> / ${RUIN_ORDER.length}`, p);
    const body = el('div', 'codexbody', null, p);
    for (const ruin of RUIN_ORDER) {
      const R = RUINS[ruin];
      const sec = el('div', 'csec', `<h3>${G.sets[ruin] ? '🏅 ' : ''}${R.name} <small>${kindIcon(R.kind)} ${KIND[R.kind].name}</small></h3>`, body);
      const row = el('div', 'crow', null, sec);
      for (const r of R.relics) {
        const own = G.relics[r];
        const c = el('div', `ccell ${own ? RAR[RELICS[r].rar].cls : 'unk'}`, `<img src="${relicImg(r)}"><span>${own ? RELICS[r].name : '?'}</span>`, row);
        if (own) c.onclick = () => { SFX.play('click'); Store.card(r, State.slotOf(r)); };
      }
    }
    const fb = el('div', 'csec', '<h3>🎞 회상 다시 보기</h3>', body);
    const row = el('div', 'row wrap', null, fb);
    for (const id in FLASHBACKS) {
      if (G.flash[id]) btn(FLASHBACKS[id].title, 'small', () => { UI.closePanel(); Story.run(() => Story.flash(id, true)); }, row);
      else el('span', 'lockfb', '🔒 ???', row);
    }
  },
};

// ---------- 보존처리 미니게임 ----------
const Conserve = (() => {
  function frame(title, help) {
    const p = UI.panel('mg-panel', title);
    el('p', 'center help', help, p);
    const area = el('div', 'mgarea', null, p);
    return { p, area };
  }

  function play(r) {
    const type = RELICS[r].mg;
    SFX.play('open');
    if (type === 'puzzle') return puzzle(r);
    if (type === 'desalt') return desalt(r);
    return scratch(r, type, { title: MG[type].name, help: type === 'rub' ? '종이를 문질러 글자를 살려 내세요' : type === 'sketch' ? '흐려진 선을 문질러 되살리세요' : '흙과 녹을 문질러 닦아 내세요' });
  }

  // 조각 맞추기
  function puzzle(r) {
    return new Promise(res => {
      const { p, area } = frame('🧩 조각 맞추기', '깨진 조각을 끌어서 제자리에 맞추세요');
      area.classList.add('bench'); area.style.backgroundImage = `url(${A('bg/mg_conservation_bench')})`;
      const W = 380, H = 300, ox = (area.clientWidth || 600) / 2 - W / 2, oy = 70;
      const ghost = el('img', 'pzghost', null, area);
      ghost.src = relicImg(r); Object.assign(ghost.style, { left: ox + 'px', top: oy + 'px', width: W + 'px', height: H + 'px' });
      const cols = 3, rows = 2;
      const P = [];
      for (let j = 0; j <= rows; j++) { P.push([]); for (let i = 0; i <= cols; i++) {
        const edge = i === 0 || j === 0 || i === cols || j === rows;
        P[j].push([i / cols * 100 + (edge ? 0 : rand(-8, 8)), j / rows * 100 + (edge ? 0 : rand(-10, 10))]);
      } }
      const mid = (a, b, k) => [(a[0] + b[0]) / 2 + (k ? rand(-5, 5) : 0), (a[1] + b[1]) / 2 + (k ? rand(-5, 5) : 0)];
      const H_ = {}, V_ = {};
      for (let j = 0; j <= rows; j++) for (let i = 0; i < cols; i++) H_[j + ',' + i] = mid(P[j][i], P[j][i + 1], j > 0 && j < rows);
      for (let j = 0; j < rows; j++) for (let i = 0; i <= cols; i++) V_[j + ',' + i] = mid(P[j][i], P[j + 1][i], i > 0 && i < cols);
      let left = cols * rows;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const poly = [P[j][i], H_[j + ',' + i], P[j][i + 1], V_[j + ',' + (i + 1)], P[j + 1][i + 1], H_[(j + 1) + ',' + i], P[j + 1][i], V_[j + ',' + i]];
        const d = el('div', 'pzpiece', `<img src="${relicImg(r)}">`, area);
        Object.assign(d.style, { left: ox + 'px', top: oy + 'px', width: W + 'px', height: H + 'px', clipPath: `polygon(${poly.map(q => q[0] + '% ' + q[1] + '%').join(',')})` });
        let dx = rand(-1, 1) > 0 ? rand(120, 170) : rand(-170, -120), dy = rand(-1, 1) > 0 ? rand(70, 120) : rand(-60, -40) + (j ? 150 : 0);
        dy = Math.max(-oy + 10, Math.min(dy, 420 - oy - H));
        let rot = rand(-25, 25), locked = false;
        const put = () => { d.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`; };
        put();
        d.onpointerdown = e => {
          if (locked) return;
          e.preventDefault(); d.setPointerCapture(e.pointerId);
          const sx = e.clientX, sy = e.clientY, bx = dx, by = dy; d.style.zIndex = 10; rot = 0; put(); SFX.play('pop');
          d.onpointermove = ev => { dx = bx + (ev.clientX - sx) / UI.scale; dy = by + (ev.clientY - sy) / UI.scale; put(); };
          d.onpointerup = () => {
            d.onpointermove = null; d.style.zIndex = '';
            if (Math.abs(dx) < 28 && Math.abs(dy) < 28) {
              dx = 0; dy = 0; locked = true; put(); d.classList.add('locked'); SFX.play('snap');
              if (--left === 0) finish();
            }
          };
        };
      }
      let fin = false;
      function finish() {
        if (fin) return; fin = true;
        ghost.remove(); area.classList.add('solved'); SFX.play('win');
        setTimeout(() => { p.close(); res(true); }, 900);
      }
      p.querySelector('.x').onclick = () => { p.close(); res(false); };
      p.cheat = finish;
      Conserve.cur = p;
    });
  }

  // 문질러 닦기 (흙 · 탁본 · 모사도)
  function scratch(r, type, o) {
    return new Promise(res => {
      const { p, area } = frame('🖐 ' + o.title, o.help);
      const S = 400;
      const box = el('div', 'scbox ' + type, `<img src="${relicImg(r)}">`, area);
      const tools = { clean: [4, 5], rub: [2, 3], sketch: [4, 1] }[type] || [4, 5];
      el('div', 'mgtools', tools.map(n => `<img src="${A('mg/tool' + n)}">`).join(''), area);
      const cv = el('canvas', 'sccv', null, box); cv.width = S; cv.height = S;
      paintCover(cv, type === 'clean' ? 'dirt' : type === 'rub' ? 'paper' : 'sketch');
      let fin = false;
      const done = () => { if (fin) return; fin = true; cv.classList.add('clear'); SFX.play('win'); box.classList.add('shine'); setTimeout(() => { p.close(); res(true); }, 1100); };
      scratchable(cv, 36, done, 0.8);
      p.querySelector('.x').onclick = () => { p.close(); res(false); };
      p.cheat = done; Conserve.cur = p;
    });
  }

  // 소금기 빼기 (타이밍)
  function desalt(r) {
    return new Promise(res => {
      const { p, area } = frame('💧 소금기 빼기', '소금 눈금이 초록 칸에 오면 「물 갈기」! 세 번 성공하면 끝나요');
      el('div', 'tank', `<div class="water"></div><img src="${relicImg(r)}"><div class="bub"></div>`, area).style.backgroundImage = `url(${A('bg/mg_desalination_tank')})`;
      const meter = el('div', 'meter', '<div class="zone"></div><div class="lvl"></div>', area);
      const info = el('div', 'mginfo', '성공 0 / 3', area);
      const lvl = meter.querySelector('.lvl');
      let v = 0, ok = 0, speed = 28, fin = false;
      const iv = setInterval(() => { v += speed * 0.05; if (v >= 100) { v = 0; UI.toast('앗, 소금이 너무 올라왔어요. 다시!'); SFX.play('bad'); } lvl.style.height = v + '%'; }, 50);
      const b = btn('💧 물 갈기', '', () => {
        if (fin) return;
        if (v >= 68 && v <= 92) { ok++; v = 0; speed += 10; SFX.play('water'); info.textContent = `성공 ${ok} / 3`; area.querySelector('.tank').classList.add('fresh'); setTimeout(() => area.querySelector('.tank').classList.remove('fresh'), 500); if (ok >= 3) done(); }
        else if (v < 68) { UI.toast('아직 일러요 — 물이 아까워요'); v = Math.max(0, v - 10); SFX.play('bad'); }
      }, area);
      b.classList.add('bigbtn');
      function done() { if (fin) return; fin = true; clearInterval(iv); SFX.play('win'); setTimeout(() => { p.close(); res(true); }, 700); }
      p.querySelector('.x').onclick = () => { clearInterval(iv); p.close(); res(false); };
      p.cheat = done; Conserve.cur = p;
    });
  }

  // 처리 완료 → 기록 카드
  function done(r) {
    G.relics[r].st = 'ready'; delete G.relics[r].t;
    State.stat('restore'); State.addFame(1); State.save(); Museum.badges();
    Story.emit('restored', r);
    return new Promise(res => {
      const R = RELICS[r];
      const q = UI.panel('relic-panel record', '📇 기록 카드', () => res());
      el('div', `rbig glow ${RAR[R.rar].cls}`, `<img src="${relicImg(r)}">`, q);
      el('div', 'stampmark', '보존처리 완료', q);
      SFX.play('stamp');
      el('div', 'rtitle', `<span class="rar" style="background:${RAR[R.rar].color}">${R.rar}</span><b>${R.name}</b><small>${RUINS[R.ruin].name} · ${R.cat}</small>`, q);
      el('p', 'rdesc', R.desc, q);
      el('p', 'rsrc small', '실제 보존처리는 몇 달에서 몇 년이 걸려요. 게임에서는 줄였어요.', q);
      const row = el('div', 'row', null, q);
      btn('🏛 바로 전시하기', '', () => { q.close(); Store.startPlace(r); }, row);
      if (!Story.tutorial) btn('수장고에 두기', 'paper', () => q.close(), row);
    });
  }
  return { play, done };
})();

// 캔버스 덮개 그리기 + 문지르기 (보존처리 · 발굴 공용)
function paintCover(cv, skin) {
  const c = cv.getContext('2d', { willReadFrequently: true }), W = cv.width, H = cv.height;
  const base = { dirt: '#7a5634', sand: '#d9c08a', paper: '#efe4c8', sketch: '#e9dcbc', straw: '#c9a55a' }[skin] || '#7a5634';
  c.fillStyle = base; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * W, y = Math.random() * H, r = Math.random() * (skin === 'paper' || skin === 'sketch' ? 2 : 7) + 1;
    c.fillStyle = skin === 'dirt' ? `rgba(${40 + Math.random() * 60},${25 + Math.random() * 40},${10 + Math.random() * 20},.6)`
      : skin === 'sand' ? `rgba(${180 + Math.random() * 60},${150 + Math.random() * 50},${90 + Math.random() * 40},.7)`
      : skin === 'straw' ? `rgba(${150 + Math.random() * 80},${110 + Math.random() * 60},${30 + Math.random() * 30},.8)`
      : `rgba(${150 + Math.random() * 60},${130 + Math.random() * 50},${90 + Math.random() * 40},.25)`;
    c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  }
  if (skin === 'straw') { c.strokeStyle = 'rgba(240,210,120,.9)'; c.lineWidth = 3; for (let i = 0; i < 160; i++) { const x = Math.random() * W, y = Math.random() * H, a = Math.random() * 7; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 50, y + Math.sin(a) * 50); c.stroke(); } }
  if (skin === 'sketch') { c.strokeStyle = 'rgba(120,90,50,.18)'; for (let y = 10; y < H; y += 22) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); } }
  if (skin === 'sand') { c.fillStyle = 'rgba(60,140,160,.25)'; c.fillRect(0, 0, W, H); }
}
function scratchable(cv, rad, onDone, need = 0.8) {
  const c = cv.getContext('2d');
  c.globalCompositeOperation = 'destination-out';
  let down = false, last = null, lastS = 0, checkT = 0, fin = false;
  const pos = e => { const b = cv.getBoundingClientRect(); return { x: (e.clientX - b.left) / b.width * cv.width, y: (e.clientY - b.top) / b.height * cv.height }; };
  const rub = p => {
    c.lineCap = 'round'; c.lineWidth = rad * 2;
    c.beginPath(); c.moveTo((last || p).x, (last || p).y); c.lineTo(p.x, p.y); c.stroke();
    c.beginPath(); c.arc(p.x, p.y, rad, 0, 7); c.fill();
    last = p;
    const t = performance.now();
    if (t - lastS > 70) { lastS = t; SFX.play('scratch'); }
    if (t - checkT > 250) { checkT = t; if (cleared() >= need && !fin) { fin = true; onDone(); } }
  };
  const cleared = () => {
    const d = c.getImageData(0, 0, cv.width, cv.height).data;
    let n = 0, tot = 0;
    for (let y = 8; y < cv.height; y += 16) for (let x = 8; x < cv.width; x += 16) { tot++; if (d[(y * cv.width + x) * 4 + 3] < 40) n++; }
    return n / tot;
  };
  cv.onpointerdown = e => { e.preventDefault(); down = true; last = null; cv.setPointerCapture(e.pointerId); rub(pos(e)); };
  cv.onpointermove = e => { if (down) rub(pos(e)); };
  cv.onpointerup = () => { down = false; last = null; };
  cv.rubAt = (x, y) => rub({ x, y });     // 테스트용
}
