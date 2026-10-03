import { numberParameter as n, shaderEffect } from '../effects/core/shader';
// Mask luminance includes coverage: transparent white is an empty mask.
export const maskField = shaderEffect({ id: 'mask-field', name: 'Mask field', category: 'Internal', description: '', parameters: [n('mode', 'Mode', 0, 0, 1, 1)], body: 'float value = p_mode < 0.5 ? source.a : luminance(color) * source.a; finalColor = vec4(vec3(value), 1.0);' });
// Separable 17-sample Gaussian, bounded in document pixels; outside coverage is zero.
export const maskBlur = shaderEffect({ id: 'mask-blur', name: 'Mask blur', category: 'Internal', description: '', parameters: [n('radius', 'Radius', 0, 0, 64), n('vertical', 'Vertical', 0, 0, 1, 1)], body: `
float sum = 0.0, weightSum = 0.0;
vec2 direction = p_vertical < 0.5 ? vec2(1.0 / uSize.x, 0.0) : vec2(0.0, 1.0 / uSize.y);
for (int i = -8; i <= 8; i++) { float t = float(i) / 8.0; float weight = exp(-4.5 * t * t); sum += sampleImage(uv + direction * t * p_radius).r * weight; weightSum += weight; }
finalColor = vec4(vec3(sum / weightSum), 1.0);` });
export const maskApply = shaderEffect({ id: 'mask-apply', name: 'Mask apply', category: 'Internal', description: '', parameters: [n('invert', 'Invert', 0, 0, 1, 1), n('strength', 'Strength', 1, 0, 1)], body: 'float value = texture(uSecondary, uv).r; if (p_invert > 0.5) value = 1.0 - value; finalColor = source * mix(1.0, value, p_strength);' });
