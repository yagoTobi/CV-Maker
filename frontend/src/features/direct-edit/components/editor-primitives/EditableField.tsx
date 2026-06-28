/**
 * EditableField -- Core contentEditable component mapped to a single CVFormData field.
 *
 * Uses the "uncontrolled while focused, controlled while blurred" pattern (D-04):
 * - When focused: React does NOT touch the DOM. Browser owns the element.
 * - When blurred: React syncs value prop to DOM textContent (or innerHTML when rich).
 * - On blur: reads textContent (or innerHTML when rich) and fires onFieldChange if changed.
 *
 * Each CVFormData field = one EditableField instance (D-02).
 * Uses contentEditable="plaintext-only" to strip rich text on paste (D-03), unless
 * rich=true is set, in which case it accepts HTML and provides a paste handler that
 * strips formatting to plain text.
 *
 * Phase 13 extension (D-13/D-14/D-16):
 *   - Optional `highlightSpans` injects <span data-change-id data-severity> wrappers
 *     ONLY when not focused, preserving the cursor-safety contract.
 *   - Optional `onAutoDismiss` fires on first keystroke after a highlight is rendered
 *     (D-16: typing through an AI suggestion auto-skips it).
 *   - Per-span text content is appended via createTextNode (NOT string concat) to mitigate
 *     XSS via crafted CV text (T-13-02-01).
 */
import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { Severity } from '../../utils/severity';
import { useFieldHighlights } from './HighlightContext';
import styles from './EditableField.module.css';

export interface HighlightSpan {
  /** Stable id of the TailorChange this span surfaces. */
  changeId: string;
  /** Severity tier (drives color class). */
  severity: Severity;
  /** True iff this is the active highlight (popover open). */
  isActive: boolean;
  /** Inclusive start offset into the field's plain text. */
  startOffset: number;
  /** Exclusive end offset into the field's plain text. */
  endOffset: number;
}

interface EditableFieldProps {
  value: string;
  fieldPath: string;
  onFieldChange: (path: string, value: string) => void;
  placeholder?: string;
  tag?: 'span' | 'div' | 'h1' | 'h2' | 'p';
  className?: string;
  multiline?: boolean;
  onInput?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  readOnly?: boolean;
  /** When true, enables HTML formatting (bold, italic, links) via execCommand */
  rich?: boolean;
  /** Inline highlight spans (Phase 13 D-13). Injected only when blurred. */
  highlightSpans?: HighlightSpan[];
  /** Auto-dismiss callback fired on first keystroke after a highlight render (Phase 13 D-16). */
  onAutoDismiss?: (changeId: string) => void;
}

/** Severity -> CSS module tier class name. Type-safe lookup, no string interpolation. */
const tierClass: Record<Severity, string> = {
  strong: styles.tierStrong ?? '',
  minor: styles.tierMinor ?? '',
  add: styles.tierAdd ?? '',
  delete: styles.tierDelete ?? '',
};

/**
 * Render `value` into `el` with `<span>` highlight wrappers around the given spans.
 * Spans MUST be sorted ascending by startOffset and MUST NOT overlap.
 * Per-span text is appended via createTextNode — innerHTML is NEVER built from user-typed
 * content, defending against T-13-02-01 (XSS in highlight injection).
 */
function renderHighlightedDom(
  el: HTMLElement,
  value: string,
  spans: HighlightSpan[],
): void {
  // Defensive: sort + filter overlaps (consumer is supposed to guarantee non-overlap).
  const sorted = [...spans].sort((a, b) => a.startOffset - b.startOffset);
  const safe: HighlightSpan[] = [];
  let lastEnd = -1;
  for (const s of sorted) {
    if (s.startOffset < lastEnd) {
      // Skip overlapping span; warn quietly per RESEARCH defensive guidance.
      // eslint-disable-next-line no-console
      console.warn('[EditableField] dropping overlapping highlight span', s.changeId);
      continue;
    }
    if (s.startOffset >= s.endOffset) continue; // skip zero-width / inverted
    safe.push(s);
    lastEnd = s.endOffset;
  }

  // Clear current contents.
  while (el.firstChild) el.removeChild(el.firstChild);

  let cursor = 0;
  for (const s of safe) {
    const before = value.slice(cursor, Math.max(cursor, s.startOffset));
    if (before.length > 0) el.appendChild(document.createTextNode(before));

    const startClamped = Math.max(0, Math.min(s.startOffset, value.length));
    const endClamped = Math.max(startClamped, Math.min(s.endOffset, value.length));
    const inner = value.slice(startClamped, endClamped);

    const span = document.createElement('span');
    const classes = [styles.highlight, tierClass[s.severity]];
    if (s.isActive) classes.push(styles.active ?? '');
    span.className = classes.filter(Boolean).join(' ');
    span.setAttribute('data-change-id', s.changeId);
    span.setAttribute('data-severity', s.severity);
    span.appendChild(document.createTextNode(inner));
    el.appendChild(span);

    cursor = endClamped;
  }

  const tail = value.slice(cursor);
  if (tail.length > 0) el.appendChild(document.createTextNode(tail));
}

/**
 * Whole-field highlight for RICH content: wrap the existing HTML in a single severity span.
 * (Substring offsets aren't supported for rich fields; MVP highlights the whole field.)
 * `value` here is the field's own rich HTML — same trust level as the normal rich render path.
 */
function renderRichHighlight(el: HTMLElement, value: string, span: HighlightSpan): void {
  while (el.firstChild) el.removeChild(el.firstChild);
  const wrapper = document.createElement('span');
  const classes = [styles.highlight, tierClass[span.severity]];
  if (span.isActive) classes.push(styles.active ?? '');
  wrapper.className = classes.filter(Boolean).join(' ');
  wrapper.setAttribute('data-change-id', span.changeId);
  wrapper.setAttribute('data-severity', span.severity);
  wrapper.innerHTML = value;
  el.appendChild(wrapper);
}

export const EditableField = forwardRef<HTMLElement, EditableFieldProps>(
  function EditableField(
    {
      value,
      fieldPath,
      onFieldChange,
      placeholder,
      tag: Tag = 'span',
      className,
      multiline = false,
      onInput,
      onKeyDown,
      readOnly,
      rich = false,
      highlightSpans,
      onAutoDismiss,
    },
    forwardedRef
  ) {
    // Inline-review highlights: explicit prop wins; otherwise pull from HighlightContext
    // by fieldPath (no provider -> undefined -> normal editor behavior).
    const ctxHighlights = useFieldHighlights(fieldPath);
    const effectiveSpans = highlightSpans ?? ctxHighlights.spans;
    const effectiveAutoDismiss = onAutoDismiss ?? ctxHighlights.onAutoDismiss;

    const ref = useRef<HTMLElement>(null);
    const isFocused = useRef(false);
    const isComposing = useRef(false);
    /**
     * D-16: fires onAutoDismiss only on the FIRST input event after a highlight
     * rendering pass. Reset whenever highlightSpans changes shape (new render pass).
     */
    const autoDismissArmed = useRef(false);

    // Expose the DOM element to parent via forwardRef
    useImperativeHandle(forwardedRef, () => ref.current!, []);

    // Sync value prop to DOM ONLY when not focused (D-04, EDIT-06).
    // Phase 13: when highlightSpans present and !rich, render <span> wrappers.
    useEffect(() => {
      if (isFocused.current || !ref.current) return;

      const hasHighlights = !!effectiveSpans && effectiveSpans.length > 0;
      if (hasHighlights && value !== '') {
        const first = effectiveSpans![0];
        if (rich) {
          // Rich content: wrap the whole field in one severity span (substring N/A for rich).
          if (first) renderRichHighlight(ref.current, value, first);
        } else {
          renderHighlightedDom(ref.current, value, effectiveSpans!);
        }
        // Re-arm auto-dismiss for the new highlight render pass.
        autoDismissArmed.current = true;
        return;
      }

      // No highlights: original behavior.
      if (rich) {
        if (value === '' && ref.current.childNodes.length > 0) {
          ref.current.innerHTML = '';
        } else if (ref.current.innerHTML !== value) {
          ref.current.innerHTML = value;
        }
      } else {
        if (value === '' && ref.current.childNodes.length > 0) {
          ref.current.textContent = '';
        } else if (ref.current.textContent !== value) {
          ref.current.textContent = value;
        }
      }
      autoDismissArmed.current = false;
    }, [value, rich, effectiveSpans]);

    const handleFocus = useCallback(() => {
      isFocused.current = true;
      // D-13: strip highlight <span> wrappers on focus so the user types into pristine content.
      if (ref.current && effectiveSpans && effectiveSpans.length > 0) {
        if (rich) {
          ref.current.innerHTML = value;
        } else {
          const plain = ref.current.textContent ?? value;
          ref.current.textContent = plain;
        }
      }
    }, [effectiveSpans, rich, value]);

    const handleBlur = useCallback(() => {
      isFocused.current = false;
      const newValue = rich
        ? (ref.current?.innerHTML ?? '')
        : (ref.current?.textContent ?? '');
      if (newValue !== value) {
        onFieldChange(fieldPath, newValue);
      }
      // After blur, the next render-effect pass will re-inject highlight spans
      // (when value matches). autoDismissArmed will be re-armed at that point.
    }, [value, fieldPath, onFieldChange, rich]);

    const handleInput = useCallback(() => {
      // Gate onInput during IME composition (Pitfall 4)
      if (!isComposing.current) {
        onInput?.();
        // D-16: first keystroke inside a highlighted region auto-dismisses the
        // active span. We fire ONCE per highlight render pass.
        if (
          autoDismissArmed.current &&
          effectiveSpans &&
          effectiveSpans.length > 0 &&
          effectiveAutoDismiss
        ) {
          autoDismissArmed.current = false;
          // Fire for the first span (active span if marked, else first-by-order).
          const active = effectiveSpans.find((s) => s.isActive) ?? effectiveSpans[0];
          if (active) effectiveAutoDismiss(active.changeId);
        }
      }
    }, [onInput, effectiveSpans, effectiveAutoDismiss]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        // Delegate to parent onKeyDown first (EditableBulletList uses this)
        if (onKeyDown) {
          onKeyDown(e);
          if (e.defaultPrevented) return;
        }

        if (e.key === 'Enter' && !multiline) {
          e.preventDefault();
          ref.current?.blur();
        }
        if (e.key === 'Escape') {
          if (ref.current) {
            if (rich) {
              ref.current.innerHTML = value;
            } else {
              ref.current.textContent = value;
            }
          }
          ref.current?.blur();
        }
      },
      [value, multiline, onKeyDown, rich]
    );

    // Strip formatting on paste (only when rich) — inserts plain text at cursor position
    const handlePaste = useCallback((e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
    }, []);

    const handleCompositionStart = useCallback(() => {
      isComposing.current = true;
    }, []);

    const handleCompositionEnd = useCallback(() => {
      isComposing.current = false;
    }, []);

    const handleClick = useCallback((e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' || target.closest('a')) {
        e.preventDefault();
      }
    }, []);

    const combinedClassName = className
      ? `${styles.editableField} ${className}`
      : styles.editableField;

    if (readOnly) {
      if (rich) {
        return <Tag ref={ref} className={combinedClassName} data-field-path={fieldPath} dangerouslySetInnerHTML={{ __html: value }} />;
      }
      return <Tag ref={ref} className={combinedClassName} data-field-path={fieldPath}>{value}</Tag>;
    }

    // Build props object conditionally to avoid setting data-placeholder when undefined
    const elementProps: Record<string, unknown> = {
      ref,
      contentEditable: rich ? ('true' as const) : ('plaintext-only' as const),
      suppressContentEditableWarning: true,
      className: combinedClassName,
      'data-field-path': fieldPath,
      'data-rich': rich ? 'true' : undefined,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onInput: handleInput,
      onKeyDown: handleKeyDown,
      onCompositionStart: handleCompositionStart,
      onCompositionEnd: handleCompositionEnd,
      onPaste: rich ? handlePaste : undefined,
      onClick: rich ? handleClick : undefined,
    };

    if (placeholder !== undefined) {
      elementProps['data-placeholder'] = placeholder;
    }

    return <Tag {...elementProps} />;
  }
);
