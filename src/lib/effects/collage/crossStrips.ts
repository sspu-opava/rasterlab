import { numberParameter as n, seedParameter, shaderEffect } from '../core/shader';
import { fragmentOrder } from './fragments';
export const crossStrips = shaderEffect({
  id: 'cross-strips', name: 'Cross Strips', category: 'Collage', description: 'Nezávislé přeskupení pásů v osách X a Y s posunem obsahu buněk.',
  parameters: [n('columns', 'Columns', 4, 1, 8, 1), n('rows', 'Rows', 4, 1, 8, 1), n('jitter', 'Jitter / px', 8, 0, 100, 1), seedParameter],
  data: { declarations: 'uniform float uColumns[8]; uniform float uRows[8];', create() {
    const columns = new Float32Array(8), rows = new Float32Array(8); let key = '';
    return { uniforms: { uColumns: { value: columns, type: 'f32', size: 8 }, uRows: { value: rows, type: 'f32', size: 8 } }, update(p) {
      const next = `${p.columns}:${p.rows}:${p.seed}`; if (key === next) return; key = next;
      columns.fill(0); rows.fill(0); columns.set(fragmentOrder(Number(p.columns), Number(p.seed), true)); rows.set(fragmentOrder(Number(p.rows), Number(p.seed) + 1, true));
    } };
  } },
  body: `vec2 grid = vec2(p_columns, p_rows), cell = min(floor(uv * grid), grid - 1.0);
    vec2 local = uv * grid - cell;
    local += (vec2(hash(vec3(cell, p_seed)), hash(vec3(cell, p_seed + 13.0))) - 0.5) * 2.0 * p_jitter * grid / uSize;
    if (any(lessThan(local, vec2(0.0))) || any(greaterThan(local, vec2(1.0)))) finalColor = vec4(0.0);
    else finalColor = sampleImage((vec2(uColumns[int(cell.x)], uRows[int(cell.y)]) + local) / grid);`,
});
