import { BOSS } from '../config/constants.js';
import Boss from '../entities/Boss.js';

export default class BossManager {
  constructor(scene) {
    this.scene = scene;
    this.boss = new Boss(scene);
    this.streak = 0;
    this.totalKills = 0;
    this.bossIndex = 1;
    this.defeated = 0;
    this.active = false;
    this.pendingTrigger = false;
    this.tookHitThisFight = false;
    this.fireFan = (x, y) => scene.fireBossFan(x, y);
    this.fireAimed = (x, y) => scene.fireBossAimed(x, y);
  }

  registerKill(atMax) {
    if (this.active || this.pendingTrigger) return;
    if (atMax) this.streak++;
    this.totalKills++;
    if (this.streak >= BOSS.streakTarget || this.totalKills >= BOSS.fallbackKills) {
      this.pendingTrigger = true;
    }
  }

  // Shield-blocked hits never reach here, so they keep the streak and a flawless fight intact.
  registerUnblockedHit() {
    this.streak = 0;
    if (this.active) this.tookHitThisFight = true;
  }

  update(dt, slow) {
    if (this.pendingTrigger && !this.scene.isGameOver) this.startFight();
    if (this.active) this.boss.tick(dt, slow, this.fireFan, this.fireAimed);
  }

  startFight() {
    this.pendingTrigger = false;
    this.active = true;
    this.streak = 0;
    this.totalKills = 0;
    this.tookHitThisFight = false;
    this.scene.clearRegularEnemies();
    this.scene.spawner.pause();
    this.boss.spawn(BOSS.baseHp + BOSS.hpPerIndex * (this.bossIndex - 1));
    this.scene.onBossFightStarted();
  }

  hitBoss(damage) {
    if (!this.active) return;
    if (this.boss.damage(damage)) this.finishFight();
  }

  finishFight() {
    const result = {
      index: this.bossIndex,
      flawless: !this.tookHitThisFight,
      x: this.boss.x,
      y: this.boss.y,
    };
    this.boss.despawn();
    this.active = false;
    this.bossIndex++;
    this.defeated++;
    this.scene.onBossDefeated(result);
  }
}
