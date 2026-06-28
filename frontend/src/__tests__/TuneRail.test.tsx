// TuneRail -- switch-column stepper contract (CONTEXT.md).
//
// NOTE: this file originally scaffolded the Phase 13 shrink-rail (D-09/D-10). That design
// was superseded by the fixed-width switch-column (see CONTEXT.md "Tune Rail does not
// resize"), so the former shrunk-state/chevron tests are replaced with switch-column tests.

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
    acceptChanges: vi.fn(),
    skipChange: vi.fn(),
    undoChange: vi.fn(),
    acceptAllRemaining: vi.fn(),
    selectAlternative: vi.fn(),
    editChangeValue: vi.fn(),
    restoreSuggestions: vi.fn(),
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
    onAnalyze: vi.fn(),
    ...overrides,
  };
}

describe('TuneRail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('when activeVersion is null, the Setup step prompts to name the base CV', () => {
    render(<TuneRail {...defaultProps({ activeVersion: null })} />);
    expect(screen.getByText(/name your base cv/i)).toBeInTheDocument();
  });

  it('when activeVersion is set and matchAnalysis is null, Setup shows the JD inputs', () => {
    render(<TuneRail {...defaultProps()} />);
    expect(screen.getByPlaceholderText(/paste the full job description here/i)).toBeInTheDocument();
  });

  it('after matchAnalysis arrives with missing.length>0, the Gap step renders GapPromptChips', () => {
    const matchAnalysis: MatchAnalysis = {
      requirements: ['x'],
      matching: [],
      missing: ['Spanish fluency', 'AWS'],
      suggestions: [],
      match_score: 60,
    };
    render(<TuneRail {...defaultProps({ matchAnalysis })} />);
    expect(screen.getByRole('button', { name: /Spanish fluency/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /AWS/i })).toBeInTheDocument();
  });

  it('clicking "Run CV tune" forwards formData/jd/company/role + clarifications array', () => {
    const matchAnalysis: MatchAnalysis = {
      requirements: [],
      matching: [],
      missing: ['Spanish'],
      suggestions: [],
      match_score: 70,
    };
    const tailor = makeTailor();
    render(<TuneRail {...defaultProps({ matchAnalysis, tailor })} />);

    fireEvent.click(screen.getByRole('button', { name: /run cv tune/i }));

    expect(tailor.fetchSuggestions).toHaveBeenCalledTimes(1);
    const callArgs = tailor.fetchSuggestions.mock.calls[0];
    // Signature contract: (formData, jobDesc, company, role, userClarifications)
    expect(callArgs.length).toBeGreaterThanOrEqual(5);
    expect(Array.isArray(callArgs[4])).toBe(true);
  });

  it('when tailorResponse is set, defaults to the Review step (switch-column, no resize)', () => {
    const tailor = makeTailor({
      tailorResponse: { changes: [makeChange()], estimatedScore: 75, summary: '' },
      pendingChanges: [makeChange()],
    });
    const { container } = render(<TuneRail {...defaultProps({ tailor })} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('data-step')).toBe('review');
    expect(screen.getByText(/Work Experience/i)).toBeInTheDocument();
  });

  it('clicking a past step in the Step Strip switches content without tearing down review', () => {
    const tailor = makeTailor({
      tailorResponse: { changes: [makeChange()], estimatedScore: 75, summary: '' },
      pendingChanges: [makeChange()],
    });
    const { container } = render(<TuneRail {...defaultProps({ tailor })} />);
    expect((container.firstElementChild as HTMLElement).getAttribute('data-step')).toBe('review');

    fireEvent.click(screen.getByRole('button', { name: /setup/i }));

    expect((container.firstElementChild as HTMLElement).getAttribute('data-step')).toBe('setup');
    expect(screen.getByPlaceholderText(/paste the full job description here/i)).toBeInTheDocument();
    // Non-destructive: switching steps must not skip or reset any changes.
    expect(tailor.skipChange).not.toHaveBeenCalled();
    expect(tailor.reset).not.toHaveBeenCalled();
  });

  it('the Review step lists one row per section with pending changes', () => {
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

  it('clicking "Skip section" marks every change in that section as skipped', () => {
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

    const calls = tailor.skipChange.mock.calls.map((c: unknown[]) => c[0]);
    expect(calls).toEqual(expect.arrayContaining(['c2', 'c3']));
  });

  it('Review header docks the Fit Band + requirement coverage in the rail (supersedes D-21)', () => {
    const matchAnalysis: MatchAnalysis = {
      requirements: ['a', 'b', 'c'],
      matching: ['a', 'b'],
      missing: ['c'],
      suggestions: [],
      match_score: 82,
    };
    const tailor = makeTailor({
      tailorResponse: { changes: [makeChange()], estimatedScore: 88, summary: '' },
      pendingChanges: [makeChange()],
    });
    render(<TuneRail {...defaultProps({ matchAnalysis, tailor })} />);

    // 82 -> Strong band (cv_agent.py scoring guidelines)
    expect(screen.getByText('Strong')).toBeInTheDocument();
    expect(screen.getByText(/2\s*\/\s*3 requirements/i)).toBeInTheDocument();
  });

  it('Save tailored CV enables at >=1 accepted and forwards JD details', () => {
    const tailor = makeTailor({
      tailorResponse: { changes: [makeChange()], estimatedScore: 75, summary: '' },
      pendingChanges: [],
      appliedChanges: new Set<string>(['c1']),
    });
    const onSaveTailored = vi.fn();
    render(<TuneRail {...defaultProps({ tailor, onSaveTailored })} />);
    const saveBtn = screen.getByRole('button', { name: /save tailored cv/i });
    expect(saveBtn).not.toBeDisabled();
    fireEvent.click(saveBtn);
    expect(onSaveTailored).toHaveBeenCalledTimes(1);
  });

  it('Save tailored CV is disabled with zero accepted changes', () => {
    const tailor = makeTailor({
      tailorResponse: { changes: [makeChange()], estimatedScore: 75, summary: '' },
      pendingChanges: [makeChange()],
      appliedChanges: new Set<string>(),
    });
    render(<TuneRail {...defaultProps({ tailor })} />);
    expect(screen.getByRole('button', { name: /save tailored cv/i })).toBeDisabled();
  });
});
