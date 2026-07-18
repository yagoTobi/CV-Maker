import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProvider } from '../contexts/AppContext';
import Dashboard from '../features/dashboard/Dashboard';
import { api } from '../services/api';
import type { CVFormData, CVVersion, CVVersionMeta, CVVersionWithChildren } from '../types';

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

const childOne: CVVersionMeta = {
  id: 'app-1',
  name: 'Acme Staff Engineer',
  templateId: 'med-length-proff-cv',
  companyName: 'Acme',
  role: 'Staff Engineer',
  parentVersionId: 'base-1',
  createdAt: '2026-07-01T00:00:00.000Z',
};

const childTwo: CVVersionMeta = {
  id: 'app-2',
  name: 'Globex Principal Engineer',
  templateId: 'med-length-proff-cv',
  companyName: 'Globex',
  role: 'Principal Engineer',
  parentVersionId: 'base-1',
  createdAt: '2026-07-02T00:00:00.000Z',
};

const baseMeta: CVVersionWithChildren = {
  id: 'base-1',
  name: 'Base CV',
  templateId: 'med-length-proff-cv',
  parentVersionId: null,
  createdAt: '2026-07-03T00:00:00.000Z',
  children: [childOne, childTwo],
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

describe('Dashboard delete confirmation and load failure feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.loadUserData.mockResolvedValue(null);
    mockApi.fetchTemplates.mockResolvedValue([]);
    mockApi.loadTemplateContent.mockResolvedValue({ content: '', clsContent: null });
    mockApi.listVersions.mockResolvedValue({ versions: [baseMeta], ungrouped: [] });
    mockApi.getVersion.mockResolvedValue(fullBase);
    mockApi.deleteVersion.mockResolvedValue(true);
    mockApi.saveVersion.mockResolvedValue({ ...fullBase, id: 'base-copy', name: 'Base CV (copy)' });
    mockApi.updateVersion.mockResolvedValue(true);
    mockApi.generateLatex.mockResolvedValue({ texContent: 'latex' });
    mockApi.compileLatex.mockResolvedValue({ success: true, pdf_base64: 'AA==', page_count: 1 });
  });

  it('(a) click delete on base with 2 children shows dialog and does not remove immediately', async () => {
    await renderLoadedDashboard();

    fireEvent.click(screen.getByTitle('Delete baseline CV'));

    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'Delete "Base CV"? Its 2 application(s) will move to Ungrouped.',
    );
    expect(mockApi.deleteVersion).not.toHaveBeenCalled();
  });

  it('(b) Confirm removes the base CV', async () => {
    await renderLoadedDashboard();

    fireEvent.click(screen.getByTitle('Delete baseline CV'));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(mockApi.deleteVersion).toHaveBeenCalledWith('base-1'));
  });

  it('(c) Cancel leaves the base CV untouched', async () => {
    await renderLoadedDashboard();

    fireEvent.click(screen.getByTitle('Delete baseline CV'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mockApi.deleteVersion).not.toHaveBeenCalled();
  });

  it('(d) failed open shows a load-failure toast', async () => {
    mockApi.getVersion.mockResolvedValue(null);
    await renderLoadedDashboard();

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(await screen.findByText("Couldn't load that CV. Check your connection and try again.")).toBeInTheDocument();
  });

  it('(e) failed duplicate shows a load-failure toast', async () => {
    mockApi.getVersion.mockResolvedValue(null);
    await renderLoadedDashboard();

    fireEvent.click(screen.getByTitle('Duplicate baseline CV'));

    expect(await screen.findByText("Couldn't load that CV. Check your connection and try again.")).toBeInTheDocument();
  });
});
