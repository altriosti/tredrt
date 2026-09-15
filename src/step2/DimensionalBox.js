import * as THREE from 'three';

/**
 * The dimensional box: a real floating 3D structure, almost entirely black,
 * lit from underneath. The same object is used in the central universe and on
 * every destination Earth — only its light colour changes so it belongs to the
 * world it stands in.
 */
export class DimensionalBox {
  constructor({
    size = 9,
    underColor = 0x3aa0ff,
    doorColor = 0x6fc4ff,
    hover = 0.5,
  } = {}) {
    this.group = new THREE.Group();
    this.size = size;
    this.doorOpen = 0;
    this.hover = hover;

    const shellMat = new THREE.MeshStandardMaterial({
      color: 0x050506,
      roughness: 0.42,
      metalness: 0.6,
    });

    const h = size, w = size * 0.72, d = size * 0.72;
    this.body = new THREE.Group();

    // Four walls + roof + floor built as slabs, so the doorway is a real
    // opening in a real structure rather than a texture.
    const t = 0.35;
    const slab = (sx, sy, sz, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), shellMat);
      m.position.set(x, y, z);
      this.body.add(m);
      return m;
    };
    slab(w, t, d, 0, h, 0);           // roof
    slab(w, t, d, 0, 0, 0);           // floor
    slab(t, h, d, -w / 2, h / 2, 0);  // left
    slab(t, h, d, w / 2, h / 2, 0);   // right
    slab(w, h, t, 0, h / 2, -d / 2);  // back

    // Front face with a doorway: two side posts and a lintel.
    const doorW = w * 0.46;
    const postW = (w - doorW) / 2;
    slab(postW, h, t, -(doorW + postW) / 2, h / 2, d / 2);
    slab(postW, h, t, (doorW + postW) / 2, h / 2, d / 2);
    slab(doorW, h * 0.12, t, 0, h * 0.94, d / 2);

    // The door itself — a single slab that rises into the lintel.
    this.door = new THREE.Mesh(
      new THREE.BoxGeometry(doorW * 0.98, h * 0.88, t * 0.8),
      new THREE.MeshStandardMaterial({ color: 0x08090c, roughness: 0.35, metalness: 0.7 })
    );
    this.door.position.set(0, h * 0.44, d / 2);
    this.body.add(this.door);
    this.doorTravel = h * 0.88;

    // Light spilling out of the doorway as it opens.
    this.doorGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(doorW, h * 0.88),
      new THREE.MeshBasicMaterial({
        color: doorColor, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    this.doorGlow.position.set(0, h * 0.44, d / 2 - 0.05);
    this.body.add(this.doorGlow);
    this.doorLight = new THREE.PointLight(doorColor, 0, size * 3, 1.8);
    this.doorLight.position.set(0, h * 0.5, d / 2 + 1);
    this.body.add(this.doorLight);

    // Interior darkness: a black inner volume so the opening reads as depth.
    const inner = new THREE.Mesh(
      new THREE.BoxGeometry(w - t * 2, h - t * 2, d - t * 2),
      new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide })
    );
    inner.position.y = h / 2;
    this.body.add(inner);

    this.group.add(this.body);

    // ---- the blue illumination beneath the structure ----------------------
    this.underLight = new THREE.PointLight(underColor, 7, size * 8, 1.6);
    this.underLight.position.set(0, -0.6, 0);
    this.group.add(this.underLight);

    // Emissive underside plate, so the source is visible as well as felt.
    this.underPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.9, d * 0.9),
      new THREE.MeshBasicMaterial({
        color: underColor, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    this.underPlate.rotation.x = Math.PI / 2;
    this.underPlate.position.y = -0.15;
    this.group.add(this.underPlate);

    // Pooled light on the ground underneath.
    this.pool = new THREE.Mesh(
      new THREE.CircleGeometry(size * 1.5, 40),
      new THREE.MeshBasicMaterial({
        color: underColor, transparent: true, opacity: 0.28,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    this.pool.rotation.x = -Math.PI / 2;
    this.pool.position.y = -hover - 1.6;
    this.group.add(this.pool);

    this.underColor = underColor;
  }

  /** Animate the door rising. Returns a promise that resolves when it is open. */
  openDoor(seconds = 3.2) {
    return new Promise((resolve) => {
      const start = performance.now();
      const step = () => {
        const k = Math.min(1, (performance.now() - start) / (seconds * 1000));
        // Mechanical movement: a shudder, then a steady lift.
        const eased = k < 0.18
          ? Math.sin(k * 60) * 0.02
          : Math.pow((k - 0.18) / 0.82, 0.75);
        this.doorOpen = Math.max(0, eased);
        if (k < 1) requestAnimationFrame(step); else resolve();
      };
      step();
    });
  }

  closeDoor(seconds = 2.0) {
    return new Promise((resolve) => {
      const from = this.doorOpen;
      const start = performance.now();
      const step = () => {
        const k = Math.min(1, (performance.now() - start) / (seconds * 1000));
        this.doorOpen = from * (1 - k);
        if (k < 1) requestAnimationFrame(step); else resolve();
      };
      step();
    });
  }

  update(dt, t) {
    // The structure floats: it never rests on the ground.
    this.body.position.y = this.hover + Math.sin(t * 0.5) * 0.28;
    this.underPlate.position.y = this.body.position.y - 0.15;
    this.underLight.position.y = this.body.position.y - 0.6;

    const breath = 0.8 + Math.sin(t * 0.9) * 0.15;
    this.underLight.intensity = 6.5 * breath;
    this.underPlate.material.opacity = 0.7 * breath;
    this.pool.material.opacity = 0.22 * breath;

    this.door.position.y = this.size * 0.44 + this.doorOpen * this.doorTravel;
    this.doorGlow.material.opacity = this.doorOpen * 0.5;
    this.doorLight.intensity = this.doorOpen * 9;
  }
}
