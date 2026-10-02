import { RenderTexture } from 'pixi.js';
export class RenderTargetPool {
  private available: RenderTexture[] = [];
  private leased = new Set<RenderTexture>();
  acquire(width: number, height: number): RenderTexture {
    const index = this.available.findIndex(texture => texture.width === width && texture.height === height);
    const texture = index < 0 ? RenderTexture.create({ width, height, resolution: 1 }) : this.available.splice(index, 1)[0];
    this.leased.add(texture);
    return texture;
  }
  release(texture: RenderTexture): void {
    if (!this.leased.delete(texture)) return;
    if (this.available.length < 8) this.available.push(texture); else texture.destroy(true);
  }
  clear(): void {
    for (const texture of [...this.available, ...this.leased]) texture.destroy(true);
    this.available = []; this.leased.clear();
  }
}
