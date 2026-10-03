import { numberParameter as n, seedParameter, shaderEffect } from '../core/shader';
export const photocopy = shaderEffect({
  id: 'photocopy', name: 'Photocopy', category: 'Material', description: 'Kontrastní kopie s tonerem, zrnem a výpadky tisku.',
  parameters: [n('contrast', 'Contrast', 2.5, 0.1, 8), n('tonerDensity', 'Toner density', 0.85, 0, 1), n('grain', 'Grain', 0.18, 0, 1), n('dropout', 'Dropout', 0.04, 0, 1), seedParameter],
  body: `vec2 pixel = floor(uv * uSize);
    float noise = hash(vec3(pixel, p_seed));
    float light = clamp((luminance(color) - 0.5) * p_contrast + 0.5 + (noise - 0.5) * p_grain, 0.0, 1.0);
    float toner = (1.0 - light) * p_tonerDensity;
    if (hash(vec3(pixel, p_seed + 19.0)) < p_dropout) toner = 0.0;
    finalColor = vec4(vec3(1.0 - toner) * source.a, source.a);`,
});
