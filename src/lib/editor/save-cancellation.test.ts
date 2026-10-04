import { beforeEach, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
vi.mock('../project/files', async importOriginal => ({ ...await importOriginal<typeof import('../project/files')>(), saveProject: vi.fn() }));
import { saveProject } from '../project/files';
import { busy, documentStore, historyState, newDocument, saveCurrentProject, status, updateDocument } from './state';

beforeEach(() => { newDocument(64, 48); updateDocument({ ...get(documentStore), name: 'Keep my work' }); });

it('keeps dirty work and exits the saving status when a save dialog is cancelled', async () => {
  const document = get(documentStore);
  vi.mocked(saveProject).mockResolvedValueOnce(null);
  expect(await saveCurrentProject()).toBe(false);
  expect(get(documentStore)).toBe(document); expect(get(historyState).dirty).toBe(true);
  expect(get(busy)).toBe(false); expect(get(status)).toBe('Uložení zrušeno');
});

it('keeps dirty work and exits the saving status when writing fails', async () => {
  vi.mocked(saveProject).mockRejectedValueOnce(new Error('Disk unavailable'));
  expect(await saveCurrentProject()).toBe(false);
  expect(get(historyState).dirty).toBe(true); expect(get(busy)).toBe(false);
  expect(get(status)).toBe('Uložení se nezdařilo');
});
