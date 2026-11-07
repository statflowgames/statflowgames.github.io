import Phaser from 'phaser';
import './style.css';
import { GAME_HEIGHT, GAME_WIDTH } from './data/gameData';
import { BaseScene } from './game/BaseScene';
import { GameScene } from './game/GameScene';

class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }
  preload() {
    this.load.spritesheet('miner-sheet', 'assets/characters/miner-sheet.png', { frameWidth: 310, frameHeight: 310 });
    const box = this.add.rectangle(225, 410, 280, 8, 0x33283a).setOrigin(.5);
    const bar = this.add.rectangle(85, 410, 0, 8, 0xffae4d).setOrigin(0, .5);
    this.add.text(225, 354, 'MINI DUNGEON DIGGER', { fontFamily: 'Inter, sans-serif', fontSize: '19px', color: '#ffd36d', fontStyle: 'bold' }).setOrigin(.5);
    this.load.on('progress', (value: number) => bar.width = 280 * value);
    this.load.on('complete', () => { box.destroy(); bar.destroy(); });
  }
  create() { this.scene.start('base'); }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#100d18',
  scene: [BootScene, BaseScene, GameScene],
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, roundPixels: true, powerPreference: 'high-performance' },
  input: { activePointers: 4 },
  fps: { target: 60, min: 30, smoothStep: true },
});
