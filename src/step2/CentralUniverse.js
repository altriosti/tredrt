import * as THREE from 'three';
import { createAtmosphere } from '../core/Atmosphere.js';
import { DimensionalBox } from './DimensionalBox.js';

/**
 * The central universe: the largest reality, and the hub every traveler passes
 * through. Dark, enormous and almost silent. The only structure is the black
 * dimensional box floating above the floor.
 */
export class CentralUniverse {
  constructor(quality) {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x02030a, 0.0125);
    this.quality = quality;

    this.scene.add(new THREE.AmbientLight(0x1a2740, 0.35));
    const key = new THREE.DirectionalLight(0x3f5f9f, 0.28);
    key.position.set(-60, 90, 40);
    this.scene.add(key);

    // ---- floor: dark, wide, and responsive to the box's blue light --------
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 900, 1, 1),
      new THREE.MeshStandardMaterial({
        color: 0x05070d,
        roughness: 0.28,
        metalness: 0.8,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -6;
    this.scene.add(floor);

    // A faint lattice so the floor has scale without becoming a grid dashboard.
    const grid = new THREE.GridHelper(900, 90, 0x16304f, 0x0b1828);
    grid.position.y = -5.96;
    grid.material.transparent = true;
    grid.material.opacity = 0.22;
    this.scene.add(grid);

    // ---- the enormity around the hub --------------------------------------
    this.distant = new THREE.Group();
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + Math.random();
      const r = 320 + Math.random() * 520;
      const hgt = 120 + Math.random() * 420;
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(18 + Math.random() * 40, hgt, 18 + Math.random() * 40),
        new THREE.MeshBasicMaterial({
          color: 0x0d2340,
          transparent: true,
          opacity: 0.16,
        })
      );
      m.position.set(Math.cos(a) * r, hgt / 2 - 6, Math.sin(a) * r);
      m.userData.phase = Math.random() * 6.28;
      this.distant.add(m);
    }
    this.scene.add(this.distant);

    this.dust = createAtmosphere({
      count: 2600 * quality.particleScale,
      color: 0x6f9fd8,
      size: 1.5,
      opacity: 0.3,
      swirl: 2.0,
      drift: new THREE.Vector3(0.5, 0.35, 0.3),
      bounds: { x: 500, y: 200, z: 500 },
      seed: 21,
    });
    this.dust.position.y = -6;
    this.scene.add(this.dust);

    // ---- the black dimensional box ----------------------------------------
    this.box = new DimensionalBox({ size: 10, underColor: 0x2f8fff, doorColor: 0x7fd0ff, hover: 1.4 });
    this.box.group.position.set(0, -6, -34);
    this.scene.add(this.box.group);

    this.camera = {
      entry: { pos: [0, 4, 60], look: [0, 2, -34] },
      approach: { pos: [0, 2.5, -14], look: [0, 4, -34] },
      inside: { pos: [0, 2.5, -30], look: [0, 3, -48] },
    };
  }

  update(dt, t) {
    this.dust.userData.update(dt, t);
    this.box.update(dt, t);
    for (const m of this.distant.children) {
      m.material.opacity = 0.10 + Math.sin(t * 0.18 + m.userData.phase) * 0.06;
    }
  }
}
