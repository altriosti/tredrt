import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Chunky pixel-block construction kit.
 * Everything in the collection's hardware is built from real cubes on a lattice
 * and merged into one geometry per material, so the voxel silhouette is
 * genuine 3D rather than a texture pretending to be blocky.
 */
export class VoxelBuilder {
  constructor(cell = 1) {
    this.cell = cell;
    this.boxes = [];
  }

  /** One cube at lattice coordinates. */
  cube(x, y, z, sx = 1, sy = 1, sz = 1) {
    this.boxes.push({ x, y, z, sx, sy, sz });
    return this;
  }

  /**
   * A blocky ring of cubes around the Y axis — the collar shape used all over
   * the device. Cells are kept only where they fall inside the ring band, so
   * corners stay square instead of smoothing into a circle.
   */
  collar(y, radius, thickness = 1, height = 1, jitter = 0) {
    const r = radius;
    const outer = r + thickness / 2;
    const inner = r - thickness / 2;
    const n = Math.ceil(outer) + 1;
    for (let x = -n; x <= n; x++) {
      for (let z = -n; z <= n; z++) {
        const d = Math.hypot(x, z);
        if (d <= outer && d >= inner) {
          const wobble = jitter && (x + z) % 3 === 0 ? jitter : 0;
          this.cube(x, y, z, 1, height + wobble, 1);
        }
      }
    }
    return this;
  }

  /** A solid blocky disc, used for the plunger flange and machine plates. */
  disc(y, radius, height = 1) {
    const n = Math.ceil(radius);
    for (let x = -n; x <= n; x++) {
      for (let z = -n; z <= n; z++) {
        if (Math.hypot(x, z) <= radius) this.cube(x, y, z, 1, height, 1);
      }
    }
    return this;
  }

  /** A rectangular bar of cubes. */
  bar(x0, y0, z0, lx, ly, lz) {
    for (let x = 0; x < lx; x++)
      for (let y = 0; y < ly; y++)
        for (let z = 0; z < lz; z++)
          this.cube(x0 + x, y0 + y, z0 + z);
    return this;
  }

  /** Merge everything placed so far into a single geometry. */
  build() {
    if (!this.boxes.length) return null;
    const c = this.cell;
    const geos = this.boxes.map((b) => {
      const g = new THREE.BoxGeometry(b.sx * c, b.sy * c, b.sz * c);
      g.translate(b.x * c, b.y * c, b.z * c);
      return g;
    });
    const merged = BufferGeometryUtils.mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    this.boxes.length = 0;
    return merged;
  }

  /** Build and wrap in a mesh with the given material. */
  mesh(material) {
    const geo = this.build();
    return geo ? new THREE.Mesh(geo, material) : null;
  }
}

/** Matte dark shell material shared by the hardware. */
export function shellMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.62,
    metalness: 0.35,
    flatShading: true,
  });
}

/** Glowing trim material for the lit blocks along the hardware. */
export function trimMaterial(color, intensity = 1.6) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: new THREE.Color(color),
    emissiveIntensity: intensity,
    roughness: 0.4,
    metalness: 0.2,
    flatShading: true,
  });
}
