import { seededRandom } from '../../utils/random';
import type { ShaderData } from '../core/shader';

/** Bijective source assignment: shuffling never duplicates or drops a fragment. */
export function fragmentOrder(count: number, seed: number, shuffle: boolean): Float32Array {
  const order = Float32Array.from({ length: count }, (_, index) => index);
  const random = seededRandom(seed);
  if (shuffle) for (let index = count - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [order[index], order[other]] = [order[other], order[index]];
  }
  return order;
}

/** A separate generated map, cached independently of transform sliders. */
export function fragmentData(grid: boolean): ShaderData {
  return { declarations: 'uniform float uOrder[64];', create() {
    const order = new Float32Array(64); let key = '';
    return { uniforms: { uOrder: { value: order, type: 'f32', size: 64 } }, update(parameters) {
      const count = grid ? Number(parameters.columns) * Number(parameters.rows) : Number(parameters.count);
      const next = `${count}:${parameters.seed}:${parameters.shuffle}`;
      if (key === next) return;
      key = next; order.fill(0); order.set(fragmentOrder(count, Number(parameters.seed), Boolean(parameters.shuffle)));
    } };
  } };
}
