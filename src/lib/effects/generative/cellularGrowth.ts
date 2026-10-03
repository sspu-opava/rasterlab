import { numberParameter as n, seedParameter, shaderEffect } from '../core/shader';
import { multipassEffect } from '../core/multipass';
import { noiseFieldGLSL } from './fields';
const parameters = [n('iterations', 'Growth iterations', 24, 0, 128, 1), n('threshold', 'Growth threshold', 0.45, 0, 1), n('spread', 'Spread / px', 1, 1, 8, 1), n('density', 'Seed density', 0.15, 0, 1), n('amount', 'Amount', 1, 0, 1), seedParameter];
const metadata = { parameters, category: 'Generative', description: 'Seedované buňky rostou přes sousedy do oblastí vhodného procedurálního substrátu.' };
const initialize = shaderEffect({ ...metadata, id: 'cellular-growth-initialize', name: 'Growth initialize', helpers: noiseFieldGLSL, body: `
  float terrain = fbm(uv * uSize / min(uSize.x, uSize.y) * 6.0, p_seed + 41.0, 4.0, 0.5, 2.0);
  float alive = hash(vec3(floor(uv * uSize / 4.0), p_seed)) < p_density && terrain >= p_threshold ? 1.0 : 0.0;
  finalColor = vec4(alive, terrain, 0.0, 1.0);`,
});
const step = shaderEffect({ ...metadata, id: 'cellular-growth-step', name: 'Growth step',
  helpers: 'float growthCell(vec2 point) { return sampleImage(fract(point)).r; }',
  body: `vec2 delta = vec2(p_spread) / uSize; float neighbors = 0.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { if (x != 0 || y != 0) neighbors = max(neighbors, growthCell(uv + vec2(float(x), float(y)) * delta)); }
    float alive = max(source.r, step(p_threshold, source.g) * step(0.5, neighbors));
    finalColor = vec4(alive, source.g, 0.0, 1.0);`,
});
const finish = shaderEffect({ ...metadata, id: 'cellular-growth-finish', name: 'Growth finish', body: `vec4 original = texture(uSecondary, uv); finalColor = vec4(mix(straight(original), vec3(source.r), p_amount) * original.a, original.a);` });
export const cellularGrowth = multipassEffect({ ...metadata, id: 'cellular-growth', name: 'Cellular Growth', version: '1.0.0', inputs: [] }, { initialize, step, finish, passes: p => Number(p.iterations) });
