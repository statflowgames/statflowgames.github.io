import { CHUNK_ROWS, StageId, TileKind, WORLD_COLS, WORLD_ROWS, WORLD_START_ROW } from '../data/gameData';

export type GeneratedCell = { row: number; col: number; kind: TileKind; variant: number; hidden?: boolean };

export function hash(seed: number, a: number, b: number) {
  let value = Math.imul(seed ^ Math.imul(a + 1, 0x45d9f3b), 0x27d4eb2d) ^ Math.imul(b + 7, 0x165667b1);
  value ^= value >>> 15; value = Math.imul(value, 0x85ebca6b); value ^= value >>> 13;
  return (value >>> 0) / 0x100000000;
}

function shaftAt(seed: number, row: number) {
  let shaft = 7;
  const segment = Math.floor(Math.max(0, row - WORLD_START_ROW) / 4);
  for (let i = 1; i <= segment; i++) {
    const roll = hash(seed, i, 991);
    shaft = Math.max(2, Math.min(WORLD_COLS - 3, shaft + (roll < .25 ? -2 : roll < .5 ? -1 : roll < .75 ? 1 : 2)));
  }
  return shaft;
}

function stageOre(stage: StageId, rare: number): TileKind | undefined {
  if (stage === 'green') return rare > .987 ? 'gold' : rare > .948 ? 'iron' : undefined;
  if (stage === 'crystal') return rare > .982 ? 'amethyst' : rare > .925 ? 'crystal' : rare > .91 ? 'iron' : undefined;
  if (stage === 'ruins') return rare > .982 ? 'ancient' : rare > .93 ? 'emerald' : rare > .91 ? 'gold' : undefined;
  if (stage === 'lava') return rare > .978 ? 'ruby' : rare > .925 ? 'gold' : undefined;
  return rare > .975 ? 'ancient' : rare > .92 ? 'amethyst' : rare > .905 ? 'ruby' : undefined;
}

function tileFor(seed: number, stage: StageId, row: number, col: number): TileKind {
  const roll = hash(seed, row, col), rare = hash(seed ^ 0x6ac690c5, row, col);
  const ore = stageOre(stage, rare); if (ore) return ore;
  if (rare > .892 && rare < .907) return 'explosive';
  if (rare > .875 && rare < .892) return 'unstable';
  if (row > 24 && rare > .858 && rare < .875) return stage === 'lava' ? 'lava' : stage === 'green' ? 'gas' : 'trap';
  if (row > 18 && rare > .843 && rare < .858) return 'chest';
  if (stage === 'ruins' && roll < .18) return 'ancient';
  if (stage === 'lava' && roll < .22) return 'hard';
  if (stage === 'abyss' && roll < .32) return 'hard';
  if (row > 40 && roll < .28) return 'hard';
  if (row > 14 && roll < .48) return 'stone';
  return roll < .24 ? 'stone' : 'dirt';
}

export function generateChunk(seed: number, stage: StageId, chunkIndex: number): GeneratedCell[] {
  const cells: GeneratedCell[] = [];
  const firstRow = Math.max(WORLD_START_ROW, chunkIndex * CHUNK_ROWS);
  const lastRow = Math.min(WORLD_ROWS, (chunkIndex + 1) * CHUNK_ROWS);
  for (let row = firstRow; row < lastRow; row++) {
    const bossArena = row >= WORLD_ROWS - 12;
    const shaft = shaftAt(seed, row);
    for (let col = 0; col < WORLD_COLS; col++) {
      if (bossArena) {
        if (row === WORLD_ROWS - 1 || col === 0 || col === WORLD_COLS - 1) cells.push({ row, col, kind: 'bedrock', variant: col % 4 });
        else if (row === WORLD_ROWS - 12 && col !== 6 && col !== 7) cells.push({ row, col, kind: 'bedrock', variant: col % 4 });
        continue;
      }
      const chamber = row % 17 === 0 && col > 2 && col < WORLD_COLS - 3;
      const naturalCave = row > 12 && hash(seed ^ 0x9e3779b9, row, col) < .075;
      const secret = row % 19 === 7 && (col === 1 || col === WORLD_COLS - 2);
      const tutorialShaft = stage === 'green' && (col === 7 || col === 8);
      if (tutorialShaft || col === shaft || chamber || naturalCave) continue;
      cells.push({ row, col, kind: secret ? 'chest' : tileFor(seed, stage, row, col), variant: Math.floor(hash(seed ^ 0x14fa9, row, col) * 4), hidden: secret });
    }
  }
  return cells;
}

export function seedLabel(seed: number) { return seed.toString(36).toUpperCase().padStart(6, '0').slice(-6); }
