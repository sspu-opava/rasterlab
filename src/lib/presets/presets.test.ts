import { expect, it } from 'vitest';
import { createPreset, instantiatePreset, parsePreset, presetWarnings } from './presets';
import { builtinPresets } from './builtins';
import { createDocument } from '../document/factory';
import type { EffectInstance, RasterLayer } from '../document/types';
function layer(id: string, effects: EffectInstance[] = []): RasterLayer { return { id, type: 'raster', assetId: 'asset', name: id, visible: true, locked: false, opacity: 1, position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0, blendMode: 'normal', effects }; }
const effect = (id: string, source?: string): EffectInstance => ({ id, effectId: source ? 'xor' : 'noise', enabled: true, parameters: source ? {} : { amount: 0.25, seed: 123 }, inputs: source ? { secondary: source } : {} });
it('converts shared source UUIDs to one role and preserves seed, order and enabled state', () => {
  const source = layer('source'), target = layer('target', [effect('one', 'source'), { ...effect('two', 'source'), enabled: false }]);
  const preset = createPreset('Mix', target.effects, [target, source]);
  expect(preset.roles).toEqual([{ id: 'source-1', label: 'source' }]); expect(JSON.stringify(preset.effects)).not.toContain('"source"');
  const applied = instantiatePreset(preset, [target, layer('other')], 'target', { 'source-1': 'other' }, true);
  expect(applied.map(item => item.inputs.secondary)).toEqual(['other', 'other']); expect(applied[1].enabled).toBe(false); expect(applied[0].id).not.toBe('one');
  applied[0].parameters.opacity = 0; expect(preset.effects[0].parameters.opacity).not.toBe(0);
});
it('rejects cycles including group dependencies, self-inputs and missing role assignments atomically', () => {
  const target = layer('target'), dependent = layer('dependent', [effect('ref', 'target')]);
  const preset = createPreset('XOR', [effect('mix', 'source')], [layer('source')]);
  for (const binding of ['target', 'missing', 'dependent', '']) expect(() => instantiatePreset(preset, [target, dependent], 'target', { 'source-1': binding }, false)).toThrow();
  const group = { ...layer('group'), type: 'group' as const, children: [target] };
  expect(() => instantiatePreset(preset, [group], 'target', { 'source-1': 'group' }, false)).toThrow('cyklus'); expect(target.effects).toEqual([]);
});
it('enforces limits and locks and creates independent instances on each application', () => {
  const preset = createPreset('Noise', [effect('noise')], []), target = layer('target', Array.from({ length: 32 }, (_, index) => effect(`e-${index}`)));
  expect(() => instantiatePreset(preset, [target], target.id, {}, false)).toThrow('32');
  expect(instantiatePreset(preset, [target], target.id, {}, true)).toHaveLength(1);
  expect(instantiatePreset(preset, [target], target.id, {}, true)[0].parameters.seed).toBe(123);
  expect(() => instantiatePreset(preset, [{ ...target, locked: true }], target.id, {}, true)).toThrow('zamčená');
});
it('validates imports, normalizes known parameters and preserves unknown modules with diagnostics', () => {
  const preset = createPreset('Noise', [effect('noise')], []);
  preset.effects[0].parameters.amount = 99; expect(parsePreset(JSON.stringify(preset)).effects[0].parameters.amount).toBe(1);
  preset.effects[0].effectId = 'future-effect'; expect(presetWarnings(parsePreset(JSON.stringify(preset)))[0]).toContain('Chybí');
  for (const patch of [{ version: 2 }, { effects: [] }, { roles: [{ id: 'x', label: 'X' }, { id: 'x', label: 'X' }] }, { name: ' '.repeat(10) }]) expect(() => parsePreset(JSON.stringify({ ...preset, ...patch }))).toThrow();
  preset.effects[0].inputs.secondary = 'unknown-role'; expect(() => parsePreset(JSON.stringify(preset))).toThrow();
});
it('provides ten valid built-in recipes and documents version mismatches', () => {
  expect(builtinPresets).toHaveLength(10);
  for (const preset of builtinPresets) expect(parsePreset(JSON.stringify(preset))).toEqual(preset);
  const preset = createPreset('Noise', [effect('noise')], []); preset.effects[0].version = '0.0.0'; expect(presetWarnings(preset)[0]).toContain('verzi');
  expect(createDocument().layers).toEqual([]);
});
