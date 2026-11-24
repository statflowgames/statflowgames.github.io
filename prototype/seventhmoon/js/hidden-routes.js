// 🆕 2026-11-24 숨은 길 · 황금 고블린
//   숨은 길: 장마다 한 곳(그 장의 두 번째 전투, c<장>_s2)에 동굴·금 간 벽·문양 문이 있다.
//     · 동굴(cave): 덩굴로 막혀 있다 → 아무 공격으로 5번 치면 뚫린다
//     · 벽(wall):   금이 가 있다 → ↓+공격(내려찍기)으로만 부서진다
//     · 문(door):   문양이 새겨져 있다 → 연속 공격 15 이상일 때 두드리면 열린다
//     열어 두고 스테이지를 깨면 결과 화면에 「숨은 길로 들어가기」 → 숨은 방(c<장>_h): 졸개 두 무리 + 미니보스 + 보물 상자
//     처음 깨면 희귀 이상 장비 2개·금화·심연 마석. 지도의 그 스테이지에 표시가 붙는다.
//   황금 고블린(미니게임): 이야기 모드 일반 스테이지에서 아주 가끔(7%) 웨이브 사이에 나타나 도망친다.
//     12초 안에 잡으면 금화 더미와 좋은 장비. 때릴 때마다 금화가 튄다. 놓치면 연기와 함께 사라진다.
//   시험용 주소: ?hidden (입구가 열린 채로 시작) · ?goldgob (첫 웨이브 뒤 바로 황금 고블린)
//   그림: docs/art-brief-hidden-routes.md (오기 전에는 코드로 그린 임시 그림)

// 장별 숨은 길: [입구 종류, 숨은 방 이름, 숨은 방 배경, 미니보스 id, 빌릴 그림, 이름, 색, 미니보스 별명]
const HIDDEN = {
  1: ['cave', '이끼 낀 동굴', 'swamp', 'hid_c1', 'gloob', '이끼 젤리 굴룹', 0x9ad070, '동굴 밑바닥의 이끼 덩어리'],
  2: ['wall', '밀수꾼의 지하 창고', 'sewer', 'hid_c2', 'twinsting', '집게 왕 크랩스팅', 0xff8a70, '밀수꾼이 키운 집게'],
  3: ['door', '봉인된 매장실', 'tomb', 'hid_c3', 'golem7', '모래 수호 골렘', 0xe8c890, '무덤을 지키는 모래 거인'],
  4: ['cave', '얼음 동굴', 'dwarf', 'hid_c4', 'toothcrusher', '설원 이빨부숴', 0xe0f0ff, '얼음 동굴의 주인'],
  5: ['door', '잠긴 금서고', 'tower', 'hid_c5', 'frost_wyvern', '마도 와이번', 0xc0a0ff, '금서를 먹고 자란 비룡'],
  6: ['wall', '갈라진 틈새', 'abyss', 'hid_c6', 'sehera', '그림자 세헤라', 0x8070a0, '틈새에 남은 그림자'],
  7: ['cave', '수정 굴', 'glass_maze', 'hid_c7', 'barkhaul', '수정 나무 거인', 0xb8f0ff, '모래 속에서 자란 수정 나무'],
  8: ['door', '물에 잠긴 보물고', 'sunken_temple', 'hid_c8', 'frost_wyvern', '심해 와이번', 0x70d0c8, '보물고를 감은 바다뱀'],
  9: ['wall', '버려진 갱도', 'lava', 'hid_c9', 'toothcrusher', '불꽃 이빨부숴', 0xff9a60, '갱도 끝의 불꽃 두목'],
  10: ['cave', '포자 굴', 'spore_bog', 'hid_c10', 'gloob', '포자 덩어리 굴룹', 0xd090ff, '굴을 가득 채운 포자'],
  11: ['door', '바람이 잠긴 방', 'cloud_garden', 'hid_c11', 'golem7', '구름 거상 파수꾼', 0xf0f0ff, '잠긴 방의 파수꾼'],
  12: ['wall', '달 뒤편의 균열', 'moon_grave', 'hid_c12', 'sehera', '달빛 세헤라', 0xc0d0ff, '달 뒤편에 남은 메아리'],
};
const HIDDEN_MID = ['toothcrusher', 'captain_mog', 'twinsting', 'frost_wyvern', 'golem7', 'orvex_eclipse', 'glass_queen', 'drowned_captain', 'forge_golem', 'rot_warden', 'storm_wyvern', 'moon_azmal'];
const HIDDEN_HINT = {
  cave: '덩굴로 막힌 동굴… 여러 번 치면 뚫릴 것 같다',
  wall: '금 간 벽… 내려찍으면(↓+공격) 부서질 것 같다',
  door: '문양이 새겨진 문… 연속 공격 15 이상일 때 두드리면 열릴 것 같다',
};

// 미니보스(대역: 다른 보스 그림을 빌리고 색·이름만 바꾼다)와 숨은 방 스테이지
(function defineHidden() {
  for (const [c, h] of Object.entries(HIDDEN)) {
    const ch = +c, [, name, theme, id, like, ko, tint] = h;
    const ref = MONDEF[HIDDEN_MID[ch - 1]], b = MONDEF[like];
    if (!ref || !b) continue;
    MONDEF[id] = { ...b, ko, like, tint, sc: (b.sc || 1) * 0.95, hp: Math.round(ref.hp * 0.75), dmg: ref.dmg, exp: Math.round(ref.exp * 0.8),
      gold: ref.gold, mid: true, boss: true, summon: null, standin: true, hiddenBoss: ch };
    // 졸개: 그 장 두 번째 전투의 첫 무리
    const src = STAGES[`c${ch}_s2`] || STAGES[`c${ch}_s1`];
    const kinds = src ? [...new Set(src.waves.flat().join(',').split(',').map(t => t.trim().split('*')[0]))] : ['grunt'];
    const a = kinds[0], k2 = kinds[1] || kinds[0];
    STAGES[`c${ch}_h`] = { name, theme, waves: [[`${a}*2,${k2}`, `${k2}*2,${a}`], [id]], boss: true, treasure: true, hidden: ch };
    if (typeof BOSS_EPITHET !== 'undefined') BOSS_EPITHET[id] = h[7];
  }
})();

// ✏️ 2026-11-25 진짜 그림 리그 (부품: tools/import_hidden.py, 이름표 tools/hidden_names.json)
//   빌려 쓰던 보스와 같은 리그 구성이라 동작(BOSS_MOVES·몸짓)은 그대로 빌린다. 부품이 없으면 registerMonRigs가 등록하지 않아 색 대역을 쓴다.
if (typeof MON_RIGS !== 'undefined') Object.assign(MON_RIGS, {
  hid_c1: () => blobRig('hid_c1', { h: 220, face: 'face_calm', faceAngry: 'face_angry', inner: [{ img: 'crown', at: [0, -0.62], sc: 1 }, { img: 'junk_barrel', at: [-0.25, -0.3], sc: 0.8 }, { img: 'junk_boot', at: [0.25, -0.2], sc: 0.8 }], def: { shadow: 2.4 } }),
  hid_c2: () => scorpionRig('hid_c2', { h: 112, def: { shadow: 2.3 } }),
  hid_c3: () => autoHumanoid('hid_c3', { h: 304, extra: [{ img: 'core', on: 'torso', at: [0, -0.5], a: [0.5, 0.5], z: 75 }, { img: 'shoulder', on: 'torso', at: [-0.25, -0.85], a: [0.5, 0.6], z: 86 }], shadow: 2.1 }),
  hid_c4: () => toothRig('hid_c4'),
  hid_c5: () => wyrmRig('hid_c5', { h: 150, hover: 70, def: { shadow: 2.5 } }),
  hid_c6: () => autoHumanoid('hid_c6', { h: 280, weapon: { img: 'scepter', a: [0.5, 0.7], sc: 1.0 }, extra: [{ img: 'skirt', on: 'root', at: [0, 0.05], a: [0.5, 0.1], z: 45 }, { n: 'ring', img: 'sand_ring', on: 'root', at: [0, -0.6], a: [0.5, 0.5], z: 1 }], procs: [{ n: 'ring', spin: 0.03 }], shadow: 2 }),
  hid_c7: () => autoHumanoid('hid_c7', { h: 320, weapon: { img: 'club', sc: 1.0 }, extra: [{ img: 'shoulder', on: 'torso', at: [-0.25, -0.86], a: [0.5, 0.55], z: 86 }], shadow: 2.5 }),
  hid_c8: () => wyrmRig('hid_c8', { h: 150, hover: 70, def: { shadow: 2.5 } }),
  hid_c9: () => toothRig('hid_c9'),
  hid_c10: () => blobRig('hid_c10', { h: 220, face: 'face_calm', faceAngry: 'face_angry', inner: [{ img: 'crown', at: [0, -0.62], sc: 1 }, { img: 'junk_barrel', at: [-0.25, -0.3], sc: 0.8 }, { img: 'junk_boot', at: [0.25, -0.2], sc: 0.8 }], def: { shadow: 2.4 } }),
  hid_c11: () => autoHumanoid('hid_c11', { h: 304, extra: [{ img: 'core', on: 'torso', at: [0, -0.5], a: [0.5, 0.5], z: 75 }, { img: 'shoulder', on: 'torso', at: [-0.25, -0.85], a: [0.5, 0.6], z: 86 }], shadow: 2.1 }),
  hid_c12: () => autoHumanoid('hid_c12', { h: 280, weapon: { img: 'scepter', a: [0.5, 0.7], sc: 1.0 }, extra: [{ img: 'skirt', on: 'root', at: [0, 0.05], a: [0.5, 0.1], z: 45 }, { n: 'ring', img: 'sand_ring', on: 'root', at: [0, -0.6], a: [0.5, 0.5], z: 1 }], procs: [{ n: 'ring', spin: 0.03 }], shadow: 2 }),
  // 황금 고블린: 그롤린 졸개와 같은 뼈대 + 등에 금화 자루
  gold_goblin: () => {
    const d = humanoid('gold_goblin', {
      clips: { m_down: 'gob_down', m_getup: 'gob_getup' },
      scale: 0.36, footY: 252, height: 520,
      pelvisA: [0.5, 0.3], waist: [0, -6], torsoA: [0.45, 0.86], neck: [10, -90], headA: [0.6, 0.86],
      shoulderB: [10, -74], shoulderF: [-6, -72],
      uaA: [0.5, 0.18], uaLen: 82, faA: [0.5, 0.14], faLen: 86, handA: [0.2, 0.5],
      hipB: [12, 14], hipF: [-12, 14], thA: [0.5, 0.18], thLen: 96, shA: [0.5, 0.14], shLen: 100, ftA: [0.25, 0.3],
      weapon: { img: 'dagger', at: [6, 34], a: [0.5, 0.6], sc: 1.0 },
      frontHand: 'hand_open',
    });
    if (HAS('gold_goblin', 'sack')) d.bones.push({ n: 'sack', p: 'torso', x: 26, y: -62, img: 'sack', ax: 0.5, ay: 0.5, z: 1, r: 8 });
    return d;
  },
});
if (typeof MONDEF !== 'undefined' && MONDEF.grunt) MONDEF.gold_goblin = { ...MONDEF.grunt, ko: '황금 고블린', rig: 'grunt', gold: [0, 0], face: null };

const HiddenRoute = {
  of(ch) { return HIDDEN[ch] || null; },
  stageOf(ch) { return `c${ch}_s2`; },
  // 입구 임시 그림 (진짜 그림 hidden/c<장>_closed·_open 이 오면 그것을 쓴다)
  tex(sc, kind, open) {
    const key = `hid_${kind}_${open ? 'open' : 'closed'}`;
    if (sc.textures.exists(key)) return key;
    const g = sc.make.graphics({ x: 0, y: 0, add: false }), w = 180, h = 220;
    if (kind === 'cave') {
      g.fillStyle(0x3a2e26).fillEllipse(90, 150, 176, 150).fillStyle(0x52423a).fillEllipse(90, 140, 150, 120);
      g.fillStyle(open ? 0x08060a : 0x1a1410).fillEllipse(90, 165, 92, 104);
      if (open) { g.fillStyle(0x7a4aff, 0.25).fillEllipse(90, 175, 70, 60); }
      else { g.lineStyle(7, 0x3e7a2e); for (let i = 0; i < 6; i++) g.lineBetween(52 + i * 15, 118, 46 + i * 17, 214); g.fillStyle(0x5aa040); for (let i = 0; i < 12; i++) g.fillCircle(50 + (i * 37) % 84, 128 + (i * 23) % 80, 6); }
      g.fillStyle(0x6a5a4a).fillCircle(24, 200, 18).fillCircle(160, 204, 15).fillCircle(140, 84, 12);
    } else if (kind === 'wall') {
      g.fillStyle(0x4a4650).fillRect(8, 22, 164, 198);
      g.lineStyle(3, 0x2a2830);
      for (let y = 22; y < 220; y += 33) { g.lineBetween(8, y, 172, y); for (let x = (y / 33) % 2 ? 8 : 49; x < 172; x += 82) g.lineBetween(x, y, x, y + 33); }
      if (open) { g.fillStyle(0x08060a).fillEllipse(90, 160, 104, 120); g.fillStyle(0x7a4aff, 0.25).fillEllipse(90, 170, 74, 70); g.fillStyle(0x5a5660).fillCircle(40, 210, 14).fillCircle(136, 212, 12).fillCircle(150, 196, 9); }
      else { g.lineStyle(4, 0x18161c); g.lineBetween(90, 60, 76, 110); g.lineBetween(76, 110, 102, 150); g.lineBetween(102, 150, 84, 200); g.lineBetween(76, 110, 46, 128); g.lineBetween(102, 150, 134, 166); }
    } else {
      g.fillStyle(0x5a5246).fillRect(14, 30, 152, 190).fillStyle(0x6e6656).fillRoundedRect(26, 40, 128, 180, { tl: 60, tr: 60, bl: 0, br: 0 });
      g.fillStyle(open ? 0x08060a : 0x4a3424).fillRoundedRect(40, 56, 100, 164, { tl: 48, tr: 48, bl: 0, br: 0 });
      if (open) { g.fillStyle(0x7a4aff, 0.25).fillEllipse(90, 170, 70, 80); }
      else { g.lineStyle(4, 0xe6c27a, 0.9).strokeCircle(90, 128, 26); g.lineBetween(90, 98, 90, 158); g.lineBetween(62, 128, 118, 128); g.lineStyle(3, 0x2a1a10); g.lineBetween(90, 56, 90, 220); }
    }
    g.generateTexture(key, w, h); g.destroy();
    return key;
  },
  // buildStage 끝에서: 이 장의 숨은 길 스테이지라면 입구를 놓는다
  place(sc) {
    const ch = sc.cfg.ch, H0 = this.of(ch);
    if (!H0 || sc.mode !== 'story' || sc.tower || sc.cfg.stage !== this.stageOf(ch) || sc.waves.length < 2) return;
    const [kind] = H0, s = sc.save;
    const done = !!(s.hiddenDone && s.hiddenDone[ch]);
    // 숨은 보물 상자와 다른 웨이브 사이 (마지막 두 웨이브 사이)
    const wi = sc.waves.length - 2, w0 = sc.waves[wi], w1 = sc.waves[wi + 1];
    const x = Phaser.Math.Clamp(Math.round((w0.r + w1.at) / 2 + 140), 500, STAGE_W - 500), y = FLOOR_TOP + 2;
    const real = sc.textures.exists(`hidden/c${ch}_closed`) && sc.textures.exists(`hidden/c${ch}_open`);
    const key = open => real ? `hidden/c${ch}_${open ? 'open' : 'closed'}` : this.tex(sc, kind, open);
    const open0 = done || (typeof Q !== 'undefined' && Q.has('hidden'));
    const img = sc.add.image(x, y + 6, key(open0)).setOrigin(0.5, 1).setDepth(1000 + y - 2);
    img.setScale(210 / img.height);
    const sh = sc.add.image(x, y + 2, 'shadow').setScale(1.3, 0.7).setAlpha(0.4).setDepth(999);
    const p = { x, y, n: 'hidden', img, sh, hp: 9999, hidden: true, kind, hits: 0, open: false, key };
    sc.props.push(p);
    sc.hiddenProp = p;
    if (open0) this.open(sc, p, true);
    else {
      const q = sc.add.text(x, y - 230, '?', { fontFamily: 'serif', fontSize: 40, color: '#ffe7a8', stroke: '#2a1206', strokeThickness: 6 }).setOrigin(0.5).setDepth(1001 + y).setAlpha(0);
      sc.tweens.add({ targets: q, alpha: { from: 0, to: 1 }, y: y - 245, duration: 500, yoyo: true, repeat: -1, repeatDelay: 1800 });
      p.mark = q;
    }
  },
  // 매 프레임: 처음 가까이 가면 힌트 한 번
  update(sc) {
    const p = sc.hiddenProp; if (!p || p.open || p.hinted) return;
    if (Math.abs(sc.hero.x - p.x) < 260) {
      p.hinted = true;
      sc.floatText(p.x, p.y - 260, HIDDEN_HINT[p.kind], '#e8dcff', 22);
      if (sc.onceHint) sc.onceHint('hidden', '숨은 길이 있어요!\n열어 두고 스테이지를 깨면 들어갈 수 있어요');
    }
  },
  // hitProp에서 부른다
  hit(sc, p, h) {
    p.hp = 9999;
    if (p.open || h !== sc.hero) return;
    const now = sc.now || 0, say = t => { if (now - (p.saidAt || -9999) > 1500) { p.saidAt = now; sc.floatText(p.x, p.y - 250, t, '#d8c8ff', 22); } };
    sc.tweens.add({ targets: p.img, x: p.x + h.face * 4, duration: 40, yoyo: true, repeat: 1 });
    sc.fx('dust_land', p.x + (Math.random() - 0.5) * 60, p.y - 20, { s: 0.3, dur: 350, depth: p.y + 1 });
    SFX.brk(p.x - sc.cameras.main.scrollX, p.kind === 'cave' ? 'wood' : 'stone');
    if (p.kind === 'cave') { p.hits++; if (p.hits >= 5) this.open(sc, p); else say(`덩굴이 흔들린다 (${p.hits}/5)`); }
    else if (p.kind === 'wall') { if (h.atkName === 'down' || (h.atk && h.atk.slam)) this.open(sc, p); else say('꿈쩍도 안 한다… (↓+공격)'); }
    else if (p.kind === 'door') { if ((sc.comboN || 0) >= 15) this.open(sc, p); else say(`문양이 희미하게 빛난다 (연속 ${sc.comboN || 0}/15)`); }
  },
  open(sc, p, quiet) {
    p.open = true; sc.hiddenOpen = true;
    p.img.setTexture(p.key(true)).setScale(210 / p.img.height);
    if (p.mark) { p.mark.destroy(); p.mark = null; }
    const sign = sc.add.text(p.x, p.y - 236, '▼ 숨은 길', { fontFamily: 'sans-serif', fontSize: 24, color: '#d8b8ff', stroke: '#1a0a2a', strokeThickness: 6, fontStyle: 'bold' }).setOrigin(0.5).setDepth(1001 + p.y);
    sc.tweens.add({ targets: sign, y: p.y - 248, duration: 600, yoyo: true, repeat: -1 });
    if (quiet) return;
    const s = sc.save; s.hiddenSeen = s.hiddenSeen || {}; s.hiddenSeen[sc.cfg.ch] = true;
    SFX.ui('chest_open'); sc.cameras.main.shake(220, 0.008); sc.cameras.main.flash(180, 200, 170, 255);
    sc.spawnDebrisAt(p.x, p.y - 40, 8, 'rock');
    sc.fx('levelup_burst', p.x, p.y - 100, { s: 0.6, dur: 800, tint: 0xb090ff, depth: p.y + 1001 });
    sc.floatText(p.x, p.y - 280, '숨은 길이 열렸다!', '#d8b8ff', 38);
    sc.time.delayedCall(900, () => UI.toast(sc, '스테이지를 깨면 결과 화면에서 숨은 길로 들어갈 수 있어요', '#d8b8ff', 520));
  },
  // 결과 화면: 숨은 길 버튼
  resultButton(sc, c) {
    if (!sc.hiddenOpen || sc.def.hidden) return;
    const ch = sc.cfg.ch, b = UI.button(sc, W / 2, 572, '숨은 길로 들어가기 ▼', () => this.enter(sc, c), { w: 380, h: 58, size: 24, col: 0x3a2a5a });
    c.add(b);
    sc.tweens.add({ targets: b, scale: { from: 1, to: 1.05 }, duration: 600, yoyo: true, repeat: -1 });
  },
  // ✏️ 2026-11-24 걸어 들어가는 연출 (뒷모습 그림 없이): 결과 화면을 닫고 → 입구 앞까지 걸어가서
  //   → 안쪽(위)으로 조금 올라가며 작아지고 그림자처럼 어두워지다 사라진다 → 입구가 보랏빛으로 번쩍 → 화면이 어두워지며 숨은 방으로
  enter(sc, c) {
    if (sc.entering) return; sc.entering = true;
    const ch = sc.cfg.ch, p = sc.hiddenProp, h = sc.hero;
    const go = () => sc.scene.start('game', { stage: `c${ch}_h`, ch, node: 'hidden', from: sc.cfg.stage });
    if (c && c.scene) c.destroy();
    if (!p || !h || (typeof Settings !== 'undefined' && Settings.d && Settings.d.cine === false) || (typeof Q !== 'undefined' && Q.has('nocine'))) { sc.cameras.main.fadeOut(250); sc.time.delayedCall(260, go); return; }
    if (typeof Cinema !== 'undefined') Cinema.hideUi(sc);
    SFX.go && SFX.go();
    const base = h.sc, al = sc.ally, k = { walk: 0, fade: 0 };
    h.state = 'enterHidden'; h.st = 0; h.invuln = 0; h.setHead(null);
    h.face = Math.sign(p.x - h.x) || 1;
    const tx = p.x - h.face * 6, ty = p.y + 16, dist = Math.hypot(tx - h.x, ty - h.y);
    const walkMs = Phaser.Math.Clamp(dist / 0.26, 200, 1500);
    h.vx = h.face * 260; h.vy = 0; h.play('walk', 80);
    // 매 프레임 (영웅 그리기 뒤): 어둡게·투명하게
    const dark = Phaser.Display.Color.ValueToColor(0x1a1028), white = Phaser.Display.Color.ValueToColor(0xffffff);
    const paint = () => {
      if (!h.rig || !h.rig.c || !h.rig.c.scene) return;
      const f = k.fade;
      if (f > 0) { const cc = Phaser.Display.Color.Interpolate.ColorWithColor(white, dark, 100, Math.min(100, f * 180)); h.rig.setTintAll(Phaser.Display.Color.GetColor(cc.r, cc.g, cc.b)); }
      h.rig.c.setAlpha(Math.max(0, 1 - Math.max(0, f - 0.5) / 0.5));
      if (h.shadow) h.shadow.setAlpha(0.35 * (1 - f));
      if (al && al.rig && al.rig.c) al.rig.c.setAlpha(Math.max(0, 1 - k.walk * 1.5));
    };
    sc.events.on('postupdate', paint);
    sc.events.once('shutdown', () => sc.events.off('postupdate', paint));
    sc.tweens.add({ targets: h, x: tx, y: ty, duration: walkMs, ease: 'Sine.inOut', onUpdate: tw => { k.walk = tw.progress; }, onComplete: () => {
      // 안쪽으로: 위로 조금, 작아지고, 어두워지며 사라진다 (입구 그림보다 앞에 그려지도록 입구 바닥선 아래에 머문다)
      h.vx = h.face * 110; h.vy = 0;
      sc.tweens.add({ targets: h, y: p.y + 4, duration: 700, ease: 'Sine.in' });
      if (h.rig && h.rig.def) sc.tweens.add({ targets: h.rig.def, scale: base * 0.84, duration: 700, ease: 'Sine.in' });   // sc는 rig.def.scale을 읽는다
      sc.tweens.add({ targets: k, fade: 1, duration: 760, ease: 'Linear' });
      sc.time.delayedCall(380, () => {
        sc.fx('levelup_burst', p.x, p.y - 90, { s: 0.55, dur: 700, tint: 0xa070ff, depth: p.y + 1003 });
        SFX.ui('chest_open');
      });
      sc.time.delayedCall(820, () => { sc.cameras.main.fadeOut(360, 10, 4, 20); sc.time.delayedCall(380, go); });
    } });
  },
  // 결과 화면: 숨은 방을 처음 깼을 때 보상 (reward 배열에 장비를 넣는다)
  addReward(sc, s, reward) {
    const ch = sc.def.hidden; if (!ch) return null;
    s.hiddenDone = s.hiddenDone || {};
    const first = !s.hiddenDone[ch];
    s.hiddenDone[ch] = true;
    const n = first ? 2 : 1;
    for (let i = 0; i < n; i++) { const it = rollDrop(s, ch, 2, true, 2, first && i === 0); s.bag = s.bag.filter(b => b !== it); reward.push(it); }
    const gold = first ? 120 * ch + 200 : 40 * ch;
    s.gold += gold;
    if (first) s.mats.abyss = (s.mats.abyss || 0) + 1;
    return first ? `숨은 길 첫 정복 · 금화 +${gold} · 심연 마석 +1 · 희귀 장비 ${n}개` : `숨은 길 · 금화 +${gold}`;
  },
  // 지도: 그 스테이지 노드에 표시
  mapMark(scene, L, nodes, ch) {
    const s = Save.data, H0 = this.of(ch); if (!H0 || !s) return;
    for (const [id, n] of Object.entries(nodes)) if (n.stage === this.stageOf(ch)) {
      const [x, y] = scene.pos(id), done = s.hiddenDone && s.hiddenDone[ch], seen = s.hiddenSeen && s.hiddenSeen[ch];
      const ik = `hidden/icon_${done ? 'done' : 'found'}`;
      if ((done || seen) && scene.textures.exists(ik)) L.add(scene.add.image(x + 26, y - 34, ik).setDisplaySize(40, 40));   // ✏️ 2026-11-25 아이콘 그림
      else if (done || seen) L.add(UI.text(scene, x + 24, y - 30, done ? '◆' : '◇', 18, '#d8b8ff', { st: 4 }).setOrigin(0.5));
    }
  },
  mapDesc(ch, stage) {
    const s = Save.data, H0 = this.of(ch); if (!H0 || stage !== this.stageOf(ch)) return '';
    return s.hiddenDone && s.hiddenDone[ch] ? `   ◆ 숨은 길 「${H0[1]}」 정복` : s.hiddenSeen && s.hiddenSeen[ch] ? `   ◇ 숨은 길 「${H0[1]}」` : '   숨은 길 ?';
  },
};

// ---------------------------------------------------------------------------
// 황금 고블린 (미니게임)
// ---------------------------------------------------------------------------
const GOLD_GOB_MS = 12000;
const GoldGob = {
  // 스테이지 시작 때: 나올지, 몇 번째 웨이브 뒤에 나올지 정한다
  roll(sc) {
    sc.goldGob = null;
    const force = typeof Q !== 'undefined' && Q.has('goldgob');
    if (sc.mode !== 'story' || sc.tower || sc.def.boss || sc.def.hidden || sc.tut || sc.waves.length < 2) return;
    if (!force && Math.random() >= 0.07) return;
    sc.goldGob = { wave: force ? 1 : Phaser.Math.Between(1, sc.waves.length - 1), m: null, t: 0, done: false };
  },
  // 웨이브를 끝냈을 때 (checkWave). 나타났으면 true
  maybe(sc) {
    const G = sc.goldGob; if (!G || G.m || G.done || sc.waveIdx !== G.wave) return false;
    const h = sc.hero, cam = sc.cameras.main;
    const src = STAGES[`c${sc.ch}_s1`] || STAGES.c1_s1;
    const kind = (src.waves[0][0] || 'grunt').split(',')[0].split('*')[0].trim();
    const x = Phaser.Math.Clamp(h.x + h.face * 380, cam.scrollX + 120, cam.scrollX + W - 120);
    const real = typeof RIGS !== 'undefined' && RIGS.gold_goblin && sc.textures.exists('gold_goblin/torso');   // ✏️ 2026-11-25 진짜 황금 고블린 그림
    const m = new Monster(sc, real ? 'gold_goblin' : MONDEF[kind] ? kind : 'grunt', x, Phaser.Math.Between(FLOOR_TOP + 40, FLOOR_BOT - 40), { noElite: true });
    m.def = { ...m.def, ko: '황금 고블린', gold: [0, 0] };
    m.maxHp = m.hp = Math.round(m.maxHp * 2.4);
    m.rig.def.scale *= 0.9;
    if (!real) { for (const b of m.rig.bones) b.baseTint = typeof mulTint === 'function' ? mulTint(b.baseTint, 0xfff0a0) : 0xfff0a0; m.rig.setTintAll(null); }   // 그림이 없을 때만 옅은 금빛
    m.goldGob = true; m.state = 'idle'; m.showEmote('shock', 900);
    m.glow = sc.add.ellipse(x, m.y, 120, 34, 0xffd040, 0.45).setBlendMode(Phaser.BlendModes.ADD).setDepth(999);
    const orig = m.update.bind(m);
    m.update = dt => (['idle', 'move', 'flee', 'windup', 'stab', 'taunt', 'throwup', 'throw', 'cast', 'castup'].includes(m.state) ? this.run(sc, m, dt) : orig(dt));
    sc.monsters.push(m);
    G.m = m; G.t = GOLD_GOB_MS; G.lastHp = m.hp;
    // 화면 안에 가둔다 (잡거나 놓칠 때까지 다음 웨이브로 못 간다)
    sc.bounds = { l: cam.scrollX + 20, r: cam.scrollX + W - 20 };
    sc.banner('황금 고블린!', '#ffd34d', '12초 안에 잡으면 큰 보물!');
    SFX.ui('chest_open');
    G.ui = sc.add.text(W / 2, 112, '', { fontFamily: 'serif', fontSize: 34, color: '#ffd34d', stroke: '#2a1206', strokeThickness: 7 }).setOrigin(0.5).setScrollFactor(0).setDepth(6900);
    if (sc.onceHint) sc.onceHint('goldgob', '황금 고블린은 아주 가끔 나타나요!\n도망치기 전에 잡으면 금화와 좋은 장비');
    return true;
  },
  // 도망 AI: 주인공 반대쪽으로, 구석에 몰리면 옆을 스쳐 반대편으로 내달린다
  run(sc, m, dt) {
    const s = dt / 1000, h = sc.hero, b = sc.bounds;
    m.st += dt; if (m.invuln > 0) m.invuln -= dt;
    const away = Math.sign(m.x - h.x) || 1, near = Math.abs(m.x - h.x);
    const cornered = (away > 0 && m.x > b.r - 140) || (away < 0 && m.x < b.l + 140);
    if (!(m.dashT > 0) && cornered && near < 260) { m.dashT = 750; m.dashDir = -away; m.showEmote('sweat', 700); }
    let tx = h.x + away * 560;
    if (m.dashT > 0) { m.dashT -= dt; tx = m.x + m.dashDir * 400; }
    tx = Phaser.Math.Clamp(tx, b.l + 60, b.r - 60);
    m.zig = (m.zig || 0) + dt;
    const ty = Phaser.Math.Clamp(h.y + Math.sin(m.zig / 380) * 130, FLOOR_TOP + 20, FLOOR_BOT - 20);
    const sp = m.dashT > 0 ? 430 : 300;
    m.vx = Math.abs(tx - m.x) > 15 ? Math.sign(tx - m.x) * sp : 0;
    m.vy = Math.abs(ty - m.y) > 8 ? Math.sign(ty - m.y) * sp * 0.6 : 0;
    m.face = Math.sign(m.vx) || m.face; m.state = 'move';
    m.play(m.vx ? 'm_run' : 'm_idle', 80);
    m.physics(dt);
  },
  update(sc, dt) {
    const G = sc.goldGob; if (!G || !G.m || G.done) return;
    const m = G.m;
    if (m.glow) m.glow.setPosition(m.x, m.y).setVisible(!m.dead);
    G.sp = (G.sp || 0) - dt;
    if (G.sp <= 0 && !m.dead) { G.sp = 180; sc.fx('hit_spark', m.x + Phaser.Math.Between(-40, 40), m.y - m.z - Phaser.Math.Between(20, 150), { s: 0.16, dur: 320, depth: m.y + 1002, tint: 0xffe070 }); }
    // 맞을 때마다 금화가 튄다
    if (m.hp < G.lastHp) { const n = Math.min(4, 1 + Math.floor((G.lastHp - m.hp) / Math.max(1, m.maxHp * 0.12))); for (let i = 0; i < n; i++) sc.dropPickup(m.x, m.y, 'coin'); G.lastHp = m.hp; }
    if (m.dead) return this.finish(sc, true);
    G.t -= dt;
    if (G.ui) G.ui.setText(`황금 고블린  ${Math.max(0, G.t / 1000).toFixed(1)}초`);
    if (G.t <= 0) this.finish(sc, false);
  },
  finish(sc, caught) {
    const G = sc.goldGob, m = G.m; G.done = true;
    if (G.ui) G.ui.destroy();
    if (m.glow) m.glow.destroy();
    if (caught) {
      sc.floatText(m.x, m.y - 220, '황금 고블린을 잡았다!', '#ffd34d', 40);
      sc.cameras.main.flash(200, 255, 220, 120);
      for (let i = 0; i < 24; i++) sc.dropPickup(m.x, m.y, 'coin');
      sc.dropPickup(m.x, m.y, 'loot', { rar: 2, min: 2 });
      if (Math.random() < 0.35) sc.dropPickup(m.x, m.y, 'loot', { rar: 3, min: 3 });
      sc.dropPickup(m.x, m.y, 'cons');
      SFX.jingle && SFX.jingle('jgl_rank_s');
      const s = sc.save; s.goldGob = (s.goldGob || 0) + 1;
    } else {
      sc.fx('shadow_smoke', m.x, m.y - 80, { s: 0.6, dur: 600, depth: m.y + 1002, tint: 0xffe080 });
      sc.floatText(m.x, m.y - 200, '놓쳤다… 황금 고블린이 사라졌다', '#e8dcc8', 28);
      m.dead = true; m.state = 'dying'; m.releaseTok && m.releaseTok();
      sc.tweens.add({ targets: [m.rig.c, m.shadow], alpha: 0, duration: 250, onComplete: () => m.destroy() });
    }
    sc.time.delayedCall(caught ? 1400 : 700, () => { if (!sc.lock && !sc.won) { sc.bounds = { l: 0, r: STAGE_W }; sc.showGo(); } });
  },
};
