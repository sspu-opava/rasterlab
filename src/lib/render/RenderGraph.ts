import type { LayerNode, RasterDocument } from '../document/types';
export type RenderMode = 'preview' | 'final';
export interface RenderContext { width: number; height: number; mode: RenderMode }
export interface RenderResult<T> { output: T; errors: Map<string, string> }
export interface RenderNode { id: string; kind: 'source' | 'effect' | 'group' | 'composite'; dependencies: string[]; signature: string }

/** Backend-independent description; dependency edges also drive downstream invalidation. */
export class RenderGraph {
  nodes = new Map<string, RenderNode>();
  dirty = new Set<string>();

  update(document: RasterDocument): void {
    const next = new Map<string, RenderNode>();
    const visit = (layer: LayerNode): string => {
      const sourceId = `${layer.id}:source`;
      const dependencies = layer.type === 'group' ? layer.children.map(visit) : [];
      if (layer.type === 'generated') { const generatedId = `${layer.id}:generated`; next.set(generatedId, { id: generatedId, kind: 'source', dependencies: [], signature: JSON.stringify([layer.generatorId, layer.parameters]) }); dependencies.push(generatedId); }
      const { effects, mask, ...source } = layer;
      next.set(sourceId, { id: sourceId, kind: layer.type === 'group' ? 'group' : 'source', dependencies, signature: JSON.stringify(source) });
      let previous = sourceId;
      for (const effect of effects) {
        next.set(effect.id, { id: effect.id, kind: 'effect', dependencies: [previous, ...Object.values(effect.inputs).map(id => `${id}:output`)], signature: JSON.stringify(effect) });
        previous = effect.id;
      }
      const outputId = `${layer.id}:output`;
      if (mask) {
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
    next.set('document', { id: 'document', kind: 'composite', dependencies, signature: JSON.stringify([document.width, document.height, document.background, dependencies]) });
    const previous = this.nodes;
    this.nodes = next;
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
      for (const node of this.nodes.values()) if (node.dependencies.includes(current)) pending.push(node.id);
    }
  }
  markClean(): void { this.dirty.clear(); }
}
