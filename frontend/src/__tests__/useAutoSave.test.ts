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
import type { SaveStatus, AutoSaveState } from '../features/direct-edit/hooks/useAutoSave';
import { api } from '../services/api';
import type { CVFormData, CVVersion } from '../types';

// Verify exported type is available
const _typeCheck: SaveStatus = 'idle';
void _typeCheck;
const _stateTypeCheck: AutoSaveState = { status: 'idle', isDirty: false, retry: () => {} };
void _stateTypeCheck;

// Mock the api module
vi.mock('../services/api', () => ({
  api: {
    saveVersion: vi.fn(),
    updateVersionFull: vi.fn(),
  },
}));

const mockSaveVersion = vi.mocked(api.saveVersion);
const mockUpdateVersionFull = vi.mocked(api.updateVersionFull);
const DEBOUNCE_MS = 2500;

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
    expect(result.current.status).toBe('idle');
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

    expect(result.current.status).toBe('idle');

    // Advance past the debounce threshold
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(result.current.status).toBe('saving');

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

    expect(result.current.status).toBe('saved');
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

    expect(result.current.status).toBe('error');
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

    expect(result.current.status).toBe('error');
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

    expect(result.current.status).toBe('idle');
    expect(mockUpdateVersionFull).not.toHaveBeenCalled();

    // Change formData -- should reset timer
    rerender({ fd: formData2, vid: 'v1' });

    // Advance another 1500ms (only 1500ms since last change, not yet 2500ms)
    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.status).toBe('idle');
    expect(mockUpdateVersionFull).not.toHaveBeenCalled();

    // Advance to full 2500ms from last change
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.status).toBe('saved');
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

    expect(result.current.status).toBe('saved');
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

    expect(result.current.status).toBe('idle');
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

    expect(result.current.status).toBe('saved');
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

    expect(result.current.status).toBe('error');
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

    expect(result.current.status).toBe('error');
    expect(mockOnFirstSave).not.toHaveBeenCalled();
  });

  describe('isDirty and retry', () => {
    it('(a) isDirty false after hydration, true after change, false after save', async () => {
      mockUpdateVersionFull.mockResolvedValue(true);
      const cv1 = makeFormData();
      const cv2 = makeFormData({ personalInfo: { ...makeFormData().personalInfo, fullName: 'Edited' } });

      const { result, rerender } = renderHook(
        ({ fd, vid }: { fd: CVFormData | null; vid: string | null }) => useAutoSave(fd, vid),
        { initialProps: { fd: null as CVFormData | null, vid: null as string | null } },
      );

      act(() => { rerender({ fd: cv1, vid: 'v1' }); });
      expect(result.current.isDirty).toBe(false);

      act(() => { rerender({ fd: cv2, vid: 'v1' }); });
      expect(result.current.isDirty).toBe(true);

      await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));
      expect(result.current.isDirty).toBe(false);
    });

    it('(a2) SWITCH: change formData+versionId together after save → isDirty false, no PATCH', async () => {
      mockUpdateVersionFull.mockResolvedValue(true);
      const cv1 = makeFormData();
      const cv2 = makeFormData({ personalInfo: { ...makeFormData().personalInfo, fullName: 'CV2' } });

      const { result, rerender } = renderHook(
        ({ fd, vid }: { fd: CVFormData; vid: string }) => useAutoSave(fd, vid),
        { initialProps: { fd: cv1, vid: 'v1' } },
      );

      await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));
      expect(result.current.isDirty).toBe(false);
      expect(mockUpdateVersionFull).toHaveBeenCalledTimes(1);

      act(() => { rerender({ fd: cv2, vid: 'v2' }); });
      expect(result.current.isDirty).toBe(false);

      await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));
      expect(mockUpdateVersionFull).toHaveBeenCalledTimes(1);
    });

    it('(a3) HYDRATION: null+null → data+id → no save, isDirty false, beforeunload not prevented', async () => {
      const cv1 = makeFormData();

      const { result, rerender } = renderHook(
        ({ fd, vid }: { fd: CVFormData | null; vid: string | null }) => useAutoSave(fd, vid),
        { initialProps: { fd: null as CVFormData | null, vid: null as string | null } },
      );

      act(() => { rerender({ fd: cv1, vid: 'v1' }); });
      expect(result.current.isDirty).toBe(false);

      await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));
      expect(mockSaveVersion).not.toHaveBeenCalled();
      expect(mockUpdateVersionFull).not.toHaveBeenCalled();

      const e = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(e);
      expect(e.defaultPrevented).toBe(false);
    });

    it('(a4) UNSAVED: formData non-null, versionId null → POST after debounce, isDirty true before', async () => {
      let resolvePost: (v: CVVersion | null) => void;
      mockSaveVersion.mockImplementation(() => new Promise(r => { resolvePost = r; }));

      const cv1 = makeFormData();
      const { result } = renderHook(() =>
        useAutoSave(cv1, null, { onNeedName: async () => 'Test CV' }),
      );

      expect(result.current.isDirty).toBe(true);

      await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));
      expect(mockSaveVersion).toHaveBeenCalledTimes(1);
      expect(result.current.status).toBe('saving');

      await act(async () => { resolvePost!(makeVersion('v1')); });
      expect(result.current.status).toBe('saved');
    });

    it('(a5) POST-RACE: edit during POST + versionId arrives → isDirty true, PATCH scheduled', async () => {
      let resolvePost: (v: CVVersion | null) => void;
      mockSaveVersion.mockImplementation(() => new Promise(r => { resolvePost = r; }));
      mockUpdateVersionFull.mockResolvedValue(true);

      const cv1 = makeFormData();
      const cv2 = makeFormData({ personalInfo: { ...makeFormData().personalInfo, fullName: 'Edited' } });

      const { result, rerender } = renderHook(
        ({ fd, vid }: { fd: CVFormData; vid: string | null }) => useAutoSave(fd, vid, { onNeedName: async () => 'Test' }),
        { initialProps: { fd: cv1, vid: null as string | null } },
      );

      await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));
      expect(mockSaveVersion).toHaveBeenCalledTimes(1);

      act(() => { rerender({ fd: cv2, vid: null }); });

      await act(async () => {
        resolvePost!(makeVersion('v1'));
        rerender({ fd: cv2, vid: 'v1' });
      });

      await act(() => vi.advanceTimersByTimeAsync(0));
      expect(result.current.isDirty).toBe(true);

      await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));
      expect(mockUpdateVersionFull).toHaveBeenCalledWith('v1', expect.objectContaining({ formData: cv2 }));
    });

    it('(b) retry() triggers immediate save without waiting debounce', async () => {
      mockUpdateVersionFull.mockResolvedValue(true);
      const cv1 = makeFormData();

      const { result } = renderHook(() => useAutoSave(cv1, 'v1'));

      await act(async () => {
        result.current.retry();
      });

      expect(mockUpdateVersionFull).toHaveBeenCalledTimes(1);
    });

    it('(b2) NAME-CACHE: onNeedName called once even when first POST fails and retry succeeds', async () => {
      const onNeedName = vi.fn().mockResolvedValue('Alice CV');
      mockSaveVersion
        .mockResolvedValueOnce(null)
        .mockResolvedValue(makeVersion('v1'));

      const cv1 = makeFormData();
      const { result } = renderHook(() => useAutoSave(cv1, null, { onNeedName }));

      await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));
      expect(result.current.status).toBe('error');
      expect(onNeedName).toHaveBeenCalledTimes(1);

      await act(async () => { result.current.retry(); });
      expect(result.current.status).toBe('saved');
      expect(onNeedName).toHaveBeenCalledTimes(1);
    });

    it('(c) beforeunload: defaultPrevented when dirty, not prevented when clean', async () => {
      mockUpdateVersionFull.mockResolvedValue(true);
      const cv1 = makeFormData();

      const { result } = renderHook(() => useAutoSave(cv1, 'v1'));

      expect(result.current.isDirty).toBe(true);

      const e1 = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(e1);
      expect(e1.defaultPrevented).toBe(true);

      await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));
      expect(result.current.isDirty).toBe(false);

      const e2 = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(e2);
      expect(e2.defaultPrevented).toBe(false);
    });

    it('failure: updateVersionFull returns false → status error, isDirty true, retry re-attempts', async () => {
      mockUpdateVersionFull
        .mockResolvedValueOnce(false)
        .mockResolvedValue(true);

      const cv1 = makeFormData();
      const { result } = renderHook(() => useAutoSave(cv1, 'v1'));

      await act(() => vi.advanceTimersByTimeAsync(DEBOUNCE_MS));
      expect(result.current.status).toBe('error');
      expect(result.current.isDirty).toBe(true);

      await act(async () => { result.current.retry(); });
      expect(mockUpdateVersionFull).toHaveBeenCalledTimes(2);
    });
  });
});
