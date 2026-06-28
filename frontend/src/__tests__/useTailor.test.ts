import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTailor, USER_EDIT_LABEL } from '../features/direct-edit/hooks/useTailor';
import type { CVFormData, TailorResponse } from '../types';

function makeFormData(): CVFormData {
  return {
    templateId: 'med-length-proff-cv',
    personalInfo: { fullName: 'A', email: '', phone: '', location: '', links: [] },
    workExperience: [],
    education: [],
    skills: [],
  };
}

function renderTailor() {
  const onApply = async () => {};
  return renderHook(() =>
    useTailor({
      originalFormData: makeFormData(),
      templateId: 'med-length-proff-cv',
      onApply,
    }),
  );
}

describe('useTailor — one Suggestion per field', () => {
  it('dedupes changes by fieldPath on restore (first wins)', () => {
    const { result } = renderTailor();
    const response: TailorResponse = {
      estimatedScore: 80,
      summary: '',
      changes: [
        { id: 'c1', fieldPath: 'workExperience[0].bullets[0]', section: 'Work', description: '', currentValue: 'x', alternatives: [{ label: 'A', value: 'a1' }], changeType: 'modify' },
        { id: 'c2', fieldPath: 'workExperience[0].bullets[0]', section: 'Work', description: '', currentValue: 'x', alternatives: [{ label: 'A', value: 'a2' }], changeType: 'modify' },
        { id: 'c3', fieldPath: 'skills[0].skills', section: 'Skills', description: '', currentValue: 'y', alternatives: [{ label: 'A', value: 'a3' }], changeType: 'modify' },
      ],
    };
    act(() => {
      result.current.restoreSuggestions(makeFormData(), response);
    });
    expect(result.current.tailorResponse?.changes.map((c) => c.id)).toEqual(['c1', 'c3']);
  });
});

describe('useTailor — edit = user-authored Alternative', () => {
  function seedResponse(): TailorResponse {
    return {
      estimatedScore: 80,
      summary: '',
      changes: [
        { id: 'c1', fieldPath: 'a', section: 'Work', description: '', currentValue: 'x', alternatives: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }], changeType: 'modify' },
        { id: 'c2', fieldPath: 'b', section: 'Work', description: '', currentValue: 'y', alternatives: [{ label: 'A', value: 'c' }], changeType: 'modify' },
      ],
    };
  }

  it('appends a "Your edit" alternative and selects it', () => {
    const { result } = renderTailor();
    act(() => result.current.restoreSuggestions(makeFormData(), seedResponse()));
    act(() => result.current.editChangeValue('c1', 'my custom bullet'));

    const c1 = result.current.tailorResponse?.changes.find((c) => c.id === 'c1');
    expect(c1?.alternatives).toHaveLength(3);
    expect(c1?.alternatives[2]).toEqual({ label: USER_EDIT_LABEL, value: 'my custom bullet' });
    expect(result.current.selectedAlternatives.get('c1')).toBe(2);
  });

  it('updates the same "Your edit" alternative on re-edit (no proliferation)', () => {
    const { result } = renderTailor();
    act(() => result.current.restoreSuggestions(makeFormData(), seedResponse()));
    act(() => result.current.editChangeValue('c1', 'first'));
    act(() => result.current.editChangeValue('c1', 'second'));

    const c1 = result.current.tailorResponse?.changes.find((c) => c.id === 'c1');
    expect(c1?.alternatives).toHaveLength(3);
    expect(c1?.alternatives[2]).toEqual({ label: USER_EDIT_LABEL, value: 'second' });
  });

  it('does not affect other changes when editing one (isolation)', () => {
    const { result } = renderTailor();
    act(() => result.current.restoreSuggestions(makeFormData(), seedResponse()));
    act(() => result.current.editChangeValue('c1', 'edited'));

    const c2 = result.current.tailorResponse?.changes.find((c) => c.id === 'c2');
    expect(c2?.alternatives).toEqual([{ label: 'A', value: 'c' }]);
  });
});
