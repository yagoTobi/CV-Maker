import { useState, useEffect, useCallback, useRef } from 'react';
import { LatexEditor, JobInput, ChatPanel, PdfPreview, MatchAnalysis } from './components';
import { useApi } from './hooks/useApi';
import type { Message, UserProfile, MatchAnalysis as MatchAnalysisType, CVEdit } from './types';
import { applyEdit } from './types';
import './App.css';

type PreviewTab = 'latex' | 'pdf';
type AiTab = 'chat' | 'match';

function App() {
  // LaTeX content
  const [texContent, setTexContent] = useState('');

  // PDF state
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Preview tab state
  const [activeTab, setActiveTab] = useState<PreviewTab>('latex');

  // AI section tab state
  const [aiTab, setAiTab] = useState<AiTab>('match');

  // Job input state
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const streamingContentRef = useRef('');

  // Edit history for undo
  const [editHistory, setEditHistory] = useState<Map<string, string>>(new Map());

  // Match analysis state
  const [matchAnalysis, setMatchAnalysis] = useState<MatchAnalysisType | null>(null);
  const [isLoadingMatch, setIsLoadingMatch] = useState(false);

  // User profile
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const api = useApi();

  // Load template and user data on mount
  useEffect(() => {
    const init = async () => {
      const template = await api.loadTemplate();
      if (template) {
        setTexContent(template);
      }
      const profile = await api.loadUserData();
      if (profile) {
        setUserProfile(profile);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compile LaTeX to PDF
  const handleCompile = useCallback(async () => {
    setIsCompiling(true);
    setCompileError(null);

    const result = await api.compileLatex(texContent);

    if (result.success && result.pdf_base64) {
      setPdfBase64(result.pdf_base64);
      setCompileError(null);
      setPageCount(result.page_count);
      setActiveTab('pdf');
      setHasUnsavedChanges(false);
    } else {
      setCompileError(result.error || 'Unknown error');
      setPdfBase64(null);
      setPageCount(0);
    }

    setIsCompiling(false);
  }, [texContent, api]);

  // Analyze job description (chat)
  const handleAnalyze = useCallback(async () => {
    if (!jobDescription.trim()) return;

    // Switch to chat tab and start analysis
    setAiTab('chat');
    setIsAnalyzing(true);
    setIsThinking(true);
    setStreamingContent('');
    setMessages([]);
    streamingContentRef.current = '';

    // Also trigger match analysis in background
    api.getMatchAnalysis(texContent, jobDescription, companyName).then((result) => {
      if (result) {
        setMatchAnalysis(result);
      }
    });

    await api.analyzeJob(
      texContent,
      jobDescription,
      companyName,
      (chunk) => {
        setIsThinking(false);
        streamingContentRef.current += chunk;
        setStreamingContent(streamingContentRef.current);
      },
      () => {
        const finalContent = streamingContentRef.current;
        streamingContentRef.current = '';
        setStreamingContent('');
        if (finalContent) {
          setMessages([{ role: 'assistant', content: finalContent }]);
        }
        setIsAnalyzing(false);
        setIsThinking(false);
        setHasAnalyzed(true);
      }
    );
  }, [texContent, jobDescription, companyName, api]);

  // Get match analysis
  const handleMatchAnalysis = useCallback(async () => {
    if (!jobDescription.trim()) return;

    setIsLoadingMatch(true);
    const result = await api.getMatchAnalysis(texContent, jobDescription, companyName);
    if (result) {
      setMatchAnalysis(result);
    }
    setIsLoadingMatch(false);
  }, [texContent, jobDescription, companyName, api]);

  // Apply edit from AI suggestion
  const handleApplyEdit = useCallback((edit: CVEdit, editKey: string): boolean => {
    const newContent = applyEdit(texContent, edit);
    if (newContent) {
      // Save current content for undo
      setEditHistory(prev => new Map(prev).set(editKey, texContent));
      setTexContent(newContent);
      // Clear compiled PDF since content changed
      setPdfBase64(null);
      setPageCount(0);
      setHasUnsavedChanges(true);
      return true;
    }
    return false;
  }, [texContent]);

  // Undo an edit
  const handleUndoEdit = useCallback((editKey: string): boolean => {
    const previousContent = editHistory.get(editKey);
    if (previousContent) {
      setTexContent(previousContent);
      setEditHistory(prev => {
        const newMap = new Map(prev);
        newMap.delete(editKey);
        return newMap;
      });
      setPdfBase64(null);
      setPageCount(0);
      setHasUnsavedChanges(true);
      return true;
    }
    return false;
  }, [editHistory]);

  // Send chat message
  const handleSendMessage = useCallback(async (message: string) => {
    const newMessages: Message[] = [...messages, { role: 'user', content: message }];
    setMessages(newMessages);
    setStreamingContent('');
    setIsAnalyzing(true);
    setIsThinking(true);
    streamingContentRef.current = '';

    await api.streamChat(
      {
        messages: newMessages,
        cv_content: texContent,
        job_description: jobDescription,
        company_name: companyName,
        user_profile: userProfile || undefined,
        stream: true,
      },
      (chunk) => {
        setIsThinking(false);
        streamingContentRef.current += chunk;
        setStreamingContent(streamingContentRef.current);
      },
      () => {
        const finalContent = streamingContentRef.current;
        streamingContentRef.current = '';
        setStreamingContent('');
        if (finalContent) {
          setMessages((prev) => [...prev, { role: 'assistant', content: finalContent }]);
        }
        setIsAnalyzing(false);
        setIsThinking(false);
      }
    );
  }, [messages, texContent, jobDescription, companyName, userProfile, api]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Your CV Editor</h1>
      </header>

      <main className="app-main">
        <div className="left-panel">
          <section className="job-posting-section">
            <h2>Job Posting</h2>
            <JobInput
              companyName={companyName}
              jobDescription={jobDescription}
              onCompanyNameChange={setCompanyName}
              onJobDescriptionChange={setJobDescription}
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
              hasAnalyzed={hasAnalyzed}
            />
          </section>

          <section className="ai-section">
            <div className="ai-section-header">
              <div className="ai-tabs">
                <button
                  className={`ai-tab-btn ${aiTab === 'match' ? 'active' : ''}`}
                  onClick={() => setAiTab('match')}
                >
                  Match Analysis
                </button>
                <button
                  className={`ai-tab-btn ${aiTab === 'chat' ? 'active' : ''}`}
                  onClick={() => setAiTab('chat')}
                >
                  AI Conversation
                </button>
              </div>
            </div>

            <div className="ai-content">
              {aiTab === 'match' ? (
                <MatchAnalysis
                  analysis={matchAnalysis}
                  isLoading={isLoadingMatch}
                  onAnalyze={handleMatchAnalysis}
                  hasJobDescription={!!jobDescription.trim()}
                />
              ) : (
                <ChatPanel
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  onApplyEdit={handleApplyEdit}
                  onUndoEdit={handleUndoEdit}
                  isLoading={isAnalyzing}
                  isThinking={isThinking}
                  streamingContent={streamingContent}
                />
              )}
            </div>
          </section>
        </div>

        <div className="right-panel">
          <section className="preview-section">
            <div className="preview-header">
              <div className="preview-title">
                <h2>CV Preview</h2>
                {pageCount > 0 && (
                  <span className={`page-count ${pageCount > 1 ? 'warning' : 'good'}`}>
                    {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                    {pageCount > 1 && (
                      <span className="page-warning-icon" title="CV should fit on one page">⚠️</span>
                    )}
                  </span>
                )}
              </div>
              <div className="preview-tabs">
                <button
                  className={`tab-btn ${activeTab === 'latex' ? 'active' : ''}`}
                  onClick={() => setActiveTab('latex')}
                >
                  LaTeX Code
                </button>
                <button
                  className={`tab-btn ${activeTab === 'pdf' ? 'active' : ''}`}
                  onClick={() => setActiveTab('pdf')}
                >
                  PDF
                </button>
              </div>
            </div>

            {pageCount > 1 && (
              <div className="page-count-warning">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Your CV is {pageCount} pages. Most recruiters expect a 1-page CV. Consider removing less relevant content.
              </div>
            )}

            <div className="preview-content">
              {activeTab === 'latex' ? (
                <LatexEditor
                  value={texContent}
                  onChange={setTexContent}
                  onCompile={handleCompile}
                  isCompiling={isCompiling}
                  hasUnsavedChanges={hasUnsavedChanges}
                />
              ) : (
                <PdfPreview
                  pdfBase64={pdfBase64}
                  error={compileError}
                  isCompiling={isCompiling}
                  onCompile={handleCompile}
                  hasUnsavedChanges={hasUnsavedChanges}
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
