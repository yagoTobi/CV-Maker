/**
 * NavBar -- Persistent navigation bar for all working pages.
 *
 * Left side: "CV Maker" logo (navigates to /) + "My CVs" link (navigates to /dashboard).
 * Right side (editor pages): Download PDF accent button + SaveIndicator.
 * Right side (non-editor pages): "+ New CV" ghost button (navigates to /build/start).
 *
 * Editor detection: pathname === '/build/form' AND editorActions is non-null.
 * Per D-08, D-09, D-10, D-12, D-16, D-17 from UI-SPEC.
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { useEditorActions } from '../contexts/EditorActionsContext';
import { SaveIndicator } from '../features/direct-edit/components/SaveIndicator';
import styles from './NavBar.module.css';

export function NavBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const editorActions = useEditorActions();

  const isEditorPage = pathname === '/build/form' && editorActions !== null;

  return (
    <nav className={styles.navBar} aria-label="Main navigation">
      <div className={styles.leftGroup}>
        <button
          className={styles.logo}
          onClick={() => navigate('/')}
          type="button"
        >
          CV Maker
        </button>
        <button
          className={`${styles.navLink}${pathname === '/dashboard' ? ` ${styles.navLinkActive}` : ''}`}
          onClick={() => navigate('/dashboard')}
          type="button"
          aria-current={pathname === '/dashboard' ? 'page' : undefined}
        >
          My CVs
        </button>
      </div>

      <div className={styles.rightGroup}>
        {isEditorPage ? (
          <>
            <button
              className={styles.accentBtn}
              onClick={editorActions.onDownload}
              disabled={editorActions.isDownloading}
              type="button"
            >
              {editorActions.isDownloading ? (
                <>
                  <span className={styles.spinnerWhite} aria-hidden="true" />
                  Generating...
                </>
              ) : (
                'Download PDF'
              )}
            </button>
            <button
              className={styles.ghostBtn}
              onClick={editorActions.onTuneForJob}
              type="button"
            >
              Tune for Job
            </button>
            <SaveIndicator status={editorActions.saveStatus} inline />
          </>
        ) : (
          <button
            className={styles.ghostBtn}
            onClick={() => navigate('/build/start')}
            type="button"
          >
            + New CV
          </button>
        )}
      </div>
    </nav>
  );
}
