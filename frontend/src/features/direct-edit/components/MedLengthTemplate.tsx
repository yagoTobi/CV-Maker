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
import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { EditableField } from './editor-primitives/EditableField';
import { PageBreakIndicator } from './PageBreakIndicator';
import { LinkHeaderItem } from './LinkHeaderItem';
import { AddLinkDropdown } from './AddLinkDropdown';
import type { LinkPreset } from './AddLinkDropdown';
import { DropLine } from './editor-primitives/DropLine';
import { FloatingFormatToolbar } from './editor-primitives/FloatingFormatToolbar';
import { useSectionDrag } from '../hooks/useSectionDrag';
import { WorkSection } from './sections/WorkSection';
import { EducationSection } from './sections/EducationSection';
import { SkillsSection } from './sections/SkillsSection';
import { ProjectsSection } from './sections/ProjectsSection';
import { AwardsSection } from './sections/AwardsSection';
import { AdditionalSection } from './sections/AdditionalSection';
import type { CVFormData, SkillItem } from '../../../types';
import { DEFAULT_PERSONAL_ORDER } from '../../../utils/entryFactories';
import styles from './MedLengthTemplate.module.css';

const DEFAULT_SECTION_ORDER = ['work', 'education', 'skills', 'projects', 'awards'];

export interface MedLengthTemplateProps {
  formData: CVFormData;
  readOnly?: boolean;
  onFieldChange: (path: string, value: string | SkillItem[]) => void;
  onBulletAdd: (basePath: string, afterIndex: number) => string | void;
  onBulletRemove: (basePath: string, index: number) => void;
  onAddEntry: (sectionKey: string) => void;
  onRemoveEntry: (sectionKey: string, index: number) => void;
  onToggleSection: (sectionKey: string) => void;
  hiddenSections: Set<string>;
  onReorderSections: (from: number, to: number) => void;
  onReorderEntries: (sectionKey: string, from: number, to: number) => void;
  onInput?: () => void;
  onRemoveSection?: (sectionKey: string) => void;
  onAddLink?: (label?: string, url?: string, side?: 'left' | 'right') => void;
  onRemoveLink?: (idx: number) => void;
  /**
   * Y offsets (px, from the sheet top) at which to draw page-break lines.
   * Empty/omitted = no lines (single page, or read-only preview).
   */
  pageBreakOffsets?: number[];
}

export const MedLengthTemplate = forwardRef<HTMLDivElement, MedLengthTemplateProps>(function MedLengthTemplate({
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
  onAddLink,
  onRemoveLink,
  pageBreakOffsets,
}: MedLengthTemplateProps, ref) {
  const [dropdownSide, setDropdownSide] = useState<'left' | 'right' | null>(null);
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

  const handleAddLinkSelect = useCallback((preset: LinkPreset, side: 'left' | 'right') => {
    onAddLink?.(preset.label, preset.url, side);
    setDropdownSide(null);
  }, [onAddLink]);

  const addLinkBtn = (side: 'left' | 'right') => !readOnly && onAddLink ? (
    <span key={`add-link-${side}`} style={{ position: 'relative', display: 'inline-flex', alignItems: 'baseline' }}>
      <button
        className={styles.addLinkBtn}
        onClick={() => setDropdownSide(prev => prev === side ? null : side)}
        type="button"
        title="Add link"
      >
        +
      </button>
      {dropdownSide === side && (
        <AddLinkDropdown
          onSelect={(preset) => handleAddLinkSelect(preset, side)}
          onClose={() => setDropdownSide(null)}
        />
      )}
    </span>
  ) : null;

  const infoBarItems = useMemo(() => {
    const leftLinks = personalInfo.links.filter(l => l.side === 'left');
    const rightLinks = personalInfo.links.filter(l => l.side !== 'left');

    const renderLinkGroup = (links: typeof personalInfo.links) => {
      const group: React.ReactNode[] = [];
      links.forEach((link, i) => {
        const linkIdx = personalInfo.links.indexOf(link);
        if (i > 0) {
          group.push(
            <span key={`link-sep-${link.id}`} className={styles.infoSeparator}>|</span>
          );
        }
        group.push(
          <LinkHeaderItem
            key={`link-${link.id}`}
            linkId={link.id}
            label={link.label}
            url={link.url}
            linkIdx={linkIdx}
            onFieldChange={onFieldChange}
            onRemoveLink={onRemoveLink ?? (() => {})}
            className={styles.linkText}
            onInput={onInput}
            readOnly={readOnly}
          />
        );
      });
      return group;
    };

    // Build groups: left-links, then personalOrder fields (excluding 'links'), then right-links
    const fieldItems: React.ReactNode[][] = [];

    if (leftLinks.length > 0) fieldItems.push(renderLinkGroup(leftLinks));

    personalOrder.forEach((field) => {
      const group: React.ReactNode[] = [];
      if (field === 'phone') {
        group.push(
          <EditableField
            key="phone"
            value={personalInfo.phone}
            fieldPath="personalInfo.phone"
            onFieldChange={onFieldChange}
            placeholder="+1 (555) 123-4567"
            onInput={onInput}
            readOnly={readOnly}
            className={personalInfo.phone ? styles.linkText : undefined}
          />
        );
      } else if (field === 'email') {
        group.push(
          <EditableField
            key="email"
            value={personalInfo.email}
            fieldPath="personalInfo.email"
            onFieldChange={onFieldChange}
            placeholder="email@example.com"
            onInput={onInput}
            readOnly={readOnly}
            className={personalInfo.email ? styles.linkText : undefined}
          />
        );
      } else if (field === 'location') {
        group.push(
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
        // Handled separately via leftLinks/rightLinks — skip
        return;
      }
      if (group.length > 0) fieldItems.push(group);
    });

    if (rightLinks.length > 0) fieldItems.push(renderLinkGroup(rightLinks));

    // Interleave separators only between non-empty groups
    const items: React.ReactNode[] = [];
    fieldItems.forEach((group, groupIdx) => {
      items.push(...group);
      if (groupIdx < fieldItems.length - 1) {
        items.push(
          <span key={`sep-${groupIdx}`} className={styles.infoSeparator}>|</span>
        );
      }
    });

    return items;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalOrder, personalInfo.phone, personalInfo.email, personalInfo.location, personalInfo.links, onFieldChange, onInput, readOnly, onRemoveLink]);

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
    <div ref={ref} className={styles.template} onDragOver={readOnly ? undefined : handleContainerDragOver}>
      {pageBreakOffsets?.map((offsetY, i) => (
        <PageBreakIndicator key={`page-break-${i}`} offsetY={offsetY} label={`Page ${i + 2}`} />
      ))}
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
        {addLinkBtn('left')}
        {infoBarItems}
        {addLinkBtn('right')}
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
});
