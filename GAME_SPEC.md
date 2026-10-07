# STELLAR DODGE — Game Build Specification

> This document is a complete, self-contained build prompt. It is written to be
> handed to an AI coding assistant (or a human developer) to implement the
> entire game in a single pass, with no clarifying questions needed. Every
> mechanic, number, and behavior a v1 build requires is defined below. Where
> a minor detail is genuinely not specified, pick the value that is most
> consistent with the rest of this document rather than asking.

**Working title:** Stellar Dodge (placeholder — rename freely, it's just a string constant)

## 1. One-line pitch

A vertical space shooter where the ship auto-fires forward and the only thing
the player controls is *movement* (to dodge incoming enemies and bullets) and
*activating held abilities* picked up from consumable drops. A second
stream of weapon-upgrade drops grows your firepower during a run — and
doubles as your only life bar, since getting hit strips upgrades away
instead of costing a health point. Survive as long as possible against an
endlessly escalating threat. Gold earned in each run is banked and spent in
the Hangar on permanent upgrades: new weapons, a second ability slot, a
launch barrier, stackable refits (§19), and defensive secondary weapons that
fight alongside the ship automatically (§20).

## 2. Core loop

1. Ship auto-fires straight ahead continuously — the player never presses a shoot button.
2. Enemies spawn from the top of the screen and move/shoot according to their type.
3. Player moves freely with keyboard input to dodge enemy bodies and bullets.
4. Player bullets kill enemies, which sometimes drop a pickup — either a one-time weapon upgrade or a holdable ability (see §8b and §8).
5. Weapon-upgrade pickups apply immediately on contact and boost the ship's fire rate/damage/spread for the rest of the run; ability pickups are held in one slot (two with the Hangar upgrade) and activated with one key press.
6. Difficulty ramps up on two separate tracks: enemy speed/bullet-speed/fire-frequency scale with survival time and permanently step up further with each boss defeated, while the number of enemies per wave scales (smoothly, never suddenly) with the player's current weapon level.
7. Reach your weapon's max level and rack up 100 kills in a row without taking an unblocked hit, and a boss ("The Sentinel") shows up — or, as a fallback for a rougher run, simply reach 500 total kills regardless of level or damage taken. Either path can recur multiple times in one run — see §7b.
8. There is no separate HP stat — taking a hit costs weapon levels instead (see §8b). Run ends when a hit lands while at the weapon's minimum level (0 to start). Gold = kills + survival time + boss bonuses; each run's gold is banked for the Hangar and the best single run is remembered (§13, §19).

## 3. Tech stack & project structure

- **Engine:** Phaser 3 (latest 3.7x line), loaded via CDN `<script>` tag in `index.html`.
- **No build step.** Plain JS files loaded as ES6 modules (`<script type="module">`). No npm install, no bundler, no TypeScript compile step required to run the game. Serving the folder with any static file server (e.g. `python3 -m http.server`) must be enough to play — browsers refuse to load ES modules from `file://`, so double-clicking `index.html` is not supported. For sharing, `node tools/build-standalone.mjs` (Node 18+, internet once to fetch the pinned Phaser) writes `StellarDodge.html`: the whole game, Phaser and any drawn sprites included, in one file that does run when double-clicked, offline. Rebuild it after changing the game or its art.
- **Procedural art by default.** Every sprite is generated at runtime (see §9), so the game needs no image or audio files. Drawn sprites can replace any of them one at a time (§9b); anything not drawn keeps its generated version.
- **Physics:** Phaser Arcade Physics.

### File structure

```
index.html
StellarDodge.html          # Generated single-file build for sharing (tools/build-standalone.mjs)
tools/
  build-standalone.mjs     # Bundles index.html + src/ + Phaser + drawn sprites into StellarDodge.html
assets/
  sprites/                 # Drawn sprites (§9b); README.md there is the brief for artists
src/
  main.js                 # Phaser game config, boots the scene list
  config/
    constants.js           # All tunable numbers from this doc, in one place
    sprites.js             # Pixel-grid sprite definitions rendered by BootScene (§9)
    art.js                 # Drawn sprites that replace generated ones (§9b)
  scenes/
    BootScene.js            # Generates all textures, then starts MenuScene
    MenuScene.js             # Start screen with weapon select (§19)
    HangarScene.js           # Upgrade shop (§19)
    GameScene.js             # Main gameplay
    PauseScene.js            # Pause overlay (§14)
    GameOverScene.js         # Death screen
  ui/
    Hud.js                   # All HUD elements (§12), banners and floating text
  entities/
    Player.js
    Enemy.js
    Boss.js
    PlayerBullet.js
    EnemyBullet.js
    Pickup.js
  systems/
    SpawnManager.js          # Decides what/when/how many to spawn per wave
    DifficultyManager.js     # Tracks elapsed time, bossBonusLevel, smoothedWeaponLevel, exposes both difficulty curves (§10)
    AbilityManager.js        # Holds 1-2 ability slots (§8, §19), handles activation and timers
    WeaponManager.js         # Weapon level, the hit/level-loss/death rule (§8b), and each weapon's volley shape (§19)
    BossManager.js           # Tracks both boss-trigger counters and runs the encounter (§7b)
    SecondaryManager.js      # The equipped defensive secondary: drones, tesla arcs or repulsor field (§20)
    Starfield.js             # Parallax scrolling background
    Sfx.js                   # Procedural Web Audio sound effects (§15)
    profile.js               # Saved bank, best run, purchases and chosen weapon; run modifiers (§13, §19)
```

## 4. Screen & camera

- **Resolution:** 480 × 800 (portrait), `Phaser.Scale.FIT`, `autoCenter: CENTER_BOTH`.
- **Background color:** `#05060a` (near-black navy).
- **Background effect:** Two parallax star layers — small white/gray dots scrolling straight down at 20 px/s (far layer, dimmer/smaller dots) and 50 px/s (near layer, brighter/larger dots). When a star passes the bottom edge, wrap it back to a random x at the top. This is what sells "traveling forward" — the ship's screen position doesn't need to move for this effect.

## 5. Controls

In a run, only movement and the ability key matter. No touch required for v1; menus also accept mouse clicks.

| Input | Action |
|---|---|
| Arrow Keys **or** WASD | Move ship (both accepted simultaneously; either works) |
| Spacebar | Activate the next held ability (no-op if nothing held) |
| P **or** Esc | Pause / resume |

On the start screen, Up/Down (or W/S) pick the PRIMARY or SECONDARY row, Left/Right (or A/D) change it, Enter or Space launches, and H opens the Hangar (§19, §20).

Movement is free 2D, not lane-based. Diagonal movement must be normalized so diagonal speed equals straight-line speed (don't let diagonals be faster).

## 6. Player ship

| Property | Value |
|---|---|
| Sprite size | 24×24 px, generated pixel-art triangle-ship (see §9) |
| Color | Cyan `#4de3ff` body, darker `#1a6b80` outline/shading pixels |
| Hitbox | 16×16, centered on sprite (smaller than visual sprite — forgiving "bullet-hell" style hitbox) |
| Start position | x = 240 (center), y = 680 |
| Movement bounds | x: [20, 460], y: [30, 770] |
| Movement speed | 260 px/s, +4% per Thrusters rank (§19) |
| Weapon level | 0–10 to start (range can permanently widen via the prestige reward in §7b), starts at 0 each run (plus one per Head Start rank, §19). Doubles as the player's life system — see §8b. |
| Hit invincibility | 0.4s of i-frames after any hit (bullet or ram), purely to stop a single simultaneous multi-collision from registering as more than one hit. Sprite alpha flickers between 1.0 and 0.3 every 0.1s during i-frames. The Shield ability (§8) overrides this with full invulnerability. |
| Death | Taking a hit while weapon level is already at `weaponLevelMin` (0 to start): explosion effect (§9), then transition to GameOverScene. Full rule in §8b. |

### Auto-fire (base weapon)

- Fires automatically, no input needed, from the moment gameplay starts.
- Fire interval, damage-per-bullet, and bullet spread are all driven by the player's current **weapon level** (0–10 to start, wider after a prestige — §7b) — see the table in §8b. At level 0 this is 1 bullet straight up every 0.35s, damage 1 per bullet.
- Bullet (the free Blaster weapon): 4×10 px yellow (`#ffe14d`) pixel sprite with a 5×10 hitbox (25% wider than it looks, so shots connect a little more easily), speed 480 px/s upward, destroyed off-screen or on enemy hit. The three unlockable weapons reshape the same level stats differently — see §19.
- Temporary abilities (Rapid Fire, Spread Shot in §8) can further modify interval/spread on top of the current weapon level — §8b defines exactly how they combine.

## 7. Enemies

Four enemy types, unlocked progressively by elapsed survival time (unlock times are fixed regardless of difficulty level — see §10). All enemies spawn at y = -20 (just above the visible screen) at a random valid x within [24, 456], move downward, and are destroyed/removed once fully off-screen at the bottom (no gold for enemies that escape off-screen).

All Speed, Bullet speed, and Fire interval values below are **base** values — §10 scales all three up over time and with each boss defeated.

Hitboxes are square and centered on the sprite: Drone 16 px, Gunner 17 px, Weaver 17 px, Bulwark 27 px. The same box is used both for player bullets hitting the enemy and for the enemy ramming the player.

| Type | Name | HP | Sprite | Move pattern | Base speed (down) | Fires? | Fire pattern (base interval, base bullet speed) | Gold | Unlocks at |
|---|---|---|---|---|---|---|---|---|---|
| A | Drone | 1 | 16×16 red `#ff4d4d` blocky pixel ship | Straight down | 90 px/s | No | — | 10 | 0s (from run start) |
| B | Gunner | 2 | 18×18 orange `#ff9640` pixel ship | Straight down | 70 px/s | Yes | 1 bullet aimed at player's current position, every 1.8s, bullet speed 220 px/s | 20 | 15s |
| C | Weaver | 2 | 18×18 purple `#b34dff` pixel ship | Down + horizontal sine wave, amplitude 60px, period 2s | 80 px/s vertical | Yes | 1 straight-down bullet, every 2.2s, bullet speed 200 px/s | 25 | 35s |
| D | Bulwark | 5 | 28×28 dark-green `#3dbf5a` large pixel ship | Straight down, slow | 50 px/s | Yes | 3-bullet spread (−20°, 0°, +20° from straight down), every 2.5s, bullet speed 200 px/s | 50 | 60s |

Enemy bullets: 6×6 px pixel dot with a bright core, rim color matching the firing enemy's palette (orange/purple/green; the Sentinel's are crimson). On hitting the player it triggers the weapon-level hit rule (§8b); the bullet is destroyed on player hit or off-screen.

### Spawning

- `SpawnManager` fires a spawn wave at the current spawn interval (see §10 for how the interval shrinks over time). Each wave spawns `enemySpawnBatchSize` enemies (§10), each independently rolling its type uniformly at random among all currently-unlocked types.

## 7b. Boss encounters

A recurring boss fight with two independent trigger paths, so a clean/skilled run and a rougher one both eventually see one.

### Triggers

Track two counters, both starting at 0 when gameplay starts:

- **`bossStreak`** — the "flawless streak." Increments by 1 for every enemy kill made while the player's weapon level equals their current `weaponLevelMax` (§8b; starts at 10). Resets to 0 the instant an **unblocked** hit lands (any hit that isn't absorbed by the Shield ability, §8, or the Launch Barrier, §19) — since a hit at max level always drops the player below it, any unblocked hit means the streak is broken. A blocked hit does **not** reset it. Triggers the boss at **100**.
- **`totalKillsSinceLastBoss`** — a simple fallback counter. Increments by 1 for every enemy kill, regardless of weapon level or damage taken. Triggers the boss at **500**, so a run that keeps taking hits (and can never sustain the flawless streak) still guarantees a boss eventually.

Whichever counter reaches its threshold first triggers the boss immediately. On trigger, **both** counters reset to 0, so the next boss (of either run) needs a fresh 100-streak or 500-kill count from that point.

Bosses can recur any number of times in a single run if the player keeps re-qualifying by either path.

### Boss encounter flow

1. On trigger, all current on-screen regular enemies and their bullets are instantly cleared (no gold awarded for the clear — it's just a clean transition into the fight).
2. Regular enemy spawning (§7) pauses for the duration of the fight.
3. The Sentinel enters from the top (y = -40), moving down to a hover position (y = 150) at 100 px/s, then holds there, moving side to side in a sine pattern (amplitude 150px, period 4s) for the rest of the fight.
4. The Sentinel attacks on two independent timers:
   - **Fan spread:** every 1.5s, fires a 7-bullet fan from −60° to +60° (relative to straight down), bullet speed 180 px/s.
   - **Aimed burst:** every 4s, fires 3 bullets aimed at the player's current position, 0.15s apart, bullet speed 260 px/s.
5. Touching the Sentinel's body costs the player a hit under the same universal rule as everything else (§8b) — but unlike ramming a regular enemy (§11), this does **not** damage or destroy the Sentinel itself; only player bullets do.
6. Ability interactions with the boss: **Nova Bomb does not damage the Sentinel** — it destroys regular enemies and clears every enemy bullet on screen (the Sentinel's included), but the boss itself is untouched, so it can never instantly clear a boss fight. **Overdrive** (time slow) *does* apply to the Sentinel like any other enemy, slowing its movement and bullets to 40% speed. **Shield** and the fire-rate/spread abilities work exactly as normal during a boss fight.
7. HP scales with how many Sentinels the player has already defeated this run: `3000 + 1500 * (bossIndex - 1)` (1st fight: 3000 HP, 2nd: 4500, 3rd: 6000, …).
8. On defeat: a large explosion (scaled-up particle burst), award `500 * bossIndex` bonus gold, permanently add **+3** to `bossBonusLevel` (§10 — this is what escalates enemy speed/bullet-speed/fire-frequency from here on, not weapon level), and guarantee one Ability pickup drop at the death position (a Weapon Upgrade would be wasted if the player is already at `weaponLevelMax`, so the Sentinel always drops an ability instead). Regular spawning resumes and `bossIndex` increments for next time.

### Sentinel appearance

- 64×64 px procedurally-generated pixel-art sprite (see §9), crimson `#c23b3b` body with darker `#7a1f1f` plating detail. Hitbox 58×51 px, centered.

### Flawless prestige reward

An extra, stackable reward on top of the normal boss-defeat rewards in step 8 above, for players who enter a boss fight already at their weapon cap and leave it without taking a single hit.

- **Condition:** the player takes zero unblocked hits (Shield and the Launch Barrier don't count) for the entire duration of a boss fight (any boss, triggered via either path in §7b), **and** their weapon level equals their current `weaponLevelMax` at the moment the boss dies. (Since no regular enemies spawn during a boss fight, a flawless fight means the player's weapon level literally cannot have changed since the fight started — so this is equivalent to "you started the fight already at your cap and stayed there.")
- **Effect:** `weaponLevelMin += 5`, `weaponLevelMax += 5`, `weaponLevel -= 5`. The first time this triggers (starting from the default 0–10 range), that's `weaponLevelMin: 0→5`, `weaponLevelMax: 10→15`, current level `10→5`.
- This is a genuine, immediate power **dip** — level 5 is weaker than level 10 (§8b's table) — traded for a permanently higher ceiling (you can eventually out-power your old peak) and a permanently higher floor (you can never again be as fragile as the original level-0 state, since the minimum a hit can knock you down to keeps rising too).
- This is **repeatable and uncapped**: if the player later flawlessly clears another boss while sitting exactly at their (now raised) `weaponLevelMax`, it triggers again with the same +5/+5/−5 shift, and so on indefinitely — fitting, since this whole game has no difficulty cap either.
- This reward is independent of the guaranteed ability drop and bonus gold from step 8 — a flawless max-level boss kill gives the player **both**.

## 8. Abilities (consumable pickups)

- Enemies destroyed by a **player bullet** (not by ramming — see §11) have a **3% chance** to drop an ability pickup at their death position. This roll is independent of the weapon-upgrade roll in §8b — see there for how the two combine.
- Pickup: 14×14 px diamond/orb sprite, distinct color per ability (below), falls straight down at 60 px/s, despawns if it exits the bottom of the screen uncollected.
- Player collects a pickup by touching it with their hitbox.
- **Ability slots.** The player has one slot by default, two after buying the Second Ability Slot (§19). Pickups fill the first empty slot. With every slot full, a new pickup **replaces the last slot** (with one slot, that simply replaces the held ability), so the ability queued to fire next is never lost.
- Pressing **Space** fires slot 1 and moves the rest up, so abilities fire in the order they were picked up. Pressing Space with nothing held: does nothing.
- All 5 abilities are equally weighted (20% each) when a drop occurs.
- Timed abilities last 10% longer per Capacitors rank (§19).

| Ability | Icon color | Effect | Duration |
|---|---|---|---|
| Shield | Light blue `#4de3ff`, pulsing ring | Full invulnerability — ignores all damage and skips i-frame damage-flicker | 4s |
| Nova Bomb | White/orange `#ffb04d` burst | Instant: destroys every enemy currently on screen (awards their normal gold) and clears every enemy bullet on screen. Big radial flash VFX. | Instant (no duration) |
| Rapid Fire | Yellow `#fff34d` bolt | Auto-fire interval reduced from 0.35s to 0.12s | 5s |
| Spread Shot | Green `#4dff88` trident | Auto-fire becomes 3-way spread (−15°, 0°, +15°) instead of single bullet; interval unchanged | 5s |
| Overdrive (time slow) | Purple `#b34dff` hourglass | All enemies and enemy bullets move at 40% of their normal speed. Player and player bullets unaffected. | 4s |

## 8b. Weapon upgrades (permanent progression + life system)

This is a second, independent pickup track from the ability system in §8. It permanently strengthens the player's auto-fire **and doubles as the player's only life system** — there is no separate HP stat.

### Upgrade pickups

- 14×14 px gold (`#ffd700`) chevron/arrow-shaped pixel sprite — visually distinct from the diamond-shaped ability pickups. Falls straight down at 60 px/s, despawns off-screen if uncollected.
- Drop rolls happen on every **bullet-kill** (not ram-kills — same rule as ability drops, §11), and are **fully independent** of the ability-drop roll in §8:
  1. Roll 5% (+1% per Salvage Scanner rank, §19) for a Weapon Upgrade drop.
  2. Separately, roll 3% for an Ability drop (§8).
  3. Both can succeed on the same kill (0.15% of kills) — in that case, spawn both pickups at the death position, offset a few pixels apart horizontally so they don't overlap. Both can also both fail, in which case nothing drops.
- Enemies killed by the Nova Bomb ability each roll independently using the same rules above.
- Collecting an Upgrade pickup increases the player's weapon level by 1, up to the current `weaponLevelMax` (starts at 10 — see the Prestige rule in §7b for how this can rise). Collecting one while already at `weaponLevelMax` instead pays **+100 gold** (× Prospector) and fills one step of a 5-step **shrug meter**. The 5th step grants a **damage shrug**: the same gold barrier ring as the Launch Barrier (§19), which absorbs the next unblocked hit with no level loss. Only one shrug (or barrier) is held at a time; while one is held, the meter stays full at 5, and the next max-level pickup after it breaks grants a new one at once. The meter keeps its progress for the whole run, even if hits knock the player below max.

### Weapon level table

Damage, fire interval, and bullet pattern all come from the player's current level. Bullet angles are measured from straight up (0°). The table below covers levels 0–15 (the range after one prestige — §7b); if the player prestiges again beyond 15, continue the same trend for the implementer's own judgment: fire interval keeps dropping by 0.02s per level down to a floor of 0.05s, damage keeps adding +1 every 2 levels, and bullet count keeps widening to a new, wider tier roughly every 3–4 levels.

| Level | Fire interval | Damage / bullet | Bullets (angles) |
|---|---|---|---|
| 0 (start) | 0.35s | 1 | 1 (0°) |
| 1 | 0.33s | 1 | 1 (0°) |
| 2 | 0.31s | 2 | 1 (0°) |
| 3 | 0.29s | 2 | 2 (−8°, +8°) |
| 4 | 0.27s | 3 | 2 (−8°, +8°) |
| 5 | 0.25s | 3 | 2 (−8°, +8°) |
| 6 | 0.23s | 4 | 3 (−15°, 0°, +15°) |
| 7 | 0.21s | 4 | 3 (−15°, 0°, +15°) |
| 8 | 0.19s | 5 | 3 (−15°, 0°, +15°) |
| 9 | 0.17s | 5 | 5 (−25°, −12°, 0°, +12°, +25°) |
| 10 (original max) | 0.15s | 6 | 5 (−25°, −12°, 0°, +12°, +25°) |
| 11 | 0.13s | 6 | 5 (−25°, −12°, 0°, +12°, +25°) |
| 12 | 0.11s | 7 | 7 (−35°, −22°, −10°, 0°, +10°, +22°, +35°) |
| 13 | 0.09s | 7 | 7 (−35°, −22°, −10°, 0°, +10°, +22°, +35°) |
| 14 | 0.07s | 8 | 7 (−35°, −22°, −10°, 0°, +10°, +22°, +35°) |
| 15 (max after 1st prestige) | 0.05s | 8 | 7 (−35°, −22°, −10°, 0°, +10°, +22°, +35°) |

### Interaction with temporary abilities (§8)

- **Rapid Fire** sets the fire interval to `min(levelInterval, 0.12s)` for its duration — a big boost at low levels, and never a downgrade at levels 12+ whose own interval is already faster than 0.12s.
- **Spread Shot** sets the bullet pattern to the 3-way (−15°, 0°, +15°) spread for its duration — *unless* the player's current weapon level already fires 3 or more bullets (level 6+), in which case the level's own (equal-or-wider) pattern is kept instead, so the ability can never downgrade a high-level player.
- Damage-per-bullet always comes from the current weapon level; neither ability changes it.
- These two systems are otherwise fully independent: the ability slots (§8) and the weapon level (this section) don't interact with or consume each other.
- For the Lance, Scatter and Seeker weapons, both abilities apply to the level's stats before the weapon reshapes them, so they help every weapon by the same proportion (§19).

### Taking damage

Every hit — whether from an enemy bullet or from ramming an enemy body — costs exactly the same thing: weapon levels, not HP. There is no per-enemy or per-source damage variance ("any hit does the same damage").

The player has a `weaponLevelMin` (starts at 0) and `weaponLevelMax` (starts at 10) for the run — both normally fixed, but both can rise via the Prestige reward in §7b.

- If the player's weapon level is **greater than `weaponLevelMin`** when hit: `level = max(weaponLevelMin, level - 3)`. The player survives (subject to the 0.4s hit-invincibility in §6), but permanently loses the fire-rate/damage/spread that came with those levels until more upgrades are collected.
- If the player's weapon level is **already at `weaponLevelMin`** when hit: there are no levels left to remove, so the hit kills the player instead.
- The Shield ability (§8) fully blocks this — no level loss and no death while Shield is active. The Launch Barrier (§19) blocks the first such hit of a run the same way.
- `weaponLevel` resets to 0 (plus Head Start ranks), and `weaponLevelMin`/`weaponLevelMax` reset to 0/10, at the start of every new run. Only the Hangar purchases in §19 carry over between runs.

## 9. Visual generation (procedural pixel art)

All sprites are generated once at boot (`BootScene`) from small pixel-grid definitions, rendered with `Phaser.GameObjects.Graphics` and converted to textures via `generateTexture()`, then reused by reference for the rest of the game (no per-frame regeneration). This avoids any dependency on external image files.

Required generated textures:
- Player ship (24×24)
- Enemy types A–D (16×16 / 18×18 / 18×18 / 28×28)
- The Sentinel boss (64×64, see §7b)
- Player projectiles: Blaster bullet (4×10), Lance beam (2×16), Scatter pellet (4×4), Flak shard (2×4, §19), Seeker missile (4×8)
- Enemy bullet (6×6)
- Launch Barrier ring (34×34, thin gold double circle)
- Escort drone (10×10, cyan) and the deflected-bullet dot (6×6, the enemy bullet shape in mint green). Tesla arcs and the Repulsor Field circle are drawn live with vector graphics.
- 5 ability pickup icons (14×14 each, one per ability color above)
- 1 weapon upgrade pickup icon (14×14, gold `#ffd700` chevron — visually distinct shape from the ability orbs)
- A small square particle (4×4, white) reused (tinted per-enemy-color) for explosion bursts

**Explosion effect:** on any enemy or player death, emit 8–12 of the particle squares outward from the death position at random angles/speeds, tinted to the destroyed entity's main color, fading out over 0.4s.

## 9b. Drawn sprites

Any generated texture can be replaced by a drawing, one sprite at a time, without touching game code. `assets/sprites/README.md` is the brief for artists (orientation, sizes, hitboxes, colors).

- **Manifest:** `src/config/art.js` maps a texture key to an image file, e.g. `player: { file: 'assets/sprites/player.png' }`, with optional `size: [w, h]` (game pixels; defaults to the generated sprite's size) and `smooth: false` (for pixel art drawn at its exact in-game size). It stays plain data so the build script can read it.
- **Loading:** after generating every texture, `BootScene` loads each listed image with a plain `Image` (Phaser 3.70's loader rejects `data:` URLs) and only then starts the menu. A file that fails to load, or a key with no generated texture, logs a console warning and keeps the pixel art.
- **Baking:** each drawing is resampled once, proportions kept and centered, into a canvas texture at its in-game size under the original key, so hitboxes, scales and previews behave exactly as with the pixel art. Large reductions halve in steps first so thin lines survive. A second copy at 4× (`<key>_hd`, linear filtering) serves screens that show a sprite enlarged: the start screen's ship uses `player_hd` when present.
- **Hitboxes stay separate:** collision sizes come from §6/§7/§19, never from the image, so a drawing with a `size` override looks larger without changing gameplay.
- **Running:** served over HTTP (a local server or GitHub Pages) the images load from `assets/sprites/`. The single-file build replaces each path in `art.js` with the image as a `data:` URL, so double-clicking it still works offline; the build stops with a clear message if a listed file is missing.

## 10. Difficulty curve (endless survival)

Two independent difficulty systems, driven by two different things: how long you've survived and how many bosses you've beaten drive how *fast and aggressive* enemies are; your current weapon level drives how *many* show up at once.

### Speed / bullet-speed / fire-frequency (tied to time + boss defeats)

- `timeDifficultyLevel = floor(elapsedSurvivalSeconds / 20)` (increases by 1 every 20 seconds).
- `bossBonusLevel` starts at 0 and permanently increases by **+3** every time a boss is defeated (§7b) — it never decreases, regardless of weapon level or damage taken afterward.
- `effectiveDifficultyLevel = timeDifficultyLevel + bossBonusLevel`. Note this is **not** tied to weapon level — losing/gaining weapon levels has no effect on this number.
- `difficultyMultiplier = 1 + effectiveDifficultyLevel * 0.05` (a flat +5% per effective level). This single multiplier drives all three of the following:
  - **Enemy movement speed:** `baseSpeed * difficultyMultiplier`.
  - **Enemy bullet speed:** `baseBulletSpeed * difficultyMultiplier`.
  - **Enemy fire frequency:** effective fire interval = `baseFireInterval / difficultyMultiplier` (so higher difficulty means enemies shoot more often, not just faster bullets).
- Spawn interval (seconds between enemy spawn waves): `max(0.45, 1.6 - effectiveDifficultyLevel * 0.12)`.
- Enemy type unlocks are based on `elapsedSurvivalSeconds` directly (fixed thresholds in §7's table), independent of `effectiveDifficultyLevel`.
- The Sentinel boss (§7b) is exempt from this curve entirely — its own stats come only from the `bossIndex` formula in §7b, so the two scaling systems never stack on top of each other.
- There is no cap on `effectiveDifficultyLevel` for v1 — it keeps escalating for as long as the run continues.

### Enemy count per wave (tied to weapon level, smoothed)

- Track `smoothedWeaponLevel`, starting equal to `weaponLevel` (0) at run start. There is no separate timer for this — it steps in lockstep with the spawn-wave cadence above.
- Each time the spawn-interval timer fires (i.e., once per wave), **before** spawning, `smoothedWeaponLevel` moves at most **1 level** toward the player's real, current `weaponLevel` — one step up if the real level is higher, one step down if it's lower, no change if they're equal. This is the step-up/step-down limiter: even if the real `weaponLevel` jumps around instantly (a hit, a pickup, a prestige), `smoothedWeaponLevel` only ever crawls toward it one step per wave, so enemy density never spikes or crashes suddenly. (Since the spawn interval itself shrinks as difficulty rises, waves — and so this smoothing — get more frequent later in a run, which is intended.)
- `enemySpawnBatchSize = 1 + floor(smoothedWeaponLevel / 3)`, computed from the just-updated `smoothedWeaponLevel` (uncapped — matches the "no difficulty cap" philosophy of everything else in this doc).
- That same wave then spawns `enemySpawnBatchSize` enemies at once instead of always spawning exactly one — each rolls its type independently from the currently-unlocked pool (§7), at its own random x within [24, 456], keeping at least 40px of horizontal separation between enemies spawned in the same wave where possible (if the wave is too large to keep every pair separated, allow the overflow to overlap rather than failing to spawn).
- `bossBonusLevel` and `smoothedWeaponLevel` both reset to 0 at the start of every new run.

## 11. Collision rules

| Collision | Result |
|---|---|
| Player bullet ↔ Enemy | Enemy HP − (the volley's damage per shot, §8b/§19); bullet destroyed, unless it is a Lance beam with pierce left or a Swarm missile retargeting after a kill (§19). If enemy HP ≤ 0: explode, award gold, roll pickup drop chance (§8b). |
| Railgun beam ↔ Enemy bullet | Only with the Lance's Railgun ultimate (§19): the bullet detonates, destroying itself and every enemy bullet within 26px; the beam flies on. Without it, player shots and enemy bullets ignore each other. |
| Player ↔ Enemy body ("ramming") | Player takes a hit per the weapon-level rule in §8b (subject to i-frames); enemy is also destroyed and explodes, but awards **no gold** and **no pickup drop** (shooting enemies down is the intended, rewarded playstyle; ramming is a fallback that costs the player). |
| Player ↔ Enemy bullet | Player takes a hit per the weapon-level rule in §8b (subject to i-frames); bullet destroyed. |
| Player ↔ Ability pickup | Collected into the ability slots per §8's fill/replace rule; pickup removed; small collect flash. |
| Player ↔ Upgrade pickup | Weapon level +1 (capped at `weaponLevelMax`) per §8b; pickup removed; small collect flash. |

Kills by a secondary weapon (§20) — tesla arcs, field burn, or deflected shots — count like bullet-kills: they award gold, roll drops and count toward the boss triggers.

All bullets/enemies/pickups are destroyed and removed once they fully exit the screen bounds (with a small margin) to avoid unbounded object growth.

## 12. HUD

- **Top-left:** Weapon Level meter — a bar filled to `(weaponLevel - weaponLevelMin) / (weaponLevelMax - weaponLevelMin)`, labeled with the exact numeric level (e.g. "LVL 8"). Empty means the next hit is lethal. Using a fraction rather than fixed pips means it reads correctly even after the range widens via a prestige (§7b). This single meter replaces a traditional health bar; see §8b. The equipped weapon's name sits under the meter ("LANCE ULT" when its ultimate is owned, §19), and under that, once the player is at max level (or has progress), "SHRUG" with 5 small pips for the shrug meter (§8b) — the label turns gold while a shrug is held.
- **Top-right:** Live gold ("GOLD 1,234"), with "BEST RUN N" directly beneath it.
- **Bottom-center:** One ability slot box, or two side by side with the Second Ability Slot (§19). Empty slots are greyed outlines. Slot 1 shows its icon brightly with its name to the left and a pulsing "[SPACE]" hint to the right; slot 2's icon is dimmed as the queued one.
- **Bottom-right (only with a secondary equipped):** the secondary's name over an 84px charge bar that fills during its cooldown and turns bright when it's ready (§20).
- **Top-center (optional but recommended):** Survival timer as `mm:ss`.
- **Below the survival timer, only while weapon level equals `weaponLevelMax`:** the flawless-streak progress, e.g. "Streak: 67/100" (§7b).
- **While a boss is active:** a boss HP bar spanning the top of the screen, labeled "THE SENTINEL", replacing the streak readout for the fight's duration.

## 13. Gold & persistence

What used to be "score" is **gold**, and it is both the run's score and the currency for the Hangar (§19).

- Gold += the enemy's listed gold value on each bullet- or Nova-kill (see §7 table).
- Gold += 2 per second survived (1 gold every 0.5s tick).
- Gold += `500 × bossIndex` for each Sentinel destroyed (§7b).
- Every source is multiplied by `1 + 0.05 × Prospector rank` (§19). Run gold is tracked fractionally so small multipliers on 1-gold ticks still add up, and is floored for display and banking.
- On death, the run's gold is added to the persistent **bank**, and if it beats the stored best single run, it becomes the new **BEST RUN**.
- Everything persistent lives in one `localStorage` entry, `stellarDodge_profile`, holding `gold` (bank), `best`, `unlocks`, `ranks` and `weapon`. A legacy `stellarDodge_highScore` value is migrated into `best` once. Unreadable or blocked storage falls back to a fresh profile without crashing.

## 14. Scene flow

1. **BootScene** — generates all procedural textures (§9), then immediately starts `MenuScene`. No visible content of its own.
2. **MenuScene** — the start screen: title, a two-row loadout (primary weapon with a volley preview, §19; secondary weapon shown around the ship, §20), controls, the gold bank and best run, "ENTER LAUNCH" (starts `GameScene`) and "H HANGAR" (opens `HangarScene`). Both prompts are also clickable.
3. **HangarScene** — the upgrade shop (§19). Esc, H or Backspace returns to `MenuScene`.
4. **GameScene** — full gameplay as specified above. On player death, banks the run's gold and transitions to `GameOverScene`.
5. **GameOverScene** — shows "GAME OVER", gold earned this run, the bank total, best run (with a "NEW BEST RUN!" badge when beaten), time survived, max weapon level and Sentinels destroyed. After a 0.5s input delay: R retries (straight back into `GameScene`), H opens the Hangar, M returns to the start screen; each is also clickable.

Pause (e.g. an 'P'/Esc key that freezes the scene) is a nice-to-have, not required for v1 — include it only if it doesn't add risk to finishing the rest of the spec.

## 15. Audio (nice-to-have, not blocking)

Simple, short procedurally-generated tones (e.g. via the Web Audio API or Phaser's sound manager with generated waveforms — no external audio files) for: auto-fire tick (very quiet/short), enemy explosion, player hit / weapon-level-down, weapon-level-up chime, ability collect chime, ability activation (whoosh). **If this adds meaningful implementation risk, it's acceptable to ship v1 completely silent** — audio is explicitly out of the "must have" path.

## 16. Explicit non-goals for v1

Do not implement any of the following — they are intentionally out of scope:

- Mobile touch controls or gamepad support
- Scripted levels/waves with a defined end (the boss in §7b is a recurring endless-mode event, not a level structure)
- More than two ability slots
- Multiplayer
- Cloud saves or accounts — progress lives only in this browser's `localStorage`
- Story, dialogue, or cutscenes
- Settings/options menu, volume controls
- Real image/audio asset files (everything is procedural per §9 and §15)

## 17. Definition of done (acceptance checklist)

- [ ] Served from any static file server, `index.html` runs with zero build step and zero console errors.
- [ ] Start screen shows title, weapon select, controls, gold bank, best run, and working Launch and Hangar prompts.
- [ ] Ship moves smoothly with Arrow Keys and WASD, normalized diagonal speed, clamped to bounds.
- [ ] Ship auto-fires continuously with no player input required.
- [ ] All 4 enemy types appear, each gated by its correct unlock time, each with correct movement and (where applicable) firing behavior.
- [ ] Player bullets damage/destroy enemies using the current volley's damage value, award correct gold, and trigger the independent 5% upgrade / 3% ability drop rolls on bullet-kills only (both may drop from the same kill).
- [ ] Collecting an Upgrade pickup increases weapon level (capped at the current `weaponLevelMax`) and visibly changes fire rate, damage, and bullet spread per the §8b table.
- [ ] Player holds one ability (two with the Second Ability Slot); a pickup into full slots replaces the last slot; Space fires slot 1 first with the correct effect and duration.
- [ ] Taking a hit while weapon level > `weaponLevelMin` removes 3 levels (clamped at `weaponLevelMin`) and applies the 0.4s i-frames with visible flicker; taking a hit while already at `weaponLevelMin` kills the player, triggering the explosion and Game Over transition.
- [ ] `weaponLevel`, `weaponLevelMin` (0), and `weaponLevelMax` (10) all reset at the start of each new run.
- [ ] Reaching `weaponLevelMax` and getting 100 kills in a row without an unblocked hit triggers a boss; the streak resets on any unblocked hit but not on a Shield-blocked one.
- [ ] Reaching 500 total kills (regardless of level or damage) also triggers a boss, as a fallback for runs that never sustain the flawless streak.
- [ ] On trigger, both boss counters reset to 0, on-screen regular enemies/bullets are cleared, and regular spawning pauses until the boss is defeated.
- [ ] The Sentinel fires its fan-spread and aimed-burst patterns on the correct timers and can be damaged/destroyed by player bullets using current weapon-level damage.
- [ ] Touching the Sentinel costs the player a hit but does not damage the Sentinel itself; Nova Bomb has no effect on the Sentinel; Overdrive slows the Sentinel like any regular enemy.
- [ ] Defeating a boss awards `500 * bossIndex` bonus gold, guarantees an ability drop, resumes normal spawning, and scales HP up (`3000 + 1500 * (bossIndex-1)`) for the next boss in the same run.
- [ ] A flawless boss kill while at `weaponLevelMax` also triggers the prestige reward (`weaponLevelMin += 5`, `weaponLevelMax += 5`, `weaponLevel -= 5`), stacking with (not replacing) the normal boss rewards, and this repeats correctly if the player prestiges more than once in a run.
- [ ] Enemy movement speed, bullet speed, and fire frequency all increase the longer the run lasts, and each boss defeat permanently bumps them further via `bossBonusLevel` (+3); none of this is affected by weapon level.
- [ ] The number of enemies spawned per wave increases as `smoothedWeaponLevel` rises, and that value only ever moves 1 level per wave toward the real `weaponLevel` — a sudden weapon-level change (a hit, several pickups in a row, a prestige) never causes an instant jump or drop in enemy count.
- [ ] Game Over screen shows gold earned, bank and best run; R retries a fresh run, H opens the Hangar, M returns to the start screen.
- [ ] Run gold is banked on death, and the bank, best run, purchases and chosen weapon all persist across a full page reload.
- [ ] The Hangar sells every §19 item at its listed price, refuses owned/maxed items and unaffordable ones (showing the shortfall), and each purchase takes effect on the next run.
- [ ] Left/Right on the start screen cycles only unlocked weapons, and the chosen weapon is the one used in the run.
- [ ] Lance beams pierce one enemy; Scatter pellets vanish at 320px; Seeker missiles home onto the nearest enemy; Rapid Fire and Spread Shot scale every weapon proportionally.
- [ ] The Launch Barrier absorbs exactly the first unblocked hit of a run without costing levels or breaking the streak.
- [ ] Each secondary sells in 6 ranks at its listed escalating prices, buying a rank equips it, and Up/Down + Left/Right on the start screen choose among unlocked secondaries.
- [ ] Escort Drone shoots down the bullet nearest the ship within 260px on its cooldown (5s → 1s over 5 ranks).
- [ ] Each weapon's 10,000-gold ultimate is offered once the weapon is owned (at once for the Blaster) and works as described: Ricochet (one bounce off a side edge, never the top), Railgun (pierces every enemy; detonates touched enemy bullets plus any within 26px, no chaining), Flak (3 half-damage shards at ±20° when a pellet reaches max range), Swarm (one retarget after a kill, with a fresh 3s lifetime).
- [ ] Each secondary's 10,000-gold ultimate is only offered at max rank and works as described: Twin Drones (second staggered drone), Chain Lightning (+20px range, every arc jumps once within 80px), Stasis Field (bullets inside the field at 25% speed).
- [ ] A weapon-upgrade pickup at max level pays +100 gold and fills the shrug meter; every 5th grants a one-hit shrug (gold ring), at most one held at a time.
- [ ] Tesla Coil arcs into the nearest enemies, Sentinel and bullets within range, capped per rank, on its cooldown (2s/60px → 0.5s/130px).
- [ ] Repulsor Field burns enemies inside it every 0.5s and, on its cooldown (8s → 2s), turns every bullet inside it into a player shot aimed at the nearest enemy.
- [ ] Every secondary holds its charge when nothing is in range, and its kills award gold and drops.

## 18. Notes for the implementing AI

- Treat this document as the single source of truth. Implement it in one pass without stopping to ask clarifying questions — where something genuinely isn't covered, choose the value most consistent with the numbers and tone already specified here.
- Keep all tunable numbers from this spec centralized in `src/config/constants.js` so future rebalancing doesn't require hunting through gameplay code.
- Prioritize getting the full loop (menu → play → dodge/shoot/collect/activate → death → game over → retry) working end-to-end before polishing visuals or adding audio.
- Commit the finished game to the repository once it satisfies the checklist in §17.

## 19. Meta progression (gold, Hangar, weapons)

Runs feed a persistent bank of gold (§13), which buys permanent upgrades between runs.

### The Hangar

Opened with H from the start screen or the Game Over screen. Up/Down or W/S select a row, Enter or Space buys, Esc/H/Backspace return to the start screen; rows and buttons are also clickable. Each row shows its next price (gold when affordable, grey when not), OWNED, MAX, or ULTIMATE, and refits show filled/empty rank pips. Trying to buy something unaffordable shows the shortfall ("NEED 1,234 MORE GOLD"); trying to buy something owned or maxed says so. A purchase saves immediately and applies from the next run.

**Major upgrades** — bought once, 5,000 gold each. Weapon rows then sell that weapon's 10,000-gold ultimate (Weapon ultimates, below):

| Upgrade | Effect |
|---|---|
| Second Ability Slot | Hold two abilities; SPACE fires them in pickup order (rules below). |
| Launch Barrier | Every run starts with a barrier that absorbs one hit (rules below). |
| Weapon: Blaster | Free and always owned; the row exists to sell the Blaster's ultimate. |
| Weapon: Lance | Unlocks the Lance and equips it. |
| Weapon: Scatter | Unlocks the Scatter and equips it. |
| Weapon: Seeker | Unlocks the Seeker and equips it. |

**Refits** — stackable ranks, each rank costing more:

| Refit | Per rank | Ranks | Cost per rank |
|---|---|---|---|
| Thrusters | +4% movement speed | 5 | 300 / 600 / 900 / 1,200 / 1,500 |
| Capacitors | Timed abilities last +10% | 5 | 300 / 600 / 900 / 1,200 / 1,500 |
| Salvage Scanner | +1% weapon-upgrade drop chance (base 5%) | 3 | 500 / 1,000 / 2,000 |
| Prospector | +5% gold from every source | 5 | 400 / 800 / 1,200 / 1,600 / 2,000 |
| Head Start | Start each run one weapon level higher (smoothed enemy count starts there too) | 3 | 800 / 1,600 / 3,200 |

Buying every major upgrade and refit rank costs 49,100 gold (25,000 for the majors, 24,100 for the refits), and the four weapon ultimates add 40,000. The Hangar's third section sells the secondary weapons (§20), which add 113,500 more for every rank and ultimate of all three.

### Second Ability Slot

- Pickups fill the first empty slot; SPACE always fires slot 1 and slot 2 moves up, so abilities fire in the order they were picked up.
- With both slots full, a new pickup replaces slot 2, so the ability queued to fire next is never lost.

### Launch Barrier

- A thin gold ring around the ship at the start of every run.
- The first hit that would cost levels (enemy bullet, ram, or Sentinel contact not already stopped by Shield or i-frames) breaks the barrier instead: no level loss, normal 0.4s i-frames, a gold flash and a "SHRUGGED" label. Like Shield, it doesn't reset the flawless streak or spoil a flawless boss fight (§7b).
- The max-level shrug (§8b) is the same ring with the same rules, so a run can earn more of them; at most one is held at a time.

### Weapons

All four weapons read the same level table (§8b) and reshape it, so upgrades, the damage rule and prestige work identically for each. Rapid Fire and Spread Shot modify the level's stats *before* the weapon reshapes them (interval becomes `min(levelInterval, 0.12s)`; a shot count below 3 becomes the 3-way spread), so both help every weapon by the same proportion and never downgrade it. Each projectile's hitbox is about 25% wider than its sprite, rounded up.

| Weapon | Shots per volley | Damage per shot | Fire interval | Projectile |
|---|---|---|---|---|
| Blaster (free) | The level's fan (§8b) | Level damage | Level interval | 4×10 sprite, 5×10 hitbox, 480 px/s |
| Lance | Same count as the level, as parallel straight-up lanes 7px apart. Each beam pierces one enemy (damages up to two different enemies, never the same one twice) and always stops at the Sentinel. | Level damage | Level interval | 2×16 sprite, 3×16 hitbox, 640 px/s |
| Scatter | `2 × levelCount + 1` pellets spread evenly across ±(20° + 3° × levelCount), each with ±3° random jitter | `max(1, round(levelDamage × 0.6))` | Level interval × 1.4 | 4×4 sprite, 5×5 hitbox, 520 px/s, vanishes after 320px (fading over the last 30%) |
| Seeker | `ceil(levelCount / 2)` missiles, launched across ±25° (straight up when only one) | Level damage × 2, then cut for each missile beyond the first, compounding: −20%, −15%, −10%, −5%, then no further cut (×1, ×0.8, ×0.68, ×0.612, ×0.5814 for 1–5+ missiles) | Level interval × 1.5 | 4×8 sprite, 5×8 hitbox, 320 px/s, turns up to 3 rad/s toward the nearest on-screen enemy (the Sentinel during its fight), expires after 3s |

### Weapon ultimates

Each weapon has one ultimate, sold for **10,000 gold** in its Hangar weapon row once the weapon is owned (straight away for the free Blaster). The row reads "ULT 10,000" in magenta and shows the same ultimate diamond as the secondaries (§20); buying it equips the weapon. The row's description names the ultimate and its effect, including for a weapon not yet owned ("OWN IT TO UNLOCK ITS ULTIMATE: …"). An owned ultimate is always on whenever its weapon is equipped: the start screen shows "LANCE  ULT" with the ultimate's description, and the HUD label reads "LANCE ULT".

| Weapon | Ultimate | Effect |
|---|---|---|
| Blaster | Ricochet | Each shot bounces once off the left or right screen edge, mirroring its angle. Never off the top; a shot that already bounced leaves through the far edge. |
| Lance | Railgun | Beams pierce every enemy, at full damage (they still stop at the Sentinel). A beam that touches an enemy bullet detonates it: that bullet and every enemy bullet within 26px are destroyed, with a small cyan flash. The beam flies on, and detonations don't chain (bullets caught in a blast don't set off blasts of their own). |
| Scatter | Flak | A pellet that flies its full 320px bursts into 3 shards at −20°, 0° and +20° around its heading, each dealing half the pellet's damage. Shards: 2×4 sprite, 3×4 hitbox, 520 px/s, 120px range, and they never burst again. A pellet that hits an enemy doesn't burst. Bursts are skipped while 400 player shots are already live, to protect the frame rate. |
| Seeker | Swarm | A missile that kills its target flies on with a fresh 3s lifetime and homes onto the next target. It retargets once: its next hit spends it, kill or not. |

### Choosing a weapon

- The start screen shows the equipped weapon: a still preview of one volley at weapon level 6 above the ship, the name between `<` and `>`, a one-line description, and one dot per weapon (filled for unlocked, outlined for locked, larger and cyan for the equipped one). A line under the dots says how many weapons remain to unlock.
- Left/Right or A/D (or clicking the arrows) cycles through **unlocked** weapons only while the PRIMARY row is focused (Up/Down switch rows; see §20 for the SECONDARY row). The choice is saved and used for every run until changed; buying a weapon in the Hangar equips it.

## 20. Secondary weapons (defensive)

A secondary weapon fights alongside the ship automatically — it needs no button. The player equips one at a time. Each is bought in the Hangar's third section, SECONDARY WEAPONS, in ranks with escalating prices (5 for the Escort Drone, 6 for the others); buying any rank equips that secondary. At max rank, the same row then sells that secondary's **ultimate** (see Ultimates below). Ranks and ultimates are permanent.

### Shared rules

- **Holding a charge:** every secondary counts its cooldown up to full and then waits. If nothing is in range when it's ready, it holds the charge and fires the instant a target appears.
- **Kills** by a secondary award gold, roll drops and count toward boss triggers, exactly like bullet-kills (§11).
- **The Sentinel** counts as an enemy for the Tesla Coil and the field's burn, measured to the edge of its body (about 28px from its center). Secondaries ignore Overdrive.
- **Selecting:** on the start screen, Up/Down (W/S) focus the PRIMARY or SECONDARY row; with SECONDARY focused, Left/Right (A/D) cycle through unlocked secondaries. The row shows the secondary's name, rank ("TESLA COIL  R4", or "ULT" once the ultimate is owned) and current stats, and its look is previewed around the ship. With none bought, it reads NONE.
- **HUD:** the bottom-right gauge (§12).
- **Hangar text:** a secondary's row description shows the current rank's stats and the next rank's ("NOW: … NEXT: …").

### Escort Drone

Small cyan drones hover beside the ship (26px to each side, 6px below, easing after it) and each shoots down the enemy bullet nearest the ship, if one is within 260px, with an instant laser.

| Rank | Cooldown | Cost |
|---|---|---|
| 1 | 5s | 1,500 |
| 2 | 4s | 2,500 |
| 3 | 3s | 3,500 |
| 4 | 2s | 5,000 |
| 5 | 1s | 7,000 |

The second drone comes from the Twin Drones ultimate (below).

### Tesla Coil

On its cooldown, arcs jagged lightning from the ship to the nearest targets within range — enemies (2 damage), the Sentinel (2 damage) and enemy bullets (destroyed) — nearest first, up to the rank's target cap.

| Rank | Cooldown | Range | Max targets | Cost |
|---|---|---|---|---|
| 1 | 2s | 60px | 3 | 2,000 |
| 2 | 1.6s | 74px | 4 | 3,000 |
| 3 | 1.25s | 88px | 5 | 4,000 |
| 4 | 1s | 102px | 6 | 5,500 |
| 5 | 0.75s | 116px | 7 | 7,500 |
| 6 | 0.5s | 130px | 8 | 10,000 |

### Repulsor Field

A translucent mint circle around the ship.

- **Burn:** every 0.5s, every enemy (and the Sentinel) touching the field takes 1 damage.
- **Deflect:** on its cooldown, if any enemy bullets are inside the field, all of them are thrown back at once: each becomes a player shot (6×6 mint dot, 8×6 hitbox, 360 px/s, 3 damage) aimed at the nearest on-screen enemy, or straight back the way it came if there is none. The circle glows brighter while the deflect is charged.

| Rank | Deflect cooldown | Field radius | Cost |
|---|---|---|---|
| 1 | 8s | 56px | 2,000 |
| 2 | 6.5s | 60px | 3,000 |
| 3 | 5s | 64px | 4,000 |
| 4 | 4s | 68px | 5,500 |
| 5 | 3s | 72px | 7,500 |
| 6 | 2s | 76px | 10,000 |

### Ultimates

Each secondary has one ultimate, sold for **10,000 gold** in its Hangar row only after its last rank is bought. In the Hangar, a maxed row's price reads "ULT 10,000" in magenta, and a diamond after the rank pips shows the ultimate's state: grey outline while locked, magenta outline when available, filled once owned (the row then reads ULTIMATE). The description shows the max-rank stats plus the ultimate's name and effect.

| Secondary | Ultimate | Effect |
|---|---|---|
| Escort Drone | Twin Drones | A second drone hovers on the other side, starting half a cooldown behind the first so the pair alternate shots. Each drone keeps its own cooldown. |
| Tesla Coil | Chain Lightning | Range +20px (150px at max rank). After each discharge, every arc jumps once more from the target it hit to the nearest target within 80px that hasn't been struck this discharge, for the same 2 damage (or destroying a bullet). |
| Repulsor Field | Stasis Field | Enemy bullets inside the field move at 25% of their speed (stacking with Overdrive). A second, fainter ring inside the field shows it's active. Slowed bullets linger in the field, so the next deflect catches more of them. |

Fully upgrading a secondary, ultimate included, costs 29,500 (Escort Drone) or 42,000 (Tesla Coil, Repulsor Field).

A save from before the drone's rank track was shortened may hold drone rank 6 (which then meant the second drone); it loads as rank 5 with Twin Drones owned.
