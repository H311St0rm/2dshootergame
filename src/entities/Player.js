import { PLAYER, DEPTH } from '../config/constants.js';

const HURT_TINT = 0xff6060;
const HURT_TINT_SECONDS = 0.15;

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(PLAYER.hitboxSize, PLAYER.hitboxSize, true);
    this.setDepth(DEPTH.player);
    this.invulnTimer = 0;
    this.hurtTintTimer = 0;
    this.alive = true;
  }

  move(dirX, dirY, dt) {
    let dx = dirX;
    let dy = dirY;
    if (dx !== 0 && dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
    }
    const b = PLAYER.bounds;
    this.x = Phaser.Math.Clamp(this.x + dx * PLAYER.speed * dt, b.minX, b.maxX);
    this.y = Phaser.Math.Clamp(this.y + dy * PLAYER.speed * dt, b.minY, b.maxY);
  }

  get isInvulnerable() {
    return this.invulnTimer > 0;
  }

  startInvulnerability() {
    this.invulnTimer = PLAYER.hitInvulnSeconds;
    this.hurtTintTimer = HURT_TINT_SECONDS;
    this.setTint(HURT_TINT);
  }

  tick(dt, shielded) {
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.hurtTintTimer > 0) {
      this.hurtTintTimer -= dt;
      if (this.hurtTintTimer <= 0) this.clearTint();
    }
    if (this.invulnTimer > 0 && !shielded) {
      const phase = Math.floor(this.invulnTimer / PLAYER.flickerInterval) % 2;
      this.setAlpha(phase === 0 ? 1 : PLAYER.flickerAlpha);
    } else {
      this.setAlpha(1);
    }
  }

  kill() {
    this.alive = false;
    this.disableBody(true, true);
  }
}
