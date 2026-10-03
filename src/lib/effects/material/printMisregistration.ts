import { numberParameter as n, shaderEffect } from '../core/shader';
export const printMisregistration = shaderEffect({
  id: 'print-misregistration', name: 'Print Misregistration', category: 'Material', description: 'Samostatné tiskové RGB/CMYK separace s posunem, rotací a rozostřením.',
  parameters: [{ id: 'mode', label: 'Print mode', type: 'select', default: 'cmyk', options: [{ value: 'cmyk', label: 'CMYK' }, { value: 'rgb', label: 'RGB' }] }, ...['cyan', 'magenta', 'yellow', 'black'].flatMap((channel, index) => [n(`${channel}X`, `${channel} X / px`, index === 0 ? 6 : index === 1 ? -6 : 0, -100, 100, 1), n(`${channel}Y`, `${channel} Y / px`, index === 2 ? 3 : 0, -100, 100, 1)]), n('rotation', 'Separation rotation', 0.5, -15, 15), n('blur', 'Print blur / px', 0.5, 0, 8, 0.5)],
  helpers: `vec4 printSample(vec2 point, vec2 offset, float angle, float blur) {
    vec2 pixel = (point - 0.5) * uSize;
    point = (mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * pixel - offset) / uSize + 0.5;
    if (blur == 0.0) return sampleImage(point);
    vec2 delta = vec2(blur) / uSize;
    return (sampleImage(point) * 2.0 + sampleImage(point + vec2(delta.x, 0.0)) + sampleImage(point - vec2(delta.x, 0.0)) + sampleImage(point + vec2(0.0, delta.y)) + sampleImage(point - vec2(0.0, delta.y))) / 6.0;
  }
  vec4 cmyk(vec4 sampleColor) { if (sampleColor.a < 0.00001) return vec4(0.0); vec3 rgb = straight(sampleColor); float black = 1.0 - max(rgb.r, max(rgb.g, rgb.b)); return vec4((1.0 - rgb - black) / max(1.0 - black, 0.00001), black); }`,
  body: `vec4 c = printSample(uv, vec2(p_cyanX, p_cyanY), radians(p_rotation), p_blur);
    vec4 m = printSample(uv, vec2(p_magentaX, p_magentaY), -radians(p_rotation), p_blur);
    vec4 y = printSample(uv, vec2(p_yellowX, p_yellowY), radians(p_rotation) * 0.5, p_blur);
    vec4 k = printSample(uv, vec2(p_blackX, p_blackY), 0.0, p_blur);
    float alpha = max(max(c.a, m.a), max(y.a, k.a));
    vec3 result = p_mode < 0.5 ? (1.0 - vec3(cmyk(c).r, cmyk(m).g, cmyk(y).b)) * (1.0 - cmyk(k).a) : vec3(straight(c).r, straight(m).g, straight(y).b);
    finalColor = vec4(clamp(result, 0.0, 1.0) * alpha, alpha);`,
});
