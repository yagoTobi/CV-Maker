import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../../../services/api';
import { applyTailorChanges, dedupeChangesByField } from '../../../utils/formDataPatch';
import type { CVFormData, TailorResponse, TailorChange } from '../../../types';

/** Label for the alternative created when the user edits a Suggestion's text (CONTEXT.md: edit = user-authored Alternative). */
export const USER_EDIT_LABEL = 'Your edit';

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

  fetchSuggestions: (
    formData: CVFormData,
    jobDesc: string,
    company: string,
    role: string,
    userClarifications?: string[],
  ) => Promise<void>;
  acceptChange: (changeId: string) => Promise<void>;
  acceptChanges: (changeIds: string[]) => Promise<void>;
  skipChange: (changeId: string) => void;
  undoChange: (changeId: string) => Promise<void>;
  acceptAllRemaining: () => Promise<void>;
  selectAlternative: (changeId: string, index: number) => void;
  editChangeValue: (changeId: string, newValue: string | string[]) => void;
  restoreSuggestions: (
    formData: CVFormData,
    response: TailorResponse,
    appliedChangeIds?: string[],
    skippedChangeIds?: string[],
    selectedAlternatives?: [string, number][],
  ) => void;
  reset: () => void;
  setBaselineScore: (score: number) => void;
}

interface UseTailorOpts {
  originalFormData: CVFormData | null;
  templateId: string | null;
  onApply: (newFormData: CVFormData, newTexContent: string) => Promise<void>;
}

export function useTailor({ onApply }: UseTailorOpts): UseTailorReturn {
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

  // Ref to read the latest tailorResponse synchronously inside stable callbacks (editChangeValue).
  const tailorResponseRef = useRef<TailorResponse | null>(tailorResponse);
  tailorResponseRef.current = tailorResponse;

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
    formData: CVFormData,
    jobDesc: string,
    company: string,
    role: string,
    userClarifications?: string[],
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
      // Phase 13 D-07: forward optional userClarifications to api.suggestTailorChanges.
      // Pass through as-is (undefined when absent) so axios omits the wire field.
      const result = await api.suggestTailorChanges(
        formData,
        jobDesc,
        company,
        role,
        userClarifications,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      if (result) {
        // Enforce one-Suggestion-per-field at the single point changes enter the UI.
        setTailorResponse({ ...result, changes: dedupeChangesByField(result.changes) });
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

  const acceptChanges = useCallback(async (changeIds: string[]) => {
    queueRef.current = queueRef.current.then(async () => {
      setIsApplying(true);
      const newApplied = new Set(appliedChanges);
      for (const changeId of changeIds) {
        if (!skippedChanges.has(changeId)) {
          newApplied.add(changeId);
        }
      }
      setAppliedChanges(newApplied);
      await applyCurrentState(newApplied);
      setIsApplying(false);
    });
    await queueRef.current;
  }, [appliedChanges, applyCurrentState, skippedChanges]);

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

  // CONTEXT.md: editing a Suggestion adds a user-authored Alternative (labelled USER_EDIT_LABEL)
  // and selects it -- it never mutates the AI's alternatives. Re-editing updates the same one.
  const editChangeValue = useCallback((changeId: string, newValue: string | string[]) => {
    const current = tailorResponseRef.current;
    if (!current) return;
    const change = current.changes.find(c => c.id === changeId);
    if (!change) return;
    const existingIdx = change.alternatives.findIndex(a => a.label === USER_EDIT_LABEL);
    const editIndex = existingIdx >= 0 ? existingIdx : change.alternatives.length;

    setTailorResponse(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        changes: prev.changes.map(c => {
          if (c.id !== changeId) return c;
          const newAlts = [...c.alternatives];
          newAlts[editIndex] = { label: USER_EDIT_LABEL, value: newValue };
          return { ...c, alternatives: newAlts };
        }),
      };
    });

    // Select the user's edit so it's the value applied on accept.
    setSelectedAlternatives(prev => {
      const next = new Map(prev);
      next.set(changeId, editIndex);
      return next;
    });
  }, []);

  const restoreSuggestions = useCallback((
    formData: CVFormData,
    response: TailorResponse,
    appliedChangeIds: string[] = [],
    skippedChangeIds: string[] = [],
    selectedAlternativeEntries: [string, number][] = [],
  ) => {
    abortRef.current?.abort();
    baseFormDataRef.current = structuredClone(formData);
    setTailorResponse({ ...response, changes: dedupeChangesByField(response.changes) });
    setAppliedChanges(new Set(appliedChangeIds));
    setSkippedChanges(new Set(skippedChangeIds));
    setSelectedAlternatives(new Map(selectedAlternativeEntries));
    setIsLoading(false);
    setError(null);
    setIsApplying(false);
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
    acceptChanges,
    skipChange,
    undoChange,
    acceptAllRemaining,
    selectAlternative,
    editChangeValue,
    restoreSuggestions,
    reset,
    setBaselineScore,
  };
}
