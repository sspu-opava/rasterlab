import { shaderEffect, numberParameter } from '../core/shader';
export const wave = shaderEffect({
  id: 'wave', name: 'Wave', category: 'Distortion', description: 'Sinusová deformace v dokumentových souřadnicích.',
  parameters: [numberParameter('amplitude', 'Amplitude / px', 24, 0, 200, 1), numberParameter('frequency', 'Frequency', 5, 0.1, 50, 0.1), numberParameter('angle', 'Angle / °', 0, 0, 360, 1), numberParameter('phase', 'Phase', 0, 0, 6.283, 0.01)],
  body: 'float angle = radians(p_angle); vec2 direction = vec2(cos(angle), sin(angle)); float wave = sin(dot(uv, direction.yx * vec2(-1.0, 1.0)) * p_frequency * 6.283185 + p_phase); finalColor = sampleImage(uv - direction * wave * p_amplitude / uSize);',
});
