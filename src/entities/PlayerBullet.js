import { PLAYER_BULLET, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../config/constants.js';

const RANGE_FADE_PORTION = 0.3;

export default class PlayerBullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player_bullet');
    this.damage = 1;
    this.weapon = null;
    this.hitEnemies = new Set();
  }

  // angleDeg is measured from straight up; positive leans right.
  fire(x, y, angleDeg, damage, weapon) {
    this.weapon = weapon;
    this.setTexture(weapon.texture);
    this.enableBody(true, x, y, true, true);
    this.body.setSize(weapon.hitbox.width, weapon.hitbox.height, true);
    this.setDepth(DEPTH.playerBullets);
    this.setAlpha(1);
    this.damage = damage;
    this.pierceLeft = weapon.pierce ?? 0;
    this.hitEnemies.clear();
    this.life = weapon.range ? weapon.range / weapon.speed : weapon.lifetime ?? Infinity;
    this.maxLife = this.life;
    this.heading = Phaser.Math.DegToRad(angleDeg);
    this.applyHeading();
  }

  applyHeading() {
    this.setRotation(this.heading);
    this.setVelocity(Math.sin(this.heading) * this.weapon.speed, -Math.cos(this.heading) * this.weapon.speed);
  }

  // Lets a piercing shot damage each enemy once; returns false for an enemy already hit.
  registerHit(enemyUid) {
    if (this.hitEnemies.has(enemyUid)) return false;
    this.hitEnemies.add(enemyUid);
    if (this.pierceLeft > 0) this.pierceLeft--;
    else this.disableBody(true, true);
    return true;
  }

  tick(dt, findTarget) {
    if (this.weapon.turnRate) {
      const target = findTarget(this.x, this.y);
      if (target) {
        const desired = Math.atan2(target.x - this.x, this.y - target.y);
        const diff = Phaser.Math.Angle.Wrap(desired - this.heading);
        const maxTurn = this.weapon.turnRate * dt;
        this.heading += Phaser.Math.Clamp(diff, -maxTurn, maxTurn);
        this.applyHeading();
      }
    }

    if (Number.isFinite(this.life)) {
      this.life -= dt;
      if (this.life <= 0) {
        this.disableBody(true, true);
        return;
      }
      if (this.weapon.range) this.setAlpha(Math.min(1, this.life / (this.maxLife * RANGE_FADE_PORTION)));
    }

    const m = PLAYER_BULLET.cullMargin;
    if (this.y < -m || this.y > GAME_HEIGHT + m || this.x < -m || this.x > GAME_WIDTH + m) {
      this.disableBody(true, true);
    }
  }
}
