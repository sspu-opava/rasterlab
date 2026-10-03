import { writable, get } from 'svelte/store';
import { parsePreset, type EffectPreset } from './presets';

export const libraryError = writable('');
function read(key: string): unknown { try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; } }
function persist(key: string, value: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); libraryError.set(''); return true; }
  catch { libraryError.set('Nastavení nelze uložit. Zkontrolujte dostupné místo a povolení úložiště.'); return false; }
}
const storedFavorites = read('rasterlab.favorites.v1');
export const favoriteEffects = writable<string[]>(Array.isArray(storedFavorites) ? storedFavorites.filter(value => typeof value === 'string' && value.length <= 80).slice(0, 256) : []);
export function toggleFavorite(id: string): void { const current = get(favoriteEffects); const next = current.includes(id) ? current.filter(value => value !== id) : [...current, id]; if (persist('rasterlab.favorites.v1', next)) favoriteEffects.set(next); }
function loadPresets(): EffectPreset[] {
  const stored = read('rasterlab.presets.v1'); if (!Array.isArray(stored)) return [];
  const result: EffectPreset[] = [];
  for (const value of stored.slice(0, 100)) { try { const preset = parsePreset(JSON.stringify(value)); if (!result.some(item => item.id === preset.id)) result.push(preset); } catch { libraryError.set('Některé uložené presety jsou neplatné a nebyly načteny.'); } }
  return result;
}
export const userPresets = writable(loadPresets());
export function storePreset(preset: EffectPreset): boolean {
  const current = get(userPresets), next = [preset, ...current.filter(item => item.id !== preset.id)];
  if (next.length > 100) { libraryError.set('Knihovna může obsahovat nejvýše 100 uživatelských presetů.'); return false; }
  if (!persist('rasterlab.presets.v1', next)) return false; userPresets.set(next); return true;
}
export function removePreset(id: string): void { const next = get(userPresets).filter(item => item.id !== id); if (persist('rasterlab.presets.v1', next)) userPresets.set(next); }
export const stackClipboard = writable<EffectPreset | null>(null);
