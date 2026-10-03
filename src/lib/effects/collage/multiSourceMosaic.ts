import { numberParameter as n, seedParameter, shaderEffect } from '../core/shader';
export const multiSourceMosaic = shaderEffect({
  id: 'multi-source-mosaic', name: 'Multi-Source Mosaic', category: 'Collage', description: 'Dlaždice volí mezi dvěma vstupními vrstvami podle vah a seedu.',
  inputs: [{ id: 'secondary', label: 'Druhá vrstva', required: true }],
  parameters: [n('columns', 'Columns', 8, 1, 32, 1), n('rows', 'Rows', 8, 1, 32, 1), n('secondaryWeight', 'Secondary weight', 0.5, 0, 1), n('blending', 'Blending', 0, 0, 1), seedParameter],
  body: `vec4 secondary = texture(uSecondary, uv);
    vec2 cell = floor(uv * vec2(p_columns, p_rows));
    float choice = hash(vec3(cell, p_seed)) < p_secondaryWeight ? 1.0 : 0.0;
    finalColor = mix(source, secondary, mix(choice, p_secondaryWeight, p_blending));`,
});
