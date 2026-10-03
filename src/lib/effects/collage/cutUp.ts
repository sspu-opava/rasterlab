import { seededRandom } from '../../utils/random';
import { numberParameter as n, seedParameter, shaderEffect } from '../core/shader';
export function partialFragmentOrder(count: number, seed: number, amount: number): Float32Array {
  const order = Float32Array.from({ length: count }, (_, index) => index), random = seededRandom(seed);
  for (let index = count - 1; index > 0; index--) {
    if (random() >= amount) continue;
    const other = Math.floor(random() * (index + 1)); [order[index], order[other]] = [order[other], order[index]];
  }
  return order;
}
export const cutUp = shaderEffect({
  id: 'cut-up', name: 'Cut-Up', category: 'Collage', description: 'Řízené dadaistické promíchání fragmentů; velikost je zlomek šířky a výšky obrazu.',
  parameters: [n('fragmentSize', 'Fragment size (fraction)', 0.25, 0.125, 1, 0.025), n('randomness', 'Randomness', 0.75, 0, 1), seedParameter],
  data: { declarations: 'uniform float uCutOrder[64];', create() {
    const order = new Float32Array(64); let key = '';
    return { uniforms: { uCutOrder: { value: order, type: 'f32', size: 64 } }, update(p) {
      const grid = Math.max(1, Math.min(8, Math.floor(1 / Number(p.fragmentSize))));
      const next = `${grid}:${p.randomness}:${p.seed}`; if (next === key) return; key = next;
      order.fill(0); order.set(partialFragmentOrder(grid * grid, Number(p.seed), Number(p.randomness)));
    } };
  } },
  body: `float grid = clamp(floor(1.0 / p_fragmentSize), 1.0, 8.0);
    vec2 cell = min(floor(uv * grid), vec2(grid - 1.0));
    float index = cell.y * grid + cell.x, mapped = uCutOrder[int(index)];
    finalColor = sampleImage((vec2(mod(mapped, grid), floor(mapped / grid)) + uv * grid - cell) / grid);`,
});
