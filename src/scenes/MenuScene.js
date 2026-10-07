import { TITLE, GAME_WIDTH, DEPTH, WEAPONS, WEAPON_ORDER } from '../config/constants.js';
import Starfield from '../systems/Starfield.js';
import Sfx from '../systems/Sfx.js';
import { loadProfile, saveProfile, unlockedWeapons, isWeaponUnlocked } from '../systems/profile.js';
import { buildVolley } from '../systems/WeaponManager.js';
import { textStyle, formatGold } from '../ui/Hud.js';

const CX = GAME_WIDTH / 2;
const SHIP_Y = 290;
const PREVIEW_LEVEL = 6;
const PREVIEW_DISTANCES = { blaster: [34, 66, 98], lance: [34, 70, 106], scatter: [28, 50, 72], seeker: [40, 88] };

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.starfield = new Starfield(this);
    this.sfx = new Sfx(this);
    this.profile = loadProfile();
    this.weapons = unlockedWeapons(this.profile);
    this.leaving = false;

    this.add
      .text(CX, 72, TITLE, { ...textStyle(40, '#4de3ff'), stroke: '#0a2a33', strokeThickness: 8 })
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    this.add.text(CX, 118, 'CHOOSE YOUR WEAPON', textStyle(11, '#7fa9b5')).setOrigin(0.5);

    this.preview = this.add.container(0, 0).setDepth(DEPTH.hud);
    const ship = this.add.image(CX, SHIP_Y, 'player').setScale(2.5).setDepth(DEPTH.hud);
    this.tweens.add({ targets: ship, y: SHIP_Y - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const canCycle = this.weapons.length > 1;
    this.weaponName = this.add.text(CX, 352, '', textStyle(22, '#ffffff')).setOrigin(0.5);
    const arrowColor = canCycle ? '#ffd700' : '#3a4250';
    this.makeButton(this.add.text(CX - 130, 352, '<', textStyle(24, arrowColor)).setOrigin(0.5), () => this.cycle(-1));
    this.makeButton(this.add.text(CX + 130, 352, '>', textStyle(24, arrowColor)).setOrigin(0.5), () => this.cycle(1));
    this.blurb = this.add
      .text(CX, 386, '', { ...textStyle(12, '#9aa4b5'), align: 'center', wordWrap: { width: 380 } })
      .setOrigin(0.5, 0);
    this.dots = this.add.graphics();
    const lockedCount = WEAPON_ORDER.length - this.weapons.length;
    if (lockedCount > 0) {
      const label = lockedCount === 1 ? '1 MORE WEAPON IN THE HANGAR' : `${lockedCount} MORE WEAPONS IN THE HANGAR`;
      this.add.text(CX, 462, label, textStyle(10, '#55606e')).setOrigin(0.5);
    }

    const controls = [
      ['< > / A D', 'CHOOSE WEAPON'],
      ['ARROWS / WASD', 'MOVE'],
      ['SPACE', 'USE ABILITY'],
      ['P / ESC', 'PAUSE'],
    ];
    controls.forEach(([key, action], i) => {
      const y = 506 + i * 22;
      this.add.text(CX - 10, y, key, textStyle(13, '#ffd700')).setOrigin(1, 0.5);
      this.add.text(CX + 10, y, action, textStyle(13, '#ffffff')).setOrigin(0, 0.5);
    });

    this.add.text(CX, 624, `GOLD ${formatGold(this.profile.gold)}`, textStyle(18, '#ffd700')).setOrigin(0.5);
    this.add.text(CX, 648, `BEST RUN ${formatGold(this.profile.best)}`, textStyle(12, '#9aa4b5')).setOrigin(0.5);

    const launch = this.add.text(CX, 704, 'ENTER  LAUNCH', textStyle(18, '#4dff88')).setOrigin(0.5);
    this.tweens.add({ targets: launch, alpha: 0.35, duration: 600, yoyo: true, repeat: -1 });
    this.makeButton(launch, () => this.launch());
    this.makeButton(this.add.text(CX, 742, 'H  HANGAR', textStyle(15, '#ffd700')).setOrigin(0.5), () => this.openHangar());

    const keyboard = this.input.keyboard;
    const onKey = (handler) => (event) => {
      if (!event.repeat) handler();
    };
    keyboard.on('keydown-LEFT', onKey(() => this.cycle(-1)));
    keyboard.on('keydown-A', onKey(() => this.cycle(-1)));
    keyboard.on('keydown-RIGHT', onKey(() => this.cycle(1)));
    keyboard.on('keydown-D', onKey(() => this.cycle(1)));
    keyboard.on('keydown-ENTER', onKey(() => this.launch()));
    keyboard.on('keydown-SPACE', onKey(() => this.launch()));
    keyboard.on('keydown-H', onKey(() => this.openHangar()));

    this.showWeapon();
  }

  makeButton(text, onClick) {
    text.setDepth(DEPTH.hud).setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
    return text;
  }

  update(time, delta) {
    this.starfield.update(delta / 1000);
  }

  cycle(direction) {
    if (this.weapons.length < 2) return;
    const index = this.weapons.indexOf(this.profile.weapon);
    this.profile.weapon = this.weapons[(index + direction + this.weapons.length) % this.weapons.length];
    saveProfile(this.profile);
    this.sfx.levelUp();
    this.showWeapon();
  }

  showWeapon() {
    const id = this.profile.weapon;
    const weapon = WEAPONS[id];
    this.weaponName.setText(weapon.name);
    this.blurb.setText(weapon.blurb);
    this.drawPreview(id);

    const g = this.dots;
    g.clear();
    const spacing = 18;
    WEAPON_ORDER.forEach((weaponId, i) => {
      const x = CX + (i - (WEAPON_ORDER.length - 1) / 2) * spacing;
      if (!isWeaponUnlocked(this.profile, weaponId)) {
        g.lineStyle(1, 0x55606e, 1);
        g.strokeCircle(x, 444, 4);
      } else {
        g.fillStyle(weaponId === id ? 0x4de3ff : 0xc9d3e0, 1);
        g.fillCircle(x, 444, weaponId === id ? 5 : 3.5);
      }
    });
  }

  // A still frame of what one volley looks like at a mid weapon level.
  drawPreview(id) {
    this.preview.removeAll(true);
    const weapon = WEAPONS[id];
    const volley = buildVolley(id, PREVIEW_LEVEL, false, false);
    const noseY = SHIP_Y - 30;
    for (const shot of volley.shots) {
      const a = Phaser.Math.DegToRad(shot.angle);
      PREVIEW_DISTANCES[id].forEach((d, i) => {
        const image = this.add
          .image(CX + shot.offsetX + Math.sin(a) * d, noseY - Math.cos(a) * d, weapon.texture)
          .setRotation(a)
          .setScale(1.5)
          .setAlpha(1 - i * 0.25);
        this.preview.add(image);
      });
    }
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
