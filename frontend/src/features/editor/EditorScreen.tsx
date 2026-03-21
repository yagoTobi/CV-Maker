import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { JobInput } from "./JobInput";
import { PdfPreview } from "./PdfPreview";
import { MatchSummaryBar } from "./MatchSummaryBar";
import { TailorPanel } from "./TailorPanel";
import { VersionSwitcher } from "../dashboard";
import { useAppContext } from "../../contexts/AppContext";
import { useTailor } from "../../hooks/useTailor";
import { api } from "../../services/api";
import styles from "./EditorScreen.module.css";

export default function EditorScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const isTuneMode = (location.state as { mode?: string })?.mode === "tune";

  const [jobCollapsed, setJobCollapsed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const jobBodyRef = useRef<HTMLDivElement>(null);
  const expandedHeightRef = useRef<number | null>(null);

  const {
    companyName,
    setCompanyName,
    roleName,
    setRoleName,
    jobDescription,
    setJobDescription,
    formData,
    setFormData,
    activeVersion,
    savedVersions,
    isSavingVersion,
    templates,
    compiler,
    chat,
    handleSaveVersion,
    handleSwitchVersion,
  } = useAppContext();

  // Compile LaTeX to PDF
  const handleCompile = useCallback(async () => {
    await compiler.compile(
      templates.content,
      templates.selectedId || undefined,
    );
  }, [compiler.compile, templates.content, templates.selectedId]);

  // Apply callback for useTailor — updates formData, texContent, and recompiles PDF
  const handleTailorApply = useCallback(
    async (
      newFormData: import("../../types").CVFormData,
      newTexContent: string,
    ) => {
      setFormData(newFormData);
      templates.updateContent(newTexContent);
      await compiler.compile(newTexContent, templates.selectedId || undefined);
    },
    [
      setFormData,
      templates.updateContent,
      compiler.compile,
      templates.selectedId,
    ],
  );

  const tailorOpts = useMemo(
    () => ({
      originalFormData: formData,
      templateId: templates.selectedId,
      onApply: handleTailorApply,
    }),
    [formData, templates.selectedId, handleTailorApply],
  );

  const tailor = useTailor(tailorOpts);

  // Auto-compile when entering tune mode with content already loaded
  const hasAutoCompiled = useRef(false);
  useEffect(() => {
    if (
      isTuneMode &&
      formData &&
      templates.content &&
      !compiler.pdfBase64 &&
      !compiler.isCompiling &&
      !hasAutoCompiled.current
    ) {
      hasAutoCompiled.current = true;
      handleCompile();
    }
  }, [
    isTuneMode,
    formData,
    templates.content,
    compiler.pdfBase64,
    compiler.isCompiling,
    handleCompile,
  ]);

  // Capture expanded height while form body is visible
  useEffect(() => {
    if (jobBodyRef.current && !jobCollapsed) {
      expandedHeightRef.current = jobBodyRef.current.scrollHeight;
    }
  });

  const collapseJob = useCallback(() => {
    const el = jobBodyRef.current;
    if (!el) {
      setJobCollapsed(true);
      return;
    }
    expandedHeightRef.current = el.scrollHeight;
    el.style.maxHeight = `${el.scrollHeight}px`;
    void el.offsetHeight;
    el.style.maxHeight = "0px";
    setJobCollapsed(true);
  }, []);

  const expandJob = useCallback(() => {
    const el = jobBodyRef.current;
    setJobCollapsed(false);
    requestAnimationFrame(() => {
      if (el) {
        el.style.maxHeight = `${el.scrollHeight}px`;
      }
    });
  }, []);

  const toggleJob = useCallback(() => {
    if (jobCollapsed) expandJob();
    else collapseJob();
  }, [jobCollapsed, expandJob, collapseJob]);

  // Analyze job description — run match analysis, fire tailor suggestions in background
  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    collapseJob();

    // Generate LaTeX from formData if needed for match analysis
    let tex = templates.content;
    if (formData && !tex) {
      const { texContent } = await api.generateLatex(formData);
      tex = texContent;
      if (tex) templates.updateContent(tex);
    }

    // Fire tailor suggestions in the background — don't block collapse on it
    if (formData) {
      tailor.fetchSuggestions(formData, jobDescription, companyName, roleName);
    }

    // Only await the match analysis (the streaming chat call)
    await chat.analyzeJob();

    setIsAnalyzing(false);
  }, [
    chat.analyzeJob,
    formData,
    jobDescription,
    companyName,
    roleName,
    tailor.fetchSuggestions,
    templates.content,
    templates.updateContent,
    collapseJob,
  ]);

  // Go back to landing, resetting editor state
  const handleChangeTemplate = useCallback(() => {
    navigate("/");
    templates.reset();
    compiler.reset();
    chat.reset();
    tailor.reset();
  }, [navigate, templates.reset, compiler.reset, chat.reset, tailor.reset]);

  const handleGoToDashboard = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);

  const analyzeInProgress = isAnalyzing || chat.isAnalyzing;

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <button
          className={styles.changeTemplateBtn}
          onClick={handleChangeTemplate}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Home
        </button>
        <h1>{isTuneMode ? "Tune your CV" : "Your CV Editor"}</h1>
        <div className={styles.headerRight}>
          <VersionSwitcher
            activeVersion={activeVersion}
            versions={savedVersions}
            baseCvs={savedVersions.filter((v) => !v.parentVersionId)}
            onSave={handleSaveVersion}
            onSwitch={handleSwitchVersion}
            isSaving={isSavingVersion}
            onDashboard={handleGoToDashboard}
            defaultCompanyName={companyName}
            defaultRole={roleName}
            forceJobApp={isTuneMode}
          />
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.leftPanel}>
          <section className={styles.jobPostingSection}>
            <div className={styles.sectionHeader} onClick={toggleJob}>
              <h2>
                {jobCollapsed
                  ? `Job Description${companyName ? ` \u00B7 ${companyName}` : ""}${roleName ? ` \u00B7 ${roleName}` : ""}`
                  : "Job Description"}
              </h2>
              <button
                className={styles.collapseToggle}
                title={jobCollapsed ? "Expand" : "Collapse"}
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
                  <path d={jobCollapsed ? "m6 9 6 6 6-6" : "m18 15-6-6-6 6"} />
                </svg>
              </button>
            </div>
            <div
              ref={jobBodyRef}
              className={styles.jobPostingBody}
              onTransitionEnd={(e) => {
                if (e.propertyName !== "max-height") return;
                if (!jobCollapsed && jobBodyRef.current) {
                  jobBodyRef.current.style.maxHeight = "";
                }
              }}
            >
              <JobInput
                companyName={companyName}
                roleName={roleName}
                jobDescription={jobDescription}
                onCompanyNameChange={setCompanyName}
                onRoleNameChange={setRoleName}
                onJobDescriptionChange={setJobDescription}
                onAnalyze={handleAnalyze}
                isAnalyzing={analyzeInProgress}
                hasAnalyzed={chat.hasAnalyzed}
              />
            </div>
          </section>

          <section className={styles.chatSection}>
            {chat.matchAnalysis && (
              <MatchSummaryBar
                analysis={chat.matchAnalysis}
                isLoading={chat.isLoadingMatch}
                onReanalyze={chat.getMatchAnalysis}
                hasJobDescription={!!jobDescription.trim()}
                estimatedScore={
                  tailor.tailorResponse ? tailor.estimatedCurrentScore : undefined
                }
                companyName={companyName}
                roleName={roleName}
                reviewedCount={tailor.appliedChanges.size + tailor.skippedChanges.size}
                totalChanges={tailor.tailorResponse?.changes.length ?? 0}
              />
            )}
            <TailorPanel tailor={tailor} hasFormData={!!formData} />
          </section>
        </div>

        <div className={styles.rightPanel}>
          <section className={styles.previewSection}>
            <div className={styles.previewHeader}>
              <div className={styles.previewTitle}>
                <h2>CV Preview</h2>
                {compiler.pageCount > 0 && (
                  <span
                    className={`${styles.pageCount} ${compiler.pageCount > 1 ? styles.warning : styles.good}`}
                  >
                    {compiler.pageCount}{" "}
                    {compiler.pageCount === 1 ? "page" : "pages"}
                    {compiler.pageCount > 1 && (
                      <span
                        className={styles.pageWarningIcon}
                        title="CV should fit on one page"
                      >
                        ⚠️
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>

            {compiler.pageCount > 1 && (
              <div className={styles.pageCountWarning}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Your CV is {compiler.pageCount} pages. Most recruiters expect a
                1-page CV. Consider removing less relevant content.
              </div>
            )}

            <div className={styles.previewContent}>
              <PdfPreview
                pdfBase64={compiler.pdfBase64}
                error={compiler.error}
                isCompiling={compiler.isCompiling}
                onCompile={handleCompile}
                hasUnsavedChanges={compiler.hasUnsavedChanges}
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
