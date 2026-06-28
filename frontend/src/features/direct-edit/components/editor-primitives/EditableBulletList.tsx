/**
 * EditableBulletList -- A list of bullet points where each bullet is a
 * separate EditableField. Handles Enter (add new bullet) and Backspace
 * (delete empty bullet) keyboard interactions.
 *
 * Covers: EDIT-03 (bullet keyboard handling).
 *
 * Phase 13 extension (D-15):
 *   - `addChange` renders an extra ghost <li> AFTER the real bullets, with
 *     contentEditable=false so it's untouchable until accepted.
 *   - `deleteChangeIdsByBulletId` flags real bullets for delete-strikethrough by
 *     forwarding a delete-tier highlightSpan to the underlying EditableField.
 *   - `highlightSpansByBulletId` forwards modify-tier highlightSpans per bullet.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { EditableField } from './EditableField';
import { useSectionAssistTrigger } from './SectionAssistContext';
import type { HighlightSpan } from './EditableField';
import type { BulletItem, TailorChange, TailorAlternative } from '../../../../types';
import styles from './EditableBulletList.module.css';

interface EditableBulletListProps {
  bullets: BulletItem[];
  basePath: string;
  onBulletChange: (index: number, text: string) => void;
  onBulletAdd: (afterIndex: number) => string | void;
  onBulletRemove: (index: number) => void;
  onInput?: () => void;
  readOnly?: boolean;
  rich?: boolean;
  /** Phase 13 D-15: ghost bullet rendered after real bullets for an `add`-type change. */
  addChange?: TailorChange;
  /** Phase 13 D-15: bulletId -> changeId for delete-tier strikethrough on existing bullets. */
  deleteChangeIdsByBulletId?: Map<string, string>;
  /** Phase 13 D-13: bulletId -> highlightSpans for modify-tier highlights on existing bullets. */
  highlightSpansByBulletId?: Map<string, HighlightSpan[]>;
  /** Phase 13 D-16: forwarded to each underlying EditableField. */
  onAutoDismiss?: (changeId: string) => void;
  /** Phase 13: changeId of the active highlight (drives `isActive` on delete spans). */
  activeChangeId?: string | null;
}

/** Coerce the alternatives[0].value (string | string[]) to a single display string. */
function altDisplayString(alt: TailorAlternative | undefined): string {
  if (!alt) return '';
  if (typeof alt.value === 'string') return alt.value;
  if (Array.isArray(alt.value)) return alt.value.join(' ');
  return '';
}

export function EditableBulletList({
  bullets,
  basePath,
  onBulletChange,
  onBulletAdd,
  onBulletRemove,
  onInput,
  readOnly,
  rich,
  addChange,
  deleteChangeIdsByBulletId,
  highlightSpansByBulletId,
  onAutoDismiss,
  activeChangeId,
}: EditableBulletListProps) {
  const [hasFocus, setHasFocus] = useState(false);
  const [emptyStarterHasText, setEmptyStarterHasText] = useState(false);
  const bulletRefs = useRef<Map<string, HTMLElement>>(new Map());
  const pendingFocusId = useRef<string | null>(null);

  const { requestAssist, suppressed } = useSectionAssistTrigger();

  const addFirstBullet = useCallback(
    (text: string) => {
      const newId = onBulletAdd(-1);
      if (newId) {
        pendingFocusId.current = newId;
      }
      if (text.trim() !== '') {
        onBulletChange(0, text);
      }
    },
    [onBulletAdd, onBulletChange]
  );

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
      const el = e.currentTarget as HTMLElement; // capture FIRST — stale after async

      if (
        e.key === ' ' &&
        !e.nativeEvent.isComposing &&
        !suppressed &&
        (el.textContent ?? '').trim() === ''
      ) {
        e.preventDefault();
        requestAssist({ basePath, index, getRect: () => el.getBoundingClientRect(), restoreFocusEl: el });
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        onBulletChange(index, rich ? (el.innerHTML ?? '') : (el.textContent ?? ''));
        const newId = onBulletAdd(index);
        if (newId) {
          pendingFocusId.current = newId;
        }
      }
      if (e.key === 'Backspace' && el.textContent === '') {
        e.preventDefault();
        const prevIndex = Math.max(0, index - 1);
        const prevBullet = bullets[prevIndex === index ? index + 1 : prevIndex];
        if (prevBullet) {
          pendingFocusId.current = prevBullet.id;
        }
        onBulletRemove(index);
      }
    },
    [bullets, onBulletChange, onBulletAdd, onBulletRemove, rich, requestAssist, suppressed, basePath]
  );

  const handleEmptyStarterKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const el = e.currentTarget; // capture FIRST — stale after async

      if (
        e.key === ' ' &&
        !e.nativeEvent.isComposing &&
        !suppressed &&
        (el.textContent ?? '').trim() === ''
      ) {
        e.preventDefault();
        requestAssist({ basePath, index: 0, getRect: () => el.getBoundingClientRect(), restoreFocusEl: el });
        return;
      }

      if (e.key !== 'Enter') return;
      e.preventDefault();
      const text = rich ? (el.innerHTML ?? '') : (el.textContent ?? '');
      addFirstBullet((el.textContent ?? '').trim() === '' ? '' : text);
      el.textContent = '';
      setEmptyStarterHasText(false);
    },
    [addFirstBullet, rich, requestAssist, suppressed, basePath]
  );

  const handleEmptyStarterBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      if ((el.textContent ?? '').trim() === '') return;
      addFirstBullet(rich ? (el.innerHTML ?? '') : (el.textContent ?? ''));
      el.textContent = '';
      setEmptyStarterHasText(false);
    },
    [addFirstBullet, rich]
  );

  const handleEmptyStarterInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      setEmptyStarterHasText((e.currentTarget.textContent ?? '').trim() !== '');
      onInput?.();
    },
    [onInput]
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

  // readOnly mode: render plain list items without editing capabilities
  if (readOnly) {
    return (
      <div className={styles.bulletList}>
        {bullets.map((bullet) => (
          <div key={bullet.id} className={styles.bulletItem}>
            <span className={styles.bulletMarker} />
            {rich
              ? <div dangerouslySetInnerHTML={{ __html: bullet.text }} />
              : <div>{bullet.text}</div>
            }
          </div>
        ))}
      </div>
    );
  }

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
      {bullets.length === 0 && (
        <div className={styles.bulletItem}>
          <span
            className={`${styles.bulletMarker} ${emptyStarterHasText ? '' : styles.emptyStarterMarkerHidden}`}
            data-empty-starter-marker
            data-visible={emptyStarterHasText ? 'true' : 'false'}
          />
          <div
            className={styles.emptyStarter}
            contentEditable={rich ? 'true' : 'plaintext-only'}
            suppressContentEditableWarning
            data-field-path={`${basePath}[0]`}
            data-placeholder="Add bullet..."
            data-rich={rich ? 'true' : undefined}
            onKeyDown={handleEmptyStarterKeyDown}
            onBlur={handleEmptyStarterBlur}
            onInput={handleEmptyStarterInput}
          />
        </div>
      )}
      {bullets.map((bullet, i) => {
        // Compose highlightSpans for this bullet:
        //   1. Pre-supplied modify-tier spans (from highlightSpansByBulletId)
        //   2. Synthetic delete-tier span if this bullet is delete-targeted
        const modifySpans = highlightSpansByBulletId?.get(bullet.id) ?? [];
        const deleteChangeId = deleteChangeIdsByBulletId?.get(bullet.id);
        const composedSpans: HighlightSpan[] = [...modifySpans];
        if (deleteChangeId) {
          composedSpans.push({
            changeId: deleteChangeId,
            severity: 'delete',
            isActive: activeChangeId === deleteChangeId,
            startOffset: 0,
            endOffset: bullet.text.length,
          });
        }
        const spansProp = composedSpans.length > 0 ? composedSpans : undefined;

        return (
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
              rich={rich}
              highlightSpans={spansProp}
              onAutoDismiss={onAutoDismiss}
            />
          </div>
        );
      })}
      {addChange && (
        <div
          className={`${styles.bulletItem} ${styles.ghostBulletItem}`}
          contentEditable={false}
          suppressContentEditableWarning
          data-change-id={addChange.id}
        >
          <span className={`${styles.bulletMarker} ${styles.ghostBulletMarker}`}>+</span>
          <span className={styles.ghostBulletText}>
            {altDisplayString(addChange.alternatives[0])}
          </span>
        </div>
      )}
      {hasFocus && (
        <div className={styles.hint}>
          Press Enter to add a new bullet
        </div>
      )}
    </div>
  );
}
