/**
 * sectionAssist -- registry + resolver for the per-section AI bullet assist.
 *
 * resolveSectionContext maps a bullet-array basePath (the same dot-bracket path
 * EditableBulletList writes through) to the section type + entry context the
 * backend needs. It is the single source of truth for which sections support
 * assist; anything it returns null for (skills, awards, unrecognized) is gated
 * off by useSectionAssist. SectionAssistTarget is reused by the trigger (T11)
 * and the apply path (T12).
 */
import { getAtPath } from '../../../utils/formDataPatch';
import type {
  CVFormData,
  SectionAssistEntryContext,
  WorkEntry,
  EducationEntry,
  Project,
  AdditionalEntry,
} from '../../../types';

/** Where an assist popover anchors + what bullet array it appends into. */
export type SectionAssistTarget = {
  /** Dot-bracket path to the bullet array, e.g. "workExperience[0].bullets". */
  basePath: string;
  /** Bullet index within the array at basePath that triggered the assist. */
  index: number;
  /** Live anchor rect for popover positioning (null when the node is gone). */
  getRect: () => DOMRect | null;
  /** Element to restore focus to when the popover closes. */
  restoreFocusEl?: HTMLElement;
};

/** Section-specific copy shown in the assist popover (question + quick chips). */
export const SECTION_ASSIST_META: Record<string, { question: string; chips: string[] }> = {
  work: {
    question: 'What did you do in this role?',
    chips: ['Key achievement', 'Tech / tools used', 'Impact / metric', 'Leadership / scope'],
  },
  education: {
    question: 'What stood out in your studies?',
    chips: ['Final thesis', 'Key projects', 'Specialization', 'Publication'],
  },
  project: {
    question: 'What was this project about?',
    chips: ['What you built', 'Tech stack', 'Outcome / metric', 'Your role'],
  },
  additional: {
    question: 'What would you like to highlight?',
    chips: ['Key achievement', 'What you did', 'Impact'],
  },
};

export interface ResolvedSectionContext {
  sectionType: string;
  entryContext: SectionAssistEntryContext;
  hasTitle: boolean;
}

/** Join start/end dates with an en-dash, omitting the field entirely when both are blank. */
function joinDates(start: string | undefined, end: string | undefined): string | undefined {
  const startTrimmed = (start ?? '').trim();
  const endTrimmed = (end ?? '').trim();
  if (!startTrimmed && !endTrimmed) return undefined;
  return `${startTrimmed}\u2013${endTrimmed}`;
}

function computeHasTitle(entryContext: SectionAssistEntryContext): boolean {
  return Boolean(entryContext.title?.trim() || entryContext.organization?.trim());
}

function pack(sectionType: string, entryContext: SectionAssistEntryContext): ResolvedSectionContext {
  return { sectionType, entryContext, hasTitle: computeHasTitle(entryContext) };
}

/**
 * Resolve a bullet-array basePath into the section type + entry context for assist.
 * Returns null for unsupported sections (skills), missing entries, and any
 * path that is not one of the four recognized bullet-array shapes.
 */
export function resolveSectionContext(
  formData: CVFormData,
  basePath: string,
): ResolvedSectionContext | null {
  const obj = formData as unknown as Record<string, unknown>;

  const work = /^workExperience\[(\d+)\]\.bullets$/.exec(basePath);
  if (work) {
    const entry = getAtPath(obj, `workExperience[${work[1]}]`) as WorkEntry | undefined;
    if (!entry) return null;
    return pack('work', {
      title: entry.title,
      organization: entry.company,
      dates: joinDates(entry.startDate, entry.endDate),
    });
  }

  const education = /^education\[(\d+)\]\.details$/.exec(basePath);
  if (education) {
    const entry = getAtPath(obj, `education[${education[1]}]`) as EducationEntry | undefined;
    if (!entry) return null;
    return pack('education', {
      title: entry.degree,
      organization: entry.school,
      dates: joinDates(entry.startDate, entry.endDate),
    });
  }

  const project = /^projects\[(\d+)\]\.bullets$/.exec(basePath);
  if (project) {
    const entry = getAtPath(obj, `projects[${project[1]}]`) as Project | undefined;
    if (!entry) return null;
    return pack('project', { title: entry.name });
  }

  const additional = /^additionalSections\[(\d+)\]\.entries\[(\d+)\]\.bullets$/.exec(basePath);
  if (additional) {
    const entry = getAtPath(
      obj,
      `additionalSections[${additional[1]}].entries[${additional[2]}]`,
    ) as AdditionalEntry | undefined;
    if (!entry) return null;
    return pack('additional', { title: entry.title });
  }

  return null;
}
