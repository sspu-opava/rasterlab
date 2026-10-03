import { numberParameter as n, shaderEffect } from '../core/shader';
export const interference = shaderEffect({
  id: 'interference', name: 'Interference', category: 'Generative', description: 'Interference natočených vln modulující jas zdrojového obrazu.',
  parameters: [n('waveCount', 'Wave count', 3, 2, 12, 1), n('frequency', 'Frequency', 24, 1, 160, 1), n('angle', 'Angle', 0, 0, 360, 1), n('phase', 'Phase', 0, 0, 360, 1), n('amount', 'Amount', 0.75, 0, 1)],
  body: `vec2 point = (uv - 0.5) * uSize / min(uSize.x, uSize.y);
    float waves = 0.0;
    for (int i = 0; i < 12; i++) {
      if (float(i) >= p_waveCount) break;
      float angle = radians(p_angle) + float(i) * 3.14159265 / p_waveCount;
      waves += cos(dot(point, vec2(cos(angle), sin(angle))) * p_frequency * 6.2831853 + radians(p_phase));
    }
    float field = 0.5 + 0.5 * waves / p_waveCount;
    finalColor = vec4(color * mix(1.0, field, p_amount) * source.a, source.a);`,
});
