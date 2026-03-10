import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../services/api';
import type {
  CVFormData,
  PersonalInfo,
  WorkEntry,
  EducationEntry,
  SkillCategory,
  Project,
  Award,
} from '../types';

export type FormSection = 'personal' | 'work' | 'education' | 'skills' | 'projects' | 'awards';

export const DEFAULT_SECTION_ORDER: FormSection[] = [
  'work', 'education', 'skills', 'projects', 'awards',
];

export const DEFAULT_PERSONAL_ORDER = ['phone', 'email', 'location', 'links'];

function emptyPersonalInfo(): PersonalInfo {
  return {
    fullName: '', email: '', phone: '', location: '', links: [],
    summary: '', personalOrder: [...DEFAULT_PERSONAL_ORDER],
  };
}

function emptyWorkEntry(): WorkEntry {
  return { company: '', title: '', startDate: '', endDate: '', location: '', bullets: [''] };
}

function emptyEducationEntry(): EducationEntry {
  return { school: '', degree: '', startDate: '', endDate: '', location: '', gpa: '', details: [] };
}

function emptySkillCategory(): SkillCategory {
  return { category: '', skills: [] };
}

function emptyProject(): Project {
  return { name: '', year: '', description: '', technologies: '' };
}

function emptyAward(): Award {
  return { year: '', title: '', description: '' };
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
  };
}

export function useFormBuilder(templateId: string, importedData?: CVFormData) {
  const [formData, setFormData] = useState<CVFormData>(() =>
    importedData
      ? { ...importedData, templateId }
      : initialFormData(templateId)
  );
  const [activeSection, setActiveSection] = useState<FormSection>('personal');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

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
      personalInfo: { ...prev.personalInfo, links: [...prev.personalInfo.links, { label: '', url: '' }] },
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
        i === workIndex ? { ...e, bullets: [...e.bullets, ''] } : e
      ),
    }));
  }, []);

  const updateBullet = useCallback((workIndex: number, bulletIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      workExperience: prev.workExperience.map((e, i) =>
        i === workIndex
          ? { ...e, bullets: e.bullets.map((b, bi) => bi === bulletIndex ? value : b) }
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
        i === eduIndex ? { ...e, details: [...e.details, ''] } : e
      ),
    }));
  }, []);

  const updateEduDetail = useCallback((eduIndex: number, detailIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.map((e, i) =>
        i === eduIndex
          ? { ...e, details: e.details.map((d, di) => di === detailIndex ? value : d) }
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
    const skills = value.split(',').map(s => s.trim()).filter(Boolean);
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.map((s, i) => i === index ? { ...s, skills } : s),
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

  const importFormData = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        const required = ['templateId', 'personalInfo', 'workExperience', 'education', 'skills'];
        if (!required.every(k => k in parsed)) {
          setGenerateError('Invalid CV data file: missing required fields.');
          return;
        }
        setFormData({ ...parsed, templateId: formData.templateId });
        lastGeneratedRef.current = null;
        setIsDirty(false);
      } catch {
        setGenerateError('Failed to parse CV data file. Ensure it is valid JSON.');
      }
    };
    reader.readAsText(file);
  }, [formData.templateId]);

  // Full ordered section list for the nav (personal is always first, not reorderable)
  const navSectionOrder: FormSection[] = [
    'personal',
    ...((formData.sectionOrder as FormSection[]) ?? DEFAULT_SECTION_ORDER),
  ];

  return {
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
    // Education
    addEducationEntry,
    updateEducationEntry,
    removeEducationEntry,
    reorderEducationEntries,
    addEduDetail,
    updateEduDetail,
    removeEduDetail,
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
    // Awards
    addAward,
    updateAward,
    removeAward,
    reorderAwards,
    // Actions
    generateCV,
    exportFormData,
    importFormData,
  };
}
