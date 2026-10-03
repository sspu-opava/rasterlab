import { numberParameter as n, seedParameter, shaderEffect } from '../core/shader';
import { voronoiData, voronoiGLSL } from './voronoi';
export const voronoiCollage = shaderEffect({
  id: 'voronoi-collage', name: 'Voronoi Collage', category: 'Collage', description: 'Nepravidelné buňky s vlastním posunem obrazu a průhlednými hranami.',
  parameters: [n('cells', 'Cells', 18, 1, 32, 1), n('edgeWidth', 'Edge width / px', 3, 0, 32, 0.5), n('displacement', 'Displacement / px', 45, 0, 300, 1), seedParameter],
  data: voronoiData, helpers: voronoiGLSL,
  body: `int cell = nearestSite(uv * uSize, p_cells);
    float edge = cellEdgeDistance(uv * uSize, cell, p_cells);
    if (edge < p_edgeWidth * 0.5) finalColor = vec4(0.0);
    else finalColor = sampleImage(uv + uSites[cell].zw * p_displacement / uSize);`,
});
