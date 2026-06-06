import { createContext, useContext, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useTemplates, useCompiler, useChat } from '../hooks';
import { useImport } from '../hooks/useImport';
import { api } from '../services/api';
import { useJobContext } from './JobContext';
import { useCVContext } from './CVContext';
import type { SaveVersionData } from '../features/dashboard';
import type { CVVersion, CVVersionMeta } from '../types';

interface ToolsContextValue {
  templates: ReturnType<typeof useTemplates>;
  compiler: ReturnType<typeof useCompiler>;
  chat: ReturnType<typeof useChat>;
  cvImport: ReturnType<typeof useImport>;
  handleVersionLoad: (version: CVVersion) => void;
  handleSaveVersion: (data: SaveVersionData) => Promise<CVVersion | null>;
  handleSwitchVersion: (id: string) => Promise<void>;
}

const ToolsContext = createContext<ToolsContextValue | null>(null);

export function useToolsContext() {
  const context = useContext(ToolsContext);
  if (!context) {
    throw new Error('useToolsContext must be used within ToolsProvider');
  }
  return context;
}

export function ToolsProvider({ children }: { children: ReactNode }) {
  const {
    companyName, setCompanyName,
    roleName, setRoleName,
    jobDescription, setJobDescription,
  } = useJobContext();

  const {
    userProfile,
    formData, setFormData,
    setActiveVersion,
    setSavedVersions,
    setIsSavingVersion,
  } = useCVContext();

  const templates = useTemplates();
  const cvImport = useImport();
  const compiler = useCompiler();

  const chatOptions = useMemo(() => ({
    onContentChanged: (newContent: string) => {
      templates.updateContent(newContent);
      compiler.clearPdf();
    },
  }), [templates.updateContent, compiler.clearPdf]);

  const chat = useChat(
    templates.content,
    jobDescription,
    companyName,
    userProfile,
    chatOptions
  );

  const handleVersionLoad = useCallback((version: CVVersion) => {
    templates.updateContent(version.texContent);
    templates.setTemplateId(version.templateId);
    if (version.formData) setFormData(version.formData);
    if (version.jobDescription) setJobDescription(version.jobDescription);
    if (version.companyName) setCompanyName(version.companyName);
    if (version.role) setRoleName(version.role);
    setActiveVersion(version);
  }, [templates.updateContent, templates.setTemplateId, setFormData, setJobDescription, setCompanyName, setRoleName, setActiveVersion]);

  const handleSaveVersion = useCallback(async (data: SaveVersionData): Promise<CVVersion | null> => {
    setIsSavingVersion(true);
    const saved = await api.saveVersion({
      name: data.name,
      templateId: templates.selectedId || 'med-length-proff-cv',
      texContent: templates.content,
      formData: formData || undefined,
      jobDescription: data.isBaseCV ? undefined : (jobDescription || undefined),
      companyName: data.companyName || undefined,
      role: data.role || undefined,
      matchScore: data.isBaseCV ? undefined : chat.matchAnalysis?.match_score,
      parentVersionId: data.parentVersionId,
    });
    if (saved) {
      setActiveVersion(saved);
      const meta: CVVersionMeta = {
        id: saved.id,
        name: saved.name,
        templateId: saved.templateId,
        jobDescription: saved.jobDescription,
        companyName: saved.companyName,
        role: saved.role,
        matchScore: saved.matchScore,
        parentVersionId: saved.parentVersionId,
        createdAt: saved.createdAt,
      };
      setSavedVersions(prev => [meta, ...prev]);
    }
    setIsSavingVersion(false);
    return saved;
  }, [templates.selectedId, templates.content, formData, jobDescription, chat.matchAnalysis, setActiveVersion, setSavedVersions, setIsSavingVersion]);

  const handleSwitchVersion = useCallback(async (id: string) => {
    const version = await api.getVersion(id);
    if (version) handleVersionLoad(version);
  }, [handleVersionLoad]);

  const value = useMemo(() => ({
    templates,
    compiler,
    chat,
    cvImport,
    handleVersionLoad,
    handleSaveVersion,
    handleSwitchVersion,
  }), [
    templates,
    compiler,
    chat,
    cvImport,
    handleVersionLoad,
    handleSaveVersion,
    handleSwitchVersion,
  ]);

  return <ToolsContext.Provider value={value}>{children}</ToolsContext.Provider>;
}
