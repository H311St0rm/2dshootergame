import { GAME_WIDTH, HANGAR } from '../config/constants.js';
import Starfield from '../systems/Starfield.js';
import Sfx from '../systems/Sfx.js';
import { loadProfile, purchase, nextCost, rankOf, isOwned } from '../systems/profile.js';
import { textStyle, formatGold } from '../ui/Hud.js';

const CX = GAME_WIDTH / 2;
const ROW = { left: 24, right: GAME_WIDTH - 24, height: 34, step: 40 };
const MAJOR_TOP = 166;
const REFIT_TOP = MAJOR_TOP + HANGAR.major.length * ROW.step + 46;
const FOOTER_TOP = REFIT_TOP + HANGAR.refits.length * ROW.step + 6;
const PIP = { size: 8, gap: 3, rightEdge: ROW.right - 72 };

const COLORS = {
  affordable: '#ffd700',
  tooExpensive: '#55606e',
  owned: '#4dff88',
  error: '#ff6060',
};

export default class HangarScene extends Phaser.Scene {
  constructor() {
    super('HangarScene');
  }

  create() {
    this.starfield = new Starfield(this);
    this.sfx = new Sfx(this);
    this.profile = loadProfile();
    this.items = [...HANGAR.major, ...HANGAR.refits];
    this.selected = 0;
    this.leaving = false;

    this.add.text(CX, 50, 'HANGAR', { ...textStyle(34, '#4de3ff'), stroke: '#0a2a33', strokeThickness: 6 }).setOrigin(0.5);
    this.goldText = this.add.text(CX, 96, '', textStyle(18, '#ffd700')).setOrigin(0.5);
    this.add.text(ROW.left, MAJOR_TOP - 30, 'MAJOR UPGRADES - BUY ONCE', textStyle(11, '#7fa9b5'));
    this.add.text(ROW.left, REFIT_TOP - 30, 'REFITS - STACKABLE RANKS', textStyle(11, '#7fa9b5'));

    this.highlight = this.add.graphics();
    this.pips = this.add.graphics();
    this.rows = this.items.map((item, i) => {
      const y = this.rowY(i);
      this.add
        .zone(CX, y, ROW.right - ROW.left, ROW.height)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.select(i));
      const name = this.add.text(ROW.left + 10, y, item.name, textStyle(14)).setOrigin(0, 0.5);
      const status = this.add.text(ROW.right - 10, y, '', textStyle(13)).setOrigin(1, 0.5);
      return { item, y, name, status };
    });

    this.add.rectangle(CX, FOOTER_TOP, ROW.right - ROW.left, 1, 0x2a3240).setOrigin(0.5, 0);
    this.blurb = this.add
      .text(CX, FOOTER_TOP + 16, '', { ...textStyle(13, '#c9d3e0'), align: 'center', wordWrap: { width: 420 } })
      .setOrigin(0.5, 0);
    this.message = this.add.text(CX, FOOTER_TOP + 78, '', textStyle(13)).setOrigin(0.5);
    this.buyButton = this.button(CX - 90, FOOTER_TOP + 114, 'ENTER  BUY', '#4dff88', () => this.buy());
    this.button(CX + 90, FOOTER_TOP + 114, 'ESC  BACK', '#ffd700', () => this.back());

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

  rowY(index) {
    const majors = HANGAR.major.length;
    return index < majors ? MAJOR_TOP + index * ROW.step : REFIT_TOP + (index - majors) * ROW.step;
  }

  move(direction) {
    this.select((this.selected + direction + this.items.length) % this.items.length);
  }

  select(index) {
    this.selected = index;
    this.message.setText('');
    this.refresh();
  }

  buy() {
    const item = this.items[this.selected];
    const cost = nextCost(this.profile, item);
    if (cost === null) {
      this.showMessage(item.costs ? 'ALREADY AT MAX RANK' : 'ALREADY OWNED', COLORS.owned);
      return;
    }
    if (!purchase(this.profile, item)) {
      this.sfx.denied();
      this.showMessage(`NEED ${formatGold(cost - this.profile.gold)} MORE GOLD`, COLORS.error);
      return;
    }
    this.sfx.levelUp();
    const suffix = item.costs ? ` - RANK ${rankOf(this.profile, item.id)}` : '';
    const equipped = item.weapon ? ' - EQUIPPED' : '';
    this.showMessage(`BOUGHT ${item.name}${suffix}${equipped}`, COLORS.owned);
    this.refresh();
  }

  showMessage(text, color) {
    this.message.setText(text).setColor(color).setAlpha(1);
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
        row.status.setText(item.costs ? 'MAX' : 'OWNED').setColor(COLORS.owned);
      } else {
        row.status.setText(formatGold(cost)).setColor(gold >= cost ? COLORS.affordable : COLORS.tooExpensive);
      }
      row.name.setColor(!item.costs && isOwned(this.profile, item.id) ? '#7fa9b5' : '#ffffff');
      if (item.costs) this.drawPips(row.y, rankOf(this.profile, item.id), item.costs.length);
    }

    const row = this.rows[this.selected];
    const g = this.highlight;
    g.clear();
    g.fillStyle(0x4de3ff, 0.12);
    g.fillRect(ROW.left, row.y - ROW.height / 2, ROW.right - ROW.left, ROW.height);
    g.lineStyle(1, 0x4de3ff, 0.8);
    g.strokeRect(ROW.left, row.y - ROW.height / 2, ROW.right - ROW.left, ROW.height);

    const item = row.item;
    const rankLine = item.costs ? `\nRANK ${rankOf(this.profile, item.id)} OF ${item.costs.length}` : '';
    this.blurb.setText(`${item.blurb}${rankLine}`);
    this.buyButton.setAlpha(nextCost(this.profile, item) === null ? 0.35 : 1);
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
