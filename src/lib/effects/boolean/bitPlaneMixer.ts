import { shaderEffect } from '../core/shader';
import type { EffectParameterDefinition } from '../core/types';
export const bitPlaneMixer = shaderEffect({
  id: 'bit-plane-mixer', name: 'Bit Plane Mixer', category: 'Boolean', description: 'Každý z osmi bitů RGB kanálů může pocházet z první nebo druhé vrstvy.',
  inputs: [{ id: 'secondary', label: 'Druhá vrstva', required: true }],
  parameters: [...Array.from({ length: 8 }, (_, bit): EffectParameterDefinition => ({ id: `bit${bit}`, label: `Bit ${bit} source`, type: 'select', default: bit < 4 ? 'secondary' : 'primary', options: [{ value: 'primary', label: 'Primary' }, { value: 'secondary', label: 'Secondary' }] })), { id: 'mapping', label: 'Channel mapping', type: 'select', default: 'rgb', options: [{ value: 'rgb', label: 'RGB' }, { value: 'grb', label: 'Swap R/G' }, { value: 'brg', label: 'Rotate channels' }] }],
  body: `vec4 secondary = texture(uSecondary, uv); vec3 other = straight(secondary);
    if (p_mapping > 1.5) other = other.brg; else if (p_mapping > 0.5) other = other.grb;
    ivec3 a = ivec3(floor(color * 255.0 + 0.5)), b = ivec3(floor(other * 255.0 + 0.5));
    int mask = ${Array.from({ length: 8 }, (_, bit) => `(p_bit${bit} > 0.5 ? ${1 << bit} : 0)`).join(' | ')};
    ivec3 mixed = (a & ivec3(255 ^ mask)) | (b & ivec3(mask));
    float alpha = max(source.a, secondary.a); finalColor = vec4(vec3(mixed) / 255.0 * alpha, alpha);`,
});
