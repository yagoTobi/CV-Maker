export function generateCVFilename(opts: {
  fullName?: string; company?: string; role?: string;
}): string {
  const sanitize = (s: string) => s.trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  const parts = [opts.fullName, opts.company, opts.role]
    .filter(Boolean)
    .map(s => sanitize(s!))
    .filter(s => s.length > 0);
  if (parts.length === 0) parts.push('CV');
  parts.push('CV');
  return parts.join('_') + '.pdf';
}
