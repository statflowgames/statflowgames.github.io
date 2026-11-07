import Phaser from 'phaser';
import './style.css';

const W = 450;
const H = 800;
const SAVE_KEY = 'sneaky-cat-save-v1';

type Vec = { x: number; y: number };
type EnemyKind = 'owner' | 'dog';
type EnemyState = 'PATROL' | 'SUSPICIOUS' | 'INVESTIGATE' | 'CHASE' | 'SEARCH';
type Obstacle = { x: number; y: number; w: number; h: number; color?: number };
type ItemSpec = { x: number; y: number; kind: 'fish' | 'gem' };
type StageSpec = {
  name: string;
  subtitle: string;
  goal: number;
  player: Vec;
  exit: Vec;
  obstacles: Obstacle[];
  items: ItemSpec[];
  boxes: Vec[];
  cups: Vec[];
  enemies: { kind: EnemyKind; x: number; y: number; patrol: Vec[] }[];
  roomba?: { path: Vec[] };
};

const STAGES: StageSpec[] = [
  {
    name: 'STAGE 1 · 거실', subtitle: '시야를 피해 생선을 훔쳐라', goal: 1,
    player: { x: 62, y: 708 }, exit: { x: 55, y: 758 },
    obstacles: [
      { x: 225, y: 72, w: 390, h: 28 }, { x: 225, y: 730, w: 290, h: 28 },
      { x: 26, y: 390, w: 28, h: 620 }, { x: 424, y: 390, w: 28, h: 620 },
      { x: 225, y: 330, w: 190, h: 105, color: 0x5a3c77 },
      { x: 116, y: 174, w: 118, h: 56, color: 0x3b6b69 },
      { x: 354, y: 545, w: 88, h: 170, color: 0x8a5a45 },
    ],
    items: [{ x: 340, y: 145, kind: 'fish' }], boxes: [{ x: 120, y: 572 }], cups: [],
    enemies: [{ kind: 'owner', x: 115, y: 250, patrol: [{ x: 100, y: 250 }, { x: 340, y: 250 }, { x: 340, y: 440 }, { x: 120, y: 440 }] }],
  },
  {
    name: 'STAGE 2 · 주방', subtitle: '컵 소리로 경비를 유인하라', goal: 2,
    player: { x: 55, y: 700 }, exit: { x: 55, y: 758 },
    obstacles: [
      { x: 225, y: 70, w: 390, h: 28 }, { x: 225, y: 730, w: 290, h: 28 },
      { x: 26, y: 390, w: 28, h: 620 }, { x: 424, y: 390, w: 28, h: 620 },
      { x: 124, y: 270, w: 155, h: 70, color: 0x456d79 }, { x: 330, y: 355, w: 135, h: 70, color: 0x456d79 },
      { x: 210, y: 530, w: 70, h: 165, color: 0x775a44 },
    ],
    items: [{ x: 348, y: 160, kind: 'fish' }, { x: 90, y: 400, kind: 'fish' }],
    boxes: [{ x: 350, y: 620 }], cups: [{ x: 110, y: 145 }, { x: 315, y: 585 }],
    enemies: [
      { kind: 'owner', x: 210, y: 185, patrol: [{ x: 190, y: 170 }, { x: 360, y: 190 }, { x: 280, y: 470 }, { x: 90, y: 470 }] },
      { kind: 'dog', x: 345, y: 500, patrol: [{ x: 345, y: 500 }, { x: 280, y: 650 }, { x: 100, y: 620 }, { x: 92, y: 510 }] },
    ],
  },
  {
    name: 'STAGE 3 · 로봇청소기', subtitle: '움직이는 은신처를 타고 침투하라', goal: 3,
    player: { x: 54, y: 704 }, exit: { x: 55, y: 758 },
    obstacles: [
      { x: 225, y: 70, w: 390, h: 28 }, { x: 225, y: 730, w: 290, h: 28 },
      { x: 26, y: 390, w: 28, h: 620 }, { x: 424, y: 390, w: 28, h: 620 },
      { x: 115, y: 225, w: 120, h: 150, color: 0x5a3c77 }, { x: 335, y: 235, w: 120, h: 80, color: 0x3c6b67 },
      { x: 225, y: 475, w: 195, h: 85, color: 0x805441 },
    ],
    items: [{ x: 350, y: 125, kind: 'gem' }, { x: 78, y: 390, kind: 'gem' }, { x: 365, y: 600, kind: 'gem' }],
    boxes: [{ x: 145, y: 625 }], cups: [{ x: 375, y: 400 }],
    enemies: [
      { kind: 'owner', x: 225, y: 140, patrol: [{ x: 220, y: 140 }, { x: 375, y: 145 }, { x: 370, y: 380 }, { x: 235, y: 350 }] },
      { kind: 'dog', x: 95, y: 315, patrol: [{ x: 85, y: 315 }, { x: 170, y: 390 }, { x: 105, y: 565 }, { x: 330, y: 650 }] },
    ],
    roomba: { path: [{ x: 70, y: 655 }, { x: 350, y: 655 }, { x: 360, y: 330 }, { x: 190, y: 330 }, { x: 190, y: 145 }, { x: 365, y: 145 }] },
  },
];

function textStyle(size = 18, color = '#ffffff'): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: 'Inter, Noto Sans KR, sans-serif', fontSize: `${size}px`, color, fontStyle: 'bold' };
}

class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }
  create() {
    this.makeTextures();
    this.scene.start('menu');
  }
  private makeTextures() {
    const g = this.add.graphics();
    g.fillStyle(0xf6c85f).fillCircle(24, 27, 17).fillTriangle(9, 17, 14, 3, 23, 15).fillTriangle(25, 15, 35, 3, 39, 18);
    g.fillStyle(0x2d2340).fillCircle(18, 25, 2).fillCircle(30, 25, 2).fillTriangle(22, 30, 26, 30, 24, 33);
    g.lineStyle(2, 0x2d2340).lineBetween(14, 31, 5, 29).lineBetween(34, 31, 43, 29).generateTexture('cat', 48, 48); g.clear();
    g.fillStyle(0xf1a56b).fillCircle(24, 22, 15).fillRoundedRect(13, 29, 22, 17, 8).fillStyle(0x422d3a).fillCircle(19, 21, 2).fillCircle(29, 21, 2).generateTexture('owner', 48, 52); g.clear();
    g.fillStyle(0xb98558).fillEllipse(24, 28, 38, 25).fillTriangle(7, 22, 7, 6, 18, 19).fillTriangle(30, 19, 41, 6, 41, 23).fillStyle(0x33232c).fillCircle(18, 25, 2).fillCircle(30, 25, 2).generateTexture('dog', 48, 48); g.destroy();
  }
}

class MenuScene extends Phaser.Scene {
  constructor() { super('menu'); }
  create() {
    this.cameras.main.setBackgroundColor('#15162a');
    this.add.circle(365, 90, 120, 0xffd166, 0.12);
    this.add.circle(55, 690, 150, 0x8b5cf6, 0.12);
    this.add.text(28, 58, 'SNEAKY CAT', textStyle(38, '#ffd166')).setStroke('#4b2c62', 6);
    this.add.text(30, 105, '도둑 고양이', textStyle(20, '#fff6d5'));
    this.add.text(30, 145, '보고 · 속이고 · 훔치고 · 탈출하라', textStyle(13, '#9da6c8'));
    const cat = this.add.image(330, 190, 'cat').setScale(2.2);
    this.tweens.add({ targets: cat, y: 178, angle: 4, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.inOut' });
    const save = JSON.parse(localStorage.getItem(SAVE_KEY) || '{"unlocked":1,"best":{}}') as { unlocked: number; best: Record<string, string> };
    STAGES.forEach((s, i) => {
      const unlocked = i < save.unlocked;
      const y = 300 + i * 112;
      const panel = this.add.rectangle(225, y, 394, 88, unlocked ? 0x252948 : 0x1b1c2d, 1).setStrokeStyle(2, unlocked ? 0x59658f : 0x303246).setInteractive();
      this.add.text(50, y - 25, unlocked ? s.name : `STAGE ${i + 1} · 잠김`, textStyle(18, unlocked ? '#ffffff' : '#6c718a'));
      this.add.text(50, y + 7, unlocked ? s.subtitle : '이전 스테이지를 먼저 탈출하세요', textStyle(11, '#929bb9'));
      this.add.text(378, y - 15, save.best[String(i)] || (unlocked ? 'GO' : '🔒'), textStyle(18, unlocked ? '#ffd166' : '#52566d')).setOrigin(1, 0);
      if (unlocked) panel.on('pointerdown', () => this.scene.start('play', { stage: i }));
    });
    this.add.text(225, 690, '왼쪽 조이스틱 이동 · 오른쪽 버튼 상호작용', textStyle(11, '#77809e')).setOrigin(0.5);
    this.add.text(225, 738, '이어폰 없이도 플레이할 수 있어요', textStyle(10, '#59617c')).setOrigin(0.5);
  }
}

class Guard {
  sprite: Phaser.Physics.Arcade.Sprite;
  state: EnemyState = 'PATROL';
  patrolIndex = 0;
  target: Vec;
  facing = 0;
  searchUntil = 0;
  suspicion = 0;
  sawHide = false;
  constructor(public scene: PlayScene, public kind: EnemyKind, x: number, y: number, public patrol: Vec[]) {
    this.sprite = scene.physics.add.sprite(x, y, kind).setDepth(12).setCircle(16).setCollideWorldBounds(true);
    this.target = patrol[0];
  }
  hear(pos: Vec) {
    if (this.state !== 'CHASE') { this.state = 'INVESTIGATE'; this.target = { ...pos }; this.suspicion = Math.max(this.suspicion, 35); }
  }
  update(time: number, dt: number) {
    const p = this.scene.player;
    const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, p.x, p.y);
    const sees = !this.scene.hidden && this.scene.hasLineOfSight(this.sprite.x, this.sprite.y, p.x, p.y, this.kind === 'dog' ? 210 : 255, this.kind === 'dog' ? 1.1 : 1.35, this.facing);
    const smells = this.kind === 'dog' && !this.scene.hidden && dist < 92;
    if (sees || smells) {
      this.suspicion = Math.min(100, this.suspicion + dt * (sees ? 0.075 : 0.045));
      this.state = this.suspicion >= 100 ? 'CHASE' : 'SUSPICIOUS';
    } else {
      this.suspicion = Math.max(0, this.suspicion - dt * 0.025);
      if (this.state === 'SUSPICIOUS' && this.suspicion < 8) this.state = 'PATROL';
    }
    if (this.state === 'CHASE') {
      this.target = { x: p.x, y: p.y };
      if (this.scene.hidden) { this.state = 'SEARCH'; this.searchUntil = time + 3600; this.target = { x: p.x, y: p.y }; }
      if (dist < 30 && !this.scene.hidden) this.scene.caught();
    } else if (this.state === 'PATROL') {
      this.target = this.patrol[this.patrolIndex];
      if (Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.target.x, this.target.y) < 16) this.patrolIndex = (this.patrolIndex + 1) % this.patrol.length;
    } else if (this.state === 'INVESTIGATE' && Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.target.x, this.target.y) < 20) {
      this.state = 'SEARCH'; this.searchUntil = time + 2600;
    } else if (this.state === 'SEARCH') {
      this.facing += dt * 0.0023;
      if (time > this.searchUntil) { this.state = 'PATROL'; this.suspicion = 0; this.scene.comicReaction(this.sprite.x, this.sprite.y); }
    }
    const speed = this.state === 'CHASE' ? (this.kind === 'dog' ? 132 : 112) : this.state === 'SUSPICIOUS' ? 30 : 58;
    if (this.state !== 'SUSPICIOUS' && this.state !== 'SEARCH') {
      const a = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, this.target.x, this.target.y);
      this.facing = a;
      this.sprite.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
    } else this.sprite.setVelocity(0, 0);
    this.sprite.setFlipX(Math.cos(this.facing) < 0);
  }
}

class PlayScene extends Phaser.Scene {
  player!: Phaser.Physics.Arcade.Sprite;
  guards: Guard[] = [];
  hidden = false;
  stageIndex = 0;
  spec!: StageSpec;
  obstacleRects: Phaser.Geom.Rectangle[] = [];
  staticGroup!: Phaser.Physics.Arcade.StaticGroup;
  items: { sprite: Phaser.GameObjects.Container; spec: ItemSpec; taken: boolean }[] = [];
  boxes: { shape: Phaser.GameObjects.Container; pos: Vec }[] = [];
  cups: { shape: Phaser.GameObjects.Container; pos: Vec; used: boolean }[] = [];
  roomba?: { shape: Phaser.Physics.Arcade.Image; path: Vec[]; index: number };
  mounted = false;
  stolen = 0;
  detectedCount = 0;
  startTime = 0;
  over = false;
  move = new Phaser.Math.Vector2();
  stickPointer = -1;
  stickOrigin = new Phaser.Math.Vector2(90, 695);
  stickKnob!: Phaser.GameObjects.Arc;
  interactButton!: Phaser.GameObjects.Arc;
  interactText!: Phaser.GameObjects.Text;
  coneGraphics!: Phaser.GameObjects.Graphics;
  alertGraphics!: Phaser.GameObjects.Graphics;
  hudGoal!: Phaser.GameObjects.Text;
  statusText!: Phaser.GameObjects.Text;
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  constructor() { super('play'); }
  init(data: { stage: number }) { this.stageIndex = data.stage || 0; this.spec = STAGES[this.stageIndex]; }
  create() {
    this.cameras.main.setBackgroundColor('#24203a');
    this.physics.world.setBounds(20, 55, 410, 690);
    this.staticGroup = this.physics.add.staticGroup();
    this.drawRoom();
    this.player = this.physics.add.sprite(this.spec.player.x, this.spec.player.y, 'cat').setDepth(20).setCircle(15).setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.staticGroup);
    this.spec.items.forEach((item) => this.addItem(item));
    this.spec.boxes.forEach((p) => this.addBox(p));
    this.spec.cups.forEach((p) => this.addCup(p));
    this.guards = this.spec.enemies.map((e) => new Guard(this, e.kind, e.x, e.y, e.patrol));
    this.guards.forEach((g) => this.physics.add.collider(g.sprite, this.staticGroup));
    if (this.spec.roomba) this.addRoomba(this.spec.roomba.path);
    this.addExit();
    this.coneGraphics = this.add.graphics().setDepth(4);
    this.alertGraphics = this.add.graphics().setDepth(50);
    this.addHud();
    this.setupInput();
    this.startTime = this.time.now;
    this.showToast(this.spec.subtitle);
  }
  private drawRoom() {
    const floor = this.add.graphics();
    floor.fillStyle(0x35304b).fillRect(20, 55, 410, 690);
    floor.lineStyle(1, 0x443d5b, 0.7);
    for (let y = 80; y < 740; y += 34) floor.lineBetween(25, y, 425, y);
    this.spec.obstacles.forEach((o) => {
      this.add.rectangle(o.x, o.y, o.w, o.h, o.color || 0x2a2334).setStrokeStyle(3, 0x17131f).setDepth(8);
      const body = this.staticGroup.create(o.x, o.y, undefined).setVisible(false) as Phaser.Physics.Arcade.Image;
      body.setSize(o.w, o.h).refreshBody();
      this.obstacleRects.push(new Phaser.Geom.Rectangle(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h));
    });
  }
  private addItem(spec: ItemSpec) {
    const c = this.add.container(spec.x, spec.y).setDepth(10);
    const glow = this.add.circle(0, 0, 22, spec.kind === 'fish' ? 0x66e3ff : 0xffd166, 0.18);
    const body = spec.kind === 'fish'
      ? this.add.ellipse(0, 0, 28, 15, 0x6fe6f2).setStrokeStyle(2, 0xdfffff)
      : this.add.polygon(0, 0, [0,-16,13,-4,9,14,-9,14,-13,-4], 0xffd166).setStrokeStyle(2, 0xfff0a6);
    if (spec.kind === 'fish') c.add([glow, body, this.add.triangle(-18, 0, 0, -8, 0, 8, 10, 0, 0x6fe6f2)]); else c.add([glow, body]);
    this.tweens.add({ targets: c, y: spec.y - 7, yoyo: true, repeat: -1, duration: 800, ease: 'Sine.inOut' });
    this.items.push({ sprite: c, spec, taken: false });
  }
  private addBox(pos: Vec) {
    const c = this.add.container(pos.x, pos.y).setDepth(10);
    c.add([this.add.rectangle(0, 0, 55, 46, 0x9a6a43).setStrokeStyle(3, 0x543823), this.add.rectangle(0, -20, 59, 7, 0xc18b59), this.add.text(0, 2, '↘', textStyle(20, '#5d3f2b')).setOrigin(0.5)]);
    this.boxes.push({ shape: c, pos });
  }
  private addCup(pos: Vec) {
    const c = this.add.container(pos.x, pos.y).setDepth(10);
    c.add([this.add.rectangle(0, 0, 18, 22, 0xfff2d1).setStrokeStyle(2, 0xb3a78d), this.add.circle(11, 0, 7, 0xfff2d1).setStrokeStyle(2, 0xb3a78d)]);
    this.cups.push({ shape: c, pos, used: false });
  }
  private addRoomba(path: Vec[]) {
    const g = this.add.graphics(); g.fillStyle(0x1f273b).fillCircle(25, 25, 23).lineStyle(4, 0x6be4ff).strokeCircle(25, 25, 19).fillStyle(0xffcf5c).fillCircle(25, 25, 4); g.generateTexture('roomba', 50, 50).destroy();
    const shape = this.physics.add.image(path[0].x, path[0].y, 'roomba').setDepth(11).setImmovable(true);
    this.roomba = { shape, path, index: 1 };
  }
  private addExit() {
    const { x, y } = this.spec.exit;
    this.add.rectangle(x, y, 58, 22, 0x69f0ae, 0.25).setStrokeStyle(2, 0x69f0ae).setDepth(9);
    this.add.text(x, y, 'EXIT', textStyle(10, '#baffdc')).setOrigin(0.5).setDepth(10);
  }
  private addHud() {
    this.add.rectangle(225, 27, 450, 54, 0x10111f, 0.97).setDepth(40);
    this.add.text(18, 10, this.spec.name, textStyle(14, '#ffd166')).setDepth(41);
    this.hudGoal = this.add.text(432, 11, `보물 0/${this.spec.goal}`, textStyle(13, '#ffffff')).setOrigin(1, 0).setDepth(41);
    this.statusText = this.add.text(225, 37, '안전', textStyle(10, '#77f2b4')).setOrigin(0.5).setDepth(41);
    this.add.circle(90, 695, 55, 0x0b0c15, 0.45).setStrokeStyle(2, 0xffffff, 0.13).setDepth(40).setScrollFactor(0);
    this.stickKnob = this.add.circle(90, 695, 24, 0xffffff, 0.2).setStrokeStyle(2, 0xffffff, 0.25).setDepth(41);
    this.interactButton = this.add.circle(365, 675, 48, 0xffd166, 0.88).setStrokeStyle(4, 0xfff1a8, 0.45).setDepth(41).setInteractive();
    this.interactText = this.add.text(365, 675, '액션', textStyle(13, '#30213a')).setOrigin(0.5).setDepth(42);
    this.add.text(365, 733, '상황 버튼', textStyle(9, '#a7adc4')).setOrigin(0.5).setDepth(41);
  }
  private setupInput() {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.over) { this.scene.restart({ stage: this.stageIndex }); return; }
      if (p.x < W * 0.55 && p.y > 540) { this.stickPointer = p.id; this.stickOrigin.set(p.x, p.y); this.stickKnob.setPosition(p.x, p.y); }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id !== this.stickPointer || !p.isDown) return;
      this.move.set(p.x - this.stickOrigin.x, p.y - this.stickOrigin.y).limit(46).scale(1 / 46);
      this.stickKnob.setPosition(this.stickOrigin.x + this.move.x * 35, this.stickOrigin.y + this.move.y * 35);
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => { if (p.id === this.stickPointer) { this.stickPointer = -1; this.move.set(0, 0); this.stickKnob.setPosition(90, 695); } });
    this.interactButton.on('pointerdown', () => this.interact());
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,ESC') as Record<string, Phaser.Input.Keyboard.Key>;
    this.keys.SPACE.on('down', () => this.interact());
    this.keys.ESC.on('down', () => this.scene.start('menu'));
  }
  hasLineOfSight(x1: number, y1: number, x2: number, y2: number, range: number, fov: number, facing: number) {
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2); if (dist > range) return false;
    const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2);
    if (Math.abs(Phaser.Math.Angle.Wrap(angle - facing)) > fov / 2) return false;
    const line = new Phaser.Geom.Line(x1, y1, x2, y2);
    return !this.obstacleRects.some((r) => Phaser.Geom.Intersects.LineToRectangle(line, r));
  }
  private interact() {
    if (this.over) return;
    const px = this.player.x, py = this.player.y;
    const item = this.items.find((i) => !i.taken && Phaser.Math.Distance.Between(px, py, i.spec.x, i.spec.y) < 52);
    if (item) { item.taken = true; this.stolen++; this.hudGoal.setText(`보물 ${this.stolen}/${this.spec.goal}`); this.burst(item.spec.x, item.spec.y, 0xffd166); item.sprite.destroy(); this.showToast('훔치기 성공! +보물'); return; }
    const box = this.boxes.find((b) => Phaser.Math.Distance.Between(px, py, b.pos.x, b.pos.y) < 58);
    if (box) {
      this.hidden = !this.hidden; this.mounted = false; this.player.setAlpha(this.hidden ? 0.18 : 1).setVelocity(0, 0);
      if (this.hidden) { this.player.setPosition(box.pos.x, box.pos.y); this.guards.forEach((g) => { if (this.hasLineOfSight(g.sprite.x, g.sprite.y, px, py, 260, 1.5, g.facing)) { g.sawHide = true; g.hear(box.pos); } }); }
      this.showToast(this.hidden ? '상자 속에 숨었다' : '상자 밖으로 나왔다'); return;
    }
    const cup = this.cups.find((c) => !c.used && Phaser.Math.Distance.Between(px, py, c.pos.x, c.pos.y) < 62);
    if (cup) { cup.used = true; cup.shape.setAngle(80).setAlpha(0.5); this.cameras.main.shake(100, 0.006); this.guards.forEach((g) => g.hear(cup.pos)); this.burst(cup.pos.x, cup.pos.y, 0xffffff); this.showToast('쨍그랑! 모두가 소리를 들었다'); return; }
    if (this.roomba && Phaser.Math.Distance.Between(px, py, this.roomba.shape.x, this.roomba.shape.y) < 60) { this.mounted = !this.mounted; this.hidden = this.mounted; this.player.setAlpha(this.mounted ? 0.65 : 1); this.showToast(this.mounted ? '로봇청소기에 탑승!' : '청소기에서 내렸다'); return; }
    if (Phaser.Math.Distance.Between(px, py, this.spec.exit.x, this.spec.exit.y) < 58) { if (this.stolen >= this.spec.goal) this.complete(); else this.showToast(`보물이 ${this.spec.goal - this.stolen}개 더 필요해!`); }
  }
  private currentAction() {
    const x = this.player.x, y = this.player.y;
    if (this.items.some((i) => !i.taken && Phaser.Math.Distance.Between(x, y, i.spec.x, i.spec.y) < 52)) return '훔치기';
    if (this.boxes.some((b) => Phaser.Math.Distance.Between(x, y, b.pos.x, b.pos.y) < 58)) return this.hidden ? '나오기' : '숨기';
    if (this.cups.some((c) => !c.used && Phaser.Math.Distance.Between(x, y, c.pos.x, c.pos.y) < 62)) return '떨구기';
    if (this.roomba && Phaser.Math.Distance.Between(x, y, this.roomba.shape.x, this.roomba.shape.y) < 60) return this.mounted ? '내리기' : '타기';
    if (Phaser.Math.Distance.Between(x, y, this.spec.exit.x, this.spec.exit.y) < 58) return '탈출';
    return '액션';
  }
  update(time: number, dt: number) {
    if (this.over) return;
    const kb = new Phaser.Math.Vector2((this.keys.D.isDown || this.keys.RIGHT.isDown ? 1 : 0) - (this.keys.A.isDown || this.keys.LEFT.isDown ? 1 : 0), (this.keys.S.isDown || this.keys.DOWN.isDown ? 1 : 0) - (this.keys.W.isDown || this.keys.UP.isDown ? 1 : 0));
    if (kb.lengthSq() > 0) kb.normalize();
    const input = kb.lengthSq() > 0 ? kb : this.move;
    if (!this.hidden && !this.mounted) { this.player.setVelocity(input.x * 135, input.y * 135); this.player.setRotation(input.x ? input.x * 0.08 : 0); } else this.player.setVelocity(0, 0);
    if (this.roomba) {
      const r = this.roomba, target = r.path[r.index];
      const a = Phaser.Math.Angle.Between(r.shape.x, r.shape.y, target.x, target.y); r.shape.setVelocity(Math.cos(a) * 55, Math.sin(a) * 55).setRotation(a);
      if (Phaser.Math.Distance.Between(r.shape.x, r.shape.y, target.x, target.y) < 12) r.index = (r.index + 1) % r.path.length;
      if (this.mounted) this.player.setPosition(r.shape.x, r.shape.y - 7);
    }
    this.guards.forEach((g) => g.update(time, dt));
    this.drawCones();
    const maxAlert = Math.max(0, ...this.guards.map((g) => g.suspicion));
    this.statusText.setText(maxAlert > 80 ? '발각 직전!' : maxAlert > 15 ? '의심받는 중…' : this.hidden ? '숨는 중' : '안전').setColor(maxAlert > 80 ? '#ff677d' : maxAlert > 15 ? '#ffd166' : '#77f2b4');
    this.alertGraphics.clear();
    if (maxAlert > 70) { this.alertGraphics.lineStyle(10, 0xff3d61, (maxAlert - 70) / 55).strokeRect(5, 58, 440, 686); if (Math.random() < 0.04) this.cameras.main.shake(45, 0.002); }
    this.interactText.setText(this.currentAction());
  }
  private drawCones() {
    this.coneGraphics.clear();
    this.guards.forEach((g) => {
      const range = g.kind === 'dog' ? 210 : 255, fov = g.kind === 'dog' ? 1.1 : 1.35;
      const color = g.state === 'CHASE' ? 0xff335f : g.state === 'SUSPICIOUS' ? 0xffd166 : 0x7fe7c4;
      this.coneGraphics.fillStyle(color, g.state === 'CHASE' ? 0.24 : 0.12);
      this.coneGraphics.slice(g.sprite.x, g.sprite.y, range, g.facing - fov / 2, g.facing + fov / 2, false).fillPath();
      this.coneGraphics.fillStyle(color, 0.9).fillCircle(g.sprite.x, g.sprite.y - 31, 4);
    });
  }
  burst(x: number, y: number, color: number) {
    for (let i = 0; i < 10; i++) { const p = this.add.circle(x, y, Phaser.Math.Between(2, 5), color).setDepth(60); this.tweens.add({ targets: p, x: x + Phaser.Math.Between(-55, 55), y: y + Phaser.Math.Between(-55, 30), alpha: 0, scale: 0.2, duration: 500, onComplete: () => p.destroy() }); }
  }
  showToast(message: string) {
    const bg = this.add.rectangle(225, 92, Math.min(390, message.length * 15 + 40), 38, 0x080912, 0.88).setDepth(80).setStrokeStyle(1, 0xffffff, 0.16);
    const t = this.add.text(225, 92, message, textStyle(13, '#ffffff')).setOrigin(0.5).setDepth(81);
    this.tweens.add({ targets: [bg, t], y: 82, alpha: 0, delay: 1200, duration: 320, onComplete: () => { bg.destroy(); t.destroy(); } });
  }
  comicReaction(x: number, y: number) {
    const t = this.add.text(x, y - 52, Phaser.Math.RND.pick(['? 뭐지?', '놓쳤다!', '냥…?']), textStyle(12, '#ffffff')).setOrigin(0.5).setDepth(70);
    this.tweens.add({ targets: t, y: y - 75, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  }
  caught() {
    if (this.over) return; this.over = true; this.detectedCount++;
    this.physics.pause(); this.cameras.main.flash(220, 255, 40, 70); this.cameras.main.shake(400, 0.018);
    this.player.setTint(0xff5577).setAngle(90);
    this.time.delayedCall(650, () => {
      this.add.rectangle(225, 400, 390, 260, 0x100d1d, 0.96).setDepth(100).setStrokeStyle(3, 0xff5577);
      this.add.text(225, 330, '들켰다!', textStyle(34, '#ff6b82')).setOrigin(0.5).setDepth(101);
      this.add.text(225, 385, '고양이는 아무 일도 없었다는 듯 도망쳤다.', textStyle(12, '#c7cbe0')).setOrigin(0.5).setDepth(101);
      this.add.text(225, 445, '화면을 눌러 즉시 재도전', textStyle(15, '#ffd166')).setOrigin(0.5).setDepth(101);
    });
  }
  private complete() {
    if (this.over) return; this.over = true; this.physics.pause();
    const seconds = (this.time.now - this.startTime) / 1000;
    const grade = seconds < 50 ? 'S' : seconds < 70 ? 'A' : seconds < 90 ? 'B' : 'C';
    this.cameras.main.flash(500, 255, 220, 100); this.burst(this.player.x, this.player.y, 0xffd166);
    const save = JSON.parse(localStorage.getItem(SAVE_KEY) || '{"unlocked":1,"best":{}}') as { unlocked: number; best: Record<string, string> };
    save.unlocked = Math.max(save.unlocked, Math.min(3, this.stageIndex + 2)); save.best[String(this.stageIndex)] = grade; localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    this.time.delayedCall(450, () => {
      this.add.rectangle(225, 390, 400, 340, 0x111326, 0.97).setDepth(100).setStrokeStyle(3, 0xffd166);
      this.add.text(225, 270, '완벽한 탈출!', textStyle(28, '#ffd166')).setOrigin(0.5).setDepth(101);
      this.add.text(225, 340, grade, textStyle(76, grade === 'S' ? '#8fffd2' : '#ffffff')).setOrigin(0.5).setDepth(101);
      this.add.text(225, 410, `보물 ${this.stolen}개  ·  ${seconds.toFixed(1)}초`, textStyle(14, '#c8cde2')).setOrigin(0.5).setDepth(101);
      const next = this.add.rectangle(225, 485, 270, 54, 0xffd166).setDepth(101).setInteractive();
      this.add.text(225, 485, this.stageIndex < 2 ? '다음 스테이지' : '스테이지 선택', textStyle(16, '#30213a')).setOrigin(0.5).setDepth(102);
      next.on('pointerdown', () => this.scene.start(this.stageIndex < 2 ? 'play' : 'menu', this.stageIndex < 2 ? { stage: this.stageIndex + 1 } : undefined));
    });
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: W,
  height: H,
  backgroundColor: '#15162a',
  scene: [BootScene, MenuScene, PlayScene],
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, pixelArt: false },
  input: { activePointers: 3 },
});
