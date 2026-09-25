import { WEAPON, ABILITIES } from '../config/constants.js';

const extrapolated = new Map();

// Levels past the hand-authored table follow the §8b trend, with a soft bullet cap for performance.
function extrapolate(level) {
  const e = WEAPON.extrapolation;
  const interval = Math.max(e.intervalFloor, e.baseInterval - e.intervalStep * level);
  const damage = 1 + Math.floor(level / e.levelsPerDamage);
  const tier = Math.floor((level - e.tierStartLevel) / e.levelsPerTier);
  const count = Math.min(e.maxBullets, e.tierBaseBullets + e.bulletsPerTier * tier);
  const spread = Math.min(e.maxSpreadDeg, e.baseSpreadDeg + e.spreadDegPerTier * tier);
  const angles = Array.from({ length: count }, (_, i) => -spread + (2 * spread * i) / (count - 1));
  return { interval, damage, angles };
}

export function weaponStats(level) {
  if (level < WEAPON.table.length) return WEAPON.table[level];
  if (!extrapolated.has(level)) extrapolated.set(level, extrapolate(level));
  return extrapolated.get(level);
}

export default class WeaponManager {
  constructor() {
    this.level = WEAPON.startLevel;
    this.min = WEAPON.startMin;
    this.max = WEAPON.startMax;
    this.peakLevel = this.level;
    this.fireTimer = 0;
  }

  get isAtMax() {
    return this.level >= this.max;
  }

  get isAtMin() {
    return this.level <= this.min;
  }

  addLevel() {
    if (this.isAtMax) return false;
    this.level++;
    this.peakLevel = Math.max(this.peakLevel, this.level);
    return true;
  }

  // Returns the number of levels lost, or -1 when the hit is lethal.
  takeHit() {
    if (this.isAtMin) return -1;
    const before = this.level;
    this.level = Math.max(this.min, this.level - WEAPON.hitLevelLoss);
    return before - this.level;
  }

  prestige(shift) {
    this.min += shift;
    this.max += shift;
    this.level -= shift;
  }

  // Temporary abilities stack on the level's pattern but never make it worse.
  pattern(abilities) {
    const stats = weaponStats(this.level);
    let interval = stats.interval;
    let angles = stats.angles;
    if (abilities.isActive('rapid')) interval = Math.min(interval, ABILITIES.rapid.interval);
    if (abilities.isActive('spread') && angles.length < ABILITIES.spread.angles.length) {
      angles = ABILITIES.spread.angles;
    }
    return { interval, angles, damage: stats.damage };
  }

  update(dt, abilities, fire) {
    const pattern = this.pattern(abilities);
    this.fireTimer += dt;
    if (this.fireTimer >= pattern.interval) {
      this.fireTimer = Math.min(this.fireTimer - pattern.interval, pattern.interval);
      fire(pattern);
    }
  }
}
