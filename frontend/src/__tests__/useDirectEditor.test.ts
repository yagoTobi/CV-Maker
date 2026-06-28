/**
 * Tests for useDirectEditor hook -- central state controller that bridges
 * EditableField callbacks to CVFormData via useCVContext.
 *
 * Covers: EDIT-05 (edits update CVFormData in real-time).
 * Extended: CONT-01..04 (addEntry, removeEntry, toggleSection).
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

// Mock entryFactories to return predictable objects for addEntry tests
vi.mock('../utils/entryFactories', () => ({
  emptyWorkEntry: () => ({ id: 'new-work', company: '', title: '', startDate: '', endDate: '', location: '', bullets: [{ id: 'new-b', text: '' }] }),
  emptyEducationEntry: () => ({ id: 'new-edu', school: '', degree: '', startDate: '', endDate: '', location: '', gpa: '', details: [] }),
  emptySkillCategory: () => ({ id: 'new-skill', category: '', skills: [] }),
  emptyProject: () => ({ id: 'new-proj', name: '', year: '', description: '', technologies: '', bullets: [] }),
  emptyAward: () => ({ id: 'new-award', year: '', title: '', description: '' }),
  emptyAdditionalEntry: () => ({ id: 'new-add-entry', title: '', subtitle: '', startDate: '', endDate: '', location: '', description: '', bullets: [{ id: 'new-add-b', text: '' }] }),
  emptyAdditionalSection: (index: number) => ({ id: 'new-add-sec', title: `Additional Section ${index + 1}`, entries: [{ id: 'new-add-entry', title: '', subtitle: '', startDate: '', endDate: '', location: '', description: '', bullets: [{ id: 'new-add-b', text: '' }] }] }),
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

  it('addBullet initializes an optional missing bullet array', () => {
    mockFormData = {
      ...makeTestFormData(),
      projects: [{ id: 'p1', name: 'Project', year: '', description: '' }],
    };
    const { result } = renderHook(() => useDirectEditor());

    act(() => {
      result.current.addBullet('projects[0].bullets', -1);
    });

    const updater = mockSetFormData.mock.calls[0][0];
    const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
    expect(newData.projects[0].bullets).toEqual([{ id: 'test-id-1', text: '' }]);
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

  it('removeBullet on last remaining bullet leaves an empty bullet array', () => {
    // Set up formData with only 1 bullet
    mockFormData = makeTestFormData();
    mockFormData.workExperience[0].bullets = [{ id: 'b1', text: 'Only bullet' }];

    const { result } = renderHook(() => useDirectEditor());

    act(() => {
      result.current.removeBullet('workExperience[0].bullets', 0);
    });

    const updater = mockSetFormData.mock.calls[0][0];
    const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
    expect(newData.workExperience[0].bullets).toEqual([]);
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

  // --- addEntry tests ---

  describe('addEntry', () => {
    it('addEntry("work") appends emptyWorkEntry() to workExperience', () => {
      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.addEntry('work');
      });

      expect(mockSetFormData).toHaveBeenCalledTimes(1);
      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
      expect(newData.workExperience).toHaveLength(2);
      expect(newData.workExperience[1].id).toBe('new-work');
    });

    it('addEntry("education") appends emptyEducationEntry() to education', () => {
      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.addEntry('education');
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
      expect(newData.education).toHaveLength(2);
      expect(newData.education[1].id).toBe('new-edu');
    });

    it('addEntry("skills") appends emptySkillCategory() to skills', () => {
      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.addEntry('skills');
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
      expect(newData.skills).toHaveLength(2);
      expect(newData.skills[1].id).toBe('new-skill');
    });

    it('addEntry("projects") initializes projects array if undefined and appends', () => {
      // formData.projects is not set in makeTestFormData
      mockFormData = { ...makeTestFormData(), projects: undefined };

      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.addEntry('projects');
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
      expect(newData.projects).toHaveLength(1);
      expect(newData.projects[0].id).toBe('new-proj');
    });

    it('addEntry("awards") initializes awards array if undefined and appends', () => {
      mockFormData = { ...makeTestFormData(), awards: undefined };

      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.addEntry('awards');
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
      expect(newData.awards).toHaveLength(1);
      expect(newData.awards[0].id).toBe('new-award');
    });

    it('addEntry("additional-0") appends entry to existing additionalSections[0].entries', () => {
      mockFormData = {
        ...makeTestFormData(),
        additionalSections: [{
          id: 'as-1',
          title: 'Volunteering',
          entries: [{ id: 'ae-1', title: 'Red Cross', bullets: [{ id: 'ab-1', text: 'Helped' }] }],
        }],
      };

      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.addEntry('additional-0');
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
      expect(newData.additionalSections[0].entries).toHaveLength(2);
      expect(newData.additionalSections[0].entries[1].id).toBe('new-add-entry');
    });

    it('addEntry("additional-new") creates a new AdditionalSection and updates sectionOrder', () => {
      mockFormData = { ...makeTestFormData(), additionalSections: [], sectionOrder: ['work', 'education'] };

      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.addEntry('additional-new');
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
      expect(newData.additionalSections).toHaveLength(1);
      expect(newData.additionalSections[0].id).toBe('new-add-sec');
      expect(newData.additionalSections[0].title).toBe('Additional Section 1');
      expect(newData.sectionOrder).toContain('additional-0');
    });

    it('addEntry does nothing when formData is null', () => {
      mockFormData = null;

      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.addEntry('work');
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(null) : updater;
      expect(newData).toBeNull();
    });
  });

  // --- removeEntry tests ---

  describe('removeEntry', () => {
    it('removeEntry("work", 0) removes the first work entry', () => {
      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.removeEntry('work', 0);
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
      expect(newData.workExperience).toHaveLength(0);
    });

    it('removeEntry("skills", 0) removes the first skill category', () => {
      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.removeEntry('skills', 0);
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
      expect(newData.skills).toHaveLength(0);
    });

    it('removeEntry("education", 0) removes the first education entry', () => {
      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.removeEntry('education', 0);
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
      expect(newData.education).toHaveLength(0);
    });

    it('removeEntry("projects", 0) removes from projects array', () => {
      mockFormData = {
        ...makeTestFormData(),
        projects: [{ id: 'p1', name: 'Proj', year: '2023', description: 'Desc' }],
      };

      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.removeEntry('projects', 0);
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
      expect(newData.projects).toHaveLength(0);
    });

    it('removeEntry("awards", 0) removes from awards array', () => {
      mockFormData = {
        ...makeTestFormData(),
        awards: [{ id: 'a1', year: '2023', title: 'Award' }],
      };

      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.removeEntry('awards', 0);
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
      expect(newData.awards).toHaveLength(0);
    });

    it('removeEntry on last entry of a section produces empty array', () => {
      // Unlike removeBullet (which guards minimum 1), removeEntry allows empty sections
      mockFormData = makeTestFormData();

      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.removeEntry('work', 0);
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
      expect(newData.workExperience).toHaveLength(0);
    });

    it('removeEntry("additional-0", 0) removes entry from additionalSections[0].entries', () => {
      mockFormData = {
        ...makeTestFormData(),
        additionalSections: [{
          id: 'as-1',
          title: 'Volunteering',
          entries: [
            { id: 'ae-1', title: 'Red Cross', bullets: [{ id: 'ab-1', text: 'Helped' }] },
            { id: 'ae-2', title: 'Food Bank', bullets: [{ id: 'ab-2', text: 'Served' }] },
          ],
        }],
      };

      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.removeEntry('additional-0', 0);
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
      expect(newData.additionalSections[0].entries).toHaveLength(1);
      expect(newData.additionalSections[0].entries[0].id).toBe('ae-2');
    });

    it('removeEntry does nothing when formData is null', () => {
      mockFormData = null;

      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.removeEntry('work', 0);
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(null) : updater;
      expect(newData).toBeNull();
    });
  });

  // --- toggleSection tests ---

  describe('toggleSection', () => {
    it('toggleSection("skills") adds "skills" to hiddenSections', () => {
      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.toggleSection('skills');
      });

      expect(result.current.hiddenSections.has('skills')).toBe(true);
    });

    it('toggleSection("skills") twice returns to empty Set (toggle off)', () => {
      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.toggleSection('skills');
      });
      expect(result.current.hiddenSections.has('skills')).toBe(true);

      act(() => {
        result.current.toggleSection('skills');
      });
      expect(result.current.hiddenSections.has('skills')).toBe(false);
      expect(result.current.hiddenSections.size).toBe(0);
    });

    it('multiple sections can be hidden independently', () => {
      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.toggleSection('skills');
        result.current.toggleSection('awards');
      });

      expect(result.current.hiddenSections.has('skills')).toBe(true);
      expect(result.current.hiddenSections.has('awards')).toBe(true);
      expect(result.current.hiddenSections.size).toBe(2);
    });
  });

  // --- hiddenSections in return value ---

  describe('hiddenSections', () => {
    it('hiddenSections is returned from the hook', () => {
      const { result } = renderHook(() => useDirectEditor());

      expect(result.current.hiddenSections).toBeDefined();
      expect(result.current.hiddenSections).toBeInstanceOf(Set);
    });

    it('hiddenSections starts as empty Set', () => {
      const { result } = renderHook(() => useDirectEditor());

      expect(result.current.hiddenSections.size).toBe(0);
    });
  });

  // --- reorderSections tests ---

  describe('reorderSections', () => {
    it('reorderSections(0, 2) moves first section to index 2', () => {
      mockFormData = {
        ...makeTestFormData(),
        sectionOrder: ['work', 'education', 'skills', 'projects', 'awards'],
      };

      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.reorderSections(0, 2);
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
      expect(newData.sectionOrder).toEqual(['education', 'skills', 'work', 'projects', 'awards']);
    });

    it('reorderSections(3, 0) moves projects to index 0', () => {
      mockFormData = {
        ...makeTestFormData(),
        sectionOrder: ['work', 'education', 'skills', 'projects', 'awards'],
      };

      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.reorderSections(3, 0);
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
      expect(newData.sectionOrder).toEqual(['projects', 'work', 'education', 'skills', 'awards']);
    });

    it('reorderSections with same from and to returns unchanged sectionOrder', () => {
      mockFormData = {
        ...makeTestFormData(),
        sectionOrder: ['work', 'education', 'skills', 'projects', 'awards'],
      };

      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.reorderSections(2, 2);
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
      expect(newData.sectionOrder).toEqual(['work', 'education', 'skills', 'projects', 'awards']);
    });

    it('reorderSections uses default sectionOrder when sectionOrder is undefined', () => {
      mockFormData = {
        ...makeTestFormData(),
        sectionOrder: undefined,
      };

      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.reorderSections(0, 2);
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
      // Default order: ['work', 'education', 'skills', 'projects', 'awards']
      // Move index 0 ('work') to index 2
      expect(newData.sectionOrder).toEqual(['education', 'skills', 'work', 'projects', 'awards']);
    });
  });

  // --- reorderEntries tests ---

  describe('reorderEntries', () => {
    it('reorderEntries("work", 1, 0) swaps first two work entries', () => {
      mockFormData = {
        ...makeTestFormData(),
        workExperience: [
          { id: 'work-1', company: 'Acme', title: 'Engineer', startDate: '', endDate: '', location: '', bullets: [] },
          { id: 'work-2', company: 'Beta', title: 'Dev', startDate: '', endDate: '', location: '', bullets: [] },
        ],
      };

      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.reorderEntries('work', 1, 0);
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
      expect(newData.workExperience[0].id).toBe('work-2');
      expect(newData.workExperience[1].id).toBe('work-1');
    });

    it('reorderEntries("education", 0, 2) moves first education entry to index 2', () => {
      mockFormData = {
        ...makeTestFormData(),
        education: [
          { id: 'edu-1', school: 'MIT', degree: 'BS', startDate: '', endDate: '', location: '', details: [] },
          { id: 'edu-2', school: 'Stanford', degree: 'MS', startDate: '', endDate: '', location: '', details: [] },
          { id: 'edu-3', school: 'Harvard', degree: 'PhD', startDate: '', endDate: '', location: '', details: [] },
        ],
      };

      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.reorderEntries('education', 0, 2);
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
      expect(newData.education[0].id).toBe('edu-2');
      expect(newData.education[1].id).toBe('edu-3');
      expect(newData.education[2].id).toBe('edu-1');
    });

    it('reorderEntries("skills", 0, 1) reorders skill categories', () => {
      mockFormData = {
        ...makeTestFormData(),
        skills: [
          { id: 'skill-1', category: 'Languages', skills: [] },
          { id: 'skill-2', category: 'Frameworks', skills: [] },
        ],
      };

      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.reorderEntries('skills', 0, 1);
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
      expect(newData.skills[0].id).toBe('skill-2');
      expect(newData.skills[1].id).toBe('skill-1');
    });

    it('reorderEntries("projects", 1, 0) reorders projects array', () => {
      mockFormData = {
        ...makeTestFormData(),
        projects: [
          { id: 'proj-1', name: 'Alpha', year: '2023', description: '' },
          { id: 'proj-2', name: 'Beta', year: '2024', description: '' },
        ],
      };

      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.reorderEntries('projects', 1, 0);
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
      expect(newData.projects[0].id).toBe('proj-2');
      expect(newData.projects[1].id).toBe('proj-1');
    });

    it('reorderEntries("awards", 0, 1) reorders awards array', () => {
      mockFormData = {
        ...makeTestFormData(),
        awards: [
          { id: 'award-1', year: '2023', title: 'Best Paper' },
          { id: 'award-2', year: '2024', title: 'Innovation' },
        ],
      };

      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.reorderEntries('awards', 0, 1);
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
      expect(newData.awards[0].id).toBe('award-2');
      expect(newData.awards[1].id).toBe('award-1');
    });

    it('reorderEntries("additional-0", 0, 1) reorders entries within an additional section', () => {
      mockFormData = {
        ...makeTestFormData(),
        additionalSections: [{
          id: 'as-1',
          title: 'Volunteering',
          entries: [
            { id: 'ae-1', title: 'Red Cross', bullets: [{ id: 'ab-1', text: 'Helped' }] },
            { id: 'ae-2', title: 'Food Bank', bullets: [{ id: 'ab-2', text: 'Served' }] },
          ],
        }],
      };

      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.reorderEntries('additional-0', 0, 1);
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(mockFormData) : updater;
      expect(newData.additionalSections[0].entries[0].id).toBe('ae-2');
      expect(newData.additionalSections[0].entries[1].id).toBe('ae-1');
    });

    it('reorderEntries does nothing when formData is null', () => {
      mockFormData = null;

      const { result } = renderHook(() => useDirectEditor());

      act(() => {
        result.current.reorderEntries('work', 0, 1);
      });

      const updater = mockSetFormData.mock.calls[0][0];
      const newData = typeof updater === 'function' ? updater(null) : updater;
      expect(newData).toBeNull();
    });
  });
});
