import { BOSS, DEPTH } from '../config/constants.js';

export default class Boss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene) {
    super(scene, BOSS.centerX, BOSS.entryY, BOSS.texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(BOSS.hitbox.width, BOSS.hitbox.height, true);
    this.setDepth(DEPTH.enemies);
    this.hp = 0;
    this.maxHp = 0;
    this.state = 'idle';
    this.disableBody(true, true);
  }

  spawn(hp) {
    this.enableBody(true, BOSS.centerX, BOSS.entryY, true, true);
    this.clearTint();
    this.hp = hp;
    this.maxHp = hp;
    this.state = 'entering';
    this.phase = 0;
    this.fanTimer = 0;
    this.burstTimer = 0;
    this.burstRemaining = 0;
    this.burstGapTimer = 0;
    this.flashTimer = 0;
  }

  // `slow` is the Overdrive factor; the boss ignores the difficulty curve by design.
  tick(dt, slow, fireFan, fireAimed) {
    const scaled = dt * slow;

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) this.clearTint();
    }

    if (this.state === 'entering') {
      this.y = Math.min(BOSS.hoverY, this.y + BOSS.entrySpeed * scaled);
      if (this.y >= BOSS.hoverY) this.state = 'fighting';
      return;
    }

    this.phase += scaled;
    this.x = BOSS.centerX + BOSS.sineAmplitude * Math.sin((Math.PI * 2 * this.phase) / BOSS.sinePeriod);
    const muzzleY = this.y + BOSS.muzzleOffsetY;

    this.fanTimer += scaled;
    if (this.fanTimer >= BOSS.fan.interval) {
      this.fanTimer -= BOSS.fan.interval;
      fireFan(this.x, muzzleY);
    }

    this.burstTimer += scaled;
    if (this.burstTimer >= BOSS.burst.interval) {
      this.burstTimer -= BOSS.burst.interval;
      this.burstRemaining = BOSS.burst.count;
      this.burstGapTimer = 0;
    }
    if (this.burstRemaining > 0) {
      this.burstGapTimer -= scaled;
      if (this.burstGapTimer <= 0) {
        fireAimed(this.x, muzzleY);
        this.burstRemaining--;
        this.burstGapTimer = BOSS.burst.gap;
      }
    }
  }

  damage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.flashTimer = BOSS.hitFlashSeconds;
    this.setTintFill(0xffffff);
    return this.hp <= 0;
  }

  despawn() {
    this.state = 'idle';
    this.disableBody(true, true);
  }
}
