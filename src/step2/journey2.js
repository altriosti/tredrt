// -----------------------------------------------------------------------------
// STEP 2 JOURNEY STATE
// A strict state machine plus timestamp-based persistence. Timers are stored as
// absolute start times, never as remaining seconds, so a refresh or a closed
// browser cannot shorten or restart a journey.
//
// This is demo-grade persistence: it survives refresh, not a user who clears
// their own storage. Production enforcement belongs on-chain or server-side and
// replaces only this module.
// -----------------------------------------------------------------------------

import { travelDuration, planetDuration } from './config2.js';

const KEY = 'mv.dimension.journey.v1';

export const STATES = {
  IDLE: 'IDLE',
  NFT_SELECTED: 'NFT_SELECTED',
  STAKE_PENDING: 'STAKE_PENDING',
  STAKE_CONFIRMED_DEMO: 'STAKE_CONFIRMED_DEMO',
  INJECTION_RUNNING: 'INJECTION_RUNNING',
  TRAVELING: 'TRAVELING',
  ARRIVED: 'ARRIVED',
  PLANET_LOCKED: 'PLANET_LOCKED',
  RETURN_AVAILABLE: 'RETURN_AVAILABLE',
  RETURNING: 'RETURNING',
  JOURNEY_COMPLETE: 'JOURNEY_COMPLETE',
  REWARD_CLAIM_DEMO: 'REWARD_CLAIM_DEMO',
};

// A stake can never skip the injection, and travel can never be skipped.
const ALLOWED = {
  IDLE: ['NFT_SELECTED'],
  NFT_SELECTED: ['NFT_SELECTED', 'STAKE_PENDING'],
  STAKE_PENDING: ['STAKE_CONFIRMED_DEMO', 'NFT_SELECTED'],
  STAKE_CONFIRMED_DEMO: ['INJECTION_RUNNING'],
  INJECTION_RUNNING: ['TRAVELING'],
  TRAVELING: ['ARRIVED'],
  ARRIVED: ['PLANET_LOCKED'],
  PLANET_LOCKED: ['RETURN_AVAILABLE'],
  RETURN_AVAILABLE: ['RETURNING'],
  RETURNING: ['JOURNEY_COMPLETE'],
  JOURNEY_COMPLETE: ['REWARD_CLAIM_DEMO'],
  REWARD_CLAIM_DEMO: ['IDLE'],
};

const EMPTY = {
  state: STATES.IDLE,
  selectedToken: null,
  destination: null,
  injectionCompleted: false,
  travelStartTimestamp: null,
  planetArrivalTimestamp: null,
  rewardClaimed: false,
};

class Journey2 {
  constructor() {
    this.data = { ...EMPTY };
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = { ...EMPTY, ...JSON.parse(raw) };
    } catch { /* storage may be blocked */ }
  }

  get() { return this.data; }
  get state() { return this.data.state; }

  persist() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* ignore */ }
  }

  patch(fields) {
    this.data = { ...this.data, ...fields };
    this.persist();
    return this.data;
  }

  canTransition(next) {
    return (ALLOWED[this.data.state] || []).includes(next);
  }

  /**
   * Move to the next state. Invalid transitions are refused, not silently
   * applied, so the sequence cannot be skipped.
   */
  transition(next, fields = {}) {
    if (!this.canTransition(next)) {
      console.warn(`[journey] refused ${this.data.state} -> ${next}`);
      return false;
    }
    this.data = { ...this.data, ...fields, state: next };
    this.persist();
    return true;
  }

  // ------------------------------------------------------------- timers ---
  startTravel() {
    return this.transition(STATES.TRAVELING, {
      injectionCompleted: true,
      travelStartTimestamp: Date.now(),
    });
  }

  travelRemainingMs() {
    const start = this.data.travelStartTimestamp;
    if (!start) return travelDuration() * 1000;
    return Math.max(0, start + travelDuration() * 1000 - Date.now());
  }

  travelElapsed() { return this.travelRemainingMs() <= 0; }

  markArrived() {
    if (!this.transition(STATES.ARRIVED, { planetArrivalTimestamp: Date.now() })) return false;
    return this.transition(STATES.PLANET_LOCKED);
  }

  planetRemainingMs() {
    const start = this.data.planetArrivalTimestamp;
    if (!start) return planetDuration() * 1000;
    return Math.max(0, start + planetDuration() * 1000 - Date.now());
  }

  planetElapsed() { return this.planetRemainingMs() <= 0; }

  reset() {
    this.data = { ...EMPTY };
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  }
}

export const journey2 = new Journey2();

export function formatClock(ms) {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
