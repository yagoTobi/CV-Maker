import { useState, useCallback } from 'react';
import type {
  CVFormData,
  PersonalInfo,
  WorkEntry,
  EducationEntry,
  SkillCategory,
  Project,
  Award,
  ImportConfidence,
  ImportSummary,
} from '../types';
import styles from './CVImportReview.module.css';

interface CVImportReviewProps {
  formData: CVFormData;
  confidence: ImportConfidence;
  summary: ImportSummary;
  warnings: string[] | null;
  source: 'pdf' | 'docx' | 'json';
  onConfirm: (editedFormData: CVFormData) => void;
  onBack: () => void;
}

// --- Helpers ---

function getFieldConfidence(
  fields: Record<string, 'high' | 'medium' | 'low'>,
  path: string,
): 'high' | 'medium' | 'low' {
  return fields[path] ?? 'high';
}

function confidenceClass(level: 'high' | 'medium' | 'low') {
  if (level === 'low') return styles.confidenceLow;
  if (level === 'medium') return styles.confidenceMedium;
  return '';
}

function sourceLabel(source: string) {
  if (source === 'pdf') return 'PDF';
  if (source === 'docx') return 'DOCX';
  return 'JSON';
}

function pluralize(n: number, singular: string) {
  return `${n} ${singular}${n === 1 ? '' : 's'}`;
}

// --- Component ---

export default function CVImportReview({
  formData: initialData,
  confidence,
  summary,
  warnings,
  source,
  onConfirm,
  onBack,
}: CVImportReviewProps) {
  const [data, setData] = useState<CVFormData>(() => structuredClone(initialData));
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (section: string) =>
    setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));

  // --- Update helpers ---

  const updatePersonal = useCallback((updates: Partial<PersonalInfo>) => {
    setData(prev => ({ ...prev, personalInfo: { ...prev.personalInfo, ...updates } }));
  }, []);

  const updatePersonalLink = useCallback((idx: number, field: 'label' | 'url', val: string) => {
    setData(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        links: prev.personalInfo.links.map((l, i) => (i === idx ? { ...l, [field]: val } : l)),
      },
    }));
  }, []);

  const addPersonalLink = useCallback(() => {
    setData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, links: [...prev.personalInfo.links, { label: '', url: '' }] },
    }));
  }, []);

  const removePersonalLink = useCallback((idx: number) => {
    setData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, links: prev.personalInfo.links.filter((_, i) => i !== idx) },
    }));
  }, []);

  // Generic array helpers
  const updateArrayEntry = useCallback(
    <T,>(key: keyof CVFormData, idx: number, updates: Partial<T>) => {
      setData(prev => ({
        ...prev,
        [key]: (prev[key] as T[]).map((e, i) => (i === idx ? { ...e, ...updates } : e)),
      }));
    },
    [],
  );

  const addArrayEntry = useCallback(<T,>(key: keyof CVFormData, empty: T) => {
    setData(prev => ({ ...prev, [key]: [...((prev[key] as T[]) || []), empty] }));
  }, []);

  const removeArrayEntry = useCallback(<T,>(key: keyof CVFormData, idx: number) => {
    setData(prev => ({ ...prev, [key]: ((prev[key] as T[]) || []).filter((_, i) => i !== idx) }));
  }, []);

  // Bullet / detail helpers
  const updateNestedArray = useCallback(
    (key: 'workExperience' | 'education', entryIdx: number, arrayKey: string, bulletIdx: number, val: string) => {
      setData(prev => ({
        ...prev,
        [key]: (prev[key] as Record<string, unknown>[]).map((e, i) =>
          i === entryIdx
            ? { ...e, [arrayKey]: (e[arrayKey] as string[]).map((b: string, bi: number) => (bi === bulletIdx ? val : b)) }
            : e,
        ),
      }));
    },
    [],
  );

  const addNestedItem = useCallback(
    (key: 'workExperience' | 'education', entryIdx: number, arrayKey: string) => {
      setData(prev => ({
        ...prev,
        [key]: (prev[key] as Record<string, unknown>[]).map((e, i) =>
          i === entryIdx ? { ...e, [arrayKey]: [...(e[arrayKey] as string[]), ''] } : e,
        ),
      }));
    },
    [],
  );

  const removeNestedItem = useCallback(
    (key: 'workExperience' | 'education', entryIdx: number, arrayKey: string, bulletIdx: number) => {
      setData(prev => ({
        ...prev,
        [key]: (prev[key] as Record<string, unknown>[]).map((e, i) =>
          i === entryIdx
            ? { ...e, [arrayKey]: (e[arrayKey] as string[]).filter((_: string, bi: number) => bi !== bulletIdx) }
            : e,
        ),
      }));
    },
    [],
  );

  const hasData =
    data.personalInfo.fullName ||
    data.workExperience.length > 0 ||
    data.education.length > 0 ||
    data.skills.length > 0;

  // --- Section renderers ---

  function renderInput(
    label: string,
    value: string,
    onChange: (v: string) => void,
    fieldPath?: string,
    multiline?: boolean,
  ) {
    const conf = fieldPath ? getFieldConfidence(confidence.fields, fieldPath) : 'high';
    const wrapClass = `${styles.fieldWrap} ${confidenceClass(conf)}`;
    return (
      <div className={wrapClass}>
        <label className={styles.label}>
          {label}
          {conf === 'low' && <span className={styles.needsReview}>Needs review</span>}
        </label>
        {multiline ? (
          <textarea className={styles.textarea} value={value} onChange={e => onChange(e.target.value)} rows={3} />
        ) : (
          <input className={styles.input} type="text" value={value} onChange={e => onChange(e.target.value)} />
        )}
      </div>
    );
  }

  function renderSectionHeader(title: string, count: number, sectionKey: string) {
    const isCollapsed = collapsed[sectionKey] ?? (count === 0);
    return (
      <button className={styles.sectionHeader} onClick={() => toggle(sectionKey)}>
        <svg
          className={`${styles.chevron} ${isCollapsed ? '' : styles.chevronOpen}`}
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
        <span className={styles.sectionTitle}>{title}</span>
        <span className={styles.sectionCount}>{count}</span>
      </button>
    );
  }

  function renderPersonalInfo() {
    const isCollapsed = collapsed['personal'] ?? false;
    return (
      <div className={styles.section}>
        {renderSectionHeader('Personal Info', 1, 'personal')}
        {!isCollapsed && (
          <div className={styles.sectionBody}>
            <div className={styles.fieldGrid}>
              {renderInput('Full Name', data.personalInfo.fullName, v => updatePersonal({ fullName: v }), 'personalInfo.fullName')}
              {renderInput('Email', data.personalInfo.email, v => updatePersonal({ email: v }), 'personalInfo.email')}
              {renderInput('Phone', data.personalInfo.phone, v => updatePersonal({ phone: v }), 'personalInfo.phone')}
              {renderInput('Location', data.personalInfo.location, v => updatePersonal({ location: v }), 'personalInfo.location')}
            </div>
            {renderInput('Summary', data.personalInfo.summary || '', v => updatePersonal({ summary: v }), 'personalInfo.summary', true)}

            <div className={styles.subsectionLabel}>Links</div>
            {data.personalInfo.links.map((link, i) => (
              <div key={i} className={styles.inlineRow}>
                <input className={styles.input} placeholder="Label" value={link.label} onChange={e => updatePersonalLink(i, 'label', e.target.value)} />
                <input className={styles.input} placeholder="URL" value={link.url} onChange={e => updatePersonalLink(i, 'url', e.target.value)} />
                <button className={styles.removeBtn} onClick={() => removePersonalLink(i)} title="Remove link">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            ))}
            <button className={styles.addBtn} onClick={addPersonalLink}>+ Add link</button>
          </div>
        )}
      </div>
    );
  }

  function renderWorkExperience() {
    const entries = data.workExperience;
    const isCollapsed = collapsed['work'] ?? (entries.length === 0);
    return (
      <div className={styles.section}>
        {renderSectionHeader('Work Experience', entries.length, 'work')}
        {!isCollapsed && (
          <div className={styles.sectionBody}>
            {entries.length === 0 && (
              <p className={styles.emptyText}>No work experience data was found. You can add entries manually.</p>
            )}
            {entries.map((entry, i) => (
              <div key={i} className={styles.entryCard}>
                <div className={styles.entryHeader}>
                  <span className={styles.entryLabel}>Position {i + 1}</span>
                  <button className={styles.removeBtn} onClick={() => removeArrayEntry<WorkEntry>('workExperience', i)}>Remove</button>
                </div>
                <div className={styles.fieldGrid}>
                  {renderInput('Company', entry.company, v => updateArrayEntry<WorkEntry>('workExperience', i, { company: v } as Partial<WorkEntry>), `workExperience[${i}].company`)}
                  {renderInput('Title', entry.title, v => updateArrayEntry<WorkEntry>('workExperience', i, { title: v } as Partial<WorkEntry>), `workExperience[${i}].title`)}
                  {renderInput('Start Date', entry.startDate, v => updateArrayEntry<WorkEntry>('workExperience', i, { startDate: v } as Partial<WorkEntry>), `workExperience[${i}].startDate`)}
                  {renderInput('End Date', entry.endDate, v => updateArrayEntry<WorkEntry>('workExperience', i, { endDate: v } as Partial<WorkEntry>), `workExperience[${i}].endDate`)}
                  {renderInput('Location', entry.location, v => updateArrayEntry<WorkEntry>('workExperience', i, { location: v } as Partial<WorkEntry>), `workExperience[${i}].location`)}
                </div>
                <div className={styles.subsectionLabel}>Bullet Points</div>
                {entry.bullets.map((b, bi) => (
                  <div key={bi} className={styles.inlineRow}>
                    <input className={styles.input} value={b} onChange={e => updateNestedArray('workExperience', i, 'bullets', bi, e.target.value)} />
                    <button className={styles.removeBtn} onClick={() => removeNestedItem('workExperience', i, 'bullets', bi)} title="Remove">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                ))}
                <button className={styles.addBtn} onClick={() => addNestedItem('workExperience', i, 'bullets')}>+ Add bullet</button>
              </div>
            ))}
            <button className={styles.addBtn} onClick={() => addArrayEntry<WorkEntry>('workExperience', { company: '', title: '', startDate: '', endDate: '', location: '', bullets: [''] })}>+ Add work entry</button>
          </div>
        )}
      </div>
    );
  }

  function renderEducation() {
    const entries = data.education;
    const isCollapsed = collapsed['education'] ?? (entries.length === 0);
    return (
      <div className={styles.section}>
        {renderSectionHeader('Education', entries.length, 'education')}
        {!isCollapsed && (
          <div className={styles.sectionBody}>
            {entries.length === 0 && (
              <p className={styles.emptyText}>No education data was found. You can add entries manually.</p>
            )}
            {entries.map((entry, i) => (
              <div key={i} className={styles.entryCard}>
                <div className={styles.entryHeader}>
                  <span className={styles.entryLabel}>Education {i + 1}</span>
                  <button className={styles.removeBtn} onClick={() => removeArrayEntry<EducationEntry>('education', i)}>Remove</button>
                </div>
                <div className={styles.fieldGrid}>
                  {renderInput('School', entry.school, v => updateArrayEntry<EducationEntry>('education', i, { school: v } as Partial<EducationEntry>), `education[${i}].school`)}
                  {renderInput('Degree', entry.degree, v => updateArrayEntry<EducationEntry>('education', i, { degree: v } as Partial<EducationEntry>), `education[${i}].degree`)}
                  {renderInput('Start Date', entry.startDate, v => updateArrayEntry<EducationEntry>('education', i, { startDate: v } as Partial<EducationEntry>))}
                  {renderInput('End Date', entry.endDate, v => updateArrayEntry<EducationEntry>('education', i, { endDate: v } as Partial<EducationEntry>))}
                  {renderInput('Location', entry.location, v => updateArrayEntry<EducationEntry>('education', i, { location: v } as Partial<EducationEntry>))}
                  {renderInput('GPA', entry.gpa || '', v => updateArrayEntry<EducationEntry>('education', i, { gpa: v } as Partial<EducationEntry>))}
                </div>
                <div className={styles.subsectionLabel}>Details</div>
                {entry.details.map((d, di) => (
                  <div key={di} className={styles.inlineRow}>
                    <input className={styles.input} value={d} onChange={e => updateNestedArray('education', i, 'details', di, e.target.value)} />
                    <button className={styles.removeBtn} onClick={() => removeNestedItem('education', i, 'details', di)} title="Remove">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                ))}
                <button className={styles.addBtn} onClick={() => addNestedItem('education', i, 'details')}>+ Add detail</button>
              </div>
            ))}
            <button className={styles.addBtn} onClick={() => addArrayEntry<EducationEntry>('education', { school: '', degree: '', startDate: '', endDate: '', location: '', details: [] })}>+ Add education entry</button>
          </div>
        )}
      </div>
    );
  }

  function renderSkills() {
    const entries = data.skills;
    const isCollapsed = collapsed['skills'] ?? (entries.length === 0);
    return (
      <div className={styles.section}>
        {renderSectionHeader('Skills', entries.length, 'skills')}
        {!isCollapsed && (
          <div className={styles.sectionBody}>
            {entries.length === 0 && (
              <p className={styles.emptyText}>No skills data was found. You can add categories manually.</p>
            )}
            {entries.map((entry, i) => (
              <div key={i} className={styles.entryCard}>
                <div className={styles.entryHeader}>
                  <span className={styles.entryLabel}>Category {i + 1}</span>
                  <button className={styles.removeBtn} onClick={() => removeArrayEntry<SkillCategory>('skills', i)}>Remove</button>
                </div>
                {renderInput('Category', entry.category, v => updateArrayEntry<SkillCategory>('skills', i, { category: v } as Partial<SkillCategory>))}
                {renderInput('Skills (comma-separated)', entry.skills.join(', '), v => updateArrayEntry<SkillCategory>('skills', i, { skills: v.split(',').map(s => s.trim()).filter(Boolean) } as Partial<SkillCategory>))}
              </div>
            ))}
            <button className={styles.addBtn} onClick={() => addArrayEntry<SkillCategory>('skills', { category: '', skills: [] })}>+ Add skill category</button>
          </div>
        )}
      </div>
    );
  }

  function renderProjects() {
    const entries = data.projects || [];
    const isCollapsed = collapsed['projects'] ?? (entries.length === 0);
    return (
      <div className={styles.section}>
        {renderSectionHeader('Projects', entries.length, 'projects')}
        {!isCollapsed && (
          <div className={styles.sectionBody}>
            {entries.length === 0 && (
              <p className={styles.emptyText}>No projects found. You can add them manually.</p>
            )}
            {entries.map((entry, i) => (
              <div key={i} className={styles.entryCard}>
                <div className={styles.entryHeader}>
                  <span className={styles.entryLabel}>Project {i + 1}</span>
                  <button className={styles.removeBtn} onClick={() => removeArrayEntry<Project>('projects', i)}>Remove</button>
                </div>
                <div className={styles.fieldGrid}>
                  {renderInput('Name', entry.name, v => updateArrayEntry<Project>('projects', i, { name: v } as Partial<Project>))}
                  {renderInput('Year', entry.year, v => updateArrayEntry<Project>('projects', i, { year: v } as Partial<Project>))}
                  {renderInput('Technologies', entry.technologies || '', v => updateArrayEntry<Project>('projects', i, { technologies: v } as Partial<Project>))}
                </div>
                {renderInput('Description', entry.description, v => updateArrayEntry<Project>('projects', i, { description: v } as Partial<Project>), undefined, true)}
              </div>
            ))}
            <button className={styles.addBtn} onClick={() => addArrayEntry<Project>('projects', { name: '', year: '', description: '', technologies: '' })}>+ Add project</button>
          </div>
        )}
      </div>
    );
  }

  function renderAwards() {
    const entries = data.awards || [];
    const isCollapsed = collapsed['awards'] ?? (entries.length === 0);
    return (
      <div className={styles.section}>
        {renderSectionHeader('Awards', entries.length, 'awards')}
        {!isCollapsed && (
          <div className={styles.sectionBody}>
            {entries.length === 0 && (
              <p className={styles.emptyText}>No awards found. You can add them manually.</p>
            )}
            {entries.map((entry, i) => (
              <div key={i} className={styles.entryCard}>
                <div className={styles.entryHeader}>
                  <span className={styles.entryLabel}>Award {i + 1}</span>
                  <button className={styles.removeBtn} onClick={() => removeArrayEntry<Award>('awards', i)}>Remove</button>
                </div>
                <div className={styles.fieldGrid}>
                  {renderInput('Year', entry.year, v => updateArrayEntry<Award>('awards', i, { year: v } as Partial<Award>))}
                  {renderInput('Title', entry.title, v => updateArrayEntry<Award>('awards', i, { title: v } as Partial<Award>))}
                </div>
                {renderInput('Description', entry.description || '', v => updateArrayEntry<Award>('awards', i, { description: v } as Partial<Award>))}
              </div>
            ))}
            <button className={styles.addBtn} onClick={() => addArrayEntry<Award>('awards', { year: '', title: '', description: '' })}>+ Add award</button>
          </div>
        )}
      </div>
    );
  }

  // --- Confidence indicator ---

  const confidenceDot =
    confidence.overall === 'high'
      ? styles.dotGreen
      : confidence.overall === 'medium'
        ? styles.dotAmber
        : styles.dotRed;

  const confidenceText =
    confidence.overall === 'high'
      ? 'High confidence'
      : confidence.overall === 'medium'
        ? 'Some fields may need review'
        : 'Many fields need review';

  // --- Render ---

  return (
    <div className={styles.container}>
      <div className={styles.background} />
      <div className={styles.content}>
        <button className={styles.backBtn} onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </button>

        <h1 className={styles.title}>Review your imported CV</h1>

        {/* Summary bar */}
        <div className={styles.summaryBar}>
          <span className={styles.sourceBadge}>Imported from {sourceLabel(source)}</span>
          <span className={styles.summaryText}>
            {pluralize(summary.workEntries, 'work entry')}, {pluralize(summary.educationEntries, 'education entry')}, {pluralize(summary.skillCategories, 'skill category')}
            {summary.projects > 0 && `, ${pluralize(summary.projects, 'project')}`}
            {summary.awards > 0 && `, ${pluralize(summary.awards, 'award')}`}
          </span>
          <span className={styles.confidenceBadge}>
            <span className={`${styles.dot} ${confidenceDot}`} />
            {confidenceText}
          </span>
        </div>

        {/* Warnings */}
        {warnings && warnings.length > 0 && (
          <div className={styles.warningBanner}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <ul className={styles.warningList}>
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Sections */}
        {renderPersonalInfo()}
        {renderWorkExperience()}
        {renderEducation()}
        {renderSkills()}
        {renderProjects()}
        {renderAwards()}

        {/* Confirm button */}
        <button
          className={styles.confirmBtn}
          onClick={() => onConfirm(data)}
          disabled={!hasData}
        >
          Confirm & Continue
        </button>
      </div>
    </div>
  );
}
