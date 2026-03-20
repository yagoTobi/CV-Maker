import type { CVFormData, TailorChange } from '../types';

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

function setAtPath(obj: any, path: string, value: any): void {
  const segs = parsePath(path);
  let cur = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    if (cur[segs[i]] == null) {
      cur[segs[i]] = typeof segs[i + 1] === 'number' ? [] : {};
    }
    cur = cur[segs[i]];
  }
  cur[segs[segs.length - 1]] = value;
}

export function applyTailorChanges(
  original: CVFormData,
  changes: TailorChange[],
  selectedIds: Set<string>
): CVFormData {
  const patched = structuredClone(original);
  for (const change of changes) {
    if (!selectedIds.has(change.id)) continue;
    try {
      setAtPath(patched, change.fieldPath, change.newValue);
    } catch {
      // Skip unresolvable paths
    }
  }
  return patched;
}
