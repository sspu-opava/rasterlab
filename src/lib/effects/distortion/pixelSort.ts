import { numberParameter as n, shaderEffect } from '../core/shader';
import { copyBody, multipassEffect } from '../core/multipass';
import type { EffectParameterDefinition } from '../core/types';
const parameters: EffectParameterDefinition[] = [
  { id: 'direction', label: 'Sort direction', type: 'select', default: 'horizontal', options: ['horizontal', 'vertical'].map(value => ({ value, label: value })) },
  { id: 'metric', label: 'Sort metric', type: 'select', default: 'luminance', options: ['luminance', 'hue', 'saturation'].map(value => ({ value, label: value })) },
  { id: 'order', label: 'Sort order', type: 'select', default: 'ascending', options: ['ascending', 'descending'].map(value => ({ value, label: value })) },
  n('threshold', 'Sort threshold', 0.1, 0, 1), n('interval', 'Sort interval / px', 16, 2, 64, 1),
];
const metadata = { category: 'Distortion', parameters, description: 'Skutečné řazení sousedních pixelů uvnitř intervalů; hodnoty pod prahem oddělují úseky.' };
const initialize = shaderEffect({ ...metadata, id: 'pixel-sort-initialize', name: 'Pixel sort initialize', body: copyBody });
const step = shaderEffect({ ...metadata, parameters: [...parameters, n('phase', 'Phase', 0, 0, 256, 1)], id: 'pixel-sort-step', name: 'Pixel sort step',
  helpers: `float sortMetric(vec4 value) {
    vec3 rgb = straight(value); float hi = max(rgb.r, max(rgb.g, rgb.b)), lo = min(rgb.r, min(rgb.g, rgb.b)), delta = hi - lo;
    if (p_metric < 0.5) return luminance(rgb);
    if (p_metric > 1.5) return hi > 0.00001 ? delta / hi : 0.0;
    if (delta < 0.00001) return 0.0;
    float hue = hi == rgb.r ? (rgb.g - rgb.b) / delta : (hi == rgb.g ? (rgb.b - rgb.r) / delta + 2.0 : (rgb.r - rgb.g) / delta + 4.0);
    return fract(hue / 6.0 + 1.0);
  }`,
  body: `float pixel = floor(p_direction < 0.5 ? uv.x * uSize.x : uv.y * uSize.y);
    float local = mod(pixel, p_interval);
    float offset = mod(local + p_phase, 2.0) < 0.5 ? 1.0 : -1.0;
    vec2 neighborUV = uv + (p_direction < 0.5 ? vec2(offset / uSize.x, 0.0) : vec2(0.0, offset / uSize.y));
    vec4 neighbor = sampleImage(neighborUV);
    float a = sortMetric(source), b = sortMetric(neighbor);
    bool inside = local + offset >= 0.0 && local + offset < p_interval && all(greaterThanEqual(neighborUV, vec2(0.0))) && all(lessThan(neighborUV, vec2(1.0)));
    bool swap = offset > 0.0 ? a > b : a < b;
    if (p_order > 0.5) swap = offset > 0.0 ? a < b : a > b;
    finalColor = inside && source.a > 0.0 && neighbor.a > 0.0 && a >= p_threshold && b >= p_threshold && swap ? neighbor : source;`,
});
const finish = shaderEffect({ ...metadata, id: 'pixel-sort-finish', name: 'Pixel sort finish', body: copyBody });
export const pixelSort = multipassEffect({ ...metadata, id: 'pixel-sort', name: 'Pixel Sort', version: '1.0.0', inputs: [] }, { initialize, step, finish, passes: p => Number(p.interval) });
