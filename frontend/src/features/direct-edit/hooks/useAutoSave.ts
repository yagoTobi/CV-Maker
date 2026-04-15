/**
 * useAutoSave -- Debounced auto-save hook with status tracking.
 *
 * Watches CVFormData for changes and saves to the backend after 2.5 seconds
 * of inactivity (D-08). Tracks save status as idle/saving/saved/error (UX-01).
 *
 * Skips redundant saves when formData has not changed since last save (JSON comparison).
 * Skips saves when formData is null.
 * Prevents concurrent saves via isSavingRef guard.
 */
import { useState, useEffect, useRef } from 'react';
import { api } from '../../../services/api';
import type { CVFormData } from '../../../types';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 2500;

export function useAutoSave(
  formData: CVFormData | null,
  versionId: string | null
): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSavedRef = useRef<string>('');
  const isSavingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!formData) return;
    // Skip saves with invalid/sentinel templateIds (e.g. '_import')
    if (!['med-length-proff-cv', 'deedy-resume', 'mcdowell-cv'].includes(formData.templateId)) return;

    const serialized = JSON.stringify(formData);
    if (serialized === lastSavedRef.current) return;
    if (isSavingRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if (!mountedRef.current) return;

      isSavingRef.current = true;
      setStatus('saving');

      try {
        const result = await api.saveVersion({
          name: formData.personalInfo.fullName || 'Untitled CV',
          templateId: formData.templateId,
          texContent: '',
          formData,
        });

        if (!mountedRef.current) return;

        if (result) {
          lastSavedRef.current = serialized;
          setStatus('saved');
        } else {
          setStatus('error');
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
