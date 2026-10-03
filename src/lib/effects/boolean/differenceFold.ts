import { numberParameter as n, shaderEffect } from '../core/shader';
export const differenceFold = shaderEffect({
  id: 'difference-fold', name: 'Difference Fold', category: 'Boolean', description: 'Absolutní rozdíl dvou obrazů opakovaně zalamuje do trojúhelníkové vlny.',
  inputs: [{ id: 'secondary', label: 'Druhá vrstva', required: true }],
  parameters: [n('iterations', 'Iterations', 3, 1, 16, 1), n('gain', 'Gain', 2.3, 0, 8), n('offset', 'Offset', 0.1, -2, 2)],
  body: `vec4 other = texture(uSecondary, uv); vec3 difference = abs(color - straight(other));
    for (int i = 0; i < 16; i++) { if (float(i) >= p_iterations) break; difference = 1.0 - abs(mod(difference * p_gain + p_offset, 2.0) - 1.0); }
    float alpha = max(source.a, other.a); finalColor = vec4(difference * alpha, alpha);`,
});
