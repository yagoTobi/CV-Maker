import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { api } from '../services/api';
import { generateId } from '../utils/idHelpers';
import type {
  CVFormData,
  PersonalInfo,
  WorkEntry,
  EducationEntry,
  SkillCategory,
  Project,
  Award,
  AdditionalSection,
  AdditionalEntry,
  BulletItem,
  SkillItem,
} from '../types';

export type FormSection = 'personal' | 'work' | 'education' | 'skills' | 'projects' | 'awards' | string;

export const DEFAULT_SECTION_ORDER: FormSection[] = [
  'work', 'education', 'skills', 'projects', 'awards',
];

export const DEFAULT_PERSONAL_ORDER = ['phone', 'email', 'location', 'links'];

function emptyBullet(): BulletItem {
  return { id: generateId(), text: '' };
}

function emptySkillItem(): SkillItem {
  return { id: generateId(), text: '' };
}

function emptyPersonalInfo(): PersonalInfo {
  return {
    fullName: '', email: '', phone: '', location: '', links: [],
    summary: '', personalOrder: [...DEFAULT_PERSONAL_ORDER],
  };
}

function emptyWorkEntry(): WorkEntry {
  return { id: generateId(), company: '', title: '', startDate: '', endDate: '', location: '', bullets: [emptyBullet()] };
}

function emptyEducationEntry(): EducationEntry {
  return { id: generateId(), school: '', degree: '', startDate: '', endDate: '', location: '', gpa: '', details: [] };
}

function emptySkillCategory(): SkillCategory {
  return { id: generateId(), category: '', skills: [] };
}

function emptyProject(): Project {
  return { id: generateId(), name: '', year: '', description: '', technologies: '', bullets: [] };
}

function emptyAward(): Award {
  return { id: generateId(), year: '', title: '', description: '' };
}

function emptyAdditionalEntry(): AdditionalEntry {
  return { id: generateId(), title: '', subtitle: '', startDate: '', endDate: '', location: '', description: '', bullets: [emptyBullet()] };
}

function emptyAdditionalSection(index: number): AdditionalSection {
  return { id: generateId(), title: `Additional Section ${index + 1}`, entries: [emptyAdditionalEntry()] };
}

function reorder<T>(arr: T[], from: number, to: number): T[] {
  const result = [...arr];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item);
  return result;
}

function initialFormData(templateId: string): CVFormData {
  return {
    templateId,
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    personalInfo: emptyPersonalInfo(),
    workExperience: [emptyWorkEntry()],
    education: [emptyEducationEntry()],
    skills: [emptySkillCategory()],
    projects: [],
    awards: [],
    additionalSections: [],
  };
}

// Valid section keys for sectionOrder — "personal" is handled separately by the nav
const VALID_SECTION_KEYS = new Set(['work', 'education', 'skills', 'projects', 'awards']);

function sanitizeSectionOrder(order: string[] | undefined, additionalSections?: AdditionalSection[]): string[] {
  if (!order) return [...DEFAULT_SECTION_ORDER];
  const additionalCount = additionalSections?.length ?? 0;
  return order.filter(key =>
    VALID_SECTION_KEYS.has(key) ||
    (key.startsWith('additional-') && parseInt(key.replace('additional-', '')) < additionalCount)
  );
}

export function useFormBuilder(templateId: string, importedData?: CVFormData) {
  const [formData, setFormData] = useState<CVFormData>(() => {
    if (!importedData) return initialFormData(templateId);
    return {
      ...importedData,
      templateId,
      sectionOrder: sanitizeSectionOrder(importedData.sectionOrder, importedData.additionalSections),
    };
  });
  const [activeSection, setActiveSection] = useState<FormSection>('personal');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Sync when imported data changes (e.g. voice interview extraction)
  const importedRef = useRef(importedData);
  useEffect(() => {
    if (importedData && importedData !== importedRef.current) {
      if (import.meta.env.DEV) {
        console.log("[FormBuilder:sync] imported data changed — updating form", {
          name: importedData.personalInfo?.fullName,
          workEntries: importedData.workExperience?.length,
          templateId,
        });
      }
      importedRef.current = importedData;
      setFormData({
        ...importedData,
        templateId,
        sectionOrder: sanitizeSectionOrder(importedData.sectionOrder, importedData.additionalSections),
      });
    }
  }, [importedData, templateId]);

  // isDirty: true when formData has changed since the last generateCV() call
  const lastGeneratedRef = useRef<CVFormData | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (lastGeneratedRef.current !== null) {
      setIsDirty(true);
    }
  }, [formData]);

  // --- Personal header order ---

  const reorderPersonalFields = useCallback((from: number, to: number) => {
    setFormData(prev => {
      const currentOrder = prev.personalInfo.personalOrder ?? [...DEFAULT_PERSONAL_ORDER];
      return {
        ...prev,
        personalInfo: { ...prev.personalInfo, personalOrder: reorder(currentOrder, from, to) },
      };
    });
  }, []);

  // --- Section order ---

  const reorderSections = useCallback((from: number, to: number) => {
    setFormData(prev => {
      const currentOrder = (prev.sectionOrder as FormSection[]) ?? [...DEFAULT_SECTION_ORDER];
      return { ...prev, sectionOrder: reorder(currentOrder, from, to) };
    });
  }, []);

  // --- Personal Info ---

  const updatePersonalInfo = useCallback((updates: Partial<PersonalInfo>) => {
    setFormData(prev => ({ ...prev, personalInfo: { ...prev.personalInfo, ...updates } }));
  }, []);

  const addLink = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, links: [...prev.personalInfo.links, { id: generateId(), label: '', url: '' }] },
    }));
  }, []);

  const updateLink = useCallback((index: number, field: 'label' | 'url', value: string) => {
    setFormData(prev => {
      const links = prev.personalInfo.links.map((l, i) => i === index ? { ...l, [field]: value } : l);
      return { ...prev, personalInfo: { ...prev.personalInfo, links } };
    });
  }, []);

  const removeLink = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, links: prev.personalInfo.links.filter((_, i) => i !== index) },
    }));
  }, []);

  // --- Work Experience ---

  const addWorkEntry = useCallback(() => {
    setFormData(prev => ({ ...prev, workExperience: [...prev.workExperience, emptyWorkEntry()] }));
  }, []);

  const updateWorkEntry = useCallback((index: number, updates: Partial<WorkEntry>) => {
    setFormData(prev => ({
      ...prev,
      workExperience: prev.workExperience.map((e, i) => i === index ? { ...e, ...updates } : e),
    }));
  }, []);

  const removeWorkEntry = useCallback((index: number) => {
    setFormData(prev => ({ ...prev, workExperience: prev.workExperience.filter((_, i) => i !== index) }));
  }, []);

  const reorderWorkEntries = useCallback((from: number, to: number) => {
    setFormData(prev => ({ ...prev, workExperience: reorder(prev.workExperience, from, to) }));
  }, []);

  const addBullet = useCallback((workIndex: number) => {
    setFormData(prev => ({
      ...prev,
      workExperience: prev.workExperience.map((e, i) =>
        i === workIndex ? { ...e, bullets: [...e.bullets, emptyBullet()] } : e
      ),
    }));
  }, []);

  const updateBullet = useCallback((workIndex: number, bulletIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      workExperience: prev.workExperience.map((e, i) =>
        i === workIndex
          ? { ...e, bullets: e.bullets.map((b, bi) => bi === bulletIndex ? { ...b, text: value } : b) }
          : e
      ),
    }));
  }, []);

  const removeBullet = useCallback((workIndex: number, bulletIndex: number) => {
    setFormData(prev => ({
      ...prev,
      workExperience: prev.workExperience.map((e, i) =>
        i === workIndex ? { ...e, bullets: e.bullets.filter((_, bi) => bi !== bulletIndex) } : e
      ),
    }));
  }, []);

  const reorderBullets = useCallback((workIndex: number, from: number, to: number) => {
    setFormData(prev => ({
      ...prev,
      workExperience: prev.workExperience.map((e, i) =>
        i === workIndex ? { ...e, bullets: reorder(e.bullets, from, to) } : e
      ),
    }));
  }, []);

  // --- Education ---

  const addEducationEntry = useCallback(() => {
    setFormData(prev => ({ ...prev, education: [...prev.education, emptyEducationEntry()] }));
  }, []);

  const updateEducationEntry = useCallback((index: number, updates: Partial<EducationEntry>) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.map((e, i) => i === index ? { ...e, ...updates } : e),
    }));
  }, []);

  const removeEducationEntry = useCallback((index: number) => {
    setFormData(prev => ({ ...prev, education: prev.education.filter((_, i) => i !== index) }));
  }, []);

  const reorderEducationEntries = useCallback((from: number, to: number) => {
    setFormData(prev => ({ ...prev, education: reorder(prev.education, from, to) }));
  }, []);

  const addEduDetail = useCallback((eduIndex: number) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.map((e, i) =>
        i === eduIndex ? { ...e, details: [...e.details, emptyBullet()] } : e
      ),
    }));
  }, []);

  const updateEduDetail = useCallback((eduIndex: number, detailIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.map((e, i) =>
        i === eduIndex
          ? { ...e, details: e.details.map((d, di) => di === detailIndex ? { ...d, text: value } : d) }
          : e
      ),
    }));
  }, []);

  const removeEduDetail = useCallback((eduIndex: number, detailIndex: number) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.map((e, i) =>
        i === eduIndex ? { ...e, details: e.details.filter((_, di) => di !== detailIndex) } : e
      ),
    }));
  }, []);

  const reorderEduDetails = useCallback((eduIndex: number, from: number, to: number) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.map((e, i) =>
        i === eduIndex ? { ...e, details: reorder(e.details, from, to) } : e
      ),
    }));
  }, []);

  // --- Skills ---

  const addSkillCategory = useCallback(() => {
    setFormData(prev => ({ ...prev, skills: [...prev.skills, emptySkillCategory()] }));
  }, []);

  const updateSkillCategory = useCallback((index: number, updates: Partial<SkillCategory>) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.map((s, i) => i === index ? { ...s, ...updates } : s),
    }));
  }, []);

  const removeSkillCategory = useCallback((index: number) => {
    setFormData(prev => ({ ...prev, skills: prev.skills.filter((_, i) => i !== index) }));
  }, []);

  const reorderSkillCategories = useCallback((from: number, to: number) => {
    setFormData(prev => ({ ...prev, skills: reorder(prev.skills, from, to) }));
  }, []);

  const updateSkillsText = useCallback((index: number, value: string) => {
    const newTexts = value.split(',').map(s => s.trim()).filter(Boolean);
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.map((s, i) => {
        if (i !== index) return s;
        // Preserve IDs for skills whose text hasn't changed
        const updatedSkills: SkillItem[] = newTexts.map((text, ti) => {
          const existing = s.skills[ti];
          if (existing && existing.text === text) return existing;
          // Try to find by text match (handles reordering from comma edits)
          const matchByText = s.skills.find(sk => sk.text === text);
          if (matchByText) return matchByText;
          return { id: generateId(), text };
        });
        return { ...s, skills: updatedSkills };
      }),
    }));
  }, []);

  // --- Projects ---

  const addProject = useCallback(() => {
    setFormData(prev => ({ ...prev, projects: [...(prev.projects || []), emptyProject()] }));
  }, []);

  const updateProject = useCallback((index: number, updates: Partial<Project>) => {
    setFormData(prev => ({
      ...prev,
      projects: (prev.projects || []).map((p, i) => i === index ? { ...p, ...updates } : p),
    }));
  }, []);

  const removeProject = useCallback((index: number) => {
    setFormData(prev => ({ ...prev, projects: (prev.projects || []).filter((_, i) => i !== index) }));
  }, []);

  const reorderProjects = useCallback((from: number, to: number) => {
    setFormData(prev => ({ ...prev, projects: reorder(prev.projects || [], from, to) }));
  }, []);

  const addProjectBullet = useCallback((projectIndex: number) => {
    setFormData(prev => ({
      ...prev,
      projects: (prev.projects || []).map((p, i) =>
        i === projectIndex ? { ...p, bullets: [...(p.bullets || []), emptyBullet()] } : p
      ),
    }));
  }, []);

  const updateProjectBullet = useCallback((projectIndex: number, bulletIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      projects: (prev.projects || []).map((p, i) =>
        i === projectIndex
          ? { ...p, bullets: (p.bullets || []).map((b, bi) => bi === bulletIndex ? { ...b, text: value } : b) }
          : p
      ),
    }));
  }, []);

  const removeProjectBullet = useCallback((projectIndex: number, bulletIndex: number) => {
    setFormData(prev => ({
      ...prev,
      projects: (prev.projects || []).map((p, i) =>
        i === projectIndex ? { ...p, bullets: (p.bullets || []).filter((_, bi) => bi !== bulletIndex) } : p
      ),
    }));
  }, []);

  const reorderProjectBullets = useCallback((projectIndex: number, from: number, to: number) => {
    setFormData(prev => ({
      ...prev,
      projects: (prev.projects || []).map((p, i) =>
        i === projectIndex ? { ...p, bullets: reorder(p.bullets || [], from, to) } : p
      ),
    }));
  }, []);

  // --- Awards ---

  const addAward = useCallback(() => {
    setFormData(prev => ({ ...prev, awards: [...(prev.awards || []), emptyAward()] }));
  }, []);

  const updateAward = useCallback((index: number, updates: Partial<Award>) => {
    setFormData(prev => ({
      ...prev,
      awards: (prev.awards || []).map((a, i) => i === index ? { ...a, ...updates } : a),
    }));
  }, []);

  const removeAward = useCallback((index: number) => {
    setFormData(prev => ({ ...prev, awards: (prev.awards || []).filter((_, i) => i !== index) }));
  }, []);

  const reorderAwards = useCallback((from: number, to: number) => {
    setFormData(prev => ({ ...prev, awards: reorder(prev.awards || [], from, to) }));
  }, []);

  // --- Additional Sections ---

  const addAdditionalSection = useCallback(() => {
    setFormData(prev => {
      const currentSections = prev.additionalSections || [];
      const newSection = emptyAdditionalSection(currentSections.length);
      const newSectionId = `additional-${currentSections.length}`;
      return {
        ...prev,
        additionalSections: [...currentSections, newSection],
        sectionOrder: [...(prev.sectionOrder || DEFAULT_SECTION_ORDER), newSectionId],
      };
    });
  }, []);

  const removeAdditionalSection = useCallback((sectionIndex: number) => {
    setFormData(prev => {
      const sectionId = `additional-${sectionIndex}`;
      return {
        ...prev,
        additionalSections: (prev.additionalSections || []).filter((_, i) => i !== sectionIndex),
        sectionOrder: (prev.sectionOrder || []).filter(id => id !== sectionId),
      };
    });
  }, []);

  const updateAdditionalSectionTitle = useCallback((sectionIndex: number, title: string) => {
    setFormData(prev => ({
      ...prev,
      additionalSections: (prev.additionalSections || []).map((s, i) =>
        i === sectionIndex ? { ...s, title } : s
      ),
    }));
  }, []);

  const addAdditionalEntry = useCallback((sectionIndex: number) => {
    setFormData(prev => ({
      ...prev,
      additionalSections: (prev.additionalSections || []).map((s, i) =>
        i === sectionIndex ? { ...s, entries: [...s.entries, emptyAdditionalEntry()] } : s
      ),
    }));
  }, []);

  const removeAdditionalEntry = useCallback((sectionIndex: number, entryIndex: number) => {
    setFormData(prev => ({
      ...prev,
      additionalSections: (prev.additionalSections || []).map((s, i) =>
        i === sectionIndex ? { ...s, entries: s.entries.filter((_, ei) => ei !== entryIndex) } : s
      ),
    }));
  }, []);

  const updateAdditionalEntry = useCallback((sectionIndex: number, entryIndex: number, updates: Partial<AdditionalEntry>) => {
    setFormData(prev => ({
      ...prev,
      additionalSections: (prev.additionalSections || []).map((s, i) =>
        i === sectionIndex
          ? { ...s, entries: s.entries.map((e, ei) => ei === entryIndex ? { ...e, ...updates } : e) }
          : s
      ),
    }));
  }, []);

  const addAdditionalEntryBullet = useCallback((sectionIndex: number, entryIndex: number) => {
    setFormData(prev => ({
      ...prev,
      additionalSections: (prev.additionalSections || []).map((s, i) =>
        i === sectionIndex
          ? { ...s, entries: s.entries.map((e, ei) => ei === entryIndex ? { ...e, bullets: [...e.bullets, emptyBullet()] } : e) }
          : s
      ),
    }));
  }, []);

  const removeAdditionalEntryBullet = useCallback((sectionIndex: number, entryIndex: number, bulletIndex: number) => {
    setFormData(prev => ({
      ...prev,
      additionalSections: (prev.additionalSections || []).map((s, i) =>
        i === sectionIndex
          ? { ...s, entries: s.entries.map((e, ei) => ei === entryIndex ? { ...e, bullets: e.bullets.filter((_, bi) => bi !== bulletIndex) } : e) }
          : s
      ),
    }));
  }, []);

  const updateAdditionalEntryBullet = useCallback((sectionIndex: number, entryIndex: number, bulletIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      additionalSections: (prev.additionalSections || []).map((s, i) =>
        i === sectionIndex
          ? { ...s, entries: s.entries.map((e, ei) => ei === entryIndex ? { ...e, bullets: e.bullets.map((b, bi) => bi === bulletIndex ? { ...b, text: value } : b) } : e) }
          : s
      ),
    }));
  }, []);

  const reorderAdditionalEntryBullets = useCallback((sectionIndex: number, entryIndex: number, from: number, to: number) => {
    setFormData(prev => ({
      ...prev,
      additionalSections: (prev.additionalSections || []).map((s, i) =>
        i === sectionIndex
          ? { ...s, entries: s.entries.map((e, ei) => ei === entryIndex ? { ...e, bullets: reorder(e.bullets, from, to) } : e) }
          : s
      ),
    }));
  }, []);

  // --- Generate CV ---

  const generateCV = useCallback(async (): Promise<{ texContent: string; error?: string }> => {
    setIsGenerating(true);
    setGenerateError(null);
    const result = await api.generateLatex(formData);
    setIsGenerating(false);
    if (result.error) {
      setGenerateError(result.error);
    } else {
      lastGeneratedRef.current = formData;
      setIsDirty(false);
    }
    return result;
  }, [formData]);

  // --- Replace form data (used by tailor accept) ---

  const replaceFormData = useCallback((newData: CVFormData) => {
    setFormData({
      ...newData,
      templateId,
      sectionOrder: sanitizeSectionOrder(newData.sectionOrder, newData.additionalSections),
    });
    lastGeneratedRef.current = newData;
    setIsDirty(false);
  }, [templateId]);

  // --- Export / Import ---

  const exportFormData = useCallback(() => {
    const blob = new Blob([JSON.stringify(formData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cv-data.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [formData]);

  // Full ordered section list for the nav (personal is always first, not reorderable)
  const navSectionOrder: FormSection[] = useMemo(() => [
    'personal',
    ...((formData.sectionOrder as FormSection[]) ?? DEFAULT_SECTION_ORDER),
  ], [formData.sectionOrder]);

  return useMemo(() => ({
    formData,
    activeSection,
    setActiveSection,
    isGenerating,
    generateError,
    isDirty,
    navSectionOrder,
    // Section order
    reorderSections,
    // Personal
    reorderPersonalFields,
    updatePersonalInfo,
    addLink,
    updateLink,
    removeLink,
    // Work
    addWorkEntry,
    updateWorkEntry,
    removeWorkEntry,
    reorderWorkEntries,
    addBullet,
    updateBullet,
    removeBullet,
    reorderBullets,
    // Education
    addEducationEntry,
    updateEducationEntry,
    removeEducationEntry,
    reorderEducationEntries,
    addEduDetail,
    updateEduDetail,
    removeEduDetail,
    reorderEduDetails,
    // Skills
    addSkillCategory,
    updateSkillCategory,
    removeSkillCategory,
    reorderSkillCategories,
    updateSkillsText,
    // Projects
    addProject,
    updateProject,
    removeProject,
    reorderProjects,
    addProjectBullet,
    updateProjectBullet,
    removeProjectBullet,
    reorderProjectBullets,
    // Awards
    addAward,
    updateAward,
    removeAward,
    reorderAwards,
    // Additional Sections
    addAdditionalSection,
    removeAdditionalSection,
    updateAdditionalSectionTitle,
    addAdditionalEntry,
    removeAdditionalEntry,
    updateAdditionalEntry,
    addAdditionalEntryBullet,
    removeAdditionalEntryBullet,
    updateAdditionalEntryBullet,
    reorderAdditionalEntryBullets,
    // Actions
    generateCV,
    exportFormData,
    replaceFormData,
  }), [
    formData,
    activeSection,
    setActiveSection,
    isGenerating,
    generateError,
    isDirty,
    navSectionOrder,
    reorderSections,
    reorderPersonalFields,
    updatePersonalInfo,
    addLink,
    updateLink,
    removeLink,
    addWorkEntry,
    updateWorkEntry,
    removeWorkEntry,
    reorderWorkEntries,
    addBullet,
    updateBullet,
    removeBullet,
    reorderBullets,
    addEducationEntry,
    updateEducationEntry,
    removeEducationEntry,
    reorderEducationEntries,
    addEduDetail,
    updateEduDetail,
    removeEduDetail,
    reorderEduDetails,
    addSkillCategory,
    updateSkillCategory,
    removeSkillCategory,
    reorderSkillCategories,
    updateSkillsText,
    addProject,
    updateProject,
    removeProject,
    reorderProjects,
    addProjectBullet,
    updateProjectBullet,
    removeProjectBullet,
    reorderProjectBullets,
    addAward,
    updateAward,
    removeAward,
    reorderAwards,
    addAdditionalSection,
    removeAdditionalSection,
    updateAdditionalSectionTitle,
    addAdditionalEntry,
    removeAdditionalEntry,
    updateAdditionalEntry,
    addAdditionalEntryBullet,
    removeAdditionalEntryBullet,
    updateAdditionalEntryBullet,
    reorderAdditionalEntryBullets,
    generateCV,
    exportFormData,
    replaceFormData,
  ]);
}
