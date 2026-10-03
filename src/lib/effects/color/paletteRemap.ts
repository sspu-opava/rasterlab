import { numberParameter as n, shaderEffect } from '../core/shader';
export function colorUniform(hex: string): Float32Array { return new Float32Array([parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255, 1]); }
export const paletteRemap = shaderEffect({
  id: 'palette-remap', name: 'Palette Remap', category: 'Color', description: 'Tříbarevná mapa jasu s vlastními barvami, gama křivkou a volitelnými pásy.',
  parameters: [{ id: 'shadows', label: 'Shadow color', type: 'color', default: '#14213d' }, { id: 'midtones', label: 'Midtone color', type: 'color', default: '#e85d75' }, { id: 'highlights', label: 'Highlight color', type: 'color', default: '#ffe8a3' }, n('gamma', 'Tone gamma', 1, 0.2, 4), { id: 'mapping', label: 'Palette mapping', type: 'select', default: 'smooth', options: [{ value: 'smooth', label: 'Continuous' }, { value: 'bands', label: 'Quantized bands' }] }, n('levels', 'Palette levels', 5, 2, 32, 1), n('amount', 'Amount', 1, 0, 1)],
  data: { declarations: 'uniform vec4 uShadow; uniform vec4 uMidtone; uniform vec4 uHighlight;', create() {
    const uniforms = { uShadow: { value: colorUniform('#14213d'), type: 'vec4<f32>' as const }, uMidtone: { value: colorUniform('#e85d75'), type: 'vec4<f32>' as const }, uHighlight: { value: colorUniform('#ffe8a3'), type: 'vec4<f32>' as const } };
    return { uniforms, update(parameters) { uniforms.uShadow.value = colorUniform(String(parameters.shadows)); uniforms.uMidtone.value = colorUniform(String(parameters.midtones)); uniforms.uHighlight.value = colorUniform(String(parameters.highlights)); } };
  } },
  body: `float tone = pow(clamp(luminance(color), 0.0, 1.0), p_gamma);
if (p_mapping > 0.5) tone = floor(tone * (p_levels - 1.0) + 0.5) / (p_levels - 1.0);
vec3 mapped = tone < 0.5 ? mix(uShadow.rgb, uMidtone.rgb, tone * 2.0) : mix(uMidtone.rgb, uHighlight.rgb, tone * 2.0 - 1.0);
finalColor = vec4(mix(color, mapped, p_amount) * source.a, source.a);`,
});
