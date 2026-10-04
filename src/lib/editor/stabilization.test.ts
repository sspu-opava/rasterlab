import { afterEach, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { addGenerator, busy, documentStore, groupSelection, historyState, importing, newDocument, selectLayer, selectedLayerId, ungroupLayer, updateDocument, updateLayer, undo, redo, loadProjectJson } from './state';
import { layerVisible } from '../document/layers';
import { assertScale } from '../document/transforms';
import { assertRenderCapacity } from '../render/capacity';
afterEach(() => { busy.set(false); importing.set(false); });
it('blocks new/load during import and leaves the original document intact', async () => {
  newDocument(64, 48); const original = get(documentStore); importing.set(true); newDocument(32, 32);
  expect(get(documentStore)).toBe(original); await expect(loadProjectJson('{}')).rejects.toThrow(); expect(get(documentStore)).toBe(original);
});
it('groups a multiple selection without changing order, and safely dissolves it with undo/redo', () => {
  newDocument(64, 48); addGenerator('checker'); const first = get(selectedLayerId)!; addGenerator('noise'); const second = get(selectedLayerId)!;
  selectLayer(first); selectLayer(second, true); groupSelection(); const group = get(selectedLayerId)!;
  const model = get(documentStore); expect(model.layers[0].type === 'group' && model.layers[0].children.map(layer => layer.id)).toEqual([second, first]);
  updateLayer(group, { position: { x: 10, y: 0 } }); const transformed = get(documentStore); ungroupLayer(group); expect(get(documentStore)).toBe(transformed);
  undo(); ungroupLayer(group); expect(get(documentStore).layers.map(layer => layer.id)).toEqual([second, first]); undo(); expect(get(documentStore).layers[0].id).toBe(group); redo(); expect(get(documentStore).layers).toHaveLength(2);
});
it('honors ancestor visibility and rejects invalid scales and over-budget rendering', () => {
  newDocument(64, 48); addGenerator('checker'); const child = get(selectedLayerId)!; selectLayer(child); groupSelection(); updateLayer(get(selectedLayerId)!, { visible: false });
  expect(layerVisible(get(documentStore).layers, child)).toBe(false);
  for (const x of [0, -1, 0.009, 101, NaN, Infinity]) expect(() => assertScale({ x, y: 1 })).toThrow();
  expect(() => assertRenderCapacity({ ...get(documentStore), width: 8192, height: 8192 }, 8192)).toThrow(/paměti/);
  expect(() => assertRenderCapacity(get(documentStore), 32)).toThrow(/GPU/);
});
it('document settings form an undoable dirty command even on an empty document', () => {
  newDocument(64, 48); const original = get(documentStore);
  updateDocument({ name: 'Nový název', width: 80, height: 60, background: { r: 255, g: 0, b: 0, a: 0.5 } });
  expect(get(historyState).dirty).toBe(true); expect(get(documentStore).name).toBe('Nový název'); undo(); expect(get(documentStore)).toBe(original); redo(); expect(get(documentStore).width).toBe(80);
});

it('invalid new/settings commands preserve the live document', () => {
  newDocument(64, 48); addGenerator('checker'); const original = get(documentStore);
  expect(() => newDocument(-1, 40)).toThrow(); expect(get(documentStore)).toBe(original);
  expect(() => updateDocument({ name: 'Bad', width: 64, height: 48, background: { r: NaN, g: 0, b: 0, a: 1 } })).toThrow(); expect(get(documentStore)).toBe(original);
});
