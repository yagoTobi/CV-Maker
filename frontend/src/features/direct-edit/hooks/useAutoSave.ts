/**
 * useAutoSave -- Debounced auto-save hook with dirty tracking, retry, and beforeunload guard.
 *
 * Returns AutoSaveState = { status, isDirty, retry }.
 *
 * Branching:
 * - versionId null  → first save: POST via api.saveVersion (name from onNeedName or fullName)
 * - versionId non-null → subsequent: PATCH via api.updateVersionFull
 *
 * Dirty rules (in effect order):
 *   a) PERSISTED HYDRATION (formData null→non-null, versionId already non-null): baseline, clean
 *   b) VERSION-ID CHANGE: re-baseline on switch; keep dirty on POST-race interleaved edit
 *   c/d) OTHERWISE: dirty when serialized !== lastSavedRef; schedule debounced save
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { api } from '../../../services/api';
import type { CVFormData, CVVersion } from '../../../types';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface AutoSaveState {
  status: SaveStatus;
  isDirty: boolean;
  retry: () => void;
}

const DEBOUNCE_MS = 2500;
const VALID_TEMPLATE_IDS = ['med-length-proff-cv', 'deedy-resume', 'mcdowell-cv'];

export function useAutoSave(
  formData: CVFormData | null,
  versionId: string | null,
  options?: {
    onNeedName?: () => Promise<string>;
    onFirstSave?: (version: CVVersion) => void;
  }
): AutoSaveState {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [isDirtyState, setIsDirtyState] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSavedRef = useRef<string>('');
  const isSavingRef = useRef(false);
  const isDirtyRef = useRef(false);
  const mountedRef = useRef(true);
  const versionIdRef = useRef(versionId);
  const formDataRef = useRef(formData);
  const optionsRef = useRef(options);
  // First-save name cache: set once, reused on retries
  const resolvedNameRef = useRef<string | null>(null);
  // Transition tracking for baseline rules
  const prevVersionIdRef = useRef(versionId);
  const prevFormDataNullRef = useRef(formData === null);
  const performSaveRef = useRef<() => Promise<void>>();

  // Keep refs current on every render (stale-closure prevention)
  versionIdRef.current = versionId;
  formDataRef.current = formData;
  optionsRef.current = options;

  // Helper: set dirty in both state and ref (ref is read by beforeunload handler synchronously)
  const setIsDirty = useCallback((val: boolean) => {
    isDirtyRef.current = val;
    setIsDirtyState(val);
  }, []);

  // Clear name cache when versionId transitions null→non-null (POST completed)
  if (versionId !== null && prevVersionIdRef.current === null && resolvedNameRef.current !== null) {
    resolvedNameRef.current = null;
  }
  if (formData === null) {
    resolvedNameRef.current = null;
  }

  // Mount / unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  // beforeunload guard: prompt while dirty or saving
  useEffect(() => {
    const handler = (e: Event) => {
      if (isDirtyRef.current || isSavingRef.current) {
        e.preventDefault();
        (e as BeforeUnloadEvent).returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Stable schedule-save helper
  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void performSaveRef.current?.();
    }, DEBOUNCE_MS);
  }, []);

  // performSave: assigned on every render (closes over latest scheduleSave)
  // SNAPSHOT RULE: capture formData/versionId/serialized at invocation start.
  // lastSavedRef is only updated to the snapshot's serialized value (never the current ref).
  // After success, compares current form to snapshot; reschedules if they diverged.
  performSaveRef.current = async () => {
    const snapFormData = formDataRef.current;
    const snapVersionId = versionIdRef.current;

    if (!snapFormData) return;
    if (!VALID_TEMPLATE_IDS.includes(snapFormData.templateId)) return;
    if (isSavingRef.current) return;

    const snapSerialized = JSON.stringify(snapFormData);
    isSavingRef.current = true;
    setStatus('saving');

    try {
      if (!snapVersionId) {
        // First save — use cached name if available (retry reuses it, no re-prompt)
        let name = resolvedNameRef.current;
        if (name === null) {
          name = optionsRef.current?.onNeedName
            ? await optionsRef.current.onNeedName()
            : (snapFormData.personalInfo.fullName || 'Untitled CV');
          resolvedNameRef.current = name;
        }
        if (!mountedRef.current) return;

        const result = await api.saveVersion({
          name: name || (snapFormData.personalInfo.fullName || 'Untitled CV'),
          templateId: snapFormData.templateId,
          texContent: '',
          formData: snapFormData,
        });

        if (!mountedRef.current) return;
        if (result) {
          lastSavedRef.current = snapSerialized;
          setStatus('saved');
          setIsDirty(false);
          optionsRef.current?.onFirstSave?.(result);
          if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
          fadeTimerRef.current = setTimeout(() => {
            if (mountedRef.current) setStatus('idle');
          }, 2000);
          // Post-save dirty check: if form changed while save was in flight, reschedule
          if (JSON.stringify(formDataRef.current) !== snapSerialized) {
            setIsDirty(true);
            scheduleSave();
          }
        } else {
          setStatus('error');
          setIsDirty(true);
        }
      } else {
        // Subsequent save: PATCH in-place
        const ok = await api.updateVersionFull(snapVersionId, {
          formData: snapFormData,
          texContent: '',
        });

        if (!mountedRef.current) return;
        if (ok) {
          lastSavedRef.current = snapSerialized;
          setStatus('saved');
          setIsDirty(false);
          if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
          fadeTimerRef.current = setTimeout(() => {
            if (mountedRef.current) setStatus('idle');
          }, 2000);
          // Post-save dirty check
          if (JSON.stringify(formDataRef.current) !== snapSerialized) {
            setIsDirty(true);
            scheduleSave();
          }
        } else {
          setStatus('error');
          setIsDirty(true);
        }
      }
    } catch {
      if (mountedRef.current) {
        setStatus('error');
        setIsDirty(true);
      }
    } finally {
      isSavingRef.current = false;
    }
  };

  // Immediate retry: bypass debounce
  const retry = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    void performSaveRef.current?.();
  }, []);

  // Main effect: dirty tracking and scheduling
  useEffect(() => {
    // Null formData — reset
    if (!formData) {
      setIsDirty(false);
      prevFormDataNullRef.current = true;
      prevVersionIdRef.current = versionId;
      return;
    }

    // Sentinel templateId (e.g. '_import') — skip
    if (!VALID_TEMPLATE_IDS.includes(formData.templateId)) {
      setIsDirty(false);
      prevFormDataNullRef.current = false;
      prevVersionIdRef.current = versionId;
      return;
    }

    const serialized = JSON.stringify(formData);

    // Rule (a): PERSISTED HYDRATION
    // formData just arrived from null AND versionId is already set
    if (prevFormDataNullRef.current && versionId !== null) {
      lastSavedRef.current = serialized;
      setIsDirty(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      prevFormDataNullRef.current = false;
      prevVersionIdRef.current = versionId;
      return;
    }

    // Rule (b): VERSION-ID CHANGE
    if (versionId !== prevVersionIdRef.current) {
      if (serialized === lastSavedRef.current) {
        // Content matches what was last saved — clean
        setIsDirty(false);
        if (timerRef.current) clearTimeout(timerRef.current);
      } else if (prevVersionIdRef.current === null && lastSavedRef.current !== '') {
        // POST race: edit arrived while first POST was in-flight; keep dirty, schedule PATCH
        setIsDirty(true);
        scheduleSave();
      } else {
        // id→id CV switch or late-arriving hydration: re-baseline
        lastSavedRef.current = serialized;
        setIsDirty(false);
        if (timerRef.current) clearTimeout(timerRef.current);
      }
      prevVersionIdRef.current = versionId;
      prevFormDataNullRef.current = false;
      return;
    }

    prevFormDataNullRef.current = false;

    // Rules (c)/(d): schedule if content changed since last save
    if (serialized !== lastSavedRef.current) {
      setIsDirty(true);
      scheduleSave();
    } else {
      setIsDirty(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  }, [formData, versionId, setIsDirty, scheduleSave]);

  return useMemo(() => ({ status, isDirty: isDirtyState, retry }), [status, isDirtyState, retry]);
}
