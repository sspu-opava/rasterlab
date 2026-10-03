import { numberParameter as n, shaderEffect } from '../core/shader';
export const surfaceRelief = shaderEffect({
  id: 'surface-relief', name: 'Surface Relief', category: 'Material', description: 'Jas obrazu tvoří výškovou mapu s nastavitelnou hloubkou a osvětlením.',
  parameters: [n('depth', 'Relief depth', 4, 0, 20), n('lightAngle', 'Light angle', 45, 0, 360, 1), n('softness', 'Softness / px', 2, 0.5, 16, 0.5)],
  helpers: `float reliefHeight(vec2 point, float fallback) {
    vec4 value = sampleImage(point);
    return value.a > 0.00001 ? luminance(straight(value)) : fallback;
  }`,
  body: `float height = luminance(color);
    vec2 stepSize = vec2(p_softness) / uSize;
    vec2 gradient = vec2(reliefHeight(uv + vec2(stepSize.x, 0.0), height) - reliefHeight(uv - vec2(stepSize.x, 0.0), height), reliefHeight(uv + vec2(0.0, stepSize.y), height) - reliefHeight(uv - vec2(0.0, stepSize.y), height));
    vec3 normal = normalize(vec3(-gradient * p_depth / (2.0 * p_softness), 1.0));
    float angle = radians(p_lightAngle);
    vec3 light = normalize(vec3(cos(angle), sin(angle), 1.0));
    float shade = max(0.0, dot(normal, light) / light.z);
    finalColor = vec4(clamp(color * shade, 0.0, 1.0) * source.a, source.a);`,
});
