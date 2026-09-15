import * as THREE from 'three';
import { makeRandom } from '../core/utils/noise.js';

/**
 * Dimensional travel.
 *
 * This scene runs for the whole 30-minute transit, so it is built to stay alive
 * without becoming exhausting: fragments stream past, energy runs along the
 * corridor, distant reality structures drift by, and the light slowly shifts
 * through long cycles rather than flashing.
 */
export class TravelScene {
  constructor(quality, palette = {}) {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x03030f, 0.0022);
    this.quality = quality;
    this.speed = 1;
    this.depth = 900;

    const rand = makeRandom(palette.seed ?? 12);
    const colA = new THREE.Color(palette.a ?? 0x5b8cff);
    const colB = new THREE.Color(palette.b ?? 0xc07bff);
    this.colA = colA;
    this.colB = colB;

    this.scene.add(new THREE.AmbientLight(0x2a3660, 0.6));
    this.leadLight = new THREE.PointLight(colB, 3, 300, 1.4);
    this.leadLight.position.set(0, 0, -160);
    this.scene.add(this.leadLight);

    // ---- geometric fragments streaming past --------------------------------
    const fragCount = Math.floor(420 * quality.propScale + 60);
    const fragGeo = new THREE.BoxGeometry(1, 1, 1);
    const fragMat = new THREE.MeshStandardMaterial({
      color: 0x121a33, roughness: 0.4, metalness: 0.7, flatShading: true,
    });
    this.fragments = new THREE.InstancedMesh(fragGeo, fragMat, fragCount);
    this.fragData = [];
    for (let i = 0; i < fragCount; i++) {
      this.fragData.push({
        pos: new THREE.Vector3(
          (rand() - 0.5) * 340,
          (rand() - 0.5) * 240,
          -rand() * this.depth
        ),
        rot: new THREE.Euler(rand() * 6.28, rand() * 6.28, rand() * 6.28),
        spin: new THREE.Vector3((rand() - 0.5) * 0.3, (rand() - 0.5) * 0.3, (rand() - 0.5) * 0.3),
        scale: 2 + rand() * 22,
        speed: 22 + rand() * 46,
      });
    }
    this.fragments.frustumCulled = false;
    this.scene.add(this.fragments);

    // ---- luminous dimensional structures in the distance -------------------
    this.structures = new THREE.Group();
    for (let i = 0; i < 16; i++) {
      const w = 60 + rand() * 180;
      const h = 80 + rand() * 300;
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, w),
        new THREE.MeshBasicMaterial({
          color: rand() > 0.5 ? colA : colB,
          wireframe: true,
          transparent: true,
          opacity: 0.16,
        })
      );
      box.position.set(
        (rand() - 0.5) * 900,
        (rand() - 0.5) * 500,
        -200 - rand() * 1600
      );
      box.userData = { spin: (rand() - 0.5) * 0.05, phase: rand() * 6.28, baseZ: box.position.z };
      this.structures.add(box);
    }
    this.scene.add(this.structures);

    // ---- energy streams ----------------------------------------------------
    this.streams = this.buildStreams(rand, colB);
    this.scene.add(this.streams);

    // ---- particle field ----------------------------------------------------
    this.motes = this.buildMotes(rand, colA);
    this.scene.add(this.motes);

    // ---- the arrival gateway, hidden until the transit ends ----------------
    this.gateway = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    this.gateway.position.set(0, 0, -520);
    this.scene.add(this.gateway);

    this.gatewayCore = new THREE.Mesh(
      new THREE.SphereGeometry(6, 20, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
    );
    this.gatewayCore.position.copy(this.gateway.position);
    this.scene.add(this.gatewayCore);
  }

  buildStreams(rand, color) {
    const count = 220;
    const positions = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const r = 40 + rand() * 180;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r * 0.7;
      const z = -rand() * this.depth;
      const len = 30 + rand() * 90;
      positions.set([x, y, z, x, y, z - len], i * 6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending,
    });
    const lines = new THREE.LineSegments(geo, mat);
    lines.frustumCulled = false;
    this.streamMat = mat;
    return lines;
  }

  buildMotes(rand, color) {
    const count = Math.floor(2600 * this.quality.particleScale);
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const speed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() - 0.5) * 420;
      pos[i * 3 + 1] = (rand() - 0.5) * 300;
      pos[i * 3 + 2] = -rand() * this.depth;
      size[i] = 1.5 + rand() * 6;
      speed[i] = 0.4 + rand() * 1.6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
    this.moteUniforms = {
      uTime: { value: 0 },
      uSpeed: { value: 1 },
      uDepth: { value: this.depth },
      uColor: { value: new THREE.Color(color) },
    };
    const pts = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: this.moteUniforms,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        attribute float aSize;
        attribute float aSpeed;
        uniform float uTime;
        uniform float uSpeed;
        uniform float uDepth;
        varying float vA;
        void main() {
          vec3 p = position;
          p.z = mod(p.z + uTime * aSpeed * 46.0 * uSpeed, uDepth) - uDepth;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float d = -mv.z;
          vA = smoothstep(2.0, 40.0, d) * (1.0 - smoothstep(400.0, 900.0, d));
          gl_PointSize = aSize * (300.0 / max(d, 1.0));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uColor;
        varying float vA;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * vA * 0.8);
        }`,
    }));
    pts.frustumCulled = false;
    return pts;
  }

  /** 1 = full transit speed, 0 = stopped. Used for the arrival slowdown. */
  setSpeed(v) { this.speed = v; }

  update(dt, t) {
    const sp = this.speed;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const e = new THREE.Euler();

    for (let i = 0; i < this.fragData.length; i++) {
      const f = this.fragData[i];
      f.pos.z += f.speed * dt * sp;
      if (f.pos.z > 40) f.pos.z -= this.depth;
      e.set(
        f.rot.x + f.spin.x * t * sp,
        f.rot.y + f.spin.y * t * sp,
        f.rot.z + f.spin.z * t * sp
      );
      q.setFromEuler(e);
      s.setScalar(f.scale);
      m.compose(f.pos, q, s);
      this.fragments.setMatrixAt(i, m);
    }
    this.fragments.instanceMatrix.needsUpdate = true;

    this.streams.position.z = (this.streams.position.z + 120 * dt * sp) % 300;
    this.moteUniforms.uTime.value = t;
    this.moteUniforms.uSpeed.value = sp;

    // Long, slow variation so thirty minutes never feels like a loop.
    const cycle = Math.sin(t * 0.06) * 0.5 + 0.5;
    const col = this.colA.clone().lerp(this.colB, cycle);
    this.leadLight.color.copy(col);
    this.leadLight.intensity = (2.2 + cycle * 2.4) * (0.4 + sp * 0.6);
    this.streamMat.opacity = (0.18 + cycle * 0.22) * (0.3 + sp * 0.7);
    this.moteUniforms.uColor.value.copy(col);

    for (const st of this.structures.children) {
      st.rotation.y += st.userData.spin * dt * sp;
      st.position.z += 16 * dt * sp;
      if (st.position.z > 120) st.position.z = -2000;
      st.material.opacity = 0.10 + Math.sin(t * 0.2 + st.userData.phase) * 0.07;
    }
  }

  /** The luminous opening forms ahead and swallows the camera. */
  openGateway(engine, seconds = 9) {
    return new Promise((resolve) => {
      let e = 0;
      const camera = engine.camera;
      const stop = engine.addUpdater((dt, t) => {
        e += dt;
        const k = Math.min(1, e / seconds);
        // Transit energy drops away as the opening takes over.
        this.setSpeed(Math.max(0.05, 1 - k * 1.1));
        const grow = Math.pow(k, 2.2);
        this.gateway.material.opacity = Math.min(1, k * 1.4);
        this.gateway.scale.setScalar(0.4 + grow * 14);
        this.gatewayCore.material.opacity = Math.min(1, k * 1.2);
        this.gatewayCore.scale.setScalar(1 + grow * 22);
        // The camera moves toward the opening and passes through it.
        camera.position.z = -grow * 480;
        camera.position.x = Math.sin(t * 0.4) * 2 * (1 - k);
        if (k >= 1) { stop(); resolve(); }
      });
    });
  }

  dispose() {
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    this.scene.clear();
  }
}
