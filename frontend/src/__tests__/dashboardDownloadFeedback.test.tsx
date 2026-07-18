import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../contexts/AppContext';
import Dashboard from '../features/dashboard/Dashboard';
import { api } from '../services/api';
import { truncateError } from '../utils/errorMessages';
import { downloadPdf } from '../utils/downloadPdf';
import type { CVFormData, CVVersion, CVVersionWithChildren } from '../types';

vi.mock('../utils/downloadPdf', () => ({
  downloadPdf: vi.fn(),
}));

vi.mock('../services/api', () => ({
  api: {
    loadUserData: vi.fn(),
    listVersions: vi.fn(),
    getVersion: vi.fn(),
    fetchTemplates: vi.fn(),
    loadTemplateContent: vi.fn(),
    importCV: vi.fn(),
    generateLatex: vi.fn(),
    compileLatex: vi.fn(),
    deleteVersion: vi.fn(),
    saveVersion: vi.fn(),
    updateVersion: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);
const mockDownloadPdf = vi.mocked(downloadPdf);

const formData: CVFormData = {
  templateId: 'med-length-proff-cv',
  personalInfo: {
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '555-0100',
    location: 'London',
    links: [],
  },
  workExperience: [],
  education: [],
  skills: [],
};

const baseMeta: CVVersionWithChildren = {
  id: 'base-1',
  name: 'Base CV',
  templateId: 'med-length-proff-cv',
  parentVersionId: null,
  createdAt: '2026-07-03T00:00:00.000Z',
  children: [],
};

const fullBase: CVVersion = {
  ...baseMeta,
  texContent: 'latex',
  formData,
};

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AppProvider>
        <Dashboard />
      </AppProvider>
    </MemoryRouter>,
  );
}

async function renderLoadedDashboard() {
  const result = renderDashboard();
  await screen.findByText('Base CV');
  await act(async () => {});
  return result;
}

describe('Dashboard download feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.loadUserData.mockResolvedValue(null);
    mockApi.fetchTemplates.mockResolvedValue([]);
    mockApi.loadTemplateContent.mockResolvedValue({ content: '', clsContent: null });
    mockApi.listVersions.mockResolvedValue({ versions: [baseMeta], ungrouped: [] });
    mockApi.getVersion.mockResolvedValue(fullBase);
    mockApi.deleteVersion.mockResolvedValue(true);
    mockApi.saveVersion.mockResolvedValue(fullBase);
    mockApi.updateVersion.mockResolvedValue(true);
    mockApi.generateLatex.mockResolvedValue({ texContent: 'latex' });
  });

  it('(f) compile fail shows a truncated error toast and clears downloading state', async () => {
    const rawError = 'LaTeX error\n'.repeat(40);
    mockApi.compileLatex.mockResolvedValue({ success: false, error: rawError, page_count: 0 });
    await renderLoadedDashboard();

    const button = screen.getByTitle('Download PDF');
    fireEvent.click(button);

    expect(await screen.findByText(`PDF compilation failed. ${truncateError(rawError)}`)).toBeInTheDocument();
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it('(g) compile success with warnings downloads the PDF and shows a warning toast', async () => {
    mockApi.compileLatex.mockResolvedValue({
      success: true,
      pdf_base64: 'PDFDATA',
      page_count: 1,
      warnings: ['First warning.', 'Second warning.'],
    });
    await renderLoadedDashboard();

    fireEvent.click(screen.getByTitle('Download PDF'));

    await waitFor(() => expect(mockDownloadPdf).toHaveBeenCalledWith('PDFDATA', 'Ada_Lovelace_CV.pdf'));
    expect(await screen.findByText('First warning. Second warning.')).toBeInTheDocument();
  });

  it('(h) compile success without pdf_base64 shows a missing-PDF toast', async () => {
    mockApi.compileLatex.mockResolvedValue({ success: true, page_count: 1 });
    await renderLoadedDashboard();

    fireEvent.click(screen.getByTitle('Download PDF'));

    expect(await screen.findByText('PDF compilation failed. The compiler did not return a PDF.')).toBeInTheDocument();
  });

  it('(i) api.compileLatex rejects with a connection-failure toast and clears downloading state', async () => {
    mockApi.compileLatex.mockRejectedValue(new Error('network down'));
    await renderLoadedDashboard();

    const button = screen.getByTitle('Download PDF');
    fireEvent.click(button);

    expect(await screen.findByText('Download failed. Check your connection and try again.')).toBeInTheDocument();
    await waitFor(() => expect(button).not.toBeDisabled());
  });
});
