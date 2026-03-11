import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import type { CVVersion, CVVersionMeta } from '../../types';
import styles from './Dashboard.module.css';

interface DashboardProps {
  onVersionLoad: (version: CVVersion) => void;
  onBack: () => void;
  onVersionsChange: (versions: CVVersionMeta[]) => void;
}

const TEMPLATE_NAMES: Record<string, string> = {
  'med-length-proff-cv': 'Professional CV',
  'deedy-resume': 'Deedy Resume',
  'mcdowell-cv': 'McDowell CV',
};

function scoreColor(score: number): string {
  if (score >= 80) return 'good';
  if (score >= 60) return 'medium';
  return 'low';
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function Dashboard({ onVersionLoad, onBack, onVersionsChange }: DashboardProps) {
  const [versions, setVersions] = useState<CVVersionMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    api.listVersions().then(v => {
      setVersions(v);
      setIsLoading(false);
    });
  }, []);

  const handleOpen = useCallback(async (id: string) => {
    setLoadingId(id);
    const version = await api.getVersion(id);
    setLoadingId(null);
    if (version) onVersionLoad(version);
  }, [onVersionLoad]);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    const ok = await api.deleteVersion(id);
    if (ok) {
      const updated = versions.filter(v => v.id !== id);
      setVersions(updated);
      onVersionsChange(updated);
    }
    setDeletingId(null);
  }, [versions, onVersionsChange]);

  return (
    <div className={styles.container}>
      <div className={styles.background} />
      <div className={styles.content}>
        <header className={styles.header}>
          <button className={styles.backBtn} onClick={onBack}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Home
          </button>
          <div>
            <h1 className={styles.title}>My Saved CVs</h1>
            <p className={styles.subtitle}>{versions.length} version{versions.length !== 1 ? 's' : ''} saved</p>
          </div>
        </header>

        {isLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading your CVs...</p>
          </div>
        ) : versions.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <h2>No saved CVs yet</h2>
            <p>Use the editor to create and save CV versions. They'll appear here.</p>
            <button className={styles.emptyAction} onClick={onBack}>
              Get started
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {versions.map(v => (
              <div key={v.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.templateBadge}>
                    {TEMPLATE_NAMES[v.templateId] || v.templateId}
                  </span>
                  {v.matchScore != null && (
                    <span className={`${styles.scoreBadge} ${styles[scoreColor(v.matchScore)]}`}>
                      {Math.round(v.matchScore)}% match
                    </span>
                  )}
                </div>

                <h2 className={styles.cardTitle}>{v.name}</h2>

                {(v.companyName || v.jobDescription) && (
                  <p className={styles.cardSnippet}>
                    {v.companyName && <strong>{v.companyName}</strong>}
                    {v.companyName && v.jobDescription && ' — '}
                    {v.jobDescription && v.jobDescription.slice(0, 80) + (v.jobDescription.length > 80 ? '...' : '')}
                  </p>
                )}

                <p className={styles.cardDate}>{formatDate(v.createdAt)}</p>

                <div className={styles.cardActions}>
                  <button
                    className={styles.openBtn}
                    onClick={() => handleOpen(v.id)}
                    disabled={loadingId === v.id}
                  >
                    {loadingId === v.id ? (
                      <><span className={styles.spinnerSm} /> Opening...</>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                        </svg>
                        Open
                      </>
                    )}
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(v.id)}
                    disabled={deletingId === v.id}
                    title="Delete this version"
                  >
                    {deletingId === v.id ? (
                      <span className={styles.spinnerSm} />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/>
                        <path d="M9 6V4h6v2"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
