export const TITLE = 'STELLAR DODGE';
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 800;
export const BG_COLOR = '#05060a';
export const FONT = '"Courier New", Courier, monospace';
export const HIGH_SCORE_KEY = 'stellarDodge_highScore';
export const MAX_FRAME_DT = 0.1;

export const DEPTH = {
  stars: 0,
  pickups: 5,
  enemies: 10,
  playerBullets: 15,
  enemyBullets: 20,
  player: 25,
  shield: 26,
  particles: 30,
  flash: 40,
  hud: 100,
  overlay: 200,
};

export const STARFIELD = {
  layers: [
    { count: 60, speed: 20, size: 1, alpha: 0.45 },
    { count: 26, speed: 50, size: 2, alpha: 0.9 },
  ],
};

export const PLAYER = {
  startX: 240,
  startY: 680,
  speed: 260,
  bounds: { minX: 20, maxX: 460, minY: 30, maxY: 770 },
  hitboxSize: 16,
  hitInvulnSeconds: 0.4,
  flickerInterval: 0.1,
  flickerAlpha: 0.3,
  color: 0x4de3ff,
};

export const PLAYER_BULLET = {
  speed: 480,
  noseOffsetY: 12,
};

const A1 = [0];
const A2 = [-8, 8];
const A3 = [-15, 0, 15];
const A5 = [-25, -12, 0, 12, 25];
const A7 = [-35, -22, -10, 0, 10, 22, 35];

export const WEAPON = {
  startLevel: 0,
  startMin: 0,
  startMax: 10,
  hitLevelLoss: 3,
  table: [
    { interval: 0.35, damage: 1, angles: A1 },
    { interval: 0.33, damage: 1, angles: A1 },
    { interval: 0.31, damage: 2, angles: A1 },
    { interval: 0.29, damage: 2, angles: A2 },
    { interval: 0.27, damage: 3, angles: A2 },
    { interval: 0.25, damage: 3, angles: A2 },
    { interval: 0.23, damage: 4, angles: A3 },
    { interval: 0.21, damage: 4, angles: A3 },
    { interval: 0.19, damage: 5, angles: A3 },
    { interval: 0.17, damage: 5, angles: A5 },
    { interval: 0.15, damage: 6, angles: A5 },
    { interval: 0.13, damage: 6, angles: A5 },
    { interval: 0.11, damage: 7, angles: A7 },
    { interval: 0.09, damage: 7, angles: A7 },
    { interval: 0.07, damage: 8, angles: A7 },
    { interval: 0.05, damage: 8, angles: A7 },
  ],
  // Beyond the table (only reachable through repeated prestige).
  extrapolation: {
    baseInterval: 0.35,
    intervalStep: 0.02,
    intervalFloor: 0.05,
    levelsPerDamage: 2,
    tierStartLevel: 12,
    tierBaseBullets: 7,
    levelsPerTier: 4,
    bulletsPerTier: 2,
    maxBullets: 15,
    baseSpreadDeg: 35,
    spreadDegPerTier: 5,
    maxSpreadDeg: 60,
  },
};

export const DROPS = {
  upgradeChance: 0.05,
  abilityChance: 0.03,
  fallSpeed: 60,
  doubleDropOffsetX: 9,
  despawnMargin: 20,
};

export const ABILITY_KEYS = ['shield', 'nova', 'rapid', 'spread', 'overdrive'];

export const ABILITIES = {
  shield: { name: 'SHIELD', color: 0x4de3ff, duration: 4 },
  nova: { name: 'NOVA BOMB', color: 0xffb04d, duration: 0 },
  rapid: { name: 'RAPID FIRE', color: 0xfff34d, duration: 5, interval: 0.12 },
  spread: { name: 'SPREAD SHOT', color: 0x4dff88, duration: 5, angles: [-15, 0, 15] },
  overdrive: { name: 'OVERDRIVE', color: 0xb34dff, duration: 4, slowFactor: 0.4 },
};

export const ENEMY_TYPES = {
  drone: {
    id: 'drone', texture: 'enemy_drone', size: 16, hp: 1, speed: 90, score: 10, unlockAt: 0,
    color: 0xff4d4d, move: 'straight', fire: null,
  },
  gunner: {
    id: 'gunner', texture: 'enemy_gunner', size: 18, hp: 2, speed: 70, score: 20, unlockAt: 15,
    color: 0xff9640, move: 'straight',
    fire: { pattern: 'aimed', interval: 1.8, bulletSpeed: 220, bulletTexture: 'ebullet_orange' },
  },
  weaver: {
    id: 'weaver', texture: 'enemy_weaver', size: 18, hp: 2, speed: 80, score: 25, unlockAt: 35,
    color: 0xb34dff, move: 'sine', sineAmplitude: 60, sinePeriod: 2,
    fire: { pattern: 'down', interval: 2.2, bulletSpeed: 200, bulletTexture: 'ebullet_purple' },
  },
  bulwark: {
    id: 'bulwark', texture: 'enemy_bulwark', size: 28, hp: 5, speed: 50, score: 50, unlockAt: 60,
    color: 0x3dbf5a, move: 'straight',
    fire: { pattern: 'spread', interval: 2.5, bulletSpeed: 200, angles: [-20, 0, 20], bulletTexture: 'ebullet_green' },
  },
};

export const ENEMY_SPAWN = {
  y: -20,
  minX: 24,
  maxX: 456,
  minSeparation: 40,
  separationAttempts: 12,
  despawnMargin: 40,
  hitboxScale: 0.85,
  hitFlashSeconds: 0.06,
};

export const ENEMY_BULLET = {
  hitboxSize: 4,
  cullMargin: 40,
};

export const DIFFICULTY = {
  secondsPerTimeLevel: 20,
  multiplierPerLevel: 0.05,
  spawnIntervalBase: 1.6,
  spawnIntervalStep: 0.12,
  spawnIntervalFloor: 0.45,
  bossBonusPerDefeat: 3,
  levelsPerExtraEnemy: 3,
};

export const BOSS = {
  name: 'THE SENTINEL',
  texture: 'boss_sentinel',
  color: 0xc23b3b,
  streakTarget: 100,
  fallbackKills: 500,
  entryY: -40,
  hoverY: 150,
  entrySpeed: 100,
  centerX: 240,
  sineAmplitude: 150,
  sinePeriod: 4,
  hitbox: { width: 52, height: 46 },
  muzzleOffsetY: 26,
  baseHp: 3000,
  hpPerIndex: 1500,
  scorePerIndex: 500,
  fan: { interval: 1.5, count: 7, spreadDeg: 60, bulletSpeed: 180 },
  burst: { interval: 4, count: 3, gap: 0.15, bulletSpeed: 260 },
  bulletTexture: 'ebullet_boss',
  prestigeShift: 5,
  hitFlashSeconds: 0.05,
};

export const SCORING = {
  survivalPointInterval: 0.5,
  survivalPointValue: 1,
};

export const EXPLOSION = {
  minParticles: 8,
  maxParticles: 12,
  lifespan: 400,
  speedMin: 40,
  speedMax: 160,
  bossBursts: 8,
  bossBurstParticles: 14,
  bossBurstInterval: 90,
};

export const TIMING = {
  deathToGameOverMs: 1200,
  gameOverInputDelayMs: 500,
};
