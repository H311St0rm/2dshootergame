import { BG_COLOR } from './config/constants.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import HangarScene from './scenes/HangarScene.js';
import GameScene from './scenes/GameScene.js';
import PauseScene from './scenes/PauseScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import { initialCanvasSize, trackDisplaySize } from './systems/display.js';

// The canvas matches the size it's shown at; cameras zoom the GAME_WIDTH × GAME_HEIGHT world to fit (§4).
const canvasSize = initialCanvasSize(document.getElementById('game-container'));

export const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-container',
  width: canvasSize.width,
  height: canvasSize.height,
  backgroundColor: BG_COLOR,
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, HangarScene, GameScene, PauseScene, GameOverScene],
});
trackDisplaySize(game);
