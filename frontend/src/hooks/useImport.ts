import { useState, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import type { CVFormData, CVImportResponse, ImportConfidence, ImportSummary } from '../types';
import { deriveLinkLabel } from '../utils/deriveLinkLabel';

export interface ImportProgress {
  message: string;
  step: number;
  totalSteps: number;
}

export interface UseImportReturn {
  isImporting: boolean;
  importProgress: ImportProgress | null;
  importError: string | null;
  importResult: CVImportResponse | null;
  handleFileSelected: (file: File) => Promise<void>;
  reset: () => void;
}

const REQUIRED_JSON_KEYS = ['personalInfo', 'workExperience', 'education', 'skills'];

export function useImport(): UseImportReturn {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<CVImportResponse | null>(null);

  const reset = useCallback(() => {
    setIsImporting(false);
    setImportProgress(null);
    setImportError(null);
    setImportResult(null);
  }, []);

  const handleFileSelected = useCallback(async (file: File) => {
    setImportError(null);
    setImportResult(null);

    // JSON files are parsed client-side — no backend round trip needed
    if (file.name.toLowerCase().endsWith('.json')) {
      setIsImporting(true);
      setImportProgress({ message: 'Reading file...', step: 1, totalSteps: 2 });
      try {
        const text = await file.text();
        setImportProgress({ message: 'Validating JSON...', step: 2, totalSteps: 2 });
        const parsed = JSON.parse(text);

        if (!REQUIRED_JSON_KEYS.every(k => k in parsed)) {
          setImportError('Invalid CV data file: missing required fields (personalInfo, workExperience, education, skills).');
          return;
        }

        // Strip fields that get set later during template selection
        const { templateId: _, sectionOrder: __, ...rest } = parsed;

        // Process personalInfo.links to derive labels
        if (rest.personalInfo?.links && Array.isArray(rest.personalInfo.links) && rest.personalInfo.links.length > 0) {
          rest.personalInfo.links = rest.personalInfo.links.map((link: { label?: string; url?: string; [key: string]: unknown }) => {
            if (!link || typeof link !== 'object') return link;

            // If label is empty, equals URL, or looks like a URL/domain, derive it
            const lbl = (link.label || '').trim();
            const shouldDerive = (
              !lbl ||
              lbl === link.url ||
              lbl.startsWith('http://') ||
              lbl.startsWith('https://') ||
              (lbl.includes('.') && !lbl.includes(' '))
            );

            if (shouldDerive && link.url) {
              return {
                ...link,
                label: deriveLinkLabel(link.url),
              };
            }
            return link;
          });
        }

        const result: CVImportResponse = {
          success: true,
          formData: { templateId: '_import', ...rest } as CVFormData,
          source: 'json',
          confidence: { overall: 'high', fields: {} } as ImportConfidence,
          summary: {
            workEntries: (rest.workExperience || []).length,
            educationEntries: (rest.education || []).length,
            skillCategories: (rest.skills || []).length,
            projects: (rest.projects || []).length,
            awards: (rest.awards || []).length,
          } as ImportSummary,
          warnings: null,
          error: null,
        };

        setImportResult(result);
      } catch {
        setImportError('Failed to parse JSON file. Ensure it is valid JSON.');
      } finally {
        setIsImporting(false);
        setImportProgress(null);
      }
      return;
    }

    // PDF / DOCX — send to backend for AI extraction
    setIsImporting(true);
    setImportProgress({ message: 'Reading file...', step: 1, totalSteps: 4 });

    // Use a ref to track if we should continue updating progress
    const progressActive = { current: true };

    // Simulated progress updates
    const updateProgress = async () => {
      await new Promise(r => setTimeout(r, 600));
      if (progressActive.current) {
        setImportProgress({ message: 'Analyzing structure...', step: 2, totalSteps: 4 });
      }

      await new Promise(r => setTimeout(r, 1000));
      if (progressActive.current) {
        setImportProgress({ message: 'Extracting data...', step: 3, totalSteps: 4 });
      }

      await new Promise(r => setTimeout(r, 1200));
      if (progressActive.current) {
        setImportProgress({ message: 'Almost done...', step: 4, totalSteps: 4 });
      }
    };

    // Start progress updates and API call in parallel
    const [result] = await Promise.all([
      api.importCV(file),
      updateProgress()
    ]);

    // Stop progress updates
    progressActive.current = false;

    setIsImporting(false);
    setImportProgress(null);

    if (!result.success) {
      setImportError(result.error || 'Failed to extract CV data.');
      return;
    }

    setImportResult(result);
  }, []);

  return useMemo(() => ({
    isImporting,
    importProgress,
    importError,
    importResult,
    handleFileSelected,
    reset,
  }), [
    isImporting,
    importProgress,
    importError,
    importResult,
    handleFileSelected,
    reset,
  ]);
}
