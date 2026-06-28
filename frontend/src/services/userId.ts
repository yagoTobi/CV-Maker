/**
 * Stable per-browser identifier sent as the `X-User-Id` header.
 *
 * This is NOT authentication. Until real auth exists, the backend defaults an
 * absent `X-User-Id` to the shared `"local"` user, which means every browser
 * reads and writes the same CV storage partition. Sending a per-browser id
 * partitions storage per device so sessions don't see (or pre-load) each
 * other's CVs. Swap this out once real auth/JWT is wired up.
 *
 * The id is persisted in localStorage so it survives reloads. If localStorage
 * is unavailable (private mode, SSR), we fall back to a volatile per-load id
 * rather than collapsing back onto the shared `"local"` bucket.
 */
const STORAGE_KEY = 'cv-maker:user-id';

function generateId(): string {
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `anon-${uuid}`;
}

let volatileId: string | null = null;

export function getUserId(): string {
  try {
    if (typeof localStorage === 'undefined') {
      volatileId ??= generateId();
      return volatileId;
    }
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    volatileId ??= generateId();
    return volatileId;
  }
}
