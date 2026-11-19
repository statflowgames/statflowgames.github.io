// 직업 6종: 공격 표, 리그, 각성기, 스킬 효과 표, 패시브 해석.
// 공격 표 항목: clip, dur, hit[시작,끝], dmg, reach, dz, kb, type, stop, next, swing, lunge
//   proj: { img, vx, dmg, pierce, n, spread, elem, sc, rot, z }  → 맞는 순간 투사체를 쏜다 (근접 판정 없음)
//   special: 'blink'|'icepillar'|'firefield'|'shadowstep'|'spin'|'daggerrain'|'volley'|'sanctuary'|'voidslam'|'burst'
const cloneAtk = (src, f = {}) => {
  const o = {};
  for (const [k, a] of Object.entries(src)) {
    const d = f.dur || 1, dm = f.dmg || 1;
    o[k] = { ...a, dur: Math.round(a.dur * d), hit: a.hit.map(v => Math.round(v * d)), next: a.next ? Math.round(a.next * d) : a.next, dmg: Math.round(a.dmg * dm) };
  }
  return o;
};

function makeClasses() {
  const W = HERO_ATK;
  const C = {};
  C.warrior = {
    atk: W, hp: 1, smear: 'smear_warrior', awaken: 'shieldWall', elem: null,
    swingSfx: 'blade', guardFx: 'guard_flash',
  };
  // ---- 원소술사: 지팡이로 원소탄을 쏜다 ----
  const bolt = (img, elem, dmg) => ({ img: 'mage/' + img, vx: 980, dmg, elem, sc: 0.55, z: 120, life: 900 });
  C.mage = {
    hp: 0.82, smear: 'smear_mage', awaken: 'meteors', ranged: true, guardFx: 'holy_ring',
    atk: {
      a1: { clip: 'c_cast', dur: 300, hit: [150, 160], dmg: 0, next: 170, proj: bolt('crystal_fire', 'fire', 13) },
      a2: { clip: 'c_cast', dur: 300, hit: [150, 160], dmg: 0, next: 170, proj: bolt('crystal_ice', 'ice', 13) },
      a3: { clip: 'c_cast', dur: 300, hit: [150, 160], dmg: 0, next: 170, proj: bolt('crystal_bolt', 'bolt', 13) },
      a4: { clip: 'c_big', dur: 560, hit: [380, 390], dmg: 0, special: 'burst', sdmg: 34, fin: true, shake: 6 },
      dash: { clip: 'c_cast', dur: 300, hit: [60, 70], dmg: 0, special: 'blink' },
      up: { clip: 'c_big', dur: 460, hit: [300, 310], dmg: 0, special: 'icepillar', sdmg: 24 },
      down: { clip: 'c_cast', dur: 380, hit: [150, 160], dmg: 0, special: 'firefield', sdmg: 9 },
      jump: { clip: 'c_cast', dur: 360, hit: [150, 160], dmg: 0, proj: { ...bolt('crystal_fire', 'fire', 18), vy: 260 } },
    },
  };
  // ---- 성기사: 묵직한 망치와 신성 ----
  const pal = cloneAtk(W, { dur: 1.08, dmg: 1.15 });
  pal.up.special = 'holyup'; pal.down.special = 'sanctuary';
  C.paladin = { atk: pal, hp: 1.12, smear: 'smear_warrior', smearTint: 0xfff0b0, awaken: 'holyDescent', elem: 'holy', guardFx: 'guard_flash' };
  // ---- 그림자도적: 빠른 쌍단검, 등 뒤 치명타 ----
  const rog = cloneAtk(W, { dur: 0.74, dmg: 0.78 });
  rog.a3 = { ...rog.a2, swing: 'h', dmg: 12, lunge: 260 };
  rog.a4 = { ...rog.a4, dmg: 30 };
  rog.dash = { clip: 'w_atk1', dur: 330, hit: [90, 150], dmg: 26, reach: [0, 160], dz: 40, kb: 200, type: 'knock', stop: 70, special: 'shadowstep' };
  rog.up = { ...rog.up, special: 'spin', type: 'launch' };
  rog.down = { clip: 'r_volley', dur: 420, hit: [200, 210], dmg: 0, special: 'daggerrain', sdmg: 12 };
  C.rogue = { atk: rog, hp: 0.86, smear: 'smear_warrior', smearTint: 0xc8a0ff, awaken: 'moonDance', critAdd: 8, backstab: true, guardFx: 'guard_flash' };
  // ---- 월광궁수: 화살 ----
  const arrow = (dmg, o = {}) => ({ img: 'fx/arrow_trail', vx: 1250, dmg, pierce: true, sc: 0.32, z: 125, life: 800, ...o });
  C.ranger = {
    hp: 0.86, smear: 'smear_warrior', awaken: 'arrowRain', ranged: true, guardFx: 'guard_flash',
    atk: {
      a1: { clip: 'r_shoot', dur: 300, hit: [180, 190], dmg: 0, next: 170, proj: arrow(13) },
      a2: { clip: 'r_shoot', dur: 300, hit: [180, 190], dmg: 0, next: 170, proj: arrow(13) },
      a3: { clip: 'r_shoot', dur: 300, hit: [180, 190], dmg: 0, next: 170, proj: arrow(14) },
      a4: { clip: 'r_shoot', dur: 460, hit: [180, 190], dmg: 0, fin: true, proj: arrow(15, { n: 3, spread: 70 }) },
      dash: { clip: 'w_up', dur: 380, hit: [120, 200], dmg: 18, reach: [0, 130], dz: 36, kb: 380, type: 'knock', stop: 70, special: 'backflip' },
      up: { clip: 'r_volley', dur: 420, hit: [220, 230], dmg: 0, special: 'volley', sdmg: 14 },
      down: { clip: 'w_atk3', dur: 340, hit: [115, 200], dmg: 16, reach: [10, 150], dz: 34, kb: 300, type: 'knock', stop: 75, swing: 's', lunge: 200 },
      jump: { clip: 'r_shoot', dur: 360, hit: [150, 160], dmg: 0, proj: arrow(16, { vy: 300 }) },
    },
  };
  // ---- 흑월술사: 대검, 체력이 낮을수록 강해진다 ----
  const hex = cloneAtk(W, { dur: 1.18, dmg: 1.35 });
  hex.down.special = 'voidslam';
  C.hexblade = { atk: hex, hp: 1.0, smear: 'smear_warrior', smearTint: 0xb070ff, awaken: 'blackMoon', frenzy: true, guardFx: 'guard_flash' };
  // 내려찍기(바닥 충격) 표시
  for (const c of Object.values(C)) if (c.atk.down && !c.ranged) c.atk.down.slam = true;
  return C;
}
let CLASSES = null;
function classOf(key) { if (!CLASSES) CLASSES = makeClasses(); return CLASSES[key] || CLASSES.warrior; }

// ---------------------------------------------------------------------------
// 주인공 리그 (부품 이름은 tools/slice_art.py 결과)
// ---------------------------------------------------------------------------
function heroRig(key) {
  if (key === 'warrior') return RIGS.warrior();
  const W0 = HAS(key, 'weapon_0') ? 'weapon_0' : null;
  const OFF = HAS(key, 'offhand_0') ? 'offhand_0' : null;
  const base = { h: 214, extra: [], alias: {} };
  const capeImg = HAS(key, 'cape') ? 'cape' : null;
  if (key === 'mage') {
    Object.assign(base, {
      h: 206, weapon: W0 && { img: W0, a: [0.5, 0.55], sc: 1.2, ir: 270 },
      cape: capeImg ? {} : undefined,
      extra: [{ img: 'skirt', on: 'root', at: [0, 0.05], a: [0.5, 0.15], z: 45 }],
    });
    // 주위를 도는 수정 3개
    const procs = [];
    ['crystal_fire', 'crystal_ice', 'crystal_bolt'].forEach((img, i) => {
      if (!HAS(key, img)) return;
      base.extra.push({ n: 'cr' + i, img: 'px', raw: true, hide: true, on: 'torso', at: [-0.15, -1.05], z: 1 });
      base.extra.push({ n: 'crb' + i, img, on: 'cr' + i, at: [0.95, 0], a: [0.5, 0.5], z: 2, sc: 0.62, ir: 0 });
      procs.push({ n: 'cr' + i, spin: 0.12, ph: i * 120 });
    });
    base.procs = procs;
  } else if (key === 'paladin') {
    Object.assign(base, {
      h: 222, weapon: W0 && { img: W0, a: [0.5, 0.85], sc: 1.25 }, shield: OFF && { img: OFF, sc: 1.4 },
      extra: [{ img: 'tabard', on: 'root', at: [0.04, 0.05], a: [0.5, 0.1], z: 46 }, { img: 'braid', on: 'head', at: [-0.3, -0.35], a: [0.5, 0.05], z: 65 }],
    });
  } else if (key === 'rogue') {
    Object.assign(base, {
      h: 204, weapon: W0 && { img: W0, a: [0.5, 0.82], sc: 1.0 }, frontItem: (OFF || W0) && { img: OFF || W0, a: [0.5, 0.82], sc: 0.9, ir: 90 },
      extra: [{ img: 'scarf', on: 'torso', at: [0.1, -0.78], a: [0.85, 0.2], z: 4 }],
    });
  } else if (key === 'ranger') {
    Object.assign(base, {
      h: 210, frontItem: W0 && { img: W0, a: [0.5, 0.5], sc: 1.1, ir: 90 },
      extra: [{ img: 'quiver', on: 'torso', at: [-0.3, -0.6], a: [0.5, 0.3], z: 4, r: -20 }],
    });
  } else if (key === 'hexblade') {
    Object.assign(base, {
      h: 224, weapon: W0 && { img: W0, a: [0.5, 0.88], sc: 1.3 },
      cape: capeImg ? {} : undefined,
    });
  }
  // 부품 시트에 없는 장식은 autoHumanoid가 건너뛴다
  return autoHumanoid(key, base);
}

// ---------------------------------------------------------------------------
// 액티브 스킬 효과 표 (skills.md 이름 → 일반 효과). 하르반 3종은 game.js에 따로 있다.
// t: proj | area | line | buff | heal | shield | blink | aura | freeze | mark | zone | delayed
// ---------------------------------------------------------------------------
const SKILL_FX = {
  // 하르반
  '방패 반사': { t: 'shield', ms: 2000, red: 0.6, cd: 10000, reflect: true },
  '회전 방패': { t: 'proj', img: 'warrior/shield_0', dmg: 26, pierce: true, sc: 0.7, spin: true, cd: 7000 },
  '산 가르기': { t: 'area', at: 140, r: 130, dmg: 62, fx: 'impact_ring', poise: 40, cd: 12000 },
  '군기 꽂기': { t: 'aura', ms: 7000, tick: 1000, heal: 0.03, def: 0.25, fx: 'holy_ring', cd: 20000 },
  // 미라엘
  '화염구': { t: 'proj', img: 'mage/crystal_fire', dmg: 30, elem: 'fire', boom: 90, sc: 0.9, cd: 4000 },
  '불꽃 회오리': { t: 'proj', img: 'fx/fire_burst', dmg: 16, elem: 'fire', pierce: true, vx: 420, sc: 0.35, life: 1500, rehit: 300, cd: 8000 },
  '태양핵': { t: 'delayed', at: 260, r: 170, dmg: 72, elem: 'fire', fx: 'fire_burst', delay: 600, cd: 14000 },
  '서리 창': { t: 'proj', img: 'mage/crystal_ice', dmg: 26, elem: 'ice', pierce: true, vx: 1200, sc: 0.8, cd: 5000 },
  '얼음 방벽': { t: 'shield', ms: 3000, red: 0.5, reflect: true, fx: 'ice_shards', cd: 12000 },
  '절대영도': { t: 'freeze', ms: 2000, fx: 'ice_shards', cd: 22000 },
  '번개 화살': { t: 'proj', img: 'mage/crystal_bolt', dmg: 22, elem: 'bolt', chain: 2, vx: 1300, sc: 0.8, cd: 4000 },
  '뇌운': { t: 'aura', ms: 6000, tick: 650, strike: 20, fx: 'lightning_bolt', elem: 'bolt', cd: 16000 },
  '천둥창': { t: 'line', n: 7, step: 140, dmg: 40, fx: 'lightning_bolt', elem: 'bolt', cd: 12000 },
  // 오델리아
  '성광 일격': { t: 'area', at: 120, r: 110, dmg: 40, fx: 'holy_pillar', elem: 'holy', cd: 5000 },
  '심판의 망치': { t: 'delayed', at: 220, r: 150, dmg: 64, fx: 'holy_pillar', elem: 'holy', delay: 400, cd: 12000 },
  '백월의 선고': { t: 'line', n: 6, step: 130, dmg: 36, fx: 'holy_pillar', elem: 'holy', cd: 10000 },
  '성스러운 방패': { t: 'shield', ms: 4000, red: 0.5, fx: 'holy_ring', cd: 14000 },
  '보호의 원': { t: 'shield', ms: 6000, red: 0.4, fx: 'holy_ring', cd: 18000 },
  '치유의 손': { t: 'heal', pct: 0.25, fx: 'holy_ring', cd: 16000 },
  '정화의 물결': { t: 'heal', pct: 0.12, wave: 18, fx: 'holy_ring', cd: 12000 },
  '기적': { t: 'heal', pct: 1, once: true, fx: 'holy_pillar', cd: 60000 },
  // 키르
  '급소 찌르기': { t: 'area', at: 90, r: 70, dmg: 34, back: 3, fx: 'hit_spark', cd: 3000 },
  '표식': { t: 'mark', ms: 8000, val: 0.3, cd: 10000 },
  '일격필살': { t: 'blink', dmg: 80, cd: 12000 },
  '독 바르기': { t: 'buff', key: 'poison', ms: 10000, cd: 18000 },
  '독안개 폭탄': { t: 'zone', at: 200, r: 140, dmg: 8, ms: 5000, fx: 'poison_cloud', elem: 'poison', cd: 12000 },
  '독사의 송곳니': { t: 'area', at: 100, r: 90, dmg: 18, pulses: 3, elem: 'poison', fx: 'hit_spark', cd: 8000 },
  '칼날 회오리': { t: 'area', at: 0, r: 160, dmg: 16, pulses: 4, fx: 'slash_arc', cd: 7000 },
  '그림자 분신': { t: 'aura', ms: 8000, tick: 600, strike: 15, fx: 'shadow_smoke', cd: 20000 },
  // 세릴
  '관통 화살': { t: 'proj', img: 'fx/arrow_trail', dmg: 32, pierce: true, vx: 1500, sc: 0.45, cd: 4000 },
  '삼연사': { t: 'proj', img: 'fx/arrow_trail', dmg: 17, pierce: true, vx: 1400, sc: 0.32, burst: 3, cd: 5000 },
  '저격': { t: 'proj', img: 'fx/arrow_trail', dmg: 74, pierce: true, vx: 2000, sc: 0.55, poise: 30, cd: 12000 },
  '덩굴 덫': { t: 'zone', at: 200, r: 120, dmg: 4, ms: 4000, root: true, fx: 'poison_cloud', tint: 0x80d060, cd: 12000 },
  '늑대 정령': { t: 'aura', ms: 15000, tick: 800, strike: 16, fx: 'dust_run', cd: 28000 },
  '대지의 분노': { t: 'zone', at: 160, r: 260, dmg: 9, ms: 5000, fx: 'poison_cloud', tint: 0x90c070, cd: 16000 },
  '달빛 화살': { t: 'proj', img: 'fx/arrow_trail', dmg: 24, home: true, burst: 3, vx: 900, sc: 0.35, tint: 0xd0e0ff, cd: 6000 },
  '월광 장막': { t: 'shield', ms: 3000, red: 0.5, reflect: true, fx: 'holy_ring', cd: 12000 },
  '초승달 사격': { t: 'proj', img: 'fx/slash_arc', dmg: 56, pierce: true, vx: 1100, sc: 0.5, tint: 0xd8e8ff, cd: 12000 },
  // 녹타
  '저주의 낙인': { t: 'mark', ms: 8000, val: 0.25, cd: 9000 },
  '고통의 사슬': { t: 'area', at: 0, r: 260, dmg: 20, mark: 0.15, fx: 'void_crack', cd: 10000 },
  '파멸의 선고': { t: 'delayed', at: 'target', r: 140, dmg: 90, fx: 'void_crack', delay: 3000, cd: 16000 },
  '피의 대가': { t: 'area', at: 120, r: 120, dmg: 72, hpCost: 0.1, fx: 'void_crack', cd: 6000 },
  '핏빛 회오리': { t: 'area', at: 0, r: 150, dmg: 18, pulses: 3, leech: 0.3, fx: 'slash_arc', tint: 0xff5050, cd: 8000 },
  '혈월': { t: 'buff', key: 'bloodmoon', ms: 10000, cd: 24000 },
  '공허 베기': { t: 'proj', img: 'fx/slash_arc', dmg: 34, pierce: true, vx: 1000, sc: 0.45, tint: 0xb070ff, cd: 5000 },
  '일식 폭발': { t: 'area', at: 0, r: 210, dmg: 46, fx: 'void_crack', cd: 9000 },
  '월식': { t: 'aura', ms: 8000, tick: 700, strike: 14, buffAtk: 0.25, fx: 'shadow_smoke', cd: 22000 },
};

// ---------------------------------------------------------------------------
// 패시브: 효과 문장에서 숫자를 읽어 능력치로 바꾼다. 상태이상처럼 따로 구현이 필요한 것은 이름으로 처리한다.
// ---------------------------------------------------------------------------
const PASSIVE_RULES = [
  [/^방어력 \+(\d+)%/, (st, v) => { st.defPct += v; }],
  [/각성 게이지 충전 \+(\d+)%/, (st, v) => { st.awkPct += v; }],
  [/언데드와 악마에게 피해 \+(\d+)%/, (st, v) => { st.vsUndead += v; }],
  [/기절하거나 다운된 적에게 피해 \+(\d+)%/, (st, v) => { st.vsDown += v; }],
  [/체력 (\d+)% 이하인 적에게 피해 \+(\d+)%/, (st, a, b) => { st.execute = Math.max(st.execute, b); st.executeAt = a; }],
  [/등 뒤 치명타 피해 \+(\d+)%/, (st, v) => { st.vsBack += v; }],
  [/준 피해의 (\d+)%만큼 체력 회복|준 피해의 (\d+)% 흡혈/, (st, a, b) => { st.lifesteal += (a || b); }],
  [/잃은 체력 1%당 피해 \+1%/, st => { st.frenzy = 1; }],
  [/매초 체력 회복/, st => { st.regen += 0.6; }],
  [/체력 50% 이하일 때 방어력 \+(\d+)%/, (st, v) => { st.lowHpDef += v; }],
  [/구르기 스태미나 소모 -(\d+)%/, (st, v) => { st.rollCost += v; }],
  [/스테이지당 1회, 쓰러지면 체력 50%로 부활/, st => { st.revive = 1; }],
  [/받은 피해의 (\d+)%를 반사/, (st, v) => { st.thorns += v; }],
  [/멀리 있는 적에게 치명타 \+(\d+)%/, (st, v) => { st.crit += v / 2; }],
  [/공중에서 한 번 더 점프/, st => { st.doubleJump = 1; }],
  [/상태이상 저항 \+(\d+)%/, (st, v) => { st.redMelee += 3; }],
  [/저스트 가드 판정 \+(\d+)%/, (st, v) => { st.parryWin += v; }],
];
function applyPassives(s, st) {
  const list = DB.skills[s.hero]?.list || [];
  for (const k of ['vsUndead', 'execute', 'executeAt', 'vsBack', 'lifesteal', 'frenzy', 'regen', 'lowHpDef', 'rollCost', 'revive', 'thorns', 'doubleJump', 'elemPct']) st[k] = st[k] || 0;
  list.forEach((sk, i) => {
    if (!s.skills[i] || sk.kind !== '패시브') return;
    let hit = false;
    for (const [re, fn] of PASSIVE_RULES) {
      const m = sk.fx.match(re);
      if (m) { fn(st, ...m.slice(1).map(x => (x === undefined ? undefined : +x))); hit = true; }
    }
    // 상태이상·연쇄 같은 세부 효과는 속성 피해 보너스로 단순화한다
    if (!hit) st.elemPct += 12;
  });
}

// 직업 리그 등록 (하르반은 rig.js에 손으로 맞춘 값이 있다)
for (const k of ['mage', 'paladin', 'rogue', 'ranger', 'hexblade']) RIGS[k] = () => heroRig(k);
