import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import { useCVContext } from '../../contexts/CVContext';
import { useToolsContext } from '../../contexts/ToolsContext';
import { useToast } from '../../contexts/ToastContext';
import { generateCVFilename } from '../../utils/cvFilename';
import { downloadPdf } from '../../utils/downloadPdf';
import { truncateError } from '../../utils/errorMessages';
import { useDashboardVersions } from './useDashboardVersions';
import BaseGroup from './BaseGroup';
import AppCard from './AppCard';
import { BackChevronIcon, ChevronRightIcon, DocumentIcon } from './icons';
import type { CVVersionMeta } from '../../types';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const filterBaseId = (location.state as { baseId?: string } | null)?.baseId ?? null;

  const { setSelectedTemplateForBuild } = useCVContext();
  const { handleVersionLoad } = useToolsContext();
  const toast = useToast();

  const versions = useDashboardVersions();

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [moveDropdownId, setMoveDropdownId] = useState<string | null>(null);
  const [expandUngrouped, setExpandUngrouped] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const moveDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close move dropdown on outside click
  useEffect(() => {
    if (!moveDropdownId) return;
    const handleClick = (e: MouseEvent) => {
      if (moveDropdownRef.current && !moveDropdownRef.current.contains(e.target as Node)) {
        setMoveDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [moveDropdownId]);

  const handleOpen = useCallback(async (id: string) => {
    setLoadingId(id);
    const version = await api.getVersion(id);
    setLoadingId(null);
    if (!version || !version.formData) {
      toast.error("Couldn't load that CV. Check your connection and try again.");
      return;
    }
    handleVersionLoad(version);
    setSelectedTemplateForBuild(version.templateId);
    navigate('/build/form');
  }, [handleVersionLoad, setSelectedTemplateForBuild, navigate, toast]);

  const handleApplyToJob = useCallback(async (baseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const version = await api.getVersion(baseId);
    if (!version || !version.formData) {
      toast.error("Couldn't load that CV. Check your connection and try again.");
      return;
    }
    handleVersionLoad(version);
    setSelectedTemplateForBuild(version.templateId);
    navigate('/build/form', { state: { tune: true } });
  }, [handleVersionLoad, setSelectedTemplateForBuild, navigate, toast]);

  const handleDownload = useCallback(async (versionId: string, meta: CVVersionMeta, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingId(versionId);
    try {
      const version = await api.getVersion(versionId);
      if (!version || !version.formData) {
        toast.error("Couldn't load that CV. Check your connection and try again.");
        return;
      }
      const { texContent, error: genError } = await api.generateLatex(version.formData);
      if (!texContent) {
        toast.error(`Couldn't generate your PDF. ${truncateError(genError)}`);
        return;
      }
      const result = await api.compileLatex(texContent, version.templateId);
      if (result.success && result.pdf_base64) {
        downloadPdf(result.pdf_base64, generateCVFilename({
          fullName: version.formData?.personalInfo?.fullName,
          company: meta.companyName ?? undefined,
          role: meta.role ?? undefined,
        }));
        if (result.warnings?.length) {
          toast.warning(result.warnings.join(' '));
        }
      } else {
        toast.error(`PDF compilation failed. ${result.error ? truncateError(result.error) : 'The compiler did not return a PDF.'}`);
      }
    } catch {
      toast.error('Download failed. Check your connection and try again.');
    } finally {
      setDownloadingId(null);
    }
  }, [toast]);

  const handleRequestDelete = useCallback((id: string) => {
    setConfirmDeleteId(id);
  }, []);

  const handleConfirmDelete = useCallback(async (id: string) => {
    setConfirmDeleteId(null);
    await versions.remove(id);
  }, [versions]);

  const handleCancelDelete = useCallback(() => {
    setConfirmDeleteId(null);
  }, []);

  const handleRenameStart = useCallback((id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  }, []);

  const handleRenameSubmit = useCallback(async (id: string) => {
    const value = renameValue;
    setRenamingId(null);
    await versions.rename(id, value);
  }, [renameValue, versions]);

  const handleRenameCancel = useCallback(() => {
    setRenamingId(null);
  }, []);

  const handleDuplicate = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = await versions.duplicate(id);
    // Auto-open rename for the new copy. Look it up in the refreshed baseCvs.
    if (newId) {
      // Name is set by the hook as "<original> (copy)" — find it for the input prefill
      const newBase = versions.baseCvs.find(v => v.id === newId);
      setRenamingId(newId);
      setRenameValue(newBase?.name ?? '');
    }
  }, [versions]);

  const handleMove = useCallback(async (versionId: string, newParentId: string | null) => {
    setMoveDropdownId(null);
    await versions.reparent(versionId, newParentId);
  }, [versions]);

  const displayedBases = filterBaseId
    ? versions.baseCvs.filter(b => b.id === filterBaseId)
    : versions.baseCvs;

  const totalApps = displayedBases.reduce((sum, b) => sum + (b.children?.length || 0), 0)
    + (filterBaseId ? 0 : versions.ungrouped.length);
  const totalBases = displayedBases.length;

  return (
    <div className={styles.container}>
      <div className={styles.background} />
      <div className={styles.content}>
        <header className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigate('/')}>
            <BackChevronIcon />
            Home
          </button>
          <div>
            <h1 className={styles.title}>CV Workspace</h1>
            <p className={styles.subtitle}>
              {totalBases} baseline CV{totalBases !== 1 ? 's' : ''}
              {totalApps > 0 && <> &middot; {totalApps} application{totalApps !== 1 ? 's' : ''}</>}
            </p>
          </div>
        </header>

        {versions.isLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading your CVs...</p>
          </div>
        ) : versions.baseCvs.length === 0 && versions.ungrouped.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <DocumentIcon />
            </div>
            <h2>No saved CVs yet</h2>
            <p>Build or import your first CV, then use it as a baseline for job applications.</p>
            <button className={styles.emptyAction} onClick={() => navigate('/')}>
              Get started
            </button>
          </div>
        ) : (
          <>
            {filterBaseId && displayedBases.length > 0 && (
              <div className={styles.breadcrumb}>
                <button
                  className={styles.breadcrumbLink}
                  onClick={() => navigate('/dashboard', { state: null, replace: true })}
                  type="button"
                >
                  All CVs
                </button>
                <span className={styles.breadcrumbSep}>/</span>
                <span className={styles.breadcrumbCurrent}>{displayedBases[0]?.name}</span>
              </div>
            )}

            {displayedBases.map(base => (
              <BaseGroup
                key={base.id}
                base={base}
                isExpanded={versions.expandedGroups.has(base.id)}
                baseCvs={versions.baseCvs}
                loadingId={loadingId}
                downloadingId={downloadingId}
                deletingId={versions.deletingId}
                duplicatingId={versions.duplicatingId}
                renamingId={renamingId}
                renameValue={renameValue}
                moveDropdownId={moveDropdownId}
                confirmDeleteId={confirmDeleteId}
                moveDropdownRef={moveDropdownRef}
                onToggle={versions.toggleGroup}
                onOpen={handleOpen}
                onApplyToJob={handleApplyToJob}
                onDownload={handleDownload}
                onDuplicate={handleDuplicate}
                onRequestDelete={handleRequestDelete}
                onConfirmDelete={handleConfirmDelete}
                onCancelDelete={handleCancelDelete}
                onMove={handleMove}
                onSetMoveDropdown={setMoveDropdownId}
                onRenameStart={handleRenameStart}
                onRenameChange={setRenameValue}
                onRenameSubmit={handleRenameSubmit}
                onRenameCancel={handleRenameCancel}
              />
            ))}

            {!filterBaseId && versions.ungrouped.length > 0 && (
              <div className={styles.ungroupedSection}>
                <div
                  className={styles.ungroupedHeader}
                  onClick={() => setExpandUngrouped(prev => !prev)}
                >
                  <div className={`${styles.groupToggle} ${expandUngrouped ? styles.expanded : ''}`}>
                    <ChevronRightIcon />
                  </div>
                  <span className={styles.ungroupedTitle}>Ungrouped</span>
                  <span className={styles.ungroupedCount}>({versions.ungrouped.length})</span>
                </div>

                {expandUngrouped && (
                  <div className={styles.group}>
                    {versions.ungrouped.map(app => (
                      <AppCard
                        key={app.id}
                        app={app}
                        parentId={null}
                        baseCvs={versions.baseCvs}
                        loadingId={loadingId}
                        downloadingId={downloadingId}
                        deletingId={versions.deletingId}
                        moveDropdownId={moveDropdownId}
                        confirmDeleteId={confirmDeleteId}
                        onOpen={handleOpen}
                        onDownload={handleDownload}
                        onRequestDelete={handleRequestDelete}
                        onConfirmDelete={handleConfirmDelete}
                        onCancelDelete={handleCancelDelete}
                        onMove={handleMove}
                        onSetMoveDropdown={setMoveDropdownId}
                        moveDropdownRef={moveDropdownRef}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
