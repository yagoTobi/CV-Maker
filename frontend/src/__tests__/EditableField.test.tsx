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
    expect(el.contentEditable).toBe('plaintext-only');
    expect(el.getAttribute('contenteditable')).toBe('plaintext-only');
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
});
