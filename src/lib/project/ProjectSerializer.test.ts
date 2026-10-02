import { describe, expect, it } from 'vitest';
import { createDocument, layerDefaults } from '../document/factory';
import { ProjectDeserializer } from './ProjectDeserializer';
import { ProjectSerializer } from './ProjectSerializer';
import type { ProjectFile } from './ProjectSerializer';
function project(): ProjectFile {
  const document = createDocument(640, 480);
  document.layers.push({ ...layerDefaults('A'), id: 'layer-a', type: 'raster', assetId: 'asset-a', effects: [{ id: 'effect-a', effectId: 'threshold', enabled: true, parameters: { threshold: 0.7, softness: 0, invert: true }, inputs: {} }] });
  return { format: 'rasterlab', version: 1, document, assets: [{ id: 'asset-a', name: 'image.png', width: 640, height: 480, mimeType: 'image/png', file: 'assets/asset-a.png' }] };
}
describe('versioned project validation', () => {
  it('roundtrips layers, transform parameters, effects and asset references', () => { const value = project(); expect(ProjectDeserializer.parse(ProjectSerializer.stringify(value))).toEqual(value); });
  it('rejects future versions, malformed dimensions and missing assets', () => {
    const future = project(); (future as { version: number }).version = 2; expect(() => ProjectDeserializer.parse(JSON.stringify(future))).toThrow();
    const invalid = project(); invalid.document.width = -3; expect(() => ProjectDeserializer.parse(JSON.stringify(invalid))).toThrow();
    const missing = project(); missing.assets = []; expect(() => ProjectDeserializer.parse(JSON.stringify(missing))).toThrow();
  });
  it('rejects traversal, duplicate IDs and cyclic inputs', () => {
    const path = project(); path.assets[0].file = '../secret.png'; expect(() => ProjectDeserializer.parse(JSON.stringify(path))).toThrow();
    const duplicate = project(); duplicate.document.layers.push(duplicate.document.layers[0]); expect(() => ProjectDeserializer.parse(JSON.stringify(duplicate))).toThrow();
    const cycle = project(); cycle.document.layers[0].effects[0].inputs.secondary = 'layer-a'; expect(() => ProjectDeserializer.parse(JSON.stringify(cycle))).toThrow(/Cyklick/);
  });
  it('preserves unknown effect definitions so they can be bypassed instead of lost', () => {
    const value = project(); value.document.layers[0].effects[0].effectId = 'future-effect';
    expect(ProjectDeserializer.parse(JSON.stringify(value)).document.layers[0].effects[0].effectId).toBe('future-effect');
  });
});
