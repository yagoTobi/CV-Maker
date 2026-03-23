import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { api } from '../services/api';
import type { Message, UserProfile, MatchAnalysis, CVEdit } from '../types';
import { applyEdit } from '../types';

interface UseChatOptions {
  onContentChanged?: (newContent: string) => void;
}

export function useChat(
  texContent: string,
  jobDescription: string,
  companyName: string,
  userProfile: UserProfile | null,
  options: UseChatOptions = {}
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [editHistory, setEditHistory] = useState<Record<string, string>>({});

  // Match analysis
  const [matchAnalysis, setMatchAnalysis] = useState<MatchAnalysis | null>(null);
  const [isLoadingMatch, setIsLoadingMatch] = useState(false);

  const streamingContentRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);

  // Refs to always hold the latest parameter values (avoids stale closures)
  const texContentRef = useRef(texContent);
  texContentRef.current = texContent;
  const jobDescriptionRef = useRef(jobDescription);
  jobDescriptionRef.current = jobDescription;
  const companyNameRef = useRef(companyName);
  companyNameRef.current = companyName;

  // Prefetch support — silent background fetch of match analysis
  const prefetchedMatchRef = useRef<MatchAnalysis | null>(null);
  const prefetchHashRef = useRef('');

  // Abort in-flight requests on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Memoize the callback to prevent unnecessary recreations
  const onContentChanged = options.onContentChanged;

  // Analyze job description (initial analysis)
  const analyzeJob = useCallback(async () => {
    const currentTex = texContentRef.current;
    const currentJD = jobDescriptionRef.current;
    const currentCompany = companyNameRef.current;

    if (!currentJD.trim()) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsAnalyzing(true);
    setIsThinking(true);
    setStreamingContent('');
    setMessages([]);
    streamingContentRef.current = '';

    // Also trigger match analysis in background
    api.getMatchAnalysis(currentTex, currentJD, currentCompany, controller.signal).then((result) => {
      if (result) {
        setMatchAnalysis(result);
      }
    });

    try {
      await api.analyzeJob(
        currentTex,
        currentJD,
        currentCompany,
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
        },
        controller.signal
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Analysis failed:', err);
      setIsAnalyzing(false);
      setIsThinking(false);
    }
  }, []);

  // Get match analysis separately — checks prefetch cache first
  const getMatchAnalysis = useCallback(async () => {
    const currentJD = jobDescriptionRef.current;
    const currentCompany = companyNameRef.current;
    const currentTex = texContentRef.current;

    if (!currentJD.trim()) return;

    const inputHash = `${currentJD.trim().slice(0, 200)}|${currentCompany}`;
    if (prefetchedMatchRef.current && prefetchHashRef.current === inputHash) {
      setMatchAnalysis(prefetchedMatchRef.current);
      prefetchedMatchRef.current = null;
      prefetchHashRef.current = '';
      return;
    }

    setIsLoadingMatch(true);
    const result = await api.getMatchAnalysis(currentTex, currentJD, currentCompany);
    if (result) {
      setMatchAnalysis(result);
    }
    setIsLoadingMatch(false);
  }, []);

  // Prefetch match analysis silently in background
  const prefetchMatchAnalysis = useCallback(async (
    cvContent: string,
    jobDesc: string,
    company: string,
  ) => {
    const inputHash = `${jobDesc.trim().slice(0, 200)}|${company}`;
    if (inputHash === prefetchHashRef.current) return;

    try {
      const result = await api.getMatchAnalysis(cvContent, jobDesc, company);
      if (result) {
        prefetchedMatchRef.current = result;
        prefetchHashRef.current = inputHash;
      }
    } catch {
      // Silent failure — prefetch is best-effort
    }
  }, []);

  // Send a follow-up message
  const sendMessage = useCallback(async (message: string) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const newMessages: Message[] = [...messages, { role: 'user', content: message }];
    setMessages(newMessages);
    setStreamingContent('');
    setIsAnalyzing(true);
    setIsThinking(true);
    streamingContentRef.current = '';

    try {
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
        },
        controller.signal
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Chat failed:', err);
      setIsAnalyzing(false);
      setIsThinking(false);
    }
  }, [messages, texContent, jobDescription, companyName, userProfile]);

  // Apply an edit from AI suggestion
  const applyEditToContent = useCallback((edit: CVEdit, editKey: string): boolean => {
    const newContent = applyEdit(texContent, edit);
    if (newContent) {
      setEditHistory(prev => ({ ...prev, [editKey]: texContent }));
      onContentChanged?.(newContent);
      return true;
    }
    return false;
  }, [texContent, onContentChanged]);

  // Undo an edit
  const undoEdit = useCallback((editKey: string): boolean => {
    const previousContent = editHistory[editKey];
    if (previousContent) {
      setEditHistory(prev => {
        const { [editKey]: _, ...rest } = prev;
        return rest;
      });
      onContentChanged?.(previousContent);
      return true;
    }
    return false;
  }, [editHistory, onContentChanged]);

  // Reset chat state
  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setStreamingContent('');
    setMatchAnalysis(null);
    setHasAnalyzed(false);
    setEditHistory({});
  }, []);

  return useMemo(() => ({
    messages,
    streamingContent,
    isAnalyzing,
    isThinking,
    hasAnalyzed,
    matchAnalysis,
    isLoadingMatch,
    analyzeJob,
    getMatchAnalysis,
    prefetchMatchAnalysis,
    sendMessage,
    applyEdit: applyEditToContent,
    undoEdit,
    reset,
  }), [
    messages,
    streamingContent,
    isAnalyzing,
    isThinking,
    hasAnalyzed,
    matchAnalysis,
    isLoadingMatch,
    analyzeJob,
    getMatchAnalysis,
    prefetchMatchAnalysis,
    sendMessage,
    applyEditToContent,
    undoEdit,
    reset,
  ]);
}
