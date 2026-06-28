import type { MatchAnalysis, TailorResponse } from '../../../types';

export interface TuneSessionState {
  isOpen: boolean;
  activeTier: 1 | 2 | 3;
  tier2Complete: boolean;
  companyName: string;
  roleName: string;
  jobDescription: string;
  matchAnalysis: MatchAnalysis | null;
  baselineScore: number;
  tailorResponse: TailorResponse | null;
  appliedChangeIds: string[];
  skippedChangeIds: string[];
  selectedAlternatives: [string, number][];
  userClarifications: string[];
  evidenceEntries: Array<{ topic: string; description: string }>;
}

const STORAGE_PREFIX = 'cv-maker:tune-session:';

function tuneSessionKey(versionId: string): string {
  return `${STORAGE_PREFIX}${versionId}`;
}

function isBrowserStorageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function loadTuneSession(versionId: string | null | undefined): TuneSessionState | null {
  if (!versionId || !isBrowserStorageAvailable()) return null;
  const raw = window.sessionStorage.getItem(tuneSessionKey(versionId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TuneSessionState;
  } catch {
    return null;
  }
}

export function saveTuneSession(versionId: string | null | undefined, state: TuneSessionState): void {
  if (!versionId || !isBrowserStorageAvailable()) return;
  window.sessionStorage.setItem(tuneSessionKey(versionId), JSON.stringify(state));
}
