import { imageDimensions } from './dimensions';
import { assertFileSize, MAX_PROJECT_BYTES } from '../project/limits';
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
    assertFileSize(file);
    if (this.assets.size >= 100 || [...this.assets.values()].reduce((sum, item) => sum + item.file.size, file.size) > MAX_PROJECT_BYTES) throw new Error('Knihovna překračuje limit 100 obrázků nebo 300 MB. Vyčistěte nepoužívané zdroje.');
    const dimensions = await imageDimensions(file);
    const pixels = dimensions.width * dimensions.height * 4;
    if (Math.min(dimensions.width, dimensions.height) < 1 || Math.max(dimensions.width, dimensions.height) > 8192) throw new Error('Maximální rozměr obrázku je 8192 px.');
    if ([...this.assets.values()].reduce((sum, item) => sum + item.record.width * item.record.height * 4, pixels) > 256 * 1024 * 1024) throw new Error('Dekódované zdroje překračují limit knihovny 256 MiB. Vyčistěte knihovnu.');
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
      if ((image.naturalWidth * image.naturalHeight !== dimensions.width * dimensions.height) || image.naturalWidth > 8192 || image.naturalHeight > 8192) {
        throw new Error('Maximální rozměr obrázku je 8192 px.');
      }
      if (this.assets.has(id) || this.assets.size >= 100 || [...this.assets.values()].reduce((sum, item) => sum + item.file.size, file.size) > MAX_PROJECT_BYTES) throw new Error('Knihovna dosáhla limitu nebo obsahuje duplicitní ID.');
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
