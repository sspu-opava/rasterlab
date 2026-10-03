import type { ProjectFile } from './ProjectSerializer';
import { referencedAssets } from './ProjectSerializer';
import type { LayerNode } from '../document/types';
import { effectRegistry } from '../effects';
import { validateParameters } from '../effects/core/parameters';
import { generatorRegistry } from '../generators';

function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Neplatná struktura projektu.'); return value as Record<string, unknown>; }
function text(value: unknown, max = 256): asserts value is string { if (typeof value !== 'string' || value.length === 0 || value.length > max) throw new Error('Neplatný textový údaj projektu.'); }
function number(value: unknown, min = -1e6, max = 1e6): asserts value is number { if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error('Neplatná číselná hodnota projektu.'); }
function id(value: unknown): asserts value is string { text(value, 80); if (!/^[a-zA-Z0-9-]+$/.test(value)) throw new Error('Neplatné ID projektu.'); }
function point(value: unknown): void { const p = object(value); number(p.x); number(p.y); }
function flag(value: unknown): void { if (typeof value !== 'boolean') throw new Error('Neplatná boolean hodnota.'); }
export class ProjectDeserializer {
  /** Migration entry point: reject unknown versions before touching live state. */
  static parse(json: string): ProjectFile {
    if (json.length > 300 * 1024 * 1024) throw new Error('Projekt přesahuje maximální velikost 300 MB.');
    const raw: unknown = JSON.parse(json);
    const project = object(raw);
    if (project.format !== 'rasterlab' || ![1, 2].includes(Number(project.version)) || typeof project.version !== 'number') throw new Error('Nepodporovaný formát nebo verze projektu.');
    const document = object(project.document); id(document.id); text(document.name); text(document.createdAt); text(document.modifiedAt);
    number(document.width, 1, 8192); number(document.height, 1, 8192);
    if (!Number.isInteger(document.width) || !Number.isInteger(document.height)) throw new Error('Rozměry musí být celá čísla.');
    const bg = object(document.background); for (const key of ['r', 'g', 'b']) number(bg[key], 0, 255); number(bg.a, 0, 1);
    if (!Array.isArray(project.assets) || project.assets.length > 100) throw new Error('Neplatný manifest assetů.');
    const assets = new Set<string>();
    for (const value of project.assets) {
      const asset = object(value); id(asset.id); text(asset.name); number(asset.width, 1, 8192); number(asset.height, 1, 8192);
      if (assets.has(asset.id)) throw new Error('Duplicitní asset.'); assets.add(asset.id);
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(String(asset.mimeType))) throw new Error('Nepodporovaný formát obrázku.');
      const extension = asset.mimeType === 'image/jpeg' ? 'jpg' : asset.mimeType === 'image/webp' ? 'webp' : 'png';
      if (asset.file !== `assets/${asset.id}.${extension}`) throw new Error('Neplatná relativní cesta assetu.');
      if (asset.dataUrl !== undefined && (typeof asset.dataUrl !== 'string' || !asset.dataUrl.startsWith(`data:${asset.mimeType};base64,`))) throw new Error('Neplatná vložená bitmapa.');
    }
    const ids = new Set<string>(); const effectIds = new Set<string>();
    const visit = (values: unknown, depth = 0): void => {
      if (!Array.isArray(values) || values.length > 100 || depth > 12) throw new Error('Neplatný seznam vrstev.');
      for (const value of values) {
        const layer = object(value); id(layer.id); if (ids.has(layer.id) || ids.size >= 100) throw new Error('Duplicitní ID nebo příliš mnoho vrstev.'); ids.add(layer.id);
        text(layer.name); flag(layer.visible); flag(layer.locked); number(layer.opacity, 0, 1); point(layer.position); point(layer.scale); number(layer.rotation);
        if (!['normal', 'multiply', 'screen', 'overlay', 'difference', 'add'].includes(String(layer.blendMode))) throw new Error('Neplatný blend mode.');
        if (layer.type === 'group') visit(layer.children, depth + 1);
        else if (layer.type === 'raster') { id(layer.assetId); if (!assets.has(layer.assetId)) throw new Error('Chybějící asset reference.'); }
        else if (layer.type === 'generated' && project.version === 2) { id(layer.generatorId); const definition = generatorRegistry.get(layer.generatorId); if (!definition) throw new Error('Neznámý generátor.'); layer.parameters = validateParameters(definition, object(layer.parameters)); }
        else throw new Error('Tento typ vrstvy zatím není podporován.');
        if (layer.maskId !== undefined) throw new Error('Masky zatím nejsou podporovány.');
        if (!Array.isArray(layer.effects) || layer.effects.length > 32) throw new Error('Neplatný effect stack.');
        for (const item of layer.effects) {
          const effect = object(item); id(effect.id); id(effect.effectId); flag(effect.enabled);
          if (effectIds.has(effect.id)) throw new Error('Duplicitní ID efektu.'); effectIds.add(effect.id);
          const parameters = object(effect.parameters); const inputs = object(effect.inputs);
          for (const reference of Object.values(inputs)) id(reference);
          for (const parameter of Object.values(parameters)) if (parameter !== null && !['string', 'boolean', 'number'].includes(typeof parameter)) throw new Error('Neplatný parametr efektu.');
          const definition = effectRegistry.get(effect.effectId);
          if (definition) effect.parameters = validateParameters(definition, parameters);
        }
      }
    };
    visit(document.layers);
    const result = raw as ProjectFile;
    result.version = 2;
    const dependencies = new Map<string, string[]>();
    const connections = (layers: LayerNode[]) => { for (const layer of layers) {
      const refs = layer.effects.flatMap(effect => Object.values(effect.inputs));
      if (refs.some(reference => !ids.has(reference))) throw new Error('Chybějící vstupní vrstva.');
      if (layer.type === 'group') { refs.push(...layer.children.map(child => child.id)); connections(layer.children); }
      dependencies.set(layer.id, refs);
    } };
    connections(result.document.layers);
    const active = new Set<string>(); const complete = new Set<string>();
    const check = (key: string) => { if (active.has(key)) throw new Error('Cyklické reference projektu.'); if (complete.has(key)) return; active.add(key); for (const ref of dependencies.get(key) ?? []) check(ref); active.delete(key); complete.add(key); };
    for (const key of dependencies.keys()) check(key);
    if ([...referencedAssets(result.document.layers)].some(asset => !assets.has(asset))) throw new Error('Chybějící obrázek.');
    return result;
  }
}
