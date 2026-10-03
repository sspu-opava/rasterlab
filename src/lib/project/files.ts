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
export async function saveProject(project: ProjectFile, assets: AssetManager, path: string | null, saveAs: boolean): Promise<{ path: string | null } | null> {
  if (!isTauri()) {
    const portable = await ProjectSerializer.portable(project, assets);
    download(new Blob([ProjectSerializer.stringify(portable)], { type: 'application/json' }), `${project.document.name}.json`);
    return { path: null };
  }
  const selected = !saveAs && path ? path : await save({ title: 'Uložit projekt RasterLab', defaultPath: path ?? 'project.json', filters: [{ name: 'RasterLab project', extensions: ['json'] }] });
  if (!selected) return null;
  const payload: NativeAsset[] = await Promise.all(project.assets.map(async asset => ({ id: asset.id, bytes: Array.from(new Uint8Array(await assets.getBlob(asset.id)!.arrayBuffer())) })));
  await invoke('save_project', { path: selected, projectJson: ProjectSerializer.stringify(project), assets: payload });
  return { path: selected };
}
export async function pickProject(): Promise<{ json: string; path: string; assets: NativeAsset[] } | null> {
  if (!isTauri()) return null;
  const path = await open({ title: 'Otevřít projekt RasterLab', multiple: false, filters: [{ name: 'RasterLab project', extensions: ['json'] }] });
  if (!path || Array.isArray(path)) return null;
  const loaded = await invoke<{ projectJson: string; assets: NativeAsset[] }>('load_project', { path });
  return { json: loaded.projectJson, path, assets: loaded.assets };
}
/** Load into a temporary manager; commit only when every bitmap decodes and matches its metadata. */
export async function decodeProject(json: string, nativeAssets: NativeAsset[] = [], embeddedBlobs: Record<string, Blob> = {}): Promise<{ project: ProjectFile; assets: AssetManager }> {
  const project = ProjectDeserializer.parse(json); const manager = new AssetManager();
  try {
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
