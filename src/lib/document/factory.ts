import type { LayerBase, RasterDocument, RasterLayer } from './types';

export function createDocument(width = 1000, height = 1000): RasterDocument {
  if (![width, height].every(n => Number.isInteger(n) && n > 0 && n <= 8192)) {
    throw new Error('Rozměry dokumentu musí být celá čísla od 1 do 8192 px.');
  }
  const timestamp = new Date().toISOString();
  return {
    id: crypto.randomUUID(), name: 'Untitled', width, height, layers: [],
    background: { r: 0, g: 0, b: 0, a: 0 }, createdAt: timestamp, modifiedAt: timestamp,
  };
}

export function layerDefaults(name: string): LayerBase {
  return {
    id: crypto.randomUUID(), name, visible: true, locked: false, opacity: 1,
    position: { x: 0, y: 0 }, scale: { x: 1, y: 1 }, rotation: 0,
    blendMode: 'normal', effects: [],
  };
}

export function createRasterLayer(asset: { id: string; name: string; width: number; height: number }, document: RasterDocument): RasterLayer {
  const scale = Math.min(1, document.width / asset.width, document.height / asset.height);
  return {
    ...layerDefaults(asset.name.replace(/\.[^.]+$/, '')), type: 'raster', assetId: asset.id,
    position: { x: (document.width - asset.width * scale) / 2, y: (document.height - asset.height * scale) / 2 },
    scale: { x: scale, y: scale },
  };
}
