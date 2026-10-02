import { shaderEffect, numberParameter } from '../core/shader';
export const threshold = shaderEffect({
  id: 'threshold', name: 'Threshold', category: 'Color', description: 'Černobílý práh s řízenou měkkostí.',
  parameters: [numberParameter('threshold', 'Threshold', 0.5, 0, 1), numberParameter('softness', 'Softness', 0, 0, 1), { id: 'invert', label: 'Invert', type: 'boolean', default: false }],
  body: 'float l = luminance(color); float t = p_softness > 0.0 ? smoothstep(p_threshold - p_softness * 0.5, p_threshold + p_softness * 0.5, l) : step(p_threshold, l); if (p_invert > 0.5) t = 1.0 - t; finalColor = vec4(vec3(t) * source.a, source.a);',
});
