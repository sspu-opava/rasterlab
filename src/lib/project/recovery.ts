import type { AssetManager } from '../assets/AssetManager';
import type { RasterDocument } from '../document/types';
import { ProjectSerializer, type ProjectFile } from './ProjectSerializer';
import { ProjectDeserializer } from './ProjectDeserializer';

export interface RecoverySnapshot { format: 'rasterlab-recovery'; version: 1; writtenAt: string; path: string | null; project: ProjectFile; blobs: Record<string, Blob> }
export function recoverySnapshot(document: RasterDocument, assets: AssetManager, path: string | null): RecoverySnapshot {
  const project = ProjectSerializer.create(document, assets);
  return { format: 'rasterlab-recovery', version: 1, writtenAt: new Date().toISOString(), path, project, blobs: Object.fromEntries(project.assets.map(asset => [asset.id, assets.getBlob(asset.id)!])) };
}
export function validateRecovery(value: unknown): RecoverySnapshot {
  if (!value || typeof value !== 'object') throw new Error('Neplatná zotavovací kopie.');
  const record = value as RecoverySnapshot;
  if (record.format !== 'rasterlab-recovery' || record.version !== 1 || typeof record.writtenAt !== 'string' || !Number.isFinite(Date.parse(record.writtenAt)) || (record.path !== null && typeof record.path !== 'string') || !record.blobs || typeof record.blobs !== 'object') throw new Error('Nepodporovaná zotavovací kopie.');
  const project = ProjectDeserializer.parse(JSON.stringify(record.project));
  let size = 0;
  for (const asset of project.assets) { const blob = record.blobs[asset.id]; if (!(blob instanceof Blob) || blob.type !== asset.mimeType || blob.size > 100 * 1024 * 1024) throw new Error('Zotavovací kopii chybí originální obrázek.'); size += blob.size; }
  if (size > 300 * 1024 * 1024) throw new Error('Zotavovací kopie přesahuje 300 MB.');
  return { ...record, project };
}
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('rasterlab-recovery', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('snapshots');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Úložiště obnovy není dostupné.'));
    request.onblocked = () => reject(new Error('Úložiště obnovy je blokované jiným oknem.'));
  });
}
async function transaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('snapshots', mode), request = run(tx.objectStore('snapshots'));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Zápis obnovy se nezdařil.')); };
    tx.onerror = () => { /* onabort reports the failure after transaction rollback. */ };
  });
}
export async function readRecovery(): Promise<RecoverySnapshot | null> { const value: unknown = await transaction('readonly', store => store.get('workspace')); return value === undefined ? null : validateRecovery(value); }
/** Manifest and original Blobs are committed together in one atomic transaction. */
export async function writeRecovery(snapshot: RecoverySnapshot): Promise<void> { validateRecovery(snapshot); await transaction('readwrite', store => store.put(snapshot, 'workspace')); }
export async function clearRecovery(): Promise<void> { await transaction('readwrite', store => store.delete('workspace')); }
