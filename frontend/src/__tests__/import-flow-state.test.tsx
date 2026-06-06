/**
 * Integration tests for navigation flow and state management in App.tsx.
 *
 * Updated for Phase 7 inline expansion architecture:
 * - "Build my CV" click expands inline BuildExpansionPanel (no route navigation)
 * - "Apply to job" click behavior depends on baseline CV count
 * - /build/start route removed entirely
 * - TemplateSelector back button navigates to / (landing)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

// ---- Mocks ----

// Mock the api module — include all methods that AppContext and hooks call
vi.mock('../services/api', () => ({
  api: {
    loadUserData: vi.fn().mockResolvedValue(null),
    listVersions: vi.fn().mockResolvedValue({ versions: [], ungrouped: [] }),
    getVersion: vi.fn().mockResolvedValue(null),
    fetchTemplates: vi.fn().mockResolvedValue([
      { id: 'med-length-proff-cv', name: 'Professional CV', description: 'A clean layout', previewUrl: '/preview1.png' },
      { id: 'deedy-resume', name: 'Deedy Resume', description: 'Two column', previewUrl: '/preview2.png' },
      { id: 'mcdowell-cv', name: 'McDowell CV', description: 'ATS friendly', previewUrl: '/preview3.png' },
    ]),
    loadTemplateContent: vi.fn().mockResolvedValue({ content: '\\documentclass{article}', clsContent: null }),
    importCV: vi.fn(),
    generateLatex: vi.fn().mockResolvedValue({ texContent: '\\documentclass{article}\\begin{document}Test\\end{document}' }),
    compileLatex: vi.fn().mockResolvedValue({ success: true, pdf_base64: 'AAAA', page_count: 1 }),
  },
}));

/** Render App wrapped in MemoryRouter starting at the given path */
function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>
  );
}

describe('Navigation Flow State Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Landing screen', () => {
    it('renders two action cards: "Build my CV" and "Tune for a role" (NAV-01 partial)', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Build my CV')).toBeInTheDocument();
        expect(screen.getByText('Tune for a role')).toBeInTheDocument();
      });

      // Both cards start collapsed
      const buildCard = screen.getByText('Build my CV').closest('button');
      const tuneCard = screen.getByText('Tune for a role').closest('button');
      expect(buildCard).toHaveAttribute('aria-expanded', 'false');
      expect(tuneCard).toHaveAttribute('aria-expanded', 'false');
    });

    it('does not show "My Saved CVs" link when there are no saved versions', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Build my CV')).toBeInTheDocument();
      });

      expect(screen.queryByText('My Saved CVs')).not.toBeInTheDocument();
    });
  });

  describe('Build flow: inline expansion', () => {
    it('"Build my CV" expands inline panel with drop zone and scratch card (NAV-01)', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Build my CV')).toBeInTheDocument();
      });

      const buildCard = screen.getByText('Build my CV').closest('button')!;
      fireEvent.click(buildCard);

      await waitFor(() => {
        expect(screen.getByText(/Drag your CV here/)).toBeInTheDocument();
        expect(screen.getByText('Start from scratch')).toBeInTheDocument();
      });

      // Should NOT show old BuildChoiceScreen heading
      expect(screen.queryByText('Build your CV')).not.toBeInTheDocument();

      // Card should now be expanded
      expect(buildCard).toHaveAttribute('aria-expanded', 'true');
    });

    it('"Start from scratch" navigates to template selector (NAV-02)', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Build my CV')).toBeInTheDocument();
      });

      const buildCard = screen.getByText('Build my CV').closest('button')!;
      fireEvent.click(buildCard);

      await waitFor(() => {
        expect(screen.getByText('Start from scratch')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Start from scratch'));

      await waitFor(() => {
        expect(screen.getByText('Choose Your Template')).toBeInTheDocument();
      });
    });

    it('clicking Build card again collapses the panel', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Build my CV')).toBeInTheDocument();
      });

      const buildCard = screen.getByText('Build my CV').closest('button')!;
      fireEvent.click(buildCard);

      await waitFor(() => {
        expect(screen.getByText(/Drag your CV here/)).toBeInTheDocument();
      });

      // Click again to collapse
      fireEvent.click(buildCard);

      await waitFor(() => {
        expect(screen.queryByText(/Drag your CV here/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Tune flow: branching by baseline CV count', () => {
    it('Tune with 0 baseline CVs shows empty state panel (NAV-04)', async () => {
      // Default mock returns empty versions
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Apply to job')).toBeInTheDocument();
      });

      const tuneCard = screen.getByText('Apply to job').closest('button')!;
      fireEvent.click(tuneCard);

      await waitFor(() => {
        expect(screen.getByText('No baseline CV yet')).toBeInTheDocument();
      });

      // The CTA button inside the panel also says "Build my CV"
      const ctaButtons = screen.getAllByText('Build my CV');
      // At least 2: one in the card heading, one in the CTA
      expect(ctaButtons.length).toBeGreaterThanOrEqual(2);
    });

    it('Tune with exactly 1 baseline CV loads version and navigates to /build/form with tune state (NAV-03)', async () => {
      const { api } = await import('../services/api');
      vi.mocked(api.listVersions).mockResolvedValue({
        versions: [
          { id: 'base-1', name: 'My CV', templateId: 'med-length-proff-cv', createdAt: '2026-01-01T00:00:00Z', children: [] },
        ],
        ungrouped: [],
      });
      vi.mocked(api.getVersion).mockResolvedValue({
        id: 'base-1',
        name: 'My CV',
        templateId: 'med-length-proff-cv',
        texContent: '\\documentclass{article}',
        formData: null,
        createdAt: '2026-01-01T00:00:00Z',
      } as Awaited<ReturnType<typeof api.getVersion>>);

      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Apply to job')).toBeInTheDocument();
      });

      const tuneCard = screen.getByText('Apply to job').closest('button')!;
      fireEvent.click(tuneCard);

      // Should navigate away from landing — Apply to job card should disappear
      await waitFor(() => {
        expect(screen.queryByText('Apply to job')).not.toBeInTheDocument();
      });

      // Verify api.getVersion was called with the baseline CV id
      expect(api.getVersion).toHaveBeenCalledWith('base-1');
    });

    it('Tune with 2+ baseline CVs shows CV picker panel (NAV-05)', async () => {
      const { api } = await import('../services/api');
      vi.mocked(api.listVersions).mockResolvedValue({
        versions: [
          { id: 'base-1', name: 'My Professional CV', templateId: 'med-length-proff-cv', createdAt: '2026-01-01T00:00:00Z', children: [] },
          { id: 'base-2', name: 'My Technical CV', templateId: 'med-length-proff-cv', createdAt: '2026-02-01T00:00:00Z', children: [] },
        ],
        ungrouped: [],
      });

      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Apply to job')).toBeInTheDocument();
      });

      const tuneCard = screen.getByText('Apply to job').closest('button')!;
      fireEvent.click(tuneCard);

      await waitFor(() => {
        expect(screen.getByText('Choose a baseline CV')).toBeInTheDocument();
      });

      expect(screen.getByText('My Professional CV')).toBeInTheDocument();
      expect(screen.getByText('My Technical CV')).toBeInTheDocument();
    });
  });

  describe('Route removal and redirects', () => {
    it('/build/start returns 404 (NAV-06)', async () => {
      renderApp('/build/start');

      await waitFor(() => {
        expect(screen.getByText(/Page not found/)).toBeInTheDocument();
      });

      expect(screen.getByText('Go to home')).toBeInTheDocument();
    });

    it('renders landing at / (unchanged)', async () => {
      renderApp('/');

      await waitFor(() => {
        expect(screen.getByText('Build my CV')).toBeInTheDocument();
      });
    });

    it('renders TemplateSelector at /build (unchanged)', async () => {
      renderApp('/build');

      await waitFor(() => {
        expect(screen.getByText('Choose Your Template')).toBeInTheDocument();
      });
    });
  });

  describe('NavBar and TemplateSelector navigation', () => {
    it('TemplateSelector Back button navigates to landing (NAV-08)', async () => {
      renderApp('/build');

      await waitFor(() => {
        expect(screen.getByText('Choose Your Template')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Back'));

      await waitFor(() => {
        expect(screen.getByText('Build my CV')).toBeInTheDocument();
      });
    });

    it('NavBar shows logo only (no My CVs, no + New CV) on non-editor pages (D-08, D-13)', async () => {
      renderApp('/dashboard');

      await waitFor(() => {
        expect(screen.getByText('CV Maker')).toBeInTheDocument();
      });

      // D-08: My CVs link removed from NavBar on non-editor pages
      expect(screen.queryByText('My CVs')).not.toBeInTheDocument();
      // D-13: + New CV only appears inside CVSwitcherDropdown (editor pages), not globally
      expect(screen.queryByText('+ New CV')).not.toBeInTheDocument();
    });
  });
});
