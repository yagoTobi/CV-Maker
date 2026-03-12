import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import styles from './LandingScreen.module.css';

export default function LandingScreen() {
  const navigate = useNavigate();
  const { savedVersions, templates, setFormData, setSelectedTemplateForBuild, cvImport } = useAppContext();

  const handleBuildCV = () => {
    setFormData(null);
    setSelectedTemplateForBuild(null);
    navigate('/build');
  };

  const handleTuneForJob = async () => {
    const success = await templates.selectTemplate('med-length-proff-cv');
    if (success) {
      setFormData(null);
      navigate('/editor');
    }
  };

  const handleMyCV = () => {
    navigate('/dashboard');
  };

  const handleImportCV = () => {
    cvImport.reset();
    navigate('/import');
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
            <button className={`${styles.card} ${styles.cardPrimary}`} onClick={handleBuildCV}>
              <div className={styles.cardIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </div>
              <div className={styles.cardBody}>
                <h2>Build my CV</h2>
                <p>Start from scratch. Fill in your details with a guided form and generate a professional CV.</p>
              </div>
              <div className={styles.cardArrow}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/>
                  <path d="m12 5 7 7-7 7"/>
                </svg>
              </div>
            </button>

            <button className={`${styles.card} ${styles.cardSecondary}`} onClick={handleTuneForJob}>
              <div className={styles.cardIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <div className={styles.cardBody}>
                <h2>Tune for a job</h2>
                <p>Already have a CV? Paste a job description and let AI help you tailor your application.</p>
              </div>
              <div className={styles.cardArrow}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/>
                  <path d="m12 5 7 7-7 7"/>
                </svg>
              </div>
            </button>

            <button className={`${styles.card} ${styles.cardSecondary}`} onClick={handleImportCV}>
              <div className={styles.cardIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <div className={styles.cardBody}>
                <h2>Import existing CV</h2>
                <p>Upload a PDF, Word doc, or JSON export and we'll extract your details automatically.</p>
              </div>
              <div className={styles.cardArrow}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/>
                  <path d="m12 5 7 7-7 7"/>
                </svg>
              </div>
            </button>
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
