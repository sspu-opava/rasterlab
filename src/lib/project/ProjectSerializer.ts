import { assertProjectSize, MAX_PROJECT_BYTES } from './limits';
import type { AssetManager } from '../assets/AssetManager';
import type { LayerNode, RasterDocument } from '../document/types';
export interface ProjectAsset { id: string; name: string; width: number; height: number; mimeType: string; file: string; dataUrl?: string }
export interface ProjectFile { format: 'rasterlab'; version: 3; document: RasterDocument; assets: ProjectAsset[] }
export function referencedAssets(layers: LayerNode[], ids = new Set<string>()): Set<string> {
  for (const layer of layers) {
    if (layer.type === 'raster' || layer.type === 'mask') ids.add(layer.assetId);
    if (layer.type === 'group') referencedAssets(layer.children, ids);
  }
  return ids;
}
export class ProjectSerializer {
  static create(document: RasterDocument, assets: AssetManager): ProjectFile {
    const manifest = [...referencedAssets(document.layers)].map(id => {
      const asset = assets.get(id); if (!asset) throw new Error(`Chybí obrázek ${id}.`);
      const extension = asset.mimeType === 'image/jpeg' ? 'jpg' : asset.mimeType === 'image/webp' ? 'webp' : 'png';
      return { id, name: asset.name, width: asset.width, height: asset.height, mimeType: asset.mimeType, file: `assets/${id}.${extension}` };
    });
    return { format: 'rasterlab', version: 3, document, assets: manifest };
  }
  static stringify(project: ProjectFile): string { const json = JSON.stringify(project, null, 2); assertProjectSize(json); return json; }
  static async portable(project: ProjectFile, assets: AssetManager): Promise<ProjectFile> {
    const estimated = project.assets.reduce((sum, asset) => sum + Math.ceil((assets.getBlob(asset.id)?.size ?? 0) / 3) * 4 + 128, new TextEncoder().encode(JSON.stringify(project)).byteLength);
    if (estimated > MAX_PROJECT_BYTES) throw new Error('Přenosný projekt překračuje limit 300 MB.');
    const manifest: ProjectAsset[] = [];
    for (const asset of project.assets) {
      const blob = assets.getBlob(asset.id); if (!blob) throw new Error('Chybí zdrojový obrázek.');
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Obrázek nelze přečíst.')); reader.readAsDataURL(blob);
      });
      manifest.push({ ...asset, dataUrl });
    }
    return { ...project, assets: manifest };
  }
}
