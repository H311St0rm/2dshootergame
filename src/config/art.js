// Drawn sprites (§9b). Each entry swaps one generated pixel-art texture for an image file;
// anything not listed here, or whose file fails to load, keeps its pixel art.
//   key     the texture it replaces: 'player', 'enemy_drone', 'boss_sentinel', ...
//           (the full list, with sizes, is in assets/sprites/README.md)
//   file    the image, relative to index.html, e.g. 'assets/sprites/player.png'
//   size    optional [width, height] in game pixels; defaults to the pixel-art sprite's size.
//           Hitboxes are set separately, so a larger drawing doesn't change collisions.
//   smooth  optional; false for pixel art drawn at its exact in-game size, to keep hard edges
//
// Example:
//   player: { file: 'assets/sprites/player.png' },
// Keep this file plain data: tools/build-standalone.mjs reads it to embed each image.
export const ART = {};
