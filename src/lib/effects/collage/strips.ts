import { numberParameter as n, seedParameter, shaderEffect } from '../core/shader';
import { fragmentData } from './fragments';
export const strips = shaderEffect({
  id: 'strips', name: 'Strips', category: 'Collage', description: 'Přeskupení pásů s obracením, posunem a průhlednými mezerami.',
  parameters: [n('count', 'Strip count', 12, 1, 64, 1), { id: 'direction', label: 'Direction', type: 'select', default: 'horizontal', options: [{ value: 'horizontal', label: 'Horizontal' }, { value: 'vertical', label: 'Vertical' }] }, { id: 'shuffle', label: 'Shuffle', type: 'boolean', default: true }, { id: 'reverse', label: 'Reverse alternation', type: 'boolean', default: false }, n('displacement', 'Displacement', 0, 0, 1), n('gap', 'Gap', 0.04, 0, 0.9), seedParameter],
  data: fragmentData(false),
  body: `
    vec2 point = p_direction < 0.5 ? uv : uv.yx;
    float index = min(floor(point.y * p_count), p_count - 1.0);
    float local = point.y * p_count - index;
    if (local < p_gap * 0.5 || local > 1.0 - p_gap * 0.5) { finalColor = vec4(0.0); }
    else {
      if (p_reverse > 0.5 && mod(index, 2.0) > 0.5) point.x = 1.0 - point.x;
      point.x += (hash(vec3(index, p_seed, 4.0)) - 0.5) * p_displacement;
      point.y = (uOrder[int(index)] + local) / p_count;
      finalColor = sampleImage(p_direction < 0.5 ? point : point.yx);
    }`,
});
