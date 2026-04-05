/**
 * ImportToast -- Dismissible banner showing CV import results.
 *
 * Renders entry counts and confidence level on success, error message on failure.
 * Auto-dismisses after 8 seconds on success. Stays visible on error until manually dismissed.
 * Animations: slideDown on enter, fade-out on dismiss (both 300ms per UI-SPEC).
 */
import { useEffect, useRef, useState } from 'react';
import type { ImportConfidence, ImportSummary } from '../../../types';
import styles from './ImportToast.module.css';

interface ImportToastProps {
  summary: ImportSummary;
  confidence: ImportConfidence;
  onDismiss: () => void;
  error?: string | null;
}

function buildSummaryText(summary: ImportSummary): string {
  const parts: string[] = [];
  if (summary.workEntries > 0) parts.push(`${summary.workEntries} jobs`);
  if (summary.educationEntries > 0) parts.push(`${summary.educationEntries} education`);
  if (summary.skillCategories > 0) parts.push(`${summary.skillCategories} skills`);
  if (summary.projects > 0) parts.push(`${summary.projects} projects`);
  if (summary.awards > 0) parts.push(`${summary.awards} awards`);
  return `Imported ${parts.join(', ')}`;
}

function confidenceText(level: 'high' | 'medium' | 'low'): string {
  if (level === 'high') return ' \u2014 high confidence';
  if (level === 'medium') return ' \u2014 some fields may need review';
  return ' \u2014 please review all fields carefully';
}

function confidenceClassName(level: 'high' | 'medium' | 'low'): string {
  if (level === 'high') return styles.confidenceHigh;
  if (level === 'medium') return styles.confidenceMedium;
  return styles.confidenceLow;
}

export function ImportToast({ summary, confidence, onDismiss, error }: ImportToastProps) {
  const [isDismissing, setIsDismissing] = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDismiss = () => {
    if (isDismissing) return;
    setIsDismissing(true);
    fadeTimerRef.current = setTimeout(() => {
      onDismiss();
    }, 300);
  };

  useEffect(() => {
    if (!error) {
      dismissTimerRef.current = setTimeout(() => {
        handleDismiss();
      }, 8000);
    }

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const isError = !!error;

  return (
    <div
      className={`${styles.toast}${isDismissing ? ` ${styles.dismissing}` : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className={styles.icon} aria-hidden="true">
        {isError ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" stroke="var(--error)" strokeWidth="2" />
            <line x1="10" y1="6" x2="10" y2="11" stroke="var(--error)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="10" cy="14" r="1" fill="var(--error)" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" stroke="var(--success)" strokeWidth="2" />
            <path d="M6.5 10.5L9 13L13.5 7.5" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>

      <span className={styles.text}>
        {isError ? (
          error
        ) : (
          <>
            {buildSummaryText(summary)}
            <span className={confidenceClassName(confidence.overall)}>
              {confidenceText(confidence.overall)}
            </span>
          </>
        )}
      </span>

      <button
        className={styles.dismissBtn}
        onClick={handleDismiss}
        type="button"
        aria-label="Dismiss notification"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
