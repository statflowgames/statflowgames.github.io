// 🆕 2026-11-22 직업별 조작법(기술표) — 직업 선택·캠프 직업 바꾸기·전투 일시정지에서 연다
//   왼쪽: 기술 목록 / 오른쪽: 그 직업 캐릭터가 동작을 직접 해 보인다 / 아래: 지금 스킬 2칸·각성기
//   입력 표시는 기기에 맞춘다 (휴대폰: 조이스틱·버튼, PC: 키)
const MOVE_INPUT = {
  combo: { touch: '⚔ 공격 버튼 연타', pc: 'J 연타' },
  up: { touch: '조이스틱 ↑ + ⚔', pc: '↑(W) + J' },
  down: { touch: '조이스틱 ↓ + ⚔', pc: '↓(S) + J' },
  dash: { touch: '달리다가 ⚔ (0.6초 넘게 달리기)', pc: '달리다가 J (0.6초 넘게 달리기)' },
  jump: { touch: '점프 버튼 → 공중에서 ⚔', pc: 'K → 공중에서 J' },
  guard: { touch: '🛡 가드 버튼 누르고 있기', pc: 'I 누르고 있기' },
  roll: { touch: '회피 버튼', pc: 'L' },
  skill: { touch: '스킬 1·2 버튼', pc: 'U · H' },
  awaken: { touch: '각성 버튼 (게이지 가득)', pc: 'O (게이지 가득)' },
};
// 직업별 기술 이름·설명 (동작은 직업의 공격 표 classes.js 를 그대로 재생)
const MOVES = {
  warrior: {
    trait: '방패 전사 · 막고 버티며 반격한다. 맞는 순간 가드하면 저스트 가드 반격',
    combo: ['검 4연타', '마지막 한 방은 크게 날려 보낸다'], up: ['올려베기', '적을 공중으로 띄운다'], down: ['내려찍기', '바닥을 내리쳐 주변을 흔든다'],
    dash: ['방패 돌진', '달려가며 들이받는다'], jump: ['공중 베기', '뛰어올라 아래로 벤다'],
  },
  paladin: {
    trait: '성기사 · 체력이 많고 신성 공격. 언데드·악마에게 강하다',
    combo: ['망치 4연타', '묵직한 신성 망치질'], up: ['빛 올려치기', '빛과 함께 적을 띄운다'], down: ['성역', '발밑에 빛의 성역을 펼친다'],
    dash: ['돌진 내려치기', '달려가며 망치를 내리친다'], jump: ['공중 망치', '뛰어올라 내리친다'],
  },
  mage: {
    trait: '원거리 마법사 · 거리를 두고 싸운다. 얼음을 3번 맞히면 빙결',
    combo: ['원소 구슬', '불·얼음·번개 구슬을 쏘고, 마지막은 폭발'], up: ['얼음 기둥', '앞에 얼음 기둥을 솟구치게 한다'], down: ['불바닥', '바닥에 불을 깔아 지진다'],
    dash: ['순간이동', '앞으로 순간이동한다'], jump: ['낙하 불구슬', '공중에서 아래로 불구슬을 쏜다'],
  },
  rogue: {
    trait: '그림자 도적 · 빠른 쌍단검. 적의 등 뒤에서 치면 치명타',
    combo: ['쌍단검 연타', '빠르게 베어 들어간다'], up: ['회전 띄우기', '돌며 적을 띄운다'], down: ['단검 비', '앞쪽에 단검을 흩뿌린다'],
    dash: ['그림자 돌진', '그림자처럼 파고들며 벤다'], jump: ['공중 찌르기', '뛰어올라 찌른다'],
  },
  ranger: {
    trait: '달빛 궁수 · 원거리. 멀리 있는 적일수록 치명타가 잘 난다',
    combo: ['3연사', '화살 3발, 마지막은 세 갈래'], up: ['일제 사격', '하늘로 쏜 화살이 쏟아진다'], down: ['발차기', '가까운 적을 차서 밀어낸다'],
    dash: ['공중제비', '뒤로 넘으며 차고 거리를 벌린다'], jump: ['낙하 사격', '공중에서 아래로 쏜다'],
  },
  hexblade: {
    trait: '흑월술사 · 느리지만 강한 대검. 체력이 낮을수록 더 강해진다',
    combo: ['대검 4연타', '크고 묵직하게 휘두른다'], up: ['올려베기', '대검으로 적을 띄운다'], down: ['공허 내려찍기', '흑월의 힘으로 바닥을 찢는다'],
    dash: ['돌진 베기', '달려가며 베어 넘긴다'], jump: ['공중 대검', '뛰어올라 내려벤다'],
  },
};
// 🆕 그 직업으로 처음 들어간 스테이지에서 한 번 보여 주는 대표 기술 안내
const HERO_TIP = {
  warrior: '하르반: 맞는 순간 가드하면 저스트 가드! 반격하고 각성 게이지가 크게 차요',
  paladin: '오델리아: ↓+공격으로 성역을 펼쳐요. 언데드·악마에게 특히 강해요',
  mage: '미라엘: 거리를 두고 쏘세요. 얼음 구슬을 3번 맞히면 적이 얼어요',
  rogue: '키르: 적의 등 뒤에서 공격하면 치명타! 달리다 공격하면 그림자 돌진',
  ranger: '세릴: 멀리서 쏠수록 치명타가 잘 나요. 달리다 공격하면 공중제비로 빠져요',
  hexblade: '녹타: 체력이 낮을수록 더 강해져요. ↓+공격으로 공허 내려찍기',
};
const MoveList = {
  touchDevice() { try { return ('ontouchstart' in window) || navigator.maxTouchPoints > 0; } catch (e) { return false; } },
  open(scene, key, o = {}) {
    const keys = [...(typeof Assets !== 'undefined' ? Assets.groups([key]) : []), ...(typeof CuteHeroes !== 'undefined' ? CuteHeroes.keys([key]) : [])];
    const go = () => this.build(scene, key, o);
    if (typeof Assets !== 'undefined' && keys.length) Assets.ensure(scene, keys, go); else go();
  },
  build(scene, key, o) {
    const D = o.depth || 9600, c = scene.add.container(0, 0).setDepth(D).setScrollFactor(0);
    const info = MOVES[key] || MOVES.warrior, name = DB.heroes[key].name;
    let pc = o.pc !== undefined ? o.pc : !this.touchDevice();
    c.add(UI.blocker(scene, 0.9).setScrollFactor(0));
    c.add(UI.text(scene, W / 2, 46, `${name} 조작법`, 38, '#ffe7a8', { serif: true, st: 7 }).setOrigin(0.5));
    c.add(UI.text(scene, W / 2, 88, info.trait, 18, '#d8c8b0').setOrigin(0.5));
    // 시연 무대
    const SX = 860, SY = 450;
    const stage = scene.add.graphics();
    stage.fillStyle(0x140c08, 0.9).fillRoundedRect(560, 120, 620, 420, 16).lineStyle(2, 0x7a5a30).strokeRoundedRect(560, 120, 620, 420, 16);
    stage.fillStyle(0x2a1c10, 1).fillEllipse(SX, SY + 6, 360, 50);
    c.add(stage);
    const cap = UI.text(scene, 870, 150, '', 26, '#ffe7a8', { bold: true }).setOrigin(0.5, 0); c.add(cap);
    const capIn = UI.text(scene, 870, 188, '', 20, '#9ae0ff', { bold: true }).setOrigin(0.5, 0); c.add(capIn);
    const capD = UI.text(scene, 870, 508, '', 18, '#d8c8b0', { align: 'center', wrap: 560 }).setOrigin(0.5, 0); c.add(capD);
    // 시연 캐릭터: 동료와 같은 방식으로 만든다
    let actor = null;
    try {
      actor = new Actor(scene, key, SX, SY, { hero: true });
      actor.key = key; actor.side = 'ally'; actor.face = 1;
      if (typeof CuteHeroes !== 'undefined') CuteHeroes.apply(actor);
      actor.rig.c.setScrollFactor(0); actor.shadow.setScrollFactor(0);
      actor.play('idle');
    } catch (e) { console.warn('movelist demo', e); actor = null; }
    const cls = classOf(key);
    const list = [
      { id: 'combo', seq: ['a1', 'a2', 'a3', 'a4'] }, { id: 'up', seq: ['up'] }, { id: 'down', seq: ['down'] },
      { id: 'dash', seq: ['dash'], run: true }, { id: 'jump', seq: ['jump'], air: true },
      { id: 'guard', clip: 'w_guard', name: ['가드', '버튼을 누르고 있으면 막는다. 맞는 순간 누르면 저스트 가드(반격 + 각성 게이지)'] },
      { id: 'roll', clip: 'w_roll', name: ['구르기', '구르는 동안은 맞지 않는다'], run: true },
    ];
    const S = { cur: null, t: 0, i: 0, wait: 0, x: SX };
    const btns = [];
    const pick = (m) => {
      S.cur = m; S.i = 0; S.t = 0; S.wait = 0; S.x = SX - (m.run ? 120 : 0);
      const nm = m.name || info[m.id];
      cap.setText(nm[0]); capIn.setText((pc ? MOVE_INPUT[m.id].pc : MOVE_INPUT[m.id].touch)); capD.setText(nm[1]);
      btns.forEach(b => b.g.clear().fillStyle(b.m === m ? 0x5a3a14 : 0x1a1008, 1).fillRoundedRect(60, b.y - 24, 440, 48, 10).lineStyle(2, b.m === m ? 0xffd34d : 0x5a4030).strokeRoundedRect(60, b.y - 24, 440, 48, 10));
      startStep();
    };
    const startStep = () => {
      const m = S.cur; if (!actor || !m) return;
      if (m.clip) { actor.replay(m.clip, 40); S.dur = m.id === 'guard' ? 900 : 520; return; }
      const a = cls.atk[m.seq[S.i]]; if (!a) { S.dur = 300; return; }
      actor.replay(a.clip, 40); S.dur = a.dur || 400;
    };
    list.forEach((m, i) => {
      const y = 150 + i * 56, g = scene.add.graphics(), nm = m.name || info[m.id];
      const t1 = UI.text(scene, 80, y, nm[0], 21, '#fff4d8', { bold: true }).setOrigin(0, 0.5);
      const t2 = UI.text(scene, 488, y, '', 15, '#9ae0ff').setOrigin(1, 0.5);
      const z = scene.add.zone(60, y - 24, 440, 48).setOrigin(0).setInteractive({ useHandCursor: true }).on('pointerup', () => { SFX.go && SFX.go(); pick(m); });
      c.add([g, t1, t2, z]); btns.push({ g, y, m, t2 });
    });
    const relabel = () => btns.forEach(b => b.t2.setText(pc ? MOVE_INPUT[b.m.id].pc : MOVE_INPUT[b.m.id].touch.replace(' (0.6초 넘게 달리기)', '')));
    relabel();
    // 스킬·각성
    const s = Save.data, L = DB.skills[key].list;
    const act = s && s.hero === key ? (s.active || []).filter(x => x !== null && x !== undefined).map(i => L[i].name) : [];
    c.add(UI.text(scene, 80, 560, `스킬 2칸 (${pc ? MOVE_INPUT.skill.pc : MOVE_INPUT.skill.touch}): ${act.length ? act.join(' · ') : '마법 천막에서 배워 장착해요'}`, 18, '#d8c8b0', { wrap: 440 }));
    c.add(UI.text(scene, 80, 612, `각성기 (${pc ? MOVE_INPUT.awaken.pc : MOVE_INPUT.awaken.touch}): 「${L[15].name}」`, 18, '#ffd34d', { wrap: 440 }));
    c.add(UI.text(scene, 80, 664, `구르기: ${pc ? 'L' : '회피 버튼'} · 점프: ${pc ? 'K' : '점프 버튼'} · 회복약: ${pc ? '1~4' : '화면 위 아이콘'}`, 16, '#a89a88'));
    // 휴대폰 ↔ PC 표시 바꾸기: 창을 다시 연다
    c.add(UI.button(scene, 1010, 600, pc ? '휴대폰 버튼으로 보기' : 'PC 키로 보기', () => { const cur = S.cur && S.cur.id; close(true); this.build(scene, key, { ...o, pc: !pc, start: cur }); }, { w: 260, h: 46, size: 18, col: 0x2a3a5a }));
    c.add(UI.button(scene, 1010, 662, '닫기', () => close(), { w: 260, h: 50, size: 22, col: 0x3a2a1a }));
    c.each(x => x.setScrollFactor && x.setScrollFactor(0));
    // 매 프레임: 시연 동작 진행 (전투가 멈춰 있어도 돌아간다)
    const tick = (time, dt) => {
      if (!actor) return;
      dt = Math.min(dt || 16, 40);
      const m = S.cur;
      if (m) {
        S.t += dt;
        if (S.wait > 0) { S.wait -= dt; if (S.wait <= 0) { S.i = 0; S.t = 0; S.x = SX - (m.run ? 120 : 0); actor.z = 0; startStep(); } }
        else {
          if (m.run) S.x = Math.min(SX + 120, S.x + dt * 0.45);
          if (m.air) actor.z = Math.max(0, Math.sin(Math.min(1, S.t / Math.max(1, S.dur)) * Math.PI) * 120);
          if (S.t >= S.dur) {
            S.t = 0; S.i++;
            if (m.seq && S.i < m.seq.length) startStep();
            else { S.wait = 650; actor.z = 0; actor.play('idle', 120); }
          }
        }
        actor.x = S.x;
      }
      actor.draw(dt, false);
      actor.rig.c.setDepth(D + 2); actor.shadow.setDepth(D + 1);
    };
    scene.events.on('update', tick);
    const close = (keep) => {
      scene.events.off('update', tick);
      if (actor) actor.destroy();
      c.destroy();
      if (!keep && o.onClose) o.onClose();
    };
    pick(list.find(m => m.id === o.start) || list[0]);
    return { close };
  },
};
