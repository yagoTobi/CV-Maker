/**
 * useDirectEditor -- Central state controller that bridges EditableField
 * callbacks to CVFormData via useCVContext.
 *
 * Wraps useCVContext().formData and setFormData to provide:
 * - updateField(path, value): set a value at a dot-bracket path on CVFormData
 * - addBullet(basePath, afterIndex): insert a new BulletItem and return its ID
 * - removeBullet(basePath, index): remove a bullet at index (guards minimum 1)
 *
 * Covers: EDIT-05 (edits update CVFormData in real-time).
 */
import { useCallback } from 'react';
import { useCVContext } from '../../../contexts/CVContext';
import { generateId } from '../../../utils/idHelpers';
import { setAtPath, getAtPath } from '../../../utils/formDataPatch';
import type { CVFormData, BulletItem } from '../../../types';

export function useDirectEditor() {
  const { formData, setFormData } = useCVContext();

  const updateField = useCallback(
    (path: string, value: string) => {
      setFormData((prev: CVFormData | null) => {
        if (!prev) return prev;
        const next = structuredClone(prev);
        setAtPath(next as Record<string, unknown>, path, value);
        return next;
      });
    },
    [setFormData]
  );

  const addBullet = useCallback(
    (basePath: string, afterIndex: number): string => {
      const newId = generateId();
      setFormData((prev: CVFormData | null) => {
        if (!prev) return prev;
        const next = structuredClone(prev);
        const arr = getAtPath(
          next as Record<string, unknown>,
          basePath
        ) as BulletItem[] | undefined;
        if (!Array.isArray(arr)) return prev;
        arr.splice(afterIndex + 1, 0, { id: newId, text: '' });
        return next;
      });
      return newId;
    },
    [setFormData]
  );

  const removeBullet = useCallback(
    (basePath: string, index: number) => {
      // Read current formData to check array length before calling setFormData
      if (!formData) return;
      const arr = getAtPath(
        formData as Record<string, unknown>,
        basePath
      ) as BulletItem[] | undefined;
      if (!Array.isArray(arr) || arr.length <= 1) return;

      setFormData((prev: CVFormData | null) => {
        if (!prev) return prev;
        const next = structuredClone(prev);
        const bullets = getAtPath(
          next as Record<string, unknown>,
          basePath
        ) as BulletItem[] | undefined;
        if (!Array.isArray(bullets) || bullets.length <= 1) return prev;
        bullets.splice(index, 1);
        return next;
      });
    },
    [formData, setFormData]
  );

  return { formData, updateField, addBullet, removeBullet };
}
