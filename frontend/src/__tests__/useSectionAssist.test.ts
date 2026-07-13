/**
 * Tests for useSectionAssist hook (T9, TDD-first).
 *
 * The hook gates a per-section AI bullet-generation popover:
 * - requestAssist(target): no-op when suppressed, already open, or the target
 *   basePath does not resolve to a supported section (e.g. skills).
 * - generate(answer, focus?): calls api.generateSectionBullets behind an
 *   AbortController + requestId staleness guard; invokes onApply(target,
 *   bullets) only for a fresh, non-empty, non-blocked result.
 * - close(): aborts any in-flight request; cancellation is silent (no error).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { CVFormData, SectionAssistResult } from '../types';
import type { SectionAssistTarget } from '../features/direct-edit/utils/sectionAssist';

const mockGenerate = vi.fn();
vi.mock('../services/api', () => ({
  api: {
    generateSectionBullets: (...args: unknown[]) => mockGenerate(...args) as unknown,
  },
}));

// Import after mocking so the hook binds to the mocked api.
const { useSectionAssist } = await import('../features/direct-edit/hooks/useSectionAssist');

function makeFormData(): CVFormData {
  return {
    templateId: 'med-length-proff-cv',
    personalInfo: { fullName: 'Jane', email: '', phone: '', location: '', links: [] },
    workExperience: [
      {
        id: 'w1',
        company: 'Acme Corp',
        title: 'Senior Engineer',
        startDate: '2020',
        endDate: '2023',
        location: 'NYC',
        bullets: [{ id: 'b1', text: '' }],
      },
    ],
    education: [],
    skills: [{ id: 's1', category: 'Languages', skills: [{ id: 'sk1', text: 'TypeScript' }] }],
  };
}

function workTarget(): SectionAssistTarget {
  return { basePath: 'workExperience[0].bullets', index: 0, getRect: () => null };
}

function skillsTarget(): SectionAssistTarget {
  return { basePath: 'skills[0].skills', index: 0, getRect: () => null };
}

describe('useSectionAssist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Given a fresh success, When generate() runs, Then api is called and onApply gets the bullets', async () => {
    const onApply = vi.fn();
    mockGenerate.mockResolvedValueOnce({
      bullets: ['Led team of 5', 'Shipped feature in 2 weeks'],
      blocked: false,
    } satisfies SectionAssistResult);

    const { result } = renderHook(() =>
      useSectionAssist({ onApply, formData: makeFormData(), suppressed: false }),
    );

    act(() => {
      result.current.requestAssist(workTarget());
    });
    expect(result.current.isOpen).toBe(true);

    await act(async () => {
      await result.current.generate('I led a team', 'leadership');
    });

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        sectionType: 'work',
        userAnswer: 'I led a team',
        focus: 'leadership',
      }),
      expect.anything(),
    );
    expect(onApply).toHaveBeenCalledTimes(1);
    const [, bullets] = onApply.mock.calls[0] as [SectionAssistTarget, string[]];
    expect(bullets).toEqual(['Led team of 5', 'Shipped feature in 2 weeks']);
  });

  it('Given api returns null, When generate() runs, Then error is set and onApply is NOT called', async () => {
    const onApply = vi.fn();
    mockGenerate.mockResolvedValueOnce(null);

    const { result } = renderHook(() =>
      useSectionAssist({ onApply, formData: makeFormData(), suppressed: false }),
    );

    act(() => {
      result.current.requestAssist(workTarget());
    });
    await act(async () => {
      await result.current.generate('answer');
    });

    expect(onApply).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Couldn't generate right now \u2014 try again");
  });

  it('Given an empty non-blocked result, When generate() runs, Then onApply is NOT called', async () => {
    const onApply = vi.fn();
    mockGenerate.mockResolvedValueOnce({ bullets: [], blocked: false } satisfies SectionAssistResult);

    const { result } = renderHook(() =>
      useSectionAssist({ onApply, formData: makeFormData(), suppressed: false }),
    );

    act(() => {
      result.current.requestAssist(workTarget());
    });
    await act(async () => {
      await result.current.generate('answer');
    });

    expect(onApply).not.toHaveBeenCalled();
  });

  it('Given a superseded request, When the stale call resolves, Then onApply runs only for the fresh result', async () => {
    const onApply = vi.fn();
    let resolveFirst: (value: SectionAssistResult) => void = () => {};
    mockGenerate
      .mockImplementationOnce(
        () =>
          new Promise<SectionAssistResult>((res) => {
            resolveFirst = res;
          }),
      )
      .mockImplementationOnce(() =>
        Promise.resolve({ bullets: ['second'], blocked: false } satisfies SectionAssistResult),
      );

    const { result } = renderHook(() =>
      useSectionAssist({ onApply, formData: makeFormData(), suppressed: false }),
    );

    const target = workTarget();
    act(() => {
      result.current.requestAssist(target);
    });

    let firstPromise: Promise<void> = Promise.resolve();
    act(() => {
      firstPromise = result.current.generate('first');
    });
    await act(async () => {
      await result.current.generate('second');
    });
    await act(async () => {
      resolveFirst({ bullets: ['first-stale'], blocked: false });
      await firstPromise;
    });

    expect(onApply).toHaveBeenCalledTimes(1);
    const [, bullets] = onApply.mock.calls[0] as [SectionAssistTarget, string[]];
    expect(bullets).toEqual(['second']);
  });

  it('Given suppressed=true, When requestAssist() runs, Then it is a no-op (popover stays closed)', () => {
    const onApply = vi.fn();
    const { result } = renderHook(() =>
      useSectionAssist({ onApply, formData: makeFormData(), suppressed: true }),
    );

    act(() => {
      result.current.requestAssist(workTarget());
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.target).toBeNull();
  });

  it('Given an unsupported skills path, When requestAssist() runs, Then it is a no-op', () => {
    const onApply = vi.fn();
    const { result } = renderHook(() =>
      useSectionAssist({ onApply, formData: makeFormData(), suppressed: false }),
    );

    act(() => {
      result.current.requestAssist(skillsTarget());
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.target).toBeNull();
  });

  it('Given a valid work path, When requestAssist() runs, Then the popover opens with that target', () => {
    const onApply = vi.fn();
    const target = workTarget();
    const { result } = renderHook(() =>
      useSectionAssist({ onApply, formData: makeFormData(), suppressed: false }),
    );

    act(() => {
      result.current.requestAssist(target);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.target).toBe(target);
  });

  it('Given an in-flight request, When close() aborts it, Then cancellation is silent (no error)', async () => {
    const onApply = vi.fn();
    mockGenerate.mockImplementationOnce(
      (_req: unknown, signal: AbortSignal) =>
        new Promise<SectionAssistResult>((_res, reject) => {
          signal.addEventListener('abort', () => {
            const err = new Error('canceled');
            err.name = 'CanceledError';
            reject(err);
          });
        }),
    );

    const { result } = renderHook(() =>
      useSectionAssist({ onApply, formData: makeFormData(), suppressed: false }),
    );

    act(() => {
      result.current.requestAssist(workTarget());
    });

    let genPromise: Promise<void> = Promise.resolve();
    act(() => {
      genPromise = result.current.generate('answer');
    });
    await act(async () => {
      result.current.close();
      await genPromise;
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isOpen).toBe(false);
    expect(onApply).not.toHaveBeenCalled();
  });
});
