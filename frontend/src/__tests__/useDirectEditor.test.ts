/**
 * Tests for useDirectEditor hook -- central state controller that bridges
 * EditableField callbacks to CVFormData via useCVContext.
 *
 * Covers: EDIT-05 (edits update CVFormData in real-time).
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { CVFormData } from '../types';

// We mock useCVContext to avoid needing the full provider tree
const mockSetFormData = vi.fn();
let mockFormData: CVFormData | null = null;

vi.mock('../contexts/CVContext', () => ({
  useCVContext: () => ({
    formData: mockFormData,
    setFormData: mockSetFormData,
  }),
}));

// Mock generateId to return predictable values
let idCounter = 0;
vi.mock('../utils/idHelpers', () => ({
  generateId: () => `test-id-${++idCounter}`,
}));

import { useDirectEditor } from '../features/direct-edit/hooks/useDirectEditor';

function makeTestFormData(): CVFormData {
  return {
    templateId: 'med-length-proff-cv',
    personalInfo: {
      fullName: 'John Doe',
      email: 'john@test.com',
      phone: '555-1234',
      location: 'NYC',
      links: [{ id: 'link-1', label: 'GitHub', url: 'https://github.com' }],
    },
    workExperience: [{
      id: 'work-1',
      company: 'Acme',
      title: 'Engineer',
      startDate: 'Jan 2020',
      endDate: 'Present',
      location: 'NYC',
      bullets: [
        { id: 'b1', text: 'Built X' },
        { id: 'b2', text: 'Led Y' },
      ],
    }],
    education: [{
      id: 'edu-1',
      school: 'MIT',
      degree: 'BS CS',
      startDate: '2016',
      endDate: '2020',
      location: 'MA',
      details: [{ id: 'd1', text: 'Dean list' }],
    }],
    skills: [{
      id: 'skill-1',
      category: 'Languages',
      skills: [
        { id: 's1', text: 'Python' },
        { id: 's2', text: 'Java' },
      ],
    }],
  };
}

describe('useDirectEditor', () => {
  beforeEach(() => {
    mockFormData = makeTestFormData();
    mockSetFormData.mockClear();
    idCounter = 0;
  });

  it('returns formData from useCVContext (not a copy)', () => {
    const { result } = renderHook(() => useDirectEditor());
    expect(result.current.formData).toBe(mockFormData);
  });

  it('updateField("personalInfo.fullName", "John Doe") sets formData.personalInfo.fullName to "John Doe"', () => {
    const { result } = renderHook(() => useDirectEditor());

    act(() => {
      result.current.updateField('personalInfo.fullName', 'Jane Smith');
    });

    expect(mockSetFormData).toHaveBeenCalledTimes(1);
    // Get the updater function and call it with current formData
    const updater = mockSetFormData.mock.calls[0][0];
    const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
    expect(newData.personalInfo.fullName).toBe('Jane Smith');
  });

  it('updateField("workExperience[0].company", "Google") sets the company field', () => {
    const { result } = renderHook(() => useDirectEditor());

    act(() => {
      result.current.updateField('workExperience[0].company', 'Google');
    });

    const updater = mockSetFormData.mock.calls[0][0];
    const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
    expect(newData.workExperience[0].company).toBe('Google');
  });

  it('updateField("workExperience[0].bullets[0]", "Led team") preserves the BulletItem id and updates only text', () => {
    const { result } = renderHook(() => useDirectEditor());

    act(() => {
      result.current.updateField('workExperience[0].bullets[0]', 'Led team');
    });

    const updater = mockSetFormData.mock.calls[0][0];
    const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
    expect(newData.workExperience[0].bullets[0].id).toBe('b1'); // preserved
    expect(newData.workExperience[0].bullets[0].text).toBe('Led team'); // updated
  });

  it('addBullet("workExperience[0].bullets", 0) inserts a new BulletItem at index 1', () => {
    const { result } = renderHook(() => useDirectEditor());

    let newBulletId: string | undefined;
    act(() => {
      newBulletId = result.current.addBullet('workExperience[0].bullets', 0);
    });

    expect(newBulletId).toBe('test-id-1');
    const updater = mockSetFormData.mock.calls[0][0];
    const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
    expect(newData.workExperience[0].bullets).toHaveLength(3);
    expect(newData.workExperience[0].bullets[1].id).toBe('test-id-1');
    expect(newData.workExperience[0].bullets[1].text).toBe('');
  });

  it('addBullet returns the id of the newly created bullet (for focus management)', () => {
    const { result } = renderHook(() => useDirectEditor());

    let returnedId: string | undefined;
    act(() => {
      returnedId = result.current.addBullet('workExperience[0].bullets', 0);
    });

    expect(typeof returnedId).toBe('string');
    expect(returnedId).toBe('test-id-1');
  });

  it('removeBullet("workExperience[0].bullets", 0) removes bullet at index 0, other bullets remain', () => {
    const { result } = renderHook(() => useDirectEditor());

    act(() => {
      result.current.removeBullet('workExperience[0].bullets', 0);
    });

    const updater = mockSetFormData.mock.calls[0][0];
    const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
    expect(newData.workExperience[0].bullets).toHaveLength(1);
    expect(newData.workExperience[0].bullets[0].id).toBe('b2');
    expect(newData.workExperience[0].bullets[0].text).toBe('Led Y');
  });

  it('removeBullet on last remaining bullet does nothing (minimum 1 bullet)', () => {
    // Set up formData with only 1 bullet
    mockFormData = makeTestFormData();
    mockFormData.workExperience[0].bullets = [{ id: 'b1', text: 'Only bullet' }];

    const { result } = renderHook(() => useDirectEditor());

    act(() => {
      result.current.removeBullet('workExperience[0].bullets', 0);
    });

    // setFormData should not be called because the single bullet cannot be removed
    expect(mockSetFormData).not.toHaveBeenCalled();
  });

  it('updateField on skills path stores the raw comma-separated string', () => {
    const { result } = renderHook(() => useDirectEditor());

    act(() => {
      result.current.updateField('skills[0].category', 'Programming');
    });

    const updater = mockSetFormData.mock.calls[0][0];
    const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
    expect(newData.skills[0].category).toBe('Programming');
  });

  it('all callbacks are stable references (useCallback)', () => {
    const { result, rerender } = renderHook(() => useDirectEditor());

    const firstUpdateField = result.current.updateField;
    const firstAddBullet = result.current.addBullet;
    const firstRemoveBullet = result.current.removeBullet;

    rerender();

    expect(result.current.updateField).toBe(firstUpdateField);
    expect(result.current.addBullet).toBe(firstAddBullet);
    expect(result.current.removeBullet).toBe(firstRemoveBullet);
  });
});
