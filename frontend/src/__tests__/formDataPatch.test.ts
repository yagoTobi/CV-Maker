/**
 * Tests for formDataPatch utility -- verifying path resolution
 * works with BulletItem/SkillItem structured types.
 *
 * Covers DATA-02: tailor path resolution with structured types.
 */
import { describe, it, expect } from 'vitest';
import { applyTailorChanges } from '../utils/formDataPatch';
import type { CVFormData, TailorChange } from '../types';

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
        { id: 'b3', text: 'Managed Z' },
      ],
    }],
    education: [{
      id: 'edu-1',
      school: 'MIT',
      degree: 'BS CS',
      startDate: '2016',
      endDate: '2020',
      location: 'MA',
      details: [{ id: 'd1', text: 'GPA 4.0' }],
    }],
    skills: [{
      id: 'skill-1',
      category: 'Languages',
      skills: [
        { id: 'sk1', text: 'Python' },
        { id: 'sk2', text: 'TypeScript' },
      ],
    }],
  };
}

describe('applyTailorChanges with BulletItem', () => {
  it('modifies bullet text while preserving ID', () => {
    const fd = makeTestFormData();
    const changes: TailorChange[] = [{
      id: 'c1',
      fieldPath: 'workExperience[0].bullets[1]',
      section: 'Work Experience',
      description: 'Enhanced bullet',
      currentValue: 'Led Y',
      alternatives: [{ label: 'Suggested', value: 'Led Y initiative achieving 50% improvement' }],
      changeType: 'modify',
    }];
    const result = applyTailorChanges(fd, changes, new Set(['c1']));
    // Text should be updated
    expect(result.workExperience[0].bullets[1].text).toBe('Led Y initiative achieving 50% improvement');
    // ID should be preserved
    expect(result.workExperience[0].bullets[1].id).toBe('b2');
    // Other bullets unchanged
    expect(result.workExperience[0].bullets[0].text).toBe('Built X');
    expect(result.workExperience[0].bullets[0].id).toBe('b1');
  });

  it('modifies education detail while preserving ID', () => {
    const fd = makeTestFormData();
    const changes: TailorChange[] = [{
      id: 'c2',
      fieldPath: 'education[0].details[0]',
      section: 'Education',
      description: 'Enhanced detail',
      currentValue: 'GPA 4.0',
      alternatives: [{ label: 'Suggested', value: 'Graduated Magna Cum Laude, GPA 4.0' }],
      changeType: 'modify',
    }];
    const result = applyTailorChanges(fd, changes, new Set(['c2']));
    expect(result.education[0].details[0].text).toBe('Graduated Magna Cum Laude, GPA 4.0');
    expect(result.education[0].details[0].id).toBe('d1');
  });

  it('handles non-selected changes (skips them)', () => {
    const fd = makeTestFormData();
    const changes: TailorChange[] = [{
      id: 'c3',
      fieldPath: 'workExperience[0].bullets[0]',
      section: 'Work',
      description: 'Change',
      currentValue: 'Built X',
      alternatives: [{ label: 'Suggested', value: 'Redesigned X' }],
      changeType: 'modify',
    }];
    const result = applyTailorChanges(fd, changes, new Set([])); // not selected
    expect(result.workExperience[0].bullets[0].text).toBe('Built X');
  });

  it('modifies plain string field normally', () => {
    const fd = makeTestFormData();
    const changes: TailorChange[] = [{
      id: 'c4',
      fieldPath: 'workExperience[0].title',
      section: 'Work',
      description: 'Updated title',
      currentValue: 'Engineer',
      alternatives: [{ label: 'Suggested', value: 'Senior Software Engineer' }],
      changeType: 'modify',
    }];
    const result = applyTailorChanges(fd, changes, new Set(['c4']));
    expect(result.workExperience[0].title).toBe('Senior Software Engineer');
  });

  it('handles adding a new bullet to a structured array', () => {
    const fd = makeTestFormData();
    const changes: TailorChange[] = [{
      id: 'c5',
      fieldPath: 'workExperience[0].bullets[3]',
      section: 'Work Experience',
      description: 'Added new bullet',
      currentValue: '',
      alternatives: [{ label: 'Suggested', value: 'Optimized build pipeline by 40%' }],
      changeType: 'add',
    }];
    const result = applyTailorChanges(fd, changes, new Set(['c5']));
    expect(result.workExperience[0].bullets).toHaveLength(4);
    expect(result.workExperience[0].bullets[3].text).toBe('Optimized build pipeline by 40%');
    expect(result.workExperience[0].bullets[3].id).toBeDefined();
  });

  it('wraps string[] as SkillItem[] when target is structured', () => {
    const fd = makeTestFormData();
    const changes: TailorChange[] = [{
      id: 'c6',
      fieldPath: 'skills[0].skills',
      section: 'Skills',
      description: 'Added Go to languages',
      currentValue: ['Python', 'TypeScript'],
      alternatives: [{ label: 'Suggested', value: ['Python', 'TypeScript', 'Go'] }],
      changeType: 'modify',
    }];
    const result = applyTailorChanges(fd, changes, new Set(['c6']));
    expect(result.skills[0].skills).toHaveLength(3);
    expect(result.skills[0].skills[0].text).toBe('Python');
    expect(result.skills[0].skills[1].text).toBe('TypeScript');
    expect(result.skills[0].skills[2].text).toBe('Go');
    // All items should have IDs
    result.skills[0].skills.forEach(s => {
      expect(s.id).toBeDefined();
      expect(typeof s.id).toBe('string');
    });
  });
});
