/**
 * SectionAssistPopover — floating card for AI bullet assistance.
 *
 * Anchors to a bullet rect via a virtual floating-ui reference, shows the
 * section-specific question + quick-fill chips, collects a free-text answer,
 * and fires onGenerate when the user submits.
 *
 * Keyboard behaviour:
 *   Escape  → onClose
 *   Enter on chip / Generate → activate (native button behaviour)
 *   Tab     → natural tab order (textarea → chips → Generate)
 *
 * Focus: textarea is focused on mount.
 * Dismiss: Escape key OR mousedown outside the popover.
 *
 * Anchoring: virtual element via floating-ui (mirrors ChangePopover pattern).
 * `getRect` is invoked on every autoUpdate tick; when null the popover falls
 * back to a centred viewport rect.
 */
import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { useFloating, autoUpdate, offset, flip, shift } from '@floating-ui/react';
import { SECTION_ASSIST_META } from '../../utils/sectionAssist';
import styles from './SectionAssistPopover.module.css';

export interface SectionAssistPopoverProps {
  /** Which section type drives the question + chips (work | education | project | additional). */
  sectionType: string;
  /** Live callback returning the bounding rect of the anchor bullet (null → centred fallback). */
  getRect: () => DOMRect | null;
  /** When true: show spinner, disable Generate. */
  isLoading: boolean;
  /** Generic error string from the generate call; null when no error. */
  error: string | null;
  /** Set when the AI refused the request (content policy, rate limit, etc.). */
  blocked?: boolean;
  /** Refusal or special-case reason ("rate-limited", "content policy", …). */
  reason?: string;
  onGenerate: (answer: string, focus?: string) => void;
  onClose: () => void;
}

const FALLBACK_RECT: DOMRect = (() => {
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

export function SectionAssistPopover({
  sectionType,
  getRect,
  isLoading,
  error,
  blocked,
  reason,
  onGenerate,
  onClose,
}: SectionAssistPopoverProps): React.JSX.Element {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const meta = SECTION_ASSIST_META[sectionType] ?? { question: '', chips: [] as string[] };

  const { refs, floatingStyles } = useFloating({
    open: true,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  // Wire the virtual anchor element — invoked live on every autoUpdate tick.
  useEffect(() => {
    refs.setPositionReference({
      getBoundingClientRect: () => getRect() ?? FALLBACK_RECT,
    });
  }, [refs, getRect]);

  // Focus the textarea on mount.
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Dismiss on mousedown outside the floating element.
  // refs.floating is a stable MutableRefObject; .current is read inside the
  // callback so this is not a stale-closure problem.
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const el = refs.floating.current;
      if (el && !el.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleChipClick = (chip: string) => {
    setText(chip);
    textareaRef.current?.focus();
  };

  const handleGenerate = () => {
    if (!text.trim() || isLoading) return;
    onGenerate(text);
  };

  const isRateLimited = reason === 'rate-limited';
  const isBlocked = blocked === true;
  const canGenerate = !isLoading && text.trim().length > 0;

  return (
    // floating-ui exposes `refs.setFloating` as a stable callback ref. The
    // react-hooks/refs lint rule treats any `refs.x` access as a `.current`
    // read, which is a false positive here.
    <div
      // eslint-disable-next-line react-hooks/refs
      ref={refs.setFloating}
      style={floatingStyles}
      className={styles.popover}
      role="dialog"
      aria-label="AI bullet assistant"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.header}>
        <p className={styles.question}>{meta.question}</p>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className={styles.chips}>
        {meta.chips.map((chip) => (
          <button
            key={chip}
            type="button"
            className={styles.chip}
            onClick={() => handleChipClick(chip)}
          >
            {chip}
          </button>
        ))}
      </div>

      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Describe your contribution…"
        rows={3}
        aria-label="Answer"
      />

      {isLoading && (
        <div role="status" className={styles.spinner} aria-label="Generating…" />
      )}

      {isRateLimited && (
        <p className={styles.rateLimitedMessage}>
          You've hit the rate limit. Please wait a moment before trying again.
        </p>
      )}

      {isBlocked && !isRateLimited && (
        <p className={styles.blockedMessage}>Content blocked: {reason}</p>
      )}

      {error && !isRateLimited && !isBlocked && (
        <p className={styles.errorMessage}>{error}</p>
      )}

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.generateButton}
          onClick={handleGenerate}
          disabled={!canGenerate}
        >
          Generate
        </button>
      </div>
    </div>
  );
}
