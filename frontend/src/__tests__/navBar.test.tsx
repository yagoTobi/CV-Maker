/**
 * navBar.test.tsx
 *
 * Tests for NavBar CV identity display (D-05 through D-08).
 * NavBar reads editorActions from EditorActionsContext and location from useLocation.
 * Both are mocked here so NavBar can be rendered in isolation.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NavBar } from '../components/NavBar';

// Mock react-router-dom: useNavigate + useLocation
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: vi.fn(),
}));

// Mock EditorActionsContext
vi.mock('../contexts/EditorActionsContext', () => ({
  useEditorActions: vi.fn(),
}));

// Mock CVSwitcherDropdown (self-contained, tested separately)
vi.mock('../features/direct-edit/components/CVSwitcherDropdown', () => ({
  CVSwitcherDropdown: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="cv-switcher-dropdown" /> : null,
}));

import { useLocation } from 'react-router-dom';
import { useEditorActions } from '../contexts/EditorActionsContext';

const mockUseLocation = useLocation as ReturnType<typeof vi.fn>;
const mockUseEditorActions = useEditorActions as ReturnType<typeof vi.fn>;

function makeEditorActions(overrides = {}) {
  return {
    onDownload: vi.fn(),
    onTuneForJob: vi.fn(),
    saveStatus: 'saved' as const,
    isDownloading: false,
    isTuning: false,
    cvName: 'My Test CV',
    tuneCompanyName: '',
    tuneRole: '',
    ...overrides,
  };
}

describe('NavBar — CV identity display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('D-05: renders CVNameButton with cv name when isEditorPage and not tuning', () => {
    mockUseLocation.mockReturnValue({ pathname: '/build/form' });
    mockUseEditorActions.mockReturnValue(makeEditorActions());

    render(<NavBar />);

    expect(screen.getByText('My Test CV')).toBeInTheDocument();
    expect(screen.queryByText('My CVs')).not.toBeInTheDocument();
  });

  it('D-06: CVSwitcherDropdown opens on CVNameButton click', () => {
    mockUseLocation.mockReturnValue({ pathname: '/build/form' });
    mockUseEditorActions.mockReturnValue(makeEditorActions());

    render(<NavBar />);

    // Dropdown not visible initially
    expect(screen.queryByTestId('cv-switcher-dropdown')).not.toBeInTheDocument();

    // Click CVNameButton — dropdown opens
    fireEvent.click(screen.getByText('My Test CV'));
    expect(screen.getByTestId('cv-switcher-dropdown')).toBeInTheDocument();
  });

  it('D-07: renders breadcrumb [cvName] / [tuneCompanyName] when isTuning', () => {
    mockUseLocation.mockReturnValue({ pathname: '/build/form' });
    mockUseEditorActions.mockReturnValue(
      makeEditorActions({ isTuning: true, tuneCompanyName: 'Google', tuneRole: 'SWE' })
    );

    render(<NavBar />);

    expect(screen.getByText('My Test CV')).toBeInTheDocument();
    expect(screen.getByText('/')).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();
    // CVNameButton should NOT be present (breadcrumb replaces it)
    expect(screen.queryByRole('button', { name: /My Test CV/ })).not.toBeInTheDocument();
  });

  it('D-08: shows logo only (no CVNameButton, no My CVs link) on non-editor pages', () => {
    mockUseLocation.mockReturnValue({ pathname: '/dashboard' });
    mockUseEditorActions.mockReturnValue(null);

    render(<NavBar />);

    expect(screen.getByText('CV Maker')).toBeInTheDocument();
    expect(screen.queryByText('My CVs')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cv-switcher-dropdown')).not.toBeInTheDocument();
  });
});
