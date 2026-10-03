import { numberParameter as n, seedParameter, shaderEffect } from '../core/shader';
import { createVoronoiData, voronoiGLSL } from './voronoi';
export const fragmentScatter = shaderEffect({
  id: 'fragment-scatter', name: 'Fragment Scatter', category: 'Collage', description: 'Nepravidelné Voronoi fragmenty se samostatně posunou, otočí a zvětší.',
  parameters: [n('fragmentCount', 'Fragment count', 8, 1, 16, 1), n('radius', 'Scatter radius / px', 80, 0, 500, 1), n('rotation', 'Rotation variation', 25, 0, 180, 1), n('scale', 'Fragment scale', 0.9, 0.2, 2), seedParameter],
  data: createVoronoiData('fragmentCount'), helpers: voronoiGLSL,
  body: `finalColor = vec4(0.0);
    for (int i = 0; i < 16; i++) {
      if (float(i) >= p_fragmentCount) break;
      vec2 center = uSites[i].xy * uSize;
      float angle = (hash(vec3(float(i), p_seed, 3.0)) * 2.0 - 1.0) * radians(p_rotation);
      vec2 point = uv * uSize - center - uSites[i].zw * p_radius;
      vec2 original = (mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * point / p_scale + center) / uSize;
      if (nearestSite(original * uSize, p_fragmentCount) == i) {
        vec4 piece = sampleImage(original); finalColor = piece + finalColor * (1.0 - piece.a);
      }
    }`,
});
