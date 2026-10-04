export const TRANSFORM_LIMIT = 1e6;
export const SCALE_MIN = 0.01;
export const SCALE_MAX = 100;
export function boundedTransform(value: number, scale = false): number {
  return Math.max(scale ? SCALE_MIN : -TRANSFORM_LIMIT, Math.min(scale ? SCALE_MAX : TRANSFORM_LIMIT, Number.isFinite(value) ? value : 0));
}
export function assertScale(value: unknown): asserts value is { x: number; y: number } {
  if (!value || typeof value !== 'object') throw new Error('Neplatné měřítko.');
  for (const key of ['x', 'y'] as const) { const number = (value as Record<string, unknown>)[key]; if (typeof number !== 'number' || !Number.isFinite(number) || number < SCALE_MIN || number > SCALE_MAX) throw new Error('Měřítko musí být v rozsahu 0,01–100.'); }
}
