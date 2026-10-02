import { shaderEffect, numberParameter } from '../core/shader';
import type { BooleanOperation } from './operations';
export function booleanEffect(operation: BooleanOperation) {
  const operator = operation === 'OR' ? '|' : operation === 'XOR' ? '^' : '&';
  return shaderEffect({
    id: operation.toLowerCase(), name: operation, category: 'Boolean', description: `${operation} mezi výstupy dvou vrstev. Vstupy jsou zarovnány v souřadnicích dokumentu.`,
    inputs: [{ id: 'secondary', label: 'Druhá vrstva', required: true }],
    parameters: [{ id: 'mode', label: 'Mode', type: 'select', default: 'rgb', options: [{ value: 'rgb', label: 'RGB / 8 bit' }, { value: 'luminance', label: 'Luminance / 8 bit' }, { value: 'binary', label: 'Binary' }] }, numberParameter('threshold', 'Threshold', 0.5, 0, 1)],
    body: `
      vec4 secondary = texture(uSecondary, uv);
      vec3 other = straight(secondary);
      if (p_mode > 0.5) { color = vec3(luminance(color)); other = vec3(luminance(other)); }
      if (p_mode > 1.5) { color = step(vec3(p_threshold), color); other = step(vec3(p_threshold), other); }
      ivec3 a = ivec3(floor(clamp(color, 0.0, 1.0) * 255.0 + 0.5));
      ivec3 b = ivec3(floor(clamp(other, 0.0, 1.0) * 255.0 + 0.5));
      ivec3 result = ${operation === 'NAND' ? `~(a ${operator} b) & ivec3(255)` : `a ${operator} b`};
      float alpha = max(source.a, secondary.a);
      finalColor = vec4(vec3(result) / 255.0 * alpha, alpha);
    `,
  });
}
