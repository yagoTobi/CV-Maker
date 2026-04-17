import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { useFileUpload } from '../shared/useFileUpload';
import styles from './BuildExpansionPanel.module.css';

export function BuildExpansionPanel() {
  const navigate = useNavigate();
  const { setFormData, resetForNewBuild, cvImport } = useAppContext();

  // Clear stale import state on every mount/expand
  useEffect(() => {
    cvImport.reset();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onValidFile = useCallback((file: File) => {
    cvImport.handleFileSelected(file);
  }, [cvImport]);

  const upload = useFileUpload(onValidFile, cvImport.isImporting);

  // On successful import, push data into shared context and go to template selector
  useEffect(() => {
    if (!cvImport.importResult?.success) return;

    setFormData(cvImport.importResult.formData);
    if (cvImport.importResult.source === 'json') {
      cvImport.reset();
    }
    navigate('/build');
  }, [cvImport.importResult, navigate, setFormData, cvImport]);

  const handleStartFromScratch = () => {
    resetForNewBuild();
    navigate('/build');
  };

  const dropZoneClasses = [
    styles.dropZone,
    upload.isDragOver && styles.dragOver,
    cvImport.isImporting && styles.uploading,
  ].filter(Boolean).join(' ');

  const displayError = cvImport.importError || upload.localError;

  return (
    <div className={styles.container}>
      <div
        className={dropZoneClasses}
        onDragOver={upload.onDragOver}
        onDragLeave={upload.onDragLeave}
        onDrop={upload.onDrop}
        onClick={upload.openFilePicker}
      >
        {cvImport.isImporting ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p className={styles.progressText}>
              {cvImport.importProgress?.message || 'Processing...'}
            </p>
            {cvImport.importProgress && (
              <div className={styles.progressIndicator}>
                <span className={styles.stepText}>
                  Step {cvImport.importProgress.step} of {cvImport.importProgress.totalSteps}
                </span>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${(cvImport.importProgress.step / cvImport.importProgress.totalSteps) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.defaultState}>
            <svg className={styles.uploadIcon} width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path d="M24 32V16M24 16L18 22M24 16L30 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M40 28V36C40 37.0609 39.5786 38.0783 38.8284 38.8284C38.0783 39.5786 37.0609 40 36 40H12C10.9391 40 9.92172 39.5786 9.17157 38.8284C8.42143 38.0783 8 37.0609 8 36V28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className={styles.dropText}>
              Drag your CV here or <span className={styles.clickText}>click to browse</span>
            </p>
            <p className={styles.helpText}>PDF, DOCX, or JSON &bull; Max 10MB</p>
          </div>
        )}
      </div>

      <div className={styles.formats}>
        <span className={styles.formatChip}>
          <span className={styles.formatDot} />
          PDF
        </span>
        <span className={styles.formatChip}>
          <span className={styles.formatDot} />
          DOCX
        </span>
        <span className={styles.formatChip}>
          <span className={styles.formatDot} />
          JSON
        </span>
      </div>

      {displayError && (
        <div className={styles.errorMessage}>
          <svg className={styles.errorIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {displayError}
        </div>
      )}

      <div className={styles.divider}>
        <div className={styles.dividerLine} />
        <span className={styles.dividerText}>or</span>
        <div className={styles.dividerLine} />
      </div>

      <button className={styles.scratchCard} onClick={handleStartFromScratch}>
        <div className={styles.scratchIcon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </div>
        <div className={styles.scratchBody}>
          <h2>Start from scratch</h2>
          <p>Fill in your details with a guided form and choose a professional template.</p>
        </div>
        <div className={styles.scratchArrow}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/>
            <path d="m12 5 7 7-7 7"/>
          </svg>
        </div>
      </button>

      <input
        ref={upload.fileInputRef}
        type="file"
        hidden
        accept=".pdf,.docx,.json"
        onChange={upload.onFileInputChange}
        disabled={cvImport.isImporting}
      />
    </div>
  );
}
