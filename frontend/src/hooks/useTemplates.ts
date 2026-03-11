import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { Template } from '../features/template-selection';

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [content, setContent] = useState('');

  // Load templates list on mount
  useEffect(() => {
    let mounted = true;

    const loadTemplates = async () => {
      setIsLoading(true);
      const templatesList = await api.fetchTemplates();
      if (mounted) {
        setTemplates(templatesList);
        setIsLoading(false);
      }
    };

    loadTemplates();

    return () => {
      mounted = false;
    };
  }, []);

  // Select a template and load its content
  const selectTemplate = useCallback(async (templateId: string) => {
    setSelectedId(templateId);
    const { content: templateContent } = await api.loadTemplateContent(templateId);
    if (templateContent) {
      setContent(templateContent);
    }
    return !!templateContent;
  }, []);

  // Update content externally (e.g., from editor changes)
  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  // Set only the template ID (no content fetch) — used when content is provided externally
  const setTemplateId = useCallback((templateId: string) => {
    setSelectedId(templateId);
  }, []);

  // Reset template selection
  const reset = useCallback(() => {
    setSelectedId(null);
    setContent('');
  }, []);

  return {
    templates,
    isLoading,
    selectedId,
    content,
    selectTemplate,
    setTemplateId,
    updateContent,
    reset,
  };
}
