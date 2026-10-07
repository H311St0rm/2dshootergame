import { TRACTOR, DEPTH } from '../config/constants.js';

// Tractor Beam refit (§19): locks onto the nearest pickup within range and reels it in, one at
// a time. The lock holds until that pickup is collected, however far the ship flies, and the
// pull keeps accelerating it straight at the ship, harder with each rank.
export default class TractorBeam {
  constructor(scene, rank) {
    this.scene = scene;
    this.acceleration = rank > 0 ? TRACTOR.accelerations[rank - 1] : 0;
    this.target = null;
    this.targetSpawnId = 0;
    this.speed = 0;
    this.clock = 0;
    this.gfx = scene.add.graphics().setDepth(DEPTH.tractor);
  }

  update(dt) {
    this.gfx.clear();
    const player = this.scene.player;
    if (!this.acceleration || !player.alive) {
      this.target = null;
      return;
    }
    // Pickups are pooled, so a collected target can come straight back as a new drop elsewhere.
    if (this.target && (!this.target.active || this.target.spawnId !== this.targetSpawnId)) this.target = null;
    if (!this.target) this.acquire(player);
    const target = this.target;
    if (!target) return;

    const dx = player.x - target.x;
    const dy = player.y - target.y;
    const distance = Math.hypot(dx, dy) || 1;
    this.speed = Math.min(TRACTOR.maxSpeed, this.speed + this.acceleration * dt);
    target.setVelocity((dx / distance) * this.speed, (dy / distance) * this.speed);
    this.clock += dt;
    this.draw(player, target, distance);
  }

  acquire(player) {
    let best = null;
    let bestDistance = TRACTOR.range ** 2;
    for (const pickup of this.scene.pickups.getChildren()) {
      if (!pickup.active) continue;
      const distance = (pickup.x - player.x) ** 2 + (pickup.y - player.y) ** 2;
      if (distance <= bestDistance) {
        bestDistance = distance;
        best = pickup;
      }
    }
    if (!best) return;
    this.target = best;
    this.targetSpawnId = best.spawnId;
    // The pull starts from the pickup's fall speed rather than stopping it dead.
    this.speed = Math.hypot(best.body.velocity.x, best.body.velocity.y);
    this.scene.sfx.tractorLock();
  }

  // A tapered, pulsing beam from the ship to its target, with a ring around the target.
  draw(player, target, distance) {
    const g = this.gfx;
    const nx = -(target.y - player.y) / distance;
    const ny = (target.x - player.x) / distance;
    const near = TRACTOR.beamWidthAtShip / 2;
    const far = TRACTOR.beamWidthAtTarget / 2;
    const pulse = 0.75 + 0.25 * Math.sin(this.clock * 10);
    g.fillStyle(TRACTOR.color, 0.18 * pulse);
    g.fillPoints([
      { x: player.x + nx * near, y: player.y + ny * near },
      { x: target.x + nx * far, y: target.y + ny * far },
      { x: target.x - nx * far, y: target.y - ny * far },
      { x: player.x - nx * near, y: player.y - ny * near },
    ], true);
    g.lineStyle(1, TRACTOR.color, 0.6 * pulse);
    g.lineBetween(player.x, player.y, target.x, target.y);
    g.strokeCircle(target.x, target.y, TRACTOR.targetRingRadius);
  }
}
