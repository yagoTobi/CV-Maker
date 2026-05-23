// Analog: frontend/src/__tests__/EditableField.test.tsx (Vitest + RTL setup pattern)
// Implements D-12 contract per .planning/phases/13.../13-RESEARCH.md Pattern 3 (lines 313-345).
//
// Wave 0 scaffold: this file imports a module that does NOT yet exist
// (`features/direct-edit/utils/severity`). Plans 02-04 implement that module
// to satisfy these assertions. Until then, the test fails with module-not-found
// — that is the contract Plan 02 Task 1 implements against.

import { describe, it, expect } from 'vitest';
import { inferSeverity } from '../features/direct-edit/utils/severity';
import type { TailorChange } from '../types';

function makeChange(overrides: Partial<TailorChange>): TailorChange {
  return {
    id: 'c1',
    fieldPath: 'workExperience[0].bullets[0]',
    section: 'Work Experience',
    description: 'test',
    currentValue: '',
    alternatives: [],
    changeType: 'modify',
    ...overrides,
  };
}

describe('inferSeverity', () => {
  it('returns "add" for change_type=add (irrespective of values)', () => {
    expect(inferSeverity(makeChange({ changeType: 'add', currentValue: '', alternatives: [{ label: 'New', value: 'A new bullet' }] }))).toBe('add');
  });

  it('returns "delete" for change_type=remove', () => {
    expect(inferSeverity(makeChange({ changeType: 'remove', currentValue: 'Existing bullet', alternatives: [] }))).toBe('delete');
  });

  it('returns "minor" for modify with identical word sets (overlap=1.0, ratio=0)', () => {
    const ch = makeChange({
      changeType: 'modify',
      currentValue: 'Led team of five',
      alternatives: [{ label: 'A', value: 'Led team of five' }],
    });
    expect(inferSeverity(ch)).toBe('minor');
  });

  it('returns "strong" for modify with zero word overlap (ratio=1.0)', () => {
    const ch = makeChange({
      changeType: 'modify',
      currentValue: 'Aaaa bbbb cccc',
      alternatives: [{ label: 'A', value: 'Wxyz qrst mnop' }],
    });
    expect(inferSeverity(ch)).toBe('strong');
  });

  it('returns "strong" for modify with low overlap (small team → rapid growth phrasing)', () => {
    const ch = makeChange({
      changeType: 'modify',
      currentValue: 'Led a small team',
      alternatives: [{ label: 'A', value: 'Drove rapid growth across product surface' }],
    });
    expect(inferSeverity(ch)).toBe('strong');
  });

  it('returns "minor" for modify with high overlap (Led team of 5 → Led team of 12)', () => {
    const ch = makeChange({
      changeType: 'modify',
      currentValue: 'Led team of 5',
      alternatives: [{ label: 'A', value: 'Led team of 12' }],
    });
    expect(inferSeverity(ch)).toBe('minor');
  });
});
