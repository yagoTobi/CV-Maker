// Analog: frontend/src/__tests__/EditableField.test.tsx (RTL render + fireEvent pattern)
// Implements D-18 contract per .planning/phases/13.../13-CONTEXT.md.
//
// Wave 0 scaffold: imports the still-missing PostSavePrompt from
// `features/direct-edit/components/PostSavePrompt`. Plan 04 implements it.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostSavePrompt } from '../features/direct-edit/components/PostSavePrompt';

function defaultProps(overrides = {}) {
  return {
    isOpen: true,
    onTuneAnotherJob: vi.fn(),
    onBackToOriginal: vi.fn(),
    onViewInDashboard: vi.fn(),
    onDismiss: vi.fn(),
    onDownload: vi.fn(),
    ...overrides,
  };
}

describe('PostSavePrompt', () => {
  it('renders nothing when isOpen=false', () => {
    const { container } = render(<PostSavePrompt {...defaultProps({ isOpen: false })} />);
    expect(container.firstChild).toBeNull();
  });

  it('when isOpen=true, renders heading "What\'s next?" and four action buttons', () => {
    render(<PostSavePrompt {...defaultProps()} />);
    expect(screen.getByText(/what's next\?/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tune for another job/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to original cv/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view in dashboard/i })).toBeInTheDocument();
  });

  it('default focus is on "View in Dashboard"', () => {
    render(<PostSavePrompt {...defaultProps()} />);
    const viewBtn = screen.getByRole('button', { name: /view in dashboard/i });
    expect(viewBtn).toHaveFocus();
  });

  it('clicking "Tune for another job" calls onTuneAnotherJob exactly once', () => {
    const props = defaultProps();
    render(<PostSavePrompt {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /tune for another job/i }));
    expect(props.onTuneAnotherJob).toHaveBeenCalledTimes(1);
  });

  it('clicking "Back to original CV" calls onBackToOriginal exactly once', () => {
    const props = defaultProps();
    render(<PostSavePrompt {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /back to original cv/i }));
    expect(props.onBackToOriginal).toHaveBeenCalledTimes(1);
  });

  it('clicking "View in Dashboard" calls onViewInDashboard exactly once', () => {
    const props = defaultProps();
    render(<PostSavePrompt {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /view in dashboard/i }));
    expect(props.onViewInDashboard).toHaveBeenCalledTimes(1);
  });

  it('Escape key closes via onDismiss', () => {
    const props = defaultProps();
    const { container } = render(<PostSavePrompt {...props} />);
    fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: 'Escape' });
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('clicking the backdrop closes via onDismiss', () => {
    const props = defaultProps();
    const { container } = render(<PostSavePrompt {...props} />);
    // Backdrop is the outermost element; clicking it should dismiss.
    fireEvent.click(container.firstElementChild as HTMLElement);
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  });
});
