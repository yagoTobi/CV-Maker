/**
 * SectionAssistPopover tests — TDD, written before implementation.
 *
 * Floating-ui is not mocked (same approach as ChangePopover.test.tsx).
 * The component positions itself via virtual element; jsdom ignores layout,
 * so positioning side-effects are inert.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SectionAssistPopover } from '../features/direct-edit/components/section-assist/SectionAssistPopover';
import type { SectionAssistPopoverProps } from '../features/direct-edit/components/section-assist/SectionAssistPopover';

function defaultProps(
  overrides: Partial<SectionAssistPopoverProps> = {},
): SectionAssistPopoverProps {
  return {
    sectionType: 'work',
    getRect: () => null,
    isLoading: false,
    error: null,
    onGenerate: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
}

describe('SectionAssistPopover', () => {
  it('1. renders the section question and chips for "work" sectionType', () => {
    render(<SectionAssistPopover {...defaultProps()} />);
    expect(screen.getByText('What did you do in this role?')).toBeInTheDocument();
    expect(screen.getByText('Key achievement')).toBeInTheDocument();
    expect(screen.getByText('Tech / tools used')).toBeInTheDocument();
    expect(screen.getByText('Impact / metric')).toBeInTheDocument();
  });

  it('2. clicking a chip fills the textarea', () => {
    render(<SectionAssistPopover {...defaultProps()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Key achievement' }));
    expect(screen.getByRole('textbox')).toHaveValue('Key achievement');
  });

  it('3. clicking Generate fires onGenerate with the textarea value', () => {
    const props = defaultProps();
    render(<SectionAssistPopover {...props} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Built a React app' } });
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    expect(props.onGenerate).toHaveBeenCalledWith('Built a React app');
  });

  it('4. isLoading=true renders spinner and disables Generate even with text', () => {
    render(<SectionAssistPopover {...defaultProps({ isLoading: true })} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'some text' } });
    expect(screen.getByRole('button', { name: /generate/i })).toBeDisabled();
  });

  it('5. blocked=true with reason renders the reason text', () => {
    render(
      <SectionAssistPopover {...defaultProps({ blocked: true, reason: 'content policy' })} />,
    );
    expect(screen.getByText(/content policy/i)).toBeInTheDocument();
  });

  it('6. reason="rate-limited" renders distinct rate-limit copy', () => {
    render(<SectionAssistPopover {...defaultProps({ reason: 'rate-limited' })} />);
    expect(screen.getByText(/rate limit/i)).toBeInTheDocument();
  });

  it('7. error string renders in the popover', () => {
    render(<SectionAssistPopover {...defaultProps({ error: 'Something went wrong' })} />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('8. chips and Generate button are keyboard-accessible (not removed from tab order)', () => {
    render(<SectionAssistPopover {...defaultProps()} />);
    expect(screen.getByRole('button', { name: /generate/i })).not.toHaveAttribute(
      'tabindex',
      '-1',
    );
    expect(screen.getByRole('button', { name: 'Key achievement' })).not.toHaveAttribute(
      'tabindex',
      '-1',
    );
    expect(screen.getByRole('textbox')).not.toHaveAttribute('tabindex', '-1');
  });

  it('9. pressing Escape calls onClose', () => {
    const props = defaultProps();
    const { container } = render(<SectionAssistPopover {...props} />);
    fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('10. textarea is focused when the popover opens', () => {
    render(<SectionAssistPopover {...defaultProps()} />);
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
  });

  it('11. Generate is disabled when the textarea is empty', () => {
    render(<SectionAssistPopover {...defaultProps()} />);
    expect(screen.getByRole('button', { name: /generate/i })).toBeDisabled();
  });

  it('12. mousedown outside the popover calls onClose', () => {
    const props = defaultProps();
    render(<SectionAssistPopover {...props} />);
    fireEvent.mouseDown(document.body);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
