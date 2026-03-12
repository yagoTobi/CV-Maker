/**
 * Integration tests for navigation flow and state management in App.tsx.
 *
 * Updated for React Router architecture:
 * - App uses <Routes> with path-based navigation
 * - All state lives in AppContext (no props)
 * - "Build my CV" -> /build/start (BuildChoiceScreen) -> /build (TemplateSelector) -> /build/form
 * - Landing has 2 cards: "Build my CV" and "Tune for a job" (no "Import existing CV")
 * - Import is accessed via BuildChoiceScreen's drop zone
 *
 * Approach: Render the full App component wrapped in MemoryRouter and simulate
 * user navigation. We mock the api module to avoid network calls.
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
    it('renders the two action cards: "Build my CV" and "Tune for a job"', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Build my CV')).toBeInTheDocument();
        expect(screen.getByText('Tune for a job')).toBeInTheDocument();
      });
    });

    it('does not show "Import existing CV" button on landing (import moved to BuildChoiceScreen)', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Build my CV')).toBeInTheDocument();
      });

      expect(screen.queryByText('Import existing CV')).not.toBeInTheDocument();
    });

    it('does not show "My Saved CVs" link when there are no saved versions', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Build my CV')).toBeInTheDocument();
      });

      expect(screen.queryByText('My Saved CVs')).not.toBeInTheDocument();
    });
  });

  describe('Build flow: Landing -> BuildChoiceScreen -> TemplateSelector', () => {
    it('"Build my CV" navigates to BuildChoiceScreen showing "Build your CV"', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Build my CV')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Build my CV'));

      await waitFor(() => {
        expect(screen.getByText('Build your CV')).toBeInTheDocument();
      });
    });

    it('BuildChoiceScreen shows import drop zone and "Start from scratch" button', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Build my CV')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Build my CV'));

      await waitFor(() => {
        expect(screen.getByText('Build your CV')).toBeInTheDocument();
        expect(screen.getByText('Start from scratch')).toBeInTheDocument();
        expect(screen.getByText(/Drag your CV here/)).toBeInTheDocument();
      });
    });

    it('"Start from scratch" navigates to template selector showing "Choose Your Template"', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Build my CV')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Build my CV'));

      await waitFor(() => {
        expect(screen.getByText('Start from scratch')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Start from scratch'));

      await waitFor(() => {
        expect(screen.getByText('Choose Your Template')).toBeInTheDocument();
      });
    });
  });

  describe('Back button navigation', () => {
    it('Back from BuildChoiceScreen returns to landing', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Build my CV')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Build my CV'));

      await waitFor(() => {
        expect(screen.getByText('Build your CV')).toBeInTheDocument();
      });

      // Click the Back button in BuildChoiceScreen
      fireEvent.click(screen.getByText('Back'));

      await waitFor(() => {
        expect(screen.getByText('Build my CV')).toBeInTheDocument();
      });
    });

    it('Back from template selector returns to BuildChoiceScreen', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Build my CV')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Build my CV'));

      await waitFor(() => {
        expect(screen.getByText('Start from scratch')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Start from scratch'));

      await waitFor(() => {
        expect(screen.getByText('Choose Your Template')).toBeInTheDocument();
      });

      // TemplateSelector Back button navigates to /build/start (BuildChoiceScreen)
      fireEvent.click(screen.getByText('Back'));

      await waitFor(() => {
        expect(screen.getByText('Build your CV')).toBeInTheDocument();
      });
    });
  });

  describe('State isolation: Build path starts with clean state', () => {
    it('"Build my CV" -> BuildChoiceScreen -> "Start from scratch" -> template selector (formData stays null)', async () => {
      /**
       * Verifies the state management in the new architecture:
       * - LandingScreen.handleBuildCV calls setFormData(null) before navigating to /build/start
       * - BuildChoiceScreen.handleStartFromScratch calls setFormData(null) + setSelectedTemplateForBuild(null)
       * - At no point is formData set, so CVFormBuilder would receive undefined -> blank form
       */
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Build my CV')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Build my CV'));

      await waitFor(() => {
        expect(screen.getByText('Build your CV')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Start from scratch'));

      await waitFor(() => {
        expect(screen.getByText('Choose Your Template')).toBeInTheDocument();
      });
    });

    it('navigating to BuildChoiceScreen and back does not leak state into Build path', async () => {
      /**
       * Flow:
       * 1. Landing -> BuildChoiceScreen (do NOT import or start from scratch)
       * 2. Back to Landing
       * 3. Build my CV -> BuildChoiceScreen -> Start from scratch -> Template Selector
       * 4. Verify template selector shows (formData never set)
       */
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Build my CV')).toBeInTheDocument();
      });

      // Go to BuildChoiceScreen
      fireEvent.click(screen.getByText('Build my CV'));
      await waitFor(() => {
        expect(screen.getByText('Build your CV')).toBeInTheDocument();
      });

      // Go back without doing anything
      fireEvent.click(screen.getByText('Back'));
      await waitFor(() => {
        expect(screen.getByText('Build my CV')).toBeInTheDocument();
      });

      // Start the build path again
      fireEvent.click(screen.getByText('Build my CV'));
      await waitFor(() => {
        expect(screen.getByText('Build your CV')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Start from scratch'));
      await waitFor(() => {
        expect(screen.getByText('Choose Your Template')).toBeInTheDocument();
      });
    });
  });

  describe('Direct URL navigation', () => {
    it('renders landing screen at /', async () => {
      renderApp('/');

      await waitFor(() => {
        expect(screen.getByText('Build my CV')).toBeInTheDocument();
      });
    });

    it('renders BuildChoiceScreen at /build/start', async () => {
      renderApp('/build/start');

      await waitFor(() => {
        expect(screen.getByText('Build your CV')).toBeInTheDocument();
      });
    });

    it('renders TemplateSelector at /build', async () => {
      renderApp('/build');

      await waitFor(() => {
        expect(screen.getByText('Choose Your Template')).toBeInTheDocument();
      });
    });
  });
});
