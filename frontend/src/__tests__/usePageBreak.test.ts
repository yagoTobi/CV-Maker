/**
 * Tests for usePageBreak -- estimates multi-page boundaries off the rendered
 * sheet and returns the Y offsets (px, from the sheet top) of every page break
 * plus a fractional estPages used to gate the real compile.
 *
 * Geometry under test: US Letter, 0.3in top/bottom margins -> 10.4in text band.
 * We pin 1in = 100px via the probe, so one page = 1040px of content and the
 * sheet's top padding is 30px.
 *
 * Covers: UX-02 (visual indicator when content exceeds the page boundary).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePageBreak } from '../features/direct-edit/hooks/usePageBreak';

// --- Mock ResizeObserver ---
let resizeCallback: ResizeObserverCallback | null = null;
const mockDisconnect = vi.fn();
const mockObserve = vi.fn();

class MockResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback;
  }
  observe = mockObserve;
  unobserve = vi.fn();
  disconnect = mockDisconnect;
}

const OriginalResizeObserver = globalThis.ResizeObserver;
const nativeAppendChild = Node.prototype.appendChild;
const nativeRemoveChild = Node.prototype.removeChild;

const PX_PER_IN = 100;
const PAGE_TEXT_PX = 10.4 * PX_PER_IN; // 1040
const PAD = 30; // 0.3in top/bottom at 100px/in

beforeEach(() => {
  globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  mockDisconnect.mockClear();
  mockObserve.mockClear();
  resizeCallback = null;
  vi.useFakeTimers();

  // Probe: any element sized in inches reports PX_PER_IN per inch.
  vi.spyOn(document.body, 'appendChild').mockImplementation(function (this: Node, node: Node) {
    if (node instanceof HTMLElement && node.style.width === '1in') {
      Object.defineProperty(node, 'offsetWidth', { value: PX_PER_IN, configurable: true });
    }
    return nativeAppendChild.call(this, node);
  });
  vi.spyOn(document.body, 'removeChild').mockImplementation(function (this: Node, node: Node) {
    return nativeRemoveChild.call(this, node);
  });

  // Sheet padding (top/bottom) for the content-height math.
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    paddingTop: `${PAD}px`,
    paddingBottom: `${PAD}px`,
  } as CSSStyleDeclaration);
});

afterEach(() => {
  globalThis.ResizeObserver = OriginalResizeObserver;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** Sheet whose *content* height (excluding padding) is `contentHeight`. */
function makeSheet(contentHeight: number): HTMLElement {
  const el = document.createElement('div');
  Object.defineProperty(el, 'scrollHeight', { value: contentHeight + 2 * PAD, configurable: true });
  return el;
}

describe('usePageBreak', () => {
  it('returns empty when ref.current is null', () => {
    const { result } = renderHook(() => usePageBreak({ current: null }));
    expect(result.current.offsets).toEqual([]);
    expect(result.current.estPages).toBe(0);
  });

  it('returns no offsets when content fits one page', () => {
    const ref = { current: makeSheet(500) }; // 500 < 1040
    const { result } = renderHook(() => usePageBreak(ref));
    expect(result.current.offsets).toEqual([]);
    expect(result.current.estPages).toBeCloseTo(500 / PAGE_TEXT_PX, 3);
  });

  it('returns one offset (padTop + textHeight) for a two-page CV', () => {
    const ref = { current: makeSheet(1500) }; // 1040 < 1490
    const { result } = renderHook(() => usePageBreak(ref));
    expect(result.current.offsets).toEqual([1070]); // round(30 + 1040)
    expect(result.current.estPages).toBeCloseTo(1500 / PAGE_TEXT_PX, 3);
  });

  it('returns two offsets for a three-page CV', () => {
    const ref = { current: makeSheet(2200) };
    const { result } = renderHook(() => usePageBreak(ref));
    expect(result.current.offsets).toEqual([1070, 2110]); // round(30 + n*1040)
  });

  it('does not break for sub-threshold overflow (flicker prevention)', () => {
    const ref = { current: makeSheet(PAGE_TEXT_PX + 5) }; // only 5px over -> ignored
    const { result } = renderHook(() => usePageBreak(ref));
    expect(result.current.offsets).toEqual([]);
  });

  it('disconnects the observer on unmount', () => {
    const ref = { current: makeSheet(500) };
    const { unmount } = renderHook(() => usePageBreak(ref));
    expect(mockObserve).toHaveBeenCalledWith(ref.current);
    unmount();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('recomputes when ResizeObserver fires with new content height', () => {
    const el = makeSheet(500);
    const ref = { current: el };
    const { result } = renderHook(() => usePageBreak(ref));
    expect(result.current.offsets).toEqual([]);

    Object.defineProperty(el, 'scrollHeight', { value: 1500 + 2 * PAD, configurable: true });
    act(() => {
      resizeCallback?.([], {} as ResizeObserver);
      vi.advanceTimersByTime(100); // past the 80ms debounce
    });

    expect(result.current.offsets).toEqual([1070]);
  });
});
