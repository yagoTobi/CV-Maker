/**
 * usePageCount -- Authoritative page count from a real LaTeX compile.
 *
 * The CSS estimate (usePageBreak) is instant but approximate; this hook returns
 * the ground truth by actually compiling the CV to a PDF and reading its page
 * count (which the backend already reports via /compile -> page_count).
 *
 * Cost control (compiles are real pdflatex subprocesses, so we must not run one
 * on every edit at scale):
 *   - GATE: only compile when the cheap estimate says we're near/over one page
 *     (estPages >= COMPILE_GATE_RATIO). Well under that, we *derive* a single
 *     page with zero backend work. The 0.8 buffer absorbs both CSS-vs-LaTeX
 *     divergence near the boundary and templates whose text band is shorter
 *     than the med-length sheet we render in the editor.
 *   - DEBOUNCE: wait for a typing pause before compiling.
 *   - DEDUPE: skip the compile if the form data hasn't changed since the last
 *     successful count.
 *   - ABORT: cancel any in-flight compile when inputs change or on unmount.
 *
 * The gated "1 page" result is derived during render rather than written to
 * state, so the effect only ever sets state from the async compile callback.
 */
import { useState, useEffect, useRef } from 'react';
import { api } from '../../../services/api';
import type { CVFormData } from '../../../types';

/** Compile only once the estimate reaches 80% of a page. */
const COMPILE_GATE_RATIO = 0.8;
const DEBOUNCE_MS = 1500;

export interface PageCountInfo {
  /** True page count for the current content, or null before one is known. */
  pageCount: number | null;
  /** A compile is currently in flight. */
  isChecking: boolean;
  /** Human-readable page-margin overflow warning from the last real compile, or null. */
  overflowWarning: string | null;
}

interface CompiledCount {
  hash: string;
  count: number;
  warning: string | null;
}

export function usePageCount(
  formData: CVFormData | null,
  estPages: number,
  enabled = true,
  forceCompile = false,
): PageCountInfo {
  const [compiled, setCompiled] = useState<CompiledCount | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // forceCompile (e.g. while the tune rail is open) bypasses the cost-saving gate so the
  // reported count is an authoritative compile during optimisation.
  const belowGate = !forceCompile && estPages < COMPILE_GATE_RATIO;

  useEffect(() => {
    // Nothing to compile: disabled, no data, or confidently single-page.
    if (!enabled || !formData || belowGate) {
      abortRef.current?.abort();
      if (belowGate) setCompiled(null);
      return;
    }

    const hash = JSON.stringify(formData);
    if (compiled?.hash === hash) return; // identical content already counted

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsChecking(true);

      const { texContent, error } = await api.generateLatex(formData);
      if (controller.signal.aborted) return;
      if (!texContent || error) {
        setIsChecking(false);
        return;
      }

      const result = await api.compileLatex(texContent, formData.templateId, controller.signal);
      if (controller.signal.aborted) return;

      setIsChecking(false);
      if (result.success) {
        setCompiled({
          hash,
          count: result.page_count || 1,
          warning: result.warnings?.length ? result.warnings.join(' ') : null,
        });
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [formData, belowGate, enabled, compiled]);

  // Cancel any in-flight compile on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Derive the reported count: gated -> 1, otherwise the last compiled count.
  let pageCount: number | null;
  if (!enabled || !formData) {
    pageCount = null;
  } else if (belowGate) {
    pageCount = 1;
  } else {
    pageCount = compiled?.count ?? null;
  }

  const overflowWarning: string | null =
    !enabled || !formData ? null
    : belowGate ? null
    : compiled?.warning ?? null;

  return { pageCount, isChecking, overflowWarning };
}
