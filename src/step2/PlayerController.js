import * as THREE from 'three';

/**
 * First-person exploration for the destination planet.
 *
 * Desktop: W A S D to move, mouse to look (pointer lock), Shift to move faster.
 * Mobile:  a thumb-stick in the lower left, drag anywhere else to look.
 *
 * The player walks the real terrain — height is sampled from the same function
 * that built it — and is pushed out of solid objects rather than passing
 * through them. Nobody is teleported anywhere.
 */
export class PlayerController {
  constructor(camera, world, { quality, obstacles = [], start = new THREE.Vector3() } = {}) {
    this.camera = camera;
    this.world = world;
    this.quality = quality;
    this.obstacles = obstacles;

    this.position = start.clone();
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.eyeHeight = 3.2;
    this.speed = 26;
    this.runMultiplier = 1.8;
    this.enabled = false;
    this.bob = 0;

    this.keys = new Set();
    this.look = { x: 0, y: 0 };
    this.move = { x: 0, y: 0 };

    this.isTouch = window.matchMedia('(pointer: coarse)').matches;
    this.bind();
  }

  // ------------------------------------------------------------------ input
  bind() {
    this.onKeyDown = (e) => {
      if (!this.enabled) return;
      this.keys.add(e.code);
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(e.code)) e.preventDefault();
    };
    this.onKeyUp = (e) => this.keys.delete(e.code);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    const canvas = document.getElementById('stage');
    this.canvas = canvas;

    // Desktop look: pointer lock, so the mouse turns the head.
    this.onMouseMove = (e) => {
      if (!this.enabled || document.pointerLockElement !== canvas) return;
      this.applyLook(e.movementX * 0.0022, e.movementY * 0.0022);
    };
    this.onCanvasClick = () => {
      if (this.enabled && !this.isTouch && document.pointerLockElement !== canvas) {
        canvas.requestPointerLock?.();
      }
    };
    document.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('click', this.onCanvasClick);

    if (this.isTouch) this.buildTouchControls();
  }

  applyLook(dx, dy) {
    this.yaw -= dx;
    this.pitch = Math.max(-1.2, Math.min(1.0, this.pitch - dy));
  }

  /** Thumb-stick and look pad, drawn to match the world rather than a game HUD. */
  buildTouchControls() {
    const stick = document.createElement('div');
    stick.className = 'stick';
    stick.innerHTML = '<div class="stick-ring"></div><div class="stick-nub"></div>';
    document.body.appendChild(stick);
    this.stickEl = stick;
    const nub = stick.querySelector('.stick-nub');

    let stickId = null;
    const radius = 52;
    const center = { x: 0, y: 0 };

    const startStick = (t) => {
      stickId = t.identifier;
      const r = stick.getBoundingClientRect();
      center.x = r.left + r.width / 2;
      center.y = r.top + r.height / 2;
    };
    const moveStick = (t) => {
      let dx = t.clientX - center.x;
      let dy = t.clientY - center.y;
      const len = Math.hypot(dx, dy);
      if (len > radius) { dx = (dx / len) * radius; dy = (dy / len) * radius; }
      nub.style.transform = `translate(${dx}px, ${dy}px)`;
      this.move.x = dx / radius;
      this.move.y = -dy / radius;
    };
    const endStick = () => {
      stickId = null;
      nub.style.transform = 'translate(0px, 0px)';
      this.move.x = 0;
      this.move.y = 0;
    };

    let lookId = null;
    let lookLast = { x: 0, y: 0 };

    this.onTouchStart = (e) => {
      if (!this.enabled) return;
      for (const t of e.changedTouches) {
        const overStick = stick.contains(document.elementFromPoint(t.clientX, t.clientY));
        if (overStick && stickId === null) { startStick(t); moveStick(t); }
        else if (lookId === null) { lookId = t.identifier; lookLast = { x: t.clientX, y: t.clientY }; }
      }
    };
    this.onTouchMove = (e) => {
      if (!this.enabled) return;
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) { moveStick(t); e.preventDefault(); }
        else if (t.identifier === lookId) {
          this.applyLook((t.clientX - lookLast.x) * 0.005, (t.clientY - lookLast.y) * 0.005);
          lookLast = { x: t.clientX, y: t.clientY };
        }
      }
    };
    this.onTouchEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) endStick();
        if (t.identifier === lookId) lookId = null;
      }
    };

    window.addEventListener('touchstart', this.onTouchStart, { passive: false });
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd);
    window.addEventListener('touchcancel', this.onTouchEnd);
  }

  // ----------------------------------------------------------------- control
  enable(hintEl) {
    this.enabled = true;
    if (this.stickEl) this.stickEl.classList.add('on');
    this.hintEl = hintEl;
  }

  disable() {
    this.enabled = false;
    this.keys.clear();
    this.move.x = this.move.y = 0;
    if (this.stickEl) this.stickEl.classList.remove('on');
    if (document.pointerLockElement === this.canvas) document.exitPointerLock?.();
  }

  /** Face a point in the world without moving. */
  lookAt(target) {
    const dir = target.clone().sub(this.position).normalize();
    this.yaw = Math.atan2(-dir.x, -dir.z);
    this.pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
  }

  groundAt(x, z) {
    return this.world.heightAt(x, z);
  }

  update(dt) {
    if (!this.enabled) return;

    // Gather intent from whichever input the visitor is using.
    let fwd = this.move.y;
    let strafe = this.move.x;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) fwd += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) fwd -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) strafe += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) strafe -= 1;

    const len = Math.hypot(fwd, strafe);
    if (len > 1) { fwd /= len; strafe /= len; }

    const running = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const speed = this.speed * (running ? this.runMultiplier : 1);

    // Move relative to where the player is facing.
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const target = new THREE.Vector3(
      (-sin * fwd + cos * strafe) * speed,
      0,
      (-cos * fwd - sin * strafe) * speed
    );

    // Smoothing, so movement accelerates rather than snapping on and off.
    this.velocity.lerp(target, Math.min(1, dt * 7));

    const next = this.position.clone().addScaledVector(this.velocity, dt);

    // Solid objects push the player out instead of letting them walk through.
    for (const o of this.obstacles) {
      const dx = next.x - o.x;
      const dz = next.z - o.z;
      const d = Math.hypot(dx, dz);
      if (d < o.r && d > 0.001) {
        next.x = o.x + (dx / d) * o.r;
        next.z = o.z + (dz / d) * o.r;
      }
    }

    // Stay inside the world's terrain plate.
    const limit = (this.world.def.terrain.size / 2) - 40;
    next.x = THREE.MathUtils.clamp(next.x, -limit, limit);
    next.z = THREE.MathUtils.clamp(next.z, -limit, limit);

    this.position.copy(next);

    // Walk the real terrain surface.
    const ground = this.groundAt(this.position.x, this.position.z);
    const targetY = ground + this.eyeHeight;
    this.position.y += (targetY - this.position.y) * Math.min(1, dt * 9);

    // A little head movement while walking.
    const moving = this.velocity.lengthSq() > 4;
    this.bob += dt * (moving ? (running ? 11 : 7.5) : 0);
    const bobY = moving ? Math.sin(this.bob) * 0.16 : 0;

    this.camera.position.set(this.position.x, this.position.y + bobY, this.position.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = 0;
  }

  dispose() {
    this.disable();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('click', this.onCanvasClick);
    if (this.onTouchStart) {
      window.removeEventListener('touchstart', this.onTouchStart);
      window.removeEventListener('touchmove', this.onTouchMove);
      window.removeEventListener('touchend', this.onTouchEnd);
      window.removeEventListener('touchcancel', this.onTouchEnd);
    }
    this.stickEl?.remove();
  }
}
