import { shaderEffect } from '../core/shader';
import type { EffectDefinition, EffectRenderContext, ParameterValue } from '../core/types';
import { compileChannelExpression } from './expressions';
const parameters: EffectDefinition['parameters'] = [
  { id: 'red', label: 'Red expression', type: 'text', default: '(ar + br) / 2' },
  { id: 'green', label: 'Green expression', type: 'text', default: 'abs(ag - bg)' },
  { id: 'blue', label: 'Blue expression', type: 'text', default: 'max(ab, bb)' },
  { id: 'normalization', label: 'Normalization', type: 'select', default: 'clamp', options: ['clamp', 'wrap', 'normalize'].map(value => ({ value, label: value })) },
  { id: 'alphaMode', label: 'Alpha mode', type: 'select', default: 'primary', options: ['primary', 'secondary', 'maximum'].map(value => ({ value, label: value })) },
];
const defaults = Object.fromEntries(parameters.map(parameter => [parameter.id, parameter.default]));
function build(parameters_: Record<string, ParameterValue>, context: EffectRenderContext) {
  const expressions = ['red', 'green', 'blue'].map(channel => compileChannelExpression(String(parameters_[channel])));
  return shaderEffect({ id: 'channel-algebra-program', name: 'Channel algebra program', category: 'Boolean', description: '', parameters,
    helpers: 'float safeDivide(float a, float b) { return abs(b) < 0.000001 ? 0.0 : a / b; }',
    body: `vec4 secondary = texture(uSecondary, uv); vec3 a = color, b = straight(secondary);
      vec3 result = vec3(${expressions.join(', ')});
      result = vec3(isnan(result.r) || isinf(result.r) ? 0.0 : result.r, isnan(result.g) || isinf(result.g) ? 0.0 : result.g, isnan(result.b) || isinf(result.b) ? 0.0 : result.b);
      if (p_normalization > 1.5) { float lo = min(result.r, min(result.g, result.b)), hi = max(result.r, max(result.g, result.b)); if (hi - lo > 0.000001) result = (result - lo) / (hi - lo); }
      else if (p_normalization > 0.5) result = fract(result);
      float alpha = p_alphaMode < 0.5 ? source.a : (p_alphaMode < 1.5 ? secondary.a : max(source.a, secondary.a));
      finalColor = vec4(clamp(result, 0.0, 1.0) * alpha, alpha);`,
  }).createRenderer(context);
}
export const channelAlgebra: EffectDefinition = {
  id: 'channel-algebra', name: 'Channel Algebra', category: 'Boolean', version: '1.0.0',
  description: 'Výrazy pro RGB: ar/ag/ab a br/bg/bb, luminance al/bl; + − × / a abs/min/max/clamp/mix/sin/cos/floor/fract.',
  inputs: [{ id: 'secondary', label: 'Druhá vrstva', required: true }], parameters,
  createRenderer(context) {
    let runtime = build(defaults, context), key = '';
    return {
      get filter() { return runtime.filter!; },
      update(next, nextContext) {
        const nextKey = JSON.stringify([next.red, next.green, next.blue]);
        if (nextKey !== key) { const replacement = build(next, nextContext); runtime.destroy(); runtime = replacement; key = nextKey; }
        runtime.update(next, nextContext);
      },
      destroy() { runtime.destroy(); },
    };
  },
};
