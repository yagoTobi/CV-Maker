import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { api } from '../../services/api';
import { BuildExpansionPanel } from './BuildExpansionPanel';
import { TuneExpansionPanel } from './TuneExpansionPanel';
import styles from './LandingScreen.module.css';

export default function LandingScreen() {
  const navigate = useNavigate();
  const { savedVersions, resetForNewBuild, cvImport, handleVersionLoad, setSelectedTemplateForBuild } = useAppContext();
  const [expandedPanel, setExpandedPanel] = useState<'build' | 'tune' | null>(null);
  const switchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);
    };
  }, []);

  const handleBuildClick = useCallback(() => {
    if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);
    // Prevent collapsing while an import is in progress
    if (expandedPanel === 'build' && cvImport.isImporting) return;
    if (expandedPanel === 'build') {
      setExpandedPanel(null);
      return;
    }
    if (expandedPanel !== null) {
      setExpandedPanel(null);
      switchTimeoutRef.current = setTimeout(() => setExpandedPanel('build'), 250);
      return;
    }
    resetForNewBuild();
    setExpandedPanel('build');
  }, [expandedPanel, resetForNewBuild, cvImport.isImporting]);

  const handleTuneClick = useCallback(async () => {
    if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);
    const baseCVs = savedVersions.filter(v => !v.parentVersionId);
    if (baseCVs.length === 1) {
      const version = await api.getVersion(baseCVs[0].id);
      if (version) {
        handleVersionLoad(version);
        setSelectedTemplateForBuild(version.templateId);
        navigate('/build/form', { state: { tune: true } });
      }
      return;
    }
    if (expandedPanel === 'tune') {
      setExpandedPanel(null);
      return;
    }
    if (expandedPanel !== null) {
      setExpandedPanel(null);
      switchTimeoutRef.current = setTimeout(() => setExpandedPanel('tune'), 250);
      return;
    }
    setExpandedPanel('tune');
  }, [expandedPanel, savedVersions, navigate, handleVersionLoad, setSelectedTemplateForBuild]);

  const handleBuildFromTune = useCallback(() => {
    setExpandedPanel(null);
    switchTimeoutRef.current = setTimeout(() => {
      resetForNewBuild();
      setExpandedPanel('build');
    }, 250);
  }, [resetForNewBuild]);

  const handleMyCV = () => {
    navigate('/dashboard');
  };

  return (
    <div className={styles.container}>
      <div className={styles.background} />

      <div className={styles.content}>
        <div className={styles.branding}>
          <div className={styles.logo}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <h1 className={styles.title}>CV Maker</h1>
          <p className={styles.subtitle}>Create and tailor your CV with AI assistance</p>
        </div>

        <div className={styles.actions}>
          <div className={styles.cards}>
            <button
              className={`${styles.card} ${styles.cardPrimary}${expandedPanel === 'build' ? ` ${styles.cardExpanded}` : ''}`}
              onClick={handleBuildClick}
              aria-expanded={expandedPanel === 'build'}
            >
              <div className={styles.cardIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </div>
              <div className={styles.cardBody}>
                <h2>Build my CV</h2>
                <p>Create a professional CV from your details or import an existing one.</p>
              </div>
              <div className={styles.cardArrow}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/>
                  <path d="m12 5 7 7-7 7"/>
                </svg>
              </div>
            </button>

            {/* Build expansion panel — directly below its card */}
            <div className={`${styles.expansionPanel}${expandedPanel === 'build' ? ` ${styles.expansionPanelOpen}` : ''}`}>
              <div className={styles.expansionPanelInner}>
                {expandedPanel === 'build' && <BuildExpansionPanel />}
              </div>
            </div>

            <button
              className={`${styles.card} ${styles.cardSecondary}${expandedPanel === 'tune' ? ` ${styles.cardSecondaryExpanded}` : ''}`}
              onClick={handleTuneClick}
              aria-expanded={expandedPanel === 'tune'}
            >
              <div className={styles.cardIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <div className={styles.cardBody}>
                <h2>Tune for a role</h2>
                <p>Already have a CV? Paste a role description and let AI help you tailor your application.</p>
              </div>
              <div className={styles.cardArrow}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/>
                  <path d="m12 5 7 7-7 7"/>
                </svg>
              </div>
            </button>

            {/* Tune expansion panel — directly below its card */}
            <div className={`${styles.expansionPanel}${expandedPanel === 'tune' ? ` ${styles.expansionPanelOpen}` : ''}`}>
              <div className={styles.expansionPanelInner}>
                {expandedPanel === 'tune' && (
                  <TuneExpansionPanel onBuildClick={handleBuildFromTune} />
                )}
              </div>
            </div>
          </div>

          {savedVersions.length > 0 && (
            <button className={styles.savedLink} onClick={handleMyCV}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
              My Saved CVs
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
