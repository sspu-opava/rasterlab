import { numberParameter as n, seedParameter, shaderEffect } from '../core/shader';
import { foldData } from './foldMap';
export const foldMapEffect = shaderEffect({
  id: 'fold-map', name: 'Fold Map', category: 'Material', description: 'Ostré konečné přehyby s řízeným úhlem, délkou a nasvícením.',
  parameters: [n('folds', 'Folds', 12, 1, 32, 1), n('angle', 'Fold angle', 0, -180, 180, 1), n('length', 'Fold length', 1, 0.1, 2), n('depth', 'Fold depth', 0.5, 0, 1), n('highlight', 'Highlight', 0.6, 0, 1), seedParameter],
  data: { declarations: foldData.declarations, create() { const data = foldData.create(); return { uniforms: data.uniforms, update(p) { data.update({ ...p, foldCount: p.folds }); } }; } },
  body: `vec2 aspect = uSize / min(uSize.x, uSize.y), point = (uv - 0.5) * aspect, gradient = vec2(0.0);
    float angle = radians(p_angle);
    for (int i = 0; i < 32; i++) {
      if (float(i) >= p_folds) break;
      vec4 fold = uFolds[i]; vec2 normal = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * fold.xy;
      float distance = dot(point, normal) - fold.z;
      float along = dot(point, vec2(-normal.y, normal.x));
      float end = 1.0 - smoothstep(p_length * 0.4, p_length * 0.5, abs(along));
      gradient += -normal * fold.w * sign(distance) * exp(-abs(distance) * 80.0) * end;
    }
    gradient /= sqrt(p_folds);
    vec4 paper = sampleImage(uv + gradient * p_depth * 0.08 / aspect);
    float shade = clamp(1.0 + dot(gradient, vec2(0.7071)) * p_depth * p_highlight * 2.0, 0.0, 2.0);
    finalColor = vec4(clamp(straight(paper) * shade, 0.0, 1.0) * paper.a, paper.a);`,
});
