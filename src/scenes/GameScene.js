import {
  PLAYER, PLAYER_BULLET, DROPS, ABILITIES, ABILITY_KEYS, BOSS, SCORING, EXPLOSION, TIMING,
  DEPTH, MAX_FRAME_DT,
} from '../config/constants.js';
import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import PlayerBullet from '../entities/PlayerBullet.js';
import EnemyBullet from '../entities/EnemyBullet.js';
import Pickup from '../entities/Pickup.js';
import WeaponManager from '../systems/WeaponManager.js';
import AbilityManager from '../systems/AbilityManager.js';
import DifficultyManager from '../systems/DifficultyManager.js';
import SpawnManager from '../systems/SpawnManager.js';
import BossManager from '../systems/BossManager.js';
import Starfield from '../systems/Starfield.js';
import Sfx from '../systems/Sfx.js';
import { loadHighScore, saveHighScore } from '../systems/highScore.js';
import Hud from '../ui/Hud.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.starfield = new Starfield(this);
    this.sfx = new Sfx(this);

    this.playerBullets = this.physics.add.group({ classType: PlayerBullet });
    this.enemyBullets = this.physics.add.group({ classType: EnemyBullet });
    this.enemies = this.physics.add.group({ classType: Enemy });
    this.pickups = this.physics.add.group({ classType: Pickup });

    this.player = new Player(this, PLAYER.startX, PLAYER.startY);
    this.shieldRing = this.add.image(PLAYER.startX, PLAYER.startY, 'shield_ring')
      .setDepth(DEPTH.shield)
      .setVisible(false);

    this.weapon = new WeaponManager();
    this.abilities = new AbilityManager();
    this.difficulty = new DifficultyManager();
    this.spawner = new SpawnManager(this.difficulty, (type, x) => this.spawnEnemy(type, x));
    this.bosses = new BossManager(this);
    this.hud = new Hud(this);
    this.emitters = new Map();

    this.score = 0;
    this.survivalTimer = 0;
    this.isGameOver = false;
    this.bestScore = loadHighScore();

    this.enemyFire = (enemy) => this.fireEnemyPattern(enemy);
    this.firePlayer = (pattern) => this.firePlayerVolley(pattern);

    this.keys = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D');
    this.input.keyboard.addCapture('SPACE');
    // Discrete actions use keydown events rather than JustDown polling, which
    // loses taps whose keyup lands in the same frame as the keydown.
    this.input.keyboard.on('keydown-SPACE', (event) => {
      if (!event.repeat && !this.isGameOver) this.activateAbility();
    });
    const onPauseKey = (event) => {
      if (!event.repeat && !this.isGameOver) this.pauseGame();
    };
    this.input.keyboard.on('keydown-P', onPauseKey);
    this.input.keyboard.on('keydown-ESC', onPauseKey);

    this.setupCollisions();
  }

  // Phaser swaps callback argument order for group-vs-sprite overlaps, so every
  // handler resolves which object is which instead of trusting the order.
  setupCollisions() {
    const physics = this.physics;
    const boss = this.bosses.boss;
    const other = (a, b, known) => (a === known ? b : a);

    physics.add.overlap(this.playerBullets, this.enemies, (a, b) => {
      const bullet = a instanceof PlayerBullet ? a : b;
      this.onBulletHitEnemy(bullet, bullet === a ? b : a);
    });
    physics.add.overlap(this.player, this.enemies, (a, b) => this.onPlayerRam(other(a, b, this.player)));
    physics.add.overlap(this.player, this.enemyBullets, (a, b) => this.onPlayerShot(other(a, b, this.player)));
    physics.add.overlap(this.player, this.pickups, (a, b) => this.onPickup(other(a, b, this.player)));
    physics.add.overlap(boss, this.playerBullets, (a, b) => this.onBulletHitBoss(other(a, b, boss)));
    physics.add.overlap(this.player, boss, () => this.onPlayerTouchBoss());
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, MAX_FRAME_DT);
    this.starfield.update(dt);

    if (!this.isGameOver) {
      this.updatePlayerMovement(dt);
      this.difficulty.update(dt);
      this.updateSurvivalScore(dt);
      this.weapon.update(dt, this.abilities, this.firePlayer);
      this.spawner.update(dt, this.weapon.level);
    }

    this.abilities.update(dt);
    const slow = this.abilities.slowFactor;
    const multiplier = this.difficulty.multiplier;
    this.bosses.update(dt, slow);

    for (const enemy of this.enemies.getChildren()) {
      if (enemy.active) enemy.tick(dt, slow, multiplier, this.enemyFire);
    }
    for (const bullet of this.enemyBullets.getChildren()) {
      if (bullet.active) bullet.tick(slow);
    }
    for (const bullet of this.playerBullets.getChildren()) {
      if (bullet.active) bullet.tick();
    }
    for (const pickup of this.pickups.getChildren()) {
      if (pickup.active) pickup.tick(dt);
    }

    const shielded = this.abilities.isActive('shield');
    this.player.tick(dt, shielded);
    this.updateShieldRing(shielded);
    this.hud.update(dt, this.hudState());
  }

  updatePlayerMovement(dt) {
    const k = this.keys;
    const dirX = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
    const dirY = (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.W.isDown ? 1 : 0);
    this.player.move(dirX, dirY, dt);
  }

  updateSurvivalScore(dt) {
    this.survivalTimer += dt;
    while (this.survivalTimer >= SCORING.survivalPointInterval) {
      this.survivalTimer -= SCORING.survivalPointInterval;
      this.addScore(SCORING.survivalPointValue);
    }
  }

  updateShieldRing(shielded) {
    const visible = shielded && this.player.alive;
    this.shieldRing.setVisible(visible);
    if (!visible) return;
    const remaining = this.abilities.remaining('shield');
    const pulseSpeed = remaining < 1 ? 30 : 10;
    this.shieldRing.setPosition(this.player.x, this.player.y);
    this.shieldRing.setAlpha(0.55 + 0.45 * Math.abs(Math.sin(this.hud.clock * pulseSpeed)));
  }

  hudState() {
    const boss = this.bosses.boss;
    return {
      level: this.weapon.level,
      min: this.weapon.min,
      max: this.weapon.max,
      atMax: this.weapon.isAtMax,
      score: this.score,
      best: this.bestScore,
      elapsed: this.difficulty.elapsed,
      streak: this.bosses.streak,
      bossActive: this.bosses.active,
      bossHp: boss.hp,
      bossMaxHp: boss.maxHp,
      held: this.abilities.held,
      abilities: this.abilities,
    };
  }

  pauseGame() {
    this.scene.launch('PauseScene');
    this.scene.pause();
  }

  // --- Spawning & firing -------------------------------------------------

  spawnEnemy(type, x) {
    this.enemies.get(x, 0).spawn(type, x);
  }

  spawnEnemyBullet(x, y, vx, vy, texture) {
    this.enemyBullets.get(x, y).fire(x, y, vx, vy, texture);
  }

  spawnPickup(kind, x, y) {
    this.pickups.get(x, y).spawn(kind, x, y);
  }

  firePlayerVolley(pattern) {
    const x = this.player.x;
    const y = this.player.y - PLAYER_BULLET.noseOffsetY;
    for (const angle of pattern.angles) {
      this.playerBullets.get(x, y).fire(x, y, angle, pattern.damage);
    }
    this.sfx.shoot();
  }

  fireEnemyPattern(enemy) {
    const fire = enemy.config.fire;
    const speed = fire.bulletSpeed * this.difficulty.multiplier;
    const x = enemy.x;
    const y = enemy.y + enemy.config.size / 2;
    if (fire.pattern === 'aimed') {
      const angle = Math.atan2(this.player.y - y, this.player.x - x);
      this.spawnEnemyBullet(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, fire.bulletTexture);
    } else if (fire.pattern === 'down') {
      this.spawnEnemyBullet(x, y, 0, speed, fire.bulletTexture);
    } else {
      for (const deg of fire.angles) {
        const a = Phaser.Math.DegToRad(deg);
        this.spawnEnemyBullet(x, y, Math.sin(a) * speed, Math.cos(a) * speed, fire.bulletTexture);
      }
    }
  }

  fireBossFan(x, y) {
    const { count, spreadDeg, bulletSpeed } = BOSS.fan;
    for (let i = 0; i < count; i++) {
      const a = Phaser.Math.DegToRad(-spreadDeg + (2 * spreadDeg * i) / (count - 1));
      this.spawnEnemyBullet(x, y, Math.sin(a) * bulletSpeed, Math.cos(a) * bulletSpeed, BOSS.bulletTexture);
    }
  }

  fireBossAimed(x, y) {
    const speed = BOSS.burst.bulletSpeed;
    const angle = Math.atan2(this.player.y - y, this.player.x - x);
    this.spawnEnemyBullet(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, BOSS.bulletTexture);
  }

  // --- Collisions ---------------------------------------------------------

  onBulletHitEnemy(bullet, enemy) {
    if (!bullet.active || !enemy.active) return;
    bullet.disableBody(true, true);
    if (enemy.damage(bullet.damage)) this.killEnemy(enemy, 'bullet');
  }

  onPlayerRam(enemy) {
    if (!enemy.active || !this.player.alive) return;
    // The hit resolves first so a ram can never count toward a flawless streak.
    this.hitPlayer();
    this.killEnemy(enemy, 'ram');
  }

  onPlayerShot(bullet) {
    if (!bullet.active || !this.player.alive) return;
    bullet.disableBody(true, true);
    this.hitPlayer();
  }

  onPickup(pickup) {
    if (!pickup.active || !this.player.alive) return;
    pickup.disableBody(true, true);
    if (pickup.kind === 'upgrade') this.collectUpgrade(pickup.x, pickup.y);
    else this.collectAbility(pickup.kind, pickup.x, pickup.y);
  }

  onBulletHitBoss(bullet) {
    if (!bullet.active || !this.bosses.active || this.isGameOver) return;
    bullet.disableBody(true, true);
    this.bosses.hitBoss(bullet.damage);
  }

  onPlayerTouchBoss() {
    if (this.player.alive && this.bosses.active) this.hitPlayer();
  }

  // --- Damage, kills, drops ----------------------------------------------

  hitPlayer() {
    if (!this.player.alive) return;
    if (this.abilities.isActive('shield')) return;
    if (this.player.isInvulnerable) return;

    const lost = this.weapon.takeHit();
    this.bosses.registerUnblockedHit();
    if (lost < 0) {
      this.playerDies();
      return;
    }
    this.player.startInvulnerability();
    this.cameras.main.shake(120, 0.006);
    this.sfx.playerHit();
    this.hud.floatText(this.player.x, this.player.y - 22, `-${lost} LVL`, '#ff6060');
  }

  killEnemy(enemy, cause) {
    const { x, y } = enemy;
    const config = enemy.config;
    enemy.disableBody(true, true);
    this.explode(x, y, config.color);
    this.sfx.explode();
    if (cause !== 'ram') {
      this.addScore(config.score);
      this.rollDrops(x, y);
    }
    this.bosses.registerKill(this.weapon.isAtMax);
  }

  rollDrops(x, y) {
    if (this.isGameOver) return;
    const upgrade = Math.random() < DROPS.upgradeChance;
    const ability = Math.random() < DROPS.abilityChance;
    const offset = upgrade && ability ? DROPS.doubleDropOffsetX : 0;
    if (upgrade) this.spawnPickup('upgrade', x - offset, y);
    if (ability) this.spawnPickup(Phaser.Utils.Array.GetRandom(ABILITY_KEYS), x + offset, y);
  }

  addScore(points) {
    if (!this.isGameOver) this.score += points;
  }

  collectUpgrade(x, y) {
    if (this.weapon.addLevel()) {
      this.sfx.levelUp();
      this.hud.floatText(x, y - 14, this.weapon.isAtMax ? 'MAX LVL!' : '+1 LVL', '#ffd700');
    } else {
      this.hud.floatText(x, y - 14, 'MAX', '#ffd700');
    }
  }

  collectAbility(kind, x, y) {
    this.abilities.collect(kind);
    this.sfx.abilityCollect();
    this.hud.floatText(x, y - 14, ABILITIES[kind].name, `#${ABILITIES[kind].color.toString(16).padStart(6, '0')}`);
  }

  activateAbility() {
    const kind = this.abilities.activate();
    if (!kind) return;
    this.sfx.abilityActivate();
    if (kind === 'nova') this.detonateNova();
  }

  detonateNova() {
    const { x, y } = this.player;
    this.flash(x, y, ABILITIES.nova.color, 16, 500);
    this.cameras.main.shake(250, 0.01);
    this.sfx.nova();
    // Regular enemies only — the Sentinel is immune — but every enemy bullet is cleared.
    for (const enemy of [...this.enemies.getChildren()]) {
      if (enemy.active) this.killEnemy(enemy, 'nova');
    }
    this.clearEnemyBullets();
  }

  clearEnemyBullets() {
    for (const bullet of this.enemyBullets.getChildren()) {
      if (bullet.active) bullet.disableBody(true, true);
    }
  }

  clearRegularEnemies() {
    for (const enemy of this.enemies.getChildren()) {
      if (!enemy.active) continue;
      this.explode(enemy.x, enemy.y, enemy.config.color, 4);
      enemy.disableBody(true, true);
    }
    this.clearEnemyBullets();
  }

  playerDies() {
    this.isGameOver = true;
    const { x, y } = this.player;
    this.player.kill();
    this.shieldRing.setVisible(false);
    this.explode(x, y, PLAYER.color, 24);
    this.explode(x, y, 0xffffff, 12);
    this.flash(x, y, PLAYER.color, 4, 500);
    this.cameras.main.shake(300, 0.012);
    this.sfx.bigExplosion();
    this.spawner.pause();

    const isNewBest = this.score > this.bestScore;
    if (isNewBest) saveHighScore(this.score);
    const result = {
      score: this.score,
      best: Math.max(this.score, this.bestScore),
      isNewBest,
      peakLevel: this.weapon.peakLevel,
      survived: this.difficulty.elapsed,
      bossesDefeated: this.bosses.defeated,
    };
    this.time.delayedCall(TIMING.deathToGameOverMs, () => this.scene.start('GameOverScene', result));
  }

  // --- Boss events --------------------------------------------------------

  onBossFightStarted() {
    this.hud.banner('WARNING', `${BOSS.name} APPROACHES`, '#ff5050', 2200);
    this.sfx.bossWarning();
  }

  onBossDefeated({ index, flawless, x, y }) {
    this.bossExplosion(x, y);
    const bonus = BOSS.scorePerIndex * index;
    this.addScore(bonus);
    this.difficulty.addBossDefeat();
    this.spawnPickup(Phaser.Utils.Array.GetRandom(ABILITY_KEYS), x, y);

    if (flawless && this.weapon.isAtMax && !this.isGameOver) {
      this.weapon.prestige(BOSS.prestigeShift);
      this.sfx.prestige();
      this.hud.banner('PRESTIGE!', `FLOOR ${this.weapon.min}  ·  CEILING ${this.weapon.max}`, '#ffd700', 2600);
    } else {
      this.hud.banner('SENTINEL DOWN', `+${bonus}  ·  THE THREAT GROWS`, '#ff8a7a', 2200);
    }
    if (!this.isGameOver) this.spawner.resume();
  }

  // --- Effects ------------------------------------------------------------

  explode(x, y, color, count = Phaser.Math.Between(EXPLOSION.minParticles, EXPLOSION.maxParticles)) {
    let emitter = this.emitters.get(color);
    if (!emitter) {
      emitter = this.add.particles(0, 0, 'particle', {
        speed: { min: EXPLOSION.speedMin, max: EXPLOSION.speedMax },
        angle: { min: 0, max: 360 },
        lifespan: EXPLOSION.lifespan,
        alpha: { start: 1, end: 0 },
        scale: { start: 1, end: 0.5 },
        tint: color,
        emitting: false,
      }).setDepth(DEPTH.particles);
      this.emitters.set(color, emitter);
    }
    emitter.explode(count, x, y);
  }

  flash(x, y, color, scaleTo, durationMs) {
    const image = this.add.image(x, y, 'flash')
      .setTint(color)
      .setDepth(DEPTH.flash)
      .setAlpha(0.85)
      .setScale(0.2);
    this.tweens.add({
      targets: image,
      scale: scaleTo,
      alpha: 0,
      duration: durationMs,
      ease: 'Cubic.easeOut',
      onComplete: () => image.destroy(),
    });
  }

  bossExplosion(x, y) {
    this.flash(x, y, 0xffffff, 8, 700);
    this.cameras.main.shake(500, 0.015);
    this.sfx.bigExplosion();
    for (let i = 0; i < EXPLOSION.bossBursts; i++) {
      this.time.delayedCall(i * EXPLOSION.bossBurstInterval, () => {
        const bx = x + Phaser.Math.Between(-28, 28);
        const by = y + Phaser.Math.Between(-28, 28);
        this.explode(bx, by, BOSS.color, EXPLOSION.bossBurstParticles);
        this.explode(bx, by, 0xffe14d, EXPLOSION.bossBurstParticles / 2);
      });
    }
  }
}
