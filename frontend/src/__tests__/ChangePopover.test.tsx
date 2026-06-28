// Analog: frontend/src/__tests__/EditableField.test.tsx (RTL render + fireEvent pattern)
// Implements D-12, D-17, D-19 contract per .planning/phases/13.../13-CONTEXT.md.
//
// Wave 0 scaffold: imports the still-missing ChangePopover from
// `features/direct-edit/components/change-review/ChangePopover`. Plan 03 implements it.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChangePopover } from '../features/direct-edit/components/change-review/ChangePopover';
import type { TailorChange } from '../types';

function makeChange(overrides: Partial<TailorChange> = {}): TailorChange {
  return {
    id: 'c1',
    fieldPath: 'workExperience[0].bullets[0]',
    section: 'Work Experience',
    description: 'Reword for impact',
    currentValue: 'Led team of 5',
    alternatives: [{ label: 'Action-focused', value: 'Led team of 12' }],
    changeType: 'modify',
    ...overrides,
  };
}

function defaultProps(overrides = {}) {
  return {
    activeChange: makeChange(),
    severity: 'minor' as const,
    getRect: () => null,
    onAccept: vi.fn(),
    onSkip: vi.fn(),
    onAdvance: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
}

describe('ChangePopover', () => {
  it('renders nothing when activeChange is null', () => {
    const { container } = render(<ChangePopover {...defaultProps({ activeChange: null })} />);
    expect(container.firstChild).toBeNull();
  });

  it('minor severity renders compact body', () => {
    const { container } = render(<ChangePopover {...defaultProps({ severity: 'minor' })} />);
    // Compact variant is identifiable by either:
    //  (a) class containing 'compact', or
    //  (b) absence of an 'expanded' class on the popover root.
    const root = container.firstElementChild as HTMLElement | null;
    expect(root).not.toBeNull();
    const cls = (root!.getAttribute('class') ?? '').toLowerCase();
    expect(cls.includes('compact') || !cls.includes('expanded')).toBe(true);
  });

  it('strong severity renders expanded body with BEFORE and AFTER labels', () => {
    render(<ChangePopover {...defaultProps({ severity: 'strong' })} />);
    expect(screen.getByText(/BEFORE/i)).toBeInTheDocument();
    expect(screen.getByText(/AFTER/i)).toBeInTheDocument();
  });

  it('ArrowRight key calls onAdvance("next")', () => {
    const props = defaultProps({ severity: 'strong' });
    const { container } = render(<ChangePopover {...props} />);
    fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: 'ArrowRight' });
    expect(props.onAdvance).toHaveBeenCalledWith('next');
  });

  it('ArrowLeft key calls onAdvance("prev")', () => {
    const props = defaultProps({ severity: 'strong' });
    const { container } = render(<ChangePopover {...props} />);
    fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: 'ArrowLeft' });
    expect(props.onAdvance).toHaveBeenCalledWith('prev');
  });

  it('Escape calls onClose', () => {
    const props = defaultProps({ severity: 'strong' });
    const { container } = render(<ChangePopover {...props} />);
    fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('Enter calls onAccept(activeChange.id)', () => {
    const props = defaultProps({ severity: 'strong' });
    const { container } = render(<ChangePopover {...props} />);
    fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: 'Enter' });
    expect(props.onAccept).toHaveBeenCalledWith('c1');
  });

  it('Click "Skip change" calls onSkip', () => {
    const props = defaultProps({ severity: 'strong' });
    render(<ChangePopover {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /skip change/i }));
    expect(props.onSkip).toHaveBeenCalledWith('c1');
  });

  it('Click "Accept change" calls onAccept', () => {
    const props = defaultProps({ severity: 'strong' });
    render(<ChangePopover {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /accept change/i }));
    expect(props.onAccept).toHaveBeenCalledWith('c1');
  });
});
