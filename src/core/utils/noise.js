// Small deterministic value-noise + fbm. No dependencies, seeded per world so
// each planet generates a stable but completely different terrain.

export function makeRandom(seed = 1) {
  let s = seed >>> 0 || 1;
  return function random() {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function hash2(x, y, seed) {
  let h = x * 374761393 + y * 668265263 + seed * 2246822519;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return ((h >>> 0) / 4294967296);
}

const smooth = (t) => t * t * (3 - 2 * t);

export function valueNoise2D(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = smooth(xf), v = smooth(yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

/**
 * Fractal brownian motion.
 * @param {object} o { octaves, frequency, amplitude, lacunarity, gain, seed, ridged }
 */
export function fbm(x, y, o = {}) {
  const octaves = o.octaves ?? 4;
  const lacunarity = o.lacunarity ?? 2.0;
  const gain = o.gain ?? 0.5;
  const seed = o.seed ?? 0;
  let freq = o.frequency ?? 1;
  let amp = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    let n = valueNoise2D(x * freq, y * freq, seed + i * 17);
    if (o.ridged) n = 1 - Math.abs(n * 2 - 1);
    sum += n * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm; // 0..1
}
