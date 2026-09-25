import { GAME_WIDTH, GAME_HEIGHT, STARFIELD, DEPTH } from '../config/constants.js';

export default class Starfield {
  constructor(scene) {
    this.stars = [];
    for (const layer of STARFIELD.layers) {
      for (let i = 0; i < layer.count; i++) {
        const image = scene.add
          .image(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(0, GAME_HEIGHT), 'star')
          .setScale(layer.size)
          .setAlpha(layer.alpha * Phaser.Math.FloatBetween(0.6, 1))
          .setDepth(DEPTH.stars);
        this.stars.push({ image, speed: layer.speed });
      }
    }
  }

  update(dt) {
    for (const star of this.stars) {
      star.image.y += star.speed * dt;
      if (star.image.y > GAME_HEIGHT + 2) {
        star.image.y = -2;
        star.image.x = Phaser.Math.Between(0, GAME_WIDTH);
      }
    }
  }
}
