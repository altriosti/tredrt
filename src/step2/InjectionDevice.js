import * as THREE from 'three';
import { VoxelBuilder, shellMaterial, trimMaterial } from './VoxelKit.js';

const LIQUID_VERT = /* glsl */`
  varying vec2 vUv;
  varying vec3 vPos;
  void main() {
    vUv = uv;
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Energy moving through the dimensional liquid: blocky cells, plasma filaments
// and a bright core that surges when the device charges.
const LIQUID_FRAG = /* glsl */`
  uniform float uTime;
  uniform float uCharge;
  uniform float uDrain;
  uniform vec3 uLiquid;
  uniform vec3 uEnergy;
  varying vec2 vUv;
  varying vec3 vPos;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(21.7, 91.3))) * 43758.5453); }

  void main() {
    // Liquid level falls as the dose is administered.
    if (vUv.y > 1.0 - uDrain) discard;

    // Blocky voxel cells suspended in the fluid.
    vec2 cell = floor(vec2(vUv.x * 14.0, vUv.y * 26.0));
    float spark = step(0.86, hash(cell + floor(uTime * 1.6)));

    // Filaments spiralling along the barrel.
    float fil = sin(vUv.y * 22.0 - uTime * 2.6 + vUv.x * 9.0) * 0.5 + 0.5;
    fil = pow(fil, 3.0);

    float core = smoothstep(0.55, 0.0, abs(vUv.x - 0.5)) * (0.5 + 0.5 * sin(uTime * 2.0));

    vec3 col = uLiquid * (0.45 + fil * 0.8 + core * 0.7);
    col += uEnergy * spark * 1.6;
    col *= 0.7 + uCharge * 2.4;

    float alpha = 0.72 + fil * 0.2 + spark * 0.3;
    gl_FragColor = vec4(col, min(1.0, alpha));
  }
`;

/**
 * The dimensional injection device, rebuilt in real 3D from the collection's
 * master artwork: chunky pixel-block shell, lit trim blocks, a luminous barrel
 * of dimensional liquid, stepped nose collars and the T-plunger.
 *
 * The design is fixed. Animation moves the device through the scene and drives
 * its light; it never redraws the object.
 */
export class InjectionDevice {
  constructor(palette, quality) {
    this.palette = palette;
    this.group = new THREE.Group();
    this.charge = 0;
    this.drain = 0;

    const cell = 0.12;
    const shellMat = shellMaterial(palette.shell);
    const trimMat = trimMaterial(palette.trim, 1.4);
    const energyMat = trimMaterial(palette.energy, 2.4);

    // ---- shell: nose stack, barrel cage, mid collars, shaft, flange -------
    const shell = new VoxelBuilder(cell);
    // Nose: stepped collars narrowing toward the needle (device points -Y).
    shell.collar(-16, 4, 2, 2);
    shell.collar(-19, 3.2, 2, 2);
    shell.collar(-22, 2.4, 2, 2);
    shell.collar(-25, 1.6, 2, 2);
    // Barrel end caps.
    shell.collar(-12, 6.5, 2.4, 3);
    shell.collar(12, 6.5, 2.4, 3);
    // Cage ribs running along the barrel, leaving the glass visible between.
    for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const rx = Math.round(Math.cos(a) * 6);
      const rz = Math.round(Math.sin(a) * 6);
      for (let y = -11; y <= 11; y++) shell.cube(rx, y, rz, 1.2, 1, 1.2);
    }
    // Upper body above the barrel.
    shell.collar(15, 5.5, 2.4, 3);
    shell.collar(19, 4.5, 2, 3);
    // Plunger shaft.
    for (let y = 21; y <= 31; y++) shell.bar(-1, y, -1, 2, 1, 2);
    // T-flange.
    shell.disc(33, 7.5, 2);
    shell.collar(35, 7.5, 2, 1);
    const shellMesh = shell.mesh(shellMat);
    this.group.add(shellMesh);

    // ---- trim: the lit blocks that run along the hardware ------------------
    const trim = new VoxelBuilder(cell);
    trim.collar(-13.5, 6.5, 1.2, 1);
    trim.collar(13.5, 6.5, 1.2, 1);
    trim.collar(-17.5, 4, 1.2, 1);
    trim.collar(-20.5, 3.2, 1.2, 1);
    trim.collar(17, 5, 1.2, 1);
    for (let y = 22; y <= 30; y += 2) trim.cube(0, y, 2, 1, 1, 1);
    trim.collar(34, 7.5, 1.2, 1);
    const trimMesh = trim.mesh(trimMat);
    this.group.add(trimMesh);
    this.trimMat = trimMat;

    // ---- energy accents ----------------------------------------------------
    const acc = new VoxelBuilder(cell);
    acc.collar(-24, 2.4, 1.0, 1);
    acc.collar(20.5, 4.5, 1.0, 1);
    const accMesh = acc.mesh(energyMat);
    this.group.add(accMesh);
    this.energyMat = energyMat;

    // ---- the luminous dimensional liquid -----------------------------------
    this.liquidUniforms = {
      uTime: { value: 0 },
      uCharge: { value: 0 },
      uDrain: { value: 0 },
      uLiquid: { value: new THREE.Color(palette.liquid) },
      uEnergy: { value: new THREE.Color(palette.energy) },
    };
    const liquid = new THREE.Mesh(
      new THREE.CylinderGeometry(5.6 * cell, 5.6 * cell, 24 * cell, 12, 1, true),
      new THREE.ShaderMaterial({
        vertexShader: LIQUID_VERT,
        fragmentShader: LIQUID_FRAG,
        uniforms: this.liquidUniforms,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    this.liquid = liquid;
    this.group.add(liquid);

    // Glass sleeve around the liquid.
    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(6.2 * cell, 6.2 * cell, 25 * cell, 12, 1, true),
      new THREE.MeshPhysicalMaterial({
        color: 0xbfe6ff, transparent: true, opacity: 0.16,
        roughness: 0.1, metalness: 0, transmission: 0.6, side: THREE.DoubleSide,
      })
    );
    this.group.add(glass);

    // ---- the needle --------------------------------------------------------
    const needleMat = trimMaterial(palette.glow, 3.0);
    const needle = new THREE.Mesh(
      new THREE.BoxGeometry(0.9 * cell, 16 * cell, 0.9 * cell),
      needleMat
    );
    needle.position.y = -34 * cell;
    this.group.add(needle);
    this.needleMat = needleMat;

    // Light the device casts into whatever room it is in.
    this.light = new THREE.PointLight(palette.liquid, 3, 14, 1.8);
    this.group.add(this.light);

    if (quality?.tier === 'low') this.group.scale.setScalar(1);
  }

  /** 0..1 — how hard the liquid is burning. */
  setCharge(v) { this.charge = v; }

  /** 0..1 — how much of the dose has been administered. */
  setDrain(v) { this.drain = v; }

  update(dt, t) {
    this.liquidUniforms.uTime.value = t;
    this.liquidUniforms.uCharge.value = this.charge;
    this.liquidUniforms.uDrain.value = this.drain;
    const pulse = 1 + Math.sin(t * 2.2) * 0.12 + this.charge * 1.4;
    this.trimMat.emissiveIntensity = 1.2 * pulse;
    this.energyMat.emissiveIntensity = 2.0 * pulse;
    this.needleMat.emissiveIntensity = 2.4 * (0.6 + this.charge * 2.2);
    this.light.intensity = 2 + this.charge * 16;
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }
}
