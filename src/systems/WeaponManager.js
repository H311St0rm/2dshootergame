import { WEAPON, WEAPONS, ABILITIES } from '../config/constants.js';

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

function fan(count, halfAngle) {
  if (count === 1) return [{ offsetX: 0, angle: 0 }];
  return Array.from({ length: count }, (_, i) => ({
    offsetX: 0,
    angle: -halfAngle + (2 * halfAngle * i) / (count - 1),
  }));
}

// Each weapon turns the level's stats into a volley: an interval, a per-shot
// damage, and a list of shots (horizontal offset from the nose plus angle).
const SHAPERS = {
  blaster: (w, s) => ({
    interval: s.interval,
    damage: s.damage,
    shots: s.angles.map((angle) => ({ offsetX: 0, angle })),
  }),
  lance: (w, s) => {
    const n = s.angles.length;
    return {
      interval: s.interval,
      damage: s.damage,
      shots: Array.from({ length: n }, (_, i) => ({ offsetX: (i - (n - 1) / 2) * w.laneSpacing, angle: 0 })),
    };
  },
  scatter: (w, s) => ({
    interval: s.interval * w.intervalScale,
    damage: Math.max(1, Math.round(s.damage * w.damageScale)),
    shots: fan(s.angles.length * 2 + 1, w.coneBaseDeg + w.coneDegPerShot * s.angles.length),
  }),
  seeker: (w, s) => {
    const n = Math.ceil(s.angles.length / 2);
    return {
      interval: s.interval * w.intervalScale,
      damage: s.damage * w.damageScale,
      shots: fan(n, n > 1 ? w.launchSpreadDeg : 0),
    };
  },
};

// Abilities modify the level's stats before the weapon reshapes them, so Rapid
// Fire and Spread Shot help every weapon by the same proportion and never downgrade it.
export function buildVolley(weaponId, level, rapid, spread) {
  const stats = weaponStats(level);
  let angles = stats.angles;
  if (spread && angles.length < ABILITIES.spread.angles.length) angles = ABILITIES.spread.angles;
  const interval = rapid ? Math.min(stats.interval, ABILITIES.rapid.interval) : stats.interval;
  return SHAPERS[weaponId](WEAPONS[weaponId], { interval, damage: stats.damage, angles });
}

export default class WeaponManager {
  constructor(weaponId, startLevel) {
    this.weaponId = weaponId;
    this.level = startLevel;
    this.min = WEAPON.startMin;
    this.max = WEAPON.startMax;
    this.peakLevel = startLevel;
    this.fireTimer = 0;
    this.volleys = new Map();
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

  volley(abilities) {
    const rapid = abilities.isActive('rapid');
    const spread = abilities.isActive('spread');
    const key = this.level * 4 + (rapid ? 1 : 0) + (spread ? 2 : 0);
    let volley = this.volleys.get(key);
    if (!volley) {
      volley = buildVolley(this.weaponId, this.level, rapid, spread);
      this.volleys.set(key, volley);
    }
    return volley;
  }

  update(dt, abilities, fire) {
    const volley = this.volley(abilities);
    this.fireTimer += dt;
    if (this.fireTimer >= volley.interval) {
      this.fireTimer = Math.min(this.fireTimer - volley.interval, volley.interval);
      fire(volley);
    }
  }
}
