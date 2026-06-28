/**
 * useTuneFlow -- orchestration for the new (rail) Tune flow. Owns the useTailor instance,
 * match analysis, save-as-base / save-tailored, post-save navigation, and composes
 * useInlineReview for the on-CV highlight layer.
 *
 * Unlike the legacy TunePanel (which previews into a read-only CV), this flow keeps the CV
 * live-editable: accepting a change writes straight back to formData via onApply -> setFormData.
 *
 * Mounted only behind the `?tune=rail` flag in DirectEditPage; the legacy TunePanel path is
 * untouched. Session persistence is intentionally omitted for this first cut.
 */
import { useCallback, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../services/api';
import { useCVContext } from '../../../contexts/CVContext';
import { useTailor } from './useTailor';
import { useInlineReview } from './useInlineReview';
import type { CVFormData, CVVersion, MatchAnalysis } from '../../../types';

export interface UseTuneFlowParams {
  formData: CVFormData | null;
  activeVersion: CVVersion | null;
  cvContainerRef: RefObject<HTMLElement | null>;
}

export function useTuneFlow({ formData, activeVersion, cvContainerRef }: UseTuneFlowParams) {
  const navigate = useNavigate();
  const { setActiveVersion, setFormData } = useCVContext();

  const [matchAnalysis, setMatchAnalysis] = useState<MatchAnalysis | null>(null);
  const [baselineScore, setBaselineScore] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  const [flowKey, setFlowKey] = useState(0);
  const savedBaseIdRef = useRef<string | null>(null);

  const tailor = useTailor({
    originalFormData: formData,
    templateId: formData?.templateId ?? null,
    onApply: async (newFormData: CVFormData) => {
      // Live CV: accepting a change writes straight to formData (no read-only preview).
      setFormData(newFormData);
    },
  });

  const inlineReview = useInlineReview({ tailor, containerRef: cvContainerRef });

  const onSaveAsBase = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || !formData) return;
      const { texContent } = await api.generateLatex(formData);
      const saved = await api.saveVersion({
        name: trimmed,
        templateId: formData.templateId,
        texContent: texContent || '',
        formData,
      });
      if (saved) {
        const full = await api.getVersion(saved.id);
        if (full) setActiveVersion(full);
      }
    },
    [formData, setActiveVersion],
  );

  const onAnalyze = useCallback(
    async (company: string, _role: string, jobDescription: string) => {
      if (!jobDescription.trim() || !formData) return;
      setIsAnalyzing(true);
      const { texContent } = await api.generateLatex(formData);
      if (!texContent) {
        setIsAnalyzing(false);
        return;
      }
      const analysis = await api.getMatchAnalysis(texContent, jobDescription, company);
      if (analysis) {
        setMatchAnalysis(analysis);
        setBaselineScore(analysis.match_score);
        tailor.setBaselineScore(analysis.match_score);
      }
      setIsAnalyzing(false);
    },
    [formData, tailor],
  );

  const onSaveTailored = useCallback(
    async (details: { company: string; role: string; jobDescription: string }) => {
      if (!activeVersion || !formData) return;
      setIsSaving(true);
      const { texContent } = await api.generateLatex(formData);
      if (!texContent) {
        setIsSaving(false);
        return;
      }
      const score = tailor.estimatedCurrentScore;
      const versionName = [details.company, details.role].filter(Boolean).join(' ') || 'Job Application';
      const saved = await api.saveVersion({
        name: versionName,
        templateId: activeVersion.templateId,
        texContent,
        formData,
        jobDescription: details.jobDescription,
        companyName: details.company,
        role: details.role,
        matchScore: score,
        baselineMatchScore: baselineScore,
        parentVersionId: activeVersion.id,
      });
      if (saved) {
        savedBaseIdRef.current = activeVersion.id;
        setSavedSuccessfully(true);
      }
      setIsSaving(false);
    },
    [activeVersion, formData, baselineScore, tailor],
  );

  const resetFlow = useCallback(() => {
    tailor.reset();
    setMatchAnalysis(null);
    setBaselineScore(0);
    setSavedSuccessfully(false);
    setFlowKey((k) => k + 1);
  }, [tailor]);

  const onTuneAnotherJob = useCallback(() => resetFlow(), [resetFlow]);

  const onBackToOriginal = useCallback(async () => {
    const baseId = savedBaseIdRef.current;
    setSavedSuccessfully(false);
    if (baseId) {
      const base = await api.getVersion(baseId);
      if (base?.formData) {
        setFormData(base.formData);
        setActiveVersion(base);
      }
    }
    resetFlow();
  }, [resetFlow, setActiveVersion, setFormData]);

  const onViewInDashboard = useCallback(() => {
    const baseId = savedBaseIdRef.current;
    navigate('/dashboard', baseId ? { state: { baseId } } : undefined);
  }, [navigate]);

  const onDismissPostSave = useCallback(() => setSavedSuccessfully(false), []);

  return {
    tailor,
    inlineReview,
    matchAnalysis,
    isAnalyzing,
    isSaving,
    savedSuccessfully,
    flowKey,
    onSaveAsBase,
    onAnalyze,
    onSaveTailored,
    onTuneAnotherJob,
    onBackToOriginal,
    onViewInDashboard,
    onDismissPostSave,
  };
}
