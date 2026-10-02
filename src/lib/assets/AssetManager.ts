import { Texture } from 'pixi.js';
import { log } from '../utils/logger';

export interface AssetRecord {
  id: string; name: string; width: number; height: number; mimeType: string; url: string;
}
interface RuntimeAsset { record: AssetRecord; file: Blob; image: HTMLImageElement; texture?: Texture }
const acceptedTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

export class AssetManager {
  revision = 0;
  private assets = new Map<string, RuntimeAsset>();

  async import(file: File, id: string = crypto.randomUUID()): Promise<AssetRecord> {
    if (this.assets.has(id)) throw new Error('Duplicitní ID assetu.');
    if (!acceptedTypes.has(file.type)) throw new Error('Podporované formáty: PNG, JPEG a WebP.');
    if (file.size > 100 * 1024 * 1024) throw new Error('Obrázek je příliš velký (maximum 100 MB).');
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
      if (image.naturalWidth > 8192 || image.naturalHeight > 8192) {
        throw new Error('Maximální rozměr obrázku je 8192 px.');
      }
      const record: AssetRecord = {
        id, name: file.name, width: image.naturalWidth,
        height: image.naturalHeight, mimeType: file.type, url,
      };
      this.assets.set(record.id, { record, file, image });
      this.revision++;
      log('ASSET', 'Imported', record.id);
      return record;
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  get(id: string): AssetRecord | undefined { return this.assets.get(id)?.record; }
  getBlob(id: string): Blob | undefined { return this.assets.get(id)?.file; }
  list(): AssetRecord[] { return [...this.assets.values()].map(asset => asset.record); }
  texture(id: string): Texture {
    const asset = this.assets.get(id);
    if (!asset) throw new Error(`Asset ${id} nebyl nalezen.`);
    asset.texture ??= Texture.from(asset.image);
    return asset.texture;
  }
  removeUnused(referencedIds: ReadonlySet<string>): void {
    for (const [id, asset] of this.assets) {
      if (referencedIds.has(id)) continue;
      asset.texture?.destroy(true);
      URL.revokeObjectURL(asset.record.url);
      this.assets.delete(id);
      this.revision++;
    }
  }
  clear(): void { this.removeUnused(new Set()); }
  replaceWith(other: AssetManager): void {
    this.clear(); this.assets = other.assets; other.assets = new Map(); this.revision++;
  }
}
