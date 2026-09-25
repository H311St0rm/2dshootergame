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
*activating a single held ability* picked up from consumable drops. Survive
as long as possible against an endlessly escalating threat.

## 2. Core loop

1. Ship auto-fires straight ahead continuously — the player never presses a shoot button.
2. Enemies spawn from the top of the screen and move/shoot according to their type.
3. Player moves freely with keyboard input to dodge enemy bodies and bullets.
4. Player bullets kill enemies, which sometimes drop an ability pickup.
5. Player flies into a pickup to hold it, then presses one key to activate it.
6. Difficulty (spawn rate, enemy speed, enemy variety) ramps up continuously with survival time.
7. Player has 3 HP. At 0 HP, run ends. Score = kills + survival time. High score is saved locally.

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
    PlayerBullet.js
    EnemyBullet.js
    Pickup.js
  systems/
    SpawnManager.js          # Decides what/when to spawn
    DifficultyManager.js     # Tracks elapsed time, exposes current difficulty
    AbilityManager.js        # Holds current ability, handles activation/effects
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
| Max HP | 3 |
| Hit invincibility | 1.2s of i-frames after taking damage, sprite alpha flickers between 1.0 and 0.3 every 0.1s during i-frames |
| Death | At 0 HP: explosion effect (§9), then transition to GameOverScene |

### Auto-fire (base weapon)

- Fires automatically, no input needed, from the moment gameplay starts.
- Base state: 1 bullet straight up every 0.35s (~2.85 shots/sec).
- Bullet: 4×10 px yellow (`#ffe14d`) pixel sprite, speed 480 px/s upward, damage 1, destroyed off-screen or on enemy hit.
- This rate/pattern can be temporarily modified by abilities (§8).

## 7. Enemies

Four enemy types, unlocked progressively by elapsed survival time (unlock times are fixed regardless of difficulty level — see §10). All enemies spawn at y = -20 (just above the visible screen) at a random valid x within [24, 456], move downward, and are destroyed/removed once fully off-screen at the bottom (no score for enemies that escape off-screen).

| Type | Name | HP | Sprite | Move pattern | Speed (down) | Fires? | Fire pattern | Score | Unlocks at |
|---|---|---|---|---|---|---|---|---|---|
| A | Drone | 1 | 16×16 red `#ff4d4d` blocky pixel ship | Straight down | 90 px/s | No | — | 10 | 0s (from run start) |
| B | Gunner | 2 | 18×18 orange `#ff9640` pixel ship | Straight down | 70 px/s | Yes | 1 aimed bullet at player's current position every 1.8s, bullet speed 220 px/s | 20 | 15s |
| C | Weaver | 2 | 18×18 purple `#b34dff` pixel ship | Down + horizontal sine wave, amplitude 60px, period 2s | 80 px/s vertical | Yes | 1 straight-down bullet every 2.2s | 25 | 35s |
| D | Bulwark | 5 | 28×28 dark-green `#3dbf5a` large pixel ship | Straight down, slow | 50 px/s | Yes | 3-bullet spread (−20°, 0°, +20° from straight down) every 2.5s, bullet speed 200 px/s | 50 | 60s |

Enemy bullets: 6×6 px pixel dot, color matches firing enemy's palette (red/orange/purple accordingly), 1 damage to player, destroyed on player hit or off-screen.

### Spawning

- `SpawnManager` picks uniformly at random among all currently-unlocked enemy types and spawns one at the current spawn interval (see §10 for how the interval shrinks over time).

## 8. Abilities (consumable pickups)

- Enemies destroyed by a **player bullet** (not by ramming — see §11) have a **15% chance** to drop a pickup at their death position.
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

## 9. Visual generation (procedural pixel art)

All sprites are generated once at boot (`BootScene`) from small pixel-grid definitions, rendered with `Phaser.GameObjects.Graphics` and converted to textures via `generateTexture()`, then reused by reference for the rest of the game (no per-frame regeneration). This avoids any dependency on external image files.

Required generated textures:
- Player ship (24×24)
- Enemy types A–D (16×16 / 18×18 / 18×18 / 28×28)
- Player bullet (4×10)
- Enemy bullet (6×6)
- 5 pickup icons (14×14 each, one per ability color above)
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
| Player bullet ↔ Enemy | Enemy HP −1 (or bullet's damage value); bullet destroyed. If enemy HP ≤ 0: explode, award score, roll pickup drop chance (§8). |
| Player ↔ Enemy body ("ramming") | Player HP −1 (subject to i-frames); enemy is also destroyed and explodes, but awards **no score** and **no pickup drop** (shooting enemies down is the intended, rewarded playstyle; ramming is a fallback that costs the player). |
| Player ↔ Enemy bullet | Player HP −1 (subject to i-frames); bullet destroyed. |
| Player ↔ Pickup | Pickup collected into the ability slot per §8's replace rule; pickup removed; small collect flash. |

All bullets/enemies/pickups are destroyed and removed once they fully exit the screen bounds (with a small margin) to avoid unbounded object growth.

## 12. HUD

- **Top-left:** Health shown as 3 small ship-icon indicators; lose one icon per hit taken.
- **Top-right:** Live score, with "Best: N" high score directly beneath it.
- **Bottom-center:** Ability slot box — empty/greyed outline when nothing held; filled with the held ability's icon + short label + a pulsing "[SPACE]" hint when something is held.
- **Top-center (optional but recommended):** Survival timer as `mm:ss`.

## 13. Scoring & persistence

- Score += enemy's listed score value on each bullet-kill (see §7 table).
- Score += 2 points per second survived (continuous, e.g. add 1 point every 0.5s tick).
- On death, compare final score to the stored high score (`localStorage` key: `stellarDodge_highScore`); if higher, overwrite it.
- High score persists across page reloads via `localStorage` and is displayed on both the Menu and Game Over screens.

## 14. Scene flow

1. **BootScene** — generates all procedural textures (§9), then immediately starts `MenuScene`. No visible content of its own.
2. **MenuScene** — shows the game title, controls text (`Arrow Keys / WASD: Move   SPACE: Activate Ability`), current best score, and a "Click or press Enter to Start" prompt. Starts `GameScene` on input.
3. **GameScene** — full gameplay as specified above. On player death, transitions to `GameOverScene` passing the final score.
4. **GameOverScene** — shows "GAME OVER", final score, best score, and a "Press R or Click to Retry" prompt that restarts `GameScene` directly (fast-retry loop; no need to pass back through the menu).

Pause (e.g. an 'P'/Esc key that freezes the scene) is a nice-to-have, not required for v1 — include it only if it doesn't add risk to finishing the rest of the spec.

## 15. Audio (nice-to-have, not blocking)

Simple, short procedurally-generated tones (e.g. via the Web Audio API or Phaser's sound manager with generated waveforms — no external audio files) for: auto-fire tick (very quiet/short), enemy explosion, player hit, pickup collect (chime), ability activation (whoosh). **If this adds meaningful implementation risk, it's acceptable to ship v1 completely silent** — audio is explicitly out of the "must have" path.

## 16. Explicit non-goals for v1

Do not implement any of the following — they are intentionally out of scope:

- Mobile touch controls or gamepad support
- Boss fights or scripted levels/waves with a defined end
- Permanent weapon upgrades or multiple simultaneous ability slots
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
- [ ] Player bullets damage/destroy enemies, award correct score, and trigger the 15% pickup drop roll on bullet-kills only.
- [ ] Player can hold exactly one pickup at a time (new pickups replace the held one) and activate it with Space for the correct effect and duration.
- [ ] Player takes damage from enemy contact and enemy bullets, gets i-frames with visible flicker, and dies at 0 HP with an explosion and transition to Game Over.
- [ ] Difficulty visibly increases the longer the run lasts (denser spawns, faster enemies, new types unlocking).
- [ ] Game Over screen shows final score + best score; retry restarts a fresh run.
- [ ] High score persists across a full page reload.

## 18. Notes for the implementing AI

- Treat this document as the single source of truth. Implement it in one pass without stopping to ask clarifying questions — where something genuinely isn't covered, choose the value most consistent with the numbers and tone already specified here.
- Keep all tunable numbers from this spec centralized in `src/config/constants.js` so future rebalancing doesn't require hunting through gameplay code.
- Prioritize getting the full loop (menu → play → dodge/shoot/collect/activate → death → game over → retry) working end-to-end before polishing visuals or adding audio.
- Commit the finished game to the repository once it satisfies the checklist in §17.
