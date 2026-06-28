/**
 * fitBand.ts -- maps a 0-100 match score to a named Fit Band.
 *
 * Bands mirror the backend scoring guidelines in backend/prompts/cv_agent.py
 * (MATCH_ANALYSIS_PROMPT): Weak / Partial / Good / Strong / Excellent.
 *
 * Per CONTEXT.md (Analysis & scoring): the Fit Band is the headline signal shown to
 * the user; the raw 0-100 number is kept under the hood for deltas and version sorting.
 */

type FitBandName = 'Weak' | 'Partial' | 'Good' | 'Strong' | 'Excellent';
type FitBandKey = 'weak' | 'partial' | 'good' | 'strong' | 'excellent';

export interface FitBand {
  /** Display name, e.g. "Strong". */
  name: FitBandName;
  /** Lowercase key for styling / CSS tokens, e.g. "strong". */
  key: FitBandKey;
  /** Inclusive lower bound of the band. */
  min: number;
  /** Inclusive upper bound of the band. */
  max: number;
}

const WEAK: FitBand = { name: 'Weak', key: 'weak', min: 0, max: 39 };
const PARTIAL: FitBand = { name: 'Partial', key: 'partial', min: 40, max: 59 };
const GOOD: FitBand = { name: 'Good', key: 'good', min: 60, max: 74 };
const STRONG: FitBand = { name: 'Strong', key: 'strong', min: 75, max: 89 };
const EXCELLENT: FitBand = { name: 'Excellent', key: 'excellent', min: 90, max: 100 };

/** Bands in ascending order. Bounds are inclusive and contiguous over 0-100. */
export const FIT_BANDS: readonly FitBand[] = [WEAK, PARTIAL, GOOD, STRONG, EXCELLENT];

/** Clamp to [0,100] and round, then map to its Fit Band. */
export function scoreToFitBand(score: number): FitBand {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return FIT_BANDS.find((b) => clamped >= b.min && clamped <= b.max) ?? WEAK;
}
