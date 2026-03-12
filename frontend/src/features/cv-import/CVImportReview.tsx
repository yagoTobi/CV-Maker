import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import type {
  CVFormData,
  PersonalInfo,
  WorkEntry,
  EducationEntry,
  SkillCategory,
  Project,
  Award,
  AdditionalEntry,
} from '../../types';
import styles from './CVImportReview.module.css';

// Grip icon for drag handles
function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className={styles.gripIcon}>
      <circle cx="9" cy="5" r="1.5"/>
      <circle cx="9" cy="12" r="1.5"/>
      <circle cx="9" cy="19" r="1.5"/>
      <circle cx="15" cy="5" r="1.5"/>
      <circle cx="15" cy="12" r="1.5"/>
      <circle cx="15" cy="19" r="1.5"/>
    </svg>
  );
}

// Drag-and-drop hook for bullets
function useDrag(onReorder: (from: number, to: number) => void) {
  const dragFromRef = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const onHandleMouseDown = (e: React.MouseEvent) => {
    const card = (e.currentTarget as HTMLElement).closest('[data-drag-bullet]') as HTMLElement | null;
    if (card) card.draggable = true;
  };

  const onDragStart = (i: number) => { dragFromRef.current = i; };
  const onDragEnter = (i: number) => { if (dragFromRef.current !== null && dragFromRef.current !== i) setDragOver(i); };
  const onDragOver  = (e: React.DragEvent) => e.preventDefault();
  const onDrop      = (i: number) => {
    if (dragFromRef.current !== null && dragFromRef.current !== i) onReorder(dragFromRef.current, i);
    dragFromRef.current = null;
    setDragOver(null);
  };
  const onDragEnd   = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).draggable = false;
    dragFromRef.current = null;
    setDragOver(null);
  };

  return { dragOver, onHandleMouseDown, onDragStart, onDragEnter, onDragOver, onDrop, onDragEnd };
}

// BulletList component to avoid calling useDrag inside map loops
interface BulletListProps {
  bullets: string[];
  onReorder: (from: number, to: number) => void;
  onUpdate: (idx: number, val: string) => void;
  onRemove: (idx: number) => void;
  useTextarea?: boolean;
  placeholder?: string;
}

function BulletList({ bullets, onReorder, onUpdate, onRemove, useTextarea = false, placeholder = "Achievement or responsibility..." }: BulletListProps) {
  const bulletDrag = useDrag(onReorder);

  return (
    <>
      {bullets.map((bullet, bi) => (
        <div
          key={bi}
          className={`${styles.inlineRow} ${bulletDrag.dragOver === bi ? styles.inlineRowDragOver : ''}`}
          data-drag-bullet
          onDragStart={() => bulletDrag.onDragStart(bi)}
          onDragEnter={() => bulletDrag.onDragEnter(bi)}
          onDragOver={bulletDrag.onDragOver}
          onDrop={() => bulletDrag.onDrop(bi)}
          onDragEnd={bulletDrag.onDragEnd}
        >
          <span
            className={styles.bulletDragHandle}
            onMouseDown={bulletDrag.onHandleMouseDown}
            aria-label="Drag to reorder"
          >
            <GripIcon />
          </span>
          {useTextarea ? (
            <textarea
              className={`${styles.input} ${styles.bulletTextarea}`}
              value={bullet}
              onChange={e => onUpdate(bi, e.target.value)}
              placeholder={placeholder}
              rows={2}
            />
          ) : (
            <input
              className={styles.input}
              value={bullet}
              onChange={e => onUpdate(bi, e.target.value)}
              placeholder={placeholder}
            />
          )}
          {bullets.length > 1 && (
            <button className={styles.removeBtn} onClick={() => onRemove(bi)} title="Remove">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </>
  );
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

// Date validation: "MMM YYYY" or "Present"
function isValidDate(date: string): boolean {
  if (!date || date.trim() === '') return true; // Empty is fine
  const trimmed = date.trim();
  if (trimmed.toLowerCase() === 'present') return true;
  // MMM YYYY pattern: e.g., "Jan 2021", "Dec 2023"
  const monthYearPattern = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}$/;
  return monthYearPattern.test(trimmed);
}

// Email validation
function isValidEmail(email: string): boolean {
  if (!email || email.trim() === '') return true; // Empty is fine
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email.trim());
}

// Check if dates are chronologically ordered
function areDatesOrdered(startDate: string, endDate: string): boolean {
  if (!startDate || !endDate || endDate.toLowerCase().includes('present')) return true;
  // Simple check: if both are valid "MMM YYYY", parse and compare
  const parseMonthYear = (d: string) => {
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const parts = d.trim().split(/\s+/);
    if (parts.length !== 2) return null;
    const month = months[parts[0].toLowerCase()];
    const year = parseInt(parts[1], 10);
    if (month === undefined || isNaN(year)) return null;
    return new Date(year, month);
  };
  const start = parseMonthYear(startDate);
  const end = parseMonthYear(endDate);
  if (!start || !end) return true; // Can't compare invalid formats
  return start <= end;
}

function getConfidenceTooltip(level: 'high' | 'medium' | 'low'): string {
  if (level === 'low') return 'This field was unclear in the source document — please verify';
  if (level === 'medium') return 'We had to infer this value — please review';
  return '';
}

// --- Component ---

export default function CVImportReview() {
  const navigate = useNavigate();
  const { cvImport, setFormData } = useAppContext();

  // Redirect if no import data
  if (!cvImport.importResult?.formData) {
    navigate('/build/start');
    return null;
  }

  const initialData = cvImport.importResult.formData;
  const confidence = cvImport.importResult.confidence || { overall: 'medium', fields: {} };
  const summary = cvImport.importResult.summary || { workEntries: 0, educationEntries: 0, skillCategories: 0, projects: 0, awards: 0 };
  const warnings = cvImport.importResult.warnings;
  const source = cvImport.importResult.source;
  const [data, setData] = useState<CVFormData>(() => structuredClone(initialData));
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

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
        [key]: (prev[key] as (WorkEntry | EducationEntry)[]).map((e, i) => {
          if (i !== entryIdx) return e;
          const arr = e[arrayKey as keyof typeof e];
          if (!Array.isArray(arr)) return e;
          return { ...e, [arrayKey]: arr.map((b: string, bi: number) => (bi === bulletIdx ? val : b)) };
        }),
      }));
    },
    [],
  );

  const addNestedItem = useCallback(
    (key: 'workExperience' | 'education', entryIdx: number, arrayKey: string) => {
      setData(prev => ({
        ...prev,
        [key]: (prev[key] as (WorkEntry | EducationEntry)[]).map((e, i) => {
          if (i !== entryIdx) return e;
          const arr = e[arrayKey as keyof typeof e];
          if (!Array.isArray(arr)) return e;
          return { ...e, [arrayKey]: [...arr, ''] };
        }),
      }));
    },
    [],
  );

  const removeNestedItem = useCallback(
    (key: 'workExperience' | 'education', entryIdx: number, arrayKey: string, bulletIdx: number) => {
      setData(prev => ({
        ...prev,
        [key]: (prev[key] as (WorkEntry | EducationEntry)[]).map((e, i) => {
          if (i !== entryIdx) return e;
          const arr = e[arrayKey as keyof typeof e];
          if (!Array.isArray(arr)) return e;
          return { ...e, [arrayKey]: arr.filter((_: unknown, bi: number) => bi !== bulletIdx) };
        }),
      }));
    },
    [],
  );

  const reorderNestedItems = useCallback(
    (key: 'workExperience' | 'education', entryIdx: number, arrayKey: string, from: number, to: number) => {
      setData(prev => ({
        ...prev,
        [key]: (prev[key] as (WorkEntry | EducationEntry)[]).map((e, i) => {
          if (i !== entryIdx) return e;
          const arr = e[arrayKey as keyof typeof e];
          if (!Array.isArray(arr)) return e;
          const newArr = [...arr];
          const [item] = newArr.splice(from, 1);
          newArr.splice(to, 0, item);
          return { ...e, [arrayKey]: newArr };
        }),
      }));
    },
    [],
  );

  // Additional section helpers
  const updateAdditionalSectionTitle = useCallback((sectionIdx: number, title: string) => {
    setData(prev => ({
      ...prev,
      additionalSections: (prev.additionalSections || []).map((s, i) => (i === sectionIdx ? { ...s, title } : s)),
    }));
  }, []);

  const addAdditionalSection = useCallback(() => {
    setData(prev => ({
      ...prev,
      additionalSections: [...(prev.additionalSections || []), { title: 'New Section', entries: [] }],
    }));
  }, []);

  const removeAdditionalSection = useCallback((sectionIdx: number) => {
    setData(prev => ({
      ...prev,
      additionalSections: (prev.additionalSections || []).filter((_, i) => i !== sectionIdx),
    }));
  }, []);

  const updateAdditionalEntry = useCallback((sectionIdx: number, entryIdx: number, updates: Partial<AdditionalEntry>) => {
    setData(prev => ({
      ...prev,
      additionalSections: (prev.additionalSections || []).map((s, si) =>
        si === sectionIdx
          ? { ...s, entries: s.entries.map((e, ei) => (ei === entryIdx ? { ...e, ...updates } : e)) }
          : s,
      ),
    }));
  }, []);

  const addAdditionalEntry = useCallback((sectionIdx: number) => {
    setData(prev => ({
      ...prev,
      additionalSections: (prev.additionalSections || []).map((s, si) =>
        si === sectionIdx
          ? { ...s, entries: [...s.entries, { title: '', bullets: [''] }] }
          : s,
      ),
    }));
  }, []);

  const removeAdditionalEntry = useCallback((sectionIdx: number, entryIdx: number) => {
    setData(prev => ({
      ...prev,
      additionalSections: (prev.additionalSections || []).map((s, si) =>
        si === sectionIdx ? { ...s, entries: s.entries.filter((_, ei) => ei !== entryIdx) } : s,
      ),
    }));
  }, []);

  const updateAdditionalEntryBullet = useCallback((sectionIdx: number, entryIdx: number, bulletIdx: number, val: string) => {
    setData(prev => ({
      ...prev,
      additionalSections: (prev.additionalSections || []).map((s, si) =>
        si === sectionIdx
          ? {
              ...s,
              entries: s.entries.map((e, ei) =>
                ei === entryIdx ? { ...e, bullets: e.bullets.map((b, bi) => (bi === bulletIdx ? val : b)) } : e,
              ),
            }
          : s,
      ),
    }));
  }, []);

  const addAdditionalEntryBullet = useCallback((sectionIdx: number, entryIdx: number) => {
    setData(prev => ({
      ...prev,
      additionalSections: (prev.additionalSections || []).map((s, si) =>
        si === sectionIdx
          ? { ...s, entries: s.entries.map((e, ei) => (ei === entryIdx ? { ...e, bullets: [...e.bullets, ''] } : e)) }
          : s,
      ),
    }));
  }, []);

  const removeAdditionalEntryBullet = useCallback((sectionIdx: number, entryIdx: number, bulletIdx: number) => {
    setData(prev => ({
      ...prev,
      additionalSections: (prev.additionalSections || []).map((s, si) =>
        si === sectionIdx
          ? {
              ...s,
              entries: s.entries.map((e, ei) =>
                ei === entryIdx ? { ...e, bullets: e.bullets.filter((_, bi) => bi !== bulletIdx) } : e,
              ),
            }
          : s,
      ),
    }));
  }, []);

  const reorderAdditionalEntryBullets = useCallback((sectionIdx: number, entryIdx: number, from: number, to: number) => {
    setData(prev => ({
      ...prev,
      additionalSections: (prev.additionalSections || []).map((s, si) => {
        if (si !== sectionIdx) return s;
        return {
          ...s,
          entries: s.entries.map((e, ei) => {
            if (ei !== entryIdx) return e;
            const bullets = [...e.bullets];
            const [item] = bullets.splice(from, 1);
            bullets.splice(to, 0, item);
            return { ...e, bullets };
          }),
        };
      }),
    }));
  }, []);

  const hasData =
    data.personalInfo.fullName ||
    data.workExperience.length > 0 ||
    data.education.length > 0 ||
    data.skills.length > 0;

  // --- Validation effect ---
  useEffect(() => {
    const warns: string[] = [];

    // Check email format
    if (data.personalInfo.email && !isValidEmail(data.personalInfo.email)) {
      warns.push('Email address format appears invalid');
    }

    // Check name is present
    if (!data.personalInfo.fullName || data.personalInfo.fullName.trim() === '') {
      warns.push('Name is missing — this is a required field');
    }

    // Check work experience dates
    data.workExperience.forEach((entry, idx) => {
      if (entry.startDate && !isValidDate(entry.startDate)) {
        warns.push(`Work entry ${idx + 1}: Start date format should be "MMM YYYY" or "Present"`);
      }
      if (entry.endDate && !isValidDate(entry.endDate)) {
        warns.push(`Work entry ${idx + 1}: End date format should be "MMM YYYY" or "Present"`);
      }
      if (entry.startDate && entry.endDate && !areDatesOrdered(entry.startDate, entry.endDate)) {
        warns.push(`Work entry ${idx + 1}: End date is before start date`);
      }
    });

    // Check education dates
    data.education.forEach((entry, idx) => {
      if (entry.startDate && !isValidDate(entry.startDate)) {
        warns.push(`Education entry ${idx + 1}: Start date format should be "MMM YYYY" or "Present"`);
      }
      if (entry.endDate && !isValidDate(entry.endDate)) {
        warns.push(`Education entry ${idx + 1}: End date format should be "MMM YYYY" or "Present"`);
      }
      if (entry.startDate && entry.endDate && !areDatesOrdered(entry.startDate, entry.endDate)) {
        warns.push(`Education entry ${idx + 1}: End date is before start date`);
      }
    });

    // Check if too little data was extracted
    const totalEntries = data.workExperience.length + data.education.length + data.skills.length;
    if (totalEntries < 2 && source !== 'json') {
      warns.push('Very little data was extracted — please review all fields carefully');
    }

    setValidationWarnings(warns);
  }, [data, source]);

  // --- Section renderers ---

  function renderInput(
    label: string,
    value: string,
    onChange: (v: string) => void,
    fieldPath?: string,
    multiline?: boolean,
    validationType?: 'date' | 'email',
  ) {
    const conf = fieldPath ? getFieldConfidence(confidence.fields, fieldPath) : 'high';
    const wrapClass = `${styles.fieldWrap} ${confidenceClass(conf)}`;
    const tooltip = getConfidenceTooltip(conf);

    // Validation check
    let isInvalid = false;
    let validationMsg = '';
    if (validationType === 'date' && value && !isValidDate(value)) {
      isInvalid = true;
      validationMsg = 'Format: MMM YYYY (e.g., Jan 2021) or Present';
    } else if (validationType === 'email' && value && !isValidEmail(value)) {
      isInvalid = true;
      validationMsg = 'Email format appears invalid';
    }

    return (
      <div className={wrapClass}>
        <label className={styles.label}>
          {label}
          {(conf === 'low' || conf === 'medium') && (
            <span className={styles.needsReview} title={tooltip}>
              <svg className={styles.infoIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              {conf === 'low' ? 'Needs review' : 'Please review'}
            </span>
          )}
          {isInvalid && (
            <span className={styles.validationWarning} title={validationMsg}>
              <svg className={styles.warningIcon} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
          )}
        </label>
        {multiline ? (
          <textarea className={styles.textarea} value={value} onChange={e => onChange(e.target.value)} rows={3} />
        ) : (
          <input className={`${styles.input} ${isInvalid ? styles.inputInvalid : ''}`} type="text" value={value} onChange={e => onChange(e.target.value)} />
        )}
        {isInvalid && <p className={styles.helperText}>{validationMsg}</p>}
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
              {renderInput('Email', data.personalInfo.email, v => updatePersonal({ email: v }), 'personalInfo.email', false, 'email')}
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
                  {renderInput('Start Date', entry.startDate, v => updateArrayEntry<WorkEntry>('workExperience', i, { startDate: v } as Partial<WorkEntry>), `workExperience[${i}].startDate`, false, 'date')}
                  {renderInput('End Date', entry.endDate, v => updateArrayEntry<WorkEntry>('workExperience', i, { endDate: v } as Partial<WorkEntry>), `workExperience[${i}].endDate`, false, 'date')}
                  {renderInput('Location', entry.location, v => updateArrayEntry<WorkEntry>('workExperience', i, { location: v } as Partial<WorkEntry>), `workExperience[${i}].location`)}
                </div>
                <div className={styles.subsectionLabel}>Bullet Points</div>
                <BulletList
                  bullets={entry.bullets}
                  onReorder={(from, to) => reorderNestedItems('workExperience', i, 'bullets', from, to)}
                  onUpdate={(bi, val) => updateNestedArray('workExperience', i, 'bullets', bi, val)}
                  onRemove={(bi) => removeNestedItem('workExperience', i, 'bullets', bi)}
                />
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
                  {renderInput('Start Date', entry.startDate, v => updateArrayEntry<EducationEntry>('education', i, { startDate: v } as Partial<EducationEntry>), undefined, false, 'date')}
                  {renderInput('End Date', entry.endDate, v => updateArrayEntry<EducationEntry>('education', i, { endDate: v } as Partial<EducationEntry>), undefined, false, 'date')}
                  {renderInput('Location', entry.location, v => updateArrayEntry<EducationEntry>('education', i, { location: v } as Partial<EducationEntry>))}
                  {renderInput('GPA', entry.gpa || '', v => updateArrayEntry<EducationEntry>('education', i, { gpa: v } as Partial<EducationEntry>))}
                </div>
                <div className={styles.subsectionLabel}>Details</div>
                <BulletList
                  bullets={entry.details}
                  onReorder={(from, to) => reorderNestedItems('education', i, 'details', from, to)}
                  onUpdate={(di, val) => updateNestedArray('education', i, 'details', di, val)}
                  onRemove={(di) => removeNestedItem('education', i, 'details', di)}
                />
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

  function renderAdditionalSections() {
    const sections = data.additionalSections || [];
    if (sections.length === 0) return null;

    return sections.map((section, si) => {
      const sectionKey = `additional-${si}`;
      const isCollapsed = collapsed[sectionKey] ?? (section.entries.length === 0);
      const totalEntries = section.entries.length;

      return (
        <div key={si} className={`${styles.section} ${styles.additionalSection}`}>
          <div className={styles.additionalSectionHeaderWrap}>
            <button className={styles.sectionHeader} onClick={() => toggle(sectionKey)}>
              <svg
                className={`${styles.chevron} ${isCollapsed ? '' : styles.chevronOpen}`}
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
              <input
                className={`${styles.input} ${styles.additionalSectionTitleInput}`}
                value={section.title}
                onChange={e => {
                  e.stopPropagation();
                  updateAdditionalSectionTitle(si, e.target.value);
                }}
                onClick={e => e.stopPropagation()}
                placeholder="Section Title"
              />
              <span className={styles.customBadge}>Custom</span>
              <span className={styles.sectionCount}>{totalEntries}</span>
            </button>
            <button
              className={styles.removeSectionBtn}
              onClick={() => removeAdditionalSection(si)}
              title="Remove this section"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {!isCollapsed && (
            <div className={styles.sectionBody}>
              {section.entries.length === 0 && (
                <p className={styles.emptyText}>No entries in this section yet. Click "Add Entry" to get started.</p>
              )}
              {section.entries.map((entry, ei) => (
                <div key={ei} className={styles.entryCard}>
                  <div className={styles.entryHeader}>
                    <span className={styles.entryLabel}>{entry.title || `Entry ${ei + 1}`}</span>
                    <button className={styles.removeBtn} onClick={() => removeAdditionalEntry(si, ei)}>Remove</button>
                  </div>

                  <div className={styles.fieldGrid}>
                    {renderInput('Title', entry.title, v => updateAdditionalEntry(si, ei, { title: v }), `additionalSections[${si}].entries[${ei}].title`)}
                    {renderInput('Subtitle', entry.subtitle || '', v => updateAdditionalEntry(si, ei, { subtitle: v }), `additionalSections[${si}].entries[${ei}].subtitle`)}
                    {renderInput('Start Date', entry.startDate || '', v => updateAdditionalEntry(si, ei, { startDate: v }), undefined, false, 'date')}
                    {renderInput('End Date', entry.endDate || '', v => updateAdditionalEntry(si, ei, { endDate: v }), undefined, false, 'date')}
                    {renderInput('Location', entry.location || '', v => updateAdditionalEntry(si, ei, { location: v }))}
                  </div>

                  {renderInput('Description', entry.description || '', v => updateAdditionalEntry(si, ei, { description: v }), undefined, true)}

                  <div className={styles.subsectionLabel}>Bullet Points</div>
                  <BulletList
                    bullets={entry.bullets}
                    onReorder={(from, to) => reorderAdditionalEntryBullets(si, ei, from, to)}
                    onUpdate={(bi, val) => updateAdditionalEntryBullet(si, ei, bi, val)}
                    onRemove={(bi) => removeAdditionalEntryBullet(si, ei, bi)}
                    useTextarea={true}
                    placeholder="Describe an achievement or detail..."
                  />
                  <button className={styles.addBtn} onClick={() => addAdditionalEntryBullet(si, ei)}>+ Add bullet</button>
                </div>
              ))}
              <button className={styles.addBtn} onClick={() => addAdditionalEntry(si)}>+ Add entry</button>
            </div>
          )}
        </div>
      );
    });
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
        <button className={styles.backBtn} onClick={() => navigate('/build/start')}>
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
            {(data.additionalSections?.length || 0) > 0 && `, ${pluralize(data.additionalSections!.length, 'custom section')}`}
          </span>
          <span className={styles.confidenceBadge}>
            <span className={`${styles.dot} ${confidenceDot}`} />
            {confidenceText}
          </span>
        </div>

        {/* Warnings */}
        {(warnings && warnings.length > 0 || validationWarnings.length > 0) && (
          <div className={styles.warningBanner}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <ul className={styles.warningList}>
              {warnings?.map((w, i) => (
                <li key={`backend-${i}`}>{w}</li>
              ))}
              {validationWarnings.map((w, i) => (
                <li key={`validation-${i}`}>{w}</li>
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
        {renderAdditionalSections()}

        {/* Add Section button */}
        <button className={styles.addSectionBtn} onClick={addAdditionalSection}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Custom Section
        </button>

        {/* Confirm button */}
        <button
          className={styles.confirmBtn}
          onClick={() => {
            setFormData(data);
            navigate('/build');
          }}
          disabled={!hasData}
        >
          Confirm & Continue
        </button>
      </div>
    </div>
  );
}
