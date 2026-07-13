/**
 * Tests for sectionAssist registry + resolver (T9, TDD-first).
 *
 * resolveSectionContext parses a bullets basePath into a section type and a
 * SectionAssistEntryContext drawn from CVFormData. It must:
 * - map workExperience[i].bullets        -> "work"       (title/organization/dates)
 * - map education[i].details             -> "education"  (NOT "work"; details, not bullets)
 * - map projects[i].bullets              -> "project"    (name as title)
 * - map additionalSections[i].entries[j].bullets -> "additional" (entry title)
 * - return null for skills + any unrecognized path
 *
 * SECTION_ASSIST_META exposes a question + chips per section type.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveSectionContext,
  SECTION_ASSIST_META,
} from '../features/direct-edit/utils/sectionAssist';
import type { CVFormData } from '../types';

function makeFormData(): CVFormData {
  return {
    templateId: 'med-length-proff-cv',
    personalInfo: { fullName: 'Jane', email: '', phone: '', location: '', links: [] },
    workExperience: [
      {
        id: 'w1',
        company: 'Acme Corp',
        title: 'Senior Engineer',
        startDate: '2020',
        endDate: '2023',
        location: 'NYC',
        bullets: [{ id: 'b1', text: '' }],
      },
    ],
    education: [
      {
        id: 'e1',
        school: 'MIT',
        degree: 'BS Computer Science',
        startDate: '2016',
        endDate: '2020',
        location: 'Boston',
        details: [{ id: 'd1', text: '' }],
      },
    ],
    skills: [{ id: 's1', category: 'Languages', skills: [{ id: 'sk1', text: 'TypeScript' }] }],
    projects: [
      {
        id: 'p1',
        name: 'CV Maker',
        year: '2024',
        description: '',
        technologies: '',
        bullets: [{ id: 'pb1', text: '' }],
      },
    ],
    additionalSections: [
      {
        id: 'a1',
        title: 'Volunteering',
        entries: [{ id: 'ae1', title: 'Red Cross Volunteer', bullets: [{ id: 'ab1', text: '' }] }],
      },
    ],
  };
}

describe('resolveSectionContext', () => {
  it('Given a work bullets path, When resolved, Then sectionType="work" with title/org/dates', () => {
    const result = resolveSectionContext(makeFormData(), 'workExperience[0].bullets');
    expect(result).not.toBeNull();
    expect(result?.sectionType).toBe('work');
    expect(result?.entryContext.title).toBe('Senior Engineer');
    expect(result?.entryContext.organization).toBe('Acme Corp');
    expect(result?.entryContext.dates).toBe('2020\u20132023');
    expect(result?.hasTitle).toBe(true);
  });

  it('Given education[0].details, When resolved, Then sectionType="education" (NOT "work")', () => {
    const result = resolveSectionContext(makeFormData(), 'education[0].details');
    expect(result).not.toBeNull();
    expect(result?.sectionType).toBe('education');
    expect(result?.sectionType).not.toBe('work');
    expect(result?.entryContext.title).toBe('BS Computer Science');
    expect(result?.entryContext.organization).toBe('MIT');
  });

  it('Given a project bullets path, When resolved, Then sectionType="project" with name as title', () => {
    const result = resolveSectionContext(makeFormData(), 'projects[0].bullets');
    expect(result).not.toBeNull();
    expect(result?.sectionType).toBe('project');
    expect(result?.entryContext.title).toBe('CV Maker');
  });

  it('Given an additional entry bullets path, When resolved, Then sectionType="additional" with entry title', () => {
    const result = resolveSectionContext(
      makeFormData(),
      'additionalSections[0].entries[0].bullets',
    );
    expect(result).not.toBeNull();
    expect(result?.sectionType).toBe('additional');
    expect(result?.entryContext.title).toBe('Red Cross Volunteer');
  });

  it('Given skills[0].skills, When resolved, Then returns null (unsupported)', () => {
    expect(resolveSectionContext(makeFormData(), 'skills[0].skills')).toBeNull();
  });

  it('Given an unrecognized path, When resolved, Then returns null', () => {
    expect(resolveSectionContext(makeFormData(), 'personalInfo.summary')).toBeNull();
    expect(resolveSectionContext(makeFormData(), 'awards[0].title')).toBeNull();
    expect(resolveSectionContext(makeFormData(), 'garbage')).toBeNull();
  });

  it('Given an out-of-range index, When resolved, Then returns null', () => {
    expect(resolveSectionContext(makeFormData(), 'workExperience[5].bullets')).toBeNull();
  });

  it('Given a work entry with empty title and company, When resolved, Then hasTitle is false', () => {
    const formData = makeFormData();
    formData.workExperience[0].title = '';
    formData.workExperience[0].company = '';
    const result = resolveSectionContext(formData, 'workExperience[0].bullets');
    expect(result).not.toBeNull();
    expect(result?.hasTitle).toBe(false);
  });
});

describe('SECTION_ASSIST_META', () => {
  it('has all 4 section types with non-empty questions and chips', () => {
    for (const key of ['work', 'education', 'project', 'additional']) {
      const meta = SECTION_ASSIST_META[key];
      expect(meta).toBeDefined();
      expect(meta.question.length).toBeGreaterThan(0);
      expect(meta.chips.length).toBeGreaterThan(0);
      expect(meta.chips.every((c) => c.length > 0)).toBe(true);
    }
  });
});
