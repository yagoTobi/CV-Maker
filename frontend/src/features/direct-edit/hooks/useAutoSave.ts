/**
 * useAutoSave -- Debounced auto-save hook with status tracking and POST/PATCH branching.
 *
 * Watches CVFormData for changes and saves to the backend after 2.5 seconds
 * of inactivity (D-08). Tracks save status as idle/saving/saved/error (UX-01).
 *
 * Branching logic:
 * - versionId null → first save: collect name via onNeedName() (or fallback), POST via api.saveVersion
 * - versionId non-null → subsequent saves: PATCH in-place via api.updateVersionFull
 *
 * Uses versionIdRef to prevent stale-closure issues with versionId inside the setTimeout callback.
 * Uses optionsRef so callers can pass inline options objects without re-triggering the effect.
 *
 * Skips redundant saves when formData has not changed since last save (JSON comparison).
 * Skips saves when formData is null.
 * Prevents concurrent saves via isSavingRef guard.
 */
import { useState, useEffect, useRef } from 'react';
import { api } from '../../../services/api';
import type { CVFormData, CVVersion } from '../../../types';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 2500;

export function useAutoSave(
  formData: CVFormData | null,
  versionId: string | null,
  options?: {
    onNeedName?: () => Promise<string>;
    onFirstSave?: (version: CVVersion) => void;
  }
): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSavedRef = useRef<string>('');
  const isSavingRef = useRef(false);
  const mountedRef = useRef(true);
  const versionIdRef = useRef(versionId);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!formData) return;
    // Skip saves with invalid/sentinel templateIds (e.g. '_import')
    if (!['med-length-proff-cv', 'deedy-resume', 'mcdowell-cv'].includes(formData.templateId)) return;

    // Update versionIdRef so the timeout callback reads the latest value
    versionIdRef.current = versionId;

    const serialized = JSON.stringify(formData);
    if (serialized === lastSavedRef.current) return;
    if (isSavingRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if (!mountedRef.current) return;

      isSavingRef.current = true;
      setStatus('saving');

      try {
        if (!versionIdRef.current) {
          // First save: collect name, then POST
          const name = optionsRef.current?.onNeedName
            ? await optionsRef.current.onNeedName()
            : (formData.personalInfo.fullName || 'Untitled CV');
          if (!mountedRef.current) return;
          const result = await api.saveVersion({
            name: name || (formData.personalInfo.fullName || 'Untitled CV'),
            templateId: formData.templateId,
            texContent: '',
            formData,
          });
          if (!mountedRef.current) return;
          if (result) {
            lastSavedRef.current = serialized;
            setStatus('saved');
            optionsRef.current?.onFirstSave?.(result);
            if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
            fadeTimerRef.current = setTimeout(() => {
              if (mountedRef.current) setStatus('idle');
            }, 2000);
          } else {
            setStatus('error');
          }
        } else {
          // Subsequent saves: PATCH in-place
          const ok = await api.updateVersionFull(versionIdRef.current, {
            formData,
            texContent: '',
          });
          if (!mountedRef.current) return;
          if (ok) {
            lastSavedRef.current = serialized;
            setStatus('saved');
            if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
            fadeTimerRef.current = setTimeout(() => {
              if (mountedRef.current) setStatus('idle');
            }, 2000);
          } else {
            setStatus('error');
          }
        }
      } catch {
        if (mountedRef.current) {
          setStatus('error');
        }
      } finally {
        isSavingRef.current = false;
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [formData, versionId]);

  return status;
}
