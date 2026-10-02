import type { Filter, Texture } from 'pixi.js';
import type { RenderContext } from '../../render/RenderGraph';
export type ParameterValue = number | string | boolean | null;
export interface EffectParameterDefinition {
  id: string; label: string;
  type: 'float' | 'integer' | 'boolean' | 'select' | 'color' | 'seed' | 'layer';
  default: ParameterValue; min?: number; max?: number; step?: number;
  options?: { value: string; label: string }[];
}
export interface EffectInputDefinition { id: string; label: string; required: boolean }
export interface EffectRenderContext extends RenderContext { secondary?: Texture }
export interface EffectRenderer {
  filter: Filter;
  update(parameters: Record<string, ParameterValue>, context: EffectRenderContext): void;
  destroy(): void;
}
export interface EffectDefinition {
  id: string; name: string; version: string; category: string; description: string;
  inputs: EffectInputDefinition[];
  parameters: EffectParameterDefinition[];
  createRenderer(context: EffectRenderContext): EffectRenderer;
}
