import { numberParameter as n, shaderEffect } from '../core/shader';
import { copyBody, multipassEffect } from '../core/multipass';
const parameters = [n('iterations', 'Iterations', 8, 0, 64, 1), n('scale', 'Feedback scale', 0.97, 0.25, 1.5), n('rotation', 'Feedback rotation', 3, -45, 45), n('offsetX', 'Offset X / px', 8, -250, 250, 1), n('offsetY', 'Offset Y / px', 0, -250, 250, 1), n('decay', 'Decay', 0.8, 0, 1)];
const metadata = { category: 'Distortion', parameters, description: 'Opakovaně vrací transformovaný výstup do vstupu a míchá jej s originálem.' };
const initialize = shaderEffect({ ...metadata, id: 'feedback-initialize', name: 'Feedback initialize', body: copyBody });
const step = shaderEffect({ ...metadata, id: 'feedback-step', name: 'Feedback step', body: `
  vec2 point = (uv - 0.5) * uSize - vec2(p_offsetX, p_offsetY);
  float angle = radians(p_rotation);
  point = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * point / p_scale;
  vec4 echo = sampleImage(point / uSize + 0.5);
  finalColor = mix(texture(uSecondary, uv), echo, p_decay);`,
});
const finish = shaderEffect({ ...metadata, id: 'feedback-finish', name: 'Feedback finish', body: copyBody });
export const feedback = multipassEffect({ ...metadata, id: 'feedback', name: 'Feedback', version: '1.0.0', inputs: [] }, { initialize, step, finish, passes: p => Number(p.iterations) });
