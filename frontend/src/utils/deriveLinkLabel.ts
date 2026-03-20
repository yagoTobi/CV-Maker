/** Auto-derive a display label from a URL (e.g. "GitHub" from "https://github.com/user"). */
export function deriveLinkLabel(url: string): string {
  const PLATFORMS: Array<[RegExp, string]> = [
    [/github\.com/i, 'GitHub'],
    [/linkedin\.com/i, 'LinkedIn'],
    [/twitter\.com|x\.com/i, 'Twitter'],
    [/gitlab\.com/i, 'GitLab'],
    [/kaggle\.com/i, 'Kaggle'],
    [/medium\.com/i, 'Medium'],
    [/stackoverflow\.com/i, 'Stack Overflow'],
    [/scholar\.google/i, 'Google Scholar'],
    [/researchgate\.net/i, 'ResearchGate'],
    [/orcid\.org/i, 'ORCID'],
  ];
  for (const [pattern, label] of PLATFORMS) {
    if (pattern.test(url)) return label;
  }
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    return new URL(normalized).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
