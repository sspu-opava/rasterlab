import { numberParameter as n, seedParameter, shaderEffect } from '../core/shader';
import { noiseFieldGLSL } from './fields';
export const flowField = shaderEffect({
  id: 'flow-field', name: 'Flow Field', category: 'Distortion', description: 'Deformace podle gradientu nebo vířivého curl směrového pole.',
  parameters: [n('scale', 'Flow scale', 6, 1, 64), n('curl', 'Curl', 1, 0, 1), n('strength', 'Flow strength / px', 35, 0, 300, 1), seedParameter],
  helpers: noiseFieldGLSL,
  body: `vec2 point = uv * uSize / min(uSize.x, uSize.y) * p_scale;
    float delta = 0.03;
    vec2 gradient = vec2(fbm(point + vec2(delta, 0.0), p_seed, 4.0, 0.5, 2.0) - fbm(point - vec2(delta, 0.0), p_seed, 4.0, 0.5, 2.0), fbm(point + vec2(0.0, delta), p_seed, 4.0, 0.5, 2.0) - fbm(point - vec2(0.0, delta), p_seed, 4.0, 0.5, 2.0)) / (2.0 * delta);
    vec2 flow = mix(gradient, vec2(gradient.y, -gradient.x), p_curl);
    flow /= max(1.0, length(flow));
    finalColor = sampleImage(uv + flow * p_strength / uSize);`,
});
