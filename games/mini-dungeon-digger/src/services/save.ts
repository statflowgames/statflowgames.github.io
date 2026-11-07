import { EMPTY_CARGO, Persist, STAGES } from '../data/gameData';

const SAVE_KEY = 'mini-dungeon-digger-v3';

export const freshSave = (): Persist => ({
  version: 3,
  gold: 80,
  resources: EMPTY_CARGO(),
  up: { drill: 1, battery: 1, bag: 1, detector: 0, bomb: 1 },
  unlockedStage: 0,
  bossClears: { green: 0, crystal: 0, ruins: 0, lava: 0, abyss: 0 },
  bestDepth: { green: 0, crystal: 100, ruins: 300, lava: 500, abyss: 1000 },
  runs: 0,
  kills: 0,
  artifacts: [],
  blueprints: [],
  codex: ['region:green', 'tile:dirt', 'tile:stone', 'monster:bat'],
  missions: {},
  consumables: { bombs: 2, energyCells: 1 },
  settings: { language: 'ko', sound: true, vibration: true },
  lastSeed: 0,
});

function normalize(value: Partial<Persist>): Persist {
  const base = freshSave();
  const merged: Persist = {
    ...base,
    ...value,
    version: 3,
    resources: { ...base.resources, ...(value.resources ?? {}) },
    up: { ...base.up, ...(value.up ?? {}) },
    bestDepth: { ...base.bestDepth, ...(value.bestDepth ?? {}) },
    bossClears: { ...base.bossClears, ...(value.bossClears ?? {}) },
    settings: { ...base.settings, ...(value.settings ?? {}) },
    consumables: { ...base.consumables, ...(value.consumables ?? {}) },
    missions: value.missions ?? {},
    artifacts: value.artifacts ?? [],
    blueprints: value.blueprints ?? [],
    codex: value.codex ?? base.codex,
  };
  merged.unlockedStage = Math.max(0, Math.min(STAGES.length - 1, merged.unlockedStage));
  return merged;
}

export function loadSave(): Persist {
  try {
    const value = JSON.parse(localStorage.getItem(SAVE_KEY) || '') as Partial<Persist>;
    if (value.version === 3) return normalize(value);
  } catch { /* use migration/fresh save */ }
  try {
    const legacy = JSON.parse(localStorage.getItem('mini-dungeon-digger-v2') || localStorage.getItem('mini-dungeon-digger-v1') || '') as Record<string, unknown>;
    if (legacy.up) {
      const base = freshSave();
      base.gold = Number(legacy.gold) || base.gold;
      base.up = { ...base.up, ...(legacy.up as Persist['up']) };
      base.runs = Number(legacy.runs) || 0;
      base.bestDepth.green = Number(legacy.best) || 0;
      return base;
    }
  } catch { /* fresh save */ }
  return freshSave();
}

export function storeSave(save: Persist) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

export function exportSave(save: Persist) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(save))));
}

export function importSave(encoded: string): Persist | undefined {
  try {
    return normalize(JSON.parse(decodeURIComponent(escape(atob(encoded)))) as Partial<Persist>);
  } catch {
    return undefined;
  }
}
