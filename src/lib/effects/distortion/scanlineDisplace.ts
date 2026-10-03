import { numberParameter as n, seedParameter, shaderEffect } from '../core/shader';
export const scanlineDisplace = shaderEffect({
  id: 'scanline-displace', name: 'Scanline Displace', category: 'Distortion', description: 'Skupiny řádků posouvá podle pravidelného signálu a seedované náhodnosti.',
  parameters: [n('amplitude', 'Amplitude / px', 40, 0, 500, 1), n('lineHeight', 'Line height / px', 12, 1, 256, 1), n('randomness', 'Randomness', 0.75, 0, 1), seedParameter],
  body: `float row = floor(uv.y * uSize.y / p_lineHeight);
    float signal = mix(sin(row * 1.61803399), hash(vec3(row, p_seed, 9.0)) * 2.0 - 1.0, p_randomness);
    finalColor = sampleImage(uv + vec2(signal * p_amplitude / uSize.x, 0.0));`,
});
