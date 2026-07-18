/**
 * Tests for usePageCount -- authoritative page count from a real compile,
 * gated by the cheap estimate so we don't compile on every edit.
 *
 * Verifies:
 *  - estPages < 0.8  -> reports 1 page, never compiles
 *  - estPages >= 0.8 -> compiles after debounce and reports page_count
 *  - identical content (new object, same data) is deduped (no 2nd compile)
 *  - rapid changes reset the debounce (single compile)
 *  - disabled -> does nothing
 *  - compile failure -> leaves pageCount unset, clears checking
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePageCount } from '../features/direct-edit/hooks/usePageCount';
import { api } from '../services/api';
import type { CVFormData } from '../types';

vi.mock('../services/api', () => ({
  api: {
    generateLatex: vi.fn(),
    compileLatex: vi.fn(),
  },
}));

const mockGenerate = vi.mocked(api.generateLatex);
const mockCompile = vi.mocked(api.compileLatex);

function makeFormData(overrides: Partial<CVFormData> = {}): CVFormData {
  return {
    templateId: 'med-length-proff-cv',
    personalInfo: { fullName: 'A', email: '', phone: '', location: '', links: [] },
    workExperience: [],
    education: [],
    skills: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  mockGenerate.mockReset();
  mockCompile.mockReset();
  mockGenerate.mockResolvedValue({ texContent: '\\documentclass{}' });
  mockCompile.mockResolvedValue({ success: true, page_count: 2 });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('usePageCount', () => {
  it('reports 1 page and never compiles when below the gate', async () => {
    const { result } = renderHook(
      ({ fd, est }) => usePageCount(fd, est, true),
      { initialProps: { fd: makeFormData(), est: 0.5 } }
    );

    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });

    expect(result.current.pageCount).toBe(1);
    expect(result.current.isChecking).toBe(false);
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockCompile).not.toHaveBeenCalled();
  });

  it('compiles after debounce and reports the true page count when at/over the gate', async () => {
    const { result } = renderHook(
      ({ fd, est }) => usePageCount(fd, est, true),
      { initialProps: { fd: makeFormData(), est: 1.4 } }
    );

    // Before debounce: nothing yet.
    expect(mockCompile).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(1600); });

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(mockCompile).toHaveBeenCalledTimes(1);
    expect(result.current.pageCount).toBe(2);
    expect(result.current.isChecking).toBe(false);
  });

  it('dedupes identical content (new object, same data) -- no second compile', async () => {
    const { result, rerender } = renderHook(
      ({ fd, est }) => usePageCount(fd, est, true),
      { initialProps: { fd: makeFormData(), est: 1.4 } }
    );

    await act(async () => { await vi.advanceTimersByTimeAsync(1600); });
    expect(mockCompile).toHaveBeenCalledTimes(1);
    expect(result.current.pageCount).toBe(2);

    // New object reference, identical content.
    rerender({ fd: makeFormData(), est: 1.4 });
    await act(async () => { await vi.advanceTimersByTimeAsync(1600); });

    expect(mockCompile).toHaveBeenCalledTimes(1); // still 1 -- deduped
  });

  it('resets the debounce on rapid changes (single compile)', async () => {
    const { rerender } = renderHook(
      ({ fd, est }) => usePageCount(fd, est, true),
      { initialProps: { fd: makeFormData({ personalInfo: { fullName: 'A', email: '', phone: '', location: '', links: [] } }), est: 1.4 } }
    );

    await act(async () => { await vi.advanceTimersByTimeAsync(1000); }); // not yet
    rerender({ fd: makeFormData({ personalInfo: { fullName: 'B', email: '', phone: '', location: '', links: [] } }), est: 1.4 });
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); }); // reset, still not 1500 since change
    expect(mockCompile).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(800); }); // now past debounce
    expect(mockCompile).toHaveBeenCalledTimes(1);
  });

  it('does nothing when disabled', async () => {
    const { result } = renderHook(
      ({ fd, est }) => usePageCount(fd, est, false),
      { initialProps: { fd: makeFormData(), est: 1.4 } }
    );

    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });

    expect(result.current.pageCount).toBeNull();
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('leaves pageCount unset and clears checking on compile failure', async () => {
    mockCompile.mockResolvedValue({ success: false, error: 'boom', page_count: 0 });

    const { result } = renderHook(
      ({ fd, est }) => usePageCount(fd, est, true),
      { initialProps: { fd: makeFormData(), est: 1.4 } }
    );

    await act(async () => { await vi.advanceTimersByTimeAsync(1600); });

    expect(result.current.pageCount).toBeNull();
    expect(result.current.isChecking).toBe(false);
  });

  it('surfaces the overflow warning string from an above-gate compile', async () => {
    mockCompile.mockResolvedValue({
      success: true,
      pdf_base64: 'AA==',
      page_count: 1,
      warnings: ['1 line overflows the page margin — some text may be cut off'],
    });

    const { result } = renderHook(
      ({ fd, est }) => usePageCount(fd, est, true),
      { initialProps: { fd: makeFormData(), est: 1.4 } }
    );

    await act(async () => { await vi.advanceTimersByTimeAsync(1600); });

    expect(result.current.overflowWarning).toBe(
      '1 line overflows the page margin — some text may be cut off'
    );
  });

  it('reports no overflow warning when the compile returns none', async () => {
    mockCompile.mockResolvedValue({ success: true, pdf_base64: 'AA==', page_count: 1 });

    const { result } = renderHook(
      ({ fd, est }) => usePageCount(fd, est, true),
      { initialProps: { fd: makeFormData(), est: 1.4 } }
    );

    await act(async () => { await vi.advanceTimersByTimeAsync(1600); });

    expect(result.current.pageCount).toBe(1);
    expect(result.current.overflowWarning).toBeNull();
  });

  it('has no overflow warning and never compiles below the gate', async () => {
    const { result } = renderHook(
      ({ fd, est }) => usePageCount(fd, est, true),
      { initialProps: { fd: makeFormData(), est: 0.5 } }
    );

    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });

    expect(result.current.overflowWarning).toBeNull();
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockCompile).not.toHaveBeenCalled();
  });

  it('clears a stale overflow warning after dropping back below the gate', async () => {
    mockCompile.mockResolvedValue({
      success: true,
      pdf_base64: 'AA==',
      page_count: 2,
      warnings: ['1 line overflows the page margin — some text may be cut off'],
    });

    const { result, rerender } = renderHook(
      ({ fd, est }) => usePageCount(fd, est, true),
      { initialProps: { fd: makeFormData(), est: 1.4 } }
    );

    await act(async () => { await vi.advanceTimersByTimeAsync(1600); });
    expect(result.current.overflowWarning).toBe(
      '1 line overflows the page margin — some text may be cut off'
    );

    rerender({ fd: makeFormData(), est: 0.5 });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(result.current.overflowWarning).toBeNull();
  });
});
