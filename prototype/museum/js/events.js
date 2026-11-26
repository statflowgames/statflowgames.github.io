// 재미 요소: 깜짝 사건 · 관람객 소원 · 오늘의 목표 · 메뉴
'use strict';

const Events = (() => {
  const E = { active: null, until: 0, nextT: 70, wishT: 25, lastKind: null };
  function update(dt) {
    if (G.story < 1 || Story.busy || Talk.active) return;
    if (E.active && performance.now() / 1000 > E.until) end();
    E.nextT -= dt; E.wishT -= dt;
    if (E.wishT <= 0) { E.wishT = rand(60, 100); Wishes.spawn(); }
    if (E.nextT <= 0 && !E.active && !UI.panelOpen) {
      E.nextT = rand(110, 170);
      const kinds = ['bus', 'rain', 'reporter', 'lostkid', 'scholar'].filter(k => k !== E.lastKind);
      if (State.shownCount() < 3) kinds.splice(kinds.indexOf('scholar'), 1);
      start(pick(kinds));
    }
  }
  function start(k) {
    E.lastKind = k;
    const ev = EVENTS[k];
    UI.banner(ev.name, ev.text, 'event'); SFX.play('discover');
    if (ev.sec) { E.active = k; E.until = performance.now() / 1000 + ev.sec; }
    if (k === 'bus') { for (let i = 0; i < 4; i++) setTimeout(() => Visitors.spawn({ group: pick(['seasia', 'china', 'world']), type: 3 }), i * 400); Museum.scrollTo('lobby'); }
    if (k === 'rain') document.getElementById('stage').classList.add('raining');
    if (k === 'reporter') Visitors.spawn({ group: 'world', type: 1, reporter: true, free: true });
    if (k === 'lostkid') { const f = G.hallB && Math.random() < 0.5 ? 'nanhaiB' : 'nanhaiA'; Visitors.spawn({ group: pick(['seasia', 'china', 'world']), type: 3, kid: true, kidFloor: f, free: true }); Museum.scrollTo(f); }
    if (k === 'scholar') setTimeout(quiz, 1200);
  }
  function end() { if (E.active === 'rain') document.getElementById('stage').classList.remove('raining'); E.active = null; }
  // 기자: 첫 관람 때 사진
  function onLook(v) {
    if (!v.opts.reporter || v.repDone) return;
    v.repDone = true;
    Museum.flash(v.x + 10, v.y - 70); SFX.play('camera');
    setTimeout(() => { Museum.flash(v.x + 10, v.y - 70); SFX.play('camera'); }, 300);
    State.addFame(8); UI.banner('📰 신문에 실려요!', '명성 +8 · 내일 관람객이 늘 거예요');
    v.mark && v.mark.remove();
  }
  function kidFound(v) {
    v.q = [{ t: 'walk', x: v.f === 'nanhaiA' ? 692 : 28 }, { t: 'exit' }]; v.act = null;
    v.mark && v.mark.remove(); Visitors.bubble(v, '😆');
    State.coins(30); State.addFame(5); SFX.play('cheer');
    UI.banner('👪 엄마를 찾았어요!', '💰 +30 · 명성 +5');
  }
  // 학자 퀴즈
  function quiz() {
    if (UI.panelOpen || Talk.active) { E.nextT = 20; return; }
    const pool = RELIC_ORDER.filter(r => G.relics[r]);
    if (pool.length < 2) return;
    const r = pick(pool), R = RELICS[r];
    let q, ans, opts;
    if (Math.random() < 0.55) {
      q = `「${R.name}」은(는) 어느 유적에서 왔을까요?`;
      ans = RUINS[R.ruin].name;
      opts = [ans, ...RUIN_ORDER.filter(x => x !== R.ruin).sort(() => Math.random() - 0.5).slice(0, 2).map(x => RUINS[x].name)];
    } else {
      q = `「${R.name}」은(는) 어떤 종류의 유물일까요?`;
      ans = R.cat;
      const cats = [...new Set(RELIC_ORDER.map(x => RELICS[x].cat))].filter(c => c !== ans).sort(() => Math.random() - 0.5);
      opts = [ans, cats[0], cats[1]];
    }
    opts.sort(() => Math.random() - 0.5);
    const p = UI.panel('relic-panel quiz', '🎓 학자의 퀴즈');
    el('div', 'rbig', `<img src="${relicImg(r)}">`, p);
    el('p', 'center qq', q, p);
    const row = el('div', 'col', null, p);
    for (const o of opts) btn(o, 'paper', () => {
      row.innerHTML = '';
      if (o === ans) { SFX.play('cheer'); State.coins(80); State.addFame(4); State.stat('quiz'); el('p', 'center good', `정답이에요! 「훌륭한 큐레이터시군요.」<br>💰 +80 · 명성 +4`, row); UI.confetti(30); }
      else { SFX.play('bad'); State.coins(10); el('p', 'center', `아쉬워요. 정답은 <b>${ans}</b>.<br>「그래도 열정은 대단하군요.」 💰 +10`, row); }
      el('p', 'rsrc', R.desc, row);
      btn('확인', '', () => p.close(), row);
    }, row);
  }
  return Object.assign(E, { update, start, onLook, kidFound, quiz, end });
})();

// ---------- 관람객 소원 ----------
const Wishes = (() => {
  const MSG = {
    seasia: ['할머니가 들려주던 {r}, 꼭 보고 싶어요!', '우리 고장 {r}을(를) 박물관에서 보고 싶어요.'],
    china: ['{r}이(가) 여기 있다는 소문 듣고 왔어요!', '{r}, 사진으로만 봤어요. 진짜 보고 싶어요.'],
    world: ['I came for {r}! (「{r}」 보러 왔어요!)', '여행 책에 나온 {r}, 언제 전시하나요?'],
  };
  function pickRelic() {
    const cand = RELIC_ORDER.filter(r => !State.slotOf(r) && !G.wishes.some(w => w.relic === r) && G.fame >= RUINS[RELICS[r].ruin].fame);
    if (!cand.length) return null;
    const own = cand.filter(r => G.relics[r]);
    return own.length && Math.random() < 0.55 ? pick(own) : pick(cand);
  }
  function spawn() {
    if (G.wishes.length >= 3) return;
    const r = pickRelic(); if (!r) return;
    const group = pick(['seasia', 'china', 'world']);
    Visitors.spawn({ group, wish: { relic: r, group, msg: pick(MSG[group]).replace(/\{r\}/g, RELICS[r].name) }, free: false });
    UI.toast('💌 소원이 있는 관람객이 왔어요! 머리 위 「!」를 눌러 보세요');
  }
  function open(v) {
    const w = v.wish;
    const p = UI.panel('relic-panel wishp', '💌 관람객의 소원');
    el('div', 'wishwho', `<div class="vface">${v.look.side}</div><div class="bubble">「${w.msg}」</div>`, p);
    const own = G.relics[w.relic];
    el('div', 'rbig', `<img src="${relicImg(w.relic)}" class="${own ? '' : 'unk'}">`, p);
    el('p', 'center', own ? `<b>${RELICS[w.relic].name}</b> — 수장고에 있어요! 전시하면 소원 성취.` : `<b>${RELICS[w.relic].name}</b><br>📍 ${RUINS[RELICS[w.relic].ruin].name} 원정에서 찾을 수 있어요.`, p);
    const row = el('div', 'row', null, p);
    btn('꼭 보여 드릴게요!', '', () => {
      v.wishTaken = true; v.mark && v.mark.remove();
      G.wishes.push({ relic: w.relic, group: w.group, msg: w.msg });
      Visitors.bubble(v, '🥰'); SFX.play('heart'); p.close(); HUD.tabs(); State.save();
      if (State.slotOf(w.relic)) check(w.relic);
    }, row);
  }
  function check(relic) {
    const i = G.wishes.findIndex(w => w.relic === relic);
    if (i < 0 || !State.slotOf(relic)) return;
    G.wishes.splice(i, 1);
    const reward = irand(60, 100);
    State.coins(reward); State.addFame(6); State.stat('wishes');
    SFX.play('cheer'); UI.confetti(35);
    UI.banner('💌 소원 성취!', `「${RELICS[relic].name}」 앞에서 관람객이 울컥했어요 · 💰 +${reward} · 명성 +6`);
    HUD.tabs(); Museum.render(); State.save();
  }
  const wanted = r => G && G.wishes.some(w => w.relic === r);
  function openBook() {
    const p = UI.panel('store-panel', '💌 소원 수첩');
    if (!G.wishes.length) { el('p', 'empty', '아직 받은 소원이 없어요.<br>머리 위에 「!」가 뜬 관람객을 눌러 보세요.', p); return; }
    const g = el('div', 'wishlist', null, p);
    for (const w of G.wishes) {
      const own = G.relics[w.relic];
      const st = !own ? `📍 ${RUINS[RELICS[w.relic].ruin].name}에서 찾기` : own.st === 'raw' ? '🔬 보존처리하기' : '🏛 전시하면 성취!';
      const c = el('div', 'wrow', `<img src="${relicImg(w.relic)}" class="${own ? '' : 'unk'}"><div><b>${RELICS[w.relic].name}</b><p>「${w.msg}」</p><span>${st}</span></div>`, g);
      c.onclick = () => { SFX.play('click'); if (!own) { p.close(); Expedition.open(RELICS[w.relic].ruin); } else if (own.st === 'ready') { p.close(); Store.startPlace(w.relic); } else { p.close(); Store.open('raw'); } };
    }
  }
  return { spawn, open, check, wanted, openBook };
})();

// ---------- 오늘의 목표 ----------
const Goals = {
  open() {
    const p = UI.panel('store-panel', '🎯 오늘의 목표');
    const box = el('div', 'goals', null, p);
    for (const g of G.goals) {
      const def = GOAL_POOL.find(x => x.id === g.id);
      const pr = State.goalProg(g);
      const r = el('div', 'goal' + (g.got ? ' got' : ''), `<div><b>${def.text.replace('{n}', g.n)}</b><div class="bar"><i style="width:${pr / g.n * 100}%"></i></div><small>${pr} / ${g.n}</small></div>`, box);
      if (g.got) el('span', 'ok', '✔ 받음', r);
      else if (pr >= g.n) btn(`💰 ${g.reward} 받기`, 'small glowbtn', () => { g.got = true; State.coins(g.reward); SFX.play('coin'); State.addFame(2); HUD.goalBadge(); State.save(); p.close(); Goals.open(); }, r);
      else el('span', 'rw', `💰 ${g.reward}`, r);
    }
    if (G.goals.every(g => g.got)) btn('🎯 새 목표 받기', '', () => { State.newGoals(); G.goalsDone++; State.save(); p.close(); Goals.open(); }, el('div', 'row', null, p));
    // 다음 등급
    const nx = RANKS[G.rank + 1];
    if (nx && nx.need) {
      const n = nx.need;
      el('div', 'ranknext', `<h3>다음 등급 · ${nx.name}</h3>
        <p>${G.fame >= n.fame ? '✅' : '⬜'} 명성 ${G.fame} / ${n.fame}</p>
        <p>${State.shownCount() >= n.shown ? '✅' : '⬜'} 전시한 유물 ${State.shownCount()} / ${n.shown}</p>
        <p>${State.setCount() >= n.sets ? '✅' : '⬜'} 완성한 유적 세트 ${State.setCount()} / ${n.sets}</p>`, p);
    }
  },
};

// ---------- 메뉴 ----------
const Menu = {
  open() {
    const p = UI.panel('store-panel', '⚙ 메뉴');
    el('div', 'memo', `<p><b>몬순 박물관</b> — 체험판 M0 (남해관)</p>
      <p>진행은 자동으로 저장돼요. 앱을 꺼 둔 동안에도 입장료가 쌓여요 (최대 8시간).</p>
      <p class="small">현대 인물·관람객·박물관 그림은 아직 임시예요. 유물·유적·회상 그림은 원작 「몬순 — 바다의 비단길」 그림이에요.</p>
      <p class="small">관장: ${G.name} · 총 관람객 ${fmt(G.st.visitors)}명 · 하트 ${fmt(G.st.hearts)} · 소원 ${G.st.wishes}개 · 퀴즈 ${G.st.quiz}개</p>`, p);
    const row = el('div', 'row', null, p);
    btn('처음부터 다시', 'paper', async () => {
      p.close();
      const q = UI.panel('relic-panel', '처음부터?');
      el('p', 'center', '저장을 지우고 처음부터 시작할까요?', q);
      const r2 = el('div', 'row', null, q);
      btn('지우고 시작', '', () => { State.wipe(); location.reload(); }, r2);
      btn('취소', 'paper', () => q.close(), r2);
    }, row);
  },
};
