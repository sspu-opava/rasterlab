import { numberParameter as n, shaderEffect } from '../core/shader';
export const quantizedDifference = shaderEffect({
  id: 'quantized-difference', name: 'Quantized Difference', category: 'Boolean', description: 'Prahovaný rozdíl vrstev redukovaný na jasové nebo barevné úrovně.',
  inputs: [{ id: 'secondary', label: 'Druhá vrstva', required: true }],
  parameters: [n('levels', 'Levels', 5, 2, 32, 1), n('threshold', 'Threshold', 0.1, 0, 0.99), { id: 'palette', label: 'Palette', type: 'select', default: 'grayscale', options: [{ value: 'grayscale', label: 'Grayscale' }, { value: 'heat', label: 'Heat' }, { value: 'rgb', label: 'RGB' }] }],
  body: `vec4 secondary = texture(uSecondary, uv); vec3 difference = clamp((abs(color - straight(secondary)) - p_threshold) / (1.0 - p_threshold), 0.0, 1.0);
    float level = floor(luminance(difference) * (p_levels - 1.0) + 0.5) / (p_levels - 1.0);
    vec3 result = p_palette < 0.5 ? vec3(level) : (p_palette < 1.5 ? vec3(level, sin(level * 3.14159265), 1.0 - level) : floor(difference * (p_levels - 1.0) + 0.5) / (p_levels - 1.0));
    float alpha = max(source.a, secondary.a); finalColor = vec4(result * alpha, alpha);`,
});
