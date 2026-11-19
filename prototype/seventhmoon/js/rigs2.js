// 자동 리그: 잘라 낸 부품 크기(assets/manifest.json)로 관절 위치를 계산한다.
// 손으로 맞춘 1차 리그(rig.js RIGS)의 비율을 일반화한 것. 캐릭터마다 tune으로 덮어쓸 수 있다.
let MAN = {};
const SZ = (tex, n) => { const m = MAN[tex + '/' + n]; return m ? [m.w, m.h] : null; };
const HAS = (tex, n) => !!MAN[tex + '/' + n];

// ---------------- 사람형 ----------------
// o: { h: 화면 키(px), weapon:{img, sc, a, ir}, shield:{img, sc}, frontItem, extra:[...], tune:{...}, headA }
function autoHumanoid(tex, o = {}) {
  const g = n => SZ(tex, n) || SZ(tex, 'torso') || [100, 100];
  const [tw, th] = g('torso'), [pw, ph] = g('pelvis'), [, hh] = g('head');
  const [, uah] = g('upper_arm'), [, fah] = g('forearm'), [, thh] = g('thigh'), [, shh] = g('shin'), [, fth] = g('foot');
  const legSc = o.legSc || 1, armSc = o.armSc || 1, torsoSc = o.torsoSc || 1;
  const p = {
    pelvisA: [0.5, 0.3], waist: [0, -ph * 0.05], torsoA: [0.5, 0.86], torsoSc,
    neck: [tw * 0.06 * torsoSc, -th * 0.75 * torsoSc], headA: o.headA || [0.5, 0.88],
    shoulderB: [tw * 0.07 * torsoSc, -th * 0.63 * torsoSc], shoulderF: [-tw * 0.05 * torsoSc, -th * 0.62 * torsoSc],
    uaA: [0.5, 0.18], uaLen: uah * 0.66 * armSc, faA: [0.5, 0.14], faLen: fah * 0.72 * armSc, handA: [0.2, 0.5], armSc,
    hipB: [pw * 0.09, ph * 0.09], hipF: [-pw * 0.09, ph * 0.09], legSc,
    thA: [0.5, 0.17], thLen: thh * 0.72 * legSc, shA: [0.5, 0.13], shLen: shh * 0.75 * legSc, ftA: [0.3, 0.3],
    gripImg: 'hand_grip', frontHand: HAS(tex, 'hand_open') ? 'hand_open' : 'hand_grip',
  };
  if (!HAS(tex, 'head_shout')) p.headShout = null;
  const raw = hh * 0.88 + th * 0.75 * torsoSc + ph * 0.35 + p.thLen + p.shLen + fth * 0.55;
  p.scale = (o.h || 210) / raw;
  p.height = (o.h || 210) / (p.scale * 0.92);
  p.footY = raw * 0.5;
  if (o.weapon) p.weapon = { at: [4, fah * 0.32 * armSc], a: [0.5, 0.86], ...o.weapon };
  if (o.shield) p.shield = { at: [6, fah * 0.5 * armSc], sc: 1, ...o.shield };
  if (o.frontItem) p.frontItem = { at: [4, fah * 0.3 * armSc], a: [0.5, 0.5], ...o.frontItem };
  if (o.cape) p.cape = { at: [-tw * 0.1, -th * 0.78], a: [0.62, 0.06], ...o.cape };
  Object.assign(p, o.tune || {});
  // 몸에 붙는 장식: 위치를 몸통·골반 크기 비율로 받는다 { n, img, on:'torso'|'root'|'head', at:[fx,fy], a, z, r, sc }
  const ext = [];
  for (const e of o.extra || []) {
    if (!e.raw && !HAS(tex, e.img)) continue;
    const base = e.on === 'root' ? [pw, ph] : e.on === 'head' ? g('head') : [tw, th];
    ext.push({ n: e.n || e.img, p: e.on || 'torso', x: (e.at?.[0] || 0) * base[0], y: (e.at?.[1] || 0) * base[1], img: e.img, ax: e.a?.[0] ?? 0.5, ay: e.a?.[1] ?? 0.2, z: e.z ?? 5, r: e.r || 0, sc: e.sc || 1, ir: e.ir || 0, dark: e.dark, raw: e.raw, hide: e.hide });
  }
  p.extra = ext;
  const def = humanoid(tex, p);
  def.imgAlias = { ...(o.alias || {}) };
  if (!HAS(tex, 'head_shout')) def.imgAlias.head_shout = 'head';
  def.procs = o.procs;
  def.clips = o.clips;
  if (o.hover) def.hover = o.hover;
  if (o.shadow) def.shadow = o.shadow;
  return def;
}

// ---------------- 네발짐승 ----------------
// 뼈 이름을 사람형과 맞춘다: root=뒷몸, torso=앞몸, thf/shf=앞다리(가까운), uaf/faf=앞다리(먼),
// thb/shb=뒷다리(가까운), uab/fab=뒷다리(먼), tail
function quadRig(tex, o = {}) {
  const pre = o.prefix || '';
  const g = n => SZ(tex, pre + n) || [100, 100];
  const [rw, rh] = g('torso_rear'), [fw, fh] = g('torso_front'), [hw, hh] = g('head');
  const L = o.legSc || 0.82;
  let [, fuh] = g('fleg_up'), [, flh] = g('fleg_low'), [, huh] = g('hleg_up'), [, hlh] = g('hleg_low');
  fuh *= L; flh *= L; huh *= L; hlh *= L;
  const BACK = 0xa8a0a0;
  const I = n => pre + n;
  const bones = [
    { n: 'root', img: I('torso_rear'), ax: 0.6, ay: 0.45, z: 40 },
    { n: 'torso', p: 'root', x: rw * 0.3, y: -rh * 0.08, img: I('torso_front'), ax: 0.25, ay: 0.5, z: 45 },
    { n: 'head', p: 'torso', x: fw * 0.55, y: -fh * 0.22, img: I('head'), ax: 0.25, ay: 0.62, z: 60 },
    { n: 'uaf', p: 'torso', x: fw * 0.25, y: fh * 0.18, img: I('fleg_up'), ax: 0.5, ay: 0.15, z: 10, dark: BACK },
    { n: 'faf', p: 'uaf', x: 0, y: fuh * 0.72, img: I('fleg_low'), ax: 0.5, ay: 0.1, z: 11, dark: BACK },
    { n: 'uab', p: 'root', x: -rw * 0.22, y: rh * 0.15, img: I('hleg_up'), ax: 0.5, ay: 0.15, z: 12, dark: BACK },
    { n: 'fab', p: 'uab', x: 0, y: huh * 0.7, img: I('hleg_low'), ax: 0.5, ay: 0.1, z: 13, dark: BACK },
    { n: 'thb', p: 'root', x: -rw * 0.14, y: rh * 0.18, img: I('hleg_up'), ax: 0.5, ay: 0.15, z: 50 },
    { n: 'shb', p: 'thb', x: 0, y: huh * 0.7, img: I('hleg_low'), ax: 0.5, ay: 0.1, z: 51 },
    { n: 'thf', p: 'torso', x: fw * 0.35, y: fh * 0.2, img: I('fleg_up'), ax: 0.5, ay: 0.15, z: 55 },
    { n: 'shf', p: 'thf', x: 0, y: fuh * 0.72, img: I('fleg_low'), ax: 0.5, ay: 0.1, z: 56 },
  ];
  for (const b of bones) if (/^(th|sh|ua|fa)/.test(b.n)) b.sc = L;
  if (HAS(tex, I('tail'))) bones.push({ n: 'tail', p: 'root', x: -rw * 0.42, y: -rh * 0.2, img: I('tail'), ax: 0.9, ay: 0.5, z: 30, ir: o.tailIr ?? 0 });
  for (const e of o.extra || []) bones.push(e);
  const raw = Math.max(rh, fh) * 0.6 + fuh * 0.72 + flh * 0.9;
  const scale = (o.h || 150) / raw;
  return { tex, scale, bones, height: (o.h || 150) / (scale * 0.92), footY: raw * 0.5, imgAlias: { head_shout: I('head_open'), head_blink: I('head') }, clips: QUAD_MAP, procs: [{ n: 'tail', amp: 10, spd: 0.006 }], kindQuad: true, ...(o.def || {}) };
}

// ---------------- 덩어리 (점액·정령) ----------------
function blobRig(tex, o = {}) {
  const [bw, bh] = SZ(tex, o.body || 'body') || [200, 200];
  const bones = [{ n: 'root', img: o.body || 'body', ax: 0.5, ay: 0.95, z: 40 }];
  if (o.face && HAS(tex, o.face)) bones.push({ n: 'head', p: 'root', x: bw * 0.08, y: -bh * 0.55, img: o.face, ax: 0.5, ay: 0.5, z: 60 });
  (o.orbit || []).forEach((img, i) => {
    if (!HAS(tex, img)) return;
    bones.push({ n: 'o' + i, p: 'root', x: 0, y: -bh * 0.5, img: 'px', raw: true, z: 10 + i, hide: true });
    bones.push({ n: 'ob' + i, p: 'o' + i, x: 0, y: bh * (0.55 + (i % 2) * 0.12), img, ax: 0.5, ay: 0.5, z: i % 2 ? 70 : 20 });
  });
  (o.inner || []).forEach((e, i) => { if (HAS(tex, e.img)) bones.push({ n: 'in' + i, p: 'root', x: e.at[0] * bw, y: e.at[1] * bh, img: e.img, ax: 0.5, ay: 0.5, z: 30 + i, sc: e.sc || 1 }); });
  const scale = (o.h || 120) / bh;
  const procs = (o.orbit || []).map((_, i) => ({ n: 'o' + i, amp: 0, spin: 0.08 + i * 0.015, ph: i * 90 }));
  procs.push({ n: 'head', amp: 4, spd: 0.004 });
  return { tex, scale, bones, height: (o.h || 120) / (scale * 0.92), footY: bh * 0.5, imgAlias: { head_shout: o.faceAngry || o.face, head_blink: o.face }, clips: BLOB_MAP, procs, kindBlob: true, hover: o.hover || 0, ...(o.def || {}) };
}

// 마디 하나: 가로로 그린 조각은 그대로, 세로로 그린 조각은 돌려서 사슬 방향(뒤 또는 앞)에 맞춘다
function segBack(tex, n) {
  const [w, h] = SZ(tex, n) || [80, 80];
  return h > w * 1.1 ? { len: h, a: { ax: 0.5, ay: 0.85, ir: -90 } } : { len: w, a: { ax: 0.85, ay: 0.5 } };
}
function segFwd(tex, n) {
  const [w, h] = SZ(tex, n) || [80, 80];
  return h > w * 1.1 ? { len: h, a: { ax: 0.5, ay: 0.85, ir: 90 } } : { len: w, a: { ax: 0.15, ay: 0.6 } };
}

// ---------------- 전갈 (마디 몸 + 꼬리) ----------------
function scorpionRig(tex, o = {}) {
  const g = n => SZ(tex, n) || [80, 80];
  const [b1w, b1h] = g('body_1'), [b0w] = g('body_0'), [b2w] = g('body_2'), [, lh] = g('leg');
  const tails = [0, 1, 2, 3].filter(i => HAS(tex, 'tail_' + i));
  const bones = [
    { n: 'root', img: 'body_1', ax: 0.5, ay: 0.5, z: 40 },
    { n: 'torso', p: 'root', x: b1w * 0.32, y: 0, img: 'body_0', ax: 0.2, ay: 0.5, z: 42 },
    { n: 'head', p: 'torso', x: b0w * 0.6, y: 0, img: 'head', ax: 0.2, ay: 0.55, z: 50 },
    { n: 'rear', p: 'root', x: -b1w * 0.32, y: 0, img: 'body_2', ax: 0.8, ay: 0.5, z: 38 },
    { n: 'uaf', p: 'head', x: 10, y: 20, img: 'claw_arm', ax: 0.2, ay: 0.5, z: 55, ir: 0, r: -10 },
    { n: 'faf', p: 'uaf', x: g('claw_arm')[0] * 0.75, y: 0, img: 'pincer_low', ax: 0.15, ay: 0.4, z: 57, r: 10 },
    { n: 'hf', p: 'uaf', x: g('claw_arm')[0] * 0.75, y: -6, img: 'pincer_up', ax: 0.15, ay: 0.7, z: 58, r: -10 },
  ];
  let parent = 'rear', px = -b2w * 0.62;
  tails.forEach((i, k) => {
    const sg = segBack(tex, 'tail_' + i);
    bones.push({ n: 't' + k, p: parent, x: px, y: k === 0 ? -10 : 0, img: 'tail_' + i, ...sg.a, z: 36 - k, r: k === 0 ? 60 : 30 });
    parent = 't' + k; px = -sg.len * 0.72;
  });
  const stingers = ['stinger', 'stinger_a', 'stinger_b'].filter(n => HAS(tex, n));
  stingers.forEach((s, k) => bones.push({ n: k ? 'st' + k : 'st', p: parent, x: px, y: k * 18, img: s, ...segBack(tex, s).a, z: 34 + k, r: 30 + k * 20 }));
  // 다리 6개 (가까운 3, 먼 3)
  [[-0.35, 'root'], [0.1, 'root'], [0.35, 'torso']].forEach(([fx, p], i) => {
    bones.push({ n: 'lb' + i, p, x: fx * b1w, y: b1h * 0.2, img: 'leg', ax: 0.5, ay: 0.1, z: 10 + i, dark: 0xa09890, r: 20 - i * 15 });
    bones.push({ n: 'lf' + i, p, x: fx * b1w + 10, y: b1h * 0.25, img: 'leg', ax: 0.5, ay: 0.1, z: 60 + i, r: 10 - i * 15 });
  });
  const raw = b1h * 0.5 + lh * 0.9;
  const scale = (o.h || 110) / raw;
  return { tex, scale, bones, height: (o.h || 110) * 1.4 / (scale * 0.92), footY: raw * 0.5, imgAlias: { head_shout: 'head' }, clips: SCORP_MAP, procs: [{ n: 't0', amp: 4, spd: 0.004 }, { n: 'st', amp: 6, spd: 0.006 }], kindScorp: true, ...(o.def || {}) };
}

// ---------------- 거머리 (떠다니는 마디) ----------------
function leechRig(tex, o = {}) {
  const g = n => SZ(tex, n) || [80, 80];
  const [b0w, b0h] = g('body_0'), [b1w] = g('body_1'), [hw] = g('head');
  const bones = [
    { n: 'root', img: 'body_0', ax: 0.5, ay: 0.5, z: 40 },
    { n: 'head', p: 'root', x: b0w * 0.42, y: 0, img: 'head', ax: 0.2, ay: 0.5, z: 50 },
    { n: 'torso', p: 'root', x: -b0w * 0.42, y: 0, img: 'body_1', ax: 0.85, ay: 0.5, z: 38 },
    { n: 'tail', p: 'torso', x: -b1w * 0.75, y: 0, img: 'tail', ax: 0.85, ay: 0.5, z: 36 },
  ];
  const scale = (o.h || 90) / b0h;
  return { tex, scale, bones, height: (o.h || 90) * 1.5 / (scale * 0.92), footY: b0h * 0.5, imgAlias: { head_shout: 'head_open' }, clips: BLOB_MAP, hover: 60, procs: [{ n: 'torso', amp: 14, spd: 0.007 }, { n: 'tail', amp: 20, spd: 0.007, ph: 60 }, { n: 'head', amp: 6, spd: 0.007, ph: -40 }], ...(o.def || {}) };
}

// ---------------- 와이번·용 (목·날개·꼬리) ----------------
function wyrmRig(tex, o = {}) {
  const g = n => SZ(tex, n) || [100, 100];
  const [tw, th] = g('torso');
  const necks = ['neck', 'neck_0', 'neck_1', 'neck_2'].filter(n => HAS(tex, n));
  const tails = ['tail_0', 'tail_1', 'tail_2', 'tail_tip'].filter(n => HAS(tex, n));
  const bones = [{ n: 'root', img: HAS(tex, 'hips') ? 'hips' : 'torso', ax: 0.5, ay: 0.5, z: 40 }];
  let body = 'root';
  if (HAS(tex, 'hips')) { bones.push({ n: 'torso', p: 'root', x: g('hips')[0] * 0.35, y: -th * 0.1, img: 'torso', ax: 0.25, ay: 0.55, z: 45 }); body = 'torso'; }
  let parent = body, px = tw * 0.4, py = -th * 0.3;
  necks.forEach((n, k) => {
    const sg = segFwd(tex, n);
    bones.push({ n: k ? 'neck' + k : 'neck', p: parent, x: px, y: py, img: n, ...sg.a, z: 48 + k, r: necks.length > 1 ? (k === 0 ? -30 : 18) : -30 });
    parent = k ? 'neck' + k : 'neck'; px = sg.len * 0.75; py = 0;
  });
  bones.push({ n: 'head', p: parent, x: px, y: 0, img: 'head', ax: 0.2, ay: 0.6, z: 60, r: necks.length > 1 ? 10 : 30 });
  if (HAS(tex, 'jaw')) bones.push({ n: 'jaw', p: 'head', x: 10, y: g('head')[1] * 0.25, img: 'jaw', ax: 0.15, ay: 0.3, z: 59 });
  if (HAS(tex, 'ring')) bones.push({ n: 'ring', p: 'head', x: -g('head')[0] * 0.1, y: -20, img: 'ring', ax: 0.5, ay: 0.5, z: 5, sc: 0.6 });
  // 날개 (먼 쪽은 어둡게)
  for (const [n, z, dk] of [['wb', 8, 0x9890a0], ['wf', 70, null]]) {
    bones.push({ n, p: body, x: -tw * 0.05, y: -th * 0.35, img: 'wing_arm', ax: 0.1, ay: 0.5, z, r: -50, dark: dk || undefined });
    bones.push({ n: n + 'm', p: n, x: 0, y: 0, img: 'wing_mem', ax: 0.1, ay: 0.15, z: z - 1, r: 30, dark: dk || undefined });
  }
  // 다리
  if (HAS(tex, 'fleg_up')) {
    bones.push({ n: 'uaf', p: body, x: tw * 0.25, y: th * 0.3, img: 'fleg_up', ax: 0.5, ay: 0.15, z: 20, dark: 0xa098a0 });
    bones.push({ n: 'faf', p: 'uaf', x: 0, y: g('fleg_up')[1] * 0.72, img: 'fleg_low', ax: 0.5, ay: 0.1, z: 21, dark: 0xa098a0 });
    bones.push({ n: 'thf', p: body, x: tw * 0.32, y: th * 0.32, img: 'fleg_up', ax: 0.5, ay: 0.15, z: 62 });
    bones.push({ n: 'shf', p: 'thf', x: 0, y: g('fleg_up')[1] * 0.72, img: 'fleg_low', ax: 0.5, ay: 0.1, z: 63 });
  }
  const hu = HAS(tex, 'hleg_up') ? 'hleg_up' : 'thigh', hl = HAS(tex, 'hleg_low') ? 'hleg_low' : 'shin';
  bones.push({ n: 'uab', p: 'root', x: -g('root' === 'root' && HAS(tex, 'hips') ? 'hips' : 'torso')[0] * 0.15, y: th * 0.25, img: hu, ax: 0.5, ay: 0.15, z: 22, dark: 0xa098a0 });
  bones.push({ n: 'fab', p: 'uab', x: 0, y: g(hu)[1] * 0.72, img: hl, ax: 0.5, ay: 0.1, z: 23, dark: 0xa098a0 });
  bones.push({ n: 'thb', p: 'root', x: -g(HAS(tex, 'hips') ? 'hips' : 'torso')[0] * 0.05, y: th * 0.3, img: hu, ax: 0.5, ay: 0.15, z: 64 });
  bones.push({ n: 'shb', p: 'thb', x: 0, y: g(hu)[1] * 0.72, img: hl, ax: 0.5, ay: 0.1, z: 65 });
  parent = 'root'; px = -g(HAS(tex, 'hips') ? 'hips' : 'torso')[0] * 0.42; py = -10;
  tails.forEach((n, k) => {
    const sg = segBack(tex, n);
    bones.push({ n: 'tl' + k, p: parent, x: px, y: py, img: n, ...sg.a, z: 30 - k, r: k === 0 ? -15 : -8 });
    parent = 'tl' + k; px = -sg.len * 0.75; py = 0;
  });
  const legH = g(hu)[1] * 0.72 + g(hl)[1] * 0.85;
  const raw = th * 0.6 + legH;
  const scale = (o.h || 300) / raw;
  return { tex, scale, bones, height: (o.h || 300) * 1.2 / (scale * 0.92), footY: raw * 0.5, imgAlias: { head_shout: HAS(tex, 'head_open') ? 'head_open' : 'head' }, clips: WYRM_MAP, hover: o.hover || 0, kindWyrm: true,
    procs: [{ n: 'wf', amp: 22, spd: 0.009 }, { n: 'wb', amp: 22, spd: 0.009, ph: 20 }, { n: 'tl0', amp: 6, spd: 0.004 }, { n: 'tl1', amp: 8, spd: 0.004, ph: 40 }, { n: 'tl2', amp: 10, spd: 0.004, ph: 80 }, { n: 'ring', spin: 0.02 }], ...(o.def || {}) };
}

// ---------------- 거인 상반신 (흐림가르: 땅에서 솟은 몸) ----------------
function giantRig(tex, o = {}) {
  const g = n => SZ(tex, n) || [150, 150];
  const [bw, bh] = g('base'), [tw, th] = g('torso'), [, uah] = g('upper_arm'), [, fah] = g('forearm'), [, hh] = g('head');
  const bones = [
    { n: 'root', img: 'base', ax: 0.5, ay: 0.7, z: 90 },
    { n: 'torso', p: 'root', x: 0, y: -bh * 0.3, img: 'torso', ax: 0.5, ay: 0.9, z: 50 },
    { n: 'head', p: 'torso', x: tw * 0.05, y: -th * 0.78, img: 'head', ax: 0.5, ay: 0.85, z: 70 },
    { n: 'uab', p: 'torso', x: tw * 0.32, y: -th * 0.68, img: 'upper_arm', ax: 0.5, ay: 0.16, z: 20, dark: 0xa8b0c0 },
    { n: 'fab', p: 'uab', x: 0, y: uah * 0.68, img: 'forearm', ax: 0.5, ay: 0.12, z: 21, dark: 0xa8b0c0 },
    { n: 'hb', p: 'fab', x: 0, y: fah * 0.75, img: 'hand_grip', ax: 0.5, ay: 0.3, z: 22, dark: 0xa8b0c0 },
    { n: 'uaf', p: 'torso', x: -tw * 0.3, y: -th * 0.66, img: 'upper_arm', ax: 0.5, ay: 0.16, z: 80 },
    { n: 'faf', p: 'uaf', x: 0, y: uah * 0.68, img: 'forearm', ax: 0.5, ay: 0.12, z: 81 },
    { n: 'hf', p: 'faf', x: 0, y: fah * 0.75, img: HAS(tex, 'hand_open') ? 'hand_open' : 'hand_grip', ax: 0.5, ay: 0.3, z: 82 },
  ];
  if (HAS(tex, 'spikes')) bones.push({ n: 'shoulder', p: 'torso', x: -tw * 0.28, y: -th * 0.85, img: 'spikes', ax: 0.5, ay: 0.6, z: 85 });
  const raw = bh * 0.7 + bh * 0.3 + th * 0.9 + hh * 0.85;
  const scale = (o.h || 420) / raw;
  return { tex, scale, bones, height: (o.h || 420) / (scale * 0.92), footY: raw * 0.5, imgAlias: {}, clips: GIANT_MAP, procs: [], ground: ['root'], ...(o.def || {}) };
}
