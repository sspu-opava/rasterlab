import { shaderEffect, numberParameter } from '../core/shader';
export const posterize = shaderEffect({ id: 'posterize', name: 'Posterize', category: 'Color', description: 'Omezí počet úrovní v barevných kanálech.', parameters: [numberParameter('levels', 'Levels', 4, 2, 32, 1)], body: 'float n = max(1.0, p_levels - 1.0); finalColor = vec4(floor(color * n + 0.5) / n * source.a, source.a);' });
