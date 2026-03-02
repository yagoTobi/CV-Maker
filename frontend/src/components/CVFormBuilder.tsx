import { useState, useRef } from 'react';
import { useFormBuilder, type FormSection } from '../hooks/useFormBuilder';
import { api } from '../services/api';
import type { CVFormData } from '../types';
import styles from './CVFormBuilder.module.css';

interface CVFormBuilderProps {
  templateId: string;
  onGenerated: (texContent: string, templateId: string, formData: CVFormData) => void;
  onBack: () => void;
}

const SECTIONS: { id: FormSection; label: string }[] = [
  { id: 'personal', label: 'Personal Info' },
  { id: 'work', label: 'Work Experience' },
  { id: 'education', label: 'Education' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'awards', label: 'Awards' },
];

export default function CVFormBuilder({ templateId, onGenerated, onBack }: CVFormBuilderProps) {
  // All hooks at top — never after a conditional return (key learning #3)
  const fb = useFormBuilder(templateId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [generatedTex, setGeneratedTex] = useState<string | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setCompileError(null);
    const { texContent, error } = await fb.generateCV();
    if (error || !texContent) return;

    setGeneratedTex(texContent);
    setIsCompiling(true);
    setPdfBase64(null);

    const result = await api.compileLatex(texContent, templateId);
    setIsCompiling(false);

    if (result.success && result.pdf_base64) {
      setPdfBase64(result.pdf_base64);
    } else {
      setCompileError(result.error || 'Compilation failed');
    }
  };

  const handleRegenerate = async () => {
    if (!generatedTex) return;
    setIsCompiling(true);
    setCompileError(null);
    const result = await api.compileLatex(generatedTex, templateId);
    setIsCompiling(false);
    if (result.success && result.pdf_base64) {
      setPdfBase64(result.pdf_base64);
    } else {
      setCompileError(result.error || 'Compilation failed');
    }
  };

  const handleOpenInEditor = () => {
    if (generatedTex) {
      onGenerated(generatedTex, templateId, fb.formData);
    }
  };

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <button className={styles.backBtn} onClick={onBack}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Back
          </button>
          <div className={styles.sidebarTitle}>
            <span className={styles.eyebrow}>Step 2 of 2</span>
            <h2>Fill in your CV</h2>
          </div>
        </div>

        <nav className={styles.sectionNav}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              className={`${styles.navItem} ${fb.activeSection === s.id ? styles.navActive : ''}`}
              onClick={() => fb.setActiveSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.importExport}>
            <button className={styles.iconBtn} onClick={fb.exportFormData} title="Export CV data as JSON">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export
            </button>
            <button className={styles.iconBtn} onClick={() => fileInputRef.current?.click()} title="Import CV data from JSON">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className={styles.hiddenInput}
              onChange={e => { if (e.target.files?.[0]) fb.importFormData(e.target.files[0]); }}
            />
          </div>

          {fb.generateError && (
            <p className={styles.errorMsg}>{fb.generateError}</p>
          )}

          <button
            className={styles.generateBtn}
            onClick={handleGenerate}
            disabled={fb.isGenerating || isCompiling}
          >
            {fb.isGenerating ? (
              <><span className={styles.spinner} /> Generating...</>
            ) : isCompiling ? (
              <><span className={styles.spinner} /> Compiling...</>
            ) : pdfBase64 ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.09"/>
                </svg>
                Regenerate
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
                Generate CV
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main form area */}
      <main className={styles.formArea}>
        {fb.activeSection === 'personal' && <PersonalSection fb={fb} />}
        {fb.activeSection === 'work' && <WorkSection fb={fb} />}
        {fb.activeSection === 'education' && <EducationSection fb={fb} />}
        {fb.activeSection === 'skills' && <SkillsSection fb={fb} />}
        {fb.activeSection === 'projects' && <ProjectsSection fb={fb} />}
        {fb.activeSection === 'awards' && <AwardsSection fb={fb} />}
      </main>

      {/* PDF Preview panel */}
      <aside className={styles.previewPanel}>
        <div className={styles.previewHeader}>
          <h3>CV Preview</h3>
          {pdfBase64 && (
            <button className={styles.openEditorBtn} onClick={handleOpenInEditor}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Open in Editor
            </button>
          )}
        </div>

        <div className={styles.previewContent}>
          {isCompiling ? (
            <div className={styles.previewLoading}>
              <div className={styles.previewSpinner} />
              <p>Compiling PDF...</p>
            </div>
          ) : compileError ? (
            <div className={styles.previewError}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p>Compilation error</p>
              <pre className={styles.compileErrorPre}>{compileError}</pre>
              <button className={styles.retryBtn} onClick={handleRegenerate}>Try again</button>
            </div>
          ) : pdfBase64 ? (
            <iframe
              src={`data:application/pdf;base64,${pdfBase64}`}
              title="CV Preview"
              className={styles.pdfFrame}
            />
          ) : (
            <div className={styles.previewPlaceholder}>
              <div className={styles.placeholderIcon}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <p>Fill in your details,<br />then click <strong>Generate CV</strong></p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

// --- Section components ---
// All section components are pure render — no hooks, no conditional hook calls

type FB = ReturnType<typeof useFormBuilder>;

function PersonalSection({ fb }: { fb: FB }) {
  const p = fb.formData.personalInfo;
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Personal Information</h3>
      <div className={styles.formGrid}>
        <Field label="Full Name" required>
          <input className={styles.input} value={p.fullName} onChange={e => fb.updatePersonalInfo({ fullName: e.target.value })} placeholder="Jane Smith" />
        </Field>
        <Field label="Email" required>
          <input className={styles.input} type="email" value={p.email} onChange={e => fb.updatePersonalInfo({ email: e.target.value })} placeholder="jane@example.com" />
        </Field>
        <Field label="Phone">
          <input className={styles.input} value={p.phone} onChange={e => fb.updatePersonalInfo({ phone: e.target.value })} placeholder="+44 7700 000000" />
        </Field>
        <Field label="Location">
          <input className={styles.input} value={p.location} onChange={e => fb.updatePersonalInfo({ location: e.target.value })} placeholder="London, UK" />
        </Field>
      </div>

      <div className={styles.subSection}>
        <div className={styles.subSectionHeader}>
          <h4>Links</h4>
          <button className={styles.addBtn} onClick={fb.addLink}>+ Add Link</button>
        </div>
        {p.links.map((link, i) => (
          <div key={i} className={styles.linkRow}>
            <input className={styles.input} value={link.label} onChange={e => fb.updateLink(i, 'label', e.target.value)} placeholder="Label (e.g. GitHub)" />
            <input className={`${styles.input} ${styles.flex2}`} value={link.url} onChange={e => fb.updateLink(i, 'url', e.target.value)} placeholder="https://..." />
            <button className={styles.removeBtn} onClick={() => fb.removeLink(i)} title="Remove">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function WorkSection({ fb }: { fb: FB }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Work Experience</h3>
        <button className={styles.addBtn} onClick={fb.addWorkEntry}>+ Add Position</button>
      </div>
      {fb.formData.workExperience.map((job, i) => (
        <div key={i} className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>{job.company || `Position ${i + 1}`}</span>
            {fb.formData.workExperience.length > 1 && (
              <button className={styles.removeBtn} onClick={() => fb.removeWorkEntry(i)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
          <div className={styles.formGrid}>
            <Field label="Company" required>
              <input className={styles.input} value={job.company} onChange={e => fb.updateWorkEntry(i, { company: e.target.value })} placeholder="Acme Corp" />
            </Field>
            <Field label="Title" required>
              <input className={styles.input} value={job.title} onChange={e => fb.updateWorkEntry(i, { title: e.target.value })} placeholder="Software Engineer" />
            </Field>
            <Field label="Start Date">
              <input className={styles.input} value={job.startDate} onChange={e => fb.updateWorkEntry(i, { startDate: e.target.value })} placeholder="Jan 2022" />
            </Field>
            <Field label="End Date">
              <input className={styles.input} value={job.endDate} onChange={e => fb.updateWorkEntry(i, { endDate: e.target.value })} placeholder="Present" />
            </Field>
            <Field label="Location">
              <input className={styles.input} value={job.location} onChange={e => fb.updateWorkEntry(i, { location: e.target.value })} placeholder="London, UK" />
            </Field>
          </div>
          <div className={styles.bulletsSection}>
            <div className={styles.subSectionHeader}>
              <h4>Bullet Points</h4>
              <button className={styles.addBtn} onClick={() => fb.addBullet(i)}>+ Add</button>
            </div>
            {job.bullets.map((bullet, bi) => (
              <div key={bi} className={styles.bulletRow}>
                <textarea
                  className={`${styles.input} ${styles.bulletInput}`}
                  value={bullet}
                  onChange={e => fb.updateBullet(i, bi, e.target.value)}
                  placeholder="Describe an achievement or responsibility..."
                  rows={2}
                />
                {job.bullets.length > 1 && (
                  <button className={styles.removeBtn} onClick={() => fb.removeBullet(i, bi)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function EducationSection({ fb }: { fb: FB }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Education</h3>
        <button className={styles.addBtn} onClick={fb.addEducationEntry}>+ Add Entry</button>
      </div>
      {fb.formData.education.map((edu, i) => (
        <div key={i} className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>{edu.school || `Institution ${i + 1}`}</span>
            {fb.formData.education.length > 1 && (
              <button className={styles.removeBtn} onClick={() => fb.removeEducationEntry(i)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
          <div className={styles.formGrid}>
            <Field label="School / University" required>
              <input className={styles.input} value={edu.school} onChange={e => fb.updateEducationEntry(i, { school: e.target.value })} placeholder="University of Oxford" />
            </Field>
            <Field label="Degree" required>
              <input className={styles.input} value={edu.degree} onChange={e => fb.updateEducationEntry(i, { degree: e.target.value })} placeholder="BSc Computer Science" />
            </Field>
            <Field label="Start Date">
              <input className={styles.input} value={edu.startDate} onChange={e => fb.updateEducationEntry(i, { startDate: e.target.value })} placeholder="Sep 2019" />
            </Field>
            <Field label="End Date">
              <input className={styles.input} value={edu.endDate} onChange={e => fb.updateEducationEntry(i, { endDate: e.target.value })} placeholder="Jun 2023" />
            </Field>
            <Field label="Location">
              <input className={styles.input} value={edu.location} onChange={e => fb.updateEducationEntry(i, { location: e.target.value })} placeholder="Oxford, UK" />
            </Field>
            <Field label="GPA">
              <input className={styles.input} value={edu.gpa || ''} onChange={e => fb.updateEducationEntry(i, { gpa: e.target.value })} placeholder="3.8 / 4.0" />
            </Field>
          </div>
          <div className={styles.bulletsSection}>
            <div className={styles.subSectionHeader}>
              <h4>Notable Details</h4>
              <button className={styles.addBtn} onClick={() => fb.addEduDetail(i)}>+ Add</button>
            </div>
            {edu.details.map((detail, di) => (
              <div key={di} className={styles.bulletRow}>
                <input className={styles.input} value={detail} onChange={e => fb.updateEduDetail(i, di, e.target.value)} placeholder="Thesis, honours, coursework..." />
                <button className={styles.removeBtn} onClick={() => fb.removeEduDetail(i, di)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function SkillsSection({ fb }: { fb: FB }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Skills</h3>
        <button className={styles.addBtn} onClick={fb.addSkillCategory}>+ Add Category</button>
      </div>
      <p className={styles.hint}>Enter skills as a comma-separated list within each category.</p>
      {fb.formData.skills.map((cat, i) => (
        <div key={i} className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>{cat.category || `Category ${i + 1}`}</span>
            {fb.formData.skills.length > 1 && (
              <button className={styles.removeBtn} onClick={() => fb.removeSkillCategory(i)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
          <div className={styles.formGrid}>
            <Field label="Category Name">
              <input className={styles.input} value={cat.category} onChange={e => fb.updateSkillCategory(i, { category: e.target.value })} placeholder="Programming Languages" />
            </Field>
            <Field label="Skills (comma-separated)">
              <input className={styles.input} value={cat.skills.join(', ')} onChange={e => fb.updateSkillsText(i, e.target.value)} placeholder="Python, TypeScript, Go" />
            </Field>
          </div>
        </div>
      ))}
    </section>
  );
}

function ProjectsSection({ fb }: { fb: FB }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Projects</h3>
        <button className={styles.addBtn} onClick={fb.addProject}>+ Add Project</button>
      </div>
      {(fb.formData.projects || []).length === 0 && (
        <p className={styles.emptyState}>No projects added yet. Click "Add Project" to get started.</p>
      )}
      {(fb.formData.projects || []).map((proj, i) => (
        <div key={i} className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>{proj.name || `Project ${i + 1}`}</span>
            <button className={styles.removeBtn} onClick={() => fb.removeProject(i)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className={styles.formGrid}>
            <Field label="Project Name">
              <input className={styles.input} value={proj.name} onChange={e => fb.updateProject(i, { name: e.target.value })} placeholder="My Awesome App" />
            </Field>
            <Field label="Year">
              <input className={styles.input} value={proj.year} onChange={e => fb.updateProject(i, { year: e.target.value })} placeholder="2024" />
            </Field>
            <Field label="Technologies">
              <input className={styles.input} value={proj.technologies || ''} onChange={e => fb.updateProject(i, { technologies: e.target.value })} placeholder="React, Python, PostgreSQL" />
            </Field>
          </div>
          <Field label="Description">
            <textarea className={`${styles.input} ${styles.textarea}`} value={proj.description} onChange={e => fb.updateProject(i, { description: e.target.value })} placeholder="Describe what you built and its impact..." rows={3} />
          </Field>
        </div>
      ))}
    </section>
  );
}

function AwardsSection({ fb }: { fb: FB }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Awards & Achievements</h3>
        <button className={styles.addBtn} onClick={fb.addAward}>+ Add Award</button>
      </div>
      {(fb.formData.awards || []).length === 0 && (
        <p className={styles.emptyState}>No awards added yet.</p>
      )}
      {(fb.formData.awards || []).map((award, i) => (
        <div key={i} className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>{award.title || `Award ${i + 1}`}</span>
            <button className={styles.removeBtn} onClick={() => fb.removeAward(i)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className={styles.formGrid}>
            <Field label="Year">
              <input className={styles.input} value={award.year} onChange={e => fb.updateAward(i, { year: e.target.value })} placeholder="2023" />
            </Field>
            <Field label="Title" required>
              <input className={styles.input} value={award.title} onChange={e => fb.updateAward(i, { title: e.target.value })} placeholder="Best Paper Award" />
            </Field>
            <Field label="Description">
              <input className={styles.input} value={award.description || ''} onChange={e => fb.updateAward(i, { description: e.target.value })} placeholder="Brief description (optional)" />
            </Field>
          </div>
        </div>
      ))}
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>
        {label}{required && <span className={styles.required}>*</span>}
      </label>
      {children}
    </div>
  );
}
