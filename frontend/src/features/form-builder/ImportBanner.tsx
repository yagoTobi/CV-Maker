import { useEffect, useState } from 'react';
import type { CVFormData, ImportConfidence, ImportSummary } from '../../types';
import styles from './ImportBanner.module.css';

// --- Validation helpers (ported from CVImportReview) ---

function isValidEmail(email: string): boolean {
  if (!email || email.trim() === '') return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidDate(date: string): boolean {
  if (!date || date.trim() === '') return true;
  const trimmed = date.trim();
  if (trimmed.toLowerCase() === 'present') return true;
  return /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}$/.test(trimmed);
}

function areDatesOrdered(startDate: string, endDate: string): boolean {
  if (!startDate || !endDate || endDate.toLowerCase().includes('present')) return true;
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const parse = (d: string) => {
    const parts = d.trim().split(/\s+/);
    if (parts.length !== 2) return null;
    const m = months[parts[0].toLowerCase()];
    const y = parseInt(parts[1], 10);
    if (m === undefined || isNaN(y)) return null;
    return new Date(y, m);
  };
  const s = parse(startDate), e = parse(endDate);
  if (!s || !e) return true;
  return s <= e;
}

function computeValidationWarnings(data: CVFormData, source: string): string[] {
  const warns: string[] = [];

  if (data.personalInfo.email && !isValidEmail(data.personalInfo.email)) {
    warns.push('Email address format appears invalid');
  }
  if (!data.personalInfo.fullName?.trim()) {
    warns.push('Name is missing — this is a required field');
  }

  data.workExperience.forEach((entry, idx) => {
    if (entry.startDate && !isValidDate(entry.startDate))
      warns.push(`Work entry ${idx + 1}: Start date format should be "MMM YYYY" or "Present"`);
    if (entry.endDate && !isValidDate(entry.endDate))
      warns.push(`Work entry ${idx + 1}: End date format should be "MMM YYYY" or "Present"`);
    if (entry.startDate && entry.endDate && !areDatesOrdered(entry.startDate, entry.endDate))
      warns.push(`Work entry ${idx + 1}: End date is before start date`);
  });

  data.education.forEach((entry, idx) => {
    if (entry.startDate && !isValidDate(entry.startDate))
      warns.push(`Education entry ${idx + 1}: Start date format should be "MMM YYYY" or "Present"`);
    if (entry.endDate && !isValidDate(entry.endDate))
      warns.push(`Education entry ${idx + 1}: End date format should be "MMM YYYY" or "Present"`);
    if (entry.startDate && entry.endDate && !areDatesOrdered(entry.startDate, entry.endDate))
      warns.push(`Education entry ${idx + 1}: End date is before start date`);
  });

  const totalEntries = data.workExperience.length + data.education.length + data.skills.length;
  if (totalEntries < 2 && source !== 'json') {
    warns.push('Very little data was extracted — please review all fields carefully');
  }

  return warns;
}

// --- Helpers ---

function sourceLabel(source: string) {
  if (source === 'pdf') return 'PDF';
  if (source === 'docx') return 'DOCX';
  return 'JSON';
}

function pluralize(n: number, singular: string) {
  return `${n} ${singular}${n === 1 ? '' : 's'}`;
}

// --- Component ---

interface ImportBannerProps {
  source: string;
  confidence: ImportConfidence;
  summary: ImportSummary;
  backendWarnings: string[] | null;
  formData: CVFormData;
  onDismiss: () => void;
}

export default function ImportBanner({
  source,
  confidence,
  summary,
  backendWarnings,
  formData,
  onDismiss,
}: ImportBannerProps) {
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  useEffect(() => {
    setValidationWarnings(computeValidationWarnings(formData, source));
  }, [formData, source]);

  const allWarnings = [...(backendWarnings || []), ...validationWarnings];

  const confidenceDot =
    confidence.overall === 'high' ? styles.dotGreen
    : confidence.overall === 'medium' ? styles.dotAmber
    : styles.dotRed;

  const confidenceText =
    confidence.overall === 'high' ? 'High confidence'
    : confidence.overall === 'medium' ? 'Some fields may need review'
    : 'Many fields need review';

  return (
    <div className={styles.banner}>
      <div className={styles.summaryBar}>
        <span className={styles.sourceBadge}>Imported from {sourceLabel(source)}</span>
        <span className={styles.summaryText}>
          {pluralize(summary.workEntries, 'work entry')}, {pluralize(summary.educationEntries, 'education entry')}, {pluralize(summary.skillCategories, 'skill category')}
          {summary.projects > 0 && `, ${pluralize(summary.projects, 'project')}`}
          {summary.awards > 0 && `, ${pluralize(summary.awards, 'award')}`}
        </span>
        <span className={styles.confidenceBadge}>
          <span className={`${styles.dot} ${confidenceDot}`} />
          {confidenceText}
        </span>
        <button className={styles.dismissBtn} onClick={onDismiss} title="Dismiss">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {allWarnings.length > 0 && (
        <div className={styles.warnings}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <ul className={styles.warningList}>
            {allWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
