import { ABILITIES, ABILITY_KEYS } from '../config/constants.js';

export const TIMED_ABILITIES = ABILITY_KEYS.filter((kind) => ABILITIES[kind].duration > 0);

export default class AbilityManager {
  constructor(capacity = 1, durationMul = 1) {
    this.capacity = capacity;
    this.durationMul = durationMul;
    this.slots = [];
    this.timers = Object.fromEntries(TIMED_ABILITIES.map((kind) => [kind, 0]));
  }

  // The next ability SPACE will fire.
  get held() {
    return this.slots[0] ?? null;
  }

  // Fills the first empty slot; with every slot full, the newest pickup replaces
  // the last slot so the ability queued to fire next is never lost.
  collect(kind) {
    if (this.slots.length < this.capacity) this.slots.push(kind);
    else this.slots[this.capacity - 1] = kind;
  }

  // Fires the first slot, moves the rest forward, and returns the kind (null if empty).
  activate() {
    const kind = this.slots.shift() ?? null;
    if (kind && ABILITIES[kind].duration > 0) this.timers[kind] = this.duration(kind);
    return kind;
  }

  duration(kind) {
    return ABILITIES[kind].duration * this.durationMul;
  }

  update(dt) {
    for (const kind of TIMED_ABILITIES) {
      this.timers[kind] = Math.max(0, this.timers[kind] - dt);
    }
  }

  isActive(kind) {
    return this.timers[kind] > 0;
  }

  remaining(kind) {
    return this.timers[kind];
  }

  get slowFactor() {
    return this.isActive('overdrive') ? ABILITIES.overdrive.slowFactor : 1;
  }
}
