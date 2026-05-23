// Analog: frontend/src/__tests__/navBar.test.tsx (vi.mock context-mocking pattern)
// Implements D-04, D-06, D-17, D-18, D-25 contract per .planning/phases/13.../13-CONTEXT.md.
//
// Wave 0 scaffold: imports the still-missing TuneRail from
// `features/direct-edit/components/TuneRail`. Plan 04 implements it.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TuneRail } from '../features/direct-edit/components/TuneRail';
import type { CVFormData, CVVersionMeta, MatchAnalysis, TailorChange, TailorResponse } from '../types';

// --- factories ---

function makeFormData(): CVFormData {
  return {
    templateId: 'med-length-proff-cv',
    personalInfo: { fullName: 'Jane Doe', email: '', phone: '', location: '', links: [] },
    workExperience: [],
    education: [],
    skills: [],
  };
}

function makeVersion(overrides: Partial<CVVersionMeta> = {}): CVVersionMeta {
  return {
    id: 'v1',
    name: 'Base CV',
    templateId: 'med-length-proff-cv',
    createdAt: '2026-04-01T00:00:00Z',
    ...overrides,
  };
}

function makeChange(overrides: Partial<TailorChange> = {}): TailorChange {
  return {
    id: 'c1',
    fieldPath: 'workExperience[0].bullets[0]',
    section: 'Work Experience',
    description: 'Reword',
    currentValue: 'old',
    alternatives: [{ label: 'A', value: 'new' }],
    changeType: 'modify',
    ...overrides,
  };
}

function makeTailor(overrides = {}) {
  return {
    tailorResponse: null as TailorResponse | null,
    isLoading: false,
    error: null,
    appliedChanges: new Set<string>(),
    skippedChanges: new Set<string>(),
    pendingChanges: [] as TailorChange[],
    selectedAlternatives: new Map<string, number>(),
    estimatedCurrentScore: 0,
    isApplying: false,
    fetchSuggestions: vi.fn(),
    acceptChange: vi.fn(),
    skipChange: vi.fn(),
    undoChange: vi.fn(),
    acceptAllRemaining: vi.fn(),
    selectAlternative: vi.fn(),
    editChangeValue: vi.fn(),
    reset: vi.fn(),
    setBaselineScore: vi.fn(),
    ...overrides,
  };
}

function defaultProps(overrides = {}) {
  return {
    activeVersion: makeVersion(),
    formData: makeFormData(),
    matchAnalysis: null as MatchAnalysis | null,
    tailor: makeTailor(),
    onSaveAsBase: vi.fn(),
    ...overrides,
  };
}

describe('TuneRail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('when activeVersion is null, renders save-as-base step with heading "Name your base CV"', () => {
    render(<TuneRail {...defaultProps({ activeVersion: null })} />);
    expect(screen.getByText(/name your base cv/i)).toBeInTheDocument();
  });

  it('when activeVersion is set and matchAnalysis is null, renders JD inputs', () => {
    render(<TuneRail {...defaultProps()} />);
    expect(
      screen.getByPlaceholderText(/paste the full job description here/i),
    ).toBeInTheDocument();
  });

  it('after matchAnalysis arrives with missing.length>0, renders GapPromptChips', () => {
    const matchAnalysis: MatchAnalysis = {
      requirements: ['x'],
      matching: [],
      missing: ['Spanish fluency', 'AWS'],
      suggestions: [],
      match_score: 60,
    };
    render(<TuneRail {...defaultProps({ matchAnalysis })} />);
    // GapPromptChips renders one button per missing entry
    expect(screen.getByRole('button', { name: /Spanish fluency/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /AWS/i })).toBeInTheDocument();
  });

  it('clicking "Run CV tune" calls tailor.fetchSuggestions with formData/jd/company/role + clarifications', () => {
    const matchAnalysis: MatchAnalysis = {
      requirements: [],
      matching: [],
      missing: ['Spanish'],
      suggestions: [],
      match_score: 70,
    };
    const tailor = makeTailor();
    render(<TuneRail {...defaultProps({ matchAnalysis, tailor })} />);

    // Run CV tune button must exist; clicking forwards the args.
    fireEvent.click(screen.getByRole('button', { name: /run cv tune/i }));

    expect(tailor.fetchSuggestions).toHaveBeenCalledTimes(1);
    const callArgs = tailor.fetchSuggestions.mock.calls[0];
    // Signature contract: (formData, jobDesc, company, role, userClarifications)
    expect(callArgs.length).toBeGreaterThanOrEqual(5);
    expect(Array.isArray(callArgs[4])).toBe(true);
  });

  it('once tailor.tailorResponse is non-null, the rail renders shrunk state', () => {
    const tailor = makeTailor({
      tailorResponse: {
        changes: [makeChange()],
        estimatedScore: 75,
        summary: '',
      },
      pendingChanges: [makeChange()],
    });
    const { container } = render(<TuneRail {...defaultProps({ tailor })} />);
    // Shrunk state identifiable by data-state="shrunk" OR a class containing 'shrunk'.
    const root = container.firstElementChild as HTMLElement | null;
    expect(root).not.toBeNull();
    const dataState = root!.getAttribute('data-state') ?? '';
    const cls = (root!.getAttribute('class') ?? '').toLowerCase();
    expect(dataState === 'shrunk' || cls.includes('shrunk')).toBe(true);
  });

  it('clicking the chevron in shrunk state restores expanded state', () => {
    const tailor = makeTailor({
      tailorResponse: { changes: [makeChange()], estimatedScore: 75, summary: '' },
      pendingChanges: [makeChange()],
    });
    const { container } = render(<TuneRail {...defaultProps({ tailor })} />);

    const chevron = screen.getByRole('button', { name: /expand|toggle|chevron/i });
    fireEvent.click(chevron);

    const root = container.firstElementChild as HTMLElement | null;
    expect(root).not.toBeNull();
    const dataState = root!.getAttribute('data-state') ?? '';
    const cls = (root!.getAttribute('class') ?? '').toLowerCase();
    expect(dataState === 'expanded' || cls.includes('expanded') || (dataState !== 'shrunk' && !cls.includes('shrunk'))).toBe(true);
  });

  it('section list in shrunk state renders one row per section with pending changes', () => {
    const tailor = makeTailor({
      tailorResponse: {
        changes: [
          makeChange({ id: 'c1', section: 'Work Experience' }),
          makeChange({ id: 'c2', section: 'Skills' }),
          makeChange({ id: 'c3', section: 'Skills' }),
        ],
        estimatedScore: 75,
        summary: '',
      },
      pendingChanges: [
        makeChange({ id: 'c1', section: 'Work Experience' }),
        makeChange({ id: 'c2', section: 'Skills' }),
        makeChange({ id: 'c3', section: 'Skills' }),
      ],
    });
    render(<TuneRail {...defaultProps({ tailor })} />);
    expect(screen.getByText(/Work Experience/i)).toBeInTheDocument();
    expect(screen.getByText(/Skills/i)).toBeInTheDocument();
  });

  it('clicking "Skip section" on a section row marks every change in that section as skipped', () => {
    const tailor = makeTailor({
      tailorResponse: {
        changes: [
          makeChange({ id: 'c2', section: 'Skills' }),
          makeChange({ id: 'c3', section: 'Skills' }),
        ],
        estimatedScore: 75,
        summary: '',
      },
      pendingChanges: [
        makeChange({ id: 'c2', section: 'Skills' }),
        makeChange({ id: 'c3', section: 'Skills' }),
      ],
    });
    render(<TuneRail {...defaultProps({ tailor })} />);

    fireEvent.click(screen.getByRole('button', { name: /skip section/i }));

    // Both Skills-section change ids must be passed to skipChange.
    const calls = tailor.skipChange.mock.calls.map((c: unknown[]) => c[0]);
    expect(calls).toEqual(expect.arrayContaining(['c2', 'c3']));
  });
});
