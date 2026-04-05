/**
 * EditorToolbar -- Slim sticky toolbar above the CV content area.
 *
 * Renders "Import CV" button (left), "Download PDF" button + SaveIndicator (right).
 * Buttons show spinner + loading text when their respective operations are in progress.
 * Uses app chrome styling (IBM Plex Sans, ghost buttons per UI-SPEC).
 */
import type { SaveStatus } from '../hooks/useAutoSave';
import { SaveIndicator } from './SaveIndicator';
import styles from './EditorToolbar.module.css';

interface EditorToolbarProps {
  saveStatus: SaveStatus;
  onImport: () => void;
  onDownload: () => void;
  isImporting?: boolean;
  isDownloading?: boolean;
}

export function EditorToolbar({
  saveStatus,
  onImport,
  onDownload,
  isImporting = false,
  isDownloading = false,
}: EditorToolbarProps) {
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="CV editor actions">
      <div className={styles.leftGroup}>
        <button
          className={styles.toolbarBtn}
          onClick={onImport}
          disabled={isImporting}
          type="button"
        >
          {isImporting ? (
            <>
              <span className={styles.spinner} aria-hidden="true" />
              Extracting CV data...
            </>
          ) : (
            'Import CV'
          )}
        </button>
      </div>

      <div className={styles.rightGroup}>
        <button
          className={styles.toolbarBtn}
          onClick={onDownload}
          disabled={isDownloading}
          type="button"
        >
          {isDownloading ? (
            <>
              <span className={styles.spinner} aria-hidden="true" />
              Generating...
            </>
          ) : (
            'Download PDF'
          )}
        </button>
        <SaveIndicator status={saveStatus} inline />
      </div>
    </div>
  );
}
