// 캠페인 데이터: 장 → 지도 노드 → 스테이지. 그림이 아직 없는 몬스터와 보스는
// 이미 있는 리그(grunt/spear/shaman/barkhaul)에 색을 입혀 대신 쓴다(stand-in).
// 그림이 들어오면 rig 값만 바꾸면 된다.

// ---------------- 몬스터 ----------------
// rig: 쓰는 리그와 AI, tint: 색조, sc: 크기 배율, hp/dmg/speed: 1장 기준(장마다 배율이 붙는다)
const MONDEF = {
  grunt: { ko: '그롤린 졸개', rig: 'grunt', hp: 70, speed: 150, role: 'melee', dmg: 14, reach: 120, gold: [2, 5], face: 'faces/grunt', exp: 6 },
  spear: { ko: '그롤린 투창병', rig: 'spear', hp: 60, speed: 140, role: 'ranged', dmg: 18, gold: [3, 6], face: 'faces/spear', exp: 7 },
  shaman: { ko: '그롤린 주술사', rig: 'shaman', hp: 55, speed: 120, role: 'support', dmg: 16, gold: [4, 8], face: 'faces/shaman', exp: 8 },
  wolf: { ko: '흑월 늑대', rig: 'grunt', tint: 0x6a5a8a, sc: 1.05, hp: 60, speed: 210, role: 'melee', dmg: 13, reach: 115, gold: [2, 4], face: 'faces/grunt', exp: 7, standin: true },
  // 2장
  ratkin_blade: { ko: '시궁쥐족 칼잡이', rig: 'grunt', tint: 0xb09070, hp: 85, speed: 175, role: 'melee', dmg: 15, reach: 125, gold: [3, 6], face: 'faces/grunt', exp: 8, standin: true },
  ratkin_xbow: { ko: '시궁쥐족 석궁병', rig: 'spear', tint: 0xb09070, hp: 70, speed: 140, role: 'ranged', dmg: 17, gold: [3, 7], face: 'faces/spear', exp: 9, standin: true },
  pirate: { ko: '부두 해적', rig: 'grunt', tint: 0xd08a70, sc: 1.2, hp: 130, speed: 130, role: 'melee', dmg: 20, reach: 135, gold: [5, 9], face: 'faces/grunt', exp: 11, standin: true },
  slime: { ko: '독점액', rig: 'grunt', tint: 0x80e070, sc: 0.9, hp: 70, speed: 110, role: 'melee', dmg: 12, reach: 110, gold: [2, 4], face: 'faces/grunt', exp: 6, split: true, standin: true },
  // 3장
  mummy: { ko: '붕대 미라병', rig: 'grunt', tint: 0xe8dcb0, sc: 1.2, hp: 180, speed: 100, role: 'melee', dmg: 22, reach: 130, gold: [5, 9], face: 'faces/grunt', exp: 13, undead: true, standin: true },
  scorpion: { ko: '사막 전갈', rig: 'grunt', tint: 0xc07a3a, hp: 110, speed: 160, role: 'melee', dmg: 19, reach: 140, gold: [4, 8], face: 'faces/grunt', exp: 11, standin: true },
  skeleton_archer: { ko: '해골 궁수', rig: 'spear', tint: 0xf0ece0, hp: 80, speed: 130, role: 'ranged', dmg: 20, gold: [4, 8], face: 'faces/spear', exp: 11, undead: true, standin: true },
  snakeman: { ko: '모래뱀인 창병', rig: 'spear', tint: 0x90b060, sc: 1.15, hp: 120, speed: 140, role: 'melee', dmg: 21, reach: 170, gold: [5, 9], face: 'faces/spear', exp: 12, standin: true },
  // 4장
  frostwolf: { ko: '서리늑대', rig: 'grunt', tint: 0xb8d8ff, sc: 1.05, hp: 120, speed: 210, role: 'melee', dmg: 21, reach: 120, gold: [4, 8], face: 'faces/grunt', exp: 13, standin: true },
  snow_brute: { ko: '설산 거한', rig: 'grunt', tint: 0xe0f0ff, sc: 1.45, hp: 300, speed: 110, role: 'melee', dmg: 30, reach: 150, gold: [8, 14], face: 'faces/grunt', exp: 20, standin: true },
  ice_spirit: { ko: '얼음 정령', rig: 'shaman', tint: 0x9ad8ff, hp: 100, speed: 130, role: 'support', dmg: 24, gold: [5, 9], face: 'faces/shaman', exp: 14, standin: true },
  dwarf_miner: { ko: '타락 드워프 광부', rig: 'spear', tint: 0x9a8070, sc: 1.1, hp: 160, speed: 120, role: 'ranged', dmg: 24, gold: [6, 10], face: 'faces/spear', exp: 15, standin: true },
  // 5장
  gargoyle: { ko: '석상 가고일', rig: 'grunt', tint: 0x9a9aa8, sc: 1.15, hp: 220, speed: 150, role: 'melee', dmg: 27, reach: 135, gold: [7, 12], face: 'faces/grunt', exp: 18, standin: true },
  construct: { ko: '마도 병정', rig: 'spear', tint: 0x8aa0c8, sc: 1.2, hp: 240, speed: 115, role: 'ranged', dmg: 28, gold: [7, 12], face: 'faces/spear', exp: 19, standin: true },
  harpy: { ko: '하피', rig: 'spear', tint: 0xd8a0d0, hp: 150, speed: 190, role: 'ranged', dmg: 24, gold: [6, 10], face: 'faces/spear', exp: 16, standin: true },
  cultist: { ko: '흑월 교단 술사', rig: 'shaman', tint: 0x9070c0, hp: 160, speed: 130, role: 'support', dmg: 28, gold: [7, 12], face: 'faces/shaman', exp: 18, standin: true },
  shadow_knight: { ko: '그림자 기사', rig: 'grunt', tint: 0x5a4a7a, sc: 1.35, hp: 420, speed: 140, role: 'melee', dmg: 34, reach: 150, gold: [12, 18], face: 'faces/grunt', exp: 30, standin: true },
  // 6장
  imp: { ko: '심연 임프', rig: 'shaman', tint: 0xff8a6a, sc: 0.85, hp: 140, speed: 170, role: 'support', dmg: 28, gold: [6, 10], face: 'faces/shaman', exp: 18, standin: true },
  hound: { ko: '심연 사냥개', rig: 'grunt', tint: 0x8a4a9a, sc: 1.1, hp: 200, speed: 230, role: 'melee', dmg: 30, reach: 125, gold: [7, 12], face: 'faces/grunt', exp: 20, standin: true },
  leech: { ko: '공허 거머리', rig: 'grunt', tint: 0x5a3a6a, sc: 0.95, hp: 180, speed: 120, role: 'melee', dmg: 24, reach: 120, gold: [6, 10], face: 'faces/grunt', exp: 18, drainAwk: true, standin: true },
  shade_hero: { ko: '그림자 영웅', rig: 'grunt', tint: 0x3a3048, sc: 1.4, hp: 520, speed: 170, role: 'melee', dmg: 38, reach: 160, gold: [14, 20], face: 'faces/grunt', exp: 36, standin: true },
  toothcrusher_rider: { ko: '이빨부숴 (내림)', rig: 'grunt', tint: 0xc8a080, sc: 1.2, hp: 420, speed: 170, role: 'melee', dmg: 26, reach: 140, gold: [10, 15], face: 'faces/grunt', exp: 40 },
  // ---- 보스 (role: boss는 바크하울 AI를 쓴다) ----
  barkhaul: { ko: '이끼거인 바크하울', rig: 'barkhaul', hp: 1500, speed: 85, role: 'boss', dmg: 44, gold: [40, 60], exp: 160, boss: true, summon: 'grunt' },
  toothcrusher: { ko: '이빨부숴', rig: 'barkhaul', tint: 0xc8a080, sc: 0.85, hp: 1000, speed: 120, role: 'boss', dmg: 38, gold: [30, 45], exp: 110, boss: true, mid: true, summon: 'grunt', standin: true },
  captain_mog: { ko: '갈고리 선장 모그', rig: 'barkhaul', tint: 0xd09070, sc: 0.85, hp: 1500, speed: 110, role: 'boss', dmg: 42, gold: [40, 60], exp: 160, boss: true, mid: true, summon: 'pirate', standin: true },
  gloob: { ko: '오물군주 글러브', rig: 'barkhaul', tint: 0x90e070, sc: 1.05, hp: 2300, speed: 80, role: 'boss', dmg: 48, gold: [60, 80], exp: 240, boss: true, summon: 'slime', standin: true },
  twinsting: { ko: '쌍침', rig: 'barkhaul', tint: 0xc07a3a, sc: 0.9, hp: 2000, speed: 120, role: 'boss', dmg: 50, gold: [50, 70], exp: 220, boss: true, mid: true, summon: 'scorpion', standin: true },
  sehera: { ko: '모래 여왕 세헤라', rig: 'barkhaul', tint: 0xe8d8a0, hp: 3000, speed: 90, role: 'boss', dmg: 54, gold: [70, 95], exp: 320, boss: true, summon: 'mummy', standin: true },
  frost_wyvern: { ko: '서리 와이번', rig: 'barkhaul', tint: 0xa8d0ff, sc: 0.95, hp: 2700, speed: 115, role: 'boss', dmg: 56, gold: [60, 85], exp: 300, boss: true, mid: true, summon: 'frostwolf', standin: true },
  hrimgar: { ko: '빙하거인 흐림가르', rig: 'barkhaul', tint: 0xd0e8ff, sc: 1.25, hp: 4000, speed: 75, role: 'boss', dmg: 62, gold: [90, 120], exp: 420, boss: true, summon: 'snow_brute', standin: true },
  golem7: { ko: '마도 골렘 칠호', rig: 'barkhaul', tint: 0x8aa0d0, sc: 1.05, hp: 3600, speed: 90, role: 'boss', dmg: 62, gold: [80, 110], exp: 400, boss: true, mid: true, summon: 'construct', standin: true },
  orvex: { ko: '현자 오르벡스', rig: 'barkhaul', tint: 0x7080d0, sc: 0.8, hp: 4800, speed: 110, role: 'boss', dmg: 66, gold: [110, 140], exp: 520, boss: true, summon: 'cultist', standin: true },
  orvex_eclipse: { ko: '흑월 오르벡스', rig: 'barkhaul', tint: 0x5a3a8a, sc: 0.85, hp: 5200, speed: 120, role: 'boss', dmg: 70, gold: [110, 140], exp: 560, boss: true, mid: true, summon: 'imp', standin: true },
  azmal: { ko: '흑월룡 아즈말', rig: 'barkhaul', tint: 0x40305a, sc: 1.35, hp: 7000, speed: 85, role: 'boss', dmg: 78, gold: [200, 260], exp: 900, boss: true, summon: 'hound', standin: true },
  void_shadow: { ko: '공허의 그림자', rig: 'barkhaul', tint: 0x201828, sc: 1.1, hp: 9000, speed: 120, role: 'boss', dmg: 84, gold: [260, 320], exp: 1200, boss: true, summon: 'shade_hero', standin: true },
};

// ---------------- 배경 테마 ----------------
// far/ground: 텍스처 키(없으면 forest로 대신), tint: 소품 색조
const THEMES = {
  forest: { far: 'bg/far', ground: 'bg/ground', props: 'props', amb: 'forest', bgm: 'bgm_c1_forest' },
  village: { far: 'bg/village_far', ground: 'bg/village_ground', props: 'props_village', amb: 'village_fire', bgm: 'bgm_c1_village' },
  swamp: { far: 'bg/swamp_far', ground: 'bg/swamp_ground', props: 'props_swamp', amb: 'swamp', bgm: 'bgm_c1_swamp' },
  harbor: { far: 'bg/harbor_far', ground: 'bg/harbor_ground', props: 'props_harbor', amb: 'harbor', bgm: 'bgm_c2_harbor' },
  sewer: { far: 'bg/sewer_far', ground: 'bg/sewer_ground', props: 'props_sewer', amb: 'sewer', bgm: 'bgm_c2_sewer' },
  desert: { far: 'bg/desert_far', ground: 'bg/desert_ground', props: 'props_desert', amb: 'desert', bgm: 'bgm_c3_desert' },
  tomb: { far: 'bg/tomb_far', ground: 'bg/tomb_ground', props: 'props_tomb', amb: 'tomb', bgm: 'bgm_c3_tomb' },
  snow: { far: 'bg/frost_far', ground: 'bg/frost_ground', props: 'props_frost', amb: 'blizzard', bgm: 'bgm_c4_frost' },
  dwarf: { far: 'bg/dwarf_far', ground: 'bg/dwarf_ground', props: 'props_dwarf', amb: 'forge', bgm: 'bgm_c4_dwarf' },
  tower: { far: 'bg/tower_far', ground: 'bg/tower_ground', props: 'props_tower', amb: 'tower', bgm: 'bgm_c5_tower' },
  abyss: { far: 'bg/abyss_far', ground: 'bg/abyss_ground', props: 'props_abyss', amb: 'abyss', bgm: 'bgm_c6_abyss' },
};

// ---------------- 스테이지 ----------------
// waves: 잠금 전투 목록. 한 잠금 = 웨이브 그룹 목록. 그룹은 'grunt*2,spear' 같은 문자열.
// boss: 마지막 잠금에 나오는 보스. props: 부서지는 물체 수.
const STAGES = {
  // ---- 1장 국경 숲 가도 ----
  c1_s1: { name: '안개 낀 숲길', theme: 'forest', waves: [['grunt*3'], ['grunt*2,spear', 'grunt*2'], ['grunt,spear,shaman', 'grunt*2,spear']] },
  c1_s2: { name: '부서진 마찻길', theme: 'forest', waves: [['grunt*2,wolf'], ['wolf*2,grunt', 'spear*2,grunt'], ['shaman,grunt*2', 'wolf*3']] },
  c1_a1: { name: '불타는 마을 어귀', theme: 'village', waves: [['grunt*3,spear'], ['wolf*2,grunt*2', 'shaman,spear,grunt'], ['grunt*4', 'spear*2,shaman']] },
  c1_a2: { name: '잿더미 광장', theme: 'village', waves: [['grunt*2,spear*2'], ['wolf*3', 'grunt*3,shaman']] },
  c1_a3: { name: '그롤린 대장의 천막', theme: 'village', waves: [['grunt*3'], ['toothcrusher']], boss: true },
  c1_b1: { name: '안개 늪 입구', theme: 'swamp', waves: [['wolf*2'], ['grunt*2,shaman', 'wolf*2,spear'], ['spear*2,grunt*2']] },
  c1_b3: { name: '늪 속 폐허', theme: 'swamp', waves: [['grunt*2,shaman'], ['wolf*3,spear']], treasure: true },
  c1_boss: { name: '이끼 동굴', theme: 'forest', waves: [['grunt*2,spear'], ['barkhaul']], boss: true },
  // ---- 2장 항구도시 세라포트 ----
  c2_s1: { name: '세라포트 성문', theme: 'harbor', waves: [['ratkin_blade*3'], ['ratkin_blade*2,ratkin_xbow', 'pirate,ratkin_blade*2'], ['ratkin_xbow*2,pirate']] },
  c2_s2: { name: '어시장 골목', theme: 'harbor', waves: [['pirate*2'], ['ratkin_blade*3,ratkin_xbow', 'pirate*2,ratkin_xbow'], ['slime*3']] },
  c2_a1: { name: '해적 부두', theme: 'harbor', waves: [['pirate*2,ratkin_xbow'], ['pirate*3', 'ratkin_blade*2,ratkin_xbow*2'], ['pirate*2,slime*2']] },
  c2_a2: { name: '화물선 갑판', theme: 'harbor', waves: [['pirate*3'], ['ratkin_xbow*3,pirate']] },
  c2_a3: { name: '모그의 해적선', theme: 'harbor', waves: [['pirate*2,ratkin_blade'], ['captain_mog']], boss: true },
  c2_b1: { name: '하수도 입구', theme: 'sewer', waves: [['slime*3'], ['ratkin_blade*3,slime', 'ratkin_xbow*2,ratkin_blade*2'], ['slime*4']] },
  c2_b3: { name: '도둑 길드 금고', theme: 'sewer', waves: [['ratkin_blade*3'], ['ratkin_xbow*2,ratkin_blade*2']], treasure: true },
  c2_boss: { name: '오물 저수조', theme: 'sewer', waves: [['slime*3,ratkin_blade'], ['gloob']], boss: true },
  // ---- 3장 사막 매장 신전 ----
  c3_s1: { name: '모래 언덕 길', theme: 'desert', waves: [['scorpion*2,snakeman'], ['snakeman*2,skeleton_archer', 'scorpion*3'], ['mummy,skeleton_archer*2']] },
  c3_s2: { name: '신전 바깥뜰', theme: 'desert', waves: [['mummy*2'], ['skeleton_archer*3,snakeman', 'mummy*2,scorpion'], ['snakeman*3,skeleton_archer']] },
  c3_a1: { name: '지하 묘실', theme: 'tomb', waves: [['mummy*2,skeleton_archer'], ['skeleton_archer*3', 'mummy*3'], ['scorpion*2,mummy*2']] },
  c3_a2: { name: '왕들의 회랑', theme: 'tomb', waves: [['mummy*3'], ['skeleton_archer*2,snakeman*2']] },
  c3_a3: { name: '전갈 둥지', theme: 'tomb', waves: [['scorpion*3'], ['twinsting']], boss: true },
  c3_b1: { name: '모래폭풍 협곡', theme: 'desert', waves: [['scorpion*3'], ['snakeman*2,skeleton_archer*2', 'scorpion*2,snakeman'], ['mummy*2,snakeman*2']] },
  c3_b3: { name: '협곡 끝 감옥', theme: 'desert', waves: [['snakeman*3'], ['skeleton_archer*2,mummy*2']], treasure: true },
  c3_boss: { name: '여왕의 매장실', theme: 'tomb', waves: [['mummy*2,skeleton_archer'], ['sehera']], boss: true },
  // ---- 4장 서리 산맥 ----
  c4_s1: { name: '눈 덮인 고개', theme: 'snow', waves: [['frostwolf*3'], ['frostwolf*2,ice_spirit', 'snow_brute'], ['dwarf_miner*2,frostwolf*2']] },
  c4_s2: { name: '얼어붙은 다리', theme: 'snow', waves: [['ice_spirit*2,frostwolf'], ['snow_brute,dwarf_miner*2', 'frostwolf*4'], ['snow_brute*2']] },
  c4_a1: { name: '빙하 동굴', theme: 'snow', waves: [['ice_spirit*3'], ['frostwolf*3,ice_spirit', 'snow_brute,ice_spirit*2'], ['frostwolf*4']] },
  c4_a2: { name: '수정 빙벽', theme: 'snow', waves: [['snow_brute*2'], ['ice_spirit*3,frostwolf*2']] },
  c4_a3: { name: '와이번 둥지', theme: 'snow', waves: [['frostwolf*3'], ['frost_wyvern']], boss: true },
  c4_b1: { name: '드워프 폐요새', theme: 'dwarf', waves: [['dwarf_miner*3'], ['dwarf_miner*2,snow_brute', 'frostwolf*3,dwarf_miner'], ['dwarf_miner*4']] },
  c4_b3: { name: '요새 보물고', theme: 'dwarf', waves: [['dwarf_miner*2,snow_brute'], ['dwarf_miner*3,ice_spirit']], treasure: true },
  c4_boss: { name: '거인의 옥좌', theme: 'snow', waves: [['snow_brute*2'], ['hrimgar']], boss: true },
  // ---- 5장 공중 마도탑 ----
  c5_s1: { name: '마도탑 하층', theme: 'tower', waves: [['construct*2,gargoyle'], ['cultist,construct*2', 'gargoyle*3'], ['harpy*3,cultist']] },
  c5_s2: { name: '떠도는 서고', theme: 'tower', waves: [['cultist*2,gargoyle'], ['construct*3', 'harpy*2,cultist*2'], ['shadow_knight']] },
  c5_a1: { name: '시계 기관실', theme: 'tower', waves: [['construct*3'], ['gargoyle*2,construct*2', 'cultist*2,construct'], ['shadow_knight,construct*2']] },
  c5_a2: { name: '톱니 회랑', theme: 'tower', waves: [['construct*2,gargoyle*2'], ['shadow_knight,cultist*2']] },
  c5_a3: { name: '골렘 격납고', theme: 'tower', waves: [['construct*3'], ['golem7']], boss: true },
  c5_b1: { name: '하피 둥지', theme: 'tower', waves: [['harpy*3'], ['harpy*2,gargoyle*2', 'harpy*4'], ['cultist*2,harpy*2']] },
  c5_b3: { name: '바람의 테라스', theme: 'tower', waves: [['harpy*3,gargoyle'], ['shadow_knight,harpy*2']], treasure: true },
  c5_boss: { name: '현자의 관측실', theme: 'tower', waves: [['cultist*3'], ['orvex']], boss: true },
  // ---- 6장 흑월의 심연 ----
  c6_s1: { name: '심연의 문', theme: 'abyss', waves: [['imp*3,hound'], ['hound*3', 'imp*2,leech*2'], ['shade_hero']] },
  c6_s2: { name: '뒤집힌 하늘', theme: 'abyss', waves: [['leech*3'], ['hound*2,imp*2', 'imp*4'], ['shade_hero,hound*2']] },
  c6_a1: { name: '거울 회랑', theme: 'abyss', waves: [['shade_hero'], ['imp*3,hound*2', 'leech*3,imp'], ['shade_hero*2']] },
  c6_a2: { name: '깨진 거울 방', theme: 'abyss', waves: [['hound*3,leech'], ['shade_hero,imp*3']] },
  c6_a3: { name: '흑월의 제단', theme: 'abyss', waves: [['imp*3'], ['orvex_eclipse']], boss: true },
  c6_b1: { name: '영웅들의 무덤', theme: 'abyss', waves: [['shade_hero'], ['leech*3,hound*2', 'shade_hero,imp*2'], ['hound*4']] },
  c6_b3: { name: '첫 영웅의 관', theme: 'abyss', waves: [['shade_hero,leech*2'], ['shade_hero*2']], treasure: true },
  c6_boss: { name: '흑월의 심장', theme: 'abyss', waves: [['hound*2,imp*2'], ['azmal']], boss: true },
  // ---- 진 엔딩 숨은 보스 ----
  x_void: { name: '공허의 끝', theme: 'abyss', waves: [['void_shadow']], boss: true },
};

// ---------------- 장과 지도 ----------------
// 노드 순서: s1 → s2 → (A: a1 a2 a3[중간 보스] | B: b1 b2[이벤트] b3[보물·월석]) → boss
// pos: 지도 그림(1536×1024) 위 좌표. 1장 지도에 맞춘 값을 다른 장도 쓴다(지도 그림이 오면 고친다).
// 지도 그림(가로 1280) 위의 노드 좌표. 원을 자동 검출하고 가려진 것만 눈으로 채웠다.
const MAP_NODES = {
  1: { camp: [68, 418], s1: [206, 424], s2: [322, 416], a1: [433, 284], a2: [639, 266], a3: [828, 298], b1: [414, 588], b2: [636, 618], b3: [818, 576], boss: [926, 454] },
  2: { camp: [36, 445], s1: [106, 445], s2: [274, 446], a1: [434, 312], a2: [652, 282], a3: [896, 297], b1: [424, 645], b2: [671, 645], b3: [899, 494], boss: [1145, 521] },
  3: { camp: [30, 442], s1: [92, 442], s2: [268, 444], a1: [430, 326], a2: [618, 302], a3: [784, 342], b1: [389, 578], b2: [572, 608], b3: [771, 580], boss: [890, 448] },
  4: { camp: [81, 420], s1: [226, 410], s2: [348, 418], a1: [468, 266], a2: [697, 264], a3: [840, 309], b1: [372, 551], b2: [590, 600], b3: [796, 542], boss: [910, 416] },
  5: { camp: [32, 444], s1: [94, 444], s2: [260, 440], a1: [431, 326], a2: [600, 283], a3: [764, 325], b1: [403, 619], b2: [592, 668], b3: [774, 626], boss: [918, 429] },
  6: { camp: [30, 418], s1: [88, 418], s2: [236, 412], a1: [398, 244], a2: [594, 236], a3: [776, 252], b1: [344, 616], b2: [594, 662], b3: [850, 592], boss: [914, 418] },
};
const MAP_POS = MAP_NODES[1];
const CHAPTERS = [
  { n: 1, name: '국경 숲 가도', map: 'map/c1', routeA: '불타는 마을', routeB: '안개 늪', moon: 'red', lv: 1 },
  { n: 2, name: '항구도시 세라포트', map: 'map/c2', routeA: '해적 부두', routeB: '도둑 길드 지하', moon: null, lv: 6 },
  { n: 3, name: '사막 매장 신전', map: 'map/c3', routeA: '지하 묘실', routeB: '모래폭풍 협곡', moon: 'yellow', lv: 11 },
  { n: 4, name: '서리 산맥', map: 'map/c4', routeA: '빙하 동굴', routeB: '드워프 폐요새', moon: 'blue', lv: 16 },
  { n: 5, name: '공중 마도탑', map: 'map/c5', routeA: '시계 기관실', routeB: '하피 둥지', moon: 'silver', lv: 21 },
  { n: 6, name: '흑월의 심연', map: 'map/c6', routeA: '거울 회랑', routeB: '영웅들의 무덤', moon: 'green', lv: 26 },
];
// 🆕 갈림길: 고르기 전에 '얻는 것 / 감수할 것'을 보여 주고, 길마다 규칙이 붙는다.
// A = 정면 돌파(중간 보스 전리품·금화, 정예 증가) / B = 우회 탐색(이야기·보물, 길마다 다른 불리함)
// ✏️ 2026-11-22 핵심 아이템(월석·흑월 씨앗)이 있는 길을 장마다 섞는다 → KEY_ROUTE
const ROUTE_A_RULE = { eliteAdd: 0.15, goldMul: 1.3 };
const ROUTES = {
  1: { A: { gain: '중간 보스 「이빨부숴」 전리품 · 금화 +30%', risk: '불길 속 정면 돌파 — 정예가 더 자주 나온다', tag: '전리품 · 금화', rule: { ...ROUTE_A_RULE, ko: '정면 돌파 — 정예 증가 · 금화 +30%' } },
       B: { gain: '적월의 월석 (진 엔딩 조건) · 리세 이야기 · 늪 속 보물', risk: '늪 안개 — 회복 하트가 나오지 않는다', tag: '월석 · 이야기', rule: { noHeart: true, ko: '늪 안개 — 회복 하트 없음' } } },
  2: { A: { gain: '중간 보스 「갈고리 선장 모그」 전리품 · 금화 +30%', risk: '해적 소굴 — 정예가 더 자주 나온다', tag: '전리품 · 금화', rule: { ...ROUTE_A_RULE, ko: '정면 돌파 — 정예 증가 · 금화 +30%' } },
       B: { gain: '도둑 길드 금고 (장비 상자) · 길드 이야기', risk: '좁은 하수도 — 적에게 받는 피해 +15%', tag: '금고 · 이야기', rule: { dmgMul: 1.15, ko: '좁은 하수도 — 받는 피해 +15%' } } },
  3: { A: { gain: '중간 보스 「쌍침」 전리품 · 금화 +30%', risk: '묘실의 수호자 — 정예가 더 자주 나온다', tag: '전리품 · 금화', rule: { ...ROUTE_A_RULE, ko: '정면 돌파 — 정예 증가 · 금화 +30%' } },
       B: { gain: '황월의 월석 (진 엔딩 조건) · 감옥의 이야기', risk: '모래폭풍 — 적이 빨라진다', tag: '월석 · 이야기', rule: { speedMul: 1.15, ko: '모래폭풍 — 적 이동 속도 +15%' } } },
  4: { A: { gain: '청월의 월석 (진 엔딩 조건) · 중간 보스 「서리 와이번」 전리품', risk: '월석을 품은 와이번 둥지 — 정예가 훨씬 자주 나온다', tag: '월석 · 전리품', rule: { eliteAdd: 0.25, ko: '와이번 둥지 — 정예 크게 증가' } },
       B: { gain: '요새 보물고 (장비 상자 · 금화) · 드워프와 리세의 이야기', risk: '드워프 요새 — 적 체력 +20%', tag: '보물 · 이야기', rule: { hpMul: 1.2, ko: '드워프 요새 — 적 체력 +20%' } } },
  5: { A: { gain: '은월의 월석 (진 엔딩 조건) · 중간 보스 「마도 골렘 칠호」 전리품', risk: '월석으로 움직이는 골렘 격납고 — 정예가 훨씬 자주 나온다', tag: '월석 · 전리품', rule: { eliteAdd: 0.25, ko: '골렘 격납고 — 정예 크게 증가' } },
       B: { gain: '하피 둥지의 보물 (장비 상자 · 금화) · 바람과 리세의 이야기', risk: '돌풍 — 적이 빨라진다', tag: '보물 · 이야기', rule: { speedMul: 1.2, ko: '돌풍 — 적 이동 속도 +20%' } } },
  6: { A: { gain: '중간 보스 「흑월 오르벡스」 전리품 · 금화 +30%', risk: '거울 속 그림자 — 정예가 더 자주 나온다', tag: '전리품 · 금화', rule: { ...ROUTE_A_RULE, ko: '정면 돌파 — 정예 증가 · 금화 +30%' } },
       B: { gain: '녹월의 월석 (진 엔딩 조건) · 첫 영웅의 이야기', risk: '무덤의 냉기 — 회복 하트 없음 · 받는 피해 +10%', tag: '월석 · 이야기', rule: { noHeart: true, dmgMul: 1.1, ko: '무덤의 냉기 — 회복 하트 없음 · 받는 피해 +10%' } } },
};
// 🆕 핵심 아이템(월석·흑월 씨앗)이 있는 길. 적지 않은 장은 B(b3 보물), A면 중간 보스(a3)가 지키고 있다.
const KEY_ROUTE = { 4: 'A', 5: 'A', 7: 'A', 9: 'A', 11: 'A' };
function keyRoute(ch) { return KEY_ROUTE[ch] || 'B'; }
// 장의 노드 목록 (id, 종류, 스테이지 키, 다음 노드)
function chapterNodes(n) {
  const c = 'c' + n;
  return {
    // ✏️ 장 심화: s3 · a4 · b4 · 곁가지 x1 추가 (docs/expansion-plan.md)
    s1: { type: 'stage', stage: c + '_s1', next: ['s2'] },
    s2: { type: 'stage', stage: c + '_s2', next: ['s3'] },
    s3: { type: 'stage', stage: c + '_s3', next: ['a1', 'b1', 'x1'] },
    x1: { type: 'side', stage: c + '_x1', next: [] },
    a1: { type: 'stage', stage: c + '_a1', next: ['a2'], route: 'A' },
    a2: { type: 'stage', stage: c + '_a2', next: ['a3'], route: 'A' },
    a3: { type: 'midboss', stage: c + '_a3', next: ['a4'], route: 'A' },
    a4: { type: 'stage', stage: c + '_a4', next: ['boss'], route: 'A' },
    b1: { type: 'stage', stage: c + '_b1', next: ['b2'], route: 'B' },
    b2: { type: 'event', event: c + '_event', next: ['b3'], route: 'B' },
    b3: { type: 'treasure', stage: c + '_b3', next: ['b4'], route: 'B' },
    b4: { type: 'stage', stage: c + '_b4', next: ['boss'], route: 'B' },
    boss: { type: 'boss', stage: c + '_boss', next: [] },
  };
}

// 월석 (6종). 백월은 오델리아의 성표에 처음부터 있다(2장 대화에서 알게 된다).
const MOONS = {
  red: { ko: '적월', col: 0xff5a3a, ch: 1 },
  yellow: { ko: '황월', col: 0xffd84a, ch: 3 },
  blue: { ko: '청월', col: 0x6ab8ff, ch: 4 },
  silver: { ko: '은월', col: 0xd8d8f0, ch: 5 },
  green: { ko: '녹월', col: 0x7ae07a, ch: 6 },
  white: { ko: '백월', col: 0xffffff, ch: 2 },
};

// 장별 몬스터 강함 배율
// 🆕 일반 몬스터 강화 (장별). hp·dmg 배율, elite = 보통 난이도에서 정예가 나올 확률, extraWave = 보스가 아닌 스테이지에 붙는 웨이브 수
const MOB_TUNE = {
  1: { hp: 1.5, dmg: 1.35, elite: 0, extraWave: 1 },
  2: { hp: 1.55, dmg: 1.35, elite: 0.06, extraWave: 1 },
  3: { hp: 1.55, dmg: 1.3, elite: 0.08, extraWave: 2 },
  4: { hp: 1.5, dmg: 1.3, elite: 0.1, extraWave: 2 },
  5: { hp: 1.35, dmg: 1.15, elite: 0.12, extraWave: 2 },
  6: { hp: 1.3, dmg: 1.1, elite: 0.14, extraWave: 2 },
};
// 🆕 보스 강화 (장별). hp·dmg 배율, cool = 공격 사이 쉬는 시간 배율(작을수록 자주), poiseK = 받은 피해 1%당 그로기 감소, stagger = 그로기 시간(ms)
const BOSS_TUNE = {
  1: { hp: 1.35, dmg: 1.6, cool: 0.7, poiseK: 2.2, stagger: 1700 },
  2: { hp: 1.35, dmg: 1.55, cool: 0.7, poiseK: 2.2, stagger: 1700 },
  3: { hp: 1.25, dmg: 1.4, cool: 0.75, poiseK: 2.4, stagger: 1800 },
  4: { hp: 1.15, dmg: 1.25, cool: 0.8, poiseK: 2.6, stagger: 1900 },
  5: { hp: 1, dmg: 1.05, cool: 0.9, poiseK: 3, stagger: 2000 },
  6: { hp: 1, dmg: 1, cool: 0.95, poiseK: 3, stagger: 2100 },
};
function chapterScale(ch, diff = 1) {
  const hp = [1, 1, 1.15, 1.3, 1.5, 1.7, 1.95, 2.2, 2.45, 2.7, 2.95, 3.2, 3.5][ch] || 1;
  const dmg = [1, 1, 1.05, 1.12, 1.2, 1.3, 1.4, 1.48, 1.56, 1.64, 1.72, 1.8, 1.9][ch] || 1;
  const d = [0.75, 1, 1.5, 2.2][diff] || 1;
  return { hp: hp * d, dmg: dmg * (0.6 + 0.4 * d) };
}
