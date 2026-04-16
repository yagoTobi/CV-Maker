export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function scoreColorClass(score: number): string {
  if (score >= 80) return 'good';
  if (score >= 60) return 'medium';
  return 'low';
}

export const EMPTY_SET = new Set<string>();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const noop = (..._args: unknown[]) => {};
