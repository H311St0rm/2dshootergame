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
*activating a single held ability* picked up from consumable drops. A second
stream of weapon-upgrade drops permanently grows your firepower — and
doubles as your only life bar, since getting hit strips upgrades away
instead of costing a health point. Survive as long as possible against an
endlessly escalating threat.

## 2. Core loop

1. Ship auto-fires straight ahead continuously — the player never presses a shoot button.
2. Enemies spawn from the top of the screen and move/shoot according to their type.
3. Player moves freely with keyboard input to dodge enemy bodies and bullets.
4. Player bullets kill enemies, which sometimes drop a pickup — either a one-time weapon upgrade or a holdable ability (see §8b and §8).
5. Weapon-upgrade pickups apply immediately on contact and permanently boost the ship's fire rate/damage/spread; ability pickups are held in a single slot and activated with one key press.
6. Difficulty (spawn rate, enemy speed, enemy variety) ramps up continuously with survival time.
7. Reach weapon level 10 and rack up 100 kills in a row without taking an unblocked hit, and a boss ("The Sentinel") shows up — or, as a fallback for a rougher run, simply reach 500 total kills regardless of level or damage taken. Either path can recur multiple times in one run — see §7b.
8. There is no separate HP stat — taking a hit costs weapon levels instead (see §8b). Run ends when a hit lands while at weapon level 0. Score = kills + survival time. High score is saved locally.

## 3. Tech stack & project structure

- **Engine:** Phaser 3 (latest 3.7x line), loaded via CDN `<script>` tag in `index.html`.
- **No build step.** Plain JS files loaded as ES6 modules (`<script type="module">`). No npm install, no bundler, no TypeScript compile step required to run the game. Opening `index.html` in a browser (or serving the folder statically) must be enough to play.
- **No external image/audio asset files.** All sprites are generated procedurally at runtime (see §9). This keeps the build 100% self-contained.
- **Physics:** Phaser Arcade Physics.

### File structure

```
index.html
src/
  main.js                 # Phaser game config, boots the scene list
  config/
    constants.js           # All tunable numbers from this doc, in one place
  scenes/
    BootScene.js            # Generates all textures, then starts MenuScene
    MenuScene.js             # Title screen
    GameScene.js             # Main gameplay
    GameOverScene.js         # Death screen
  entities/
    Player.js
    Enemy.js
    Boss.js
    PlayerBullet.js
    EnemyBullet.js
    Pickup.js
  systems/
    SpawnManager.js          # Decides what/when to spawn
    DifficultyManager.js     # Tracks elapsed time, exposes current difficulty
    AbilityManager.js        # Holds current ability, handles activation/effects
    WeaponManager.js         # Tracks weapon level, fire stats, and the hit/level-loss/death rule (§8b)
    BossManager.js           # Tracks both boss-trigger counters and runs the encounter (§7b)
    Starfield.js             # Parallax scrolling background
```

## 4. Screen & camera

- **Resolution:** 480 × 800 (portrait), `Phaser.Scale.FIT`, `autoCenter: CENTER_BOTH`.
- **Background color:** `#05060a` (near-black navy).
- **Background effect:** Two parallax star layers — small white/gray dots scrolling straight down at 20 px/s (far layer, dimmer/smaller dots) and 50 px/s (near layer, brighter/larger dots). When a star passes the bottom edge, wrap it back to a random x at the top. This is what sells "traveling forward" — the ship's screen position doesn't need to move for this effect.

## 5. Controls

Only two inputs exist. No mouse/touch required for v1.

| Input | Action |
|---|---|
| Arrow Keys **or** WASD | Move ship (both accepted simultaneously; either works) |
| Spacebar | Activate currently held ability (no-op if nothing held) |

Movement is free 2D, not lane-based. Diagonal movement must be normalized so diagonal speed equals straight-line speed (don't let diagonals be faster).

## 6. Player ship

| Property | Value |
|---|---|
| Sprite size | 24×24 px, generated pixel-art triangle-ship (see §9) |
| Color | Cyan `#4de3ff` body, darker `#1a6b80` outline/shading pixels |
| Hitbox | 16×16, centered on sprite (smaller than visual sprite — forgiving "bullet-hell" style hitbox) |
| Start position | x = 240 (center), y = 680 |
| Movement bounds | x: [20, 460], y: [30, 770] |
| Movement speed | 260 px/s |
| Weapon level | 0–10, starts at 0 each run. Doubles as the player's life system — see §8b. |
| Hit invincibility | 0.4s of i-frames after any hit (bullet or ram), purely to stop a single simultaneous multi-collision from registering as more than one hit. Sprite alpha flickers between 1.0 and 0.3 every 0.1s during i-frames. The Shield ability (§8) overrides this with full invulnerability. |
| Death | Taking a hit while weapon level is already 0: explosion effect (§9), then transition to GameOverScene. Full rule in §8b. |

### Auto-fire (base weapon)

- Fires automatically, no input needed, from the moment gameplay starts.
- Fire interval, damage-per-bullet, and bullet spread are all driven by the player's current **weapon level** (0–10) — see the table in §8b. At level 0 this is 1 bullet straight up every 0.35s, damage 1 per bullet.
- Bullet: 4×10 px yellow (`#ffe14d`) pixel sprite, speed 480 px/s upward, destroyed off-screen or on enemy hit.
- Temporary abilities (Rapid Fire, Spread Shot in §8) can further modify interval/spread on top of the current weapon level — §8b defines exactly how they combine.

## 7. Enemies

Four enemy types, unlocked progressively by elapsed survival time (unlock times are fixed regardless of difficulty level — see §10). All enemies spawn at y = -20 (just above the visible screen) at a random valid x within [24, 456], move downward, and are destroyed/removed once fully off-screen at the bottom (no score for enemies that escape off-screen).

| Type | Name | HP | Sprite | Move pattern | Speed (down) | Fires? | Fire pattern | Score | Unlocks at |
|---|---|---|---|---|---|---|---|---|---|
| A | Drone | 1 | 16×16 red `#ff4d4d` blocky pixel ship | Straight down | 90 px/s | No | — | 10 | 0s (from run start) |
| B | Gunner | 2 | 18×18 orange `#ff9640` pixel ship | Straight down | 70 px/s | Yes | 1 aimed bullet at player's current position every 1.8s, bullet speed 220 px/s | 20 | 15s |
| C | Weaver | 2 | 18×18 purple `#b34dff` pixel ship | Down + horizontal sine wave, amplitude 60px, period 2s | 80 px/s vertical | Yes | 1 straight-down bullet every 2.2s | 25 | 35s |
| D | Bulwark | 5 | 28×28 dark-green `#3dbf5a` large pixel ship | Straight down, slow | 50 px/s | Yes | 3-bullet spread (−20°, 0°, +20° from straight down) every 2.5s, bullet speed 200 px/s | 50 | 60s |

Enemy bullets: 6×6 px pixel dot, color matches firing enemy's palette (red/orange/purple accordingly). On hitting the player it triggers the weapon-level hit rule (§8b); the bullet is destroyed on player hit or off-screen.

### Spawning

- `SpawnManager` picks uniformly at random among all currently-unlocked enemy types and spawns one at the current spawn interval (see §10 for how the interval shrinks over time).

## 7b. Boss encounters

A recurring boss fight with two independent trigger paths, so a clean/skilled run and a rougher one both eventually see one.

### Triggers

Track two counters, both starting at 0 when gameplay starts:

- **`bossStreak`** — the "flawless streak." Increments by 1 for every enemy kill made while the player's weapon level is exactly 10 (max, per §8b). Resets to 0 the instant an **unblocked** hit lands (any hit that isn't absorbed by the Shield ability, §8) — since a hit at level 10 always drops the player to 7, any unblocked hit means the streak is broken. A Shield-blocked hit does **not** reset it. Triggers the boss at **100**.
- **`totalKillsSinceLastBoss`** — a simple fallback counter. Increments by 1 for every enemy kill, regardless of weapon level or damage taken. Triggers the boss at **500**, so a run that keeps taking hits (and can never sustain the flawless streak) still guarantees a boss eventually.

Whichever counter reaches its threshold first triggers the boss immediately. On trigger, **both** counters reset to 0, so the next boss (of either run) needs a fresh 100-streak or 500-kill count from that point.

Bosses can recur any number of times in a single run if the player keeps re-qualifying by either path.

### Boss encounter flow

1. On trigger, all current on-screen regular enemies and their bullets are instantly cleared (no score awarded for the clear — it's just a clean transition into the fight).
2. Regular enemy spawning (§7) pauses for the duration of the fight.
3. The Sentinel enters from the top (y = -40), moving down to a hover position (y = 150) at 100 px/s, then holds there, moving side to side in a sine pattern (amplitude 150px, period 4s) for the rest of the fight.
4. The Sentinel attacks on two independent timers:
   - **Fan spread:** every 1.5s, fires a 7-bullet fan from −60° to +60° (relative to straight down), bullet speed 180 px/s.
   - **Aimed burst:** every 4s, fires 3 bullets aimed at the player's current position, 0.15s apart, bullet speed 260 px/s.
5. Touching the Sentinel's body applies the same universal hit rule as everything else (§8b) — no special-case damage.
6. HP scales with how many Sentinels the player has already defeated this run: `3000 + 1500 * (bossIndex - 1)` (1st fight: 3000 HP, 2nd: 4500, 3rd: 6000, …).
7. On defeat: a large explosion (scaled-up particle burst), award `500 * bossIndex` bonus score, and guarantee one Ability pickup drop at the death position (a Weapon Upgrade would be wasted if the player is already at level 10, so the Sentinel always drops an ability instead). Regular spawning resumes and `bossIndex` increments for next time.

### Sentinel appearance

- 64×64 px procedurally-generated pixel-art sprite (see §9), crimson `#c23b3b` body with darker `#7a1f1f` plating detail.

## 8. Abilities (consumable pickups)

- Enemies destroyed by a **player bullet** (not by ramming — see §11) have a **3% chance** to drop an ability pickup at their death position. This roll is independent of the weapon-upgrade roll in §8b — see there for how the two combine.
- Pickup: 14×14 px diamond/orb sprite, distinct color per ability (below), falls straight down at 60 px/s, despawns if it exits the bottom of the screen uncollected.
- Player collects a pickup by touching it with their hitbox.
- **Single ability slot.** The player holds at most one ability at a time. Collecting a new pickup while already holding one **replaces** the held ability (the old one is lost — no stacking, no queue).
- Pressing **Space** with an ability held: consumes it and immediately applies its effect. Pressing Space with nothing held: does nothing.
- All 5 abilities are equally weighted (20% each) when a drop occurs.

| Ability | Icon color | Effect | Duration |
|---|---|---|---|
| Shield | Light blue `#4de3ff`, pulsing ring | Full invulnerability — ignores all damage and skips i-frame damage-flicker | 4s |
| Nova Bomb | White/orange `#ffb04d` burst | Instant: destroys every enemy currently on screen (awards their normal score) and clears every enemy bullet on screen. Big radial flash VFX. | Instant (no duration) |
| Rapid Fire | Yellow `#fff34d` bolt | Auto-fire interval reduced from 0.35s to 0.12s | 5s |
| Spread Shot | Green `#4dff88` trident | Auto-fire becomes 3-way spread (−15°, 0°, +15°) instead of single bullet; interval unchanged | 5s |
| Overdrive (time slow) | Purple `#b34dff` hourglass | All enemies and enemy bullets move at 40% of their normal speed. Player and player bullets unaffected. | 4s |

## 8b. Weapon upgrades (permanent progression + life system)

This is a second, independent pickup track from the ability system in §8. It permanently strengthens the player's auto-fire **and doubles as the player's only life system** — there is no separate HP stat.

### Upgrade pickups

- 14×14 px gold (`#ffd700`) chevron/arrow-shaped pixel sprite — visually distinct from the diamond-shaped ability pickups. Falls straight down at 60 px/s, despawns off-screen if uncollected.
- Drop rolls happen on every **bullet-kill** (not ram-kills — same rule as ability drops, §11), and are **fully independent** of the ability-drop roll in §8:
  1. Roll 5% for a Weapon Upgrade drop.
  2. Separately, roll 3% for an Ability drop (§8).
  3. Both can succeed on the same kill (0.15% of kills) — in that case, spawn both pickups at the death position, offset a few pixels apart horizontally so they don't overlap. Both can also both fail, in which case nothing drops.
- Enemies killed by the Nova Bomb ability each roll independently using the same rules above.
- Collecting an Upgrade pickup increases the player's weapon level by 1, up to a maximum of 10. Collecting one while already at level 10 has no further effect (the pickup is simply consumed).

### Weapon level table

Damage, fire interval, and bullet pattern all come from the player's current level. Bullet angles are measured from straight up (0°).

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
| 10 (max) | 0.15s | 6 | 5 (−25°, −12°, 0°, +12°, +25°) |

### Interaction with temporary abilities (§8)

- **Rapid Fire** sets the fire interval to a flat 0.12s for its duration. This is always faster than every level's own interval (0.15s–0.35s), so it always takes effect regardless of current level.
- **Spread Shot** sets the bullet pattern to the 3-way (−15°, 0°, +15°) spread for its duration — *unless* the player's current weapon level already fires 3 or more bullets (level 6+), in which case the level's own (equal-or-wider) pattern is kept instead, so the ability can never downgrade a high-level player.
- Damage-per-bullet always comes from the current weapon level; neither ability changes it.
- These two systems are otherwise fully independent: the single ability slot (§8) and the weapon level (this section) don't interact with or consume each other.

### Taking damage

Every hit — whether from an enemy bullet or from ramming an enemy body — costs exactly the same thing: weapon levels, not HP. There is no per-enemy or per-source damage variance ("any hit does the same damage").

- If the player's weapon level is **greater than 0** when hit: `level = max(0, level - 3)`. The player survives (subject to the 0.4s hit-invincibility in §6), but permanently loses the fire-rate/damage/spread that came with those levels until more upgrades are collected.
- If the player's weapon level is **already 0** when hit: there are no levels left to remove, so the hit kills the player instead.
- The Shield ability (§8) fully blocks this — no level loss and no death while Shield is active.
- Weapon level resets to 0 at the start of every new run (it is not a persistent meta-progression stat).

## 9. Visual generation (procedural pixel art)

All sprites are generated once at boot (`BootScene`) from small pixel-grid definitions, rendered with `Phaser.GameObjects.Graphics` and converted to textures via `generateTexture()`, then reused by reference for the rest of the game (no per-frame regeneration). This avoids any dependency on external image files.

Required generated textures:
- Player ship (24×24)
- Enemy types A–D (16×16 / 18×18 / 18×18 / 28×28)
- The Sentinel boss (64×64, see §7b)
- Player bullet (4×10)
- Enemy bullet (6×6)
- 5 ability pickup icons (14×14 each, one per ability color above)
- 1 weapon upgrade pickup icon (14×14, gold `#ffd700` chevron — visually distinct shape from the ability orbs)
- A small square particle (4×4, white) reused (tinted per-enemy-color) for explosion bursts

**Explosion effect:** on any enemy or player death, emit 8–12 of the particle squares outward from the death position at random angles/speeds, tinted to the destroyed entity's main color, fading out over 0.4s.

## 10. Difficulty curve (endless survival)

- Track `elapsedSurvivalSeconds` from the moment gameplay starts.
- `difficultyLevel = floor(elapsedSurvivalSeconds / 20)` (increases by 1 every 20 seconds).
- Spawn interval (seconds between enemy spawns): `max(0.45, 1.6 - difficultyLevel * 0.12)`.
- Global enemy speed multiplier applied to all enemy movement speeds: `1 + difficultyLevel * 0.05`.
- Enemy type unlocks are based on `elapsedSurvivalSeconds` directly (fixed thresholds in §7's table), independent of `difficultyLevel`.
- There is no difficulty cap for v1 — it keeps escalating until the player dies.

## 11. Collision rules

| Collision | Result |
|---|---|
| Player bullet ↔ Enemy | Enemy HP − (bullet's current damage-per-bullet, from §8b); bullet destroyed. If enemy HP ≤ 0: explode, award score, roll pickup drop chance (§8b). |
| Player ↔ Enemy body ("ramming") | Player takes a hit per the weapon-level rule in §8b (subject to i-frames); enemy is also destroyed and explodes, but awards **no score** and **no pickup drop** (shooting enemies down is the intended, rewarded playstyle; ramming is a fallback that costs the player). |
| Player ↔ Enemy bullet | Player takes a hit per the weapon-level rule in §8b (subject to i-frames); bullet destroyed. |
| Player ↔ Ability pickup | Collected into the ability slot per §8's replace rule; pickup removed; small collect flash. |
| Player ↔ Upgrade pickup | Weapon level +1 (max 10) per §8b; pickup removed; small collect flash. |

All bullets/enemies/pickups are destroyed and removed once they fully exit the screen bounds (with a small margin) to avoid unbounded object growth.

## 12. HUD

- **Top-left:** Weapon Level meter — 10 small pip segments, filled left-to-right up to the current level (0 filled means the next hit is lethal). This single meter replaces a traditional health bar; see §8b.
- **Top-right:** Live score, with "Best: N" high score directly beneath it.
- **Bottom-center:** Ability slot box — empty/greyed outline when nothing held; filled with the held ability's icon + short label + a pulsing "[SPACE]" hint when something is held.
- **Top-center (optional but recommended):** Survival timer as `mm:ss`.
- **Below the survival timer, only while weapon level is 10:** the flawless-streak progress, e.g. "Streak: 67/100" (§7b).
- **While a boss is active:** a boss HP bar spanning the top of the screen, labeled "THE SENTINEL", replacing the streak readout for the fight's duration.

## 13. Scoring & persistence

- Score += enemy's listed score value on each bullet-kill (see §7 table).
- Score += 2 points per second survived (continuous, e.g. add 1 point every 0.5s tick).
- On death, compare final score to the stored high score (`localStorage` key: `stellarDodge_highScore`); if higher, overwrite it.
- High score persists across page reloads via `localStorage` and is displayed on both the Menu and Game Over screens.

## 14. Scene flow

1. **BootScene** — generates all procedural textures (§9), then immediately starts `MenuScene`. No visible content of its own.
2. **MenuScene** — shows the game title, controls text (`Arrow Keys / WASD: Move   SPACE: Activate Ability`), current best score, and a "Click or press Enter to Start" prompt. Starts `GameScene` on input.
3. **GameScene** — full gameplay as specified above. On player death, transitions to `GameOverScene` passing the final score.
4. **GameOverScene** — shows "GAME OVER", final score, best score, and a "Press R or Click to Retry" prompt that restarts `GameScene` directly (fast-retry loop; no need to pass back through the menu). Optionally (nice-to-have, not required) also show the max weapon level reached during the run.

Pause (e.g. an 'P'/Esc key that freezes the scene) is a nice-to-have, not required for v1 — include it only if it doesn't add risk to finishing the rest of the spec.

## 15. Audio (nice-to-have, not blocking)

Simple, short procedurally-generated tones (e.g. via the Web Audio API or Phaser's sound manager with generated waveforms — no external audio files) for: auto-fire tick (very quiet/short), enemy explosion, player hit / weapon-level-down, weapon-level-up chime, ability collect chime, ability activation (whoosh). **If this adds meaningful implementation risk, it's acceptable to ship v1 completely silent** — audio is explicitly out of the "must have" path.

## 16. Explicit non-goals for v1

Do not implement any of the following — they are intentionally out of scope:

- Mobile touch controls or gamepad support
- Scripted levels/waves with a defined end (the boss in §7b is a recurring endless-mode event, not a level structure)
- Multiple simultaneous ability slots (still just one at a time; weapon level already has its own cap of 10)
- Multiplayer
- Any save/meta-progression beyond the single high-score value
- Story, dialogue, or cutscenes
- Settings/options menu, volume controls
- Real image/audio asset files (everything is procedural per §9 and §15)

## 17. Definition of done (acceptance checklist)

- [ ] `index.html` opens directly in a browser (or via a static file server) with zero build step and zero console errors.
- [ ] Menu screen shows title, controls, best score, and a working start prompt.
- [ ] Ship moves smoothly with Arrow Keys and WASD, normalized diagonal speed, clamped to bounds.
- [ ] Ship auto-fires continuously with no player input required.
- [ ] All 4 enemy types appear, each gated by its correct unlock time, each with correct movement and (where applicable) firing behavior.
- [ ] Player bullets damage/destroy enemies using the current weapon level's damage value, award correct score, and trigger the independent 5% upgrade / 3% ability drop rolls on bullet-kills only (both may drop from the same kill).
- [ ] Collecting an Upgrade pickup increases weapon level (capped at 10) and visibly changes fire rate, damage, and bullet spread per the §8b table.
- [ ] Player can hold exactly one ability at a time (new ability pickups replace the held one) and activate it with Space for the correct effect and duration.
- [ ] Taking a hit while weapon level > 0 removes 3 levels (clamped at 0) and applies the 0.4s i-frames with visible flicker; taking a hit while already at level 0 kills the player, triggering the explosion and Game Over transition.
- [ ] Weapon level resets to 0 at the start of each new run.
- [ ] Reaching weapon level 10 and getting 100 kills in a row without an unblocked hit triggers a boss; the streak resets on any unblocked hit but not on a Shield-blocked one.
- [ ] Reaching 500 total kills (regardless of level or damage) also triggers a boss, as a fallback for runs that never sustain the flawless streak.
- [ ] On trigger, both boss counters reset to 0, on-screen regular enemies/bullets are cleared, and regular spawning pauses until the boss is defeated.
- [ ] The Sentinel fires its fan-spread and aimed-burst patterns on the correct timers and can be damaged/destroyed by player bullets using current weapon-level damage.
- [ ] Defeating a boss awards `500 * bossIndex` bonus score, guarantees an ability drop, resumes normal spawning, and scales HP up (`3000 + 1500 * (bossIndex-1)`) for the next boss in the same run.
- [ ] Difficulty visibly increases the longer the run lasts (denser spawns, faster enemies, new types unlocking).
- [ ] Game Over screen shows final score + best score; retry restarts a fresh run.
- [ ] High score persists across a full page reload.

## 18. Notes for the implementing AI

- Treat this document as the single source of truth. Implement it in one pass without stopping to ask clarifying questions — where something genuinely isn't covered, choose the value most consistent with the numbers and tone already specified here.
- Keep all tunable numbers from this spec centralized in `src/config/constants.js` so future rebalancing doesn't require hunting through gameplay code.
- Prioritize getting the full loop (menu → play → dodge/shoot/collect/activate → death → game over → retry) working end-to-end before polishing visuals or adding audio.
- Commit the finished game to the repository once it satisfies the checklist in §17.
