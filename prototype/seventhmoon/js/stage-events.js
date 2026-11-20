// 🆕 스테이지 안 이야기: 싸우는 도중 짧은 말풍선(전투를 멈추지 않음) + 목표.
//   kind 'rescue' : 우리에 갇힌 사람 n명을 제한 시간 안에 부숴 구출
//   kind 'ritual' : 흑월 의식 제단을 제한 시간 안에 부숨 (못 부수면 적이 흑월빛에 취해 피해 +25%)
//   kind 'talk'   : 대화만 (wave 번째 잠금 전투가 시작될 때)
// 말하는 사람: STORY의 CAST 키, 'hero', 또는 'x:이름'(그 자리 인물). 줄 조건(if/ifNot/onlyFor)은 대본과 같다.
// 연결: Game.create(start) · startWave(onWave) · hitProp(onProp) · update(update) · stageClear(onClear) · resolveHeroHit(rage)
const STAGE_EVENTS = {
  // ---- 1장 ----
  c1_s2: { wave: 2, kind: 'rescue', n: 2, who: '사냥꾼', time: 40000,
    intro: [['lise', '저기! 우리 안에 사람이 갇혀 있어요!'], ['tabel', '그롤린 놈들, 사람을 잡아 어디로 끌고 가는 거지? 우리를 부숴!']],
    ok: [['x:사냥꾼', '고맙소! 놈들은 \'달을 가진 아이\'를 찾고 있었소. 보랏빛 망토의 사내가 시켰다더군.'], ['lise', '달을 가진 아이…?']],
    fail: [['lise', '…늦었어요. 우리가 텅 비었어요.']],
    reward: { gold: 40, lise: 1, flag: 'c1_hunters' } },
  c1_a1: { wave: 2, kind: 'rescue', n: 3, who: '마을 사람', time: 45000,
    intro: [['x:마을 사람', '살려 주세요! 불이 번져요!'], ['lise', '불타는 집 사이에 사람들이 갇혀 있어요! 서둘러요!']],
    ok: [['x:마을 사람', '은혜는 잊지 않겠소! 대장 놈 천막은 마을 끝에 있소.'], ['lise', '다행이다…!']],
    fail: [['tabel', '…불길이 너무 빨랐다. 앞만 보고 가세.']],
    reward: { gold: 80, lise: 1, flag: 'c1_village' } },
  c1_b1: { wave: 2, kind: 'talk',
    intro: [['narr', '안개 너머에서 보랏빛 망토가 스쳐 지나갔다.'], ['hunter', '…적월이 깨어났군. 아이야, 그 돌은 네 것이 아니다.'], ['lise', '누, 누구예요?!']] },
  // ---- 2장 ----
  c2_s1: { wave: 1, kind: 'talk',
    intro: [['odelia', '지켜보겠다고 했죠. 정말 교단과 무관하다면, 싸우는 모습으로 보여 주세요.'], ['lise', '보세요, 우리가 얼마나 열심히 싸우는지!']] },
  c2_s2: { wave: 2, kind: 'ritual', time: 30000,
    intro: [['odelia', '저 제단… 흑월 교단의 표식입니다! 의식이 끝나기 전에 부숴야 해요!'], ['lise', '보랏빛 연기가 올라가요!']],
    ok: [['odelia', '표식이 깨졌습니다. 이 도시 안에 교단이 숨어 있다는 증거군요.']],
    fail: [['odelia', '의식이 끝났어요… 놈들이 흑월빛에 취했습니다! 조심하세요!']],
    reward: { gold: 60, flag: 'c2_mark' } },
  c2_a1: { wave: 2, kind: 'rescue', n: 2, who: '선원', time: 40000,
    intro: [['x:선원', '해적 놈들이 우릴 노예로 팔겠대요! 꺼내 주세요!']],
    ok: [['x:선원', '고맙습니다! 모그 선장 놈은 갈고리로 사람을 끌어당겨요. 끌려갈 때 굴러서 피하세요!']],
    fail: [['x:해적', '킬킬, 화물은 이미 배에 실었다!']],
    reward: { gold: 90, flag: 'c2_sailors' } },
  c2_b1: { wave: 2, kind: 'talk',
    intro: [['x:길드원', '상단 놈들이다! 달사냥꾼 나리께 알려!'], ['hero', '…역시 길드가 교단이랑 붙어먹었군.', { onlyFor: ['rogue'] }], ['odelia', '들었습니까? 길드가 교단과 내통하고 있어요.', { skipFor: ['paladin'] }]] },
  // ---- 3장 ----
  c3_s2: { wave: 2, kind: 'ritual', time: 30000,
    intro: [['tabel', '교단 놈들이 미라를 깨우는 의식을 하고 있다! 제단을 부숴!'], ['lise', '바닥에서 붕대 감은 손들이…!']],
    ok: [['tabel', '좋아, 미라들이 다시 잠들었다.']],
    fail: [['lise', '의식이 끝났어요! 미라들이 보랏빛으로 빛나요!']],
    reward: { gold: 70, flag: 'c3_ritual' } },
  c3_a1: { wave: 2, kind: 'talk',
    intro: [['narr', '묘실 벽의 그림이 일렁이더니, 300년 전의 목소리가 새어 나왔다.'], ['x:옛 목소리', '"오르벡스, 봉인에 다른 길은 없어. 내가 갈게."'], ['lise', '방금… 누구 목소리예요? 제 월석이 떨려요.']] },
  c3_b1: { wave: 2, kind: 'rescue', n: 2, who: '교단 포로', time: 40000,
    intro: [['x:포로', '교단이 우릴 달 찾는 데 쓰려고 잡아 왔어요! 도와주세요!'], ['lise', '이 사람들도 월석 냄새를 맡는다는 이유로…!']],
    ok: [['x:포로', '협곡 끝 감옥에 엘프 하나가 더 갇혀 있어요. 은빛 활을 쓰던 사냥꾼이요.']],
    fail: [['lise', '…끌려가 버렸어요.']],
    reward: { gold: 50, lise: 1, flag: 'c3_prisoners' } },
  // ---- 4장 ----
  c4_s2: { wave: 2, kind: 'rescue', n: 2, who: '드워프 광부', time: 40000,
    intro: [['x:드워프', '얼음 감옥에 갇혔다! 망치로 좀 깨 줘!'], ['tabel', '드워프들이 아직 이 산에 있었군!']],
    ok: [['x:드워프', '고맙네! 거인 놈은 얼음 갑옷을 입고 있어. 불이나 묵직한 걸로 깨게!']],
    fail: [['tabel', '…얼음이 굳어 버렸다. 미안하네, 친구들.']],
    reward: { gold: 80, flag: 'c4_miners' } },
  c4_a1: { wave: 2, kind: 'ritual', time: 30000,
    intro: [['lise', '동굴 안쪽에 보랏빛 제단이…! 얼음 정령들이 저기서 나와요!']],
    ok: [['lise', '제단이 깨지니까 정령들이 잠잠해졌어요.']],
    fail: [['tabel', '의식이 끝났다! 놈들이 미쳐 날뛴다!']],
    reward: { gold: 80, flag: 'c4_ritual' } },
  c4_b1: { wave: 2, kind: 'talk',
    intro: [['tabel', '…이 복도, 그대로구나. 엘라와 함께 월석 상자를 나르던 길이다.'], ['lise', '엘라… 할머니 이름이잖아요? 아저씨, 할머니를 아세요?'], ['tabel', '…대장간에 가면 이야기하마.']] },
  // ---- 5장 ----
  c5_s2: { wave: 2, kind: 'ritual', time: 28000,
    intro: [['hunter', '서고의 책들아, 흑월을 노래하라.'], ['lise', '그 목소리예요! 저 제단에서 마력이 흘러나와요!']],
    ok: [['hunter', '…제법이군. 스승님 앞에서 보자.']],
    fail: [['hunter', '늦었다. 탑 전체가 흑월을 노래한다.']],
    reward: { gold: 100, flag: 'c5_ritual' } },
  c5_a1: { wave: 2, kind: 'rescue', n: 2, who: '견습 마법사', time: 40000,
    intro: [['x:견습 마법사', '교단이 우리를 톱니 우리에 가뒀어요! 오르벡스 님이 잡혀 계세요!']],
    ok: [['x:견습 마법사', '골렘 칠호는 광선을 쏜 뒤 몸이 열려요. 그때가 기회예요!']],
    fail: [['lise', '우리가 톱니에 끌려 들어갔어요…']],
    reward: { gold: 100, lise: 1, flag: 'c5_apprentices' } },
  c5_b1: { wave: 2, kind: 'talk',
    intro: [['seril', '하피들이 은빛 깃털을 물어 나르고 있어. 둥지가 가까워.', { if: 'seril_freed' }], ['lise', '바람이 저를 부르는 것 같아요.']] },
  // ---- 6장 ----
  c6_s1: { wave: 1, kind: 'talk',
    intro: [['kael', '여기까지 왔나. 흑월룡의 숨소리가 들리지? 곧 세상이 새로 쓰인다.'], ['lise', '카엘… 당신도 누군가에게 속고 있는 거 아니에요?'], ['kael', '……닥쳐라.']] },
  c6_s2: { wave: 2, kind: 'ritual', time: 26000,
    intro: [['orvex', '저 제단이 흑월룡에게 힘을 보낸다! 부숴라!', { if: 'refused' }], ['lise', '하늘이 뒤집혀요! 저 제단부터!']],
    ok: [['lise', '흑월의 맥박이 약해졌어요!']],
    fail: [['kael', '하하! 흑월룡이 더 강해졌다!']],
    reward: { gold: 120, flag: 'c6_ritual' } },
  c6_a1: { wave: 2, kind: 'rescue', n: 2, who: '거울 속 사람', time: 38000,
    intro: [['x:거울 속 목소리', '여기서 꺼내 줘… 300년 동안 거울에 갇혀 있었어…'], ['lise', '심연에 삼켜진 사람들이에요!']],
    ok: [['x:거울 속 목소리', '고마워… 이제 쉴 수 있어. 그림자를 조심해. 그림자가 모든 걸 속삭였어.']],
    fail: [['lise', '…거울이 다시 닫혔어요.']],
    reward: { gold: 120, lise: 1, flag: 'c6_mirror' } },
  c6_b1: { wave: 2, kind: 'talk',
    intro: [['narr', '무덤 사이로 오래된 목소리들이 웅성거린다.'], ['x:옛 영웅', '세아의 아이야… 이번에는, 다른 끝을 보여 다오.'], ['lise', '…네. 꼭요.']] },
};

const StageEvents = {
  start(sc) {
    sc.barkQ = []; sc.barkUi = null; sc.barkT = 0; sc.evRage = false;
    const d = sc.mode === 'story' && STAGE_EVENTS[sc.cfg.stage];
    sc.sev = d ? { d, state: 'wait', t: 0, got: 0, props: [] } : null;
  },
  who(w) {
    const hk = (Save.data && Save.data.hero) || 'warrior';
    const AS = { odelia: 'paladin', seril: 'ranger' };
    if (AS[w] === hk) w = 'hero';
    if (w === 'hero') return { ko: DB.heroes[hk].name, portrait: 'portrait/' + hk };
    if (w.startsWith('x:')) return { ko: w.slice(2) };
    return CAST[w] || { ko: w };
  },
  // 말풍선 줄 넣기. lines: [[who, text, cond?], ...]
  barks(sc, lines) {
    for (const [w, t, cond] of lines || []) {
      if (cond && (!talkLineOk(cond) || (cond.skipFor && cond.skipFor.includes(sc.save.hero)))) continue;
      sc.barkQ.push({ w, t });
    }
  },
  showBark(sc, b) {
    if (sc.barkUi) sc.barkUi.destroy();
    const sp = this.who(b.w);
    const c = sc.add.container(0, 0).setDepth(5200).setScrollFactor(0);
    const x0 = W / 2 - 420, y0 = 132, w = 840, h = 74;
    const g = sc.add.graphics();
    g.fillStyle(0x140c08, 0.86).fillRoundedRect(x0, y0, w, h, 14).lineStyle(2, b.w === 'hunter' || b.w === 'kael' ? 0xa070e0 : 0xe0b45a, 0.9).strokeRoundedRect(x0, y0, w, h, 14);
    c.add(g);
    const tx = x0 + 22;
    const narr = b.w === 'narr';
    if (!narr && sp.ko) c.add(UI.text(sc, tx, y0 + 8, sp.ko, 18, sp.col || '#ffd38a', { bold: true, st: 4 }));
    const body = UI.text(sc, tx, narr || !sp.ko ? y0 + 22 : y0 + 34, '', narr ? 19 : 20, narr ? '#d8ccb8' : '#fff8ea', { wrap: w - (tx - x0) - 24, st: 3 });
    if (narr) body.setFontStyle('italic');
    c.add(body);
    c.setAlpha(0); sc.tweens.add({ targets: c, alpha: 1, duration: 160 });
    sc.barkUi = c; sc.barkT = Math.max(2400, 900 + b.t.length * 70);
    let i = 0;
    const ev = sc.time.addEvent({ delay: 24, loop: true, callback: () => { i += 2; body.setText(b.t.slice(0, i)); if (i >= b.t.length) ev.remove(); } });
  },
  onWave(sc, n) {
    const e = sc.sev; if (!e || e.state !== 'wait' || n !== e.d.wave) return;
    const d = e.d;
    this.barks(sc, d.intro);
    if (d.kind === 'talk') { e.state = 'done'; return; }
    e.state = 'run'; e.t = d.time;
    const w = sc.lock || { l: sc.hero.x - 400, r: sc.hero.x + 600 };
    if (d.kind === 'rescue') {
      for (let i = 0; i < d.n; i++) {
        const x = Math.round(w.l + 260 + (w.r - w.l - 520) * (d.n === 1 ? 0.5 : i / (d.n - 1)));
        const y = FLOOR_TOP + 40 + (i % 2) * 120;
        this.addEvProp(sc, x, y, 'captive');
      }
    } else if (d.kind === 'ritual') {
      this.addEvProp(sc, Math.round(w.r - 240), FLOOR_TOP + 60, 'altar');
    }
    this.drawGoal(sc);
  },
  addEvProp(sc, x, y, ev) {
    const before = sc.props.length;
    sc.addProp(x, y, 'crate');
    const p = sc.props[before];
    p.ev = ev; p.hp = ev === 'altar' ? 6 : 3;
    const key = ev === 'altar' ? 'props/ritual_altar' : 'props/captive_cage';
    if (sc.textures.exists(key)) p.img.setTexture(key).setScale(120 / sc.textures.get(key).getSourceImage().height);
    else p.img.setTint(ev === 'altar' ? 0x8a50c0 : 0xd8b070);
    p.label = UI.text(sc, x, y - p.img.displayHeight - 14, ev === 'altar' ? '흑월 의식' : '구출!', 18, ev === 'altar' ? '#d0a0ff' : '#ffe27a', { bold: true, st: 5 }).setOrigin(0.5, 1).setDepth(1002 + y);
    sc.tweens.add({ targets: p.label, y: p.label.y - 8, yoyo: true, repeat: -1, duration: 500 });
    if (ev === 'altar') {
      p.glow = sc.add.ellipse(x, y, 150, 46, 0x9050ff, 0.35).setBlendMode(Phaser.BlendModes.ADD).setDepth(999);
      sc.tweens.add({ targets: p.glow, alpha: { from: 0.15, to: 0.5 }, yoyo: true, repeat: -1, duration: 420 });
    }
    this.sev(sc).props.push(p);
  },
  sev(sc) { return sc.sev; },
  // 이벤트 물체가 부서졌다 (hitProp에서)
  onProp(sc, p) {
    const e = sc.sev;
    if (p.label) p.label.destroy(); if (p.glow) p.glow.destroy();
    if (!e || e.state !== 'run') return;
    if (p.ev === 'captive') {
      e.got++;
      sc.floatText(p.x, p.y - 140, `${e.d.who} 구출! ${e.got}/${e.d.n}`, '#ffe27a', 28);
      SFX.ui('chest_open');
      sc.fx('levelup_burst', p.x, p.y - 60, { s: 0.4, dur: 600, tint: 0xffe080, depth: p.y + 1001 });
      if (e.got >= e.d.n) this.succeed(sc);
    } else if (p.ev === 'altar') {
      sc.cameras.main.flash(180, 200, 160, 255);
      sc.fx('shadow_smoke', p.x, p.y - 70, { s: 0.7, dur: 700, depth: p.y + 1001, tint: 0x9050c0 });
      this.succeed(sc);
    }
    this.drawGoal(sc);
  },
  succeed(sc) {
    const e = sc.sev, d = e.d, s = sc.save, r = d.reward || {};
    e.state = 'ok';
    this.barks(sc, d.ok);
    if (r.gold) sc.gold += r.gold;
    if (r.lise) s.lise = (s.lise || 0) + r.lise;
    if (r.flag) s.flags[r.flag] = true;
    const h = sc.hero;
    sc.floatText(h.x, h.y - 300, '목표 달성!' + (r.lise ? '  리세의 신뢰 +' + r.lise : ''), '#9ae07a', 32);
    SFX.ui('ui_equip');
    this.drawGoal(sc);
  },
  fail(sc) {
    const e = sc.sev, d = e.d;
    e.state = 'fail';
    this.barks(sc, d.fail);
    for (const p of e.props) if (p.hp > 0) {
      // 시간이 지나면 갇힌 사람은 끌려가고, 제단은 의식을 마친다
      p.hp = 0; if (p.label) p.label.destroy();
      sc.tweens.add({ targets: [p.img, p.sh], alpha: 0, duration: 500, onComplete: () => { p.img.destroy(); p.sh.destroy(); if (p.glow) p.glow.destroy(); } });
    }
    if (d.kind === 'ritual') {
      sc.evRage = true;
      sc.cameras.main.flash(240, 120, 40, 200);
      for (const m of sc.monsters) if (!m.dead && m.rig) m.rig.setTintAll(0xd8a0ff);
      sc.floatText(sc.hero.x, sc.hero.y - 300, '흑월의 축복 — 적의 피해 +25%', '#d0a0ff', 30);
    } else sc.floatText(sc.hero.x, sc.hero.y - 300, '구출 실패', '#ff9a8a', 30);
    if (d.failFlag) sc.save.flags[d.failFlag] = true;
    this.drawGoal(sc);
  },
  drawGoal(sc) {
    if (sc.goalUi) { sc.goalUi.destroy(); sc.goalUi = null; }
    const e = sc.sev; if (!e || e.state !== 'run') return;
    const d = e.d;
    const txt = d.kind === 'rescue' ? `목표 · ${d.who} 구출 ${e.got}/${d.n}` : '목표 · 흑월 의식 제단 부수기';
    const c = sc.add.container(0, 0).setDepth(5150).setScrollFactor(0);
    const t = UI.text(sc, W / 2, 112, '', 20, '#ffe7a8', { bold: true, st: 5 }).setOrigin(0.5);
    c.add(t);
    c.txt = txt; c.t = t;
    sc.goalUi = c;
  },
  update(sc, dt) {
    // 말풍선
    if (sc.barkUi) { sc.barkT -= dt; if (sc.barkT <= 0) { const u = sc.barkUi; sc.barkUi = null; sc.tweens.add({ targets: u, alpha: 0, duration: 200, onComplete: () => u.destroy() }); } }
    if (!sc.barkUi && sc.barkQ && sc.barkQ.length && !sc.won && !sc.lost) this.showBark(sc, sc.barkQ.shift());
    const e = sc.sev; if (!e || e.state !== 'run' || sc.won || sc.lost) return;
    e.t -= dt;
    if (sc.goalUi) sc.goalUi.t.setText(`${sc.goalUi.txt}  ·  ${Math.max(0, Math.ceil(e.t / 1000))}초`).setColor(e.t < 10000 ? '#ff9a8a' : '#ffe7a8');
    if (e.t <= 0) this.fail(sc);
  },
  onClear(sc) {
    const e = sc.sev;
    if (e && e.state === 'run') this.fail(sc);
    if (sc.barkUi) { sc.barkUi.destroy(); sc.barkUi = null; }
    sc.barkQ = [];
  },
};
