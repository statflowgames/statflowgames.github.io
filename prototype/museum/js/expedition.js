// 원정: 실제 해안선 지도 · 원정 보내기 · 흙 털기 발굴 연출
'use strict';

const Expedition = (() => {
  // 지도 범위 (남해·말라카)
  const B = { lon0: 99.2, lon1: 111.6, lat0: 6.6, lat1: -8.6 };
  const MW = 640, MH = 560;
  const mx = lon => (lon - B.lon0) / (B.lon1 - B.lon0) * MW;
  const my = lat => (B.lat0 - lat) / (B.lat0 - B.lat1) * MH;
  let sel = null, panel = null, timer = null;

  function mapSvg() {
    let s = `<svg viewBox="0 0 ${MW} ${MH}" class="emap"><defs><pattern id="wv" width="40" height="20" patternUnits="userSpaceOnUse"><path d="M0 12 q10 -8 20 0 t20 0" fill="none" stroke="rgba(30,127,134,.18)" stroke-width="1.5"/></pattern></defs>`;
    s += `<rect width="${MW}" height="${MH}" fill="url(#wv)"/>`;
    for (const k in GEO.LAND) {
      const pts = GEO.LAND[k].map(([lo, la]) => `${mx(lo).toFixed(1)},${my(la).toFixed(1)}`).join(' ');
      s += `<polygon points="${pts}" fill="#e2cf9f" stroke="#8a6a3a" stroke-width="2" stroke-linejoin="round"/>`;
    }
    for (const k in GEO.RIVERS) s += `<polyline points="${GEO.RIVERS[k].map(([lo, la]) => `${mx(lo)},${my(la)}`).join(' ')}" fill="none" stroke="#6aa5b0" stroke-width="2"/>`;
    s += `<text x="${mx(101.6)}" y="${my(-1.2)}" class="lbl">수마트라</text><text x="${mx(108.6)}" y="${my(-7.95)}" class="lbl">자바</text><text x="${mx(101.4)}" y="${my(4.2)}" class="lbl">말레이반도</text><text x="${mx(108.4)}" y="${my(-1.3)}" class="lbl sea">남중국해</text><text x="${mx(108.6)}" y="${my(-5.0)}" class="lbl sea">자바해</text>`;
    return s + '</svg>';
  }
  const unlocked = id => G.fame >= RUINS[id].fame;
  const expAt = id => G.exps.find(e => e.ruin === id);

  function open(focus) {
    if (G.story < 1 && !Story.tutorial) { UI.toast('개관식 뒤에 원정을 보낼 수 있어요'); return; }
    panel = UI.panel('exp-panel', '🗺 원정 지도', () => { clearInterval(timer); panel = null; });
    el('div', 'teams', '', panel);
    const mapBox = el('div', 'mapbox', mapSvg(), panel);
    mapBox.style.setProperty('--ship', `url(${new URL(A('item/ship_research'), location.href).href})`);
    el('div', 'ruincard', null, panel);
    for (const id of RUIN_ORDER) {
      const R = RUINS[id];
      const m = el('div', 'rmark', `<i>${kindIcon(R.kind)}</i><span>${R.name}</span>`, mapBox);
      const [ox, oy] = R.mo || [0, 0];
      m.style.left = (mx(R.lon) + ox) + 'px'; m.style.top = (my(R.lat) + oy) + 'px';
      m.dataset.ruin = id;
      m.onclick = () => { SFX.play('click'); sel = id; draw(); };
    }
    sel = focus || sel || G.exps.find(e => State.now() >= e.end)?.ruin || RUIN_ORDER.find(id => unlocked(id) && !expAt(id)) || 'bukit_seguntang';
    draw();
    timer = setInterval(() => { if (panel) draw(true); }, 1000);
  }

  function draw(soft) {
    if (!panel) return;
    const busy = G.exps.length;
    panel.querySelector('.teams').innerHTML = `원정대 <b>${G.teams - busy}</b> / ${G.teams} 대기 · 💰 ${fmt(G.coins)} <span class="small">(체험판이라 원정 시간이 짧아요)</span>`;
    for (const m of panel.querySelectorAll('.rmark')) {
      const id = m.dataset.ruin, e = expAt(id);
      const all = RUINS[id].relics.every(r => G.relics[r]);
      m.className = 'rmark' + (id === sel ? ' sel' : '') + (!unlocked(id) ? ' lock' : '') + (e ? (State.now() >= e.end ? ' back' : ' away') : '') + (all ? ' done' : '');
      const t = e && State.now() < e.end ? Math.ceil((e.end - State.now()) / 1000) + '초' : '';
      let tm = m.querySelector('.tm'); if (!tm) tm = el('b', 'tm', '', m);
      tm.textContent = e ? (t || '돌아왔어요!') : (all ? '✓' : '');
    }
    const R = RUINS[sel], e = expAt(sel), card = panel.querySelector('.ruincard');
    const found = R.relics.filter(r => G.relics[r]).length;
    if (soft && card.dataset.sel === sel && card.dataset.state === (e ? (State.now() >= e.end ? 'back' : 'away') : 'idle')) {
      const tb = card.querySelector('.cnt'); if (tb && e) tb.textContent = Math.max(0, Math.ceil((e.end - State.now()) / 1000)) + '초 남음';
      return;
    }
    card.dataset.sel = sel; card.dataset.state = e ? (State.now() >= e.end ? 'back' : 'away') : 'idle';
    const chance = found >= R.relics.length ? 0 : (G.pity[sel] || 0) >= 2 ? 100 : 60;
    card.innerHTML = `<div class="thumb" style="background-image:url(${A('bg/ruin_' + sel)})"></div>
      <div class="info"><b>${R.name}</b> <span class="kind k-${R.kind}">${kindIcon(R.kind)} ${KIND[R.kind].name}</span>
      <p>${R.text}</p>
      <div class="rel">${R.relics.map(r => G.relics[r] ? `<img src="${relicImg(r)}" title="${RELICS[r].name}">` : `<img class="unk" src="${relicImg(r)}">`).join('')}
      <span>${found}/${R.relics.length}</span></div>
      <div class="meta">⏱ ${R.sec}초 · 💰 ${R.cost} · 👥 ${KIND[R.kind].team}${chance ? ` · 새 유물 ${chance}%${chance < 100 ? ' (3번째엔 반드시)' : ''}` : ' · 모두 찾았어요'}</div></div>`;
    const row = el('div', 'row', null, card);
    if (!unlocked(sel)) el('p', 'lockreason', `🔒 명성 ${R.fame} 이 되면 조사 허가가 나와요 (지금 ${G.fame})`, row);
    else if (e && State.now() >= e.end) btn('🎁 원정대 귀환! 결과 보기', 'glowbtn', () => result(e), row);
    else if (e) el('b', 'cnt', Math.ceil((e.end - State.now()) / 1000) + '초 남음', row);
    else {
      const b = btn(`⛵ 원정 보내기 (💰${R.cost})`, '', () => send(sel), row);
      if (busy >= G.teams || G.coins < R.cost) b.disabled = true;
      if (busy >= G.teams) el('span', 'small', '원정대가 모두 나가 있어요', row);
    }
  }

  function send(id) {
    const R = RUINS[id];
    if (G.coins < R.cost || G.exps.length >= G.teams) return;
    G.coins -= R.cost;
    const sec = G.firstExpDone ? R.sec : 12;
    G.exps.push({ ruin: id, end: State.now() + sec * 1000 });
    State.stat('exps'); SFX.play('sail'); HUD.update(true); State.save();
    UI.toast(`⛵ 원정대가 ${R.name}(으)로 떠났어요!`, 'good');
    Story.emit('expSent', id);
    draw();
  }

  async function result(e) {
    G.exps.splice(G.exps.indexOf(e), 1);
    G.firstExpDone = true;
    const R = RUINS[e.ruin];
    G.trips[e.ruin] = (G.trips[e.ruin] || 0) + 1;
    const left = R.relics.filter(r => !G.relics[r]);
    let got = null;
    if (left.length) {
      const sure = (G.pity[e.ruin] || 0) >= 2 || G.trips[e.ruin] === 1;
      if (sure || Math.random() < 0.6) { got = pick(left); G.pity[e.ruin] = 0; } else G.pity[e.ruin] = (G.pity[e.ruin] || 0) + 1;
    }
    State.save();
    if (panel) panel.close();
    if (got) await reveal(got, { skin: KIND[R.kind].skin, title: R.name, note: R.note });
    else {
      const gift = Math.round(R.cost * 0.7);
      G.coins += gift; State.addFame(2); SFX.play('page');
      const q = UI.panel('relic-panel', '📒 조사 일지');
      el('div', 'thumb big', '', q).style.backgroundImage = `url(${A('bg/ruin_' + e.ruin)})`;
      el('p', 'center', left.length ? `이번엔 새 유물을 찾지 못했어요.<br>대신 유적 지도를 고쳐 그리고 연구 지원금을 받았어요.<br><b>💰 +${gift} · ★ +2</b><br><span class="small">다음 원정에서 찾을 확률이 올라가요 (3번째엔 반드시)</span>`
        : `이 유적의 유물은 모두 찾았어요.<br>추가 조사 보고서로 지원금을 받았어요.<br><b>💰 +${gift} · ★ +2</b>`, q);
      btn('확인', '', () => q.close(), el('div', 'row', null, q));
      HUD.update(true);
    }
    Museum.badges();
  }

  // 흙 털기 (발견 연출)
  function reveal(r, o) {
    return new Promise(res => {
      const R = RELICS[r];
      const p = UI.panel('dig-panel', o.title ? `⛏ ${o.title}` : '⛏ 발굴', () => res());
      el('p', 'center help', o.skin === 'paper' ? '기록 상자를 문질러 열어 보세요' : o.skin === 'sand' ? '모래를 문질러 털어 내세요' : o.skin === 'straw' ? '짚을 헤쳐 보세요' : '흙을 문질러 털어 내세요', p);
      const box = el('div', `digbox ${RAR[R.rar].cls}`, `<div class="rays"></div><img src="${relicImg(r)}">`, p);
      const cv = el('canvas', 'sccv', null, box); cv.width = 420; cv.height = 420;
      paintCover(cv, o.skin);
      const out = el('div', 'digout', '', p);
      let fin = false;
      const done = () => {
        if (fin) return; fin = true;
        cv.classList.add('clear'); box.classList.add('found');
        const big = R.rar === '보물' || R.rar === '전설';
        SFX.play(big ? 'rare' : 'discover');
        if (big) UI.confetti(70);
        G.relics[r] = { st: 'raw' }; State.save(); Museum.badges();
        out.innerHTML = `<div class="rtitle pop"><span class="rar" style="background:${RAR[R.rar].color}">${R.rar}</span><b>${R.name}</b><small>${RUINS[R.ruin].name} · ${R.cat}</small></div>
          ${o.note ? `<p class="note">🤝 ${o.note}</p>` : ''}${Wishes.wanted(r) ? '<p class="note gold">💌 관람객이 기다리던 유물이에요!</p>' : ''}`;
        btn('🔬 수장고로 보내기', '', () => { p.close(); }, el('div', 'row', null, out));
        Story.emit('found', r);
      };
      scratchable(cv, 40, done, 0.62);
      p.cheat = done; Conserve.cur = p;
    });
  }

  // 돌아온 원정 알림 (루프에서)
  function check() {
    for (const e of G.exps) if (State.now() >= e.end && !e.told) { e.told = true; UI.toast(`🎁 ${RUINS[e.ruin].name} 원정대가 돌아왔어요!`, 'good'); SFX.play('discover'); HUD.tabs(); }
  }
  return { open, reveal, check, result };
})();
