// -----------------------------------------------------------------------------
// DESTINATION EARTHS
// Each entry is a complete world definition in the same data format the Step 1
// engine already builds from, plus the reality data the information machine
// reads. Nothing is generated at runtime, so one NFT always arrives at the same
// Earth. The final 3,000-world dataset drops in here without engine changes.
// -----------------------------------------------------------------------------

export const DESTINATIONS = {
  verdant: {
    id: 'verdant',
    name: 'THELUME-04',
    universe: 'UNIVERSE 0412',
    year: 'YEAR 2847',
    status: 'STABLE · BIOLOGICALLY ACTIVE',
    summary: 'Life took a longer road here. Nothing was ever burned.',
    seed: 5150,
    sky: { top: 0x0b2d3a, horizon: 0x9ef0c8, bandStrength: 0.24, bandSpeed: 0.03 },
    fog: { color: 0x8fdcc0, density: 0.0018 },
    terrain: {
      size: 2000, amplitude: 140, frequency: 0.0015, octaves: 6, gain: 0.52,
      ridged: true, lowColor: 0x1b6040, highColor: 0xd2f0a8, dunes: null,
    },
    lights: {
      ambient: { color: 0x9fe8d0, intensity: 0.72 },
      sun: { color: 0xfff4cf, intensity: 1.3, position: [480, 360, -460] },
      rim: { color: 0x5ef0c0, intensity: 0.5, position: [-620, 180, 520] },
    },
    atmosphere: [
      { count: 3000, color: 0xdcffd4, size: 1.9, opacity: 0.48, drift: [0.7, 1.5, 0.4], swirl: 4.5, bounds: { x: 800, y: 260, z: 800 } },
      { count: 700, color: 0x86f7ff, size: 3.4, opacity: 0.3, drift: [0.3, 2.2, 0.2], swirl: 7, bounds: { x: 600, y: 320, z: 600 } },
    ],
    props: [
      { type: 'spire', count: 280, spread: 820, scale: [9, 36], color: 0x2d9460, tilt: 0.08, sway: 0.35 },
      { type: 'canopy', count: 110, spread: 900, scale: [16, 48], color: 0x4fd488, tilt: 0.06, sway: 0.22 },
    ],
    orbitals: [{ radius: 200, distance: -1500, height: 640, color: 0xc4f2ff, opacity: 0.5, offsetX: -280 }],
    camera: { entry: { pos: [0, 54, 200], look: [0, 40, -180] }, approach: { pos: [0, 30, -100], look: [0, 20, -250] } },
    rewardRange: [120, 180],
  },

  ash: {
    id: 'ash',
    name: 'KHERAN-9',
    universe: 'UNIVERSE 0009',
    year: 'YEAR 3106',
    status: 'COLLAPSED · ATMOSPHERE DEGRADED',
    summary: 'The dust never settled. Whatever lived here left no record.',
    seed: 1317,
    sky: { top: 0x170c05, horizon: 0xc07f42, bandStrength: 0.18, bandSpeed: 0.02 },
    fog: { color: 0x8d5f36, density: 0.0044 },
    terrain: {
      size: 1800, amplitude: 52, frequency: 0.0026, octaves: 5, gain: 0.48,
      ridged: false, lowColor: 0x5e3c20, highColor: 0xcf9f60,
      dunes: { strength: 13, wavelength: 0.012, angle: 0.6 },
    },
    lights: {
      ambient: { color: 0x7a4f2c, intensity: 0.55 },
      sun: { color: 0xff9f50, intensity: 1.1, position: [-420, 110, -800] },
      rim: { color: 0x3a2a55, intensity: 0.35, position: [500, 200, 600] },
    },
    atmosphere: [
      { count: 4400, color: 0xd6a86e, size: 1.6, opacity: 0.45, drift: [6, 0.3, 1.2], swirl: 3, bounds: { x: 900, y: 150, z: 900 } },
      { count: 900, color: 0xffd0a0, size: 3.2, opacity: 0.18, drift: [2.2, 0.6, 0.4], swirl: 5, bounds: { x: 700, y: 220, z: 700 } },
    ],
    props: [
      { type: 'rock', count: 110, spread: 900, scale: [3, 18], color: 0x543520, tilt: 0.5 },
      { type: 'monolith', count: 14, spread: 1100, scale: [20, 60], color: 0x33220f, tilt: 0.1 },
    ],
    camera: { entry: { pos: [0, 24, 200], look: [0, 16, -180] }, approach: { pos: [0, 14, -110], look: [0, 10, -250] } },
    rewardRange: [40, 70],
  },

  glacius: {
    id: 'glacius',
    name: 'SORRA-VELT',
    universe: 'UNIVERSE 1180',
    year: 'YEAR 2211',
    status: 'FROZEN · SURFACE DORMANT',
    summary: 'The oceans locked before the first city finished rising.',
    seed: 7711,
    sky: { top: 0x0a1a35, horizon: 0xbfe6ff, bandStrength: 0.3, bandSpeed: 0.025 },
    fog: { color: 0xa8cde8, density: 0.0032 },
    terrain: {
      size: 2000, amplitude: 110, frequency: 0.0019, octaves: 5, gain: 0.5,
      ridged: true, lowColor: 0x3f6d94, highColor: 0xeaf6ff, dunes: null,
    },
    lights: {
      ambient: { color: 0xbcd9f2, intensity: 0.8 },
      sun: { color: 0xdfeeff, intensity: 1.05, position: [-300, 220, -700] },
      rim: { color: 0x7fb6ff, intensity: 0.5, position: [600, 160, 500] },
    },
    atmosphere: [
      { count: 3600, color: 0xeaf7ff, size: 1.7, opacity: 0.5, drift: [3.2, 0.8, 0.9], swirl: 4, bounds: { x: 850, y: 220, z: 850 } },
    ],
    props: [
      { type: 'crystal', count: 160, spread: 900, scale: [10, 50], color: 0x9fd8ff, tilt: 0.25, emissive: 0.25 },
      { type: 'rock', count: 60, spread: 900, scale: [5, 20], color: 0x55809f, tilt: 0.4 },
    ],
    orbitals: [{ radius: 130, distance: -1400, height: 520, color: 0xdff0ff, opacity: 0.45, offsetX: 420 }],
    camera: { entry: { pos: [0, 48, 210], look: [0, 34, -180] }, approach: { pos: [0, 28, -100], look: [0, 18, -250] } },
    rewardRange: [90, 130],
  },

  machina: {
    id: 'machina',
    name: 'ORRIN-PRIME',
    universe: 'UNIVERSE 2044',
    year: 'YEAR 4390',
    status: 'ADVANCED · FULLY ENGINEERED SURFACE',
    summary: 'Here the planet itself was rebuilt. Nothing is accidental.',
    seed: 9042,
    sky: { top: 0x06101f, horizon: 0x4fc8d8, bandStrength: 0.35, bandSpeed: 0.05 },
    fog: { color: 0x1d4a5c, density: 0.0028 },
    terrain: {
      size: 2200, amplitude: 70, frequency: 0.0024, octaves: 4, gain: 0.45,
      ridged: false, lowColor: 0x14242e, highColor: 0x4a7f8f, dunes: null,
    },
    lights: {
      ambient: { color: 0x3f8fa5, intensity: 0.6 },
      sun: { color: 0xa8f0ff, intensity: 1.0, position: [400, 420, -600] },
      rim: { color: 0xff9a4a, intensity: 0.55, position: [-600, 180, 400] },
    },
    atmosphere: [
      { count: 3400, color: 0x8fe8ff, size: 1.8, opacity: 0.45, drift: [0.5, 1.4, 0.3], swirl: 5, bounds: { x: 900, y: 320, z: 900 } },
      { count: 900, color: 0xffb066, size: 3.0, opacity: 0.25, drift: [0.2, 2.0, 0.2], swirl: 8, bounds: { x: 700, y: 380, z: 700 } },
    ],
    props: [
      { type: 'monolith', count: 120, spread: 1000, scale: [40, 190], color: 0x16262f, tilt: 0.02 },
      { type: 'crystal', count: 90, spread: 900, scale: [8, 30], color: 0x53d8f0, tilt: 0.1, emissive: 0.8 },
    ],
    distantWorlds: { count: 30, spread: 3000, minRadius: 14, maxRadius: 60, depth: -2400 },
    camera: { entry: { pos: [0, 66, 230], look: [0, 48, -200] }, approach: { pos: [0, 38, -80], look: [0, 40, -280] } },
    rewardRange: [200, 280],
  },

  abyss: {
    id: 'abyss',
    name: 'MAREN-VAST',
    universe: 'UNIVERSE 0777',
    year: 'YEAR 1964',
    status: 'OCEANIC · LAND MASS MINIMAL',
    summary: 'The water rose and simply never stopped.',
    seed: 6464,
    sky: { top: 0x120a2e, horizon: 0x6f5ad0, bandStrength: 0.32, bandSpeed: 0.04 },
    fog: { color: 0x3b3480, density: 0.0030 },
    terrain: {
      size: 2100, amplitude: 60, frequency: 0.0030, octaves: 6, gain: 0.58,
      ridged: false, lowColor: 0x1a1a52, highColor: 0x6f8ce0, dunes: { strength: 7, wavelength: 0.02, angle: 1.2 },
    },
    lights: {
      ambient: { color: 0x6a6ad0, intensity: 0.7 },
      sun: { color: 0xc7b4ff, intensity: 1.05, position: [200, 300, -800] },
      rim: { color: 0x5ce0d0, intensity: 0.5, position: [-500, 150, 500] },
    },
    atmosphere: [
      { count: 3800, color: 0xa8b8ff, size: 1.8, opacity: 0.5, drift: [1.4, 1.0, 0.5], swirl: 6, bounds: { x: 900, y: 260, z: 900 } },
      { count: 800, color: 0x7cf0e0, size: 3.4, opacity: 0.28, drift: [0.4, 1.8, 0.3], swirl: 8, bounds: { x: 700, y: 320, z: 700 } },
    ],
    props: [
      { type: 'crystal', count: 100, spread: 950, scale: [8, 36], color: 0x6f7de8, tilt: 0.3, emissive: 0.4 },
      { type: 'rock', count: 70, spread: 900, scale: [4, 16], color: 0x27306b, tilt: 0.5 },
    ],
    orbitals: [{ radius: 240, distance: -1600, height: 700, color: 0xb9a8ff, opacity: 0.4, offsetX: -420 }],
    camera: { entry: { pos: [0, 42, 210], look: [0, 30, -180] }, approach: { pos: [0, 24, -100], look: [0, 16, -250] } },
    rewardRange: [150, 210],
  },
};
