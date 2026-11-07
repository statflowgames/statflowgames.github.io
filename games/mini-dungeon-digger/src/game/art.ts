import Phaser from 'phaser';
import { STAGES, TileKind, TILE_RULES } from '../data/gameData';

function texture(scene: Phaser.Scene, key: string, width: number, height: number, draw: (g: Phaser.GameObjects.Graphics) => void) {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics(); draw(g); g.generateTexture(key, width, height); g.destroy();
}

export function createGameTextures(scene: Phaser.Scene) {
  (Object.keys(TILE_RULES) as TileKind[]).forEach((kind) => {
    for (let variant = 0; variant < 4; variant++) {
      const rule = TILE_RULES[kind];
      texture(scene, `tile-${kind}-${variant}`, 32, 32, (g) => {
        g.fillStyle(rule.color).fillRoundedRect(0, 0, 32, 32, 3);
        g.lineStyle(1, 0x171520, .7).strokeRoundedRect(.5, .5, 31, 31, 3);
        g.fillStyle(rule.accent, .2 + variant * .04);
        for (let i = 0; i < 4; i++) {
          const x = 4 + ((i * 11 + variant * 7) % 25), y = 5 + ((i * 7 + variant * 5) % 22);
          g.fillCircle(x, y, 1 + ((i + variant) % 2));
        }
        if (['iron', 'gold', 'crystal', 'ruby', 'emerald', 'amethyst', 'ancient'].includes(kind)) {
          g.fillStyle(rule.accent, .95);
          if (kind === 'iron') { g.fillCircle(9, 11, 5).fillCircle(23, 20, 4); }
          else { g.fillTriangle(16, 3, 25, 14, 18, 29).fillTriangle(16, 3, 7, 15, 18, 29); g.lineStyle(1, 0xffffff, .5).lineBetween(16, 5, 18, 25); }
        } else if (kind === 'explosive') {
          g.fillStyle(rule.accent).fillCircle(16, 17, 10); g.fillStyle(0xffc84e).fillCircle(16, 17, 4); g.lineStyle(2, 0xffd987).lineBetween(18, 7, 23, 2);
        } else if (kind === 'unstable') {
          g.lineStyle(2, rule.accent).strokeTriangle(6, 8, 26, 8, 16, 26); g.fillStyle(rule.accent).fillTriangle(13, 13, 19, 13, 16, 21);
        } else if (kind === 'gas') {
          g.fillStyle(rule.accent, .75).fillCircle(11, 16, 6).fillCircle(20, 13, 7).fillCircle(18, 22, 6);
        } else if (kind === 'trap') {
          g.fillStyle(rule.accent).fillTriangle(3, 28, 9, 11, 14, 28).fillTriangle(12, 28, 18, 9, 23, 28).fillTriangle(21, 28, 27, 12, 31, 28);
        } else if (kind === 'lava') {
          g.fillStyle(0xff572e).fillRect(0, 11, 32, 21); g.fillStyle(0xffc444).fillEllipse(8, 14, 13, 7).fillEllipse(24, 22, 16, 8);
        } else if (kind === 'bedrock') {
          g.lineStyle(3, rule.accent, .8).strokeCircle(16, 16, 10); g.lineBetween(4, 27, 28, 5);
        } else if (kind === 'chest') {
          g.fillStyle(0x9b5a2d).fillRoundedRect(4, 9, 24, 19, 4); g.lineStyle(2, 0x3b241b).strokeRoundedRect(4, 9, 24, 19, 4); g.fillStyle(rule.accent).fillRect(13, 12, 6, 10);
        }
      });
    }
  });

  const monsterData: Record<string, [number, number, number]> = {
    bat: [0x805bd4, 0xb997ff, 0xff6685], slime: [0x68717d, 0xaab4c0, 0xff7b82], spider: [0x3e82ad, 0x79ddff, 0xfff07a],
    golem: [0x726554, 0xd0ae68, 0x66ffd4], lavaBeast: [0x7d2420, 0xff7341, 0xffdc5e],
  };
  Object.entries(monsterData).forEach(([key, colors]) => texture(scene, `monster-${key}`, 64, 56, (g) => {
    const [body, accent, eye] = colors;
    if (key === 'bat') { g.fillStyle(body).fillTriangle(30, 23, 1, 6, 12, 36).fillTriangle(34, 23, 63, 6, 52, 36).fillEllipse(32, 30, 32, 32); }
    else if (key === 'spider') { g.lineStyle(5, accent).lineBetween(22, 29, 4, 12).lineBetween(20, 34, 2, 43).lineBetween(42, 29, 60, 12).lineBetween(44, 34, 62, 43); g.fillStyle(body).fillEllipse(32, 30, 34, 28); }
    else if (key === 'golem') { g.fillStyle(body).fillRoundedRect(13, 10, 38, 42, 10); g.fillStyle(accent).fillRect(4, 22, 12, 25).fillRect(48, 22, 12, 25); }
    else { g.fillStyle(body).fillEllipse(32, 34, 48, 36); g.fillStyle(accent, .8).fillEllipse(32, 29, 36, 24); }
    g.fillStyle(0xffffff).fillCircle(25, 28, 5).fillCircle(39, 28, 5); g.fillStyle(eye).fillCircle(26, 29, 2.5).fillCircle(40, 29, 2.5);
    g.lineStyle(2, 0x211a25, .8).strokeEllipse(32, 34, 48, 36);
  }));

  const bosses = [
    ['mole', 0x7c4d35, 0xefb15f], ['crystalGolem', 0x365d91, 0x77e5ff], ['guardian', 0x625947, 0xffd568],
    ['dragon', 0x81251f, 0xff7444], ['abyssKing', 0x171a38, 0x39e2d4],
  ] as const;
  bosses.forEach(([key, body, accent]) => texture(scene, `boss-${key}`, 150, 120, (g) => {
    if (key === 'dragon') { g.fillStyle(body).fillTriangle(76, 20, 8, 50, 56, 68).fillTriangle(74, 22, 142, 48, 97, 69); }
    g.fillStyle(body).fillRoundedRect(28, 22, 94, 83, 30); g.fillStyle(accent, .9).fillEllipse(75, 43, 62, 38);
    if (key === 'crystalGolem') { g.fillTriangle(38, 24, 53, 1, 62, 30).fillTriangle(88, 28, 104, 2, 116, 35); }
    if (key === 'guardian') { g.lineStyle(5, accent).strokeCircle(75, 61, 26); g.lineBetween(75, 35, 75, 87); }
    if (key === 'abyssKing') { g.fillTriangle(36, 30, 47, 2, 61, 29).fillTriangle(62, 26, 75, 0, 88, 26).fillTriangle(88, 29, 104, 3, 115, 32); }
    g.fillStyle(0xffffff).fillCircle(59, 54, 8).fillCircle(91, 54, 8); g.fillStyle(accent).fillCircle(61, 55, 4).fillCircle(93, 55, 4);
    g.lineStyle(4, 0x211820).strokeRoundedRect(28, 22, 94, 83, 30); g.fillStyle(accent).fillRect(40, 96, 24, 19).fillRect(86, 96, 24, 19);
  }));

  texture(scene, 'projectile', 16, 16, (g) => g.fillStyle(0xffffff).fillCircle(8, 8, 7).fillStyle(0x5ce8ff).fillCircle(8, 8, 4));
  texture(scene, 'bomb', 28, 28, (g) => g.fillStyle(0x24222c).fillCircle(14, 16, 11).fillStyle(0xffce55).fillRect(12, 1, 4, 7).fillCircle(17, 3, 3));
}

export function createParallax(scene: Phaser.Scene, stageIndex: number) {
  const stage = STAGES[stageIndex], [dark, mid, rock, glow] = stage.colors;
  const back = scene.add.container(0, 0).setScrollFactor(0, .08).setDepth(-20);
  back.add(scene.add.rectangle(225, 400, 450, 1050, dark));
  for (let i = 0; i < 18; i++) back.add(scene.add.ellipse((i * 83) % 500 - 25, 80 + i * 64, 150 + (i % 3) * 30, 90, mid, .65));
  const middle = scene.add.container(0, 0).setScrollFactor(.15, .3).setDepth(-15);
  for (let i = 0; i < 22; i++) middle.add(scene.add.polygon((i * 79) % 470, 100 + i * 110, [0, 0, 35, -40, 75, 0, 60, 70, 10, 70], rock, .25));
  const lights = scene.add.container(0, 0).setScrollFactor(.3, .55).setDepth(-10);
  for (let i = 0; i < 28; i++) {
    const dot = scene.add.circle((i * 113) % 445, 150 + i * 85, 2 + i % 3, glow, .22 + (i % 4) * .08);
    lights.add(dot); scene.tweens.add({ targets: dot, alpha: .08, yoyo: true, repeat: -1, duration: 700 + i * 37 });
  }
  return [back, middle, lights];
}
