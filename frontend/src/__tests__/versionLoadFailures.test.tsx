import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createRef, useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../contexts/ToastContext';
import { JobProvider } from '../contexts/JobContext';
import { CVProvider, useCVContext } from '../contexts/CVContext';
import { ToolsProvider, useToolsContext } from '../contexts/ToolsContext';
import DirectEditPage from '../features/direct-edit/DirectEditPage';
import { CVSwitcherDropdown } from '../features/direct-edit/components/CVSwitcherDropdown';
import { useTuneFlow } from '../features/direct-edit/hooks/useTuneFlow';
import LandingScreen from '../features/landing/LandingScreen';
import { TuneExpansionPanel } from '../features/landing/TuneExpansionPanel';
import { api } from '../services/api';
import type { CVFormData, CVVersion, CVVersionMeta } from '../types';

const LOAD_FAILURE = "Couldn't load that CV. Check your connection and try again.";
const EMPTY_SAVED_VERSIONS: CVVersionMeta[] = [];
let serverSavedVersions: CVVersionMeta[] = EMPTY_SAVED_VERSIONS;

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => ({ state: null }),
  };
});

vi.mock('@aws-amplify/ui-react', () => ({
  useAuthenticator: () => ({ authStatus: 'authenticated' }),
}));

vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn().mockResolvedValue({ tokens: { idToken: { payload: { sub: 'user-1' } } } }),
  signOut: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../contexts/EditorActionsContext', () => ({
  useSetEditorActions: () => vi.fn(),
}));

vi.mock('../features/direct-edit/hooks/useAutoSave', () => ({
  useAutoSave: () => ({ status: 'idle', retry: vi.fn() }),
}));

vi.mock('../features/direct-edit/hooks/usePageBreak', () => ({
  usePageBreak: () => ({ offsets: [], estPages: 0 }),
}));

vi.mock('../features/direct-edit/hooks/usePageCount', () => ({
  usePageCount: () => ({ pageCount: 1, isChecking: false, overflowWarning: null }),
}));

vi.mock('../features/direct-edit/components/MedLengthTemplate', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  return {
    MedLengthTemplate: React.forwardRef<HTMLDivElement, { formData: CVFormData }>(function MockMedLengthTemplate(
      { formData },
      ref,
    ) {
      return (
        <div ref={ref} data-testid="editor-template">
          {formData.personalInfo.fullName || 'Empty Template'}
        </div>
      );
    }),
  };
});

vi.mock('../features/direct-edit/components/TuneRail', () => ({
  TuneRail: () => <aside data-testid="tune-rail" />,
}));

vi.mock('../features/direct-edit/components/change-review/ChangePopover', () => ({
  ChangePopover: () => <div data-testid="change-popover" />,
}));

vi.mock('../features/direct-edit/components/section-assist/SectionAssistPopover', () => ({
  SectionAssistPopover: () => <div data-testid="section-assist-popover" />,
}));

vi.mock('../features/direct-edit/components/PostSavePrompt', () => ({
  PostSavePrompt: () => null,
}));

vi.mock('../services/api', () => ({
  api: {
    fetchTemplates: vi.fn(),
    loadTemplateContent: vi.fn(),
    loadUserData: vi.fn(),
    listVersions: vi.fn(),
    getVersion: vi.fn(),
    generateLatex: vi.fn(),
    compileLatex: vi.fn(),
    saveVersion: vi.fn(),
    updateVersionFull: vi.fn(),
    suggestTailorChanges: vi.fn(),
    generateSectionBullets: vi.fn(),
  },
}));

function makeFormData(fullName = 'Jane Doe'): CVFormData {
  return {
    templateId: 'med-length-proff-cv',
    sectionOrder: ['work', 'education', 'skills', 'projects', 'awards'],
    personalInfo: { fullName, email: '', phone: '', location: '', links: [] },
    workExperience: [],
    education: [],
    skills: [],
    projects: [],
    awards: [],
    additionalSections: [],
  };
}

function makeVersion(overrides: Partial<CVVersion> = {}): CVVersion {
  return {
    id: 'version-1',
    name: 'Base CV',
    templateId: 'med-length-proff-cv',
    texContent: 'tex',
    formData: makeFormData(),
    createdAt: '2026-07-18T00:00:00Z',
    ...overrides,
  };
}

function makeVersionMeta(overrides: Partial<CVVersionMeta> = {}): CVVersionMeta {
  return {
    id: 'version-1',
    name: 'Base CV',
    templateId: 'med-length-proff-cv',
    createdAt: '2026-07-18T00:00:00Z',
    ...overrides,
  };
}

interface SeedProps {
  readonly savedVersions?: CVVersionMeta[];
  readonly formData?: CVFormData | null;
  readonly activeVersion?: CVVersion | null;
  readonly selectedTemplate?: string | null;
}

function CVStateSeeder({ savedVersions = EMPTY_SAVED_VERSIONS, formData, activeVersion, selectedTemplate }: SeedProps) {
  const { setSavedVersions, setFormData, setActiveVersion, setSelectedTemplateForBuild } = useCVContext();

  useEffect(() => {
    setSavedVersions(savedVersions);
    if (formData !== undefined) setFormData(formData);
    if (activeVersion !== undefined) setActiveVersion(activeVersion);
    if (selectedTemplate !== undefined) setSelectedTemplateForBuild(selectedTemplate);
  }, [activeVersion, formData, savedVersions, selectedTemplate, setActiveVersion, setFormData, setSavedVersions, setSelectedTemplateForBuild]);

  return null;
}

function ActiveVersionProbe() {
  const { activeVersion } = useCVContext();
  return <span data-testid="active-version-id">{activeVersion?.id ?? 'none'}</span>;
}

function Providers({ children, seed }: { readonly children: ReactNode; readonly seed?: SeedProps }) {
  return (
    <MemoryRouter>
      <ToastProvider>
        <JobProvider>
          <CVProvider>
            <ToolsProvider>
              <CVStateSeeder {...seed} />
              {children}
            </ToolsProvider>
          </CVProvider>
        </JobProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

function renderWithProviders(ui: ReactNode, seed?: SeedProps) {
  serverSavedVersions = seed?.savedVersions ?? EMPTY_SAVED_VERSIONS;
  return render(<Providers seed={seed}>{ui}</Providers>);
}

function SwitchVersionHarness() {
  const { handleSwitchVersion } = useToolsContext();
  return (
    <button type="button" onClick={() => void handleSwitchVersion('missing-version')}>
      Switch version
    </button>
  );
}

async function clickVersionNamed(name: string): Promise<void> {
  const label = await screen.findByText(name);
  const button = label.closest('button');
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`No version button found for ${name}`);
  }
  fireEvent.click(button);
}

describe('version load failures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    vi.mocked(api.fetchTemplates).mockResolvedValue([]);
    vi.mocked(api.loadTemplateContent).mockResolvedValue({ content: '', clsContent: null });
    vi.mocked(api.loadUserData).mockResolvedValue(null);
    serverSavedVersions = EMPTY_SAVED_VERSIONS;
    vi.mocked(api.listVersions).mockImplementation(async () => ({ versions: serverSavedVersions, ungrouped: [] }));
    vi.mocked(api.getVersion).mockResolvedValue(makeVersion());
    vi.mocked(api.generateLatex).mockResolvedValue({ texContent: 'tex' });
    vi.mocked(api.compileLatex).mockResolvedValue({ success: true, pdf_base64: 'pdf', page_count: 1 });
    vi.mocked(api.saveVersion).mockResolvedValue(makeVersion({ id: 'tailored-version' }));
    vi.mocked(api.updateVersionFull).mockResolvedValue(true);
    vi.mocked(api.suggestTailorChanges).mockResolvedValue(null);
    vi.mocked(api.generateSectionBullets).mockResolvedValue(null);
  });

  it('(a) TuneExpansionPanel toasts and does not navigate when getVersion returns null', async () => {
    vi.mocked(api.getVersion).mockResolvedValue(null);

    renderWithProviders(<TuneExpansionPanel onBuildClick={vi.fn()} />, {
      savedVersions: [makeVersionMeta()],
    });

    await clickVersionNamed('Base CV');

    expect(await screen.findByRole('alert')).toHaveTextContent(LOAD_FAILURE);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('(a) TuneExpansionPanel toasts and does not navigate when getVersion returns no formData', async () => {
    vi.mocked(api.getVersion).mockResolvedValue(makeVersion({ formData: undefined }));

    renderWithProviders(<TuneExpansionPanel onBuildClick={vi.fn()} />, {
      savedVersions: [makeVersionMeta()],
    });

    await clickVersionNamed('Base CV');

    expect(await screen.findByRole('alert')).toHaveTextContent(LOAD_FAILURE);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('(a2) LandingScreen fast path toasts and does not navigate when getVersion returns null', async () => {
    vi.mocked(api.getVersion).mockResolvedValue(null);

    renderWithProviders(<LandingScreen />, {
      savedVersions: [makeVersionMeta()],
    });

    await screen.findByRole('button', { name: /cv workspace/i });
    fireEvent.click(await screen.findByRole('button', { name: /apply to job/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(LOAD_FAILURE);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('(b) DirectEditPage bootstrap shows recovery panel instead of empty editor when getVersion returns null', async () => {
    window.sessionStorage.setItem('cv-maker:active-version-id', 'missing-version');
    vi.mocked(api.getVersion).mockResolvedValue(null);

    renderWithProviders(<DirectEditPage />);

    expect(await screen.findByText("Couldn't load your CV.")).toBeTruthy();
    expect(screen.queryByTestId('editor-template')).toBeNull();
  });

  it('(b2) DirectEditPage bootstrap shows recovery panel when getVersion returns no formData', async () => {
    window.sessionStorage.setItem('cv-maker:active-version-id', 'broken-version');
    vi.mocked(api.getVersion).mockResolvedValue(makeVersion({ formData: undefined }));

    renderWithProviders(<DirectEditPage />);

    expect(await screen.findByText("Couldn't load your CV.")).toBeTruthy();
    expect(screen.queryByTestId('editor-template')).toBeNull();
  });

  it('(c) Start fresh renders an empty template, clears stored id, and clears activeVersion', async () => {
    window.sessionStorage.setItem('cv-maker:active-version-id', 'broken-version');
    vi.mocked(api.getVersion).mockResolvedValue(null);

    renderWithProviders(
      <>
        <ActiveVersionProbe />
        <DirectEditPage />
      </>,
      { activeVersion: makeVersion({ id: 'stale-version' }) },
    );

    fireEvent.click(await screen.findByRole('button', { name: /start fresh/i }));

    expect(await screen.findByTestId('editor-template')).toHaveTextContent('Empty Template');
    expect(window.sessionStorage.getItem('cv-maker:active-version-id')).toBeNull();
    expect(screen.getByTestId('active-version-id')).toHaveTextContent('none');
  });

  it('(d) Retry loads a good version and renders its data', async () => {
    window.sessionStorage.setItem('cv-maker:active-version-id', 'retry-version');
    vi.mocked(api.getVersion)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeVersion({ id: 'retry-version', formData: makeFormData('Retry Name') }));

    renderWithProviders(<DirectEditPage />);

    fireEvent.click(await screen.findByRole('button', { name: /retry/i }));

    expect(await screen.findByTestId('editor-template')).toHaveTextContent('Retry Name');
  });

  it('(e) ToolsContext handleSwitchVersion toasts when getVersion returns null', async () => {
    vi.mocked(api.getVersion).mockResolvedValue(null);

    renderWithProviders(<SwitchVersionHarness />);

    fireEvent.click(await screen.findByRole('button', { name: /switch version/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(LOAD_FAILURE);
  });

  it('(f) CVSwitcherDropdown toasts and closes when getVersion returns null', async () => {
    const onClose = vi.fn();
    vi.mocked(api.getVersion).mockResolvedValue(null);

    renderWithProviders(<CVSwitcherDropdown isOpen onClose={onClose} />, {
      savedVersions: [makeVersionMeta()],
    });

    fireEvent.click(await screen.findByRole('button', { name: /base cv/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(LOAD_FAILURE);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('(g) useTuneFlow onBackToOriginal toasts when getVersion returns null', async () => {
    const baseVersion = makeVersion({ id: 'base-version' });
    vi.mocked(api.saveVersion).mockResolvedValue(makeVersion({ id: 'tailored-version' }));
    vi.mocked(api.getVersion).mockResolvedValue(null);

    const { result } = renderHook(
      () => useTuneFlow({ formData: makeFormData(), activeVersion: baseVersion, cvContainerRef: createRef<HTMLElement>() }),
      { wrapper: ({ children }) => <Providers>{children}</Providers> },
    );

    await act(async () => {
      await result.current.onSaveTailored({ company: 'Acme', role: 'Engineer', jobDescription: 'Need TypeScript' });
    });
    expect(result.current.savedSuccessfully).toBe(true);

    await act(async () => {
      await result.current.onBackToOriginal();
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(LOAD_FAILURE);
    await waitFor(() => expect(result.current.savedSuccessfully).toBe(false));
  });
});
