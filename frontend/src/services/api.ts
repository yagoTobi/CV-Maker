import axios from 'axios';
import type { CompileResponse, ChatRequest, UserProfile, MatchAnalysis, CVFormData, CVVersion, CVVersionMeta, CVVersionWithChildren, CVImportResponse, TailorResponse } from '../types';
import type { Template } from '../features/template-selection';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

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
  onComplete: () => void
): Promise<void> {
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
}

export const api = {
  async compileLatex(texContent: string, templateId?: string): Promise<CompileResponse> {
    try {
      const response = await axiosInstance.post<CompileResponse>(`${API_BASE}/compile`, {
        tex_content: texContent,
        template_id: templateId,
      }, {
        timeout: 120000, // 120s for LaTeX compilation
      });
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Compilation failed';
      return { success: false, error: message, page_count: 0, warnings: undefined };
    }
  },

  async fetchTemplates(): Promise<Template[]> {
    try {
      const response = await axiosInstance.get<{ templates: Template[] }>(`${API_BASE}/templates`);
      const apiOrigin = new URL(API_BASE).origin;
      return response.data.templates.map(t => ({
        ...t,
        previewUrl: `${apiOrigin}${t.previewUrl}`,
      }));
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      return [];
    }
  },

  async loadTemplateContent(templateId: string): Promise<{ content: string; clsContent: string | null }> {
    try {
      const response = await axiosInstance.get<{ content: string; cls_content: string | null }>(
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
  },

  async streamChat(
    request: ChatRequest,
    onChunk: (text: string) => void,
    onComplete: () => void
  ): Promise<void> {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, stream: true }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    await processSSEStream(response, onChunk, onComplete);
  },

  async analyzeJob(
    cvContent: string,
    jobDescription: string,
    companyName: string,
    onChunk: (text: string) => void,
    onComplete: () => void
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
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    await processSSEStream(response, onChunk, onComplete);
  },

  async getMatchAnalysis(
    cvContent: string,
    jobDescription: string,
    companyName: string
  ): Promise<MatchAnalysis | null> {
    try {
      const response = await axiosInstance.post<MatchAnalysis>(`${API_BASE}/chat/match-analysis`, {
        cv_content: cvContent,
        job_description: jobDescription,
        company_name: companyName,
      });
      return response.data;
    } catch (err) {
      console.error('Match analysis failed:', err);
      return null;
    }
  },

  async loadUserData(): Promise<UserProfile | null> {
    try {
      const response = await axiosInstance.get<UserProfile>(`${API_BASE}/user-data`);
      return response.data;
    } catch {
      return null;
    }
  },

  async saveUserData(profile: UserProfile): Promise<void> {
    try {
      await axiosInstance.post(`${API_BASE}/user-data`, profile);
    } catch (err) {
      console.error('Failed to save user data:', err);
    }
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
    try {
      const response = await axiosInstance.get<{ versions: CVVersionWithChildren[]; ungrouped: CVVersionMeta[] }>(`${API_BASE}/cv-versions`);
      return response.data;
    } catch {
      return { versions: [], ungrouped: [] };
    }
  },

  async suggestTailorChanges(
    formData: CVFormData,
    jobDescription: string,
    companyName?: string,
    role?: string
  ): Promise<TailorResponse | null> {
    try {
      const response = await axiosInstance.post<TailorResponse>(`${API_BASE}/tailor/suggest-changes`, {
        form_data: formData,
        job_description: jobDescription,
        company_name: companyName,
        role: role,
      }, {
        timeout: 60000,
      });
      return response.data;
    } catch (err) {
      console.error('Tailor suggest-changes failed:', err);
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
    try {
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
      const response = await axiosInstance.post<CVVersion>(`${API_BASE}/cv-versions`, payload);
      return response.data;
    } catch (err) {
      console.error('Failed to save version:', err);
      return null;
    }
  },

  async getVersion(id: string): Promise<CVVersion | null> {
    try {
      const response = await axiosInstance.get<CVVersion>(`${API_BASE}/cv-versions/${id}`);
      return response.data;
    } catch {
      return null;
    }
  },

  async deleteVersion(id: string): Promise<boolean> {
    try {
      await axiosInstance.delete(`${API_BASE}/cv-versions/${id}`);
      return true;
    } catch {
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
      console.error('Failed to update version:', err);
      return false;
    }
  },

  async importCV(file: File): Promise<CVImportResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axiosInstance.post<CVImportResponse>(`${API_BASE}/cv-import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000, // 60s — extraction can be slow for large PDFs
      });
      return response.data;
    } catch (err) {
      if (axiosInstance.isAxiosError(err) && err.response?.data?.detail) {
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
