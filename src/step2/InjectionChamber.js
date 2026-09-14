import * as THREE from 'three';
import { InjectionDevice } from './InjectionDevice.js';
import { createAtmosphere } from '../core/Atmosphere.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

/** Runs a timed animation on the engine clock and resolves when finished. */
function animate(engine, seconds, fn) {
  return new Promise((resolve) => {
    let e = 0;
    const stop = engine.addUpdater((dt, t) => {
      e += dt;
      const k = Math.min(1, e / seconds);
      fn(k, t, dt);
      if (k >= 1) { stop(); resolve(); }
    });
  });
}

/**
 * The dimensional injection chamber.
 *
 * The selected NFT's real artwork hangs in the chamber, is scanned by moving
 * light, breaks into pixel-block particles, and those blocks feed the device's
 * liquid. The device then turns toward the traveler — the camera — and
 * administers the dose. Every stage is animated in 3D.
 */
export class InjectionChamber {
  constructor(nft, quality) {
    this.nft = nft;
    this.quality = quality;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x02030a, 0.02);

    const pal = nft.palette;
    this.scene.add(new THREE.AmbientLight(0x20304a, 0.5));

    // Chamber shell: we are inside the dimensional box.
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x06070c, roughness: 0.5, metalness: 0.6, side: THREE.BackSide,
    });
    const room = new THREE.Mesh(new THREE.BoxGeometry(26, 16, 34), wallMat);
    room.position.set(0, 4, -6);
    this.scene.add(room);

    // Floor ring of light around the pedestal.
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(3.2, 4.0, 48),
      new THREE.MeshBasicMaterial({
        color: pal.glow, transparent: true, opacity: 0.4,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.set(0, -3.6, -10);
    this.scene.add(this.ring);

    this.keyLight = new THREE.PointLight(pal.glow, 2.4, 40, 1.6);
    this.keyLight.position.set(0, 3, -4);
    this.scene.add(this.keyLight);

    this.dust = createAtmosphere({
      count: 1400 * quality.particleScale,
      color: pal.glow, size: 1.3, opacity: 0.32, swirl: 1.6,
      drift: new THREE.Vector3(0.2, 0.6, 0.15),
      bounds: { x: 24, y: 16, z: 32 }, seed: nft.tokenId,
    });
    this.dust.position.set(0, -4, -6);
    this.scene.add(this.dust);

    // ---- the NFT itself ----------------------------------------------------
    this.artGroup = new THREE.Group();
    this.artGroup.position.set(0, 1.2, -11);
    this.scene.add(this.artGroup);

    const tex = new THREE.TextureLoader().load(nft.image, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      this.buildPixelBlocks(t.image);
    });
    this.artMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0 });
    this.art = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), this.artMat);
    this.artGroup.add(this.art);

    // Frame around the artwork so it reads as a scanned specimen.
    const frameMat = new THREE.MeshBasicMaterial({
      color: pal.trim, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
    });
    this.frameMat = frameMat;
    for (const [x, y, w, h] of [[0, 3.1, 6.4, 0.12], [0, -3.1, 6.4, 0.12], [-3.1, 0, 0.12, 6.4], [3.1, 0, 0.12, 6.4]]) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(w, h), frameMat);
      bar.position.set(x, y, 0.02);
      this.artGroup.add(bar);
    }

    // Scan bar that sweeps the artwork.
    this.scanBar = new THREE.Mesh(
      new THREE.PlaneGeometry(6.6, 0.22),
      new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    this.scanBar.position.z = 0.08;
    this.artGroup.add(this.scanBar);

    // ---- the device --------------------------------------------------------
    this.device = new InjectionDevice(pal, quality);
    this.device.group.position.set(0, -1.5, -12);
    this.device.group.scale.setScalar(0);
    // Master composition: held on the diagonal, plunger high, needle low.
    this.device.group.rotation.set(0.25, 0.5, -0.62);
    this.scene.add(this.device.group);

    // Energy envelope that engulfs the traveler at the end.
    this.envelope = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 18),
      new THREE.MeshBasicMaterial({
        color: pal.liquid, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide,
      })
    );
    this.scene.add(this.envelope);

    this.pixelBlocks = null;
    this.blockProgress = 0;
  }

  /**
   * Break the real artwork into chunky 3D blocks, coloured by sampling the
   * image. These are the pixel-blocks that separate from the NFT.
   */
  buildPixelBlocks(image) {
    const N = this.quality.tier === 'low' ? 18 : this.quality.tier === 'medium' ? 26 : 34;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = N;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, N, N);
    const data = ctx.getImageData(0, 0, N, N).data;

    const size = 6 / N;
    const geo = new THREE.BoxGeometry(size * 0.92, size * 0.92, size * 0.92);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: false });
    const count = N * N;
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);

    const m = new THREE.Matrix4();
    const color = new THREE.Color();
    this.blockData = [];
    let visible = 0;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = (y * N + x) * 4;
        const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
        const lum = r * 0.3 + g * 0.6 + b * 0.1;
        const idx = y * N + x;
        const home = new THREE.Vector3(
          (x / (N - 1) - 0.5) * 6,
          -(y / (N - 1) - 0.5) * 6,
          0
        );
        // Dark background pixels of the artwork stay behind; only the device
        // itself dissolves into blocks.
        const active = lum > 0.12;
        if (active) visible++;
        this.blockData.push({
          home,
          active,
          drift: new THREE.Vector3(
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 4 + 1,
            Math.random() * 4
          ),
          phase: Math.random() * 6.28,
          delay: Math.random() * 0.45,
        });
        color.setRGB(r, g, b);
        mesh.setColorAt(idx, color);
        m.makeTranslation(home.x, home.y, home.z);
        m.scale(new THREE.Vector3(active ? 1 : 0, active ? 1 : 0, active ? 1 : 0));
        mesh.setMatrixAt(idx, m);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.visible = false;
    this.artGroup.add(mesh);
    this.pixelBlocks = mesh;
    this.blockCount = visible;
  }

  /**
   * The full injection sequence.
   * @param {Engine} engine
   * @param {(label:string)=>void} onStage
   */
  async run(engine, onStage = () => {}) {
    const camera = engine.camera;
    camera.position.set(0, 0.6, 2.5);
    camera.lookAt(0, 1.0, -11);

    // 1. The NFT appears inside the chamber.
    onStage('SPECIMEN LOADED');
    await animate(engine, 2.2, (k) => {
      this.artMat.opacity = easeOut(k);
      this.frameMat.opacity = easeOut(k) * 0.8;
      this.artGroup.position.z = -14 + easeOut(k) * 3;
    });

    // 2. Moving dimensional light scans the artwork.
    onStage('SCANNING DIMENSIONAL SIGNATURE');
    await animate(engine, 4.0, (k) => {
      const pass = (k * 2) % 1;
      this.scanBar.position.y = 3.2 - pass * 6.4;
      this.scanBar.material.opacity = 0.9 * Math.sin(pass * Math.PI);
      this.keyLight.intensity = 2.4 + Math.sin(k * 30) * 0.6;
    });
    this.scanBar.material.opacity = 0;

    // 3. Pixel-block particles separate from the NFT.
    onStage('SEPARATING PIXEL MATTER');
    if (this.pixelBlocks) {
      this.pixelBlocks.visible = true;
      this.artMat.opacity = 0.9;
    }
    await animate(engine, 4.5, (k, t) => {
      this.blockProgress = k;
      this.artMat.opacity = 0.9 * (1 - easeOut(k));
      this.frameMat.opacity = 0.8 * (1 - k);
      this.updateBlocks(k, t);
    });

    // 4-5. Energy gathers and the device takes shape in the chamber.
    onStage('ASSEMBLING INJECTION DEVICE');
    await animate(engine, 3.4, (k, t) => {
      const s = easeOut(k);
      this.device.group.scale.setScalar(s * 3.0);
      this.device.setCharge(k * 0.5);
      this.ring.material.opacity = 0.4 + k * 0.4;
      this.updateBlocks(1, t, k); // blocks stream into the device
    });
    if (this.pixelBlocks) this.pixelBlocks.visible = false;

    // 6-7. The liquid burns and energy moves through it.
    onStage('CHARGING DIMENSIONAL LIQUID');
    await animate(engine, 3.0, (k) => {
      this.device.setCharge(0.5 + k * 0.5);
      this.keyLight.intensity = 2.4 + k * 5;
    });

    // 8. The device moves toward the traveler.
    onStage('INJECTION APPROACHING');
    const from = this.device.group.position.clone();
    const to = new THREE.Vector3(0.35, 0.1, 0.9);
    const rotFrom = this.device.group.rotation.clone();
    await animate(engine, 3.2, (k) => {
      const e = easeInOut(k);
      this.device.group.position.lerpVectors(from, to, e);
      this.device.group.scale.setScalar(3.0 - e * 1.1);
      this.device.group.rotation.set(
        rotFrom.x + e * 0.35,
        rotFrom.y - e * 0.3,
        rotFrom.z - e * 0.5
      );
    });

    // 9-10. The dose is administered and the liquid enters the traveler.
    onStage('ADMINISTERING');
    await animate(engine, 3.6, (k, t) => {
      this.device.setDrain(easeOut(k));
      this.device.setCharge(1 + Math.sin(t * 18) * 0.25 * (1 - k));
      // The traveler's view reacts to the dose entering.
      camera.position.x = Math.sin(t * 24) * 0.035 * (1 - k * 0.4);
      camera.position.y = 0.6 + Math.sin(t * 19) * 0.03 * (1 - k * 0.4);
      this.envelope.material.opacity = k * 0.5;
      this.envelope.scale.setScalar(1 + k * 18);
    });

    // 11-13. Energy surrounds the traveler, the chamber distorts, and the
    // dimensional transition begins.
    onStage('DIMENSIONAL TRANSFER');
    await animate(engine, 3.4, (k, t) => {
      this.device.group.position.z = 0.9 + k * 3;
      this.device.group.scale.setScalar(1.9 * (1 - k));
      this.envelope.material.opacity = 0.5 + k * 0.5;
      this.envelope.scale.setScalar(19 + k * 30);
      this.keyLight.intensity = 7 + k * 26;
      camera.rotation.z = Math.sin(t * 2.2) * 0.08 * k;
      camera.fov = 60 + k * 26;
      camera.updateProjectionMatrix();
    });
    camera.fov = 60;
    camera.rotation.z = 0;
    camera.updateProjectionMatrix();
  }

  /** Blocks lift off the artwork, then stream into the device. */
  updateBlocks(separation, t, intake = 0) {
    if (!this.pixelBlocks) return;
    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const target = new THREE.Vector3(0, -2.7, -1); // device barrel, in art space
    const q = new THREE.Quaternion();
    const scaleV = new THREE.Vector3();

    for (let i = 0; i < this.blockData.length; i++) {
      const b = this.blockData[i];
      if (!b.active) continue;
      const k = Math.max(0, Math.min(1, (separation - b.delay) / (1 - b.delay)));
      pos.copy(b.home).addScaledVector(b.drift, k);
      pos.x += Math.sin(t * 1.6 + b.phase) * 0.12 * k;
      pos.y += Math.cos(t * 1.4 + b.phase) * 0.12 * k;

      let scale = 1;
      if (intake > 0) {
        const j = Math.max(0, Math.min(1, (intake - b.delay * 0.5) * 1.6));
        pos.lerp(target, easeOut(j));
        scale = 1 - j;
      }
      scaleV.set(scale, scale, scale);
      m.compose(pos, q, scaleV);
      this.pixelBlocks.setMatrixAt(i, m);
    }
    this.pixelBlocks.instanceMatrix.needsUpdate = true;
  }

  update(dt, t) {
    this.dust.userData.update(dt, t);
    this.device.update(dt, t);
    this.ring.rotation.z = t * 0.12;
  }

  dispose() {
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach((mm) => { if (mm.map) mm.map.dispose(); mm.dispose(); });
      }
    });
    this.scene.clear();
  }
}
