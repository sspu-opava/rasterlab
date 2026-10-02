import { get, writable } from 'svelte/store';
import { AssetManager } from '../assets/AssetManager';
import { createDocument, createRasterLayer } from '../document/factory';
import type { LayerNode } from '../document/types';
import { logError } from '../utils/logger';

export const assets = new AssetManager();
export const documentStore = writable(createDocument());
export const assetStore = writable(assets.list());
export const selectedLayerId = writable<string | null>(null);
export const status = writable('Připraveno');
export const errorMessage = writable('');
export const importing = writable(false);
export const tool = writable<'select' | 'pan'>('select');
export const viewportStore = writable({ zoom: 1, x: 0, y: 0 });
export const viewAction = writable<{ type: 'fit' | 'actual'; sequence: number }>({ type: 'fit', sequence: 0 });
export function requestView(type: 'fit' | 'actual'): void { viewAction.update(value => ({ type, sequence: value.sequence + 1 })); }

export function reportError(error: unknown): void {
  const message = error instanceof Error ? error.message : 'Operace se nezdařila.';
  errorMessage.set(message); logError('DOCUMENT', message, error);
}

export async function importFiles(files: Iterable<File>): Promise<void> {
  if (get(importing)) return;
  importing.set(true); errorMessage.set('');
  try {
    for (const file of files) {
      try {
        const asset = await assets.import(file);
        assetStore.set(assets.list());
        addAssetLayer(asset.id);
        status.set(`Importováno: ${asset.name}`);
      } catch (error) { reportError(error); }
    }
  } finally { importing.set(false); }
}

export function addAssetLayer(id: string): void {
  const asset = assets.get(id);
  if (!asset) return;
  const layer = createRasterLayer(asset, get(documentStore));
  documentStore.update(document => ({ ...document, layers: [layer, ...document.layers], modifiedAt: new Date().toISOString() }));
  selectedLayerId.set(layer.id);
}

export function updateLayer(id: string, patch: Partial<LayerNode>): void {
  documentStore.update(document => ({
    ...document, modifiedAt: new Date().toISOString(),
    layers: document.layers.map(layer => layer.id === id && (!layer.locked || Object.keys(patch).every(key => key === 'locked' || key === 'visible')) ? { ...layer, ...patch } as LayerNode : layer),
  }));
}

export function deleteLayer(id: string): void {
  if (get(documentStore).layers.find(layer => layer.id === id)?.locked) return;
  documentStore.update(document => ({ ...document, layers: document.layers.filter(layer => layer.id !== id), modifiedAt: new Date().toISOString() }));
  if (get(selectedLayerId) === id) selectedLayerId.set(null);
}

export function reorderLayer(id: string, targetId: string): void {
  documentStore.update(document => {
    const layers = [...document.layers];
    const from = layers.findIndex(layer => layer.id === id);
    const to = layers.findIndex(layer => layer.id === targetId);
    if (from < 0 || to < 0 || layers[from].locked) return document;
    layers.splice(to, 0, layers.splice(from, 1)[0]);
    return { ...document, layers, modifiedAt: new Date().toISOString() };
  });
}

export function newDocument(width: number, height: number): void {
  documentStore.set(createDocument(width, height)); selectedLayerId.set(null);
  status.set('Nový dokument'); errorMessage.set(''); requestView('fit');
}
