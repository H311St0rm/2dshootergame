import { PLAYER_BULLET, GAME_WIDTH, DEPTH } from '../config/constants.js';

const CULL_MARGIN = 20;

export default class PlayerBullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player_bullet');
    this.damage = 1;
  }

  // Angle is in degrees from straight up; positive leans right.
  fire(x, y, angleDeg, damage) {
    this.enableBody(true, x, y, true, true);
    this.setDepth(DEPTH.playerBullets);
    const a = Phaser.Math.DegToRad(angleDeg);
    this.setRotation(a);
    this.setVelocity(Math.sin(a) * PLAYER_BULLET.speed, -Math.cos(a) * PLAYER_BULLET.speed);
    this.damage = damage;
  }

  tick() {
    if (this.y < -CULL_MARGIN || this.x < -CULL_MARGIN || this.x > GAME_WIDTH + CULL_MARGIN) {
      this.disableBody(true, true);
    }
  }
}
