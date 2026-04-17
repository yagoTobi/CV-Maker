/**
 * CVSwitcherDropdown -- Inline dropdown listing base CVs for quick switching.
 *
 * Positioned absolute relative to the CVNameButton wrapper in NavBar (Plan 05).
 * Reads savedVersions and activeVersion from CVContext directly -- no data props.
 * Handles click-outside and Escape key for close.
 */
import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCVContext } from '../../../contexts/CVContext';
import { useToolsContext } from '../../../contexts/ToolsContext';
import { api } from '../../../services/api';
import type { CVVersionMeta } from '../../../types';
import styles from './CVSwitcherDropdown.module.css';

interface CVSwitcherDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CVSwitcherDropdown({ isOpen, onClose }: CVSwitcherDropdownProps) {
  const { savedVersions, activeVersion, resetForNewBuild } = useCVContext();
  const { handleVersionLoad } = useToolsContext();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter to base CVs only (parentVersionId null/undefined)
  const baseCVs = savedVersions.filter(v => !v.parentVersionId);

  // Click-outside closes dropdown
  useEffect(() => {
    if (!isOpen) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen, onClose]);

  // Escape key closes dropdown
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleItemClick = async (meta: CVVersionMeta) => {
    const full = await api.getVersion(meta.id);
    if (full) {
      handleVersionLoad(full);
    }
    onClose();
  };

  const handleNewCV = () => {
    resetForNewBuild();
    navigate('/build');
    onClose();
  };

  const isEmpty = baseCVs.length === 0 && !activeVersion;

  return (
    <div ref={containerRef} className={styles.dropdown}>
      <ul className={styles.list} role="listbox">
        {isEmpty && (
          <li className={styles.emptyState} role="option" aria-selected={false}>
            No other CVs
          </li>
        )}
        {!isEmpty && baseCVs.map(cv => {
          const isActive = cv.id === activeVersion?.id;
          return (
            <li key={cv.id} role="option" aria-selected={isActive}>
              <button
                className={`${styles.item}${isActive ? ` ${styles.itemActive}` : ''}`}
                onClick={() => handleItemClick(cv)}
                type="button"
                title={cv.name}
              >
                {cv.name}
              </button>
            </li>
          );
        })}
        <hr className={styles.divider} />
        <li role="option" aria-selected={false}>
          <button
            className={`${styles.item} ${styles.newCvItem}`}
            onClick={handleNewCV}
            type="button"
          >
            + New CV
          </button>
        </li>
      </ul>
    </div>
  );
}
