// Analog: frontend/src/__tests__/EditableField.test.tsx (RTL render + fireEvent pattern)
// Implements D-04 contract per .planning/phases/13.../13-CONTEXT.md.
//
// Wave 0 scaffold: imports the still-missing GapPromptChips from
// `features/direct-edit/components/GapPromptChips`. Plan 04 Task ?? implements it.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GapPromptChips } from '../features/direct-edit/components/GapPromptChips';

function defaultProps(overrides = {}) {
  return {
    missing: ['Spanish fluency', 'AWS Lambda', 'Team leadership'],
    onClarificationsChange: vi.fn(),
    ...overrides,
  };
}

describe('GapPromptChips', () => {
  it('renders one button per missing[] entry', () => {
    render(<GapPromptChips {...defaultProps()} />);
    expect(screen.getByRole('button', { name: /Spanish fluency/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /AWS Lambda/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Team leadership/i })).toBeInTheDocument();
  });

  it('renders empty-state heading "No gaps detected" when missing[] is empty', () => {
    render(<GapPromptChips {...defaultProps({ missing: [] })} />);
    expect(screen.getByText(/no gaps detected/i)).toBeInTheDocument();
  });

  it('clicking a chip reveals an input below it', () => {
    render(<GapPromptChips {...defaultProps()} />);
    fireEvent.click(screen.getByRole('button', { name: /Spanish fluency/i }));
    // Input may identify itself via aria-label OR placeholder containing the gap
    const inputs = screen.queryAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('typing then blurring an input calls onClarificationsChange with the typed value included', () => {
    const onChange = vi.fn();
    render(<GapPromptChips {...defaultProps({ onClarificationsChange: onChange })} />);

    fireEvent.click(screen.getByRole('button', { name: /Spanish fluency/i }));
    const input = screen.getAllByRole('textbox')[0] as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'Native Spanish, lived in Madrid 3 years' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalled();
    const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0] as string[];
    expect(lastArg).toEqual(expect.arrayContaining(['Native Spanish, lived in Madrid 3 years']));
  });

  it('untouched chips are NOT in the resulting clarifications array', () => {
    const onChange = vi.fn();
    render(<GapPromptChips {...defaultProps({ onClarificationsChange: onChange })} />);

    // Click only the FIRST chip and provide text.
    fireEvent.click(screen.getByRole('button', { name: /Spanish fluency/i }));
    const input = screen.getAllByRole('textbox')[0] as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'I know Spanish' } });
    fireEvent.blur(input);

    const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0] as string[];
    // Only the touched chip's value is present
    expect(lastArg).toEqual(['I know Spanish']);
  });
});
