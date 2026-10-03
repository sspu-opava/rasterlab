import type { EffectInstance, LayerNode } from '../document/types';
import { effectRegistry } from '../effects';
import { validateParameters } from '../effects/core/parameters';

export interface PresetEffect { effectId: string; version: string; enabled: boolean; parameters: EffectInstance['parameters']; inputs: Record<string, string> }
export interface EffectPreset { format: 'rasterlab-preset'; version: 1; id: string; name: string; effects: PresetEffect[]; roles: { id: string; label: string }[] }
export function flattenLayers(layers: LayerNode[]): LayerNode[] { return layers.flatMap(layer => [layer, ...(layer.type === 'group' ? flattenLayers(layer.children) : [])]); }

/** References become named roles, never persisted document UUIDs. */
export function createPreset(name: string, effects: EffectInstance[], layers: LayerNode[]): EffectPreset {
  const references = new Map<string, string>(), roles: EffectPreset['roles'] = [];
  const items = effects.map(effect => {
    const inputs = Object.fromEntries(Object.entries(effect.inputs).map(([input, reference]) => {
      if (!references.has(reference)) { const id = `source-${references.size + 1}`; references.set(reference, id); roles.push({ id, label: flattenLayers(layers).find(layer => layer.id === reference)?.name ?? `Zdroj ${references.size}` }); }
      return [input, references.get(reference)!];
    }));
    const parameters = { ...effect.parameters };
    // Layer-valued parameters require explicit reassignment rather than leaking UUIDs.
    for (const parameter of effectRegistry.get(effect.effectId)?.parameters ?? []) if (parameter.type === 'layer') parameters[parameter.id] = null;
    return { effectId: effect.effectId, version: effectRegistry.get(effect.effectId)?.version ?? 'unknown', enabled: effect.enabled, parameters, inputs };
  });
  return parsePreset(JSON.stringify({ format: 'rasterlab-preset', version: 1, id: crypto.randomUUID(), name: name.trim(), effects: items, roles }));
}

function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Neplatná struktura presetu.'); return value as Record<string, unknown>; }
function text(value: unknown, max = 256): string { if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('Neplatný text presetu.'); return value; }
function identifier(value: unknown): string { const result = text(value, 80); if (!/^[a-zA-Z0-9-]+$/.test(result)) throw new Error('Neplatné ID presetu.'); return result; }
export function parsePreset(json: string): EffectPreset {
  if (json.length > 1024 * 1024) throw new Error('Preset přesahuje 1 MB.');
  const raw = object(JSON.parse(json));
  if (raw.format !== 'rasterlab-preset' || raw.version !== 1) throw new Error('Nepodporovaný formát nebo verze presetu.');
  if (!Array.isArray(raw.effects) || !raw.effects.length || raw.effects.length > 32 || !Array.isArray(raw.roles) || raw.roles.length > 32) throw new Error('Preset musí obsahovat 1–32 efektů a nejvýše 32 zdrojů.');
  const roles = raw.roles.map(value => { const role = object(value); return { id: identifier(role.id), label: text(role.label) }; });
  const roleIds = new Set(roles.map(role => role.id)); if (roleIds.size !== roles.length) throw new Error('Duplicitní zdroj presetu.');
  const effects = raw.effects.map(value => {
    const effect = object(value), parameters = object(effect.parameters), inputs = object(effect.inputs);
    if (typeof effect.enabled !== 'boolean') throw new Error('Neplatný stav efektu.');
    if (Object.keys(parameters).length > 128 || Object.keys(inputs).length > 32) throw new Error('Příliš mnoho parametrů nebo vstupů.');
    const cleanParameters: EffectInstance['parameters'] = Object.fromEntries(Object.entries(parameters).map(([key, parameter]) => {
      identifier(key);
      if (parameter !== null && typeof parameter !== 'boolean' && !(typeof parameter === 'string' && parameter.length <= 256) && !(typeof parameter === 'number' && Number.isFinite(parameter))) throw new Error('Neplatný parametr presetu.');
      return [key, parameter];
    }));
    const cleanInputs = Object.fromEntries(Object.entries(inputs).map(([key, role]) => { identifier(key); const id = identifier(role); if (!roleIds.has(id)) throw new Error('Chybí zdroj presetu.'); return [key, id]; }));
    const effectId = identifier(effect.effectId), definition = effectRegistry.get(effectId);
    return { effectId, version: text(effect.version, 80), enabled: effect.enabled, parameters: definition ? validateParameters(definition, cleanParameters) : cleanParameters, inputs: cleanInputs };
  });
  return { format: 'rasterlab-preset', version: 1, id: identifier(raw.id), name: text(raw.name, 80), effects, roles };
}

/** Validate the complete candidate graph before changing live history. */
export function instantiatePreset(preset: EffectPreset, layers: LayerNode[], targetId: string, bindings: Record<string, string>, replace: boolean): EffectInstance[] {
  const all = flattenLayers(layers), target = all.find(layer => layer.id === targetId);
  if (!target || target.locked) throw new Error('Cílová vrstva je zamčená nebo neexistuje.');
  for (const role of preset.roles) if (!all.some(layer => layer.id === bindings[role.id]) || bindings[role.id] === targetId) throw new Error(`Vyberte vstupní vrstvu pro „${role.label}“.`);
  const instances = preset.effects.map(effect => ({ id: crypto.randomUUID(), effectId: effect.effectId, enabled: effect.enabled, parameters: { ...effect.parameters }, inputs: Object.fromEntries(Object.entries(effect.inputs).map(([input, role]) => [input, bindings[role]])) }));
  const result = replace ? instances : [...target.effects, ...instances]; if (result.length > 32) throw new Error('Vrstva může obsahovat nejvýše 32 efektů.');
  const edges = new Map(all.map(layer => [layer.id, [...(layer.id === targetId ? result : layer.effects).flatMap(effect => Object.values(effect.inputs)), ...(layer.mask ? [layer.mask.sourceId] : []), ...(layer.type === 'group' ? layer.children.map(child => child.id) : [])]]));
  const active = new Set<string>(), done = new Set<string>();
  const visit = (id: string): void => { if (active.has(id)) throw new Error('Toto přiřazení vstupů by vytvořilo cyklus.'); if (done.has(id)) return; if (!edges.has(id)) throw new Error('Chybí vstupní vrstva.'); active.add(id); for (const ref of edges.get(id)!) visit(ref); active.delete(id); done.add(id); };
  for (const id of edges.keys()) visit(id);
  return result;
}

export function presetWarnings(preset: EffectPreset): string[] {
  return preset.effects.flatMap(effect => { const definition = effectRegistry.get(effect.effectId); return !definition ? [`Chybí efekt ${effect.effectId}; instance bude zachována s diagnostikou.`] : definition.version !== effect.version ? [`${definition.name}: preset používá verzi ${effect.version}, aplikace ${definition.version}.`] : []; });
}
