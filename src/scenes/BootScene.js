import { ABILITIES, ABILITY_KEYS } from '../config/constants.js';
import { SPRITES, ENEMY_BULLET_SHAPE, ENEMY_BULLET_COLORS, ABILITY_GLYPHS } from '../config/sprites.js';

function expandRows(def) {
  if (!def.mirror) return def.rows;
  return def.rows.map((half) => {
    const left = def.mirror === 'odd' ? half.slice(0, -1) : half;
    return half + [...left].reverse().join('');
  });
}

function darken(color, factor) {
  const r = Math.floor(((color >> 16) & 0xff) * factor);
  const g = Math.floor(((color >> 8) & 0xff) * factor);
  const b = Math.floor((color & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}

function abilityIconRows(glyph) {
  const size = 14;
  const center = (size - 1) / 2;
  const glyphOffset = (size - glyph.length) / 2;
  const rows = [];
  for (let y = 0; y < size; y++) {
    let row = '';
    for (let x = 0; x < size; x++) {
      const dist = Math.abs(x - center) + Math.abs(y - center);
      const gx = x - glyphOffset;
      const gy = y - glyphOffset;
      const inGlyph = gy >= 0 && gy < glyph.length && gx >= 0 && gx < glyph[gy].length && glyph[gy][gx] === '#';
      if (dist > 7) row += '.';
      else if (dist === 7) row += 'o';
      else if (inGlyph) row += 'w';
      else row += 'b';
    }
    rows.push(row);
  }
  return rows;
}

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    for (const [key, def] of Object.entries(SPRITES)) {
      this.drawGrid(key, expandRows(def), def.palette, def.scale);
    }

    for (const [key, colors] of Object.entries(ENEMY_BULLET_COLORS)) {
      this.drawGrid(key, ENEMY_BULLET_SHAPE, { r: colors.rim, c: colors.core }, 1);
    }

    for (const kind of ABILITY_KEYS) {
      const color = ABILITIES[kind].color;
      const palette = { o: darken(color, 0.45), b: color, w: 0xffffff };
      this.drawGrid(`pickup_${kind}`, abilityIconRows(ABILITY_GLYPHS[kind]), palette, 1);
    }

    this.drawShieldRing();
    this.drawFlash();

    this.scene.start('MenuScene');
  }

  drawGrid(key, rows, palette, scale) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const color = palette[row[x]];
        if (color === undefined) continue;
        g.fillStyle(color, 1);
        g.fillRect(x * scale, y * scale, scale, scale);
      }
    });
    g.generateTexture(key, rows[0].length * scale, rows.length * scale);
    g.destroy();
  }

  drawShieldRing() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.lineStyle(2, ABILITIES.shield.color, 1);
    g.strokeCircle(20, 20, 18);
    g.lineStyle(1, 0xe8fdff, 0.6);
    g.strokeCircle(20, 20, 15);
    g.generateTexture('shield_ring', 40, 40);
    g.destroy();
  }

  drawFlash() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(32, 32, 32);
    g.generateTexture('flash', 64, 64);
    g.destroy();
  }
}
