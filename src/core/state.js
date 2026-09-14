// Client storage exists so an accidental refresh does not restart the whole
// cinematic journey. It is NOT proof of anything: every verification is
// re-checked server-side against the authenticated X session before the final
// submission is accepted.

const KEY = 'mv.whitelist.journey.v1';

const EMPTY = {
  stage: 'arrival',
  xConnected: false,
  xHandle: null,
  followVerified: false,
  likeVerified: false,
  repostVerified: false,
  commentSubmitted: false,
  commentUrl: null,
  walletSubmitted: false,
  wallet: null,
  whitelistComplete: false,
};

export const STAGES = [
  'arrival',
  'desert',
  'connect',
  'living',
  'follow',
  'like',
  'repost',
  'comment',
  'commentLink',
  'wallet',
  'final',
];

class JourneyState {
  constructor() {
    this.data = { ...EMPTY };
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = { ...EMPTY, ...JSON.parse(raw) };
    } catch { /* storage may be blocked; the journey still works */ }
  }

  get() { return this.data; }

  set(patch) {
    this.data = { ...this.data, ...patch };
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* ignore */ }
    return this.data;
  }

  reset() {
    this.data = { ...EMPTY };
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  }

  /** The stage the journey should resume at. */
  resumeStage() {
    const d = this.data;
    if (d.whitelistComplete) return 'final';
    if (d.commentSubmitted) return 'wallet';
    if (d.repostVerified) return 'comment';
    if (d.likeVerified) return 'repost';
    if (d.followVerified) return 'like';
    if (d.xConnected) return 'follow';
    return 'arrival';
  }

  /** True when resuming should skip the opening corridor. */
  get hasProgress() { return this.data.xConnected; }
}

export const journey = new JourneyState();
