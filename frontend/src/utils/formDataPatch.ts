import type { CVFormData, TailorChange } from '../types';
import { generateId } from './idHelpers';

/** Parse a path like "workExperience[0].bullets[2]" into segments */
function parsePath(path: string): (string | number)[] {
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

/**
 * Immutable structural-sharing version of setAtPath.
 * Only copies nodes along the changed path; unchanged branches keep their references.
 * This is critical for React.memo on section components: editing workExperience[0]
 * must NOT produce new array references for education, skills, etc.
 */
export function setAtPathImmutable(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const segs = parsePath(path);

  function rebuild(cur: unknown, depth: number): unknown {
    const seg = segs[depth];
    const isLast = depth === segs.length - 1;

    if (isLast) {
      if (Array.isArray(cur)) {
        const existing = (cur as unknown[])[seg as number];
        const newArr = [...(cur as unknown[])];
        if (
          existing &&
          typeof existing === 'object' &&
          'text' in (existing as object) &&
          'id' in (existing as object) &&
          typeof value === 'string'
        ) {
          newArr[seg as number] = { ...(existing as object), text: value };
        } else if (
          typeof seg === 'number' &&
          typeof value === 'string' &&
          _isStructuredArray(cur as unknown[])
        ) {
          newArr[seg as number] = { id: generateId(), text: value };
        } else {
          newArr[seg as number] = value;
        }
        return newArr;
      }
      const existing = (cur as Record<string, unknown>)[seg as string];
      if (
        existing &&
        typeof existing === 'object' &&
        'text' in (existing as object) &&
        'id' in (existing as object) &&
        typeof value === 'string'
      ) {
        return { ...(cur as object), [seg as string]: { ...(existing as object), text: value } };
      }
      return { ...(cur as object), [seg as string]: value };
    }

    if (Array.isArray(cur)) {
      const idx = seg as number;
      const newArr = [...(cur as unknown[])];
      newArr[idx] = rebuild(newArr[idx], depth + 1);
      return newArr;
    }
    const o = cur as Record<string, unknown>;
    return { ...o, [seg as string]: rebuild(o[seg as string], depth + 1) };
  }

  return rebuild(obj, 0) as Record<string, unknown>;
}

function setAtPath(obj: Record<string, unknown>, path: string, value: unknown): void {
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

/**
 * Enforce the "one Suggestion per field" invariant (see CONTEXT.md): keep at most
 * one TailorChange per fieldPath. First occurrence wins — TAILOR_SUGGEST_PROMPT emits
 * the highest-impact changes first, so the first change for a field is the one to keep.
 * The order of kept changes is preserved.
 *
 * Without this, two changes on the same fieldPath would silently clobber each other in
 * applyTailorChanges (last write wins) and stack two highlights on one element.
 */
export function dedupeChangesByField(changes: TailorChange[]): TailorChange[] {
  const seen = new Set<string>();
  const result: TailorChange[] = [];
  for (const change of changes) {
    if (seen.has(change.fieldPath)) continue;
    seen.add(change.fieldPath);
    result.push(change);
  }
  return result;
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
