import { numberParameter as n, shaderEffect } from '../core/shader';
export const echoFrames = shaderEffect({
  id: 'echo-frames', name: 'Echo Frames', category: 'Collage', description: 'Průsvitné prostorové kopie originálu s geometricky klesající opacitou.',
  parameters: [n('copies', 'Copies', 8, 1, 32, 1), n('offsetX', 'Echo X / px', 12, -200, 200, 1), n('offsetY', 'Echo Y / px', 5, -200, 200, 1), n('scale', 'Echo scale', 0.96, 0.25, 1.5), n('decay', 'Opacity decay', 0.72, 0, 1)],
  body: `finalColor = source;
    for (int i = 1; i < 32; i++) {
      if (float(i) >= p_copies) break;
      float index = float(i), scale = pow(p_scale, index), opacity = pow(p_decay, index);
      vec2 point = ((uv - 0.5) * uSize - vec2(p_offsetX, p_offsetY) * index) / max(scale, 0.000001);
      vec4 echo = sampleImage(point / uSize + 0.5) * opacity;
      finalColor = echo + finalColor * (1.0 - echo.a);
    }`,
});
