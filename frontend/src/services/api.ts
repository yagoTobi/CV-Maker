import axios from 'axios';
import type { CompileResponse, ChatRequest, UserProfile, MatchAnalysis, CVFormData, CVVersion, CVVersionMeta, CVVersionWithChildren, CVImportResponse, TailorResponse } from '../types';
import type { Template } from '../features/template-selection';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Create axios instance with default timeout
const axiosInstance = axios.create({
  timeout: 30000, // 30s default
});

/**
 * Process Server-Sent Events stream and extract text chunks.
 */
async function processSSEStream(
  response: Response,
  onChunk: (text: string) => void,
  onComplete: () => void,
  signal?: AbortSignal
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let completed = false;

  while (true) {
    if (signal?.aborted) {
      reader.cancel();
      return;
    }
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
}

export const api = {
  async compileLatex(texContent: string, templateId?: string, signal?: AbortSignal): Promise<CompileResponse> {
    try {
      const response = await axiosInstance.post<CompileResponse>(`${API_BASE}/compile`, {
        tex_content: texContent,
        template_id: templateId,
      }, {
        timeout: 120000, // 120s for LaTeX compilation
        signal,
      });
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Compilation failed';
      return { success: false, error: message, page_count: 0, warnings: undefined };
    }
  },

  async fetchTemplates(): Promise<Template[]> {
    const response = await axiosInstance.get<{ templates: Template[] }>(`${API_BASE}/templates`);
    const apiOrigin = new URL(API_BASE).origin;
    return response.data.templates.map(t => ({
      ...t,
      previewUrl: `${apiOrigin}${t.previewUrl}`,
    }));
  },

  async loadTemplateContent(templateId: string): Promise<{ content: string; clsContent: string | null }> {
    const response = await axiosInstance.get<{ content: string; cls_content: string | null }>(
      `${API_BASE}/templates/${templateId}/content`
    );
    return {
      content: response.data.content,
      clsContent: response.data.cls_content,
    };
  },

  async streamChat(
    request: ChatRequest,
    onChunk: (text: string) => void,
    onComplete: () => void,
    signal?: AbortSignal
  ): Promise<void> {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, stream: true }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    await processSSEStream(response, onChunk, onComplete, signal);
  },

  async analyzeJob(
    cvContent: string,
    jobDescription: string,
    companyName: string,
    onChunk: (text: string) => void,
    onComplete: () => void,
    signal?: AbortSignal
  ): Promise<void> {
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
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    await processSSEStream(response, onChunk, onComplete, signal);
  },

  async getMatchAnalysis(
    cvContent: string,
    jobDescription: string,
    companyName: string,
    signal?: AbortSignal
  ): Promise<MatchAnalysis | null> {
    try {
      const response = await axiosInstance.post<MatchAnalysis>(`${API_BASE}/chat/match-analysis`, {
        cv_content: cvContent,
        job_description: jobDescription,
        company_name: companyName,
      }, { signal });
      return response.data;
    } catch (err) {
      console.error('[api:getMatchAnalysis]', err);
      return null;
    }
  },

  async loadUserData(): Promise<UserProfile | null> {
    const response = await axiosInstance.get<UserProfile>(`${API_BASE}/user-data`);
    return response.data;
  },

  async saveUserData(profile: UserProfile): Promise<void> {
    await axiosInstance.post(`${API_BASE}/user-data`, profile);
  },

  async generateLatex(formData: CVFormData): Promise<{ texContent: string; error?: string }> {
    try {
      const response = await axiosInstance.post<{ tex_content: string }>(`${API_BASE}/generate-latex`, formData);
      return { texContent: response.data.tex_content };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'LaTeX generation failed';
      return { texContent: '', error: message };
    }
  },

  async listVersions(): Promise<{ versions: CVVersionWithChildren[]; ungrouped: CVVersionMeta[] }> {
    const response = await axiosInstance.get<{ versions: CVVersionWithChildren[]; ungrouped: CVVersionMeta[] }>(`${API_BASE}/cv-versions`);
    return response.data;
  },

  async suggestTailorChanges(
    formData: CVFormData,
    jobDescription: string,
    companyName?: string,
    role?: string,
    signal?: AbortSignal
  ): Promise<TailorResponse | null> {
    try {
      const response = await axiosInstance.post<TailorResponse>(`${API_BASE}/tailor/suggest-changes`, {
        form_data: formData,
        job_description: jobDescription,
        company_name: companyName,
        role: role,
      }, {
        timeout: 60000,
        signal,
      });
      return response.data;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') throw err;
      console.error('[api:suggestTailorChanges]', err);
      return null;
    }
  },

  async saveVersion(data: {
    name: string;
    templateId: string;
    texContent: string;
    formData?: CVFormData;
    jobDescription?: string;
    companyName?: string;
    role?: string;
    matchScore?: number;
    baselineMatchScore?: number;
    parentVersionId?: string | null;
  }): Promise<CVVersion | null> {
    const payload = {
      name: data.name,
      template_id: data.templateId,
      tex_content: data.texContent,
      form_data: data.formData,
      job_description: data.jobDescription,
      company_name: data.companyName,
      role: data.role,
      match_score: data.matchScore,
      baseline_match_score: data.baselineMatchScore,
      parent_version_id: data.parentVersionId,
    };
    try {
      const response = await axiosInstance.post<CVVersion>(`${API_BASE}/cv-versions`, payload);
      return response.data;
    } catch (err) {
      console.error('[api:saveVersion]', err);
      return null;
    }
  },

  async getVersion(id: string): Promise<CVVersion | null> {
    try {
      const response = await axiosInstance.get<CVVersion>(`${API_BASE}/cv-versions/${id}`);
      return response.data;
    } catch (err) {
      console.error('[api:getVersion]', err);
      return null;
    }
  },

  async deleteVersion(id: string): Promise<boolean> {
    try {
      await axiosInstance.delete(`${API_BASE}/cv-versions/${id}`);
      return true;
    } catch (err) {
      console.error('[api:deleteVersion]', err);
      return false;
    }
  },

  async updateVersion(id: string, data: { parentVersionId?: string | null }): Promise<boolean> {
    try {
      await axiosInstance.patch(`${API_BASE}/cv-versions/${id}`, {
        parentVersionId: data.parentVersionId,
      });
      return true;
    } catch (err) {
      console.error('[api:updateVersion]', err);
      return false;
    }
  },

  async updateVersionFull(
    id: string,
    data: { name?: string; formData?: CVFormData; texContent?: string }
  ): Promise<boolean> {
    try {
      await axiosInstance.patch(`${API_BASE}/cv-versions/${id}`, {
        name: data.name,
        formData: data.formData,
        texContent: data.texContent,
      });
      return true;
    } catch (err) {
      console.error('[api:updateVersionFull]', err);
      return false;
    }
  },

  async importCV(file: File, signal?: AbortSignal): Promise<CVImportResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axiosInstance.post<CVImportResponse>(`${API_BASE}/cv-import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000, // 60s — extraction can be slow for large PDFs
        signal,
      });
      return response.data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        return {
          success: false,
          formData: null,
          source: 'pdf',
          confidence: null,
          summary: null,
          warnings: null,
          error: err.response.data.detail,
        };
      }
      const message = err instanceof Error ? err.message : 'CV import failed';
      return {
        success: false,
        formData: null,
        source: 'pdf',
        confidence: null,
        summary: null,
        warnings: null,
        error: message,
      };
    }
  },
};
