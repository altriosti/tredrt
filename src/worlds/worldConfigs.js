// -----------------------------------------------------------------------------
// WORLD DEFINITIONS
// Every alternate Earth is described purely as data. The builder in World.js
// assumes nothing about terrain, atmosphere, vegetation, climate, sky, lighting
// or technology level, so later phases can produce thousands of distinct Earths
// from the same engine by adding entries here or generating them procedurally.
// -----------------------------------------------------------------------------

export const WORLD_DEFS = {
  // ------------------------------------------------------------ DEAD DESERT
  desert: {
    id: 'desert',
    name: 'KHERAN-9',
    seed: 1317,
    sky: { top: 0x150b05, horizon: 0xc98c4e, bandStrength: 0.18, bandSpeed: 0.02 },
    fog: { color: 0x9a6a3e, density: 0.0040 },
    terrain: {
      size: 1800,
      amplitude: 46,
      frequency: 0.0026,
      octaves: 5,
      gain: 0.48,
      ridged: false,
      lowColor: 0x6b4526,
      highColor: 0xd8ab6c,
      dunes: { strength: 12, wavelength: 0.012, angle: 0.6 },
    },
    lights: {
      ambient: { color: 0x7a4f2c, intensity: 0.55 },
      sun: { color: 0xffb066, intensity: 1.15, position: [-420, 120, -800] },
      rim: { color: 0x3a2a55, intensity: 0.35, position: [500, 200, 600] },
    },
    atmosphere: [
      { count: 4200, color: 0xd9b07a, size: 1.5, opacity: 0.42, drift: [5.5, 0.25, 1.2], swirl: 3.0, bounds: { x: 900, y: 150, z: 900 } },
      { count: 900, color: 0xffd9a6, size: 3.2, opacity: 0.18, drift: [2.0, 0.6, 0.4], swirl: 5.0, bounds: { x: 700, y: 220, z: 700 } },
    ],
    props: [
      { type: 'rock', count: 90, spread: 900, scale: [3, 16], color: 0x5a3a20, tilt: 0.5 },
      { type: 'monolith', count: 8, spread: 1100, scale: [18, 46], color: 0x3a2717, tilt: 0.12 },
    ],
    beacon: { position: [0, 8, -430], color: 0xffc46b, radius: 2.2, intensity: 6, range: 300 },
    camera: {
      entry: { pos: [0, 16, 210], look: [0, 12, -200] },
      approach: { pos: [0, 11, -330], look: [0, 9, -440] },
    },
  },

  // ----------------------------------------------------------- LIVING EARTH
  living: {
    id: 'living',
    name: 'VEYRA-IX',
    seed: 8802,
    sky: { top: 0x0d2a3f, horizon: 0x8fe3d1, bandStrength: 0.26, bandSpeed: 0.035 },
    fog: { color: 0x9fd8c8, density: 0.0019 },
    terrain: {
      size: 2000,
      amplitude: 130,
      frequency: 0.0016,
      octaves: 6,
      gain: 0.52,
      ridged: true,
      lowColor: 0x1f5d3a,
      highColor: 0xc2e8a8,
      dunes: null,
    },
    lights: {
      ambient: { color: 0x9fd8c8, intensity: 0.7 },
      sun: { color: 0xfff1c9, intensity: 1.35, position: [520, 380, -420] },
      rim: { color: 0x66f0c8, intensity: 0.5, position: [-600, 160, 500] },
    },
    atmosphere: [
      { count: 3000, color: 0xd6ffd0, size: 1.9, opacity: 0.5, drift: [0.8, 1.6, 0.4], swirl: 4.5, bounds: { x: 800, y: 260, z: 800 } },
      { count: 700, color: 0x7ef2ff, size: 3.6, opacity: 0.32, drift: [0.3, 2.4, 0.2], swirl: 7.0, bounds: { x: 600, y: 320, z: 600 } },
    ],
    props: [
      { type: 'spire', count: 260, spread: 820, scale: [8, 34], color: 0x2f8f5c, tilt: 0.08, sway: 0.35 },
      { type: 'canopy', count: 90, spread: 900, scale: [14, 44], color: 0x49c97f, tilt: 0.06, sway: 0.22 },
      { type: 'rock', count: 40, spread: 900, scale: [4, 14], color: 0x3b5f4a, tilt: 0.4 },
    ],
    orbitals: [
      { radius: 210, distance: -1500, height: 620, color: 0xbfe9ff, opacity: 0.55, offsetX: -300 },
      { radius: 90, distance: -1200, height: 430, color: 0xffd9c0, opacity: 0.4, offsetX: 620 },
    ],
    beacon: { position: [0, 16, -240], color: 0x9dffe0, radius: 2.6, intensity: 5, range: 340 },
    camera: {
      entry: { pos: [0, 54, 190], look: [0, 40, -180] },
      approach: { pos: [0, 30, -110], look: [0, 20, -250] },
    },
  },

  // --------------------------------------------------------- FINAL THRESHOLD
  final: {
    id: 'final',
    name: 'THE THRESHOLD',
    seed: 4242,
    sky: { top: 0x090320, horizon: 0x6a4bd6, bandStrength: 0.4, bandSpeed: 0.05 },
    fog: { color: 0x3b2a7a, density: 0.0024 },
    terrain: {
      size: 2200,
      amplitude: 95,
      frequency: 0.0021,
      octaves: 5,
      gain: 0.55,
      ridged: true,
      lowColor: 0x241a4d,
      highColor: 0x9f8cff,
      dunes: null,
    },
    lights: {
      ambient: { color: 0x6a5acd, intensity: 0.75 },
      sun: { color: 0xd7c4ff, intensity: 1.1, position: [0, 500, -900] },
      rim: { color: 0xff9ad5, intensity: 0.6, position: [700, 200, 400] },
    },
    atmosphere: [
      { count: 4000, color: 0xc9b8ff, size: 2.0, opacity: 0.55, drift: [0.6, 1.2, 0.3], swirl: 6.0, bounds: { x: 900, y: 320, z: 900 } },
      { count: 1200, color: 0xffc4f0, size: 4.0, opacity: 0.3, drift: [0.2, 2.2, 0.2], swirl: 9.0, bounds: { x: 700, y: 400, z: 700 } },
    ],
    props: [
      { type: 'crystal', count: 140, spread: 900, scale: [10, 60], color: 0x8f7bff, tilt: 0.2, emissive: 0.7 },
      { type: 'monolith', count: 16, spread: 1200, scale: [30, 90], color: 0x2a1f52, tilt: 0.05 },
    ],
    // Distant dimensional light signatures implying an enormous multiverse.
    distantWorlds: { count: 48, spread: 3400, minRadius: 10, maxRadius: 74, depth: -2600 },
    camera: {
      entry: { pos: [0, 70, 250], look: [0, 46, -220] },
      approach: { pos: [0, 46, 70], look: [0, 70, -600] },
    },
  },
};
