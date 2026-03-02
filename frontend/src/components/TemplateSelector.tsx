import { useState } from 'react';
import './TemplateSelector.css';

export interface Template {
  id: string;
  name: string;
  description: string;
  previewUrl: string;
}

interface TemplateSelectorProps {
  templates: Template[];
  onSelect: (templateId: string) => void;
  isLoading?: boolean;
  onBack?: () => void;
}

export function TemplateSelector({ templates, onSelect, isLoading, onBack }: TemplateSelectorProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (templateId: string) => {
    setSelectedId(templateId);
    // Small delay for the selection animation
    setTimeout(() => {
      onSelect(templateId);
    }, 300);
  };

  if (isLoading) {
    return (
      <div className="template-selector">
        <div className="template-selector-loading">
          <div className="spinner" />
          <p>Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="template-selector">
      <div className="template-selector-content">
        <header className="template-header">
          {onBack && (
            <button className="template-back-btn" onClick={onBack}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              Back
            </button>
          )}
          <span className="template-eyebrow">Step 1 of 2</span>
          <h1>Choose Your Template</h1>
          <p className="template-subtitle">
            Select a professionally designed CV template to get started.
            You can customize every detail in the editor.
          </p>
        </header>

        <div className="template-grid">
          {templates.map((template, index) => (
            <article
              key={template.id}
              className={`template-card ${hoveredId === template.id ? 'hovered' : ''} ${selectedId === template.id ? 'selected' : ''}`}
              style={{ '--index': index } as React.CSSProperties}
              onMouseEnter={() => setHoveredId(template.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => handleSelect(template.id)}
            >
              <div className="template-preview-wrapper">
                <div className="template-preview">
                  <img
                    src={template.previewUrl}
                    alt={`${template.name} preview`}
                    loading="lazy"
                  />
                </div>
                <div className="template-overlay">
                  <button className="select-template-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                    Use This Template
                  </button>
                </div>
              </div>
              <div className="template-info">
                <h2>{template.name}</h2>
                <p>{template.description}</p>
              </div>
            </article>
          ))}
        </div>

        <footer className="template-footer">
          <p>All templates support full LaTeX customization</p>
        </footer>
      </div>
    </div>
  );
}
