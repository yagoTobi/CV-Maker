import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import styles from './BuildChoiceScreen.module.css';

export default function BuildChoiceScreen() {
  const navigate = useNavigate();
  const { setFormData, setSelectedTemplateForBuild, cvImport } = useAppContext();

  const handleStartFromScratch = () => {
    setFormData(null);
    setSelectedTemplateForBuild(null);
    navigate('/build');
  };

  const handleImport = () => {
    cvImport.reset();
    navigate('/import');
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <button className={styles.backButton} onClick={() => navigate('/')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Back
        </button>

        <div className={styles.header}>
          <h1>How would you like to start?</h1>
          <p>Choose to build from scratch or import an existing CV</p>
        </div>

        <div className={styles.options}>
          <button className={styles.optionCard} onClick={handleStartFromScratch}>
            <div className={styles.optionIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </div>
            <div className={styles.optionBody}>
              <h2>Start from scratch</h2>
              <p>Fill in your details with a guided form and choose a professional template.</p>
            </div>
            <div className={styles.optionArrow}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/>
                <path d="m12 5 7 7-7 7"/>
              </svg>
            </div>
          </button>

          <button className={styles.optionCard} onClick={handleImport}>
            <div className={styles.optionIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div className={styles.optionBody}>
              <h2>Import existing CV</h2>
              <p>Upload a PDF, Word doc, or JSON and we'll extract your details automatically.</p>
            </div>
            <div className={styles.optionArrow}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/>
                <path d="m12 5 7 7-7 7"/>
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
