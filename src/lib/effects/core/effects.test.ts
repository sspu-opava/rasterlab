import { describe, expect, it } from 'vitest';
import { EffectRegistry } from './EffectRegistry';
import { grayscale } from '../color/grayscale';
import { threshold } from '../color/threshold';
import { validateParameters, validateParameter } from './parameters';
import { seededRandom } from '../../utils/random';
import { booleanChannel, binaryOperation } from '../boolean/operations';

describe('effect registry and validation', () => {
  it('registers, looks up, groups and unregisters independent modules', () => {
    const registry = new EffectRegistry(); registry.register(grayscale); registry.register(threshold);
    expect(registry.get('grayscale')).toBe(grayscale); expect(registry.listByCategory('Color')).toHaveLength(2);
    expect(() => registry.register(grayscale)).toThrow(); registry.unregister('grayscale'); expect(registry.list()).toEqual([threshold]);
  });
  it('clamps numbers, defaults invalid values and drops undeclared keys', () => {
    expect(validateParameters(threshold, { threshold: 99, softness: NaN, invert: 'yes', injected: true })).toEqual({ threshold: 1, softness: 0, invert: false });
    expect(validateParameters(grayscale, { method: 'invalid' })).toEqual({ method: 'luminance' });
    expect(validateParameter({ id: 'x', label: 'x', type: 'integer', default: 3, min: 1, max: 8 }, 4.6)).toBe(5);
  });
});
describe('seeded PRNG', () => {
  it('repeats for a seed and changes for a different seed', () => {
    const a = seededRandom(12), b = seededRandom(12), c = seededRandom(13);
    const values = Array.from({ length: 50 }, a); expect(values).toEqual(Array.from({ length: 50 }, b)); expect(values).not.toEqual(Array.from({ length: 50 }, c));
    expect(values.every(value => value >= 0 && value < 1)).toBe(true);
  });
});
describe('boolean engine', () => {
  it('implements true byte operations and NAND complement', () => {
    expect(booleanChannel(170, 204, 'XOR')).toBe(102); expect(booleanChannel(170, 204, 'AND')).toBe(136);
    expect(booleanChannel(170, 204, 'OR')).toBe(238); expect(booleanChannel(170, 204, 'NAND')).toBe(119);
  });
  it('thresholds both inputs in binary mode', () => { expect(binaryOperation(0.2, 0.8, 0.5, 'XOR')).toBe(255); expect(binaryOperation(0.8, 0.8, 0.5, 'XOR')).toBe(0); });
});
