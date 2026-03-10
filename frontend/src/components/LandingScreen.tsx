import styles from './LandingScreen.module.css';

interface LandingScreenProps {
  hasSavedVersions: boolean;
  onBuildCV: () => void;
  onTuneForJob: () => void;
  onCoverLetter:() => void;
  onMyCV: () => void;
}

export default function LandingScreen({ hasSavedVersions, onBuildCV, onTuneForJob, onCoverLetter, onMyCV }: LandingScreenProps) {
  return (
    <div className={styles.container}>
      <div className={styles.background} />

      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.logo}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"> // Simple document icon 
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/> 
              <line x1="16" y1="17" x2="8" y2="17"/> 
              <polyline points="10 9 9 9 8 9"/> 
            </svg>
          </div>
          <h1 className={styles.title}>CV Maker</h1>
          <p className={styles.subtitle}>Create and tailor your CV with AI assistance</p>
        </header>

        <div className={styles.cards}>
          <button className={`${styles.card} ${styles.cardPrimary}`} onClick={onBuildCV}>
            <div className={styles.cardIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"> // Simple pencil icon 
                <path d="M12 20h9"/> // Horizontal line at the bottom
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/> // Pencil icon
              </svg>
            </div>
            <div className={styles.cardBody}>
              <h2>Build my CV</h2>
              <p>Start from scratch. Fill in your details with a guided form and generate a professional CV.</p>
            </div>
            <div className={styles.cardArrow}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/> // Horizontal line
                <path d="m12 5 7 7-7 7"/>  // Arrowhead (right-pointing)
              </svg>
            </div>
          </button>

          <button className={`${styles.card} ${styles.cardSecondary}`} onClick={onTuneForJob}>
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

          <button className={`${styles.card} ${styles.cardSecondary}`} onClick={onCoverLetter}>
            <div className={styles.cardIcon}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> // Simple cover letter icon (letter with a pen)
                  <path d="M10 19H6.2C5.0799 19 4.51984 19 4.09202 18.782C3.71569 18.5903 3.40973 18.2843 3.21799 17.908C3 17.4802 3 16.9201 3 15.8V8.2C3 7.0799 3 6.51984 3.21799 6.09202C3.40973 5.71569 3.71569 5.40973 4.09202 5.21799C4.51984 5 5.0799 5 6.2 5H17.8C18.9201 5 19.4802 5 19.908 5.21799C20.2843 5.40973 20.5903 5.71569 20.782 6.09202C21 6.51984 21 7.0799 21 8.2V10M20.6067 8.26229L15.5499 11.6335C14.2669 12.4888 13.6254 12.9165 12.932 13.0827C12.3192 13.2295 11.6804 13.2295 11.0677 13.0827C10.3743 12.9165 9.73279 12.4888 8.44975 11.6335L3.14746 8.09863M14 21L16.025 20.595C16.2015 20.5597 16.2898 20.542 16.3721 20.5097C16.4452 20.4811 16.5147 20.4439 16.579 20.399C16.6516 20.3484 16.7152 20.2848 16.8426 20.1574L21 16C21.5523 15.4477 21.5523 14.5523 21 14C20.4477 13.4477 19.5523 13.4477 19 14L14.8426 18.1574C14.7152 18.2848 14.6516 18.3484 14.601 18.421C14.5561 18.4853 14.5189 18.5548 14.4903 18.6279C14.458 18.7102 14.4403 18.7985 14.405 18.975L14 21Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>
            </div>
            <div className={styles.cardBody}>
              <h2>Write a cover letter</h2>
              <p>Let AI help you craft a compelling cover letter that highlights your skills and experience.</p>
            </div>
            <div className={styles.cardArrow}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/>
                <path d="m12 5 7 7-7 7"/>
              </svg>
            </div>
          </button>
        </div>

        {hasSavedVersions && (
          <button className={styles.savedLink} onClick={onMyCV}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
            My Saved CVs
          </button>
        )}
      </div>
    </div>
  );
}
