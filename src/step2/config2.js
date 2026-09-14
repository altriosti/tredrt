// -----------------------------------------------------------------------------
// STEP 2 CONFIGURATION — dimensional staking, injection and planetary travel.
// -----------------------------------------------------------------------------

export const STEP2 = {
  // DEMO MODE. No contract is called, no ETH moves, no token is transferred.
  // Switch to 'production' only after a real transaction service is wired in.
  mode: 'demo',

  stake: {
    amount: '0.0005',
    currency: 'ETH',
    // Displayed so the visitor understands the real requirement, while the
    // demo transaction service never requests funds.
  },

  timers: {
    travelSeconds: 30 * 60,      // 30 minutes of dimensional travel
    planetSeconds: 24 * 60 * 60, // 24 hours on the destination Earth
  },

  // Development helpers. Set to a number of seconds to shorten a timer while
  // testing the visuals; leave null for the real durations.
  debug: {
    travelSecondsOverride: null,
    planetSecondsOverride: null,
    startAtState: null, // e.g. 'TRAVELING', 'ARRIVED', 'RETURN_AVAILABLE'
  },

  reward: {
    symbol: '$NVDA',
  },
};

export const travelDuration = () =>
  STEP2.debug.travelSecondsOverride ?? STEP2.timers.travelSeconds;

export const planetDuration = () =>
  STEP2.debug.planetSecondsOverride ?? STEP2.timers.planetSeconds;
