import { seededRandom } from '../../utils/random';
import type { ShaderData } from '../core/shader';

/** Normalized sites and displacement vectors; independent of resolution and rendering. */
export function generateVoronoiSites(count: number, seed: number): Float32Array {
  const random = seededRandom(seed), sites = new Float32Array(count * 4);
  for (let index = 0; index < count; index++) sites.set([random(), random(), random() * 2 - 1, random() * 2 - 1], index * 4);
  return sites;
}
export const voronoiData: ShaderData = { declarations: 'uniform vec4 uSites[32];', create() {
  const sites = new Float32Array(128); let key = '';
  return { uniforms: { uSites: { value: sites, type: 'vec4<f32>', size: 32 } }, update(parameters) {
    const next = `${parameters.cells}:${parameters.seed}`;
    if (next === key) return;
    key = next; sites.fill(0); sites.set(generateVoronoiSites(Number(parameters.cells), Number(parameters.seed)));
  } };
} };
/** Pixel-space distance keeps cells isotropic on rectangular documents. */
export const voronoiGLSL = `
int nearestSite(vec2 pixel, float count) {
  float nearest = 1e30; int winner = 0;
  for (int i = 0; i < 32; i++) {
    if (float(i) >= count) break;
    vec2 delta = pixel - uSites[i].xy * uSize;
    float distance = dot(delta, delta);
    if (distance < nearest) { nearest = distance; winner = i; }
  }
  return winner;
}
float cellEdgeDistance(vec2 pixel, int winner, float count) {
  vec2 center = uSites[winner].xy * uSize;
  float edge = 1e30;
  for (int i = 0; i < 32; i++) {
    if (float(i) >= count) break;
    if (i == winner) continue;
    vec2 other = uSites[i].xy * uSize;
    vec2 normal = other - center;
    float separation = length(normal);
    if (separation > 0.0001) edge = min(edge, dot((center + other) * 0.5 - pixel, normal / separation));
  }
  return edge;
}`;
