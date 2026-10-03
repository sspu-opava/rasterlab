import { numberParameter as n, shaderEffect } from '../core/shader';
export const morphology = shaderEffect({
  id: 'morphology', name: 'Morphology', category: 'Material', description: 'Dilatace nebo eroze jasu či alfa kanálu; rozšiřuje body, čáry a okraje.',
  parameters: [{ id: 'operation', label: 'Morphology operation', type: 'select', default: 'dilate', options: [{ value: 'dilate', label: 'Dilate / maximum' }, { value: 'erode', label: 'Erode / minimum' }] }, { id: 'channel', label: 'Morphology channel', type: 'select', default: 'luminance', options: [{ value: 'luminance', label: 'Luminance × alpha' }, { value: 'alpha', label: 'Alpha' }] }, { id: 'shape', label: 'Neighborhood shape', type: 'select', default: 'square', options: [{ value: 'square', label: 'Square' }, { value: 'cross', label: 'Cross' }] }, n('radius', 'Radius / px', 1, 0, 8, 1), n('amount', 'Amount', 1, 0, 1)],
  body: `vec4 chosen = source; float best = p_channel < 0.5 ? luminance(color) * source.a : source.a;
for (int y = -8; y <= 8; y++) for (int x = -8; x <= 8; x++) {
if (abs(float(x)) > p_radius || abs(float(y)) > p_radius || (p_shape > 0.5 && x != 0 && y != 0)) continue;
vec4 sampleColor = sampleImage(uv + vec2(float(x), float(y)) / uSize);
float value = p_channel < 0.5 ? luminance(straight(sampleColor)) * sampleColor.a : sampleColor.a;
if ((p_operation < 0.5 && value > best) || (p_operation > 0.5 && value < best)) { best = value; chosen = sampleColor; }
}
finalColor = mix(source, chosen, p_amount);`,
});
