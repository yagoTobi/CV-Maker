/**
 * MedLengthTemplate -- Web rendering of the med-length-proff-cv template.
 *
 * Renders the entire CV document with EditableField elements for every text field
 * and EditableBulletList for bullet arrays. CSS matches resume.cls + med-length-proff-cv.tex.j2
 * at ~95% visual fidelity (EDIT-02).
 *
 * Section order follows formData.sectionOrder (or DEFAULT_SECTION_ORDER fallback).
 * Each section is wrapped in SectionWrapper (hover-reveal add button + toggle + drag grip).
 * Each entry is wrapped in EntryWrapper (hover-reveal delete + optional confirm + drag grip).
 *
 * A "+ Add section" button is rendered below the section list (non-readOnly only) and
 * calls onAddEntry('additional-new') to create a new custom section.
 *
 * Standard section headings (work/education/skills/projects/awards) are editable inline
 * via sectionLabels in formData; changes persist through onFieldChange.
 */
import React, { useCallback, useMemo } from 'react';
import { EditableField } from './EditableField';
import { DropLine } from './DropLine';
import { FloatingFormatToolbar } from './FloatingFormatToolbar';
import { useSectionDrag } from '../hooks/useSectionDrag';
import { WorkSection } from './sections/WorkSection';
import { EducationSection } from './sections/EducationSection';
import { SkillsSection } from './sections/SkillsSection';
import { ProjectsSection } from './sections/ProjectsSection';
import { AwardsSection } from './sections/AwardsSection';
import { AdditionalSection } from './sections/AdditionalSection';
import type { CVFormData, SkillItem } from '../../../types';
import styles from './MedLengthTemplate.module.css';

const DEFAULT_SECTION_ORDER = ['work', 'education', 'skills', 'projects', 'awards'];
const DEFAULT_PERSONAL_ORDER = ['phone', 'email', 'location', 'links'];

/** Default display labels for built-in sections (match the LaTeX template). */
export const DEFAULT_SECTION_LABELS: Record<string, string> = {
  work: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  awards: 'Awards',
};

export interface MedLengthTemplateProps {
  formData: CVFormData;
  readOnly?: boolean;
  onFieldChange: (path: string, value: string | SkillItem[]) => void;
  onBulletAdd: (basePath: string, afterIndex: number) => void;
  onBulletRemove: (basePath: string, index: number) => void;
  onAddEntry: (sectionKey: string) => void;
  onRemoveEntry: (sectionKey: string, index: number) => void;
  onToggleSection: (sectionKey: string) => void;
  hiddenSections: Set<string>;
  onReorderSections: (from: number, to: number) => void;
  onReorderEntries: (sectionKey: string, from: number, to: number) => void;
  onInput?: () => void;
  onRemoveSection?: (sectionKey: string) => void;
}

export function MedLengthTemplate({
  formData,
  readOnly,
  onFieldChange,
  onBulletAdd,
  onBulletRemove,
  onAddEntry,
  onRemoveEntry,
  onToggleSection,
  hiddenSections,
  onReorderSections,
  onReorderEntries,
  onInput,
  onRemoveSection,
}: MedLengthTemplateProps) {
  const { personalInfo } = formData;
  const sectionOrder = formData.sectionOrder ?? DEFAULT_SECTION_ORDER;
  const sectionLabels = formData.sectionLabels ?? {};
  const sectionDrag = useSectionDrag(onReorderSections);
  const personalOrder = personalInfo.personalOrder ?? DEFAULT_PERSONAL_ORDER;

  const sharedProps = useMemo(() => ({
    readOnly,
    onFieldChange,
    onBulletAdd,
    onBulletRemove,
    onAddEntry,
    onRemoveEntry,
    onToggleSection,
    hiddenSections,
    onReorderEntries,
    onInput,
    onRemoveSection,
    sectionDrag,
  }), [readOnly, onFieldChange, onBulletAdd, onBulletRemove, onAddEntry, onRemoveEntry, onToggleSection, hiddenSections, onReorderEntries, onInput, onRemoveSection, sectionDrag]);

  const infoBarItems = useMemo(() => {
    const items: React.ReactNode[] = [];

    personalOrder.forEach((field, fieldIdx) => {
      if (field === 'phone') {
        items.push(
          <EditableField
            key="phone"
            value={personalInfo.phone}
            fieldPath="personalInfo.phone"
            onFieldChange={onFieldChange}
            placeholder="+1 (555) 123-4567"
            onInput={onInput}
            readOnly={readOnly}
          />
        );
      } else if (field === 'email') {
        items.push(
          <EditableField
            key="email"
            value={personalInfo.email}
            fieldPath="personalInfo.email"
            onFieldChange={onFieldChange}
            placeholder="email@example.com"
            onInput={onInput}
            readOnly={readOnly}
          />
        );
      } else if (field === 'location') {
        items.push(
          <EditableField
            key="location"
            value={personalInfo.location}
            fieldPath="personalInfo.location"
            onFieldChange={onFieldChange}
            placeholder="City, State"
            onInput={onInput}
            readOnly={readOnly}
          />
        );
      } else if (field === 'links') {
        personalInfo.links.forEach((link, linkIdx) => {
          if (linkIdx > 0) {
            items.push(
              <span key={`link-sep-${linkIdx}`} className={styles.infoSeparator}>|</span>
            );
          }
          items.push(
            <EditableField
              key={`link-${link.id}`}
              value={link.label}
              fieldPath={`personalInfo.links[${linkIdx}].label`}
              onFieldChange={onFieldChange}
              placeholder="Link"
              className={styles.linkText}
              onInput={onInput}
              readOnly={readOnly}
            />
          );
        });
      }

      if (fieldIdx < personalOrder.length - 1) {
        items.push(
          <span key={`sep-${fieldIdx}`} className={styles.infoSeparator}>|</span>
        );
      }
    });

    return items;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalOrder, personalInfo.phone, personalInfo.email, personalInfo.location, personalInfo.links, onFieldChange, onInput, readOnly]);

  const renderSection = (sec: string, sectionIdx: number) => {
    const props = { ...sharedProps, sectionIndex: sectionIdx };

    if (sec === 'work') {
      return (
        <WorkSection
          key="work"
          entries={formData.workExperience}
          labelOverride={sectionLabels['work']}
          {...props}
        />
      );
    }
    if (sec === 'education') {
      return (
        <EducationSection
          key="education"
          entries={formData.education}
          labelOverride={sectionLabels['education']}
          {...props}
        />
      );
    }
    if (sec === 'skills') {
      return (
        <SkillsSection
          key="skills"
          categories={formData.skills}
          labelOverride={sectionLabels['skills']}
          {...props}
        />
      );
    }
    if (sec === 'projects') {
      return (
        <ProjectsSection
          key="projects"
          entries={formData.projects ?? []}
          labelOverride={sectionLabels['projects']}
          {...props}
        />
      );
    }
    if (sec === 'awards') {
      return (
        <AwardsSection
          key="awards"
          entries={formData.awards ?? []}
          labelOverride={sectionLabels['awards']}
          {...props}
        />
      );
    }

    if (sec.startsWith('additional-')) {
      const idx = parseInt(sec.split('-')[1], 10);
      const additionalSections = formData.additionalSections ?? [];
      if (idx < additionalSections.length) {
        return (
          <AdditionalSection
            key={sec}
            asec={additionalSections[idx]}
            additionalIdx={idx}
            {...props}
          />
        );
      }
    }
    return null;
  };

  /**
   * Allow drops on the template container itself so that releasing the mouse
   * between sections still fires the drop event (Bug 2 fix).
   */
  const handleContainerDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const { dropIndex, dragFromIndex } = sectionDrag;
  const isDraggingDown = dragFromIndex !== null && dropIndex !== null && dragFromIndex < dropIndex;

  return (
    <div className={styles.template} onDragOver={readOnly ? undefined : handleContainerDragOver}>
      {!readOnly && <FloatingFormatToolbar />}
      <EditableField
        value={personalInfo.fullName}
        fieldPath="personalInfo.fullName"
        onFieldChange={onFieldChange}
        tag="h1"
        className={styles.name}
        placeholder="Your Name"
        onInput={onInput}
        readOnly={readOnly}
      />
      <div className={styles.infoBar}>
        {infoBarItems}
      </div>

      {personalInfo.summary !== undefined && (
        <EditableField
          value={personalInfo.summary ?? ''}
          fieldPath="personalInfo.summary"
          onFieldChange={onFieldChange}
          tag="p"
          className={styles.summary}
          placeholder="Write a brief professional summary..."
          multiline
          onInput={onInput}
          readOnly={readOnly}
        />
      )}

      {sectionOrder.map((sec, sectionIdx) => {
        const isDropTarget = !readOnly && dropIndex === sectionIdx && dragFromIndex !== sectionIdx;
        return (
          <React.Fragment key={sec}>
            {/* Show indicator above this section only when dragging upward to this position */}
            {isDropTarget && !isDraggingDown && <DropLine />}
            {renderSection(sec, sectionIdx)}
            {/* Show indicator below this section when dragging downward to this position */}
            {isDropTarget && isDraggingDown && <DropLine />}
          </React.Fragment>
        );
      })}
      {!readOnly && dropIndex === sectionOrder.length && (
        <DropLine />
      )}
      {!readOnly && (
        <button
          className={styles.addSectionButton}
          onClick={() => onAddEntry('additional-new')}
          type="button"
        >
          + Add section
        </button>
      )}
    </div>
  );
}
