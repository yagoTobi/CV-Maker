/**
 * TuneRail -- fixed-width right-hand column for the Tune workflow (see CONTEXT.md).
 *
 * Switch-column stepper: a persistent Step Strip (Setup / Gap / Review) sits on top and
 * the body switches content per step. The rail NEVER resizes and NEVER stacks the steps as
 * an accordion (this supersedes Phase 13 D-09/D-10). Going back switches the column only --
 * the CV and its inline highlights are unaffected (non-destructive).
 *
 * Controlled: receives `tailor` (the useTailor return) and `matchAnalysis` from a container
 * that owns orchestration (match-analysis fetch, save, session persistence).
 */
import { useCallback, useMemo, useState } from 'react';
import type { CVFormData, CVVersionMeta, MatchAnalysis, TailorChange } from '../../../types';
import type { UseTailorReturn } from '../hooks/useTailor';
import { GapPromptChips } from './change-review/GapPromptChips';
import { scoreToFitBand } from '../../../utils/fitBand';
import styles from './TuneRail.module.css';

export type TuneStep = 'setup' | 'gap' | 'review';

export interface TuneRailProps {
  activeVersion: CVVersionMeta | null;
  formData: CVFormData;
  matchAnalysis: MatchAnalysis | null;
  tailor: UseTailorReturn;
  isAnalyzing?: boolean;
  isSaving?: boolean;
  analyzeError?: string | null;
  onSaveAsBase: (name: string) => void;
  onAnalyze?: (company: string, role: string, jobDescription: string) => void;
  onSaveTailored?: (details: { company: string; role: string; jobDescription: string }) => void;
  /** Activate a change's popover from the rail (entry point for anchorless/empty-field changes). */
  onActivateChange?: (changeId: string) => void;
}

const STEP_ORDER: readonly TuneStep[] = ['setup', 'gap', 'review'];
const STEP_LABELS: Record<TuneStep, string> = { setup: 'Setup', gap: 'Gap', review: 'Review' };

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" style={{ color: '#DC2626', fontSize: '13px', marginBottom: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
      <span>{message}</span>
      <button type="button" onClick={onRetry} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', textDecoration: 'underline', fontSize: '13px', padding: 0 }}>
        Try again
      </button>
    </div>
  );
}

export function TuneRail({
  activeVersion,
  formData,
  matchAnalysis,
  tailor,
  isAnalyzing = false,
  isSaving = false,
  analyzeError = null,
  onSaveAsBase,
  onAnalyze,
  onSaveTailored,
  onActivateChange,
}: TuneRailProps) {
  const [baseName, setBaseName] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [clarifications, setClarifications] = useState<string[]>([]);
  const [manualStep, setManualStep] = useState<TuneStep | null>(null);

  // Reachability: setup always; gap once analysis exists; review once suggestions exist.
  const isReachable = useCallback(
    (step: TuneStep): boolean => {
      if (step === 'setup') return true;
      if (step === 'gap') return matchAnalysis !== null;
      return tailor.tailorResponse !== null;
    },
    [matchAnalysis, tailor.tailorResponse],
  );

  // Furthest step the data allows.
  const maxStep: TuneStep = tailor.tailorResponse ? 'review' : matchAnalysis ? 'gap' : 'setup';

  // Displayed step: the user's manual selection while still reachable, else the furthest.
  // Effect-free: switching steps never resizes or rebuilds -- it only changes what renders.
  const activeStep: TuneStep = manualStep && isReachable(manualStep) ? manualStep : maxStep;

  const goToStep = useCallback(
    (step: TuneStep) => {
      if (isReachable(step)) setManualStep(step);
    },
    [isReachable],
  );

  const handleRunTune = useCallback(() => {
    tailor.fetchSuggestions(formData, jobDescription, company, role, clarifications);
  }, [tailor, formData, jobDescription, company, role, clarifications]);

  // Cap gap chips so the step stays uncluttered (backend also consolidates missing[] to themes).
  const gapChips = (matchAnalysis?.missing ?? []).slice(0, 5);

  // Group pending changes by section for the Review step's section list.
  const sections = useMemo(() => {
    const map = new Map<string, TailorChange[]>();
    for (const c of tailor.pendingChanges) {
      const list = map.get(c.section) ?? [];
      list.push(c);
      map.set(c.section, list);
    }
    return Array.from(map.entries()).map(([section, changes]) => ({ section, changes }));
  }, [tailor.pendingChanges]);

  const handleSkipSection = useCallback(
    (changes: TailorChange[]) => {
      for (const c of changes) tailor.skipChange(c.id);
    },
    [tailor],
  );

  const reviewedCount = tailor.appliedChanges.size + tailor.skippedChanges.size;
  const totalCount = tailor.tailorResponse?.changes.length ?? 0;

  // Score docked in the rail (supersedes D-21's floating card). Lead with the Fit Band;
  // the raw number is shown small. Falls back to the baseline match_score before any accepts.
  const displayScore =
    tailor.estimatedCurrentScore > 0 ? tailor.estimatedCurrentScore : (matchAnalysis?.match_score ?? 0);
  const fitBand = scoreToFitBand(displayScore);

  return (
    <div className={styles.rail} data-step={activeStep} role="complementary" aria-label="Tune for job">
      {/* Step Strip -- persistent; clicking a reachable step switches content (never forks). */}
      <div className={styles.stepStrip} role="tablist" aria-label="Tune steps">
        {STEP_ORDER.map((step, i) => {
          const reachable = isReachable(step);
          const isActive = step === activeStep;
          const passed = STEP_ORDER.indexOf(maxStep) > i;
          return (
            <button
              key={step}
              type="button"
              className={`${styles.step}${isActive ? ` ${styles.stepActive}` : ''}${passed ? ` ${styles.stepDone}` : ''}`}
              onClick={() => goToStep(step)}
              disabled={!reachable}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className={styles.stepDot}>{passed ? '\u2713' : i + 1}</span>
              <span className={styles.stepLabel}>{STEP_LABELS[step]}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.body}>
        {activeStep === 'setup' &&
          (activeVersion === null ? (
            <div className={styles.section}>
              <h3 className={styles.heading}>Name your base CV</h3>
              <p className={styles.hint}>Save this CV as a base before tuning it for a job.</p>
              <input
                className={styles.input}
                type="text"
                value={baseName}
                onChange={(e) => setBaseName(e.target.value)}
                placeholder="e.g. Software Engineer CV"
                aria-label="Base CV name"
              />
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => onSaveAsBase(baseName.trim())}
                disabled={!baseName.trim()}
              >
                Set as base CV
              </button>
            </div>
          ) : (
            <div className={styles.section}>
              <h3 className={styles.heading}>Target job</h3>
              <p className={styles.hint}>Using base: {activeVersion.name}</p>
              <input
                className={styles.input}
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company"
                aria-label="Company"
              />
              <input
                className={styles.input}
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Role"
                aria-label="Role"
              />
              <textarea
                className={styles.textarea}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here"
                aria-label="Job description"
                rows={8}
              />
              {analyzeError && (
                <ErrorBanner message={analyzeError} onRetry={() => onAnalyze?.(company, role, jobDescription)} />
              )}
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => onAnalyze?.(company, role, jobDescription)}
                disabled={!jobDescription.trim() || isAnalyzing}
              >
                {isAnalyzing ? 'Analyzing\u2026' : 'Find best fit'}
              </button>
            </div>
          ))}

        {activeStep === 'gap' && (
          <div className={styles.section}>
            {tailor.isLoading ? (
              <div className={styles.loadingState}>
                <div className="spinner" />
                <p className={styles.hint}>Tuning your CV against the role&hellip; this can take a few seconds.</p>
              </div>
            ) : (
              <>
                {tailor.error && <ErrorBanner message={tailor.error} onRetry={handleRunTune} />}
                <h3 className={styles.heading}>Anything we&rsquo;re missing?</h3>
                <p className={styles.hint}>Optional &mdash; add evidence for any gap, or skip straight to tuning.</p>
                <GapPromptChips
                  key={gapChips.join('|')}
                  missing={gapChips}
                  onClarificationsChange={setClarifications}
                />
                <button type="button" className={styles.primaryBtn} onClick={handleRunTune}>
                  Run CV tune
                </button>
              </>
            )}
          </div>
        )}

        {activeStep === 'review' && (
          <div className={styles.section}>
            <div className={styles.reviewHead}>
              <span className={styles.fitBand} data-band={fitBand.key}>
                <span className={styles.fitBandName}>{fitBand.name}</span>
                <span className={styles.fitScore}>{Math.round(displayScore)}</span>
              </span>
              {matchAnalysis && (
                <span className={styles.coverage}>
                  {matchAnalysis.matching.length}/{matchAnalysis.requirements.length} requirements
                </span>
              )}
            </div>
            <div className={styles.counterRow}>
              <span className={styles.counter}>
                {reviewedCount} of {totalCount} reviewed
              </span>
            </div>
            {sections.length === 0 ? (
              <p className={styles.hint}>All changes reviewed.</p>
            ) : (
              <ul className={styles.sectionList}>
                {sections.map(({ section, changes }) => (
                  <li key={section} className={styles.sectionRow}>
                    <button
                      type="button"
                      className={styles.sectionName}
                      onClick={() => {
                        const first = changes[0];
                        if (first) onActivateChange?.(first.id);
                      }}
                    >
                      {section}
                    </button>
                    <span className={styles.sectionCount}>{changes.length}</span>
                    <button
                      type="button"
                      className={styles.skipBtn}
                      onClick={() => handleSkipSection(changes)}
                    >
                      Skip section
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => onSaveTailored?.({ company, role, jobDescription })}
              disabled={tailor.appliedChanges.size < 1 || isSaving}
            >
              {isSaving ? 'Saving\u2026' : `Save tailored CV (${tailor.appliedChanges.size} accepted)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
