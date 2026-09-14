// Optional atmosphere. Nothing autoplays: the visitor must switch it on, and
// the entire visual experience is complete without it.

export class Ambience {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.nodes = [];
  }

  toggle() { return this.enabled ? (this.stop(), false) : (this.start(), true); }

  start() {
    if (this.enabled) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = this.ctx || new AC();
    this.ctx.resume();

    const master = this.ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(this.ctx.destination);
    master.gain.exponentialRampToValueAtTime(0.06, this.ctx.currentTime + 6);

    // Two detuned low oscillators through a slow filter: a distant frequency,
    // not music.
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    filter.Q.value = 3;
    filter.connect(master);

    for (const freq of [46, 69.5]) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 1.8;
      lfo.connect(lfoGain).connect(osc.frequency);
      osc.connect(filter);
      osc.start(); lfo.start();
      this.nodes.push(osc, lfo);
    }

    this.master = master;
    this.enabled = true;
  }

  stop() {
    if (!this.enabled) return;
    try {
      this.master.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2);
      setTimeout(() => { this.nodes.forEach((n) => n.stop()); this.nodes = []; }, 1400);
    } catch { /* ignore */ }
    this.enabled = false;
  }

  /** Brief rise used when a dimensional passage opens. */
  swell() {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.exponentialRampToValueAtTime(0.14, t + 1.6);
    this.master.gain.exponentialRampToValueAtTime(0.06, t + 5.0);
  }
}
