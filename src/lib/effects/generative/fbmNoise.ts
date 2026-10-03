import { numberParameter as n, seedParameter, shaderEffect } from '../core/shader';
import { noiseFieldGLSL } from './fields';
export const fbmNoise = shaderEffect({
  id: 'fbm-noise', name: 'FBM Noise', category: 'Generative', description: 'Víceoktávový spojitý šum s řízenou frekvencí a vahami oktáv.',
  parameters: [n('scale', 'Noise scale', 6, 1, 128), n('octaves', 'Octaves', 5, 1, 8, 1), n('persistence', 'Persistence', 0.5, 0, 1), n('lacunarity', 'Lacunarity', 2, 1, 4), n('amount', 'Amount', 0.8, 0, 1), seedParameter],
  helpers: noiseFieldGLSL,
  body: `float field = fbm(uv * uSize / min(uSize.x, uSize.y) * p_scale, p_seed, p_octaves, p_persistence, p_lacunarity);
    finalColor = vec4(mix(color, vec3(field), p_amount) * source.a, source.a);`,
});
