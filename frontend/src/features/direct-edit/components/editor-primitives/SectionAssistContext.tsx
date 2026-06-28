/**
 * SectionAssistContext -- lets a bullet row's assist trigger (T11) call up to the
 * single useSectionAssist instance without threading callbacks through the whole
 * section tree (WorkSection, EditableBulletList, ...). Provider is mounted around
 * the CV by the direct editor; when absent (legacy / non-editor surfaces) or while
 * suppressed, useSectionAssistTrigger returns a no-op so callers behave as before.
 */
import { createContext, useContext } from 'react';
import type { SectionAssistTarget } from '../../utils/sectionAssist';

export interface SectionAssistContextValue {
  /** Open the assist popover for the given bullet target. */
  requestAssist: (target: SectionAssistTarget) => void;
  /** When true, triggers should stay hidden / inert (e.g. during Tune review). */
  suppressed: boolean;
}

export const SectionAssistContext = createContext<SectionAssistContextValue | null>(null);

export function useSectionAssistTrigger(): SectionAssistContextValue {
  const ctx = useContext(SectionAssistContext);
  if (!ctx) return { requestAssist: () => {}, suppressed: false };
  return ctx;
}
