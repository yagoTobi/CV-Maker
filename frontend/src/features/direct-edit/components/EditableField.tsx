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
 */
import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import styles from './EditableField.module.css';

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
    },
    forwardedRef
  ) {
    const ref = useRef<HTMLElement>(null);
    const isFocused = useRef(false);
    const isComposing = useRef(false);

    // Expose the DOM element to parent via forwardRef
    useImperativeHandle(forwardedRef, () => ref.current!, []);

    // Sync value prop to DOM ONLY when not focused (D-04, EDIT-06)
    // Rich mode syncs innerHTML; plain mode syncs textContent.
    useEffect(() => {
      if (!isFocused.current && ref.current) {
        if (rich) {
          // When value is empty, clear innerHTML to make :empty CSS work
          if (value === '' && ref.current.childNodes.length > 0) {
            ref.current.innerHTML = '';
          } else if (ref.current.innerHTML !== value) {
            ref.current.innerHTML = value;
          }
        } else {
          // When value is empty, the browser may leave stray <br> or text nodes
          // that prevent CSS :empty from matching (so the placeholder won't show).
          // Explicitly clear childNodes to make :empty work.
          if (value === '' && ref.current.childNodes.length > 0) {
            ref.current.textContent = '';
          } else if (ref.current.textContent !== value) {
            ref.current.textContent = value;
          }
        }
      }
    }, [value, rich]);

    const handleFocus = useCallback(() => {
      isFocused.current = true;
    }, []);

    const handleBlur = useCallback(() => {
      isFocused.current = false;
      const newValue = rich
        ? (ref.current?.innerHTML ?? '')
        : (ref.current?.textContent ?? '');
      if (newValue !== value) {
        onFieldChange(fieldPath, newValue);
      }
    }, [value, fieldPath, onFieldChange, rich]);

    const handleInput = useCallback(() => {
      // Gate onInput during IME composition (Pitfall 4)
      if (!isComposing.current) {
        onInput?.();
      }
    }, [onInput]);

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
    };

    if (placeholder !== undefined) {
      elementProps['data-placeholder'] = placeholder;
    }

    return <Tag {...elementProps} />;
  }
);
