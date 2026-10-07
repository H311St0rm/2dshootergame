import { GAME_WIDTH, GAME_HEIGHT, DEPTH, TIMING } from '../config/constants.js';
import Starfield from '../systems/Starfield.js';
import { textStyle, formatGold } from '../ui/Hud.js';

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
    this.leaving = false;
    this.acceptingInput = false;
    const r = this.result;

    this.add
      .text(CX, 180, 'GAME OVER', { ...textStyle(46, '#ff4d4d'), stroke: '#330a0a', strokeThickness: 8 })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    this.add.text(CX, 262, `+${formatGold(r.earned)} GOLD`, textStyle(26, '#ffd700')).setOrigin(0.5).setDepth(DEPTH.hud);
    this.add.text(CX, 298, `BANK  ${formatGold(r.bank)}`, textStyle(16, '#ffffff')).setOrigin(0.5).setDepth(DEPTH.hud);
    this.add.text(CX, 322, `BEST RUN  ${formatGold(r.best)}`, textStyle(14, '#9aa4b5')).setOrigin(0.5).setDepth(DEPTH.hud);

    if (r.isNewBest) {
      const badge = this.add.text(CX, 354, 'NEW BEST RUN!', textStyle(18, '#ffd700')).setOrigin(0.5).setDepth(DEPTH.hud);
      this.tweens.add({ targets: badge, scale: 1.15, duration: 400, yoyo: true, repeat: -1 });
    }

    const stats = [
      `SURVIVED  ${formatTime(r.survived)}`,
      `MAX WEAPON LEVEL  ${r.peakLevel}`,
      `SENTINELS DESTROYED  ${r.bossesDefeated}`,
    ];
    stats.forEach((line, i) => {
      this.add.text(CX, 414 + i * 26, line, textStyle(14, '#7fa9b5')).setOrigin(0.5).setDepth(DEPTH.hud);
    });

    const retry = this.button(GAME_HEIGHT - 190, 'R  RETRY', 18, '#4dff88', 'GameScene');
    this.tweens.add({ targets: retry, alpha: 0.35, duration: 600, yoyo: true, repeat: -1 });
    this.button(GAME_HEIGHT - 150, 'H  HANGAR', 15, '#ffd700', 'HangarScene');
    this.button(GAME_HEIGHT - 120, 'M  MENU', 15, '#c9d3e0', 'MenuScene');

    // Short delay so a key or click held from the moment of death doesn't skip this screen.
    this.time.delayedCall(TIMING.gameOverInputDelayMs, () => {
      this.acceptingInput = true;
      const keyboard = this.input.keyboard;
      keyboard.on('keydown-R', () => this.go('GameScene'));
      keyboard.on('keydown-H', () => this.go('HangarScene'));
      keyboard.on('keydown-M', () => this.go('MenuScene'));
    });
  }

  button(y, label, size, color, sceneKey) {
    return this.add
      .text(CX, y, label, textStyle(size, color))
      .setOrigin(0.5)
      .setDepth(DEPTH.hud)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.go(sceneKey));
  }

  update(time, delta) {
    this.starfield.update(delta / 1000);
  }

  go(sceneKey) {
    if (!this.acceptingInput || this.leaving) return;
    this.leaving = true;
    this.scene.start(sceneKey);
  }
}
