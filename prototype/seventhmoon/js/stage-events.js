// 🆕 스테이지 안 이야기: 싸우는 도중 짧은 말풍선(전투를 멈추지 않음) + 목표.
//   kind 'rescue' : 우리에 갇힌 사람 n명을 제한 시간 안에 부숴 구출
//   kind 'ritual' : 흑월 의식 제단을 제한 시간 안에 부숨 (못 부수면 적이 흑월빛에 취해 피해 +25%)
//   kind 'talk'   : 대화만 (wave 번째 잠금 전투가 시작될 때)
// 말하는 사람: STORY의 CAST 키, 'hero', 또는 'x:이름'(그 자리 인물). 줄 조건(if/ifNot/onlyFor)은 대본과 같다.
// 연결: Game.create(start) · startWave(onWave) · hitProp(onProp) · update(update) · stageClear(onClear) · resolveHeroHit(rage)
// 🆕 구출 대상 → 그림 종류 (captive/<종류>_trapped.png · _free.png, 의뢰서 docs/art-brief-captives.md)
const CAPTIVE_TYPE = {
  '사냥꾼': 'hunter', '나무꾼': 'hunter', '사냥꾼 가족': 'child', '정령 아이': 'spirit',
  '마을 사람': 'villager', '교단 포로': 'villager', '포로': 'villager', '화가': 'villager',
  '선원': 'sailor', '조개잡이': 'sailor', '잠수부': 'sailor',
  '드워프 광부': 'dwarf', '드워프': 'dwarf', '대장장이': 'dwarf',
  '견습 마법사': 'apprentice', '유목민': 'nomad', '대상': 'nomad',
  '거울 속 사람': 'mirror', '거울 속 영웅': 'mirror',
};
const STAGE_EVENTS = {
  // ---- 1장 ----
  c1_s2: { wave: 2, kind: 'rescue', n: 2, who: '사냥꾼', time: 40000,
    intro: [['lise', '저기! 우리 안에 사람이 갇혀 있어요!'], ['tabel', '그롤린 놈들, 사람을 잡아 어디로 끌고 가는 거지? 저 나무 우리를 부숴!']],
    ok: [['x:사냥꾼', '고맙소! 놈들은 \'달을 가진 아이\'를 찾고 있었소. 보랏빛 망토의 사내가 시켰다더군.'], ['lise', '달을 가진 아이…?']],
    fail: [['lise', '…늦었어요. 우리 안이 텅 비었어요.']],
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
    intro: [['narr', '묘실 벽의 그림이 일렁이더니, 300년 전의 목소리가 새어 나왔다.'], ['x:옛 목소리', '"오르벡스, 봉인에 다른 길은 없어. 내가 갈게."'], ['lise', '방금… 누구 목소리예요? 제 목걸이가 떨려요.']] },
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
    fail: [['lise', '견습생들이 톱니에 끌려 들어갔어요…']],
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
    sc.barkQ = []; sc.barkUi = null; sc.barkT = 0; sc.evRage = false; sc.cine = null;
    const d = sc.mode === 'story' && STAGE_EVENTS[sc.cfg.stage];
    sc.sev = d ? { d, state: 'wait', t: 0, got: 0, props: [] } : null;
  },
  who(w) {
    const hk = (Save.data && Save.data.hero) || 'warrior';
    const AS = { odelia: 'paladin', seril: 'ranger' };
    if (AS[w] === hk) w = 'hero';
    if (w === 'hero') return { ko: DB.heroes[hk].name, portrait: 'portrait/' + hk };
    if (w.startsWith('x:')) return { ko: w.slice(2) };
    const s = Save.data;
    if (w === 'lise' && s && s.lastEnding === 'end_sacrifice' && s.ch >= 7 && CAST.lise_stone) return CAST.lise_stone;
    return CAST[w] || { ko: w };
  },
  // ✏️ 2026-11-22 전투 중 대사 = 말풍선
  //   이야기 대사(웨이브 시작 intro, 처음 볼 때): 몬스터가 나오기 전에 멈추고 말풍선으로 (누르면 넘김, 가만히 있으면 자동)
  //   반응 대사(성공·실패, 다시 하는 스테이지의 intro): 멈추지 않고 작은 말풍선
  //   주인공 → 머리 위 / 갇힌 사람 → 우리 위 / 전투 화면에 없는 인물 → 화면 가장자리 얼굴 + 말풍선 / 지문 → 위쪽 띠
  // 줄 거르기 + 말풍선에 맞게 긴 줄 나누기
  lines(sc, raw) {
    const out = [];
    for (const [w, t, cond] of raw || []) {
      if (cond && (!talkLineOk(cond) || (cond.skipFor && cond.skipFor.includes(sc.save.hero)))) continue;
      for (const part of this.splitText(t)) out.push({ w, t: part });
    }
    return out;
  },
  splitText(t, max = 38) {
    if (t.length <= max + 6) return [t];
    const sents = t.split(/(?<=[.!?…」])\s+/);
    const out = []; let cur = '';
    for (const s of sents) {
      if (!cur) cur = s;
      else if ((cur + ' ' + s).length <= max) cur += ' ' + s;
      else { out.push(cur); cur = s; }
    }
    if (cur) out.push(cur);
    // 한 문장이 너무 길면 가운데 쯤의 띄어쓰기에서 자른다
    return out.flatMap(s => {
      if (s.length <= max + 10) return [s];
      const mid = Math.floor(s.length / 2); let k = s.lastIndexOf(' ', mid); if (k < 8) k = s.indexOf(' ', mid);
      return k > 0 ? [s.slice(0, k), s.slice(k + 1)] : [s];
    });
  },
  // 반응 대사(멈추지 않음)
  barks(sc, raw) { sc.barkQ.push(...this.lines(sc, raw)); },
  // 이 스테이지 이벤트에 나오는 얼굴 그림 (미리 불러 두기)
  assetKeys(stage) {
    const d = STAGE_EVENTS[stage]; if (!d) return [];
    const out = new Set();
    for (const part of ['intro', 'ok', 'fail']) for (const [w] of d[part] || []) {
      const sp = CAST[w]; if (sp && sp.portrait) out.add(sp.portrait);
      if (w === 'lise_stone' || w === 'lise') out.add('portrait/lise');
      if (w === 'odelia') out.add('portrait/paladin'); if (w === 'seril') out.add('portrait/ranger');
    }
    return [...out].filter(k => typeof MAN === 'undefined' || MAN[k]);
  },
  // 말하는 사람이 어디에 있나
  anchor(sc, b) {
    const hk = sc.save.hero, AS = { odelia: 'paladin', seril: 'ranger' };
    if (b.w === 'narr') return { kind: 'narr' };
    if (b.w === 'hero' || AS[b.w] === hk) return { kind: 'hero' };
    if (b.w.startsWith('x:') && sc.sev) {
      const p = sc.sev.props.find(q => q.ev === 'captive' && q.hp > 0 && q.img && q.img.active);
      if (p && sc.sev.d.kind === 'rescue') return { kind: 'world', x: p.x, y: p.y - (p.img.displayHeight || 140) - 18 };
    }
    const right = ['hunter', 'kael', 'morgan', 'orvex', 'void'].includes(b.w) || (b.w.startsWith('x:') && !(sc.sev && sc.sev.d.kind === 'rescue' && sc.sev.d.who === b.w.slice(2)));
    return { kind: 'edge', side: right ? 'r' : 'l' };
  },
  // 말풍선 하나 만들기. big = 멈춘 장면(조금 크게)
  bubble(sc, b, big) {
    const sp = this.who(b.w), at = this.anchor(sc, b);
    const fs = big ? 21 : 18, wrap = big ? 380 : 320, pad = 14;
    const c = sc.add.container(0, 0).setDepth(5250);
    if (at.kind === 'narr') {
      c.setScrollFactor(0);
      // 멈춘 장면에서는 아래쪽 검은 띠 안에, 아니면 위쪽에 옅은 띠
      const y = big ? H - 36 : 150, cx = big ? 560 : W / 2;
      const body = UI.text(sc, cx, y, '', big ? 20 : 18, '#efe3cc', { wrap: big ? 640 : W - 260, st: big ? 0 : 4, align: 'center' }).setOrigin(0.5).setFontStyle('italic');
      if (!big) { const bg = sc.add.graphics(); bg.fillStyle(0x0c0806, 0.6).fillRoundedRect(W / 2 - 420, y - 24, 840, 48, 22); c.add(bg); }
      c.add(body); c.body = body; c.full = b.t;
      return c;
    }
    // 글 크기를 먼저 재서 풍선 크기를 정한다
    const body = UI.text(sc, 0, 0, b.t, fs, '#2a1a10', { wrap });
    const bw = Math.max(120, Math.min(wrap, body.width) + pad * 2), bh = body.height + pad * 2;
    body.setText('');
    const g = sc.add.graphics();
    const name = sp.ko ? UI.text(sc, 0, 0, sp.ko, big ? 17 : 15, sp.col || '#ffd38a', { bold: true, st: 4 }) : null;
    let bx, by, tail;   // 풍선 왼쪽 위
    if (at.kind === 'edge') {
      c.setScrollFactor(0);
      const fx = at.side === 'l' ? 66 : W - 66, fy = big ? 250 : 236, fsz = big ? 92 : 78;
      const stone = sp === CAST.lise_stone || b.w === 'lise_stone';
      const key = sp.portrait || (stone ? 'portrait/lise' : null) || ({ odelia: 'portrait/paladin', seril: 'portrait/ranger' })[b.w];
      const ring = sc.add.graphics(); ring.fillStyle(0x1a110c, 0.92).fillCircle(fx, fy, fsz / 2 + 4).lineStyle(3, sp.col ? Phaser.Display.Color.HexStringToColor(sp.col).color : 0xe0b45a, 1).strokeCircle(fx, fy, fsz / 2 + 4);
      c.add(ring);
      if (key && sc.textures.exists(key)) {
        const im = sc.add.image(fx, fy, key); const src = sc.textures.get(key).getSourceImage();
        im.setScale(fsz / Math.min(src.width, src.height)).setCrop(0, 0, src.width, Math.min(src.height, src.width));
        im.setOrigin(0.5, 0.5 * Math.min(src.height, src.width) / src.height);
        const m = sc.make.graphics({ add: false }).setScrollFactor(0); m.fillStyle(0xffffff).fillCircle(fx, fy, fsz / 2); im.setMask(m.createGeometryMask());
        if (stone) im.setTint(0xb8d0ff).setAlpha(0.75);   // 공명석 속 목소리
        c.add(im);
      } else {
        c.add(UI.text(sc, fx, fy, (sp.ko || '?').slice(0, 1), 34, '#ffe7a8', { bold: true, st: 5 }).setOrigin(0.5));
      }
      bx = at.side === 'l' ? fx + fsz / 2 + 22 : fx - fsz / 2 - 22 - bw; by = fy - bh / 2 + 6;
      tail = at.side === 'l' ? [[bx, by + bh / 2 - 9], [bx - 14, by + bh / 2], [bx, by + bh / 2 + 9]] : [[bx + bw, by + bh / 2 - 9], [bx + bw + 14, by + bh / 2], [bx + bw, by + bh / 2 + 9]];
      if (name) name.setPosition(at.side === 'l' ? bx + 4 : bx + bw - 4, by - 4).setOrigin(at.side === 'l' ? 0 : 1, 1);
    } else {
      bx = -bw / 2; by = -bh - 14;
      tail = [[-9, -15], [0, 0], [9, -15]];
      if (name) name.setPosition(bx + 4, by - 4).setOrigin(0, 1);
    }
    g.fillStyle(0x000000, 0.25).fillRoundedRect(bx + 3, by + 4, bw, bh, 14);
    g.fillStyle(0xfffaf0, 1).fillRoundedRect(bx, by, bw, bh, 14);
    g.fillTriangle(tail[0][0], tail[0][1], tail[1][0], tail[1][1], tail[2][0], tail[2][1]);
    g.lineStyle(3, 0x3a2414, 1).strokeRoundedRect(bx, by, bw, bh, 14);
    g.lineBetween(tail[0][0], tail[0][1], tail[1][0], tail[1][1]); g.lineBetween(tail[1][0], tail[1][1], tail[2][0], tail[2][1]);
    body.setPosition(bx + pad, by + pad);
    c.add(g); c.add(body); if (name) c.add(name);
    c.body = body; c.full = b.t; c.at = at; c.bw = bw;
    this.place(sc, c);
    return c;
  },
  // 머리 위·우리 위 말풍선 자리 (화면 밖으로 나가지 않게)
  place(sc, c) {
    const at = c.at; if (!at || at.kind === 'edge' || at.kind === 'narr') return;
    const cam = sc.cameras.main;
    let x = at.x, y = at.y;
    if (at.kind === 'hero') { const h = sc.hero; x = h.x; y = h.y - (h.z || 0) - 215; }
    const half = c.bw / 2 + 12;
    c.setPosition(Phaser.Math.Clamp(x, cam.scrollX + half, cam.scrollX + W - half), Math.max(150 + 60, y));
  },
  // 글자 타이핑
  type(sc, c, speed = 2) {
    let i = 0;
    c.typing = true;
    c.ev = sc.time.addEvent({ delay: 30, loop: true, callback: () => {
      if (!c.body.active) return c.ev.remove();
      i += speed; c.body.setText(c.full.slice(0, i));
      if (i >= c.full.length) { c.typing = false; c.ev.remove(); }
    } });
  },
  finishType(c) { if (c && c.typing) { c.typing = false; c.ev.remove(); c.body.setText(c.full); } },
  showBark(sc, b) {
    if (sc.barkUi) sc.barkUi.destroy();
    const c = this.bubble(sc, b, false);
    c.setAlpha(0); sc.tweens.add({ targets: c, alpha: 1, duration: 140 });
    sc.barkUi = c; sc.barkT = Math.max(1700, 800 + b.t.length * 55);
    this.type(sc, c, 3);
  },
  // ---- 멈춘 장면 ----
  startCine(sc, lines, go) {
    const top = sc.add.rectangle(W / 2, -40, W, 72, 0x000000, 0.86).setScrollFactor(0).setDepth(4990);
    const bot = sc.add.rectangle(W / 2, H + 40, W, 72, 0x000000, 0.86).setScrollFactor(0).setDepth(4990);
    sc.tweens.add({ targets: top, y: 36, duration: 260, ease: 'Quad.out' });
    sc.tweens.add({ targets: bot, y: H - 36, duration: 260, ease: 'Quad.out' });
    const hint = UI.text(sc, W - 24, H - 36, '누르면 넘어가요 ▶', 16, '#c8b8a0').setOrigin(1, 0.5).setScrollFactor(0).setDepth(5241).setAlpha(0);
    sc.tweens.add({ targets: hint, alpha: 0.85, duration: 400, delay: 400 });
    if (sc.barkUi) { sc.barkUi.destroy(); sc.barkUi = null; }
    sc.resetTouchControls && sc.resetTouchControls();
    const k = sc.cine = { lines, i: -1, go, ui: null, t: 0, top, bot, hint, wait: 320 };
    k.tap = () => { if (sc.cine !== k || k.wait > 0) return; if (k.ui && k.ui.typing) this.finishType(k.ui); else this.cineNext(sc); };
    sc.input.on('pointerdown', k.tap);
    k.key = e => { if (['Space', 'Enter', 'KeyJ', 'KeyZ'].includes(e.code)) k.tap(); };
    sc.input.keyboard && sc.input.keyboard.on('keydown', k.key);
  },
  cineNext(sc) {
    const k = sc.cine; if (!k) return;
    if (k.ui) { const u = k.ui; sc.tweens.add({ targets: u, alpha: 0, duration: 120, onComplete: () => u.destroy() }); k.ui = null; }
    k.i++;
    if (k.i >= k.lines.length) return this.cineEnd(sc);
    const b = k.lines[k.i];
    k.ui = this.bubble(sc, b, true);
    k.ui.setAlpha(0); sc.tweens.add({ targets: k.ui, alpha: 1, duration: 140 });
    this.type(sc, k.ui, 2);
    k.t = Math.max(2300, 1100 + b.t.length * 65);
    k.wait = 180;
  },
  cineUpdate(sc, dt) {
    const k = sc.cine; if (!k) return;
    if (k.wait > 0) { k.wait -= dt; if (k.i < 0 && k.wait <= 0) this.cineNext(sc); return; }
    if (k.ui) this.place(sc, k.ui);
    if (k.ui && !k.ui.typing) { k.t -= dt; if (k.t <= 0) this.cineNext(sc); }
  },
  cineEnd(sc) {
    const k = sc.cine; if (!k) return;
    sc.cine = null;
    if (k.ui) { this.finishType(k.ui); k.ui.destroy(); k.ui = null; }
    sc.input.off('pointerdown', k.tap);
    sc.input.keyboard && sc.input.keyboard.off('keydown', k.key);
    sc.tweens.add({ targets: k.top, y: -40, duration: 220, onComplete: () => k.top.destroy() });
    sc.tweens.add({ targets: k.bot, y: H + 40, duration: 220, onComplete: () => k.bot.destroy() });
    k.hint.destroy();
    sc.resetTouchControls && sc.resetTouchControls();
    if (k.go) k.go();
  },
  // 웨이브 시작. 이야기 대사가 있으면 멈춘 장면으로 보여 주고, 끝나면 go()(몬스터 등장)를 부른다 → true
  onWave(sc, n, go) {
    const e = sc.sev; if (!e || e.state !== 'wait' || n !== e.d.wave) return false;
    const d = e.d;
    const intro = this.lines(sc, d.intro);
    const seen = sc.save.seen || (sc.save.seen = {}), sk = 'ev_' + sc.cfg.stage;
    const pause = intro.length && !seen[sk] && go;
    if (d.kind === 'talk') e.state = 'done';
    else {
      e.state = 'run'; e.t = d.time;
      const w = sc.lock || { l: sc.hero.x - 400, r: sc.hero.x + 600 };
      if (d.kind === 'rescue') {
        for (let i = 0; i < d.n; i++) {
          const x = Math.round(w.l + 260 + (w.r - w.l - 520) * (d.n === 1 ? 0.5 : i / (d.n - 1)));
          const y = FLOOR_TOP + 40 + (i % 2) * 120;
          this.addEvProp(sc, x, y, 'captive', d.who, i);
        }
      } else if (d.kind === 'ritual') {
        this.addEvProp(sc, Math.round(w.r - 240), FLOOR_TOP + 60, 'altar');
      }
      this.drawGoal(sc);
    }
    if (pause) { seen[sk] = true; this.startCine(sc, intro, go); return true; }
    // 다시 하는 스테이지: 이미 본 이야기는 멈추지 않고 작은 말풍선으로 지나간다
    sc.barkQ.push(...intro);
    return false;
  },
  addEvProp(sc, x, y, ev, who, idx = 0) {
    const before = sc.props.length;
    sc.addProp(x, y, 'crate');
    const p = sc.props[before];
    p.ev = ev; p.hp = ev === 'altar' ? 6 : 3;
    const key = ev === 'altar' ? 'props/ritual_altar' : 'props/captive_cage';
    if (sc.textures.exists(key)) p.img.setTexture(key).setScale((ev === 'altar' ? 120 : 140) / sc.textures.get(key).getSourceImage().height);
    else p.img.setTint(ev === 'altar' ? 0x8a50c0 : 0xd8b070);
    p.label = UI.text(sc, x, y - p.img.displayHeight - 14, ev === 'altar' ? '흑월 의식' : '구출!', 18, ev === 'altar' ? '#d0a0ff' : '#ffe27a', { bold: true, st: 5 }).setOrigin(0.5, 1).setDepth(1002 + y);
    sc.tweens.add({ targets: p.label, y: p.label.y - 8, yoyo: true, repeat: -1, duration: 500 });
    if (ev === 'altar') {
      p.glow = sc.add.ellipse(x, y, 150, 46, 0x9050ff, 0.35).setBlendMode(Phaser.BlendModes.ADD).setDepth(999);
      sc.tweens.add({ targets: p.glow, alpha: { from: 0.15, to: 0.5 }, yoyo: true, repeat: -1, duration: 420 });
    }
    if (ev === 'captive') p.captive = this.addCaptive(sc, p, who, idx);
    this.sev(sc).props.push(p);
  },
  // 🆕 우리 안에 갇힌 사람: captive/<종류>_trapped · _free 그림 (없으면 실루엣으로 대신)
  addCaptive(sc, p, who, i) {
    const type = CAPTIVE_TYPE[who] || 'villager';
    const real = sc.textures.exists(`captive/${type}_trapped`);
    const key = real ? `captive/${type}_trapped` : sc.textures.exists('npc/merchant') ? 'npc/merchant' : null;
    if (!key) return null;
    const ch = p.img.displayHeight;
    const img = sc.add.image(p.x, p.y + 6 - ch * 0.05, key).setOrigin(0.5, 1).setDepth(p.img.depth + 0.2);
    img.setScale(ch * ({ child: 0.62, dwarf: 0.7, spirit: 0.62 }[type] || 0.8) / img.height);
    if (i % 2) img.setFlipX(true);
    if (type === 'spirit') img.setTint(real ? 0xffffff : 0xa0ffd8).setAlpha(real ? 0.9 : 0.75).setBlendMode(real ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);
    else if (type === 'mirror') img.setTint(real ? 0xffffff : 0xb8c8ff).setAlpha(0.7);
    else if (!real) img.setTint(0x3a3040);   // 그림이 오기 전: 실루엣
    // 우리 그림은 속이 거의 막혀 있어서, 사람을 우리 앞에 그리고 우리를 반투명하게 한 겹 더 덮는다 (창살 너머로 보이게)
    const over = sc.add.image(p.img.x, p.img.y, p.img.texture.key).setOrigin(0.5, 1).setScale(p.img.scaleX, p.img.scaleY).setDepth(p.img.depth + 0.5).setAlpha(0.5);
    // 창살을 붙잡고 흔드는 듯이
    const tw = sc.tweens.add({ targets: img, angle: { from: -3, to: 3 }, duration: 360 + i * 50, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return { img, tw, type, real, over };
  },
  // 풀려난 사람: 한 번 뛰어오르고 인사한 뒤 싸움터 밖으로 달아난다
  freeCaptive(sc, p) {
    const c = p.captive; if (!c) return;
    c.tw.stop(); c.over.destroy(); c.img.setAngle(0).setDepth(p.y + 1002);
    const free = `captive/${c.type}_free`;
    if (c.real && sc.textures.exists(free)) { const h = c.img.displayHeight; c.img.setTexture(free).setScale(h / sc.textures.get(free).getSourceImage().height); }
    const dir = p.x < sc.hero.x ? -1 : 1;
    sc.floatText(p.x, p.y - 200, '고마워요!', '#ffffff', 24);
    sc.tweens.add({ targets: c.img, y: c.img.y - 46, duration: 200, yoyo: true, ease: 'Quad.out', onComplete: () => {
      c.img.setFlipX(dir < 0);
      sc.tweens.add({ targets: c.img, x: c.img.x + dir * 460, alpha: 0, duration: 1100, delay: 220, onComplete: () => c.img.destroy() });
    } });
  },
  // 시간 초과: 갇힌 사람이 끌려간다
  loseCaptive(sc, p) {
    const c = p.captive; if (!c) return;
    c.tw.stop();
    sc.tweens.add({ targets: c.over, alpha: 0, duration: 500, onComplete: () => c.over.destroy() });
    sc.tweens.add({ targets: c.img, alpha: 0, y: c.img.y + 10, duration: 500, onComplete: () => c.img.destroy() });
  },
  sev(sc) { return sc.sev; },
  // 이벤트 물체가 부서졌다 (hitProp에서)
  onProp(sc, p) {
    const e = sc.sev;
    if (p.label) p.label.destroy(); if (p.glow) p.glow.destroy();
    if (!e || e.state !== 'run') return;
    if (p.ev === 'captive') {
      this.freeCaptive(sc, p);
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
      p.hp = 0; if (p.label) p.label.destroy(); this.loseCaptive(sc, p);
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
    if (sc.barkUi) this.place(sc, sc.barkUi);
    if (!sc.barkUi && sc.barkQ && sc.barkQ.length && !sc.won && !sc.lost && !sc.cine) this.showBark(sc, sc.barkQ.shift());
    const e = sc.sev; if (!e || e.state !== 'run' || sc.won || sc.lost) return;
    e.t -= dt;
    // ✏️ 글자는 숫자가 바뀔 때만 다시 그린다 (매 프레임 다시 그리면 휴대폰에서 무겁다)
    if (sc.goalUi) {
      const sec = Math.max(0, Math.ceil(e.t / 1000)), warn = e.t < 10000;
      if (sc.goalUi.sec !== sec) { sc.goalUi.sec = sec; sc.goalUi.t.setText(`${sc.goalUi.txt}  ·  ${sec}초`); }
      if (sc.goalUi.warn !== warn) { sc.goalUi.warn = warn; sc.goalUi.t.setColor(warn ? '#ff9a8a' : '#ffe7a8'); }
    }
    if (e.t <= 0) this.fail(sc);
  },
  onClear(sc) {
    const e = sc.sev;
    if (e && e.state === 'run') this.fail(sc);
    if (sc.barkUi) { sc.barkUi.destroy(); sc.barkUi = null; }
    sc.barkQ = [];
    if (sc.cine) this.cineEnd(sc);
  },
};
