import { useState } from 'react';
import type { CVVersion, CVVersionMeta } from '../../types';
import styles from './VersionSwitcher.module.css';

interface VersionSwitcherProps {
  activeVersion: CVVersion | null;
  versions: CVVersionMeta[];
  onSave: (name: string) => void;
  onSwitch: (id: string) => void;
  isSaving: boolean;
  onDashboard: () => void;
}

export default function VersionSwitcher({
  activeVersion,
  versions,
  onSave,
  onSwitch,
  isSaving,
  onDashboard,
}: VersionSwitcherProps) {
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState('');

  const handleSaveSubmit = () => {
    const name = saveName.trim() || `Version ${new Date().toLocaleDateString('en-GB')}`;
    onSave(name);
    setSaveName('');
    setShowSaveForm(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveSubmit();
    if (e.key === 'Escape') { setShowSaveForm(false); setSaveName(''); }
  };

  return (
    <div className={styles.container}>
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

      {/* Dashboard link */}
      {versions.length > 0 && (
        <button className={styles.dashBtn} onClick={onDashboard} title="My saved CVs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          </svg>
        </button>
      )}

      {/* Save form / button */}
      {showSaveForm ? (
        <div className={styles.saveForm}>
          <input
            autoFocus
            className={styles.saveInput}
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Version name..."
          />
          <button className={styles.confirmBtn} onClick={handleSaveSubmit} disabled={isSaving}>
            {isSaving ? <span className={styles.spinner} /> : 'Save'}
          </button>
          <button className={styles.cancelBtn} onClick={() => { setShowSaveForm(false); setSaveName(''); }}>
            Cancel
          </button>
        </div>
      ) : (
        <button
          className={styles.saveBtn}
          onClick={() => setShowSaveForm(true)}
          disabled={isSaving}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          Save Version
        </button>
      )}
    </div>
  );
}
