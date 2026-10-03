import { numberParameter as n, shaderEffect } from '../core/shader';
export const radialField = shaderEffect({
  id: 'radial-field', name: 'Radial Field', category: 'Generative', description: 'Koncentrické nebo spirálové pole s vlastním středem a útlumem.',
  parameters: [n('centerX', 'Center X', 0.5, 0, 1), n('centerY', 'Center Y', 0.5, 0, 1), n('frequency', 'Frequency', 12, 1, 100, 1), n('twist', 'Twist', 3, -20, 20), n('falloff', 'Falloff', 1, 0, 6), n('amount', 'Amount', 0.8, 0, 1)],
  body: `vec2 point = (uv - vec2(p_centerX, p_centerY)) * uSize / min(uSize.x, uSize.y);
    float radius = length(point), angle = radius < 0.000001 ? 0.0 : atan(point.y, point.x);
    float field = 0.5 + 0.5 * cos(radius * p_frequency * 6.2831853 + angle * p_twist);
    field = mix(1.0, field, exp(-radius * p_falloff));
    finalColor = vec4(color * mix(1.0, field, p_amount) * source.a, source.a);`,
});
