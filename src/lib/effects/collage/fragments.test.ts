import { describe, expect, it } from 'vitest';
import { fragmentOrder, fragmentData } from './fragments';
import { generateFolds } from '../material/foldMap';
describe('procedural geometry', () => {
  it('shuffles bijectively and reproduces the same seed', () => {
    for (const count of [1, 12, 64]) {
      const order = fragmentOrder(count, 42, true);
      expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: count }, (_, i) => i));
      expect(order).toEqual(fragmentOrder(count, 42, true));
      expect(fragmentOrder(count, 42, false)).toEqual(Float32Array.from({ length: count }, (_, i) => i));
    }
    expect(fragmentOrder(64, 42, true)).not.toEqual(fragmentOrder(64, 43, true));
  });
  it('regenerates maps after dimensions, shuffle or seed changes', () => {
    const data = fragmentData(true).create();
    data.update({ columns: 8, rows: 8, seed: 42, shuffle: true });
    expect(data.uniforms.uOrder.value).toEqual(fragmentOrder(64, 42, true));
    data.update({ columns: 2, rows: 3, seed: 43, shuffle: false });
    expect([...(data.uniforms.uOrder.value as Float32Array)].slice(0, 6)).toEqual([0, 1, 2, 3, 4, 5]);
    expect([...(data.uniforms.uOrder.value as Float32Array)].slice(6).every(value => value === 0)).toBe(true);
  });
  it('generates finite mountain and valley creases with unit normals', () => {
    const folds = generateFolds(32, 76123);
    expect(folds).toEqual(generateFolds(32, 76123));
    expect(folds).not.toEqual(generateFolds(32, 76124));
    const depths: number[] = [];
    for (let i = 0; i < folds.length; i += 4) {
      expect(Math.hypot(folds[i], folds[i + 1])).toBeCloseTo(1, 6);
      expect(Math.abs(folds[i + 2])).toBeLessThanOrEqual(1);
      depths.push(folds[i + 3]);
    }
    expect(depths.some(value => value < 0)).toBe(true); expect(depths.some(value => value > 0)).toBe(true);
  });
});
