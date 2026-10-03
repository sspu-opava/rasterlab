import { numberParameter as n, seedParameter, shaderEffect } from '../core/shader';
export const blockCorruption = shaderEffect({
  id: 'block-corruption', name: 'Block Corruption', category: 'Distortion', description: 'Vybrané bloky přebírají posunutý a kvantizovaný obsah obrazu.',
  parameters: [n('blockSize', 'Block size / px', 24, 2, 256, 1), n('corruptionRate', 'Corruption rate', 0.35, 0, 1), n('displacement', 'Displacement / px', 80, 0, 500, 1), seedParameter],
  body: `vec2 block = floor(uv * uSize / p_blockSize);
    if (hash(vec3(block, p_seed)) >= p_corruptionRate) finalColor = source;
    else {
      vec2 shift = (vec2(hash(vec3(block, p_seed + 3.0)), hash(vec3(block, p_seed + 7.0))) * 2.0 - 1.0) * p_displacement;
      shift = floor(shift / p_blockSize + 0.5) * p_blockSize;
      vec4 piece = sampleImage(uv + shift / uSize);
      vec3 corrupt = floor(straight(piece) * 7.0 + 0.5) / 7.0;
      finalColor = vec4(corrupt * piece.a, piece.a);
    }`,
});
