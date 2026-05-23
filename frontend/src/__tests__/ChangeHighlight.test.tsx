// Analog: frontend/src/__tests__/EditableField.test.tsx (RTL render + class assertion pattern)
//
// Tests for ChangeHighlight: purely presentational wrapper that renders a
// severity-tier squiggle underline span. Covers D-13 / D-14 contract.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { ChangeHighlight } from '../features/direct-edit/components/ChangeHighlight';

describe('ChangeHighlight', () => {
  it('renders span with data-change-id and data-severity attributes', () => {
    const { container } = render(
      <ChangeHighlight changeId="c1" severity="strong" isActive={false}>
        hello world
      </ChangeHighlight>
    );
    const el = container.firstElementChild as HTMLElement;
    expect(el.tagName.toLowerCase()).toBe('span');
    expect(el.getAttribute('data-change-id')).toBe('c1');
    expect(el.getAttribute('data-severity')).toBe('strong');
  });

  it('applies the tierStrong class for severity="strong"', () => {
    const { container } = render(
      <ChangeHighlight changeId="c1" severity="strong" isActive={false}>
        hello
      </ChangeHighlight>
    );
    const el = container.firstElementChild as HTMLElement;
    const cls = el.getAttribute('class') ?? '';
    // CSS Modules generate hashed class names, so we match by substring.
    expect(cls.toLowerCase()).toMatch(/tierstrong/);
  });

  it('applies the active class only when isActive=true', () => {
    const { container, rerender } = render(
      <ChangeHighlight changeId="c1" severity="minor" isActive={false}>
        hello
      </ChangeHighlight>
    );
    let cls = (container.firstElementChild as HTMLElement).getAttribute('class') ?? '';
    expect(cls.toLowerCase()).not.toMatch(/(^|[\s_-])active/);

    rerender(
      <ChangeHighlight changeId="c1" severity="minor" isActive={true}>
        hello
      </ChangeHighlight>
    );
    cls = (container.firstElementChild as HTMLElement).getAttribute('class') ?? '';
    expect(cls.toLowerCase()).toMatch(/active/);
  });

  it('calls onClick with the changeId when the wrapper is clicked', () => {
    const onClick = vi.fn();
    render(
      <ChangeHighlight changeId="c-42" severity="add" isActive={false} onClick={onClick}>
        hello world
      </ChangeHighlight>
    );
    const span = screen.getByText('hello world').closest('span') as HTMLElement;
    fireEvent.click(span);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith('c-42');
  });

  it('renders children inside the span', () => {
    render(
      <ChangeHighlight changeId="c1" severity="delete" isActive={false}>
        the doomed text
      </ChangeHighlight>
    );
    expect(screen.getByText('the doomed text')).toBeInTheDocument();
  });
});
