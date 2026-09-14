import * as THREE from 'three';
import { makeRandom } from './utils/noise.js';

const TUBE_VERT = /* glsl */`
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const TUBE_FRAG = /* glsl */`
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uIntensity;
  varying vec2 vUv;
  varying float vDepth;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(41.7, 289.1))) * 43758.5453); }

  void main() {
    // Longitudinal streaks rushing past the camera.
    float lanes = floor(vUv.x * 46.0);
    float speed = 1.4 + hash(vec2(lanes, 3.0)) * 3.2;
    float streak = fract(vUv.y * 5.0 - uTime * speed);
    streak = pow(smoothstep(0.0, 0.85, streak), 7.0);

    // Layered dimensional light sheets.
    float sheet = sin(vUv.y * 26.0 - uTime * 2.2) * 0.5 + 0.5;
    sheet = pow(sheet, 3.0) * 0.4;

    vec3 col = mix(uColorA, uColorB, vUv.y);
    float glow = (streak + sheet) * uIntensity;
    // Fade near the camera so we never see the tube wall as a hard surface.
    float near = smoothstep(4.0, 60.0, vDepth);
    gl_FragColor = vec4(col * glow, glow * near);
  }
`;

const MOTE_VERT = /* glsl */`
  attribute float aSize;
  attribute float aSpeed;
  uniform float uTime;
  uniform float uLength;
  varying float vA;
  void main() {
    vec3 p = position;
    p.z = mod(p.z + uTime * aSpeed * 220.0, uLength) - uLength * 0.5;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float d = -mv.z;
    vA = smoothstep(2.0, 30.0, d) * (1.0 - smoothstep(300.0, 900.0, d));
    gl_PointSize = aSize * (300.0 / max(d, 1.0));
    gl_Position = projectionMatrix * mv;
  }
`;

const MOTE_FRAG = /* glsl */`
  uniform vec3 uColor;
  varying float vA;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    // Vertically stretched so motes read as streaking energy, not dots.
    c.y *= 0.28;
    float d = length(c);
    if (d > 0.5) discard;
    gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * vA);
  }
`;

/**
 * Builds a corridor between universes. The camera really moves along a curve
 * inside a 3D tube; nothing here is a fade between two backgrounds.
 */
export class DimensionalTransition {
  constructor({ colorA = 0x4aa8ff, colorB = 0xffffff, seed = 3, length = 1400, radius = 26 } = {}) {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000008, 0.0016);
    this.length = length;

    const rand = makeRandom(seed);
    const points = [];
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const z = -(i / steps) * length;
      const wobble = i === 0 || i === steps ? 0 : 1;
      points.push(new THREE.Vector3(
        (rand() - 0.5) * 120 * wobble,
        (rand() - 0.5) * 90 * wobble,
        z
      ));
    }
    this.curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.4);

    this.tubeUniforms = {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uIntensity: { value: 1.0 },
    };

    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(this.curve, 220, radius, 28, false),
      new THREE.ShaderMaterial({
        vertexShader: TUBE_VERT,
        fragmentShader: TUBE_FRAG,
        uniforms: this.tubeUniforms,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    tube.frustumCulled = false;
    this.scene.add(tube);

    // An outer, slower shell gives the corridor real layered depth.
    const shell = tube.clone();
    shell.material = tube.material.clone();
    shell.material.uniforms = THREE.UniformsUtils.clone(this.tubeUniforms);
    shell.material.uniforms.uIntensity.value = 0.45;
    shell.scale.setScalar(2.4);
    this.shellUniforms = shell.material.uniforms;
    this.scene.add(shell);

    this.motes = this.buildMotes(rand, colorB);
    this.scene.add(this.motes);

    this.core = new THREE.Mesh(
      new THREE.SphereGeometry(6, 24, 18),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
    );
    this.core.position.set(0, 0, -length);
    this.scene.add(this.core);
  }

  buildMotes(rand, color) {
    const count = 1800;
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const speed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const r = 4 + rand() * 60;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.sin(a) * r;
      pos[i * 3 + 2] = (rand() - 0.5) * this.length;
      size[i] = 2 + rand() * 7;
      speed[i] = 0.5 + rand() * 1.8;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
    this.moteUniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uLength: { value: this.length },
    };
    const pts = new THREE.Points(geo, new THREE.ShaderMaterial({
      vertexShader: MOTE_VERT,
      fragmentShader: MOTE_FRAG,
      uniforms: this.moteUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    pts.frustumCulled = false;
    return pts;
  }

  /**
   * Fly the camera from the corridor entrance to its exit.
   * @returns {Promise<void>}
   */
  run(engine, { duration = 5.0, onProgress = null } = {}) {
    const camera = engine.camera;
    const prevScene = engine.scene;
    engine.setScene(this.scene);

    const pos = new THREE.Vector3();
    const ahead = new THREE.Vector3();
    const d = engine.quality.reducedMotion ? duration * 1.35 : duration;

    return new Promise((resolve) => {
      let elapsed = 0;
      const stop = engine.addUpdater((dt, t) => {
        elapsed += dt;
        const k = Math.min(1, elapsed / d);
        // Slow start, hard acceleration, gentle arrival.
        const eased = k < 0.25
          ? (k / 0.25) * 0.12
          : 0.12 + Math.pow((k - 0.25) / 0.75, 1.7) * 0.88;

        this.curve.getPointAt(Math.min(0.999, eased), pos);
        this.curve.getPointAt(Math.min(0.9999, eased + 0.02), ahead);
        camera.position.copy(pos);
        camera.up.set(0, 1, 0);
        camera.lookAt(ahead);
        // A gentle roll makes the corridor feel spatial rather than tubular.
        camera.rotateZ(Math.sin(elapsed * 0.6) * 0.12);

        this.tubeUniforms.uTime.value = t;
        this.shellUniforms.uTime.value = t * 0.6;
        this.moteUniforms.uTime.value = t;
        this.tubeUniforms.uIntensity.value = 0.6 + k * 1.6;
        this.core.material.opacity = Math.pow(k, 3);
        this.core.scale.setScalar(1 + Math.pow(k, 4) * 26);

        if (onProgress) onProgress(k);

        if (k >= 1) {
          stop();
          engine.setScene(prevScene);
          resolve();
        }
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
