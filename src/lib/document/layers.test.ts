import { expect, it } from 'vitest';
import { layerDefaults, createDocument } from './factory';
import { layerEntries, layerLocked, reparentLayer, assertLayerGraph, localDragDelta } from './layers';
import type { GroupLayer, GeneratedLayer } from './types';
import { ProjectDeserializer } from '../project/ProjectDeserializer';
import { generatorRegistry } from '../generators';
import { validateParameters } from '../effects/core/parameters';
const generated = (name = 'Checker'): GeneratedLayer => ({ ...layerDefaults(name), type: 'generated', generatorId: 'checker', parameters: validateParameters(generatorRegistry.get('checker')!, {}) });
const group = (children: GeneratedLayer[] = []): GroupLayer => ({ ...layerDefaults('Group'), type: 'group', children });
it('tracks nested parent/depth and inherited locks without changing child flags', () => {
  const child = generated(), parent = { ...group([child]), locked: true };
  const entries = layerEntries([parent]); expect(entries[1].parentId).toBe(parent.id); expect(entries[1].depth).toBe(1); expect(entries[1].inheritedLock).toBe(true); expect(layerLocked([parent], child.id)).toBe(true); expect(child.locked).toBe(false);
});
it('moves a child in and out without changing its UUID, parameters or source coordinates', () => {
  const child = generated(), parent = group(); const moved = reparentLayer([child, parent], child.id, parent.id);
  expect(moved).toHaveLength(1); expect((moved[0] as GroupLayer).children[0]).toBe(child);
  expect(reparentLayer(moved, child.id, null)[0]).toBe(child);
});
it('rejects self/descendant hierarchy moves and dependency cycles without partial mutation', () => {
  const child = generated(), parent = group([child]), outer: GroupLayer = { ...group(), children: [parent] };
  expect(() => reparentLayer([outer], outer.id, parent.id)).toThrow('potomka');
  child.effects = [{ id: 'e', effectId: 'xor', enabled: true, parameters: {}, inputs: { secondary: parent.id } }];
  expect(() => assertLayerGraph([parent])).toThrow('cyklus');
  expect(outer.children[0]).toBe(parent);
});
it('converts drag vectors through rotated and scaled ancestor coordinates', () => {
  const child = generated(), parent = { ...group([child]), rotation: 90, scale: { x: 2, y: 3 } };
  const delta = localDragDelta([parent], child.id, 0, 20); expect(delta.x).toBeCloseTo(10); expect(delta.y).toBeCloseTo(0);
});
it('migrates v1 raster/group documents and validates asset-free v2 generated projects', () => {
  const document = createDocument(64, 48); document.layers = [group([generated()])];
  const result = ProjectDeserializer.parse(JSON.stringify({ format: 'rasterlab', version: 2, document, assets: [] })); expect(result.version).toBe(3); expect(result.assets).toEqual([]); expect(result.document.layers).toEqual(document.layers);
  document.layers = [];
  expect(ProjectDeserializer.parse(JSON.stringify({ format: 'rasterlab', version: 1, document, assets: [] })).version).toBe(3);
  document.layers = [{ ...generated(), generatorId: 'unknown' }]; expect(() => ProjectDeserializer.parse(JSON.stringify({ format: 'rasterlab', version: 2, document, assets: [] }))).toThrow('generátor');
});
it('exposes eight generators with validated and serializable parameters', () => {
  expect(generatorRegistry.list()).toHaveLength(8);
  for (const generator of generatorRegistry.list()) { const defaults = Object.fromEntries(generator.parameters.map(parameter => [parameter.id, parameter.default])); expect(validateParameters(generator, defaults)).toEqual(defaults); expect(generator.inputs).toEqual([]); }
});
