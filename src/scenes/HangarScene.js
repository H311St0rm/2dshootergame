import { GAME_WIDTH, HANGAR } from '../config/constants.js';
import Starfield from '../systems/Starfield.js';
import Sfx from '../systems/Sfx.js';
import { describeSecondary } from '../systems/SecondaryManager.js';
import { loadProfile, purchase, nextCost, rankOf, isOwned, hasUltimate, nextIsUltimate } from '../systems/profile.js';
import { textStyle, formatGold } from '../ui/Hud.js';

const CX = GAME_WIDTH / 2;
const ROW = { left: 24, right: GAME_WIDTH - 24, height: 28, step: 32 };
const GROUPS = [
  { label: 'MAJOR UPGRADES - BUY ONCE', items: HANGAR.major },
  { label: 'REFITS - STACKABLE RANKS', items: HANGAR.refits },
  { label: 'SECONDARY WEAPONS - UPGRADE RANKS', items: HANGAR.secondaries },
];
const FIRST_LABEL_Y = 96;
const LABEL_TO_ROW = 22;
const ROW_TO_LABEL = 30;
// Pips end left of the widest status text ("ULT 10,000"), leaving room for the ultimate diamond.
const PIP = { size: 8, gap: 3, rightEdge: ROW.right - 112 };

const COLORS = {
  affordable: '#ffd700',
  tooExpensive: '#55606e',
  owned: '#4dff88',
  ultimate: '#ff7bf2',
  error: '#ff6060',
};
const ULTIMATE_HEX = 0xff7bf2;
const BG_HEX = 0x05060a;

export default class HangarScene extends Phaser.Scene {
  constructor() {
    super('HangarScene');
  }

  create() {
    this.starfield = new Starfield(this);
    this.sfx = new Sfx(this);
    this.profile = loadProfile();
    this.selected = 0;
    this.leaving = false;

    this.add.text(CX, 34, 'HANGAR', { ...textStyle(32, '#4de3ff'), stroke: '#0a2a33', strokeThickness: 6 }).setOrigin(0.5);
    this.goldText = this.add.text(CX, 68, '', textStyle(17, '#ffd700')).setOrigin(0.5);

    this.highlight = this.add.graphics();
    this.pips = this.add.graphics();
    this.rows = [];
    let y = FIRST_LABEL_Y;
    for (const group of GROUPS) {
      this.add.text(ROW.left, y, group.label, textStyle(11, '#7fa9b5')).setOrigin(0, 0.5);
      y += LABEL_TO_ROW;
      for (const item of group.items) {
        const index = this.rows.length;
        this.add
          .zone(CX, y, ROW.right - ROW.left, ROW.height)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.select(index));
        const name = this.add.text(ROW.left + 10, y, item.name, textStyle(14)).setOrigin(0, 0.5);
        const status = this.add.text(ROW.right - 10, y, '', textStyle(13)).setOrigin(1, 0.5);
        this.rows.push({ item, y, name, status });
        y += ROW.step;
      }
      y += ROW_TO_LABEL - ROW.step + LABEL_TO_ROW / 2;
    }

    const footerTop = y;
    this.add.rectangle(CX, footerTop, ROW.right - ROW.left, 1, 0x2a3240).setOrigin(0.5, 0);
    this.blurb = this.add
      .text(CX, footerTop + 12, '', { ...textStyle(12, '#c9d3e0'), align: 'center', wordWrap: { width: 430 } })
      .setOrigin(0.5, 0);
    this.message = this.add.text(CX, footerTop + 94, '', textStyle(13)).setOrigin(0.5);
    this.buyButton = this.button(CX - 90, footerTop + 126, 'ENTER  BUY', '#4dff88', () => this.buy());
    this.button(CX + 90, footerTop + 126, 'ESC  BACK', '#ffd700', () => this.back());

    const keyboard = this.input.keyboard;
    const onKey = (handler) => (event) => {
      if (!event.repeat) handler();
    };
    keyboard.on('keydown-UP', onKey(() => this.move(-1)));
    keyboard.on('keydown-W', onKey(() => this.move(-1)));
    keyboard.on('keydown-DOWN', onKey(() => this.move(1)));
    keyboard.on('keydown-S', onKey(() => this.move(1)));
    keyboard.on('keydown-ENTER', onKey(() => this.buy()));
    keyboard.on('keydown-SPACE', onKey(() => this.buy()));
    keyboard.on('keydown-ESC', onKey(() => this.back()));
    keyboard.on('keydown-H', onKey(() => this.back()));
    keyboard.on('keydown-BACKSPACE', onKey(() => this.back()));

    this.refresh();
  }

  update(time, delta) {
    this.starfield.update(delta / 1000);
  }

  button(x, y, label, color, onClick) {
    return this.add
      .text(x, y, label, textStyle(16, color))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick);
  }

  move(direction) {
    this.select((this.selected + direction + this.rows.length) % this.rows.length);
  }

  select(index) {
    this.selected = index;
    this.message.setText('');
    this.refresh();
  }

  buy() {
    const item = this.rows[this.selected].item;
    const cost = nextCost(this.profile, item);
    if (cost === null) {
      const done = item.ultimate ? 'ULTIMATE ALREADY OWNED' : item.costs ? 'ALREADY AT MAX RANK' : 'ALREADY OWNED';
      this.showMessage(done, COLORS.owned);
      return;
    }
    const buyingUltimate = nextIsUltimate(this.profile, item);
    if (!purchase(this.profile, item)) {
      this.sfx.denied();
      this.showMessage(`NEED ${formatGold(cost - this.profile.gold)} MORE GOLD`, COLORS.error);
      return;
    }
    const equipped = item.weapon || item.secondary ? ' - EQUIPPED' : '';
    if (buyingUltimate) {
      this.sfx.prestige();
      this.showMessage(`UNLOCKED ${item.ultimate.name}${equipped}`, COLORS.ultimate);
    } else {
      this.sfx.levelUp();
      const suffix = item.costs ? ` - RANK ${rankOf(this.profile, item.id)}` : '';
      this.showMessage(`BOUGHT ${item.name}${suffix}${equipped}`, COLORS.owned);
    }
    this.refresh();
  }

  showMessage(text, color) {
    this.message.setText(text).setColor(color);
  }

  back() {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start('MenuScene');
  }

  refresh() {
    const gold = this.profile.gold;
    this.goldText.setText(`GOLD ${formatGold(gold)}`);
    this.pips.clear();

    for (const row of this.rows) {
      const { item } = row;
      const cost = nextCost(this.profile, item);
      if (cost === null) {
        row.status.setText(item.ultimate ? 'ULTIMATE' : item.costs ? 'MAX' : 'OWNED').setColor(COLORS.owned);
      } else if (nextIsUltimate(this.profile, item)) {
        row.status.setText(`ULT ${formatGold(cost)}`).setColor(gold >= cost ? COLORS.ultimate : COLORS.tooExpensive);
      } else {
        row.status.setText(formatGold(cost)).setColor(gold >= cost ? COLORS.affordable : COLORS.tooExpensive);
      }
      row.name.setColor(!item.costs && isOwned(this.profile, item.id) ? '#7fa9b5' : '#ffffff');
      if (item.costs) this.drawPips(row.y, rankOf(this.profile, item.id), item.costs.length);
      if (item.ultimate) this.drawUltimateMark(row.y, item);
    }

    const row = this.rows[this.selected];
    const g = this.highlight;
    g.clear();
    g.fillStyle(0x4de3ff, 0.12);
    g.fillRect(ROW.left, row.y - ROW.height / 2, ROW.right - ROW.left, ROW.height);
    g.lineStyle(1, 0x4de3ff, 0.8);
    g.strokeRect(ROW.left, row.y - ROW.height / 2, ROW.right - ROW.left, ROW.height);

    this.blurb.setText(this.describe(row.item));
    this.buyButton.setAlpha(nextCost(this.profile, row.item) === null ? 0.35 : 1);
  }

  describe(item) {
    if (!item.costs) return item.blurb;
    const rank = rankOf(this.profile, item.id);
    const max = item.costs.length;
    if (!item.secondary) return `${item.blurb}\nRANK ${rank} OF ${max}`;
    const id = item.secondary;
    if (rank === 0) return `${item.blurb}\nRANK 1: ${describeSecondary(id, 1)}`;
    if (rank < max) {
      return `${item.blurb}\nNOW: ${describeSecondary(id, rank)}\nNEXT: ${describeSecondary(id, rank + 1)}`;
    }
    const owned = hasUltimate(this.profile, id);
    const heading = owned ? 'ULTIMATE OWNED' : 'ULTIMATE AVAILABLE';
    return `MAX RANK: ${describeSecondary(id, rank, owned)}\n${heading}: ${item.ultimate.name}\n${item.ultimate.blurb}`;
  }

  // A diamond after the rank pips: outlined until the ultimate is bought, then filled.
  drawUltimateMark(y, item) {
    const g = this.pips;
    const x = PIP.rightEdge + 10;
    const r = 5;
    const owned = hasUltimate(this.profile, item.secondary);
    const available = nextIsUltimate(this.profile, item);
    const diamond = (radius) => [
      { x, y: y - radius },
      { x: x + radius, y },
      { x, y: y + radius },
      { x: x - radius, y },
    ];
    // Outlines are built from two fills: diagonal strokes on this shared Graphics
    // object did not render in testing, while fills always do.
    g.fillStyle(owned || available ? ULTIMATE_HEX : 0x55606e, 1);
    g.fillPoints(diamond(r), true);
    if (!owned) {
      g.fillStyle(BG_HEX, 1);
      g.fillPoints(diamond(r - 1.5), true);
    }
  }

  drawPips(y, rank, max) {
    const g = this.pips;
    const width = max * PIP.size + (max - 1) * PIP.gap;
    const left = PIP.rightEdge - width;
    for (let i = 0; i < max; i++) {
      const x = left + i * (PIP.size + PIP.gap);
      if (i < rank) {
        g.fillStyle(0x4de3ff, 1);
        g.fillRect(x, y - PIP.size / 2, PIP.size, PIP.size);
      } else {
        g.lineStyle(1, 0x55606e, 1);
        g.strokeRect(x + 0.5, y - PIP.size / 2 + 0.5, PIP.size - 1, PIP.size - 1);
      }
    }
  }
}
