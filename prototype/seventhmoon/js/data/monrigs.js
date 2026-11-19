// 몬스터·보스 리그 등록. 부품이 없으면 등록하지 않아 campaign.js의 대역(stand-in)을 쓴다.
// h: 화면에서 서 있는 키(px). 1장 그롤린 졸개가 약 175px, 하르반 약 215px.
const WING_FLAP = n => ({ n, amp: 18, spd: 0.012 });
const MON_RIGS = {
  ratkin_blade: () => autoHumanoid('ratkin_blade', { h: 178, weapon: { img: 'blade', sc: 1.0 }, extra: [{ img: 'tail_0', on: 'root', at: [-0.35, 0.15], a: [0.9, 0.3], z: 3, r: 20 }], procs: [{ n: 'tail_0', amp: 8, spd: 0.006 }] }),
  ratkin_xbow: () => autoHumanoid('ratkin_xbow', { h: 175, weapon: { img: 'crossbow', a: [0.5, 0.6], sc: 1.0 }, extra: [{ img: 'tail_0', on: 'root', at: [-0.35, 0.15], a: [0.9, 0.3], z: 3, r: 20 }], procs: [{ n: 'tail_0', amp: 8, spd: 0.006 }] }),
  pirate: () => autoHumanoid('pirate', { h: 205, weapon: { img: 'bottle', a: [0.5, 0.8], sc: 1.0 } }),
  mummy: () => autoHumanoid('mummy', { h: 232, weapon: { img: 'sword', sc: 1.0 }, extra: [{ img: 'bandage', on: 'torso', at: [-0.2, -0.3], a: [0.5, 0.05], z: 4 }], procs: [{ n: 'bandage', amp: 10, spd: 0.005 }] }),
  skeleton_archer: () => autoHumanoid('skeleton_archer', { h: 205, frontItem: { img: 'bow', a: [0.5, 0.5], sc: 1.0, ir: 0 } }),
  snakeman: () => autoHumanoid('snakeman', { h: 225, weapon: { img: 'spear', a: [0.5, 0.6], sc: 1.0 }, extra: [{ img: 'tail_0', on: 'root', at: [-0.3, 0.2], a: [0.9, 0.3], z: 3, r: 30 }], procs: [{ n: 'tail_0', amp: 10, spd: 0.005 }] }),
  snow_brute: () => autoHumanoid('snow_brute', { h: 285, shadow: 1.8 }),
  dwarf_miner: () => autoHumanoid('dwarf_miner', { h: 172, weapon: { img: 'pickaxe', sc: 1.0 }, extra: [{ img: 'barrel', on: 'torso', at: [-0.38, -0.55], a: [0.5, 0.4], z: 3 }] }),
  gargoyle: () => autoHumanoid('gargoyle', { h: 225, extra: [{ n: 'wing', img: 'wing_up', on: 'torso', at: [-0.15, -0.7], a: [0.85, 0.75], z: 2 }, { img: 'tail', on: 'root', at: [-0.35, 0.1], a: [0.9, 0.3], z: 3 }], procs: [WING_FLAP('wing'), { n: 'tail', amp: 8, spd: 0.005 }] }),
  construct: () => autoHumanoid('construct', { h: 245, shield: { img: 'shield', sc: 1.0 }, alias: {}, extra: [] }),
  harpy: () => autoHumanoid('harpy', { h: 212, extra: [{ n: 'wing', img: 'wing_up', on: 'torso', at: [-0.1, -0.7], a: [0.85, 0.8], z: 2 }], procs: [{ n: 'wing', amp: 26, spd: 0.016 }], hover: 40 }),
  cultist: () => autoHumanoid('cultist', { h: 212, frontItem: { img: 'orb', a: [0.5, 0.5], sc: 0.9, ir: 0 }, extra: [{ img: 'skirt', on: 'root', at: [0, 0.05], a: [0.5, 0.12], z: 45 }] }),
  shadow_knight: () => autoHumanoid('shadow_knight', { h: 252, weapon: { img: 'sword', sc: 1.0 }, shield: { img: 'shield', sc: 1.0 } }),
  imp: () => autoHumanoid('imp', { h: 140, extra: [{ n: 'wingi', img: 'wing', on: 'torso', at: [-0.1, -0.7], a: [0.85, 0.8], z: 2 }, { img: 'tail', on: 'root', at: [-0.35, 0.1], a: [0.9, 0.3], z: 3 }], procs: [{ n: 'wingi', amp: 24, spd: 0.02 }, { n: 'tail', amp: 12, spd: 0.006 }], hover: 30 }),
  wolf: () => quadRig('wolf', { h: 118 }),
  frostwolf: () => quadRig('frostwolf', { h: 140 }),
  hound: () => quadRig('hound', { h: 140 }),
  slime: () => blobRig('slime', { h: 110, face: 'eyes', inner: [{ img: 'bones', at: [-0.1, -0.4], sc: 0.8 }] }),
  ice_spirit: () => blobRig('ice_spirit', { h: 90, body: 'core', orbit: ['shard_l', 'shard_m', 'shard_s', 'shard_c'], hover: 60, def: { imgAlias: { head_shout: 'core_crack' } } }),
  scorpion: () => scorpionRig('scorpion', { h: 62 }),
  leech: () => leechRig('leech', { h: 80 }),
  // ---- 보스 ----
  toothcrusher: () => toothRig(),
  toothcrusher_rider: () => autoHumanoid('toothcrusher', { h: 200, weapon: { img: 'cleaver', sc: 1.0 }, extra: [{ img: 'crown', on: 'head', at: [0, -0.45], a: [0.5, 0.9], z: 75 }] }),
  captain_mog: () => autoHumanoid('captain_mog', { h: 310, weapon: { img: 'cutlass', sc: 1.0 }, frontItem: { img: 'hook', a: [0.5, 0.2], sc: 1.0, ir: 0 }, extra: [{ img: 'coat_tail', on: 'root', at: [-0.2, 0], a: [0.6, 0.1], z: 3 }, { img: 'cannon', on: 'torso', at: [-0.4, -0.6], a: [0.5, 0.5], z: 2 }], shadow: 2 }),
  gloob: () => blobRig('gloob', { h: 240, face: 'face_calm', faceAngry: 'face_angry', inner: [{ img: 'crown', at: [0, -0.62], sc: 1 }, { img: 'junk_barrel', at: [-0.25, -0.3], sc: 0.8 }, { img: 'junk_boot', at: [0.25, -0.2], sc: 0.8 }], def: { shadow: 2.6 } }),
  twinsting: () => scorpionRig('twinsting', { h: 120, def: { shadow: 2.4 } }),
  sehera: () => autoHumanoid('sehera', { h: 300, weapon: { img: 'scepter', a: [0.5, 0.7], sc: 1.0 }, extra: [{ img: 'skirt', on: 'root', at: [0, 0.05], a: [0.5, 0.1], z: 45 }, { n: 'ring', img: 'sand_ring', on: 'root', at: [0, -0.6], a: [0.5, 0.5], z: 1 }], procs: [{ n: 'ring', spin: 0.03 }], shadow: 2 }),
  frost_wyvern: () => wyrmRig('frost_wyvern', { h: 160, hover: 70, def: { shadow: 2.6 } }),
  hrimgar: () => giantRig('hrimgar', { h: 400, def: { shadow: 3 } }),
  golem7: () => autoHumanoid('golem7', { h: 330, extra: [{ img: 'core', on: 'torso', at: [0, -0.5], a: [0.5, 0.5], z: 75 }, { img: 'shoulder', on: 'torso', at: [-0.25, -0.85], a: [0.5, 0.6], z: 86 }], shadow: 2.2 }),
  orvex: () => orvexRig('orvex', true),
  orvex_eclipse: () => orvexRig('orvex_eclipse', false),
  azmal: () => wyrmRig('azmal', { h: 250, def: { shadow: 3.4 } }),
  void_shadow: () => autoHumanoid('void_shadow', { h: 270, shadow: 1.6 }),
};
function orvexRig(tex, moons) {
  const extra = [{ img: 'skirt', on: 'root', at: [0, 0.05], a: [0.5, 0.1], z: 45 }, { img: 'beard', on: 'head', at: [0.15, 0.1], a: [0.4, 0.1], z: 72 }];
  const procs = [];
  if (moons) for (let i = 0; i < 6; i++) {
    extra.push({ n: 'mp' + i, img: 'px', raw: true, hide: true, on: 'torso', at: [0, -0.6], z: 1 });
    extra.push({ n: 'mb' + i, img: 'moon_' + i, on: 'mp' + i, at: [1.1, 0], a: [0.5, 0.5], z: i % 2 ? 90 : 2, sc: 0.8 });
    procs.push({ n: 'mp' + i, spin: 0.05, ph: i * 60 });
  } else {
    extra.push({ n: 'halo', img: 'halo', on: 'head', at: [-0.1, -0.2], a: [0.5, 0.5], z: 1 });
    procs.push({ n: 'halo', spin: 0.02 });
  }
  return autoHumanoid(tex, { h: tex === 'orvex' ? 265 : 280, weapon: { img: 'staff', a: [0.5, 0.6], sc: 1.0 }, extra, procs, shadow: 1.6 });
}
// 이빨부숴: 전투멧돼지(네발) 위에 그롤린 대장이 탄다. 체력이 반이 되면 떨어져 따로 싸운다.
function toothRig() {
  const def = quadRig('toothcrusher', { h: 150, prefix: 'boar_', legSc: 0.62 });
  const g = n => SZ('toothcrusher', n) || [100, 100];
  const [fw, fh] = g('boar_torso_front'), [, th] = g('torso');
  const R = 0xffffff;
  const add = b => def.bones.push(b);
  if (HAS('toothcrusher', 'boar_saddle')) add({ n: 'saddle', p: 'torso', x: -fw * 0.1, y: -fh * 0.42, img: 'boar_saddle', ax: 0.5, ay: 0.6, z: 70 });
  if (HAS('toothcrusher', 'pelvis')) {
    add({ n: 'r_root', p: 'torso', x: -fw * 0.1, y: -fh * 0.55, img: 'pelvis', ax: 0.5, ay: 0.6, z: 72 });
    add({ n: 'r_thigh', p: 'r_root', x: -6, y: 10, img: 'thigh', ax: 0.5, ay: 0.15, z: 74, r: -70 });
    add({ n: 'r_shin', p: 'r_thigh', x: 0, y: g('thigh')[1] * 0.72, img: 'shin', ax: 0.5, ay: 0.12, z: 75, r: 80 });
    add({ n: 'r_torso', p: 'r_root', x: 0, y: -4, img: 'torso', ax: 0.5, ay: 0.86, z: 76 });
    add({ n: 'r_head', p: 'r_torso', x: 6, y: -th * 0.75, img: 'head', ax: 0.5, ay: 0.88, z: 80 });
    add({ n: 'r_crown', p: 'r_head', x: 0, y: -g('head')[1] * 0.45, img: 'crown', ax: 0.5, ay: 0.9, z: 81 });
    add({ n: 'r_arm', p: 'r_torso', x: 4, y: -th * 0.62, img: 'upper_arm', ax: 0.5, ay: 0.18, z: 84, r: -40 });
    add({ n: 'r_fore', p: 'r_arm', x: 0, y: g('upper_arm')[1] * 0.66, img: 'forearm', ax: 0.5, ay: 0.14, z: 85, r: -60 });
    add({ n: 'r_hand', p: 'r_fore', x: 0, y: g('forearm')[1] * 0.72, img: 'hand_grip', ax: 0.2, ay: 0.5, z: 86, ir: 90 });
    add({ n: 'r_wpn', p: 'r_hand', x: 4, y: g('forearm')[1] * 0.3, img: 'cleaver', ax: 0.5, ay: 0.86, z: 83, ir: 90 });
  }
  def.rider = ['saddle', 'r_root', 'r_thigh', 'r_shin', 'r_torso', 'r_head', 'r_crown', 'r_arm', 'r_fore', 'r_hand', 'r_wpn'];
  def.shadow = 2.2;
  // 휘두르기: 대장의 팔이 함께 움직인다
  def.procs.push({ n: 'r_arm', amp: 10, spd: 0.004 });
  return def;
}
// 부품이 있는 것만 리그로 등록한다
function registerMonRigs() {
  for (const [id, fn] of Object.entries(MON_RIGS)) {
    const tex = id === 'toothcrusher_rider' ? 'toothcrusher' : id;
    const probe = ['torso', 'body', 'core', 'body_1', 'body_0', 'boar_torso_front', 'torso_front'].some(n => HAS(tex, n));
    if (probe) RIGS[id] = fn;
  }
}
