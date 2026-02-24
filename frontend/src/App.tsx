import { useState, useEffect, useCallback, useMemo } from 'react';
import { LatexEditor, JobInput, ChatPanel, PdfPreview, MatchAnalysis, TemplateSelector } from './components';
import { useTemplates, useCompiler, useChat } from './hooks';
import { api } from './services/api';
import type { UserProfile } from './types';
import styles from './App.module.css';

type PreviewTab = 'latex' | 'pdf';
type AiTab = 'chat' | 'match';
type AppScreen = 'template-select' | 'editor';

function App() {
  // Screen navigation
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('template-select');

  // UI tabs
  const [activeTab, setActiveTab] = useState<PreviewTab>('latex');
  const [aiTab, setAiTab] = useState<AiTab>('match');

  // Job input state
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  // User profile
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Hooks
  const templates = useTemplates();
  const compiler = useCompiler();

  // Memoize the options object to prevent recreation on each render
  const chatOptions = useMemo(() => ({
    onContentChanged: (newContent: string) => {
      templates.updateContent(newContent);
      compiler.clearPdf();
    },
  }), [templates.updateContent, compiler.clearPdf]);

  // Chat hook
  const chat = useChat(
    templates.content,
    jobDescription,
    companyName,
    userProfile,
    chatOptions
  );

  // Load user profile on mount
  useEffect(() => {
    let mounted = true;

    api.loadUserData().then((profile) => {
      if (mounted && profile) {
        setUserProfile(profile);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  // Handle template selection
  const handleTemplateSelect = useCallback(async (templateId: string) => {
    const success = await templates.selectTemplate(templateId);
    if (success) {
      setCurrentScreen('editor');
    }
  }, [templates.selectTemplate]);

  // Compile LaTeX to PDF
  const handleCompile = useCallback(async () => {
    const success = await compiler.compile(templates.content, templates.selectedId || undefined);
    if (success) {
      setActiveTab('pdf');
    }
  }, [compiler.compile, templates.content, templates.selectedId]);

  // Analyze job description
  const handleAnalyze = useCallback(async () => {
    setAiTab('chat');
    await chat.analyzeJob();
  }, [chat.analyzeJob]);

  // Handle going back to template selection
  const handleChangeTemplate = useCallback(() => {
    setCurrentScreen('template-select');
    templates.reset();
    compiler.reset();
    chat.reset();
  }, [templates.reset, compiler.reset, chat.reset]);

  // Template selection screen
  if (currentScreen === 'template-select') {
    return (
      <TemplateSelector
        templates={templates.templates}
        onSelect={handleTemplateSelect}
        isLoading={templates.isLoading}
      />
    );
  }

  // Editor screen
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <button className={styles.changeTemplateBtn} onClick={handleChangeTemplate}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Templates
        </button>
        <h1>Your CV Editor</h1>
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
              <div className={styles.previewTabs}>
                <button
                  className={`${styles.tabBtn} ${activeTab === 'latex' ? styles.active : ''}`}
                  onClick={() => setActiveTab('latex')}
                >
                  LaTeX Code
                </button>
                <button
                  className={`${styles.tabBtn} ${activeTab === 'pdf' ? styles.active : ''}`}
                  onClick={() => setActiveTab('pdf')}
                >
                  PDF
                </button>
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
              {activeTab === 'latex' ? (
                <LatexEditor
                  value={templates.content}
                  onChange={templates.updateContent}
                  onCompile={handleCompile}
                  isCompiling={compiler.isCompiling}
                  hasUnsavedChanges={compiler.hasUnsavedChanges}
                />
              ) : (
                <PdfPreview
                  pdfBase64={compiler.pdfBase64}
                  error={compiler.error}
                  isCompiling={compiler.isCompiling}
                  onCompile={handleCompile}
                  hasUnsavedChanges={compiler.hasUnsavedChanges}
                />
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
