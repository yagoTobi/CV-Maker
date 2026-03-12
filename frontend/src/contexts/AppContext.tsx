import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useTemplates, useCompiler, useChat } from '../hooks';
import { useImport } from '../hooks/useImport';
import { api } from '../services/api';
import type { SaveVersionData } from '../features/dashboard/VersionSwitcher';
import type { UserProfile, CVFormData, CVVersion, CVVersionMeta } from '../types';

interface AppContextValue {
  // UI tabs
  activeTab: 'latex' | 'pdf';
  setActiveTab: (tab: 'latex' | 'pdf') => void;
  aiTab: 'chat' | 'match';
  setAiTab: (tab: 'chat' | 'match') => void;

  // Job input state
  companyName: string;
  setCompanyName: (name: string) => void;
  jobDescription: string;
  setJobDescription: (desc: string) => void;

  // User profile
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;

  // Version state
  activeVersion: CVVersion | null;
  setActiveVersion: (version: CVVersion | null) => void;
  formData: CVFormData | null;
  setFormData: (data: CVFormData | null) => void;
  savedVersions: CVVersionMeta[];
  setSavedVersions: (versions: CVVersionMeta[]) => void;
  isSavingVersion: boolean;

  // Template selection for build flow
  selectedTemplateForBuild: string | null;
  setSelectedTemplateForBuild: (templateId: string | null) => void;

  // Hooks
  templates: ReturnType<typeof useTemplates>;
  cvImport: ReturnType<typeof useImport>;
  compiler: ReturnType<typeof useCompiler>;
  chat: ReturnType<typeof useChat>;

  // Version handlers
  handleVersionLoad: (version: CVVersion) => void;
  handleSaveVersion: (data: SaveVersionData) => Promise<void>;
  handleSwitchVersion: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  // UI tabs
  const [activeTab, setActiveTab] = useState<'latex' | 'pdf'>('latex');
  const [aiTab, setAiTab] = useState<'chat' | 'match'>('match');

  // Job input state
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  // User profile
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Version state
  const [activeVersion, setActiveVersion] = useState<CVVersion | null>(null);
  const [formData, setFormData] = useState<CVFormData | null>(null);
  const [savedVersions, setSavedVersions] = useState<CVVersionMeta[]>([]);
  const [isSavingVersion, setIsSavingVersion] = useState(false);

  // Track which template was selected in template-select step (for build flow)
  const [selectedTemplateForBuild, setSelectedTemplateForBuild] = useState<string | null>(null);

  // Hooks
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

  // Load user profile and saved versions on mount
  useEffect(() => {
    let mounted = true;

    Promise.all([
      api.loadUserData(),
      api.listVersions(),
    ]).then(([profile, { versions, ungrouped }]) => {
      if (!mounted) return;
      if (profile) setUserProfile(profile);
      // Flatten for now - will properly handle hierarchy in Phase 2
      const allVersions = [
        ...versions,
        ...versions.flatMap(v => v.children || []),
        ...ungrouped
      ];
      setSavedVersions(allVersions);
    });

    return () => { mounted = false; };
  }, []);

  // Version loaded from dashboard or switcher
  const handleVersionLoad = useCallback((version: CVVersion) => {
    templates.updateContent(version.texContent);
    templates.setTemplateId(version.templateId);
    if (version.formData) setFormData(version.formData);
    if (version.jobDescription) setJobDescription(version.jobDescription);
    if (version.companyName) setCompanyName(version.companyName);
    setActiveVersion(version);
  }, [templates.updateContent, templates.setTemplateId]);

  const handleSaveVersion = useCallback(async (data: SaveVersionData) => {
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
  }, [templates.selectedId, templates.content, formData, jobDescription, chat.matchAnalysis]);

  const handleSwitchVersion = useCallback(async (id: string) => {
    const version = await api.getVersion(id);
    if (version) handleVersionLoad(version);
  }, [handleVersionLoad]);

  const value = useMemo(() => ({
    activeTab,
    setActiveTab,
    aiTab,
    setAiTab,
    companyName,
    setCompanyName,
    jobDescription,
    setJobDescription,
    userProfile,
    setUserProfile,
    activeVersion,
    setActiveVersion,
    formData,
    setFormData,
    savedVersions,
    setSavedVersions,
    isSavingVersion,
    selectedTemplateForBuild,
    setSelectedTemplateForBuild,
    templates,
    cvImport,
    compiler,
    chat,
    handleVersionLoad,
    handleSaveVersion,
    handleSwitchVersion,
  }), [
    activeTab,
    aiTab,
    companyName,
    jobDescription,
    userProfile,
    activeVersion,
    formData,
    savedVersions,
    isSavingVersion,
    selectedTemplateForBuild,
    templates,
    cvImport,
    compiler,
    chat,
    handleVersionLoad,
    handleSaveVersion,
    handleSwitchVersion,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
