import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAppContext } from '../../contexts/AppContext';
import { generateCVFilename } from '../../utils/cvFilename';
import type { CVVersionMeta, CVVersionWithChildren } from '../../types';
import styles from './Dashboard.module.css';

function scoreColor(score: number): string {
  if (score >= 80) return 'good';
  if (score >= 60) return 'medium';
  return 'low';
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function displayName(v: CVVersionMeta): string {
  if (v.companyName && v.role) return `${v.companyName} ${v.role}`;
  if (v.role) return v.role;
  if (v.companyName) return `${v.companyName} Application`;
  return v.name;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { handleVersionLoad, setSavedVersions, setSelectedTemplateForBuild } = useAppContext();
  const [baseCvs, setBaseCvs] = useState<CVVersionWithChildren[]>([]);
  const [ungrouped, setUngrouped] = useState<CVVersionMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandUngrouped, setExpandUngrouped] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [moveDropdownId, setMoveDropdownId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const moveDropdownRef = useRef<HTMLDivElement>(null);

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

  // Fetch versions
  useEffect(() => {
    api.listVersions().then(({ versions, ungrouped: ug }) => {
      setBaseCvs(versions);
      setUngrouped(ug);
      // Expand all groups by default
      setExpandedGroups(new Set(versions.map(v => v.id)));
      setIsLoading(false);
    });
  }, []);

  // Sync flattened versions back to App
  const syncVersionsToApp = useCallback((bases: CVVersionWithChildren[], ug: CVVersionMeta[]) => {
    const all = [
      ...bases,
      ...bases.flatMap(v => v.children || []),
      ...ug
    ];
    setSavedVersions(all);
  }, [setSavedVersions]);

  const toggleGroup = useCallback((id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleOpen = useCallback(async (id: string) => {
    setLoadingId(id);
    const version = await api.getVersion(id);
    setLoadingId(null);
    if (version) {
      handleVersionLoad(version);
      setSelectedTemplateForBuild(version.templateId);
      navigate('/build/form');
    }
  }, [handleVersionLoad, setSelectedTemplateForBuild, navigate]);

  const handleApplyToJob = useCallback(async (baseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const version = await api.getVersion(baseId);
    if (version) {
      handleVersionLoad(version);
      setSelectedTemplateForBuild(version.templateId);
      navigate('/build/form', { state: { mode: 'tune' } });
    }
  }, [handleVersionLoad, setSelectedTemplateForBuild, navigate]);

  const handleDownload = useCallback(async (versionId: string, meta: CVVersionMeta, e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingId(versionId);
    const version = await api.getVersion(versionId);
    if (!version) { setDownloadingId(null); return; }

    const result = await api.compileLatex(version.texContent, version.templateId);
    if (result.success && result.pdf_base64) {
      const bytes = Uint8Array.from(atob(result.pdf_base64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = generateCVFilename({
        fullName: version.formData?.personalInfo?.fullName,
        company: meta.companyName ?? undefined,
        role: meta.role ?? undefined,
      });
      a.click();
      URL.revokeObjectURL(url);
    }
    setDownloadingId(null);
  }, []);

  const handleDuplicate = useCallback(async (baseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDuplicatingId(baseId);
    const version = await api.getVersion(baseId);
    if (version) {
      const saved = await api.saveVersion({
        name: `${version.name} (copy)`,
        templateId: version.templateId,
        texContent: version.texContent,
        formData: version.formData || undefined,
      });
      if (saved) {
        const { versions, ungrouped: ug } = await api.listVersions();
        setBaseCvs(versions);
        setUngrouped(ug);
        setExpandedGroups(prev => { const next = new Set(prev); versions.forEach(v => next.add(v.id)); return next; });
        syncVersionsToApp(versions, ug);
        setRenamingId(saved.id);
        setRenameValue(saved.name);
      }
    }
    setDuplicatingId(null);
  }, [syncVersionsToApp]);

  const handleRenameSubmit = useCallback(async (id: string) => {
    const version = await api.getVersion(id);
    if (!version) { setRenamingId(null); return; }
    // Re-save with new name (delete old + create new with same data)
    const saved = await api.saveVersion({
      name: renameValue.trim() || version.name,
      templateId: version.templateId,
      texContent: version.texContent,
      formData: version.formData || undefined,
      jobDescription: version.jobDescription || undefined,
      companyName: version.companyName || undefined,
      role: version.role || undefined,
      matchScore: version.matchScore ?? undefined,
      baselineMatchScore: version.baselineMatchScore ?? undefined,
      parentVersionId: version.parentVersionId,
    });
    if (saved) {
      await api.deleteVersion(id);
      const { versions, ungrouped: ug } = await api.listVersions();
      setBaseCvs(versions);
      setUngrouped(ug);
      setExpandedGroups(prev => { const next = new Set(prev); versions.forEach(v => next.add(v.id)); return next; });
      syncVersionsToApp(versions, ug);
    }
    setRenamingId(null);
  }, [renameValue, syncVersionsToApp]);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    const ok = await api.deleteVersion(id);
    if (ok) {
      // Re-fetch to get clean hierarchical state (deletion may orphan children)
      const { versions, ungrouped: ug } = await api.listVersions();
      setBaseCvs(versions);
      setUngrouped(ug);
      setExpandedGroups(prev => {
        const next = new Set(prev);
        next.delete(id);
        versions.forEach(v => next.add(v.id));
        return next;
      });
      syncVersionsToApp(versions, ug);
    }
    setDeletingId(null);
  }, [syncVersionsToApp]);

  const handleMove = useCallback(async (versionId: string, newParentId: string | null) => {
    setMoveDropdownId(null);
    const ok = await api.updateVersion(versionId, { parentVersionId: newParentId });
    if (ok) {
      const { versions, ungrouped: ug } = await api.listVersions();
      setBaseCvs(versions);
      setUngrouped(ug);
      setExpandedGroups(prev => {
        const next = new Set(prev);
        versions.forEach(v => next.add(v.id));
        return next;
      });
      syncVersionsToApp(versions, ug);
    }
  }, [syncVersionsToApp]);

  const totalApps = baseCvs.reduce((sum, b) => sum + (b.children?.length || 0), 0) + ungrouped.length;
  const totalBases = baseCvs.length;

  // --- Render helpers ---

  const renderScoreBadge = (score: number | undefined | null, baselineScore?: number | null) => {
    if (score == null) return null;
    const delta = baselineScore != null ? Math.round(score - baselineScore) : null;
    return (
      <>
        <span className={`${styles.scoreBadge} ${styles[scoreColor(score)]}`}>
          {Math.round(score)}%
        </span>
        {delta != null && delta > 0 && (
          <span className={styles.scoreDelta}>+{delta}</span>
        )}
      </>
    );
  };

  const renderAppCard = (app: CVVersionMeta, parentId: string | null) => (
    <div key={app.id} className={styles.appCard}>
      <div className={styles.appInfo}>
        <div className={styles.appRole}>{displayName(app)}</div>
        <div className={styles.appMeta}>
          {renderScoreBadge(app.matchScore, app.baselineMatchScore)}
          {app.matchScore != null && <span className={styles.separator}>&middot;</span>}
          <span>{formatDate(app.createdAt)}</span>
        </div>
      </div>

      <div className={styles.appActions}>
        <button
          className={styles.appOpenBtn}
          onClick={() => handleOpen(app.id)}
          disabled={loadingId === app.id}
        >
          {loadingId === app.id ? <span className={styles.spinnerSm} /> : 'Open'}
        </button>

        {/* Download button */}
        <button
          className={styles.downloadBtn}
          onClick={(e) => handleDownload(app.id, app, e)}
          disabled={downloadingId === app.id}
          title="Download PDF"
        >
          {downloadingId === app.id ? (
            <span className={styles.spinnerSmDark} />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          )}
        </button>

        {/* Move dropdown */}
        <div className={styles.moveContainer} ref={moveDropdownId === app.id ? moveDropdownRef : undefined}>
          <button
            className={styles.moveBtn}
            onClick={() => setMoveDropdownId(prev => prev === app.id ? null : app.id)}
            title="Move to different base CV"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/>
            </svg>
          </button>

          {moveDropdownId === app.id && (
            <div className={styles.moveDropdown}>
              <div className={styles.moveDropdownTitle}>Move to</div>
              {baseCvs.map(base => (
                <button
                  key={base.id}
                  className={`${styles.moveOption} ${base.id === parentId ? styles.active : ''}`}
                  onClick={() => handleMove(app.id, base.id)}
                  disabled={base.id === parentId}
                >
                  {base.name}
                  {base.id === parentId && ' (current)'}
                </button>
              ))}
              {parentId && (
                <button
                  className={styles.moveOptionUngroup}
                  onClick={() => handleMove(app.id, null)}
                >
                  Remove from group
                </button>
              )}
            </div>
          )}
        </div>

        <button
          className={styles.appDeleteBtn}
          onClick={() => handleDelete(app.id)}
          disabled={deletingId === app.id}
          title="Delete"
        >
          {deletingId === app.id ? (
            <span className={styles.spinnerSm} />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.background} />
      <div className={styles.content}>
        <header className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigate('/')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Home
          </button>
          <div>
            <h1 className={styles.title}>My CVs & Applications</h1>
            <p className={styles.subtitle}>
              {totalBases} base CV{totalBases !== 1 ? 's' : ''}
              {totalApps > 0 && <> &middot; {totalApps} application{totalApps !== 1 ? 's' : ''}</>}
            </p>
          </div>
        </header>

        {isLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading your CVs...</p>
          </div>
        ) : baseCvs.length === 0 && ungrouped.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <h2>No saved CVs yet</h2>
            <p>Build or import your first CV. Saved versions will appear here, organized by base CV.</p>
            <button className={styles.emptyAction} onClick={() => navigate('/')}>
              Get started
            </button>
          </div>
        ) : (
          <>
            {/* Base CV groups */}
            {baseCvs.map(base => {
              const isExpanded = expandedGroups.has(base.id);
              const children = base.children || [];

              return (
                <div key={base.id} className={styles.group}>
                  <div className={styles.groupHeader} onClick={() => toggleGroup(base.id)}>
                    <div className={`${styles.groupToggle} ${isExpanded ? styles.expanded : ''}`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 18 6-6-6-6"/>
                      </svg>
                    </div>
                    <div className={styles.groupInfo}>
                      <div className={styles.groupName}>
                        {renamingId === base.id ? (
                          <input
                            className={styles.renameInput}
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(base.id); if (e.key === 'Escape') setRenamingId(null); }}
                            onBlur={() => handleRenameSubmit(base.id)}
                            onClick={e => e.stopPropagation()}
                            autoFocus
                          />
                        ) : base.name}
                      </div>
                      <div className={styles.groupCount}>
                        {children.length} application{children.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className={styles.groupActions} onClick={e => e.stopPropagation()}>
                      <button
                        className={styles.newAppBtn}
                        onClick={(e) => handleApplyToJob(base.id, e)}
                        title="Tailor this CV for a job application"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                        </svg>
                        Tune for a Job
                      </button>
                      <button
                        className={styles.groupOpenBtn}
                        onClick={() => handleOpen(base.id)}
                        disabled={loadingId === base.id}
                        title="Edit base CV"
                      >
                        {loadingId === base.id ? (
                          <span className={styles.spinnerSm} />
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9"/>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                          </svg>
                        )}
                        Edit
                      </button>
                      <button
                        className={styles.downloadBtn}
                        onClick={(e) => handleDownload(base.id, base, e)}
                        disabled={downloadingId === base.id}
                        title="Download PDF"
                      >
                        {downloadingId === base.id ? (
                          <span className={styles.spinnerSmDark} />
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                        )}
                      </button>
                      <button
                        className={styles.downloadBtn}
                        onClick={(e) => handleDuplicate(base.id, e)}
                        disabled={duplicatingId === base.id}
                        title="Duplicate base CV"
                      >
                        {duplicatingId === base.id ? (
                          <span className={styles.spinnerSmDark} />
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                        )}
                      </button>
                      <button
                        className={styles.groupDeleteBtn}
                        onClick={() => handleDelete(base.id)}
                        disabled={deletingId === base.id}
                        title="Delete base CV"
                      >
                        {deletingId === base.id ? (
                          <span className={styles.spinnerSm} />
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/>
                            <path d="M9 6V4h6v2"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className={styles.childrenList}>
                      {children.length === 0 ? (
                        <div className={styles.emptyChildren}>
                          No applications yet. Click "Apply to Job" to create one.
                        </div>
                      ) : (
                        children.map(app => renderAppCard(app, base.id))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Ungrouped section */}
            {ungrouped.length > 0 && (
              <div className={styles.ungroupedSection}>
                <div className={styles.ungroupedHeader} onClick={() => setExpandUngrouped(prev => !prev)}>
                  <div className={`${styles.groupToggle} ${expandUngrouped ? styles.expanded : ''}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </div>
                  <span className={styles.ungroupedTitle}>Ungrouped</span>
                  <span className={styles.ungroupedCount}>({ungrouped.length})</span>
                </div>

                {expandUngrouped && (
                  <div className={styles.group}>
                    {ungrouped.map(app => renderAppCard(app, null))}
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
