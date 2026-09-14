import * as THREE from 'three';

/**
 * Engine owns the WebGL renderer, the active scene/camera, the frame loop and
 * the responsive performance controller. Worlds and transitions plug into it.
 */
export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.updaters = new Set();

    this.quality = this.detectQuality();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.quality.tier === 'high',
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.maxPixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = false; // atmosphere does the work, not shadows

    this.camera = new THREE.PerspectiveCamera(60, this.aspect, 0.1, 6000);
    this.scene = new THREE.Scene();

    this.applyCameraFraming();
    window.addEventListener('resize', () => this.onResize(), { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(() => this.onResize(), 250));
  }

  get aspect() { return window.innerWidth / Math.max(1, window.innerHeight); }
  get isPortrait() { return window.innerHeight >= window.innerWidth; }

  detectQuality() {
    const mem = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const small = Math.min(window.innerWidth, window.innerHeight) < 820;
    const mobile = coarse && small;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let tier = 'high';
    if (mobile) tier = mem <= 3 || cores <= 4 ? 'low' : 'medium';
    else if (cores <= 4) tier = 'medium';

    const table = {
      high:   { particleScale: 1.0,  terrainSegments: 192, propScale: 1.0,  maxPixelRatio: 2.0, fogDensityScale: 1.0 },
      medium: { particleScale: 0.55, terrainSegments: 128, propScale: 0.6,  maxPixelRatio: 1.6, fogDensityScale: 1.05 },
      low:    { particleScale: 0.32, terrainSegments: 88,  propScale: 0.38, maxPixelRatio: 1.3, fogDensityScale: 1.15 },
    };
    return { tier, mobile, reducedMotion: reduced, ...table[tier] };
  }

  applyCameraFraming() {
    // Portrait needs a wider field of view or the worlds feel cropped.
    this.camera.fov = this.isPortrait ? 74 : 60;
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
  }

  onResize() {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.maxPixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.applyCameraFraming();
  }

  /** Swap the rendered scene without tearing down the renderer. */
  setScene(scene) { this.scene = scene; }

  addUpdater(fn) { this.updaters.add(fn); return () => this.updaters.delete(fn); }
  removeUpdater(fn) { this.updaters.delete(fn); }

  start() {
    const loop = () => {
      this._raf = requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      const t = this.clock.elapsedTime;
      for (const fn of this.updaters) fn(dt, t);
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  stop() { cancelAnimationFrame(this._raf); }
}

/** Recursively free geometries/materials of a scene we are done with. */
export function disposeScene(scene) {
  scene.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        for (const key of Object.keys(m)) {
          const v = m[key];
          if (v && v.isTexture) v.dispose();
        }
        m.dispose();
      }
    }
  });
  scene.clear();
}
