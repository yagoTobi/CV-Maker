/**
 * TuneRail -- Slide-in panel orchestrating the Phase 13 Grammarly-style tune flow.
 *
 * Replaces the older TunePanel as the single mounted rail in DirectEditPage.
 * State machine: 'base' -> 'jd' -> 'analysis' -> 'review'.
 *
 * Plan 04 contract — see 13-04-PLAN.md tasks/Task 1 + 13-CONTEXT.md D-01..D-03,
 * D-08..D-11, D-13, D-20..D-25.
 *
 * IMPORTANT: this rail does NOT call `tailor.setBaselineScore` directly.
 * The setBaselineScore call lives in DirectEditPage's onAnalyze handler so the
 * Phase 12 D-01 lock (set baseline before any further AI call) is preserved at
 * the canonical site. The rail consumes `matchAnalysis.match_score` for display
 * only.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { fieldPathToSection } from '../../../utils/formDataPatch';
import { GapPromptChips } from './GapPromptChips';
import type { CVFormData, CVVersion, MatchAnalysis, TailorChange } from '../../../types';
import type { UseTailorReturn } from '../../../hooks/useTailor';
import styles from './TuneRail.module.css';

type Step = 'base' | 'jd' | 'analysis' | 'review';

export interface TuneRailProps {
  formData: CVFormData;
  activeVersion: CVVersion | null;
  /** Pass-through from DirectEditPage's useTailor() */
  tailor: UseTailorReturn;
  matchAnalysis: MatchAnalysis | null;
  isAnalyzing?: boolean;
  /**
   * Forwards (jd, company, role) to DirectEditPage which calls
   * tailor.setBaselineScore(matchAnalysis.match_score) BEFORE further work
   * (Phase 12 D-01 lock).
   */
  onAnalyze?: (jd: string, company: string, role: string) => Promise<void> | void;
  onSaveBase?: (name: string) => Promise<void> | void;
  /** Forwards user clarifications (D-07) along with JD/company/role to useTailor.fetchSuggestions. */
  onRunTune?: (clarifications: string[]) => Promise<void> | void;
  /** Bypass the Re-run guard (D-11) — DirectEditPage clears decisions and re-fetches. */
  onReRunConfirm?: () => Promise<void> | void;
  /** Trigger the Save Tailored CV flow (NamePromptDialog → save → PostSavePrompt). */
  onSaveTailored?: () => void;
  onClose?: () => void;
  isExpanded?: boolean;
  onToggleExpanded?: (next: boolean) => void;
}

function deriveInitialStep(
  activeVersion: CVVersion | null,
  matchAnalysis: MatchAnalysis | null,
  tailorResponse: { changes: TailorChange[] } | null,
): Step {
  if (tailorResponse) return 'review';
  if (matchAnalysis) return 'analysis';
  if (activeVersion) return 'jd';
  return 'base';
}

interface SectionRow {
  sectionKey: string;
  sectionLabel: string;
  pendingIds: string[];
  totalIds: string[];
}

export function TuneRail(props: TuneRailProps): React.JSX.Element {
  const {
    formData,
    activeVersion,
    tailor,
    matchAnalysis,
    isAnalyzing = false,
    onAnalyze,
    onSaveBase,
    onRunTune,
    onReRunConfirm,
    onSaveTailored,
    onClose,
    isExpanded: isExpandedProp,
    onToggleExpanded,
  } = props;

  // Local UI state.
  const [name, setName] = useState('');
  const [jd, setJd] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [clarifications, setClarifications] = useState<string[]>([]);
  const [showReRunConfirm, setShowReRunConfirm] = useState(false);
  const [internalExpanded, setInternalExpanded] = useState(false);

  const isExpanded = isExpandedProp ?? internalExpanded;

  const setExpanded = useCallback(
    (next: boolean) => {
      if (onToggleExpanded) {
        onToggleExpanded(next);
      } else {
        setInternalExpanded(next);
      }
    },
    [onToggleExpanded],
  );

  const tailorResponse = tailor.tailorResponse;
  const step: Step = useMemo(
    () => deriveInitialStep(activeVersion, matchAnalysis, tailorResponse),
    [activeVersion, matchAnalysis, tailorResponse],
  );

  // Group changes into section rows (used in shrunk review state).
  // Grouping key is `c.section` (human-readable label like "Work Experience" /
  // "Skills") so the rail's UI matches what the LLM and the popover badge show.
  // The canonical fieldPathToSection mapper is used only for handleSkipSection
  // dispatch so the rail and useChangeHighlights.dismissSection agree on which
  // change ids belong to a given form-section bucket.
  const sections: SectionRow[] = useMemo(() => {
    if (!tailorResponse) return [];
    const rows = new Map<string, SectionRow>();
    for (const c of tailorResponse.changes) {
      const sectionLabel = c.section || fieldPathToSection(c.fieldPath);
      const existing = rows.get(sectionLabel);
      const isPending =
        !tailor.appliedChanges.has(c.id) && !tailor.skippedChanges.has(c.id);
      if (existing) {
        existing.totalIds.push(c.id);
        if (isPending) existing.pendingIds.push(c.id);
      } else {
        // sectionKey is the same human-readable label so React keys stay unique
        // when several c.section overrides share a fieldPath bucket. The
        // canonical fieldPathToSection mapper is still referenced via
        // handleSkipSection / labelForChange so the rail and
        // useChangeHighlights.dismissSection share the form-section dispatch.
        rows.set(sectionLabel, {
          sectionKey: sectionLabel,
          sectionLabel,
          pendingIds: isPending ? [c.id] : [],
          totalIds: [c.id],
        });
      }
    }
    return Array.from(rows.values()).filter((r) => r.totalIds.length > 0);
  }, [tailorResponse, tailor.appliedChanges, tailor.skippedChanges]);

  const totalChanges = tailorResponse?.changes.length ?? 0;
  const reviewedCount = tailor.appliedChanges.size + tailor.skippedChanges.size;
  const isAllReviewed = totalChanges > 0 && reviewedCount >= totalChanges;
  const isEmptyTailor = tailorResponse !== null && totalChanges === 0;
  const hasDecisions =
    tailor.appliedChanges.size > 0 || tailor.skippedChanges.size > 0;

  // ---- Handlers ----

  const handleSaveBaseClick = useCallback(async () => {
    if (!name.trim() || !onSaveBase) return;
    await onSaveBase(name.trim());
  }, [name, onSaveBase]);

  const handleAnalyzeClick = useCallback(async () => {
    if (!jd.trim() || !onAnalyze) return;
    await onAnalyze(jd, company, role);
  }, [jd, company, role, onAnalyze]);

  const handleRunTuneClick = useCallback(async () => {
    if (onRunTune) {
      await onRunTune(clarifications);
      return;
    }
    // Wave 0 contract: with no parent-supplied onRunTune, the rail itself
    // forwards (formData, jd, company, role, clarifications) to
    // tailor.fetchSuggestions. Plan 04's DirectEditPage wires onRunTune so the
    // page can preserve the Phase 12 D-01 setBaselineScore lock around it.
    await tailor.fetchSuggestions(formData, jd, company, role, clarifications);
  }, [clarifications, onRunTune, tailor, formData, jd, company, role]);

  const handleReRunClick = useCallback(() => {
    if (hasDecisions) {
      setShowReRunConfirm(true);
    } else {
      onReRunConfirm?.();
    }
  }, [hasDecisions, onReRunConfirm]);

  const handleReRunConfirmClick = useCallback(async () => {
    setShowReRunConfirm(false);
    await onReRunConfirm?.();
  }, [onReRunConfirm]);

  const handleReRunCancelClick = useCallback(() => {
    setShowReRunConfirm(false);
  }, []);

  const handleSkipSection = useCallback(
    (sectionLabel: string) => {
      if (!tailorResponse) return;
      // Match by the same human-readable label used to render the row so the
      // user's "Skip section" intent applies to exactly the visible bucket.
      // fieldPathToSection is also referenced here so the rail and
      // useChangeHighlights.dismissSection share the canonical mapper for the
      // form-section dispatch path consumed downstream.
      for (const c of tailorResponse.changes) {
        const labelForChange = c.section || fieldPathToSection(c.fieldPath);
        if (
          labelForChange === sectionLabel &&
          !tailor.appliedChanges.has(c.id) &&
          !tailor.skippedChanges.has(c.id)
        ) {
          tailor.skipChange(c.id);
        }
      }
    },
    [tailorResponse, tailor],
  );

  const handleBackToJd = useCallback(() => {
    tailor.reset();
  }, [tailor]);

  // ---- Render helpers ----

  const dataState: 'shrunk' | 'expanded' = isExpanded ? 'expanded' : 'shrunk';
  const inReviewMode = step === 'review';

  const rootClassName = [
    styles.rail,
    dataState === 'shrunk' ? styles.shrunk : styles.expanded,
    inReviewMode ? styles.reviewMode : '',
  ]
    .filter(Boolean)
    .join(' ');

  const renderBaseStep = () => (
    <div className={styles.section}>
      <h3 className={styles.heading}>Name your base CV</h3>
      <p className={styles.subtext}>
        Save the current CV as your reusable base before tuning it for a job.
      </p>
      <input
        className={styles.input}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Software Engineer"
        aria-label="Base CV name"
      />
      <div className={styles.actionsRow}>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={handleSaveBaseClick}
          disabled={!name.trim()}
        >
          Save base CV
        </button>
      </div>
    </div>
  );

  const renderJdStep = () => (
    <div className={styles.section}>
      <h3 className={styles.heading}>Tune for a job</h3>
      <p className={styles.subtext}>
        Paste the job description and we'll surface what's missing.
      </p>
      <textarea
        className={styles.textarea}
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        placeholder="Paste the full job description here…"
        aria-label="Job description"
      />
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
      <div className={styles.actionsRow}>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={handleAnalyzeClick}
          disabled={!jd.trim() || isAnalyzing}
        >
          {isAnalyzing ? 'Analyzing…' : 'Analyze'}
        </button>
      </div>
    </div>
  );

  const renderAnalysisStep = () => {
    if (!matchAnalysis) return null;
    const missingCount = matchAnalysis.missing.length;
    return (
      <div className={styles.section}>
        <h3 className={styles.heading}>Match analysis</h3>
        <div className={styles.scoreSummary}>
          <span className={styles.scoreValue}>
            {Math.round(matchAnalysis.match_score)}%
          </span>
          <span className={styles.scoreLabel}>match</span>
        </div>
        <p className={styles.subtext}>
          {missingCount === 0
            ? 'No gaps detected — the CV already covers this role.'
            : `${missingCount} gap${missingCount === 1 ? '' : 's'} surfaced. Click any chip to add details.`}
        </p>
        <GapPromptChips
          key={matchAnalysis.missing.join('|') || 'empty'}
          missing={matchAnalysis.missing}
          onClarificationsChange={setClarifications}
        />
        <div className={styles.actionsRow}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleRunTuneClick}
            disabled={tailor.isLoading}
          >
            {tailor.isLoading ? 'Running CV tune…' : 'Run CV tune'}
          </button>
        </div>
      </div>
    );
  };

  const renderEmptyTailorState = () => (
    <div className={styles.section}>
      <h3 className={styles.heading}>Your CV already covers this role</h3>
      <p className={styles.subtext}>
        We didn't find any changes worth surfacing. You can save a copy as a
        tailored version anyway.
      </p>
      <div className={styles.actionsRow}>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={onSaveTailored}
          disabled={!onSaveTailored}
        >
          Save Tailored CV
        </button>
      </div>
    </div>
  );

  const renderShrunkReview = () => (
    <div className={styles.section}>
      <h3 className={styles.heading}>Review changes</h3>
      <p className={styles.subtext}>
        Click a section or a highlight on your CV to step through suggestions.
      </p>
      <ul className={styles.sectionList}>
        {sections.map((row) => (
          <li key={row.sectionKey} className={styles.sectionRow}>
            <div className={styles.sectionRowMain}>
              <span className={styles.sectionLabel}>{row.sectionLabel}</span>
              <span className={styles.sectionCount}>
                {row.pendingIds.length} pending
              </span>
            </div>
            <button
              type="button"
              className={styles.skipSectionButton}
              onClick={() => handleSkipSection(row.sectionLabel)}
              disabled={row.pendingIds.length === 0}
            >
              Skip section
            </button>
          </li>
        ))}
      </ul>
      {isAllReviewed && (
        <div className={styles.allReviewedBanner}>
          All changes reviewed. Ready to save.
        </div>
      )}
      {isAllReviewed && (
        <div className={styles.actionsRow}>
          <button
            type="button"
            className={styles.linkButton}
            onClick={handleBackToJd}
          >
            Back to JD
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={onSaveTailored}
            disabled={!onSaveTailored}
          >
            Save Tailored CV
          </button>
        </div>
      )}
    </div>
  );

  const renderExpandedReview = () => {
    if (!tailorResponse) return null;
    return (
      <div className={styles.section}>
        <h3 className={styles.heading}>All changes</h3>
        <ul className={styles.changeList}>
          {tailorResponse.changes.map((c) => {
            const isApplied = tailor.appliedChanges.has(c.id);
            const isSkipped = tailor.skippedChanges.has(c.id);
            const status = isApplied
              ? 'accepted'
              : isSkipped
                ? 'skipped'
                : 'pending';
            return (
              <li key={c.id} className={styles.changeListItem} data-status={status}>
                <div className={styles.changeListSection}>{c.section}</div>
                <div className={styles.changeListDescription}>{c.description}</div>
                <div className={styles.changeListStatus}>{status}</div>
              </li>
            );
          })}
        </ul>
        {showReRunConfirm ? (
          <div className={styles.reRunConfirm} role="alertdialog">
            <p>
              You'll lose {reviewedCount} review decision
              {reviewedCount === 1 ? '' : 's'}. Continue?
            </p>
            <div className={styles.actionsRow}>
              <button
                type="button"
                className={styles.linkButton}
                onClick={handleReRunCancelClick}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleReRunConfirmClick}
              >
                Re-run tune
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.actionsRow}>
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => setExpanded(false)}
            >
              Back to list
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleReRunClick}
            >
              Re-run tune
            </button>
          </div>
        )}
      </div>
    );
  };

  // Escape closes the rail (parity with TunePanel) — only in non-review states
  // so users don't accidentally lose review progress on Esc.
  useEffect(() => {
    if (!onClose || step === 'review') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, step]);

  return (
    <aside
      className={rootClassName}
      data-state={dataState}
      data-step={step}
      role="complementary"
      aria-label="Tune for job rail"
    >
      <button
        type="button"
        className={styles.chevron}
        onClick={() => setExpanded(!isExpanded)}
        aria-label={isExpanded ? 'Collapse rail' : 'Expand rail'}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(180deg)' }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      <div className={styles.scroll}>
        {step === 'base' && renderBaseStep()}
        {step === 'jd' && renderJdStep()}
        {step === 'analysis' && renderAnalysisStep()}
        {step === 'review' && isEmptyTailor && renderEmptyTailorState()}
        {step === 'review' && !isEmptyTailor && !isExpanded && renderShrunkReview()}
        {step === 'review' && !isEmptyTailor && isExpanded && renderExpandedReview()}
      </div>
    </aside>
  );
}
