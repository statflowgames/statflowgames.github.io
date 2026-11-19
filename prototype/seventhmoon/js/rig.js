// 컷아웃 리그: 부품 그림을 뼈대에 붙여 코드로 움직인다.
// 좌표 단위는 assets/ 부품 픽셀(원화 0.5배). 각 뼈의 로컬 축은 +y가 "팔다리가 뻗는 방향(아래)"이다.
// 각도는 도(deg), 화면 기준 시계 방향이 +. 오른쪽을 보는 캐릭터의 팔을 앞으로 들면 음수다.

const D2R = Math.PI / 180;

class Rig {
  constructor(scene, def) {
    this.scene = scene;
    this.def = def;
    this.c = scene.add.container(0, 0);
    this.bones = [];
    this.map = {};
    this.flash = 0;
    for (const b of def.bones) {
      const tex = b.raw ? b.img : def.tex + '/' + b.img;
      const s = scene.add.image(0, 0, tex);
      s.setOrigin(b.ax ?? 0.5, b.ay ?? 0.5);
      if (b.dark) s.setTint(b.dark);
      const bone = { ...b, spr: s, wx: 0, wy: 0, wr: 0, baseTint: b.dark || 0xffffff };
      bone.sc = b.sc || 1;
      s.setScale(bone.sc);
      if (b.hide) s.setVisible(false);
      this.bones.push(bone);
      this.map[b.n] = bone;
    }
    const sorted = [...this.bones].sort((a, b) => a.z - b.z);
    for (const b of sorted) this.c.add(b.spr);
    this.c.setScale(def.scale);
    this.pose = {};
  }
  setImg(n, img) {
    const b = this.map[n];
    if (!b || b.cur === img) return;
    b.cur = img;
    let k = img || b.img;
    if (this.def.imgAlias && img && this.def.imgAlias[img] !== undefined) k = this.def.imgAlias[img] || b.img;
    let key = k.includes('/') ? k : this.def.tex + '/' + k;
    if (!this.scene.textures.exists(key)) key = b.raw ? b.img : this.def.tex + '/' + b.img;
    b.spr.setTexture(key);
  }
  measure(pose) {
    // 서 있는 자세에서 발바닥까지의 거리(컨테이너 로컬 픽셀)
    this.apply(pose);
    this.foot = this.lowest();
    return this.foot;
  }
  // 지금 자세에서 몸(무기·망토 제외)의 가장 낮은 점. 컨테이너 로컬 y.
  lowest(groundBones) {
    return this.bodyBounds(groundBones).bottom - 3;
  }
  bodyBounds(groundBones) {
    const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
    const only = groundBones || this.def.ground;
    for (const b of this.bones) {
      if (!b.spr.visible || (only ? !only.includes(b.n) : NO_GROUND.has(b.n))) continue;
      const s = b.spr, w = s.width * s.scaleX, h = s.height * s.scaleY;
      const cos = Math.cos(s.rotation), sin = Math.sin(s.rotation);
      for (const [u, v] of CORNERS) {
        const lx = (u - s.originX) * w, ly = (v - s.originY) * h;
        const x = s.x + lx * cos - ly * sin;
        const y = s.y + lx * sin + ly * cos;
        bounds.left = Math.min(bounds.left, x); bounds.right = Math.max(bounds.right, x);
        bounds.top = Math.min(bounds.top, y); bounds.bottom = Math.max(bounds.bottom, y);
      }
    }
    return bounds;
  }
  setVisible(n, v) { if (this.map[n]) this.map[n].spr.setVisible(v); }
  apply(p) {
    if (this.preparePose) p = this.preparePose(p);
    // p: {뼈이름: 각도, rx, ry, rr(몸 전체 회전), sx(좌우 스케일 보정)}
    const torsoTurn = 1 - Math.abs(p.bodyTwist || 0) * 0.06;
    for (const b of this.bones) {
      let px, py, pr;
      if (!b.p) {
        px = (p.rx || 0) + (p.hipX || 0); py = (p.ry || 0) + (p.hipY || 0); pr = (p.rr || 0) * D2R;
      } else {
        const P = this.map[b.p];
        const cos = Math.cos(P.wr), sin = Math.sin(P.wr);
        // 상체의 체중 이동은 골반·접지 발과 분리한다. 지정하지 않은 기존 리그는 동일.
        // 어깨를 따로 좌우로 밀지 않는다. 몸통 그림의 회전에 맞춰 같은 부착점을 유지.
        const ox = (b.x || 0) * (b.p === 'torso' ? torsoTurn : 1) + (b.n === 'torso' ? (p.bodyX || 0) : 0);
        const oy = (b.y || 0) + (b.n === 'torso' ? (p.bodyY || 0) : 0);
        px = P.wx + ox * cos - oy * sin;
        py = P.wy + ox * sin + oy * cos;
        pr = P.wr;
      }
      b.wx = px; b.wy = py;
      if (b.abs) pr = this.map.root.wr;   // 발: 다리 각도와 상관없이 몸 기준으로 수평 유지
      b.wr = pr + ((b.r || 0) + (p[b.n] || 0)) * D2R;
      b.spr.setPosition(px, py);
      b.spr.setRotation(b.wr + (b.ir || 0) * D2R);
      if (b.n === 'torso') b.spr.setScale(b.sc * torsoTurn, b.sc);
    }
    if (this.finishPose) this.finishPose(p);
  }
  setFlash(on, color = 0xffffff) {
    for (const b of this.bones) {
      if (on) b.spr.setTintFill(color);
      else { b.spr.clearTint(); if (b.baseTint !== 0xffffff) b.spr.setTint(b.baseTint); }
    }
  }
  setTintAll(color) {
    for (const b of this.bones) b.spr.setTint(color === null ? b.baseTint : mulTint(b.baseTint, color));
  }
  worldOf(n, lx = 0, ly = 0) {
    // 뼈 로컬 좌표 → 컨테이너 바깥(장면) 좌표
    const b = this.map[n];
    const cos = Math.cos(b.wr), sin = Math.sin(b.wr);
    const x = b.wx + lx * cos - ly * sin, y = b.wy + lx * sin + ly * cos;
    return { x: this.c.x + x * this.c.scaleX, y: this.c.y + y * this.c.scaleY };
  }
  imagePoint(n, u, v) {
    const b = this.map[n], s = b.spr;
    const lx = (u - s.originX) * s.width * s.scaleX, ly = (v - s.originY) * s.height * s.scaleY;
    const cos = Math.cos(s.rotation), sin = Math.sin(s.rotation);
    return { x: this.c.x + (s.x + lx * cos - ly * sin) * this.c.scaleX,
      y: this.c.y + (s.y + lx * sin + ly * cos) * this.c.scaleY };
  }
  destroy() { this.c.destroy(); }
}

// 땅에 닿는 판정에서 빼는 부위 (무기, 방패, 망토, 장식)
const NO_GROUND = new Set(['wpn', 'shd', 'cape', 'fitem', 'quiver', 'neck', 'shoulder']);
// 부품 사각형 모서리를 살짝 안쪽으로 잡는다 (투명 여백과 둥근 끝 감안)
const CORNERS = [[0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85], [0.5, 0.97], [0.03, 0.5], [0.97, 0.5]];

function mulTint(a, b) {
  const r = ((a >> 16) & 255) * ((b >> 16) & 255) / 255;
  const g = ((a >> 8) & 255) * ((b >> 8) & 255) / 255;
  const bl = (a & 255) * (b & 255) / 255;
  return (r << 16) | (g << 8) | bl;
}

// ---------------------------------------------------------------------------
// 사람형 뼈대 템플릿. o의 값으로 종족마다 관절 위치를 맞춘다.
// 그리는 순서: 망토 < 뒷팔(무기) < 뒷다리 < 앞다리 < 골반 < 몸통 < 머리 < 앞팔
// ---------------------------------------------------------------------------
function humanoid(tex, o) {
  const BACK = o.backTint ?? 0xb8b0a8;
  const bones = [
    { n: 'root', img: o.pelvisImg || 'pelvis', ax: o.pelvisA[0], ay: o.pelvisA[1], z: 50 },
    { n: 'torso', sc: o.torsoSc, p: 'root', x: o.waist[0], y: o.waist[1], img: o.torsoImg || 'torso', ax: o.torsoA[0], ay: o.torsoA[1], z: 60 },
    { n: 'head', p: 'torso', x: o.neck[0], y: o.neck[1], img: 'head', ax: o.headA[0], ay: o.headA[1], z: 70 },
    // 뒷팔 (무기 든 손)
    { n: 'uab', sc: o.armSc, p: 'torso', x: o.shoulderB[0], y: o.shoulderB[1], img: 'upper_arm', ax: o.uaA[0], ay: o.uaA[1], z: 12, dark: BACK },
    { n: 'fab', sc: o.armSc, p: 'uab', x: 0, y: o.uaLen, img: 'forearm', ax: o.faA[0], ay: o.faA[1], z: 13, dark: BACK },
    { n: 'hb', sc: o.armSc, p: 'fab', x: 0, y: o.faLen, img: o.gripImg || 'hand_grip', ax: o.handA[0], ay: o.handA[1], ir: o.handIr ?? 90, z: 15, dark: BACK },
    // 뒷다리
    { n: 'thb', sc: o.legSc, p: 'root', x: o.hipB[0], y: o.hipB[1], img: 'thigh', ax: o.thA[0], ay: o.thA[1], z: 20, dark: BACK },
    { n: 'shb', sc: o.legSc, p: 'thb', x: 0, y: o.thLen, img: 'shin', ax: o.shA[0], ay: o.shA[1], z: 21, dark: BACK },
    { n: 'ftb', abs: true, sc: o.legSc, p: 'shb', x: 0, y: o.shLen, img: 'foot', ax: o.ftA[0], ay: o.ftA[1], z: 22, dark: BACK },
    // 앞다리
    { n: 'thf', sc: o.legSc, p: 'root', x: o.hipF[0], y: o.hipF[1], img: 'thigh', ax: o.thA[0], ay: o.thA[1], z: 40 },
    { n: 'shf', sc: o.legSc, p: 'thf', x: 0, y: o.thLen, img: 'shin', ax: o.shA[0], ay: o.shA[1], z: 41 },
    { n: 'ftf', abs: true, sc: o.legSc, p: 'shf', x: 0, y: o.shLen, img: 'foot', ax: o.ftA[0], ay: o.ftA[1], z: 42 },
    // 앞팔
    { n: 'uaf', sc: o.armSc, p: 'torso', x: o.shoulderF[0], y: o.shoulderF[1], img: 'upper_arm', ax: o.uaA[0], ay: o.uaA[1], z: 80 },
    { n: 'faf', sc: o.armSc, p: 'uaf', x: 0, y: o.uaLen, img: 'forearm', ax: o.faA[0], ay: o.faA[1], z: 81 },
    { n: 'hf', sc: o.armSc, p: 'faf', x: 0, y: o.faLen, img: o.frontHand || 'hand_open', ax: o.handA[0], ay: o.handA[1], ir: o.handIr ?? 90, z: 83 },
  ];
  if (o.cape) bones.push({ n: 'cape', p: 'torso', x: o.cape.at[0], y: o.cape.at[1], img: 'cape', ax: o.cape.a[0], ay: o.cape.a[1], z: 2 });
  if (o.weapon) bones.push({ n: 'wpn', p: 'hb', x: o.weapon.at[0], y: o.weapon.at[1], img: o.weapon.img, ax: o.weapon.a[0], ay: o.weapon.a[1], ir: o.weapon.ir ?? 90, sc: o.weapon.sc, z: 14 });
  if (o.shield) bones.push({ n: 'shd', p: 'faf', x: o.shield.at[0], y: o.shield.at[1], img: o.shield.img, ax: 0.5, ay: 0.5, sc: o.shield.sc, z: 85 });
  if (o.frontItem) bones.push({ n: 'fitem', p: 'hf', x: o.frontItem.at[0], y: o.frontItem.at[1], img: o.frontItem.img, ax: o.frontItem.a[0], ay: o.frontItem.a[1], ir: o.frontItem.ir ?? 90, sc: o.frontItem.sc, z: 82 });
  if (o.extra) for (const e of o.extra) bones.push(e);
  return { tex, scale: o.scale, bones, footY: o.footY, height: o.height, clips: o.clips };
}

// 부품 시트에서 잘라 낸 그림 기준으로 관절 위치를 잡은 값들 (rig-view로 확인하며 조정)
const RIGS = {
  warrior: () => humanoid('warrior', {
    scale: 0.5, footY: 238, height: 470,
    pelvisA: [0.5, 0.28], waist: [2, -4], torsoA: [0.5, 0.88], neck: [8, -92], headA: [0.42, 0.9],
    shoulderB: [8, -78], shoulderF: [-8, -76],
    uaA: [0.5, 0.2], uaLen: 62, faA: [0.5, 0.15], faLen: 66, handA: [0.18, 0.5],
    hipB: [10, 8], hipF: [-12, 8], thA: [0.5, 0.18], thLen: 82, shA: [0.5, 0.12], shLen: 92, ftA: [0.32, 0.28],
    cape: { at: [-14, -96], a: [0.62, 0.06] },
    weapon: { img: 'weapon_0', at: [4, 30], a: [0.5, 0.86], sc: 1.45 },
    shield: { img: 'shield_0', at: [6, 46], sc: 1.75 },
    gripImg: 'hand_grip', frontHand: 'hand_grip',
  }),
  grunt: () => humanoid('grunt', {
    clips: { m_down: 'gob_down', m_getup: 'gob_getup' },
    scale: 0.36, footY: 252, height: 520,
    pelvisA: [0.5, 0.3], waist: [0, -6], torsoA: [0.45, 0.86], neck: [10, -90], headA: [0.6, 0.86],
    shoulderB: [10, -74], shoulderF: [-6, -72],
    uaA: [0.5, 0.18], uaLen: 82, faA: [0.5, 0.14], faLen: 86, handA: [0.2, 0.5],
    hipB: [12, 14], hipF: [-12, 14], thA: [0.5, 0.18], thLen: 96, shA: [0.5, 0.14], shLen: 100, ftA: [0.25, 0.3],
    weapon: { img: 'dagger', at: [6, 34], a: [0.5, 0.85], sc: 1.0 },
    frontHand: 'hand_open',
  }),
  spear: () => humanoid('spear', {
    clips: { m_down: 'gob_down', m_getup: 'gob_getup' },
    scale: 0.38, footY: 240, height: 500,
    pelvisA: [0.5, 0.3], waist: [0, -6], torsoA: [0.45, 0.86], neck: [10, -92], headA: [0.55, 0.86],
    shoulderB: [10, -80], shoulderF: [-6, -78],
    uaA: [0.5, 0.18], uaLen: 80, faA: [0.5, 0.14], faLen: 80, handA: [0.2, 0.5],
    hipB: [12, 14], hipF: [-12, 14], thA: [0.5, 0.18], thLen: 92, shA: [0.5, 0.14], shLen: 94, ftA: [0.25, 0.35],
    weapon: { img: 'javelin', at: [4, 30], a: [0.5, 0.62], sc: 0.75 },
    frontHand: 'hand_open',
    extra: [{ n: 'quiver', p: 'torso', x: -40, y: -70, img: 'quiver', ax: 0.5, ay: 0.4, z: 4, r: -20, sc: 0.8 }],
  }),
  shaman: () => humanoid('shaman', {
    clips: { m_down: 'gob_down', m_getup: 'gob_getup' },
    scale: 0.6, footY: 160, height: 330,
    pelvisA: [0.5, 0.3], waist: [0, -4], torsoA: [0.45, 0.86], neck: [6, -58], headA: [0.6, 0.86],
    shoulderB: [6, -48], shoulderF: [-4, -46],
    uaA: [0.5, 0.18], uaLen: 54, faA: [0.5, 0.14], faLen: 56, handA: [0.2, 0.5],
    hipB: [8, 10], hipF: [-8, 10], thA: [0.5, 0.18], thLen: 62, shA: [0.5, 0.14], shLen: 62, ftA: [0.25, 0.32],
    weapon: { img: 'staff', at: [4, 26], a: [0.5, 0.55], sc: 1.0, ir: 0 },
    frontHand: 'hand_open',
    extra: [{ n: 'neck', p: 'torso', x: 6, y: -50, img: 'necklace', ax: 0.5, ay: 0.15, z: 75, sc: 0.75 }],
  }),
  barkhaul: () => humanoid('barkhaul', {
    scale: 0.62, footY: 420, height: 620,
    pelvisA: [0.5, 0.3], waist: [0, -6], torsoA: [0.5, 0.84], torsoSc: 1.15, neck: [24, -150], headA: [0.42, 0.82],
    shoulderB: [34, -124], shoulderF: [-30, -120],
    uaA: [0.5, 0.16], uaLen: 128, faA: [0.5, 0.12], faLen: 120, handA: [0.25, 0.5],
    hipB: [46, 34], hipF: [-46, 34], legSc: 0.7, thA: [0.5, 0.14], thLen: 140, shA: [0.5, 0.12], shLen: 134, ftA: [0.4, 0.2],
    weapon: { img: 'club', at: [6, 40], a: [0.5, 0.85], sc: 1.05 },
    frontHand: 'hand_open', backTint: 0xa8a8a0, clips: { m_walk: 'b_walk' },
    extra: [{ n: 'shoulder', p: 'torso', x: -26, y: -150, img: 'shoulder', ax: 0.5, ay: 0.6, z: 86 }],
  }),
};
