import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../contexts/AppContext';
import { PageCountIndicator } from '../features/direct-edit/components/PageCountIndicator';

function AppWrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <AppProvider>{children}</AppProvider>
    </MemoryRouter>
  );
}

describe('PageCountIndicator', () => {
  it('renders overflow chip with title when warning prop is set', () => {
    render(
      <PageCountIndicator pageCount={2} isChecking={false} warning="1 line overflows the page margin" />,
      { wrapper: AppWrapper },
    );

    const chip = screen.getByRole('status', { hidden: true });
    expect(chip).toBeTruthy();
    expect(chip.getAttribute('title')).toBe('1 line overflows the page margin');
  });

  it('does not render overflow chip when warning is null', () => {
    render(
      <PageCountIndicator pageCount={1} isChecking={false} warning={null} />,
      { wrapper: AppWrapper },
    );

    expect(screen.queryByRole('status', { hidden: true })).toBeNull();
  });
});
