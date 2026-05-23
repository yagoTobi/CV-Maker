import { formatDate, scoreColorClass } from '../../utils/cvDisplayUtils';
import { DownloadIcon, TrashIcon, MoveIcon } from './icons';
import type { CVVersionMeta, CVVersionWithChildren } from '../../types';
import styles from './AppCard.module.css';

interface AppCardProps {
  app: CVVersionMeta;
  parentId: string | null;
  baseCvs: CVVersionWithChildren[];
  loadingId: string | null;
  downloadingId: string | null;
  deletingId: string | null;
  moveDropdownId: string | null;
  onOpen: (id: string) => void;
  onDownload: (id: string, meta: CVVersionMeta, e: React.MouseEvent) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, newParentId: string | null) => void;
  onSetMoveDropdown: (id: string | null) => void;
  moveDropdownRef: React.RefObject<HTMLDivElement | null>;
}

function ScoreBadge({ score, baselineScore }: { score: number; baselineScore?: number | null }) {
  const delta = baselineScore != null ? Math.round(score - baselineScore) : null;
  return (
    <>
      <span className={`${styles.scoreBadge} ${styles[scoreColorClass(score)]}`}>
        {Math.round(score)}%
      </span>
      {delta != null && delta > 0 && (
        <span className={styles.scoreDelta}>+{delta}</span>
      )}
    </>
  );
}

function displayName(v: CVVersionMeta): string {
  if (v.companyName && v.role) return `${v.companyName} ${v.role}`;
  if (v.role) return v.role;
  if (v.companyName) return `${v.companyName} Application`;
  return v.name;
}

export default function AppCard({
  app,
  parentId,
  baseCvs,
  loadingId,
  downloadingId,
  deletingId,
  moveDropdownId,
  onOpen,
  onDownload,
  onDelete,
  onMove,
  onSetMoveDropdown,
  moveDropdownRef,
}: AppCardProps) {
  const isThisMoveOpen = moveDropdownId === app.id;

  return (
    <div className={styles.appCard}>
      <div className={styles.appInfo}>
        <div className={styles.appRole}>{displayName(app)}</div>
        <div className={styles.appMeta}>
          {app.matchScore != null && (
            <ScoreBadge score={app.matchScore} baselineScore={app.baselineMatchScore} />
          )}
          {app.matchScore != null && <span className={styles.separator}>&middot;</span>}
          <span>{formatDate(app.createdAt)}</span>
        </div>
      </div>

      <div className={styles.appActions}>
        <button
          className={styles.appOpenBtn}
          onClick={() => onOpen(app.id)}
          disabled={loadingId === app.id}
        >
          {loadingId === app.id ? <span className={styles.spinnerSm} /> : 'Open'}
        </button>

        <button
          className={styles.downloadBtn}
          onClick={(e) => onDownload(app.id, app, e)}
          disabled={downloadingId === app.id}
          title="Download PDF"
        >
          {downloadingId === app.id ? (
            <span className={styles.spinnerSmDark} />
          ) : (
            <DownloadIcon />
          )}
        </button>

        <div
          className={styles.moveContainer}
          ref={isThisMoveOpen ? moveDropdownRef : undefined}
        >
          <button
            className={styles.moveBtn}
            onClick={() => onSetMoveDropdown(isThisMoveOpen ? null : app.id)}
            title="Move to different base CV"
          >
            <MoveIcon />
          </button>

          {isThisMoveOpen && (
            <div className={styles.moveDropdown}>
              <div className={styles.moveDropdownTitle}>Move to</div>
              {baseCvs.map(base => (
                <button
                  key={base.id}
                  className={`${styles.moveOption} ${base.id === parentId ? styles.active : ''}`}
                  onClick={() => onMove(app.id, base.id)}
                  disabled={base.id === parentId}
                >
                  {base.name}
                  {base.id === parentId && ' (current)'}
                </button>
              ))}
              {parentId && (
                <button
                  className={styles.moveOptionUngroup}
                  onClick={() => onMove(app.id, null)}
                >
                  Remove from group
                </button>
              )}
            </div>
          )}
        </div>

        <button
          className={styles.appDeleteBtn}
          onClick={() => onDelete(app.id)}
          disabled={deletingId === app.id}
          title="Delete"
        >
          {deletingId === app.id ? (
            <span className={styles.spinnerSm} />
          ) : (
            <TrashIcon />
          )}
        </button>
      </div>
    </div>
  );
}
