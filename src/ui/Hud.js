import { GAME_WIDTH, GAME_HEIGHT, FONT, DEPTH, ABILITIES, BOSS, MAX_LEVEL_PICKUP } from '../config/constants.js';
import { TIMED_ABILITIES } from '../systems/AbilityManager.js';

const METER = { x: 12, y: 30, width: 128, height: 8 };
const BOSS_BAR = { x: 40, y: 68, width: 400, height: 8 };
const SLOT = { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 26, size: 36, gap: 8 };
const EFFECT = { x: 18, y: GAME_HEIGHT - 20, rowGap: 20, barWidth: 56, barHeight: 5 };
const SECONDARY = { right: GAME_WIDTH - 12, y: GAME_HEIGHT - 36, barWidth: 84, barHeight: 4 };
const SHRUG = { x: 12, y: 60, pipX: 52, pip: 6, gap: 3 };

const COLORS = {
  meter: 0x4de3ff,
  meterMax: 0xffd700,
  meterDanger: 0xff4d4d,
  track: 0x1b2230,
  boss: BOSS.color,
};

export function textStyle(size, color = '#ffffff') {
  return { fontFamily: FONT, fontSize: `${size}px`, color, fontStyle: 'bold' };
}

function formatTime(seconds) {
  const s = Math.floor(seconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function formatGold(value) {
  return Math.floor(value).toLocaleString('en-US');
}

export default class Hud {
  constructor(scene, slotCount) {
    this.scene = scene;
    this.clock = 0;
    const add = scene.add;
    const text = (x, y, size, color, originX = 0, originY = 0) =>
      add.text(x, y, '', textStyle(size, color)).setOrigin(originX, originY).setDepth(DEPTH.hud);

    this.levelText = text(METER.x, 8, 16, '#4de3ff');
    this.rangeText = text(METER.x + METER.width + 6, METER.y + METER.height / 2, 10, '#7fa9b5', 0, 0.5);
    this.weaponText = text(METER.x, METER.y + METER.height + 4, 10, '#7fa9b5');
    this.meter = add.graphics().setDepth(DEPTH.hud);

    this.goldText = text(GAME_WIDTH - 12, 8, 16, '#ffd700', 1);
    this.bestText = text(GAME_WIDTH - 12, 28, 11, '#9aa4b5', 1);

    this.timerText = text(GAME_WIDTH / 2, 8, 16, '#ffffff', 0.5);
    this.streakText = text(GAME_WIDTH / 2, 28, 11, '#ffd700', 0.5);

    this.bossLabel = text(GAME_WIDTH / 2, BOSS_BAR.y - 16, 11, '#ff8a7a', 0.5).setText(BOSS.name);
    this.bossBar = add.graphics().setDepth(DEPTH.hud);

    // Slot 1 fires next; with two slots, slot 2 sits to its right, dimmed, as the queued one.
    const step = SLOT.size + SLOT.gap;
    this.slotCenters = Array.from({ length: slotCount }, (_, i) => SLOT.x + (i - (slotCount - 1) / 2) * step);
    const firstX = this.slotCenters[0];
    const lastX = this.slotCenters[slotCount - 1];
    this.slotBox = add.graphics().setDepth(DEPTH.hud);
    this.slotIcons = this.slotCenters.map((x) => add.image(x, SLOT.y, 'pickup_shield').setScale(2).setDepth(DEPTH.hud + 1));
    this.slotName = text(firstX - SLOT.size / 2 - 8, SLOT.y, 12, '#ffffff', 1, 0.5);
    this.slotHint = text(lastX + SLOT.size / 2 + 8, SLOT.y, 12, '#ffffff', 0, 0.5).setText('[SPACE]');

    this.shrugText = text(SHRUG.x, SHRUG.y, 10, '#7fa9b5', 0, 0.5).setText('SHRUG');
    this.shrugPips = add.graphics().setDepth(DEPTH.hud);

    this.secondaryText = text(SECONDARY.right, SECONDARY.y, 10, '#7fa9b5', 1);
    this.secondaryBar = add.graphics().setDepth(DEPTH.hud);

    this.effectBars = add.graphics().setDepth(DEPTH.hud);
    this.effectIcons = Object.fromEntries(
      TIMED_ABILITIES.map((kind) => [kind, add.image(0, 0, `pickup_${kind}`).setDepth(DEPTH.hud).setVisible(false)]),
    );
  }

  update(dt, state) {
    this.clock += dt;
    this.drawWeaponMeter(state);

    this.goldText.setText(`GOLD ${formatGold(state.gold)}`);
    this.bestText.setText(`BEST RUN ${formatGold(Math.max(state.best, state.gold))}`);
    this.weaponText.setText(state.weaponName);
    this.timerText.setText(formatTime(state.elapsed));

    const showStreak = state.atMax && !state.bossActive;
    this.streakText.setVisible(showStreak);
    if (showStreak) this.streakText.setText(`STREAK ${state.streak}/${BOSS.streakTarget}`);

    this.drawBossBar(state);
    this.drawAbilitySlots(state.abilities.slots);
    this.drawActiveEffects(state.abilities);
    this.drawSecondary(state.secondary);
    this.drawShrugMeter(state);
  }

  // Progress toward the next max-level shrug; the label turns gold while one is held.
  drawShrugMeter({ atMax, shrugProgress, hasShrug }) {
    const g = this.shrugPips;
    g.clear();
    const visible = atMax || shrugProgress > 0;
    this.shrugText.setVisible(visible);
    if (!visible) return;
    this.shrugText.setColor(hasShrug ? '#ffd700' : '#7fa9b5');
    for (let i = 0; i < MAX_LEVEL_PICKUP.pickupsPerShrug; i++) {
      const x = SHRUG.pipX + i * (SHRUG.pip + SHRUG.gap);
      const top = SHRUG.y - SHRUG.pip / 2;
      if (i < shrugProgress) {
        g.fillStyle(0xffd700, 1);
        g.fillRect(x, top, SHRUG.pip, SHRUG.pip);
      } else {
        g.lineStyle(1, 0x55606e, 1);
        g.strokeRect(x + 0.5, top + 0.5, SHRUG.pip - 1, SHRUG.pip - 1);
      }
    }
  }

  drawSecondary(secondary) {
    const g = this.secondaryBar;
    g.clear();
    this.secondaryText.setVisible(Boolean(secondary));
    if (!secondary) return;
    const readiness = secondary.readiness;
    this.secondaryText.setText(secondary.name);
    const left = SECONDARY.right - SECONDARY.barWidth;
    const y = SECONDARY.y + 16;
    g.fillStyle(COLORS.track, 1);
    g.fillRect(left, y, SECONDARY.barWidth, SECONDARY.barHeight);
    g.fillStyle(secondary.color, readiness >= 1 ? 1 : 0.45);
    g.fillRect(left, y, SECONDARY.barWidth * readiness, SECONDARY.barHeight);
  }

  drawWeaponMeter({ level, min, max }) {
    const range = Math.max(1, max - min);
    const fraction = Phaser.Math.Clamp((level - min) / range, 0, 1);
    const atMin = level <= min;
    const blinkOn = Math.floor(this.clock * 4) % 2 === 0;
    let color = COLORS.meter;
    if (level >= max) color = COLORS.meterMax;

    this.levelText.setText(`LVL ${level}`);
    this.levelText.setColor(atMin ? (blinkOn ? '#ff4d4d' : '#802626') : level >= max ? '#ffd700' : '#4de3ff');
    this.rangeText.setText(`${min}-${max}`);

    const g = this.meter;
    g.clear();
    g.fillStyle(COLORS.track, 1);
    g.fillRect(METER.x, METER.y, METER.width, METER.height);
    if (atMin) {
      g.lineStyle(1, COLORS.meterDanger, blinkOn ? 1 : 0.3);
      g.strokeRect(METER.x - 0.5, METER.y - 0.5, METER.width + 1, METER.height + 1);
    } else {
      g.fillStyle(color, 1);
      g.fillRect(METER.x, METER.y, METER.width * fraction, METER.height);
    }
    // One tick per level so the meter still reads as discrete steps.
    g.fillStyle(0x05060a, 1);
    for (let i = 1; i < range; i++) {
      g.fillRect(Math.round(METER.x + (METER.width * i) / range), METER.y, 1, METER.height);
    }
  }

  drawBossBar({ bossActive, bossHp, bossMaxHp }) {
    this.bossLabel.setVisible(bossActive);
    const g = this.bossBar;
    g.clear();
    if (!bossActive) return;
    g.fillStyle(COLORS.track, 1);
    g.fillRect(BOSS_BAR.x, BOSS_BAR.y, BOSS_BAR.width, BOSS_BAR.height);
    g.fillStyle(COLORS.boss, 1);
    g.fillRect(BOSS_BAR.x, BOSS_BAR.y, BOSS_BAR.width * (bossHp / bossMaxHp), BOSS_BAR.height);
    g.lineStyle(1, 0xff8a7a, 0.8);
    g.strokeRect(BOSS_BAR.x - 0.5, BOSS_BAR.y - 0.5, BOSS_BAR.width + 1, BOSS_BAR.height + 1);
  }

  drawAbilitySlots(slots) {
    const g = this.slotBox;
    const half = SLOT.size / 2;
    g.clear();
    this.slotCenters.forEach((x, i) => {
      const kind = slots[i];
      const isNext = i === 0;
      g.fillStyle(0x000000, 0.45);
      g.fillRect(x - half, SLOT.y - half, SLOT.size, SLOT.size);
      g.lineStyle(2, kind && isNext ? 0xffffff : 0x55606e, kind ? 0.9 : 0.6);
      g.strokeRect(x - half, SLOT.y - half, SLOT.size, SLOT.size);
      const icon = this.slotIcons[i];
      icon.setVisible(Boolean(kind));
      if (kind) icon.setTexture(`pickup_${kind}`).setAlpha(isNext ? 1 : 0.55);
    });

    const next = slots[0];
    this.slotName.setVisible(Boolean(next));
    this.slotHint.setVisible(Boolean(next));
    if (!next) return;
    this.slotName.setText(ABILITIES[next].name);
    this.slotHint.setAlpha(0.45 + 0.55 * Math.abs(Math.sin(this.clock * 4)));
  }

  drawActiveEffects(abilities) {
    const g = this.effectBars;
    g.clear();
    let row = 0;
    for (const kind of TIMED_ABILITIES) {
      const icon = this.effectIcons[kind];
      const remaining = abilities.remaining(kind);
      if (remaining <= 0) {
        icon.setVisible(false);
        continue;
      }
      const y = EFFECT.y - row * EFFECT.rowGap;
      icon.setVisible(true).setPosition(EFFECT.x, y);
      const fraction = remaining / abilities.duration(kind);
      g.fillStyle(COLORS.track, 1);
      g.fillRect(EFFECT.x + 12, y - 2, EFFECT.barWidth, EFFECT.barHeight);
      g.fillStyle(ABILITIES[kind].color, 1);
      g.fillRect(EFFECT.x + 12, y - 2, EFFECT.barWidth * fraction, EFFECT.barHeight);
      row++;
    }
  }

  banner(title, subtitle, color, durationMs = 1800) {
    const scene = this.scene;
    const y = GAME_HEIGHT * 0.38;
    const titleText = scene.add
      .text(GAME_WIDTH / 2, y, title, { ...textStyle(30, color), stroke: '#000000', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay);
    const subText = scene.add
      .text(GAME_WIDTH / 2, y + 34, subtitle, { ...textStyle(14, '#ffffff'), stroke: '#000000', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay);
    scene.tweens.add({
      targets: [titleText, subText],
      alpha: 0,
      delay: durationMs - 400,
      duration: 400,
      onComplete: () => {
        titleText.destroy();
        subText.destroy();
      },
    });
  }

  floatText(x, y, message, color) {
    const label = this.scene.add
      .text(x, y, message, { ...textStyle(12, color), stroke: '#000000', strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay);
    this.scene.tweens.add({
      targets: label,
      y: y - 28,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
  }
}
