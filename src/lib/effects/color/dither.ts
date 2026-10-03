import { numberParameter as n, seedParameter, shaderEffect } from '../core/shader';
export const dither = shaderEffect({
  id: 'dither', name: 'Dither', category: 'Color', description: 'Omezená paleta s pravidelným Bayerovým rastrem nebo seedovaným šumem.',
  parameters: [n('levels', 'Levels', 2, 2, 16, 1), n('cellSize', 'Dither cell / px', 1, 1, 16, 1), { id: 'pattern', label: 'Dither pattern', type: 'select', default: 'ordered', options: [{ value: 'ordered', label: 'Bayer 4 × 4' }, { value: 'noise', label: 'Seeded noise' }] }, { id: 'channels', label: 'Dither channels', type: 'select', default: 'luminance', options: [{ value: 'luminance', label: 'Luminance' }, { value: 'rgb', label: 'RGB' }] }, seedParameter, n('amount', 'Amount', 1, 0, 1)],
  helpers: `float bayer4(ivec2 point) { const int values[16] = int[16](0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5); ivec2 p = point & ivec2(3); return (float(values[p.y * 4 + p.x]) + 0.5) / 16.0; }`,
  body: `ivec2 cell = ivec2(floor(uv * uSize / p_cellSize));
float threshold = p_pattern < 0.5 ? bayer4(cell) : hash(vec3(vec2(cell), p_seed));
vec3 inputColor = p_channels < 0.5 ? vec3(luminance(color)) : color;
float levels = p_levels - 1.0; vec3 value = floor(inputColor * levels + threshold) / levels;
finalColor = vec4(mix(color, clamp(value, 0.0, 1.0), p_amount) * source.a, source.a);`,
});
