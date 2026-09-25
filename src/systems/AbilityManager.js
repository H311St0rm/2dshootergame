import { ABILITIES, ABILITY_KEYS } from '../config/constants.js';

export const TIMED_ABILITIES = ABILITY_KEYS.filter((kind) => ABILITIES[kind].duration > 0);

export default class AbilityManager {
  constructor() {
    this.held = null;
    this.timers = Object.fromEntries(TIMED_ABILITIES.map((kind) => [kind, 0]));
  }

  // Single slot: a new pickup always replaces whatever is held.
  collect(kind) {
    this.held = kind;
  }

  // Consumes the held ability and returns its kind (null if nothing was held).
  activate() {
    const kind = this.held;
    if (!kind) return null;
    this.held = null;
    if (ABILITIES[kind].duration > 0) this.timers[kind] = ABILITIES[kind].duration;
    return kind;
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
