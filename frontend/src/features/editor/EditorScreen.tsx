import { useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { JobInput, ChatPanel, PdfPreview, MatchAnalysis } from './';
import { VersionSwitcher } from '../dashboard';
import { useAppContext } from '../../contexts/AppContext';
import styles from './EditorScreen.module.css';

export default function EditorScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const isTuneMode = (location.state as { mode?: string })?.mode === 'tune';

  const {
    aiTab,
    setAiTab,
    companyName,
    setCompanyName,
    jobDescription,
    setJobDescription,
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
    await compiler.compile(templates.content, templates.selectedId || undefined);
  }, [compiler.compile, templates.content, templates.selectedId]);

  // Auto-compile when entering tune mode with content already loaded
  const hasAutoCompiled = useRef(false);
  useEffect(() => {
    if (isTuneMode && templates.content && !compiler.pdfBase64 && !compiler.isCompiling && !hasAutoCompiled.current) {
      hasAutoCompiled.current = true;
      handleCompile();
    }
  }, [isTuneMode, templates.content, compiler.pdfBase64, compiler.isCompiling, handleCompile]);

  // Analyze job description
  const handleAnalyze = useCallback(async () => {
    setAiTab('chat');
    await chat.analyzeJob();
  }, [chat.analyzeJob, setAiTab]);

  // Go back to landing, resetting editor state
  const handleChangeTemplate = useCallback(() => {
    navigate('/');
    templates.reset();
    compiler.reset();
    chat.reset();
  }, [navigate, templates.reset, compiler.reset, chat.reset]);

  const handleGoToDashboard = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <button className={styles.changeTemplateBtn} onClick={handleChangeTemplate}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Home
        </button>
        <h1>{isTuneMode ? 'Tune your CV' : 'Your CV Editor'}</h1>
        <div className={styles.headerRight}>
          <VersionSwitcher
            activeVersion={activeVersion}
            versions={savedVersions}
            baseCvs={savedVersions.filter(v => !v.parentVersionId)}
            onSave={handleSaveVersion}
            onSwitch={handleSwitchVersion}
            isSaving={isSavingVersion}
            onDashboard={handleGoToDashboard}
            defaultCompanyName={companyName}
          />
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.leftPanel}>
          <section className={styles.jobPostingSection}>
            <h2>Job Posting</h2>
            <JobInput
              companyName={companyName}
              jobDescription={jobDescription}
              onCompanyNameChange={setCompanyName}
              onJobDescriptionChange={setJobDescription}
              onAnalyze={handleAnalyze}
              isAnalyzing={chat.isAnalyzing}
              hasAnalyzed={chat.hasAnalyzed}
            />
          </section>

          <section className={styles.aiSection}>
            <div className={styles.aiSectionHeader}>
              <div className={styles.aiTabs}>
                <button
                  className={`${styles.aiTabBtn} ${aiTab === 'match' ? styles.active : ''}`}
                  onClick={() => setAiTab('match')}
                >
                  Match Analysis
                </button>
                <button
                  className={`${styles.aiTabBtn} ${aiTab === 'chat' ? styles.active : ''}`}
                  onClick={() => setAiTab('chat')}
                >
                  AI Conversation
                </button>
              </div>
            </div>

            <div className={styles.aiContent}>
              {aiTab === 'match' ? (
                <MatchAnalysis
                  analysis={chat.matchAnalysis}
                  isLoading={chat.isLoadingMatch}
                  onAnalyze={chat.getMatchAnalysis}
                  hasJobDescription={!!jobDescription.trim()}
                />
              ) : (
                <ChatPanel
                  messages={chat.messages}
                  onSendMessage={chat.sendMessage}
                  onApplyEdit={chat.applyEdit}
                  onUndoEdit={chat.undoEdit}
                  isLoading={chat.isAnalyzing}
                  isThinking={chat.isThinking}
                  streamingContent={chat.streamingContent}
                />
              )}
            </div>
          </section>
        </div>

        <div className={styles.rightPanel}>
          <section className={styles.previewSection}>
            <div className={styles.previewHeader}>
              <div className={styles.previewTitle}>
                <h2>CV Preview</h2>
                {compiler.pageCount > 0 && (
                  <span className={`${styles.pageCount} ${compiler.pageCount > 1 ? styles.warning : styles.good}`}>
                    {compiler.pageCount} {compiler.pageCount === 1 ? 'page' : 'pages'}
                    {compiler.pageCount > 1 && (
                      <span className={styles.pageWarningIcon} title="CV should fit on one page">⚠️</span>
                    )}
                  </span>
                )}
              </div>
            </div>

            {compiler.pageCount > 1 && (
              <div className={styles.pageCountWarning}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Your CV is {compiler.pageCount} pages. Most recruiters expect a 1-page CV. Consider removing less relevant content.
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
