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

interface VersionSwitcherProps {
  activeVersion: CVVersion | null;
  versions: CVVersionMeta[];
  baseCvs: CVVersionMeta[];
  onSave: (data: SaveVersionData) => void;
  onSwitch: (id: string) => void;
  isSaving: boolean;
  onDashboard: () => void;
  defaultCompanyName?: string;
}

export default function VersionSwitcher({
  activeVersion,
  versions,
  baseCvs,
  onSave,
  onSwitch,
  isSaving,
  onDashboard,
  defaultCompanyName,
}: VersionSwitcherProps) {
  const [showModal, setShowModal] = useState(false);
  const [isBaseCV, setIsBaseCV] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Pre-populate from active version context when opening modal
  useEffect(() => {
    if (showModal) {
      const hasParent = !!activeVersion?.parentVersionId;
      setIsBaseCV(!hasParent && !defaultCompanyName);
      setParentId(activeVersion?.parentVersionId || '');
      setRole(activeVersion?.role || '');
      setCompany(defaultCompanyName || activeVersion?.companyName || '');
      setSaveName(activeVersion?.name || '');
    }
  }, [showModal, activeVersion, defaultCompanyName]);

  // Close modal on outside click
  useEffect(() => {
    if (!showModal) return;
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setShowModal(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showModal]);

  // Close on Escape
  useEffect(() => {
    if (!showModal) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowModal(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showModal]);

  const handleSaveSubmit = () => {
    onSave({
      name: saveName.trim(),
      isBaseCV,
      parentVersionId: isBaseCV ? null : (parentId || null),
      role: isBaseCV ? undefined : (role.trim() || undefined),
      companyName: isBaseCV ? undefined : (company.trim() || undefined),
    });
    setShowModal(false);
    setSaveName('');
    setRole('');
    setCompany('');
    setParentId('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveSubmit();
  };

  return (
    <div className={styles.container}>
      {/* Dashboard link — always visible, prominent */}
      <button className={styles.dashBtn} onClick={onDashboard} title="My CVs & Applications">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
        My CVs
      </button>

      {/* Version select dropdown */}
      {versions.length > 0 && (
        <select
          className={styles.versionSelect}
          value={activeVersion?.id || ''}
          onChange={e => { if (e.target.value) onSwitch(e.target.value); }}
        >
          <option value="">Unsaved / New</option>
          {versions.map(v => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      )}

      {/* Save button */}
      <button
        className={styles.saveBtn}
        onClick={() => setShowModal(true)}
        disabled={isSaving}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
        Save
      </button>

      {/* Save modal overlay */}
      {showModal && (
        <div className={styles.overlay}>
          <div className={styles.modal} ref={modalRef}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Save CV</h3>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Type selector */}
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
                    <span className={styles.typeHint}>A template to tailor for jobs</span>
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
                    <span className={styles.typeLabel}>Job Application</span>
                    <span className={styles.typeHint}>Tailored for a specific role</span>
                  </div>
                </label>
              </fieldset>

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

              {/* Job application fields */}
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

                  {/* Company */}
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="save-company">Company (optional)</label>
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
              <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>
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
      )}
    </div>
  );
}
