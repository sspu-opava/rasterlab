import { Filter, UniformGroup, Texture } from 'pixi.js';
import type { EffectDefinition, EffectParameterDefinition, EffectRenderContext, ParameterValue } from './types';
const vertex = `#version 300 es
in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;
void main() {
  vec2 p = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  p.x = p.x * (2.0 / uOutputTexture.x) - 1.0;
  p.y = p.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  gl_Position = vec4(p, 0.0, 1.0);
  vTextureCoord = aPosition * uOutputFrame.zw * uInputSize.zw;
}`;
export const numberParameter = (id: string, label: string, value: number, min: number, max: number, step = 0.01): EffectParameterDefinition => ({ id, label, type: step === 1 ? 'integer' : 'float', default: value, min, max, step });
export const seedParameter: EffectParameterDefinition = { id: 'seed', label: 'Seed', type: 'seed', default: 76123, min: 0, max: 999999, step: 1 };

/** Each module supplies declarations and shader body; this is the shared WebGL adapter. */
export interface ShaderUniform { value: number | Float32Array; type: 'f32' | 'vec2<f32>' | 'vec4<f32>'; size?: number }
export interface ShaderData {
  declarations: string;
  create(): { uniforms: Record<string, ShaderUniform>; update(parameters: Record<string, ParameterValue>): void };
}
export function shaderEffect(specification: Omit<EffectDefinition, 'createRenderer' | 'version' | 'inputs'> & { body: string; helpers?: string; data?: ShaderData; inputs?: EffectDefinition['inputs'] }): EffectDefinition {
  const { body, helpers = '', data, ...metadata } = specification;
  const definition: EffectDefinition = {
    ...metadata, version: '1.0.0', inputs: metadata.inputs ?? [],
    createRenderer(context) {
      const generated = data?.create();
      const declarations = definition.parameters.filter(parameter => !['layer', 'color'].includes(parameter.type)).map(parameter => `uniform float p_${parameter.id};`).join('\n');
      const fragment = `#version 300 es
precision highp float;
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform sampler2D uSecondary;
uniform vec4 uInputSize;
uniform vec2 uSize;
${declarations}
${data?.declarations ?? ''}
vec4 sampleImage(vec2 uv) {
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return vec4(0.0);
  return texture(uTexture, uv * uSize * uInputSize.zw);
}
vec3 straight(vec4 c) { return c.a > 0.00001 ? c.rgb / c.a : vec3(0.0); }
float luminance(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float hash(vec3 v) { v = fract(v * vec3(0.1031, 0.1030, 0.0973)); v += dot(v, v.yxz + 33.33); return fract((v.x + v.y) * v.z); }
${helpers}
void main() {
  vec2 uv = vTextureCoord / (uSize * uInputSize.zw);
  vec4 source = sampleImage(uv);
  vec3 color = straight(source);
  ${body}
}`;
      const uniforms: Record<string, ShaderUniform> = { ...generated?.uniforms, uSize: { value: new Float32Array([context.width, context.height]), type: 'vec2<f32>' } };
      for (const parameter of definition.parameters) {
        if (!['layer', 'color'].includes(parameter.type)) uniforms[`p_${parameter.id}`] = { value: 0, type: 'f32' };
      }
      const group = new UniformGroup(uniforms);
      const filter = Filter.from({ gl: { vertex, fragment, name: definition.id }, resources: { effectUniforms: group, uSecondary: (context.secondary ?? Texture.EMPTY).source }, resolution: 1, padding: 0, clipToViewport: false });
      return {
        filter,
        update(parameters: Record<string, ParameterValue>, next: EffectRenderContext) {
          generated?.update(parameters);
          if (generated) for (const [name, uniform] of Object.entries(generated.uniforms)) group.uniforms[name] = uniform.value;
          (group.uniforms.uSize as Float32Array).set([next.width, next.height]);
          for (const parameter of definition.parameters) {
            const value = parameters[parameter.id];
            if (parameter.type === 'select') group.uniforms[`p_${parameter.id}`] = parameter.options!.findIndex(option => option.value === value);
            else if (parameter.type === 'boolean') group.uniforms[`p_${parameter.id}`] = value ? 1 : 0;
            else if (typeof value === 'number') group.uniforms[`p_${parameter.id}`] = value;
          }
          group.update();
          filter.resources.uSecondary = (next.secondary ?? Texture.EMPTY).source;
        },
        destroy() { filter.destroy(); },
      };
    },
  };
  return definition;
}
