import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode, RefObject } from 'react';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../contexts/ToastContext';
import { TuneRail } from '../features/direct-edit/components/TuneRail';
import { useTuneFlow } from '../features/direct-edit/hooks/useTuneFlow';
import { api } from '../services/api';
import type { CVFormData, CVVersion, CVVersionMeta, MatchAnalysis, TailorChange, TailorResponse } from '../types';

const cvContextMock = vi.hoisted(() => ({
  setActiveVersion: vi.fn(),
  setFormData: vi.fn(),
}));

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('../contexts/CVContext', () => ({
  useCVContext: () => cvContextMock,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('../services/api', () => ({
  api: {
    generateLatex: vi.fn(),
    getMatchAnalysis: vi.fn(),
    saveVersion: vi.fn(),
    getVersion: vi.fn(),
    suggestTailorChanges: vi.fn(),
  },
}));

function makeFormData(): CVFormData {
  return {
    templateId: 'med-length-proff-cv',
    personalInfo: { fullName: 'Jane Doe', email: '', phone: '', location: '', links: [] },
    workExperience: [],
    education: [],
    skills: [],
  };
}

function makeVersion(overrides: Partial<CVVersion> = {}): CVVersion {
  return {
    id: 'v1',
    name: 'Base CV',
    templateId: 'med-length-proff-cv',
    texContent: 'tex',
    formData: makeFormData(),
    createdAt: '2026-04-01T00:00:00Z',
    ...overrides,
  };
}

function makeVersionMeta(overrides: Partial<CVVersionMeta> = {}): CVVersionMeta {
  return {
    id: 'v1',
    name: 'Base CV',
    templateId: 'med-length-proff-cv',
    createdAt: '2026-04-01T00:00:00Z',
    ...overrides,
  };
}

function makeMatchAnalysis(): MatchAnalysis {
  return {
    requirements: ['TypeScript'],
    matching: [],
    missing: ['AWS'],
    suggestions: [],
    match_score: 45,
  };
}

function makeChange(overrides: Partial<TailorChange> = {}): TailorChange {
  return {
    id: 'c1',
    fieldPath: 'workExperience[0].bullets[0]',
    section: 'Work Experience',
    description: 'Add AWS evidence',
    currentValue: 'old',
    alternatives: [{ label: 'A', value: 'new' }],
    changeType: 'modify',
    ...overrides,
  };
}

function makeTailor(overrides: Partial<ReturnType<typeof baseTailor>> = {}) {
  return {
    ...baseTailor(),
    ...overrides,
  };
}

function baseTailor() {
  return {
    tailorResponse: null as TailorResponse | null,
    isLoading: false,
    error: null as string | null,
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
  };
}

function ToastWrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

function renderTuneFlowHook(activeVersion: CVVersion | null = makeVersion()) {
  return renderHook(
    () => useTuneFlow({ formData: makeFormData(), activeVersion, cvContainerRef: createRef<HTMLElement>() }),
    { wrapper: ToastWrapper },
  );
}

function TuneFlowHarness() {
  const formData = makeFormData();
  const activeVersion = makeVersion();
  const cvContainerRef: RefObject<HTMLElement | null> = createRef<HTMLElement>();
  const tuneFlow = useTuneFlow({ formData, activeVersion, cvContainerRef });

  return (
    <TuneRail
      activeVersion={activeVersion}
      formData={formData}
      matchAnalysis={tuneFlow.matchAnalysis}
      tailor={tuneFlow.tailor}
      isAnalyzing={tuneFlow.isAnalyzing}
      isSaving={tuneFlow.isSaving}
      analyzeError={tuneFlow.analyzeError}
      onSaveAsBase={tuneFlow.onSaveAsBase}
      onAnalyze={tuneFlow.onAnalyze}
      onSaveTailored={tuneFlow.onSaveTailored}
      onActivateChange={tuneFlow.inlineReview.setActiveChange}
    />
  );
}

describe('tune flow errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.generateLatex).mockResolvedValue({ texContent: 'tex' });
    vi.mocked(api.getMatchAnalysis).mockResolvedValue(null);
    vi.mocked(api.saveVersion).mockResolvedValue(makeVersion());
    vi.mocked(api.getVersion).mockResolvedValue(makeVersion());
    vi.mocked(api.suggestTailorChanges).mockResolvedValue(null);
  });

  it('sets analyzeError when match analysis returns null', async () => {
    const { result } = renderTuneFlowHook();

    await act(async () => {
      await result.current.onAnalyze('Acme', 'Engineer', 'Need TypeScript');
    });

    expect(result.current.analyzeError).toBe('Match analysis failed. Try again.');
  });

  it('lets the user retry match analysis from the inline error banner', async () => {
    render(
      <ToastProvider>
        <TuneFlowHarness />
      </ToastProvider>,
    );
    fireEvent.change(screen.getByLabelText('Company'), { target: { value: 'Acme' } });
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'Engineer' } });
    fireEvent.change(screen.getByLabelText('Job description'), { target: { value: 'Need TypeScript' } });

    fireEvent.click(screen.getByRole('button', { name: /find best fit/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Match analysis failed. Try again.');
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => expect(api.getMatchAnalysis).toHaveBeenCalledTimes(2));
  });

  it('renders tailor.error inline in the gap step and retries with the existing tune handler', () => {
    const tailor = makeTailor({ error: 'Failed to get tailor suggestions. Please try again.' });

    render(
      <TuneRail
        activeVersion={makeVersionMeta()}
        formData={makeFormData()}
        matchAnalysis={makeMatchAnalysis()}
        tailor={tailor}
        onSaveAsBase={vi.fn()}
        onAnalyze={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to get tailor suggestions. Please try again.');
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(tailor.fetchSuggestions).toHaveBeenCalledTimes(1);
  });

  it('shows an error toast when saving the tailored CV fails', async () => {
    vi.mocked(api.saveVersion).mockResolvedValue(null);
    const { result } = renderTuneFlowHook(makeVersion());

    await act(async () => {
      await result.current.onSaveTailored({ company: 'Acme', role: 'Engineer', jobDescription: 'Need TypeScript' });
    });

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save the tailored CV. Try again.");
  });

  it('shows a reload toast and does not set active version when saved base reload has no formData', async () => {
    vi.mocked(api.saveVersion).mockResolvedValue(makeVersion({ id: 'saved-base' }));
    vi.mocked(api.getVersion).mockResolvedValue(makeVersion({ id: 'saved-base', formData: undefined }));
    const { result } = renderTuneFlowHook(null);

    await act(async () => {
      await result.current.onSaveAsBase('Base CV');
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Saved your base CV, but couldn't reload it. Refresh the page before continuing.",
    );
    expect(cvContextMock.setActiveVersion).not.toHaveBeenCalled();
  });
});
