export type DiffSegment = { text: string; type: 'same' | 'added' | 'removed' };

/**
 * Compute word-level diff between two strings using LCS.
 * Returns segments marked as same/added/removed for inline rendering.
 */
export function computeWordDiff(oldText: string, newText: string): DiffSegment[] {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);

  // Build LCS table
  const m = oldWords.length;
  const n = newWords.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff segments
  const segments: DiffSegment[] = [];
  let i = m, j = n;

  // Collect in reverse, then reverse at the end
  const reversed: DiffSegment[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      reversed.push({ text: oldWords[i - 1], type: 'same' });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      reversed.push({ text: newWords[j - 1], type: 'added' });
      j--;
    } else {
      reversed.push({ text: oldWords[i - 1], type: 'removed' });
      i--;
    }
  }

  reversed.reverse();

  // Merge consecutive segments of the same type for cleaner output
  for (const seg of reversed) {
    const last = segments[segments.length - 1];
    if (last && last.type === seg.type) {
      last.text += seg.text;
    } else {
      segments.push({ ...seg });
    }
  }

  return segments;
}
