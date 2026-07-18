/**
 * toast.test.tsx -- Toast foundation (T1).
 *
 * Covers the ToastProvider / useToast() surface and the truncateError util.
 * Renders through the real <MemoryRouter><AppProvider> tree (AppProvider now
 * mounts ToastProvider as its outermost provider), with the api module mocked
 * so the provider subtree stays offline and deterministic.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import type { ToastApi } from '../contexts/ToastContext';
import { truncateError } from '../utils/errorMessages';

// Keep the AppProvider subtree (ToolsProvider hooks) offline & deterministic.
vi.mock('../services/api', () => ({
  api: {
    loadUserData: vi.fn().mockResolvedValue(null),
    listVersions: vi.fn().mockResolvedValue({ versions: [], ungrouped: [] }),
    getVersion: vi.fn().mockResolvedValue(null),
    fetchTemplates: vi.fn().mockResolvedValue([]),
    loadTemplateContent: vi.fn().mockResolvedValue({ content: '', clsContent: null }),
    importCV: vi.fn(),
    generateLatex: vi.fn().mockResolvedValue({ texContent: '' }),
    compileLatex: vi.fn().mockResolvedValue({ success: true, pdf_base64: 'AA==', page_count: 1 }),
  },
}));

// Capture the live toast API from inside the provider tree.
let toastApi: ToastApi | null = null;
function CaptureToast() {
  toastApi = useToast();
  return null;
}

async function renderWithProvider() {
  const result = render(
    <MemoryRouter>
      <AppProvider>
        <CaptureToast />
      </AppProvider>
    </MemoryRouter>,
  );
  // Flush ToolsProvider's async mount (fetchTemplates etc.) under act.
  await act(async () => {});
  return result;
}

describe('Toast foundation', () => {
  beforeEach(() => {
    toastApi = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('(a) toast.error renders role="alert" + message; dismiss button removes it', async () => {
    await renderWithProvider();
    act(() => {
      toastApi!.error('boom');
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('boom');

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByText('boom')).not.toBeInTheDocument();
  });

  it('(b) auto-dismisses after its duration', async () => {
    await renderWithProvider();
    vi.useFakeTimers();

    act(() => {
      toastApi!.error('auto');
    });
    expect(screen.getByText('auto')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(screen.queryByText('auto')).not.toBeInTheDocument();
  });

  it('(c) action button fires its onClick', async () => {
    await renderWithProvider();
    const onClick = vi.fn();
    act(() => {
      toastApi!.error('with action', { action: { label: 'Retry', onClick } });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('(d) a 4th toast drops the oldest (max 3 visible)', async () => {
    await renderWithProvider();
    act(() => {
      toastApi!.error('one');
      toastApi!.error('two');
      toastApi!.error('three');
      toastApi!.error('four');
    });

    expect(screen.getAllByRole('alert')).toHaveLength(3);
    expect(screen.queryByText('one')).not.toBeInTheDocument();
    expect(screen.getByText('two')).toBeInTheDocument();
    expect(screen.getByText('three')).toBeInTheDocument();
    expect(screen.getByText('four')).toBeInTheDocument();
  });

  it('(f) useToast() outside a provider throws an error naming ToastProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useToast())).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});

describe('truncateError', () => {
  it('(e) collapses newlines and truncates long input to <=201 chars with no newlines', () => {
    const out = truncateError('a\n'.repeat(300));
    expect(out.length).toBeLessThanOrEqual(201);
    expect(out).not.toContain('\n');
  });

  it('returns "Unknown error" for empty / null / undefined / whitespace-only', () => {
    expect(truncateError('')).toBe('Unknown error');
    expect(truncateError(null)).toBe('Unknown error');
    expect(truncateError(undefined)).toBe('Unknown error');
    expect(truncateError('   \n  ')).toBe('Unknown error');
  });

  it('returns short input unchanged', () => {
    expect(truncateError('short message')).toBe('short message');
  });
});
