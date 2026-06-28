import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCVContext } from '../../contexts/CVContext';
import { useToolsContext } from '../../contexts/ToolsContext';
import { api } from '../../services/api';
import { formatDate } from '../../utils/cvDisplayUtils';
import styles from './TuneExpansionPanel.module.css';

interface TuneExpansionPanelProps {
  onBuildClick: () => void;
}

export function TuneExpansionPanel({ onBuildClick }: TuneExpansionPanelProps) {
  const navigate = useNavigate();
  const { savedVersions, setSelectedTemplateForBuild } = useCVContext();
  const { handleVersionLoad } = useToolsContext();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const baselineCVs = savedVersions.filter(v => !v.parentVersionId);

  if (baselineCVs.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <h2 className={styles.emptyHeading}>No baseline CV yet</h2>
          <p className={styles.emptyBody}>Build or import a CV first, then use it as your baseline for applications.</p>
          <button className={styles.ctaButton} onClick={onBuildClick}>Build my CV</button>
        </div>
      </div>
    );
  }

  return (
    <div className={baselineCVs.length > 6 ? `${styles.container} ${styles.containerScrollable}` : styles.container}>
      <h3 className={styles.heading}>Choose a baseline CV</h3>
      <div className={styles.cvList} role="list">
        {baselineCVs.map(cv => (
          <button
            key={cv.id}
            className={styles.cvItem}
            role="listitem"
            onClick={async () => {
              setLoadingId(cv.id);
              const version = await api.getVersion(cv.id);
              setLoadingId(null);
              if (version) {
                handleVersionLoad(version);
                setSelectedTemplateForBuild(version.templateId);
                navigate('/build/form', { state: { tune: true } });
              }
            }}
            disabled={loadingId === cv.id}
          >
            <span className={styles.cvName}>{loadingId === cv.id ? 'Loading...' : cv.name}</span>
            <span className={styles.cvDate}>{formatDate(cv.createdAt)}</span>
            <div className={styles.cvArrow}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
