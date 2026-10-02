export type BooleanOperation = 'AND' | 'OR' | 'XOR' | 'NAND';
export function booleanChannel(a: number, b: number, operation: BooleanOperation): number {
  a = Math.round(a) & 255; b = Math.round(b) & 255;
  if (operation === 'AND') return a & b;
  if (operation === 'OR') return a | b;
  if (operation === 'NAND') return ~(a & b) & 255;
  return a ^ b;
}
export function binaryOperation(a: number, b: number, threshold: number, operation: BooleanOperation): number {
  return booleanChannel(a >= threshold ? 255 : 0, b >= threshold ? 255 : 0, operation);
}
