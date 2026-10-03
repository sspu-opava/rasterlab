import { numberParameter as n, seedParameter, shaderEffect } from '../core/shader';
export const signalCollapse = shaderEffect({
  id: 'signal-collapse', name: 'Signal Collapse', category: 'Distortion', description: 'Řízená kombinace scanline posunu, kvantizace, bitového ořezu, prahu a ztráty kanálů.',
  parameters: [n('intensity', 'Intensity', 0.65, 0, 1), n('blockSize', 'Block size / px', 16, 2, 256, 1), n('threshold', 'Signal threshold', 0.5, 0, 1), n('channelLoss', 'Channel loss', 0.35, 0, 1), seedParameter],
  body: `if (p_intensity == 0.0) finalColor = source;
    else {
      vec2 block = floor(uv * uSize / p_blockSize);
      float row = floor(uv.y * uSize.y / p_blockSize);
      float drift = (hash(vec3(row, p_seed, 7.0)) * 2.0 - 1.0) * p_intensity * p_blockSize * 3.0;
      vec4 signal = sampleImage(uv + vec2(drift / uSize.x, 0.0)); vec3 rgb = straight(signal);
      float levels = max(2.0, floor(32.0 * (1.0 - p_intensity)));
      vec3 quantized = floor(rgb * (levels - 1.0) + 0.5) / (levels - 1.0);
      int mask = (255 << int(floor(p_intensity * 6.0))) & 255;
      quantized = vec3(ivec3(floor(quantized * 255.0 + 0.5)) & ivec3(mask)) / 255.0;
      rgb = mix(rgb, quantized, p_intensity);
      if (hash(vec3(block, p_seed + 11.0)) < p_intensity * 0.5) rgb = mix(rgb, vec3(step(p_threshold, luminance(rgb))), p_intensity);
      vec3 keep = step(vec3(p_channelLoss * p_intensity), vec3(hash(vec3(block, p_seed + 1.0)), hash(vec3(block, p_seed + 2.0)), hash(vec3(block, p_seed + 3.0))));
      finalColor = vec4(rgb * keep * signal.a, signal.a);
      if (hash(vec3(block, p_seed + 29.0)) < p_intensity * p_channelLoss * 0.25) finalColor = vec4(0.0);
    }`,
});
