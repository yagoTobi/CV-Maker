/**
 * Integration tests for T12: section-assist wiring.
 *
 * Two suites:
 *   1. applyAssistBullets – pure unit tests for the apply logic.
 *   2. AssistHarness UI tests – full component wiring (useSectionAssist +
 *      SectionAssistContext + EditableBulletList + SectionAssistPopover).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState, useCallback } from 'react';
import { useSectionAssist } from '../features/direct-edit/hooks/useSectionAssist';
import { SectionAssistContext } from '../features/direct-edit/components/editor-primitives/SectionAssistContext';
import { SectionAssistPopover } from '../features/direct-edit/components/section-assist/SectionAssistPopover';
import { EditableBulletList } from '../features/direct-edit/components/editor-primitives/EditableBulletList';
import { resolveSectionContext } from '../features/direct-edit/utils/sectionAssist';
import { applyAssistBullets } from '../features/direct-edit/utils/assistApply';
import type { SectionAssistTarget } from '../features/direct-edit/utils/sectionAssist';
import { getAtPath } from '../utils/formDataPatch';
import type { CVFormData, BulletItem } from '../types';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    generateSectionBullets: vi.fn(),
  },
}));

function makeTarget(basePath: string, index: number): SectionAssistTarget {
  return { basePath, index, getRect: () => null };
}

function makeFormData(overrides: Partial<CVFormData> = {}): CVFormData {
  return {
    templateId: 'med-length-proff-cv',
    personalInfo: { fullName: 'Test User', email: '', phone: '', location: '', links: [] },
    workExperience: [
      {
        id: 'w1',
        company: 'ACME Corp',
        title: 'Software Engineer',
        startDate: '2020',
        endDate: '2023',
        location: '',
        bullets: [{ id: 'b1', text: '' }],
      },
    ],
    education: [
      {
        id: 'e1',
        school: 'MIT',
        degree: 'Computer Science',
        startDate: '2016',
        endDate: '2020',
        location: '',
        details: [{ id: 'd1', text: '' }],
      },
    ],
    skills: [],
    projects: [{ id: 'p1', name: 'My Project', year: '2023', description: 'A project', bullets: [] }],
    awards: [],
    additionalSections: [],
    ...overrides,
  };
}

// ── applyAssistBullets unit tests ────────────────────────────────────────────

describe('applyAssistBullets', () => {
  it('replaces the empty target slot with the first bullet and inserts the rest', () => {
    const fd = makeFormData();
    const result = applyAssistBullets(
      fd,
      makeTarget('workExperience[0].bullets', 0),
      ['A', 'B', 'C'],
    );
    expect(result.workExperience[0].bullets).toHaveLength(3);
    expect(result.workExperience[0].bullets[0].text).toBe('A');
    expect(result.workExperience[0].bullets[1].text).toBe('B');
    expect(result.workExperience[0].bullets[2].text).toBe('C');
  });

  it('appends all bullets when the slot already has text (re-check)', () => {
    const fd = makeFormData({
      workExperience: [
        {
          id: 'w1', company: 'ACME', title: 'Engineer',
          startDate: '', endDate: '', location: '',
          bullets: [{ id: 'b1', text: 'existing text' }],
        },
      ],
    });
    const result = applyAssistBullets(
      fd,
      makeTarget('workExperience[0].bullets', 0),
      ['A', 'B', 'C'],
    );
    expect(result.workExperience[0].bullets).toHaveLength(4);
    expect(result.workExperience[0].bullets[0].text).toBe('existing text');
    expect(result.workExperience[0].bullets[1].text).toBe('A');
  });

  it('appends all when no slot exists (empty-starter, arr=[])', () => {
    const fd = makeFormData({
      projects: [{ id: 'p1', name: 'Proj', year: '2023', description: '', bullets: [] }],
    });
    const result = applyAssistBullets(
      fd,
      makeTarget('projects[0].bullets', 0),
      ['A', 'B', 'C'],
    );
    expect(result.projects![0].bullets).toHaveLength(3);
    expect(result.projects![0].bullets![0].text).toBe('A');
  });

  it('writes to the education[0].details path', () => {
    const fd = makeFormData();
    const result = applyAssistBullets(
      fd,
      makeTarget('education[0].details', 0),
      ['Thesis on X', 'Published in Y'],
    );
    expect(result.education[0].details).toHaveLength(2);
    expect(result.education[0].details[0].text).toBe('Thesis on X');
    expect(result.education[0].details[1].text).toBe('Published in Y');
  });

  it('returns the original formData unchanged when bullets is empty', () => {
    const fd = makeFormData();
    const result = applyAssistBullets(fd, makeTarget('workExperience[0].bullets', 0), []);
    expect(result).toBe(fd);
  });
});

// ── UI integration tests ─────────────────────────────────────────────────────

function AssistHarness({
  initialFormData,
  basePath,
}: {
  initialFormData: CVFormData;
  basePath: string;
}) {
  const [formData, setFormData] = useState(initialFormData);

  const onApply = useCallback((target: SectionAssistTarget, bullets: string[]) => {
    setFormData((prev) => applyAssistBullets(prev, target, bullets));
  }, []);

  const assist = useSectionAssist({ onApply, formData, suppressed: false });
  const resolved = assist.target
    ? resolveSectionContext(formData, assist.target.basePath)
    : null;

  const bullets = (() => {
    const arr = getAtPath(formData as unknown as Record<string, unknown>, basePath);
    return Array.isArray(arr) ? (arr as BulletItem[]) : [];
  })();

  return (
    <SectionAssistContext.Provider
      value={{ requestAssist: assist.requestAssist, suppressed: false }}
    >
      <EditableBulletList
        bullets={bullets}
        basePath={basePath}
        onBulletChange={() => undefined}
        onBulletAdd={() => undefined}
        onBulletRemove={() => undefined}
      />
      {assist.isOpen && assist.target && resolved && (
        <SectionAssistPopover
          sectionType={resolved.sectionType}
          getRect={assist.target.getRect}
          isLoading={assist.isLoading}
          error={assist.error}
          onGenerate={assist.generate}
          onClose={() => {
            const restoreEl = assist.target?.restoreFocusEl;
            assist.close();
            restoreEl?.focus();
          }}
        />
      )}
    </SectionAssistContext.Provider>
  );
}

describe('AssistHarness — section assist end-to-end', () => {
  beforeEach(() => {
    vi.mocked(api.generateSectionBullets).mockResolvedValue({
      bullets: ['Generated 1', 'Generated 2', 'Generated 3'],
      blocked: false,
    });
  });

  it('Space on empty work bullet opens the popover with section question', async () => {
    const { container } = render(
      <AssistHarness
        initialFormData={makeFormData()}
        basePath="workExperience[0].bullets"
      />,
    );
    const el = container.querySelector('[contenteditable]') as HTMLElement;
    el.textContent = '';
    fireEvent.keyDown(el, { key: ' ' });

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByText('What did you do in this role?')).toBeInTheDocument();
  });

  it('Generate applies 3 bullets to workExperience[0].bullets', async () => {
    const { container } = render(
      <AssistHarness
        initialFormData={makeFormData()}
        basePath="workExperience[0].bullets"
      />,
    );
    const el = container.querySelector('[contenteditable]') as HTMLElement;
    el.textContent = '';
    fireEvent.keyDown(el, { key: ' ' });
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Led a team' } });
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));

    await waitFor(() => {
      const editables = container.querySelectorAll('[contenteditable="plaintext-only"]');
      expect(editables).toHaveLength(3);
    });
  });

  it('education path writes to education[0].details', async () => {
    const { container } = render(
      <AssistHarness
        initialFormData={makeFormData()}
        basePath="education[0].details"
      />,
    );
    const el = container.querySelector('[contenteditable]') as HTMLElement;
    el.textContent = '';
    fireEvent.keyDown(el, { key: ' ' });
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My thesis' } });
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));

    await waitFor(() => {
      const editables = container.querySelectorAll('[contenteditable="plaintext-only"]');
      expect(editables).toHaveLength(3);
    });
  });

  it('empty-starter (projects[0].bullets=[]) appends 3 bullets', async () => {
    const { container } = render(
      <AssistHarness
        initialFormData={makeFormData()}
        basePath="projects[0].bullets"
      />,
    );
    const el = container.querySelector('[contenteditable]') as HTMLElement;
    el.textContent = '';
    fireEvent.keyDown(el, { key: ' ' });
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Built a tool' } });
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));

    await waitFor(() => {
      const editables = container.querySelectorAll('[contenteditable="plaintext-only"]');
      expect(editables).toHaveLength(3);
    });
  });

  it('closing the popover with Escape dismisses it', async () => {
    const { container } = render(
      <AssistHarness
        initialFormData={makeFormData()}
        basePath="workExperience[0].bullets"
      />,
    );
    const el = container.querySelector('[contenteditable]') as HTMLElement;
    el.textContent = '';
    fireEvent.keyDown(el, { key: ' ' });
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('close restores focus to the originating bullet element', async () => {
    const { container } = render(
      <AssistHarness
        initialFormData={makeFormData()}
        basePath="workExperience[0].bullets"
      />,
    );
    const el = container.querySelector('[contenteditable]') as HTMLElement;
    el.textContent = '';
    fireEvent.keyDown(el, { key: ' ' });
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    expect(document.activeElement).toBe(el);
  });
});
