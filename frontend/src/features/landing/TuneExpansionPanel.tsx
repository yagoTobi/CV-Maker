import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { formatDate } from '../../utils/cvDisplayUtils';
import styles from './TuneExpansionPanel.module.css';

interface TuneExpansionPanelProps {
  onBuildClick: () => void;
}

export function TuneExpansionPanel({ onBuildClick }: TuneExpansionPanelProps) {
  const navigate = useNavigate();
  const { savedVersions } = useAppContext();
  const baseCVs = savedVersions.filter(v => !v.parentVersionId);

  if (baseCVs.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <h2 className={styles.emptyHeading}>No CV to tune yet</h2>
          <p className={styles.emptyBody}>Build or import a CV first, then come back to tailor it for a specific role.</p>
          <button className={styles.ctaButton} onClick={onBuildClick}>Build my CV</button>
        </div>
      </div>
    );
  }

  return (
    <div className={baseCVs.length > 6 ? `${styles.container} ${styles.containerScrollable}` : styles.container}>
      <h3 className={styles.heading}>Choose a base CV</h3>
      <div className={styles.cvList} role="list">
        {baseCVs.map(cv => (
          <button
            key={cv.id}
            className={styles.cvItem}
            role="listitem"
            onClick={() => navigate('/apply', { state: { baseVersionId: cv.id } })}
          >
            <span className={styles.cvName}>{cv.name}</span>
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
