import { expect, it } from 'vitest';
import { validateRecovery, type RecoverySnapshot } from './recovery';
import { createDocument } from '../document/factory';
import { CommandHistory } from '../history/CommandHistory';
const snapshot = (): RecoverySnapshot => ({ format: 'rasterlab-recovery', version: 1, writtenAt: new Date().toISOString(), path: null, project: { format: 'rasterlab', version: 1, document: createDocument(), assets: [] }, blobs: {} });
it('validates recovery envelope and embedded originals before replacing a document', () => {
  const record = snapshot(); expect(validateRecovery(record).project.document.id).toBe(record.project.document.id);
  record.project.assets.push({ id: 'image', name: 'test.png', width: 1, height: 1, mimeType: 'image/png', file: 'assets/image.png' });
  expect(() => validateRecovery(record)).toThrow('obrázek');
  record.blobs.image = new Blob(['original'], { type: 'image/png' }); expect(validateRecovery(record).blobs.image).toBe(record.blobs.image);
  record.blobs.image = new Blob(['bad'], { type: 'image/jpeg' }); expect(() => validateRecovery(record)).toThrow();
});
it('rejects future recovery formats, invalid dates and invalid projects', () => {
  for (const patch of [{ version: 2 }, { writtenAt: 'bad date' }, { project: {} }, { path: 12 }]) expect(() => validateRecovery({ ...snapshot(), ...patch })).toThrow();
});
it('restored document remains dirty through undo and becomes clean only after explicit save', () => {
  const history = new CommandHistory({ value: 1 }, () => {}); history.markUnsaved(); expect(history.dirty).toBe(true);
  const before = { value: 1 }, after = { value: 2 }; history.execute({ label: 'edit', before, after }); history.undo(); expect(history.dirty).toBe(true);
  history.markSaved(before); expect(history.dirty).toBe(false);
});
