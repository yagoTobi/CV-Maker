/**
 * useSectionAssist -- gates the per-section AI bullet-generation popover.
 *
 * Responsibilities:
 * - requestAssist(target): opens the popover only when not suppressed, not
 *   already open, and the target basePath resolves to a supported section.
 * - generate(answer, focus?): calls api.generateSectionBullets behind an
 *   AbortController + monotonic requestId. A result is applied via onApply only
 *   when it is fresh (requestId not superseded, controller not aborted),
 *   non-blocked, and non-empty.
 * - close(): aborts any in-flight request; the resulting cancellation is
 *   swallowed silently (no error surfaced).
 *
 * Callbacks read live props through refs so requestAssist/generate/close keep a
 * stable identity, and the returned object is memoized (mirrors useTailor).
 */
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { CVFormData, SectionAssistRequest } from '../../../types';
import type { SectionAssistTarget } from '../utils/sectionAssist';
import { resolveSectionContext } from '../utils/sectionAssist';
import { getAtPath } from '../../../utils/formDataPatch';
import { api } from '../../../services/api';

const RATE_LIMIT_MESSAGE = "You're going a bit fast \u2014 try again in a moment";
const GENERIC_ERROR_MESSAGE = "Couldn't generate right now \u2014 try again";

interface UseSectionAssistProps {
  onApply: (target: SectionAssistTarget, bullets: string[]) => void;
  formData: CVFormData | null;
  suppressed: boolean;
}

export interface UseSectionAssistReturn {
  isOpen: boolean;
  target: SectionAssistTarget | null;
  isLoading: boolean;
  error: string | null;
  requestAssist: (target: SectionAssistTarget) => void;
  generate: (answer: string, focus?: string) => Promise<void>;
  close: () => void;
}

/** Pull the non-empty bullet texts at basePath, for the existingBullets hint. */
function readExistingBullets(formData: CVFormData, basePath: string): string[] | undefined {
  const raw = getAtPath(formData as unknown as Record<string, unknown>, basePath);
  if (!Array.isArray(raw)) return undefined;
  const texts = raw
    .map((item) =>
      item && typeof item === 'object' && 'text' in item
        ? String((item as { text: unknown }).text)
        : '',
    )
    .filter((text) => text.trim().length > 0);
  return texts.length > 0 ? texts : undefined;
}

export function useSectionAssist({
  onApply,
  formData,
  suppressed,
}: UseSectionAssistProps): UseSectionAssistReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [target, setTarget] = useState<SectionAssistTarget | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Monotonic id: a generate() result is only applied when its id is still current.
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Mirror props/state into refs (updated in an effect, not during render, to
  // satisfy react-hooks/refs) so the callbacks stay identity-stable while still
  // reading fresh values — without this the memoized return churns every keystroke.
  const onApplyRef = useRef(onApply);
  const formDataRef = useRef<CVFormData | null>(formData);
  const suppressedRef = useRef(suppressed);
  const isOpenRef = useRef(isOpen);
  const targetRef = useRef<SectionAssistTarget | null>(target);
  useEffect(() => {
    onApplyRef.current = onApply;
    formDataRef.current = formData;
    suppressedRef.current = suppressed;
    isOpenRef.current = isOpen;
    targetRef.current = target;
  });

  // Abort any in-flight request on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  const requestAssist = useCallback((next: SectionAssistTarget) => {
    if (suppressedRef.current) return;
    if (isOpenRef.current) return;
    const currentFormData = formDataRef.current;
    if (!currentFormData) return;
    if (!resolveSectionContext(currentFormData, next.basePath)) return;
    setError(null);
    setTarget(next);
    setIsOpen(true);
  }, []);

  const generate = useCallback(async (answer: string, focus?: string) => {
    const currentFormData = formDataRef.current;
    const currentTarget = targetRef.current;
    if (!currentFormData || !currentTarget) return;
    const resolved = resolveSectionContext(currentFormData, currentTarget.basePath);
    if (!resolved) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;

    setIsLoading(true);
    setError(null);

    const request: SectionAssistRequest = {
      sectionType: resolved.sectionType as SectionAssistRequest['sectionType'],
      entryContext: resolved.entryContext,
      userAnswer: answer,
      focus,
      existingBullets: readExistingBullets(currentFormData, currentTarget.basePath),
    };

    try {
      const result = await api.generateSectionBullets(request, controller.signal);

      // Drop superseded / cancelled completions before touching any state.
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;

      if (!result) {
        setError(GENERIC_ERROR_MESSAGE);
        setIsLoading(false);
        return;
      }
      if (result.blocked) {
        setError(result.reason === 'rate-limited' ? RATE_LIMIT_MESSAGE : result.reason ?? GENERIC_ERROR_MESSAGE);
        setIsLoading(false);
        return;
      }
      if (result.bullets.length === 0) {
        setIsLoading(false);
        return;
      }

      onApplyRef.current(currentTarget, result.bullets);
      setIsLoading(false);
      setIsOpen(false);
      setTarget(null);
    } catch (err) {
      // Cancellation (close / supersede / unmount) is expected and silent.
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (err instanceof Error && err.name === 'CanceledError') return;
      setError(GENERIC_ERROR_MESSAGE);
      setIsLoading(false);
    }
  }, []);

  const close = useCallback(() => {
    abortRef.current?.abort();
    setIsOpen(false);
    setTarget(null);
    setIsLoading(false);
    setError(null);
  }, []);

  return useMemo(
    () => ({ isOpen, target, isLoading, error, requestAssist, generate, close }),
    [isOpen, target, isLoading, error, requestAssist, generate, close],
  );
}
