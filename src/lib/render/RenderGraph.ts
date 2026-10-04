import type { LayerNode, RasterDocument } from '../document/types';
export type RenderMode = 'preview' | 'final';
export interface RenderContext { width: number; height: number; mode: RenderMode }
export interface RenderResult<T> { output: T; errors: Map<string, string> }
export interface RenderNode { id: string; kind: 'source' | 'effect' | 'group' | 'composite'; dependencies: string[]; signature: string }

/** Backend-independent description; dependency edges also drive downstream invalidation. */
export class RenderGraph {
  nodes = new Map<string, RenderNode>();
  dirty = new Set<string>();
  private dependents = new Map<string, string[]>();

  update(document: RasterDocument): void {
    const next = new Map<string, RenderNode>();
    const visit = (layer: LayerNode): string => {
      const sourceId = `${layer.id}:source`;
      const dependencies = layer.type === 'group' ? layer.children.map(visit) : [];
      if (layer.type === 'generated') { const generatedId = `${layer.id}:generated`; next.set(generatedId, { id: generatedId, kind: 'source', dependencies: [], signature: JSON.stringify([layer.generatorId, layer.parameters]) }); dependencies.push(generatedId); }
      const { effects, mask } = layer;
      const source = [layer.type, 'assetId' in layer ? layer.assetId : null, layer.position, layer.scale, layer.rotation, layer.type === 'group' ? layer.children.map(child => [child.id, child.visible, child.opacity, child.blendMode]) : null];
      next.set(sourceId, { id: sourceId, kind: layer.type === 'group' ? 'group' : 'source', dependencies, signature: JSON.stringify(source) });
      let previous = sourceId;
      for (const effect of effects) {
        if (!effect.enabled) continue;
        next.set(effect.id, { id: effect.id, kind: 'effect', dependencies: [previous, ...Object.values(effect.inputs).map(id => `${id}:output`)], signature: JSON.stringify(effect) });
        previous = effect.id;
      }
      const outputId = `${layer.id}:output`;
      if (mask?.enabled) {
        const field = `${layer.id}:mask-field`, x = `${layer.id}:mask-x`, y = `${layer.id}:mask-y`, applied = `${layer.id}:mask`;
        next.set(field, { id: field, kind: 'effect', dependencies: [`${mask.sourceId}:output`], signature: mask.mode });
        next.set(x, { id: x, kind: 'effect', dependencies: [field], signature: String(mask.feather) });
        next.set(y, { id: y, kind: 'effect', dependencies: [x], signature: String(mask.feather) });
        next.set(applied, { id: applied, kind: 'effect', dependencies: [previous, y], signature: JSON.stringify(mask) });
        previous = applied;
      }
      next.set(outputId, { id: outputId, kind: 'composite', dependencies: [previous], signature: layer.id });
      return outputId;
    };
    const dependencies = document.layers.map(visit);
    next.set('document', { id: 'document', kind: 'composite', dependencies, signature: JSON.stringify([document.width, document.height, document.background, document.layers.map(layer => [layer.id, layer.visible, layer.opacity, layer.blendMode])]) });
    const previous = this.nodes;
    this.nodes = next;
    this.dependents.clear();
    for (const node of next.values()) for (const dependency of node.dependencies) { const ids = this.dependents.get(dependency) ?? []; ids.push(node.id); this.dependents.set(dependency, ids); }
    for (const id of this.dirty) if (!next.has(id)) this.dirty.delete(id);
    for (const [id, node] of next) {
      const old = previous.get(id);
      if (!old || old.signature !== node.signature || JSON.stringify(old.dependencies) !== JSON.stringify(node.dependencies)) this.invalidate(id);
    }
  }

  invalidate(id: string): void {
    const pending = [id];
    const visited = new Set<string>();
    while (pending.length) {
      const current = pending.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      this.dirty.add(current);
      pending.push(...(this.dependents.get(current) ?? []));
    }
  }
  markClean(): void { this.dirty.clear(); }
}
