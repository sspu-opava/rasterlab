import { expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { newDocument, addGenerator, documentStore, selectedLayerId, groupSelectedLayer, setLayerMask, duplicateLayer, deleteLayer, undo, redo, updateLayer, capturePreset, applyPreset, addEffect } from './state';
import { layerEntries, assertLayerGraph, findLayer } from '../document/layers';
import { ProjectDeserializer } from '../project/ProjectDeserializer';
import { RenderGraph } from '../render/RenderGraph';
function setup() { newDocument(64, 48); addGenerator('noise'); const source = get(selectedLayerId)!; addGenerator('checker'); return { source, target: get(selectedLayerId)! }; }
it('masks are undoable, bounded and protected by inherited locks', () => {
  const { source, target } = setup(); setLayerMask(target, { sourceId: source, strength: 2, feather: 99 });
  expect(findLayer(get(documentStore).layers, target)?.mask).toMatchObject({ sourceId: source, strength: 1, feather: 64 });
  undo(); expect(findLayer(get(documentStore).layers, target)?.mask).toBeUndefined(); redo();
  groupSelectedLayer(target); const group = get(selectedLayerId)!; updateLayer(group, { locked: true }); setLayerMask(target, null);
  expect(findLayer(get(documentStore).layers, target)?.mask).toBeDefined();
});
it('mask/effect/group cycles are rejected atomically even if disabled', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const { source, target } = setup(); setLayerMask(target, { sourceId: source, enabled: false }); const before = get(documentStore);
    setLayerMask(source, { sourceId: target }); expect(get(documentStore)).toBe(before);
    addEffect(source, 'threshold'); const preset = capturePreset(source, 'safe'); preset.effects[0].inputs = { secondary: 'role' }; preset.roles = [{ id: 'role', label: 'Input' }];
    expect(() => applyPreset(source, preset, { role: target })).toThrow('cyklus');
    groupSelectedLayer(target); const group = get(selectedLayerId)!; setLayerMask(source, null); setLayerMask(target, { sourceId: group });
    expect(findLayer(get(documentStore).layers, target)?.mask?.sourceId).toBe(source);
  } finally { spy.mockRestore(); }
});
it('deleting a mask source clears the reference, undo restores it', () => {
  const { source, target } = setup(); setLayerMask(target, { sourceId: source }); deleteLayer(source);
  expect(findLayer(get(documentStore).layers, target)?.mask).toBeUndefined(); undo(); expect(findLayer(get(documentStore).layers, target)?.mask?.sourceId).toBe(source);
});
it('duplicating a group remaps internal effect/mask IDs and keeps external references', () => {
  const { source, target } = setup(); setLayerMask(target, { sourceId: source }); addEffect(target, 'xor');
  groupSelectedLayer(source); const groupId = get(selectedLayerId)!;
  // Put target inside without changing the original IDs.
  const original = get(documentStore), group = original.layers.find(layer => layer.id === groupId)!;
  if (group.type !== 'group') throw new Error('group');
  documentStore.set({ ...original, layers: [{ ...group, children: [findLayer(original.layers, target)!, ...group.children] }] });
  duplicateLayer(groupId); const copy = get(documentStore).layers[0];
  expect(copy.id).not.toBe(groupId); if (copy.type !== 'group') throw new Error('copy');
  expect(copy.children[0].mask?.sourceId).toBe(copy.children[1].id); expect(copy.children[0].effects[0].inputs.secondary).toBe(copy.children[1].id); expect(copy.children[0].effects[0].id).not.toBe(findLayer(original.layers, target)!.effects[0].id); expect(copy.children[1].id).not.toBe(source); assertLayerGraph(get(documentStore).layers);
  expect(new Set(layerEntries(get(documentStore).layers).map(entry => entry.layer.id)).size).toBe(6);
  undo(); expect(get(documentStore).layers).toHaveLength(1); redo(); expect(get(documentStore).layers[0].id).toBe(copy.id);
});
it('project v3 validates masks and rejects cycles, bad ranges and masks in old versions', () => {
  const { source, target } = setup(); setLayerMask(target, { sourceId: source });
  const file = { format: 'rasterlab', version: 3, document: get(documentStore), assets: [] };
  expect(ProjectDeserializer.parse(JSON.stringify(file)).document).toEqual(file.document);
  for (const version of [1, 2]) expect(() => ProjectDeserializer.parse(JSON.stringify({ ...file, version }))).toThrow();
  for (const patch of [{ sourceId: target }, { sourceId: 'missing' }, { strength: -1 }, { feather: 65 }, { mode: 'other' }, { enabled: 1 }]) {
    const changed = structuredClone(file); changed.document.layers[0].mask = { ...changed.document.layers[0].mask!, ...patch } as never;
    expect(() => ProjectDeserializer.parse(JSON.stringify(changed))).toThrow();
  }
});
it('mask invalidation reaches downstream outputs without invalidating the target source', () => {
  const { source, target } = setup(); setLayerMask(target, { sourceId: source }); const graph = new RenderGraph(); graph.update(get(documentStore)); graph.markClean();
  graph.invalidate(`${source}:generated`); expect(graph.dirty.has(`${target}:mask`)).toBe(true); expect(graph.dirty.has(`${target}:source`)).toBe(false); expect(graph.dirty.has('document')).toBe(true);
});
