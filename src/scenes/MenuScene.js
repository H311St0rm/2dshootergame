import {
  TITLE, GAME_WIDTH, DEPTH, WEAPONS, WEAPON_ORDER, SECONDARIES, SECONDARY_ORDER,
} from '../config/constants.js';
import Starfield from '../systems/Starfield.js';
import Sfx from '../systems/Sfx.js';
import {
  loadProfile, saveProfile, unlockedWeapons, isWeaponUnlocked, unlockedSecondaries, secondaryRank, hasUltimate,
} from '../systems/profile.js';
import { buildVolley } from '../systems/WeaponManager.js';
import { describeSecondary } from '../systems/SecondaryManager.js';
import { textStyle, formatGold } from '../ui/Hud.js';

const CX = GAME_WIDTH / 2;
const SHIP_Y = 250;
const SHIP_SCALE = 2.5;
const PREVIEW_LEVEL = 6;
const PREVIEW_DISTANCES = { blaster: [30, 56, 82], lance: [30, 60, 90], scatter: [24, 44, 64], seeker: [34, 74] };
const ROWS = {
  primary: { label: 100, name: 302, detail: 324, dots: 372 },
  secondary: { label: 404, name: 426, detail: 448, dots: 478 },
};
const FIELD_PREVIEW_RADIUS = 46;
// Up-left, up-right, then just below horizontal on each side, clear of the name row.
const ARC_PREVIEW_ANGLES = [-2.5, -0.64, 2.8, 0.34];
const ACTIVE_ARROW = '#ffd700';
const IDLE_ARROW = '#3a4250';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.starfield = new Starfield(this);
    this.sfx = new Sfx(this);
    this.profile = loadProfile();
    this.weapons = unlockedWeapons(this.profile);
    this.secondaries = unlockedSecondaries(this.profile);
    this.focus = 'primary';
    this.leaving = false;

    this.add
      .text(CX, 58, TITLE, { ...textStyle(40, '#4de3ff'), stroke: '#0a2a33', strokeThickness: 8 })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);

    this.primaryPreview = this.add.container(0, 0).setDepth(DEPTH.hud);
    this.shipGroup = this.add.container(CX, SHIP_Y).setDepth(DEPTH.hud);
    this.secondaryPreview = this.add.container(0, 0);
    this.shipGroup.add([this.secondaryPreview, this.add.image(0, 0, 'player').setScale(SHIP_SCALE)]);
    this.tweens.add({ targets: this.shipGroup, y: SHIP_Y - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.rowUi = {
      primary: this.buildRow('primary', 'PRIMARY WEAPON'),
      secondary: this.buildRow('secondary', 'SECONDARY WEAPON'),
    };
    this.dots = this.add.graphics();
    this.lockedHint = this.add.text(CX, 498, '', textStyle(10, '#55606e')).setOrigin(0.5);

    const controls = [
      ['UP / DOWN', 'PICK ROW'],
      ['LEFT / RIGHT', 'CHANGE'],
      ['IN FLIGHT', 'WASD MOVE · SPACE ABILITY · P PAUSE'],
    ];
    controls.forEach(([key, action], i) => {
      const y = 530 + i * 20;
      this.add.text(CX - 96, y, key, textStyle(12, '#ffd700')).setOrigin(1, 0.5);
      this.add.text(CX - 80, y, action, textStyle(12, '#ffffff')).setOrigin(0, 0.5);
    });

    this.add.text(CX, 616, `GOLD ${formatGold(this.profile.gold)}`, textStyle(18, '#ffd700')).setOrigin(0.5);
    this.add.text(CX, 640, `BEST RUN ${formatGold(this.profile.best)}`, textStyle(12, '#9aa4b5')).setOrigin(0.5);

    const launch = this.add.text(CX, 694, 'ENTER  LAUNCH', textStyle(18, '#4dff88')).setOrigin(0.5);
    this.tweens.add({ targets: launch, alpha: 0.35, duration: 600, yoyo: true, repeat: -1 });
    this.makeButton(launch, () => this.launch());
    this.makeButton(this.add.text(CX, 732, 'H  HANGAR', textStyle(15, '#ffd700')).setOrigin(0.5), () => this.openHangar());

    const keyboard = this.input.keyboard;
    const onKey = (handler) => (event) => {
      if (!event.repeat) handler();
    };
    keyboard.on('keydown-UP', onKey(() => this.setFocus('primary')));
    keyboard.on('keydown-W', onKey(() => this.setFocus('primary')));
    keyboard.on('keydown-DOWN', onKey(() => this.setFocus('secondary')));
    keyboard.on('keydown-S', onKey(() => this.setFocus('secondary')));
    keyboard.on('keydown-LEFT', onKey(() => this.cycle(this.focus, -1)));
    keyboard.on('keydown-A', onKey(() => this.cycle(this.focus, -1)));
    keyboard.on('keydown-RIGHT', onKey(() => this.cycle(this.focus, 1)));
    keyboard.on('keydown-D', onKey(() => this.cycle(this.focus, 1)));
    keyboard.on('keydown-ENTER', onKey(() => this.launch()));
    keyboard.on('keydown-SPACE', onKey(() => this.launch()));
    keyboard.on('keydown-H', onKey(() => this.openHangar()));

    this.refresh();
  }

  buildRow(row, label) {
    const y = ROWS[row];
    const labelText = this.add.text(CX, y.label, label, textStyle(11, '#7fa9b5')).setOrigin(0.5);
    const name = this.add.text(CX, y.name, '', textStyle(20, '#ffffff')).setOrigin(0.5);
    const left = this.makeButton(this.add.text(CX - 130, y.name, '<', textStyle(24, IDLE_ARROW)).setOrigin(0.5), () => {
      this.setFocus(row);
      this.cycle(row, -1);
    });
    const right = this.makeButton(this.add.text(CX + 130, y.name, '>', textStyle(24, IDLE_ARROW)).setOrigin(0.5), () => {
      this.setFocus(row);
      this.cycle(row, 1);
    });
    const detail = this.add
      .text(CX, y.detail, '', { ...textStyle(12, '#9aa4b5'), align: 'center', wordWrap: { width: 380 } })
      .setOrigin(0.5, 0);
    return { labelText, name, left, right, detail };
  }

  makeButton(text, onClick) {
    text.setDepth(DEPTH.hud).setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
    return text;
  }

  update(time, delta) {
    this.starfield.update(delta / 1000);
  }

  setFocus(row) {
    if (this.focus === row) return;
    this.focus = row;
    this.refresh();
  }

  cycle(row, direction) {
    const options = row === 'primary' ? this.weapons : this.secondaries;
    if (options.length < 2) return;
    const key = row === 'primary' ? 'weapon' : 'secondary';
    const index = options.indexOf(this.profile[key]);
    this.profile[key] = options[(index + direction + options.length) % options.length];
    saveProfile(this.profile);
    this.sfx.levelUp();
    this.refresh();
  }

  refresh() {
    for (const [row, ui] of Object.entries(this.rowUi)) {
      const focused = this.focus === row;
      const options = row === 'primary' ? this.weapons : this.secondaries;
      const arrowColor = focused && options.length > 1 ? ACTIVE_ARROW : IDLE_ARROW;
      ui.left.setColor(arrowColor);
      ui.right.setColor(arrowColor);
      ui.labelText.setColor(focused ? '#4de3ff' : '#7fa9b5');
    }

    const weapon = WEAPONS[this.profile.weapon];
    const weaponUltimate = hasUltimate(this.profile, this.profile.weapon);
    this.rowUi.primary.name.setText(weaponUltimate ? `${weapon.name}  ULT` : weapon.name);
    this.rowUi.primary.detail.setText(
      weaponUltimate ? `${weapon.ultimate.name}: ${weapon.ultimate.blurb}` : weapon.blurb,
    );
    this.drawPrimaryPreview(this.profile.weapon);
    this.drawDots();

    const secondaryId = this.profile.secondary;
    const secondary = this.rowUi.secondary;
    const ultimate = Boolean(secondaryId) && hasUltimate(this.profile, secondaryId);
    if (secondaryId) {
      const rank = secondaryRank(this.profile, secondaryId);
      secondary.name.setText(`${SECONDARIES[secondaryId].name}  ${ultimate ? 'ULT' : `R${rank}`}`);
      secondary.detail.setText(describeSecondary(secondaryId, rank, ultimate));
    } else {
      secondary.name.setText('NONE');
      secondary.detail.setText('Buy a secondary weapon in the Hangar.');
    }
    this.drawSecondaryPreview(secondaryId, ultimate);

    const lockedWeapons = WEAPON_ORDER.length - this.weapons.length;
    const lockedSecondaries = SECONDARY_ORDER.length - this.secondaries.length;
    const parts = [];
    if (lockedWeapons) parts.push(`${lockedWeapons} WEAPON${lockedWeapons > 1 ? 'S' : ''}`);
    if (lockedSecondaries) parts.push(`${lockedSecondaries} SECONDAR${lockedSecondaries > 1 ? 'IES' : 'Y'}`);
    this.lockedHint.setText(parts.length ? `STILL IN THE HANGAR: ${parts.join(', ')}` : '');
  }

  drawDots() {
    const g = this.dots;
    g.clear();
    const draw = (ids, isUnlocked, selected, y) => {
      ids.forEach((id, i) => {
        const x = CX + (i - (ids.length - 1) / 2) * 18;
        if (!isUnlocked(id)) {
          g.lineStyle(1, 0x55606e, 1);
          g.strokeCircle(x, y, 4);
        } else {
          g.fillStyle(id === selected ? 0x4de3ff : 0xc9d3e0, 1);
          g.fillCircle(x, y, id === selected ? 5 : 3.5);
        }
      });
    };
    draw(WEAPON_ORDER, (id) => isWeaponUnlocked(this.profile, id), this.profile.weapon, ROWS.primary.dots);
    draw(SECONDARY_ORDER, (id) => secondaryRank(this.profile, id) > 0, this.profile.secondary, ROWS.secondary.dots);
  }

  // A still frame of what one volley looks like at a mid weapon level.
  drawPrimaryPreview(id) {
    this.primaryPreview.removeAll(true);
    const weapon = WEAPONS[id];
    const volley = buildVolley(id, PREVIEW_LEVEL, false, false);
    const noseY = SHIP_Y - 30;
    for (const shot of volley.shots) {
      const a = Phaser.Math.DegToRad(shot.angle);
      PREVIEW_DISTANCES[id].forEach((d, i) => {
        this.primaryPreview.add(
          this.add
            .image(CX + shot.offsetX + Math.sin(a) * d, noseY - Math.cos(a) * d, weapon.texture)
            .setRotation(a)
            .setScale(1.5)
            .setAlpha(1 - i * 0.25),
        );
      });
    }
  }

  // Drawn relative to the ship so it bobs along with it.
  drawSecondaryPreview(id, ultimate) {
    this.secondaryPreview.removeAll(true);
    if (!id) return;
    const color = SECONDARIES[id].color;
    if (id === 'drone') {
      (ultimate ? [-1, 1] : [-1]).forEach((side) => {
        this.secondaryPreview.add(this.add.image(side * 56, 14, 'drone').setScale(2));
      });
      return;
    }
    const g = this.add.graphics();
    if (id === 'field') {
      g.fillStyle(color, 0.08);
      g.fillCircle(0, 0, FIELD_PREVIEW_RADIUS);
      g.lineStyle(2, color, 0.6);
      g.strokeCircle(0, 0, FIELD_PREVIEW_RADIUS);
    } else {
      g.lineStyle(2, color, 0.9);
      for (const angle of ARC_PREVIEW_ANGLES) {
        g.beginPath();
        g.moveTo(Math.cos(angle) * 30, Math.sin(angle) * 30);
        for (let step = 1; step <= 4; step++) {
          const r = 30 + step * 6;
          const wobble = step % 2 === 0 ? 0.12 : -0.12;
          g.lineTo(Math.cos(angle + wobble) * r, Math.sin(angle + wobble) * r);
        }
        g.strokePath();
      }
    }
    this.secondaryPreview.add(g);
  }

  launch() {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start('GameScene');
  }

  openHangar() {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start('HangarScene');
  }
}
