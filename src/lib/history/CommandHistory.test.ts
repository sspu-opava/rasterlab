import { describe, expect, it } from 'vitest';
import { CommandHistory } from './CommandHistory';
describe('command history', () => {
  it('undoes, redoes and clears the future after a new edit', () => {
    let current = 0; const history = new CommandHistory(0, value => current = value);
    history.execute({ label: 'add', before: 0, after: 1 }); history.execute({ label: 'add', before: 1, after: 2 });
    history.undo(); expect(current).toBe(1); history.redo(); expect(current).toBe(2); history.undo();
    history.execute({ label: 'edit', before: 1, after: 3 }); expect(history.canRedo).toBe(false); expect(current).toBe(3);
  });
  it('coalesces slider updates into one command without crossing a save boundary', () => {
    let current = 0; const history = new CommandHistory(0, value => current = value);
    history.execute({ label: 'slider', before: 0, after: 1, mergeKey: 'opacity' }, true);
    history.execute({ label: 'slider', before: 1, after: 2, mergeKey: 'opacity' }, true);
    history.markSaved(); history.execute({ label: 'slider', before: 2, after: 3, mergeKey: 'opacity' }, true);
    history.undo(); expect(current).toBe(2); expect(history.dirty).toBe(false); history.undo(); expect(current).toBe(0);
  });
  it('tracks the actual saved snapshot during asynchronous saving', () => {
    const history = new CommandHistory(0, () => {}); history.execute({ label: 'add', before: 0, after: 1 });
    history.execute({ label: 'add', before: 1, after: 2 }); history.markSaved(1);
    expect(history.dirty).toBe(true); history.undo(); expect(history.dirty).toBe(false);
  });
});
