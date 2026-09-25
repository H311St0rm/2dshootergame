import { DIFFICULTY, ENEMY_TYPES } from '../config/constants.js';

const ENEMY_LIST = Object.values(ENEMY_TYPES);

export default class DifficultyManager {
  constructor() {
    this.elapsed = 0;
    this.bossBonusLevel = 0;
    this.smoothedWeaponLevel = 0;
  }

  update(dt) {
    this.elapsed += dt;
  }

  get timeLevel() {
    return Math.floor(this.elapsed / DIFFICULTY.secondsPerTimeLevel);
  }

  // Drives enemy speed, bullet speed and fire frequency. Deliberately ignores weapon level.
  get effectiveLevel() {
    return this.timeLevel + this.bossBonusLevel;
  }

  get multiplier() {
    return 1 + this.effectiveLevel * DIFFICULTY.multiplierPerLevel;
  }

  get spawnInterval() {
    const { spawnIntervalBase, spawnIntervalStep, spawnIntervalFloor } = DIFFICULTY;
    return Math.max(spawnIntervalFloor, spawnIntervalBase - this.effectiveLevel * spawnIntervalStep);
  }

  addBossDefeat() {
    this.bossBonusLevel += DIFFICULTY.bossBonusPerDefeat;
  }

  // Called once per spawn wave: moves at most one level toward the real weapon level.
  stepSmoothedWeaponLevel(weaponLevel) {
    if (weaponLevel > this.smoothedWeaponLevel) this.smoothedWeaponLevel++;
    else if (weaponLevel < this.smoothedWeaponLevel) this.smoothedWeaponLevel--;
  }

  get batchSize() {
    return 1 + Math.floor(this.smoothedWeaponLevel / DIFFICULTY.levelsPerExtraEnemy);
  }

  unlockedEnemyTypes() {
    return ENEMY_LIST.filter((type) => this.elapsed >= type.unlockAt);
  }
}
