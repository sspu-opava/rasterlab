import { numberParameter as n, shaderEffect } from '../core/shader';
import { copyBody, multipassEffect } from '../core/multipass';
const parameters = [n('depth', 'Recursion depth', 4, 0, 12, 1), n('scale', 'Copy scale', 0.6, 0.15, 0.9), n('rotation', 'Copy rotation', 12, -180, 180, 1), n('spacing', 'Spacing / px', 8, -200, 200, 1)];
const metadata = { parameters, category: 'Collage', description: 'Zmenšený výsledek předchozího kroku se vkládá do původního obrazu.' };
const initialize = shaderEffect({ ...metadata, id: 'recursive-collage-initialize', name: 'Recursive initialize', body: copyBody });
const step = shaderEffect({ ...metadata, id: 'recursive-collage-step', name: 'Recursive step', body: `
  float angle = radians(p_rotation);
  vec2 point = ((uv - 0.5) * uSize - vec2(p_spacing)) / p_scale;
  point = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * point;
  vec4 copy = sampleImage(point / uSize + 0.5), original = texture(uSecondary, uv);
  finalColor = copy + original * (1.0 - copy.a);`,
});
const finish = shaderEffect({ ...metadata, id: 'recursive-collage-finish', name: 'Recursive finish', body: copyBody });
export const recursiveCollage = multipassEffect({ ...metadata, id: 'recursive-collage', name: 'Recursive Collage', version: '1.0.0', inputs: [] }, { initialize, step, finish, passes: p => Number(p.depth) });
