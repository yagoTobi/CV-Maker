// Analog: frontend/src/__tests__/useDirectEditor.test.ts (renderHook + module-mocking pattern)
// Implements D-04, D-12, D-25 contract per .planning/phases/13.../13-CONTEXT.md.
//
// Wave 0 scaffold: imports the still-missing useChangeHighlights hook from
// `features/direct-edit/hooks/useChangeHighlights`. Plan 02 Task 2 implements it.

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChangeHighlights } from '../features/direct-edit/hooks/useChangeHighlights';
import type { TailorChange } from '../types';

function makeContainer(fieldPaths: string[]): HTMLDivElement {
  const container = document.createElement('div');
  for (const path of fieldPaths) {
    const child = document.createElement('div');
    child.setAttribute('data-field-path', path);
    child.textContent = `value-for-${path}`;
    container.appendChild(child);
  }
  document.body.appendChild(container);
  return container;
}

function makeChange(id: string, fieldPath: string, overrides: Partial<TailorChange> = {}): TailorChange {
  return {
    id,
    fieldPath,
    section: 'Work Experience',
    description: 'test',
    currentValue: 'old',
    alternatives: [{ label: 'A', value: 'new' }],
    changeType: 'modify',
    ...overrides,
  };
}

describe('useChangeHighlights', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('pendingChanges filters out applied + skipped IDs', () => {
    container = makeContainer(['workExperience[0].bullets[0]', 'workExperience[0].bullets[1]', 'skills[0].skills[0]']);
    const containerRef = { current: container };
    const changes: TailorChange[] = [
      makeChange('c1', 'workExperience[0].bullets[0]'),
      makeChange('c2', 'workExperience[0].bullets[1]'),
      makeChange('c3', 'skills[0].skills[0]'),
    ];
    const applied = new Set(['c1']);
    const skipped = new Set(['c2']);

    const { result } = renderHook(() => useChangeHighlights({ changes, applied, skipped, containerRef }));

    expect(result.current.pendingChanges.map(c => c.id)).toEqual(['c3']);
  });

  it('documentOrderIds reflects DOM order, not changes-array order', () => {
    container = makeContainer(['skills[0].skills[0]', 'workExperience[0].bullets[0]', 'workExperience[0].bullets[1]']);
    const containerRef = { current: container };
    const changes: TailorChange[] = [
      makeChange('c-work-1', 'workExperience[0].bullets[1]'),
      makeChange('c-work-0', 'workExperience[0].bullets[0]'),
      makeChange('c-skill', 'skills[0].skills[0]'),
    ];
    const { result } = renderHook(() =>
      useChangeHighlights({ changes, applied: new Set(), skipped: new Set(), containerRef }),
    );

    // DOM order: skills[0].skills[0], workExperience[0].bullets[0], workExperience[0].bullets[1]
    expect(result.current.documentOrderIds).toEqual(['c-skill', 'c-work-0', 'c-work-1']);
  });

  it('advanceTo("next") with activeChangeId=null returns first id in document order', () => {
    container = makeContainer(['workExperience[0].bullets[0]', 'workExperience[0].bullets[1]']);
    const containerRef = { current: container };
    const changes: TailorChange[] = [
      makeChange('c1', 'workExperience[0].bullets[0]'),
      makeChange('c2', 'workExperience[0].bullets[1]'),
    ];
    const { result } = renderHook(() =>
      useChangeHighlights({ changes, applied: new Set(), skipped: new Set(), containerRef }),
    );

    let nextId: string | null = null;
    act(() => {
      nextId = result.current.advanceTo('next', null);
    });
    expect(nextId).toBe('c1');
  });

  it('advanceTo("prev") from middle returns previous id', () => {
    container = makeContainer(['workExperience[0].bullets[0]', 'workExperience[0].bullets[1]', 'skills[0].skills[0]']);
    const containerRef = { current: container };
    const changes: TailorChange[] = [
      makeChange('c1', 'workExperience[0].bullets[0]'),
      makeChange('c2', 'workExperience[0].bullets[1]'),
      makeChange('c3', 'skills[0].skills[0]'),
    ];
    const { result } = renderHook(() =>
      useChangeHighlights({ changes, applied: new Set(), skipped: new Set(), containerRef }),
    );

    let prevId: string | null = null;
    act(() => {
      prevId = result.current.advanceTo('prev', 'c2');
    });
    expect(prevId).toBe('c1');
  });

  it('getRangeForChange returns a Range whose startContainer is inside the matching field element', () => {
    container = makeContainer(['workExperience[0].bullets[0]']);
    const containerRef = { current: container };
    const changes: TailorChange[] = [makeChange('c1', 'workExperience[0].bullets[0]')];
    const { result } = renderHook(() =>
      useChangeHighlights({ changes, applied: new Set(), skipped: new Set(), containerRef }),
    );

    const range = result.current.getRangeForChange('c1');
    expect(range).not.toBeNull();
    const fieldEl = container.querySelector('[data-field-path="workExperience[0].bullets[0]"]');
    expect(fieldEl).not.toBeNull();
    // startContainer must be the field el itself or one of its descendants
    const start = range!.startContainer as Node;
    expect(fieldEl!.contains(start) || start === fieldEl).toBe(true);
  });

  it('severityMap has one entry per change', () => {
    container = makeContainer(['workExperience[0].bullets[0]', 'skills[0].skills[0]']);
    const containerRef = { current: container };
    const changes: TailorChange[] = [
      makeChange('c1', 'workExperience[0].bullets[0]'),
      makeChange('c2', 'skills[0].skills[0]', { changeType: 'add' }),
    ];
    const { result } = renderHook(() =>
      useChangeHighlights({ changes, applied: new Set(), skipped: new Set(), containerRef }),
    );

    expect(result.current.severityMap.size).toBe(2);
    expect(result.current.severityMap.has('c1')).toBe(true);
    expect(result.current.severityMap.has('c2')).toBe(true);
  });
});
