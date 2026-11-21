// 🆕 분량 확장 (docs/expansion-plan.md)
//   1) 장 안을 깊게: 모든 장에 s3 · a4 · b4 · 곁가지 x1 노드 (chapterNodes는 campaign.js)
//   2) 2부 「부서진 하늘」 7~12장: 몬스터·보스는 지금 그림에 색을 입힌 대역 (like = 그림을 빌려 올 원본 id)
// campaign.js 뒤, boss-gimmicks.js 앞에 불러온다. 그림이 오면 like를 지우고 MON_RIGS에 등록하면 된다.

// ---------------- 2부 몬스터 (대역) ----------------
// [id, 원본, 이름, 색, 크기 배율, 체력, 피해, 경험치]
const P2_MONS = [
  // 7장 유리 사막
  ['glass_scorpion', 'scorpion', '유리 전갈', 0xb8e8ff, 1.05, 260, 36, 22],
  ['sand_wraith', 'mummy', '모래 망령', 0xd8d0ff, 1.0, 330, 38, 24],
  ['crystal_snake', 'snakeman', '수정 뱀인', 0x9ae0e8, 1.0, 280, 38, 24],
  ['shard_construct', 'construct', '파편 기계병', 0xc0e8ff, 1.0, 380, 40, 28],
  // 8장 가라앉은 왕국
  ['drowned_pirate', 'pirate', '익사한 해적', 0x80c0b0, 1.0, 320, 40, 24],
  ['tide_slime', 'slime', '조수 점액', 0x70c8e0, 1.1, 240, 34, 20],
  ['deep_fishman', 'snakeman', '심해 어인', 0x60a8a0, 1.05, 330, 42, 26],
  ['drowned_knight', 'shadow_knight', '익사 기사', 0x6a9a98, 1.0, 560, 48, 38],
  // 9장 불꽃 대장간 산
  ['magma_brute', 'snow_brute', '용암 거한', 0xff9a70, 1.0, 520, 50, 36],
  ['fire_imp', 'imp', '불꽃 임프', 0xffb060, 1.0, 260, 44, 24],
  ['forge_dwarf', 'dwarf_miner', '잿빛 드워프', 0xd09070, 1.0, 330, 46, 28],
  ['ember_hound', 'hound', '잿불 사냥개', 0xff8050, 1.0, 340, 46, 26],
  // 10장 거꾸로 자라는 숲
  ['spore_wolf', 'wolf', '포자 늑대', 0xc0a0e0, 1.1, 330, 46, 26],
  ['rot_grunt', 'grunt', '썩은 그롤린', 0xa090c0, 1.15, 360, 48, 26],
  ['thorn_shaman', 'shaman', '가시 주술사', 0xc890ff, 1.05, 320, 50, 28],
  ['bog_leech', 'leech', '늪 거머리', 0x8aa070, 1.05, 380, 46, 28],
  // 11장 구름 성채
  ['storm_harpy', 'harpy', '폭풍 하피', 0xe8f0ff, 1.05, 360, 52, 30],
  ['sky_gargoyle', 'gargoyle', '하늘 가고일', 0xd8e0f0, 1.05, 480, 54, 34],
  ['silver_cultist', 'cultist', '은빛 신도', 0xe0e0f8, 1.0, 380, 56, 32],
  ['silver_knight', 'shadow_knight', '은빛 기사', 0xd0d8f0, 1.05, 700, 60, 44],
  // 12장 달의 뒷면
  ['moon_shade', 'shade_hero', '달 그림자', 0xa0b8ff, 1.0, 820, 64, 48],
  ['moon_hound', 'hound', '달 사냥개', 0xb0c0ff, 1.05, 420, 58, 32],
  ['star_imp', 'imp', '별 임프', 0xd0d8ff, 1.0, 340, 58, 30],
  ['void_leech', 'leech', '공허 거머리', 0x7080c0, 1.1, 460, 56, 32],
];
// [id, 원본, 이름, 색, 크기 배율, 체력, 피해, 경험치, 중간 보스?, 부하]
const P2_BOSSES = [
  ['glass_queen', 'twinsting', '유리 전갈 여왕', 0xb8e8ff, 1.05, 6000, 80, 900, true, 'glass_scorpion'],
  ['star_colossus', 'golem7', '별똥 거상', 0xd8d0ff, 1.15, 8200, 86, 1400, false, 'shard_construct'],
  ['drowned_captain', 'captain_mog', '익사한 선장 바르고', 0x80c0b0, 1.05, 7000, 86, 1100, true, 'drowned_pirate'],
  ['naia', 'sehera', '심해의 여왕 나이아', 0x70c8e0, 1.05, 9400, 90, 1700, false, 'drowned_knight'],
  ['forge_golem', 'golem7', '용광로 골렘', 0xff9a70, 1.05, 7800, 90, 1300, true, 'forge_dwarf'],
  ['ignar', 'hrimgar', '불의 거인 이그나르', 0xff8a60, 1.05, 10600, 96, 2000, false, 'magma_brute'],
  ['rot_warden', 'barkhaul', '썩은 숲지기', 0xc0a0e0, 1.1, 8600, 96, 1500, true, 'rot_grunt'],
  ['mycela', 'gloob', '포자 여왕 미셀라', 0xd090ff, 1.1, 11800, 100, 2300, false, 'spore_wolf'],
  ['storm_wyvern', 'frost_wyvern', '폭풍 와이번', 0xf0e8a0, 1.05, 9400, 100, 1800, true, 'storm_harpy'],
  ['morgan', 'orvex', '은빛 사도 모르간', 0xe8e8ff, 1.05, 12800, 106, 2700, false, 'silver_cultist'],
  ['moon_azmal', 'azmal', '달그림자 아즈말', 0xa0b8ff, 1.0, 11000, 106, 2400, true, 'moon_hound'],
  ['moon_orvex', 'orvex_eclipse', '일곱 번째 달 오르벡스', 0xd8e0ff, 1.2, 15000, 112, 4000, false, 'moon_shade'],
];
for (const [id, src, ko, tint, sc, hp, dmg, exp] of P2_MONS) {
  const b = MONDEF[src];
  MONDEF[id] = { ...b, ko, like: src, tint, sc, hp, dmg, exp, gold: [Math.round(b.gold[0] * 2.5), Math.round(b.gold[1] * 2.5)], standin: true };
}
for (const [id, src, ko, tint, sc, hp, dmg, exp, mid, summon] of P2_BOSSES) {
  const b = MONDEF[src];
  MONDEF[id] = { ...b, ko, like: src, tint, sc, hp, dmg, exp, mid, summon, gold: [Math.round(b.gold[0] * 2.2), Math.round(b.gold[1] * 2.2)], boss: true, standin: true };
}

// ---------------- 2부 배경 (✏️ 2026-11-21 진짜 그림 반영: assets/bg/p2_*. 소품은 아직 1부 것) ----------------
Object.assign(THEMES, {
  // ✏️ 음악·환경음은 2부 전용 (tools/build_music_p2.py, tools/build_audio_p2.py)
  glass: { ...THEMES.desert, far: 'bg/p2_glass_far', ground: 'bg/p2_glass_ground', standin: false, tint: 0xffffff, bgm: 'bgm_c7_glass', amb: 'glass' },
  glass_maze: { ...THEMES.tomb, far: 'bg/p2_glass_maze_far', ground: 'bg/p2_glass_maze_ground', standin: false, tint: 0xffffff, bgm: 'bgm_c7_maze', amb: 'glass' },
  sunken: { ...THEMES.harbor, far: 'bg/p2_sunken_far', ground: 'bg/p2_sunken_ground', standin: false, tint: 0xffffff, bgm: 'bgm_c8_sunken', amb: 'sunken' },
  sunken_temple: { ...THEMES.sewer, far: 'bg/p2_sunken_temple_far', ground: 'bg/p2_sunken_temple_ground', standin: false, tint: 0xffffff, bgm: 'bgm_c8_temple', amb: 'sunken' },
  forge: { ...THEMES.dwarf, far: 'bg/p2_forge_far', ground: 'bg/p2_forge_ground', standin: false, tint: 0xffffff, bgm: 'bgm_c9_forge', amb: 'forge' },
  lava: { ...THEMES.snow, far: 'bg/p2_lava_far', ground: 'bg/p2_lava_ground', standin: false, tint: 0xffffff, bgm: 'bgm_c9_lava', amb: 'lava' },
  spore: { ...THEMES.forest, far: 'bg/p2_spore_far', ground: 'bg/p2_spore_ground', standin: false, tint: 0xffffff, bgm: 'bgm_c10_spore', amb: 'spore' },
  spore_bog: { ...THEMES.swamp, far: 'bg/p2_spore_bog_far', ground: 'bg/p2_spore_bog_ground', standin: false, tint: 0xffffff, bgm: 'bgm_c10_bog', amb: 'spore' },
  cloud: { ...THEMES.tower, far: 'bg/p2_cloud_far', ground: 'bg/p2_cloud_ground', standin: false, tint: 0xffffff, bgm: 'bgm_c11_cloud', amb: 'cloud' },
  cloud_garden: { ...THEMES.forest, far: 'bg/p2_cloud_garden_far', ground: 'bg/p2_cloud_garden_ground', standin: false, tint: 0xffffff, bgm: 'bgm_c11_garden', amb: 'cloud' },
  moonside: { ...THEMES.abyss, far: 'bg/p2_moonside_far', ground: 'bg/p2_moonside_ground', standin: false, tint: 0xffffff, bgm: 'bgm_c12_moon', amb: 'moon' },
  moon_grave: { ...THEMES.tomb, far: 'bg/p2_moon_grave_far', ground: 'bg/p2_moon_grave_ground', standin: false, tint: 0xffffff, bgm: 'bgm_c12_grave', amb: 'moon' },
});

// ---------------- 장 목록 7~12 ----------------
CHAPTERS.push(
  { n: 7, name: '유리 사막', map: 'map/c7', routeA: '별똥 분화구', routeB: '유리 미궁', moon: null, seed: 'glass', lv: 31, part: 2 },
  { n: 8, name: '가라앉은 왕국', map: 'map/c8', routeA: '난파선 묘지', routeB: '잠긴 신전', moon: null, seed: 'tide', lv: 36, part: 2 },
  { n: 9, name: '불꽃 대장간 산', map: 'map/c9', routeA: '용암 갱도', routeB: '잊힌 대장간', moon: null, seed: 'ember', lv: 41, part: 2 },
  { n: 10, name: '거꾸로 자라는 숲', map: 'map/c10', routeA: '포자 골짜기', routeB: '뒤틀린 늪', moon: null, seed: 'spore', lv: 46, part: 2 },
  { n: 11, name: '구름 성채', map: 'map/c11', routeA: '폭풍 회랑', routeB: '떠도는 정원', moon: null, seed: 'storm', lv: 51, part: 2 },
  { n: 12, name: '달의 뒷면', map: 'map/c12', routeA: '거울 바다', routeB: '첫 달의 무덤', moon: null, seed: 'moon', lv: 56, part: 2 },
);
// 흑월 씨앗 (2부의 월석 자리)
const SEEDS = {
  glass: { ko: '유리 씨앗', col: 0xb8e8ff, ch: 7 },
  tide: { ko: '조수 씨앗', col: 0x70c8e0, ch: 8 },
  ember: { ko: '잿불 씨앗', col: 0xff9a60, ch: 9 },
  spore: { ko: '포자 씨앗', col: 0xc890ff, ch: 10 },
  storm: { ko: '폭풍 씨앗', col: 0xf0e8a0, ch: 11 },
  moon: { ko: '달 씨앗', col: 0xd8e0ff, ch: 12 },
};
// 지도 노드: 2부는 1부 지도 그림을 다시 쓴다
// 🆕 2부 지도 노드 자리 (지도 그림의 동그라미를 자동 검출, 1280 기준)
MAP_NODES[7] = { camp: [125, 407], s1: [200, 407], s2: [323, 408], s3: [439, 409], a1: [581, 254], a2: [716, 236], a3: [853, 236], a4: [987, 257], b1: [562, 559], b2: [705, 580], b3: [855, 582], b4: [991, 566], x1: [624, 402], boss: [1158, 413] };
MAP_NODES[8] = { camp: [30, 384], s1: [94, 384], s2: [247, 386], s3: [390, 386], a1: [601, 261], a2: [720, 241], a3: [851, 240], a4: [983, 252], b1: [586, 516], b2: [715, 545], b3: [854, 558], b4: [987, 539], x1: [653, 380], boss: [1165, 399] };
MAP_NODES[9] = { camp: [152, 408], s1: [227, 408], s2: [354, 409], s3: [473, 410], a1: [594, 268], a2: [710, 238], a3: [831, 238], a4: [943, 247], b1: [574, 534], b2: [697, 561], b3: [824, 560], b4: [950, 535], x1: [635, 409], boss: [1114, 406] };
MAP_NODES[10] = { camp: [30, 402], s1: [103, 402], s2: [250, 404], s3: [392, 405], a1: [552, 253], a2: [684, 232], a3: [827, 230], a4: [972, 252], b1: [530, 543], b2: [673, 564], b3: [820, 564], b4: [964, 541], x1: [624, 399], boss: [1144, 402] };
MAP_NODES[11] = { camp: [28, 417], s1: [89, 417], s2: [240, 417], s3: [389, 417], a1: [601, 249], a2: [736, 226], a3: [871, 223], a4: [1005, 241], b1: [550, 572], b2: [688, 610], b3: [831, 617], b4: [985, 590], x1: [645, 412], boss: [1165, 412] };
MAP_NODES[12] = { camp: [155, 361], s1: [230, 361], s2: [356, 361], s3: [482, 362], a1: [623, 217], a2: [757, 203], a3: [888, 198], a4: [1019, 212], b1: [619, 481], b2: [753, 487], b3: [887, 485], b4: [1018, 459], x1: [657, 358], boss: [1165, 347] };
// 새 노드 자리: s2를 s1과 옛 s2 사이로, s3는 옛 s2 자리, a4/b4는 길 끝과 보스 사이, 곁가지 x1은 두 길 가운데
for (let c = 1; c <= 6; c++) {
  const P = MAP_NODES[c];
  const mid = (a, b, t = 0.5) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t)];
  if (P.s3) continue;
  P.s3 = P.s2; P.s2 = mid(P.s1, P.s3);
  P.a4 = mid(P.a3, P.boss, 0.55); P.b4 = mid(P.b3, P.boss, 0.55);
  P.x1 = mid(P.a2, P.b2);
}

// ---------------- 스테이지 ----------------
// 웨이브 만들기: pool 앞쪽은 가벼운 적, 뒤쪽은 무거운 적
function genWaves(pool, n, size) {
  const W = [];
  for (let i = 0; i < n; i++) {
    const a = pool[i % pool.length], b = pool[(i + 1) % pool.length], c = pool[(i + 2) % pool.length];
    W.push(i === n - 1 ? [`${a}*${size},${b}`, `${c}*2,${a}`] : [`${a}*${size - 1},${b}`, `${b}*2,${c}`]);
  }
  return W;
}
// 1~6장 새 노드: [장, 몬스터 풀, s3 이름·테마, a4, b4, x1]
const DEEPEN = [
  [1, ['grunt', 'wolf', 'spear', 'shaman'], ['갈림길 앞 검문소', 'forest'], ['마을 끝 방어선', 'village'], ['늪을 빠져나가는 길', 'swamp'], ['사냥꾼의 오두막', 'forest']],
  [2, ['ratkin_blade', 'pirate', 'ratkin_xbow', 'slime'], ['세라포트 중앙 광장', 'harbor'], ['해적선 갑판 돌파', 'harbor'], ['길드 비밀 통로', 'sewer'], ['밀수꾼 창고', 'sewer']],
  [3, ['scorpion', 'snakeman', 'skeleton_archer', 'mummy'], ['신전 정문 계단', 'desert'], ['묘실 깊은 곳', 'tomb'], ['감옥 탈출로', 'desert'], ['모래에 묻힌 대상', 'desert']],
  [4, ['frostwolf', 'dwarf_miner', 'ice_spirit', 'snow_brute'], ['눈사태 골짜기', 'snow'], ['빙하 협곡 돌파', 'snow'], ['요새 무너진 성벽', 'dwarf'], ['얼어붙은 광산', 'dwarf']],
  [5, ['construct', 'harpy', 'cultist', 'gargoyle', 'shadow_knight'], ['탑 중층 승강장', 'tower'], ['기관실 심장부', 'tower'], ['하늘 다리', 'tower'], ['봉인된 실험실', 'tower']],
  [6, ['imp', 'hound', 'leech', 'shade_hero'], ['심연의 갈림목', 'abyss'], ['거울 회랑 끝', 'abyss'], ['무덤 사이의 길', 'abyss'], ['잊힌 영웅의 그림자', 'abyss']],
];
for (const [c, pool, s3, a4, b4, x1] of DEEPEN) {
  STAGES[`c${c}_s3`] = { name: s3[0], theme: s3[1], waves: genWaves(pool, 3, 3) };
  STAGES[`c${c}_a4`] = { name: a4[0], theme: a4[1], waves: genWaves([...pool].reverse(), 3, 3) };
  STAGES[`c${c}_b4`] = { name: b4[0], theme: b4[1], waves: genWaves(pool.slice(1).concat(pool[0]), 3, 3) };
  STAGES[`c${c}_x1`] = { name: x1[0], theme: x1[1], waves: genWaves(pool, 2, 3), side: true };
}
// 2부 스테이지: [장, 몬스터 풀, 테마A, 테마B, 이름 12개(s1 s2 s3 a1 a2 a3 a4 b1 b3 b4 boss x1), 중간 보스, 장 보스]
const P2_STAGES = [
  [7, ['glass_scorpion', 'crystal_snake', 'sand_wraith', 'shard_construct'], 'glass', 'glass_maze',
    ['별이 떨어진 언덕', '유리 바람 협곡', '부서진 오아시스', '분화구 가장자리', '녹아내린 대상로', '여왕의 둥지', '분화구 중심', '유리 미궁 입구', '미궁의 심장', '빛이 갇힌 회랑', '별똥의 자리', '모래 속 관측소'], 'glass_queen', 'star_colossus'],
  [8, ['drowned_pirate', 'tide_slime', 'deep_fishman', 'drowned_knight'], 'sunken', 'sunken_temple',
    ['물 빠진 부두', '산호 골목', '가라앉은 성문', '난파선 묘지', '돛대 숲', '선장의 무덤배', '묘지 끝 등대', '잠긴 신전 계단', '물빛 성소', '조수의 회랑', '여왕의 옥좌', '갇힌 잠수부'], 'drowned_captain', 'naia'],
  [9, ['ember_hound', 'fire_imp', 'forge_dwarf', 'magma_brute'], 'forge', 'lava',
    ['재가 내리는 기슭', '불꽃 계단', '대장간 마을 폐허', '용암 갱도 입구', '녹은 철길', '용광로 격납고', '갱도 끝 분화구', '잊힌 대장간 문', '모루의 방', '불씨 창고', '거인의 화로', '식어 버린 광산'], 'forge_golem', 'ignar'],
  [10, ['spore_wolf', 'rot_grunt', 'thorn_shaman', 'bog_leech'], 'spore', 'spore_bog',
    ['뒤집힌 숲 어귀', '하늘로 뻗은 뿌리', '포자비 내리는 길', '포자 골짜기', '버섯 기둥 숲', '썩은 숲지기의 뜰', '골짜기 끝 군락', '뒤틀린 늪 입구', '늪 속 고목', '거꾸로 흐르는 강', '포자 여왕의 둥지', '숲 정령의 샘'], 'rot_warden', 'mycela'],
  [11, ['storm_harpy', 'silver_cultist', 'sky_gargoyle', 'silver_knight'], 'cloud', 'cloud_garden',
    ['구름 계단', '바람의 성문', '은빛 광장', '폭풍 회랑', '번개 탑', '와이번 둥지', '회랑 끝 망루', '떠도는 정원 입구', '하늘 온실', '정원의 끝', '사도의 예배당', '구름 아래 감옥'], 'storm_wyvern', 'morgan'],
  [12, ['moon_hound', 'star_imp', 'void_leech', 'moon_shade'], 'moonside', 'moon_grave',
    ['달의 해안', '은빛 사막', '첫 달의 문', '거울 바다', '비치는 그림자', '달그림자의 둥지', '바다 끝 섬', '첫 달의 무덤 입구', '잠든 달의 관', '무덤 너머', '일곱 번째 달', '달 위의 기억'], 'moon_azmal', 'moon_orvex'],
];
for (const [c, pool, tA, tB, N, midB, bossB] of P2_STAGES) {
  const k = id => `c${c}_${id}`;
  STAGES[k('s1')] = { name: N[0], theme: tA, waves: genWaves(pool, 3, 3) };
  STAGES[k('s2')] = { name: N[1], theme: tA, waves: genWaves(pool, 3, 3) };
  STAGES[k('s3')] = { name: N[2], theme: tA, waves: genWaves([...pool].reverse(), 3, 3) };
  STAGES[k('a1')] = { name: N[3], theme: tA, waves: genWaves(pool, 3, 4) };
  STAGES[k('a2')] = { name: N[4], theme: tA, waves: genWaves([...pool].reverse(), 2, 4) };
  STAGES[k('a3')] = { name: N[5], theme: tA, waves: [[`${pool[0]}*2,${pool[1]}`], [midB]], boss: true };
  STAGES[k('a4')] = { name: N[6], theme: tA, waves: genWaves(pool.slice(1).concat(pool[0]), 3, 4) };
  STAGES[k('b1')] = { name: N[7], theme: tB, waves: genWaves(pool, 3, 3) };
  STAGES[k('b3')] = { name: N[8], theme: tB, waves: genWaves([...pool].reverse(), 2, 3), treasure: true };
  STAGES[k('b4')] = { name: N[9], theme: tB, waves: genWaves(pool.slice(2).concat(pool.slice(0, 2)), 3, 3) };
  STAGES[k('boss')] = { name: N[10], theme: c === 12 ? 'moonside' : tA, waves: [[`${pool[2]}*2,${pool[0]}*2`], [bossB]], boss: true };
  STAGES[k('x1')] = { name: N[11], theme: tB, waves: genWaves(pool, 2, 3), side: true };
}

// ---------------- 장 배율·강화 7~12 ----------------
Object.assign(MOB_TUNE, {
  7: { hp: 1.3, dmg: 1.1, elite: 0.15, extraWave: 2 }, 8: { hp: 1.3, dmg: 1.1, elite: 0.16, extraWave: 2 },
  9: { hp: 1.3, dmg: 1.1, elite: 0.17, extraWave: 2 }, 10: { hp: 1.3, dmg: 1.1, elite: 0.18, extraWave: 2 },
  11: { hp: 1.3, dmg: 1.1, elite: 0.19, extraWave: 2 }, 12: { hp: 1.3, dmg: 1.1, elite: 0.2, extraWave: 2 },
});
for (let c = 7; c <= 12; c++) BOSS_TUNE[c] = { hp: 1, dmg: 1, cool: 0.9, poiseK: 3, stagger: 2100 };

// ---------------- 갈림길 7~12 ----------------
Object.assign(ROUTES, {
  7: { A: { gain: '중간 보스 「유리 전갈 여왕」 전리품 · 금화 +30%', risk: '별똥 분화구 — 정예가 더 자주 나온다', tag: '전리품 · 금화', rule: { ...ROUTE_A_RULE, ko: '정면 돌파 — 정예 증가 · 금화 +30%' } },
       B: { gain: '유리 씨앗 정화 (2부 진 엔딩 조건) · 이야기', risk: '유리 미궁 — 빛 반사로 적이 빨라진다', tag: '씨앗 · 이야기', rule: { speedMul: 1.15, ko: '유리 미궁 — 적 이동 속도 +15%' } } },
  8: { A: { gain: '중간 보스 「익사한 선장 바르고」 전리품 · 금화 +30%', risk: '난파선 묘지 — 정예가 더 자주 나온다', tag: '전리품 · 금화', rule: { ...ROUTE_A_RULE, ko: '정면 돌파 — 정예 증가 · 금화 +30%' } },
       B: { gain: '조수 씨앗 정화 · 이야기', risk: '잠긴 신전 — 회복 하트가 나오지 않는다', tag: '씨앗 · 이야기', rule: { noHeart: true, ko: '잠긴 신전 — 회복 하트 없음' } } },
  9: { A: { gain: '중간 보스 「용광로 골렘」 전리품 · 금화 +30%', risk: '용암 갱도 — 정예가 더 자주 나온다', tag: '전리품 · 금화', rule: { ...ROUTE_A_RULE, ko: '정면 돌파 — 정예 증가 · 금화 +30%' } },
       B: { gain: '잿불 씨앗 정화 · 이야기', risk: '잊힌 대장간 — 받는 피해 +15%', tag: '씨앗 · 이야기', rule: { dmgMul: 1.15, ko: '잊힌 대장간 — 받는 피해 +15%' } } },
  10: { A: { gain: '중간 보스 「썩은 숲지기」 전리품 · 금화 +30%', risk: '포자 골짜기 — 정예가 더 자주 나온다', tag: '전리품 · 금화', rule: { ...ROUTE_A_RULE, ko: '정면 돌파 — 정예 증가 · 금화 +30%' } },
       B: { gain: '포자 씨앗 정화 · 이야기', risk: '뒤틀린 늪 — 적 체력 +20%', tag: '씨앗 · 이야기', rule: { hpMul: 1.2, ko: '뒤틀린 늪 — 적 체력 +20%' } } },
  11: { A: { gain: '중간 보스 「폭풍 와이번」 전리품 · 금화 +30%', risk: '폭풍 회랑 — 정예가 더 자주 나온다', tag: '전리품 · 금화', rule: { ...ROUTE_A_RULE, ko: '정면 돌파 — 정예 증가 · 금화 +30%' } },
       B: { gain: '폭풍 씨앗 정화 · 이야기', risk: '떠도는 정원 — 돌풍으로 적이 빨라진다', tag: '씨앗 · 이야기', rule: { speedMul: 1.2, ko: '떠도는 정원 — 적 이동 속도 +20%' } } },
  12: { A: { gain: '중간 보스 「달그림자 아즈말」 전리품 · 금화 +30%', risk: '거울 바다 — 정예가 더 자주 나온다', tag: '전리품 · 금화', rule: { ...ROUTE_A_RULE, ko: '정면 돌파 — 정예 증가 · 금화 +30%' } },
       B: { gain: '달 씨앗 정화 · 첫 달의 이야기', risk: '첫 달의 무덤 — 회복 하트 없음 · 받는 피해 +10%', tag: '씨앗 · 이야기', rule: { noHeart: true, dmgMul: 1.1, ko: '첫 달의 무덤 — 회복 하트 없음 · 받는 피해 +10%' } } },
});

// 대역 몬스터·보스가 원본의 패턴 표를 빌려 쓴다 (모든 스크립트를 불러온 뒤 한 번)
function aliasStandins() {
  if (aliasStandins.done) return; aliasStandins.done = true;
  const tables = [typeof MON_PROJ !== 'undefined' && MON_PROJ, typeof BOSS_MOVES !== 'undefined' && BOSS_MOVES, typeof BOSS_ROCK !== 'undefined' && BOSS_ROCK,
    typeof BOSS_ROOT !== 'undefined' && BOSS_ROOT, typeof ENEMY_SIGNATURES !== 'undefined' && ENEMY_SIGNATURES];
  for (const [id, d] of Object.entries(MONDEF)) {
    if (!d.like) continue;
    for (const T of tables) {
      if (!T || !T[d.like] || T[id]) continue;
      // 동작 서명은 같은 종류의 리그일 때만 빌린다 (뼈 이름이 다르면 어긋난다)
      if (typeof ENEMY_SIGNATURES !== 'undefined' && T === ENEMY_SIGNATURES && RIGS[id] && ['ignar', 'rot_warden', 'moon_shade'].includes(id)) continue;
      T[id] = T[d.like];
    }
  }
}
