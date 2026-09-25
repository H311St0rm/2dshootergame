import { DROPS, GAME_HEIGHT, DEPTH } from '../config/constants.js';

export default class Pickup extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'pickup_upgrade');
    this.kind = null;
    this.age = 0;
  }

  // kind is 'upgrade' or one of ABILITY_KEYS.
  spawn(kind, x, y) {
    this.kind = kind;
    this.setTexture(kind === 'upgrade' ? 'pickup_upgrade' : `pickup_${kind}`);
    this.enableBody(true, x, y, true, true);
    this.setDepth(DEPTH.pickups);
    this.setVelocity(0, DROPS.fallSpeed);
    this.age = 0;
  }

  tick(dt) {
    this.age += dt;
    this.setAlpha(0.75 + 0.25 * Math.sin(this.age * 8));
    if (this.y > GAME_HEIGHT + DROPS.despawnMargin) this.disableBody(true, true);
  }
}
