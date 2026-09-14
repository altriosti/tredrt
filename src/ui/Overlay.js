import * as THREE from 'three';

/**
 * The only DOM the visitor ever sees. Panels emerge contextually and leave
 * again; there is no navbar, sidebar, dashboard or footer anywhere.
 */
export class Overlay {
  constructor(root) {
    this.root = root;
    this.current = null;

    this.vignette = document.createElement('div');
    this.vignette.className = 'vignette';
    document.body.appendChild(this.vignette);

    this.blackout = document.createElement('div');
    this.blackout.className = 'blackout';
    document.body.appendChild(this.blackout);

    this.locator = document.createElement('div');
    this.locator.className = 'locator';
    document.body.appendChild(this.locator);

    this._projected = new THREE.Vector3();
  }

  fadeFromBlack() { requestAnimationFrame(() => this.blackout.classList.add('clear')); }
  fadeToBlack() { this.blackout.classList.remove('clear'); }

  /** Small label pinned to a real 3D position, e.g. the distant signal. */
  trackPoint(object3D, camera, label = '') {
    this.locator.textContent = label;
    this.locator.classList.add('on');
    this._track = { object3D, camera };
  }
  untrack() { this.locator.classList.remove('on'); this._track = null; }

  updateTracking() {
    if (!this._track) return;
    const { object3D, camera } = this._track;
    this._projected.setFromMatrixPosition(object3D.matrixWorld).project(camera);
    if (this._projected.z > 1) { this.locator.style.opacity = '0'; return; }
    const x = (this._projected.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-this._projected.y * 0.5 + 0.5) * window.innerHeight;
    this.locator.style.left = `${x}px`;
    this.locator.style.top = `${y - 46}px`;
  }

  clear() {
    if (!this.current) return;
    const el = this.current;
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 520);
    this.current = null;
  }

  /**
   * @param {object} o
   *  locus, title, body, input {placeholder, type}, actions [{label, primary, onClick}]
   * @returns {object} handle with { setStatus, setBusy, value, close }
   */
  show(o) {
    this.clear();
    const panel = document.createElement('div');
    panel.className = 'panel';

    if (o.locus) {
      const l = document.createElement('div');
      l.className = 'locus';
      l.textContent = o.locus;
      panel.appendChild(l);
    }

    const h = document.createElement('h2');
    h.textContent = o.title;
    panel.appendChild(h);

    if (o.body) {
      const p = document.createElement('p');
      p.textContent = o.body;
      panel.appendChild(p);
    }

    let input = null;
    if (o.input) {
      input = document.createElement('input');
      input.className = 'field';
      input.type = 'text';
      input.placeholder = o.input.placeholder || '';
      input.autocomplete = 'off';
      input.spellcheck = false;
      panel.appendChild(input);
    }

    const actions = document.createElement('div');
    actions.className = 'actions';
    const buttons = [];
    for (const a of o.actions || []) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'act' + (a.primary ? ' primary' : '');
      b.textContent = a.label;
      b.addEventListener('click', () => a.onClick(handle, b));
      actions.appendChild(b);
      buttons.push(b);
    }
    panel.appendChild(actions);

    const status = document.createElement('p');
    status.className = 'status';
    panel.appendChild(status);

    this.root.appendChild(panel);
    this.current = panel;

    const handle = {
      element: panel,
      get value() { return input ? input.value.trim() : ''; },
      setStatus(text, kind = '') {
        status.textContent = text;
        status.className = 'status' + (kind ? ' ' + kind : '');
      },
      setBusy(button, busy, busyLabel = 'VERIFYING') {
        if (!button) return;
        if (busy) {
          button.dataset.label = button.textContent;
          button.textContent = busyLabel;
          button.classList.add('busy');
          buttons.forEach((b) => (b.disabled = true));
        } else {
          if (button.dataset.label) button.textContent = button.dataset.label;
          button.classList.remove('busy');
          buttons.forEach((b) => (b.disabled = false));
        }
      },
      close: () => this.clear(),
    };

    if (input && o.input.submitOnEnter) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && buttons[0]) buttons[0].click();
      });
    }

    return handle;
  }
}
