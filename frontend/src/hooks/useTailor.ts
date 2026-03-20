import { useState, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { applyTailorChanges } from '../utils/formDataPatch';
import type { CVFormData, TailorResponse, TailorChange } from '../types';

export interface UseTailorReturn {
  tailorResponse: TailorResponse | null;
  isLoading: boolean;
  error: string | null;
  appliedChanges: Set<string>;
  skippedChanges: Set<string>;
  pendingChanges: TailorChange[];
  estimatedCurrentScore: number;
  isApplying: boolean;

  fetchSuggestions: (formData: CVFormData, jobDesc: string, company: string, role: string) => Promise<void>;
  acceptChange: (changeId: string) => Promise<void>;
  skipChange: (changeId: string) => void;
  undoChange: (changeId: string) => Promise<void>;
  acceptAllRemaining: () => Promise<void>;
  editChangeValue: (changeId: string, newValue: string | string[]) => void;
  reset: () => void;
}

interface UseTailorOpts {
  originalFormData: CVFormData | null;
  templateId: string | null;
  onApply: (newFormData: CVFormData, newTexContent: string) => Promise<void>;
}

export function useTailor({ originalFormData, templateId, onApply }: UseTailorOpts): UseTailorReturn {
  const [tailorResponse, setTailorResponse] = useState<TailorResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedChanges, setAppliedChanges] = useState<Set<string>>(new Set());
  const [skippedChanges, setSkippedChanges] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState(false);

  // Snapshot of formData before any tailor changes
  const baseFormDataRef = useRef<CVFormData | null>(null);
  // Baseline score from the tailor response
  const baselineScoreRef = useRef(0);
  // Serialize accepts to prevent race conditions
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  const pendingChanges = tailorResponse
    ? tailorResponse.changes.filter(c => !appliedChanges.has(c.id) && !skippedChanges.has(c.id))
    : [];

  const totalCount = tailorResponse?.changes.length ?? 0;
  const appliedCount = appliedChanges.size;
  const estimatedScore = tailorResponse?.estimatedScore ?? 0;
  const estimatedCurrentScore = totalCount > 0
    ? baselineScoreRef.current + (estimatedScore - baselineScoreRef.current) * (appliedCount / totalCount)
    : 0;

  const applyCurrentState = useCallback(async (
    newApplied: Set<string>,
  ) => {
    const base = baseFormDataRef.current;
    const changes = tailorResponse?.changes;
    if (!base || !changes) return;

    const newFormData = applyTailorChanges(base, changes, newApplied);
    const { texContent } = await api.generateLatex(newFormData);
    if (!texContent) return;
    await onApply(newFormData, texContent);
  }, [tailorResponse, onApply]);

  const fetchSuggestions = useCallback(async (
    formData: CVFormData, jobDesc: string, company: string, role: string
  ) => {
    setIsLoading(true);
    setError(null);
    setAppliedChanges(new Set());
    setSkippedChanges(new Set());
    baseFormDataRef.current = structuredClone(formData);

    try {
      const result = await api.suggestTailorChanges(formData, jobDesc, company, role);
      if (result) {
        setTailorResponse(result);
      } else {
        setError('Failed to get tailor suggestions. Please try again.');
      }
    } catch {
      setError('Failed to get tailor suggestions. Please try again.');
    }
    setIsLoading(false);
  }, []);

  const acceptChange = useCallback(async (changeId: string) => {
    queueRef.current = queueRef.current.then(async () => {
      setIsApplying(true);
      const newApplied = new Set(appliedChanges);
      newApplied.add(changeId);
      setAppliedChanges(newApplied);
      await applyCurrentState(newApplied);
      setIsApplying(false);
    });
    await queueRef.current;
  }, [appliedChanges, applyCurrentState]);

  const skipChange = useCallback((changeId: string) => {
    setSkippedChanges(prev => {
      const next = new Set(prev);
      next.add(changeId);
      return next;
    });
  }, []);

  const undoChange = useCallback(async (changeId: string) => {
    queueRef.current = queueRef.current.then(async () => {
      setIsApplying(true);
      const newApplied = new Set(appliedChanges);
      newApplied.delete(changeId);
      setAppliedChanges(newApplied);

      // Also remove from skipped if it was skipped
      setSkippedChanges(prev => {
        const next = new Set(prev);
        next.delete(changeId);
        return next;
      });

      await applyCurrentState(newApplied);
      setIsApplying(false);
    });
    await queueRef.current;
  }, [appliedChanges, applyCurrentState]);

  const acceptAllRemaining = useCallback(async () => {
    if (!tailorResponse) return;
    queueRef.current = queueRef.current.then(async () => {
      setIsApplying(true);
      const newApplied = new Set(appliedChanges);
      for (const c of tailorResponse.changes) {
        if (!skippedChanges.has(c.id)) {
          newApplied.add(c.id);
        }
      }
      setAppliedChanges(newApplied);
      await applyCurrentState(newApplied);
      setIsApplying(false);
    });
    await queueRef.current;
  }, [tailorResponse, appliedChanges, skippedChanges, applyCurrentState]);

  const editChangeValue = useCallback((changeId: string, newValue: string | string[]) => {
    setTailorResponse(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        changes: prev.changes.map(c =>
          c.id === changeId ? { ...c, newValue } : c
        ),
      };
    });
  }, []);

  const reset = useCallback(() => {
    setTailorResponse(null);
    setIsLoading(false);
    setError(null);
    setAppliedChanges(new Set());
    setSkippedChanges(new Set());
    setIsApplying(false);
    baseFormDataRef.current = null;
    baselineScoreRef.current = 0;
    queueRef.current = Promise.resolve();
  }, []);

  // Set baseline score when match analysis happens (called externally)
  // We expose it via the ref — caller sets baselineScoreRef.current
  // Actually, let's derive it: baseline = estimatedScore minus improvement
  // Simpler: the caller can pass it. For now, use 0 as default and
  // the MatchSummaryBar shows the real baseline from match analysis.

  return {
    tailorResponse,
    isLoading,
    error,
    appliedChanges,
    skippedChanges,
    pendingChanges,
    estimatedCurrentScore,
    isApplying,
    fetchSuggestions,
    acceptChange,
    skipChange,
    undoChange,
    acceptAllRemaining,
    editChangeValue,
    reset,
  };
}
