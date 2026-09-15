import * as THREE from 'three';
import { fbm, makeRandom } from '../core/utils/noise.js';
import { createAtmosphere } from '../core/Atmosphere.js';

const SKY_VERT = /* glsl */`
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAG = /* glsl */`
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform float uTime;
  uniform float uBandStrength;
  uniform float uBandSpeed;
  uniform float uFlash;
  varying vec3 vPos;

  void main() {
    float h = normalize(vPos).y;
    float k = smoothstep(-0.12, 0.62, h);
    vec3 col = mix(uHorizon, uTop, k);
    // Slow dimensional banding so the sky is never a frozen gradient.
    float band = sin(vPos.y * 0.004 + uTime * uBandSpeed) * 0.5 + 0.5;
    band *= sin(vPos.x * 0.0018 - uTime * uBandSpeed * 0.7) * 0.5 + 0.5;
    col += band * uBandStrength * (1.0 - k) * uHorizon;
    col = mix(col, vec3(1.0), uFlash);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function radialTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function propGeometry(type) {
  switch (type) {
    case 'spire':    return new THREE.ConeGeometry(0.35, 1, 6);
    case 'canopy':   return new THREE.ConeGeometry(0.85, 1, 7);
    case 'crystal':  return new THREE.OctahedronGeometry(0.5, 0);
    case 'monolith': return new THREE.BoxGeometry(0.4, 1, 0.4);
    case 'rock':
    default:         return new THREE.DodecahedronGeometry(0.5, 0);
  }
}

/**
 * Builds a complete real-time world from a data definition.
 * Nothing here is shared between worlds except the code itself.
 */
export class World {
  constructor(def, quality) {
    this.def = def;
    this.quality = quality;
    this.scene = new THREE.Scene();
    this.updaters = [];
    this.waves = [];
    this.energy = 0;

    this.buildSky();
    this.buildLights();
    this.buildTerrain();
    this.buildProps();
    this.buildAtmosphere();
    this.buildOrbitals();
    this.buildDistantWorlds();
    this.buildBeacon();
  }

  // ---------------------------------------------------------------- SKY ---
  buildSky() {
    const s = this.def.sky;
    this.skyUniforms = {
      uTop: { value: new THREE.Color(s.top) },
      uHorizon: { value: new THREE.Color(s.horizon) },
      uTime: { value: 0 },
      uBandStrength: { value: s.bandStrength ?? 0.2 },
      uBandSpeed: { value: s.bandSpeed ?? 0.03 },
      uFlash: { value: 0 },
    };
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(3000, 32, 20),
      new THREE.ShaderMaterial({
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        uniforms: this.skyUniforms,
        side: THREE.BackSide,
        depthWrite: false,
      })
    );
    sky.frustumCulled = false;
    this.scene.add(sky);

    const f = this.def.fog;
    this.scene.fog = new THREE.FogExp2(f.color, f.density * this.quality.fogDensityScale);
  }

  // -------------------------------------------------------------- LIGHTS ---
  buildLights() {
    const l = this.def.lights;
    this.scene.add(new THREE.AmbientLight(l.ambient.color, l.ambient.intensity));

    this.sun = new THREE.DirectionalLight(l.sun.color, l.sun.intensity);
    this.sun.position.set(...l.sun.position);
    this.scene.add(this.sun);

    if (l.rim) {
      const rim = new THREE.DirectionalLight(l.rim.color, l.rim.intensity);
      rim.position.set(...l.rim.position);
      this.scene.add(rim);
    }
  }

  // ------------------------------------------------------------- TERRAIN ---
  heightAt(x, z) {
    const t = this.def.terrain;
    let h = fbm(x, z, {
      octaves: t.octaves,
      frequency: t.frequency,
      gain: t.gain,
      seed: this.def.seed,
      ridged: t.ridged,
    });
    h = (h - 0.45) * t.amplitude * 2;
    if (t.dunes) {
      const a = t.dunes.angle;
      const u = x * Math.cos(a) + z * Math.sin(a);
      h += Math.sin(u * t.dunes.wavelength) * t.dunes.strength;
    }
    return h;
  }

  buildTerrain() {
    const t = this.def.terrain;
    const seg = this.quality.terrainSegments;
    const geo = new THREE.PlaneGeometry(t.size, t.size, seg, seg);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const low = new THREE.Color(t.lowColor);
    const high = new THREE.Color(t.highColor);
    const tmp = new THREE.Color();

    let min = Infinity, max = -Infinity;
    const heights = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const h = this.heightAt(pos.getX(i), pos.getZ(i));
      heights[i] = h;
      if (h < min) min = h;
      if (h > max) max = h;
    }
    const range = Math.max(1e-3, max - min);
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, heights[i]);
      const k = (heights[i] - min) / range;
      tmp.copy(low).lerp(high, Math.pow(k, 0.85));
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    this.terrainUniforms = {
      uWaveOrigin: { value: new THREE.Vector3() },
      uWaveRadius: { value: -1 },
      uWaveColor: { value: new THREE.Color(0xffffff) },
      uEnergy: { value: 0 },
    };

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.96,
      metalness: 0.02,
      flatShading: false,
    });
    // Energy pulses travel through the terrain itself rather than through a UI.
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.terrainUniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWorld;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWorld = (modelMatrix * vec4(position,1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vWorld;
          uniform vec3 uWaveOrigin;
          uniform float uWaveRadius;
          uniform vec3 uWaveColor;
          uniform float uEnergy;`)
        .replace('#include <dithering_fragment>', `#include <dithering_fragment>
          float waveDist = distance(vWorld.xz, uWaveOrigin.xz);
          float ring = uWaveRadius < 0.0 ? 0.0 :
            smoothstep(70.0, 0.0, abs(waveDist - uWaveRadius)) * smoothstep(1500.0, 200.0, uWaveRadius);
          gl_FragColor.rgb += uWaveColor * ring * 0.9;
          gl_FragColor.rgb += uWaveColor * uEnergy * 0.25;`);
    };

    this.terrain = new THREE.Mesh(geo, mat);
    this.scene.add(this.terrain);
  }

  // --------------------------------------------------------------- PROPS ---
  buildProps() {
    this.swayers = [];
    const defs = this.def.props || [];
    for (const p of defs) {
      const count = Math.max(4, Math.floor(p.count * this.quality.propScale));
      const geo = propGeometry(p.type);
      const mat = new THREE.MeshStandardMaterial({
        color: p.color,
        roughness: p.type === 'crystal' ? 0.25 : 0.9,
        metalness: p.type === 'crystal' ? 0.25 : 0.05,
        emissive: p.emissive ? new THREE.Color(p.color) : new THREE.Color(0x000000),
        emissiveIntensity: p.emissive ?? 0,
        flatShading: true,
      });
      const mesh = new THREE.InstancedMesh(geo, mat, count);
      const rand = makeRandom(this.def.seed + p.type.length * 991);
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler();
      const scale = new THREE.Vector3();
      const posv = new THREE.Vector3();
      const bases = [];

      for (let i = 0; i < count; i++) {
        const angle = rand() * Math.PI * 2;
        const r = Math.sqrt(rand()) * p.spread;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r - p.spread * 0.15;
        const h = p.scale[0] + rand() * (p.scale[1] - p.scale[0]);
        const w = h * (0.35 + rand() * 0.5);
        posv.set(x, this.heightAt(x, z) + h * 0.45, z);
        e.set((rand() - 0.5) * p.tilt, rand() * Math.PI * 2, (rand() - 0.5) * p.tilt);
        q.setFromEuler(e);
        scale.set(w, h, w);
        m.compose(posv, q, scale);
        mesh.setMatrixAt(i, m);
        bases.push({ pos: posv.clone(), quat: q.clone(), scale: scale.clone(), phase: rand() * 6.28 });
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      this.scene.add(mesh);

      if (p.sway && !this.quality.reducedMotion) {
        this.swayers.push({ mesh, bases, amount: p.sway });
      }
    }
  }

  // ---------------------------------------------------------- ATMOSPHERE ---
  buildAtmosphere() {
    this.atmospheres = [];
    for (const a of this.def.atmosphere || []) {
      const layer = createAtmosphere({
        count: a.count * this.quality.particleScale,
        color: a.color,
        size: a.size,
        opacity: a.opacity,
        swirl: this.quality.reducedMotion ? a.swirl * 0.4 : a.swirl,
        drift: new THREE.Vector3(...a.drift).multiplyScalar(this.quality.reducedMotion ? 0.5 : 1),
        bounds: a.bounds,
        seed: this.def.seed + a.count,
      });
      layer.position.y = -20;
      this.scene.add(layer);
      this.atmospheres.push(layer);
    }
  }

  // ------------------------------------------------------------ ORBITALS ---
  buildOrbitals() {
    for (const o of this.def.orbitals || []) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(o.radius, 32, 24),
        new THREE.MeshBasicMaterial({ color: o.color, transparent: true, opacity: o.opacity })
      );
      mesh.position.set(o.offsetX ?? 0, o.height, o.distance);
      this.scene.add(mesh);
    }
  }

  buildDistantWorlds() {
    const d = this.def.distantWorlds;
    if (!d) return;
    const rand = makeRandom(this.def.seed + 51);
    const group = new THREE.Group();
    for (let i = 0; i < d.count; i++) {
      const r = d.minRadius + rand() * (d.maxRadius - d.minRadius);
      const hue = rand();
      const color = new THREE.Color().setHSL(0.55 + hue * 0.35, 0.7, 0.62);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(r, 16, 12),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22 + rand() * 0.45 })
      );
      mesh.position.set(
        (rand() - 0.5) * d.spread,
        120 + rand() * 1100,
        d.depth - rand() * 1600
      );
      mesh.userData.phase = rand() * 6.28;
      group.add(mesh);
    }
    this.distantGroup = group;
    this.scene.add(group);
  }

  // -------------------------------------------------------------- BEACON ---
  buildBeacon() {
    const b = this.def.beacon;
    if (!b) return;
    const group = new THREE.Group();
    group.position.set(...b.position);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(b.radius, 24, 18),
      new THREE.MeshBasicMaterial({ color: b.color })
    );
    group.add(core);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: radialTexture(),
      color: b.color,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.85,
    }));
    glow.scale.setScalar(b.radius * 22);
    group.add(glow);

    // A vertical shaft of light, so the signal reads as physically present.
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(b.radius * 0.5, b.radius * 3.2, 150, 18, 1, true),
      new THREE.MeshBasicMaterial({
        color: b.color, transparent: true, opacity: 0.12,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    shaft.position.y = 70;
    group.add(shaft);

    const light = new THREE.PointLight(b.color, b.intensity, b.range, 1.7);
    group.add(light);

    this.beacon = group;
    this.beaconParts = { core, glow, shaft, light, base: b };
    this.beaconBoost = 0;
    this.scene.add(group);
  }

  /** Position of the current beacon in world space (for camera targeting). */
  beaconPosition() {
    return this.beacon ? this.beacon.position.clone() : new THREE.Vector3(0, 10, -200);
  }

  /** Move the beacon so a new checkpoint can appear elsewhere in the world. */
  moveBeacon(x, y, z) {
    if (this.beacon) this.beacon.position.set(x, y, z);
  }

  /** Expanding energy ring travelling outward through the terrain. */
  energyWave(origin = this.beaconPosition(), color = 0xffffff) {
    this.terrainUniforms.uWaveColor.value.set(color);
    this.terrainUniforms.uWaveOrigin.value.copy(origin);
    this.waves.push({ radius: 0, speed: 420 });
  }

  /** Raise or lower overall world energy (0..1). Used between stages. */
  setEnergy(level) { this.energyTarget = level; }

  /** Drive the beacon far past its resting brightness. */
  chargeBeacon(amount) { this.beaconBoost = amount; }

  /** Whole-sky flash, used at the moment a dimensional passage opens. */
  flash(value) { this.skyUniforms.uFlash.value = value; }

  update(dt, t) {
    this.skyUniforms.uTime.value = t;
    for (const a of this.atmospheres) a.userData.update(dt, t);

    // Energy easing
    const target = this.energyTarget ?? 0;
    this.energy += (target - this.energy) * Math.min(1, dt * 1.6);
    this.terrainUniforms.uEnergy.value = this.energy;

    // Travelling ring
    if (this.waves.length) {
      const w = this.waves[0];
      w.radius += w.speed * dt;
      this.terrainUniforms.uWaveRadius.value = w.radius;
      if (w.radius > 1600) { this.waves.shift(); this.terrainUniforms.uWaveRadius.value = -1; }
    }

    // Beacon breathing + charge
    if (this.beacon) {
      const { core, glow, shaft, light, base } = this.beaconParts;
      this.beaconBoost *= Math.pow(0.35, dt);
      const pulse = 1 + Math.sin(t * 1.6) * 0.12 + this.beaconBoost;
      core.scale.setScalar(pulse);
      glow.scale.setScalar(base.radius * 22 * (pulse * 0.9 + 0.2));
      shaft.material.opacity = 0.1 + this.beaconBoost * 0.25;
      shaft.rotation.y = t * 0.15;
      light.intensity = base.intensity * pulse + this.beaconBoost * 12;
    }

    // Distant worlds drift, implying scale rather than showing 3,000 objects.
    if (this.distantGroup) {
      this.distantGroup.rotation.y = t * 0.004;
      for (const m of this.distantGroup.children) {
        m.material.opacity = 0.25 + Math.sin(t * 0.4 + m.userData.phase) * 0.18;
      }
    }

    // Foliage sway
    const m4 = new THREE.Matrix4();
    for (const s of this.swayers) {
      for (let i = 0; i < s.bases.length; i++) {
        const b = s.bases[i];
        const bend = Math.sin(t * 0.9 + b.phase) * 0.03 * s.amount;
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(bend, 0, bend * 0.7));
        m4.compose(b.pos, b.quat.clone().multiply(q), b.scale);
        s.mesh.setMatrixAt(i, m4);
      }
      s.mesh.instanceMatrix.needsUpdate = true;
    }
  }
}
