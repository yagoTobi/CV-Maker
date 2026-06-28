/**
 * useDirectEditor -- Central state controller that bridges EditableField
 * callbacks to CVFormData via useCVContext.
 *
 * Wraps useCVContext().formData and setFormData to provide:
 * - updateField(path, value): set a value at a dot-bracket path on CVFormData
 * - addBullet(basePath, afterIndex): insert a new BulletItem and return its ID
 * - removeBullet(basePath, index): remove a bullet at index
 * - addEntry(sectionKey): append a new empty entry to a section
 * - removeEntry(sectionKey, index): remove an entry from a section by index
 * - toggleSection(sectionKey): toggle a section's visibility in hiddenSections Set
 * - hiddenSections: Set<string> of currently hidden section keys
 *
 * Covers: EDIT-05 (edits update CVFormData in real-time).
 * Extended: CONT-01..04 (addEntry, removeEntry, toggleSection).
 *
 * Performance: all mutations use structural sharing (spread/filter/map on the
 * changed path only) so unchanged section array references stay stable.
 * React.memo on section components can then bail out when their data didn't change.
 */
import { useCallback, useState } from 'react';
import { useCVContext } from '../../../contexts/CVContext';
import { generateId } from '../../../utils/idHelpers';
import { setAtPathImmutable, getAtPath } from '../../../utils/formDataPatch';
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
        return setAtPathImmutable(prev as Record<string, unknown>, path, value) as CVFormData;
      });
    },
    [setFormData]
  );

  const addBullet = useCallback(
    (basePath: string, afterIndex: number): string => {
      const newId = generateId();
      setFormData((prev: CVFormData | null) => {
        if (!prev) return prev;
        const arr = getAtPath(prev as Record<string, unknown>, basePath) as BulletItem[] | undefined;
        const newArr = Array.isArray(arr) ? [...arr] : [];
        newArr.splice(afterIndex + 1, 0, { id: newId, text: '' });
        return setAtPathImmutable(prev as Record<string, unknown>, basePath, newArr) as CVFormData;
      });
      return newId;
    },
    [setFormData]
  );

  const removeBullet = useCallback(
    (basePath: string, index: number) => {
      setFormData((prev: CVFormData | null) => {
        if (!prev) return prev;
        const arr = getAtPath(prev as Record<string, unknown>, basePath) as BulletItem[] | undefined;
        if (!Array.isArray(arr)) return prev;
        return setAtPathImmutable(
          prev as Record<string, unknown>,
          basePath,
          arr.filter((_, i) => i !== index)
        ) as CVFormData;
      });
    },
    [setFormData]
  );

  const addEntry = useCallback(
    (sectionKey: string) => {
      setFormData((prev: CVFormData | null) => {
        if (!prev) return prev;
        switch (sectionKey) {
          case 'work':
            return { ...prev, workExperience: [...prev.workExperience, emptyWorkEntry()] };
          case 'education':
            return { ...prev, education: [...prev.education, emptyEducationEntry()] };
          case 'skills':
            return { ...prev, skills: [...prev.skills, emptySkillCategory()] };
          case 'projects':
            return { ...prev, projects: [...(prev.projects || []), emptyProject()] };
          case 'awards':
            return { ...prev, awards: [...(prev.awards || []), emptyAward()] };
          default: {
            if (sectionKey === 'additional-new') {
              const sections = prev.additionalSections || [];
              const newSection = emptyAdditionalSection(sections.length);
              const newSectionId = `additional-${sections.length}`;
              return {
                ...prev,
                additionalSections: [...sections, newSection],
                sectionOrder: [...(prev.sectionOrder || []), newSectionId],
              };
            }
            if (sectionKey.startsWith('additional-')) {
              const idx = parseInt(sectionKey.split('-')[1], 10);
              const sections = prev.additionalSections || [];
              if (idx < sections.length) {
                const updatedSections = [...sections];
                updatedSections[idx] = {
                  ...sections[idx],
                  entries: [...sections[idx].entries, emptyAdditionalEntry()],
                };
                return { ...prev, additionalSections: updatedSections };
              }
            }
            return prev;
          }
        }
      });
    },
    [setFormData]
  );

  const removeEntry = useCallback(
    (sectionKey: string, index: number) => {
      setFormData((prev: CVFormData | null) => {
        if (!prev) return prev;
        switch (sectionKey) {
          case 'work':
            return { ...prev, workExperience: prev.workExperience.filter((_, i) => i !== index) };
          case 'education':
            return { ...prev, education: prev.education.filter((_, i) => i !== index) };
          case 'skills':
            return { ...prev, skills: prev.skills.filter((_, i) => i !== index) };
          case 'projects':
            return { ...prev, projects: (prev.projects || []).filter((_, i) => i !== index) };
          case 'awards':
            return { ...prev, awards: (prev.awards || []).filter((_, i) => i !== index) };
          default: {
            if (sectionKey.startsWith('additional-')) {
              const sIdx = parseInt(sectionKey.split('-')[1], 10);
              const sections = prev.additionalSections || [];
              if (sIdx < sections.length) {
                const updatedSections = [...sections];
                updatedSections[sIdx] = {
                  ...sections[sIdx],
                  entries: sections[sIdx].entries.filter((_, i) => i !== index),
                };
                return { ...prev, additionalSections: updatedSections };
              }
            }
            return prev;
          }
        }
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
        switch (sectionKey) {
          case 'work':
            return { ...prev, workExperience: reorder(prev.workExperience, from, to) };
          case 'education':
            return { ...prev, education: reorder(prev.education, from, to) };
          case 'skills':
            return { ...prev, skills: reorder(prev.skills, from, to) };
          case 'projects':
            return { ...prev, projects: reorder(prev.projects || [], from, to) };
          case 'awards':
            return { ...prev, awards: reorder(prev.awards || [], from, to) };
          default: {
            if (sectionKey.startsWith('additional-')) {
              const sIdx = parseInt(sectionKey.split('-')[1], 10);
              const sections = prev.additionalSections || [];
              if (sIdx < sections.length) {
                const updatedSections = [...sections];
                updatedSections[sIdx] = {
                  ...sections[sIdx],
                  entries: reorder(sections[sIdx].entries, from, to),
                };
                return { ...prev, additionalSections: updatedSections };
              }
            }
            return prev;
          }
        }
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
        const currentOrder = prev.sectionOrder ?? ['work', 'education', 'skills', 'projects', 'awards'];
        const newOrder = currentOrder.filter(k => k !== sectionKey);
        const base = { ...prev, sectionOrder: newOrder };
        switch (sectionKey) {
          case 'work':     return { ...base, workExperience: [] };
          case 'education': return { ...base, education: [] };
          case 'skills':   return { ...base, skills: [] };
          case 'projects': return { ...base, projects: [] };
          case 'awards':   return { ...base, awards: [] };
          default: {
            if (sectionKey.startsWith('additional-')) {
              const idx = parseInt(sectionKey.split('-')[1], 10);
              const filtered = (prev.additionalSections ?? []).filter((_, i) => i !== idx);
              let counter = 0;
              const reindexed = newOrder.map(k =>
                k.startsWith('additional-') ? `additional-${counter++}` : k
              );
              return { ...base, sectionOrder: reindexed, additionalSections: filtered };
            }
            return base;
          }
        }
      });
    },
    [setFormData]
  );

  const addLink = useCallback((label = '', url = '', side: 'left' | 'right' = 'right') => {
    setFormData((prev: CVFormData | null) => {
      if (!prev) return prev;
      const newLink = { id: generateId(), label, url, side };
      const links = [...prev.personalInfo.links, newLink];
      return {
        ...prev,
        personalInfo: { ...prev.personalInfo, links },
      };
    });
  }, [setFormData]);

  const removeLink = useCallback((linkIdx: number) => {
    setFormData((prev: CVFormData | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        personalInfo: {
          ...prev.personalInfo,
          links: prev.personalInfo.links.filter((_, i) => i !== linkIdx),
        },
      };
    });
  }, [setFormData]);

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
    addLink,
    removeLink,
  };
}
