/**
 * Tests for entryFactories -- shared factory functions that produce
 * correctly-shaped, ID-bearing entries for every CVFormData array type.
 *
 * Extracted from useFormBuilder to enable reuse by useDirectEditor
 * and future entry-creation UI components.
 */
import { describe, it, expect } from 'vitest';
import {
  emptyBullet,
  emptySkillItem,
  emptyPersonalInfo,
  emptyWorkEntry,
  emptyEducationEntry,
  emptySkillCategory,
  emptyProject,
  emptyAward,
  emptyAdditionalEntry,
  emptyAdditionalSection,
  DEFAULT_PERSONAL_ORDER,
} from '../utils/entryFactories';

describe('entryFactories', () => {
  describe('emptyBullet', () => {
    it('returns { id: string, text: "" }', () => {
      const bullet = emptyBullet();
      expect(bullet.id).toBeDefined();
      expect(typeof bullet.id).toBe('string');
      expect(bullet.id.length).toBeGreaterThan(0);
      expect(bullet.text).toBe('');
    });

    it('produces unique IDs on consecutive calls', () => {
      const b1 = emptyBullet();
      const b2 = emptyBullet();
      expect(b1.id).not.toBe(b2.id);
    });
  });

  describe('emptySkillItem', () => {
    it('returns { id: string, text: "" }', () => {
      const skill = emptySkillItem();
      expect(skill.id).toBeDefined();
      expect(typeof skill.id).toBe('string');
      expect(skill.text).toBe('');
    });

    it('produces unique IDs on consecutive calls', () => {
      const s1 = emptySkillItem();
      const s2 = emptySkillItem();
      expect(s1.id).not.toBe(s2.id);
    });
  });

  describe('emptyPersonalInfo', () => {
    it('returns PersonalInfo with empty strings and empty links array', () => {
      const pi = emptyPersonalInfo();
      expect(pi.fullName).toBe('');
      expect(pi.email).toBe('');
      expect(pi.phone).toBe('');
      expect(pi.location).toBe('');
      expect(pi.links).toEqual([]);
      expect(pi.summary).toBe('');
    });

    it('includes personalOrder matching DEFAULT_PERSONAL_ORDER', () => {
      const pi = emptyPersonalInfo();
      expect(pi.personalOrder).toEqual(DEFAULT_PERSONAL_ORDER);
    });
  });

  describe('emptyWorkEntry', () => {
    it('returns WorkEntry with empty strings and unique id', () => {
      const we = emptyWorkEntry();
      expect(we.id).toBeDefined();
      expect(we.company).toBe('');
      expect(we.title).toBe('');
      expect(we.startDate).toBe('');
      expect(we.endDate).toBe('');
      expect(we.location).toBe('');
    });

    it('has one empty bullet in bullets array', () => {
      const we = emptyWorkEntry();
      expect(we.bullets).toHaveLength(1);
      expect(we.bullets[0].text).toBe('');
      expect(we.bullets[0].id).toBeDefined();
    });

    it('produces unique IDs on consecutive calls', () => {
      const w1 = emptyWorkEntry();
      const w2 = emptyWorkEntry();
      expect(w1.id).not.toBe(w2.id);
    });
  });

  describe('emptyEducationEntry', () => {
    it('returns EducationEntry with empty strings and one empty detail bullet', () => {
      const ee = emptyEducationEntry();
      expect(ee.id).toBeDefined();
      expect(ee.school).toBe('');
      expect(ee.degree).toBe('');
      expect(ee.startDate).toBe('');
      expect(ee.endDate).toBe('');
      expect(ee.location).toBe('');
      expect(ee.gpa).toBe('');
      expect(ee.details).toHaveLength(1);
      expect(ee.details[0].text).toBe('');
      expect(ee.details[0].id).toBeDefined();
    });

    it('produces unique IDs on consecutive calls', () => {
      const e1 = emptyEducationEntry();
      const e2 = emptyEducationEntry();
      expect(e1.id).not.toBe(e2.id);
    });
  });

  describe('emptySkillCategory', () => {
    it('returns SkillCategory with empty category and empty skills array', () => {
      const sc = emptySkillCategory();
      expect(sc.id).toBeDefined();
      expect(sc.category).toBe('');
      expect(sc.skills).toEqual([]);
    });

    it('produces unique IDs on consecutive calls', () => {
      const s1 = emptySkillCategory();
      const s2 = emptySkillCategory();
      expect(s1.id).not.toBe(s2.id);
    });
  });

  describe('emptyProject', () => {
    it('returns Project with empty strings and empty bullets array', () => {
      const p = emptyProject();
      expect(p.id).toBeDefined();
      expect(p.name).toBe('');
      expect(p.year).toBe('');
      expect(p.description).toBe('');
      expect(p.technologies).toBe('');
      expect(p.bullets).toEqual([]);
    });

    it('produces unique IDs on consecutive calls', () => {
      const p1 = emptyProject();
      const p2 = emptyProject();
      expect(p1.id).not.toBe(p2.id);
    });
  });

  describe('emptyAward', () => {
    it('returns Award with empty strings and unique id', () => {
      const a = emptyAward();
      expect(a.id).toBeDefined();
      expect(a.year).toBe('');
      expect(a.title).toBe('');
      expect(a.description).toBe('');
    });

    it('produces unique IDs on consecutive calls', () => {
      const a1 = emptyAward();
      const a2 = emptyAward();
      expect(a1.id).not.toBe(a2.id);
    });
  });

  describe('emptyAdditionalEntry', () => {
    it('returns AdditionalEntry with empty strings and one empty bullet', () => {
      const ae = emptyAdditionalEntry();
      expect(ae.id).toBeDefined();
      expect(ae.title).toBe('');
      expect(ae.subtitle).toBe('');
      expect(ae.startDate).toBe('');
      expect(ae.endDate).toBe('');
      expect(ae.location).toBe('');
      expect(ae.description).toBe('');
      expect(ae.bullets).toHaveLength(1);
      expect(ae.bullets[0].text).toBe('');
      expect(ae.bullets[0].id).toBeDefined();
    });

    it('produces unique IDs on consecutive calls', () => {
      const ae1 = emptyAdditionalEntry();
      const ae2 = emptyAdditionalEntry();
      expect(ae1.id).not.toBe(ae2.id);
    });
  });

  describe('emptyAdditionalSection', () => {
    it('emptyAdditionalSection(0) has title "Additional Section 1"', () => {
      const as0 = emptyAdditionalSection(0);
      expect(as0.title).toBe('Additional Section 1');
    });

    it('emptyAdditionalSection(2) has title "Additional Section 3"', () => {
      const as2 = emptyAdditionalSection(2);
      expect(as2.title).toBe('Additional Section 3');
    });

    it('returns AdditionalSection with one entry and unique id', () => {
      const as0 = emptyAdditionalSection(0);
      expect(as0.id).toBeDefined();
      expect(as0.entries).toHaveLength(1);
      expect(as0.entries[0].title).toBe('');
      expect(as0.entries[0].id).toBeDefined();
    });

    it('produces unique IDs on consecutive calls', () => {
      const as1 = emptyAdditionalSection(0);
      const as2 = emptyAdditionalSection(1);
      expect(as1.id).not.toBe(as2.id);
    });
  });

  describe('cross-factory ID uniqueness', () => {
    it('IDs across different factory types are all unique', () => {
      const ids = [
        emptyBullet().id,
        emptySkillItem().id,
        emptyWorkEntry().id,
        emptyEducationEntry().id,
        emptySkillCategory().id,
        emptyProject().id,
        emptyAward().id,
        emptyAdditionalEntry().id,
        emptyAdditionalSection(0).id,
      ];
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });
  });
});
