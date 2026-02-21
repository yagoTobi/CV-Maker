interface PdfPreviewProps {
  pdfBase64: string | null;
  error: string | null;
  isCompiling: boolean;
  onCompile?: () => void;
}

export function PdfPreview({ pdfBase64, error, isCompiling, onCompile }: PdfPreviewProps) {
  if (isCompiling) {
    return (
      <div className="pdf-preview">
        <div className="pdf-loading">
          <div className="spinner"></div>
          <p>Compiling PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pdf-preview">
        <div className="pdf-error">
          <h4>Compilation Error</h4>
          <pre>{error}</pre>
          {onCompile && (
            <button className="retry-btn" onClick={onCompile}>
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!pdfBase64) {
    return (
      <div className="pdf-preview">
        <div className="pdf-placeholder">
          <div className="placeholder-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10,9 9,9 8,9" />
            </svg>
          </div>
          <p>No PDF generated yet</p>
          {onCompile && (
            <button className="compile-btn" onClick={onCompile}>
              Compile PDF
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-preview">
      <iframe
        src={`data:application/pdf;base64,${pdfBase64}`}
        title="PDF Preview"
        width="100%"
        height="100%"
      />
    </div>
  );
}
