import { shaderEffect, numberParameter } from '../core/shader';
export const rgbShift = shaderEffect({
  id: 'rgb-shift', name: 'RGB Shift', category: 'Distortion', description: 'Nezávislé posunutí RGB kanálů v dokumentových pixelech.',
  parameters: ['red', 'green', 'blue'].flatMap(channel => ['X', 'Y'].map(axis => numberParameter(`${channel}${axis}`, `${channel[0].toUpperCase()}${channel.slice(1)} ${axis}`, channel === 'red' && axis === 'X' ? 12 : channel === 'blue' && axis === 'X' ? -12 : 0, -200, 200, 1))),
  body: 'vec4 r = sampleImage(uv - vec2(p_redX, p_redY) / uSize); vec4 g = sampleImage(uv - vec2(p_greenX, p_greenY) / uSize); vec4 b = sampleImage(uv - vec2(p_blueX, p_blueY) / uSize); float a = max(r.a, max(g.a, b.a)); finalColor = vec4(vec3(straight(r).r, straight(g).g, straight(b).b) * a, a);',
});
