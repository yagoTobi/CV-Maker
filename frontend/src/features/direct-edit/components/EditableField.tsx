/**
 * EditableField -- Core contentEditable component mapped to a single CVFormData field.
 *
 * Uses the "uncontrolled while focused, controlled while blurred" pattern (D-04):
 * - When focused: React does NOT touch the DOM. Browser owns the element.
 * - When blurred: React syncs value prop to DOM textContent.
 * - On blur: reads textContent and fires onFieldChange if changed.
 *
 * Each CVFormData field = one EditableField instance (D-02).
 * Uses contentEditable="plaintext-only" to strip rich text on paste (D-03).
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
    },
    forwardedRef
  ) {
    const ref = useRef<HTMLElement>(null);
    const isFocused = useRef(false);
    const isComposing = useRef(false);

    // Expose the DOM element to parent via forwardRef
    useImperativeHandle(forwardedRef, () => ref.current!, []);

    // Sync value prop to DOM textContent ONLY when not focused (D-04, EDIT-06)
    useEffect(() => {
      if (!isFocused.current && ref.current) {
        if (ref.current.textContent !== value) {
          ref.current.textContent = value;
        }
      }
    }, [value]);

    const handleFocus = useCallback(() => {
      isFocused.current = true;
    }, []);

    const handleBlur = useCallback(() => {
      isFocused.current = false;
      const newValue = ref.current?.textContent ?? '';
      if (newValue !== value) {
        onFieldChange(fieldPath, newValue);
      }
    }, [value, fieldPath, onFieldChange]);

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
          if (ref.current) ref.current.textContent = value;
          ref.current?.blur();
        }
      },
      [value, multiline, onKeyDown]
    );

    const handleCompositionStart = useCallback(() => {
      isComposing.current = true;
    }, []);

    const handleCompositionEnd = useCallback(() => {
      isComposing.current = false;
    }, []);

    const combinedClassName = className
      ? `${styles.editableField} ${className}`
      : styles.editableField;

    // Build props object conditionally to avoid setting data-placeholder when undefined
    const elementProps: Record<string, unknown> = {
      ref,
      contentEditable: 'plaintext-only' as const,
      suppressContentEditableWarning: true,
      className: combinedClassName,
      'data-field-path': fieldPath,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onInput: handleInput,
      onKeyDown: handleKeyDown,
      onCompositionStart: handleCompositionStart,
      onCompositionEnd: handleCompositionEnd,
    };

    if (placeholder !== undefined) {
      elementProps['data-placeholder'] = placeholder;
    }

    return <Tag {...elementProps} />;
  }
);
