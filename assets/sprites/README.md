# Drawing sprites for Stellar Dodge

Any sprite in the game can be swapped for a drawing. A drawing replaces the built-in pixel art
for that one sprite, and everything you haven't drawn yet keeps working as it is.

## The ship (start here)

- **What:** the player's ship, seen from directly above, **nose pointing straight up**.
  The bottom edge is the back of the ship, so an engine glow there reads well.
- **File:** PNG with a **transparent background**.
- **Canvas:** square, **96×96 px** is ideal. Bigger is fine, since the game shrinks the drawing to fit.
  Leave a couple of pixels of empty margin around the ship.
- **How big it really is:** in play the ship is only **24×24 game pixels**, about 3% of the
  screen's height. Bold shapes and strong contrast survive that, while fine linework and small text
  disappear. Shrink your drawing to 24×24 to check it still reads. The start screen
  shows it larger (60 px), so detail isn't completely wasted.
- **Hitbox:** only the **middle 16×16** of the ship's 24×24 box can be hit. Keep the body
  or cockpit centered; wings and fins can stick out past it.
- **Colors:** the background is near-black (`#05060a`). Enemies are red, orange, purple and green,
  and so are their bullets. Keep those out of the ship's main colors so you can always tell
  the player apart. The current ship is cyan (`#4de3ff`) with white highlights and an orange engine.
- **No extra versions needed:** the game flashes the ship red when it's hit and makes it flicker
  while it's invulnerable.
- **Pixel art?** Also welcome. Draw it at exactly the in-game size (24×24 for the ship) so the
  game uses it pixel for pixel.

## Every sprite and its in-game size

All are seen from above. The player's things point **up**; enemies fly toward the player and
point **down**.

| File name | What it is | In-game size (px) |
|---|---|---|
| `player.png` | The player's ship | 24×24 |
| `drone.png` | The player's escort drone (a secondary weapon) | 10×10 |
| `enemy_drone.png` | Small basic enemy | 16×16 |
| `enemy_gunner.png` | Enemy that shoots straight at the player | 18×18 |
| `enemy_weaver.png` | Enemy that weaves side to side | 18×18 |
| `enemy_bulwark.png` | Big, tough enemy | 28×28 |
| `boss_sentinel.png` | The boss | 64×64 |
| `pickup_upgrade.png` | Weapon-upgrade pickup | 14×14 |
| `pickup_shield.png`, `pickup_nova.png`, `pickup_rapid.png`, `pickup_spread.png`, `pickup_overdrive.png` | Ability pickups | 14×14 |
| `player_bullet.png`, `bullet_lance.png`, `bullet_pellet.png`, `bullet_shard.png`, `bullet_seeker.png` | Player projectiles | 4×10, 2×16, 4×4, 2×4, 4×8 |
| `ebullet_orange.png`, `ebullet_purple.png`, `ebullet_green.png`, `ebullet_boss.png` | Enemy bullets | 6×6 |

Draw at 4× these sizes, or larger. Projectiles and bullets are so small that pixel art
at their exact size usually looks best.

## Adding a drawing to the game

1. Put the PNG in this folder (`assets/sprites/`), named as in the table, e.g. `player.png`.
   On GitHub: open this folder, then **Add file → Upload files**.
2. Add one line for it in [`src/config/art.js`](../../src/config/art.js):
   `player: { file: 'assets/sprites/player.png' },`
   To show it larger without changing its hitbox, add a size: `size: [32, 32]`.
3. Rebuild the shareable single file: `node tools/build-standalone.mjs`.

Claude can do steps 2 and 3 for you. A copy of the game hosted on GitHub Pages uses the new
drawing as soon as it's pushed.
