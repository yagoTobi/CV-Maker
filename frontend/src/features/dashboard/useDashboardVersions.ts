import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { useCVContext } from '../../contexts/CVContext';
import { useToast } from '../../contexts/ToastContext';
import type { CVVersionMeta, CVVersionWithChildren } from '../../types';

export interface SaveVersionData {
  name: string;
  isBaseCV: boolean;
  parentVersionId?: string | null;
  role?: string;
  companyName?: string;
}

interface DashboardVersionsState {
  baseCvs: CVVersionWithChildren[];
  ungrouped: CVVersionMeta[];
  isLoading: boolean;
  expandedGroups: Set<string>;
}

export interface DashboardVersionsAPI {
  baseCvs: CVVersionWithChildren[];
  ungrouped: CVVersionMeta[];
  isLoading: boolean;
  expandedGroups: Set<string>;
  toggleGroup: (id: string) => void;
  /** Delete a version by id. Refetches and syncs state. */
  remove: (id: string) => Promise<void>;
  /** Rename a version to newName. Refetches and syncs state. */
  rename: (id: string, newName: string) => Promise<void>;
  /** Duplicate a version. Returns the new version id (for auto-focus rename). */
  duplicate: (id: string) => Promise<string | null>;
  /** Move/re-parent a version. Pass null to ungroup. */
  reparent: (id: string, newParentId: string | null) => Promise<void>;
  /** Loading states per version id */
  deletingId: string | null;
  duplicatingId: string | null;
}

/** Normalised re-fetch helper — always returns the latest hierarchical state from the API. */
async function fetchVersions(): Promise<{ versions: CVVersionWithChildren[]; ungrouped: CVVersionMeta[] }> {
  return api.listVersions();
}

export function useDashboardVersions(): DashboardVersionsAPI {
  const { setSavedVersions } = useCVContext();
  const toast = useToast();

  const [state, setState] = useState<DashboardVersionsState>({
    baseCvs: [],
    ungrouped: [],
    isLoading: true,
    expandedGroups: new Set(),
  });

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  /** Apply a fresh API response into local + global state. */
  const applyFetch = useCallback(
    (versions: CVVersionWithChildren[], ungrouped: CVVersionMeta[]) => {
      setState(prev => ({
        ...prev,
        baseCvs: versions,
        ungrouped,
        isLoading: false,
        expandedGroups: (() => {
          const next = new Set(prev.expandedGroups);
          versions.forEach(v => next.add(v.id));
          return next;
        })(),
      }));
      // Sync flat list back to global CV context (for consumers like the version switcher)
      const all: CVVersionMeta[] = [
        ...versions,
        ...versions.flatMap(v => v.children || []),
        ...ungrouped,
      ];
      setSavedVersions(all);
    },
    [setSavedVersions],
  );

  // Initial load
  useEffect(() => {
    fetchVersions().then(({ versions, ungrouped }) => applyFetch(versions, ungrouped));
  }, [applyFetch]);

  const toggleGroup = useCallback((id: string) => {
    setState(prev => {
      const next = new Set(prev.expandedGroups);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, expandedGroups: next };
    });
  }, []);

  const remove = useCallback(async (id: string) => {
    setDeletingId(id);
    const ok = await api.deleteVersion(id);
    if (ok) {
      const { versions, ungrouped } = await fetchVersions();
      applyFetch(versions, ungrouped);
      // Remove the deleted id from expanded set
      setState(prev => {
        const next = new Set(prev.expandedGroups);
        next.delete(id);
        return { ...prev, expandedGroups: next };
      });
    }
    setDeletingId(null);
  }, [applyFetch]);

  const rename = useCallback(async (id: string, newName: string) => {
    const version = await api.getVersion(id);
    if (!version || !version.formData) {
      toast.error("Couldn't load that CV. Check your connection and try again.");
      return;
    }
    const saved = await api.saveVersion({
      name: newName.trim() || version.name,
      templateId: version.templateId,
      texContent: version.texContent,
      formData: version.formData || undefined,
      jobDescription: version.jobDescription || undefined,
      companyName: version.companyName || undefined,
      role: version.role || undefined,
      matchScore: version.matchScore ?? undefined,
      baselineMatchScore: version.baselineMatchScore ?? undefined,
      parentVersionId: version.parentVersionId,
    });
    if (saved) {
      await api.deleteVersion(id);
      const { versions, ungrouped } = await fetchVersions();
      applyFetch(versions, ungrouped);
    }
  }, [applyFetch, toast]);

  const duplicate = useCallback(async (id: string): Promise<string | null> => {
    setDuplicatingId(id);
    const version = await api.getVersion(id);
    let newId: string | null = null;
    if (!version || !version.formData) {
      toast.error("Couldn't load that CV. Check your connection and try again.");
    } else {
      const saved = await api.saveVersion({
        name: `${version.name} (copy)`,
        templateId: version.templateId,
        texContent: version.texContent,
        formData: version.formData,
      });
      if (saved) {
        newId = saved.id;
        const { versions, ungrouped } = await fetchVersions();
        applyFetch(versions, ungrouped);
      }
    }
    setDuplicatingId(null);
    return newId;
  }, [applyFetch, toast]);

  const reparent = useCallback(async (id: string, newParentId: string | null) => {
    const ok = await api.updateVersion(id, { parentVersionId: newParentId });
    if (ok) {
      const { versions, ungrouped } = await fetchVersions();
      applyFetch(versions, ungrouped);
    }
  }, [applyFetch]);

  return {
    baseCvs: state.baseCvs,
    ungrouped: state.ungrouped,
    isLoading: state.isLoading,
    expandedGroups: state.expandedGroups,
    toggleGroup,
    remove,
    rename,
    duplicate,
    reparent,
    deletingId,
    duplicatingId,
  };
}
