import { numberParameter as n, shaderEffect } from '../core/shader';
export const displacementMap = shaderEffect({
  id: 'displacement-map', name: 'Displacement Map', category: 'Distortion', description: 'Druhá vrstva řídí vodorovný a svislý posun pixelů; šedá 50 % je neutrální.',
  inputs: [{ id: 'secondary', label: 'Displacement source', required: true }],
  parameters: [n('horizontal', 'Horizontal / px', 24, -128, 128, 1), n('vertical', 'Vertical / px', 12, -128, 128, 1), { id: 'mode', label: 'Map channels', type: 'select', default: 'rg', options: [{ value: 'rg', label: 'Red / Green' }, { value: 'luminance', label: 'Luminance' }] }, { id: 'edge', label: 'Edge handling', type: 'select', default: 'transparent', options: [{ value: 'transparent', label: 'Transparent' }, { value: 'clamp', label: 'Clamp' }, { value: 'wrap', label: 'Wrap' }] }],
  body: `vec4 map = texture(uSecondary, uv); vec3 field = straight(map);
vec2 offset = p_mode < 0.5 ? field.rg : vec2(luminance(field));
offset = (offset * 2.0 - 1.0) * map.a * vec2(p_horizontal, p_vertical);
vec2 point = uv + offset / uSize;
if (p_edge > 1.5) point = fract(point); else if (p_edge > 0.5) point = clamp(point, 0.5 / uSize, 1.0 - 0.5 / uSize);
finalColor = sampleImage(point);`,
});
