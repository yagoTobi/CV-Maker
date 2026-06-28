// Analog: frontend/src/__tests__/EditableField.test.tsx (RTL render + fireEvent pattern)
// Implements D-04 contract per .planning/phases/13.../13-CONTEXT.md.
//
// Wave 0 scaffold: imports the still-missing GapPromptChips from
// `features/direct-edit/components/change-review/GapPromptChips`. Plan 04 Task ?? implements it.

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GapPromptChips } from '../features/direct-edit/components/change-review/GapPromptChips';

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

  it('emits typed evidence paired with the missing requirement topic', () => {
    const onEvidenceChange = vi.fn();
    render(<GapPromptChips {...defaultProps({ onEvidenceChange })} />);

    fireEvent.click(screen.getByRole('button', { name: /AWS Lambda/i }));
    const input = screen.getByRole('textbox') as HTMLTextAreaElement;

    fireEvent.change(input, { target: { value: 'Built Lambda ingestion jobs for billing events' } });

    expect(onEvidenceChange).toHaveBeenCalled();
    const lastArg = onEvidenceChange.mock.calls[onEvidenceChange.mock.calls.length - 1][0];
    expect(lastArg).toEqual([
      {
        topic: 'AWS Lambda',
        description: 'Built Lambda ingestion jobs for billing events',
      },
    ]);
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

  // --- Behavior tests authored by Plan 03 Task 3 ---

  it('keeps only one chip expanded at a time', () => {
    render(<GapPromptChips {...defaultProps()} />);

    // Open chip[0]
    fireEvent.click(screen.getByRole('button', { name: /Spanish fluency/i }));
    expect(screen.getAllByRole('textbox').length).toBe(1);

    // Open chip[1] — chip[0]'s textarea must collapse.
    fireEvent.click(screen.getByRole('button', { name: /AWS Lambda/i }));
    const textareas = screen.getAllByRole('textbox') as HTMLTextAreaElement[];
    expect(textareas.length).toBe(1);
    // The single visible textarea must belong to the AWS Lambda chip, not Spanish.
    expect(textareas[0].getAttribute('aria-label')).toMatch(/AWS Lambda/i);
  });

  it('enforces a 500-character maxLength on the textarea (T-13-03-02)', () => {
    render(<GapPromptChips {...defaultProps()} />);
    fireEvent.click(screen.getByRole('button', { name: /Spanish fluency/i }));
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.maxLength).toBe(500);
  });

  it('removes a cleared chip from emitted clarifications on subsequent blur', () => {
    const onChange = vi.fn();
    render(<GapPromptChips {...defaultProps({ onClarificationsChange: onChange })} />);

    fireEvent.click(screen.getByRole('button', { name: /Spanish fluency/i }));
    const input = screen.getByRole('textbox') as HTMLTextAreaElement;

    fireEvent.change(input, { target: { value: 'Native' } });
    fireEvent.blur(input);
    let lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0] as string[];
    expect(lastArg).toEqual(['Native']);

    // Re-open same chip, clear, blur — emitted array should now be empty.
    fireEvent.click(screen.getByRole('button', { name: /Spanish fluency/i }));
    const reopened = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(reopened, { target: { value: '' } });
    fireEvent.blur(reopened);

    lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0] as string[];
    expect(lastArg).toEqual([]);
  });
});
