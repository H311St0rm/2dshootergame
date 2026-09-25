import { TITLE, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../config/constants.js';
import Starfield from '../systems/Starfield.js';
import { loadHighScore } from '../systems/highScore.js';
import { textStyle } from '../ui/Hud.js';

const CX = GAME_WIDTH / 2;

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.starfield = new Starfield(this);
    this.starting = false;

    this.add
      .text(CX, 150, TITLE, { ...textStyle(44, '#4de3ff'), stroke: '#0a2a33', strokeThickness: 8 })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    const ship = this.add.image(CX, 270, 'player').setScale(3).setDepth(DEPTH.hud);
    this.tweens.add({ targets: ship, y: 260, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    ['enemy_drone', 'enemy_gunner', 'enemy_weaver', 'enemy_bulwark'].forEach((key, i) => {
      this.add.image(CX - 105 + i * 70, 360, key).setScale(1.5).setDepth(DEPTH.hud);
    });

    const lines = [
      ['ARROWS / WASD', 'MOVE'],
      ['SPACE', 'ACTIVATE ABILITY'],
      ['P / ESC', 'PAUSE'],
    ];
    lines.forEach(([key, action], i) => {
      const y = 440 + i * 26;
      this.add.text(CX - 12, y, key, textStyle(15, '#ffd700')).setOrigin(1, 0.5).setDepth(DEPTH.hud);
      this.add.text(CX + 12, y, action, textStyle(15, '#ffffff')).setOrigin(0, 0.5).setDepth(DEPTH.hud);
    });

    const tips = [
      'Your ship fires on its own. Dodge everything.',
      'Gold chevrons upgrade your weapon.',
      'Every hit costs 3 levels. A hit at the',
      'bottom of your meter ends the run.',
    ];
    tips.forEach((tip, i) => {
      this.add.text(CX, 545 + i * 20, tip, textStyle(12, '#9aa4b5')).setOrigin(0.5).setDepth(DEPTH.hud);
    });

    this.add
      .text(CX, 650, `BEST  ${loadHighScore()}`, textStyle(16, '#ffffff'))
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    const prompt = this.add
      .text(CX, GAME_HEIGHT - 90, 'CLICK OR PRESS ENTER TO START', textStyle(16, '#4dff88'))
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    this.tweens.add({ targets: prompt, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });

    this.input.keyboard.once('keydown-ENTER', () => this.startGame());
    this.input.keyboard.once('keydown-SPACE', () => this.startGame());
    this.input.once('pointerdown', () => this.startGame());
  }

  update(time, delta) {
    this.starfield.update(delta / 1000);
  }

  startGame() {
    if (this.starting) return;
    this.starting = true;
    this.scene.start('GameScene');
  }
}
