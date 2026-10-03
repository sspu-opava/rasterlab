import { numberParameter as n, seedParameter, shaderEffect } from '../core/shader';
import { multipassEffect } from '../core/multipass';
const parameters = [n('feed', 'Feed', 0.0367, 0, 0.1, 0.0001), n('kill', 'Kill', 0.0649, 0, 0.1, 0.0001), n('iterations', 'Iterations', 40, 1, 128, 1), n('seedDensity', 'Seed density', 0.15, 0, 1), n('amount', 'Amount', 1, 0, 1), seedParameter];
const metadata = { category: 'Generative', parameters, description: 'Iterativní Gray–Scott reakce a difuze dvou látek se seedovanou inicializací.' };
const initialize = shaderEffect({ ...metadata, id: 'reaction-diffusion-initialize', name: 'Reaction diffusion initialize', body: `
  float spot = hash(vec3(floor(uv * uSize / 4.0), p_seed)) < p_seedDensity ? 1.0 : 0.0;
  finalColor = vec4(1.0 - spot * 0.75, spot * 0.75, 0.0, 1.0);`,
});
const step = shaderEffect({ ...metadata, id: 'reaction-diffusion-step', name: 'Reaction diffusion step',
  helpers: `vec2 chemical(vec2 point) { return sampleImage(fract(point)).rg; }`,
  body: `vec2 delta = 1.0 / uSize, state = source.rg;
    vec2 laplace = chemical(uv + vec2(delta.x, 0.0)) + chemical(uv - vec2(delta.x, 0.0)) + chemical(uv + vec2(0.0, delta.y)) + chemical(uv - vec2(0.0, delta.y)) - 4.0 * state;
    float reaction = state.x * state.y * state.y;
    vec2 change = vec2(0.16 * laplace.x - reaction + p_feed * (1.0 - state.x), 0.08 * laplace.y + reaction - (p_feed + p_kill) * state.y);
    finalColor = vec4(clamp(state + change, 0.0, 1.0), 0.0, 1.0);`,
});
const finish = shaderEffect({ ...metadata, id: 'reaction-diffusion-finish', name: 'Reaction diffusion finish', body: `
  vec4 original = texture(uSecondary, uv); float field = clamp(source.g * 2.0, 0.0, 1.0);
  finalColor = vec4(mix(straight(original), vec3(field), p_amount) * original.a, original.a);`,
});
export const reactionDiffusion = multipassEffect({ ...metadata, id: 'reaction-diffusion', name: 'Reaction Diffusion', version: '1.0.0', inputs: [] }, { initialize, step, finish, passes: p => Number(p.iterations) });
