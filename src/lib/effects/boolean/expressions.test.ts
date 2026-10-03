import { expect, it } from 'vitest';
import { compileChannelExpression as compile } from './expressions';
import { validateParameter } from '../core/parameters';
it('compiles channels, precedence, parentheses, unary and bounded numbers to scalar GLSL', () => {
  expect(compile('ar + bg * 2')).toBe('(a.r + (b.g * 2.0))');
  expect(compile('(ar + bg) / 2')).toBe('safeDivide(((a.r + b.g)), 2.0)');
  expect(compile('-ab + .5')).toBe('((-a.b) + 0.5)');
  expect(compile('al + bl')).toBe('(luminance(a) + luminance(b))');
  expect(compile('1e-3')).toBe('0.001');
});
it('permits only the supported scalar functions with their exact arity', () => {
  expect(compile('clamp(mix(ar, br, 0.5), 0, 1)')).toBe('clamp(mix(a.r, b.r, 0.5), 0.0, 1.0)');
  for (const invalid of ['abs(ar, br)', 'mix(ar, br)', 'max()', 'sin', 'min(ar,)']) expect(() => compile(invalid)).toThrow();
});
it('rejects shader injection, JavaScript, properties and incomplete grammar', () => {
  for (const invalid of ['ar; finalColor = vec4(1)', 'Math.random()', 'globalThis', 'ar.r', 'constructor()', 'ar +', '', '(ar', 'ar br', 'ar // comment', '1e999']) expect(() => compile(invalid)).toThrow();
});
it('bounds source size and parser recursion, and validates serialized text parameters', () => {
  expect(() => compile('('.repeat(40) + 'ar' + ')'.repeat(40))).toThrow();
  expect(() => compile(' '.repeat(257))).toThrow();
  const parameter = { id: 'red', label: 'Red', type: 'text' as const, default: 'ar' };
  expect(validateParameter(parameter, 'ar + br')).toBe('ar + br');
  expect(validateParameter(parameter, 42)).toBe('ar');
  expect(validateParameter(parameter, 'a'.repeat(257))).toBe('ar');
});
