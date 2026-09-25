import { HIGH_SCORE_KEY } from '../config/constants.js';

export function loadHighScore() {
  try {
    const value = parseInt(window.localStorage.getItem(HIGH_SCORE_KEY), 10);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

export function saveHighScore(score) {
  try {
    window.localStorage.setItem(HIGH_SCORE_KEY, String(score));
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the run still ends normally.
  }
}
