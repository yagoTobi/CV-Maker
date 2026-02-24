import { useState, useCallback } from 'react';
import axios from 'axios';
import type { CompileResponse, ChatRequest, UserProfile, MatchAnalysis } from '../types';
import type { Template } from '../components';

const API_BASE = 'http://localhost:8000/api';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compileLatex = useCallback(async (texContent: string, templateId?: string): Promise<CompileResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post<CompileResponse>(`${API_BASE}/compile`, {
        tex_content: texContent,
        template_id: templateId,
      });
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Compilation failed';
      setError(message);
      return { success: false, error: message, page_count: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTemplate = useCallback(async (): Promise<string> => {
    try {
      const response = await axios.get<{ content: string }>(`${API_BASE}/template`);
      return response.data.content;
    } catch (err) {
      console.error('Failed to load template:', err);
      return '';
    }
  }, []);

  const fetchTemplates = useCallback(async (): Promise<Template[]> => {
    try {
      const response = await axios.get<{ templates: Template[] }>(`${API_BASE}/templates`);
      // Convert relative preview URLs to absolute URLs pointing to backend
      return response.data.templates.map(t => ({
        ...t,
        previewUrl: `http://localhost:8000${t.previewUrl}`,
      }));
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      return [];
    }
  }, []);

  const loadTemplateContent = useCallback(async (templateId: string): Promise<{ content: string; clsContent: string | null }> => {
    try {
      const response = await axios.get<{ content: string; cls_content: string | null }>(
        `${API_BASE}/templates/${templateId}/content`
      );
      return {
        content: response.data.content,
        clsContent: response.data.cls_content,
      };
    } catch (err) {
      console.error('Failed to load template content:', err);
      return { content: '', clsContent: null };
    }
  }, []);

  const streamChat = useCallback(async (
    request: ChatRequest,
    onChunk: (text: string) => void,
    onComplete: () => void
  ): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, stream: true }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let completed = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              completed = true;
              onComplete();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                onChunk(parsed.text);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
      if (!completed) {
        onComplete();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Chat failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const analyzeJob = useCallback(async (
    cvContent: string,
    jobDescription: string,
    companyName: string,
    onChunk: (text: string) => void,
    onComplete: () => void
  ): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/chat/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          cv_content: cvContent,
          job_description: jobDescription,
          company_name: companyName,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let completed = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              completed = true;
              onComplete();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                onChunk(parsed.text);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
      if (!completed) {
        onComplete();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getMatchAnalysis = useCallback(async (
    cvContent: string,
    jobDescription: string,
    companyName: string
  ): Promise<MatchAnalysis | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post<MatchAnalysis>(`${API_BASE}/chat/match-analysis`, {
        cv_content: cvContent,
        job_description: jobDescription,
        company_name: companyName,
      });
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Match analysis failed';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUserData = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const response = await axios.get<UserProfile>(`${API_BASE}/user-data`);
      return response.data;
    } catch {
      return null;
    }
  }, []);

  const saveUserData = useCallback(async (profile: UserProfile): Promise<void> => {
    try {
      await axios.post(`${API_BASE}/user-data`, profile);
    } catch (err) {
      console.error('Failed to save user data:', err);
    }
  }, []);

  return {
    loading,
    error,
    compileLatex,
    loadTemplate,
    fetchTemplates,
    loadTemplateContent,
    streamChat,
    analyzeJob,
    getMatchAnalysis,
    loadUserData,
    saveUserData,
  };
}
