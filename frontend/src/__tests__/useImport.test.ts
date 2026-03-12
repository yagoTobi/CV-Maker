/**
 * Tests for the useImport hook — covers JSON import flow including
 * link label derivation, validation, and state management.
 *
 * Test Scenario #4: JSON Import Link Label Derivation
 * Verifies that when importing a JSON file, URL-like link labels are
 * automatically replaced with derived platform names (e.g., "GitHub").
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useImport } from '../hooks/useImport';
import type { CVFormData } from '../types';

// Mock the api module — useImport uses api.importCV for PDF/DOCX but not JSON
vi.mock('../services/api', () => ({
  api: {
    importCV: vi.fn(),
  },
}));

/** Helper: create a mock JSON File from an object */
function makeJsonFile(data: object, filename = 'cv.json'): File {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  return new File([blob], filename, { type: 'application/json' });
}

/** Minimal valid CV data that passes the required-keys check */
function validCVData(overrides: Partial<CVFormData> = {}): object {
  return {
    personalInfo: {
      fullName: 'Test User',
      email: 'test@example.com',
      phone: '',
      location: '',
      links: [],
    },
    workExperience: [],
    education: [],
    skills: [],
    ...overrides,
  };
}

describe('useImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with no importing state', () => {
      const { result } = renderHook(() => useImport());
      expect(result.current.isImporting).toBe(false);
      expect(result.current.importProgress).toBeNull();
      expect(result.current.importError).toBeNull();
      expect(result.current.importResult).toBeNull();
    });
  });

  describe('JSON file import — happy path', () => {
    it('parses valid JSON and produces a successful result', async () => {
      const { result } = renderHook(() => useImport());
      const file = makeJsonFile(validCVData());

      await act(async () => {
        await result.current.handleFileSelected(file);
      });

      expect(result.current.importResult).not.toBeNull();
      expect(result.current.importResult!.success).toBe(true);
      expect(result.current.importResult!.source).toBe('json');
      expect(result.current.importResult!.formData).not.toBeNull();
      expect(result.current.importError).toBeNull();
      expect(result.current.isImporting).toBe(false);
    });

    it('sets templateId to "_import" for JSON imports', async () => {
      const { result } = renderHook(() => useImport());
      const file = makeJsonFile(validCVData());

      await act(async () => {
        await result.current.handleFileSelected(file);
      });

      expect(result.current.importResult!.formData!.templateId).toBe('_import');
    });

    it('strips templateId and sectionOrder from imported JSON', async () => {
      const { result } = renderHook(() => useImport());
      const file = makeJsonFile({
        ...validCVData(),
        templateId: 'some-template',
        sectionOrder: ['education', 'work'],
      });

      await act(async () => {
        await result.current.handleFileSelected(file);
      });

      // templateId should be overridden to '_import', not keep original
      expect(result.current.importResult!.formData!.templateId).toBe('_import');
      // sectionOrder should be stripped (not present in rest spread)
      expect(result.current.importResult!.formData!.sectionOrder).toBeUndefined();
    });

    it('computes correct summary counts', async () => {
      const { result } = renderHook(() => useImport());
      const data = validCVData({
        workExperience: [
          { company: 'A', title: 'Dev', startDate: '', endDate: '', location: '', bullets: [] },
          { company: 'B', title: 'PM', startDate: '', endDate: '', location: '', bullets: [] },
        ],
        education: [
          { school: 'MIT', degree: 'BS', startDate: '', endDate: '', location: '', details: [] },
        ],
        skills: [
          { category: 'Languages', skills: ['JS'] },
          { category: 'Tools', skills: ['Git'] },
        ],
      } as Partial<CVFormData>);
      const file = makeJsonFile(data);

      await act(async () => {
        await result.current.handleFileSelected(file);
      });

      const summary = result.current.importResult!.summary!;
      expect(summary.workEntries).toBe(2);
      expect(summary.educationEntries).toBe(1);
      expect(summary.skillCategories).toBe(2);
      expect(summary.projects).toBe(0);
      expect(summary.awards).toBe(0);
    });

    it('sets confidence to high for JSON imports', async () => {
      const { result } = renderHook(() => useImport());
      const file = makeJsonFile(validCVData());

      await act(async () => {
        await result.current.handleFileSelected(file);
      });

      expect(result.current.importResult!.confidence!.overall).toBe('high');
    });
  });

  describe('Test 4: JSON Import Link Label Derivation', () => {
    it('derives "GitHub" from github.com URL when label equals URL', async () => {
      const { result } = renderHook(() => useImport());
      const data = validCVData();
      (data as any).personalInfo.links = [
        { label: 'https://github.com/testuser', url: 'https://github.com/testuser' },
      ];
      const file = makeJsonFile(data);

      await act(async () => {
        await result.current.handleFileSelected(file);
      });

      const links = result.current.importResult!.formData!.personalInfo.links;
      expect(links[0].label).toBe('GitHub');
      expect(links[0].url).toBe('https://github.com/testuser');
    });

    it('preserves label "linkedin.com/in/testuser" because it does not start with http(s)://', async () => {
      /**
       * Current behavior: labels are only auto-derived when:
       * - label is empty/falsy
       * - label is whitespace-only
       * - label exactly equals the URL
       * - label starts with "http://" or "https://"
       *
       * "linkedin.com/in/testuser" does not match any of these conditions,
       * so the label is preserved as-is. This is intentional — the user
       * explicitly set this label string.
       */
      const { result } = renderHook(() => useImport());
      const data = validCVData();
      (data as any).personalInfo.links = [
        { label: 'linkedin.com/in/testuser', url: 'https://linkedin.com/in/testuser' },
      ];
      const file = makeJsonFile(data);

      await act(async () => {
        await result.current.handleFileSelected(file);
      });

      const links = result.current.importResult!.formData!.personalInfo.links;
      expect(links[0].label).toBe('linkedin.com/in/testuser');
    });

    it('derives "LinkedIn" when label starts with https://', async () => {
      const { result } = renderHook(() => useImport());
      const data = validCVData();
      (data as any).personalInfo.links = [
        { label: 'https://linkedin.com/in/testuser', url: 'https://linkedin.com/in/testuser' },
      ];
      const file = makeJsonFile(data);

      await act(async () => {
        await result.current.handleFileSelected(file);
      });

      const links = result.current.importResult!.formData!.personalInfo.links;
      expect(links[0].label).toBe('LinkedIn');
    });

    it('derives "Twitter" from twitter.com URL when label is empty', async () => {
      const { result } = renderHook(() => useImport());
      const data = validCVData();
      (data as any).personalInfo.links = [
        { label: '', url: 'https://twitter.com/testuser' },
      ];
      const file = makeJsonFile(data);

      await act(async () => {
        await result.current.handleFileSelected(file);
      });

      const links = result.current.importResult!.formData!.personalInfo.links;
      expect(links[0].label).toBe('Twitter');
    });

    it('derives labels for links matching derivation criteria in scenario #4 test JSON', async () => {
      /**
       * Test JSON from scenario #4:
       * - Link 1: label equals URL -> derives to "GitHub"
       * - Link 2: label is "linkedin.com/in/testuser" (no protocol) -> preserved as-is
       * - Link 3: label is empty -> derives to "Twitter"
       */
      const { result } = renderHook(() => useImport());
      const data = {
        personalInfo: {
          fullName: 'Test User',
          email: 'test@example.com',
          phone: '',
          location: '',
          links: [
            { label: 'https://github.com/testuser', url: 'https://github.com/testuser' },
            { label: 'linkedin.com/in/testuser', url: 'https://linkedin.com/in/testuser' },
            { label: '', url: 'https://twitter.com/testuser' },
          ],
        },
        workExperience: [],
        education: [],
        skills: [],
      };
      const file = makeJsonFile(data);

      await act(async () => {
        await result.current.handleFileSelected(file);
      });

      const links = result.current.importResult!.formData!.personalInfo.links;
      expect(links).toHaveLength(3);
      expect(links[0].label).toBe('GitHub');  // label === url -> derived
      expect(links[1].label).toBe('linkedin.com/in/testuser');  // no protocol prefix -> kept
      expect(links[2].label).toBe('Twitter');  // empty label -> derived
    });

    it('derives all labels when all links have protocol-prefixed labels', async () => {
      const { result } = renderHook(() => useImport());
      const data = {
        personalInfo: {
          fullName: 'Test User',
          email: 'test@example.com',
          phone: '',
          location: '',
          links: [
            { label: 'https://github.com/testuser', url: 'https://github.com/testuser' },
            { label: 'https://linkedin.com/in/testuser', url: 'https://linkedin.com/in/testuser' },
            { label: 'https://twitter.com/testuser', url: 'https://twitter.com/testuser' },
          ],
        },
        workExperience: [],
        education: [],
        skills: [],
      };
      const file = makeJsonFile(data);

      await act(async () => {
        await result.current.handleFileSelected(file);
      });

      const links = result.current.importResult!.formData!.personalInfo.links;
      expect(links).toHaveLength(3);
      expect(links[0].label).toBe('GitHub');
      expect(links[1].label).toBe('LinkedIn');
      expect(links[2].label).toBe('Twitter');
    });

    it('preserves custom labels that are not URL-like', async () => {
      const { result } = renderHook(() => useImport());
      const data = validCVData();
      (data as any).personalInfo.links = [
        { label: 'My Portfolio', url: 'https://mysite.dev' },
        { label: 'Blog', url: 'https://blog.example.com' },
      ];
      const file = makeJsonFile(data);

      await act(async () => {
        await result.current.handleFileSelected(file);
      });

      const links = result.current.importResult!.formData!.personalInfo.links;
      expect(links[0].label).toBe('My Portfolio');
      expect(links[1].label).toBe('Blog');
    });

    it('derives label when label contains "://" (URL-like)', async () => {
      const { result } = renderHook(() => useImport());
      const data = validCVData();
      (data as any).personalInfo.links = [
        { label: 'https://myportfolio.dev', url: 'https://myportfolio.dev' },
      ];
      const file = makeJsonFile(data);

      await act(async () => {
        await result.current.handleFileSelected(file);
      });

      const links = result.current.importResult!.formData!.personalInfo.links;
      // Label contained "://" so it gets derived to hostname
      expect(links[0].label).toBe('myportfolio.dev');
    });

    it('preserves label "researchgate.net/profile/user" because it lacks protocol prefix', async () => {
      const { result } = renderHook(() => useImport());
      const data = validCVData();
      (data as any).personalInfo.links = [
        { label: 'researchgate.net/profile/user', url: 'https://researchgate.net/profile/user' },
      ];
      const file = makeJsonFile(data);

      await act(async () => {
        await result.current.handleFileSelected(file);
      });

      const links = result.current.importResult!.formData!.personalInfo.links;
      // Not derived because label doesn't start with http(s):// and doesn't equal URL
      expect(links[0].label).toBe('researchgate.net/profile/user');
    });

    it('derives "ResearchGate" when label starts with https://', async () => {
      const { result } = renderHook(() => useImport());
      const data = validCVData();
      (data as any).personalInfo.links = [
        { label: 'https://researchgate.net/profile/user', url: 'https://researchgate.net/profile/user' },
      ];
      const file = makeJsonFile(data);

      await act(async () => {
        await result.current.handleFileSelected(file);
      });

      const links = result.current.importResult!.formData!.personalInfo.links;
      expect(links[0].label).toBe('ResearchGate');
    });
  });

  describe('JSON file import — validation errors', () => {
    it('rejects JSON missing required fields', async () => {
      const { result } = renderHook(() => useImport());
      const file = makeJsonFile({ name: 'John' }); // missing personalInfo etc.

      await act(async () => {
        await result.current.handleFileSelected(file);
      });

      expect(result.current.importError).toContain('missing required fields');
      expect(result.current.importResult).toBeNull();
    });

    it('rejects invalid JSON syntax', async () => {
      const { result } = renderHook(() => useImport());
      const blob = new Blob(['{ invalid json'], { type: 'application/json' });
      const file = new File([blob], 'bad.json', { type: 'application/json' });

      await act(async () => {
        await result.current.handleFileSelected(file);
      });

      expect(result.current.importError).toContain('Failed to parse JSON');
      expect(result.current.importResult).toBeNull();
    });

    it('rejects JSON with partial required fields', async () => {
      const { result } = renderHook(() => useImport());
      // Has personalInfo and workExperience but missing education and skills
      const file = makeJsonFile({
        personalInfo: { fullName: 'A' },
        workExperience: [],
      });

      await act(async () => {
        await result.current.handleFileSelected(file);
      });

      expect(result.current.importError).toContain('missing required fields');
    });
  });

  describe('reset', () => {
    it('clears all import state', async () => {
      const { result } = renderHook(() => useImport());
      const file = makeJsonFile(validCVData());

      await act(async () => {
        await result.current.handleFileSelected(file);
      });
      expect(result.current.importResult).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(result.current.isImporting).toBe(false);
      expect(result.current.importProgress).toBeNull();
      expect(result.current.importError).toBeNull();
      expect(result.current.importResult).toBeNull();
    });

    it('clears error state', async () => {
      const { result } = renderHook(() => useImport());
      const file = makeJsonFile({ bad: 'data' });

      await act(async () => {
        await result.current.handleFileSelected(file);
      });
      expect(result.current.importError).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(result.current.importError).toBeNull();
    });
  });

  describe('JSON import handles empty links array', () => {
    it('handles personalInfo with no links', async () => {
      const { result } = renderHook(() => useImport());
      const data = validCVData();
      // links is already empty in validCVData
      const file = makeJsonFile(data);

      await act(async () => {
        await result.current.handleFileSelected(file);
      });

      expect(result.current.importResult!.formData!.personalInfo.links).toEqual([]);
    });

    it('handles personalInfo with links missing from data', async () => {
      const { result } = renderHook(() => useImport());
      // Create data without links property
      const data = {
        personalInfo: {
          fullName: 'Test',
          email: '',
          phone: '',
          location: '',
          // no links property
        },
        workExperience: [],
        education: [],
        skills: [],
      };
      const file = makeJsonFile(data);

      await act(async () => {
        await result.current.handleFileSelected(file);
      });

      // Should succeed — links processing is guarded by Array.isArray check
      expect(result.current.importResult!.success).toBe(true);
    });
  });
});
