import { numberParameter as n, shaderEffect } from '../core/shader';
export const moduloMix = shaderEffect({
  id: 'modulo-mix', name: 'Modulo Mix', category: 'Boolean', description: 'Součet dvou vrstev zalamuje modulo periodou do barevných pásem.',
  inputs: [{ id: 'secondary', label: 'Druhá vrstva', required: true }],
  parameters: [n('divisor', 'Divisor', 0.5, 0.01, 2), n('gain', 'Gain', 1, 0, 4), { id: 'mode', label: 'Channel mode', type: 'select', default: 'rgb', options: [{ value: 'rgb', label: 'RGB' }, { value: 'luminance', label: 'Luminance' }] }],
  body: `vec4 secondary = texture(uSecondary, uv);
    vec3 other = straight(secondary);
    vec3 sum = p_mode < 0.5 ? color + other : vec3(luminance(color) + luminance(other));
    vec3 mixed = clamp(mod(sum, vec3(p_divisor)) / p_divisor * p_gain, 0.0, 1.0);
    float alpha = max(source.a, secondary.a);
    finalColor = vec4(mixed * alpha, alpha);`,
});
