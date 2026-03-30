import type { CVFormData, TailorChange } from '../types';
import { generateId } from './idHelpers';

/** Parse a path like "workExperience[0].bullets[2]" into segments */
export function parsePath(path: string): (string | number)[] {
  const segments: (string | number)[] = [];
  const re = /([^.[]+)|\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path)) !== null) {
    if (m[1] !== undefined) segments.push(m[1]);
    else if (m[2] !== undefined) segments.push(Number(m[2]));
  }
  return segments;
}

/** Check if an array contains structured items (BulletItem/SkillItem with id+text fields) */
function _isStructuredArray(arr: unknown[]): boolean {
  if (arr.length === 0) return false;
  const first = arr[0];
  return typeof first === 'object' && first !== null && 'text' in first && 'id' in first;
}

export function setAtPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const segs = parsePath(path);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    if (cur[segs[i]] == null) {
      cur[segs[i]] = typeof segs[i + 1] === 'number' ? [] : {};
    }
    cur = cur[segs[i]];
  }
  const lastSeg = segs[segs.length - 1];
  const existing = cur[lastSeg];

  // If the existing value is a BulletItem/SkillItem and the new value is a string,
  // preserve the ID and update only the text field
  if (existing && typeof existing === 'object' && 'text' in existing && 'id' in existing && typeof value === 'string') {
    cur[lastSeg] = { ...existing, text: value };
  } else if (typeof lastSeg === 'number' && Array.isArray(cur) && typeof value === 'string' && _isStructuredArray(cur)) {
    // Inserting into a structured array — wrap value in BulletItem/SkillItem
    cur[lastSeg] = { id: generateId(), text: value };
  } else {
    cur[lastSeg] = value;
  }
}

/** Navigate a dot-bracket path and return the value at that location */
export function getAtPath(obj: Record<string, unknown>, path: string): unknown {
  const segs = parsePath(path);
  let cur: unknown = obj;
  for (const seg of segs) {
    if (cur == null) return undefined;
    cur = (cur as Record<string, unknown>)[seg as string];
  }
  return cur;
}

export function applyTailorChanges(
  original: CVFormData,
  changes: TailorChange[],
  selectedIds: Set<string>,
  selectedAlternatives?: Map<string, number>
): CVFormData {
  const patched = structuredClone(original);
  for (const change of changes) {
    if (!selectedIds.has(change.id)) continue;
    const altIndex = selectedAlternatives?.get(change.id) ?? 0;
    const alt = change.alternatives[altIndex] ?? change.alternatives[0];
    if (!alt) continue;

    let valueToSet: unknown = alt.value;

    // If value is string[] and target is a structured array (SkillItem[]/BulletItem[]),
    // wrap each string in a structured object
    if (Array.isArray(valueToSet) && valueToSet.every(v => typeof v === 'string')) {
      const segs = parsePath(change.fieldPath);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let target: any = patched;
      for (const seg of segs) {
        if (target == null) break;
        target = target[seg];
      }
      if (Array.isArray(target) && _isStructuredArray(target)) {
        valueToSet = (valueToSet as string[]).map((text) => ({ id: generateId(), text }));
      }
    }

    try {
      setAtPath(patched as Record<string, unknown>, change.fieldPath, valueToSet);
    } catch {
      // Skip unresolvable paths
    }
  }
  return patched;
}

/** Map a field path like "workExperience[0].bullets[2]" to its form section */
export function fieldPathToSection(fieldPath: string): string {
  const root = fieldPath.split(/[.[]/)[0];
  const map: Record<string, string> = {
    personalInfo: 'personal',
    workExperience: 'work',
    education: 'education',
    skills: 'skills',
    projects: 'projects',
    awards: 'awards',
  };
  if (root === 'additionalSections') {
    const match = fieldPath.match(/additionalSections\[(\d+)\]/);
    return match ? `additional-${match[1]}` : 'personal';
  }
  return map[root] || 'personal';
}
