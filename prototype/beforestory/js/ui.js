// 화면 · 연출 · 흐름 (M0 프로토타입: 1년차 12턴)
(function () {
  'use strict';
  const { Save, Sound, U } = window.CORE;
  const D = window.DATA, ST = window.STORY, G = window.G;
  const ART = window.ART || {};
  const app = document.getElementById('app');
  let S = null;

  // ───────── 공통 ─────────
  const art = key => {
    if (!key) return null;
    if (S && S.look && S.look !== 'w' && ART['looks/' + S.look + '/' + key]) return 'img/' + ART['looks/' + S.look + '/' + key];
    return ART[key] ? 'img/' + ART[key] : null;
  };
  const icon = (key, emoji, cls) => {
    const src = art('item/' + key);
    return src ? `<img class="ic ${cls || ''}" src="${src}" alt="">` : `<span class="ic emo ${cls || ''}">${emoji}</span>`;
  };
  const statIcon = k => icon('stat_' + k, D.STATS[k].icon);
  const actIcon = k => icon('act_' + k, (D.ACTIVITIES[k] || D.FORCED[k] || {}).icon || '❔');
  const BG_ART = { study: 'bg_study_day', study_eve: 'bg_study_eve', garden: 'bg_garden_day', garden_rain: 'bg_garden_rain', dining: 'bg_dining_night' };
  const bgStyle = id => {
    const a = art(BG_ART[id] || ('bg_' + id));
    if (a) return `background-image:url(${a})`;
    const b = ST.BG[id];
    return `background:${b ? b.css : '#333'}`;
  };
  const NAMES = Object.assign({}, ...D.STAT_KEYS.map(k => ({ [k]: D.STATS[k].name })), {
    stress: '스트레스', trust: '신뢰', notoriety: '악명', fate: '운명도', temp: '다정함', self: '자유로움',
    father: '아버지', gold: '골드', ink: '잉크', rel_kairen: '카이렌',
  });
  const HIDDEN = { trust: 1, father: 1, rel_kairen: 1 };
  function chip(k, v) {
    if (!v) return '';
    const good = (k === 'stress' || k === 'notoriety' || k === 'fate') ? v < 0 : v > 0;
    let txt;
    if (k === 'temp' || k === 'self') txt = (v > 0 ? (k === 'temp' ? '다정 ↑' : '자유 ↑') : (k === 'temp' ? '냉정 ↑' : '순종 ↑'));
    else if (HIDDEN[k] && !(S && S.flags.notebook)) txt = NAMES[k] + (v > 0 ? ' ↑' : ' ↓');
    else txt = NAMES[k] + ' ' + U.sign(v);
    const cls = (k === 'temp' || k === 'self') ? 'neu' : good ? 'up' : 'down';
    return `<span class="chip ${cls}">${txt}</span>`;
  }
  const chips = eff => Object.keys(eff || {}).map(k => chip(k, eff[k])).join('');
  function effDesc(it) {
    const out = [];
    for (const k in (it.eff || {})) out.push((NAMES[k] || k) + ' ' + U.sign(it.eff[k]));
    if (it.buff) {
      if (it.buff.great) out.push('이번 달 대성공 +' + Math.round(it.buff.great * 100) + '%');
      if (it.buff.stressMul) out.push('이번 달 스트레스 증가 -' + Math.round((1 - it.buff.stressMul) * 100) + '%');
      if (it.buff.lesson) out.push('이번 달 수업 +' + Math.round(it.buff.lesson * 100) + '%');
    }
    if (it.cure) out.push('병을 바로 낫게 함');
    if (it.tool) out.push(D.ACTIVITIES[it.tool].name + ' 수업 효율 +10% (이번 회차)');
    if (it.desc) out.push(it.desc);
    if (it.once) out.push('한 번만');
    return out.join(' · ');
  }
  function toast(html, ms) {
    const t = U.el('div', 'toast', html);
    app.appendChild(t);
    setTimeout(() => t.classList.add('out'), ms || 1800);
    setTimeout(() => t.remove(), (ms || 1800) + 400);
  }
  function modal(cls, html) {
    const m = U.el('div', 'modal ' + (cls || ''), `<div class="sheet">${html}</div>`);
    app.appendChild(m);
    requestAnimationFrame(() => m.classList.add('on')); setTimeout(() => m.classList.add('on'), 50);
    m.close = () => { m.classList.remove('on'); setTimeout(() => m.remove(), 220); };
    return m;
  }
  const waitClick = el => new Promise(r => el.addEventListener('click', r, { once: true }));
  const save = () => Save.save({ S });
  const pers = () => G.personality(S);

  function fitApp() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = Math.min(vw, vh * 9 / 16), h = Math.min(vh, w * 16 / 9);
    app.style.width = w + 'px'; app.style.height = h + 'px';
    document.documentElement.style.fontSize = (w / 24) + 'px';
  }
  window.addEventListener('resize', fitApp);
  document.addEventListener('pointerdown', () => Sound.init(), { capture: true });
  document.addEventListener('click', e => { if (e.target.closest('button')) Sound.sfx('tap'); }, { capture: true });

  // ───────── 타이틀 ─────────
  function title() {
    Sound.bgm('prophecy');
    const saved = Save.load();
    app.innerHTML = '';
    const sc = U.el('div', 'screen title', `
      <div class="bg" style="${bgStyle('study_eve')}"></div>
      <div class="shade"></div>
      <img class="title-ev" src="${art('ev_s1_base') || ''}" alt="">
      <div class="title-box">
        <div class="t-sub">악녀 공녀의 가정교사가 되었다</div>
        <h1>원작이 시작되기 전에</h1>
        <div class="t-ver">체험판 · 1년차</div>
      </div>
      <div class="title-btns">
        ${saved && saved.S ? `<button class="btn pri" data-a="cont">이어하기 <small>${saved.S.year + 12}세 ${saved.S.month}월</small></button>` : ''}
        <button class="btn ${saved && saved.S ? 'sec' : 'pri'}" data-a="new">새로 시작</button>
        <button class="btn ghost" data-a="set">설정</button>
      </div>`);
    app.appendChild(sc);
    sc.addEventListener('click', async e => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'cont') { S = saved.S; enterMonth(true); }
      if (a.dataset.a === 'new') { S = G.newState(); await prologue(); }
      if (a.dataset.a === 'set') settings();
    });
  }

  async function prologue() {
    app.innerHTML = '';
    const steps = [
      { bg: 'night' },
      { narr: '새벽 두 시. 야근을 마치고 돌아온 원룸. 휴대폰 화면엔 웹소설 한 편이 떠 있다.' },
      { narr: '「장미는 성녀의 발밑에」 — 마지막 화. 악녀 이벨리나 아르덴의 처형.' },
      { narr: '"…불쌍하잖아. 이 아이, 한 번이라도 누가 안아 준 적은 있었을까."' },
      { narr: '에필로그 페이지를 넘기려던 순간, 화면이 붉은 잉크처럼 번졌다.', fx: 'shake' },
    ];
    ST.BG.night = { css: 'radial-gradient(ellipse at 50% 70%,#3a2a4a 0%,#120c18 70%)' };
    await playScene(steps, { skippable: true });
    await enterMonth(false, true);
  }

  // ───────── 한 달 흐름 ─────────
  async function enterMonth(resume, first) {
    if (!resume) {
      const r = G.monthStart(S);
      S.plan = G.forcedSlots(S).slice();
      S.phase = 'plan';
      if (!first) Sound.sfx('month');
      // 강제 상태
      if (S.next.sick) await playScene(ST.SCENES.sick);
      else if (S.next.rebel) await playScene(ST.SCENES.rebel);
      // 원작 예고
      for (const id in D.PROPHECY) {
        const p = D.PROPHECY[id];
        if (p.warn === S.month && !S.prophecy[id] && !S.seen['warn_' + id]) { S.seen['warn_' + id] = 1; await prophecyPage(id, 'warn'); }
      }
      for (const ev of ST.EVENTS) if (ev.month === S.month && ev.when === 'start' && !S.seen[ev.id]) { S.seen[ev.id] = 1; await playScene(ev.steps, { ev }); }
      if (!first) toast(`<b>${S.month}월</b> · 공작가 용돈 💰 +${r.allowance}`, 1600);
    }
    save();
    main();
  }

  async function endMonth() {
    const res = G.monthEnd(S);
    S.phase = 'events';
    for (const ev of ST.EVENTS) {
      if (ev.month === S.month && ev.when === 'end' && !S.seen[ev.id] && (!ev.cond || ev.cond(S))) {
        S.seen[ev.id] = 1;
        await playScene(ev.steps, { ev });
      }
    }
    if (res.runaway) { const ok = await runaway(); if (!ok) return; }
    if (S.month === 12) { S.phase = 'review'; save(); return yearReview(); }
    G.advance(S);
    await enterMonth(false);
  }

  async function runaway() {
    await playScene(ST.SCENES.runaway);
    if (S.trust >= 50) {
      await playScene([{ bg: 'garden_dusk' }, { show: 'ev', at: 'c', fx: 'sink' }, { say: 'ev', t: '…찾으러 와 줬네.', emo: '💧' }, { narr: '이벨리나는 정원 끝 오래된 온실에 숨어 있었다.' }]);
      G.applyEff(S, { stress: -40, trust: -5 }); S.stress100 = 0; return true;
    }
    const m = modal('confirm', `<h3>이벨리나가 사라졌어요</h3><p>신뢰가 부족해 설득하기 어려워요.</p>
      <button class="btn pri" data-a="ad" ${S.limits.adPersuade > 0 ? '' : 'disabled'}>📺 광고 보고 찾아내기 <small>(체험판: 바로 적용 · 남은 ${S.limits.adPersuade})</small></button>
      <button class="btn ghost" data-a="end">결말 보기</button>`);
    const a = await new Promise(r => m.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b && !b.disabled) r(b.dataset.a); }));
    m.close();
    if (a === 'ad') { S.limits.adPersuade--; G.applyEff(S, { stress: -40, trust: -10 }); S.stress100 = 0; toast('도티가 이벨리나를 찾아 데려왔어요'); return true; }
    ending('B4', '떠난 아이', '열린 창문, 책상 위에 남은 리본 하나. 이벨리나는 다시 돌아오지 않았다.\n\n스트레스를 너무 오래 방치하면 이런 결말이 와요.');
    return false;
  }

  function ending(code, name, text) {
    Save.clear();
    Sound.bgm('prophecy');
    app.innerHTML = '';
    const sc = U.el('div', 'screen ending', `<div class="bg" style="${bgStyle('study_eve')}"></div><div class="shade dark"></div>
      <div class="end-box"><div class="end-code">ENDING ${code}</div><h2>${name}</h2><p>${U.esc(text).replace(/\n/g, '<br>')}</p>
      <button class="btn pri" data-a="t">타이틀로</button></div>`);
    app.appendChild(sc);
    sc.querySelector('[data-a=t]').onclick = title;
  }

  // ───────── 메인 (공부방) ─────────
  function fateLevel() { return S.fate > 80 ? 5 : S.fate > 60 ? 4 : S.fate > 40 ? 3 : S.fate > 20 ? 2 : 1; }
  function heartsHtml() {
    const h = G.hearts(S.trust); let o = '';
    for (let i = 0; i < 5; i++) o += `<span class="heart ${h >= i + 1 ? 'full' : h >= i + 0.5 ? 'half' : ''}">♥</span>`;
    return o;
  }
  function evArt() {
    const o = D.OUTFITS[S.outfit];
    return { src: art(o.art) || art('ev_s1_base'), temp: !art(o.art) && S.outfit !== 'velvet' };
  }
  function nextProphecy() {
    for (const id in D.PROPHECY) {
      const p = D.PROPHECY[id];
      if (!S.prophecy[id] && p.month >= S.month && p.month - S.month <= 1) return id;
    }
    return null;
  }

  function main() {
    Sound.bgm('manor');
    app.innerHTML = '';
    const P = D.PERSONALITY[pers()];
    const ea = evArt();
    const np = nextProphecy();
    const sc = U.el('div', 'screen main', `
      <div class="bg" style="${bgStyle(S.month >= 9 || S.month <= 2 ? 'study_eve' : 'study')}"></div>
      <div class="topbar">
        <div class="date"><b>${S.year + 12}세</b> ${S.month}월</div>
        <div class="money"><span>${icon('cur_gold', '💰', 'sm')} ${S.gold}</span><span>${icon('cur_ink', '🖋️', 'sm')} ${S.ink}</span></div>
        <button class="iconbtn" data-a="set">⚙️</button>
      </div>
      <div class="status-row">
        <button class="fatebook lv${fateLevel()} ${np ? 'blink' : ''}" data-a="book" title="원작 소설">${icon('st_fate', '📕', 'sm')}<span class="thick"><i style="width:${S.fate}%"></i></span></button>
        <div class="hearts" title="신뢰">${heartsHtml()}</div>
      </div>
      <div class="stage">
        <img class="ev-stand" src="${ea.src}" alt="이벨리나">
        ${ea.temp ? `<div class="temp-tag">${D.OUTFITS[S.outfit].name}<br><small>그림 준비 중</small></div>` : ''}
        <div class="pers-chip">${icon('pers_' + pers(), P.icon, 'sm')} ${P.name}</div>
        <div class="stress"><span>${icon('st_stress', '⛈️', 'sm')}</span><div class="bar"><i class="${S.stress >= 70 ? 'hot' : S.stress >= 40 ? 'warm' : ''}" style="width:${S.stress}%"></i></div><b>${S.stress}</b></div>
      </div>
      <div class="plan">
        <div class="plan-title">이번 달 일정 ${S.next.sick ? '<em>· 요양 중</em>' : S.next.rebel ? '<em>· 삐짐</em>' : ''}</div>
        <div class="slots">${[0, 1, 2].map(i => slotHtml(i)).join('')}</div>
        <div class="plan-cost">비용 💰 ${G.planCost(S.plan)} / 보유 ${S.gold}</div>
      </div>
      <div class="dock">
        <button class="btn sec" data-a="ward">👗 의상실</button>
        <button class="btn sec" data-a="shop">🛍️ 상점</button>
        <button class="btn sec" data-a="stat">📊 상태</button>
        <button class="btn pri go" data-a="go">시작 ▶</button>
      </div>`);
    app.appendChild(sc);
    sc.addEventListener('click', e => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      const act = a.dataset.a;
      if (act === 'slot') picker(+a.dataset.i);
      if (act === 'ward') wardrobe();
      if (act === 'shop') shop();
      if (act === 'stat') status();
      if (act === 'set') settings();
      if (act === 'book') bookView();
      if (act === 'go') startProgress();
    });
  }
  const SLOT_NAMES = ['상순', '중순', '하순'];
  function slotHtml(i) {
    const a = S.plan[i];
    const forced = G.forcedSlots(S)[i];
    if (!a) return `<button class="slot empty" data-a="slot" data-i="${i}"><small>${SLOT_NAMES[i]}</small><span class="plus">＋</span></button>`;
    const d = D.ACTIVITIES[a] || D.FORCED[a];
    return `<button class="slot ${forced ? 'forced' : ''}" data-a="slot" data-i="${i}"><small>${SLOT_NAMES[i]}</small>${actIcon(a)}<b>${d.name}</b></button>`;
  }

  // 활동 고르기
  function picker(i) {
    if (G.forcedSlots(S)[i]) { toast('이번 달은 바꿀 수 없어요'); return; }
    const tabs = { lesson: '수업', rest: '휴식', job: '아르바이트' };
    let tab = (S.plan[i] && D.ACTIVITIES[S.plan[i]] && D.ACTIVITIES[S.plan[i]].cat) || 'lesson';
    const m = modal('picker', '');
    const sheet = m.querySelector('.sheet');
    const render = () => {
      const others = S.plan.filter((x, j) => j !== i);
      sheet.innerHTML = `<div class="sheet-head"><h3>${SLOT_NAMES[i]} 일정</h3><button class="iconbtn" data-a="x">✕</button></div>
        <div class="tabs">${Object.keys(tabs).map(t => `<button class="tab ${t === tab ? 'on' : ''}" data-t="${t}">${tabs[t]}</button>`).join('')}</div>
        <div class="list">${Object.keys(D.ACTIVITIES).filter(k => D.ACTIVITIES[k].cat === tab).map(k => {
          const a = D.ACTIVITIES[k];
          const can = G.canUse(S, k, others);
          if (a.locked) return `<div class="row locked">${actIcon(k)}<div class="info"><b>${a.name}</b><small>🔒 ${a.locked}</small></div></div>`;
          const pv = G.preview(S, k);
          const parts = Object.keys(pv.stats).map(s => chip(s, pv.stats[s])).join('') + chip('stress', pv.stress) + (pv.trust ? chip('trust', pv.trust) : '');
          const mast = a.cat === 'lesson' ? `<small class="mast">숙련 ${(S.mastery[k] || 0)}회${G.outfitEff(S, k) ? ' · 👗+' + Math.round(G.outfitEff(S, k) * 100) + '%' : ''}${S.tools[k] ? ' · 🔧+10%' : ''}</small>` : '';
          return `<button class="row ${can.ok ? '' : 'dis'} ${S.plan[i] === k ? 'sel' : ''}" data-k="${k}" ${can.ok ? '' : 'disabled'}>${actIcon(k)}
            <div class="info"><b>${a.name}${a.cost ? ` <span class="cost">💰${a.cost}</span>` : ''}</b><div class="chips">${parts}</div>${mast}${can.ok ? '' : `<small>${can.why}</small>`}</div></button>`;
        }).join('')}</div>`;
    };
    render();
    sheet.addEventListener('click', e => {
      const t = e.target.closest('[data-t]'); if (t) { tab = t.dataset.t; render(); return; }
      if (e.target.closest('[data-a=x]')) { m.close(); return; }
      const r = e.target.closest('[data-k]'); if (!r || r.disabled) return;
      S.plan[i] = r.dataset.k; m.close(); save(); main();
    });
    m.addEventListener('click', e => { if (e.target === m) m.close(); });
  }

  // ───────── 진행 연출 ─────────
  async function startProgress() {
    if (S.plan.some(x => !x)) { toast('일정 3칸을 모두 채워 주세요'); return; }
    const cost = G.planCost(S.plan);
    if (cost > S.gold) { toast(`골드가 부족해요 (필요 ${cost})`); return; }
    S.phase = 'run';
    app.innerHTML = '';
    const sc = U.el('div', 'screen progress', `<div class="bg" style="${bgStyle('study')}"></div><div class="shade"></div>
      <div class="p-cards">${S.plan.map((a, i) => `<div class="p-card" data-i="${i}">${actIcon(a)}<small>${SLOT_NAMES[i]}</small></div>`).join('')}</div>
      <div class="vignette"><div class="v-circle"></div><div class="v-icon"></div><div class="v-fx"></div></div>
      <div class="p-text"><b class="p-name"></b><div class="p-line"></div><div class="chips p-chips"></div></div>
      <div class="p-tap">화면을 누르면 빨리 넘어가요</div>`);
    app.appendChild(sc);
    let fast = false;
    sc.addEventListener('click', () => { fast = true; });
    const wait = ms => U.sleep(fast ? ms * 0.25 : ms);
    const results = [];
    for (let i = 0; i < 3; i++) {
      const act = S.plan[i];
      const d = D.ACTIVITIES[act] || D.FORCED[act];
      sc.querySelectorAll('.p-card').forEach((c, j) => c.classList.toggle('on', j === i));
      const vi = sc.querySelector('.v-icon'), vg = sc.querySelector('.vignette');
      vi.innerHTML = actIcon(act); vg.className = 'vignette doing';
      sc.querySelector('.p-name').textContent = d.name;
      sc.querySelector('.p-line').textContent = (d.line && d.line.doing) || d.line || '';
      sc.querySelector('.p-chips').innerHTML = '';
      await wait(900);
      const r = G.runSlot(S, act);
      results.push(r);
      const res = r.refused ? 'fail' : r.result;
      vg.className = 'vignette ' + res;
      sc.querySelector('.p-line').textContent = r.refused ? D.FORCED.refuse.line : r.forced ? d.line : (res === 'great' ? '✨ 대성공! ' + d.line.great : res === 'fail' ? d.line.fail : (d.line.doing || ''));
      if (r.refused) sc.querySelector('.p-name').textContent = '수업 거부 🙅';
      const eff = Object.assign({}, r.stats, { stress: r.stress }, r.trust ? { trust: r.trust } : {});
      sc.querySelector('.p-chips').innerHTML = chips(eff) + (r.cost ? `<span class="chip down">💰 -${r.cost}</span>` : '');
      Sound.sfx(res === 'great' ? 'great' : res === 'fail' ? 'fail' : 'good');
      sc.querySelector('.p-card.on').classList.add(res);
      await wait(res === 'normal' ? 900 : 1300);
    }
    summary(results);
  }

  function summary(results) {
    S.phase = 'summary';
    save();
    const greats = results.filter(r => r.result === 'great').length;
    const draw = () => {
      const d = S.month_.delta;
      return D.STAT_KEYS.filter(k => d[k]).map(k => `<div class="srow">${statIcon(k)}<span>${D.STATS[k].name}</span><b>${S.stats[k]}</b><em class="${d[k] > 0 ? 'up' : 'down'}">${U.sign(d[k])}</em></div>`).join('')
        || '<p class="muted">능력치 변화가 없었어요</p>';
    };
    const m = modal('summary', `<h3>${S.month}월 결산</h3>
      ${greats ? `<div class="great-badge">대성공 ×${greats}</div>` : ''}
      <div class="slist">${draw()}</div>
      <div class="sfoot"><span>스트레스 <b>${S.stress}</b></span><span>💰 ${S.gold}</span><span>신뢰 ${heartsHtml()}</span></div>
      <button class="btn ad" data-a="ad" ${S.month_.boosted || S.limits.adBoost <= 0 ? 'disabled' : ''}>📺 광고 보고 이번 달 성과 1.5배 <small>(체험판: 바로 적용 · 남은 ${S.limits.adBoost})</small></button>
      <button class="btn pri" data-a="next">다음 ▶</button>`);
    m.addEventListener('click', async e => {
      const a = e.target.closest('[data-a]'); if (!a || a.disabled) return;
      if (a.dataset.a === 'ad') {
        const add = G.adBoost(S);
        if (add) { Sound.sfx('great'); m.querySelector('.slist').innerHTML = draw(); a.disabled = true; toast('성과 1.5배! ' + chips(add)); save(); }
      }
      if (a.dataset.a === 'next') { m.close(); await endMonth(); }
    });
  }

  // ───────── 대화 장면 (VN) ─────────
  function playScene(steps, opts) {
    opts = opts || {};
    return new Promise(async done => {
      const vn = U.el('div', 'vn', `<div class="bg"></div><div class="chars"></div><div class="cg"></div>
        <div class="box"><img class="face" alt=""><div class="name"></div><div class="text"></div><div class="next">▼</div></div>
        <div class="choices"></div>${opts.skippable ? '<button class="skip">건너뛰기 ▶▶</button>' : ''}`);
      app.appendChild(vn);
      requestAnimationFrame(() => vn.classList.add('on')); setTimeout(() => vn.classList.add('on'), 50);
      const $ = s => vn.querySelector(s);
      let skip = false;
      if (opts.skippable) $('.skip').onclick = e => { e.stopPropagation(); skip = true; vn.dispatchEvent(new Event('adv')); };
      const shown = {};
      const labels = {};
      steps.forEach((s, i) => { if (s.label) labels[s.label] = i; });
      const isProphecyEv = opts.ev && /^p\d/.test(opts.ev.id);
      Sound.bgm(isProphecyEv ? 'prophecy' : 'manor');

      const advance = () => new Promise(r => {
        const h = () => { vn.removeEventListener('click', h); vn.removeEventListener('adv', h); r(); };
        vn.addEventListener('click', h); vn.addEventListener('adv', h);
      });
      const fx = (el, f) => { if (!el || !f) return; el.classList.remove('fx-' + f); void el.offsetWidth; el.classList.add('fx-' + f); };
      const emote = (el, e) => {
        if (!el || !e) return;
        const b = U.el('div', 'emote', e); el.appendChild(b); setTimeout(() => b.remove(), 1600);
      };
      function charEl(id) {
        const c = ST.CHARS[id];
        let src = c.art ? art(c.art) : null;
        if (id === 'ev') src = evArt().src;
        const el = U.el('div', 'ch', src ? `<img src="${src}" alt="">` : `<div class="sil" style="--c:${c.color}"><span>${c.sil || '👤'}</span><b>${c.name}</b></div>`);
        el.dataset.id = id;
        return el;
      }
      async function type(name, text, cls, face) {
        $('.box').className = 'box ' + (cls || '') + (face ? ' has-face' : '');
        if (face) $('.face').src = face;
        $('.name').textContent = name || '';
        $('.name').style.display = name ? '' : 'none';
        const t = $('.text'); t.textContent = '';
        let full = false;
        const stop = () => { full = true; };
        vn.addEventListener('click', stop, { once: true });
        for (let i = 0; i < text.length && !full && !skip; i++) { t.textContent = text.slice(0, i + 1); await U.sleep(22); }
        vn.removeEventListener('click', stop);
        t.textContent = text;
        if (!skip) await advance();
      }
      function speaking(id) { vn.querySelectorAll('.ch').forEach(c => c.classList.toggle('dim', !!id && c.dataset.id !== id)); }

      let i = 0;
      while (i < steps.length) {
        const st = steps[i];
        if (skip && opts.skippable) break;
        if (st.bg) { $('.bg').setAttribute('style', bgStyle(st.bg)); }
        else if (st.show) {
          let el = shown[st.show];
          if (!el) { el = charEl(st.show); $('.chars').appendChild(el); shown[st.show] = el; }
          el.className = 'ch at-' + (st.at || 'c');
          fx(el, st.fx || 'in');
        }
        else if (st.hide) { if (shown[st.hide]) { shown[st.hide].remove(); delete shown[st.hide]; } }
        else if (st.say) {
          const c = ST.CHARS[st.say];
          const text = (st.alt && st.alt[pers()]) || st.t;
          speaking(st.say);
          const el = shown[st.say];
          fx(el, st.fx); emote(el, st.emo);
          await type(c.name, text, st.say === 'marie' ? 'marie' : '', faceFor(st.say, st.emo, st.face));
        }
        else if (st.narr) { speaking(null); if (st.fx === 'shake') fx(vn, 'shake'); await type('', st.narr, 'narr'); }
        else if (st.mono) { speaking('marie'); await type('마리 (속마음)', st.mono, 'mono', faceFor('marie', st.emo, st.face)); }
        else if (st.choice) {
          speaking(null);
          const box = $('.choices');
          box.innerHTML = st.choice.map((c, k) => {
            const ok = !c.need || c.need(S);
            return `<button class="choice" data-k="${k}" ${ok ? '' : 'disabled'}>${U.esc(c.t)}${ok ? '' : ' <small>(골드 부족)</small>'}</button>`;
          }).join('');
          box.classList.add('on');
          const k = await new Promise(r => box.addEventListener('click', function h(e) {
            const b = e.target.closest('.choice'); if (!b || b.disabled) return; e.stopPropagation(); box.removeEventListener('click', h); r(+b.dataset.k);
          }));
          box.classList.remove('on'); box.innerHTML = '';
          const c = st.choice[k];
          if (c.eff) { G.applyEff(S, c.eff); const h = chips(c.eff); if (h) toast(h, 1400); }
          if (c.set) S.flags[c.set] = true;
          if (c.go) { i = labels[c.go]; continue; }
        }
        else if (st.if) { if (st.if(S)) { i = labels[st.go]; continue; } }
        else if (st.go) { i = labels[st.go]; continue; }
        else if (st.rewrite) { await doRewrite(st); }
        else if (st.fulfill) {
          G.applyEff(S, st.eff); S.prophecy[st.fulfill] = 'orig';
          await prophecyPage(st.fulfill, 'fulfill', { fate: st.eff.fate || 0 });
        }
        else if (st.eff) { G.applyEff(S, st.eff); if (st.toast) toast(chips(st.eff), 1500); }
        else if (st.set) { S.flags[st.set] = true; }
        else if (st.check) {
          const ok = await checkScreen(st.check, isProphecyEv && !st.check.fixed ? opts.ev.id.toUpperCase() : (isProphecyEv && st.check.fixed ? opts.ev.id.toUpperCase() : null));
          i = labels[ok ? st.pass : st.fail]; continue;
        }
        else if (st.cg) {
          S.seen[st.cg] = 1;
          const src = art(st.cg);
          const cg = $('.cg');
          cg.innerHTML = src ? `<img src="${src}" alt="">` : `<div class="cg-ph"><span>🖼️</span><b>${U.esc(st.cap || '')}</b><small>CG 준비 중 (${st.cg})</small></div>`;
          cg.classList.add('on'); Sound.sfx('page');
          await U.sleep(400); await advance();
          cg.classList.remove('on');
        }
        else if (st.gainPage) {
          if (!S.pages.includes(st.gainPage)) S.pages.push(st.gainPage);
          Sound.sfx('page');
          const m = modal('get', `<div class="page-get">📜</div><h3>예언서 조각 ${'①②③④⑤⑥⑦'[st.gainPage - 1]}</h3><p>그을린 낡은 종이. 알아볼 수 없는 글씨 사이로 작은 그림이 희미하게 빛난다.</p><p class="muted">모은 조각 ${S.pages.length} / 7</p><button class="btn pri">간직한다</button>`);
          await waitClick(m.querySelector('button')); m.close();
        }
        else if (st.end) break;
        i++;
      }
      vn.classList.remove('on');
      setTimeout(() => vn.remove(), 250);
      save();
      done();
    });
  }

  // 표정: 대본의 감정 기호 → 표정 시트 칸 (docs/art-brief-gpt-wardrobe.md 1절)
  const FACE_SHEET = { ev: 'ev_s1_faces', marie: 'marie_faces', duke: 'duke_faces' };
  const FACE_EMO = {
    ev: { '✨': 'a2', '💗': 'a3', '💢': 'a4', '💧': 'a5', '❗': 'a6', '❓': 'b4', '😏': 'a7', '🤒': 'a8', '💦': 'b3', '😤': 'b1' },
    marie: { '✨': 'a2', '💦': 'a3', '💧': 'a6', '❗': 'b1' },
    duke: { '💧': 'b4', '❗': 'b1', '✨': 'a4' },
  };
  function faceFor(id, emo, face) {
    const sheet = FACE_SHEET[id]; if (!sheet) return null;
    let cell = face || (FACE_EMO[id] && FACE_EMO[id][emo]) || 'a1';
    if (id === 'ev' && !face && !emo) {
      // 성격에 따라 기본 표정을 조금 다르게
      cell = { ice: 'a1', thorn: 'b1', green: 'a3', wild: 'a2' }[pers()] || 'a1';
      if (S.trust < 30) cell = 'a1';
    }
    const key = 'face/' + sheet + '_' + cell[0] + '_' + cell.slice(1);
    return art(key) || art('face/' + sheet + '_a_1');
  }

  // ───────── 판정 ─────────
  function checkScreen(def, prophecyId) {
    return new Promise(resolve => {
      const est = def.value ? def.value(S) : Object.keys(def.w).reduce((t, k) => t + S.stats[k] * def.w[k], 0);
      const canQuill = prophecyId && S.ink >= 40 && S.limits.quill > 0 && !def.noQuill;
      const m = modal('check', `<div class="ck-label">판정</div><h3>${U.esc(def.label)}</h3>
        <div class="ck-bar"><i class="fill"></i><span class="th" style="left:${Math.min(95, 70)}%"></span></div>
        <div class="ck-nums"><span>필요 <b>${def.th}</b></span><span>지금 약 <b>${Math.round(est)}</b></span></div>
        <div class="ck-parts"></div><div class="ck-res"></div>
        <div class="ck-btns"><button class="btn pri" data-a="roll">판정하기</button>
        ${canQuill ? `<button class="btn ink" data-a="quill">🖋️ 운명의 깃펜 <small>40잉크 · 판정 없이 성공 (남은 ${S.limits.quill})</small></button>` : ''}</div>`);
      const scale = v => Math.min(100, v / def.th * 70);
      const roll = async () => {
        const r = G.check(S, def);
        const fill = m.querySelector('.fill');
        fill.style.width = '0%';
        await U.sleep(60);
        fill.style.width = scale(r.val) + '%';
        fill.className = 'fill ' + (r.pass ? 'pass' : 'fail');
        m.querySelector('.ck-parts').innerHTML = r.parts.map(p => `<span class="chip neu">${p.name} ${p.v}</span>`).join('') + `<span class="chip ${r.pass ? 'up' : 'down'}">= ${r.val}</span>`;
        await U.sleep(900);
        Sound.sfx(r.pass ? 'pass' : 'nope');
        m.querySelector('.ck-res').innerHTML = r.pass ? '<b class="ok">성공!</b>' : `<b class="ng">실패…</b>${r.near ? '<small>아슬아슬했어요!</small>' : ''}`;
        const btns = m.querySelector('.ck-btns');
        if (!r.pass && r.near && S.limits.hourglass > 0) {
          btns.innerHTML = `<button class="btn ad" data-a="retry-ad">📺 광고 보고 다시 <small>(남은 ${S.limits.hourglass})</small></button>
            <button class="btn ink" data-a="retry-ink" ${S.ink >= 8 ? '' : 'disabled'}>⏳ 모래시계 8잉크</button>
            <button class="btn ghost" data-a="ok">받아들인다</button>`;
        } else btns.innerHTML = `<button class="btn pri" data-a="ok">계속</button>`;
        m._res = r.pass;
      };
      m.addEventListener('click', async e => {
        const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
        const a = b.dataset.a;
        if (a === 'roll') { b.disabled = true; await roll(); }
        if (a === 'retry-ad' || a === 'retry-ink') {
          S.limits.hourglass--; if (a === 'retry-ink') S.ink -= 8;
          m.querySelector('.ck-btns').innerHTML = ''; m.querySelector('.ck-res').innerHTML = '<small>⏳ 모래시계가 거꾸로 흐른다…</small>';
          await U.sleep(500); await roll();
        }
        if (a === 'quill') {
          S.ink -= 40; S.limits.quill--; S.month_.quill = true; Sound.sfx('great');
          m.querySelector('.ck-res').innerHTML = '<b class="ok">🖋️ 깃펜이 운명을 고쳐 쓴다!</b>';
          m.querySelector('.fill').style.width = '80%'; m.querySelector('.fill').className = 'fill pass';
          m.querySelector('.ck-btns').innerHTML = `<button class="btn pri" data-a="ok">계속</button>`; m._res = true;
        }
        if (a === 'ok') { m.close(); resolve(!!m._res); }
      });
      // 고정값 판정은 바로 결과 (깃펜 선택지가 없을 때)
      if (def.fixed && !canQuill) setTimeout(() => { const b = m.querySelector('[data-a=roll]'); if (b) b.click(); }, 300);
    });
  }

  // ───────── 원작 페이지 ─────────
  async function doRewrite(st) {
    let fate = st.fate, eff = Object.assign({}, st.eff), half = false;
    const used = S.month_.quill;
    if (!used && Math.random() < G.correctionChance(S)) {
      await playScene(ST.SCENES.corr);
      const ok = await checkScreen(Object.assign({ noQuill: true }, st.corr));
      if (!ok) { half = true; fate = Math.round(fate / 2); for (const k in eff) eff[k] = Math.round(eff[k] / 2); }
    }
    if (used) { fate -= 5; S.month_.quill = false; }
    G.applyStat(S, 'fate', fate); G.applyEff(S, eff);
    S.prophecy[st.rewrite] = half ? 'half' : 'new';
    await prophecyPage(st.rewrite, half ? 'half' : 'rewrite', { fate, eff });
  }

  function prophecyPage(id, mode, info) {
    info = info || {};
    const p = D.PROPHECY[id];
    Sound.bgm('prophecy');
    return new Promise(resolve => {
      const head = { warn: `📖 원작 예고 · ${p.month}월`, rewrite: '✒️ 원작이 다시 쓰였다', half: '✒️ 원작이 절반만 바뀌었다', fulfill: '📕 원작대로 일어났다' }[mode];
      const m = modal('page ' + mode, `<div class="paper">
          <div class="p-head">${head}</div>
          <div class="p-book">「장미는 성녀의 발밑에」</div>
          <h3>${p.title}</h3>
          <p class="pg-text"><span>${U.esc(p.text)}</span></p>
          <div class="p-stamp"></div>
          <div class="p-info"></div>
        </div>
        <div class="p-btns"></div>`);
      Sound.sfx('page');
      const btns = m.querySelector('.p-btns'), inf = m.querySelector('.p-info');
      if (mode === 'warn') {
        inf.innerHTML = `<p class="mono">…${p.month}월에 원작의 이 장면이 온다. 막아야 해.</p>`;
        btns.innerHTML = `<button class="btn ink" data-a="hint">📝 원작의 여백 보기 <small>3잉크 또는 📺</small></button><button class="btn pri" data-a="ok">알겠어요</button>`;
      } else {
        setTimeout(() => {
          if (mode !== 'fulfill') { m.querySelector('.pg-text').classList.add('struck'); Sound.sfx('strike'); }
          setTimeout(() => {
            const stamp = m.querySelector('.p-stamp');
            stamp.textContent = mode === 'rewrite' ? '다시 쓰임' : mode === 'half' ? '절반만' : '원작대로';
            stamp.classList.add('on');
            Sound.sfx(mode === 'fulfill' ? 'nope' : 'pass');
            inf.innerHTML = `<div class="chips">${chip('fate', info.fate)}${chips(info.eff)}</div><p class="muted">운명도 ${S.fate} · 원작 책이 ${info.fate < 0 ? '얇아졌다' : '두꺼워졌다'}</p>`;
            btns.innerHTML = `<button class="btn pri" data-a="ok">계속</button>`;
          }, mode === 'fulfill' ? 300 : 1100);
        }, 600);
      }
      m.addEventListener('click', e => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        if (b.dataset.a === 'hint') {
          if (S.ink >= 3) S.ink -= 3;
          inf.innerHTML = `<p class="hint">💡 ${p.hint}</p><p class="mono">…${p.month}월에 원작의 이 장면이 온다. 막아야 해.</p>`;
          b.remove();
        }
        if (b.dataset.a === 'ok') { m.close(); resolve(); }
      });
    });
  }

  function bookView() {
    const rows = Object.keys(D.PROPHECY).map(id => {
      const p = D.PROPHECY[id], st = S.prophecy[id];
      const tag = st === 'new' ? '<span class="chip up">다시 쓰임</span>' : st === 'half' ? '<span class="chip neu">절반</span>' : st === 'orig' ? '<span class="chip down">원작대로</span>' : (S.seen['warn_' + id] ? `<span class="chip neu">${p.month}월 예정</span>` : '<span class="chip neu">???</span>');
      const known = st || S.seen['warn_' + id];
      return `<div class="brow"><b>${known ? p.title : '아직 읽지 않은 장'}</b>${tag}${known && !st ? `<small>${p.hint}</small>` : ''}</div>`;
    }).join('');
    const m = modal('book', `<div class="sheet-head"><h3>📕 원작 소설</h3><button class="iconbtn" data-a="x">✕</button></div>
      <p class="muted">운명도 ${S.fate} — 낮을수록 원작이 약해져요. 60 이상이면 원작이 바뀌지 않으려고 버텨요(원작의 보정).</p>${rows}
      <p class="muted">예언서 조각 ${S.pages.length} / 7</p>`);
    m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-a=x]')) m.close(); });
  }

  // ───────── 의상실 ─────────
  function wardrobe() {
    let sel = S.outfit;
    const m = modal('ward', '');
    const sh = m.querySelector('.sheet');
    const render = () => {
      const o = D.OUTFITS[sel];
      const src = art(o.art) || art('ev_s1_base');
      sh.innerHTML = `<div class="sheet-head"><h3>👗 의상실</h3><button class="iconbtn" data-a="x">✕</button></div>
        <div class="w-top"><div class="w-prev"><img src="${src}" alt="">${art(o.art) ? '' : '<div class="temp-tag sm">그림 준비 중</div>'}</div>
        <div class="w-info"><b>${o.name}</b><small>${o.series}</small><p>${o.note || ''}</p>
        ${S.outfits[sel] ? (S.outfit === sel ? '<button class="btn sec" disabled>입는 중</button>' : '<button class="btn pri" data-a="wear">입히기</button>')
          : `<button class="btn pri" data-a="buy" ${S.gold >= o.price ? '' : 'disabled'}>💰 ${o.price}에 사기</button><button class="btn ad" data-a="try">📺 하루 빌려 입기</button>`}</div></div>
        <div class="w-grid">${Object.keys(D.OUTFITS).map(k => {
          const x = D.OUTFITS[k];
          return `<button class="w-cell ${k === sel ? 'sel' : ''} ${S.outfits[k] ? 'own' : ''}" data-k="${k}">${art(x.art) ? `<img src="${art(x.art)}" alt="">` : '<span class="w-ph">👗</span>'}<small>${x.name}</small>${S.outfit === k ? '<i>입는 중</i>' : S.outfits[k] ? '' : `<em>💰${x.price}</em>`}</button>`;
        }).join('')}</div>`;
    };
    render();
    sh.addEventListener('click', e => {
      const c = e.target.closest('[data-k]'); if (c) { sel = c.dataset.k; render(); return; }
      const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
      const a = b.dataset.a;
      if (a === 'x') { m.close(); main(); }
      if (a === 'wear') { S.outfit = sel; Sound.sfx('heart'); save(); render(); }
      if (a === 'buy') { const r = G.buyOutfit(S, sel); if (r.ok) { S.outfit = sel; Sound.sfx('coin'); save(); render(); } else toast(r.why); }
      if (a === 'try') { toast('체험판: 광고 대신 바로 이번 달만 입어 볼 수 있어요'); S.outfits[sel] = 'trial'; S.outfit = sel; save(); render(); }
    });
    m.addEventListener('click', e => { if (e.target === m) { m.close(); main(); } });
  }

  // ───────── 상점 ─────────
  function shop() {
    const tabs = { gift: '선물', cons: '소모품', tool: '수업 도구', spec: '특수' };
    let tab = 'gift';
    const m = modal('shop', '');
    const sh = m.querySelector('.sheet');
    const render = () => {
      sh.innerHTML = `<div class="sheet-head"><h3>🛍️ 상점</h3><span class="money">💰 ${S.gold} · 🖋️ ${S.ink}</span><button class="iconbtn" data-a="x">✕</button></div>
        <div class="tabs">${Object.keys(tabs).map(t => `<button class="tab ${t === tab ? 'on' : ''}" data-t="${t}">${tabs[t]}</button>`).join('')}</div>
        <div class="list">${Object.keys(D.ITEMS).filter(k => D.ITEMS[k].cat === tab).map(k => {
          const it = D.ITEMS[k];
          const have = it.cat === 'tool' ? (S.tools[it.tool] ? 1 : 0) : (S.bag[k] || 0);
          const sold = (it.cat === 'tool' && have) || (it.once && (S.flags['used_' + k] || have)) || (k === 'spec_rumor_notebook' && S.flags.notebook);
          return `<div class="row item">${icon(k, it.icon)}<div class="info"><b>${it.name}${have && it.cat !== 'tool' ? ` <small>×${have}</small>` : ''}</b><small>${effDesc(it)}</small></div>
            ${sold ? '<span class="chip neu">보유</span>' : `<button class="btn buy ${it.ink ? 'ink' : ''}" data-k="${k}">${it.ink ? '🖋️ ' + it.ink : '💰 ' + it.price}</button>`}
            ${have && (it.cat === 'gift' || it.cat === 'cons') ? `<button class="btn use" data-u="${k}">${it.cat === 'gift' ? '주기' : '쓰기'}</button>` : ''}</div>`;
        }).join('')}</div>`;
    };
    render();
    sh.addEventListener('click', e => {
      const t = e.target.closest('[data-t]'); if (t) { tab = t.dataset.t; render(); return; }
      if (e.target.closest('[data-a=x]')) { m.close(); main(); return; }
      const b = e.target.closest('[data-k]');
      if (b) {
        const r = G.buy(S, b.dataset.k);
        if (!r.ok) return toast(r.why);
        Sound.sfx('coin');
        if (b.dataset.k === 'spec_rumor_notebook') { S.flags.notebook = true; S.bag[b.dataset.k] = 0; toast('📒 이제 신뢰와 관계가 숫자로 보여요'); }
        if (b.dataset.k === 'spec_margin_note') { S.bag[b.dataset.k] = 0; const id = nextProphecy() || Object.keys(D.PROPHECY).find(x => !S.prophecy[x]); toast(id ? '💡 ' + D.PROPHECY[id].hint : '남은 예고가 없어요', 3500); }
        save(); render();
      }
      const u = e.target.closest('[data-u]');
      if (u) {
        const id = u.dataset.u, it = D.ITEMS[id];
        const r = G.useItem(S, id);
        if (!r.ok) return toast(r.why);
        Sound.sfx(it.cat === 'gift' ? 'heart' : 'good');
        const line = it.cat === 'gift' ? giftLine(id) : '';
        toast((line ? `<div class="gl">이벨리나: "${line}"</div>` : '') + chips(r.got) + (r.half ? '<small> (이번 달 두 번째라 절반)</small>' : '') + (it.buff ? ' <small>이번 달 효과 시작</small>' : ''), 2400);
        save(); render();
      }
    });
    m.addEventListener('click', e => { if (e.target === m) { m.close(); main(); } });
  }
  const GIFT_LINES = {
    ice: ['…받아 두지.', '고마워요. …정말로.', '이런 건 필요 없는데. …예쁘네.'],
    thorn: ['뭐야, 이런 걸로 날 꼬실 생각이야? …받을게.', '흥. 나쁘지 않네.', '…고, 고마워. 됐지?'],
    green: ['저한테요…? 고마워요, 선생님.', '소중히 할게요.', '이런 선물 처음 받아 봐요.'],
    wild: ['우와! 진짜 나 주는 거야?!', '최고야, 선생님!', '헤헤, 매일 이랬으면 좋겠다!'],
  };
  function giftLine() { const a = GIFT_LINES[pers()]; return a[Math.floor(Math.random() * a.length)]; }

  // ───────── 상태 ─────────
  function radar() {
    const keys = D.STAT_KEYS, n = keys.length, R = 80, cx = 110, cy = 100;
    const max = Math.max(150, ...keys.map(k => S.stats[k])) * 1.1;
    const pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
    const ring = f => keys.map((k, i) => pt(i, R * f).join(',')).join(' ');
    const poly = keys.map((k, i) => pt(i, R * S.stats[k] / max).join(',')).join(' ');
    const labels = keys.map((k, i) => { const [x, y] = pt(i, R + 16); return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle">${D.STATS[k].name} ${S.stats[k]}</text>`; }).join('');
    return `<svg viewBox="0 0 220 200" class="radar"><polygon points="${ring(1)}" class="r1"/><polygon points="${ring(0.66)}" class="r2"/><polygon points="${ring(0.33)}" class="r2"/><polygon points="${poly}" class="rv"/>${labels}</svg>`;
  }
  function status() {
    const P = D.PERSONALITY[pers()];
    const px = 50 + S.self / 2, py = 50 - S.temp / 2;
    const nb = S.flags.notebook;
    const m = modal('status', `<div class="sheet-head"><h3>📊 이벨리나</h3><button class="iconbtn" data-a="x">✕</button></div>
      ${radar()}
      <div class="st-grid">
        <div><small>스트레스</small><b>${S.stress}</b></div>
        <div><small>신뢰</small><b>${nb ? S.trust : heartsHtml()}</b></div>
        <div><small>악명</small><b>${S.notoriety}</b></div>
        <div><small>운명도</small><b>${S.fate}</b></div>
      </div>
      <div class="pers-map"><div class="axis-x"><span>순종</span><span>자유</span></div><div class="axis-y"><span>다정</span><span>냉정</span></div>
        <div class="quad q1">🌷 온실</div><div class="quad q2">🌹 들장미</div><div class="quad q3">❄️ 얼음</div><div class="quad q4">🌵 가시</div>
        <i class="dot" style="left:${px}%;top:${py}%"></i></div>
      <p class="center">${P.icon} <b>${P.name}</b> — ${P.desc}</p>
      <h4>관계</h4>
      <div class="rel"><span>👑 아버지</span><b>${nb ? S.father : (S.father >= 40 ? '따뜻함' : S.father >= 15 ? '조금 다가옴' : '냉담')}</b></div>
      ${S.rel.kairen !== undefined && S.seen.p2 ? `<div class="rel"><span>🤴 카이렌</span><b>${nb ? S.rel.kairen : (S.rel.kairen >= 15 ? '호감' : '무관심')}</b></div>` : ''}
      <h4>기록</h4>
      <div class="rel"><span>📜 예언서 조각</span><b>${S.pages.length} / 7</b></div>
      <div class="rel"><span>🔧 수업 도구</span><b>${Object.keys(S.tools).map(k => D.ACTIVITIES[k].name).join(', ') || '없음'}</b></div>
      ${nb ? '' : '<p class="muted">📒 상점의 \'도티의 소문 수첩\'이 있으면 신뢰와 관계가 숫자로 보여요.</p>'}`);
    m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-a=x]')) m.close(); });
  }

  // ───────── 1년 회고 ─────────
  function yearReview() {
    Sound.bgm('prophecy');
    const P = D.PERSONALITY[pers()];
    const res = Object.keys(D.PROPHECY).map(id => {
      const st = S.prophecy[id];
      return `<div class="rel"><span>${D.PROPHECY[id].title}</span>${st === 'new' ? '<span class="chip up">다시 쓰임</span>' : st === 'half' ? '<span class="chip neu">절반</span>' : '<span class="chip down">원작대로</span>'}</div>`;
    }).join('');
    app.innerHTML = '';
    const sc = U.el('div', 'screen review', `<div class="bg" style="${bgStyle('study_eve')}"></div><div class="shade"></div>
      <div class="rv-box"><div class="t-sub">13세의 1년</div><h2>1년 회고</h2>
      <img class="rv-ev" src="${evArt().src}" alt="">
      ${radar()}
      <p class="center">${P.icon} <b>${P.name}</b>로 자라고 있어요</p>
      <h4>원작 예고</h4>${res}
      <div class="rel"><span>운명도</span><b>80 → ${S.fate}</b></div>
      <div class="rel"><span>예언서 조각</span><b>${S.pages.length} / 7</b></div>
      ${S.flags.nox_seed ? '<div class="rel"><span>눈 오는 밤의 소년</span><b>…?</b></div>' : ''}
      <p class="muted">체험판은 여기까지예요. 2년차에는 외출과 아르바이트, 리아와 남주들, 대신관의 제안이 기다려요.</p>
      <button class="btn pri" data-a="new">처음부터 다시</button><button class="btn ghost" data-a="t">타이틀로</button></div>`);
    app.appendChild(sc);
    sc.addEventListener('click', e => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'new') { Save.clear(); S = G.newState(); prologue(); }
      if (a.dataset.a === 't') title();
    });
  }

  // ───────── 설정 ─────────
  function settings() {
    const m = modal('settings', `<div class="sheet-head"><h3>⚙️ 설정</h3><button class="iconbtn" data-a="x">✕</button></div>
      <label class="tg"><span>효과음</span><input type="checkbox" data-s="sound" ${Sound.on ? 'checked' : ''}></label>
      <label class="tg"><span>음악</span><input type="checkbox" data-s="music" ${Sound.musicOn ? 'checked' : ''}></label>
      ${S ? '<button class="btn ghost" data-a="title">타이틀로</button>' : ''}
      <button class="btn danger" data-a="reset">저장 지우기</button>
      <p class="muted">체험판 · M0 프로토타입 · 그림은 ChatGPT 제작 중 (없는 그림은 임시 표시)</p>`);
    m.addEventListener('change', e => { const s = e.target.dataset.s; if (s === 'sound') Sound.setSound(e.target.checked); if (s === 'music') Sound.setMusic(e.target.checked); });
    m.addEventListener('click', e => {
      if (e.target === m || e.target.closest('[data-a=x]')) m.close();
      if (e.target.closest('[data-a=title]')) { m.close(); title(); }
      if (e.target.closest('[data-a=reset]')) { if (confirm('저장을 지울까요?')) { Save.clear(); S = null; m.close(); title(); } }
    });
  }

  // ───────── 시작 ─────────
  fitApp();
  title();

  // 개발용
  window.__vt = {
    get S() { return S; }, G, D, ST,
    set(obj) { Object.assign(S, obj); save(); main(); },
    stats(obj) { Object.assign(S.stats, obj); save(); main(); },
    month(n) { S.month = n; S.plan = [null, null, null]; save(); main(); },
    main, title, playScene, prophecyPage, checkScreen, yearReview,
  };
})();
