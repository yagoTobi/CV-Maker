/**
 * NamePromptDialog -- Intercepts the first save to collect a CV name.
 *
 * Fires once when useAutoSave detects there is no existing version ID.
 * Centered minimal dialog with auto-focused input, Enter/Escape keyboard support.
 * Follows the ConfirmDialog structural analog (backdrop + dialog fragment pattern).
 */
import { useState, useRef, useEffect } from 'react';
import styles from './NamePromptDialog.module.css';

interface NamePromptDialogProps {
  isOpen: boolean;
  defaultName?: string;
  onSubmit: (name: string) => void;
  onDismiss: () => void;
}

export function NamePromptDialog({ isOpen, defaultName, onSubmit, onDismiss }: NamePromptDialogProps) {
  const [value, setValue] = useState(defaultName ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset value when defaultName changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      setValue(defaultName ?? '');
    }
  }, [isOpen, defaultName]);

  // Auto-focus and select text when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  // Keyboard handling: Escape dismisses, Enter submits
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      } else if (e.key === 'Enter') {
        onSubmit(value.trim() || 'My CV');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onDismiss, onSubmit, value]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSubmit(value.trim() || 'My CV');
  };

  return (
    <>
      <div className={styles.backdrop} onClick={onDismiss} />
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="namePromptHeading"
      >
        <p id="namePromptHeading" className={styles.heading}>Give this CV a name</p>
        <p className={styles.subtext}>You can always rename it later.</p>
        <div className={styles.inputRow}>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="My CV"
            autoFocus
          />
        </div>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onDismiss} type="button">
            Skip for now
          </button>
          <button className={styles.saveBtn} onClick={handleSave} type="button">
            Save CV
          </button>
        </div>
      </div>
    </>
  );
}
