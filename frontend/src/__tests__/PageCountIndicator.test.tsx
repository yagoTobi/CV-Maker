/**
 * Tests for PageCountIndicator -- the discrete NavBar page-count status.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageCountIndicator } from '../features/direct-edit/components/PageCountIndicator';

describe('PageCountIndicator', () => {
  it('renders nothing before a count is known and not checking', () => {
    const { container } = render(<PageCountIndicator pageCount={null} isChecking={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows "1 page" (singular) for a single-page CV', () => {
    render(<PageCountIndicator pageCount={1} isChecking={false} />);
    expect(screen.getByText('1 page')).toBeInTheDocument();
  });

  it('shows "N pages" (plural) for a multi-page CV', () => {
    render(<PageCountIndicator pageCount={3} isChecking={false} />);
    expect(screen.getByText('3 pages')).toBeInTheDocument();
  });

  it('shows a checking state while a compile is in flight', () => {
    render(<PageCountIndicator pageCount={null} isChecking={true} />);
    expect(screen.getByText('Checking…')).toBeInTheDocument();
  });

  it('flags multi-page CVs with a title hint', () => {
    render(<PageCountIndicator pageCount={2} isChecking={false} />);
    expect(screen.getByText('2 pages')).toHaveAttribute('title', expect.stringContaining('more than one page'));
  });
});
