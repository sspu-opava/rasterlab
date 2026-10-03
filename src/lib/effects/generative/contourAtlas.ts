import { numberParameter as n, shaderEffect } from '../core/shader';
export const contourAtlas = shaderEffect({
  id: 'contour-atlas', name: 'Contour Atlas', category: 'Generative', description: 'Jasové vrstevnice s nastavitelnou hustotou, šířkou a vyhlazením hran.',
  parameters: [n('contourCount', 'Contour count', 12, 2, 64, 1), n('thickness', 'Line thickness', 0.18, 0.01, 1), n('smoothing', 'Edge smoothing', 1, 0, 3)],
  body: `float level = luminance(color) * p_contourCount;
    float distance = abs(fract(level + 0.5) - 0.5);
    float width = p_thickness * 0.5;
    float aa = max(fwidth(level) * p_smoothing, 0.00001);
    float paper = smoothstep(max(0.0, width - aa), width + aa, distance);
    finalColor = vec4(vec3(paper) * source.a, source.a);`,
});
