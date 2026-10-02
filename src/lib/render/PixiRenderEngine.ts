import { Application, Container, Graphics, Sprite, TilingSprite, Texture } from 'pixi.js';
import 'pixi.js/advanced-blend-modes';
// Static uniform synchronization for Tauri's CSP; this module avoids eval.
import 'pixi.js/unsafe-eval';
import type { AssetManager } from '../assets/AssetManager';
import type { LayerNode, RasterDocument } from '../document/types';
import { RenderGraph } from './RenderGraph';
import { logError } from '../utils/logger';
import type { Viewport } from './viewport';

/** Owns all GPU objects. Svelte only supplies model and viewport updates. */
export class PixiRenderEngine {
  private app = new Application();
  private viewport = new Container();
  private content = new Container();
  private layers = new Container();
  private checker?: TilingSprite;
  private checkerTexture?: Texture;
  private background = new Graphics();
  private clip = new Graphics();
  private border = new Graphics();
  private graph = new RenderGraph();
  private initialized = false;
  private objects = new Map<string, Container>();
  private signatures = new Map<string, string>();

  constructor(private assets: AssetManager, private onError: (message: string) => void) {}

  async init(host: HTMLElement): Promise<void> {
    await this.app.init({ preference: 'webgl', resizeTo: host, backgroundAlpha: 0, antialias: true, resolution: Math.min(devicePixelRatio, 2), autoDensity: true });
    this.initialized = true;
    this.app.canvas.setAttribute('aria-label', 'RasterLab — pracovní plocha dokumentu');
    host.appendChild(this.app.canvas);
    const tile = document.createElement('canvas');
    tile.width = tile.height = 24;
    const context = tile.getContext('2d')!;
    context.fillStyle = '#252a30'; context.fillRect(0, 0, 24, 24);
    context.fillStyle = '#30363d'; context.fillRect(0, 0, 12, 12); context.fillRect(12, 12, 12, 12);
    this.checkerTexture = Texture.from(tile);
    this.checker = new TilingSprite({ texture: this.checkerTexture, width: 1000, height: 1000 });
    this.content.addChild(this.checker, this.background, this.layers, this.clip);
    this.content.mask = this.clip;
    this.viewport.addChild(this.content, this.border);
    this.app.stage.addChild(this.viewport);
    this.app.stop();
  }

  render(document: RasterDocument, view: Viewport): void {
    if (!this.initialized) return;
    this.graph.update(document);
    this.checker!.width = document.width;
    this.checker!.height = document.height;
    this.background.clear();
    const bg = document.background;
    if (bg.a > 0) this.background.rect(0, 0, document.width, document.height).fill({ color: (bg.r << 16) | (bg.g << 8) | bg.b, alpha: bg.a });
    this.clip.clear().rect(0, 0, document.width, document.height).fill(0xffffff);
    const live = new Set<string>();
    const visit = (layer: LayerNode, parent: Container): void => {
      live.add(layer.id);
      let object = this.objects.get(layer.id);
      if (!object) {
        object = layer.type === 'raster' || layer.type === 'mask' ? new Sprite(this.assets.texture(layer.assetId)) : new Container();
        this.objects.set(layer.id, object);
      }
      parent.addChild(object);
      const signature = JSON.stringify([layer.visible, layer.opacity, layer.position, layer.scale, layer.rotation, layer.blendMode]);
      if (this.signatures.get(layer.id) !== signature) {
        object.visible = layer.visible;
        object.alpha = layer.opacity;
        object.position.set(layer.position.x, layer.position.y);
        object.scale.set(layer.scale.x, layer.scale.y);
        object.rotation = layer.rotation * Math.PI / 180;
        object.blendMode = layer.blendMode;
        this.signatures.set(layer.id, signature);
      }
      if (layer.type === 'group') for (const child of [...layer.children].reverse()) visit(child, object);
    };
    try {
      for (const layer of [...document.layers].reverse()) visit(layer, this.layers);
      for (const [id, object] of this.objects) {
        if (live.has(id)) continue;
        object.removeFromParent(); object.destroy({ children: true });
        this.objects.delete(id); this.signatures.delete(id);
      }
      this.viewport.position.set(view.x, view.y);
      this.viewport.scale.set(view.zoom);
      this.border.clear().rect(0, 0, document.width, document.height).stroke({ color: 0x6b737e, width: 1 / view.zoom });
      this.app.render();
      this.graph.markClean();
    } catch (error) {
      logError('RENDER', 'Rendering failed', error);
      this.onError(error instanceof Error ? error.message : 'Vykreslení se nezdařilo.');
    }
  }

  resize(width: number, height: number): void {
    if (this.initialized) this.app.renderer.resize(width, height);
  }
  destroy(): void {
    if (!this.initialized) return;
    this.app.destroy(true, { children: true });
    this.checkerTexture?.destroy(true);
    this.initialized = false;
  }
}
