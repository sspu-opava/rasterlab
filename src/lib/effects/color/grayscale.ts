import { shaderEffect } from '../core/shader';
export const grayscale = shaderEffect({
  id: 'grayscale', name: 'Grayscale', category: 'Color', description: 'Převod obrazu do odstínů šedi.',
  parameters: [{ id: 'method', label: 'Metoda', type: 'select', default: 'luminance', options: [{ value: 'luminance', label: 'Luminance' }, { value: 'average', label: 'Average' }] }],
  body: 'float gray = p_method < 0.5 ? luminance(color) : (color.r + color.g + color.b) / 3.0; finalColor = vec4(vec3(gray) * source.a, source.a);',
});
