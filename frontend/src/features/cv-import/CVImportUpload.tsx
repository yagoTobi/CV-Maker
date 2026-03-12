import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import styles from './CVImportUpload.module.css';

const VALID_EXTENSIONS = ['.pdf', '.docx', '.json'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function validateFile(file: File): string | null {
  const fileName = file.name.toLowerCase();
  const hasValidExtension = VALID_EXTENSIONS.some(ext => fileName.endsWith(ext));

  if (!hasValidExtension) {
    return 'Unsupported file type. Please upload a PDF, DOCX, or JSON file.';
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'File is too large. Maximum size is 10MB.';
  }

  return null;
}

export default function CVImportUpload() {
  const navigate = useNavigate();
  const { cvImport } = useAppContext();
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Navigate to review when import completes successfully
  useEffect(() => {
    if (cvImport.importResult?.success) {
      navigate('/import/review');
    }
  }, [cvImport.importResult, navigate]);

  const handleFile = useCallback((file: File) => {
    setLocalError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    cvImport.handleFileSelected(file);
  }, [cvImport]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const onFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    e.target.value = '';
  }, [handleFile]);

  const openFilePicker = useCallback(() => {
    if (fileInputRef.current && !cvImport.isImporting) {
      fileInputRef.current.click();
    }
  }, [cvImport.isImporting]);

  const clearError = useCallback(() => {
    setLocalError(null);
  }, []);

  const dropZoneClasses = [
    styles.dropZone,
    isDragOver && styles.dragOver,
    cvImport.isImporting && styles.uploading,
  ].filter(Boolean).join(' ');

  const displayError = cvImport.importError || localError;

  return (
    <div className={styles.container}>
      <div className={styles.background} />
      <div className={styles.content}>
        <button className={styles.backBtn} onClick={() => navigate('/build/start')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </button>

        <h1 className={styles.title}>Import your CV</h1>
        <p className={styles.subtitle}>
          Upload your existing CV and we'll extract your information automatically.
        </p>

        <div
          className={dropZoneClasses}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={openFilePicker}
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
              <p className={styles.helpText}>Maximum file size: 10MB</p>
            </div>
          )}
        </div>

        <div className={styles.formats}>
          <span className={styles.formatChip}>PDF</span>
          <span className={styles.formatChip}>DOCX</span>
          <span className={styles.formatChip}>
            JSON
            <small className={styles.formatLabel}>CV-Maker export</small>
          </span>
        </div>

        {displayError && (
          <div className={styles.errorContainer}>
            <div className={styles.errorMessage}>
              <svg className={styles.errorIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {displayError}
            </div>
            {localError && (
              <button className={styles.tryAgain} onClick={clearError}>
                Try again
              </button>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept=".pdf,.docx,.json"
          onChange={onFileInputChange}
          disabled={cvImport.isImporting}
        />
      </div>
    </div>
  );
}
