import { numberParameter, shaderEffect } from '../core/shader';
export const bitPlane = shaderEffect({
  id: 'bit-plane-extractor', name: 'Bit Plane Extractor', category: 'Boolean', description: 'Zobrazení jedné z osmi bitových rovin vybraného kanálu.',
  parameters: [numberParameter('bit', 'Bit', 7, 0, 7, 1), { id: 'channel', label: 'Channel', type: 'select', default: 'luminance', options: [{ value: 'luminance', label: 'Luminance' }, { value: 'red', label: 'Red' }, { value: 'green', label: 'Green' }, { value: 'blue', label: 'Blue' }] }, { id: 'invert', label: 'Invert', type: 'boolean', default: false }],
  body: `float value = p_channel < 0.5 ? luminance(color) : (p_channel < 1.5 ? color.r : (p_channel < 2.5 ? color.g : color.b));
    int byteValue = int(floor(clamp(value, 0.0, 1.0) * 255.0 + 0.5));
    float plane = float((byteValue >> int(p_bit)) & 1);
    if (p_invert > 0.5) plane = 1.0 - plane;
    finalColor = vec4(vec3(plane) * source.a, source.a);`,
});
