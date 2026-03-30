/**
 * Tests for EditableBulletList component -- bullet list with
 * Enter/Backspace keyboard handling for natural editing.
 *
 * Covers: EDIT-03 (Enter creates bullet, Backspace deletes empty bullet).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { EditableBulletList } from '../features/direct-edit/components/EditableBulletList';
import type { BulletItem } from '../types';

describe('EditableBulletList', () => {
  const defaultBullets: BulletItem[] = [
    { id: 'b1', text: 'Built feature X' },
    { id: 'b2', text: 'Led team Y' },
    { id: 'b3', text: 'Managed project Z' },
  ];

  const defaultProps = {
    bullets: defaultBullets,
    basePath: 'workExperience[0].bullets',
    onBulletChange: vi.fn(),
    onBulletAdd: vi.fn(),
    onBulletRemove: vi.fn(),
  };

  it('renders one EditableField per bullet in the bullets array', () => {
    const { container } = render(<EditableBulletList {...defaultProps} />);
    const editableFields = container.querySelectorAll('[contenteditable]');
    expect(editableFields.length).toBe(3);
  });

  it('each bullet has a middle-dot marker (::before with \\00B7)', () => {
    const { container } = render(<EditableBulletList {...defaultProps} />);
    const markers = container.querySelectorAll('.bulletMarker');
    expect(markers.length).toBe(3);
  });

  it('on Enter keydown: calls onBulletAdd(index) to create new bullet after current', () => {
    const onBulletAdd = vi.fn();
    const onBulletChange = vi.fn();
    const { container } = render(
      <EditableBulletList
        {...defaultProps}
        onBulletAdd={onBulletAdd}
        onBulletChange={onBulletChange}
      />
    );
    const editableFields = container.querySelectorAll('[contenteditable]');
    const firstBullet = editableFields[0] as HTMLElement;

    fireEvent.keyDown(firstBullet, { key: 'Enter' });

    expect(onBulletAdd).toHaveBeenCalledWith(0);
  });

  it('on Backspace keydown with empty text: calls onBulletRemove(index) if bullets.length > 1', () => {
    const onBulletRemove = vi.fn();
    const bullets: BulletItem[] = [
      { id: 'b1', text: '' },
      { id: 'b2', text: 'Some text' },
    ];
    const { container } = render(
      <EditableBulletList
        {...defaultProps}
        bullets={bullets}
        onBulletRemove={onBulletRemove}
      />
    );
    const editableFields = container.querySelectorAll('[contenteditable]');
    const firstBullet = editableFields[0] as HTMLElement;

    // Ensure the element has empty text
    firstBullet.textContent = '';
    fireEvent.keyDown(firstBullet, { key: 'Backspace' });

    expect(onBulletRemove).toHaveBeenCalledWith(0);
  });

  it('on Backspace keydown with empty text and only 1 bullet: does NOT call onBulletRemove', () => {
    const onBulletRemove = vi.fn();
    const bullets: BulletItem[] = [
      { id: 'b1', text: '' },
    ];
    const { container } = render(
      <EditableBulletList
        {...defaultProps}
        bullets={bullets}
        onBulletRemove={onBulletRemove}
      />
    );
    const editableFields = container.querySelectorAll('[contenteditable]');
    const firstBullet = editableFields[0] as HTMLElement;

    firstBullet.textContent = '';
    fireEvent.keyDown(firstBullet, { key: 'Backspace' });

    expect(onBulletRemove).not.toHaveBeenCalled();
  });

  it('passes onInput to each EditableField', () => {
    const onInput = vi.fn();
    const { container } = render(
      <EditableBulletList {...defaultProps} onInput={onInput} />
    );
    const editableFields = container.querySelectorAll('[contenteditable]');

    fireEvent.input(editableFields[0]);

    expect(onInput).toHaveBeenCalled();
  });

  it('renders with correct fieldPath for each bullet', () => {
    const { container } = render(<EditableBulletList {...defaultProps} />);
    const editableFields = container.querySelectorAll('[data-field-path]');

    expect(editableFields[0].getAttribute('data-field-path')).toBe('workExperience[0].bullets[0]');
    expect(editableFields[1].getAttribute('data-field-path')).toBe('workExperience[0].bullets[1]');
    expect(editableFields[2].getAttribute('data-field-path')).toBe('workExperience[0].bullets[2]');
  });
});
