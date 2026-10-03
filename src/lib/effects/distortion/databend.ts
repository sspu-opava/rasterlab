import { numberParameter as n, seedParameter, shaderEffect } from '../core/shader';
export const databend = shaderEffect({
  id: 'databend', name: 'Databend', category: 'Distortion', description: 'Vizuální poškození lineárního pixelového proudu posunem bloků a opakováním fragmentů.',
  parameters: [n('blockLength', 'Block length / pixels', 64, 2, 1024, 1), n('shift', 'Stream shift / pixels', 160, 0, 8192, 1), n('repetition', 'Repetition', 3, 1, 16, 1), seedParameter],
  body: `if (p_shift == 0.0 && p_repetition == 1.0) finalColor = source;
    else {
      int width = int(uSize.x), total = width * int(uSize.y), length = int(p_blockLength);
      int pixel = int(floor(uv.y * uSize.y)) * width + int(floor(uv.x * uSize.x));
      int block = pixel / length, cycle = max(1, length / int(p_repetition));
      int shift = int(floor((hash(vec3(float(block), p_seed, 9.0)) * 2.0 - 1.0) * p_shift + 0.5));
      int mapped = block * length + (pixel % length) % cycle + shift;
      mapped = (mapped % total + total) % total;
      finalColor = sampleImage((vec2(float(mapped % width), float(mapped / width)) + 0.5) / uSize);
    }`,
});
