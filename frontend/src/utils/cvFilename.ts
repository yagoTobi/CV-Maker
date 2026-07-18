type CVFilenameOptions = {
  fullName?: string; company?: string; role?: string;
};

function generateCVFilenameBase(opts: CVFilenameOptions): string {
  const sanitize = (s: string) => s.trim().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  const parts = [opts.fullName, opts.company, opts.role]
    .flatMap(s => (s ? [sanitize(s)] : []))
    .filter(s => s.length > 0);
  if (parts.length === 0) parts.push('CV');
  parts.push('CV');
  return parts.join('_');
}

export function generateCVFilename(opts: CVFilenameOptions): string {
  return `${generateCVFilenameBase(opts)}.pdf`;
}

export function generateCVJsonFilename(opts: CVFilenameOptions): string {
  return `${generateCVFilenameBase(opts)}.json`;
}
