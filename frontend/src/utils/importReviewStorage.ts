const KEY = 'cvmaker.importReviewNote';
const TTL_MS = 30 * 60 * 1000;

export interface ImportReviewNote {
  readonly lowFields: readonly string[];
  readonly warnings: readonly string[];
  readonly ts: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isImportReviewNote(value: unknown): value is ImportReviewNote {
  if (!isRecord(value)) return false;
  return (
    isStringArray(value.lowFields) &&
    isStringArray(value.warnings) &&
    typeof value.ts === 'number'
  );
}

export function saveImportReviewNote(note: ImportReviewNote): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    window.sessionStorage.setItem(KEY, JSON.stringify(note));
  } catch {
    return;
  }
}

export function takeImportReviewNote(): ImportReviewNote | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(KEY);
    const parsed: unknown = JSON.parse(raw);
    if (!isImportReviewNote(parsed)) return null;
    if (Date.now() - parsed.ts > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}
