import { expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
vi.mock('../project/recovery', () => ({ readRecovery: vi.fn(), clearRecovery: vi.fn().mockResolvedValue(undefined), writeRecovery: vi.fn().mockResolvedValue(undefined), recoverySnapshot: vi.fn() }));
import { readRecovery, clearRecovery, type RecoverySnapshot } from '../project/recovery';
import { createDocument } from '../document/factory';
import { clearRecoveryForClose, recoverableProject, startRecovery, waitForRecovery } from './state';
it('waits for startup recovery and keeps an unopened previous project on close', async () => {
  const document = createDocument(); document.name = 'Previous work';
  const pending: RecoverySnapshot = { format: 'rasterlab-recovery', version: 1, writtenAt: '2026-10-04', path: null, project: { format: 'rasterlab', version: 3, document, assets: [] }, blobs: {} };
  let resolve!: (value: RecoverySnapshot | null) => void;
  vi.mocked(readRecovery).mockReturnValue(new Promise<RecoverySnapshot | null>(done => { resolve = done; }));
  const stop = startRecovery();
  resolve(pending); await waitForRecovery(); stop(); await clearRecoveryForClose();
  expect(get(recoverableProject)).toBe(pending); expect(clearRecovery).not.toHaveBeenCalled();
});
it('preserves unknown recovery when startup reading fails, but clears current recovery after successful reading', async () => {
  vi.mocked(readRecovery).mockRejectedValueOnce(new Error('Storage unavailable'));
  let stop = startRecovery(); await waitForRecovery(); stop(); await clearRecoveryForClose(); expect(clearRecovery).not.toHaveBeenCalled();
  vi.mocked(readRecovery).mockResolvedValueOnce(null);
  stop = startRecovery(); await waitForRecovery(); stop(); await clearRecoveryForClose(); expect(clearRecovery).toHaveBeenCalledOnce();
});
