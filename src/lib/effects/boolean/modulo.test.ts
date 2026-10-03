import { expect, it } from 'vitest';
import { moduloChannel } from './modulo';
it('folds sums by the divisor, applies gain and bounds the output', () => {
  expect(moduloChannel(0.2, 0.3, 0.4, 1)).toBeCloseTo(0.25);
  expect(moduloChannel(0.2, 0.3, 0.4, 2)).toBeCloseTo(0.5);
  expect(moduloChannel(0.6, 0.1, 0.8, 4)).toBe(1);
  expect(moduloChannel(0.2, 0.3, 0.4, 0)).toBe(0);
  expect(Number.isFinite(moduloChannel(0.2, 0.3, 0, 1))).toBe(true);
});
