import { numberParameter as n, seedParameter, shaderEffect } from '../core/shader';
import { foldData, foldFieldGLSL } from './foldMap';
export const crumple = shaderEffect({
  id: 'crumple', name: 'Crumple', category: 'Material', description: 'Procedurální záhyby deformují obraz a vytvářejí světla i stíny.',
  parameters: [n('strength', 'Strength', 0.5, 0, 1), n('foldCount', 'Fold count', 18, 1, 32, 1), n('scale', 'Fold scale', 1, 0.25, 4), n('sharpness', 'Sharpness', 0.5, 0, 1), n('lightAngle', 'Light angle', 45, 0, 360, 1), n('lighting', 'Lighting', 0.65, 0, 1), seedParameter],
  data: foldData, helpers: foldFieldGLSL,
  body: `
    vec2 aspect = uSize / min(uSize.x, uSize.y);
    vec3 field = foldField((uv - 0.5) * aspect * p_scale, p_foldCount, p_sharpness);
    vec4 paper = sampleImage(uv + field.yz * p_strength * 0.12 / aspect);
    vec3 normal = normalize(vec3(-field.yz * p_strength * 5.0, 1.0));
    float angle = radians(p_lightAngle);
    vec3 light = normalize(vec3(cos(angle), sin(angle), 1.0));
    float shade = dot(normal, light) / light.z;
    vec3 ink = straight(paper) * mix(1.0, shade, p_lighting);
    finalColor = vec4(clamp(ink, 0.0, 1.0) * paper.a, paper.a);`,
});
