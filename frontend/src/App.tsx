import { useState, useEffect, useCallback, useMemo } from 'react';
import { LatexEditor, JobInput, ChatPanel, PdfPreview, MatchAnalysis } from './features/editor';
import { TemplateSelector } from './features/template-selection';
import { LandingScreen } from './features/landing';
import { Dashboard, VersionSwitcher } from './features/dashboard';
import { CVFormBuilder } from './features/form-builder';
import { CVImportUpload, CVImportReview } from './features/cv-import';
import { useTemplates, useCompiler, useChat } from './hooks';
import { useImport } from './hooks/useImport';
import { api } from './services/api';
import type { SaveVersionData } from './features/dashboard/VersionSwitcher';
import type { UserProfile, CVFormData, CVVersion, CVVersionMeta } from './types';
import styles from './App.module.css';

type PreviewTab = 'latex' | 'pdf';
type AiTab = 'chat' | 'match';
type AppScreen = 'landing' | 'dashboard' | 'template-select' | 'form-builder' | 'editor' | 'import-upload' | 'import-review';

function App() {
  // Screen navigation
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('landing');

  // UI tabs
  const [activeTab, setActiveTab] = useState<PreviewTab>('latex');
  const [aiTab, setAiTab] = useState<AiTab>('match');

  // Job input state
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  // User profile
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Version state
  const [activeVersion, setActiveVersion] = useState<CVVersion | null>(null);
  const [formData, setFormData] = useState<CVFormData | null>(null);
  const [savedVersions, setSavedVersions] = useState<CVVersionMeta[]>([]);
  const [isSavingVersion, setIsSavingVersion] = useState(false);

  // Track which template was selected in template-select step (for build flow)
  const [selectedTemplateForBuild, setSelectedTemplateForBuild] = useState<string | null>(null);

  // Hooks
  const templates = useTemplates();
  const cvImport = useImport();
  const compiler = useCompiler();

  const chatOptions = useMemo(() => ({
    onContentChanged: (newContent: string) => {
      templates.updateContent(newContent);
      compiler.clearPdf();
    },
  }), [templates.updateContent, compiler.clearPdf]);

  const chat = useChat(
    templates.content,
    jobDescription,
    companyName,
    userProfile,
    chatOptions
  );

  // Load user profile and saved versions on mount
  useEffect(() => {
    let mounted = true;

    Promise.all([
      api.loadUserData(),
      api.listVersions(),
    ]).then(([profile, { versions, ungrouped }]) => {
      if (!mounted) return;
      if (profile) setUserProfile(profile);
      // Flatten for now - will properly handle hierarchy in Phase 2
      const allVersions = [
        ...versions,
        ...versions.flatMap(v => v.children || []),
        ...ungrouped
      ];
      setSavedVersions(allVersions);
    });

    return () => { mounted = false; };
  }, []);

  // --- Navigation handlers ---

  const handleGoToLanding = useCallback(() => {
    setCurrentScreen('landing');
    // Clear any import state when returning to landing
    cvImport.reset();
    setFormData(null);
    setSelectedTemplateForBuild(null);
  }, [cvImport.reset]);

  const handleGoToDashboard = useCallback(() => {
    setCurrentScreen('dashboard');
  }, []);

  const handleGoToTuneFlow = useCallback(async () => {
    const success = await templates.selectTemplate('med-length-proff-cv');
    if (success) {
      setActiveVersion(null);
      setFormData(null);
      setCurrentScreen('editor');
    }
  }, [templates.selectTemplate]);

  // --- Import flow handlers ---

  const handleImportFileSelected = useCallback(async (file: File) => {
    await cvImport.handleFileSelected(file);
    // Navigate to review if extraction succeeded (importResult will be set)
  }, [cvImport.handleFileSelected]);

  // Effect: navigate to review screen when import completes successfully
  useEffect(() => {
    if (cvImport.importResult?.success && currentScreen === 'import-upload') {
      setCurrentScreen('import-review');
    }
  }, [cvImport.importResult, currentScreen]);

  const handleImportConfirm = useCallback((editedFormData: CVFormData) => {
    setFormData(editedFormData);
    setCurrentScreen('template-select');
  }, []);

  // Template selected from TemplateSelector (Build path) → go to form-builder
  const handleTemplateBuildSelect = useCallback((templateId: string) => {
    setSelectedTemplateForBuild(templateId);
    setCurrentScreen('form-builder');
  }, []);

  // Form builder generated LaTeX — load into editor (no content fetch needed, we already have it)
  const handleFormGenerated = useCallback((texContent: string, templateId: string, fd: CVFormData) => {
    setFormData(fd);
    templates.setTemplateId(templateId);
    templates.updateContent(texContent);
    setCurrentScreen('editor');
    compiler.compile(texContent, templateId);
    setActiveTab('pdf');
  }, [templates.setTemplateId, templates.updateContent, compiler.compile]);

  // Version loaded from dashboard or switcher
  const handleVersionLoad = useCallback((version: CVVersion) => {
    templates.updateContent(version.texContent);
    templates.setTemplateId(version.templateId);
    if (version.formData) setFormData(version.formData);
    if (version.jobDescription) setJobDescription(version.jobDescription);
    if (version.companyName) setCompanyName(version.companyName);
    setActiveVersion(version);
    setCurrentScreen('editor');
  }, [templates.updateContent, templates.setTemplateId]);

  // Create new job application from a base CV (Dashboard [+ New] button)
  const handleNewApplication = useCallback((baseVersion: CVVersion) => {
    templates.updateContent(baseVersion.texContent);
    templates.setTemplateId(baseVersion.templateId);
    if (baseVersion.formData) setFormData(baseVersion.formData);
    setActiveVersion(null);
    setCompanyName('');
    setJobDescription('');
    setCurrentScreen('editor');
  }, [templates.updateContent, templates.setTemplateId]);

  const handleSaveVersion = useCallback(async (data: SaveVersionData) => {
    setIsSavingVersion(true);
    const saved = await api.saveVersion({
      name: data.name,
      templateId: templates.selectedId || 'med-length-proff-cv',
      texContent: templates.content,
      formData: formData || undefined,
      jobDescription: data.isBaseCV ? undefined : (jobDescription || undefined),
      companyName: data.companyName || undefined,
      role: data.role || undefined,
      matchScore: data.isBaseCV ? undefined : chat.matchAnalysis?.match_score,
      parentVersionId: data.parentVersionId,
    });
    if (saved) {
      setActiveVersion(saved);
      const meta: CVVersionMeta = {
        id: saved.id,
        name: saved.name,
        templateId: saved.templateId,
        jobDescription: saved.jobDescription,
        companyName: saved.companyName,
        role: saved.role,
        matchScore: saved.matchScore,
        parentVersionId: saved.parentVersionId,
        createdAt: saved.createdAt,
      };
      setSavedVersions(prev => [meta, ...prev]);
    }
    setIsSavingVersion(false);
  }, [templates.selectedId, templates.content, formData, jobDescription, chat.matchAnalysis]);

  const handleSwitchVersion = useCallback(async (id: string) => {
    const version = await api.getVersion(id);
    if (version) handleVersionLoad(version);
  }, [handleVersionLoad]);

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

  // Go back to landing, resetting editor state
  const handleChangeTemplate = useCallback(() => {
    setCurrentScreen('landing');
    templates.reset();
    compiler.reset();
    chat.reset();
    setActiveVersion(null);
    setFormData(null);
    setCompanyName('');
    setJobDescription('');
  }, [templates.reset, compiler.reset, chat.reset]);

  // --- Screen renders ---

  if (currentScreen === 'landing') {
    return (
      <LandingScreen
        hasSavedVersions={savedVersions.length > 0}
        onBuildCV={() => {
          // Clear any previous form data to ensure fresh start for "Build my CV" flow
          setFormData(null);
          setSelectedTemplateForBuild(null);
          setCurrentScreen('template-select');
        }}
        onTuneForJob={handleGoToTuneFlow}
        onMyCV={handleGoToDashboard}
        onImportCV={() => {
          cvImport.reset();
          setCurrentScreen('import-upload');
        }}
      />
    );
  }

  if (currentScreen === 'import-upload') {
    return (
      <CVImportUpload
        onFileSelected={handleImportFileSelected}
        isUploading={cvImport.isImporting}
        uploadProgress={cvImport.importProgress}
        error={cvImport.importError}
        onBack={handleGoToLanding}
      />
    );
  }

  if (currentScreen === 'import-review' && cvImport.importResult?.formData) {
    return (
      <CVImportReview
        formData={cvImport.importResult.formData}
        confidence={cvImport.importResult.confidence || { overall: 'medium', fields: {} }}
        summary={cvImport.importResult.summary || { workEntries: 0, educationEntries: 0, skillCategories: 0, projects: 0, awards: 0 }}
        warnings={cvImport.importResult.warnings}
        source={cvImport.importResult.source}
        onConfirm={handleImportConfirm}
        onBack={() => {
          // Clear formData when going back from import-review
          setFormData(null);
          setCurrentScreen('import-upload');
        }}
      />
    );
  }

  if (currentScreen === 'dashboard') {
    return (
      <Dashboard
        onVersionLoad={handleVersionLoad}
        onNewApplication={handleNewApplication}
        onBack={handleGoToLanding}
        onVersionsChange={setSavedVersions}
      />
    );
  }

  if (currentScreen === 'template-select') {
    return (
      <TemplateSelector
        templates={templates.templates}
        onSelect={handleTemplateBuildSelect}
        isLoading={templates.isLoading}
        onBack={handleGoToLanding}
      />
    );
  }

  if (currentScreen === 'form-builder') {
    return (
      <CVFormBuilder
        templateId={selectedTemplateForBuild || 'med-length-proff-cv'}
        onGenerated={handleFormGenerated}
        onBack={() => setCurrentScreen('template-select')}
        initialFormData={formData || undefined}
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
          Home
        </button>
        <h1>Your CV Editor</h1>
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
