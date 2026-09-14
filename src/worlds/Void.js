import * as THREE from 'three';
import { makeRandom } from '../core/utils/noise.js';

const PORTAL_FRAG = /* glsl */`
  uniform float uTime;
  uniform float uOpen;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float a = atan(p.y, p.x);

    // Aperture that widens as the passage forms.
    float edge = smoothstep(uOpen, uOpen - 0.35, r);
    float rim = smoothstep(uOpen + 0.06, uOpen, r) * smoothstep(uOpen - 0.14, uOpen, r);

    // Distortion filaments rotating around the aperture.
    float fil = sin(a * 14.0 + uTime * 1.4) * 0.5 + 0.5;
    fil *= sin(a * 5.0 - uTime * 0.9 + r * 9.0) * 0.5 + 0.5;

    vec3 core = mix(vec3(0.18, 0.42, 0.95), vec3(1.0), pow(1.0 - r / max(uOpen, 0.001), 2.0));
    float alpha = edge * (0.10 + fil * 0.22) + rim * 1.4;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(core, alpha * smoothstep(0.0, 0.2, uOpen));
  }
`;

const PORTAL_VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * The first thing the visitor sees: near-total darkness, a faint frequency,
 * particles condensing out of nothing, and a passage tearing open ahead.
 */
export class VoidScene {
  constructor(quality) {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000004, 0.004);
    this.quality = quality;
    this.reveal = 0;
    this.open = 0;

    const count = Math.floor(2600 * quality.particleScale);
    const rand = makeRandom(99);
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const r = 20 + rand() * 260;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.sin(a) * r * 0.7;
      pos[i * 3 + 2] = -60 - rand() * 700;
      size[i] = 1.2 + rand() * 4.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));

    this.dustUniforms = {
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uColor: { value: new THREE.Color(0x9fc6ff) },
    };

    const dust = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: this.dustUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        attribute float aSize;
        uniform float uTime;
        uniform float uReveal;
        varying float vA;
        void main() {
          vec3 p = position;
          // Space itself begins to distort before the passage appears.
          p.x += sin(uTime * 0.5 + p.z * 0.01) * 6.0 * uReveal;
          p.y += cos(uTime * 0.4 + p.z * 0.013) * 6.0 * uReveal;
          p.z += uTime * 6.0;
          p.z = mod(p.z + 760.0, 760.0) - 760.0;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float d = -mv.z;
          vA = uReveal * (1.0 - smoothstep(200.0, 760.0, d)) * smoothstep(10.0, 60.0, d);
          gl_PointSize = aSize * (200.0 / max(d, 1.0));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uColor;
        varying float vA;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * vA * 0.75);
        }`,
    }));
    dust.frustumCulled = false;
    this.scene.add(dust);

    this.portalUniforms = { uTime: { value: 0 }, uOpen: { value: 0 } };
    this.portal = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 220),
      new THREE.ShaderMaterial({
        vertexShader: PORTAL_VERT,
        fragmentShader: PORTAL_FRAG,
        uniforms: this.portalUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.portal.position.set(0, 0, -300);
    this.scene.add(this.portal);
  }

  /** Called every frame; drives the slow emergence from silence. */
  update(dt, t) {
    this.reveal = Math.min(1, this.reveal + dt * 0.14);
    this.dustUniforms.uTime.value = t;
    this.dustUniforms.uReveal.value = this.reveal;
    this.portalUniforms.uTime.value = t;
    this.portalUniforms.uOpen.value = this.open;
    this.portal.rotation.z = t * 0.06;
  }

  /** Tear the passage open over `seconds`. */
  openPassage(seconds = 4) {
    return new Promise((resolve) => {
      const start = performance.now();
      const step = () => {
        const k = Math.min(1, (performance.now() - start) / (seconds * 1000));
        this.open = Math.pow(k, 0.7) * 0.95;
        if (k < 1) requestAnimationFrame(step); else resolve();
      };
      step();
    });
  }
}
