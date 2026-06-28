/**
 * Tests for PageBreakIndicator -- renders a dashed line at a given Y offset
 * with a dynamic "Page N" label (no longer hardcoded to "Page 2").
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageBreakIndicator } from '../features/direct-edit/components/PageBreakIndicator';

describe('PageBreakIndicator', () => {
  it('renders the provided label', () => {
    render(<PageBreakIndicator offsetY={1070} label="Page 2" />);
    expect(screen.getByText('Page 2')).toBeInTheDocument();
  });

  it('supports labels beyond page 2 (multi-page)', () => {
    render(<PageBreakIndicator offsetY={2110} label="Page 3" />);
    expect(screen.getByText('Page 3')).toBeInTheDocument();
  });

  it('positions the line at the given Y offset', () => {
    const { container } = render(<PageBreakIndicator offsetY={1070} label="Page 2" />);
    const indicator = container.firstChild as HTMLElement;
    expect(indicator.style.top).toBe('1070px');
  });

  it('exposes an accessible page-break label', () => {
    render(<PageBreakIndicator offsetY={1070} label="Page 2" />);
    expect(screen.getByLabelText(/content below this line is on Page 2/i)).toBeInTheDocument();
  });
});
