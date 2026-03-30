/**
 * entryFactories -- Shared factory functions for creating empty, ID-bearing
 * entries for every CVFormData array type.
 *
 * Extracted from useFormBuilder to enable reuse by useDirectEditor and future
 * entry-creation UI components. Each factory produces a correctly-typed object
 * with a unique ID (via nanoid) and sensible empty defaults.
 */
import { generateId } from './idHelpers';
import type {
  BulletItem,
  SkillItem,
  PersonalInfo,
  WorkEntry,
  EducationEntry,
  SkillCategory,
  Project,
  Award,
  AdditionalEntry,
  AdditionalSection,
} from '../types';

export const DEFAULT_PERSONAL_ORDER = ['phone', 'email', 'location', 'links'];

export function emptyBullet(): BulletItem {
  return { id: generateId(), text: '' };
}

export function emptySkillItem(): SkillItem {
  return { id: generateId(), text: '' };
}

export function emptyPersonalInfo(): PersonalInfo {
  return {
    fullName: '', email: '', phone: '', location: '', links: [],
    summary: '', personalOrder: [...DEFAULT_PERSONAL_ORDER],
  };
}

export function emptyWorkEntry(): WorkEntry {
  return { id: generateId(), company: '', title: '', startDate: '', endDate: '', location: '', bullets: [emptyBullet()] };
}

export function emptyEducationEntry(): EducationEntry {
  return { id: generateId(), school: '', degree: '', startDate: '', endDate: '', location: '', gpa: '', details: [] };
}

export function emptySkillCategory(): SkillCategory {
  return { id: generateId(), category: '', skills: [] };
}

export function emptyProject(): Project {
  return { id: generateId(), name: '', year: '', description: '', technologies: '', bullets: [] };
}

export function emptyAward(): Award {
  return { id: generateId(), year: '', title: '', description: '' };
}

export function emptyAdditionalEntry(): AdditionalEntry {
  return { id: generateId(), title: '', subtitle: '', startDate: '', endDate: '', location: '', description: '', bullets: [emptyBullet()] };
}

export function emptyAdditionalSection(index: number): AdditionalSection {
  return { id: generateId(), title: `Additional Section ${index + 1}`, entries: [emptyAdditionalEntry()] };
}
