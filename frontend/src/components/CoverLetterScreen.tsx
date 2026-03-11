import { useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { latex } from 'codemirror-lang-latex';
import styles from '../App.module.css';
import clStyles from './CoverLetterScreen.module.css';
import editorStyles from './LatexEditor.module.css';
import VersionSwitcher from './VersionSwitcher';
import { api } from '../services/api';
import type { CVVersion, CVVersionMeta, CoverLetterResponse } from '../types';


interface CoverLetterScreenProps {
  onBack: () => void;
  activeVersion: CVVersion | null;
  savedVersions: CVVersionMeta[];
  onSaveVersion: (name: string) => void;
  onSwitchVersion: (id: string) => void;
  isSavingVersion: boolean;
  onDashboard: () => void;
  previewTexContent: string;
  jobDescription: string;
  onJobDescriptionChange: (value: string) => void;
  companyName: string;
}


export default function CoverLetterScreen({
  onBack,
  activeVersion,
  savedVersions,
  onSaveVersion,
  onSwitchVersion,
  isSavingVersion,
  onDashboard,
  previewTexContent,
  jobDescription,
  onJobDescriptionChange,
  companyName,
}: CoverLetterScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [cvExpanded, setCvExpanded] = useState(true);
  const [previewMode, setPreviewMode] = useState<'pdf' | 'code'>('code');
  const [instructions, setInstructions] = useState('');
  const [coverLetter, setCoverLetter] = useState<CoverLetterResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const hasUploadedFilePreview = Boolean(fileUrl);
  const hasLoadedCodePreview = Boolean(!fileUrl && activeVersion && previewTexContent);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      setFileUrl(URL.createObjectURL(file));
    } else {
      setFileName(null);
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      setFileUrl(null);
    }
    if (file){
      if(file.name.endsWith('.pdf')) {
      setPreviewMode('pdf');
    } else if (file.name.endsWith('.tex') || file.name.endsWith('.json')) {
      setPreviewMode('code');
    }
    }

  };

  const handleGenerateCoverLetter = async () => {
    if (!previewTexContent.trim() || !jobDescription.trim()) {
      return;
    }

    setIsGenerating(true);
    const result = await api.generateCoverLetter({
      cvContent: previewTexContent,
      jobDescription,
      companyName: companyName || activeVersion?.companyName,
      instructions: instructions.trim() || undefined,
    });
    setCoverLetter(result);
    setIsGenerating(false);
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <button className={styles.changeTemplateBtn} onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Home
        </button>
        <h1>Cover Letter</h1>
        <div className={styles.headerRight}>
          <VersionSwitcher
            activeVersion={activeVersion}
            versions={savedVersions}
            onSave={onSaveVersion}
            onSwitch={onSwitchVersion}
            isSaving={isSavingVersion}
            onDashboard={onDashboard}
          />
        </div>
      </header>
      

      <main className={styles.main}>
        <div className={styles.leftPanel}>
          <section className={styles.cvUploadSection}>
            <h2>Upload your CV</h2>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className={clStyles.hiddenInput}
            />
            <button
              className={clStyles.uploadBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {fileName ? fileName : 'Choose file'}
            </button>
          </section>
          <section className={styles.jobPostingSection}>
            <h2>Paste job description</h2>
            <textarea
              className={clStyles.jobDescriptionInput}
              value={jobDescription}
              onChange={(event) => onJobDescriptionChange(event.target.value)}
              placeholder="Paste the job description here..."
            />
          </section>

          <section className={`${clStyles.cvDisplaySection} ${cvExpanded ? '' : clStyles.collapsed}`}>
            <button
              className={clStyles.cvDisplayHeader}
              onClick={() => setCvExpanded(!cvExpanded)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`${clStyles.chevron} ${cvExpanded ? clStyles.chevronOpen : ''}`}
              >
                <path d="m6 9 6 6 6-6"/>
              </svg>
              <h2>CV Preview</h2>
              {fileName && <span className={clStyles.cvFileName}>{fileName}</span>}
              <div className={styles.previewTabs} onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${
                    previewMode === 'pdf' ? styles.active : ''
                  }`}
                  onClick={() => setPreviewMode('pdf')}
                >
                  PDF
                </button>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${
                    previewMode === 'code' ? styles.active : ''
                  }`}
                  onClick={() => setPreviewMode('code')}
                >
                  Code
                </button>
              </div>
            </button>
            {cvExpanded && (
              <div className={clStyles.cvDisplayContent}>
                {previewMode === 'code' ? (
                  hasLoadedCodePreview ? (
                    <div className={editorStyles.editorContainer}>
                      <CodeMirror
                        value={previewTexContent}
                        height="100%"
                        extensions={[latex()]}
                        onChange={() => {}}
                        editable={false}
                        theme="dark"
                        className={editorStyles.codeEditor}
                      />
                    </div>
                  ) : hasUploadedFilePreview ? (
                    <div className={clStyles.cvPlaceholder}>
                      <p>No code available for uploaded files.</p>
                      <p>Upload a PDF/Word file for visual preview or load a saved CV version for LaTeX code.</p>
                    </div>
                  ) : (
                    <div className={clStyles.cvPlaceholder}>
                      <p>No CV code loaded yet.</p>
                      <p>Select a saved CV version to inspect its LaTeX.</p>
                    </div>
                  )
                ) : hasUploadedFilePreview ? (
                  <iframe
                    src={`${fileUrl}#zoom=100`}
                    className={clStyles.cvIframe}
                    title="CV Preview"
                  />
                ) : hasLoadedCodePreview ? (
                  <div className={clStyles.cvPlaceholder}>
                    <p>No PDF available for loaded CV code.</p>
                    <p>Switch to the Code tab to inspect the saved CV version.</p>
                  </div>
                ) : (
                  <div className={clStyles.cvPlaceholder}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10 9 9 9 8 9"/>
                    </svg>
                    <p>Upload a CV to preview it here</p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <div className={styles.rightPanel}>
          <section className={styles.previewSection}>
            <div className={styles.previewHeader}>
              <div className={styles.previewTitle}>
                <h2>Cover Letter</h2>
                {coverLetter && (
                  <span className={clStyles.providerBadge}>
                    {coverLetter.mode.toUpperCase()} / {coverLetter.provider}
                  </span>
                )}
              </div>
              <button
                type="button"
                className={clStyles.generateBtn}
                onClick={handleGenerateCoverLetter}
                disabled={
                  isGenerating ||
                  !previewTexContent.trim() ||
                  !jobDescription.trim()
                }
              >
                {isGenerating ? 'Generating...' : 'Generate Cover Letter'}
              </button>
            </div>

            <div className={styles.previewContent}>
              <div className={clStyles.coverLetterPanel}>
                <div className={clStyles.instructionsBlock}>
                  <label htmlFor="cover-letter-instructions">Extra instructions</label>
                  <textarea
                    id="cover-letter-instructions"
                    className={clStyles.instructionsInput}
                    value={instructions}
                    onChange={(event) => setInstructions(event.target.value)}
                    placeholder="Optional: tone, length, audience, or points to emphasize..."
                  />
                </div>

                {isGenerating ? (
                  <div className={clStyles.coverLetterState}>
                    <div className={clStyles.spinner}></div>
                    <p>Generating a tailored cover letter...</p>
                  </div>
                ) : coverLetter?.cover_letter ? (
                  <div className={clStyles.coverLetterContent}>
                    <textarea
                      className={clStyles.coverLetterOutput}
                      value={coverLetter.cover_letter}
                      onChange={(event) =>
                        setCoverLetter((current) =>
                          current
                            ? { ...current, cover_letter: event.target.value }
                            : current
                        )
                      }
                    />

                    <div className={clStyles.supportGrid}>
                      <div className={clStyles.supportCard}>
                        <h3>Key Matches</h3>
                        <ul>
                          {coverLetter.key_matches.map((item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          ))}
                        </ul>
                      </div>

                      <div className={clStyles.supportCard}>
                        <h3>Weaker Points</h3>
                        <ul>
                          {coverLetter.missing_or_weaker_points.map((item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {coverLetter.tone_notes.length > 0 && (
                      <div className={clStyles.notesBlock}>
                        <h3>Tone Notes</h3>
                        <ul>
                          {coverLetter.tone_notes.map((item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={clStyles.coverLetterState}>
                    <p>Load a CV version and provide a job description to generate a tailored cover letter.</p>
                    <p className={clStyles.stateHint}>
                      The generated letter will appear here with key matches and improvement notes.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
