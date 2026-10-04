import { GPU_BUDGET } from './capacity';
import { RenderTexture } from 'pixi.js';
export class RenderTargetPool {
  private available: RenderTexture[] = [];
  private leased = new Set<RenderTexture>();
  get bytes(): number { return [...this.available, ...this.leased].reduce((sum, texture) => sum + texture.width * texture.height * 4, 0); }
  acquire(width: number, height: number): RenderTexture {
    const index = this.available.findIndex(texture => texture.width === width && texture.height === height);
    if (index < 0) {
      while (this.available.length) this.available.pop()!.destroy(true);
      const live = [...this.leased].reduce((sum, texture) => sum + texture.width * texture.height * 4, 0);
      if (live + width * height * 4 > GPU_BUDGET) throw new Error('Vyčerpán rozpočet renderovacích textur (512 MiB).');
    }
    const texture = index < 0 ? RenderTexture.create({ width, height, resolution: 1 }) : this.available.splice(index, 1)[0];
    this.leased.add(texture);
    return texture;
  }
  release(texture: RenderTexture): void {
    if (!this.leased.delete(texture)) return;
    if (this.available.reduce((sum, item) => sum + item.width * item.height * 4, texture.width * texture.height * 4) <= 32 * 1024 * 1024) this.available.push(texture); else texture.destroy(true);
  }
  clear(): void {
    for (const texture of [...this.available, ...this.leased]) texture.destroy(true);
    this.available = []; this.leased.clear();
  }
}
