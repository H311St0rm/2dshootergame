import { GAME_WIDTH, GAME_HEIGHT, DEPTH, TIMING } from '../config/constants.js';
import Starfield from '../systems/Starfield.js';
import { textStyle } from '../ui/Hud.js';

const CX = GAME_WIDTH / 2;

function formatTime(seconds) {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  init(data) {
    this.result = data;
  }

  create() {
    this.starfield = new Starfield(this);
    this.retrying = false;
    const r = this.result;

    this.add
      .text(CX, 200, 'GAME OVER', { ...textStyle(46, '#ff4d4d'), stroke: '#330a0a', strokeThickness: 8 })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    this.add.text(CX, 290, `SCORE  ${r.score}`, textStyle(24, '#ffffff')).setOrigin(0.5).setDepth(DEPTH.hud);
    this.add.text(CX, 325, `BEST  ${r.best}`, textStyle(18, '#9aa4b5')).setOrigin(0.5).setDepth(DEPTH.hud);

    if (r.isNewBest) {
      const badge = this.add.text(CX, 360, 'NEW BEST!', textStyle(18, '#ffd700')).setOrigin(0.5).setDepth(DEPTH.hud);
      this.tweens.add({ targets: badge, scale: 1.15, duration: 400, yoyo: true, repeat: -1 });
    }

    const stats = [
      `SURVIVED  ${formatTime(r.survived)}`,
      `MAX WEAPON LEVEL  ${r.peakLevel}`,
      `SENTINELS DESTROYED  ${r.bossesDefeated}`,
    ];
    stats.forEach((line, i) => {
      this.add.text(CX, 420 + i * 26, line, textStyle(14, '#7fa9b5')).setOrigin(0.5).setDepth(DEPTH.hud);
    });

    const prompt = this.add
      .text(CX, GAME_HEIGHT - 150, 'PRESS R OR CLICK TO RETRY', textStyle(18, '#4dff88'))
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    this.tweens.add({ targets: prompt, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });

    // Short delay so a key or click held from the moment of death doesn't skip this screen.
    this.time.delayedCall(TIMING.gameOverInputDelayMs, () => {
      this.input.keyboard.once('keydown-R', () => this.retry());
      this.input.once('pointerdown', () => this.retry());
    });
  }

  update(time, delta) {
    this.starfield.update(delta / 1000);
  }

  retry() {
    if (this.retrying) return;
    this.retrying = true;
    this.scene.start('GameScene');
  }
}
