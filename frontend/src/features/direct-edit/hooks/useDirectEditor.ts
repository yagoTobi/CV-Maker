/**
 * useDirectEditor -- Central state controller that bridges EditableField
 * callbacks to CVFormData via useCVContext.
 *
 * Wraps useCVContext().formData and setFormData to provide:
 * - updateField(path, value): set a value at a dot-bracket path on CVFormData
 * - addBullet(basePath, afterIndex): insert a new BulletItem and return its ID
 * - removeBullet(basePath, index): remove a bullet at index (guards minimum 1)
 * - addEntry(sectionKey): append a new empty entry to a section
 * - removeEntry(sectionKey, index): remove an entry from a section by index
 * - toggleSection(sectionKey): toggle a section's visibility in hiddenSections Set
 * - hiddenSections: Set<string> of currently hidden section keys
 *
 * Covers: EDIT-05 (edits update CVFormData in real-time).
 * Extended: CONT-01..04 (addEntry, removeEntry, toggleSection).
 */
import { useCallback, useState } from 'react';
import { useCVContext } from '../../../contexts/CVContext';
import { generateId } from '../../../utils/idHelpers';
import { setAtPath, getAtPath } from '../../../utils/formDataPatch';
import {
  emptyWorkEntry,
  emptyEducationEntry,
  emptySkillCategory,
  emptyProject,
  emptyAward,
  emptyAdditionalEntry,
  emptyAdditionalSection,
} from '../../../utils/entryFactories';
import type { CVFormData, BulletItem, SkillItem } from '../../../types';

function reorder<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

export function useDirectEditor() {
  const { formData, setFormData } = useCVContext();
  const [hiddenSections, setHiddenSections] = useState<Set<string>>(new Set());

  const updateField = useCallback(
    (path: string, value: string | SkillItem[]) => {
      setFormData((prev: CVFormData | null) => {
        if (!prev) return prev;
        const next = structuredClone(prev);
        setAtPath(next as Record<string, unknown>, path, value);
        return next;
      });
    },
    [setFormData]
  );

  const addBullet = useCallback(
    (basePath: string, afterIndex: number): string => {
      const newId = generateId();
      setFormData((prev: CVFormData | null) => {
        if (!prev) return prev;
        const next = structuredClone(prev);
        const arr = getAtPath(
          next as Record<string, unknown>,
          basePath
        ) as BulletItem[] | undefined;
        if (!Array.isArray(arr)) return prev;
        arr.splice(afterIndex + 1, 0, { id: newId, text: '' });
        return next;
      });
      return newId;
    },
    [setFormData]
  );

  const removeBullet = useCallback(
    (basePath: string, index: number) => {
      // Read current formData to check array length before calling setFormData
      if (!formData) return;
      const arr = getAtPath(
        formData as Record<string, unknown>,
        basePath
      ) as BulletItem[] | undefined;
      if (!Array.isArray(arr) || arr.length <= 1) return;

      setFormData((prev: CVFormData | null) => {
        if (!prev) return prev;
        const next = structuredClone(prev);
        const bullets = getAtPath(
          next as Record<string, unknown>,
          basePath
        ) as BulletItem[] | undefined;
        if (!Array.isArray(bullets) || bullets.length <= 1) return prev;
        bullets.splice(index, 1);
        return next;
      });
    },
    [formData, setFormData]
  );

  const addEntry = useCallback(
    (sectionKey: string) => {
      setFormData((prev: CVFormData | null) => {
        if (!prev) return prev;
        const next = structuredClone(prev);
        switch (sectionKey) {
          case 'work':
            next.workExperience = [...next.workExperience, emptyWorkEntry()];
            break;
          case 'education':
            next.education = [...next.education, emptyEducationEntry()];
            break;
          case 'skills':
            next.skills = [...next.skills, emptySkillCategory()];
            break;
          case 'projects':
            next.projects = [...(next.projects || []), emptyProject()];
            break;
          case 'awards':
            next.awards = [...(next.awards || []), emptyAward()];
            break;
          default:
            if (sectionKey === 'additional-new') {
              const sections = next.additionalSections || [];
              const newSection = emptyAdditionalSection(sections.length);
              const newSectionId = `additional-${sections.length}`;
              next.additionalSections = [...sections, newSection];
              next.sectionOrder = [...(next.sectionOrder || []), newSectionId];
            } else if (sectionKey.startsWith('additional-')) {
              const idx = parseInt(sectionKey.split('-')[1], 10);
              const sections = next.additionalSections || [];
              if (idx < sections.length) {
                sections[idx] = {
                  ...sections[idx],
                  entries: [...sections[idx].entries, emptyAdditionalEntry()],
                };
                next.additionalSections = sections;
              }
            }
        }
        return next;
      });
    },
    [setFormData]
  );

  const removeEntry = useCallback(
    (sectionKey: string, index: number) => {
      setFormData((prev: CVFormData | null) => {
        if (!prev) return prev;
        const next = structuredClone(prev);
        switch (sectionKey) {
          case 'work':
            next.workExperience = next.workExperience.filter((_, i) => i !== index);
            break;
          case 'education':
            next.education = next.education.filter((_, i) => i !== index);
            break;
          case 'skills':
            next.skills = next.skills.filter((_, i) => i !== index);
            break;
          case 'projects':
            next.projects = (next.projects || []).filter((_, i) => i !== index);
            break;
          case 'awards':
            next.awards = (next.awards || []).filter((_, i) => i !== index);
            break;
          default:
            if (sectionKey.startsWith('additional-')) {
              const sIdx = parseInt(sectionKey.split('-')[1], 10);
              const sections = next.additionalSections || [];
              if (sIdx < sections.length) {
                sections[sIdx] = {
                  ...sections[sIdx],
                  entries: sections[sIdx].entries.filter((_, i) => i !== index),
                };
                next.additionalSections = sections;
              }
            }
        }
        return next;
      });
    },
    [setFormData]
  );

  const reorderSections = useCallback(
    (from: number, to: number) => {
      setFormData((prev: CVFormData | null) => {
        if (!prev) return prev;
        const currentOrder = prev.sectionOrder ?? ['work', 'education', 'skills', 'projects', 'awards'];
        return { ...prev, sectionOrder: reorder(currentOrder, from, to) };
      });
    },
    [setFormData]
  );

  const reorderEntries = useCallback(
    (sectionKey: string, from: number, to: number) => {
      setFormData((prev: CVFormData | null) => {
        if (!prev) return prev;
        const next = structuredClone(prev);
        switch (sectionKey) {
          case 'work':
            next.workExperience = reorder(next.workExperience, from, to);
            break;
          case 'education':
            next.education = reorder(next.education, from, to);
            break;
          case 'skills':
            next.skills = reorder(next.skills, from, to);
            break;
          case 'projects':
            next.projects = reorder(next.projects || [], from, to);
            break;
          case 'awards':
            next.awards = reorder(next.awards || [], from, to);
            break;
          default:
            if (sectionKey.startsWith('additional-')) {
              const sIdx = parseInt(sectionKey.split('-')[1], 10);
              const sections = next.additionalSections || [];
              if (sIdx < sections.length) {
                sections[sIdx] = {
                  ...sections[sIdx],
                  entries: reorder(sections[sIdx].entries, from, to),
                };
                next.additionalSections = sections;
              }
            }
        }
        return next;
      });
    },
    [setFormData]
  );

  const toggleSection = useCallback(
    (sectionKey: string) => {
      setHiddenSections(prev => {
        const next = new Set(prev);
        if (next.has(sectionKey)) {
          next.delete(sectionKey);
        } else {
          next.add(sectionKey);
        }
        return next;
      });
    },
    []
  );

  const removeSection = useCallback(
    (sectionKey: string) => {
      setFormData((prev: CVFormData | null) => {
        if (!prev) return prev;
        const next = structuredClone(prev);
        const currentOrder = next.sectionOrder ?? ['work', 'education', 'skills', 'projects', 'awards'];
        next.sectionOrder = currentOrder.filter(k => k !== sectionKey);
        switch (sectionKey) {
          case 'work': next.workExperience = []; break;
          case 'education': next.education = []; break;
          case 'skills': next.skills = []; break;
          case 'projects': next.projects = []; break;
          case 'awards': next.awards = []; break;
          default:
            if (sectionKey.startsWith('additional-')) {
              const idx = parseInt(sectionKey.split('-')[1], 10);
              next.additionalSections = (next.additionalSections ?? []).filter((_, i) => i !== idx);
              // Re-index remaining additional-N keys in sectionOrder
              let counter = 0;
              next.sectionOrder = next.sectionOrder.map(k =>
                k.startsWith('additional-') ? `additional-${counter++}` : k
              );
            }
        }
        return next;
      });
    },
    [setFormData]
  );

  return {
    formData,
    updateField,
    addBullet,
    removeBullet,
    addEntry,
    removeEntry,
    reorderSections,
    reorderEntries,
    toggleSection,
    hiddenSections,
    removeSection,
  };
}
