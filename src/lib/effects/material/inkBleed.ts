import { numberParameter as n, seedParameter, shaderEffect } from '../core/shader';
export const inkBleed = shaderEffect({
  id: 'ink-bleed', name: 'Ink Bleed', category: 'Material', description: 'Tmavý inkoust se šíří do okolí podle hustoty a nepravidelných vláken papíru.',
  parameters: [n('radius', 'Radius / px', 8, 0, 32, 1), n('diffusion', 'Diffusion', 0.65, 0, 1), n('threshold', 'Ink threshold', 0.65, 0, 1), n('texture', 'Fiber texture', 0.5, 0, 1), seedParameter],
  body: `vec3 ink = color;
    if (p_radius > 0.0 && p_diffusion > 0.0) {
      vec2 pixel = floor(uv * uSize);
      float fiber = hash(vec3(pixel, p_seed));
      for (int i = 0; i < 24; i++) {
        float ring = float(i / 8 + 1) / 3.0;
        float angle = float(i % 8) * 0.78539816 + fiber * p_texture * 1.5;
        float radius = p_radius * ring * mix(1.0, 0.45 + fiber * 0.55, p_texture);
        vec4 neighborSample = sampleImage(uv + vec2(cos(angle), sin(angle)) * radius / uSize);
        vec3 neighbor = straight(neighborSample);
        float density = 1.0 - smoothstep(p_threshold, min(1.001, p_threshold + 0.08), luminance(neighbor));
        float weight = p_diffusion * (1.0 - ring * 0.5) * density * neighborSample.a;
        ink = min(ink, mix(color, neighbor, weight));
      }
    }
    finalColor = vec4(ink * source.a, source.a);`,
});
