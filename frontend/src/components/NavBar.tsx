/**
 * NavBar -- Persistent navigation bar for all working pages.
 *
 * Left side: "CV Maker" logo (navigates to /) + "My CVs" link (navigates to /dashboard).
 * Right side (editor pages): Download PDF accent button + SaveIndicator.
 * Right side (non-editor pages): empty (no actions).
 *
 * Editor detection: pathname === '/build/form' AND editorActions is non-null.
 * Per D-08, D-09, D-10, D-12, D-16, D-17 from UI-SPEC.
 */
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEditorActions } from '../contexts/EditorActionsContext';
import { SaveIndicator } from '../features/direct-edit/components/SaveIndicator';
import { CVSwitcherDropdown } from '../features/direct-edit/components/CVSwitcherDropdown';
import styles from './NavBar.module.css';

export function NavBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const editorActions = useEditorActions();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const isEditorPage = pathname === '/build/form' && editorActions !== null;
  const isTuning = editorActions?.isTuning ?? false;
  const isTunedVersion = editorActions?.isTunedVersion ?? false;

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
        {isEditorPage && !isTuning && !isTunedVersion && (
          <div style={{ position: 'relative' }}>
            <button
              className={`${styles.cvNameBtn}${isDropdownOpen ? ` ${styles.cvNameBtnOpen}` : ''}`}
              onClick={() => setIsDropdownOpen(prev => !prev)}
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
              title={editorActions?.cvName ?? 'Untitled CV'}
            >
              <span className={styles.cvNameText}>
                {editorActions?.cvName ?? 'Untitled CV'}
              </span>
              <span
                className={`${styles.cvNameChevron}${isDropdownOpen ? ` ${styles.cvNameChevronOpen}` : ''}`}
                aria-hidden="true"
              >
                ▾
              </span>
            </button>
            <CVSwitcherDropdown
              isOpen={isDropdownOpen}
              onClose={() => setIsDropdownOpen(false)}
            />
          </div>
        )}
        {isEditorPage && (isTuning || isTunedVersion) && (
          <div className={styles.breadcrumb}>
            <span className={styles.breadcrumbBase}>
              {editorActions?.cvName ?? 'Untitled CV'}
            </span>
            {(editorActions?.tuneCompanyName || editorActions?.tuneRole) && (
              <>
                <span className={styles.breadcrumbSep}>/</span>
                <span className={styles.breadcrumbSub}>
                  {editorActions?.tuneCompanyName || editorActions?.tuneRole}
                </span>
              </>
            )}
          </div>
        )}
        {/* Non-editor pages: logo only (no My CVs link) — per D-08 */}
      </div>

      <div className={styles.rightGroup}>
        {isEditorPage ? (
          <>
            <SaveIndicator status={editorActions.saveStatus} inline />
            {!isTunedVersion && (
              <button
                className={`${styles.ghostBtn}${isTuning ? ` ${styles.ghostBtnActive}` : ''}`}
                onClick={editorActions.onTuneForJob}
                type="button"
              >
                Tune for Job
              </button>
            )}
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
          </>
        ) : null}
      </div>
    </nav>
  );
}
