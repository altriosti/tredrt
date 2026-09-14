import * as THREE from 'three';
import { makeRandom } from './utils/noise.js';

const VERT = /* glsl */`
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aDrift;
  uniform float uTime;
  uniform float uSwirl;
  uniform vec3 uBoundsMin;
  uniform vec3 uBoundsSize;
  varying float vAlpha;

  void main() {
    vec3 p = position + aDrift * uTime;
    // Wrap inside the volume so the air never empties out.
    p = mod(p - uBoundsMin, uBoundsSize) + uBoundsMin;
    // Gentle turbulence so motion never looks like a straight conveyor belt.
    p.x += sin(uTime * 0.35 + aPhase) * uSwirl;
    p.y += cos(uTime * 0.27 + aPhase * 1.7) * uSwirl * 0.6;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float dist = -mv.z;
    vAlpha = smoothstep(0.0, 14.0, dist) * (1.0 - smoothstep(180.0, 460.0, dist));
    vAlpha *= 0.55 + 0.45 * sin(uTime * 0.8 + aPhase);
    gl_PointSize = aSize * (260.0 / max(dist, 1.0));
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */`
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.05, d);
    gl_FragColor = vec4(uColor, soft * vAlpha * uOpacity);
  }
`;

/**
 * @param {object} o
 *  count, color, size, opacity, drift (THREE.Vector3), bounds {x,y,z}, swirl, seed
 */
export function createAtmosphere(o = {}) {
  const count = Math.max(64, Math.floor(o.count ?? 3000));
  const bounds = o.bounds ?? { x: 620, y: 180, z: 620 };
  const rand = makeRandom(o.seed ?? 7);

  const pos = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const drifts = new Float32Array(count * 3);
  const baseDrift = o.drift ?? new THREE.Vector3(2.4, 0.15, 0.6);

  for (let i = 0; i < count; i++) {
    pos[i * 3] = (rand() - 0.5) * bounds.x;
    pos[i * 3 + 1] = rand() * bounds.y;
    pos[i * 3 + 2] = (rand() - 0.5) * bounds.z;
    sizes[i] = (o.size ?? 1.4) * (0.4 + rand() * 1.4);
    phases[i] = rand() * Math.PI * 2;
    const v = 0.55 + rand() * 0.9;
    drifts[i * 3] = baseDrift.x * v;
    drifts[i * 3 + 1] = baseDrift.y * v;
    drifts[i * 3 + 2] = baseDrift.z * v;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geo.setAttribute('aDrift', new THREE.BufferAttribute(drifts, 3));

  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: o.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(o.color ?? 0xd9b98a) },
      uOpacity: { value: o.opacity ?? 0.5 },
      uSwirl: { value: o.swirl ?? 2.2 },
      uBoundsMin: { value: new THREE.Vector3(-bounds.x / 2, 0, -bounds.z / 2) },
      uBoundsSize: { value: new THREE.Vector3(bounds.x, bounds.y, bounds.z) },
    },
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.userData.update = (dt, t) => { mat.uniforms.uTime.value = t; };
  return points;
}
