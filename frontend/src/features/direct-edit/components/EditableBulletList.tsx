/**
 * EditableBulletList -- A list of bullet points where each bullet is a
 * separate EditableField. Handles Enter (add new bullet) and Backspace
 * (delete empty bullet) keyboard interactions.
 *
 * Covers: EDIT-03 (bullet keyboard handling).
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { EditableField } from './EditableField';
import type { BulletItem } from '../../../types';
import styles from './EditableBulletList.module.css';

interface EditableBulletListProps {
  bullets: BulletItem[];
  basePath: string;
  onBulletChange: (index: number, text: string) => void;
  onBulletAdd: (afterIndex: number) => void;
  onBulletRemove: (index: number) => void;
  onInput?: () => void;
}

export function EditableBulletList({
  bullets,
  basePath,
  onBulletChange,
  onBulletAdd,
  onBulletRemove,
  onInput,
}: EditableBulletListProps) {
  const [hasFocus, setHasFocus] = useState(false);
  const bulletRefs = useRef<Map<string, HTMLElement>>(new Map());
  const pendingFocusId = useRef<string | null>(null);

  // Focus management: after React re-renders with new bullets, focus the pending one
  useEffect(() => {
    if (pendingFocusId.current) {
      const el = bulletRefs.current.get(pendingFocusId.current);
      if (el) {
        el.focus();
        // Place cursor at end using Selection API
        const range = document.createRange();
        const sel = window.getSelection();
        if (sel) {
          range.selectNodeContents(el);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
      pendingFocusId.current = null;
    }
  }, [bullets]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        // Commit current text before adding
        const el = e.currentTarget as HTMLElement;
        onBulletChange(index, el.textContent ?? '');
        onBulletAdd(index);
        // The new bullet will be at index+1; we need to know its ID
        // after the state update. Set pending focus to be resolved in useEffect.
        // The parent is expected to create the new bullet -- we set a flag that
        // the next useEffect will handle focus.
      }
      if (
        e.key === 'Backspace' &&
        (e.currentTarget as HTMLElement).textContent === ''
      ) {
        if (bullets.length > 1) {
          e.preventDefault();
          // Focus previous bullet after removal
          const prevIndex = Math.max(0, index - 1);
          const prevBullet = bullets[prevIndex === index ? index + 1 : prevIndex];
          if (prevBullet) {
            pendingFocusId.current = prevBullet.id;
          }
          onBulletRemove(index);
        }
      }
    },
    [bullets, onBulletChange, onBulletAdd, onBulletRemove]
  );

  const setRef = useCallback(
    (bulletId: string) => (el: HTMLElement | null) => {
      if (el) {
        bulletRefs.current.set(bulletId, el);
      } else {
        bulletRefs.current.delete(bulletId);
      }
    },
    []
  );

  return (
    <div
      className={styles.bulletList}
      onFocus={() => setHasFocus(true)}
      onBlur={(e) => {
        // Only blur if focus leaves the bullet list entirely
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setHasFocus(false);
        }
      }}
    >
      {bullets.map((bullet, i) => (
        <div key={bullet.id} className={styles.bulletItem}>
          <span className={styles.bulletMarker} />
          <EditableField
            ref={setRef(bullet.id)}
            value={bullet.text}
            fieldPath={`${basePath}[${i}]`}
            onFieldChange={(_, text) => onBulletChange(i, text)}
            tag="div"
            onKeyDown={(e) => handleKeyDown(e, i)}
            onInput={onInput}
            placeholder="Describe an achievement..."
          />
        </div>
      ))}
      {hasFocus && (
        <div className={styles.hint}>
          Press Enter to add a new bullet
        </div>
      )}
    </div>
  );
}
