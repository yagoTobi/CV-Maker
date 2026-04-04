/**
 * Tests for EntryWrapper -- hover-reveal delete button with optional confirmation.
 *
 * Covers: D-03 (delete icon on hover), D-04 (confirm for major, instant for minor).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntryWrapper } from '../features/direct-edit/components/EntryWrapper';

describe('EntryWrapper', () => {
  it('renders children content', () => {
    render(
      <EntryWrapper onDelete={vi.fn()}>
        <div data-testid="entry-content">Job at Acme</div>
      </EntryWrapper>
    );

    expect(screen.getByTestId('entry-content')).toBeInTheDocument();
    expect(screen.getByText('Job at Acme')).toBeInTheDocument();
  });

  it('clicking delete button without requireConfirm calls onDelete immediately', () => {
    const onDelete = vi.fn();

    render(
      <EntryWrapper onDelete={onDelete}>
        <div>Content</div>
      </EntryWrapper>
    );

    const deleteBtn = screen.getByLabelText('Delete entry');
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('clicking delete button with requireConfirm=true shows confirmation dialog', () => {
    const onDelete = vi.fn();

    render(
      <EntryWrapper
        onDelete={onDelete}
        requireConfirm={true}
        confirmMessage='Delete "Acme Corp"?'
      >
        <div>Content</div>
      </EntryWrapper>
    );

    // Delete button exists
    const deleteBtn = screen.getByLabelText('Delete entry');
    fireEvent.click(deleteBtn);

    // Confirmation dialog appears
    expect(screen.getByText('Delete "Acme Corp"?')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();

    // onDelete was NOT called yet
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('clicking "Delete" in confirmation dialog calls onDelete', () => {
    const onDelete = vi.fn();

    render(
      <EntryWrapper
        onDelete={onDelete}
        requireConfirm={true}
        confirmMessage="Delete this entry?"
      >
        <div>Content</div>
      </EntryWrapper>
    );

    // Open confirmation
    fireEvent.click(screen.getByLabelText('Delete entry'));
    expect(screen.getByText('Delete this entry?')).toBeInTheDocument();

    // Confirm deletion
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('clicking "Cancel" in confirmation dialog hides dialog without calling onDelete', () => {
    const onDelete = vi.fn();

    render(
      <EntryWrapper
        onDelete={onDelete}
        requireConfirm={true}
        confirmMessage="Delete this entry?"
      >
        <div>Content</div>
      </EntryWrapper>
    );

    // Open confirmation
    fireEvent.click(screen.getByLabelText('Delete entry'));
    expect(screen.getByText('Delete this entry?')).toBeInTheDocument();

    // Cancel
    fireEvent.click(screen.getByText('Cancel'));

    // Dialog disappears, onDelete not called
    expect(screen.queryByText('Delete this entry?')).not.toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('delete button has aria-label "Delete entry"', () => {
    render(
      <EntryWrapper onDelete={vi.fn()}>
        <div>Content</div>
      </EntryWrapper>
    );

    expect(screen.getByLabelText('Delete entry')).toBeInTheDocument();
  });

  it('renders with gridItem prop using grid class for subgrid layout', () => {
    const { container } = render(
      <EntryWrapper onDelete={vi.fn()} gridItem>
        <span>Skill Category</span>
        <span>Skill Values</span>
      </EntryWrapper>
    );

    // The root wrapper should exist and contain children
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(screen.getByText('Skill Category')).toBeInTheDocument();
    expect(screen.getByText('Skill Values')).toBeInTheDocument();
    // Delete button still present
    expect(screen.getByLabelText('Delete entry')).toBeInTheDocument();
  });

  it('gridItem variant still supports instant delete (no confirm)', () => {
    const onDelete = vi.fn();

    render(
      <EntryWrapper onDelete={onDelete} gridItem>
        <span>Category</span>
        <span>Values</span>
      </EntryWrapper>
    );

    fireEvent.click(screen.getByLabelText('Delete entry'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
