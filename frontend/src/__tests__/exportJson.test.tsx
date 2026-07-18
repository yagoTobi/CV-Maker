import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLocation } from 'react-router-dom';
import { useEditorActions } from '../contexts/EditorActionsContext';
import { NavBar } from '../components/NavBar';
import { downloadJson } from '../utils/downloadJson';
import { generateCVJsonFilename } from '../utils/cvFilename';
import type { CVFormData } from '../types';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: vi.fn(),
}));

vi.mock('../contexts/EditorActionsContext', () => ({
  useEditorActions: vi.fn(),
}));

vi.mock('../features/direct-edit/components/CVSwitcherDropdown', () => ({
  CVSwitcherDropdown: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="cv-switcher-dropdown" /> : null,
}));

const mockUseLocation = vi.mocked(useLocation);
const mockUseEditorActions = vi.mocked(useEditorActions);

const minimalCvData: CVFormData = {
  templateId: 'med-length-proff-cv',
  sectionOrder: ['work', 'education', 'skills'],
  personalInfo: {
    fullName: 'John Doe',
    email: 'john@example.com',
    phone: '',
    location: '',
    links: [],
  },
  workExperience: [],
  education: [],
  skills: [],
};

describe('JSON export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('creates an object URL, clicks a JSON anchor, and revokes the URL', () => {
    let clickedAnchor: HTMLAnchorElement | null = null;
    const createObjectUrl = vi.fn(() => 'blob:cv-json');
    const revokeObjectUrl = vi.fn();
    URL.createObjectURL = createObjectUrl;
    URL.revokeObjectURL = revokeObjectUrl;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click(this: HTMLAnchorElement) {
      clickedAnchor = this;
    });

    downloadJson(minimalCvData, 'John_Doe_CV.json');

    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(clickedAnchor?.download).toBe('John_Doe_CV.json');
    expect(clickedAnchor?.href).toBe('blob:cv-json');
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:cv-json');
    expect(document.querySelector('a')).not.toBeInTheDocument();
  });

  it('serializes a payload that round-trips with required import keys', async () => {
    let exportedBlob: Blob | null = null;
    const createObjectUrl = vi.fn((blob: Blob | MediaSource) => {
      if (blob instanceof Blob) exportedBlob = blob;
      return 'blob:cv-json';
    });
    URL.createObjectURL = createObjectUrl;
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadJson(minimalCvData, 'John_Doe_CV.json');

    const text = await exportedBlob?.text();
    expect(text).toBeDefined();
    const parsed: unknown = JSON.parse(text ?? '{}');
    expect(parsed).toHaveProperty('personalInfo');
    expect(parsed).toHaveProperty('workExperience');
    expect(parsed).toHaveProperty('education');
    expect(parsed).toHaveProperty('skills');
  });

  it('generates a JSON CV filename without spaces', () => {
    const filename = generateCVJsonFilename({ fullName: 'John Doe' });

    expect(filename).toMatch(/\.json$/);
    expect(filename).not.toContain(' ');
  });

  it('renders Export JSON on editor pages and fires onExportJson when clicked', () => {
    const onExportJson = vi.fn();
    mockUseLocation.mockReturnValue({ pathname: '/build/form' });
    mockUseEditorActions.mockReturnValue({
      onDownload: vi.fn(),
      onExportJson,
      onTuneForJob: vi.fn(),
      saveStatus: 'saved',
      isDownloading: false,
      isTuning: false,
      isTunedVersion: false,
      cvName: 'My Test CV',
      tuneCompanyName: '',
      tuneRole: '',
      pageCount: null,
      isCheckingPageCount: false,
      onRetrySave: vi.fn(),
      overflowWarning: null,
    });

    render(<NavBar />);

    fireEvent.click(screen.getByRole('button', { name: 'Export JSON' }));
    expect(onExportJson).toHaveBeenCalledTimes(1);
  });
});
