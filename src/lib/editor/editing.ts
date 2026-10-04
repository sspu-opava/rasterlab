export function isEditing(target: EventTarget | null): boolean {
  if (typeof Element === 'undefined' || !(target instanceof Element)) return false;
  const editor = target.closest('input,textarea,[contenteditable]');
  if (editor instanceof HTMLInputElement) return ['text', 'number', 'search', 'email', 'password', 'tel', 'url'].includes(editor.type);
  return editor instanceof HTMLTextAreaElement || editor instanceof HTMLElement && editor.isContentEditable;
}
/** Blur commits native change events before a document snapshot is taken. */
export function commitActiveEdit(): void {
  if (typeof document === 'undefined') return;
  const active = document.activeElement;
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    const validity = active.validity;
    // Spinner increments do not quantize valid document floats.
    const invalid = !validity.valid && (!validity.stepMismatch || validity.badInput || validity.rangeOverflow || validity.rangeUnderflow || validity.valueMissing || validity.typeMismatch || validity.patternMismatch || validity.tooLong || validity.tooShort || validity.customError);
    if (invalid || (active instanceof HTMLInputElement && active.type === 'number' && active.value.trim() === '')) {
      active.reportValidity(); throw new Error('Dokončete platnou hodnotu aktivního pole.');
    }
    active.blur();
  } else if (active instanceof HTMLElement && isEditing(active)) active.blur();
}
