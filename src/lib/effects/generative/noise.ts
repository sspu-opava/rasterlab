import { shaderEffect, numberParameter, seedParameter } from '../core/shader';
export const noise = shaderEffect({
  id: 'noise', name: 'Noise', category: 'Generative', description: 'Deterministický zrnitý šum. Stejný seed zachová stejný obraz.',
  parameters: [numberParameter('amount', 'Amount', 0.2, 0, 1), { id: 'monochrome', label: 'Monochrome', type: 'boolean', default: true }, seedParameter],
  body: 'vec2 pixel = floor(uv * uSize); float n = hash(vec3(pixel, p_seed)); vec3 grain = p_monochrome > 0.5 ? vec3(n) : vec3(n, hash(vec3(pixel, p_seed + 17.0)), hash(vec3(pixel, p_seed + 71.0))); finalColor = vec4(clamp(color + (grain - 0.5) * p_amount, 0.0, 1.0) * source.a, source.a);',
});
