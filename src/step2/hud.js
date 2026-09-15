/** Minimal heads-up readout: the journey timer and where it is heading. */
export class Hud {
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'hud';
    this.el.innerHTML =
      '<div class="hud-label"></div>' +
      '<div class="hud-dest"></div>' +
      '<div class="hud-universe"></div>' +
      '<div class="hud-clock"></div>' +
      '<div class="hud-note"></div>';
    document.body.appendChild(this.el);
    this.label = this.el.querySelector('.hud-label');
    this.dest = this.el.querySelector('.hud-dest');
    this.universe = this.el.querySelector('.hud-universe');
    this.clock = this.el.querySelector('.hud-clock');
    this.note = this.el.querySelector('.hud-note');
  }

  show(label, note = '') {
    this.label.textContent = label;
    this.note.textContent = note;
    this.el.classList.add('on');
  }

  /** Keeps the planet the visitor is traveling toward permanently visible. */
  setDestination(planet, universe) {
    this.dest.textContent = planet ? `DESTINATION · ${planet}` : '';
    this.universe.textContent = universe ? `UNIVERSE · ${universe}` : '';
  }

  setClock(text) { this.clock.textContent = text; }
  setNote(text) { this.note.textContent = text; }
  hide() { this.el.classList.remove('on'); }
}
