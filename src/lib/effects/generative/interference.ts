import { numberParameter as n, shaderEffect } from '../core/shader';
import { interferenceFieldGLSL } from './analyticFields';
export const interference = shaderEffect({
  id: 'interference', name: 'Interference', category: 'Generative', description: 'Interference natočených vln modulující jas zdrojového obrazu.',
  parameters: [n('waveCount', 'Wave count', 3, 2, 12, 1), n('frequency', 'Frequency', 24, 1, 160, 1), n('angle', 'Angle', 0, 0, 360, 1), n('phase', 'Phase', 0, 0, 360, 1), n('amount', 'Amount', 0.75, 0, 1)],
  helpers: interferenceFieldGLSL,
  body: `float field = interferenceField((uv - 0.5) * uSize / min(uSize.x, uSize.y), p_waveCount, p_frequency, p_angle, p_phase);
    finalColor = vec4(color * mix(1.0, field, p_amount) * source.a, source.a);`,
});
