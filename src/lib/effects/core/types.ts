import type { Filter, Texture, RenderTexture, Renderer } from 'pixi.js';
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
export type EffectRenderer = {
  update(parameters: Record<string, ParameterValue>, context: EffectRenderContext): void;
  destroy(): void;
} & ({ filter: Filter; render?: never } | { filter?: never; render(input: Texture, output: RenderTexture, renderer: Renderer): void });
export interface EffectDefinition {
  id: string; name: string; version: string; category: string; description: string;
  inputs: EffectInputDefinition[];
  parameters: EffectParameterDefinition[];
  createRenderer(context: EffectRenderContext): EffectRenderer;
}
