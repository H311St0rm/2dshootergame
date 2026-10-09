import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants.js';

// The world is always GAME_WIDTH × GAME_HEIGHT, but the canvas is rendered at the size it is
// actually shown (its CSS size × devicePixelRatio) and every camera zooms the world up to fill
// it (§4). Without this the browser stretches a 480×800 picture across the screen and small
// text turns blocky. Text renders at the same scale (textStyle), so it lands 1:1 on screen pixels.

// 480 and 800 share a factor of 160, so scales in 1/160 steps keep the canvas exactly 3:5.
const SCALE_STEP = 160;
const MIN_SCALE = 1;
const MAX_SCALE = 4;

let renderScale = 1;

export function getRenderScale() {
  return renderScale;
}

// The scale that renders a game shown at width × height CSS pixels at one canvas pixel per
// screen pixel. Below 1× the browser shrinks the canvas instead; above 4× it stretches it.
function scaleFor(width, height) {
  const cssScale = Math.min(width / GAME_WIDTH, height / GAME_HEIGHT);
  const scale = Phaser.Math.Clamp(cssScale * (window.devicePixelRatio || 1), MIN_SCALE, MAX_SCALE);
  return Math.round(scale * SCALE_STEP) / SCALE_STEP;
}

// Picks the starting canvas size from the page element the game is about to fill.
export function initialCanvasSize(parent) {
  renderScale = scaleFor(parent.clientWidth, parent.clientHeight);
  return { width: GAME_WIDTH * renderScale, height: GAME_HEIGHT * renderScale };
}

// Each scene calls this at the top of create(): its camera shows exactly the game world.
export function fitCamera(scene) {
  scene.cameras.main.setZoom(renderScale).centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
}

// Phaser's shake moves the view by intensity × canvas size × zoom², so dividing by zoom² keeps
// every shake the same share of the screen at any render scale.
export function shakeCamera(scene, durationMs, intensity) {
  const camera = scene.cameras.main;
  camera.shake(durationMs, intensity / camera.zoom ** 2);
}

function updateTexts(objects) {
  for (const object of objects) {
    if (object instanceof Phaser.GameObjects.Text) object.setResolution(renderScale);
    else if (object.list) updateTexts(object.list);
  }
}

// When the window is resized or zoomed (or moves to a screen with another pixel density),
// re-render at the new size: resize the canvas, refit every live scene's camera, re-render text.
export function trackDisplaySize(game) {
  game.scale.on(Phaser.Scale.Events.RESIZE, (gameSize, baseSize, displaySize) => {
    const next = scaleFor(displaySize.width, displaySize.height);
    if (next === renderScale) return;
    renderScale = next;
    // Re-emits RESIZE, which returns early above now that renderScale matches.
    game.scale.resize(GAME_WIDTH * next, GAME_HEIGHT * next);
    for (const scene of game.scene.getScenes(false)) {
      const sys = scene.sys;
      if (!sys.isActive() && !sys.isPaused() && !sys.isSleeping()) continue;
      fitCamera(scene);
      updateTexts(scene.children.list);
    }
  });
}
