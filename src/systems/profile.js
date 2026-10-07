import {
  PROFILE_KEY, LEGACY_HIGH_SCORE_KEY, HANGAR, WEAPONS, WEAPON_ORDER, SECONDARIES, SECONDARY_ORDER,
} from '../config/constants.js';

export const HANGAR_ITEMS = Object.fromEntries(
  [...HANGAR.major, ...HANGAR.refits, ...HANGAR.secondaries].map((item) => [item.id, item]),
);

function emptyProfile() {
  return { gold: 0, best: 0, unlocks: {}, ranks: {}, weapon: 'blaster', secondary: null };
}

const isCount = (value) => Number.isFinite(value) && value >= 0;
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

// Storage can be missing, blocked or hand-edited; anything unreadable falls back to defaults.
export function loadProfile() {
  const profile = emptyProfile();
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (isCount(saved.gold)) profile.gold = Math.floor(saved.gold);
      if (isCount(saved.best)) profile.best = Math.floor(saved.best);
      if (isPlainObject(saved.unlocks)) profile.unlocks = saved.unlocks;
      if (isPlainObject(saved.ranks)) profile.ranks = saved.ranks;
      if (WEAPONS[saved.weapon]) profile.weapon = saved.weapon;
      if (SECONDARIES[saved.secondary]) profile.secondary = saved.secondary;
      // The drone once had a 6th rank that added the second drone; that is now its ultimate.
      if (profile.ranks.secondary_drone > SECONDARIES.drone.costs.length) {
        profile.ranks.secondary_drone = SECONDARIES.drone.costs.length;
        profile.unlocks.ultimate_drone = true;
      }
    } else {
      const legacyBest = parseInt(window.localStorage.getItem(LEGACY_HIGH_SCORE_KEY), 10);
      if (isCount(legacyBest)) profile.best = legacyBest;
    }
  } catch {
    // Unreadable storage: play with a fresh profile.
  }
  if (!isWeaponUnlocked(profile, profile.weapon)) profile.weapon = 'blaster';
  if (!profile.secondary || secondaryRank(profile, profile.secondary) === 0) {
    profile.secondary = unlockedSecondaries(profile)[0] ?? null;
  }
  return profile;
}

export function saveProfile(profile) {
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Storage unavailable: progress lasts for this session only.
  }
}

export function rankOf(profile, id) {
  const item = HANGAR_ITEMS[id];
  const rank = profile.ranks[id];
  return isCount(rank) ? Math.min(Math.floor(rank), item.costs.length) : 0;
}

export function isOwned(profile, id) {
  return profile.unlocks[id] === true;
}

export function isWeaponUnlocked(profile, weaponId) {
  return weaponId === 'blaster' || isOwned(profile, `weapon_${weaponId}`);
}

export function unlockedWeapons(profile) {
  return WEAPON_ORDER.filter((id) => isWeaponUnlocked(profile, id));
}

export function secondaryRank(profile, secondaryId) {
  return rankOf(profile, `secondary_${secondaryId}`);
}

export function unlockedSecondaries(profile) {
  return SECONDARY_ORDER.filter((id) => secondaryRank(profile, id) > 0);
}

// Weapon and secondary ids never collide, so both share the `ultimate_<id>` unlock keys.
export function hasUltimate(profile, weaponOrSecondaryId) {
  return isOwned(profile, `ultimate_${weaponOrSecondaryId}`);
}

// Weapon rows count the free Blaster as owned.
export function itemOwned(profile, item) {
  return item.weapon ? isWeaponUnlocked(profile, item.weapon) : isOwned(profile, item.id);
}

// True when the item's next purchase is its ultimate: offered once a weapon is owned,
// or once a secondary reaches max rank.
export function nextIsUltimate(profile, item) {
  if (!item.ultimate) return false;
  const ready = item.costs ? rankOf(profile, item.id) === item.costs.length : itemOwned(profile, item);
  return ready && !hasUltimate(profile, item.secondary || item.weapon);
}

// Returns null once the item is owned or fully ranked, and its ultimate (if any) bought.
export function nextCost(profile, item) {
  if (item.costs) {
    const rank = rankOf(profile, item.id);
    if (rank < item.costs.length) return item.costs[rank];
  } else if (!itemOwned(profile, item)) {
    return item.cost;
  }
  return nextIsUltimate(profile, item) ? item.ultimate.cost : null;
}

export function purchase(profile, item) {
  const cost = nextCost(profile, item);
  if (cost === null || profile.gold < cost) return false;
  const ultimate = nextIsUltimate(profile, item);
  profile.gold -= cost;
  if (ultimate) profile.unlocks[`ultimate_${item.secondary || item.weapon}`] = true;
  else if (item.costs) profile.ranks[item.id] = rankOf(profile, item.id) + 1;
  else profile.unlocks[item.id] = true;
  if (item.weapon) profile.weapon = item.weapon;
  if (item.secondary) profile.secondary = item.secondary;
  saveProfile(profile);
  return true;
}

// Adds a finished run's gold to the bank; returns whether it set a new best run.
export function bankRun(profile, gold) {
  const earned = Math.floor(gold);
  profile.gold += earned;
  const isNewBest = earned > profile.best;
  if (isNewBest) profile.best = earned;
  saveProfile(profile);
  return isNewBest;
}

export function runModifiers(profile) {
  const bonus = (id) => rankOf(profile, id) * HANGAR_ITEMS[id].perRank;
  return {
    weapon: profile.weapon,
    weaponUltimate: hasUltimate(profile, profile.weapon),
    secondary: profile.secondary,
    secondaryRank: profile.secondary ? secondaryRank(profile, profile.secondary) : 0,
    secondaryUltimate: profile.secondary ? hasUltimate(profile, profile.secondary) : false,
    abilitySlots: isOwned(profile, 'secondSlot') ? 2 : 1,
    startBarrier: isOwned(profile, 'startBarrier'),
    moveSpeedMul: 1 + bonus('thrusters'),
    abilityDurationMul: 1 + bonus('capacitors'),
    upgradeDropBonus: bonus('salvage'),
    goldMul: 1 + bonus('prospector'),
    startLevel: bonus('headStart'),
  };
}
