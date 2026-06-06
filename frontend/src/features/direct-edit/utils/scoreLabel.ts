/**
 * scoreLabel -- Derives a human-readable label and CSS colour tier from a
 * numeric match score (0–100).
 *
 * Extracted from TunePanel and ChangePanel where the same logic was duplicated.
 */

export type ScoreColorTier = 'good' | 'medium' | 'low';

export function scoreLabel(score: number): string {
  if (score >= 80) return 'Strong match';
  if (score >= 60) return 'Getting close';
  if (score >= 40) return 'Partial match';
  return 'Weak match';
}

export function scoreColorTier(score: number): ScoreColorTier {
  if (score >= 80) return 'good';
  if (score >= 60) return 'medium';
  return 'low';
}
