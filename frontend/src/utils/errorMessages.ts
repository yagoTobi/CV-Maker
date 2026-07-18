/**
 * errorMessages -- helpers for turning raw/backend error strings into
 * short, single-line, user-facing text for toasts and inline banners.
 */

/**
 * Collapse whitespace/newlines to single spaces and truncate a raw error
 * string to `max` characters, appending an ellipsis ('…') when truncated.
 * Returns 'Unknown error' for empty / null / undefined / whitespace-only input.
 */
export function truncateError(raw: string | null | undefined, max = 200): string {
  if (!raw) return 'Unknown error';
  const collapsed = raw.replace(/\s+/g, ' ').trim();
  if (!collapsed) return 'Unknown error';
  if (collapsed.length <= max) return collapsed;
  return `${collapsed.slice(0, max).trimEnd()}…`;
}
