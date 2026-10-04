export interface Command<T> { label: string; before: T; after: T; mergeKey?: string; timestamp: number }
export class CommandHistory<T> {
  private undoStack: Command<T>[] = [];
  private redoStack: Command<T>[] = [];
  private saved: T | undefined;
  constructor(private current: T, private apply: (value: T) => void, private changed: () => void = () => {}) { this.saved = current; }
  get canUndo(): boolean { return this.undoStack.length > 0; }
  get canRedo(): boolean { return this.redoStack.length > 0; }
  get dirty(): boolean { return this.current !== this.saved; }
  get undoLabel(): string { return this.undoStack.at(-1)?.label ?? ''; }
  get redoLabel(): string { return this.redoStack.at(-1)?.label ?? ''; }
  retainedValues(): T[] { return [this.current, ...this.undoStack.flatMap(command => [command.before, command.after]), ...this.redoStack.flatMap(command => [command.before, command.after])]; }
  execute(command: Omit<Command<T>, 'timestamp'>, merge = false): void {
    const timestamp = Date.now(); const previous = this.undoStack.at(-1);
    if (merge && command.mergeKey && previous?.mergeKey === command.mergeKey && previous.after !== this.saved && timestamp - previous.timestamp < 750) { previous.after = command.after; previous.timestamp = timestamp; }
    else this.undoStack.push({ ...command, timestamp });
    if (this.undoStack.length > 200) this.undoStack.shift();
    this.redoStack = []; this.current = command.after; this.apply(this.current); this.changed();
  }
  endMerge(): void { const command = this.undoStack.at(-1); if (command) command.mergeKey = undefined; }
  undo(): void { this.endMerge(); const command = this.undoStack.pop(); if (!command) return; this.redoStack.push(command); this.current = command.before; this.apply(this.current); this.changed(); this.endMerge(); }
  redo(): void { const command = this.redoStack.pop(); if (!command) return; command.mergeKey = undefined; this.undoStack.push(command); this.current = command.after; this.apply(this.current); this.changed(); }
  markSaved(value: T = this.current): void { this.saved = value; this.changed(); }
  markUnsaved(): void { this.saved = undefined; this.changed(); }
  reset(value: T): void { this.current = value; this.saved = value; this.undoStack = []; this.redoStack = []; this.apply(value); this.changed(); }
}
