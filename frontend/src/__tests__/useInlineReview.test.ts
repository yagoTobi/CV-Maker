import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { RefObject } from 'react';
import { useInlineReview, type InlineReviewTailor } from '../features/direct-edit/hooks/useInlineReview';
import type { TailorChange, TailorResponse } from '../types';

function change(id: string, fieldPath: string, section = 'Work Experience'): TailorChange {
  return {
    id,
    fieldPath,
    section,
    description: `desc ${id}`,
    currentValue: 'old text here',
    alternatives: [{ label: 'A', value: 'brand new replacement text entirely' }],
    changeType: 'modify',
  };
}

function makeTailor(changes: TailorChange[]) {
  const acceptChange = vi.fn();
  const skipChange = vi.fn();
  const response: TailorResponse = { changes, estimatedScore: 80, summary: '' };
  const tailor: InlineReviewTailor = {
    tailorResponse: response,
    appliedChanges: new Set<string>(),
    skippedChanges: new Set<string>(),
    acceptChange,
    skipChange,
    selectAlternative: vi.fn(),
    editChangeValue: vi.fn(),
    selectedAlternatives: new Map<string, number>(),
  };
  return { tailor, acceptChange, skipChange };
}

function renderReview(changes: TailorChange[]) {
  const { tailor, acceptChange, skipChange } = makeTailor(changes);
  const containerRef: RefObject<HTMLElement | null> = { current: null };
  const hook = renderHook(() => useInlineReview({ tailor, containerRef }));
  return { result: hook.result, acceptChange, skipChange };
}

describe('useInlineReview', () => {
  it('G5: produces a highlight span for EVERY pending change, keyed by fieldPath', () => {
    const { result } = renderReview([
      change('c1', 'workExperience[0].bullets[0]'),
      change('c2', 'skills[0].skills'),
    ]);
    const map = result.current.highlightSpansByFieldPath;
    expect(map.size).toBe(2);
    expect(map.get('workExperience[0].bullets[0]')?.[0]?.changeId).toBe('c1');
    expect(map.get('skills[0].skills')?.[0]?.changeId).toBe('c2');
  });

  it('G6: setActiveChange marks that change span active (and only it)', () => {
    const { result } = renderReview([change('c1', 'a'), change('c2', 'b')]);
    act(() => result.current.setActiveChange('c1'));
    expect(result.current.highlightSpansByFieldPath.get('a')?.[0]?.isActive).toBe(true);
    expect(result.current.highlightSpansByFieldPath.get('b')?.[0]?.isActive).toBe(false);
    expect(result.current.activeChange?.id).toBe('c1');
  });

  it('acceptActive applies via tailor then auto-advances to the next change (D-20)', () => {
    const { result, acceptChange } = renderReview([change('c1', 'a'), change('c2', 'b')]);
    act(() => result.current.setActiveChange('c1'));
    act(() => result.current.acceptActive('c1'));
    expect(acceptChange).toHaveBeenCalledWith('c1');
    expect(result.current.activeChange?.id).toBe('c2');
  });

  it('skipActive on the last change advances to null (popover closes)', () => {
    const { result, skipChange } = renderReview([change('c1', 'a'), change('c2', 'b')]);
    act(() => result.current.setActiveChange('c2'));
    act(() => result.current.skipActive('c2'));
    expect(skipChange).toHaveBeenCalledWith('c2');
    expect(result.current.activeChange).toBeNull();
  });

  it('autoDismiss skips the change (type-through, D-16)', () => {
    const { result, skipChange } = renderReview([change('c1', 'a')]);
    act(() => result.current.autoDismiss('c1'));
    expect(skipChange).toHaveBeenCalledWith('c1');
  });
});
