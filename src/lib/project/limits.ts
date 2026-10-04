export const MAX_ASSET_BYTES = 100 * 1024 * 1024;
export const MAX_PROJECT_BYTES = 300 * 1024 * 1024;
export function assertProjectSize(json: string): void { if (new TextEncoder().encode(json).byteLength > MAX_PROJECT_BYTES) throw new Error('Projekt přesahuje maximální velikost 300 MB.'); }
export function assertFileSize(file: Blob): void { if (file.size > MAX_ASSET_BYTES) throw new Error('Obrázek přesahuje maximální velikost 100 MiB.'); }
