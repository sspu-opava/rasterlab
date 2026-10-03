import { isTauri, invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { download } from '../project/files';
import { parsePreset, type EffectPreset } from './presets';
export async function exportPresetFile(preset: EffectPreset): Promise<void> {
  const json = JSON.stringify(parsePreset(JSON.stringify(preset)), null, 2);
  const name = `${preset.name.replace(/[<>:"/\\|?*]/g, '_')}.preset.json`;
  if (!isTauri()) { download(new Blob([json], { type: 'application/json' }), name); return; }
  const path = await save({ title: 'Exportovat preset RasterLab', defaultPath: name, filters: [{ name: 'RasterLab preset', extensions: ['json'] }] });
  if (path) await invoke('write_preset', { path, presetJson: json });
}
