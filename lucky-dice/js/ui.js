'use strict';
const $ = (s, r = document) => r.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PIPS = { 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const RARITY = ['', '보통', '희귀', '전설'];
const COIN = '<span class="coin"></span>';

function faceHTML(v) {
  let h = '';
  for (let k = 0; k < 9; k++) h += PIPS[v].includes(k) ? '<i class="p"></i>' : '<i></i>';
  return h;
}

function charmDesc(c) {
  const d = CHARMS[c.id];
  return d.d.replace('{v}', d.v !== undefined ? fmtMult(c.v) : '');
}

const UI = {
  busy: false, fast: false, acts: {}, sacts: {},

  init() {
    Save.load();
    addEventListener('pointerdown', () => { Sound.init(); Sound.resume(); }, true);
    this.app = $('#app');
    this.layer = $('#layer');
    this.sheet = $('#sheet');
    $('#tray').innerHTML = [0, 1, 2, 3, 4].map(i => `<button class="die" data-i="${i}"><div class="face"></div><span class="tag">다시</span></button>`).join('');
    $('#tray').addEventListener('click', e => { const d = e.target.closest('.die'); if (d) this.tapDie(+d.dataset.i); });
    $('#charms').addEventListener('click', e => { const s = e.target.closest('.slot[data-i]'); if (s) this.charmSheet(+s.dataset.i); });
    $('#btnReroll').onclick = () => this.reroll();
    $('#btnPlay').onclick = () => this.play();
    $('#btnMenu').onclick = () => { Sound.click(); this.menu(); };
    $('#handInfo').onclick = () => { if (!this.busy) { Sound.click(); this.handTable(); } };
    this.app.addEventListener('pointerdown', () => { if (this.busy) this.fast = true; });
    this.layer.addEventListener('click', e => {
      const a = e.target.closest('[data-a]');
      if (a && !a.disabled && this.acts[a.dataset.a]) this.acts[a.dataset.a](a);
    });
    this.sheet.addEventListener('click', e => {
      if (e.target === this.sheet) { this.closeSheet(); return; }
      const a = e.target.closest('[data-s]');
      if (a && !a.disabled && this.sacts[a.dataset.s]) { Sound.click(); this.sacts[a.dataset.s](a); }
    });
    this.title();
  },

  save() { Save.data.run = Game.st && Game.st.phase !== 'over' ? Game.st : null; Save.save(); },
  wait(ms) { return sleep(this.fast ? Math.min(ms, 45) : ms); },

  // ── 화면 전환 ──
  show(html, cls, acts) {
    this.acts = acts || {};
    this.layer.innerHTML = html ? `<div class="${cls}">${html}</div>` : '';
    this.layer.classList.toggle('on', !!html);
  },

  title() {
    const b = Save.data.best, run = Save.data.run;
    this.app.classList.add('off');
    const logo = [5, 6, 1, 4, 3].map((v, k) => `<div class="die mini t${k}"><div class="face v${v}">${faceHTML(v)}</div></div>`).join('');
    const cont = run ? `<button class="btn gold big" data-a="cont">이어하기<small>관문 ${run.ante} · ${BLIND_NAMES[run.blind]}</small></button>` : '';
    this.show(`
      <div class="logo">${logo}</div>
      <h1>운수대통<span>주사위</span></h1>
      <p class="sub">족보를 맞추고 부적을 모아<br>점수를 폭발시켜라!</p>
      <div class="tbtns">${cont}
        <button class="btn red big" data-a="new">새로 시작</button>
        <button class="btn ghost" data-a="help">게임 방법</button>
      </div>
      <div class="rec">최고 관문 <b>${b.ante || '-'}</b> · 최고 한 방 <b>${b.hit ? fmt(b.hit) : '-'}</b>${b.clears ? ` · 천하제일 <b>${b.clears}회</b>` : ''}</div>
      <button class="sound" data-a="snd">${Save.data.sound ? '🔊' : '🔈'}</button>`, 'titleScr', {
      cont: () => { Sound.click(); Game.st = Save.data.run; this.enter(); },
      new: () => {
        Sound.click();
        if (run) this.confirm('진행 중인 판이 사라져요.<br>새로 시작할까요?', () => this.startNew());
        else this.startNew();
      },
      help: () => { Sound.click(); this.help(); },
      snd: a => { Save.data.sound = !Save.data.sound; Save.save(); a.textContent = Save.data.sound ? '🔊' : '🔈'; Sound.click(); },
    });
  },

  startNew() {
    Game.newRun();
    Save.data.best.runs++;
    this.save();
    this.enter();
    if (!Save.data.seenHelp) { Save.data.seenHelp = true; Save.save(); this.help(); }
  },

  enter() {
    const st = Game.st;
    this.app.classList.remove('off');
    this.closeSheet();
    this.renderAll();
    if (st.phase === 'intro') this.intro();
    else if (st.phase === 'win') this.showWin();
    else if (st.phase === 'shop') this.shop();
    else this.show('');
  },

  intro() {
    const st = Game.st, b = Game.bossDef();
    this.renderAll(true);
    const steps = [0, 1, 2].map(i => `<span class="${i < st.blind ? 'done' : i === st.blind ? 'now' : ''}">${i === 2 ? '👹 ' : ''}${BLIND_NAMES[i]}</span>`).join('');
    this.show(`<div class="card pop">
      <div class="kicker">관문 ${st.ante}${st.ante > 8 ? ' · 끝없는 길' : ' / 8'}</div>
      <div class="steps">${steps}</div>
      <h2>${BLIND_NAMES[st.blind]}</h2>
      ${b ? `<div class="boss"><div class="bic">${b.ic}</div><b>${b.n}</b><p>${b.d}</p></div>` : ''}
      <div class="tg">목표 <b>${fmt(st.target)}</b>점</div>
      <div class="pay">보상 ${COIN}${BLIND_PAY[st.blind]}</div>
      <button class="btn red big" data-a="go">도전!</button>
    </div>`, 'ov', {
      go: async () => {
        Sound.click();
        Game.startRound();
        this.save();
        this.show('');
        this.renderAll(true);
        this.busy = true;
        await this.animRoll([0, 1, 2, 3, 4]);
        this.busy = false;
        this.renderAll();
      },
    });
  },

  // ── 플레이 화면 ──
  renderAll(blank) {
    this.renderTop();
    this.renderCharms();
    this.renderDice(blank);
    this.renderPreview(blank);
    this.renderCounts();
  },

  renderTop() {
    const st = Game.st, b = Game.bossDef();
    $('#stage').innerHTML = `관문 <b>${st.ante}</b> · ${BLIND_NAMES[st.blind]}`;
    $('#money').textContent = st.money;
    $('#target').textContent = fmt(st.target);
    this.setScore(st.phase === 'intro' ? 0 : st.score);
    const br = $('#bossRule');
    br.hidden = !b;
    if (b) br.innerHTML = `${b.ic} <b>${b.n}</b> — ${b.d}`;
  },

  setScore(v) {
    const st = Game.st;
    $('#score').textContent = fmt(v);
    const pct = Math.min(100, v / st.target * 100);
    $('#bar').style.width = pct + '%';
    $('#goal').classList.toggle('done', v >= st.target);
  },

  slotsHTML(charms, fogFirst) {
    let h = '';
    for (let i = 0; i < MAX_CHARMS; i++) {
      const c = charms[i];
      if (!c) { h += '<div class="slot empty"></div>'; continue; }
      const d = CHARMS[c.id];
      const v = d.v !== undefined && c.v ? `<em>${c.id === 'cat' ? '×' : '+'}${fmtMult(c.v)}</em>` : '';
      h += `<div class="slot r${d.r}${fogFirst && i === 0 ? ' fog' : ''}" data-i="${i}"><span class="ic">${d.ic}</span>${v}</div>`;
    }
    return h;
  },

  renderCharms() {
    const st = Game.st;
    $('#charms').innerHTML = this.slotsHTML(st.charms, bossId(st) === 'fog');
  },

  renderDice(blank) {
    const st = Game.st, els = $('#tray').children;
    const ev = evalHand(st.dice);
    const idx = hasCharm(st, 'unity') ? [0, 1, 2, 3, 4] : ev.idx;
    for (let i = 0; i < 5; i++) {
      const el = els[i];
      this.setFace(el, blank ? 0 : st.dice[i]);
      el.className = 'die' + (blank ? ' blank' : '') + (!blank && st.sel[i] ? ' sel' : '')
        + (!blank && idx.includes(i) ? ' score' : '') + (!blank && deadPip(st, st.dice[i]) ? ' dead' : '');
    }
  },

  setFace(el, v) {
    const f = el.firstElementChild;
    f.className = 'face v' + v;
    f.innerHTML = v ? faceHTML(v) : '';
  },

  renderPreview(blank) {
    const st = Game.st;
    $('#total').className = '';
    $('#total').textContent = '';
    if (blank || st.phase !== 'play') {
      $('#handName').innerHTML = '&nbsp;';
      this.setBox($('#chips'), '0'); this.setBox($('#mult'), '0');
      return;
    }
    const ev = evalHand(st.dice), base = handBase(st, ev.id);
    $('#handName').innerHTML = `${HAND[ev.id].name} <small>Lv.${base.lv}</small>`;
    this.setBox($('#chips'), fmt(base.chips));
    this.setBox($('#mult'), fmtMult(base.mult));
  },

  renderCounts() {
    const st = Game.st, play = st.phase === 'play', shown = st.phase !== 'intro';
    $('#hands').textContent = shown ? st.hands : '-';
    $('#rerolls').textContent = shown ? st.rerolls : '-';
    const n = st.sel.filter(Boolean).length;
    const rb = $('#btnReroll');
    rb.disabled = this.busy || !play || !n || st.rerolls <= 0;
    rb.innerHTML = `🎲 다시 굴리기${n ? ` <small>${n}개</small>` : ''}`;
    $('#btnPlay').disabled = this.busy || !play;
    let hint = '';
    if (play && !this.busy) {
      if (st.rerolls <= 0) hint = '다시 굴리기를 다 썼어요 — 족보를 내세요';
      else if (!n) hint = '바꾸고 싶은 주사위를 눌러 고르세요';
      else hint = `고른 ${n}개를 다시 굴릴 수 있어요`;
    }
    $('#hint').textContent = hint;
  },

  setBox(el, text, bump) {
    el.textContent = text;
    if (bump) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  },

  floatAt(el, text, cls) {
    if (!el) return;
    const r = el.getBoundingClientRect(), f = document.createElement('div');
    f.className = 'float ' + cls;
    f.textContent = text;
    f.style.left = (r.left + r.width / 2) + 'px';
    f.style.top = (r.top + 4) + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 900);
  },

  kick(el, cls) {
    if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  },

  tapDie(i) {
    const st = Game.st;
    if (this.busy || !st || st.phase !== 'play') return;
    if (st.rerolls <= 0) { this.kick($('#hint'), 'shake'); Sound.dud(); return; }
    Game.toggle(i);
    Sound.sel(st.sel[i]);
    buzz(8);
    this.renderDice();
    this.renderCounts();
    this.save();
  },

  async animRoll(indices) {
    Sound.roll(indices.length);
    const els = $('#tray').children, st = Game.st;
    await Promise.all(indices.map((i, k) => new Promise(res => {
      const el = els[i];
      el.className = 'die rolling';
      const iv = setInterval(() => this.setFace(el, rnd6()), 55);
      setTimeout(() => {
        clearInterval(iv);
        this.setFace(el, st.dice[i]);
        el.className = 'die land';
        res();
      }, 360 + k * 70);
    })));
    await sleep(160);
  },

  async reroll() {
    if (this.busy) return;
    const idx = Game.reroll();
    if (!idx) return;
    this.save();
    this.busy = true;
    this.renderCounts();
    this.renderCharms();
    await this.animRoll(idx);
    this.busy = false;
    this.renderAll();
  },

  async play() {
    const st = Game.st;
    if (this.busy || !st || st.phase !== 'play') return;
    this.busy = true;
    this.fast = false;
    const r = Game.play(), res = r.res;
    if (res.total > Save.data.best.hit) Save.data.best.hit = res.total;
    if (r.out === 'win' || r.out === 'saved') {
      Save.data.best.ante = Math.max(Save.data.best.ante, st.ante);
      if (st.reward.final) Save.data.best.clears++;
    }
    this.save();
    this.renderCounts();
    $('#hint').textContent = '화면을 누르면 빨리 감기';
    const dies = [...$('#tray').children], cEls = [...$('#charms').children];
    const chipsEl = $('#chips'), multEl = $('#mult'), tot = $('#total');
    dies.forEach((d, i) => { d.classList.remove('sel', 'land'); d.classList.toggle('score', res.idx.includes(i)); d.classList.toggle('dim', !res.idx.includes(i)); });
    $('#handName').innerHTML = `${res.name} <small>Lv.${res.lv}</small>`;
    this.setBox(chipsEl, fmt(res.base.chips), true);
    this.setBox(multEl, fmtMult(res.base.mult), true);
    Sound.click();
    if (r.tax) this.floatAt($('#money'), '-1', 'dead');
    await this.wait(380);
    let k = 0, ci = 0, mi = 0;
    for (const e of res.events) {
      const el = e.charm !== undefined ? cEls[e.charm] : dies[e.die];
      if (e.charm !== undefined) this.kick(el, 'shake');
      else this.kick(el, 'pop');
      if (e.k === 'c') { this.floatAt(el, '+' + fmt(e.n), 'chip'); this.setBox(chipsEl, fmt(e.chips), true); Sound.chip(ci++); }
      else if (e.k === 'm') { this.floatAt(el, '+' + fmtMult(e.n) + ' 배수', 'mult'); this.setBox(multEl, fmtMult(e.mult), true); Sound.mult(mi++); }
      else if (e.k === 'x') { this.floatAt(el, '×' + fmtMult(e.n), 'xm'); this.setBox(multEl, fmtMult(e.mult), true); Sound.xmult(); buzz(15); this.kick(multEl, 'flash'); }
      else if (e.k === 'dead') { this.floatAt(el, '무효', 'dead'); Sound.dud(); }
      else if (e.k === 't') { this.floatAt(el, e.t, 'note'); Sound.note(); }
      k++;
      await this.wait(Math.max(110, 330 - k * 20));
    }
    await this.wait(250);
    const need = r.old < st.target ? Math.max(1, st.target - r.old) : 1;
    const big = res.total >= need && r.out !== 'next';
    tot.textContent = '= ' + fmt(res.total);
    tot.className = 'show' + (big ? ' fire' : '');
    Sound.total(big);
    buzz(big ? 40 : 15);
    if (big || res.total >= st.target * 0.6) this.kick(this.app, 'quake');
    await this.wait(450);
    // 점수가 올라가는 연출
    const from = r.old, to = r.old + res.total, dur = this.fast ? 150 : 600, t0 = performance.now();
    await new Promise(done => {
      const step = now => {
        const p = Math.min(1, (now - t0) / dur), v = from + (to - from) * (1 - Math.pow(1 - p, 3));
        this.setScore(v);
        if (Math.random() < 0.5) Sound.tick();
        if (p < 1) requestAnimationFrame(step); else done();
      };
      requestAnimationFrame(step);
    });
    this.setScore(to);
    await this.wait(400);
    dies.forEach(d => d.classList.remove('dim', 'pop'));
    if (r.out === 'next') {
      tot.className = '';
      this.renderCharms();
      this.renderCounts();
      $('#handName').innerHTML = '&nbsp;';
      await this.animRoll([0, 1, 2, 3, 4]);
      this.busy = false;
      this.renderAll();
    } else if (r.out === 'over') {
      Sound.lose();
      buzz(80);
      this.busy = false;
      this.showOver();
    } else {
      Sound.win();
      this.confetti();
      await sleep(500);
      this.busy = false;
      this.renderAll();
      this.showWin();
    }
  },

  confetti() {
    const cols = ['#f2c14e', '#ff5a4f', '#4fc3ff', '#7ee081', '#ff8fd8'];
    for (let i = 0; i < 40; i++) {
      const c = document.createElement('i');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = cols[i % cols.length];
      c.style.animationDelay = Math.random() * 0.3 + 's';
      c.style.animationDuration = 1.2 + Math.random() * 0.9 + 's';
      c.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 2600);
    }
  },

  showWin() {
    const st = Game.st, w = st.reward;
    const lines = w.lines.map((l, i) => `<li style="animation-delay:${0.15 + i * 0.18}s"><span>${l[0]}</span><b>+${l[1]}</b></li>`).join('');
    w.lines.forEach((l, i) => Sound.coin(0.15 + i * 0.18));
    const head = w.final
      ? `<div class="crown">👑</div><h2>천하제일 운수왕!</h2><p class="lead">관문 8을 모두 넘었어요!</p>`
      : `<h2>${w.saved ? '🪶 불사조가 살렸다!' : '돌파!'}</h2>`;
    const btns = w.final
      ? `<button class="btn gold big" data-a="endless">끝없는 길 도전 ▶</button><button class="btn ghost" data-a="home">타이틀로</button>`
      : `<button class="btn red big" data-a="shop">만물상으로 ▶</button>`;
    this.show(`<div class="card pop">${head}
      <div class="sc">${fmt(w.score)} <small>/ ${fmt(w.target)}</small></div>
      <ul class="rew">${lines}</ul>
      <div class="sum">합계 ${COIN}<b>+${w.sum}</b> <small>(가진 엽전 ${st.money})</small></div>
      ${btns}</div>`, 'ov', {
      shop: () => { Sound.click(); Game.toShop(); this.save(); this.shop(); },
      endless: () => { Sound.click(); st.endless = true; Game.toShop(); this.save(); this.shop(); },
      home: () => { Sound.click(); Game.st = null; Save.data.run = null; Save.save(); this.title(); },
    });
  },

  showOver() {
    const st = Game.st, b = Save.data.best;
    const rec = st.ante >= b.ante;
    b.ante = Math.max(b.ante, st.ante);
    Save.data.run = null;
    Save.save();
    this.show(`<div class="card pop over">
      <div class="crown">🎲</div>
      <h2>운이 다했다…</h2>
      <p class="lead">관문 ${st.ante} · ${BLIND_NAMES[st.blind]}에서 멈췄어요</p>
      <div class="sc">${fmt(st.score)} <small>/ ${fmt(st.target)}</small></div>
      <ul class="rew static">
        <li><span>이번 판 최고 한 방</span><b>${fmt(st.bestHit)}</b></li>
        <li><span>모은 부적</span><b>${st.charms.map(c => CHARMS[c.id].ic).join(' ') || '-'}</b></li>
      </ul>
      ${rec && st.ante > 1 ? '<div class="newrec">🏆 최고 기록!</div>' : ''}
      <button class="btn red big" data-a="again">한 판 더!</button>
      <button class="btn ghost" data-a="home">타이틀로</button>
    </div>`, 'ov', {
      again: () => { Sound.click(); this.startNew(); },
      home: () => { Sound.click(); this.title(); },
    });
  },

  // ── 만물상 ──
  shop() {
    const st = Game.st;
    this.renderTop();
    const offers = st.offers.map((o, i) => {
      if (o.t === 'charm') {
        const d = CHARMS[o.id];
        return `<div class="offer r${d.r}${o.sold ? ' sold' : ''}">
          <div class="oic">${d.ic}</div>
          <div class="oinfo"><b>${d.n}</b> <span class="rar r${d.r}">${RARITY[d.r]}</span><p>${d.d.replace('{v}', d.v !== undefined ? fmtMult(d.v) : '')}</p></div>
          <button class="btn buy" data-a="buy" data-i="${i}" ${Game.canBuy(o) ? '' : 'disabled'}>${o.sold ? '샀음' : COIN + o.p}</button></div>`;
      }
      const H = HAND[o.h], lv = st.levels[o.h] || 1;
      return `<div class="offer book${o.sold ? ' sold' : ''}">
        <div class="oic">📜</div>
        <div class="oinfo"><b>${H.name} 비급</b> <span class="rar">Lv.${lv} → ${lv + 1}</span><p>${H.name} +${H.lc}점, 배수 +${H.lm}</p></div>
        <button class="btn buy" data-a="buy" data-i="${i}" ${Game.canBuy(o) ? '' : 'disabled'}>${o.sold ? '샀음' : COIN + o.p}</button></div>`;
    });
    const nb = st.blind === 2 ? null : (st.blind === 1 ? BOSSES[st.boss] : null);
    const nextBlind = (st.blind + 1) % 3, nextAnte = st.blind === 2 ? st.ante + 1 : st.ante;
    this.show(`
      <header><h2>🏮 만물상</h2><div class="money">${COIN}<b>${st.money}</b></div></header>
      <div class="lbl">내 부적 <small>${st.charms.length}/${MAX_CHARMS} · 눌러서 순서 바꾸기·팔기</small></div>
      <div class="charms shopCharms">${this.slotsHTML(st.charms)}</div>
      <div class="lbl">부적</div>
      <div class="offers">${offers.slice(0, -2).join('') || '<p class="empty">다 팔렸어요</p>'}</div>
      <div class="lbl">족보 비급</div>
      <div class="offers">${offers.slice(-2).join('')}</div>
      <div class="next">다음: 관문 ${nextAnte} · ${BLIND_NAMES[nextBlind]} · 목표 <b>${fmt(targetFor(nextAnte, nextBlind))}</b>${nb ? `<br>곧 보스: ${nb.ic} ${nb.n} — ${nb.d}` : ''}</div>
      <div class="shopBtns">
        <button class="btn blue" data-a="refresh" ${st.money < st.shopCost ? 'disabled' : ''}>🔄 새로 고침 ${COIN}${st.shopCost}</button>
        <button class="btn red" data-a="next">다음 ▶</button>
      </div>`, 'shopScr', {
      buy: a => {
        if (Game.buy(+a.dataset.i)) { Sound.buy(); buzz(12); this.save(); this.shop(); }
      },
      refresh: () => { if (Game.refreshShop()) { Sound.roll(2); this.save(); this.shop(); } },
      next: () => { Sound.click(); Game.next(); this.save(); this.intro(); },
    });
    this.layer.querySelector('.shopCharms').onclick = e => {
      const s = e.target.closest('.slot[data-i]');
      if (s) this.charmSheet(+s.dataset.i);
    };
  },

  // ── 아래에서 올라오는 창 ──
  openSheet(html, acts) {
    this.sacts = acts;
    const again = this.sheet.classList.contains("on");
    this.sheet.innerHTML = `<div class="sheetBox${again ? " still" : ""}">${html}</div>`;
    this.sheet.classList.add('on');
  },
  closeSheet() { this.sheet.classList.remove('on'); this.sheet.innerHTML = ''; },

  charmSheet(i) {
    const st = Game.st;
    if (this.busy || !st) return;
    const c = st.charms[i];
    if (!c) return;
    Sound.click();
    const d = CHARMS[c.id], n = st.charms.length, fog = bossId(st) === 'fog' && i === 0 && st.phase === 'play';
    const refresh = () => { this.save(); if (st.phase === 'shop') this.shop(); else this.renderAll(); };
    this.openSheet(`
      <div class="shead"><div class="sic r${d.r}">${d.ic}</div><div><b>${d.n}</b><span class="rar r${d.r}">${RARITY[d.r]}</span></div></div>
      <p class="sdesc">${charmDesc(c)}</p>
      ${fog ? '<p class="warn">🌫️ 짙은 안개 때문에 이번 라운드엔 힘을 잃었어요</p>' : ''}
      <div class="srow">
        <button class="btn ghost" data-s="left" ${i === 0 ? 'disabled' : ''}>◀ 왼쪽으로</button>
        <button class="btn ghost" data-s="right" ${i === n - 1 ? 'disabled' : ''}>오른쪽으로 ▶</button>
      </div>
      <button class="btn gold" data-s="sell">팔기 ${COIN}+${sellPrice(c)}</button>
      <button class="btn ghost" data-s="close">닫기</button>
      <p class="tip">부적은 왼쪽부터 차례로 발동해요. <b>×배수</b> 부적은 오른쪽 끝에 둘수록 세져요.</p>`, {
      left: () => { Game.move(i, -1); refresh(); this.charmSheet(i - 1); },
      right: () => { Game.move(i, 1); refresh(); this.charmSheet(i + 1); },
      sell: () => {
        this.confirmIn(`${d.ic} ${d.n}을(를) 팔까요?`, () => { Game.sell(i); Sound.buy(); this.closeSheet(); refresh(); }, () => this.charmSheet(i));
      },
      close: () => this.closeSheet(),
    });
  },

  confirmIn(msg, yes, no) {
    this.openSheet(`<p class="sdesc center">${msg}</p>
      <div class="srow"><button class="btn ghost" data-s="no">아니요</button><button class="btn red" data-s="yes">네</button></div>`, {
      yes: () => yes(),
      no: () => (no ? no() : this.closeSheet()),
    });
  },

  confirm(msg, yes) { this.confirmIn(msg, () => { this.closeSheet(); yes(); }); },

  menu() {
    if (this.busy) return;
    this.openSheet(`<h3>메뉴</h3>
      <button class="btn ghost" data-s="table">📜 족보표</button>
      <button class="btn ghost" data-s="help">❓ 게임 방법</button>
      <button class="btn ghost" data-s="snd">${Save.data.sound ? '🔊 소리 켜짐' : '🔈 소리 꺼짐'}</button>
      <button class="btn ghost" data-s="home">🏠 타이틀로 (이어하기 가능)</button>
      <button class="btn ghost" data-s="close">닫기</button>`, {
      table: () => this.handTable(),
      help: () => this.help(),
      snd: () => { Save.data.sound = !Save.data.sound; Save.save(); this.menu(); },
      home: () => { this.closeSheet(); this.save(); this.title(); },
      close: () => this.closeSheet(),
    });
  },

  handTable() {
    const st = Game.st;
    const rows = HANDS.slice().reverse().map(h => {
      const b = st ? handBase(st, h.id) : { chips: h.chips, mult: h.mult, lv: 1 };
      return `<tr><td><b>${h.name}</b><small>${h.desc}</small></td><td class="lv">Lv.${b.lv}</td>
        <td class="cm"><span class="c">${b.chips}</span>×<span class="m">${b.mult}</span></td><td class="pl">${st && st.played[h.id] || 0}회</td></tr>`;
    }).join('');
    this.openSheet(`<h3>족보표</h3><table class="htable">${rows}</table>
      <p class="tip">점수 = (족보 점수 + 점수 주사위 눈의 합) × 배수</p>
      <button class="btn ghost" data-s="close">닫기</button>`, { close: () => this.closeSheet() });
  },

  help() {
    this.openSheet(`<h3>게임 방법</h3>
      <ol class="help">
        <li><b>🎲 굴리기</b> 주사위 5개가 굴러가요. 마음에 안 드는 주사위를 눌러 고른 뒤 <em>다시 굴리기</em>.</li>
        <li><b>📜 족보 내기</b> (족보 점수 + 주사위 눈) × 배수 만큼 점수를 얻어요. 원페어·트리플·스트레이트·풀하우스·오복!</li>
        <li><b>🎯 목표</b> 기회 4번 안에 목표 점수를 넘기면 돌파. 남은 기회와 이자만큼 엽전을 더 받아요.</li>
        <li><b>🏮 만물상</b> 엽전으로 부적(최대 5개)과 족보 비급을 사세요. 부적은 왼쪽부터 발동 — ×배수는 오른쪽 끝에!</li>
        <li><b>👹 보스</b> 관문마다 세 번째 판은 이상한 규칙이 붙어요. 관문 8의 보스를 이기면 천하제일!</li>
      </ol>
      <button class="btn red" data-s="close">알겠어요</button>`, { close: () => this.closeSheet() });
  },
};

addEventListener('DOMContentLoaded', () => UI.init());
