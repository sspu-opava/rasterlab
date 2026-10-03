import { numberParameter as n, seedParameter, shaderEffect } from '../core/shader';
import { noiseFieldGLSL } from '../generative/fields';
export const paperWarp = shaderEffect({
  id: 'paper-warp', name: 'Paper Warp', category: 'Material', description: 'Měkká deformace podle spojitého víceoktávového pole.',
  parameters: [n('warpScale', 'Warp scale', 5, 1, 40), n('amplitude', 'Amplitude / px', 30, 0, 250, 1), n('irregularity', 'Irregularity', 0.6, 0, 1), seedParameter],
  helpers: noiseFieldGLSL,
  body: `vec2 point = uv * uSize / min(uSize.x, uSize.y) * p_warpScale;
    vec2 displacement = vec2(fbm(point, p_seed, 4.0, p_irregularity * 0.8, 2.0), fbm(point + vec2(32.7), p_seed + 7.0, 4.0, p_irregularity * 0.8, 2.0)) * 2.0 - 1.0;
    finalColor = sampleImage(uv + displacement * p_amplitude / uSize);`,
});
