import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useFormBuilder,
  type FormSection,
} from "../../hooks/useFormBuilder";
import { useAppContext } from "../../contexts/AppContext";
import { SaveCVModal } from "../dashboard";
import type { SaveVersionData } from "../dashboard";
import { api } from "../../services/api";
import { VoiceWidget } from "../voice-widget";
import { generateCVFilename } from "../../utils/cvFilename";
import ImportBanner from "./ImportBanner";
import { GripIcon } from "./components/GripIcon";
import {
  PersonalSection,
  WorkSection,
  EducationSection,
  SkillsSection,
  ProjectsSection,
  AwardsSection,
  AdditionalSectionView,
} from "./sections";
import styles from "./CVFormBuilder.module.css";

const SECTION_LABELS: Record<FormSection, string> = {
  personal: "Personal Info",
  work: "Work Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  awards: "Awards",
};

export default function CVFormBuilder() {
  const navigate = useNavigate();
  const {
    selectedTemplateForBuild,
    formData,
    setFormData,
    templates,
    handleSaveVersion,
    savedVersions,
    setSavedVersions,
    activeVersion,
    isSavingVersion,
    cvImport,
  } = useAppContext();

  const templateId = selectedTemplateForBuild || "med-length-proff-cv";

  // All hooks at top — never after a conditional return (key learning #3)
  const fb = useFormBuilder(templateId, formData || undefined);
  const navWrapperRef = useRef<HTMLDivElement>(null);

  // Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [tuneAfterSave, setTuneAfterSave] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const saveFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseCvs = savedVersions.filter((v) => !v.parentVersionId);

  // PDF preview state
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [generatedTex, setGeneratedTex] = useState<string | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [compileWarnings, setCompileWarnings] = useState<string[]>([]);
  const [pageCount, setPageCount] = useState(0);

  // Resizable preview panel
  const [previewWidth, setPreviewWidth] = useState(520);
  const previewWidthRef = useRef(520);
  const resizingRef = useRef(false);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(0);
  const rafIdRef = useRef<number | null>(null); // Persist RAF ID across calls
  const resizeCleanupRef = useRef<(() => void) | null>(null); // For unmount cleanup

  // --- Import awareness ---
  const importMeta = cvImport.importResult;
  const [importDismissed, setImportDismissed] = useState(false);
  const [reviewedFields, setReviewedFields] = useState<Set<string>>(new Set());

  const getFieldConfidence = useCallback(
    (path: string): 'low' | 'medium' | undefined => {
      if (!importMeta || importDismissed) return undefined;
      if (reviewedFields.has(path)) return undefined;
      const level = importMeta.confidence?.fields[path];
      if (level === 'low' || level === 'medium') return level;
      return undefined;
    },
    [importMeta, importDismissed, reviewedFields],
  );

  const markFieldReviewed = useCallback((path: string) => {
    setReviewedFields((prev) => {
      if (prev.has(path)) return prev;
      const next = new Set(prev);
      next.add(path);
      return next;
    });
  }, []);

  const importCtx =
    importMeta && !importDismissed
      ? { getConfidence: getFieldConfidence, markReviewed: markFieldReviewed }
      : undefined;

  // Cleanup import state when leaving the form builder
  useEffect(() => {
    return () => {
      if (cvImport.importResult) {
        cvImport.reset();
      }
    };
    // Only run on unmount — intentionally omit deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sidebar section drag state
  const [navDragFrom, setNavDragFrom] = useState<number | null>(null);
  const [navDragOver, setNavDragOver] = useState<number | null>(null);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    setIsResizing(true);
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = previewWidthRef.current;

    // Set cursor for the entire document during resize
    document.body.style.cursor = "col-resize";

    const onMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;

      // Update ref immediately for smooth tracking
      const delta = resizeStartXRef.current - e.clientX; // Correct: drag right = shrink preview
      const newW = Math.max(
        300,
        Math.min(760, resizeStartWidthRef.current + delta),
      );
      previewWidthRef.current = newW;

      // Cancel previous RAF if exists
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }

      // Always schedule a new RAF
      rafIdRef.current = requestAnimationFrame(() => {
        setPreviewWidth(previewWidthRef.current);
        rafIdRef.current = null;
      });
    };

    const onMouseUp = () => {
      // Guard: already cleaned up, prevent double-cleanup
      if (!resizingRef.current) return;

      // Immediately stop resizing
      resizingRef.current = false;
      setIsResizing(false);

      // Cancel any pending RAF
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      // Do final sync to ensure state matches ref
      setPreviewWidth(previewWidthRef.current);

      // Remove listeners
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mouseleave", onMouseLeave);

      // Reset cursor
      document.body.style.cursor = "";
    };

    // Force cleanup if cursor leaves window (handles extreme edge cases)
    const onMouseLeave = () => {
      if (resizingRef.current) {
        onMouseUp();
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mouseleave", onMouseLeave);

    // Store cleanup so unmount effect can call it
    resizeCleanupRef.current = () => {
      resizingRef.current = false;
      setIsResizing(false);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mouseleave", onMouseLeave);
      document.body.style.cursor = "";
    };
  }, []);

  // Clean up resize listeners on unmount
  useEffect(() => {
    return () => {
      resizeCleanupRef.current?.();
    };
  }, []);

  // Nav drag handlers (only for non-personal sections; index 0 = first reorderable)
  const reorderableNavItems = fb.navSectionOrder.filter(
    (s) => s !== "personal",
  );

  // Deedy template uses a fixed two-column layout — section reordering doesn't apply
  const isDeedyTemplate = templateId === "deedy-resume";

  const handleNavDragStart = (rIdx: number) => {
    setNavDragFrom(rIdx);
  };
  const handleNavDragEnter = (rIdx: number) => {
    if (navDragFrom !== null && navDragFrom !== rIdx) setNavDragOver(rIdx);
  };
  const handleNavDrop = (rIdx: number) => {
    if (navDragFrom !== null && navDragFrom !== rIdx)
      fb.reorderSections(navDragFrom, rIdx);
    setNavDragFrom(null);
    setNavDragOver(null);
  };
  const handleNavDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).draggable = false;
    setNavDragFrom(null);
    setNavDragOver(null);
  };

  const handleGenerate = useCallback(async () => {
    setCompileError(null);
    const { texContent, error } = await fb.generateCV();
    if (error || !texContent) return;

    setGeneratedTex(texContent);
    setIsCompiling(true);
    setPdfBase64(null);

    const result = await api.compileLatex(texContent, templateId);
    setIsCompiling(false);
    setCompileWarnings(result.warnings ?? []);
    setPageCount(result.page_count);

    if (result.success && result.pdf_base64) {
      setPdfBase64(result.pdf_base64);
      // Auto-dismiss import indicators on first successful PDF generation
      if (importMeta && !importDismissed) setImportDismissed(true);
    } else {
      setCompileError(result.error || "Compilation failed");
    }
  }, [fb, templateId, importMeta, importDismissed]);

  const handleRegenerate = async () => {
    if (!generatedTex) return;
    setIsCompiling(true);
    setCompileError(null);
    const result = await api.compileLatex(generatedTex, templateId);
    setIsCompiling(false);
    setCompileWarnings(result.warnings ?? []);
    setPageCount(result.page_count);
    if (result.success && result.pdf_base64) setPdfBase64(result.pdf_base64);
    else setCompileError(result.error || "Compilation failed");
  };

  const handleDownloadPDF = useCallback(() => {
    if (!pdfBase64) return;
    const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = generateCVFilename({ fullName: fb.formData.personalInfo.fullName });
    a.click();
    URL.revokeObjectURL(url);
  }, [pdfBase64, fb.formData.personalInfo.fullName]);

  // Shared helper: sync form data + LaTeX to AppContext before any save
  const prepareForSave = useCallback(async () => {
    setFormData(fb.formData);
    if (!generatedTex) {
      const { texContent } = await fb.generateCV();
      if (texContent) {
        templates.updateContent(texContent);
        templates.setTemplateId(templateId);
      }
    } else {
      templates.updateContent(generatedTex);
      templates.setTemplateId(templateId);
    }
  }, [fb, generatedTex, templateId, templates, setFormData]);

  // Quick-save: overwrite existing version (save new, delete old)
  const doQuickSave = useCallback(async () => {
    if (!activeVersion) return null;
    await prepareForSave();
    const oldId = activeVersion.id;
    const saved = await handleSaveVersion({
      name: activeVersion.name,
      isBaseCV: !activeVersion.parentVersionId,
      parentVersionId: activeVersion.parentVersionId,
      role: activeVersion.role || undefined,
      companyName: activeVersion.companyName || undefined,
    });
    if (saved) {
      await api.deleteVersion(oldId);
      setSavedVersions(prev => prev.filter(v => v.id !== oldId));
    }
    return saved;
  }, [activeVersion, prepareForSave, handleSaveVersion, setSavedVersions]);

  const triggerSaveFlash = useCallback(() => {
    setSaveFlash(true);
    if (saveFlashTimer.current) clearTimeout(saveFlashTimer.current);
    saveFlashTimer.current = setTimeout(() => setSaveFlash(false), 1500);
  }, []);

  const handleSaveCV = useCallback(async () => {
    if (activeVersion) {
      // Existing version — quick-save without modal
      const saved = await doQuickSave();
      if (saved) triggerSaveFlash();
    } else {
      // New CV — show modal to enter name
      setTuneAfterSave(false);
      setShowSaveModal(true);
    }
  }, [activeVersion, doQuickSave, triggerSaveFlash]);

  const handleTuneForRole = useCallback(async () => {
    if (activeVersion) {
      // Already saved — quick-save then navigate to editor in tune mode
      const saved = await doQuickSave();
      if (saved) navigate("/editor", { state: { mode: "tune" } });
    } else {
      // New CV — show modal, then navigate after save
      setTuneAfterSave(true);
      setShowSaveModal(true);
    }
  }, [activeVersion, doQuickSave, navigate]);

  // Modal save callback (only used for first-time saves)
  const handleSaveComplete = useCallback(
    async (data: SaveVersionData) => {
      await prepareForSave();
      const saved = await handleSaveVersion(data);
      if (!saved) return;

      if (tuneAfterSave) {
        navigate("/editor", { state: { mode: "tune" } });
      } else {
        triggerSaveFlash();
      }
    },
    [prepareForSave, handleSaveVersion, tuneAfterSave, navigate, triggerSaveFlash],
  );

  const isGenerateDisabled = fb.isGenerating || isCompiling;
  const showDirty = pdfBase64 !== null && fb.isDirty;

  // Cmd+Enter / Ctrl+Enter to compile
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !isGenerateDisabled) {
        e.preventDefault();
        handleGenerate();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isGenerateDisabled, handleGenerate]);

  return (
    <div className={styles.container}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <button className={styles.backBtn} onClick={() => navigate("/build")}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back
          </button>
          <div className={styles.sidebarTitle}>
            <span className={styles.eyebrow}>Step 2 of 2</span>
            <h2>Fill in your CV</h2>
          </div>
        </div>

        <div ref={navWrapperRef} className={styles.navWrapper}>
          <nav className={styles.sectionNav}>
            {/* Personal — fixed, not draggable */}
            <button
              className={`${styles.navItem} ${fb.activeSection === "personal" ? styles.navActive : ""}`}
              onClick={() => fb.setActiveSection("personal")}
            >
              {SECTION_LABELS["personal"]}
            </button>

            {/* Reorderable sections */}
            {reorderableNavItems.map((section, rIdx) => {
              // Get label for section (dynamic for additional sections)
              const sectionLabel = section.startsWith("additional-")
                ? fb.formData.additionalSections?.[
                    parseInt(section.replace("additional-", ""))
                  ]?.title || "Additional Section"
                : SECTION_LABELS[section as keyof typeof SECTION_LABELS] ||
                  section;

              // For Deedy template, render plain nav buttons (no drag-and-drop)
              if (isDeedyTemplate) {
                return (
                  <button
                    key={section}
                    className={`${styles.navItem} ${fb.activeSection === section ? styles.navActive : ""}`}
                    onClick={() => fb.setActiveSection(section)}
                  >
                    {sectionLabel}
                  </button>
                );
              }

              // For other templates, render draggable nav items
              return (
                <div
                  key={section}
                  data-drag-nav
                  className={`${styles.navDraggable} ${navDragOver === rIdx && navDragFrom !== rIdx ? styles.navDragOver : ""} ${navDragFrom === rIdx ? styles.navDragging : ""}`}
                  onDragStart={() => handleNavDragStart(rIdx)}
                  onDragEnter={() => handleNavDragEnter(rIdx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleNavDrop(rIdx)}
                  onDragEnd={handleNavDragEnd}
                >
                  <span
                    className={styles.navGrip}
                    onMouseDown={(e) => {
                      const nav = (e.currentTarget as HTMLElement).closest(
                        "[data-drag-nav]",
                      ) as HTMLElement | null;
                      if (nav) nav.draggable = true;
                    }}
                  >
                    <GripIcon />
                  </span>
                  <button
                    className={`${styles.navItem} ${fb.activeSection === section ? styles.navActive : ""}`}
                    onClick={() => fb.setActiveSection(section)}
                  >
                    {sectionLabel}
                  </button>
                </div>
              );
            })}

            {/* Add Section button */}
            <button
              className={styles.addSectionBtn}
              onClick={fb.addAdditionalSection}
            >
              + Add Section
            </button>
          </nav>
        </div>

        <div className={styles.sidebarFooter}>
          <VoiceWidget overlayContainerRef={navWrapperRef} />
          <div className={styles.importExport}>
            <button
              className={styles.iconBtn}
              onClick={fb.exportFormData}
              title="Export CV data as JSON"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>
          </div>

          {fb.generateError && (
            <p className={styles.errorMsg}>{fb.generateError}</p>
          )}

          <button
            className={`${styles.generateBtn} ${showDirty ? styles.generateBtnDirty : ""}`}
            onClick={handleGenerate}
            disabled={isGenerateDisabled}
          >
            {fb.isGenerating ? (
              <>
                <span className={styles.spinner} /> Generating...
              </>
            ) : isCompiling ? (
              <>
                <span className={styles.spinner} /> Compiling...
              </>
            ) : pdfBase64 ? (
              <>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 2v6h-6" />
                  <path d="M21 13a9 9 0 1 1-3-7.7L21 8" />
                </svg>
                Regenerate{showDirty ? " ●" : ""}
              </>
            ) : (
              <>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
                Generate CV
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ── Form area ── */}
      <main className={styles.formArea}>
        {importMeta && !importDismissed && importMeta.confidence && importMeta.summary && (
          <ImportBanner
            source={importMeta.source}
            confidence={importMeta.confidence}
            summary={importMeta.summary}
            backendWarnings={importMeta.warnings}
            formData={fb.formData}
            onDismiss={() => setImportDismissed(true)}
          />
        )}
        {fb.activeSection === "personal" && <PersonalSection fb={fb} importCtx={importCtx} />}
        {fb.activeSection === "work" && <WorkSection fb={fb} importCtx={importCtx} />}
        {fb.activeSection === "education" && <EducationSection fb={fb} importCtx={importCtx} />}
        {fb.activeSection === "skills" && <SkillsSection fb={fb} />}
        {fb.activeSection === "projects" && <ProjectsSection fb={fb} />}
        {fb.activeSection === "awards" && <AwardsSection fb={fb} />}
        {fb.activeSection.startsWith("additional-") && (
          <AdditionalSectionView
            fb={fb}
            sectionIndex={parseInt(fb.activeSection.replace("additional-", ""))}
          />
        )}
      </main>

      {/* ── Resize handle ── */}
      <div
        className={styles.resizeHandle}
        onMouseDown={startResize}
        title="Drag to resize"
      />

      {/* ── Preview panel ── */}
      <aside className={styles.previewPanel} style={{ width: previewWidth }}>
        <div className={styles.previewHeader}>
          <h3>Preview</h3>
          {pdfBase64 && (
            <div className={styles.previewActions}>
              <button
                className={styles.actionBtn}
                onClick={handleDownloadPDF}
                title="Download PDF"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download
              </button>
              <button
                className={`${styles.actionBtn} ${saveFlash ? styles.actionBtnSaved : ""}`}
                onClick={handleSaveCV}
                disabled={isSavingVersion}
                title={activeVersion ? "Save changes" : "Save as a new CV"}
              >
                {saveFlash ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Saved!
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    {isSavingVersion ? "Saving..." : "Save"}
                  </>
                )}
              </button>
              {activeVersion ? (
                <>
                  <button
                    className={styles.actionBtn}
                    onClick={() => navigate("/dashboard")}
                    title="Go to Dashboard"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                    Dashboard
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                    onClick={handleTuneForRole}
                    disabled={isSavingVersion}
                    title="Tailor this CV for a specific job"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                    </svg>
                    Tune for a Job
                  </button>
                </>
              ) : (
                <button
                  className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                  onClick={handleTuneForRole}
                  disabled={isSavingVersion}
                  title="Save and tune for a specific role"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  </svg>
                  Tune for a Role
                </button>
              )}
            </div>
          )}
        </div>

        <div className={styles.previewContent}>
          {isCompiling ? (
            <div className={styles.previewLoading}>
              <div className={styles.previewSpinner} />
              <p>Compiling PDF...</p>
            </div>
          ) : compileError ? (
            <div className={styles.previewError}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p>Compilation error</p>
              <pre className={styles.compileErrorPre}>{compileError}</pre>
              <button className={styles.retryBtn} onClick={handleRegenerate}>
                Try again
              </button>
            </div>
          ) : pdfBase64 ? (
            <iframe
              src={`data:application/pdf;base64,${pdfBase64}`}
              title="CV Preview"
              className={styles.pdfFrame}
              style={{ pointerEvents: isResizing ? "none" : "auto" }}
            />
          ) : (
            <div className={styles.previewPlaceholder}>
              <div className={styles.placeholderIcon}>
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <p>
                Fill in your details,
                <br />
                then click <strong>Generate CV</strong>
              </p>
            </div>
          )}
        </div>

        {/* Compile feedback: page count + overflow warnings */}
        {pdfBase64 && (pageCount > 1 || compileWarnings.length > 0) && (
          <div className={styles.compileFeedback}>
            {pageCount > 1 && (
              <p className={styles.pageCountWarning}>
                Your CV is {pageCount} pages — most recruiters prefer a single page.
              </p>
            )}
            {compileWarnings.map((w, i) => (
              <p key={i} className={styles.overflowWarning}>{w}</p>
            ))}
          </div>
        )}

      </aside>

      {/* Save modal (shared between Save CV and Tune for Role) */}
      <SaveCVModal
        show={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveComplete}
        isSaving={isSavingVersion}
        activeVersion={activeVersion}
        baseCvs={baseCvs}
        forceBaseCV
      />
    </div>
  );
}
