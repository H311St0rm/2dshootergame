import { ENEMY_SPAWN } from '../config/constants.js';

export default class SpawnManager {
  constructor(difficulty, spawnEnemy) {
    this.difficulty = difficulty;
    this.spawnEnemy = spawnEnemy;
    this.timer = 0;
    this.paused = false;
  }

  update(dt, weaponLevel) {
    if (this.paused) return;
    this.timer += dt;
    const interval = this.difficulty.spawnInterval;
    if (this.timer >= interval) {
      this.timer = Math.min(this.timer - interval, interval);
      this.spawnWave(weaponLevel);
    }
  }

  spawnWave(weaponLevel) {
    this.difficulty.stepSmoothedWeaponLevel(weaponLevel);
    const count = this.difficulty.batchSize;
    const types = this.difficulty.unlockedEnemyTypes();
    const taken = [];
    for (let i = 0; i < count; i++) {
      const type = Phaser.Utils.Array.GetRandom(types);
      const x = this.pickX(type, taken);
      taken.push(x);
      this.spawnEnemy(type, x);
    }
  }

  // Keeps same-wave enemies apart when there is room; overlaps rather than skipping a spawn.
  pickX(type, taken) {
    const pad = type.move === 'sine' ? type.sineAmplitude : 0;
    const minX = ENEMY_SPAWN.minX + pad;
    const maxX = ENEMY_SPAWN.maxX - pad;
    for (let attempt = 0; attempt < ENEMY_SPAWN.separationAttempts; attempt++) {
      const x = Phaser.Math.FloatBetween(minX, maxX);
      if (taken.every((other) => Math.abs(other - x) >= ENEMY_SPAWN.minSeparation)) return x;
    }
    return Phaser.Math.FloatBetween(minX, maxX);
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.timer = 0;
  }
}
