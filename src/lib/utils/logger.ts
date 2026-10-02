type LogCategory = 'DOCUMENT' | 'RENDER' | 'EFFECT' | 'ASSET' | 'PROJECT' | 'PERFORMANCE';
export function log(category: LogCategory, message: string, detail?: unknown): void {
  if (import.meta.env.DEV) console.debug(`[${category}] ${message}`, detail ?? '');
}
export function logError(category: LogCategory, message: string, error: unknown): void {
  console.error(`[${category}] ${message}`, error);
}
