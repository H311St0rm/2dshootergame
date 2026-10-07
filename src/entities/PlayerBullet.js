import { PLAYER_BULLET, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../config/constants.js';

const RANGE_FADE_PORTION = 0.3;

export default class PlayerBullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player_bullet');
    this.damage = 1;
    this.weapon = null;
    this.hitEnemies = new Set();
  }

  // angleDeg is measured from straight up; positive leans right. `ultimate` is the
  // weapon's owned ultimate (§19), or null; its fields switch on the extra behaviors.
  fire(x, y, angleDeg, damage, weapon, ultimate = null) {
    this.weapon = weapon;
    this.setTexture(weapon.texture);
    this.enableBody(true, x, y, true, true);
    this.body.setSize(weapon.hitbox.width, weapon.hitbox.height, true);
    this.setDepth(DEPTH.playerBullets);
    this.setAlpha(1);
    this.damage = damage;
    this.pierceLeft = ultimate?.pierceAll ? Infinity : weapon.pierce ?? 0;
    this.bouncesLeft = ultimate?.bounces ?? 0;
    this.retargetsLeft = ultimate?.retargets ?? 0;
    this.blastRadius = ultimate?.blastRadius ?? 0;
    this.burst = ultimate?.shards ? ultimate : null;
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

  // A shot damages each enemy at most once, so piercing shots don't re-hit while overlapping.
  canHit(enemyUid) {
    return !this.hitEnemies.has(enemyUid);
  }

  // Called after the hit's damage lands. A Swarm missile that killed its target
  // flies on with a fresh lifetime; otherwise the shot spends a pierce or ends.
  consumeHit(enemyUid, killed) {
    this.hitEnemies.add(enemyUid);
    if (killed && this.retargetsLeft > 0) {
      this.retargetsLeft--;
      this.life = this.maxLife;
    } else if (this.pierceLeft > 0) {
      this.pierceLeft--;
    } else {
      this.disableBody(true, true);
    }
  }

  // onBurst is called with a Flak pellet that ran out of range, just before it is removed.
  tick(dt, findTarget, onBurst) {
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

    // Ricochet bounces off the side edges only, never the top.
    if (this.bouncesLeft > 0) {
      const vx = this.body.velocity.x;
      if ((this.x <= 0 && vx < 0) || (this.x >= GAME_WIDTH && vx > 0)) {
        this.bouncesLeft--;
        this.x = Phaser.Math.Clamp(this.x, 0, GAME_WIDTH);
        this.heading = -this.heading;
        this.applyHeading();
      }
    }

    if (Number.isFinite(this.life)) {
      this.life -= dt;
      if (this.life <= 0) {
        if (this.burst) onBurst(this);
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
