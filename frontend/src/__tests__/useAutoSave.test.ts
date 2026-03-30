/**
 * useAutoSave tests -- covers UX-01 (auto-save with debounce + status indicator).
 *
 * Tests that useAutoSave:
 * - Starts with 'idle' status
 * - Transitions to 'saving' after 2500ms debounce when formData changes
 * - Transitions to 'saved' after successful save
 * - Transitions to 'error' after failed save
 * - Resets debounce timer when formData changes again before timeout
 * - Skips save when formData is unchanged (same JSON)
 * - Skips save when formData is null
 * - Cleans up timeout on unmount
 *
 * Uses vi.useFakeTimers() for debounce testing.
 * Mocks api.saveVersion via vi.spyOn.
 */
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from '../features/direct-edit/hooks/useAutoSave';
import type { SaveStatus } from '../features/direct-edit/hooks/useAutoSave';
import { api } from '../services/api';
import type { CVFormData, CVVersion } from '../types';

// Verify exported type is available
const _typeCheck: SaveStatus = 'idle';
void _typeCheck;

// Mock the api module
vi.mock('../services/api', () => ({
  api: {
    saveVersion: vi.fn(),
  },
}));

const mockSaveVersion = vi.mocked(api.saveVersion);

function makeFormData(overrides: Partial<CVFormData> = {}): CVFormData {
  return {
    templateId: 'med-length-proff-cv',
    personalInfo: {
      fullName: 'John Doe',
      email: 'john@example.com',
      phone: '555-1234',
      location: 'NYC',
      links: [],
    },
    workExperience: [],
    education: [],
    skills: [],
    ...overrides,
  };
}

function makeVersion(id: string): CVVersion {
  return {
    id,
    name: 'Test CV',
    templateId: 'med-length-proff-cv',
    texContent: '',
    createdAt: new Date().toISOString(),
  };
}

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSaveVersion.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initial status is idle', () => {
    const { result } = renderHook(() => useAutoSave(null, null));
    expect(result.current).toBe('idle');
  });

  it('status becomes saving after 2500ms debounce when formData changes', async () => {
    const formData = makeFormData();
    // Use a deferred promise so save stays pending
    let resolvePromise: (v: CVVersion) => void;
    mockSaveVersion.mockImplementation(
      () => new Promise((resolve) => { resolvePromise = resolve; })
    );

    const { result } = renderHook(
      ({ fd, vid }) => useAutoSave(fd, vid),
      { initialProps: { fd: formData, vid: 'v1' } }
    );

    expect(result.current).toBe('idle');

    // Advance past the debounce threshold
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(result.current).toBe('saving');

    // Clean up: resolve the pending promise
    await act(async () => {
      resolvePromise!(makeVersion('v1'));
    });
  });

  it('status becomes saved after successful save', async () => {
    const formData = makeFormData();
    mockSaveVersion.mockResolvedValue(makeVersion('v1'));

    const { result } = renderHook(
      ({ fd, vid }) => useAutoSave(fd, vid),
      { initialProps: { fd: formData, vid: 'v1' } }
    );

    // Advance timer and let the promise resolve
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(result.current).toBe('saved');
    expect(mockSaveVersion).toHaveBeenCalledTimes(1);
  });

  it('status becomes error after failed save', async () => {
    const formData = makeFormData();
    mockSaveVersion.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(
      ({ fd, vid }) => useAutoSave(fd, vid),
      { initialProps: { fd: formData, vid: 'v1' } }
    );

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(result.current).toBe('error');
  });

  it('status becomes error when save returns null', async () => {
    const formData = makeFormData();
    mockSaveVersion.mockResolvedValue(null);

    const { result } = renderHook(
      ({ fd, vid }) => useAutoSave(fd, vid),
      { initialProps: { fd: formData, vid: 'v1' } }
    );

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(result.current).toBe('error');
  });

  it('resets debounce when formData changes before timeout', async () => {
    const formData1 = makeFormData({ templateId: 'template-1' });
    const formData2 = makeFormData({ templateId: 'template-2' });
    mockSaveVersion.mockResolvedValue(makeVersion('v1'));

    const { result, rerender } = renderHook(
      ({ fd, vid }) => useAutoSave(fd, vid),
      { initialProps: { fd: formData1, vid: 'v1' } }
    );

    // Advance 1500ms (not yet at 2500ms)
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current).toBe('idle');
    expect(mockSaveVersion).not.toHaveBeenCalled();

    // Change formData -- should reset timer
    rerender({ fd: formData2, vid: 'v1' });

    // Advance another 1500ms (only 1500ms since last change, not yet 2500ms)
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current).toBe('idle');
    expect(mockSaveVersion).not.toHaveBeenCalled();

    // Advance to full 2500ms from last change
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current).toBe('saved');
    expect(mockSaveVersion).toHaveBeenCalledTimes(1);
  });

  it('does not fire if formData is unchanged since last save', async () => {
    const formData = makeFormData();
    mockSaveVersion.mockResolvedValue(makeVersion('v1'));

    const { result, rerender } = renderHook(
      ({ fd, vid }) => useAutoSave(fd, vid),
      { initialProps: { fd: formData, vid: 'v1' } }
    );

    // Let first save happen
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(result.current).toBe('saved');
    expect(mockSaveVersion).toHaveBeenCalledTimes(1);

    // Rerender with the same formData (same reference even)
    rerender({ fd: formData, vid: 'v1' });

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    // Still only 1 call -- no redundant save
    expect(mockSaveVersion).toHaveBeenCalledTimes(1);
  });

  it('does not fire if formData is null', async () => {
    const { result } = renderHook(
      ({ fd, vid }) => useAutoSave(fd, vid),
      { initialProps: { fd: null as CVFormData | null, vid: 'v1' } }
    );

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current).toBe('idle');
    expect(mockSaveVersion).not.toHaveBeenCalled();
  });

  it('clears timeout on unmount', async () => {
    const formData = makeFormData();
    mockSaveVersion.mockResolvedValue(makeVersion('v1'));

    const { unmount } = renderHook(
      ({ fd, vid }) => useAutoSave(fd, vid),
      { initialProps: { fd: formData, vid: 'v1' } }
    );

    // Advance partially
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // Unmount before debounce fires
    unmount();

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // Save should NOT have been called because component unmounted
    expect(mockSaveVersion).not.toHaveBeenCalled();
  });

  it('passes correct data to saveVersion', async () => {
    const formData = makeFormData({
      personalInfo: {
        fullName: 'Jane Smith',
        email: 'jane@example.com',
        phone: '555-0000',
        location: 'SF',
        links: [],
      },
    });
    mockSaveVersion.mockResolvedValue(makeVersion('v1'));

    renderHook(
      ({ fd, vid }) => useAutoSave(fd, vid),
      { initialProps: { fd: formData, vid: 'v1' } }
    );

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(mockSaveVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Jane Smith',
        templateId: 'med-length-proff-cv',
        texContent: '',
        formData,
      })
    );
  });

  it('uses "Untitled CV" as name when fullName is empty', async () => {
    const formData = makeFormData({
      personalInfo: {
        fullName: '',
        email: '',
        phone: '',
        location: '',
        links: [],
      },
    });
    mockSaveVersion.mockResolvedValue(makeVersion('v1'));

    renderHook(
      ({ fd, vid }) => useAutoSave(fd, vid),
      { initialProps: { fd: formData, vid: null } }
    );

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(mockSaveVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Untitled CV',
      })
    );
  });
});
