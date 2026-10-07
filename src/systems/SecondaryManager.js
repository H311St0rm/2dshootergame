import { SECONDARIES, DEPTH } from '../config/constants.js';

const ZAP_SECONDS = 0.12;
const ARC_JITTER = 6;
const ARC_SEGMENT = 12;
// Rough half-size of the Sentinel's hitbox, so ranged effects reach its edge, not just its center.
const BOSS_REACH = 28;

export function secondaryStats(id, rank, ultimate = false) {
  const def = SECONDARIES[id];
  const i = Phaser.Math.Clamp(rank, 1, def.costs.length) - 1;
  if (id === 'drone') {
    return { cooldown: def.cooldowns[i], drones: ultimate ? 2 : 1, range: def.range };
  }
  if (id === 'tesla') {
    return {
      cooldown: def.cooldowns[i],
      range: def.ranges[i] + (ultimate ? def.ultimate.rangeBonus : 0),
      maxTargets: def.maxTargets[i],
      damage: def.damage,
      chainRange: ultimate ? def.ultimate.chainRange : 0,
    };
  }
  return {
    cooldown: def.deflectCooldowns[i],
    radius: def.radii[i],
    tickInterval: def.tickInterval,
    tickDamage: def.tickDamage,
    deflectDamage: def.deflectDamage,
    bulletSpeedFactor: ultimate ? def.ultimate.bulletSpeedFactor : 1,
  };
}

export function describeSecondary(id, rank, ultimate = false) {
  const s = secondaryStats(id, rank, ultimate);
  if (id === 'drone') return `${s.drones} DRONE${s.drones > 1 ? 'S' : ''}, ${s.cooldown}S COOLDOWN`;
  if (id === 'tesla') {
    return `${s.cooldown}S COOLDOWN, ${s.range}PX RANGE, ${s.maxTargets} TARGETS${s.chainRange ? ', ARCS CHAIN' : ''}`;
  }
  return `DEFLECT EVERY ${s.cooldown}S, ${s.radius}PX FIELD${s.bulletSpeedFactor < 1 ? ', BULLETS SLOWED' : ''}`;
}

// Runs the equipped defensive secondary (§20). Every effect holds its charge
// when there is nothing to hit, so a ready secondary fires the instant a target appears.
export default class SecondaryManager {
  constructor(scene, id, rank, ultimate = false) {
    this.scene = scene;
    this.id = id && rank > 0 ? id : null;
    this.zaps = [];
    if (!this.id) return;

    this.def = SECONDARIES[this.id];
    this.ultimate = ultimate;
    this.stats = secondaryStats(this.id, rank, ultimate);
    this.fx = scene.add.graphics().setDepth(DEPTH.particles);
    this.timer = 0;

    if (this.id === 'drone') {
      const { x, y } = scene.player;
      this.drones = Array.from({ length: this.stats.drones }, (_, i) => ({
        side: i === 0 ? -1 : 1,
        // A second drone starts half a cooldown behind so the pair alternate shots.
        timer: (i * this.stats.cooldown) / 2,
        sprite: scene.add.image(x, y, 'drone').setDepth(DEPTH.player),
      }));
    }
    if (this.id === 'field') {
      this.tickTimer = 0;
      this.clock = 0;
      this.fieldGfx = scene.add.graphics().setDepth(DEPTH.pickups);
    }
  }

  get name() {
    return this.id ? this.def.name : null;
  }

  get color() {
    return this.id ? this.def.color : 0xffffff;
  }

  // 0..1, where 1 means charged and waiting for a target.
  get readiness() {
    if (!this.id) return 0;
    const charge = this.id === 'drone' ? Math.max(...this.drones.map((d) => d.timer)) : this.timer;
    return Math.min(1, charge / this.stats.cooldown);
  }

  // Stasis Field ultimate: enemy bullets inside the field move at a fraction of their speed.
  bulletSpeedFactorAt(x, y) {
    if (this.id !== 'field' || this.stats.bulletSpeedFactor === 1 || !this.scene.player.alive) return 1;
    const { player } = this.scene;
    const inside = (x - player.x) ** 2 + (y - player.y) ** 2 <= this.stats.radius ** 2;
    return inside ? this.stats.bulletSpeedFactor : 1;
  }

  update(dt) {
    if (!this.id) return;
    const alive = this.scene.player.alive;
    if (this.id === 'drone') this.updateDrones(dt, alive);
    else if (this.id === 'tesla' && alive) this.updateTesla(dt);
    else if (this.id === 'field') this.updateField(dt, alive);
    this.drawZaps(dt);
  }

  // --- Escort Drone ---------------------------------------------------------

  updateDrones(dt, alive) {
    const { player } = this.scene;
    const { offsetX, offsetY, followRate } = this.def;
    const follow = Math.min(1, dt * followRate);
    for (const drone of this.drones) {
      drone.sprite.setVisible(alive);
      if (!alive) continue;
      const bob = Math.sin(this.scene.time.now / 250 + drone.side) * 2;
      drone.sprite.x += (player.x + drone.side * offsetX - drone.sprite.x) * follow;
      drone.sprite.y += (player.y + offsetY + bob - drone.sprite.y) * follow;

      drone.timer = Math.min(drone.timer + dt, this.stats.cooldown);
      if (drone.timer < this.stats.cooldown) continue;
      const bullet = this.closestBullet(player.x, player.y, this.stats.range);
      if (!bullet) continue;
      drone.timer = 0;
      this.addLine(drone.sprite.x, drone.sprite.y, bullet.x, bullet.y, this.def.color, 1.5);
      this.scene.destroyEnemyBullet(bullet);
      this.scene.sfx.droneShot();
    }
  }

  closestBullet(x, y, range) {
    let best = null;
    let bestDistance = range * range;
    for (const bullet of this.scene.enemyBullets.getChildren()) {
      if (!bullet.active) continue;
      const d = (bullet.x - x) ** 2 + (bullet.y - y) ** 2;
      if (d <= bestDistance) {
        bestDistance = d;
        best = bullet;
      }
    }
    return best;
  }

  // --- Tesla Coil -----------------------------------------------------------

  updateTesla(dt) {
    this.timer = Math.min(this.timer + dt, this.stats.cooldown);
    if (this.timer < this.stats.cooldown) return;
    const { x, y } = this.scene.player;
    const targets = this.targetsInRange(x, y, this.stats.range).slice(0, this.stats.maxTargets);
    if (targets.length === 0) return;

    this.timer = 0;
    const struck = new Set(targets.map((t) => t.object));
    const origins = targets.map((t) => ({ x: t.object.x, y: t.object.y }));
    for (const target of targets) {
      this.addArc(x, y, target.object.x, target.object.y);
      this.strike(target, this.stats.damage);
    }
    // Chain Lightning ultimate: each arc jumps once more to the nearest target it hasn't struck.
    if (this.stats.chainRange) {
      for (const origin of origins) {
        const next = this.targetsInRange(origin.x, origin.y, this.stats.chainRange).find((t) => !struck.has(t.object));
        if (!next) continue;
        struck.add(next.object);
        this.addArc(origin.x, origin.y, next.object.x, next.object.y);
        this.strike(next, this.stats.damage);
      }
    }
    this.scene.sfx.teslaArc();
  }

  // Enemies, the Sentinel and enemy bullets within range, nearest first.
  targetsInRange(x, y, range, { bullets = true } = {}) {
    const scene = this.scene;
    const found = [];
    const consider = (object, kind, reach) => {
      const d = Math.hypot(object.x - x, object.y - y);
      if (d <= range + reach) found.push({ object, kind, d });
    };
    for (const enemy of scene.enemies.getChildren()) {
      if (enemy.active) consider(enemy, 'enemy', enemy.config.hitbox / 2);
    }
    if (scene.bosses.active) consider(scene.bosses.boss, 'boss', BOSS_REACH);
    if (bullets) {
      for (const bullet of scene.enemyBullets.getChildren()) {
        if (bullet.active) consider(bullet, 'bullet', 0);
      }
    }
    return found.sort((a, b) => a.d - b.d);
  }

  strike({ object, kind }, damage) {
    if (kind === 'bullet') this.scene.destroyEnemyBullet(object);
    else if (kind === 'boss') this.scene.bosses.hitBoss(damage);
    else this.scene.damageEnemy(object, damage, 'secondary');
  }

  // --- Repulsor Field -------------------------------------------------------

  updateField(dt, alive) {
    const g = this.fieldGfx;
    g.clear();
    if (!alive) return;
    const { x, y } = this.scene.player;
    const { radius, cooldown } = this.stats;
    this.clock += dt;

    this.tickTimer += dt;
    if (this.tickTimer >= this.stats.tickInterval) {
      this.tickTimer -= this.stats.tickInterval;
      for (const target of this.targetsInRange(x, y, radius, { bullets: false })) {
        this.strike(target, this.stats.tickDamage);
      }
    }

    this.timer = Math.min(this.timer + dt, cooldown);
    const ready = this.timer >= cooldown;
    if (ready) {
      const inside = this.scene.enemyBullets.getChildren().filter(
        (b) => b.active && (b.x - x) ** 2 + (b.y - y) ** 2 <= radius * radius,
      );
      if (inside.length > 0) {
        this.timer = 0;
        for (const bullet of inside) this.scene.deflectBullet(bullet, this.stats.deflectDamage);
        this.scene.flash(x, y, this.def.color, (radius * 2.4) / 64, 260);
        this.scene.sfx.deflect();
      }
    }

    const shimmer = Math.abs(Math.sin(this.clock * 3));
    g.fillStyle(this.def.color, ready ? 0.1 : 0.05);
    g.fillCircle(x, y, radius);
    g.lineStyle(1, this.def.color, (ready ? 0.55 : 0.2) + 0.2 * shimmer);
    g.strokeCircle(x, y, radius);
    if (this.stats.bulletSpeedFactor < 1) {
      g.lineStyle(1, this.def.color, 0.18 + 0.12 * (1 - shimmer));
      g.strokeCircle(x, y, radius - 6);
    }
  }

  // --- Effects --------------------------------------------------------------

  addLine(x1, y1, x2, y2, color, width) {
    this.zaps.push({ points: [x1, y1, x2, y2], color, width, ttl: ZAP_SECONDS });
  }

  addArc(x1, y1, x2, y2) {
    const length = Math.hypot(x2 - x1, y2 - y1);
    const segments = Math.max(3, Math.floor(length / ARC_SEGMENT));
    const nx = -(y2 - y1) / (length || 1);
    const ny = (x2 - x1) / (length || 1);
    const points = [x1, y1];
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const jitter = Phaser.Math.FloatBetween(-ARC_JITTER, ARC_JITTER);
      points.push(x1 + (x2 - x1) * t + nx * jitter, y1 + (y2 - y1) * t + ny * jitter);
    }
    points.push(x2, y2);
    this.zaps.push({ points, color: this.def.color, width: 2, ttl: ZAP_SECONDS });
  }

  drawZaps(dt) {
    const g = this.fx;
    g.clear();
    this.zaps = this.zaps.filter((zap) => (zap.ttl -= dt) > 0);
    for (const zap of this.zaps) {
      const alpha = zap.ttl / ZAP_SECONDS;
      g.lineStyle(zap.width, zap.color, alpha);
      g.beginPath();
      g.moveTo(zap.points[0], zap.points[1]);
      for (let i = 2; i < zap.points.length; i += 2) g.lineTo(zap.points[i], zap.points[i + 1]);
      g.strokePath();
      g.lineStyle(1, 0xffffff, alpha * 0.8);
      g.strokePath();
    }
  }
}
