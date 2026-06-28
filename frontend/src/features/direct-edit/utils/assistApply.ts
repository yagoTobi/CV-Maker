/**
 * applyAssistBullets — pure formData transformer for the section-assist apply step.
 *
 * Rules (mirrors the plan's T12 spec):
 *  - If the slot at `target.index` exists and is EMPTY: replace it with bullets[0],
 *    splice bullets[1..] in immediately after it.
 *  - If the slot exists but has TEXT (user typed while the popover was open):
 *    append ALL new bullets after the existing array.
 *  - If no slot exists at `target.index` (empty-starter, arr.length === 0 or < index):
 *    append ALL new bullets to the array.
 *  - Empty `bullets` array is a no-op — returns the same formData reference.
 */
import { setAtPathImmutable, getAtPath } from '../../../utils/formDataPatch';
import { generateId } from '../../../utils/idHelpers';
import type { CVFormData } from '../../../types';
import type { SectionAssistTarget } from './sectionAssist';

export function applyAssistBullets(
  formData: CVFormData,
  target: SectionAssistTarget,
  bullets: string[],
): CVFormData {
  if (bullets.length === 0) return formData;

  const obj = formData as unknown as Record<string, unknown>;
  const arr = getAtPath(obj, target.basePath);

  if (Array.isArray(arr) && target.index < arr.length) {
    const slot = arr[target.index] as { id?: string; text?: string } | null | undefined;
    const slotIsEmpty = (slot?.text ?? '').trim() === '';
    const newArr = [...arr];

    if (slotIsEmpty) {
      newArr[target.index] = { ...(slot as object ?? {}), text: bullets[0] ?? '' };
      for (let i = 1; i < bullets.length; i++) {
        newArr.splice(target.index + i, 0, { id: generateId(), text: bullets[i] });
      }
    } else {
      newArr.push(...bullets.map((text) => ({ id: generateId(), text })));
    }

    return setAtPathImmutable(obj, target.basePath, newArr) as CVFormData;
  }

  const existing = Array.isArray(arr) ? [...arr] : [];
  const newArr = [...existing, ...bullets.map((text) => ({ id: generateId(), text }))];
  return setAtPathImmutable(obj, target.basePath, newArr) as CVFormData;
}
