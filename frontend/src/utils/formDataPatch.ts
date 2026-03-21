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
      setAtPath(patched as Record<string, unknown>, change.fieldPath, change.newValue);
    } catch {
      // Skip unresolvable paths
    }
  }
  return patched;
}
