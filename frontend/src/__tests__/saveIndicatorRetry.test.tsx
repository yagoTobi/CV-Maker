import { fireEvent, render, screen } from '@testing-library/react';
import { SaveIndicator } from '../features/direct-edit/components/SaveIndicator';

describe('SaveIndicator Retry', () => {
  it('(a) status error + onRetry → Retry button visible, click fires once', () => {
    const onRetry = vi.fn();
    render(<SaveIndicator status="error" onRetry={onRetry} />);
    const btn = screen.getByRole('button', { name: /retry save/i });
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('(b) status saved → no Retry button', () => {
    render(<SaveIndicator status="saved" onRetry={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('(c) status error without onRetry → text only, no button', () => {
    render(<SaveIndicator status="error" />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Save failed')).toBeTruthy();
  });
});
