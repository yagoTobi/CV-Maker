import { useState, useCallback, useRef, useEffect } from 'react';
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
  selectedAlternatives: Map<string, number>;
  estimatedCurrentScore: number;
  isApplying: boolean;

  fetchSuggestions: (formData: CVFormData, jobDesc: string, company: string, role: string) => Promise<void>;
  acceptChange: (changeId: string) => Promise<void>;
  skipChange: (changeId: string) => void;
  undoChange: (changeId: string) => Promise<void>;
  acceptAllRemaining: () => Promise<void>;
  selectAlternative: (changeId: string, index: number) => void;
  editChangeValue: (changeId: string, newValue: string | string[]) => void;
  reset: () => void;
  setBaselineScore: (score: number) => void;
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
  const [selectedAlternatives, setSelectedAlternatives] = useState<Map<string, number>>(new Map());

  // Snapshot of formData before any tailor changes
  const baseFormDataRef = useRef<CVFormData | null>(null);
  // Baseline score from the tailor response
  const baselineScoreRef = useRef(0);

  const setBaselineScore = useCallback((score: number) => {
    baselineScoreRef.current = score;
  }, []);

  // Serialize accepts to prevent race conditions
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const abortRef = useRef<AbortController | null>(null);

  // Abort in-flight requests on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const pendingChanges = tailorResponse
    ? tailorResponse.changes.filter(c => !appliedChanges.has(c.id) && !skippedChanges.has(c.id))
    : [];

  const totalCount = tailorResponse?.changes.length ?? 0;
  const appliedCount = appliedChanges.size;
  const estimatedScore = tailorResponse?.estimatedScore ?? 0;
  const estimatedCurrentScore = totalCount > 0
    ? baselineScoreRef.current + (estimatedScore - baselineScoreRef.current) * (appliedCount / totalCount)
    : 0;

  // Ref to track selectedAlternatives in queued operations without stale closures
  const selectedAltsRef = useRef<Map<string, number>>(selectedAlternatives);
  selectedAltsRef.current = selectedAlternatives;

  const applyCurrentState = useCallback(async (
    newApplied: Set<string>,
  ) => {
    const base = baseFormDataRef.current;
    const changes = tailorResponse?.changes;
    if (!base || !changes) return;

    const newFormData = applyTailorChanges(base, changes, newApplied, selectedAltsRef.current);
    const { texContent } = await api.generateLatex(newFormData);
    if (!texContent) return;
    await onApply(newFormData, texContent);
  }, [tailorResponse, onApply]);

  const fetchSuggestions = useCallback(async (
    formData: CVFormData, jobDesc: string, company: string, role: string
  ) => {
    // Cancel previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setAppliedChanges(new Set());
    setSkippedChanges(new Set());
    setSelectedAlternatives(new Map());
    baseFormDataRef.current = structuredClone(formData);

    try {
      const result = await api.suggestTailorChanges(formData, jobDesc, company, role, controller.signal);
      if (controller.signal.aborted) return;
      if (result) {
        setTailorResponse(result);
      } else {
        setError('Failed to get tailor suggestions. Please try again.');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
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

  const selectAlternative = useCallback((changeId: string, index: number) => {
    setSelectedAlternatives(prev => {
      const next = new Map(prev);
      next.set(changeId, index);
      return next;
    });
  }, []);

  const editChangeValue = useCallback((changeId: string, newValue: string | string[]) => {
    setTailorResponse(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        changes: prev.changes.map(c => {
          if (c.id !== changeId) return c;
          // Replace the selected alternative's value (or add a custom one)
          const altIndex = selectedAltsRef.current.get(changeId) ?? 0;
          const newAlts = [...c.alternatives];
          if (newAlts[altIndex]) {
            newAlts[altIndex] = { ...newAlts[altIndex], value: newValue };
          } else {
            newAlts.push({ label: 'Custom', value: newValue });
          }
          return { ...c, alternatives: newAlts };
        }),
      };
    });
  }, []);

  const reset = useCallback(() => {
    setTailorResponse(null);
    setIsLoading(false);
    setError(null);
    setAppliedChanges(new Set());
    setSkippedChanges(new Set());
    setSelectedAlternatives(new Map());
    setIsApplying(false);
    baseFormDataRef.current = null;
    baselineScoreRef.current = 0;
    queueRef.current = Promise.resolve();
  }, []);

  return {
    tailorResponse,
    isLoading,
    error,
    appliedChanges,
    skippedChanges,
    pendingChanges,
    selectedAlternatives,
    estimatedCurrentScore,
    isApplying,
    fetchSuggestions,
    acceptChange,
    skipChange,
    undoChange,
    acceptAllRemaining,
    selectAlternative,
    editChangeValue,
    reset,
    setBaselineScore,
  };
}
