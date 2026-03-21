import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { JobProvider, useJobContext } from './JobContext';
import { CVProvider, useCVContext } from './CVContext';
import { ToolsProvider, useToolsContext } from './ToolsContext';
import { useTemplates, useCompiler, useChat } from '../hooks';
import { useImport } from '../hooks/useImport';
import type { SaveVersionData } from '../features/dashboard/VersionSwitcher';
import type { UserProfile, CVFormData, CVVersion, CVVersionMeta } from '../types';

// Full interface kept for backwards compatibility
interface AppContextValue {
  // Job input state
  companyName: string;
  setCompanyName: (name: string) => void;
  roleName: string;
  setRoleName: (name: string) => void;
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
  handleSaveVersion: (data: SaveVersionData) => Promise<CVVersion | null>;
  handleSwitchVersion: (id: string) => Promise<void>;
}

/**
 * Compatibility shim — merges all three domain contexts into the original flat shape.
 * Existing consumers can continue using useAppContext() unchanged.
 * New consumers should prefer useJobContext(), useCVContext(), or useToolsContext() directly.
 */
export function useAppContext(): AppContextValue {
  const job = useJobContext();
  const cv = useCVContext();
  const tools = useToolsContext();
  return useMemo(() => ({
    ...job,
    ...cv,
    ...tools,
  }), [job, cv, tools]);
}

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <JobProvider>
      <CVProvider>
        <ToolsProvider>
          {children}
        </ToolsProvider>
      </CVProvider>
    </JobProvider>
  );
}
