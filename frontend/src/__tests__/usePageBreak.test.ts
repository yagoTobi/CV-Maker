/**
 * Tests for usePageBreak hook -- detects when CV content exceeds one
 * US Letter page height (11in) and returns the pixel Y offset where
 * page 2 starts.
 *
 * Covers: UX-02 (visual indicator when content exceeds page boundary).
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

// Store original and override
const OriginalResizeObserver = globalThis.ResizeObserver;

// Capture native DOM methods from prototype to avoid spy recursion
const nativeAppendChild = Node.prototype.appendChild;
const nativeRemoveChild = Node.prototype.removeChild;

beforeEach(() => {
  globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  mockDisconnect.mockClear();
  mockObserve.mockClear();
  resizeCallback = null;
  vi.useFakeTimers();
});

afterEach(() => {
  globalThis.ResizeObserver = OriginalResizeObserver;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// Helper: create a mock element with a given scrollHeight
function makeMockElement(scrollHeight: number): HTMLElement {
  const el = document.createElement('div');
  Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true });
  return el;
}

// Helper: mock the probe div to return a known page height in pixels.
// At 96 DPI, 11in = 1056px. We intercept appendChild to set offsetWidth
// on the probe div before it's measured.
function mockProbeWidth(pxValue: number) {
  vi.spyOn(document.body, 'appendChild').mockImplementation(function (this: Node, node: Node) {
    if (node instanceof HTMLElement && node.style.width === '11in') {
      Object.defineProperty(node, 'offsetWidth', { value: pxValue, configurable: true });
    }
    return nativeAppendChild.call(this, node);
  });

  vi.spyOn(document.body, 'removeChild').mockImplementation(function (this: Node, node: Node) {
    return nativeRemoveChild.call(this, node);
  });
}

describe('usePageBreak', () => {
  it('returns null when containerRef.current is null', () => {
    const ref = { current: null };
    const { result } = renderHook(() => usePageBreak(ref));

    expect(result.current).toBeNull();
  });

  it('returns null when content height is less than page height', () => {
    const el = makeMockElement(500); // 500px < 1056px (11in at 96dpi)
    const ref = { current: el };

    mockProbeWidth(1056);

    const { result } = renderHook(() => usePageBreak(ref));

    // Initial calculate runs synchronously
    expect(result.current).toBeNull();
  });

  it('returns pixel offset when content height exceeds page height + threshold', () => {
    const el = makeMockElement(1200); // 1200px > 1056px + 10 threshold
    const ref = { current: el };

    mockProbeWidth(1056);

    const { result } = renderHook(() => usePageBreak(ref));

    // Initial calculate runs synchronously
    expect(result.current).toBe(1056);
  });

  it('does not return pageBreakY when content exceeds by less than 10px threshold (flicker prevention)', () => {
    // Content exceeds page height by only 5px (less than 10px threshold)
    const el = makeMockElement(1061); // 1061 - 1056 = 5px, less than 10px threshold
    const ref = { current: el };

    mockProbeWidth(1056);

    const { result } = renderHook(() => usePageBreak(ref));

    expect(result.current).toBeNull();
  });

  it('cleans up observer on unmount (observer.disconnect called)', () => {
    const el = makeMockElement(500);
    const ref = { current: el };

    mockProbeWidth(1056);

    const { unmount } = renderHook(() => usePageBreak(ref));

    expect(mockObserve).toHaveBeenCalledWith(el);

    unmount();

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('updates when ResizeObserver fires with new content height', () => {
    const el = makeMockElement(500); // starts under page height
    const ref = { current: el };

    mockProbeWidth(1056);

    const { result } = renderHook(() => usePageBreak(ref));

    expect(result.current).toBeNull();

    // Simulate content growing past threshold
    Object.defineProperty(el, 'scrollHeight', { value: 1200, configurable: true });

    // Trigger ResizeObserver callback
    act(() => {
      if (resizeCallback) {
        resizeCallback([], {} as ResizeObserver);
      }
      // Advance past debounce timer (80ms)
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe(1056);
  });
});
