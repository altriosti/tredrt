/** Minimal heads-up readout for the two journey timers. Nothing else. */
export class Hud {
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'hud';
    this.el.innerHTML =
      '<div class="hud-label"></div><div class="hud-clock"></div><div class="hud-note"></div>';
    document.body.appendChild(this.el);
    this.label = this.el.querySelector('.hud-label');
    this.clock = this.el.querySelector('.hud-clock');
    this.note = this.el.querySelector('.hud-note');
  }

  show(label, note = '') {
    this.label.textContent = label;
    this.note.textContent = note;
    this.el.classList.add('on');
  }

  setClock(text) { this.clock.textContent = text; }
  setNote(text) { this.note.textContent = text; }
  hide() { this.el.classList.remove('on'); }
}
