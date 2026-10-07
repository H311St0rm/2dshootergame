export const TITLE = 'STELLAR DODGE';
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 800;
export const BG_COLOR = '#05060a';
export const FONT = '"Courier New", Courier, monospace';
export const PROFILE_KEY = 'stellarDodge_profile';
export const LEGACY_HIGH_SCORE_KEY = 'stellarDodge_highScore';
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
  noseOffsetY: 12,
  cullMargin: 20,
};

// Every weapon reads the same level table (§8b) and reshapes it. Hitboxes are
// deliberately ~25% wider than each projectile sprite, rounded up.
export const WEAPON_ORDER = ['blaster', 'lance', 'scatter', 'seeker'];

// Each weapon's `ultimate` (§19) is a 10,000-gold Hangar purchase once the weapon is owned;
// its fields switch on the matching projectile behavior in PlayerBullet.
export const WEAPONS = {
  blaster: {
    id: 'blaster', name: 'BLASTER', texture: 'player_bullet', hitbox: { width: 5, height: 10 }, speed: 480,
    blurb: 'A balanced fan of shots that widens as you level up.',
    ultimate: {
      name: 'RICOCHET', cost: 10000, bounces: 1,
      blurb: 'Shots bounce once off the left and right edges of the screen.',
    },
  },
  lance: {
    id: 'lance', name: 'LANCE', texture: 'bullet_lance', hitbox: { width: 3, height: 16 }, speed: 640,
    laneSpacing: 7, pierce: 1,
    blurb: 'Tight parallel beams. Each beam passes through one enemy and hits the next.',
    ultimate: {
      name: 'RAILGUN', cost: 10000, pierceAll: true, blastRadius: 26,
      blurb: 'Beams pierce every enemy, and detonate enemy bullets they touch along with any nearby.',
    },
  },
  scatter: {
    id: 'scatter', name: 'SCATTER', texture: 'bullet_pellet', hitbox: { width: 5, height: 5 }, speed: 520,
    range: 320, coneBaseDeg: 20, coneDegPerShot: 3, jitterDeg: 3, damageScale: 0.6, intervalScale: 1.4,
    blurb: 'A wide burst of short-range pellets. Brutal up close, useless far away.',
    ultimate: {
      name: 'FLAK', cost: 10000, shards: 3, shardSpreadDeg: 20, shardDamageScale: 0.5,
      blurb: 'Pellets that reach max range burst into 3 shards at half damage.',
    },
  },
  seeker: {
    id: 'seeker', name: 'SEEKER', texture: 'bullet_seeker', hitbox: { width: 5, height: 8 }, speed: 320,
    turnRate: 3, lifetime: 3, launchSpreadDeg: 25, damageScale: 2, intervalScale: 1.5,
    // Each missile added to a volley cuts every missile's damage by these steps, compounding;
    // past the last step, more missiles cost nothing.
    extraMissileDamageCuts: [0.2, 0.15, 0.1, 0.05],
    blurb: 'Slow homing missiles that hit twice as hard. Each extra missile per volley hits a little softer.',
    ultimate: {
      name: 'SWARM', cost: 10000, retargets: 1,
      blurb: 'A missile that kills its target hunts down one more, with a fresh 3s of flight.',
    },
  },
};

// The 3 shards a Flak pellet bursts into at the end of its range.
export const FLAK_SHARD = {
  id: 'shard', texture: 'bullet_shard', hitbox: { width: 3, height: 4 }, speed: 520, range: 120,
};
// Flak skips its burst while this many player shots are already live, to keep the frame rate steady.
export const MAX_SHOTS_FOR_FLAK = 400;

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
    id: 'drone', texture: 'enemy_drone', size: 16, hitbox: 16, hp: 1, speed: 90, gold: 10, unlockAt: 0,
    color: 0xff4d4d, move: 'straight', fire: null,
  },
  gunner: {
    id: 'gunner', texture: 'enemy_gunner', size: 18, hitbox: 17, hp: 2, speed: 70, gold: 20, unlockAt: 15,
    color: 0xff9640, move: 'straight',
    fire: { pattern: 'aimed', interval: 1.8, bulletSpeed: 220, bulletTexture: 'ebullet_orange' },
  },
  weaver: {
    id: 'weaver', texture: 'enemy_weaver', size: 18, hitbox: 17, hp: 2, speed: 80, gold: 25, unlockAt: 35,
    color: 0xb34dff, move: 'sine', sineAmplitude: 60, sinePeriod: 2,
    fire: { pattern: 'down', interval: 2.2, bulletSpeed: 200, bulletTexture: 'ebullet_purple' },
  },
  bulwark: {
    id: 'bulwark', texture: 'enemy_bulwark', size: 28, hitbox: 27, hp: 5, speed: 50, gold: 50, unlockAt: 60,
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
  hitbox: { width: 58, height: 51 },
  muzzleOffsetY: 26,
  baseHp: 3000,
  hpPerIndex: 1500,
  goldPerIndex: 500,
  fan: { interval: 1.5, count: 7, spreadDeg: 60, bulletSpeed: 180 },
  burst: { interval: 4, count: 3, gap: 0.15, bulletSpeed: 260 },
  bulletTexture: 'ebullet_boss',
  prestigeShift: 5,
  hitFlashSeconds: 0.05,
};

// Defensive secondary weapons (§20). One is equipped at a time; per-rank values
// are listed explicitly so each Hangar rank's effect is easy to read and tune.
export const SECONDARY_ORDER = ['drone', 'tesla', 'field'];

export const SECONDARIES = {
  drone: {
    id: 'drone', name: 'ESCORT DRONE', color: 0x7ff0ff,
    blurb: 'A drone flies beside you and shoots down the enemy bullet closest to you.',
    costs: [1500, 2500, 3500, 5000, 7000],
    cooldowns: [5, 4, 3, 2, 1],
    range: 260,
    offsetX: 26,
    offsetY: 6,
    followRate: 12,
    ultimate: {
      name: 'TWIN DRONES', cost: 10000,
      blurb: 'A second drone joins on your other side, half a cooldown behind the first.',
    },
  },
  tesla: {
    id: 'tesla', name: 'TESLA COIL', color: 0xbfe9ff,
    blurb: 'Arcs lightning into nearby enemies and bullets, nearest first.',
    costs: [2000, 3000, 4000, 5500, 7500, 10000],
    cooldowns: [2, 1.6, 1.25, 1, 0.75, 0.5],
    ranges: [60, 74, 88, 102, 116, 130],
    maxTargets: [3, 4, 5, 6, 7, 8],
    damage: 2,
    ultimate: {
      name: 'CHAIN LIGHTNING', cost: 10000, rangeBonus: 20, chainRange: 80,
      blurb: 'Every arc jumps once more to a target within 80px of the first, and range grows by 20px.',
    },
  },
  field: {
    id: 'field', name: 'REPULSOR FIELD', color: 0x4dffb0,
    blurb: 'Burns enemies inside it, and on cooldown hurls every bullet inside it back at them.',
    costs: [2000, 3000, 4000, 5500, 7500, 10000],
    deflectCooldowns: [8, 6.5, 5, 4, 3, 2],
    radii: [56, 60, 64, 68, 72, 76],
    tickInterval: 0.5,
    tickDamage: 1,
    deflectDamage: 3,
    ultimate: {
      name: 'STASIS FIELD', cost: 10000, bulletSpeedFactor: 0.25,
      blurb: 'Enemy bullets inside the field crawl at a quarter of their speed.',
    },
  },
};

// Weapon-upgrade pickups collected while already at max weapon level: each pays
// gold, and every `pickupsPerShrug` grants a one-hit damage shrug (the barrier ring).
export const MAX_LEVEL_PICKUP = {
  gold: 100,
  pickupsPerShrug: 5,
};

// Bullets thrown back by the Repulsor Field fly as player shots.
export const DEFLECT_SHOT = {
  id: 'deflect', name: 'DEFLECT', texture: 'bullet_deflect', hitbox: { width: 8, height: 6 }, speed: 360,
};

export const SURVIVAL_GOLD = {
  interval: 0.5,
  amount: 1,
};

export const BARRIER = {
  color: 0xffd700,
};

// Meta progression bought with banked gold between runs (§19).
export const HANGAR = {
  major: [
    {
      id: 'secondSlot', name: 'SECOND ABILITY SLOT', cost: 5000,
      blurb: 'Carry two abilities. SPACE fires them in the order you picked them up.',
    },
    {
      id: 'startBarrier', name: 'LAUNCH BARRIER', cost: 5000,
      blurb: 'Every run starts with a barrier that absorbs one hit.',
    },
    ...WEAPON_ORDER.map((id) => ({
      id: `weapon_${id}`,
      name: `WEAPON: ${WEAPONS[id].name}`,
      // The Blaster is free: its row exists only to sell its ultimate.
      cost: id === 'blaster' ? 0 : 5000,
      weapon: id,
      ultimate: WEAPONS[id].ultimate,
      blurb: WEAPONS[id].blurb,
    })),
  ],
  refits: [
    {
      id: 'thrusters', name: 'THRUSTERS', perRank: 0.04, costs: [300, 600, 900, 1200, 1500],
      blurb: '+4% movement speed per rank.',
    },
    {
      id: 'capacitors', name: 'CAPACITORS', perRank: 0.1, costs: [300, 600, 900, 1200, 1500],
      blurb: 'Timed abilities last 10% longer per rank.',
    },
    {
      id: 'salvage', name: 'SALVAGE SCANNER', perRank: 0.01, costs: [500, 1000, 2000],
      blurb: '+1% weapon-upgrade drop chance per rank (base 5%).',
    },
    {
      id: 'prospector', name: 'PROSPECTOR', perRank: 0.05, costs: [400, 800, 1200, 1600, 2000],
      blurb: '+5% gold from every source per rank.',
    },
    {
      id: 'headStart', name: 'HEAD START', perRank: 1, costs: [800, 1600, 3200],
      blurb: 'Start each run one weapon level higher per rank.',
    },
  ],
  secondaries: SECONDARY_ORDER.map((id) => ({
    id: `secondary_${id}`,
    name: SECONDARIES[id].name,
    secondary: id,
    costs: SECONDARIES[id].costs,
    ultimate: SECONDARIES[id].ultimate,
    blurb: SECONDARIES[id].blurb,
  })),
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

// Drawn sprites (§9b) are also baked at this multiple of their in-game size as `<key>_hd`,
// for the start screen's enlarged ship.
export const ART_HD_SCALE = 4;

export const TIMING = {
  deathToGameOverMs: 1200,
  gameOverInputDelayMs: 500,
};
