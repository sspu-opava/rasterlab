import { numberParameter as n, shaderEffect } from '../core/shader';
export const logicMatrix = shaderEffect({
  id: 'logic-matrix', name: 'Logic Matrix', category: 'Boolean', description: 'Bitová AND, OR, NAND, NOR nebo XNOR operace nad dvěma obrazy.',
  inputs: [{ id: 'secondary', label: 'Druhá vrstva', required: true }],
  parameters: [{ id: 'operation', label: 'Operation', type: 'select', default: 'xnor', options: ['and', 'or', 'nand', 'nor', 'xnor'].map(value => ({ value, label: value.toUpperCase() })) }, { id: 'mode', label: 'Mode', type: 'select', default: 'rgb', options: ['rgb', 'luminance', 'binary'].map(value => ({ value, label: value })) }, n('threshold', 'Threshold', 0.5, 0, 1)],
  body: `vec4 secondary = texture(uSecondary, uv); vec3 other = straight(secondary);
    if (p_mode > 0.5) { color = vec3(luminance(color)); other = vec3(luminance(other)); }
    if (p_mode > 1.5) { color = step(vec3(p_threshold), color); other = step(vec3(p_threshold), other); }
    ivec3 a = ivec3(floor(clamp(color, 0.0, 1.0) * 255.0 + 0.5)), b = ivec3(floor(clamp(other, 0.0, 1.0) * 255.0 + 0.5));
    ivec3 result;
    if (p_operation < 0.5) result = a & b;
    else if (p_operation < 1.5) result = a | b;
    else if (p_operation < 2.5) result = ~(a & b) & ivec3(255);
    else if (p_operation < 3.5) result = ~(a | b) & ivec3(255);
    else result = ~(a ^ b) & ivec3(255);
    float alpha = max(source.a, secondary.a); finalColor = vec4(vec3(result) / 255.0 * alpha, alpha);`,
});
