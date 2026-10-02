import type { EffectDefinition } from './types';
export class EffectRegistry {
  private definitions = new Map<string, EffectDefinition>();
  register(definition: EffectDefinition): void {
    if (this.definitions.has(definition.id)) throw new Error(`Duplicitní efekt: ${definition.id}`);
    this.definitions.set(definition.id, definition);
  }
  unregister(id: string): void { this.definitions.delete(id); }
  get(id: string): EffectDefinition | undefined { return this.definitions.get(id); }
  list(): EffectDefinition[] { return [...this.definitions.values()]; }
  listByCategory(category: string): EffectDefinition[] { return this.list().filter(effect => effect.category === category); }
}
