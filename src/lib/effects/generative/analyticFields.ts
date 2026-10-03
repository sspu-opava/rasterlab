export const interferenceFieldGLSL = `float interferenceField(vec2 point, float count, float frequency, float angle_, float phase) {
  float waves = 0.0;
  for (int i = 0; i < 12; i++) { if (float(i) >= count) break; float angle = radians(angle_) + float(i) * 3.14159265 / count; waves += cos(dot(point, vec2(cos(angle), sin(angle))) * frequency * 6.2831853 + radians(phase)); }
  return 0.5 + 0.5 * waves / count;
}`;
export const radialFieldGLSL = `float radialFieldValue(vec2 point, float frequency, float twist, float falloff) {
  float radius = length(point), angle = radius < 0.000001 ? 0.0 : atan(point.y, point.x);
  float field = 0.5 + 0.5 * cos(radius * frequency * 6.2831853 + angle * twist);
  return mix(1.0, field, exp(-radius * falloff));
}`;
