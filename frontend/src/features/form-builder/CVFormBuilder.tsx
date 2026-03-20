import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useFormBuilder,
  type FormSection,
  DEFAULT_PERSONAL_ORDER,
} from "../../hooks/useFormBuilder";
import { useAppContext } from "../../contexts/AppContext";
import { SaveCVModal } from "../dashboard";
import type { SaveVersionData } from "../dashboard";
import { api } from "../../services/api";
import type { CVFormData } from "../../types";
import { VoiceWidget } from "../voice-widget";
import { generateCVFilename } from "../../utils/cvFilename";
import ImportBanner from "./ImportBanner";
import { deriveLinkLabel } from "../../utils/deriveLinkLabel";
import styles from "./CVFormBuilder.module.css";

const SECTION_LABELS: Record<FormSection, string> = {
  personal: "Personal Info",
  work: "Work Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  awards: "Awards",
};

// Grip icon for drag handles
function GripIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={styles.gripIcon}
    >
      <circle cx="9" cy="5" r="1.5" />
      <circle cx="15" cy="5" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="15" cy="19" r="1.5" />
    </svg>
  );
}

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

// ─── Section components ─────────────────────────────────────────────────────
// Pure render components — drag state is local to each (key learning #3: hooks only inside component bodies, never after conditionals)

type FB = ReturnType<typeof useFormBuilder>;

interface ImportCtx {
  getConfidence: (path: string) => 'low' | 'medium' | undefined;
  markReviewed: (path: string) => void;
}

function useDrag(onReorder: (from: number, to: number) => void) {
  const dragFromRef = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  // Sets draggable=true on the nearest [data-drag-card] ancestor.
  // Cards have NO draggable attribute in JSX — it's only toggled here.
  // This prevents draggable from interfering with text cursor positioning
  // inside child inputs when not actively dragging (key learning #21).
  const onHandleMouseDown = (e: React.MouseEvent) => {
    const card = (e.currentTarget as HTMLElement).closest(
      "[data-drag-card]",
    ) as HTMLElement | null;
    if (card) card.draggable = true;
  };

  const onDragStart = (e: React.DragEvent, i: number) => {
    e.stopPropagation();
    dragFromRef.current = i;
  };
  const onDragEnter = (e: React.DragEvent, i: number) => {
    e.stopPropagation();
    if (dragFromRef.current !== null && dragFromRef.current !== i)
      setDragOver(i);
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const onDrop = (e: React.DragEvent, i: number) => {
    e.stopPropagation();
    if (dragFromRef.current !== null && dragFromRef.current !== i)
      onReorder(dragFromRef.current, i);
    dragFromRef.current = null;
    setDragOver(null);
  };
  // Resets draggable=false on the card after drag completes
  const onDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).draggable = false;
    dragFromRef.current = null;
    setDragOver(null);
  };

  return {
    dragOver,
    onHandleMouseDown,
    onDragStart,
    onDragEnter,
    onDragOver,
    onDrop,
    onDragEnd,
  };
}

const PERSONAL_FIELD_META: Record<string, { label: string }> = {
  phone: { label: "Phone" },
  email: { label: "Email" },
  location: { label: "Location" },
  links: { label: "Links" },
};

function PersonalSection({ fb, importCtx }: { fb: FB; importCtx?: ImportCtx }) {
  const p = fb.formData.personalInfo;
  const personalOrder = (p.personalOrder ?? DEFAULT_PERSONAL_ORDER) as string[];
  const headerDrag = useDrag(fb.reorderPersonalFields);

  const gc = importCtx?.getConfidence;
  const mr = importCtx?.markReviewed;

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Personal Information</h3>
      <div className={styles.formGrid}>
        <Field label="Full Name" required confidence={gc?.('personalInfo.fullName')}>
          <input
            className={styles.input}
            value={p.fullName}
            onChange={(e) => {
              fb.updatePersonalInfo({ fullName: e.target.value });
              mr?.('personalInfo.fullName');
            }}
            placeholder="Jane Smith"
          />
        </Field>
        <Field label="Email" required confidence={gc?.('personalInfo.email')}>
          <input
            className={styles.input}
            type="email"
            value={p.email}
            onChange={(e) => {
              fb.updatePersonalInfo({ email: e.target.value });
              mr?.('personalInfo.email');
            }}
            placeholder="jane@example.com"
          />
        </Field>
        <Field label="Phone" confidence={gc?.('personalInfo.phone')}>
          <input
            className={styles.input}
            value={p.phone}
            onChange={(e) => {
              fb.updatePersonalInfo({ phone: e.target.value });
              mr?.('personalInfo.phone');
            }}
            placeholder="+44 7700 000000"
          />
        </Field>
        <Field label="Location" confidence={gc?.('personalInfo.location')}>
          <input
            className={styles.input}
            value={p.location}
            onChange={(e) => {
              fb.updatePersonalInfo({ location: e.target.value });
              mr?.('personalInfo.location');
            }}
            placeholder="London, UK"
          />
        </Field>
      </div>

      {/* Summary / intro paragraph */}
      <div className={styles.summaryField}>
        <Field label="Summary">
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            value={p.summary || ""}
            onChange={(e) => fb.updatePersonalInfo({ summary: e.target.value })}
            placeholder="Motivated software engineer with 5+ years of experience..."
            rows={3}
          />
        </Field>
      </div>

      {/* Header line order */}
      <div className={styles.headerOrderSection}>
        <div className={styles.subSectionHeader}>
          <h4>Header Line Order</h4>
        </div>
        <p className={styles.hint}>
          Drag to reorder how items appear on your CV header.
        </p>
        <div className={styles.headerOrderChips}>
          {personalOrder.map((fieldKey, i) => {
            const meta = PERSONAL_FIELD_META[fieldKey];
            if (!meta) return null;
            const hasValue =
              fieldKey === "links"
                ? p.links.length > 0
                : fieldKey === "phone"
                  ? !!p.phone
                  : fieldKey === "email"
                    ? !!p.email
                    : !!p.location;
            return (
              <div
                key={fieldKey}
                className={`${styles.headerChip} ${!hasValue ? styles.headerChipEmpty : ""} ${headerDrag.dragOver === i ? styles.headerChipDragOver : ""}`}
                data-drag-card
                onMouseDown={headerDrag.onHandleMouseDown}
                onDragStart={(e) => headerDrag.onDragStart(e, i)}
                onDragEnter={(e) => headerDrag.onDragEnter(e, i)}
                onDragOver={headerDrag.onDragOver}
                onDrop={(e) => headerDrag.onDrop(e, i)}
                onDragEnd={headerDrag.onDragEnd}
              >
                <GripIcon />
                <span>{meta.label}</span>
                {fieldKey === "links" && p.links.length > 0 && (
                  <span className={styles.chipCount}>{p.links.length}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Links — URL only, label auto-derived */}
      <div className={styles.subSection}>
        <div className={styles.subSectionHeader}>
          <h4>Links</h4>
          <button className={styles.addBtn} onClick={fb.addLink}>
            + Add Link
          </button>
        </div>
        {p.links.map((link, i) => (
          <div key={i} className={styles.linkItem}>
            <input
              className={styles.input}
              value={link.url}
              onChange={(e) => {
                const url = e.target.value;
                fb.updateLink(i, "url", url);
                fb.updateLink(i, "label", deriveLinkLabel(url));
              }}
              placeholder="https://github.com/username"
            />
            <span className={styles.linkLabelBadge}>
              {deriveLinkLabel(link.url)}
            </span>
            <button
              className={styles.removeBtn}
              onClick={() => fb.removeLink(i)}
              title="Remove link"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

interface WorkEntryCardProps {
  job: CVFormData["workExperience"][0];
  index: number;
  total: number;
  fb: FB;
  dragState: ReturnType<typeof useDrag>;
  importCtx?: ImportCtx;
}

function WorkEntryCard({
  job,
  index: i,
  total,
  fb,
  dragState: drag,
  importCtx,
}: WorkEntryCardProps) {
  const gc = importCtx?.getConfidence;
  const mr = importCtx?.markReviewed;
  const bulletDrag = useDrag((from, to) => fb.reorderBullets(i, from, to));

  return (
    <div
      className={`${styles.card} ${drag.dragOver === i ? styles.cardDragOver : ""}`}
      data-drag-card
      onDragStart={(e) => drag.onDragStart(e, i)}
      onDragEnter={(e) => drag.onDragEnter(e, i)}
      onDragOver={drag.onDragOver}
      onDrop={(e) => drag.onDrop(e, i)}
      onDragEnd={drag.onDragEnd}
    >
      <div className={styles.cardHeader}>
        <span
          className={styles.cardDragHandle}
          onMouseDown={drag.onHandleMouseDown}
        >
          <GripIcon />
        </span>
        <input
          className={`${styles.input} ${styles.cardLabelInput}`}
          value={job.company}
          onChange={(e) => { fb.updateWorkEntry(i, { company: e.target.value }); mr?.(`workExperience[${i}].company`); }}
          placeholder={`Company ${i + 1}`}
        />
        {total > 1 && (
          <button
            className={styles.removeBtn}
            onClick={() => fb.removeWorkEntry(i)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
      <div className={styles.formGrid}>
        <Field label="Title" required confidence={gc?.(`workExperience[${i}].title`)}>
          <input
            className={styles.input}
            value={job.title}
            onChange={(e) => { fb.updateWorkEntry(i, { title: e.target.value }); mr?.(`workExperience[${i}].title`); }}
            placeholder="Software Engineer"
          />
        </Field>
        <Field label="Location" confidence={gc?.(`workExperience[${i}].location`)}>
          <input
            className={styles.input}
            value={job.location}
            onChange={(e) => { fb.updateWorkEntry(i, { location: e.target.value }); mr?.(`workExperience[${i}].location`); }}
            placeholder="London, UK"
          />
        </Field>
        <Field label="Start Date" confidence={gc?.(`workExperience[${i}].startDate`)}>
          <input
            className={styles.input}
            value={job.startDate}
            onChange={(e) => { fb.updateWorkEntry(i, { startDate: e.target.value }); mr?.(`workExperience[${i}].startDate`); }}
            placeholder="Jan 2022"
          />
        </Field>
        <Field label="End Date" confidence={gc?.(`workExperience[${i}].endDate`)}>
          <input
            className={styles.input}
            value={job.endDate}
            onChange={(e) => { fb.updateWorkEntry(i, { endDate: e.target.value }); mr?.(`workExperience[${i}].endDate`); }}
            placeholder="Present"
          />
        </Field>
      </div>
      <div className={styles.bulletsSection}>
        <div className={styles.subSectionHeader}>
          <h4>Bullet Points</h4>
          <button className={styles.addBtn} onClick={() => fb.addBullet(i)}>
            + Add
          </button>
        </div>
        {job.bullets.map((bullet, bi) => (
          <div
            key={bi}
            className={`${styles.bulletRow} ${bulletDrag.dragOver === bi ? styles.bulletRowDragOver : ""}`}
            data-drag-card
            onDragStart={(e) => bulletDrag.onDragStart(e, bi)}
            onDragEnter={(e) => bulletDrag.onDragEnter(e, bi)}
            onDragOver={bulletDrag.onDragOver}
            onDrop={(e) => bulletDrag.onDrop(e, bi)}
            onDragEnd={bulletDrag.onDragEnd}
          >
            <span
              className={styles.bulletDragHandle}
              onMouseDown={bulletDrag.onHandleMouseDown}
              aria-label="Drag to reorder"
            >
              <GripIcon />
            </span>
            <textarea
              className={`${styles.input} ${styles.bulletInput}`}
              value={bullet}
              onChange={(e) => fb.updateBullet(i, bi, e.target.value)}
              placeholder="Describe an achievement or responsibility..."
              rows={2}
            />
            {job.bullets.length > 1 && (
              <button
                className={styles.removeBtn}
                onClick={() => fb.removeBullet(i, bi)}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkSection({ fb, importCtx }: { fb: FB; importCtx?: ImportCtx }) {
  const drag = useDrag(fb.reorderWorkEntries);
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Work Experience</h3>
        <button className={styles.addBtn} onClick={fb.addWorkEntry}>
          + Add Position
        </button>
      </div>
      {fb.formData.workExperience.map((job, i) => (
        <WorkEntryCard
          key={i}
          job={job}
          index={i}
          total={fb.formData.workExperience.length}
          fb={fb}
          dragState={drag}
          importCtx={importCtx}
        />
      ))}
    </section>
  );
}

interface EducationEntryCardProps {
  edu: CVFormData["education"][0];
  index: number;
  total: number;
  fb: FB;
  dragState: ReturnType<typeof useDrag>;
  importCtx?: ImportCtx;
}

function EducationEntryCard({
  edu,
  index: i,
  total,
  fb,
  dragState: drag,
  importCtx,
}: EducationEntryCardProps) {
  const gc = importCtx?.getConfidence;
  const mr = importCtx?.markReviewed;
  const detailDrag = useDrag((from, to) => fb.reorderEduDetails(i, from, to));

  return (
    <div
      className={`${styles.card} ${drag.dragOver === i ? styles.cardDragOver : ""}`}
      data-drag-card
      onDragStart={(e) => drag.onDragStart(e, i)}
      onDragEnter={(e) => drag.onDragEnter(e, i)}
      onDragOver={drag.onDragOver}
      onDrop={(e) => drag.onDrop(e, i)}
      onDragEnd={drag.onDragEnd}
    >
      <div className={styles.cardHeader}>
        <span
          className={styles.cardDragHandle}
          onMouseDown={drag.onHandleMouseDown}
        >
          <GripIcon />
        </span>
        <input
          className={`${styles.input} ${styles.cardLabelInput}`}
          value={edu.school}
          onChange={(e) => { fb.updateEducationEntry(i, { school: e.target.value }); mr?.(`education[${i}].school`); }}
          placeholder={`Institution ${i + 1}`}
        />
        {total > 1 && (
          <button
            className={styles.removeBtn}
            onClick={() => fb.removeEducationEntry(i)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
      <div className={styles.formGrid}>
        <Field label="Degree" required confidence={gc?.(`education[${i}].degree`)}>
          <input
            className={styles.input}
            value={edu.degree}
            onChange={(e) => { fb.updateEducationEntry(i, { degree: e.target.value }); mr?.(`education[${i}].degree`); }}
            placeholder="BSc Computer Science"
          />
        </Field>
        <Field label="GPA" confidence={gc?.(`education[${i}].gpa`)}>
          <input
            className={styles.input}
            value={edu.gpa || ""}
            onChange={(e) => { fb.updateEducationEntry(i, { gpa: e.target.value }); mr?.(`education[${i}].gpa`); }}
            placeholder="3.8 / 4.0"
          />
        </Field>
        <Field label="Start Date" confidence={gc?.(`education[${i}].startDate`)}>
          <input
            className={styles.input}
            value={edu.startDate}
            onChange={(e) => { fb.updateEducationEntry(i, { startDate: e.target.value }); mr?.(`education[${i}].startDate`); }}
            placeholder="Sep 2019"
          />
        </Field>
        <Field label="End Date" confidence={gc?.(`education[${i}].endDate`)}>
          <input
            className={styles.input}
            value={edu.endDate}
            onChange={(e) => { fb.updateEducationEntry(i, { endDate: e.target.value }); mr?.(`education[${i}].endDate`); }}
            placeholder="Jun 2023"
          />
        </Field>
        <Field label="Location" confidence={gc?.(`education[${i}].location`)}>
          <input
            className={styles.input}
            value={edu.location}
            onChange={(e) => { fb.updateEducationEntry(i, { location: e.target.value }); mr?.(`education[${i}].location`); }}
            placeholder="Oxford, UK"
          />
        </Field>
      </div>
      <div className={styles.bulletsSection}>
        <div className={styles.subSectionHeader}>
          <h4>Notable Details</h4>
          <button className={styles.addBtn} onClick={() => fb.addEduDetail(i)}>
            + Add
          </button>
        </div>
        {edu.details.map((detail, di) => (
          <div
            key={di}
            className={`${styles.bulletRow} ${detailDrag.dragOver === di ? styles.bulletRowDragOver : ""}`}
            data-drag-card
            onDragStart={(e) => detailDrag.onDragStart(e, di)}
            onDragEnter={(e) => detailDrag.onDragEnter(e, di)}
            onDragOver={detailDrag.onDragOver}
            onDrop={(e) => detailDrag.onDrop(e, di)}
            onDragEnd={detailDrag.onDragEnd}
          >
            <span
              className={styles.bulletDragHandle}
              onMouseDown={detailDrag.onHandleMouseDown}
              aria-label="Drag to reorder"
            >
              <GripIcon />
            </span>
            <input
              className={styles.input}
              value={detail}
              onChange={(e) => fb.updateEduDetail(i, di, e.target.value)}
              placeholder="Thesis, honours, coursework..."
            />
            <button
              className={styles.removeBtn}
              onClick={() => fb.removeEduDetail(i, di)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EducationSection({ fb, importCtx }: { fb: FB; importCtx?: ImportCtx }) {
  const drag = useDrag(fb.reorderEducationEntries);
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Education</h3>
        <button className={styles.addBtn} onClick={fb.addEducationEntry}>
          + Add Entry
        </button>
      </div>
      {fb.formData.education.map((edu, i) => (
        <EducationEntryCard
          key={i}
          edu={edu}
          index={i}
          total={fb.formData.education.length}
          fb={fb}
          dragState={drag}
          importCtx={importCtx}
        />
      ))}
    </section>
  );
}

function SkillsSection({ fb }: { fb: FB }) {
  const drag = useDrag(fb.reorderSkillCategories);
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Skills</h3>
        <button className={styles.addBtn} onClick={fb.addSkillCategory}>
          + Add Category
        </button>
      </div>
      <p className={styles.hint}>
        Enter skills as a comma-separated list within each category.
      </p>
      {fb.formData.skills.map((cat, i) => (
        <div
          key={i}
          className={`${styles.card} ${drag.dragOver === i ? styles.cardDragOver : ""}`}
          data-drag-card
          onDragStart={(e) => drag.onDragStart(e, i)}
          onDragEnter={(e) => drag.onDragEnter(e, i)}
          onDragOver={drag.onDragOver}
          onDrop={(e) => drag.onDrop(e, i)}
          onDragEnd={drag.onDragEnd}
        >
          <div className={styles.cardHeader}>
            <span
              className={styles.cardDragHandle}
              onMouseDown={drag.onHandleMouseDown}
            >
              <GripIcon />
            </span>
            <input
              className={`${styles.input} ${styles.cardLabelInput}`}
              value={cat.category}
              onChange={(e) =>
                fb.updateSkillCategory(i, { category: e.target.value })
              }
              placeholder={`Category ${i + 1}`}
            />
            {fb.formData.skills.length > 1 && (
              <button
                className={styles.removeBtn}
                onClick={() => fb.removeSkillCategory(i)}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
          <Field label="Skills (comma-separated)">
            <input
              className={styles.input}
              value={cat.skills.join(", ")}
              onChange={(e) => fb.updateSkillsText(i, e.target.value)}
              placeholder="Python, TypeScript, Go"
            />
          </Field>
        </div>
      ))}
    </section>
  );
}

interface ProjectEntryCardProps {
  proj: NonNullable<CVFormData["projects"]>[0];
  index: number;
  fb: FB;
  dragState: ReturnType<typeof useDrag>;
}

function ProjectEntryCard({
  proj,
  index: i,
  fb,
  dragState: drag,
}: ProjectEntryCardProps) {
  const bulletDrag = useDrag((from, to) =>
    fb.reorderProjectBullets(i, from, to),
  );

  return (
    <div
      className={`${styles.card} ${drag.dragOver === i ? styles.cardDragOver : ""}`}
      data-drag-card
      onDragStart={(e) => drag.onDragStart(e, i)}
      onDragEnter={(e) => drag.onDragEnter(e, i)}
      onDragOver={drag.onDragOver}
      onDrop={(e) => drag.onDrop(e, i)}
      onDragEnd={drag.onDragEnd}
    >
      <div className={styles.cardHeader}>
        <span
          className={styles.cardDragHandle}
          onMouseDown={drag.onHandleMouseDown}
        >
          <GripIcon />
        </span>
        <input
          className={`${styles.input} ${styles.cardLabelInput}`}
          value={proj.name}
          onChange={(e) => fb.updateProject(i, { name: e.target.value })}
          placeholder={`Project ${i + 1}`}
        />
        <button
          className={styles.removeBtn}
          onClick={() => fb.removeProject(i)}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className={styles.formGrid}>
        <Field label="Year">
          <input
            className={styles.input}
            value={proj.year}
            onChange={(e) => fb.updateProject(i, { year: e.target.value })}
            placeholder="2024"
          />
        </Field>
        <Field label="Technologies">
          <input
            className={styles.input}
            value={proj.technologies || ""}
            onChange={(e) =>
              fb.updateProject(i, { technologies: e.target.value })
            }
            placeholder="React, Python, PostgreSQL"
          />
        </Field>
      </div>
      <Field label="Description">
        <textarea
          className={`${styles.input} ${styles.textarea}`}
          value={proj.description}
          onChange={(e) => fb.updateProject(i, { description: e.target.value })}
          placeholder="Describe what you built and its impact..."
          rows={3}
        />
      </Field>

      {/* Project bullets */}
      {proj.bullets && proj.bullets.length > 0 && (
        <div className={styles.bulletsSection}>
          <div className={styles.subSectionHeader}>
            <h4>Bullet Points</h4>
            <button
              className={styles.addBtn}
              onClick={() => fb.addProjectBullet(i)}
            >
              + Add
            </button>
          </div>
          {proj.bullets.map((bullet, bi) => (
            <div
              key={bi}
              className={`${styles.bulletRow} ${bulletDrag.dragOver === bi ? styles.bulletRowDragOver : ""}`}
              data-drag-card
              onDragStart={(e) => bulletDrag.onDragStart(e, bi)}
              onDragEnter={(e) => bulletDrag.onDragEnter(e, bi)}
              onDragOver={bulletDrag.onDragOver}
              onDrop={(e) => bulletDrag.onDrop(e, bi)}
              onDragEnd={bulletDrag.onDragEnd}
            >
              <span
                className={styles.bulletDragHandle}
                onMouseDown={bulletDrag.onHandleMouseDown}
                aria-label="Drag to reorder"
              >
                <GripIcon />
              </span>
              <textarea
                className={`${styles.input} ${styles.bulletInput}`}
                value={bullet}
                onChange={(e) => fb.updateProjectBullet(i, bi, e.target.value)}
                placeholder="Describe an achievement or key feature..."
                rows={2}
              />
              {proj.bullets!.length > 1 && (
                <button
                  className={styles.removeBtn}
                  onClick={() => fb.removeProjectBullet(i, bi)}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {(!proj.bullets || proj.bullets.length === 0) && (
        <button
          className={styles.addBtn}
          onClick={() => fb.addProjectBullet(i)}
          style={{ marginTop: "0.75rem" }}
        >
          + Add Bullet Points
        </button>
      )}
    </div>
  );
}

function ProjectsSection({ fb }: { fb: FB }) {
  const drag = useDrag(fb.reorderProjects);
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Projects</h3>
        <button className={styles.addBtn} onClick={fb.addProject}>
          + Add Project
        </button>
      </div>
      {(fb.formData.projects || []).length === 0 && (
        <p className={styles.emptyState}>
          No projects added yet. Click "Add Project" to get started.
        </p>
      )}
      {(fb.formData.projects || []).map((proj, i) => (
        <ProjectEntryCard
          key={i}
          proj={proj}
          index={i}
          fb={fb}
          dragState={drag}
        />
      ))}
    </section>
  );
}

function AwardsSection({ fb }: { fb: FB }) {
  const drag = useDrag(fb.reorderAwards);
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Awards & Achievements</h3>
        <button className={styles.addBtn} onClick={fb.addAward}>
          + Add Award
        </button>
      </div>
      {(fb.formData.awards || []).length === 0 && (
        <p className={styles.emptyState}>No awards added yet.</p>
      )}
      {(fb.formData.awards || []).map((award, i) => (
        <div
          key={i}
          className={`${styles.card} ${drag.dragOver === i ? styles.cardDragOver : ""}`}
          data-drag-card
          onDragStart={(e) => drag.onDragStart(e, i)}
          onDragEnter={(e) => drag.onDragEnter(e, i)}
          onDragOver={drag.onDragOver}
          onDrop={(e) => drag.onDrop(e, i)}
          onDragEnd={drag.onDragEnd}
        >
          <div className={styles.cardHeader}>
            <span
              className={styles.cardDragHandle}
              onMouseDown={drag.onHandleMouseDown}
            >
              <GripIcon />
            </span>
            <input
              className={`${styles.input} ${styles.cardLabelInput}`}
              value={award.title}
              onChange={(e) => fb.updateAward(i, { title: e.target.value })}
              placeholder={`Award ${i + 1}`}
            />
            <button
              className={styles.removeBtn}
              onClick={() => fb.removeAward(i)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className={styles.formGrid}>
            <Field label="Year">
              <input
                className={styles.input}
                value={award.year}
                onChange={(e) => fb.updateAward(i, { year: e.target.value })}
                placeholder="2023"
              />
            </Field>
            <Field label="Description">
              <input
                className={styles.input}
                value={award.description || ""}
                onChange={(e) =>
                  fb.updateAward(i, { description: e.target.value })
                }
                placeholder="Brief description (optional)"
              />
            </Field>
          </div>
        </div>
      ))}
    </section>
  );
}

interface AdditionalEntryCardProps {
  entry: NonNullable<CVFormData["additionalSections"]>[0]["entries"][0];
  sectionIndex: number;
  entryIndex: number;
  fb: FB;
}

function AdditionalEntryCard({
  entry,
  sectionIndex,
  entryIndex: ei,
  fb,
}: AdditionalEntryCardProps) {
  const bulletDrag = useDrag((from, to) =>
    fb.reorderAdditionalEntryBullets(sectionIndex, ei, from, to),
  );

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <input
          className={`${styles.input} ${styles.cardLabelInput}`}
          value={entry.title}
          onChange={(e) =>
            fb.updateAdditionalEntry(sectionIndex, ei, {
              title: e.target.value,
            })
          }
          placeholder={`Entry ${ei + 1}`}
        />
        <button
          className={styles.removeBtn}
          onClick={() => fb.removeAdditionalEntry(sectionIndex, ei)}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className={styles.formGrid}>
        <Field label="Subtitle">
          <input
            className={styles.input}
            value={entry.subtitle || ""}
            onChange={(e) =>
              fb.updateAdditionalEntry(sectionIndex, ei, {
                subtitle: e.target.value,
              })
            }
            placeholder="Subtitle (optional)"
          />
        </Field>
        <Field label="Start Date">
          <input
            className={styles.input}
            value={entry.startDate || ""}
            onChange={(e) =>
              fb.updateAdditionalEntry(sectionIndex, ei, {
                startDate: e.target.value,
              })
            }
            placeholder="Jan 2022"
          />
        </Field>
        <Field label="End Date">
          <input
            className={styles.input}
            value={entry.endDate || ""}
            onChange={(e) =>
              fb.updateAdditionalEntry(sectionIndex, ei, {
                endDate: e.target.value,
              })
            }
            placeholder="Dec 2023"
          />
        </Field>
        <Field label="Location">
          <input
            className={styles.input}
            value={entry.location || ""}
            onChange={(e) =>
              fb.updateAdditionalEntry(sectionIndex, ei, {
                location: e.target.value,
              })
            }
            placeholder="Location"
          />
        </Field>
      </div>

      <Field label="Description">
        <textarea
          className={`${styles.input} ${styles.textarea}`}
          value={entry.description || ""}
          onChange={(e) =>
            fb.updateAdditionalEntry(sectionIndex, ei, {
              description: e.target.value,
            })
          }
          placeholder="Description (optional)"
          rows={2}
        />
      </Field>

      <div className={styles.bulletsSection}>
        <div className={styles.subSectionHeader}>
          <h4>Bullet Points</h4>
          <button
            className={styles.addBtn}
            onClick={() => fb.addAdditionalEntryBullet(sectionIndex, ei)}
          >
            + Add
          </button>
        </div>
        {entry.bullets.map((bullet, bi) => (
          <div
            key={bi}
            className={`${styles.bulletRow} ${bulletDrag.dragOver === bi ? styles.bulletRowDragOver : ""}`}
            data-drag-card
            onDragStart={(e) => bulletDrag.onDragStart(e, bi)}
            onDragEnter={(e) => bulletDrag.onDragEnter(e, bi)}
            onDragOver={bulletDrag.onDragOver}
            onDrop={(e) => bulletDrag.onDrop(e, bi)}
            onDragEnd={bulletDrag.onDragEnd}
          >
            <span
              className={styles.bulletDragHandle}
              onMouseDown={bulletDrag.onHandleMouseDown}
              aria-label="Drag to reorder"
            >
              <GripIcon />
            </span>
            <textarea
              className={`${styles.input} ${styles.bulletInput}`}
              value={bullet}
              onChange={(e) =>
                fb.updateAdditionalEntryBullet(
                  sectionIndex,
                  ei,
                  bi,
                  e.target.value,
                )
              }
              placeholder="Describe an achievement or detail..."
              rows={2}
            />
            {entry.bullets.length > 1 && (
              <button
                className={styles.removeBtn}
                onClick={() =>
                  fb.removeAdditionalEntryBullet(sectionIndex, ei, bi)
                }
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AdditionalSectionView({
  fb,
  sectionIndex,
}: {
  fb: FB;
  sectionIndex: number;
}) {
  const section = fb.formData.additionalSections?.[sectionIndex];

  if (!section) return null;

  // Drag-and-drop for entries not yet implemented
  // const drag = useDrag((from, to) => {
  //   // Reorder entries within this section
  // });

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.additionalSectionTitleWrapper}>
          <input
            className={`${styles.input} ${styles.additionalSectionTitleInput}`}
            value={section.title}
            onChange={(e) =>
              fb.updateAdditionalSectionTitle(sectionIndex, e.target.value)
            }
            placeholder="Section Title"
          />
        </div>
        <button
          className={styles.removeSectionBtn}
          onClick={() => fb.removeAdditionalSection(sectionIndex)}
        >
          Remove Section
        </button>
      </div>

      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
          Entries
        </h3>
        <button
          className={styles.addBtn}
          onClick={() => fb.addAdditionalEntry(sectionIndex)}
        >
          + Add Entry
        </button>
      </div>

      {section.entries.length === 0 && (
        <p className={styles.emptyState}>
          No entries yet. Click "Add Entry" to get started.
        </p>
      )}

      {section.entries.map((entry, ei) => (
        <AdditionalEntryCard
          key={ei}
          entry={entry}
          sectionIndex={sectionIndex}
          entryIndex={ei}
          fb={fb}
        />
      ))}
    </section>
  );
}

function Field({
  label,
  required,
  confidence,
  children,
}: {
  label: string;
  required?: boolean;
  confidence?: 'low' | 'medium';
  children: React.ReactNode;
}) {
  return (
    <div className={`${styles.field} ${confidence === 'low' ? styles.confidenceLow : ''}`}>
      <label className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
        {confidence === 'low' && (
          <span className={styles.needsReview} title="This field was unclear in the source — please verify">Needs review</span>
        )}
        {confidence === 'medium' && (
          <span className={styles.pleaseReview} title="We had to infer this value — please review">Please review</span>
        )}
      </label>
      {children}
    </div>
  );
}
