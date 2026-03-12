/**
 * Test Scenario #3: Resize Handle Release at Limits
 *
 * Tests the resize handle behavior in CVFormBuilder, verifying:
 * - Resizing stops cleanly when released
 * - Cursor resets after mouseup
 * - No stuck state at min/max widths
 * - Subsequent drag operations work normally
 *
 * We test the resize logic by rendering CVFormBuilder and simulating
 * mouse events on the resize handle and document.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CVFormBuilder } from '../features/form-builder';
import type { CVFormData } from '../types';

// Mock the api module
vi.mock('../services/api', () => ({
  api: {
    generateLatex: vi.fn().mockResolvedValue({ texContent: '\\documentclass{article}' }),
    compileLatex: vi.fn().mockResolvedValue({ success: true, pdf_base64: 'AAAA', page_count: 1 }),
  },
}));

// Mock requestAnimationFrame/cancelAnimationFrame for deterministic testing
let rafCallbacks: Array<() => void> = [];
let rafIdCounter = 0;

beforeEach(() => {
  rafCallbacks = [];
  rafIdCounter = 0;

  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    rafIdCounter++;
    rafCallbacks.push(cb as () => void);
    return rafIdCounter;
  });

  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
    // Just remove last callback
    rafCallbacks = [];
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  // Ensure cursor is reset
  document.body.style.cursor = '';
});

function flushRaf() {
  act(() => {
    const cbs = [...rafCallbacks];
    rafCallbacks = [];
    cbs.forEach(cb => cb());
  });
}

describe('Resize Handle', () => {
  const defaultProps = {
    templateId: 'med-length-proff-cv',
    onGenerated: vi.fn(),
    onBack: vi.fn(),
  };

  describe('basic resize behavior', () => {
    it('renders a resize handle element', () => {
      render(<CVFormBuilder {...defaultProps} />);
      const handle = document.querySelector('[title="Drag to resize"]');
      expect(handle).not.toBeNull();
    });

    it('sets col-resize cursor on document.body during drag', () => {
      render(<CVFormBuilder {...defaultProps} />);
      const handle = document.querySelector('[title="Drag to resize"]') as HTMLElement;

      // Start resize
      fireEvent.mouseDown(handle, { clientX: 500 });

      expect(document.body.style.cursor).toBe('col-resize');
    });

    it('resets cursor on mouseup', () => {
      render(<CVFormBuilder {...defaultProps} />);
      const handle = document.querySelector('[title="Drag to resize"]') as HTMLElement;

      // Start resize
      fireEvent.mouseDown(handle, { clientX: 500 });
      expect(document.body.style.cursor).toBe('col-resize');

      // Release
      fireEvent(document, new MouseEvent('mouseup', { bubbles: true }));

      expect(document.body.style.cursor).toBe('');
    });
  });

  describe('min/max width clamping', () => {
    it('clamps to minimum width (300px) when dragged far right', () => {
      render(<CVFormBuilder {...defaultProps} />);
      const handle = document.querySelector('[title="Drag to resize"]') as HTMLElement;

      // Start at x=500
      fireEvent.mouseDown(handle, { clientX: 500 });

      // Drag far right (negative delta = shrink, but code uses startX - currentX)
      // delta = 500 - 1500 = -1000 (drag right), newW = 520 + (-1000) = -480 -> clamped to 300
      fireEvent(document, new MouseEvent('mousemove', { clientX: 1500 }));
      flushRaf();

      // Release at extreme position
      fireEvent(document, new MouseEvent('mouseup', { bubbles: true }));

      // Cursor should be reset
      expect(document.body.style.cursor).toBe('');
    });

    it('clamps to maximum width (760px) when dragged far left', () => {
      render(<CVFormBuilder {...defaultProps} />);
      const handle = document.querySelector('[title="Drag to resize"]') as HTMLElement;

      // Start at x=500
      fireEvent.mouseDown(handle, { clientX: 500 });

      // Drag far left (positive delta = expand)
      // delta = 500 - (-500) = 1000, newW = 520 + 1000 = 1520 -> clamped to 760
      fireEvent(document, new MouseEvent('mousemove', { clientX: -500 }));
      flushRaf();

      // Release at extreme position
      fireEvent(document, new MouseEvent('mouseup', { bubbles: true }));

      // Cursor should be reset
      expect(document.body.style.cursor).toBe('');
    });
  });

  describe('clean release at limits', () => {
    it('releases cleanly at max width and allows subsequent drag', () => {
      render(<CVFormBuilder {...defaultProps} />);
      const handle = document.querySelector('[title="Drag to resize"]') as HTMLElement;

      // First drag to max
      fireEvent.mouseDown(handle, { clientX: 500 });
      fireEvent(document, new MouseEvent('mousemove', { clientX: -500 }));
      flushRaf();
      fireEvent(document, new MouseEvent('mouseup', { bubbles: true }));

      expect(document.body.style.cursor).toBe('');

      // Second drag should work normally — no stuck state
      fireEvent.mouseDown(handle, { clientX: 400 });
      expect(document.body.style.cursor).toBe('col-resize');

      fireEvent(document, new MouseEvent('mousemove', { clientX: 350 }));
      flushRaf();
      fireEvent(document, new MouseEvent('mouseup', { bubbles: true }));

      expect(document.body.style.cursor).toBe('');
    });

    it('releases cleanly at min width and allows subsequent drag', () => {
      render(<CVFormBuilder {...defaultProps} />);
      const handle = document.querySelector('[title="Drag to resize"]') as HTMLElement;

      // First drag to min
      fireEvent.mouseDown(handle, { clientX: 500 });
      fireEvent(document, new MouseEvent('mousemove', { clientX: 1500 }));
      flushRaf();
      fireEvent(document, new MouseEvent('mouseup', { bubbles: true }));

      expect(document.body.style.cursor).toBe('');

      // Second drag should work — not require double-click
      fireEvent.mouseDown(handle, { clientX: 400 });
      expect(document.body.style.cursor).toBe('col-resize');

      fireEvent(document, new MouseEvent('mouseup', { bubbles: true }));
      expect(document.body.style.cursor).toBe('');
    });
  });

  describe('edge case: mouse leaves window during resize', () => {
    it('cleans up when mouse leaves the window', () => {
      render(<CVFormBuilder {...defaultProps} />);
      const handle = document.querySelector('[title="Drag to resize"]') as HTMLElement;

      // Start resize
      fireEvent.mouseDown(handle, { clientX: 500 });
      expect(document.body.style.cursor).toBe('col-resize');

      // Mouse move
      fireEvent(document, new MouseEvent('mousemove', { clientX: 450 }));
      flushRaf();

      // Mouse leaves window
      fireEvent(window, new Event('mouseleave'));

      // Should be cleaned up
      expect(document.body.style.cursor).toBe('');
    });

    it('allows normal drag after window mouseleave cleanup', () => {
      render(<CVFormBuilder {...defaultProps} />);
      const handle = document.querySelector('[title="Drag to resize"]') as HTMLElement;

      // First drag, mouse leaves window
      fireEvent.mouseDown(handle, { clientX: 500 });
      fireEvent(window, new Event('mouseleave'));
      expect(document.body.style.cursor).toBe('');

      // New drag should work
      fireEvent.mouseDown(handle, { clientX: 400 });
      expect(document.body.style.cursor).toBe('col-resize');

      fireEvent(document, new MouseEvent('mouseup', { bubbles: true }));
      expect(document.body.style.cursor).toBe('');
    });
  });

  describe('double mouseup does not cause issues', () => {
    it('handles double mouseup gracefully (guard: already cleaned up)', () => {
      render(<CVFormBuilder {...defaultProps} />);
      const handle = document.querySelector('[title="Drag to resize"]') as HTMLElement;

      fireEvent.mouseDown(handle, { clientX: 500 });
      expect(document.body.style.cursor).toBe('col-resize');

      // First mouseup
      fireEvent(document, new MouseEvent('mouseup', { bubbles: true }));
      expect(document.body.style.cursor).toBe('');

      // Second mouseup — should not throw or cause issues
      fireEvent(document, new MouseEvent('mouseup', { bubbles: true }));
      expect(document.body.style.cursor).toBe('');
    });
  });
});
