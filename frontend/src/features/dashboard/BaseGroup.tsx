import AppCard from './AppCard';
import { ChevronRightIcon, TuneIcon, EditIcon, DownloadIcon, DuplicateIcon, TrashIcon } from './icons';
import type { CVVersionMeta, CVVersionWithChildren } from '../../types';
import styles from './BaseGroup.module.css';

interface BaseGroupProps {
  base: CVVersionWithChildren;
  isExpanded: boolean;
  baseCvs: CVVersionWithChildren[];
  loadingId: string | null;
  downloadingId: string | null;
  deletingId: string | null;
  duplicatingId: string | null;
  renamingId: string | null;
  renameValue: string;
  moveDropdownId: string | null;
  moveDropdownRef: React.RefObject<HTMLDivElement | null>;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onApplyToJob: (baseId: string, e: React.MouseEvent) => void;
  onDownload: (id: string, meta: CVVersionMeta, e: React.MouseEvent) => void;
  onDuplicate: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, newParentId: string | null) => void;
  onSetMoveDropdown: (id: string | null) => void;
  onRenameStart: (id: string, currentName: string) => void;
  onRenameChange: (value: string) => void;
  onRenameSubmit: (id: string) => void;
  onRenameCancel: () => void;
}

export default function BaseGroup({
  base,
  isExpanded,
  baseCvs,
  loadingId,
  downloadingId,
  deletingId,
  duplicatingId,
  renamingId,
  renameValue,
  moveDropdownId,
  moveDropdownRef,
  onToggle,
  onOpen,
  onApplyToJob,
  onDownload,
  onDuplicate,
  onDelete,
  onMove,
  onSetMoveDropdown,
  onRenameStart,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
}: BaseGroupProps) {
  const children = base.children || [];

  return (
    <div className={styles.group}>
      <div className={styles.groupHeader} onClick={() => onToggle(base.id)}>
        <div className={`${styles.groupToggle} ${isExpanded ? styles.expanded : ''}`}>
          <ChevronRightIcon />
        </div>
        <div className={styles.groupInfo}>
          <div className={styles.groupName}>
            {renamingId === base.id ? (
              <input
                className={styles.renameInput}
                value={renameValue}
                onChange={e => onRenameChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') onRenameSubmit(base.id);
                  if (e.key === 'Escape') onRenameCancel();
                }}
                onBlur={() => onRenameSubmit(base.id)}
                onClick={e => e.stopPropagation()}
                autoFocus
              />
            ) : (
              <span
                className={styles.groupNameText}
                onDoubleClick={e => { e.stopPropagation(); onRenameStart(base.id, base.name); }}
                title="Double-click to rename"
              >
                {base.name}
              </span>
            )}
          </div>
          <div className={styles.groupCount}>
            {children.length} application{children.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className={styles.groupActions} onClick={e => e.stopPropagation()}>
          <button
            className={styles.newAppBtn}
            onClick={(e) => onApplyToJob(base.id, e)}
            title="Tailor this CV for a job application"
          >
            <TuneIcon />
            Tune for a Job
          </button>
          <button
            className={styles.groupOpenBtn}
            onClick={() => onOpen(base.id)}
            disabled={loadingId === base.id}
            title="Edit base CV"
          >
            {loadingId === base.id ? (
              <span className={styles.spinnerSm} />
            ) : (
              <EditIcon />
            )}
            Edit
          </button>
          <button
            className={styles.downloadBtn}
            onClick={(e) => onDownload(base.id, base, e)}
            disabled={downloadingId === base.id}
            title="Download PDF"
          >
            {downloadingId === base.id ? (
              <span className={styles.spinnerSmDark} />
            ) : (
              <DownloadIcon />
            )}
          </button>
          <button
            className={styles.downloadBtn}
            onClick={(e) => onDuplicate(base.id, e)}
            disabled={duplicatingId === base.id}
            title="Duplicate base CV"
          >
            {duplicatingId === base.id ? (
              <span className={styles.spinnerSmDark} />
            ) : (
              <DuplicateIcon />
            )}
          </button>
          <button
            className={styles.groupDeleteBtn}
            onClick={() => onDelete(base.id)}
            disabled={deletingId === base.id}
            title="Delete base CV"
          >
            {deletingId === base.id ? (
              <span className={styles.spinnerSm} />
            ) : (
              <TrashIcon />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className={styles.childrenList}>
          {children.length === 0 ? (
            <div className={styles.emptyChildren}>
              No applications yet. Click "Tune for a Job" to create one.
            </div>
          ) : (
            children.map(app => (
              <AppCard
                key={app.id}
                app={app}
                parentId={base.id}
                baseCvs={baseCvs}
                loadingId={loadingId}
                downloadingId={downloadingId}
                deletingId={deletingId}
                moveDropdownId={moveDropdownId}
                onOpen={onOpen}
                onDownload={onDownload}
                onDelete={onDelete}
                onMove={onMove}
                onSetMoveDropdown={onSetMoveDropdown}
                moveDropdownRef={moveDropdownRef}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
