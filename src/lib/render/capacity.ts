import type { RasterDocument } from '../document/types';
import { layerEntries } from '../document/layers';
export const GPU_BUDGET = 512 * 1024 * 1024;
/** Conservative RGBA targets, filter scratch buffers and bitmap uploads. */
export function estimateRenderBytes(document: RasterDocument): number {
  let targets = 3;
  for (const { layer } of layerEntries(document.layers)) {
    targets += 1 + (layer.type === 'generated' ? 1 : 0) + layer.effects.filter(effect => effect.enabled).length * 3 + (layer.mask?.enabled ? 6 : 0);
  }
  return document.width * document.height * 4 * targets;
}
export function assertRenderCapacity(document: RasterDocument, maxTextureSize: number, assetBytes = 0): void {
  if (Math.max(document.width, document.height) > maxTextureSize) throw new Error(`GPU podporuje rozměry nejvýše ${maxTextureSize} px.`);
  const bytes = estimateRenderBytes(document) + assetBytes;
  if (bytes > GPU_BUDGET) throw new Error(`Dokument vyžaduje odhadem ${Math.ceil(bytes / 1048576)} MiB GPU paměti; podporovaný rozpočet je 512 MiB. Zmenšete dokument nebo stack. Projekt lze nadále uložit.`);
}
