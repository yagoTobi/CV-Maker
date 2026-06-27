/**
 * Per-tab pointer to the CV version the user is actively editing.
 *
 * Persisted so a page refresh / direct navigation to /build/form can restore
 * *that specific* version — instead of falling back to "the most recent saved
 * CV", which would surface an unrelated CV into what should be a fresh session.
 * sessionStorage (not localStorage) keeps it scoped to the tab and cleared when
 * the tab closes.
 */
const ACTIVE_VERSION_STORAGE_KEY = 'cv-maker:active-version-id';

export function persistActiveVersionId(id: string | null): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    if (id) window.sessionStorage.setItem(ACTIVE_VERSION_STORAGE_KEY, id);
    else window.sessionStorage.removeItem(ACTIVE_VERSION_STORAGE_KEY);
  } catch {
    /* sessionStorage unavailable — non-fatal */
  }
}

export function getStoredActiveVersionId(): string | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    return window.sessionStorage.getItem(ACTIVE_VERSION_STORAGE_KEY);
  } catch {
    return null;
  }
}
