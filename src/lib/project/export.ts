import { isTauri, invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { download } from './files';
import type { RasterDocument } from '../document/types';
export type ExportFormat = 'png' | 'jpeg' | 'webp';
export interface ExportControl { signal: AbortSignal; progress: (stage: string, cancellable: boolean) => void }
export type Exporter = (document: RasterDocument, format: ExportFormat, quality: number, control?: ExportControl) => Promise<Blob>;
let exporter: Exporter | null = null;
export function setExporter(value: Exporter | null): void { exporter = value; }
export async function exportDocument(document: RasterDocument, format: ExportFormat, quality: number, control?: ExportControl): Promise<boolean> {
  if (!exporter) throw new Error('Renderer není připraven.');
  const extension = format === 'jpeg' ? 'jpg' : format;
  const filename = `${document.name}.${extension}`;
  const path = isTauri() ? await save({ title: 'Export dokumentu', defaultPath: filename, filters: [{ name: format.toUpperCase(), extensions: [extension] }] }) : null;
  if (isTauri() && !path) return false;
  const blob = await exporter(document, format, quality, control);
  control?.signal.throwIfAborted();
  control?.progress('Zapisování souboru…', false);
  if (path && blob.size > 32 * 1024 * 1024) throw new Error('Export překračuje desktopový přenosový limit 32 MiB.');
  if (path) await invoke('write_export', { path, bytes: Array.from(new Uint8Array(await blob.arrayBuffer())) });
  else download(blob, filename);
  return true;
}
