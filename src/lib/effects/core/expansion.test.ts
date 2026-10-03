import { expect, it } from 'vitest';
import { effectRegistry } from '../index';
import { validateParameters } from './parameters';
import { partialFragmentOrder } from '../collage/cutUp';
it('exposes 53 unique effects with valid default parameters and serializable metadata', () => {
  const definitions = effectRegistry.list(); expect(definitions).toHaveLength(53);
  expect(new Set(definitions.map(effect => effect.id)).size).toBe(53);
  for (const definition of definitions) {
    const defaults = Object.fromEntries(definition.parameters.map(parameter => [parameter.id, parameter.default]));
    expect(validateParameters(definition, defaults)).toEqual(defaults);
    expect(new Set(definition.parameters.map(parameter => parameter.id)).size).toBe(definition.parameters.length);
    expect(JSON.parse(JSON.stringify(defaults))).toEqual(defaults);
  }
});
it('partially shuffles a complete permutation without duplicating or losing fragments', () => {
  const identity = Array.from({ length: 64 }, (_, index) => index);
  expect([...partialFragmentOrder(64, 42, 0)]).toEqual(identity);
  for (const amount of [0.1, 0.5, 1]) {
    const order = partialFragmentOrder(64, 42, amount);
    expect([...order].sort((a, b) => a - b)).toEqual(identity);
    expect(order).toEqual(partialFragmentOrder(64, 42, amount));
  }
  expect(partialFragmentOrder(64, 42, 1)).not.toEqual(partialFragmentOrder(64, 43, 1));
});
