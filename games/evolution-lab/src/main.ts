import Phaser from 'phaser';
import './style.css';

const W = 450, H = 800, SAVE_KEY = 'evolution-lab-save-v1';
type Base = 'slime' | 'bug' | 'stone';
type Ability = 'spikes' | 'poison' | 'wings' | 'armor' | 'tentacle' | 'split' | 'vampire' | 'regen' | 'explode' | 'electric' | 'giant' | 'camouflage';
type Creature = { id: string; base: Base; name: string; hp: number; atk: number; speed: number; abilities: Ability[]; rarity: number; born: string; recipe: string };
type Save = { creatures: Creature[]; discovered: string[]; credits: number; wins: number };

const BASES: Record<Base, { ko: string; hp: number; atk: number; speed: number; color: number }> = {
  slime: { ko: '슬라임', hp: 100, atk: 10, speed: 3, color: 0x43e4dd },
  bug: { ko: '버그', hp: 70, atk: 15, speed: 5, color: 0xa58cff },
  stone: { ko: '스톤', hp: 160, atk: 8, speed: 2, color: 0x8d9aad },
};
const ABILITIES: Record<Ability, { ko: string; color: number; desc: string }> = {
  spikes: { ko: '가시', color: 0xff8b6b, desc: '근접 피해 반사' }, poison: { ko: '독', color: 0x76ef76, desc: '지속 피해' },
  wings: { ko: '날개', color: 0xff95ed, desc: '고속 이동' }, armor: { ko: '갑옷', color: 0x9eb7ca, desc: '피해 30% 감소' },
  tentacle: { ko: '촉수', color: 0xd07aff, desc: '공격 범위 증가' }, split: { ko: '분열', color: 0x69d9ff, desc: '사망 시 분열' },
  vampire: { ko: '흡혈', color: 0xff5579, desc: '공격 시 회복' }, regen: { ko: '재생', color: 0x76ffc0, desc: '주기적 회복' },
  explode: { ko: '폭발', color: 0xffb84d, desc: '사망 시 광역 피해' }, electric: { ko: '전기', color: 0xfff36c, desc: '연쇄 공격' },
  giant: { ko: '거대화', color: 0xffcb76, desc: '체력 50% 증가' }, camouflage: { ko: '위장', color: 0x8ef0ba, desc: '첫 공격 회피' },
};
const ABILITY_LIST = Object.keys(ABILITIES) as Ability[];
const SPECIES = [
  '쾌속 젤리', '갑옷 슬라임', '장갑 버그', '독침 젤리', '번개 날개충',
  '수정 등껍질', '흡혈 점액룡', '분열 전기체', '폭발 비행종', '재생 골렘',
  '위장 촉수충', '거대 독석', '가시 갑각체', '유령 젤리', '프리즘 키메라',
];

function style(size = 16, color = '#fff'): Phaser.Types.GameObjects.Text.TextStyle { return { fontFamily: 'Inter, Noto Sans KR, sans-serif', fontSize: `${size}px`, color, fontStyle: 'bold' }; }
function id() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
function starter(base: Base): Creature { const b = BASES[base]; return { id: id(), base, name: b.ko, hp: b.hp, atk: b.atk, speed: b.speed, abilities: [], rarity: 1, born: new Date().toISOString().slice(0, 10), recipe: '기본 배양' }; }
function loadSave(): Save {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '') as Save; if (s.creatures?.length) return s; } catch { /* new lab */ }
  return { creatures: [starter('slime'), starter('bug'), starter('stone')], discovered: ['슬라임', '버그', '스톤'], credits: 120, wins: 0 };
}
function save(s: Save) { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); }

class CreatureView extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, public creature: Creature, scale = 1) {
    super(scene, x, y); scene.add.existing(this); this.setScale(scale);
    const b = BASES[creature.base], giant = creature.abilities.includes('giant') ? 1.2 : 1;
    const shadow = scene.add.ellipse(0, 26, 62 * giant, 16, 0x000000, 0.28);
    this.add(shadow);
    if (creature.abilities.includes('wings')) this.add([scene.add.ellipse(-31, -2, 29, 40, 0xff9bf2, 0.8).setAngle(-25), scene.add.ellipse(31, -2, 29, 40, 0xff9bf2, 0.8).setAngle(25)]);
    if (creature.abilities.includes('tentacle')) {
      for (let i = -1; i <= 1; i++) this.add(scene.add.rectangle(i * 17, 26, 9, 34, 0xb66fea).setOrigin(0.5, 0).setAngle(i * 18));
    }
    const body = creature.base === 'stone'
      ? scene.add.polygon(0, 0, [-35,18,-30,-20,-9,-35,25,-27,37,5,25,28,-18,32], b.color)
      : creature.base === 'bug'
        ? scene.add.ellipse(0, 0, 68, 53, b.color)
        : scene.add.ellipse(0, 5, 74, 60, b.color);
    body.setScale(giant).setStrokeStyle(3, 0xffffff, 0.35); this.add(body);
    if (creature.abilities.includes('armor')) this.add([scene.add.arc(0, 2, 31 * giant, 195, 345, false, 0xb8c8d9, 0.88).setStrokeStyle(3, 0xe9f4ff), scene.add.rectangle(0, 3, 12, 47, 0x667b91, 0.7)]);
    if (creature.abilities.includes('spikes')) for (let i = -2; i <= 2; i++) this.add(scene.add.triangle(i * 14, -28 * giant + Math.abs(i) * 4, 0, 13, 7, 0, 14, 13, 0xff876f).setAngle(i * 8));
    if (creature.base === 'bug') this.add([scene.add.triangle(-24, -18, 0, 14, 7, 0, 14, 14, 0x6a45a3), scene.add.triangle(24, -18, 0, 14, 7, 0, 14, 14, 0x6a45a3)]);
    const eyeColor = creature.abilities.includes('poison') ? 0x9cff68 : creature.abilities.includes('electric') ? 0xfff06a : 0x172331;
    this.add([scene.add.circle(-14, 0, 6, 0xffffff), scene.add.circle(14, 0, 6, 0xffffff), scene.add.circle(-14, 1, 3, eyeColor), scene.add.circle(14, 1, 3, eyeColor)]);
    this.add(scene.add.arc(0, 13, 8, 15, 165, false).setStrokeStyle(2, 0x17303a));
    if (creature.abilities.includes('poison')) this.add(scene.add.circle(27, 20, 7, 0x68ee69, 0.75));
    if (creature.abilities.includes('electric')) for (let i = 0; i < 3; i++) this.add(scene.add.line(0, 0, -42 + i * 39, -10, -32 + i * 39, -22, 0xfff36c).setLineWidth(3));
    if (creature.abilities.includes('camouflage')) this.setAlpha(0.78);
  }
}

type Fighter = { view: CreatureView; c: Creature; team: 0 | 1; hp: number; maxHp: number; target?: Fighter; lastHit: number; poisonUntil: number; poisonTick: number; dead: boolean; dodged: boolean; mini: boolean; hpBar: Phaser.GameObjects.Rectangle };

class LabScene extends Phaser.Scene {
  dataState: Save = loadSave();
  page: 'lab' | 'arena' | 'codex' = 'lab';
  content!: Phaser.GameObjects.Container;
  selected: string[] = [];
  team: string[] = [];
  fighters: Fighter[] = [];
  battleActive = false;
  battleEnds = 0;
  status!: Phaser.GameObjects.Text;
  constructor() { super('lab'); }
  create() {
    this.cameras.main.setBackgroundColor('#07171c');
    this.add.rectangle(225, 30, 450, 60, 0x061014).setDepth(20);
    this.add.text(18, 11, 'EVOLUTION LAB', style(18, '#75f4ff')).setDepth(21);
    this.status = this.add.text(432, 13, `⚡ ${this.dataState.credits}`, style(14, '#ffe66d')).setOrigin(1, 0).setDepth(21);
    this.add.text(18, 36, '무한 진화 실험실', style(11, '#9ab8c2')).setDepth(21);
    this.add.rectangle(225, 760, 450, 80, 0x061014).setDepth(20);
    this.tabButton(75, '합성', 'lab'); this.tabButton(225, '자동 전투', 'arena'); this.tabButton(375, '도감', 'codex');
    this.content = this.add.container(0, 60);
    this.renderPage();
  }
  tabButton(x: number, label: string, page: typeof this.page) {
    const hit = this.add.rectangle(x, 760, 140, 62, 0x0c2229, 0.01).setDepth(22).setInteractive();
    const icon = page === 'lab' ? '⚗' : page === 'arena' ? '⚔' : '▦';
    this.add.text(x, 744, icon, style(20, '#75f4ff')).setOrigin(0.5).setDepth(23);
    this.add.text(x, 772, label, style(11, '#c7e5e9')).setOrigin(0.5).setDepth(23);
    hit.on('pointerdown', () => { if (this.battleActive) return; this.page = page; this.renderPage(); });
  }
  renderPage() { this.content.removeAll(true); if (this.page === 'lab') this.renderLab(); else if (this.page === 'arena') this.renderArena(); else this.renderCodex(); }
  panel(x: number, y: number, w: number, h: number, color = 0x0d2830) { const r = this.add.rectangle(x, y, w, h, color, 0.96).setStrokeStyle(2, 0x1d5260); this.content.add(r); return r; }
  renderLab() {
    this.content.add(this.add.text(20, 14, '두 생명체를 선택해 합성하세요', style(15, '#ffffff')));
    this.content.add(this.add.text(20, 39, '부모의 몸과 능력을 계승하며 희귀 돌연변이가 발생합니다.', style(10, '#7ea3ad')));
    this.panel(225, 112, 410, 100);
    const picks = this.selected.map((sid) => this.dataState.creatures.find((c) => c.id === sid)!).filter(Boolean);
    picks.forEach((c, i) => { const v = new CreatureView(this, 145 + i * 160, 164, c, 0.7); this.content.add(v); });
    this.content.add(this.add.text(225, 112, picks.length === 2 ? '+' : picks.length === 1 ? '+  하나 더' : '실험체 슬롯 2개', style(18, '#75f4ff')).setOrigin(0.5));
    const fuse = this.add.rectangle(225, 224, 310, 52, picks.length === 2 ? 0x8b5cf6 : 0x263c43).setStrokeStyle(2, picks.length === 2 ? 0xcaa9ff : 0x38525a).setInteractive();
    this.content.add([fuse, this.add.text(225, 224, picks.length === 2 ? '합성 시작 · 20⚡' : '두 생명체를 선택하세요', style(15, picks.length === 2 ? '#ffffff' : '#6f8b92')).setOrigin(0.5)]);
    fuse.on('pointerdown', () => { if (picks.length === 2) this.fuse(picks[0], picks[1]); });
    this.content.add(this.add.text(20, 269, `보유 생명체 ${this.dataState.creatures.length}/18`, style(13, '#b8d8dd')));
    this.dataState.creatures.slice(-9).forEach((c, i) => this.creatureCard(c, 20 + (i % 3) * 138, 302 + Math.floor(i / 3) * 127, 126, 112, true));
  }
  creatureCard(c: Creature, x: number, y: number, w: number, h: number, selectable: boolean) {
    const chosen = (this.page === 'lab' ? this.selected : this.team).includes(c.id);
    const rect = this.add.rectangle(x + w / 2, y + h / 2, w, h, chosen ? 0x174a55 : 0x0d2830).setStrokeStyle(2, chosen ? 0x75f4ff : 0x1d5260).setInteractive();
    const v = new CreatureView(this, x + w / 2, y + 45, c, 0.46);
    const name = this.add.text(x + 8, y + 76, c.name, style(10, '#ffffff')).setFixedSize(w - 16, 16).setAlign('center');
    const abil = this.add.text(x + 8, y + 93, c.abilities.length ? c.abilities.slice(0, 2).map((a) => ABILITIES[a].ko).join(' · ') : '기본종', style(8, '#7feadf')).setFixedSize(w - 16, 12).setAlign('center');
    this.content.add([rect, v, name, abil]);
    if (selectable) rect.on('pointerdown', () => { const arr = this.page === 'lab' ? this.selected : this.team; const idx = arr.indexOf(c.id); if (idx >= 0) arr.splice(idx, 1); else if (arr.length < (this.page === 'lab' ? 2 : 3)) arr.push(c.id); this.renderPage(); });
  }
  fuse(a: Creature, b: Creature) {
    if (this.dataState.credits < 20 || this.dataState.creatures.length >= 18) { this.toast(this.dataState.credits < 20 ? '에너지가 부족합니다. 전투에서 획득하세요.' : '배양 슬롯이 가득 찼습니다.'); return; }
    this.dataState.credits -= 20;
    const mutation = Math.random() < 0.24;
    const pool = [...new Set([...a.abilities, ...b.abilities])];
    const inherited = Phaser.Utils.Array.Shuffle(pool).slice(0, 2);
    if (inherited.length === 0 || mutation) {
      const candidates = ABILITY_LIST.filter((x) => !inherited.includes(x)); inherited.push(Phaser.Math.RND.pick(candidates));
    }
    const base: Base = a.base === b.base ? a.base : (a.hp + b.hp > 220 ? 'stone' : a.speed + b.speed > 7 ? 'bug' : 'slime');
    const rarity = Math.min(5, 1 + inherited.length + (mutation ? 1 : 0));
    const specialIndex = Math.abs((a.base.charCodeAt(0) + b.base.charCodeAt(0) + inherited.reduce((n, x) => n + x.length, 0))) % SPECIES.length;
    const name = inherited.length > 1 ? SPECIES[specialIndex] : `${ABILITIES[inherited[0]].ko} ${BASES[base].ko}`;
    const child: Creature = {
      id: id(), base, name,
      hp: Math.round((a.hp + b.hp) * 0.55 * (inherited.includes('giant') ? 1.5 : 1)),
      atk: Math.round((a.atk + b.atk) * 0.58), speed: Math.max(1, Math.round((a.speed + b.speed) / 2 + (inherited.includes('wings') ? 1 : 0))),
      abilities: inherited.slice(0, 3), rarity, born: new Date().toISOString().slice(0, 10), recipe: `${a.name} + ${b.name}`,
    };
    this.selected = []; this.dataState.creatures.push(child); if (!this.dataState.discovered.includes(name)) this.dataState.discovered.push(name); save(this.dataState); this.status.setText(`⚡ ${this.dataState.credits}`);
    this.content.removeAll(true); this.panel(225, 300, 420, 600, 0x0a2027);
    this.content.add(this.add.text(225, 62, mutation ? 'RARE MUTATION!' : 'NEW SPECIES', style(20, mutation ? '#ffe66d' : '#75f4ff')).setOrigin(0.5));
    const left = new CreatureView(this, 105, 210, a, 0.65), right = new CreatureView(this, 345, 210, b, 0.65), result = new CreatureView(this, 225, 355, child, 1.2);
    this.content.add([left, right, result, this.add.text(225, 220, '＋', style(34, '#ffffff')).setOrigin(0.5), this.add.text(225, 445, child.name, style(25, '#ffffff')).setOrigin(0.5)]);
    this.content.add(this.add.text(225, 485, child.abilities.map((x) => `◆ ${ABILITIES[x].ko} — ${ABILITIES[x].desc}`).join('\n'), style(13, '#9af5e9')).setOrigin(0.5, 0).setAlign('center').setLineSpacing(8));
    const done = this.add.rectangle(225, 620, 270, 54, 0x8b5cf6).setInteractive(); this.content.add([done, this.add.text(225, 620, '실험실로 돌아가기', style(15)).setOrigin(0.5)]);
    done.on('pointerdown', () => this.renderPage());
    this.tweens.add({ targets: [left, right], x: 225, alpha: 0, duration: 650, ease: 'Power2' });
    this.tweens.add({ targets: result, scale: 1.45, yoyo: true, duration: 500, delay: 500 });
    this.spark(225, 355, mutation ? 0xffe66d : 0xb873ff, 28);
  }
  renderArena() {
    this.content.add(this.add.text(20, 14, '출전 생명체 3마리를 선택하세요', style(15)));
    this.content.add(this.add.text(20, 39, '능력 조합과 상성이 전투 결과를 바꿉니다.', style(10, '#7ea3ad')));
    this.dataState.creatures.slice(-9).forEach((c, i) => this.creatureCard(c, 20 + (i % 3) * 138, 76 + Math.floor(i / 3) * 127, 126, 112, true));
    const selected = this.team.map((sid) => this.dataState.creatures.find((c) => c.id === sid)).filter(Boolean) as Creature[];
    const synergy = this.synergy(selected);
    this.panel(225, 500, 410, 76);
    this.content.add(this.add.text(225, 478, synergy ? `시너지: ${synergy}` : '조합 힌트: 독+가시 / 전기+분열 / 흡혈+갑옷', style(11, synergy ? '#ffe66d' : '#76969e')).setOrigin(0.5));
    const start = this.add.rectangle(225, 570, 320, 58, selected.length === 3 ? 0xff5579 : 0x263c43).setInteractive();
    this.content.add([start, this.add.text(225, 570, selected.length === 3 ? '자동 전투 시작' : `${selected.length}/3 선택됨`, style(16)).setOrigin(0.5)]);
    start.on('pointerdown', () => { if (selected.length === 3) this.startBattle(selected); });
  }
  synergy(team: Creature[]) {
    const all = new Set(team.flatMap((c) => c.abilities));
    if (all.has('poison') && all.has('spikes')) return '독가시 — 반사 피해에 독 부여';
    if (all.has('electric') && all.has('split')) return '분열 번개 — 분열체도 연쇄 공격';
    if (all.has('vampire') && all.has('armor')) return '불멸 갑각 — 흡혈량 증가';
    if (all.has('wings') && all.has('explode')) return '공중 폭발 — 폭발 범위 증가';
    return '';
  }
  enemyCreature(i: number): Creature {
    const base = (['slime', 'bug', 'stone'] as Base[])[i % 3], b = BASES[base], abilities = Phaser.Utils.Array.Shuffle([...ABILITY_LIST]).slice(0, 1 + Math.min(2, Math.floor(this.dataState.wins / 2)));
    return { id: id(), base, name: ['독성 포식자','수정 갑각수','번개 박쥐','거대 점액','유적 수호자'][i % 5], hp: b.hp + this.dataState.wins * 8, atk: b.atk + this.dataState.wins * 2, speed: b.speed, abilities, rarity: 2, born: '', recipe: '야생' };
  }
  startBattle(team: Creature[]) {
    this.content.removeAll(true); this.battleActive = true; this.fighters = []; this.battleEnds = this.time.now + 35000;
    this.content.add(this.add.rectangle(225, 330, 430, 620, 0x0b242b).setStrokeStyle(3, 0x287082));
    for (let y = 80; y < 590; y += 70) this.content.add(this.add.ellipse(225, y, 380, 44, y % 140 ? 0x12323a : 0x102a32, 0.7));
    this.content.add(this.add.text(225, 22, 'AUTO BATTLE', style(18, '#75f4ff')).setOrigin(0.5));
    team.forEach((c, i) => this.spawnFighter(c, 0, 85, 165 + i * 150));
    [0,1,2].map((i) => this.enemyCreature(i)).forEach((c, i) => this.spawnFighter(c, 1, 365, 165 + i * 150));
    this.content.add(this.add.text(110, 610, 'MY SPECIES', style(11, '#75f4ff')).setOrigin(0.5));
    this.content.add(this.add.text(340, 610, 'WILD FORMS', style(11, '#ff6f91')).setOrigin(0.5));
  }
  spawnFighter(c: Creature, team: 0 | 1, x: number, y: number, mini = false) {
    const maxHp = c.hp * (c.abilities.includes('giant') ? 1.5 : 1), view = new CreatureView(this, x, y, c, mini ? 0.4 : 0.62); if (team === 1) view.setScale(-view.scaleX, view.scaleY);
    const barBg = this.add.rectangle(x, y - 43, mini ? 45 : 76, 7, 0x152126), bar = this.add.rectangle(x - (mini ? 22.5 : 38), y - 43, mini ? 45 : 76, 7, team ? 0xff5579 : 0x68f2c2).setOrigin(0, 0.5);
    this.content.add([view, barBg, bar]);
    this.fighters.push({ view, c, team, hp: maxHp, maxHp, lastHit: 0, poisonUntil: 0, poisonTick: 0, dead: false, dodged: c.abilities.includes('camouflage'), mini, hpBar: bar });
  }
  update(time: number, dt: number) {
    if (!this.battleActive) return;
    const alive0 = this.fighters.filter((f) => !f.dead && f.team === 0), alive1 = this.fighters.filter((f) => !f.dead && f.team === 1);
    if (!alive0.length || !alive1.length || time > this.battleEnds) { this.finishBattle(alive0.length >= alive1.length); return; }
    this.fighters.filter((f) => !f.dead).forEach((f) => {
      if (f.poisonUntil > time && time > f.poisonTick) { f.hp -= 3; f.poisonTick = time + 700; this.floating(f.view.x, f.view.y - 30, '-3 독', '#7cff70'); }
      if (f.c.abilities.includes('regen') && Math.floor(time / 1200) !== Math.floor((time - dt) / 1200)) f.hp = Math.min(f.maxHp, f.hp + 3);
      const enemies = this.fighters.filter((e) => !e.dead && e.team !== f.team); if (!enemies.length) return;
      f.target = enemies.sort((a,b) => Phaser.Math.Distance.Between(f.view.x,f.view.y,a.view.x,a.view.y)-Phaser.Math.Distance.Between(f.view.x,f.view.y,b.view.x,b.view.y))[0];
      const d = Phaser.Math.Distance.Between(f.view.x, f.view.y, f.target.view.x, f.target.view.y), range = f.c.abilities.includes('tentacle') ? 96 : 65;
      if (d > range) { const a = Phaser.Math.Angle.Between(f.view.x, f.view.y, f.target.view.x, f.target.view.y); const speed = (22 + f.c.speed * 7) * (f.c.abilities.includes('wings') ? 1.25 : 1); f.view.x += Math.cos(a) * speed * dt / 1000; f.view.y += Math.sin(a) * speed * dt / 1000; f.hpBar.setX(f.view.x - f.hpBar.width / 2).setY(f.view.y - 43); }
      else if (time - f.lastHit > 850 - f.c.speed * 45) { f.lastHit = time; this.attack(f, f.target, time); }
      f.hpBar.setScale(Math.max(0, f.hp / f.maxHp), 1);
      if (f.hp <= 0) this.killFighter(f);
    });
  }
  attack(a: Fighter, b: Fighter, time: number) {
    if (b.dodged) { b.dodged = false; this.floating(b.view.x, b.view.y - 35, '위장 회피!', '#8ef0ba'); return; }
    let damage = a.c.atk * Phaser.Math.FloatBetween(0.8, 1.2); if (b.c.abilities.includes('armor')) damage *= 0.7;
    b.hp -= damage; if (a.c.abilities.includes('poison')) { b.poisonUntil = time + 4200; b.poisonTick = time; }
    if (b.c.abilities.includes('spikes')) a.hp -= damage * 0.2;
    if (a.c.abilities.includes('vampire')) a.hp = Math.min(a.maxHp, a.hp + damage * (a.c.abilities.includes('armor') ? 0.35 : 0.22));
    this.floating(b.view.x, b.view.y - 30, `-${Math.round(damage)}`, '#ffffff'); this.spark(b.view.x, b.view.y, a.c.abilities.includes('electric') ? 0xfff36c : 0x75f4ff, 5);
    this.tweens.add({ targets: a.view, x: a.view.x + (a.team ? -12 : 12), yoyo: true, duration: 100 });
    if (a.c.abilities.includes('electric')) { const chain = this.fighters.find((e) => !e.dead && e.team === b.team && e !== b && Phaser.Math.Distance.Between(e.view.x,e.view.y,b.view.x,b.view.y) < 150); if (chain) { chain.hp -= damage * 0.4; this.spark(chain.view.x, chain.view.y, 0xfff36c, 4); } }
  }
  killFighter(f: Fighter) {
    if (f.dead) return; f.dead = true; f.view.setAlpha(0.25); f.hpBar.setVisible(false); this.spark(f.view.x, f.view.y, 0xff6f91, 12);
    if (f.c.abilities.includes('explode')) this.fighters.filter((e) => !e.dead && e.team !== f.team && Phaser.Math.Distance.Between(e.view.x,e.view.y,f.view.x,f.view.y) < (f.c.abilities.includes('wings') ? 150 : 110)).forEach((e) => e.hp -= f.c.atk * 1.7);
    if (f.c.abilities.includes('split') && !f.mini) { const clone = { ...f.c, id: id(), hp: Math.max(20, f.c.hp * 0.28), atk: Math.max(3, f.c.atk * 0.45), name: `작은 ${f.c.name}` }; this.spawnFighter(clone, f.team, f.view.x, f.view.y + 25, true); }
  }
  finishBattle(win: boolean) {
    this.battleActive = false; this.fighters.forEach((f) => { f.view.destroy(); f.hpBar.destroy(); });
    if (win) { this.dataState.wins++; this.dataState.credits += 55; } else this.dataState.credits += 15; save(this.dataState); this.status.setText(`⚡ ${this.dataState.credits}`);
    this.content.removeAll(true); this.panel(225, 300, 410, 560);
    this.content.add(this.add.text(225, 155, win ? '실험 성공!' : '데이터 수집 완료', style(30, win ? '#75f4ff' : '#ff839d')).setOrigin(0.5));
    this.content.add(this.add.text(225, 235, win ? '+55 연구 에너지\n새로운 합성 가능성이 열렸습니다.' : '+15 연구 에너지\n조합을 바꿔 다시 도전하세요.', style(15, '#c6e4e8')).setOrigin(0.5).setAlign('center').setLineSpacing(10));
    const btn = this.add.rectangle(225, 400, 280, 56, 0x8b5cf6).setInteractive(); this.content.add([btn, this.add.text(225, 400, '실험실로 돌아가기', style(15)).setOrigin(0.5)]); btn.on('pointerdown', () => { this.page = 'lab'; this.renderPage(); });
  }
  renderCodex() {
    this.content.add(this.add.text(20, 14, `종 도감 · ${this.dataState.discovered.length}/${SPECIES.length + 3}`, style(16, '#ffffff')));
    this.content.add(this.add.text(20, 40, '발견한 생명체의 외형과 합성 기록', style(10, '#7ea3ad')));
    const known = [...new Set(this.dataState.creatures.map((c) => c.name))];
    [...['슬라임','버그','스톤'], ...SPECIES].slice(0, 18).forEach((name, i) => {
      const c = this.dataState.creatures.find((x) => x.name === name), x = 20 + (i % 3) * 138, y = 72 + Math.floor(i / 3) * 104;
      const p = this.add.rectangle(x + 63, y + 45, 126, 90, c ? 0x0d3037 : 0x0a1b20).setStrokeStyle(1, c ? 0x2d7480 : 0x193039); this.content.add(p);
      if (c) { const v = new CreatureView(this, x + 63, y + 38, c, 0.38); this.content.add(v); this.content.add(this.add.text(x + 63, y + 70, name, style(9, '#eaffff')).setOrigin(0.5)); }
      else { this.content.add(this.add.ellipse(x + 63, y + 38, 50, 38, 0x02090b).setAlpha(0.8)); this.content.add(this.add.text(x + 63, y + 67, known.includes(name) ? name : '???', style(9, '#3b5960')).setOrigin(0.5)); }
    });
  }
  floating(x: number, y: number, msg: string, color: string) { const t = this.add.text(x, y, msg, style(11, color)).setOrigin(0.5).setDepth(50); this.tweens.add({ targets: t, y: y - 25, alpha: 0, duration: 650, onComplete: () => t.destroy() }); }
  spark(x: number, y: number, color: number, count: number) { for (let i=0;i<count;i++){ const p=this.add.circle(x,y,Phaser.Math.Between(2,5),color).setDepth(60); this.tweens.add({targets:p,x:x+Phaser.Math.Between(-70,70),y:y+Phaser.Math.Between(-70,70),alpha:0,duration:500,onComplete:()=>p.destroy()}); } }
  toast(msg: string) { const bg=this.add.rectangle(225,95,390,42,0x030a0c,0.94).setDepth(80),t=this.add.text(225,95,msg,style(12)).setOrigin(0.5).setDepth(81); this.tweens.add({targets:[bg,t],alpha:0,delay:1200,duration:300,onComplete:()=>{bg.destroy();t.destroy();}}); }
}

new Phaser.Game({ type: Phaser.AUTO, parent: 'app', width: W, height: H, backgroundColor: '#07171c', scene: [LabScene], scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, render: { antialias: true }, input: { activePointers: 3 } });
