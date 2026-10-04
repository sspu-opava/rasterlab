import { rememberProject } from './recent';
import { packArchive, unpackArchive } from './archive';
import { MAX_PROJECT_BYTES, MAX_ASSET_BYTES } from './limits';
import { isTauri, invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { AssetManager } from '../assets/AssetManager';
import { ProjectSerializer } from './ProjectSerializer';
import { ProjectDeserializer } from './ProjectDeserializer';
import type { ProjectFile } from './ProjectSerializer';
interface NativeAsset { id: string; bytes: number[] }
export function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function saveProject(project: ProjectFile, assets: AssetManager, path: string | null, saveAs: boolean, archive = false): Promise<{ path: string | null } | null> {
  archive ||= Boolean(path?.toLowerCase().endsWith('.rlab'));
  if (archive) {
    const total = project.assets.reduce((sum, asset) => sum + (assets.getBlob(asset.id)?.size ?? 0), new TextEncoder().encode(ProjectSerializer.stringify(project)).byteLength);
    if (total + 65536 > (isTauri() ? MAX_NATIVE_IPC_BYTES : MAX_PROJECT_BYTES)) throw new Error('Přenosný archiv překračuje limit (desktop 32 MiB, browser 300 MiB).');
    const selected = isTauri() ? (!saveAs && path?.toLowerCase().endsWith('.rlab') ? path : await save({ title: 'Uložit přenosný projekt', defaultPath: 'project.rlab', filters: [{ name: 'RasterLab archiv', extensions: ['rlab'] }] })) : null;
    if (isTauri() && !selected) return null;
    const entries = new Map<string, Uint8Array>([['project.json', new TextEncoder().encode(ProjectSerializer.stringify(project))]]);
    for (const asset of project.assets) entries.set(asset.file, new Uint8Array(await assets.getBlob(asset.id)!.arrayBuffer()));
    const bytes = packArchive(entries);
    if (selected) await invoke('write_archive', { path: selected, bytes: Array.from(bytes) }); else { const blob = new Blob([bytes as Uint8Array<ArrayBuffer>]); const name = `${project.document.name}.rlab`; download(blob, name); await rememberProject(name, undefined, blob).catch(() => {}); }
    if (selected) await rememberProject(project.document.name, selected).catch(() => {});
    return { path: selected };
  }
  if (!isTauri()) {
    const portable = await ProjectSerializer.portable(project, assets);
    const blob = new Blob([ProjectSerializer.stringify(portable)], { type: 'application/json' }), name = `${project.document.name}.json`;
    download(blob, name); await rememberProject(name, undefined, blob).catch(() => {});
    return { path: null };
  }
  const selected = !saveAs && path ? path : await save({ title: 'Uložit projekt RasterLab', defaultPath: path ?? 'project.json', filters: [{ name: 'RasterLab project', extensions: ['json'] }] });
  if (!selected) return null;
  const total = project.assets.reduce((sum, asset) => sum + (assets.getBlob(asset.id)?.size ?? 0), new TextEncoder().encode(ProjectSerializer.stringify(project)).byteLength);
  if (total > MAX_NATIVE_IPC_BYTES) throw new Error('Desktopový přenos projektu překračuje limit 32 MiB. Použijte browser nebo menší zdroje.');
  const payload: NativeAsset[] = [];
  for (const asset of project.assets) payload.push({ id: asset.id, bytes: Array.from(new Uint8Array(await assets.getBlob(asset.id)!.arrayBuffer())) });
  await invoke('save_project', { path: selected, projectJson: ProjectSerializer.stringify(project), assets: payload });
  await rememberProject(project.document.name, selected).catch(() => {});
  return { path: selected };
}
export async function pickProject(recentPath?: string): Promise<{ json: string; path: string; assets: NativeAsset[]; blobs?: Record<string, Blob> } | null> {
  if (!isTauri()) return null;
  const path = recentPath ?? await open({ title: 'Otevřít projekt RasterLab', multiple: false, filters: [{ name: 'RasterLab project', extensions: ['json', 'rlab'] }] });
  if (!path || Array.isArray(path)) return null;
  if (path.toLowerCase().endsWith('.rlab')) { const bytes = await invoke<number[]>('read_archive', { path }); const loaded = readArchive(new Uint8Array(bytes)); return { ...loaded, path, assets: [] }; }
  const loaded = await invoke<{ projectJson: string; assets: NativeAsset[] }>('load_project', { path });
  return { json: loaded.projectJson, path, assets: loaded.assets };
}
/** Load into a temporary manager; commit only when every bitmap decodes and matches its metadata. */
export async function decodeProject(json: string, nativeAssets: NativeAsset[] = [], embeddedBlobs: Record<string, Blob> = {}): Promise<{ project: ProjectFile; assets: AssetManager }> {
  const project = ProjectDeserializer.parse(json); const manager = new AssetManager();
  try {
    let total = 0;
    for (const asset of project.assets) { const size = embeddedBlobs[asset.id]?.size ?? nativeAssets.find(value => value.id === asset.id)?.bytes.length ?? (asset.dataUrl ? Math.floor(asset.dataUrl.split(',')[1].length * 3 / 4) - (asset.dataUrl.endsWith('==') ? 2 : asset.dataUrl.endsWith('=') ? 1 : 0) : 0); total += size; if (size > MAX_ASSET_BYTES || total > MAX_PROJECT_BYTES) throw new Error('Vložené obrázky překračují limit projektu.'); }
    for (const asset of project.assets) {
      const native = nativeAssets.find(value => value.id === asset.id);
      const blob = embeddedBlobs[asset.id] ?? (native ? new Blob([new Uint8Array(native.bytes)], { type: asset.mimeType }) : asset.dataUrl ? new Blob([Uint8Array.from(atob(asset.dataUrl.split(',')[1]), character => character.charCodeAt(0))], { type: asset.mimeType }) : null);
      if (!blob) throw new Error('Projekt nemá vložené obrázky. Otevřete jej v desktopové aplikaci se složkou assets.');
      const record = await manager.import(new File([blob], asset.name, { type: asset.mimeType }), asset.id);
      if (record.width !== asset.width || record.height !== asset.height) throw new Error(`Rozměry obrázku ${asset.name} neodpovídají manifestu.`);
    }
    return { project, assets: manager };
  } catch (error) { manager.clear(); throw error; }
}

export const MAX_NATIVE_IPC_BYTES = 32 * 1024 * 1024;
export function readArchive(bytes: Uint8Array): { json: string; blobs: Record<string, Blob> } {
  const entries = unpackArchive(bytes), json = new TextDecoder('utf-8', { fatal: true }).decode(entries.get('project.json'));
  const project = ProjectDeserializer.parse(json), blobs: Record<string, Blob> = {};
  if (entries.size !== project.assets.length + 1) throw new Error('Archiv obsahuje neočekávané položky.');
  for (const asset of project.assets) { const data = entries.get(asset.file); if (!data) throw new Error('Chybí obrázek v archivu.'); blobs[asset.id] = new Blob([data as Uint8Array<ArrayBuffer>], { type: asset.mimeType }); }
  return { json, blobs };
}
export async function readProjectFile(file: File): Promise<{ json: string; blobs: Record<string, Blob> }> {
  if (file.size > MAX_PROJECT_BYTES) throw new Error('Projekt překračuje limit 300 MiB.');
  if (file.name.toLowerCase().endsWith('.rlab')) return readArchive(new Uint8Array(await file.arrayBuffer()));
  return { json: await file.text(), blobs: {} };
}
