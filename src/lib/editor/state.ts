import { boundedTransform } from '../document/transforms';
import { commitActiveEdit } from './editing';
import { get, writable } from 'svelte/store';
import { AssetManager } from '../assets/AssetManager';
import { createDocument, createRasterLayer, layerDefaults } from '../document/factory';
import type { EffectInstance, LayerNode, LayerMask, RasterDocument } from '../document/types';
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
export const selectedLayerIds = writable<string[]>([]);
export const selectedLayerId = writable<string | null>(null);
selectedLayerId.subscribe(id => selectedLayerIds.update(ids => id && ids.includes(id) ? ids : id ? [id] : []));
export const selectedEffectId = writable<string | null>(null);
export const effectErrors = writable(new Map<string, string>());
export const gpuState = writable<'initializing' | 'ready' | 'lost' | 'unavailable'>('initializing');
export const status = writable('Připraveno');
export const errorMessage = writable('');
export const importing = writable(false);
export const exportProgress = writable({ stage: '', cancellable: false });
let exportController: AbortController | null = null;
export function cancelExport(): void { if (get(exportProgress).cancellable) exportController?.abort(); }
export const busy = writable(false);
export const recoverableProject = writable<RecoverySnapshot | null>(null);
export const recoveryStatus = writable('');
export const projectPath = writable<string | null>(null);
export const historyState = writable({ canUndo: false, canRedo: false, dirty: false, undoLabel: '', redoLabel: '' });
export const tool = writable<'select' | 'pan'>('select');
export const constrainViewport = writable(false);
export const viewportStore = writable({ zoom: 1, x: 0, y: 0 });
export const viewAction = writable<{ type: 'fit' | 'actual'; sequence: number }>({ type: 'fit', sequence: 0 });
export function requestView(type: 'fit' | 'actual'): void { viewAction.update(value => ({ type, sequence: value.sequence + 1 })); }
const history = new CommandHistory<RasterDocument>(get(documentStore), document => {
  documentStore.set(document);
  selectedLayerIds.update(ids => ids.filter(id => Boolean(findLayer(document.layers, id))));
  if (!findLayer(document.layers, get(selectedLayerId))) selectedLayerId.set(document.layers[0]?.id ?? null);
}, () => historyState.set({ canUndo: history.canUndo, canRedo: history.canRedo, dirty: history.dirty, undoLabel: history.undoLabel, redoLabel: history.redoLabel }));
function commit(label: string, transform: (document: RasterDocument) => RasterDocument, mergeKey?: string): void {
  const before = get(documentStore); const result = transform(before);
  if (result === before || JSON.stringify(before) === JSON.stringify(result)) return;
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
  try { for (const file of files) { try { const asset = await assets.import(file); assetStore.set(assets.list()); addAssetLayer(asset.id, true); status.set(`Importováno: ${asset.name}`); } catch (error) { reportError(error); } } }
  finally { importing.set(false); }
}
export function addAssetLayer(id: string, fromImport = false): void {
  const asset = assets.get(id); if (!asset || get(busy) || (get(importing) && !fromImport)) return;
  const count = (layers: LayerNode[]): number => layers.reduce((total, layer) => total + 1 + (layer.type === 'group' ? count(layer.children) : 0), 0);
  if (count(get(documentStore).layers) >= 100) { reportError(new Error('Dokument může obsahovat nejvýše 100 vrstev.')); return; }
  const layer = createRasterLayer(asset, get(documentStore));
  commit('Přidat vrstvu', document => ({ ...document, layers: [layer, ...document.layers] })); selectedLayerId.set(layer.id);
}
export function updateLayer(id: string, patch: Partial<LayerNode>, merge = true): void {
  if (get(busy) || get(importing)) return;
  const bounded = (value: number, min = -1e6, max = 1e6) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0));
  patch = { ...patch };
  if (patch.name !== undefined) patch.name = patch.name.slice(0, 256) || 'Layer';
  if (patch.opacity !== undefined) patch.opacity = bounded(patch.opacity, 0, 1);
  if (patch.position) patch.position = { x: bounded(patch.position.x), y: bounded(patch.position.y) };
  if (patch.scale) patch.scale = { x: boundedTransform(patch.scale.x, true), y: boundedTransform(patch.scale.y, true) };
  if (patch.rotation !== undefined) patch.rotation = bounded(patch.rotation);
  const continuous = Object.keys(patch).every(key => ['opacity', 'position', 'scale', 'rotation'].includes(key));
  const entry = layerEntries(get(documentStore).layers).find(entry => entry.layer.id === id);
  if (!entry || entry.inheritedLock || (entry.layer.locked && !Object.keys(patch).every(key => key === 'locked' || key === 'visible'))) return;
  commit('Upravit vrstvu', document => ({ ...document, layers: mapLayers(document.layers, layer => layer.id === id ? { ...layer, ...patch } as LayerNode : layer) }), merge && continuous ? `layer:${id}:${Object.keys(patch).join(',')}` : undefined);
}
export function deleteLayer(id: string): void {
  const document = get(documentStore), layer = findLayer(document.layers, id);
  if (!layer || layerLocked(document.layers, id) || get(busy) || get(importing)) return;
  if (layer.type === 'group' && layerEntries(layer.children).some(entry => entry.layer.locked)) { reportError(new Error('Skupina obsahuje zamčené vrstvy.')); return; }
  const removed = new Set([id, ...(layer.type === 'group' ? layerEntries(layer.children).map(entry => entry.layer.id) : [])]);
  const referenced = layerEntries(document.layers).filter(({ layer: value }) => !removed.has(value.id) && (value.mask && removed.has(value.mask.sourceId) || value.effects.some(effect => Object.values(effect.inputs).some(ref => removed.has(ref))))).length;
  if (referenced) status.set(`Odstraněn zdroj používaný v ${referenced} vrstvách; vazby byly odpojeny. Zpět je obnoví.`);
  commit('Odstranit vrstvu', document => ({ ...document, layers: mapLayers(removeLayer(document.layers, id), item => { const result = { ...item, effects: item.effects.map(effect => ({ ...effect, inputs: Object.fromEntries(Object.entries(effect.inputs).filter(([, ref]) => !removed.has(ref))) })) }; if (result.mask && removed.has(result.mask.sourceId)) delete result.mask; return result; }) }));
}
export function reorderLayer(id: string, targetId: string): void {
  if (get(busy) || get(importing) || layerLocked(get(documentStore).layers, id)) return;
  commit('Přesunout vrstvu', document => {
    const entries = layerEntries(document.layers), fromEntry = entries.find(entry => entry.layer.id === id), toEntry = entries.find(entry => entry.layer.id === targetId);
    if (!fromEntry || !toEntry || fromEntry.parentId !== toEntry.parentId) return document;
    const reorder = (siblings: LayerNode[]) => { const next = [...siblings], from = next.findIndex(layer => layer.id === id), to = next.findIndex(layer => layer.id === targetId); next.splice(to, 0, next.splice(from, 1)[0]); return next; };
    return { ...document, layers: fromEntry.parentId ? mapLayers(document.layers, item => item.id === fromEntry.parentId && item.type === 'group' ? { ...item, children: reorder(item.children) } : item) : reorder(document.layers) };
  });
}
export function newDocument(width: number, height: number): void {
  if (get(busy) || get(importing)) return;
  const next = createDocument(width, height);
  selectedLayerIds.set([]); assets.clear(); assetStore.set([]); effectErrors.set(new Map());
  history.reset(next); selectedLayerId.set(null); selectedEffectId.set(null); projectPath.set(null);
  status.set('Nový dokument'); errorMessage.set(''); requestView('fit');
}
export function addEffect(layerId: string, effectId: string): void {
  const definition = effectRegistry.get(effectId); if (!definition) return;
  const layer = findLayer(get(documentStore).layers, layerId);
  if (!layer || layerLocked(get(documentStore).layers, layerId) || get(busy) || get(importing)) return;
  if (layer.effects.length >= 32) { reportError(new Error('Vrstva může obsahovat nejvýše 32 efektů.')); return; }
  const candidates = layerEntries(get(documentStore).layers).map(entry => entry.layer).filter(layer => layer.id !== layerId);
  const other = candidates.find(candidate => { try { assertLayerGraph(mapLayers(get(documentStore).layers, item => item.id === layerId ? { ...item, effects: [...item.effects, { id: 'candidate', effectId, enabled: true, parameters: {}, inputs: { secondary: candidate.id } }] } : item)); return true; } catch { return false; } });
  const effect: EffectInstance = { id: crypto.randomUUID(), effectId, enabled: true, parameters: validateParameters(definition, {}), inputs: other && definition.inputs.length ? { secondary: other.id } : {} };
  editEffects(layerId, effects => [...effects, effect], 'Přidat efekt'); selectedEffectId.set(effect.id);
}
function editEffects(layerId: string, transform: (effects: EffectInstance[]) => EffectInstance[], label: string, mergeKey?: string): void {
  if (get(busy) || get(importing) || layerLocked(get(documentStore).layers, layerId)) return;
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
  if (!layer || layerLocked(get(documentStore).layers, layerId) || !original || get(busy) || get(importing)) return;
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
  if (get(busy) || get(importing) || layerLocked(layers, layerId) || layer?.type !== 'generated') return;
  const parameter = generatorRegistry.get(layer.generatorId)?.parameters.find(parameter => parameter.id === key); if (!parameter) return;
  commit('Upravit generátor', document => ({ ...document, layers: mapLayers(document.layers, item => item.id === layerId && item.type === 'generated' ? { ...item, parameters: { ...item.parameters, [key]: validateParameter(parameter, value) } } : item) }), `generator:${layerId}:${key}`);
}
export function groupSelectedLayer(id: string): void {
  const document = get(documentStore), layer = findLayer(document.layers, id);
  if (!layer || layerLocked(document.layers, id) || get(busy) || get(importing)) return;
  const group: LayerNode = { ...layerDefaults('Group'), type: 'group', children: [layer] };
  const next = mapLayers(document.layers, item => item.id === id ? group : item);
  try { assertLayerGraph(next); commit('Seskupit vrstvu', document => ({ ...document, layers: next })); selectedLayerId.set(group.id); } catch (error) { reportError(error); }
}
export function setLayerMask(id: string, patch: Partial<LayerMask> | null, merge = false): void {
  const layers = get(documentStore).layers, layer = findLayer(layers, id);
  if (!layer || get(busy) || get(importing) || layerLocked(layers, id)) return;
  const mask = patch === null ? undefined : { sourceId: '', enabled: true, mode: 'luminance' as const, invert: false, strength: 1, feather: 0, ...layer.mask, ...patch };
  if (mask) { mask.strength = Math.max(0, Math.min(1, Number.isFinite(mask.strength) ? mask.strength : 1)); mask.feather = Math.max(0, Math.min(64, Number.isFinite(mask.feather) ? mask.feather : 0)); }
  const next = mapLayers(layers, item => { if (item.id !== id) return item; const result = { ...item }; if (mask) result.mask = mask; else delete result.mask; return result; });
  try { assertLayerGraph(next); commit('Upravit masku', document => ({ ...document, layers: next }), merge && patch ? `mask:${id}:${Object.keys(patch).join(',')}` : undefined); } catch (error) { reportError(error); }
}
export function duplicateLayer(id: string): void {
  const layers = get(documentStore).layers, layer = findLayer(layers, id);
  if (!layer || get(busy) || get(importing) || layerLocked(layers, id)) return;
  const ids = new Map([layer, ...(layer.type === 'group' ? layerEntries(layer.children).map(entry => entry.layer) : [])].map(item => [item.id, crypto.randomUUID()]));
  const remap = (ref: string) => ids.get(ref) ?? ref;
  const clone = (item: LayerNode): LayerNode => ({ ...structuredClone(item), id: ids.get(item.id)!, effects: item.effects.map(effect => ({ ...structuredClone(effect), id: crypto.randomUUID(), inputs: Object.fromEntries(Object.entries(effect.inputs).map(([key, ref]) => [key, remap(ref)])) })), ...(item.mask ? { mask: { ...item.mask, sourceId: remap(item.mask.sourceId) } } : {}), ...(item.type === 'group' ? { children: item.children.map(clone) } : {}) }) as LayerNode;
  const copy = clone(layer); copy.name = `${layer.name.slice(0, 249)} copy`;
  const insert = (items: LayerNode[]): LayerNode[] => items.flatMap(item => item.id === id ? [copy, item] : [item.type === 'group' ? { ...item, children: insert(item.children) } : item]);
  const next = insert(layers);
  try { assertLayerGraph(next); commit('Duplikovat vrstvu', document => ({ ...document, layers: next })); selectedLayerId.set(copy.id); } catch (error) { reportError(error); }
}
export function moveLayerToGroup(id: string, parentId: string | null): void {
  if (get(busy) || get(importing)) return;
  try { const next = reparentLayer(get(documentStore).layers, id, parentId); commit('Změnit skupinu vrstvy', document => ({ ...document, layers: next })); } catch (error) { reportError(error); }
}
export async function saveCurrentProject(saveAs = false, archive = false): Promise<boolean> {
  if (get(busy) || get(importing)) return false;
  try { commitActiveEdit(); } catch (error) { reportError(error); return false; }
  busy.set(true); errorMessage.set('');
  const snapshot = get(documentStore);
  status.set('Ukládám projekt…');
  try {
    const result = await saveProject(ProjectSerializer.create(snapshot, assets), assets, get(projectPath), saveAs, archive);
    if (result) { projectPath.set(result.path); history.markSaved(snapshot); if (!get(recoverableProject)) await recoveryOperation(clearRecovery).catch(() => {}); status.set('Projekt uložen'); return true; }
    status.set('Uložení zrušeno'); return false;
  } catch (error) { status.set('Uložení se nezdařilo'); reportError(error); return false; } finally { busy.set(false); }
}
let loadingProject = false;
export async function loadProjectJson(json: string, path: string | null = null, nativeAssets: { id: string; bytes: number[] }[] = [], embeddedBlobs: Record<string, Blob> = {}, internal = false): Promise<void> {
  if (loadingProject || get(importing) || (get(busy) && !internal)) throw new Error('Počkejte na dokončení operace.');
  loadingProject = true; const wasBusy = get(busy); busy.set(true);
  try {
  const loaded = await decodeProject(json, nativeAssets, embeddedBlobs);
  assets.replaceWith(loaded.assets); assetStore.set(assets.list()); history.reset(loaded.project.document);
  selectedLayerIds.set([]); selectedEffectId.set(null); effectErrors.set(new Map()); projectPath.set(path); errorMessage.set(''); status.set('Projekt otevřen'); requestView('fit');
  } finally { loadingProject = false; busy.set(wasBusy); }
}
export async function openNativeProject(recentPath?: string): Promise<void> {
  if (get(busy) || get(importing)) return; busy.set(true);
  try { const result = await pickProject(recentPath); if (result) await loadProjectJson(result.json, result.path, result.assets, result.blobs, true); }
  catch (error) { reportError(error); } finally { busy.set(false); }
}
export async function exportCurrentDocument(format: ExportFormat, quality: number): Promise<boolean> {
  if (get(busy) || get(importing)) return false;
  try { commitActiveEdit(); } catch (error) { reportError(error); return false; }
  busy.set(true); errorMessage.set('');
  exportController = new AbortController();
  exportProgress.set({ stage: 'Příprava exportu…', cancellable: true });
  try { const result = await exportDocument(get(documentStore), format, quality, { signal: exportController.signal, progress: (stage, cancellable) => exportProgress.set({ stage, cancellable }) }); if (result) status.set(`Exportováno: ${format.toUpperCase()}`); return result; }
  catch (error) { if (exportController?.signal.aborted) status.set('Export zrušen'); else reportError(error); return false; } finally { exportController = null; exportProgress.set({ stage: '', cancellable: false }); busy.set(false); }
}

let recoveryQueue = Promise.resolve();
let recoveryInitialization: Promise<void> = Promise.resolve();
let recoveryReadFailed = false;
export async function waitForRecovery(): Promise<void> { await recoveryInitialization; }
export async function clearRecoveryForClose(): Promise<void> {
  await waitForRecovery();
  if (get(recoverableProject) || recoveryReadFailed) return;
  await recoveryOperation(clearRecovery).catch(() => {});
}
function recoveryOperation(action: () => Promise<void>): Promise<void> {
  const result = recoveryQueue.then(action); recoveryQueue = result.catch(error => recoveryStatus.set(`Obnova: ${error instanceof Error ? error.message : 'úložiště není dostupné'}`)); return result;
}
/** Started once by the app; pending startup recovery is never overwritten by a blank document. */
export function startRecovery(): () => void {
  let mounted = true, timer: ReturnType<typeof setTimeout> | undefined;
  const unsubscribers: (() => void)[] = [];
  recoveryReadFailed = false;
  recoveryInitialization = readRecovery().then(record => {
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
  }).catch(error => { recoveryReadFailed = true; recoveryStatus.set(`Obnova: ${error instanceof Error ? error.message : 'úložiště není dostupné'}`); });
  return () => { mounted = false; clearTimeout(timer); unsubscribers.forEach(unsubscribe => unsubscribe()); };
}
export async function discardRecovery(): Promise<void> { await recoveryOperation(clearRecovery); recoverableProject.set(null); recoveryStatus.set(''); }
export async function restoreRecovery(): Promise<void> {
  const record = get(recoverableProject); if (!record || get(busy) || get(importing)) return;
  busy.set(true);
  try { await loadProjectJson(ProjectSerializer.stringify(record.project), record.path, [], record.blobs, true); history.markUnsaved(); recoverableProject.set(null); status.set('Obnoven rozpracovaný projekt · uložte jej'); }
  catch (error) { reportError(error); }
  finally { busy.set(false); }
}

export function cleanUnusedAssets(): void {
  if (get(busy) || get(importing)) return;
  const ids = new Set<string>();
  for (const model of history.retainedValues()) for (const { layer } of layerEntries(model.layers)) if (layer.type === 'raster') ids.add(layer.assetId);
  assets.removeUnused(ids); assetStore.set(assets.list()); status.set('Knihovna vyčištěna; zdroje historie zachovány');
}

export function selectLayer(id: string, extend = false): void {
  selectedLayerIds.update(ids => extend ? ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id] : [id]);
  const ids = get(selectedLayerIds); selectedLayerId.set(ids.includes(id) ? id : ids.at(-1) ?? null);
}
export function groupSelection(): void {
  if (get(busy) || get(importing)) return;
  const model = get(documentStore), ids = get(selectedLayerIds).length ? get(selectedLayerIds) : [get(selectedLayerId)!];
  const entries = layerEntries(model.layers).filter(entry => ids.includes(entry.layer.id));
  if (!entries.length || entries.some(entry => entry.parentId !== entries[0].parentId || layerLocked(model.layers, entry.layer.id))) { reportError('Vyberte odemčené vrstvy ve stejné skupině.'); return; }
  const parent = entries[0].parentId, siblings = parent ? (findLayer(model.layers, parent) as Extract<LayerNode, { type: 'group' }>).children : model.layers;
  const indexes = siblings.map((layer, index) => ids.includes(layer.id) ? index : -1).filter(index => index >= 0);
  if (indexes.at(-1)! - indexes[0] + 1 !== indexes.length) { reportError('Seskupení vyžaduje sousední vrstvy, aby zachovalo pořadí obrazu.'); return; }
  const group: LayerNode = { ...layerDefaults('Group'), type: 'group', children: entries.map(entry => entry.layer) };
  const nextSiblings = siblings.flatMap((layer, index) => index === indexes[0] ? [group] : ids.includes(layer.id) ? [] : [layer]);
  const next = parent ? mapLayers(model.layers, layer => layer.id === parent && layer.type === 'group' ? { ...layer, children: nextSiblings } : layer) : nextSiblings;
  try { assertLayerGraph(next); commit('Seskupit vrstvy', document => ({ ...document, layers: next })); selectLayer(group.id); } catch (error) { reportError(error); }
}
export function ungroupLayer(id: string): void {
  if (get(busy) || get(importing)) return;
  const model = get(documentStore), group = findLayer(model.layers, id);
  if (group?.type !== 'group' || layerLocked(model.layers, id)) return;
  const removed = new Set([id]);
  if (group.effects.length || group.mask || group.opacity !== 1 || group.blendMode !== 'normal' || !group.visible || group.position.x || group.position.y || group.rotation || group.scale.x !== 1 || group.scale.y !== 1 || group.children.some(child => child.blendMode !== 'normal' || child.locked) || layerEntries(model.layers).some(({ layer }) => layer.mask?.sourceId === id || layer.effects.some(effect => Object.values(effect.inputs).some(ref => removed.has(ref))))) {
    reportError('Rozpustit lze pouze viditelnou skupinu bez transformací, efektů, masky, změn krytí a vnějších referencí; děti musí mít normální prolnutí a být odemčené. Jinak by se změnil obraz.'); return;
  }
  const dissolve = (layers: LayerNode[]): LayerNode[] => layers.flatMap(layer => layer.id === id ? group.children : [layer.type === 'group' ? { ...layer, children: dissolve(layer.children) } : layer]);
  commit('Rozpustit skupinu', document => ({ ...document, layers: dissolve(document.layers) }));
  selectedLayerIds.set(group.children.map(child => child.id)); selectedLayerId.set(group.children[0]?.id ?? null);
}
export function updateDocument(patch: Pick<RasterDocument, 'name' | 'width' | 'height' | 'background'>): void {
  if (get(busy) || get(importing)) return;
  if (!patch.name.trim() || patch.name.length > 256 || !Number.isInteger(patch.width) || !Number.isInteger(patch.height) || Math.min(patch.width, patch.height) < 1 || Math.max(patch.width, patch.height) > 8192) throw new Error('Neplatný název nebo rozměry dokumentu (1–8192 px).');
  if (!['r', 'g', 'b'].every(key => { const value = patch.background[key as 'r' | 'g' | 'b']; return Number.isInteger(value) && value >= 0 && value <= 255; }) || !Number.isFinite(patch.background.a) || patch.background.a < 0 || patch.background.a > 1) throw new Error('Neplatná barva pozadí.');
  commit('Nastavení dokumentu', document => ({ ...document, ...patch })); requestView('fit');
}
