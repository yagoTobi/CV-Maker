import { render, screen, fireEvent } from '@testing-library/react';
import { PostSavePrompt } from '../features/direct-edit/components/PostSavePrompt';

describe('PostSavePrompt Download PDF', () => {
  const baseProps = {
    isOpen: true,
    onTuneAnotherJob: vi.fn(),
    onBackToOriginal: vi.fn(),
    onViewInDashboard: vi.fn(),
    onDismiss: vi.fn(),
    onDownload: vi.fn(),
  };

  it('renders Download PDF button and fires onDownload without dismissing', () => {
    const onDownload = vi.fn();
    const onDismiss = vi.fn();
    render(<PostSavePrompt {...baseProps} onDownload={onDownload} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));
    expect(onDownload).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('shows Generating… and disables while isDownloading', () => {
    render(<PostSavePrompt {...baseProps} isDownloading />);
    const btn = screen.getByRole('button', { name: /generating/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('does not render when closed', () => {
    render(<PostSavePrompt {...baseProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
