import { useState, useCallback, useRef, useMemo } from 'react';
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

  // Memoize the callback to prevent unnecessary recreations
  const onContentChanged = options.onContentChanged;

  // Analyze job description (initial analysis)
  const analyzeJob = useCallback(async () => {
    if (!jobDescription.trim()) return;

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

    try {
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
    } catch (err) {
      console.error('Analysis failed:', err);
      setIsAnalyzing(false);
      setIsThinking(false);
    }
  }, [texContent, jobDescription, companyName]);

  // Get match analysis separately
  const getMatchAnalysis = useCallback(async () => {
    if (!jobDescription.trim()) return;

    setIsLoadingMatch(true);
    const result = await api.getMatchAnalysis(texContent, jobDescription, companyName);
    if (result) {
      setMatchAnalysis(result);
    }
    setIsLoadingMatch(false);
  }, [texContent, jobDescription, companyName]);

  // Send a follow-up message
  const sendMessage = useCallback(async (message: string) => {
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
        }
      );
    } catch (err) {
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
    sendMessage,
    applyEditToContent,
    undoEdit,
    reset,
  ]);
}
