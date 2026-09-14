import * as THREE from 'three';

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);

/**
 * Handles every camera move in the journey. Nothing else is allowed to set
 * camera.position directly, so movement stays continuous and eased.
 */
export class CameraController {
  constructor(camera, { reducedMotion = false } = {}) {
    this.camera = camera;
    this.reducedMotion = reducedMotion;
    this.target = new THREE.Vector3(0, 0, -1);
    this.basePosition = new THREE.Vector3();
    this.move = null;
    this.idle = { amplitude: 0.35, speed: 0.16, enabled: true };
    this._tmp = new THREE.Vector3();
  }

  place(position, lookAt) {
    this.basePosition.copy(position);
    this.camera.position.copy(position);
    this.target.copy(lookAt);
    this.camera.lookAt(this.target);
  }

  /**
   * Eased dolly. Returns a promise resolved when the move finishes.
   * @param {THREE.Vector3} position
   * @param {THREE.Vector3} lookAt
   * @param {number} duration seconds
   */
  moveTo(position, lookAt, duration = 4, ease = easeInOutCubic) {
    const d = this.reducedMotion ? duration * 1.6 : duration;
    return new Promise((resolve) => {
      this.move = {
        fromPos: this.basePosition.clone(),
        toPos: position.clone(),
        fromLook: this.target.clone(),
        toLook: lookAt.clone(),
        t: 0,
        duration: d,
        ease,
        resolve,
      };
    });
  }

  /** Straight-line accelerating push, used when diving into a light source. */
  surgeTo(position, lookAt, duration = 2.2) {
    return this.moveTo(position, lookAt, duration, easeOutQuint);
  }

  update(dt, time) {
    if (this.move) {
      const m = this.move;
      m.t = Math.min(1, m.t + dt / m.duration);
      const k = m.ease(m.t);
      this.basePosition.lerpVectors(m.fromPos, m.toPos, k);
      this.target.lerpVectors(m.fromLook, m.toLook, k);
      if (m.t >= 1) { const done = m.resolve; this.move = null; done && done(); }
    }

    this.camera.position.copy(this.basePosition);

    if (this.idle.enabled) {
      const a = this.idle.amplitude * (this.reducedMotion ? 0.3 : 1);
      const s = this.idle.speed;
      this.camera.position.x += Math.sin(time * s) * a;
      this.camera.position.y += Math.sin(time * s * 1.37 + 1.2) * a * 0.55;
    }

    this.camera.lookAt(this.target);
  }
}
