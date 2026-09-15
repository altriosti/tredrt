import * as THREE from 'three';
import { VoxelBuilder, shellMaterial, trimMaterial } from './VoxelKit.js';

/**
 * The reality readout standing outside the arrival box: a real 3D voxel machine
 * whose screen is a live canvas texture. It reports the configured destination
 * data — never invented values.
 */
export class InfoMachine {
  constructor(destination, accent = 0x7fd0ff) {
    this.group = new THREE.Group();
    this.destination = destination;

    const cell = 0.34;
    const body = new VoxelBuilder(cell);
    // Base plinth
    body.bar(-5, 0, -2, 10, 2, 4);
    body.bar(-4, 2, -1, 8, 2, 2);
    // Column
    body.bar(-3, 4, -1, 6, 3, 2);
    // Screen housing
    for (let y = 7; y <= 17; y++) {
      body.cube(-5, y, 0, 1, 1, 2);
      body.cube(5, y, 0, 1, 1, 2);
    }
    for (let x = -5; x <= 5; x++) {
      body.cube(x, 17, 0, 1, 1, 2);
      body.cube(x, 7, 0, 1, 1, 2);
    }
    // Back plate
    body.bar(-5, 8, -1, 11, 9, 1);
    this.group.add(body.mesh(shellMaterial(0x11141c)));

    const trim = new VoxelBuilder(cell);
    trim.cube(0, 18, 0, 1, 1, 1);
    trim.cube(-2, 18, 0, 1, 1, 1);
    trim.cube(2, 18, 0, 1, 1, 1);
    for (let x = -4; x <= 4; x += 2) trim.cube(x, 3, 1, 1, 1, 1);
    this.trimMat = trimMaterial(accent, 1.8);
    this.group.add(trim.mesh(this.trimMat));

    // ---- the screen --------------------------------------------------------
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 384;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(10 * cell, 8 * cell),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true })
    );
    screen.position.set(0, 12 * cell, 1.05 * cell);
    this.group.add(screen);

    this.screenLight = new THREE.PointLight(accent, 2.4, 14, 1.8);
    this.screenLight.position.set(0, 12 * cell, 2);
    this.group.add(this.screenLight);

    this.accent = new THREE.Color(accent);
    this.lines = [];
    this.revealed = 0;
    this.buildLines();
    this.draw(0);
  }

  buildLines() {
    const d = this.destination;
    // Planet and universe come from the supplied destination record, verbatim.
    this.lines = [
      { label: 'CURRENT YEAR', value: d.year },
      { label: 'PLANET', value: d.planet },
      { label: 'UNIVERSE', value: d.universe },
      { label: 'DIMENSION', value: d.status },
    ];
  }

  /** Reveal the readout one field at a time. */
  reveal(seconds = 6) {
    return new Promise((resolve) => {
      const start = performance.now();
      const step = () => {
        const k = Math.min(1, (performance.now() - start) / (seconds * 1000));
        this.revealed = k * this.lines.length;
        if (k < 1) requestAnimationFrame(step); else resolve();
      };
      step();
    });
  }

  draw(time) {
    const ctx = this.ctx;
    const w = this.canvas.width, h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#04070c';
    ctx.fillRect(0, 0, w, h);

    // Scanlines, so the screen reads as a live display.
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let y = (time * 30) % 6; y < h; y += 6) ctx.fillRect(0, y, w, 1);

    const accent = `#${this.accent.getHexString()}`;
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.globalAlpha = 1;

    ctx.textAlign = 'left';
    let y = 62;
    for (let i = 0; i < this.lines.length; i++) {
      if (this.revealed < i + 0.4) break;
      const line = this.lines[i];
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.65;
      ctx.font = '500 18px system-ui, sans-serif';
      ctx.fillText(line.label, 38, y);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      let size = 30;
      ctx.font = `600 ${size}px system-ui, sans-serif`;
      // Some planet names are long; shrink rather than overflow the screen.
      while (ctx.measureText(line.value).width > w - 76 && size > 15) {
        size -= 2;
        ctx.font = `600 ${size}px system-ui, sans-serif`;
      }
      ctx.fillText(line.value, 38, y + 34);
      y += 82;
    }

    // Blinking cursor while more fields are still arriving.
    if (this.revealed < this.lines.length && Math.sin(time * 6) > 0) {
      ctx.fillStyle = accent;
      ctx.fillRect(38, y - 18, 14, 22);
    }

    this.texture.needsUpdate = true;
  }

  update(dt, t) {
    this.draw(t);
    this.trimMat.emissiveIntensity = 1.4 + Math.sin(t * 1.8) * 0.4;
    this.screenLight.intensity = 2.0 + Math.sin(t * 1.4) * 0.5;
  }
}
