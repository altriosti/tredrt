import * as THREE from 'three';
import { makeRandom } from './utils/noise.js';

/**
 * Square-section corridor geometry.
 * A dimensional passage is a BOX, not a pipe: four flat walls meeting at four
 * hard corners, with light running along the corner edges.
 */
function squareTubeGeometry(curve, tubularSegments, halfSize) {
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const positions = [];
  const uvs = [];
  const indices = [];

  // Each wall is subdivided so the corner highlight in the shader stays crisp.
  const perSide = 4;
  const ring = [];
  for (let side = 0; side < 4; side++) {
    // Corner offsets in (normal, binormal) space, flat top and bottom.
    const corners = [
      [1, 1], [-1, 1], [-1, -1], [1, -1], [1, 1],
    ];
    const [ax, ay] = corners[side];
    const [bx, by] = corners[side + 1];
    for (let s = 0; s < perSide; s++) {
      const k = s / perSide;
      ring.push([ax + (bx - ax) * k, ay + (by - ay) * k]);
    }
  }
  ring.push(ring[0].slice()); // close the loop with a duplicate for clean UVs
  const ringCount = ring.length;

  const P = new THREE.Vector3();
  for (let i = 0; i <= tubularSegments; i++) {
    curve.getPointAt(i / tubularSegments, P);
    const N = frames.normals[Math.min(i, frames.normals.length - 1)];
    const B = frames.binormals[Math.min(i, frames.binormals.length - 1)];
    for (let j = 0; j < ringCount; j++) {
      const [u, v] = ring[j];
      positions.push(
        P.x + (N.x * u + B.x * v) * halfSize,
        P.y + (N.y * u + B.y * v) * halfSize,
        P.z + (N.z * u + B.z * v) * halfSize
      );
      uvs.push(j / (ringCount - 1), i / tubularSegments);
    }
  }

  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < ringCount - 1; j++) {
      const a = i * ringCount + j;
      const b = a + ringCount;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

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
  uniform vec3 uEdgeColor;
  uniform float uIntensity;
  varying vec2 vUv;
  varying float vDepth;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(41.7, 289.1))) * 43758.5453); }

  void main() {
    // Longitudinal streaks rushing along the walls.
    float lanes = floor(vUv.x * 40.0);
    float speed = 1.4 + hash(vec2(lanes, 3.0)) * 3.2;
    float streak = fract(vUv.y * 5.0 - uTime * speed);
    streak = pow(smoothstep(0.0, 0.85, streak), 7.0);

    // Panel seams running across each flat wall.
    float sheet = sin(vUv.y * 26.0 - uTime * 2.2) * 0.5 + 0.5;
    sheet = pow(sheet, 3.0) * 0.35;

    // The four corners of the box carry the strongest light.
    float corner = abs(fract(vUv.x * 4.0 + 0.5) - 0.5) * 2.0;
    float edge = pow(1.0 - corner, 10.0);
    float pulse = 0.55 + 0.45 * sin(uTime * 3.0 - vUv.y * 22.0);

    vec3 col = mix(uColorA, uColorB, vUv.y);
    float glow = (streak + sheet) * uIntensity;
    col += uEdgeColor * edge * pulse * 2.2 * uIntensity;
    glow += edge * pulse * 1.6 * uIntensity;

    float near = smoothstep(4.0, 60.0, vDepth);
    gl_FragColor = vec4(col * max(glow, edge * 0.8), glow * near);
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
    c.y *= 0.28; // stretched, so motes read as streaking energy rather than dots
    float d = length(c);
    if (d > 0.5) discard;
    gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * vA);
  }
`;

/**
 * A corridor between universes. The camera really moves along a curve inside a
 * four-walled 3D passage; nothing here is a fade between two backgrounds.
 */
export class DimensionalTransition {
  constructor({
    colorA = 0x4aa8ff,
    colorB = 0xffffff,
    edgeColor = 0x8fd4ff,
    seed = 3,
    length = 1400,
    halfSize = 30,
  } = {}) {
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
      uEdgeColor: { value: new THREE.Color(edgeColor) },
      uIntensity: { value: 1.0 },
    };

    const geo = squareTubeGeometry(this.curve, 240, halfSize);
    const mat = new THREE.ShaderMaterial({
      vertexShader: TUBE_VERT,
      fragmentShader: TUBE_FRAG,
      uniforms: this.tubeUniforms,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const tube = new THREE.Mesh(geo, mat);
    tube.frustumCulled = false;
    this.scene.add(tube);

    // A larger outer box gives the passage real layered depth.
    const shellMat = mat.clone();
    shellMat.uniforms = THREE.UniformsUtils.clone(this.tubeUniforms);
    shellMat.uniforms.uIntensity.value = 0.4;
    const shell = new THREE.Mesh(squareTubeGeometry(this.curve, 160, halfSize * 2.6), shellMat);
    shell.frustumCulled = false;
    this.shellUniforms = shellMat.uniforms;
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
      // Distributed across a square cross-section to match the passage shape.
      pos[i * 3] = (rand() - 0.5) * 120;
      pos[i * 3 + 1] = (rand() - 0.5) * 120;
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
   * Fly the camera from the passage entrance to its exit.
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
        // A slight roll keeps the walls from feeling locked to the screen.
        camera.rotateZ(Math.sin(elapsed * 0.5) * 0.07);

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
