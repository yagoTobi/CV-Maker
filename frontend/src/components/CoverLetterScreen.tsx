import { useRef, useState } from 'react';
import styles from '../App.module.css';
import clStyles from './CoverLetterScreen.module.css';


interface CoverLetterScreenProps {
  onBack: () => void;
}


export default function CoverLetterScreen({ onBack }: CoverLetterScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [cvExpanded, setCvExpanded] = useState(true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      setFileUrl(URL.createObjectURL(file));
    } else {
      setFileName(null);
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      setFileUrl(null);
    }
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <button className={styles.changeTemplateBtn} onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Home
        </button>
        <h1 className={styles.title}>Cover Letter Writer</h1>
      </header>

      <main className={styles.main}>
        <div className={styles.leftPanel}>
          <section className={styles.cvUploadSection}>
            <h2>Upload your CV</h2>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className={clStyles.hiddenInput}
            />
            <button
              className={clStyles.uploadBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {fileName ? fileName : 'Choose file'}
            </button>
          </section>
          <section className={styles.jobPostingSection}>
            <h2>Paste job description</h2>
          </section>
        </div>

        <div className={styles.rightPanel}>
          <section className={`${clStyles.cvDisplaySection} ${cvExpanded ? '' : clStyles.collapsed}`}>
            <button
              className={clStyles.cvDisplayHeader}
              onClick={() => setCvExpanded(!cvExpanded)}
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
                className={`${clStyles.chevron} ${cvExpanded ? clStyles.chevronOpen : ''}`}
              >
                <path d="m6 9 6 6 6-6"/>
              </svg>
              <h2>CV Preview</h2>
              {fileName && <span className={clStyles.cvFileName}>{fileName}</span>}
            </button>
            {cvExpanded && (
              <div className={clStyles.cvDisplayContent}>
                {fileUrl ? (
                  <iframe
                    src={`${fileUrl}#zoom=100`}
                    className={clStyles.cvIframe}
                    title="CV Preview"
                  />
                ) : (
                  <div className={clStyles.cvPlaceholder}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10 9 9 9 8 9"/>
                    </svg>
                    <p>Upload a CV to preview it here</p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}