export const GAME_WIDTH = 450;
export const GAME_HEIGHT = 800;
export const TILE_SIZE = 32;
export const WORLD_COLS = 14;
export const WORLD_ROWS = 88;
export const CHUNK_ROWS = 11;
export const WORLD_START_ROW = 5;
export const MAX_UPGRADE = { drill: 10, battery: 10, bag: 10, detector: 5, bomb: 5 } as const;

export type StageId = 'green' | 'crystal' | 'ruins' | 'lava' | 'abyss';
export type TileKind =
  | 'dirt' | 'stone' | 'hard' | 'iron' | 'gold' | 'crystal' | 'ruby' | 'emerald'
  | 'amethyst' | 'ancient' | 'explosive' | 'unstable' | 'gas' | 'trap' | 'lava' | 'bedrock' | 'chest';
export type ResourceKey = 'stone' | 'iron' | 'goldOre' | 'crystal' | 'ruby' | 'emerald' | 'amethyst' | 'ancientOre';
export type MonsterKind = 'bat' | 'slime' | 'spider' | 'golem' | 'lavaBeast';
export type BossKind = 'mole' | 'crystalGolem' | 'guardian' | 'dragon' | 'abyssKing';
export type UpgradeKey = 'drill' | 'battery' | 'bag' | 'detector' | 'bomb';
export type Language = 'ko' | 'en' | 'ja' | 'zh-CN' | 'zh-TW' | 'vi' | 'th' | 'es';

export type Cargo = Record<ResourceKey, number>;
export type Upgrades = Record<UpgradeKey, number>;
export type Settings = { language: Language; sound: boolean; vibration: boolean };
export type MissionState = Record<string, { progress: number; claimed: boolean }>;
export type Persist = {
  version: 3;
  gold: number;
  resources: Cargo;
  up: Upgrades;
  unlockedStage: number;
  bossClears: Record<StageId, number>;
  bestDepth: Record<StageId, number>;
  runs: number;
  kills: number;
  artifacts: string[];
  blueprints: string[];
  codex: string[];
  missions: MissionState;
  consumables: { bombs: number; energyCells: number };
  settings: Settings;
  lastSeed: number;
};

export type TileRule = {
  color: number; accent: number; hp: number; energy: number; reward?: ResourceKey; value?: number;
  solid?: boolean; unbreakable?: boolean; hazard?: boolean;
};

export type StageRule = {
  id: StageId; name: string; subtitle: string; depthStart: number; depthEnd: number; goalDepth: number;
  colors: [number, number, number, number]; ore: ResourceKey[]; monster: MonsterKind; boss: BossKind;
  bossName: string; recommended: number; unlock: string;
};

export const STAGES: StageRule[] = [
  { id: 'green', name: 'Green Cave', subtitle: '초록 동굴', depthStart: 0, depthEnd: 100, goalDepth: 100, colors: [0x142519, 0x23422d, 0x6f5134, 0x9bc46a], ore: ['iron', 'goldOre'], monster: 'bat', boss: 'mole', bossName: 'Giant Mole', recommended: 1, unlock: '강화 드릴' },
  { id: 'crystal', name: 'Crystal Cave', subtitle: '수정 동굴', depthStart: 100, depthEnd: 300, goalDepth: 300, colors: [0x111b32, 0x182d52, 0x443c72, 0x66d9ff], ore: ['crystal', 'amethyst'], monster: 'spider', boss: 'crystalGolem', bossName: 'Crystal Golem', recommended: 3, unlock: '수정 탐지기' },
  { id: 'ruins', name: 'Ancient Ruins', subtitle: '고대 유적', depthStart: 300, depthEnd: 500, goalDepth: 500, colors: [0x201b22, 0x3d3430, 0x716044, 0xe5bd68], ore: ['emerald', 'ancientOre'], monster: 'golem', boss: 'guardian', bossName: 'Ancient Guardian', recommended: 5, unlock: '고대 드릴' },
  { id: 'lava', name: 'Lava Zone', subtitle: '용암 지대', depthStart: 500, depthEnd: 1000, goalDepth: 1000, colors: [0x211016, 0x42151a, 0x7d2519, 0xff7547], ore: ['ruby', 'goldOre'], monster: 'lavaBeast', boss: 'dragon', bossName: 'Lava Dragon', recommended: 7, unlock: '내열 장비' },
  { id: 'abyss', name: 'Abyss', subtitle: '심연', depthStart: 1000, depthEnd: 1400, goalDepth: 1400, colors: [0x070d1e, 0x101c36, 0x123f4c, 0x34e4cd], ore: ['amethyst', 'ancientOre'], monster: 'bat', boss: 'abyssKing', bossName: 'Abyss King', recommended: 9, unlock: '심연의 왕관' },
];

export const TILE_RULES: Record<TileKind, TileRule> = {
  dirt: { color: 0x755038, accent: 0xa7794c, hp: 1, energy: 1, solid: true },
  stone: { color: 0x535565, accent: 0x858899, hp: 3, energy: 2, reward: 'stone', value: 2, solid: true },
  hard: { color: 0x30323d, accent: 0x505462, hp: 6, energy: 4, solid: true },
  iron: { color: 0x4a4c58, accent: 0xb8c1cf, hp: 4, energy: 2, reward: 'iron', value: 7, solid: true },
  gold: { color: 0x63482e, accent: 0xffd052, hp: 5, energy: 3, reward: 'goldOre', value: 18, solid: true },
  crystal: { color: 0x263d61, accent: 0x67e2ff, hp: 7, energy: 4, reward: 'crystal', value: 28, solid: true },
  ruby: { color: 0x572c38, accent: 0xff5b72, hp: 8, energy: 4, reward: 'ruby', value: 42, solid: true },
  emerald: { color: 0x25483f, accent: 0x54ef9d, hp: 8, energy: 4, reward: 'emerald', value: 44, solid: true },
  amethyst: { color: 0x44345f, accent: 0xcc78ff, hp: 8, energy: 4, reward: 'amethyst', value: 48, solid: true },
  ancient: { color: 0x3d423d, accent: 0x45e0c0, hp: 10, energy: 5, reward: 'ancientOre', value: 70, solid: true },
  explosive: { color: 0x61322f, accent: 0xff654d, hp: 2, energy: 2, solid: true },
  unstable: { color: 0x654a39, accent: 0xd29461, hp: 3, energy: 2, solid: true },
  gas: { color: 0x36503e, accent: 0xa2ed72, hp: 2, energy: 1, solid: true, hazard: true },
  trap: { color: 0x292936, accent: 0xff7182, hp: 2, energy: 1, solid: true, hazard: true },
  lava: { color: 0x531a19, accent: 0xff8b3d, hp: 99, energy: 0, solid: false, unbreakable: true, hazard: true },
  bedrock: { color: 0x151823, accent: 0x34394b, hp: 999, energy: 0, solid: true, unbreakable: true },
  chest: { color: 0x6a3d26, accent: 0xffd66e, hp: 3, energy: 1, solid: true },
};

export const RESOURCE_LABEL: Record<ResourceKey, string> = { stone: '석재', iron: '철', goldOre: '금', crystal: '수정', ruby: '루비', emerald: '에메랄드', amethyst: '자수정', ancientOre: '고대 광물' };
export const EMPTY_CARGO = (): Cargo => ({ stone: 0, iron: 0, goldOre: 0, crystal: 0, ruby: 0, emerald: 0, amethyst: 0, ancientOre: 0 });
export const SELL_PRICES: Record<ResourceKey, number> = { stone: 2, iron: 7, goldOre: 18, crystal: 28, ruby: 42, emerald: 44, amethyst: 48, ancientOre: 70 };
export const MOVEMENT = { speed: 150, jumpVelocity: -295, gravity: 560 } as const;
export const CONTROL = { touchRangeTiles: 1.65, upgradedRangeTiles: 2.2, holdDelayMs: 190, repeatMs: 210 } as const;

export const UPGRADE_DATA: Record<UpgradeKey, { name: string; description: string; max: number; base: number; resource?: ResourceKey }> = {
  drill: { name: '드릴', description: '채굴 피해·속도·공격력', max: 10, base: 45, resource: 'iron' },
  battery: { name: '배터리', description: '최대 에너지·소비 효율', max: 10, base: 40, resource: 'crystal' },
  bag: { name: '가방', description: '광물 보관량', max: 10, base: 35, resource: 'stone' },
  detector: { name: '탐지기', description: '희귀 광물·비밀방 표시', max: 5, base: 70, resource: 'goldOre' },
  bomb: { name: '폭탄', description: '폭발 범위·피해', max: 5, base: 65, resource: 'iron' },
};

export const MISSIONS = [
  { id: 'iron10', title: '철광석 10개 수집', target: 10, reward: 80, metric: 'iron' },
  { id: 'gold5', title: '금광석 5개 수집', target: 5, reward: 120, metric: 'goldOre' },
  { id: 'kills3', title: '몬스터 3마리 처치', target: 3, reward: 100, metric: 'kills' },
  { id: 'depth100', title: '100m 도달', target: 100, reward: 150, metric: 'depth' },
  { id: 'boss1', title: '첫 보스 처치', target: 1, reward: 300, metric: 'bosses' },
] as const;
