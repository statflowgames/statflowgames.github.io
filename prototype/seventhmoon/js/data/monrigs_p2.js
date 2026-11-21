// 🆕 2부 몬스터·보스 진짜 그림 리그 (부품: tools/slice_part2.py, 이름표 tools/part2_names.json)
// monrigs.js 뒤에 불러온다. 부품이 없으면 registerMonRigs가 등록하지 않아 expansion.js의 대역(like)을 쓴다.
Object.assign(MON_RIGS, {
  // ---- 7장 ----
  glass_scorpion: () => scorpionRig('glass_scorpion', { h: 66 }),
  crystal_snake: () => autoHumanoid('crystal_snake', { h: 228, weapon: { img: 'spear', a: [0.5, 0.6], sc: 1.0 } }),
  sand_wraith: () => autoHumanoid('sand_wraith', { h: 226, extra: [{ img: 'scarf', on: 'torso', at: [-0.25, -0.75], a: [0.85, 0.1], z: 4 }], procs: [{ n: 'scarf', amp: 12, spd: 0.005 }], hover: 18 }),
  shard_construct: () => autoHumanoid('shard_construct', { h: 248, weapon: { img: 'cannon', a: [0.5, 0.75], sc: 1.0 } }),
  glass_queen: () => scorpionRig('glass_queen', { h: 128, def: { shadow: 2.5 } }),
  star_colossus: () => autoHumanoid('star_colossus', { h: 380, extra: [{ img: 'core', on: 'torso', at: [0.04, -0.52], a: [0.5, 0.5], z: 75, sc: 0.55 }, { img: 'shoulder', on: 'torso', at: [-0.25, -0.85], a: [0.5, 0.6], z: 86 }], shadow: 2.4 }),
  // ---- 8장 ----
  drowned_pirate: () => autoHumanoid('drowned_pirate', { h: 208, weapon: { img: 'cutlass', sc: 1.0 } }),
  tide_slime: () => blobRig('tide_slime', { h: 122, face: 'eyes' }),
  deep_fishman: () => autoHumanoid('deep_fishman', { h: 226, weapon: { img: 'spear', a: [0.5, 0.6], sc: 1.0 } }),
  drowned_knight: () => autoHumanoid('drowned_knight', { h: 256, weapon: { img: 'sword', sc: 1.0 }, shield: { img: 'shield', sc: 1.0 } }),
  drowned_captain: () => autoHumanoid('drowned_captain', { h: 318, weapon: { img: 'anchor', a: [0.5, 0.75], sc: 1.0 }, extra: [{ img: 'coat_tail', on: 'torso', at: [-0.1, -0.85], a: [0.55, 0.08], z: 3 }, { img: 'shoulder', on: 'torso', at: [-0.24, -0.82], a: [0.5, 0.5], z: 86 }], procs: [{ n: 'coat_tail', amp: 5, spd: 0.004 }], shadow: 2 }),
  naia: () => autoHumanoid('naia', { h: 300, weapon: { img: 'scepter', a: [0.5, 0.7], sc: 1.0 }, extra: [{ img: 'hair', on: 'head', at: [-0.3, -0.1], a: [0.75, 0.3], z: 2 }, { img: 'crown', on: 'head', at: [0.05, -0.48], a: [0.5, 0.8], z: 76 }], procs: [{ n: 'hair', amp: 6, spd: 0.004 }], hover: 12, shadow: 2 }),
  // ---- 9장 ----
  ember_hound: () => quadRig('ember_hound', { h: 142 }),
  fire_imp: () => autoHumanoid('fire_imp', { h: 142, extra: [{ n: 'wingi', img: 'wing', on: 'torso', at: [-0.1, -0.7], a: [0.85, 0.8], z: 2 }], procs: [{ n: 'wingi', amp: 24, spd: 0.02 }], hover: 30 }),
  forge_dwarf: () => autoHumanoid('forge_dwarf', { h: 176, weapon: { img: 'hammer', sc: 1.0 } }),
  magma_brute: () => autoHumanoid('magma_brute', { h: 290, shadow: 1.8 }),
  forge_golem: () => autoHumanoid('forge_golem', { h: 350, extra: [{ img: 'core', on: 'torso', at: [0.02, -0.5], a: [0.5, 0.5], z: 75, sc: 0.62 }], shadow: 2.2 }),
  ignar: () => autoHumanoid('ignar', { h: 380, weapon: { img: 'hammer', sc: 1.0 }, extra: [{ img: 'shoulder', on: 'torso', at: [-0.24, -0.84], a: [0.5, 0.55], z: 86 }], shadow: 2.8 }),
  // ---- 10장 ----
  spore_wolf: () => quadRig('spore_wolf', { h: 132 }),
  rot_grunt: () => autoHumanoid('rot_grunt', { h: 182, weapon: { img: 'dagger', sc: 1.0 } }),
  thorn_shaman: () => autoHumanoid('thorn_shaman', { h: 186, weapon: { img: 'staff', a: [0.5, 0.6], sc: 1.0 } }),
  bog_leech: () => leechRig('bog_leech', { h: 64 }),
  rot_warden: () => autoHumanoid('rot_warden', { h: 340, weapon: { img: 'club', sc: 1.0 }, extra: [{ img: 'shoulder', on: 'torso', at: [-0.25, -0.86], a: [0.5, 0.55], z: 86 }], shadow: 2.6 }),
  mycela: () => blobRig('mycela', { h: 262, face: 'face_calm', faceAngry: 'face_angry', inner: [{ img: 'crown', at: [0, -0.7], sc: 0.9 }], def: { shadow: 2.8 } }),
  // ---- 11장 ----
  storm_harpy: () => autoHumanoid('storm_harpy', { h: 214, extra: [{ n: 'wing', img: 'wing_up', on: 'torso', at: [-0.1, -0.7], a: [0.85, 0.8], z: 2 }], procs: [{ n: 'wing', amp: 26, spd: 0.016 }], hover: 40 }),
  sky_gargoyle: () => autoHumanoid('sky_gargoyle', { h: 228, extra: [{ n: 'wing', img: 'wing_up', on: 'torso', at: [-0.15, -0.7], a: [0.85, 0.75], z: 2 }], procs: [WING_FLAP('wing')] }),
  silver_cultist: () => autoHumanoid('silver_cultist', { h: 214, weapon: { img: 'staff', a: [0.5, 0.6], sc: 1.0 } }),
  silver_knight: () => autoHumanoid('silver_knight', { h: 258, weapon: { img: 'sword', sc: 1.0 }, shield: { img: 'shield', sc: 1.0 } }),
  storm_wyvern: () => wyrmRig('storm_wyvern', { h: 168, hover: 70, def: { shadow: 2.6 } }),
  morgan: () => autoHumanoid('morgan', { h: 282, weapon: { img: 'staff', a: [0.5, 0.6], sc: 1.0 }, extra: [{ img: 'cloak', on: 'torso', at: [-0.05, -0.9], a: [0.5, 0.06], z: 3 }], procs: [{ n: 'cloak', amp: 4, spd: 0.004 }], hover: 10, shadow: 1.8 }),
  // ---- 12장 ----
  moon_hound: () => quadRig('moon_hound', { h: 146 }),
  moon_shade: () => autoHumanoid('moon_shade', { h: 246, weapon: { img: 'sword', sc: 1.0 }, shield: { img: 'shield', sc: 1.0 } }),
  star_imp: () => autoHumanoid('star_imp', { h: 140, extra: [{ n: 'wingi', img: 'wing', on: 'torso', at: [-0.1, -0.7], a: [0.85, 0.8], z: 2 }], procs: [{ n: 'wingi', amp: 24, spd: 0.02 }], hover: 30 }),
  void_leech: () => leechRig('void_leech', { h: 60 }),
  moon_azmal: () => wyrmRig('moon_azmal', { h: 250, def: { shadow: 3.4 } }),
  moon_orvex: () => moonOrvexRig(),
});
// 일곱 번째 달 오르벡스: 씨앗 여섯이 몸을 돌고, 등 뒤에 달 고리
function moonOrvexRig() {
  const extra = [{ n: 'halo', img: 'halo', on: 'torso', at: [0, -0.75], a: [0.5, 0.5], z: 1, sc: 1.1 }];
  const procs = [{ n: 'halo', spin: 0.01 }];
  for (let i = 0; i < 6; i++) {
    extra.push({ n: 'mp' + i, img: 'px', raw: true, hide: true, on: 'torso', at: [0, -0.6], z: 1 });
    extra.push({ n: 'mb' + i, img: 'moon_' + i, on: 'mp' + i, at: [1.25, 0], a: [0.5, 0.5], z: i % 2 ? 90 : 2, sc: 0.55 });
    procs.push({ n: 'mp' + i, spin: 0.045, ph: i * 60 });
  }
  return autoHumanoid('moon_orvex', { h: 330, weapon: { img: 'staff', a: [0.5, 0.6], sc: 1.0 }, extra, procs, hover: 16, shadow: 2 });
}
