import { Application, Container, Graphics, Sprite, TilingSprite, Texture } from 'pixi.js';
import 'pixi.js/advanced-blend-modes';
import 'pixi.js/unsafe-eval';
import type { AssetManager } from '../assets/AssetManager';
import type { RasterDocument } from '../document/types';
import { GraphRenderer } from './GraphRenderer';
import { logError } from '../utils/logger';
import type { Viewport } from './viewport';
import type { ExportFormat } from '../project/export';

export class DocumentRenderEngine {
  private app = new Application();
  private viewport = new Container();
  private image = new Sprite();
  private checker?: TilingSprite;
  private checkerTexture?: Texture;
  private border = new Graphics();
  private graph?: GraphRenderer;
  private initialized = false;
  constructor(private assets: AssetManager, private onError: (message: string) => void, private onEffectErrors: (errors: Map<string, string>) => void = () => {}) {}
  async init(host: HTMLElement): Promise<void> {
    await this.app.init({ preference: 'webgl', resizeTo: host, backgroundAlpha: 0, antialias: true, resolution: Math.min(devicePixelRatio, 2), autoDensity: true });
    this.initialized = true; this.graph = new GraphRenderer(this.app.renderer, this.assets);
    this.app.canvas.setAttribute('aria-label', 'RasterLab — pracovní plocha dokumentu'); host.appendChild(this.app.canvas);
    const tile = document.createElement('canvas'); tile.width = tile.height = 24;
    const context = tile.getContext('2d')!;
    context.fillStyle = '#252a30'; context.fillRect(0, 0, 24, 24);
    context.fillStyle = '#30363d'; context.fillRect(0, 0, 12, 12); context.fillRect(12, 12, 12, 12);
    this.checkerTexture = Texture.from(tile); this.checker = new TilingSprite({ texture: this.checkerTexture, width: 1000, height: 1000 });
    this.viewport.addChild(this.checker, this.image, this.border); this.app.stage.addChild(this.viewport); this.app.stop();
  }
  render(document: RasterDocument, view: Viewport): void {
    if (!this.initialized) return;
    try {
      this.image.texture = this.graph!.render(document); this.onEffectErrors(new Map(this.graph!.errors));
      this.checker!.width = document.width; this.checker!.height = document.height;
      this.viewport.position.set(view.x, view.y); this.viewport.scale.set(view.zoom);
      this.border.clear().rect(0, 0, document.width, document.height).stroke({ color: 0x6b737e, width: 1 / view.zoom }); this.app.render();
    } catch (error) { logError('RENDER', 'Rendering failed', error); this.onError(error instanceof Error ? error.message : 'Vykreslení se nezdařilo.'); }
  }
  async export(document: RasterDocument, format: ExportFormat, quality: number): Promise<Blob> {
    if (!this.initialized) throw new Error('Renderer není připraven.');
    const final = new GraphRenderer(this.app.renderer, this.assets);
    try {
      const texture = final.render(document, 'final');
      if (final.errors.size) throw new Error(`Export přerušen: ${[...final.errors.values()][0]}`);
      const extracted = this.app.renderer.extract.canvas({ target: texture });
      const canvas = globalThis.document.createElement('canvas'); canvas.width = document.width; canvas.height = document.height;
      const context = canvas.getContext('2d')!;
      if (format === 'jpeg') { context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); }
      context.drawImage(extracted as HTMLCanvasElement, 0, 0);
      return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob && blob.type === `image/${format}` ? resolve(blob) : reject(new Error('Export do zvoleného formátu není podporován.')), `image/${format}`, quality));
    } finally { final.clear(); }
  }
  resize(width: number, height: number): void { if (this.initialized) this.app.renderer.resize(width, height); }
  destroy(): void { if (!this.initialized) return; this.graph?.clear(); this.app.destroy(true, { children: true }); this.checkerTexture?.destroy(true); this.initialized = false; }
}
