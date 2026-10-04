import { describe, expect, it } from 'vitest';
import { createDocument, layerDefaults } from '../document/factory';
import type { RasterLayer } from '../document/types';
import { RenderGraph } from './RenderGraph';

describe('render graph invalidation', () => {
  it('does not recompute a stack through disabled secondary inputs or masks', () => {
    const document = createDocument();
    const a: RasterLayer = { ...layerDefaults('A'), type: 'raster', assetId: 'a' };
    const b: RasterLayer = { ...layerDefaults('B'), type: 'raster', assetId: 'b', effects: [{ id: 'xor-disabled', effectId: 'xor', enabled: false, parameters: {}, inputs: { secondary: a.id } }], mask: { sourceId: a.id, enabled: false, mode: 'alpha', invert: false, strength: 1, feather: 0 } };
    document.layers = [a, b];
    const graph = new RenderGraph(); graph.update(document); graph.markClean(); graph.invalidate(`${a.id}:source`);
    expect(graph.dirty.has(`${b.id}:output`)).toBe(false);
    graph.markClean(); b.effects[0].enabled = true; graph.update(document); expect(graph.dirty.has('xor-disabled')).toBe(true); expect(graph.dirty.has(`${b.id}:output`)).toBe(true);
  });
  it('changes composition without recomputing pixels and ignores names and locks', () => {
    const document = createDocument();
    const layer: RasterLayer = { ...layerDefaults('A'), type: 'raster', assetId: 'a', effects: [{ id: 'threshold', effectId: 'threshold', enabled: true, parameters: {}, inputs: {} }] };
    document.layers = [layer];
    const graph = new RenderGraph(); graph.update(document); graph.markClean();
    layer.opacity = 0.5; graph.update(document); expect([...graph.dirty]).toEqual(['document']);
    graph.markClean(); layer.name = 'Renamed'; layer.locked = true; graph.update(document); expect(graph.dirty.size).toBe(0);
  });
  it('invalidates downstream effects without recomputing the source', () => {
    const document = createDocument();
    const layer: RasterLayer = { ...layerDefaults('Test'), type: 'raster', assetId: 'asset', effects: [
      { id: 'B', effectId: 'threshold', enabled: true, parameters: { threshold: 0.5 }, inputs: {} },
      { id: 'C', effectId: 'noise', enabled: true, parameters: {}, inputs: {} },
    ] };
    document.layers.push(layer);
    const graph = new RenderGraph(); graph.update(document); graph.markClean();
    layer.effects[0].parameters.threshold = 0.8;
    graph.update(document);
    expect(graph.dirty.has('B')).toBe(true);
    expect(graph.dirty.has('C')).toBe(true);
    expect(graph.dirty.has('document')).toBe(true);
    expect(graph.dirty.has(`${layer.id}:source`)).toBe(false);
  });
  it('propagates invalidation through secondary input references', () => {
    const document = createDocument();
    const a: RasterLayer = { ...layerDefaults('A'), type: 'raster', assetId: 'a' };
    const b: RasterLayer = { ...layerDefaults('B'), type: 'raster', assetId: 'b', effects: [{ id: 'xor', effectId: 'xor', enabled: true, parameters: {}, inputs: { secondary: a.id } }] };
    document.layers = [a, b];
    const graph = new RenderGraph(); graph.update(document); graph.markClean();
    graph.invalidate(`${a.id}:source`);
    expect(graph.dirty.has('xor')).toBe(true);
    expect(graph.dirty.has(`${b.id}:source`)).toBe(false);
  });
});
