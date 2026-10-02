import type { EffectDefinition, EffectParameterDefinition, ParameterValue } from './types';
export function validateParameter(parameter: EffectParameterDefinition, value: unknown): ParameterValue {
  if (parameter.type === 'boolean') return typeof value === 'boolean' ? value : parameter.default;
  if (parameter.type === 'select') return parameter.options?.some(option => option.value === value) ? value as string : parameter.default;
  if (parameter.type === 'layer') return typeof value === 'string' ? value : null;
  if (parameter.type === 'color') return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : parameter.default;
  if (typeof value !== 'number' || !Number.isFinite(value)) return parameter.default;
  const bounded = Math.max(parameter.min ?? -Infinity, Math.min(parameter.max ?? Infinity, value));
  return ['integer', 'seed'].includes(parameter.type) ? Math.round(bounded) : bounded;
}
export function validateParameters(definition: EffectDefinition, values: Record<string, unknown>): Record<string, ParameterValue> {
  return Object.fromEntries(definition.parameters.map(parameter => [parameter.id, validateParameter(parameter, values[parameter.id])]));
}
