import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api } from '../services/api';
import type { UserProfile, CVFormData, CVVersion, CVVersionMeta } from '../types';

interface CVContextValue {
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
  activeVersion: CVVersion | null;
  setActiveVersion: (version: CVVersion | null) => void;
  formData: CVFormData | null;
  setFormData: (data: CVFormData | null) => void;
  savedVersions: CVVersionMeta[];
  setSavedVersions: (versions: CVVersionMeta[]) => void;
  isSavingVersion: boolean;
  setIsSavingVersion: (saving: boolean) => void;
  selectedTemplateForBuild: string | null;
  setSelectedTemplateForBuild: (templateId: string | null) => void;
  /** Atomically clear formData, activeVersion, and selectedTemplateForBuild for a fresh build. */
  resetForNewBuild: () => void;
}

const CVContext = createContext<CVContextValue | null>(null);

export function useCVContext() {
  const context = useContext(CVContext);
  if (!context) {
    throw new Error('useCVContext must be used within CVProvider');
  }
  return context;
}

export function CVProvider({ children }: { children: ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeVersion, setActiveVersion] = useState<CVVersion | null>(null);
  const [formData, setFormData] = useState<CVFormData | null>(null);
  const [savedVersions, setSavedVersions] = useState<CVVersionMeta[]>([]);
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [selectedTemplateForBuild, setSelectedTemplateForBuild] = useState<string | null>(null);

  // Load user profile and saved versions on mount
  useEffect(() => {
    let mounted = true;

    Promise.all([
      api.loadUserData(),
      api.listVersions(),
    ]).then(([profile, { versions, ungrouped }]) => {
      if (!mounted) return;
      if (profile) setUserProfile(profile);
      const allVersions = [
        ...versions,
        ...versions.flatMap(v => v.children || []),
        ...ungrouped
      ];
      setSavedVersions(allVersions);
    });

    return () => { mounted = false; };
  }, []);

  const resetForNewBuild = useCallback(() => {
    setFormData(null);
    setActiveVersion(null);
    setSelectedTemplateForBuild(null);
  }, []);

  const value = useMemo(() => ({
    userProfile,
    setUserProfile,
    activeVersion,
    setActiveVersion,
    formData,
    setFormData,
    savedVersions,
    setSavedVersions,
    isSavingVersion,
    setIsSavingVersion,
    selectedTemplateForBuild,
    setSelectedTemplateForBuild,
    resetForNewBuild,
  }), [
    userProfile,
    activeVersion,
    formData,
    savedVersions,
    isSavingVersion,
    selectedTemplateForBuild,
    resetForNewBuild,
  ]);

  return <CVContext.Provider value={value}>{children}</CVContext.Provider>;
}
