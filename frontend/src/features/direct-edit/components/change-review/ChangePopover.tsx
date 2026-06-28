/**
 * ChangePopover — Grammarly-style floating card anchored to the active change
 * highlight. Two layout variants per D-18:
 *   • compact  → severity='minor'                 (one-line AFTER + actions)
 *   • expanded → severity='strong'|'add'|'delete' (BEFORE + AFTER blocks)
 *
 * Keyboard nav per D-19:
 *   • ArrowRight → onAdvance('next')
 *   • ArrowLeft  → onAdvance('prev')
 *   • Enter      → onAccept(activeChange.id)
 *   • Escape     → onClose()
 *
 * Anchoring: virtual element via floating-ui (RESEARCH §Pattern 1). `getRect`
 * is a live callback invoked on every autoUpdate tick; when it returns null
 * (fallback per RESEARCH §Pitfall 2) the popover renders centered at viewport
 * mid and emits a console.warn.
 *
 * T-13-03-01: AI-supplied alternative values are rendered as JSX text only —
 * React JSX escapes by default, so no manual HTML-injection escape is needed.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useDismiss,
  useInteractions,
  useRole,
  FloatingFocusManager,
} from '@floating-ui/react';
import type { TailorChange } from '../../../../types';
import type { Severity } from '../../utils/severity';
import styles from './ChangePopover.module.css';

export interface ChangePopoverProps {
  activeChange: TailorChange | null;
  severity: Severity | null;
  /**
   * Live callback returning the bounding rect of the active highlight in
   * viewport space (null when no range is available; component falls back to a
   * centered position). Invoked on every floating-ui autoUpdate tick.
   */
  getRect: () => DOMRect | null;
  onAccept: (changeId: string) => void;
  onSkip: (changeId: string) => void;
  onAdvance: (direction: 'next' | 'prev') => void;
  onClose: () => void;
  /** Index of the currently-selected alternative (defaults to 0). */
  selectedAlternativeIndex?: number;
  /** Pick a different AI alternative for this change. */
  onSelectAlternative?: (changeId: string, index: number) => void;
  /** Edit the suggestion text (becomes a user-authored "Your edit" alternative). */
  onEdit?: (changeId: string, value: string) => void;
}

const DEFAULT_RECT_FALLBACK: DOMRect = (() => {
  // Centered fallback — RESEARCH §Pitfall 2. jsdom doesn't expose innerWidth/
  // innerHeight reliably, so we pick a stable mid-viewport rect.
  const x = typeof window !== 'undefined' ? window.innerWidth / 2 : 400;
  const y = typeof window !== 'undefined' ? window.innerHeight / 2 : 300;
  return {
    width: 0,
    height: 0,
    x,
    y,
    top: y,
    left: x,
    right: x,
    bottom: y,
    toJSON() {
      return this;
    },
  } as DOMRect;
})();

function toDisplayString(value: unknown): string {
  if (Array.isArray(value)) return value.map((v) => String(v)).join(', ');
  if (value == null) return '';
  return String(value);
}

export function ChangePopover({
  activeChange,
  severity,
  getRect,
  onAccept,
  onSkip,
  onAdvance,
  onClose,
  selectedAlternativeIndex,
  onSelectAlternative,
  onEdit,
}: ChangePopoverProps): React.JSX.Element | null {
  // Hooks must be called unconditionally — render is conditional below.
  const open = activeChange !== null;

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: (next) => {
      if (!next) onClose();
    },
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  // Wire the virtual reference element to a live rect callback. floating-ui's
  // autoUpdate invokes getBoundingClientRect each tick, so getRect() is called
  // live (never captured) — this is what keeps the popover tracking on scroll.
  // When getRect() is null, fall back to a centered rect and warn (RESEARCH §Pitfall 2).
  const fallbackWarnedRef = useRef(false);
  useEffect(() => {
    if (!open) return;
    refs.setPositionReference({
      getBoundingClientRect: () => {
        const rect = getRect();
        if (rect) return rect;
        if (!fallbackWarnedRef.current) {
          console.warn(
            '[ChangePopover] getRect() returned null; falling back to centered position.',
          );
          fallbackWarnedRef.current = true;
        }
        return DEFAULT_RECT_FALLBACK;
      },
    });
  }, [refs, getRect, open]);

  const dismiss = useDismiss(context, { escapeKey: true, outsidePress: false });
  const role = useRole(context, { role: 'dialog' });
  const { getFloatingProps } = useInteractions([dismiss, role]);

  const [isEditing, setIsEditing] = useState(false);
  const editableRef = useRef<HTMLDivElement>(null);

  const variant: 'compact' | 'expanded' = severity === 'minor' ? 'compact' : 'expanded';
  const selectedIdx = selectedAlternativeIndex ?? 0;

  const beforeText = useMemo(
    () => (activeChange ? toDisplayString(activeChange.currentValue) : ''),
    [activeChange],
  );
  const afterText = useMemo(() => {
    if (!activeChange) return '';
    if (severity === 'delete') return 'Remove this item';
    const alt = activeChange.alternatives[selectedIdx] ?? activeChange.alternatives[0];
    return alt ? toDisplayString(alt.value) : '';
  }, [activeChange, severity, selectedIdx]);

  // Reset edit mode when the active suggestion changes.
  useEffect(() => {
    setIsEditing(false);
  }, [activeChange?.id]);

  // Auto-focus the contentEditable div when edit mode is entered.
  useEffect(() => {
    if (isEditing) {
      editableRef.current?.focus();
    }
  }, [isEditing]);

  if (!activeChange) return null;

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    // While editing in contentEditable (or textarea), let it own the keys.
    if (
      (e.target as HTMLElement).tagName === 'TEXTAREA' ||
      (e.target as HTMLElement).isContentEditable
    )
      return;
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        onAdvance('next');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        onAdvance('prev');
        break;
      case 'Enter':
        e.preventDefault();
        onAccept(activeChange.id);
        break;
      case 'Escape':
        // Escape is handled by useDismiss → onOpenChange → onClose. We
        // intentionally do NOT call onClose() here to avoid double-firing.
        break;
      default:
        break;
    }
  };

  const severityAccent =
    severity === 'strong' || severity === 'delete'
      ? styles.severityStrong
      : severity === 'add'
        ? styles.severityAdd
        : styles.severityMinor;

  const rootClass = [
    styles.popover,
    variant === 'compact' ? styles.compact : styles.expanded,
    severityAccent,
  ]
    .filter(Boolean)
    .join(' ');

  // Focus management is wired via FloatingFocusManager around inner content
  // so the popover root remains the first DOM element rendered (test contract).
  const showBefore = severity !== 'add';

  // Merge floating-ui's interaction props with our own onKeyDown so that
  // ArrowLeft/ArrowRight/Enter handlers run alongside useDismiss's Escape.
  const floatingProps = getFloatingProps();
  const composedOnKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    handleKeyDown(e);
    const fuiKeyDown = (floatingProps as { onKeyDown?: React.KeyboardEventHandler<HTMLDivElement> })
      .onKeyDown;
    if (fuiKeyDown && !e.defaultPrevented) fuiKeyDown(e);
  };

  // floating-ui exposes `refs.setFloating` as a stable callback ref. The
  // react-hooks/refs lint rule treats any `refs.x` access as a `.current`
  // read, which is a false positive here.
  return (
    <div
      // eslint-disable-next-line react-hooks/refs
      ref={refs.setFloating}
      style={floatingStyles}
      className={rootClass}
      data-variant={variant}
      data-severity={severity ?? ''}
      data-change-id={activeChange.id}
      tabIndex={-1}
      {...floatingProps}
      onKeyDown={composedOnKeyDown}
    >
      <FloatingFocusManager context={context} modal={false} initialFocus={-1}>
        <div className={styles.body}>
          <div className={styles.sectionBadge}>{activeChange.section}</div>
          <div className={styles.description}>{activeChange.description}</div>

          {variant === 'expanded' && showBefore && (
            <div className={styles.beforeBlock}>
              <div className={styles.blockLabel}>BEFORE</div>
              <div className={styles.blockContent}>{beforeText}</div>
            </div>
          )}

          <div className={styles.afterBlock}>
            <div className={styles.blockLabel}>{severity === 'delete' ? 'SUGGESTION' : 'AFTER'}</div>
            {severity === 'delete' ? (
              <div className={styles.blockContent}>Remove this item</div>
            ) : isEditing ? (
              <div
                className={`${styles.blockContent} ${styles.afterBlockEditable}`}
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => {
                  setIsEditing(false);
                  onEdit?.(activeChange.id, e.currentTarget.textContent ?? '');
                }}
                ref={editableRef}
              >
                {afterText}
              </div>
            ) : (
              <div
                className={`${styles.blockContent} ${styles.blockContentClickable}`}
                title="Click to edit"
                onClick={() => setIsEditing(true)}
              >
                {afterText}
              </div>
            )}
          </div>

          {severity !== 'delete' && activeChange.alternatives.length > 1 && (
            <div className={styles.alternatives}>
              {activeChange.alternatives.map((alt, i) => (
                <button
                  key={`${alt.label}-${i}`}
                  type="button"
                  className={`${styles.altChip}${i === selectedIdx ? ` ${styles.altChipSelected}` : ''}`}
                  onClick={() => onSelectAlternative?.(activeChange.id, i)}
                >
                  {alt.label}
                </button>
              ))}
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.skipButton}
              onClick={() => onSkip(activeChange.id)}
              aria-label="Skip change"
            >
              Skip change
            </button>
            <button
              type="button"
              className={styles.acceptButton}
              onClick={() => onAccept(activeChange.id)}
              aria-label="Accept change"
            >
              Accept change
            </button>
          </div>

          <div className={styles.keyboardHint} aria-hidden="true">
            <span>Enter</span>
            <span aria-hidden> · </span>
            <span>Esc</span>
            <span aria-hidden> · </span>
            <span>← →</span>
          </div>
        </div>
      </FloatingFocusManager>
    </div>
  );
}
