import { get, writable } from 'svelte/store';
import { AssetManager } from '../assets/AssetManager';
import { createDocument, createRasterLayer, layerDefaults } from '../document/factory';
import type { EffectInstance, LayerNode, RasterDocument } from '../document/types';
import { logError } from '../utils/logger';
import { CommandHistory } from '../history/CommandHistory';
import { effectRegistry } from '../effects';
import { validateParameter, validateParameters } from '../effects/core/parameters';
import type { ParameterValue } from '../effects/core/types';
import { ProjectSerializer } from '../project/ProjectSerializer';
import { decodeProject, pickProject, saveProject } from '../project/files';
import { exportDocument } from '../project/export';
import type { ExportFormat } from '../project/export';
import { createPreset, instantiatePreset, type EffectPreset } from '../presets/presets';
import { readRecovery, writeRecovery, clearRecovery, recoverySnapshot, type RecoverySnapshot } from '../project/recovery';
import { findLayer, layerEntries, layerLocked, mapLayers, removeLayer, reparentLayer, assertLayerGraph } from '../document/layers';
import { generatorRegistry } from '../generators';

export const assets = new AssetManager();
export const documentStore = writable(createDocument());
export const assetStore = writable(assets.list());
export const selectedLayerId = writable<string | null>(null);
export const selectedEffectId = writable<string | null>(null);
export const effectErrors = writable(new Map<string, string>());
export const status = writable('Připraveno');
export const errorMessage = writable('');
export const importing = writable(false);
export const busy = writable(false);
export const recoverableProject = writable<RecoverySnapshot | null>(null);
export const recoveryStatus = writable('');
export const projectPath = writable<string | null>(null);
export const historyState = writable({ canUndo: false, canRedo: false, dirty: false, undoLabel: '', redoLabel: '' });
export const tool = writable<'select' | 'pan'>('select');
export const viewportStore = writable({ zoom: 1, x: 0, y: 0 });
export const viewAction = writable<{ type: 'fit' | 'actual'; sequence: number }>({ type: 'fit', sequence: 0 });
export function requestView(type: 'fit' | 'actual'): void { viewAction.update(value => ({ type, sequence: value.sequence + 1 })); }
const history = new CommandHistory<RasterDocument>(get(documentStore), document => {
  documentStore.set(document);
  if (!findLayer(document.layers, get(selectedLayerId))) selectedLayerId.set(document.layers[0]?.id ?? null);
}, () => historyState.set({ canUndo: history.canUndo, canRedo: history.canRedo, dirty: history.dirty, undoLabel: history.undoLabel, redoLabel: history.redoLabel }));
function commit(label: string, transform: (document: RasterDocument) => RasterDocument, mergeKey?: string): void {
  const before = get(documentStore); const result = transform(before);
  if (result === before || JSON.stringify(before.layers) === JSON.stringify(result.layers)) return;
  const after = { ...result, modifiedAt: new Date().toISOString() };
  history.execute({ label, before, after, mergeKey }, Boolean(mergeKey));
}
export function undo(): void { if (!get(busy) && !get(importing)) history.undo(); }
export function redo(): void { if (!get(busy) && !get(importing)) history.redo(); }
export function finishEdit(): void { history.endMerge(); }
export function reportError(error: unknown): void {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Operace se nezdařila.';
  errorMessage.set(message); logError('DOCUMENT', message, error);
}
export async function importFiles(files: Iterable<File>): Promise<void> {
  if (get(importing) || get(busy)) return;
  importing.set(true); errorMessage.set('');
  try { for (const file of files) { try { const asset = await assets.import(file); assetStore.set(assets.list()); addAssetLayer(asset.id); status.set(`Importováno: ${asset.name}`); } catch (error) { reportError(error); } } }
  finally { importing.set(false); }
}
export function addAssetLayer(id: string): void {
  const asset = assets.get(id); if (!asset || get(busy)) return;
  const count = (layers: LayerNode[]): number => layers.reduce((total, layer) => total + 1 + (layer.type === 'group' ? count(layer.children) : 0), 0);
  if (count(get(documentStore).layers) >= 100) { reportError(new Error('Dokument může obsahovat nejvýše 100 vrstev.')); return; }
  const layer = createRasterLayer(asset, get(documentStore));
  commit('Přidat vrstvu', document => ({ ...document, layers: [layer, ...document.layers] })); selectedLayerId.set(layer.id);
}
export function updateLayer(id: string, patch: Partial<LayerNode>, merge = true): void {
  if (get(busy)) return;
  const bounded = (value: number, min = -1e6, max = 1e6) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0));
  patch = { ...patch };
  if (patch.name !== undefined) patch.name = patch.name.slice(0, 256) || 'Layer';
  if (patch.opacity !== undefined) patch.opacity = bounded(patch.opacity, 0, 1);
  if (patch.position) patch.position = { x: bounded(patch.position.x), y: bounded(patch.position.y) };
  if (patch.scale) patch.scale = { x: bounded(patch.scale.x, 0.01, 100), y: bounded(patch.scale.y, 0.01, 100) };
  if (patch.rotation !== undefined) patch.rotation = bounded(patch.rotation);
  const continuous = Object.keys(patch).every(key => ['opacity', 'position', 'scale', 'rotation'].includes(key));
  const entry = layerEntries(get(documentStore).layers).find(entry => entry.layer.id === id);
  if (!entry || entry.inheritedLock || (entry.layer.locked && !Object.keys(patch).every(key => key === 'locked' || key === 'visible'))) return;
  commit('Upravit vrstvu', document => ({ ...document, layers: mapLayers(document.layers, layer => layer.id === id ? { ...layer, ...patch } as LayerNode : layer) }), merge && continuous ? `layer:${id}:${Object.keys(patch).join(',')}` : undefined);
}
export function deleteLayer(id: string): void {
  const document = get(documentStore), layer = findLayer(document.layers, id);
  if (!layer || layerLocked(document.layers, id) || get(busy)) return;
  if (layer.type === 'group' && layerEntries(layer.children).some(entry => entry.layer.locked)) { reportError(new Error('Skupina obsahuje zamčené vrstvy.')); return; }
  const removed = new Set([id, ...(layer.type === 'group' ? layerEntries(layer.children).map(entry => entry.layer.id) : [])]);
  commit('Odstranit vrstvu', document => ({ ...document, layers: mapLayers(removeLayer(document.layers, id), item => ({ ...item, effects: item.effects.map(effect => ({ ...effect, inputs: Object.fromEntries(Object.entries(effect.inputs).filter(([, ref]) => !removed.has(ref))) })) })) }));
}
export function reorderLayer(id: string, targetId: string): void {
  if (get(busy) || layerLocked(get(documentStore).layers, id)) return;
  commit('Přesunout vrstvu', document => {
    const entries = layerEntries(document.layers), fromEntry = entries.find(entry => entry.layer.id === id), toEntry = entries.find(entry => entry.layer.id === targetId);
    if (!fromEntry || !toEntry || fromEntry.parentId !== toEntry.parentId) return document;
    const reorder = (siblings: LayerNode[]) => { const next = [...siblings], from = next.findIndex(layer => layer.id === id), to = next.findIndex(layer => layer.id === targetId); next.splice(to, 0, next.splice(from, 1)[0]); return next; };
    return { ...document, layers: fromEntry.parentId ? mapLayers(document.layers, item => item.id === fromEntry.parentId && item.type === 'group' ? { ...item, children: reorder(item.children) } : item) : reorder(document.layers) };
  });
}
export function newDocument(width: number, height: number): void {
  history.reset(createDocument(width, height)); selectedLayerId.set(null); selectedEffectId.set(null); projectPath.set(null);
  status.set('Nový dokument'); errorMessage.set(''); requestView('fit');
}
export function addEffect(layerId: string, effectId: string): void {
  const definition = effectRegistry.get(effectId); if (!definition) return;
  const layer = findLayer(get(documentStore).layers, layerId);
  if (!layer || layerLocked(get(documentStore).layers, layerId) || get(busy)) return;
  if (layer.effects.length >= 32) { reportError(new Error('Vrstva může obsahovat nejvýše 32 efektů.')); return; }
  const candidates = layerEntries(get(documentStore).layers).map(entry => entry.layer).filter(layer => layer.id !== layerId);
  const other = candidates.find(candidate => { try { assertLayerGraph(mapLayers(get(documentStore).layers, item => item.id === layerId ? { ...item, effects: [...item.effects, { id: 'candidate', effectId, enabled: true, parameters: {}, inputs: { secondary: candidate.id } }] } : item)); return true; } catch { return false; } });
  const effect: EffectInstance = { id: crypto.randomUUID(), effectId, enabled: true, parameters: validateParameters(definition, {}), inputs: other && definition.inputs.length ? { secondary: other.id } : {} };
  editEffects(layerId, effects => [...effects, effect], 'Přidat efekt'); selectedEffectId.set(effect.id);
}
function editEffects(layerId: string, transform: (effects: EffectInstance[]) => EffectInstance[], label: string, mergeKey?: string): void {
  if (get(busy) || layerLocked(get(documentStore).layers, layerId)) return;
  commit(label, document => ({ ...document, layers: mapLayers(document.layers, layer => layer.id === layerId ? { ...layer, effects: transform(layer.effects) } : layer) }), mergeKey);
}
export function setEffectEnabled(layerId: string, id: string, enabled: boolean): void { editEffects(layerId, effects => effects.map(effect => effect.id === id ? { ...effect, enabled } : effect), 'Přepnout efekt'); }
export function deleteEffect(layerId: string, id: string): void { editEffects(layerId, effects => effects.filter(effect => effect.id !== id), 'Odstranit efekt'); }
export function moveEffect(layerId: string, id: string, targetId: string): void {
  editEffects(layerId, effects => { const next = [...effects]; const from = next.findIndex(effect => effect.id === id); const to = next.findIndex(effect => effect.id === targetId); if (from >= 0 && to >= 0) next.splice(to, 0, next.splice(from, 1)[0]); return next; }, 'Přesunout efekt');
}
export function setEffectParameter(layerId: string, id: string, key: string, value: ParameterValue): void {
  editEffects(layerId, effects => effects.map(effect => {
    if (effect.id !== id) return effect;
    const parameter = effectRegistry.get(effect.effectId)?.parameters.find(parameter => parameter.id === key); if (!parameter) return effect;
    return { ...effect, parameters: { ...effect.parameters, [key]: validateParameter(parameter, value) } };
  }), 'Upravit parametr efektu', `effect:${id}:${key}`);
}
export function setEffectInput(layerId: string, id: string, inputId: string, reference: string): void {
  if (reference === layerId) return;
  const layers = get(documentStore).layers;
  try { assertLayerGraph(mapLayers(layers, layer => layer.id === layerId ? { ...layer, effects: layer.effects.map(effect => { if (effect.id !== id) return effect; const inputs = { ...effect.inputs }; if (reference) inputs[inputId] = reference; else delete inputs[inputId]; return { ...effect, inputs }; }) } : layer)); }
  catch (error) { reportError(error); return; }
  editEffects(layerId, effects => effects.map(effect => {
    if (effect.id !== id) return effect;
    const inputs = { ...effect.inputs }; if (reference) inputs[inputId] = reference; else delete inputs[inputId]; return { ...effect, inputs };
  }), 'Změnit vstup efektu');
}
export function resetEffect(layerId: string, id: string): void {
  editEffects(layerId, effects => effects.map(effect => { const definition = effectRegistry.get(effect.effectId); return effect.id === id && definition ? { ...effect, parameters: validateParameters(definition, {}) } : effect; }), 'Resetovat efekt');
}
export function duplicateEffect(layerId: string, id: string): void {
  const layer = findLayer(get(documentStore).layers, layerId), original = layer?.effects.find(effect => effect.id === id);
  if (!layer || layerLocked(get(documentStore).layers, layerId) || !original || get(busy)) return;
  if (layer.effects.length >= 32) { reportError(new Error('Vrstva může obsahovat nejvýše 32 efektů.')); return; }
  const copy = { ...original, id: crypto.randomUUID(), parameters: { ...original.parameters }, inputs: { ...original.inputs } };
  editEffects(layerId, effects => effects.flatMap(effect => effect.id === id ? [effect, copy] : [effect]), 'Duplikovat efekt'); selectedEffectId.set(copy.id);
}
export function capturePreset(layerId: string, name: string, effectId?: string): EffectPreset {
  const document = get(documentStore), layer = findLayer(document.layers, layerId);
  if (!layer) throw new Error('Vyberte vrstvu.');
  return createPreset(name, effectId ? layer.effects.filter(effect => effect.id === effectId) : layer.effects, document.layers);
}
export function applyPreset(layerId: string, preset: EffectPreset, bindings: Record<string, string>, replace = false): void {
  if (get(busy) || get(importing)) throw new Error('Počkejte na dokončení operace.');
  if (layerLocked(get(documentStore).layers, layerId)) throw new Error('Vrstva nebo nadřazená skupina je zamčená.');
  const result = instantiatePreset(preset, get(documentStore).layers, layerId, bindings, replace);
  editEffects(layerId, () => result, replace ? 'Nahradit stack presetem' : 'Použít preset');
  selectedEffectId.set(result.at(-1)?.id ?? null); status.set(`Použit preset: ${preset.name}`);
}
export function addGenerator(generatorId: string): void {
  const definition = generatorRegistry.get(generatorId); if (!definition || get(busy) || get(importing)) return;
  if (layerEntries(get(documentStore).layers).length >= 100) { reportError(new Error('Maximum je 100 vrstev.')); return; }
  const layer: LayerNode = { ...layerDefaults(definition.name), type: 'generated', generatorId, parameters: validateParameters(definition, {}) };
  commit('Přidat generátor', document => ({ ...document, layers: [layer, ...document.layers] })); selectedLayerId.set(layer.id);
}
export function setGeneratorParameter(layerId: string, key: string, value: ParameterValue): void {
  const layers = get(documentStore).layers, layer = findLayer(layers, layerId);
  if (get(busy) || layerLocked(layers, layerId) || layer?.type !== 'generated') return;
  const parameter = generatorRegistry.get(layer.generatorId)?.parameters.find(parameter => parameter.id === key); if (!parameter) return;
  commit('Upravit generátor', document => ({ ...document, layers: mapLayers(document.layers, item => item.id === layerId && item.type === 'generated' ? { ...item, parameters: { ...item.parameters, [key]: validateParameter(parameter, value) } } : item) }), `generator:${layerId}:${key}`);
}
export function groupSelectedLayer(id: string): void {
  const document = get(documentStore), layer = findLayer(document.layers, id);
  if (!layer || layerLocked(document.layers, id) || get(busy)) return;
  const group: LayerNode = { ...layerDefaults('Group'), type: 'group', children: [layer] };
  const next = mapLayers(document.layers, item => item.id === id ? group : item);
  try { assertLayerGraph(next); commit('Seskupit vrstvu', document => ({ ...document, layers: next })); selectedLayerId.set(group.id); } catch (error) { reportError(error); }
}
export function moveLayerToGroup(id: string, parentId: string | null): void {
  if (get(busy)) return;
  try { const next = reparentLayer(get(documentStore).layers, id, parentId); commit('Změnit skupinu vrstvy', document => ({ ...document, layers: next })); } catch (error) { reportError(error); }
}
export async function saveCurrentProject(saveAs = false): Promise<void> {
  if (get(busy) || get(importing)) return; busy.set(true); errorMessage.set('');
  const snapshot = get(documentStore);
  try {
    const result = await saveProject(ProjectSerializer.create(snapshot, assets), assets, get(projectPath), saveAs);
    if (result) { projectPath.set(result.path); history.markSaved(snapshot); if (!get(recoverableProject)) await recoveryOperation(clearRecovery).catch(() => {}); status.set('Projekt uložen'); }
  } catch (error) { reportError(error); } finally { busy.set(false); }
}
export async function loadProjectJson(json: string, path: string | null = null, nativeAssets: { id: string; bytes: number[] }[] = [], embeddedBlobs: Record<string, Blob> = {}): Promise<void> {
  const loaded = await decodeProject(json, nativeAssets, embeddedBlobs);
  assets.replaceWith(loaded.assets); assetStore.set(assets.list()); history.reset(loaded.project.document);
  selectedEffectId.set(null); projectPath.set(path); errorMessage.set(''); status.set('Projekt otevřen'); requestView('fit');
}
export async function openNativeProject(): Promise<void> {
  if (get(busy) || get(importing)) return; busy.set(true);
  try { const result = await pickProject(); if (result) await loadProjectJson(result.json, result.path, result.assets); }
  catch (error) { reportError(error); } finally { busy.set(false); }
}
export async function exportCurrentDocument(format: ExportFormat, quality: number): Promise<boolean> {
  if (get(busy) || get(importing)) return false; busy.set(true); errorMessage.set('');
  try { const result = await exportDocument(get(documentStore), format, quality); if (result) status.set(`Exportováno: ${format.toUpperCase()}`); return result; }
  catch (error) { reportError(error); return false; } finally { busy.set(false); }
}

let recoveryQueue = Promise.resolve();
function recoveryOperation(action: () => Promise<void>): Promise<void> {
  const result = recoveryQueue.then(action); recoveryQueue = result.catch(error => recoveryStatus.set(`Obnova: ${error instanceof Error ? error.message : 'úložiště není dostupné'}`)); return result;
}
/** Started once by the app; pending startup recovery is never overwritten by a blank document. */
export function startRecovery(): () => void {
  let mounted = true, timer: ReturnType<typeof setTimeout> | undefined;
  const unsubscribers: (() => void)[] = [];
  void readRecovery().then(record => {
    if (!mounted) return; recoverableProject.set(record);
    const schedule = () => {
      clearTimeout(timer);
      if (get(recoverableProject) || get(busy) || get(importing)) return;
      const document = get(documentStore), dirty = get(historyState).dirty;
      timer = setTimeout(() => {
        if (!mounted || get(recoverableProject) || get(busy) || get(importing) || get(documentStore) !== document) return;
        if (!dirty) { void recoveryOperation(clearRecovery).catch(() => {}); recoveryStatus.set(''); return; }
        try {
          const snapshot = recoverySnapshot(document, assets, get(projectPath));
          recoveryStatus.set('Ukládám kopii obnovy…');
          void recoveryOperation(async () => { await writeRecovery(snapshot); if (get(documentStore) === document) recoveryStatus.set(`Kopie obnovy: ${new Date(snapshot.writtenAt).toLocaleTimeString()}`); }).catch(() => {});
        } catch (error) { recoveryStatus.set(`Obnova: ${error instanceof Error ? error.message : 'chyba kopie'}`); }
      }, dirty ? 15000 : 0);
    };
    for (const store of [documentStore, historyState, busy, importing, recoverableProject, projectPath]) unsubscribers.push(store.subscribe(schedule));
  }).catch(error => recoveryStatus.set(`Obnova: ${error instanceof Error ? error.message : 'úložiště není dostupné'}`));
  return () => { mounted = false; clearTimeout(timer); unsubscribers.forEach(unsubscribe => unsubscribe()); };
}
export async function discardRecovery(): Promise<void> { await recoveryOperation(clearRecovery); recoverableProject.set(null); recoveryStatus.set(''); }
export async function restoreRecovery(): Promise<void> {
  const record = get(recoverableProject); if (!record || get(busy) || get(importing)) return;
  busy.set(true);
  try { await loadProjectJson(ProjectSerializer.stringify(record.project), record.path, [], record.blobs); history.markUnsaved(); recoverableProject.set(null); status.set('Obnoven rozpracovaný projekt · uložte jej'); }
  catch (error) { reportError(error); }
  finally { busy.set(false); }
}
