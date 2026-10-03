import { numberParameter as n, seedParameter, shaderEffect } from '../core/shader';
import { createVoronoiData, voronoiGLSL } from '../collage/voronoi';
export const voronoiField = shaderEffect({
  id: 'voronoi-field', name: 'Voronoi Field', category: 'Generative', description: 'Buněčné pole, vzdálenosti a hranice podle euklidovské, Manhattan nebo Chebyshev metriky.',
  parameters: [n('density', 'Density', 24, 2, 32, 1), { id: 'distanceMode', label: 'Distance mode', type: 'select', default: 'euclidean', options: ['euclidean', 'manhattan', 'chebyshev'].map(value => ({ value, label: value })) }, { id: 'style', label: 'Field style', type: 'select', default: 'cells', options: ['cells', 'distance', 'edges'].map(value => ({ value, label: value })) }, n('edgeWidth', 'Edge width / px', 3, 0, 32, 1), n('amount', 'Amount', 1, 0, 1), seedParameter],
  data: createVoronoiData('density'), helpers: voronoiGLSL,
  body: `float first = 1e30, second = 1e30; int winner = 0;
    for (int i = 0; i < 32; i++) {
      if (float(i) >= p_density) break;
      vec2 delta = abs(uv * uSize - uSites[i].xy * uSize);
      float distance = p_distanceMode < 0.5 ? length(delta) : (p_distanceMode < 1.5 ? delta.x + delta.y : max(delta.x, delta.y));
      if (distance < first) { second = first; first = distance; winner = i; } else second = min(second, distance);
    }
    float edge = p_distanceMode < 0.5 ? cellEdgeDistance(uv * uSize, winner, p_density) : (second - first) * 0.5;
    vec3 field = vec3(hash(vec3(float(winner), p_seed, 1.0)), hash(vec3(float(winner), p_seed, 2.0)), hash(vec3(float(winner), p_seed, 3.0)));
    if (p_style > 1.5) field = vec3(step(p_edgeWidth * 0.5, edge));
    else if (p_style > 0.5) field = vec3(clamp(first / sqrt(uSize.x * uSize.y / p_density), 0.0, 1.0));
    else field *= smoothstep(0.0, max(0.001, p_edgeWidth * 0.5), edge);
    finalColor = vec4(mix(color, field, p_amount) * source.a, source.a);`,
});
