import { numberParameter as n, shaderEffect } from '../core/shader';
import { radialFieldGLSL } from './analyticFields';
export const radialField = shaderEffect({
  id: 'radial-field', name: 'Radial Field', category: 'Generative', description: 'Koncentrické nebo spirálové pole s vlastním středem a útlumem.',
  parameters: [n('centerX', 'Center X', 0.5, 0, 1), n('centerY', 'Center Y', 0.5, 0, 1), n('frequency', 'Frequency', 12, 1, 100, 1), n('twist', 'Twist', 3, -20, 20), n('falloff', 'Falloff', 1, 0, 6), n('amount', 'Amount', 0.8, 0, 1)],
  helpers: radialFieldGLSL,
  body: `float field = radialFieldValue((uv - vec2(p_centerX, p_centerY)) * uSize / min(uSize.x, uSize.y), p_frequency, p_twist, p_falloff);
    finalColor = vec4(color * mix(1.0, field, p_amount) * source.a, source.a);`,
});
