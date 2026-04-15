import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import styles from './TemplateSelector.module.css';

export interface Template {
  id: string;
  name: string;
  description: string;
  previewUrl: string;
}

const SUPPORTED_TEMPLATES = new Set(['med-length-proff-cv']);

export function TemplateSelector() {
  const navigate = useNavigate();
  const { templates, setSelectedTemplateForBuild } = useAppContext();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (templateId: string) => {
    if (!SUPPORTED_TEMPLATES.has(templateId)) return;
    setSelectedId(templateId);
    setSelectedTemplateForBuild(templateId);
    // Small delay for the selection animation
    setTimeout(() => {
      navigate('/build/form');
    }, 300);
  };

  if (templates.isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className="spinner" />
          <p>Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <header className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigate('/')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Back
          </button>
          <span className={styles.eyebrow}>Step 1 of 2</span>
          <h1>Choose Your Template</h1>
          <p className={styles.subtitle}>
            Select a professionally designed CV template to get started.
            You can customize every detail in the editor.
          </p>
        </header>

        <div className={styles.grid}>
          {templates.templates.map((template, index) => (
            <article
              key={template.id}
              className={`${styles.card} ${hoveredId === template.id ? styles.hovered : ''} ${selectedId === template.id ? styles.selected : ''} ${!SUPPORTED_TEMPLATES.has(template.id) ? styles.disabled : ''}`}
              style={{ '--index': index } as React.CSSProperties}
              onMouseEnter={() => setHoveredId(template.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => handleSelect(template.id)}
              aria-disabled={!SUPPORTED_TEMPLATES.has(template.id) || undefined}
              tabIndex={!SUPPORTED_TEMPLATES.has(template.id) ? -1 : undefined}
            >
              <div className={styles.previewWrapper}>
                {!SUPPORTED_TEMPLATES.has(template.id) && (
                  <span className={styles.comingSoon}>Coming soon</span>
                )}
                <div className={styles.preview}>
                  <img
                    src={template.previewUrl}
                    alt={`${template.name} preview`}
                    loading="lazy"
                  />
                </div>
                <div className={styles.overlay}>
                  <button className={styles.selectBtn}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                    Use This Template
                  </button>
                </div>
              </div>
              <div className={styles.info}>
                <h2>{template.name}</h2>
                <p>{template.description}</p>
              </div>
            </article>
          ))}
        </div>

        <footer className={styles.footer}>
          <p>All templates are fully customizable</p>
        </footer>
      </div>
    </div>
  );
}
