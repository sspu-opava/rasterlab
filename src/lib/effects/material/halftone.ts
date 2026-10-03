import { numberParameter as n, shaderEffect } from '../core/shader';
export const halftone = shaderEffect({
  id: 'halftone', name: 'Halftone', category: 'Material', description: 'Natočený tiskový rastr: jas středu buňky určuje velikost inkoustového bodu.',
  parameters: [n('cellSize', 'Dot spacing / px', 8, 2, 64, 1), n('angle', 'Screen angle', 30, -180, 180, 1), n('contrast', 'Print contrast', 1, 0.25, 3), n('amount', 'Amount', 1, 0, 1)],
  body: `float angle = radians(p_angle); mat2 turn = mat2(cos(angle), sin(angle), -sin(angle), cos(angle));
vec2 point = turn * ((uv - 0.5) * uSize); vec2 center = (floor(point / p_cellSize) + 0.5) * p_cellSize;
vec2 centerUV = transpose(turn) * center / uSize + 0.5;
vec4 inkSource = sampleImage(clamp(centerUV, 0.5 / uSize, 1.0 - 0.5 / uSize));
float darkness = pow(clamp(1.0 - luminance(straight(inkSource)), 0.0, 1.0), p_contrast);
float radius = sqrt(darkness) * p_cellSize * 0.70710678;
float ink = darkness < 0.00001 ? 0.0 : darkness > 0.99999 ? 1.0 : 1.0 - smoothstep(radius - 0.5, radius + 0.5, length(point - center));
finalColor = vec4(mix(color, vec3(1.0 - ink), p_amount) * source.a, source.a);`,
});
