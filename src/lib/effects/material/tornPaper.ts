import { numberParameter as n, seedParameter, shaderEffect } from '../core/shader';
import { noiseFieldGLSL } from '../generative/fields';
export const tornPaper = shaderEffect({
  id: 'torn-paper', name: 'Torn Paper', category: 'Material', description: 'Křivolaké trhliny oddělují papír a vrhají stíny podél okrajů.',
  parameters: [n('tearCount', 'Tear count', 5, 1, 12, 1), { id: 'direction', label: 'Direction', type: 'select', default: 'vertical', options: [{ value: 'vertical', label: 'Vertical' }, { value: 'horizontal', label: 'Horizontal' }] }, n('roughness', 'Roughness', 0.6, 0, 1), n('gap', 'Tear gap / px', 12, 0, 100, 1), n('shadow', 'Shadow', 0.5, 0, 1), seedParameter],
  helpers: noiseFieldGLSL,
  body: `vec2 point = p_direction < 0.5 ? uv : uv.yx;
    float size = p_direction < 0.5 ? uSize.x : uSize.y;
    float nearest = 1e30, offset = 0.0;
    for (int i = 0; i < 12; i++) {
      if (float(i) >= p_tearCount) break;
      float location = 0.05 + hash(vec3(float(i), p_seed, 3.0)) * 0.9;
      location += (fbm(vec2(point.y * 12.0, float(i) * 7.0), p_seed, 4.0, 0.5, 2.0) - 0.5) * p_roughness * 80.0 / size;
      float distance = (point.x - location) * size;
      nearest = min(nearest, abs(distance)); offset += sign(distance) * p_gap * 0.5 / p_tearCount / size;
    }
    point.x -= offset;
    vec4 paper = sampleImage(p_direction < 0.5 ? point : point.yx);
    if (nearest < p_gap * 0.5) finalColor = vec4(0.0);
    else { float shade = 1.0 - exp(-max(0.0, nearest - p_gap * 0.5) / 10.0) * p_shadow; finalColor = vec4(paper.rgb * shade, paper.a); }`,
});
