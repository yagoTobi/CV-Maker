import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  LatexEditor,
  JobInput,
  ChatPanel,
  PdfPreview,
  MatchAnalysis,
  TemplateSelector,
} from './components';
import { useTemplates, useCompiler, useChat } from './hooks';
import { useImport } from './hooks/useImport';
import { api } from './services/api';
import type { UserProfile, CVFormData, CVVersion, CVVersionMeta } from './types';
import LandingScreen from './components/LandingScreen';
import Dashboard from './components/Dashboard';
import CVFormBuilder from './components/CVFormBuilder';
import VersionSwitcher from './components/VersionSwitcher';
import CoverLetterScreen from './components/CoverLetterScreen';
import CVImportUpload from './components/CVImportUpload';
import CVImportReview from './components/CVImportReview';
import styles from './App.module.css';

type PreviewTab = 'latex' | 'pdf';
type AiTab = 'chat' | 'match';
type AppScreen =
  | 'landing'
  | 'dashboard'
  | 'template-select'
  | 'form-builder'
  | 'editor'
  | 'import-upload'
  | 'import-review'
  | 'cover_letter';

function App() {
  const unsavedDraftRef = useRef<{
    texContent: string;
    formData: CVFormData | null;
    jobDescription: string;
    companyName: string;
  } | null>(null);

  const [currentScreen, setCurrentScreen] = useState<AppScreen>('landing');
  const [activeTab, setActiveTab] = useState<PreviewTab>('latex');
  const [aiTab, setAiTab] = useState<AiTab>('match');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeVersion, setActiveVersion] = useState<CVVersion | null>(null);
  const [formData, setFormData] = useState<CVFormData | null>(null);
  const [savedVersions, setSavedVersions] = useState<CVVersionMeta[]>([]);
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [selectedTemplateForBuild, setSelectedTemplateForBuild] = useState<
    string | null
  >(null);

  const templates = useTemplates();
  const cvImport = useImport();
  const compiler = useCompiler();

  const chatOptions = useMemo(
    () => ({
      onContentChanged: (newContent: string) => {
        templates.updateContent(newContent);
        compiler.clearPdf();
      },
    }),
    [templates.updateContent, compiler.clearPdf]
  );

  const chat = useChat(
    templates.content,
    jobDescription,
    companyName,
    userProfile,
    chatOptions
  );

  useEffect(() => {
    let mounted = true;

    Promise.all([api.loadUserData(), api.listVersions()]).then(
      ([profile, versions]) => {
        if (!mounted) return;
        if (profile) {
          setUserProfile(profile);
        }
        setSavedVersions(versions);
      }
    );

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (cvImport.importResult?.success && currentScreen === 'import-upload') {
      setCurrentScreen('import-review');
    }
  }, [cvImport.importResult, currentScreen]);

  const handleGoToLanding = useCallback(() => {
    setCurrentScreen('landing');
  }, []);

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

  const handleGoToCoverLetter = useCallback(() => {
    setCurrentScreen('cover_letter');
  }, []);

  const handleImportFileSelected = useCallback(
    async (file: File) => {
      await cvImport.handleFileSelected(file);
    },
    [cvImport.handleFileSelected]
  );

  const handleImportConfirm = useCallback((editedFormData: CVFormData) => {
    setFormData(editedFormData);
    setCurrentScreen('template-select');
  }, []);

  const handleTemplateBuildSelect = useCallback((templateId: string) => {
    setSelectedTemplateForBuild(templateId);
    setCurrentScreen('form-builder');
  }, []);

  const handleFormGenerated = useCallback(
    (texContent: string, templateId: string, nextFormData: CVFormData) => {
      setFormData(nextFormData);
      templates.setTemplateId(templateId);
      templates.updateContent(texContent);
      setCurrentScreen('editor');
      compiler.compile(texContent, templateId);
      setActiveTab('pdf');
    },
    [templates.setTemplateId, templates.updateContent, compiler.compile]
  );

  const handleVersionLoad = useCallback(
    (version: CVVersion) => {
      templates.updateContent(version.texContent);
      if (version.formData) setFormData(version.formData);
      if (version.jobDescription) setJobDescription(version.jobDescription);
      if (version.companyName) setCompanyName(version.companyName);
      setActiveVersion(version);
      setCurrentScreen('editor');
    },
    [templates.updateContent]
  );

  const handleSaveVersion = useCallback(
    async (name: string) => {
      setIsSavingVersion(true);
      const saved = await api.saveVersion({
        name,
        templateId: templates.selectedId || 'med-length-proff-cv',
        texContent: templates.content,
        formData: formData || undefined,
        jobDescription: jobDescription || undefined,
        companyName: companyName || undefined,
        matchScore: chat.matchAnalysis?.match_score,
      });

      if (saved) {
        setActiveVersion(saved);
        const meta: CVVersionMeta = {
          id: saved.id,
          name: saved.name,
          templateId: saved.templateId,
          jobDescription: saved.jobDescription,
          companyName: saved.companyName,
          matchScore: saved.matchScore,
          createdAt: saved.createdAt,
        };
        setSavedVersions((prev) => [meta, ...prev]);
      }

      setIsSavingVersion(false);
    },
    [
      templates.selectedId,
      templates.content,
      formData,
      jobDescription,
      companyName,
      chat.matchAnalysis,
    ]
  );

  const handleSwitchVersion = useCallback(
    async (id: string) => {
      if (!id) {
        if (unsavedDraftRef.current) {
          templates.updateContent(unsavedDraftRef.current.texContent);
          setFormData(unsavedDraftRef.current.formData);
          setJobDescription(unsavedDraftRef.current.jobDescription);
          setCompanyName(unsavedDraftRef.current.companyName);
        }
        setActiveVersion(null);
        return;
      }

      if (!activeVersion) {
        unsavedDraftRef.current = {
          texContent: templates.content,
          formData,
          jobDescription,
          companyName,
        };
      }

      const version = await api.getVersion(id);
      if (version) {
        handleVersionLoad(version);
      }
    },
    [
      activeVersion,
      companyName,
      formData,
      handleVersionLoad,
      jobDescription,
      templates.content,
      templates.updateContent,
    ]
  );

  const handleSwitchVersionForCoverLetter = useCallback(
    async (id: string) => {
      if (!id) {
        if (unsavedDraftRef.current) {
          templates.updateContent(unsavedDraftRef.current.texContent);
          setFormData(unsavedDraftRef.current.formData);
          setJobDescription(unsavedDraftRef.current.jobDescription);
          setCompanyName(unsavedDraftRef.current.companyName);
        }
        setActiveVersion(null);
        return;
      }

      if (!activeVersion) {
        unsavedDraftRef.current = {
          texContent: templates.content,
          formData,
          jobDescription,
          companyName,
        };
      }

      const version = await api.getVersion(id);
      if (!version) {
        return;
      }

      templates.updateContent(version.texContent);
      if (version.formData) setFormData(version.formData);
      if (version.jobDescription) setJobDescription(version.jobDescription);
      if (version.companyName) setCompanyName(version.companyName);
      setActiveVersion(version);
    },
    [
      activeVersion,
      companyName,
      formData,
      jobDescription,
      templates.content,
      templates.updateContent,
    ]
  );

  const handleCompile = useCallback(async () => {
    const success = await compiler.compile(
      templates.content,
      templates.selectedId || undefined
    );
    if (success) {
      setActiveTab('pdf');
    }
  }, [compiler.compile, templates.content, templates.selectedId]);

  const handleAnalyze = useCallback(async () => {
    setAiTab('chat');
    await chat.analyzeJob();
  }, [chat.analyzeJob]);

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

  if (currentScreen === 'landing') {
    return (
      <LandingScreen
        hasSavedVersions={savedVersions.length > 0}
        onBuildCV={() => setCurrentScreen('template-select')}
        onTuneForJob={handleGoToTuneFlow}
        onMyCV={handleGoToDashboard}
        onCoverLetter={handleGoToCoverLetter}
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
        confidence={
          cvImport.importResult.confidence || { overall: 'medium', fields: {} }
        }
        summary={
          cvImport.importResult.summary || {
            workEntries: 0,
            educationEntries: 0,
            skillCategories: 0,
            projects: 0,
            awards: 0,
          }
        }
        warnings={cvImport.importResult.warnings}
        source={cvImport.importResult.source}
        onConfirm={handleImportConfirm}
        onBack={() => setCurrentScreen('import-upload')}
      />
    );
  }

  if (currentScreen === 'dashboard') {
    return (
      <Dashboard
        onVersionLoad={handleVersionLoad}
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

  if (currentScreen === 'cover_letter') {
    return (
      <CoverLetterScreen
        onBack={handleChangeTemplate}
        activeVersion={activeVersion}
        savedVersions={savedVersions}
        onSaveVersion={handleSaveVersion}
        onSwitchVersion={handleSwitchVersionForCoverLetter}
        isSavingVersion={isSavingVersion}
        onDashboard={handleGoToDashboard}
        previewTexContent={templates.content}
        jobDescription={jobDescription}
        onJobDescriptionChange={setJobDescription}
        companyName={companyName}
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
        <h1>Your CV Editor</h1>
        <div className={styles.headerRight}>
          <VersionSwitcher
            activeVersion={activeVersion}
            versions={savedVersions}
            onSave={handleSaveVersion}
            onSwitch={handleSwitchVersion}
            isSaving={isSavingVersion}
            onDashboard={handleGoToDashboard}
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
                  className={`${styles.aiTabBtn} ${
                    aiTab === 'match' ? styles.active : ''
                  }`}
                  onClick={() => setAiTab('match')}
                >
                  Match Analysis
                </button>
                <button
                  className={`${styles.aiTabBtn} ${
                    aiTab === 'chat' ? styles.active : ''
                  }`}
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
                  <span
                    className={`${styles.pageCount} ${
                      compiler.pageCount > 1 ? styles.warning : styles.good
                    }`}
                  >
                    {compiler.pageCount}{' '}
                    {compiler.pageCount === 1 ? 'page' : 'pages'}
                    {compiler.pageCount > 1 && (
                      <span
                        className={styles.pageWarningIcon}
                        title="CV should fit on one page"
                      >
                        Warning
                      </span>
                    )}
                  </span>
                )}
              </div>

              <div className={styles.previewTabs}>
                <button
                  className={`${styles.tabBtn} ${
                    activeTab === 'latex' ? styles.active : ''
                  }`}
                  onClick={() => setActiveTab('latex')}
                >
                  LaTeX Code
                </button>
                <button
                  className={`${styles.tabBtn} ${
                    activeTab === 'pdf' ? styles.active : ''
                  }`}
                  onClick={() => setActiveTab('pdf')}
                >
                  PDF
                </button>
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
