import styles from './PdfPreview.module.css';

interface PdfPreviewProps {
  pdfBase64: string | null;
  error: string | null;
  isCompiling: boolean;
  onCompile?: () => void;
  hasUnsavedChanges?: boolean;
}

export function PdfPreview({ pdfBase64, error, isCompiling, onCompile, hasUnsavedChanges }: PdfPreviewProps) {
  if (isCompiling) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Compiling PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h4>Compilation Error</h4>
          <pre>{error}</pre>
          {onCompile && (
            <button className={styles.retryBtn} onClick={onCompile}>
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!pdfBase64) {
    return (
      <div className={styles.container}>
        <div className={`${styles.placeholder} ${hasUnsavedChanges ? styles.hasChanges : ''}`}>
          <div className={styles.placeholderIcon}>
            {hasUnsavedChanges ? (
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            ) : (
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10,9 9,9 8,9" />
              </svg>
            )}
          </div>
          <p>{hasUnsavedChanges ? 'Changes made to your CV!' : 'No PDF generated yet'}</p>
          <p className={styles.placeholderHint}>
            {hasUnsavedChanges
              ? 'Compile to see your updated CV'
              : 'Click below to generate your PDF'}
          </p>
          {onCompile && (
            <button className={`${styles.compileBtn} ${hasUnsavedChanges ? styles.pulse : ''}`} onClick={onCompile}>
              {hasUnsavedChanges ? 'Compile to Preview' : 'Compile PDF'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <iframe
        src={`data:application/pdf;base64,${pdfBase64}`}
        title="PDF Preview"
        width="100%"
        height="100%"
      />
    </div>
  );
}
