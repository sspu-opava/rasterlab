/** Resolution-independent smooth value noise and bounded fractal Brownian motion. */
export const noiseFieldGLSL = `
float valueNoise(vec2 point, float seed) {
  vec2 cell = floor(point), f = fract(point);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(vec3(cell, seed)), hash(vec3(cell + vec2(1.0, 0.0), seed)), f.x), mix(hash(vec3(cell + vec2(0.0, 1.0), seed)), hash(vec3(cell + vec2(1.0), seed)), f.x), f.y);
}
float fbm(vec2 point, float seed, float octaves, float persistence, float lacunarity) {
  float sum = 0.0, weight = 1.0, weights = 0.0;
  for (int i = 0; i < 8; i++) {
    if (float(i) >= octaves) break;
    sum += valueNoise(point, seed + float(i) * 17.0) * weight;
    weights += weight; weight *= persistence; point = point * lacunarity + vec2(13.7, 8.3);
  }
  return sum / max(weights, 0.00001);
}`;
