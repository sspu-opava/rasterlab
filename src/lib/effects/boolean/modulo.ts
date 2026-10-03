/** Normalized modulo mix, also used as a reference for GPU byte-color tests. */
export function moduloChannel(a: number, b: number, divisor: number, gain: number): number {
  const period = Math.max(0.01, divisor);
  return Math.min(1, Math.max(0, ((a + b) % period) / period * gain));
}
