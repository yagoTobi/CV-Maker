/**
 * useAutoSave tests -- covers UX-01 (auto-save with debounce + status indicator).
 *
 * Tests that useAutoSave:
 * - Starts with 'idle' status
 * - Transitions to 'saving' after 2500ms debounce when formData changes
 * - Transitions to 'saved' after successful save (PATCH path for non-null versionId)
 * - Transitions to 'error' after failed save
 * - Resets debounce timer when formData changes again before timeout
 * - Skips save when formData is unchanged (same JSON)
 * - Skips save when formData is null
 * - Cleans up timeout on unmount
 * - Uses POST (saveVersion) when versionId is null (first save)
 * - Uses PATCH (updateVersionFull) when versionId is non-null (subsequent saves)
 * - Calls onNeedName() to collect version name on first save when callback is provided
 * - Calls onFirstSave(version) after successful first POST
 *
 * Uses vi.useFakeTimers() for debounce testing.
 * Mocks api.saveVersion and api.updateVersionFull.
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
    updateVersionFull: vi.fn(),
  },
}));

const mockSaveVersion = vi.mocked(api.saveVersion);
const mockUpdateVersionFull = vi.mocked(api.updateVersionFull);

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
    mockUpdateVersionFull.mockReset();
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
    // Use a deferred promise so save stays pending (PATCH path for non-null versionId)
    let resolvePromise: (v: boolean) => void;
    mockUpdateVersionFull.mockImplementation(
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
      resolvePromise!(true);
    });
  });

  it('status becomes saved after successful save', async () => {
    const formData = makeFormData();
    // PATCH path: updateVersionFull returns boolean
    mockUpdateVersionFull.mockResolvedValue(true);

    const { result } = renderHook(
      ({ fd, vid }) => useAutoSave(fd, vid),
      { initialProps: { fd: formData, vid: 'v1' } }
    );

    // Advance timer and let the promise resolve
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(result.current).toBe('saved');
    expect(mockUpdateVersionFull).toHaveBeenCalledTimes(1);
  });

  it('status becomes error after failed save', async () => {
    const formData = makeFormData();
    // PATCH path: rejection causes error status
    mockUpdateVersionFull.mockRejectedValue(new Error('Network error'));

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
    // PATCH path: false return causes error status
    mockUpdateVersionFull.mockResolvedValue(false);

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
    // Use valid templateIds so the sentinel guard does not skip the save
    const formData1 = makeFormData({ templateId: 'med-length-proff-cv' });
    const formData2 = makeFormData({
      templateId: 'med-length-proff-cv',
      workExperience: [{ company: 'ACME', title: 'Dev', location: '', startDate: '', endDate: '', bullets: [] }],
    });
    mockUpdateVersionFull.mockResolvedValue(true);

    const { result, rerender } = renderHook(
      ({ fd, vid }) => useAutoSave(fd, vid),
      { initialProps: { fd: formData1, vid: 'v1' } }
    );

    // Advance 1500ms (not yet at 2500ms)
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current).toBe('idle');
    expect(mockUpdateVersionFull).not.toHaveBeenCalled();

    // Change formData -- should reset timer
    rerender({ fd: formData2, vid: 'v1' });

    // Advance another 1500ms (only 1500ms since last change, not yet 2500ms)
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current).toBe('idle');
    expect(mockUpdateVersionFull).not.toHaveBeenCalled();

    // Advance to full 2500ms from last change
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current).toBe('saved');
    expect(mockUpdateVersionFull).toHaveBeenCalledTimes(1);
  });

  it('does not fire if formData is unchanged since last save', async () => {
    const formData = makeFormData();
    mockUpdateVersionFull.mockResolvedValue(true);

    const { result, rerender } = renderHook(
      ({ fd, vid }) => useAutoSave(fd, vid),
      { initialProps: { fd: formData, vid: 'v1' } }
    );

    // Let first save happen
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(result.current).toBe('saved');
    expect(mockUpdateVersionFull).toHaveBeenCalledTimes(1);

    // Rerender with the same formData (same reference even)
    rerender({ fd: formData, vid: 'v1' });

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    // Still only 1 call -- no redundant save
    expect(mockUpdateVersionFull).toHaveBeenCalledTimes(1);
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
    expect(mockUpdateVersionFull).not.toHaveBeenCalled();
  });

  it('clears timeout on unmount', async () => {
    const formData = makeFormData();
    mockUpdateVersionFull.mockResolvedValue(true);

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
    expect(mockUpdateVersionFull).not.toHaveBeenCalled();
  });

  it('passes correct data to saveVersion on first save (versionId null)', async () => {
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
      { initialProps: { fd: formData, vid: null } }
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

  it('uses PATCH (updateVersionFull) when versionId is non-null', async () => {
    const formData = makeFormData();
    mockUpdateVersionFull.mockResolvedValue(true);

    const { result } = renderHook(
      ({ fd, vid }) => useAutoSave(fd, vid),
      { initialProps: { fd: formData, vid: 'existing-id' } }
    );

    await act(async () => { vi.advanceTimersByTime(2500); });

    expect(result.current).toBe('saved');
    expect(mockUpdateVersionFull).toHaveBeenCalledWith(
      'existing-id',
      expect.objectContaining({ formData, texContent: '' })
    );
    expect(mockSaveVersion).not.toHaveBeenCalled();
  });

  it('PATCH returning false results in error status', async () => {
    const formData = makeFormData();
    mockUpdateVersionFull.mockResolvedValue(false);

    const { result } = renderHook(
      ({ fd, vid }) => useAutoSave(fd, vid),
      { initialProps: { fd: formData, vid: 'existing-id' } }
    );

    await act(async () => { vi.advanceTimersByTime(2500); });

    expect(result.current).toBe('error');
  });

  it('calls onNeedName and uses returned name for first POST when versionId is null', async () => {
    const formData = makeFormData();
    const mockOnNeedName = vi.fn().mockResolvedValue('My Marketing CV');
    const mockOnFirstSave = vi.fn();
    const savedVersion = makeVersion('new-id');
    mockSaveVersion.mockResolvedValue(savedVersion);

    renderHook(
      ({ fd, vid }) => useAutoSave(fd, vid, {
        onNeedName: mockOnNeedName,
        onFirstSave: mockOnFirstSave,
      }),
      { initialProps: { fd: formData, vid: null as string | null } }
    );

    await act(async () => { vi.advanceTimersByTime(2500); });

    expect(mockOnNeedName).toHaveBeenCalledTimes(1);
    expect(mockSaveVersion).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'My Marketing CV' })
    );
    expect(mockOnFirstSave).toHaveBeenCalledWith(savedVersion);
    expect(mockUpdateVersionFull).not.toHaveBeenCalled();
  });

  it('falls back to fullName when onNeedName resolves with empty string', async () => {
    const formData = makeFormData({
      personalInfo: {
        fullName: '',
        email: '',
        phone: '',
        location: '',
        links: [],
      },
    });
    const mockOnNeedName = vi.fn().mockResolvedValue('');
    mockSaveVersion.mockResolvedValue(makeVersion('new-id'));

    renderHook(
      ({ fd, vid }) => useAutoSave(fd, vid, { onNeedName: mockOnNeedName }),
      { initialProps: { fd: formData, vid: null as string | null } }
    );

    await act(async () => { vi.advanceTimersByTime(2500); });

    expect(mockSaveVersion).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Untitled CV' })
    );
  });

  it('does not call onFirstSave if POST returns null', async () => {
    const formData = makeFormData();
    const mockOnNeedName = vi.fn().mockResolvedValue('Test CV');
    const mockOnFirstSave = vi.fn();
    mockSaveVersion.mockResolvedValue(null);

    const { result } = renderHook(
      ({ fd, vid }) => useAutoSave(fd, vid, {
        onNeedName: mockOnNeedName,
        onFirstSave: mockOnFirstSave,
      }),
      { initialProps: { fd: formData, vid: null as string | null } }
    );

    await act(async () => { vi.advanceTimersByTime(2500); });

    expect(result.current).toBe('error');
    expect(mockOnFirstSave).not.toHaveBeenCalled();
  });
});
