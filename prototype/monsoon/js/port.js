// 항구: 시장 · 객잔 · 조선소 · 관청 · 주변 탐사 · 출항
'use strict';

const KEEPERS = { market: 'npc/nanhai_n2', inn: 'npc/nanhai_n1', shipyard: 'npc/nanhai_n3', office: 'npc/nanhai_n8' };
const FAC = {
  market: { name: '시장', icon: 'trade', bg: 'bg/bg_market_nanhai', hello: ['어서 와요! 오늘 들어온 물건 좀 봐요.', '싸게 줄게요. 많이 사면 값이 오르는 건 어쩔 수 없지만!'] },
  inn: { name: '객잔', icon: 'inn', bg: 'bg/bg_inn_nanhai', hello: ['바다 이야기라면 여기 다 모여요.', '한잔하고 쉬었다 가요. 소문은 공짜!'] },
  shipyard: { name: '조선소 · 창고', icon: 'shipyard', bg: 'bg/bg_shipyard_nanhai', hello: ['배는 코코넛 밧줄로 꿰매야 튼튼하지!', '물과 식량은 넉넉히 싣고 가요.'] },
  office: { name: '관청', icon: 'ledger', bg: 'bg/bg_office_nanhai', hello: ['항구의 질서는 왕의 이름으로 지킵니다.', '무슨 일로 오셨소?'] },
};

const Port = {
  id: null,
  async enter(id) {
    Port.id = id; G.port = id;
    G.at = { lon: PORTS[id].lon, lat: PORTS[id].lat };
    G.flags['visit_' + id] = (G.flags['visit_' + id] || 0) + 1;
    if (G.debt > 0 && G.day > (G.flags.deadline || DEADLINE) && id === 'palembang') await Story.deadline();
    State.save();
    Port.show();
  },
  show() {
    Game.scene('Blank');
    SFX.music('port');
    const P = PORTS[Port.id];
    Talk.close();
    UI.clear('scene', 'panel', 'story');
    const L = UI.L.scene;
    L.style.pointerEvents = 'auto';
    el('img', 'bg', null, L).src = A(P.bg);
    L.lastChild.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;animation:kenburns 30s ease-out forwards';
    // 동료가 부두에 서 있음
    const mates = G.mates.slice(0, 2);
    mates.forEach((m, i) => {
      const s = el('img', 'stand', null, L);
      s.src = A('ch/' + m); s.style.height = '430px'; s.style.left = (560 + i * 190) + 'px';
      s.style.animationDelay = (i * 0.7) + 's';
      s.onclick = () => Port.mateTalk(m);
      s.style.cursor = 'pointer';
    });
    el('div', 'portname', `${P.name}<small>${P.sub}</small>`, L);
    const menu = el('div', 'portmenu', null, L);
    for (const k of ['market', 'inn', 'shipyard', 'office']) {
      const b = btn(FAC[k].name, '', () => Port.facility(k), menu, 'icon/' + FAC[k].icon);
      if (Port.hasNotice(k)) el('i', 'notice', null, b);
    }
    if (P.ruins.length) {
      const b = btn('주변 탐사', '', () => Port.explore(), menu, 'icon/map');
      if (P.ruins.some(r => !G.ruins[r] && (!RUINS[r].quest || G.flags.boro_quest))) el('i', 'notice', null, b);
    }
    btn('출항', 'go', () => Game.toSea(), menu, 'icon/sail');
    const g = goalText();
    if (g) el('div', 'goal', g, L);
    UI.hud();
  },
  hasNotice(k) {
    const f = G.flags, p = Port.id;
    if (k === 'market' && p === 'palembang' && !f.weishao && G.voyages >= 1) return true;
    if (k === 'market' && p === 'kalah' && !f.jacob) return true;
    if (k === 'inn' && p === 'palembang' && f.weishao && !f.rumor_wreck) return true;
    if (k === 'office' && p === 'palembang' && G.debt > 0 && G.gold >= Math.min(G.debt, 150)) return true;
    if (k === 'office' && p === 'palembang' && G.debt <= 0 && f.wreck_done && !f.ch1_done) return true;
    if (k === 'office' && p === 'java' && !f.boro_quest) return true;
    return false;
  },
  async mateTalk(m) {
    SFX.play('click');
    const lines = {
      dayang: () => {
        const w = State.wind();
        return [['smile', `지금은 ${w.season}, ${w.from}이 불어. ${w.calm ? '바람이 변덕스러우니 조심해!' : (w.toward < 100 || w.toward > 300) ? '북쪽 칼라로 가기 좋은 때야.' : '남쪽 자바로 내려가기 좋은 때야.'}`]];
      },
      weishao: () => {
        const tip = Port.bestTip();
        return [['thinking', tip || '짐칸이 비었네. 시장에서 싼 물건부터 보자고.']];
      },
    };
    const ls = (lines[m] || (() => [['smile', '…']]))();
    Talk.bg(PORTS[Port.id].bg);
    Talk.stand([[m, 'c']]);
    for (const [f, t] of ls) await Talk.say(m, f, t);
    Talk.close();
  },
  bestTip() {
    let best = null;
    for (const g in G.cargo) {
      for (const p in PORTS) {
        const v = State.sellPrice(p, g);
        if (!best || v > best.v) best = { g, p, v };
      }
    }
    if (!best) return null;
    return `내 감정으로는 ${GOODS[best.g].name}은(는) ${PORTS[best.p].name}에서 한 짐에 ${best.v}디나르쯤 받겠어.`;
  },

  // ---------- 시설 ----------
  async facility(k) {
    const f = G.flags, p = Port.id;
    // 이야기 이벤트 먼저
    if (k === 'market' && p === 'palembang' && !f.weishao && G.voyages >= 1) await Story.weishao();
    if (k === 'market' && p === 'kalah' && !f.jacob) await Story.jacob();
    if (k === 'inn' && p === 'palembang' && f.weishao && !f.rumor_wreck) await Story.rumorWreck();
    if (k === 'office' && p === 'palembang' && G.debt <= 0 && f.wreck_done && !f.ch1_done) { await Story.ch1End(); Port.show(); return; }
    if (k === 'office' && p === 'java' && !f.boro_quest) await Story.boroQuest();
    Port.facView(k);
  },
  facView(k) {
    const F = FAC[k];
    UI.clear('scene', 'panel');
    const L = UI.L.scene;
    const box = el('div', 'fac', null, L);
    el('img', 'bg', null, box).src = A(F.bg);
    el('img', 'keeper', null, box).src = A(KEEPERS[k]);
    el('div', 'speech', pick(F.hello), box);
    const back = btn('← 부두로', 'paper small', () => Port.show(), box);
    back.style.cssText += ';position:absolute;left:20px;bottom:440px;';
    UI.hud();
    ({ market: Market.open, inn: Port.inn, shipyard: Port.shipyard, office: Port.office })[k]();
  },

  inn() {
    const p = UI.panel('menu-panel', '객잔', () => Port.show());
    const b = el('div', 'body', null, p);
    const key = Port.id + '_' + Math.floor(G.day / 3);
    const pool = RUMORS[Port.id];
    const r1 = pool[(G.day + Port.id.length) % pool.length], r2 = pool[(G.day * 7 + 3) % pool.length];
    el('div', 'rumor', '“' + r1 + '”', b);
    if (r2 !== r1) el('div', 'rumor', '“' + r2 + '”', b);
    G.rumorSeen[key] = true;
    const sh = SHIPS[G.ship];
    const rest = el('div', 'opt', `<img src="${A('icon/morale')}"><div class="d"><b>푹 쉬기</b>하룻밤 묵고 선원들에게 한턱냅니다. 사기 80까지 회복 · 하루가 지나요.</div>`, b);
    btn('쉬기 · 6', '', () => {
      if (G.gold < 6) return UI.toast('돈이 모자라요');
      G.gold -= 6; G.morale = Math.max(G.morale, 80); State.passDay(false); SFX.play('coin');
      UI.toast('선원들의 사기가 올랐다'); UI.hud();
    }, rest);
    const need = sh.crewMax - G.crew;
    const hire = el('div', 'opt', `<img src="${A('icon/crew')}"><div class="d"><b>선원 모집</b>지금 ${G.crew}명 / 최대 ${sh.crewMax}명 · 최소 ${sh.crewMin}명은 있어야 제 속도가 나요. 한 명에 5디나르.</div>`, b);
    btn('1명 · 5', '', () => {
      if (G.crew >= sh.crewMax) return UI.toast('배에 더 탈 자리가 없어요');
      if (G.gold < 5) return UI.toast('돈이 모자라요');
      G.gold -= 5; G.crew++; SFX.play('coin'); UI.hud(); Port.inn();
    }, hire).disabled = need <= 0;
  },

  shipyard() {
    const p = UI.panel('menu-panel', '조선소 · 창고', () => Port.show());
    const b = el('div', 'body', null, p);
    const sh = SHIPS[G.ship];
    const cap = sh.supply;
    const needF = cap - G.food, needW = cap - G.water;
    const supCost = Math.ceil((Math.max(0, needF) + Math.max(0, needW)) / 3);
    const sup = el('div', 'opt', `<img src="${A('item/use_rice')}"><div class="d"><b>식량 · 물 채우기</b>식량 ${G.food}/${cap} · 물 ${G.water}/${cap} · 하루에 각각 ${State.dailyUse()}씩 써요 (약 ${Math.floor(Math.min(G.food, G.water) / State.dailyUse())}일 분량).</div>`, b);
    btn('가득 · ' + supCost, '', () => {
      if (supCost <= 0) return UI.toast('이미 가득 찼어요');
      if (G.gold < supCost) {             // 돈만큼만
        const n = G.gold * 3; const f = Math.min(needF, Math.ceil(n / 2)); const w = Math.min(needW, n - f);
        G.food += Math.max(0, f); G.water += Math.max(0, w); G.gold = 0;
      } else { G.gold -= supCost; G.food = cap; G.water = cap; }
      SFX.play('buy'); UI.hud(); Port.shipyard();
    }, sup).disabled = supCost <= 0;
    const dmg = sh.hull - G.hull, repCost = Math.ceil(dmg / 2);
    const rep = el('div', 'opt', `<img src="${A('item/use_spare_planks')}"><div class="d"><b>배 수리</b>선체 ${Math.round(G.hull)}/${sh.hull}. 선체가 약하면 폭풍과 해전에서 위험해요.</div>`, b);
    btn('수리 · ' + repCost, '', () => {
      if (G.gold < repCost) return UI.toast('돈이 모자라요');
      G.gold -= repCost; G.hull = sh.hull; SFX.play('hit'); UI.hud(); Port.shipyard();
    }, rep).disabled = dmg <= 0;
    // 배 사기
    for (const sid of ['dhow_s', 'kunlun']) {
      const S = SHIPS[sid];
      const o = el('div', 'opt', `<img src="${A('ship/' + sid)}" style="width:120px"><div class="d"><b>${S.name} — ${S.price} 디나르</b>${S.kind} · 짐칸 ${S.hold} · 선원 ${S.crewMin}~${S.crewMax} · 선체 ${S.hull}${G.ship === sid ? ' <span class="tag g">지금 배</span>' : ''}</div>`, b);
      const bb = btn('사기', '', async () => {
        if (G.gold < S.price) return UI.toast('돈이 모자라요');
        if (State.cargoCount() > S.hold) return UI.toast('짐이 너무 많아요');
        G.gold -= S.price; G.ship = sid; G.hull = S.hull;
        G.food = Math.min(G.food, S.supply); G.water = Math.min(G.water, S.supply);
        SFX.play('win'); UI.toast(`${S.name}를 샀다! 다양의 프라후는 뒤에 매달고 다닌다.`, 'icon/ship');
        G.fame.trade += 20;
        UI.hud(); Port.shipyard();
      }, o);
      bb.disabled = G.ship === sid || SHIPS[G.ship].price >= S.price;
    }
  },

  office() {
    const p = UI.panel('menu-panel', '관청', () => Port.show());
    const b = el('div', 'body', null, p);
    if (Port.id === 'palembang') {
      if (G.debt > 0) {
        const left = (G.flags.deadline || DEADLINE) - G.day;
        const o = el('div', 'opt', `<img src="${A('item/cur_dinar_pile')}"><div class="d"><b>빚 갚기 — 남은 빚 ${G.debt} 디나르</b>다투 스리에게 갚아요. 기한까지 ${Math.max(0, left)}일. 가진 돈 ${fmt(G.gold)} 디나르.</div>`, b);
        for (const amt of [50, 100]) {
          btn(amt + ' 갚기', 'small', () => Port.pay(Math.min(amt, G.debt)), o).disabled = G.gold < Math.min(amt, G.debt);
        }
        btn('모두', 'small', () => Port.pay(Math.min(G.gold, G.debt)), o).disabled = G.gold <= 0;
      } else {
        el('div', 'rumor', '빚을 모두 갚았다. 다투 스리가 고개를 끄덕인다.', b);
      }
    } else if (Port.id === 'java') {
      const st = G.ruins.borobudur ? '보로부두르 순례자 호위를 마쳤다. 관리가 고마워한다.' : G.flags.boro_quest ? '순례자들이 「주변 탐사」의 보로부두르 길에서 기다리고 있다.' : '보로부두르 순례자 호위 의뢰가 있다.';
      el('div', 'rumor', st, b);
      if (!G.flags.boro_quest) btn('의뢰 듣기', '', async () => { UI.closePanel(); await Story.boroQuest(); Port.facView('office'); }, b);
    } else {
      el('div', 'rumor', `${PORTS[Port.id].name} 항만 관리가 입항 기록을 적는다. 지금 이 항구에 맡겨진 일은 없다.`, b);
    }
    const fee = el('div', 'opt', `<img src="${A('icon/ledger')}"><div class="d"><b>항해 기록</b>교역 명성 ${G.fame.trade} · 탐험 명성 ${G.fame.explore} · 학문 명성 ${G.fame.scholar} · 해상 명성 ${G.fame.sea}</div>`, b);
    fee.style.marginTop = '14px';
  },
  async pay(n) {
    if (n <= 0 || G.gold < n) return;
    G.gold -= n; G.debt -= n; SFX.play('coin');
    UI.toast(`${n} 디나르를 갚았다. 남은 빚 ${G.debt}`, 'icon/dinar');
    State.save();
    if (G.debt <= 0) { UI.closePanel(); await Story.debtClear(); Port.show(); return; }
    UI.hud(); Port.office();
  },

  // ---------- 주변 탐사 (유적) ----------
  explore() {
    const p = UI.panel('menu-panel', '주변 탐사');
    const b = el('div', 'body', null, p);
    for (const rid of PORTS[Port.id].ruins) {
      const R = RUINS[rid];
      const done = !!G.ruins[rid];
      const locked = R.quest && !G.flags.boro_quest;
      const o = el('div', 'opt', `<img src="${A(R.bg)}" style="width:150px;height:84px;object-fit:cover;border-radius:8px"><div class="d"><b>${R.name}${done ? ' <span class="tag g">기록함</span>' : ''}</b>${locked ? '관청의 의뢰를 받아야 갈 수 있어요.' : R.text.slice(0, 48) + '…'} · ${R.days}일</div>`, b);
      btn(done ? '다시 가기' : '가기', '', () => { UI.closePanel(); Ruin.visit(rid); }, o).disabled = locked;
    }
  },
};

// ---------- 교역 ----------
const Market = {
  sel: null, mode: 'buy', qty: 1,
  open() {
    Market.sel = null; Market.qty = 1;
    Market.render();
  },
  render() {
    const pid = Port.id;
    const p = UI.panel('trade', PORTS[pid].name + ' 시장', () => Port.show());
    const cols = el('div', 'cols', null, p);
    const c1 = el('div', 'col', `<h3><span>사기 — 이 항구 물건</span></h3>`, cols);
    const l1 = el('div', 'list', null, c1);
    for (const g in PORTS[pid].buy) {
      const v = State.buyPrice(pid, g);
      const cheap = v < GOODS[g].base * 0.85;
      const r = el('div', 'row' + (Market.sel === g && Market.mode === 'buy' ? ' sel' : ''),
        `<img src="${A('item/trade_' + g)}"><div class="nm">${GOODS[g].name}${cheap ? '<span class="tag g">특산</span>' : ''}<small>${GOODS[g].kind} · 보통 ${GOODS[g].base}</small></div><div class="pr">${v}</div>`, l1);
      r.onclick = () => { SFX.play('click'); Market.sel = g; Market.mode = 'buy'; Market.qty = 1; Market.render(); };
    }
    const cnt = State.cargoCount(), hold = State.hold();
    const c2 = el('div', 'col', `<h3><span>팔기 — 내 짐</span><span>${cnt} / ${hold}</span></h3><div class="cargo-bar"><i style="width:${cnt / hold * 100}%"></i></div>`, cols);
    const l2 = el('div', 'list', null, c2);
    const goods = Object.keys(G.cargo);
    if (!goods.length) el('div', null, '<p style="color:#8a6a40;font:500 16px var(--sans)">짐칸이 비어 있어요.</p>', l2);
    for (const g of goods) {
      const c = G.cargo[g], v = State.sellPrice(pid, g);
      const diff = v - c.cost;
      const want = PORTS[pid].want[g];
      const r = el('div', 'row' + (Market.sel === g && Market.mode === 'sell' ? ' sel' : ''),
        `<img src="${A('item/trade_' + g)}"><div class="nm">${GOODS[g].name} ×${c.n}${want ? '<span class="tag">비싸게 삼</span>' : ''}<small>산 값 ${Math.round(c.cost)}</small></div><div class="pr ${diff >= 0 ? 'up' : 'dn'}">${v}<br><small>${diff >= 0 ? '+' : ''}${Math.round(diff)}</small></div>`, l2);
      r.onclick = () => { SFX.play('click'); Market.sel = g; Market.mode = 'sell'; Market.qty = c.n; Market.render(); };
    }
    // 거래 줄
    const deal = el('div', 'deal', null, p);
    const g = Market.sel;
    if (!g) {
      deal.innerHTML = `<span style="color:#7a5a30">왼쪽에서 살 물건, 오른쪽에서 팔 물건을 고르세요. 많이 사고팔수록 값이 움직여요.</span>`;
    } else {
      const buy = Market.mode === 'buy';
      const max = buy ? Market.maxBuy(g) : G.cargo[g].n;
      Market.qty = clamp(Market.qty, max > 0 ? 1 : 0, Math.max(0, max));
      const total = buy ? Market.cost(g, Market.qty) : Market.gain(g, Market.qty);
      const step = d => () => { Market.qty = clamp(Market.qty + d, 1, Math.max(1, max)); Market.render(); };
      btn('−10', 'paper small', step(-10), deal); btn('−1', 'paper small', step(-1), deal);
      el('div', 'q', `${GOODS[g].name} ${Market.qty}<br><small style="font-weight:500;font-size:14px">${buy ? '값' : '받을 돈'} ${fmt(total)}</small>`, deal);
      btn('+1', 'paper small', step(1), deal); btn('+10', 'paper small', step(10), deal);
      btn('최대', 'paper small', () => { Market.qty = max; Market.render(); }, deal);
      const go = btn(buy ? '사기' : '팔기', '', () => Market.deal(), deal);
      go.disabled = Market.qty <= 0;
      if (G.mates.includes('weishao')) {
        let best = null;
        for (const pp in PORTS) if (pp !== pid) { const v = State.sellPrice(pp, g); if (!best || v > best.v) best = { pp, v }; }
        el('div', null, `<small style="color:#5a7a3a;font:600 14px var(--sans)">위소: "${GOODS[g].name}은(는) ${PORTS[best.pp].name}에서 ${best.v}쯤 받겠어."</small>`, p).style.cssText = 'text-align:center;margin-top:6px';
      }
    }
    el('div', null, `<small style="color:#7a5a30;font:500 14px var(--sans)">가진 돈 <b>${fmt(G.gold)}</b> 디나르${G.debt > 0 ? ` · 빚 ${G.debt}` : ''}</small>`, p).style.cssText = 'text-align:center;margin-top:6px';
  },
  maxBuy(g) {
    const room = State.hold() - State.cargoCount();
    let n = 0, sum = 0;
    while (n < room) {
      const v = State.buyPrice(Port.id, g, State.heat(Port.id, g) + n * 0.025);
      if (sum + v > G.gold) break;
      sum += v; n++;
    }
    return n;
  },
  cost(g, n) { let s = 0; for (let i = 0; i < n; i++) s += State.buyPrice(Port.id, g, State.heat(Port.id, g) + i * 0.025); return s; },
  gain(g, n) { let s = 0; for (let i = 0; i < n; i++) s += State.sellPrice(Port.id, g, State.heat(Port.id, g) - i * 0.03); return s; },
  deal() {
    const g = Market.sel;
    if (Market.mode === 'buy') {
      const t = State.buy(Port.id, g, Market.qty);
      if (t === false) return UI.toast('돈이나 짐칸이 모자라요');
      SFX.play('buy'); UI.toast(`${GOODS[g].name} ${Market.qty}짐을 ${t} 디나르에 샀다`, 'item/trade_' + g);
    } else {
      const r = State.sell(Port.id, g, Market.qty);
      if (!r) return;
      SFX.play('coin');
      UI.toast(`${GOODS[g].name}을(를) ${r.total} 디나르에 팔았다 (${r.profit >= 0 ? '이익 +' : '손해 '}${r.profit})`, 'icon/dinar');
      Market.sel = null;
    }
    State.save(); UI.hud(); Market.render();
  },
};

// ---------- 유적 방문 ----------
const Ruin = {
  async visit(rid) {
    const R = RUINS[rid];
    if (rid === 'borobudur') {
      await Story.borobudur();
    } else {
      Talk.bg(R.bg, true);
      await Talk.n(R.text);
    }
    const first = !G.ruins[rid];
    if (first) {
      const v = await Talk.choice([[R.act, 'act'], ['둘러보기만 한다', 'look']]);
      for (let i = 0; i < R.days; i++) State.passDay(false);
      if (v === 'act') {
        G.ruins[rid] = G.day;
        G.fame.explore += 25;
        const got = [];
        for (const r of R.relics) if (State.addRelic(r)) got.push(r);
        SFX.play('discover');
        for (const r of got) {
          Talk.stand([]);
          await Talk.n(`유물 기록 — ${RELICS[r].name} 「${RELICS[r].rar}」\n${RELICS[r].desc}`);
        }
        if (rid === 'borobudur') { G.gold += 40; UI.toast('순례자 호위 보상 40 디나르', 'icon/dinar'); SFX.play('coin'); }
        UI.toast(`${R.name} 기록 완료 · 탐험 명성 +25`, 'icon/codex');
      } else {
        await Talk.n('조용히 둘러보고 돌아왔다. 언제든 다시 올 수 있다.');
      }
    } else {
      State.passDay(false);
      await Talk.n('다시 와도 마음이 차분해지는 곳이다.');
    }
    Talk.close();
    State.save();
    Port.show();
  },
};
