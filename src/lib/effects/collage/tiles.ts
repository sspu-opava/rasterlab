import { numberParameter as n, seedParameter, shaderEffect } from '../core/shader';
import { fragmentData } from './fragments';
export const tiles = shaderEffect({
  id: 'random-tiles', name: 'Random Tiles', category: 'Collage', description: 'Koláž z mřížky s nezávislou rotací, měřítkem a posunem buněk.',
  parameters: [n('columns', 'Columns', 4, 1, 8, 1), n('rows', 'Rows', 4, 1, 8, 1), { id: 'shuffle', label: 'Shuffle', type: 'boolean', default: true }, n('rotationVariation', 'Rotation variation', 15, 0, 180, 1), n('scaleVariation', 'Scale variation', 0.15, 0, 0.8), n('offsetVariation', 'Offset variation', 0.1, 0, 1), seedParameter],
  data: fragmentData(true),
  body: `
    vec2 grid = vec2(p_columns, p_rows);
    vec2 cell = min(floor(uv * grid), grid - 1.0);
    float index = cell.y * p_columns + cell.x;
    float mapped = uOrder[int(index)];
    vec2 local = uv * grid - cell - 0.5;
    // Rotate in document pixels so rectangular cells do not stretch the image.
    vec2 cellSize = uSize / grid;
    float angle = (hash(vec3(index, p_seed, 1.0)) * 2.0 - 1.0) * radians(p_rotationVariation);
    float scale = 1.0 + (hash(vec3(index, p_seed, 2.0)) * 2.0 - 1.0) * p_scaleVariation;
    local = (mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * (local * cellSize)) / cellSize / scale;
    local += vec2(hash(vec3(index, p_seed, 3.0)), hash(vec3(index, p_seed, 4.0))) * p_offsetVariation - 0.5 * p_offsetVariation;
    if (any(greaterThan(abs(local), vec2(0.5)))) finalColor = vec4(0.0);
    else finalColor = sampleImage((vec2(mod(mapped, p_columns), floor(mapped / p_columns)) + local + 0.5) / grid);`,
});
