import { expect, it } from 'vitest';
import { get } from 'svelte/store';
import { newDocument, documentStore, selectedLayerId, addGenerator, groupSelectedLayer, setGeneratorParameter, addEffect, capturePreset, applyPreset, undo, redo, updateLayer, moveLayerToGroup } from './state';
import { findLayer } from '../document/layers';
it('edits generators and effect stacks inside groups through a single undoable command', () => {
  newDocument(64, 48); addGenerator('checker'); const id = get(selectedLayerId)!; groupSelectedLayer(id); const groupId = get(selectedLayerId)!;
  setGeneratorParameter(id, 'cellSize', 8); addEffect(id, 'threshold');
  const preset = capturePreset(id, 'Threshold'); applyPreset(id, preset, {}, false);
  expect(findLayer(get(documentStore).layers, id)?.effects).toHaveLength(2); undo(); expect(findLayer(get(documentStore).layers, id)?.effects).toHaveLength(1); redo(); expect(findLayer(get(documentStore).layers, id)?.effects).toHaveLength(2);
  updateLayer(groupId, { locked: true }); setGeneratorParameter(id, 'cellSize', 40); addEffect(id, 'noise');
  const child = findLayer(get(documentStore).layers, id)!; expect(child.type === 'generated' && child.parameters.cellSize).toBe(8); expect(child.effects).toHaveLength(2);
  updateLayer(groupId, { locked: false }); moveLayerToGroup(id, null); expect(get(documentStore).layers[0].id).toBe(id); undo(); expect(get(documentStore).layers[0].id).toBe(groupId);
});
