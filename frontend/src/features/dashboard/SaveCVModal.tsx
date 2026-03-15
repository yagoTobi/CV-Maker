import { useState, useEffect, useRef } from 'react';
import type { CVVersion, CVVersionMeta } from '../../types';
import styles from './VersionSwitcher.module.css';

export interface SaveVersionData {
  name: string;
  isBaseCV: boolean;
  parentVersionId?: string | null;
  role?: string;
  companyName?: string;
}

interface SaveCVModalProps {
  show: boolean;
  onClose: () => void;
  onSave: (data: SaveVersionData) => void;
  isSaving: boolean;
  activeVersion?: CVVersion | null;
  baseCvs: CVVersionMeta[];
  defaultCompanyName?: string;
  /** When true, pre-selects Base CV and hides the type selector */
  forceBaseCV?: boolean;
}

export default function SaveCVModal({
  show,
  onClose,
  onSave,
  isSaving,
  activeVersion,
  baseCvs,
  defaultCompanyName,
  forceBaseCV = false,
}: SaveCVModalProps) {
  const [isBaseCV, setIsBaseCV] = useState(true);
  const [saveName, setSaveName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Pre-populate from context when opening modal
  useEffect(() => {
    if (show) {
      if (forceBaseCV) {
        setIsBaseCV(true);
      } else {
        const hasParent = !!activeVersion?.parentVersionId;
        setIsBaseCV(!hasParent && !defaultCompanyName);
      }
      setParentId(activeVersion?.parentVersionId || '');
      setRole(activeVersion?.role || '');
      setCompany(defaultCompanyName || activeVersion?.companyName || '');
      setSaveName(activeVersion?.name || '');
    }
  }, [show, activeVersion, defaultCompanyName, forceBaseCV]);

  // Close modal on outside click
  useEffect(() => {
    if (!show) return;
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [show, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!show) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [show, onClose]);

  const handleSaveSubmit = () => {
    onSave({
      name: saveName.trim(),
      isBaseCV,
      parentVersionId: isBaseCV ? null : (parentId || null),
      role: isBaseCV ? undefined : (role.trim() || undefined),
      companyName: isBaseCV ? undefined : (company.trim() || undefined),
    });
    onClose();
    setSaveName('');
    setRole('');
    setCompany('');
    setParentId('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveSubmit();
  };

  if (!show) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} ref={modalRef}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Save CV</h3>
          <button className={styles.modalClose} onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Type selector — hidden when forceBaseCV */}
          {!forceBaseCV && (
            <fieldset className={styles.typeSelector}>
              <legend className={styles.fieldLabel}>What type of CV is this?</legend>
              <label className={`${styles.typeOption} ${isBaseCV ? styles.selected : ''}`}>
                <input
                  type="radio"
                  name="cvType"
                  checked={isBaseCV}
                  onChange={() => setIsBaseCV(true)}
                  className={styles.radio}
                />
                <div>
                  <span className={styles.typeLabel}>Base CV</span>
                  <span className={styles.typeHint}>A template to tailor for roles</span>
                </div>
              </label>
              <label className={`${styles.typeOption} ${!isBaseCV ? styles.selected : ''}`}>
                <input
                  type="radio"
                  name="cvType"
                  checked={!isBaseCV}
                  onChange={() => setIsBaseCV(false)}
                  className={styles.radio}
                />
                <div>
                  <span className={styles.typeLabel}>Role Application</span>
                  <span className={styles.typeHint}>Tailored for a specific role</span>
                </div>
              </label>
            </fieldset>
          )}

          {/* Name field */}
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="save-name">
              {isBaseCV ? 'Name' : 'Version name (optional)'}
            </label>
            <input
              id="save-name"
              autoFocus
              className={styles.input}
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isBaseCV ? 'e.g., Creative CV' : 'e.g., Spotify Designer'}
            />
          </div>

          {/* Application-specific fields */}
          {!isBaseCV && (
            <>
              {/* Parent base CV picker */}
              {baseCvs.length > 0 && (
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="save-parent">Based on</label>
                  <select
                    id="save-parent"
                    className={styles.select}
                    value={parentId}
                    onChange={e => setParentId(e.target.value)}
                  >
                    <option value="">None (ungrouped)</option>
                    {baseCvs.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Organization */}
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="save-company">Organization (optional)</label>
                <input
                  id="save-company"
                  className={styles.input}
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., Spotify"
                />
              </div>

              {/* Role */}
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="save-role">Role (optional)</label>
                <input
                  id="save-role"
                  className={styles.input}
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., Senior Product Designer"
                />
              </div>
            </>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.confirmBtn}
            onClick={handleSaveSubmit}
            disabled={isSaving}
          >
            {isSaving ? (
              <span className={styles.spinner} />
            ) : (
              isBaseCV ? 'Save Base CV' : 'Save Application'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
