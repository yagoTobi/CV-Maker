/**
 * Tests for the useFormBuilder hook — verifying state initialization,
 * data isolation between build and import flows, and CRUD operations.
 *
 * Critical behavior tested:
 * - Without importedData: creates blank form with empty fields
 * - With importedData: uses imported data with overridden templateId
 * - Form operations (add/remove/update) work correctly
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormBuilder, DEFAULT_SECTION_ORDER, DEFAULT_PERSONAL_ORDER } from '../hooks/useFormBuilder';
import type { CVFormData } from '../types';

// Mock the api module
vi.mock('../services/api', () => ({
  api: {
    generateLatex: vi.fn().mockResolvedValue({ texContent: '\\documentclass{article}' }),
  },
}));

describe('useFormBuilder', () => {
  describe('initialization without importedData (Build path)', () => {
    it('creates blank form with empty personal info', () => {
      const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

      const fd = result.current.formData;
      expect(fd.templateId).toBe('med-length-proff-cv');
      expect(fd.personalInfo.fullName).toBe('');
      expect(fd.personalInfo.email).toBe('');
      expect(fd.personalInfo.phone).toBe('');
      expect(fd.personalInfo.location).toBe('');
      expect(fd.personalInfo.links).toEqual([]);
      expect(fd.personalInfo.summary).toBe('');
    });

    it('creates one empty work entry', () => {
      const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

      expect(result.current.formData.workExperience).toHaveLength(1);
      expect(result.current.formData.workExperience[0].company).toBe('');
      expect(result.current.formData.workExperience[0].title).toBe('');
      expect(result.current.formData.workExperience[0].bullets).toEqual(['']);
    });

    it('creates one empty education entry', () => {
      const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

      expect(result.current.formData.education).toHaveLength(1);
      expect(result.current.formData.education[0].school).toBe('');
      expect(result.current.formData.education[0].degree).toBe('');
    });

    it('creates one empty skill category', () => {
      const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

      expect(result.current.formData.skills).toHaveLength(1);
      expect(result.current.formData.skills[0].category).toBe('');
      expect(result.current.formData.skills[0].skills).toEqual([]);
    });

    it('creates empty projects and awards', () => {
      const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

      expect(result.current.formData.projects).toEqual([]);
      expect(result.current.formData.awards).toEqual([]);
    });

    it('creates empty additionalSections', () => {
      const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

      expect(result.current.formData.additionalSections).toEqual([]);
    });

    it('uses default section order', () => {
      const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

      expect(result.current.formData.sectionOrder).toEqual(DEFAULT_SECTION_ORDER);
    });

    it('uses default personal order', () => {
      const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

      expect(result.current.formData.personalInfo.personalOrder).toEqual(DEFAULT_PERSONAL_ORDER);
    });

    it('starts on personal section', () => {
      const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

      expect(result.current.activeSection).toBe('personal');
    });

    it('starts not generating and not dirty', () => {
      const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.generateError).toBeNull();
      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('initialization with importedData (Import path)', () => {
    const importedData: CVFormData = {
      templateId: '_import',
      personalInfo: {
        fullName: 'John Doe',
        email: 'john@test.com',
        phone: '555-1234',
        location: 'New York',
        links: [{ label: 'GitHub', url: 'https://github.com/johndoe' }],
        summary: 'Experienced developer',
      },
      workExperience: [
        { company: 'Acme', title: 'Dev', startDate: 'Jan 2020', endDate: 'Present', location: 'NYC', bullets: ['Built stuff'] },
      ],
      education: [
        { school: 'MIT', degree: 'BS CS', startDate: 'Sep 2015', endDate: 'May 2019', location: 'Cambridge', details: [] },
      ],
      skills: [
        { category: 'Languages', skills: ['TypeScript', 'Python'] },
      ],
      projects: [
        { name: 'CV Maker', year: '2024', description: 'A CV builder', technologies: 'React' },
      ],
      awards: [
        { year: '2020', title: 'Best Project' },
      ],
    };

    it('uses imported personal info', () => {
      const { result } = renderHook(() => useFormBuilder('med-length-proff-cv', importedData));

      expect(result.current.formData.personalInfo.fullName).toBe('John Doe');
      expect(result.current.formData.personalInfo.email).toBe('john@test.com');
      expect(result.current.formData.personalInfo.phone).toBe('555-1234');
      expect(result.current.formData.personalInfo.links).toHaveLength(1);
      expect(result.current.formData.personalInfo.links[0].label).toBe('GitHub');
    });

    it('overrides templateId with the provided templateId', () => {
      const { result } = renderHook(() => useFormBuilder('med-length-proff-cv', importedData));

      // Should be the target template, not '_import'
      expect(result.current.formData.templateId).toBe('med-length-proff-cv');
    });

    it('preserves imported work experience', () => {
      const { result } = renderHook(() => useFormBuilder('med-length-proff-cv', importedData));

      expect(result.current.formData.workExperience).toHaveLength(1);
      expect(result.current.formData.workExperience[0].company).toBe('Acme');
    });

    it('preserves imported education', () => {
      const { result } = renderHook(() => useFormBuilder('med-length-proff-cv', importedData));

      expect(result.current.formData.education).toHaveLength(1);
      expect(result.current.formData.education[0].school).toBe('MIT');
    });

    it('preserves imported skills', () => {
      const { result } = renderHook(() => useFormBuilder('med-length-proff-cv', importedData));

      expect(result.current.formData.skills).toHaveLength(1);
      expect(result.current.formData.skills[0].category).toBe('Languages');
      expect(result.current.formData.skills[0].skills).toEqual(['TypeScript', 'Python']);
    });

    it('preserves imported projects', () => {
      const { result } = renderHook(() => useFormBuilder('med-length-proff-cv', importedData));

      expect(result.current.formData.projects).toHaveLength(1);
      expect(result.current.formData.projects![0].name).toBe('CV Maker');
    });

    it('preserves imported awards', () => {
      const { result } = renderHook(() => useFormBuilder('med-length-proff-cv', importedData));

      expect(result.current.formData.awards).toHaveLength(1);
      expect(result.current.formData.awards![0].title).toBe('Best Project');
    });
  });

  describe('data isolation: undefined importedData creates blank form', () => {
    it('undefined importedData does not use any previous data', () => {
      // This directly tests the isolation mechanism:
      // useFormBuilder(templateId, undefined) -> initialFormData(templateId) = blank
      const { result } = renderHook(() => useFormBuilder('deedy-resume', undefined));

      expect(result.current.formData.templateId).toBe('deedy-resume');
      expect(result.current.formData.personalInfo.fullName).toBe('');
      expect(result.current.formData.workExperience[0].company).toBe('');
    });

    it('different templates produce blank forms independently', () => {
      const { result: r1 } = renderHook(() => useFormBuilder('med-length-proff-cv'));
      const { result: r2 } = renderHook(() => useFormBuilder('deedy-resume'));

      expect(r1.current.formData.templateId).toBe('med-length-proff-cv');
      expect(r2.current.formData.templateId).toBe('deedy-resume');

      // Both should be blank
      expect(r1.current.formData.personalInfo.fullName).toBe('');
      expect(r2.current.formData.personalInfo.fullName).toBe('');
    });
  });

  describe('CRUD operations on form data', () => {
    describe('personal info', () => {
      it('updatePersonalInfo merges partial updates', () => {
        const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

        act(() => {
          result.current.updatePersonalInfo({ fullName: 'Jane Doe' });
        });

        expect(result.current.formData.personalInfo.fullName).toBe('Jane Doe');
        expect(result.current.formData.personalInfo.email).toBe(''); // unchanged
      });

      it('addLink adds an empty link', () => {
        const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

        act(() => {
          result.current.addLink();
        });

        expect(result.current.formData.personalInfo.links).toHaveLength(1);
        expect(result.current.formData.personalInfo.links[0]).toEqual({ label: '', url: '' });
      });

      it('updateLink updates a specific field', () => {
        const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

        act(() => {
          result.current.addLink();
        });
        act(() => {
          result.current.updateLink(0, 'url', 'https://github.com/test');
        });

        expect(result.current.formData.personalInfo.links[0].url).toBe('https://github.com/test');
        expect(result.current.formData.personalInfo.links[0].label).toBe('');
      });

      it('removeLink removes a link by index', () => {
        const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

        act(() => {
          result.current.addLink();
          result.current.addLink();
        });
        act(() => {
          result.current.removeLink(0);
        });

        expect(result.current.formData.personalInfo.links).toHaveLength(1);
      });
    });

    describe('work experience', () => {
      it('addWorkEntry adds an empty work entry', () => {
        const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

        act(() => {
          result.current.addWorkEntry();
        });

        expect(result.current.formData.workExperience).toHaveLength(2);
        expect(result.current.formData.workExperience[1].company).toBe('');
      });

      it('updateWorkEntry updates specific fields', () => {
        const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

        act(() => {
          result.current.updateWorkEntry(0, { company: 'Google', title: 'SWE' });
        });

        expect(result.current.formData.workExperience[0].company).toBe('Google');
        expect(result.current.formData.workExperience[0].title).toBe('SWE');
      });

      it('removeWorkEntry removes an entry', () => {
        const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

        act(() => {
          result.current.addWorkEntry();
        });
        expect(result.current.formData.workExperience).toHaveLength(2);

        act(() => {
          result.current.removeWorkEntry(0);
        });
        expect(result.current.formData.workExperience).toHaveLength(1);
      });

      it('addBullet adds an empty bullet to a work entry', () => {
        const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

        act(() => {
          result.current.addBullet(0);
        });

        expect(result.current.formData.workExperience[0].bullets).toHaveLength(2);
        expect(result.current.formData.workExperience[0].bullets[1]).toBe('');
      });

      it('updateBullet updates a specific bullet', () => {
        const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

        act(() => {
          result.current.updateBullet(0, 0, 'Led a team of 5 engineers');
        });

        expect(result.current.formData.workExperience[0].bullets[0]).toBe('Led a team of 5 engineers');
      });

      it('removeBullet removes a specific bullet', () => {
        const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

        act(() => {
          result.current.addBullet(0);
        });
        act(() => {
          result.current.removeBullet(0, 0);
        });

        expect(result.current.formData.workExperience[0].bullets).toHaveLength(1);
      });

      it('reorderWorkEntries reorders entries', () => {
        const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

        act(() => {
          result.current.updateWorkEntry(0, { company: 'First' });
          result.current.addWorkEntry();
        });
        act(() => {
          result.current.updateWorkEntry(1, { company: 'Second' });
        });
        act(() => {
          result.current.reorderWorkEntries(0, 1);
        });

        expect(result.current.formData.workExperience[0].company).toBe('Second');
        expect(result.current.formData.workExperience[1].company).toBe('First');
      });
    });

    describe('section ordering', () => {
      it('reorderSections changes section order', () => {
        const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

        // Default: work, education, skills, projects, awards
        act(() => {
          result.current.reorderSections(0, 2); // move work to index 2
        });

        // New order: education, skills, work, projects, awards
        expect(result.current.formData.sectionOrder![0]).toBe('education');
        expect(result.current.formData.sectionOrder![1]).toBe('skills');
        expect(result.current.formData.sectionOrder![2]).toBe('work');
      });

      it('navSectionOrder always starts with personal', () => {
        const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

        expect(result.current.navSectionOrder[0]).toBe('personal');
        expect(result.current.navSectionOrder.length).toBe(DEFAULT_SECTION_ORDER.length + 1);
      });
    });

    describe('additional sections', () => {
      it('addAdditionalSection creates a new section and updates sectionOrder', () => {
        const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

        act(() => {
          result.current.addAdditionalSection();
        });

        expect(result.current.formData.additionalSections).toHaveLength(1);
        expect(result.current.formData.additionalSections![0].title).toBe('Additional Section 1');
        expect(result.current.formData.sectionOrder).toContain('additional-0');
      });

      it('removeAdditionalSection removes section and its sectionOrder entry', () => {
        const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

        act(() => {
          result.current.addAdditionalSection();
        });
        act(() => {
          result.current.removeAdditionalSection(0);
        });

        expect(result.current.formData.additionalSections).toHaveLength(0);
        expect(result.current.formData.sectionOrder).not.toContain('additional-0');
      });
    });
  });

  describe('skills text parsing', () => {
    it('updateSkillsText splits comma-separated string into array', () => {
      const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

      act(() => {
        result.current.updateSkillsText(0, 'TypeScript, Python, Go');
      });

      expect(result.current.formData.skills[0].skills).toEqual(['TypeScript', 'Python', 'Go']);
    });

    it('updateSkillsText handles trailing commas and whitespace', () => {
      const { result } = renderHook(() => useFormBuilder('med-length-proff-cv'));

      act(() => {
        result.current.updateSkillsText(0, 'JS, , CSS, ');
      });

      // filter(Boolean) removes empty strings
      expect(result.current.formData.skills[0].skills).toEqual(['JS', 'CSS']);
    });
  });
});
