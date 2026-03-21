import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { api } from '../services/api';

export function useCompiler() {
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Abort in-flight compilation on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const compile = useCallback(async (texContent: string, templateId?: string) => {
    // Cancel previous compilation
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsCompiling(true);
    setError(null);

    const result = await api.compileLatex(texContent, templateId, controller.signal);

    // Ignore result if aborted
    if (controller.signal.aborted) return false;

    setIsCompiling(false);

    if (result.success && result.pdf_base64) {
      setPdfBase64(result.pdf_base64);
      setError(null);
      setPageCount(result.page_count);
      setHasUnsavedChanges(false);
      return true;
    } else {
      setError(result.error || 'Unknown error');
      setPdfBase64(null);
      setPageCount(0);
      return false;
    }
  }, []);

  // Mark content as changed
  const markChanged = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  // Clear PDF state (e.g., when content changes from edit)
  const clearPdf = useCallback(() => {
    setPdfBase64(null);
    setPageCount(0);
    setHasUnsavedChanges(true);
  }, []);

  // Full reset
  const reset = useCallback(() => {
    setPdfBase64(null);
    setError(null);
    setPageCount(0);
    setHasUnsavedChanges(false);
  }, []);

  return useMemo(() => ({
    pdfBase64,
    error,
    isCompiling,
    pageCount,
    hasUnsavedChanges,
    compile,
    markChanged,
    clearPdf,
    reset,
  }), [
    pdfBase64,
    error,
    isCompiling,
    pageCount,
    hasUnsavedChanges,
    compile,
    markChanged,
    clearPdf,
    reset,
  ]);
}
