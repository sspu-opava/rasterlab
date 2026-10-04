import { assertRenderCapacity } from './capacity';
import { Container, Graphics, Rectangle, RenderTexture, Sprite, Texture } from 'pixi.js';
import type { Renderer } from 'pixi.js';
import type { AssetManager } from '../assets/AssetManager';
import type { LayerNode, RasterDocument } from '../document/types';
import type { EffectRenderer } from '../effects/core/types';
import { effectRegistry } from '../effects';
import { validateParameters } from '../effects/core/parameters';
import { RenderGraph } from './RenderGraph';
import { RenderTargetPool } from './RenderTargetPool';
import type { RenderMode } from './RenderGraph';
import { logError } from '../utils/logger';
import { generatorRegistry } from '../generators';
import { maskField, maskBlur, maskApply } from './mask';

/** Evaluates document-space nodes independently of the editor viewport. */
export class GraphRenderer {
  private graph = new RenderGraph();
  private pool = new RenderTargetPool();
  private targets = new Map<string, RenderTexture>();
  private effects = new Map<string, { effectId: string; renderer: EffectRenderer }>();
  private generators = new Map<string, { generatorId: string; renderer: EffectRenderer }>();
  private masks = new Map<string, { field: EffectRenderer; blur: EffectRenderer; apply: EffectRenderer }>();
  private contextKey = '';
  readonly errors = new Map<string, string>();
  readonly passSubmitMs = new Map<string, number>();
  get diagnostics(): { cachedTargets: number; poolBytes: number; passSubmitMs: [string, number][] } {
    return { cachedTargets: this.targets.size, poolBytes: this.pool.bytes, passSubmitMs: [...this.passSubmitMs] };
  }
  constructor(private renderer: Renderer, private assets: AssetManager) {}

  render(document: RasterDocument, mode: RenderMode = 'preview'): Texture {
    const gl = 'gl' in this.renderer ? this.renderer.gl as WebGLRenderingContext : null;
    const max = gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) as number : 4096;
    const records = this.assets.list();
    if (records.some(asset => Math.max(asset.width, asset.height) > max)) throw new Error(`Zdrojový obrázek překračuje GPU limit ${max} px.`);
    assertRenderCapacity(document, max, records.reduce((sum, asset) => sum + asset.width * asset.height * 4, 0));
    const key = `${document.id}:${document.width}:${document.height}:${mode}:${this.assets.revision}`;
    if (key !== this.contextKey) { this.clear(); this.contextKey = key; }
    this.graph.update(document);
    const layerMap = new Map<string, LayerNode>();
    const collect = (layers: LayerNode[]) => { for (const layer of layers) { layerMap.set(layer.id, layer); if (layer.type === 'group') collect(layer.children); } };
    collect(document.layers);
    // Disabled passes must release their cached outputs and multipass scratch textures.
    // Otherwise toggling many stacks could exceed the estimate for the active graph.
    const releaseTarget = (id: string) => { const texture = this.targets.get(id); if (texture) { this.pool.release(texture); this.targets.delete(id); } };
    for (const layer of layerMap.values()) {
      for (const effect of layer.effects) if (!effect.enabled) { this.effects.get(effect.id)?.renderer.destroy(); this.effects.delete(effect.id); releaseTarget(effect.id); this.errors.delete(effect.id); }
      if (!layer.mask?.enabled) {
        const runtime = this.masks.get(layer.id);
        if (runtime) { runtime.field.destroy(); runtime.blur.destroy(); runtime.apply.destroy(); this.masks.delete(layer.id); }
        for (const suffix of ['mask-field', 'mask-x', 'mask-y', 'mask']) releaseTarget(`${layer.id}:${suffix}`);
        this.errors.delete(`${layer.id}:mask`);
      }
    }
    const visiting = new Set<string>();
    const outputs = new Map<string, Texture>();
    const context = { width: document.width, height: document.height, mode };
    const target = (id: string) => {
      let value = this.targets.get(id);
      if (!value) { value = this.pool.acquire(document.width, document.height); this.targets.set(id, value); }
      return value;
    };
    const draw = (id: string, container: Container) => {
      const result = target(id), started = performance.now(); this.renderer.render({ container, target: result, clear: true }); this.passSubmitMs.set(id, performance.now() - started); this.graph.dirty.delete(id); return result;
    };
    const composite = (layers: LayerNode[]): Container => {
      const container = new Container();
      for (const layer of [...layers].reverse()) {
        if (!layer.visible) continue;
        const sprite = new Sprite(evaluateLayer(layer.id));
        sprite.alpha = layer.opacity; sprite.blendMode = layer.blendMode; container.addChild(sprite);
      }
      return container;
    };
    const evaluateLayer = (id: string): Texture => {
      if (outputs.has(id)) return outputs.get(id)!;
      if (visiting.has(id)) throw new Error('Cyklická reference mezi vrstvami.');
      const layer = layerMap.get(id);
      if (!layer) throw new Error('Vstupní vrstva nebyla nalezena.');
      visiting.add(id);
      try {
        const sourceId = `${id}:source`;
        let input: Texture;
        if (!this.graph.dirty.has(sourceId) && this.targets.has(sourceId)) input = this.targets.get(sourceId)!;
        else {
          const source = layer.type === 'group' ? composite(layer.children) : new Container();
          if (layer.type === 'raster' || layer.type === 'mask') source.addChild(new Sprite(this.assets.texture(layer.assetId)));
          if (layer.type === 'generated') {
            const generatedId = `${id}:generated`;
            try {
              if (this.graph.dirty.has(generatedId) || !this.targets.has(generatedId) || this.errors.has(id)) {
                const definition = generatorRegistry.get(layer.generatorId); if (!definition) throw new Error(`Neznámý generátor: ${layer.generatorId}`);
                let runtime = this.generators.get(id);
                if (runtime?.generatorId !== layer.generatorId) { runtime?.renderer.destroy(); runtime = undefined; }
                if (!runtime) { runtime = { generatorId: layer.generatorId, renderer: definition.createRenderer(context) }; this.generators.set(id, runtime); }
                runtime.renderer.update(validateParameters(definition, layer.parameters), context);
                const sprite = new Sprite(Texture.WHITE); sprite.width = document.width; sprite.height = document.height; sprite.filterArea = new Rectangle(0, 0, document.width, document.height);
                if (!runtime.renderer.filter) throw new Error('Generátor musí poskytovat filtr.');
                sprite.filters = [runtime.renderer.filter];
                try { draw(generatedId, sprite); } finally { sprite.filters = []; sprite.destroy(); }
              }
              source.addChild(new Sprite(this.targets.get(generatedId)!)); this.errors.delete(id);
            } catch (error) { const message = error instanceof Error ? error.message : 'Generátor selhal.'; if (this.errors.get(id) !== message) logError('EFFECT', message, error); this.errors.set(id, message); }
          }
          source.position.set(layer.position.x, layer.position.y); source.scale.set(layer.scale.x, layer.scale.y); source.rotation = layer.rotation * Math.PI / 180;
          try { input = draw(sourceId, source); } finally { source.destroy({ children: true }); }
        }
        for (const instance of layer.effects) {
          if (!instance.enabled) { this.errors.delete(instance.id); continue; }
          const definition = effectRegistry.get(instance.effectId);
          try {
            if (!definition) throw new Error(`Neznámý efekt: ${instance.effectId}`);
            const secondId = instance.inputs.secondary;
            if (definition.inputs.some(input => input.required) && !secondId) throw new Error('Vyberte druhou vstupní vrstvu.');
            const secondary = secondId ? evaluateLayer(secondId) : undefined;
            if (!this.graph.dirty.has(instance.id) && this.targets.has(instance.id) && !this.errors.has(instance.id)) { input = this.targets.get(instance.id)!; continue; }
            let runtime = this.effects.get(instance.id);
            if (runtime?.effectId !== instance.effectId) { runtime?.renderer.destroy(); runtime = undefined; }
            if (!runtime) { runtime = { effectId: instance.effectId, renderer: definition.createRenderer({ ...context, secondary }) }; this.effects.set(instance.id, runtime); }
            runtime.renderer.update(validateParameters(definition, instance.parameters), { ...context, secondary });
            if (runtime.renderer.render) {
              const output = target(instance.id);
              const started = performance.now(); runtime.renderer.render(input, output, this.renderer); this.passSubmitMs.set(instance.id, performance.now() - started); this.graph.dirty.delete(instance.id); input = output;
            } else {
              const sprite = new Sprite(input); sprite.filterArea = new Rectangle(0, 0, document.width, document.height); sprite.filters = [runtime.renderer.filter];
              try { input = draw(instance.id, sprite); } finally { sprite.filters = []; sprite.destroy(); }
            }
            this.errors.delete(instance.id);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Efekt selhal.';
            if (this.errors.get(instance.id) !== message) logError('EFFECT', message, error);
            this.errors.set(instance.id, message);
          }
        }
        if (layer.mask?.enabled) {
          const maskId = `${id}:mask`, mask = layer.mask;
          try {
            const secondary = evaluateLayer(mask.sourceId);
            if (!this.graph.dirty.has(maskId) && this.targets.has(maskId) && !this.errors.has(maskId)) input = this.targets.get(maskId)!;
            else {
              let runtime = this.masks.get(id);
              if (!runtime) { runtime = { field: maskField.createRenderer(context), blur: maskBlur.createRenderer(context), apply: maskApply.createRenderer(context) }; this.masks.set(id, runtime); }
              const pass = (nodeId: string, texture: Texture, effect: EffectRenderer) => {
                const sprite = new Sprite(texture); sprite.filterArea = new Rectangle(0, 0, document.width, document.height); sprite.filters = [effect.filter!];
                try { return draw(nodeId, sprite); } finally { sprite.filters = []; sprite.destroy(); }
              };
              runtime.field.update({ mode: mask.mode === 'alpha' ? 0 : 1 }, context);
              let field = pass(`${id}:mask-field`, secondary, runtime.field);
              if (mask.feather > 0) {
                runtime.blur.update({ radius: mask.feather, vertical: 0 }, context); field = pass(`${id}:mask-x`, field, runtime.blur);
                runtime.blur.update({ radius: mask.feather, vertical: 1 }, context); field = pass(`${id}:mask-y`, field, runtime.blur);
              }
              runtime.apply.update({ invert: mask.invert ? 1 : 0, strength: mask.strength }, { ...context, secondary: field });
              input = pass(maskId, input, runtime.apply);
            }
            this.errors.delete(maskId);
          } catch (error) { const message = error instanceof Error ? error.message : 'Maska selhala.'; if (this.errors.get(maskId) !== message) logError('EFFECT', message, error); this.errors.set(maskId, message); }
        } else this.errors.delete(`${id}:mask`);
        this.graph.dirty.delete(`${id}:output`); outputs.set(id, input); return input;
      } finally { visiting.delete(id); }
    };
    let result: Texture;
    if (!this.graph.dirty.has('document') && this.targets.has('document')) result = this.targets.get('document')!;
    else {
      const output = new Container(); const background = document.background;
      if (background.a > 0) output.addChild(new Graphics().rect(0, 0, document.width, document.height).fill({ color: background.r * 65536 + background.g * 256 + background.b, alpha: background.a }));
      output.addChild(composite(document.layers));
      try { result = draw('document', output); } finally { output.destroy({ children: true }); }
    }
    for (const [id, texture] of this.targets) if (!this.graph.nodes.has(id)) { this.pool.release(texture); this.targets.delete(id); }
    for (const [id, runtime] of this.effects) if (!this.graph.nodes.has(id)) { runtime.renderer.destroy(); this.effects.delete(id); this.errors.delete(id); }
    for (const [id, runtime] of this.generators) if (!this.graph.nodes.has(`${id}:generated`)) { runtime.renderer.destroy(); this.generators.delete(id); this.errors.delete(id); }
    for (const [id, runtime] of this.masks) if (!this.graph.nodes.has(`${id}:mask`)) { runtime.field.destroy(); runtime.blur.destroy(); runtime.apply.destroy(); this.masks.delete(id); this.errors.delete(`${id}:mask`); }
    const validErrors = new Set([...layerMap.keys(), ...this.graph.nodes.keys()]);
    for (const id of this.errors.keys()) if (!validErrors.has(id)) this.errors.delete(id);
    for (const id of this.passSubmitMs.keys()) if (!this.graph.nodes.has(id)) this.passSubmitMs.delete(id);
    // Hidden/unreferenced nodes were not evaluated and must retain invalidation.
    this.graph.dirty.delete('document'); return result;
  }
  clear(): void {
    for (const runtime of this.effects.values()) runtime.renderer.destroy();
    for (const runtime of this.masks.values()) { runtime.field.destroy(); runtime.blur.destroy(); runtime.apply.destroy(); } this.masks.clear();
    for (const runtime of this.generators.values()) runtime.renderer.destroy(); this.generators.clear();
    this.effects.clear(); this.targets.clear(); this.pool.clear(); this.errors.clear(); this.passSubmitMs.clear(); this.graph = new RenderGraph();
  }
}
