import { useState } from 'react';
import type { CVVersion, CVVersionMeta } from '../../types';
import SaveCVModal from './SaveCVModal';
import type { SaveVersionData } from './SaveCVModal';
import styles from './VersionSwitcher.module.css';

// Re-export for consumers
export type { SaveVersionData };

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

      {/* Reusable save modal */}
      <SaveCVModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onSave={onSave}
        isSaving={isSaving}
        activeVersion={activeVersion}
        baseCvs={baseCvs}
        defaultCompanyName={defaultCompanyName}
      />
    </div>
  );
}
