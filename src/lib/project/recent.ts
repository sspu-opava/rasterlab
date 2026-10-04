import { writable } from 'svelte/store';
export interface RecentProject { name: string; key: string; path?: string; updated: number }
interface RecentRecord extends RecentProject { file?: Blob }
export const recentProjects = writable<RecentProject[]>([]);
let queue = Promise.resolve();
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('rasterlab-recent', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('projects', { keyPath: 'key' });
    request.onerror = () => reject(request.error); request.onsuccess = () => resolve(request.result);
  });
}
export async function refreshRecent(): Promise<void> {
  const db = await database();
  try { const records = await new Promise<RecentRecord[]>((resolve, reject) => { const request = db.transaction('projects').objectStore('projects').getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); recentProjects.set(records.sort((a, b) => b.updated - a.updated).map(({ file, ...metadata }) => metadata)); } finally { db.close(); }
}
export function rememberProject(name: string, path?: string, file?: Blob): Promise<void> {
  // Bound persistent bitmap storage to five 32 MiB entries. Large browser files remain usable.
  if (file && file.size > 32 * 1024 * 1024) return Promise.resolve();
  const operation = queue.then(async () => {
    const db = await database();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('projects', 'readwrite'), store = transaction.objectStore('projects');
        store.put({ name, key: path ?? name, path, file, updated: Date.now() } satisfies RecentRecord);
        const request = store.getAll(); request.onsuccess = () => { const records = (request.result as RecentRecord[]).sort((a, b) => b.updated - a.updated); for (const record of records.slice(5)) store.delete(record.key); };
        transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error);
      });
    } finally { db.close(); }
    await refreshRecent();
  });
  queue = operation.catch(() => {}); return operation;
}
export async function readRecent(key: string): Promise<RecentRecord | undefined> {
  const db = await database();
  try { return await new Promise((resolve, reject) => { const request = db.transaction('projects').objectStore('projects').get(key); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); } finally { db.close(); }
}
