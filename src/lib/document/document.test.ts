import { describe, expect, it } from 'vitest';
import { createDocument, createRasterLayer } from './factory';

describe('document model', () => {
  it('starts as an empty transparent 1000 × 1000 document', () => {
    const document = createDocument();
    expect([document.width, document.height]).toEqual([1000, 1000]);
    expect(document.layers).toEqual([]);
    expect(document.background.a).toBe(0);
    expect(JSON.parse(JSON.stringify(document))).toEqual(document);
  });
  it('accepts custom dimensions and rejects invalid dimensions', () => {
    expect(createDocument(1920, 1080).width).toBe(1920);
    for (const width of [0, -1, 1.5, 8193, NaN]) expect(() => createDocument(width)).toThrow();
  });
  it('fits a large raster into the document without changing its source', () => {
    const asset = { id: 'asset-1', name: 'portrait.jpg', width: 2400, height: 1200 };
    const layer = createRasterLayer(asset, createDocument());
    expect(layer.assetId).toBe(asset.id);
    expect(layer.scale.x).toBeCloseTo(1000 / 2400);
    expect(layer.position).toEqual({ x: 0, y: 250 });
    expect(layer.name).toBe('portrait');
    expect(asset.width).toBe(2400);
  });
});
