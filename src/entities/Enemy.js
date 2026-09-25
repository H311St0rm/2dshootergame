import { ENEMY_SPAWN, GAME_HEIGHT, DEPTH } from '../config/constants.js';

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'enemy_drone');
    this.config = null;
  }

  spawn(config, x) {
    this.config = config;
    this.setTexture(config.texture);
    this.enableBody(true, x, ENEMY_SPAWN.y, true, true);
    const hitbox = Math.round(config.size * ENEMY_SPAWN.hitboxScale);
    this.body.setSize(hitbox, hitbox, true);
    this.setDepth(DEPTH.enemies);
    this.clearTint();
    this.hp = config.hp;
    this.age = 0;
    this.baseX = x;
    this.flashTimer = 0;
    this.fireTimer = config.fire ? Phaser.Math.FloatBetween(0.2, 0.7) * config.fire.interval : 0;
  }

  // `slow` is the Overdrive factor (1 normally); it scales movement, sine phase and fire timers.
  tick(dt, slow, difficultyMultiplier, fire) {
    const scaled = dt * slow;
    this.age += scaled;
    this.setVelocity(0, this.config.speed * difficultyMultiplier * slow);

    if (this.config.move === 'sine') {
      const { sineAmplitude, sinePeriod } = this.config;
      this.x = this.baseX + sineAmplitude * Math.sin((Math.PI * 2 * this.age) / sinePeriod);
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) this.clearTint();
    }

    const f = this.config.fire;
    if (f && this.y > 0 && this.y < GAME_HEIGHT) {
      this.fireTimer += scaled;
      const interval = f.interval / difficultyMultiplier;
      if (this.fireTimer >= interval) {
        this.fireTimer = Math.min(this.fireTimer - interval, interval);
        fire(this);
      }
    }

    if (this.y > GAME_HEIGHT + ENEMY_SPAWN.despawnMargin) this.disableBody(true, true);
  }

  damage(amount) {
    this.hp -= amount;
    this.flashTimer = ENEMY_SPAWN.hitFlashSeconds;
    this.setTintFill(0xffffff);
    return this.hp <= 0;
  }
}
