import { seededRandom } from '../../utils/random';
import type { ShaderData } from '../core/shader';

/** Each fold stores a unit normal, signed location and mountain/valley depth. */
export function generateFolds(count: number, seed: number): Float32Array {
  const random = seededRandom(seed), folds = new Float32Array(count * 4);
  for (let index = 0; index < count; index++) {
    const angle = random() * Math.PI * 2;
    folds.set([Math.cos(angle), Math.sin(angle), (random() - 0.5) * 2, (random() < 0.5 ? -1 : 1) * (0.4 + random() * 0.6)], index * 4);
  }
  return folds;
}
export const foldData: ShaderData = { declarations: 'uniform vec4 uFolds[32];', create() {
  const folds = new Float32Array(128); let key = '';
  return { uniforms: { uFolds: { value: folds, type: 'vec4<f32>', size: 32 } }, update(parameters) {
    const next = `${parameters.foldCount}:${parameters.seed}`;
    if (next === key) return;
    key = next; folds.fill(0); folds.set(generateFolds(Number(parameters.foldCount), Number(parameters.seed)));
  } };
} };
/** Continuous crease field with analytic gradient, shared by displacement and lighting. */
export const foldFieldGLSL = `
vec3 foldField(vec2 point, float count, float sharpness) {
  float height = 0.0; vec2 gradient = vec2(0.0);
  float width = mix(0.18, 0.012, sharpness);
  for (int i = 0; i < 32; i++) {
    if (float(i) >= count) break;
    vec4 fold = uFolds[i];
    float distance = dot(point, fold.xy) - fold.z;
    float ridge = exp(-abs(distance) / width);
    height += fold.w * ridge * width;
    gradient += -fold.w * sign(distance) * ridge * fold.xy;
  }
  return vec3(height, gradient) / sqrt(max(count, 1.0));
}`;
