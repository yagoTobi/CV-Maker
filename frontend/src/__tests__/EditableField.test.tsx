/**
 * Tests for EditableField component -- the core contentEditable element
 * mapped to a single CVFormData field.
 *
 * Covers: EDIT-01 (inline editing), EDIT-04 (placeholder), EDIT-06 (no DOM clobber while focused).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { EditableField } from '../features/direct-edit/components/EditableField';

describe('EditableField', () => {
  const defaultProps = {
    value: 'Hello',
    fieldPath: 'personalInfo.fullName',
    onFieldChange: vi.fn(),
  };

  it('renders a contentEditable element with suppressContentEditableWarning', () => {
    const { container } = render(<EditableField {...defaultProps} />);
    const el = container.firstElementChild as HTMLElement;
    // jsdom does not expose 'plaintext-only' via the .contentEditable DOM property,
    // so we verify via getAttribute which reflects the actual HTML attribute
    expect(el.getAttribute('contenteditable')).toBe('plaintext-only');
    // suppressContentEditableWarning is a React prop, not a DOM attribute
    // its presence is verified by the absence of React console warnings
  });

  it('sets contentEditable="plaintext-only" attribute (per D-03)', () => {
    const { container } = render(<EditableField {...defaultProps} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute('contenteditable')).toBe('plaintext-only');
  });

  it('renders with correct tag based on tag prop', () => {
    const tags = ['span', 'div', 'h1', 'h2', 'p'] as const;
    for (const tag of tags) {
      const { container } = render(<EditableField {...defaultProps} tag={tag} />);
      expect(container.firstElementChild!.tagName.toLowerCase()).toBe(tag);
    }
  });

  it('defaults to span tag when no tag prop is provided', () => {
    const { container } = render(<EditableField {...defaultProps} />);
    expect(container.firstElementChild!.tagName.toLowerCase()).toBe('span');
  });

  it('sets data-field-path attribute to the provided fieldPath', () => {
    const { container } = render(<EditableField {...defaultProps} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute('data-field-path')).toBe('personalInfo.fullName');
  });

  it('sets data-placeholder attribute when placeholder prop is provided', () => {
    const { container } = render(
      <EditableField {...defaultProps} placeholder="Your Name" />
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute('data-placeholder')).toBe('Your Name');
  });

  it('does not set data-placeholder when placeholder prop is not provided', () => {
    const { container } = render(<EditableField {...defaultProps} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.hasAttribute('data-placeholder')).toBe(false);
  });

  it('calls onFieldChange(fieldPath, newText) when element is blurred with different text', () => {
    const onFieldChange = vi.fn();
    const { container } = render(
      <EditableField {...defaultProps} onFieldChange={onFieldChange} />
    );
    const el = container.firstElementChild as HTMLElement;

    fireEvent.focus(el);
    el.textContent = 'New Value';
    fireEvent.blur(el);

    expect(onFieldChange).toHaveBeenCalledWith('personalInfo.fullName', 'New Value');
  });

  it('does NOT call onFieldChange on blur when text is unchanged', () => {
    const onFieldChange = vi.fn();
    const { container } = render(
      <EditableField {...defaultProps} value="Hello" onFieldChange={onFieldChange} />
    );
    const el = container.firstElementChild as HTMLElement;

    fireEvent.focus(el);
    // textContent remains 'Hello' (set by useEffect on initial render)
    fireEvent.blur(el);

    expect(onFieldChange).not.toHaveBeenCalled();
  });

  it('when element has focus, useEffect does NOT update textContent even when value prop changes (EDIT-06)', () => {
    const { container, rerender } = render(
      <EditableField {...defaultProps} value="A" />
    );
    const el = container.firstElementChild as HTMLElement;

    // Focus the element
    fireEvent.focus(el);

    // Rerender with new value
    rerender(
      <EditableField {...defaultProps} value="B" />
    );

    // textContent should still be 'A' because element is focused
    expect(el.textContent).toBe('A');
  });

  it('when element is blurred, useEffect DOES update textContent when value prop changes', () => {
    const { container, rerender } = render(
      <EditableField {...defaultProps} value="A" />
    );
    const el = container.firstElementChild as HTMLElement;

    expect(el.textContent).toBe('A');

    // Rerender with new value while blurred
    rerender(
      <EditableField {...defaultProps} value="B" />
    );

    expect(el.textContent).toBe('B');
  });

  it('on Enter key in non-multiline mode: prevents default and blurs', () => {
    const { container } = render(<EditableField {...defaultProps} />);
    const el = container.firstElementChild as HTMLElement;

    // Mock blur
    const blurSpy = vi.spyOn(el, 'blur');
    fireEvent.focus(el);

    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    el.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(blurSpy).toHaveBeenCalled();
  });

  it('on Escape key: reverts textContent to last committed value and blurs', () => {
    const { container } = render(<EditableField {...defaultProps} value="Original" />);
    const el = container.firstElementChild as HTMLElement;

    const blurSpy = vi.spyOn(el, 'blur');
    fireEvent.focus(el);
    el.textContent = 'Modified';

    fireEvent.keyDown(el, { key: 'Escape' });

    expect(el.textContent).toBe('Original');
    expect(blurSpy).toHaveBeenCalled();
  });

  it('calls onInput callback on input events', () => {
    const onInput = vi.fn();
    const { container } = render(
      <EditableField {...defaultProps} onInput={onInput} />
    );
    const el = container.firstElementChild as HTMLElement;

    fireEvent.input(el);

    expect(onInput).toHaveBeenCalled();
  });

  it('has className prop that is applied to the element', () => {
    const { container } = render(
      <EditableField {...defaultProps} className="custom-class" />
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.classList.contains('custom-class')).toBe(true);
  });

  it('applies editableField CSS class for styling', () => {
    const { container } = render(<EditableField {...defaultProps} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.classList.contains('editableField')).toBe(true);
  });

  describe('highlightSpans (Phase 13 D-13/D-14/D-16)', () => {
    it('injects a <span data-change-id data-severity> wrapping the offset range when blurred', () => {
      const { container } = render(
        <EditableField
          {...defaultProps}
          value="Hello world"
          highlightSpans={[
            { changeId: 'c1', severity: 'minor', isActive: false, startOffset: 0, endOffset: 5 },
          ]}
        />
      );
      const el = container.firstElementChild as HTMLElement;
      const span = el.querySelector('span[data-change-id="c1"]');
      expect(span).not.toBeNull();
      expect(span!.getAttribute('data-severity')).toBe('minor');
      expect(span!.textContent).toBe('Hello');
      // Tail text node still present
      expect(el.textContent).toBe('Hello world');
    });

    it('focusing the field strips highlight spans (innerHTML becomes plain text)', () => {
      const { container } = render(
        <EditableField
          {...defaultProps}
          value="Hello world"
          highlightSpans={[
            { changeId: 'c1', severity: 'strong', isActive: true, startOffset: 0, endOffset: 5 },
          ]}
        />
      );
      const el = container.firstElementChild as HTMLElement;
      // Pre-focus: span exists
      expect(el.querySelector('span[data-change-id="c1"]')).not.toBeNull();

      fireEvent.focus(el);
      // Post-focus: spans flattened to plain text
      expect(el.querySelector('span[data-change-id="c1"]')).toBeNull();
      expect(el.textContent).toBe('Hello world');
    });

    it('blurring the field re-injects highlight spans on next render pass', () => {
      const spans = [
        { changeId: 'c1', severity: 'minor' as const, isActive: false, startOffset: 6, endOffset: 11 },
      ];
      const { container, rerender } = render(
        <EditableField {...defaultProps} value="Hello world" highlightSpans={spans} />
      );
      const el = container.firstElementChild as HTMLElement;
      fireEvent.focus(el);
      // After focus, spans are stripped (cursor-safety contract).
      expect(el.querySelector('span[data-change-id="c1"]')).toBeNull();

      fireEvent.blur(el);
      // After blur, the next re-render with new highlightSpans reference re-injects the span.
      rerender(<EditableField {...defaultProps} value="Hello world" highlightSpans={[...spans]} />);
      expect(el.querySelector('span[data-change-id="c1"]')).not.toBeNull();
    });

    it('first input event after a highlight render fires onAutoDismiss exactly once (D-16)', () => {
      const onAutoDismiss = vi.fn();
      const { container } = render(
        <EditableField
          {...defaultProps}
          value="Hello world"
          onAutoDismiss={onAutoDismiss}
          highlightSpans={[
            { changeId: 'c1', severity: 'strong', isActive: true, startOffset: 0, endOffset: 5 },
          ]}
        />
      );
      const el = container.firstElementChild as HTMLElement;

      fireEvent.input(el);
      expect(onAutoDismiss).toHaveBeenCalledTimes(1);
      expect(onAutoDismiss).toHaveBeenCalledWith('c1');

      // Subsequent inputs do NOT re-fire (armed flag is consumed).
      fireEvent.input(el);
      fireEvent.input(el);
      expect(onAutoDismiss).toHaveBeenCalledTimes(1);
    });

    it('does NOT fire onAutoDismiss when highlightSpans is empty', () => {
      const onAutoDismiss = vi.fn();
      const { container } = render(
        <EditableField
          {...defaultProps}
          value="Hello"
          onAutoDismiss={onAutoDismiss}
          highlightSpans={[]}
        />
      );
      const el = container.firstElementChild as HTMLElement;
      fireEvent.input(el);
      expect(onAutoDismiss).not.toHaveBeenCalled();
    });

    it('preserves existing focus contract: highlights NOT injected while focused (cursor safety)', () => {
      const { container, rerender } = render(
        <EditableField {...defaultProps} value="Hello" />
      );
      const el = container.firstElementChild as HTMLElement;
      fireEvent.focus(el);
      // Now provide highlightSpans while focused.
      rerender(
        <EditableField
          {...defaultProps}
          value="Hello"
          highlightSpans={[
            { changeId: 'c1', severity: 'minor', isActive: false, startOffset: 0, endOffset: 3 },
          ]}
        />
      );
      // While focused, no <span> wrapper must be injected — cursor safety preserved.
      expect(el.querySelector('span[data-change-id="c1"]')).toBeNull();
    });

    it('span carries severity-tier CSS class (e.g. tierMinor for severity=minor)', () => {
      const { container } = render(
        <EditableField
          {...defaultProps}
          value="Hello"
          highlightSpans={[
            { changeId: 'c1', severity: 'minor', isActive: false, startOffset: 0, endOffset: 5 },
          ]}
        />
      );
      const el = container.firstElementChild as HTMLElement;
      const span = el.querySelector('span[data-change-id="c1"]') as HTMLElement;
      expect(span).not.toBeNull();
      expect(span.classList.contains('highlight')).toBe(true);
      expect(span.classList.contains('tierMinor')).toBe(true);
    });

    it('isActive=true adds the active class to the span', () => {
      const { container } = render(
        <EditableField
          {...defaultProps}
          value="Hello"
          highlightSpans={[
            { changeId: 'c1', severity: 'strong', isActive: true, startOffset: 0, endOffset: 5 },
          ]}
        />
      );
      const span = container.querySelector('span[data-change-id="c1"]') as HTMLElement;
      expect(span.classList.contains('active')).toBe(true);
      expect(span.classList.contains('tierStrong')).toBe(true);
    });

    it('does NOT use innerHTML string concat (T-13-02-01: per-span text is escaped via createTextNode)', () => {
      // Craft a value containing HTML special chars that would be parsed if injected via innerHTML.
      const value = '<script>alert(1)</script>';
      const { container } = render(
        <EditableField
          {...defaultProps}
          value={value}
          highlightSpans={[
            { changeId: 'c1', severity: 'strong', isActive: false, startOffset: 0, endOffset: value.length },
          ]}
        />
      );
      const el = container.firstElementChild as HTMLElement;
      const span = el.querySelector('span[data-change-id="c1"]') as HTMLElement;
      // The literal text MUST be visible as text — no <script> child.
      expect(span.textContent).toBe(value);
      expect(el.querySelector('script')).toBeNull();
    });
  });
});
