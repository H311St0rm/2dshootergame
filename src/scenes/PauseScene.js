import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants.js';
import { textStyle } from '../ui/Hud.js';

export default class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  create() {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, 'PAUSED', textStyle(36, '#4de3ff')).setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 24, 'PRESS P OR ESC TO RESUME', textStyle(14, '#ffffff'))
      .setOrigin(0.5);

    this.resuming = false;
    // Ignoring auto-repeat stops a held P from pausing and instantly resuming.
    const onKey = (event) => {
      if (!event.repeat) this.resumeGame();
    };
    this.input.keyboard.on('keydown-P', onKey);
    this.input.keyboard.on('keydown-ESC', onKey);
  }

  resumeGame() {
    if (this.resuming) return;
    this.resuming = true;
    this.scene.resume('GameScene');
    this.scene.stop();
  }
}
