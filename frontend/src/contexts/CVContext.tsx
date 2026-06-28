import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { api } from '../services/api';
import { persistActiveVersionId } from '../utils/activeVersionStorage';
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
  const [activeVersion, setActiveVersionState] = useState<CVVersion | null>(null);
  const [formData, setFormData] = useState<CVFormData | null>(null);
  const [savedVersions, setSavedVersions] = useState<CVVersionMeta[]>([]);
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [selectedTemplateForBuild, setSelectedTemplateForBuild] = useState<string | null>(null);

  // Wrap the raw setter so every caller also persists the active version id
  // for refresh-restore (see ACTIVE_VERSION_STORAGE_KEY note above).
  const setActiveVersion = useCallback((version: CVVersion | null) => {
    setActiveVersionState(version);
    persistActiveVersionId(version?.id ?? null);
  }, []);

  // Security: this provider also mounts on the public landing page (signed
  // out), so loading is gated on a real session and `loadedSubRef` pins state
  // to one Cognito sub — a different user on the same browser must not inherit
  // the previous user's CVs.
  const { authStatus } = useAuthenticator((ctx) => [ctx.authStatus]);
  const loadedSubRef = useRef<string | null>(null);

  const resetUserState = useCallback(() => {
    setUserProfile(null);
    setSavedVersions([]);
    setActiveVersionState(null);
    setFormData(null);
    persistActiveVersionId(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (authStatus !== 'authenticated') {
      loadedSubRef.current = null;
      resetUserState();
      return;
    }

    (async () => {
      let sub: string | null = null;
      try {
        const session = await fetchAuthSession();
        sub = (session?.tokens?.idToken?.payload?.sub as string | undefined) ?? null;
      } catch {
        sub = null;
      }
      if (cancelled) return;

      if (loadedSubRef.current !== null && loadedSubRef.current !== sub) {
        resetUserState();
      }
      loadedSubRef.current = sub;

      try {
        const [profile, { versions, ungrouped }] = await Promise.all([
          api.loadUserData(),
          api.listVersions(),
        ]);
        if (cancelled) return;
        if (profile) setUserProfile(profile);
        setSavedVersions([
          ...versions,
          ...versions.flatMap((v) => v.children || []),
          ...ungrouped,
        ]);
      } catch {
        // api.ts swallows expected failures; a 401 is handled by the axios
        // interceptor (signOut -> authStatus flips -> this effect resets).
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authStatus, resetUserState]);

  const resetForNewBuild = useCallback(() => {
    setFormData(null);
    setActiveVersion(null);
    setSelectedTemplateForBuild(null);
  }, [setActiveVersion]);

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
    setActiveVersion,
    formData,
    savedVersions,
    isSavingVersion,
    selectedTemplateForBuild,
    resetForNewBuild,
  ]);

  return <CVContext.Provider value={value}>{children}</CVContext.Provider>;
}
