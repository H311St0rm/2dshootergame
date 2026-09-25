import { ENEMY_BULLET, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../config/constants.js';

export default class EnemyBullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'ebullet_orange');
    this.baseVx = 0;
    this.baseVy = 0;
  }

  fire(x, y, vx, vy, texture) {
    this.setTexture(texture);
    this.enableBody(true, x, y, true, true);
    this.body.setSize(ENEMY_BULLET.hitboxSize, ENEMY_BULLET.hitboxSize, true);
    this.setDepth(DEPTH.enemyBullets);
    this.baseVx = vx;
    this.baseVy = vy;
    this.setVelocity(vx, vy);
  }

  tick(slow) {
    this.setVelocity(this.baseVx * slow, this.baseVy * slow);
    const m = ENEMY_BULLET.cullMargin;
    if (this.y > GAME_HEIGHT + m || this.y < -m || this.x < -m || this.x > GAME_WIDTH + m) {
      this.disableBody(true, true);
    }
  }
}
