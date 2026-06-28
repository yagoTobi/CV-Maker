/**
 * severity.ts -- D-12 client-side severity inference for TailorChange highlights.
 *
 * Rules (from Phase 13 CONTEXT.md D-12):
 *   - changeType='add'    -> 'add'
 *   - changeType='remove' -> 'delete'
 *   - changeType='modify' -> word-overlap diff between currentValue and alternatives[0].value:
 *       diff ratio = 1 - (sharedWords(a,b) / wordsB.length)
 *       if (!a) return 1   (treat empty before as fully changed)
 *       diff > SEVERITY_DIFF_THRESHOLD (0.5) -> 'strong'  (low overlap, big rewrite)
 *       diff <= SEVERITY_DIFF_THRESHOLD       -> 'minor'   (high overlap, small edit)
 *
 * No backend dependency: severity is inferred per-change in the renderer.
 * No new field on TailorChange.
 */
import type { TailorChange, TailorAlternative } from '../../../types';

export type Severity = 'strong' | 'minor' | 'add' | 'delete';

/** Tunable threshold for modify -> strong vs minor. >0.5 means low overlap. */
const SEVERITY_DIFF_THRESHOLD = 0.5;

/** Coerce TailorAlternative.value (string | string[]) plus other shapes to a comparable string. */
function toDisplayString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((v) => toDisplayString(v)).join(' ');
  if (typeof value === 'object') {
    // BulletItem/SkillItem-like: pick text field.
    const obj = value as Record<string, unknown>;
    if (typeof obj.text === 'string') return obj.text;
    return '';
  }
  return String(value);
}

/** Tokenize on whitespace and lowercase; empty string yields []. */
function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/**
 * Word-overlap diff ratio between `before` and `after`:
 *   - returns 1 if before is empty (fully changed)
 *   - returns 1 - (shared / afterCount) otherwise
 *   - returns 0 if both are non-empty and identical word sets
 */
function simpleDiffRatio(before: string, after: string): number {
  if (!before) return 1;
  const a = tokens(before);
  const b = tokens(after);
  if (b.length === 0) return 1;
  const setA = new Set(a);
  let shared = 0;
  for (const w of b) {
    if (setA.has(w)) shared += 1;
  }
  return 1 - shared / b.length;
}

export function inferSeverity(change: TailorChange): Severity {
  if (change.changeType === 'add') return 'add';
  if (change.changeType === 'remove') return 'delete';

  // modify: compute word-overlap diff between currentValue and alternatives[0].value
  const before = toDisplayString(change.currentValue);
  const firstAlt: TailorAlternative | undefined = change.alternatives[0];
  const after = firstAlt ? toDisplayString(firstAlt.value) : '';
  const ratio = simpleDiffRatio(before, after);
  return ratio > SEVERITY_DIFF_THRESHOLD ? 'strong' : 'minor';
}
