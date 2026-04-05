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
 * Phase 3: SectionWrapper/EntryWrapper integration for CONT-01 through CONT-04.
 * Phase 4: DnD integration -- useSectionDrag for section reorder, EntryDragContainer
 * for per-section entry reorder. DropLine rendered between items during drag.
 */
import React, { useCallback, type ReactNode } from 'react';
import { EditableField } from './EditableField';
import { EditableBulletList } from './EditableBulletList';
import { SectionWrapper } from './SectionWrapper';
import { EntryWrapper } from './EntryWrapper';
import { DropLine } from './DropLine';
import { useSectionDrag } from '../hooks/useSectionDrag';
import { useEntryDrag } from '../hooks/useEntryDrag';
import { generateId } from '../../../utils/idHelpers';
import type {
  CVFormData,
  WorkEntry,
  EducationEntry,
  SkillCategory,
  SkillItem,
  Project,
  Award,
  AdditionalSection,
} from '../../../types';
import styles from './MedLengthTemplate.module.css';

const DEFAULT_SECTION_ORDER = ['work', 'education', 'skills', 'projects', 'awards'];
const DEFAULT_PERSONAL_ORDER = ['phone', 'email', 'location', 'links'];

interface MedLengthTemplateProps {
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
}

/**
 * EntryDragContainer -- Per-section wrapper that calls useEntryDrag so each
 * section gets its own independent entry drag state (D-06 entry isolation).
 */
function EntryDragContainer({
  onReorder,
  children,
}: {
  onReorder: (from: number, to: number) => void;
  children: (entryDrag: ReturnType<typeof useEntryDrag>) => ReactNode;
}) {
  const entryDrag = useEntryDrag(onReorder);
  return <>{children(entryDrag)}</>;
}

/**
 * DropZoneTail -- Invisible drop target after the last entry in a section.
 * Without this, dragging an entry to the bottom has no element to trigger
 * onDragEnter at index === entryCount, so the "drop below last" position
 * was unreachable (Bug 3 fix).
 */
function DropZoneTail({
  entryCount,
  entryDrag,
}: {
  entryCount: number;
  entryDrag: ReturnType<typeof useEntryDrag>;
}) {
  if (!entryDrag.isDragging) return null;
  return (
    <div
      style={{ minHeight: '12px' }}
      onDragEnter={(e) => {
        e.stopPropagation();
        e.preventDefault();
        entryDrag.onDragEnter(e, entryCount);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => entryDrag.onDrop(e, entryCount)}
    />
  );
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
}: MedLengthTemplateProps) {
  const { personalInfo } = formData;
  const sectionOrder = formData.sectionOrder ?? DEFAULT_SECTION_ORDER;
  const sectionDrag = useSectionDrag(onReorderSections);

  /**
   * Handle skills comma-separated text change.
   * Parses comma text into SkillItem[], preserving existing IDs where possible.
   * Mirrors updateSkillsText from useFormBuilder.ts.
   */
  const handleSkillsTextChange = useCallback(
    (skillIndex: number, currentSkills: SkillItem[], _path: string, value: string) => {
      const newTexts = value.split(',').map(s => s.trim()).filter(Boolean);
      const updatedSkills: SkillItem[] = newTexts.map((text, ti) => {
        const existing = currentSkills[ti];
        if (existing && existing.text === text) return existing;
        const matchByText = currentSkills.find(sk => sk.text === text);
        if (matchByText) return matchByText;
        return { id: generateId(), text };
      });
      onFieldChange(`skills[${skillIndex}].skills`, updatedSkills);
    },
    [onFieldChange]
  );

  // --- Personal Info Header (always rendered, not in sectionOrder) ---

  const personalOrder = personalInfo.personalOrder ?? DEFAULT_PERSONAL_ORDER;

  const renderInfoBarItems = () => {
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

      // Add separator between fields (not after the last one)
      if (fieldIdx < personalOrder.length - 1) {
        items.push(
          <span key={`sep-${fieldIdx}`} className={styles.infoSeparator}>|</span>
        );
      }
    });

    return items;
  };

  // --- Section Renderers ---

  const renderDateRange = (
    startDate: string,
    endDate: string,
    startPath: string,
    endPath: string,
    startPlaceholder = 'Start',
    endPlaceholder = 'Present'
  ) => (
    <span className={styles.dateRange}>
      <EditableField
        value={startDate}
        fieldPath={startPath}
        onFieldChange={onFieldChange}
        placeholder={startPlaceholder}
        className={styles.bold}
        onInput={onInput}
        readOnly={readOnly}
      />
      <span className={styles.dateSeparator}>{'\u2013'}</span>
      <EditableField
        value={endDate}
        fieldPath={endPath}
        onFieldChange={onFieldChange}
        placeholder={endPlaceholder}
        className={styles.bold}
        onInput={onInput}
        readOnly={readOnly}
      />
    </span>
  );

  const renderWorkSection = (entries: WorkEntry[], sectionIdx: number) => {
    const renderWorkEntries = (entryDrag?: ReturnType<typeof useEntryDrag>) => (
      <>
        {entries.map((job, i) => (
          <React.Fragment key={job.id}>
            {!readOnly && entryDrag && entryDrag.dropIndex === i && entryDrag.dragFromIndex !== i && <DropLine />}
            <EntryWrapper
              entryIndex={i}
              dragHandlers={entryDrag}
              isDragSource={!readOnly && entryDrag ? entryDrag.dragFromIndex === i : false}
              showGrip={entries.length > 1}
              onDelete={() => onRemoveEntry('work', i)}
              requireConfirm={true}
              confirmMessage={`Delete "${job.company || 'this work entry'}"?`}
              readOnly={readOnly}
            >
              <div className={styles.subsection}>
                <div className={styles.subsectionLine1}>
                  <EditableField
                    value={job.company}
                    fieldPath={`workExperience[${i}].company`}
                    onFieldChange={onFieldChange}
                    placeholder="Company Name"
                    className={styles.bold}
                    onInput={onInput}
                    readOnly={readOnly}
                  />
                  {renderDateRange(
                    job.startDate,
                    job.endDate,
                    `workExperience[${i}].startDate`,
                    `workExperience[${i}].endDate`
                  )}
                </div>
                <div className={styles.subsectionLine2}>
                  <EditableField
                    value={job.title}
                    fieldPath={`workExperience[${i}].title`}
                    onFieldChange={onFieldChange}
                    placeholder="Job Title"
                    className={styles.italic}
                    onInput={onInput}
                    readOnly={readOnly}
                  />
                  <EditableField
                    value={job.location}
                    fieldPath={`workExperience[${i}].location`}
                    onFieldChange={onFieldChange}
                    placeholder="Location"
                    className={styles.italic}
                    onInput={onInput}
                    readOnly={readOnly}
                  />
                </div>
                <EditableBulletList
                  bullets={job.bullets}
                  basePath={`workExperience[${i}].bullets`}
                  onBulletChange={(bi, text) =>
                    onFieldChange(`workExperience[${i}].bullets[${bi}]`, text)
                  }
                  onBulletAdd={(afterIdx) =>
                    onBulletAdd(`workExperience[${i}].bullets`, afterIdx)
                  }
                  onBulletRemove={(bi) =>
                    onBulletRemove(`workExperience[${i}].bullets`, bi)
                  }
                  onInput={onInput}
                  readOnly={readOnly}
                />
              </div>
            </EntryWrapper>
          </React.Fragment>
        ))}
        {!readOnly && entryDrag && (
          <>
            <DropZoneTail entryCount={entries.length} entryDrag={entryDrag} />
            {entryDrag.dropIndex === entries.length && <DropLine />}
          </>
        )}
      </>
    );

    return (
      <SectionWrapper
        key="work"
        sectionKey="work"
        sectionIndex={sectionIdx}
        dragHandlers={sectionDrag}
        isDragSource={sectionDrag.dragFromIndex === sectionIdx}
        title="Experience"
        isHidden={hiddenSections.has('work')}
        isEmpty={entries.length === 0}
        onToggleVisibility={() => onToggleSection('work')}
        onAddEntry={() => onAddEntry('work')}
        addLabel="+ Add work entry"
        headerClassName={styles.sectionHeader}
        readOnly={readOnly}
      >
        {readOnly ? (
          renderWorkEntries()
        ) : (
          <EntryDragContainer onReorder={(from, to) => onReorderEntries('work', from, to)}>
            {(entryDrag) => renderWorkEntries(entryDrag)}
          </EntryDragContainer>
        )}
      </SectionWrapper>
    );
  };

  const renderEducationSection = (entries: EducationEntry[], sectionIdx: number) => {
    const renderEduEntries = (entryDrag?: ReturnType<typeof useEntryDrag>) => (
      <>
        {entries.map((edu, i) => {
          const hasItems = !!(edu.gpa || edu.details.length > 0);
          if (hasItems) {
            return (
              <React.Fragment key={edu.id}>
                {!readOnly && entryDrag && entryDrag.dropIndex === i && entryDrag.dragFromIndex !== i && <DropLine />}
                <EntryWrapper
                  entryIndex={i}
                  dragHandlers={entryDrag}
                  isDragSource={!readOnly && entryDrag ? entryDrag.dragFromIndex === i : false}
                  showGrip={entries.length > 1}
                  onDelete={() => onRemoveEntry('education', i)}
                  requireConfirm={true}
                  confirmMessage={`Delete "${edu.school || 'this education entry'}"?`}
                  readOnly={readOnly}
                >
                  <div className={styles.subsection}>
                    <div className={styles.subsectionLine1}>
                      <EditableField
                        value={edu.school}
                        fieldPath={`education[${i}].school`}
                        onFieldChange={onFieldChange}
                        placeholder="University Name"
                        className={styles.bold}
                        onInput={onInput}
                        readOnly={readOnly}
                      />
                      {renderDateRange(
                        edu.startDate,
                        edu.endDate,
                        `education[${i}].startDate`,
                        `education[${i}].endDate`,
                        'Start',
                        'End'
                      )}
                    </div>
                    <div className={styles.subsectionLine2}>
                      <EditableField
                        value={edu.degree}
                        fieldPath={`education[${i}].degree`}
                        onFieldChange={onFieldChange}
                        placeholder="Degree and Major"
                        className={styles.italic}
                        onInput={onInput}
                        readOnly={readOnly}
                      />
                      <EditableField
                        value={edu.location}
                        fieldPath={`education[${i}].location`}
                        onFieldChange={onFieldChange}
                        placeholder="Location"
                        className={styles.italic}
                        onInput={onInput}
                        readOnly={readOnly}
                      />
                    </div>
                    {edu.gpa && (
                      <div style={{ paddingLeft: '1em', display: 'flex', alignItems: 'flex-start' }}>
                        <span style={{ marginRight: '0.5em', userSelect: 'none' }}>{'\u00B7'}</span>
                        <span>GPA:&nbsp;</span>
                        <EditableField
                          value={edu.gpa}
                          fieldPath={`education[${i}].gpa`}
                          onFieldChange={onFieldChange}
                          placeholder="GPA"
                          onInput={onInput}
                          readOnly={readOnly}
                        />
                      </div>
                    )}
                    {edu.details.length > 0 && (
                      <EditableBulletList
                        bullets={edu.details}
                        basePath={`education[${i}].details`}
                        onBulletChange={(bi, text) =>
                          onFieldChange(`education[${i}].details[${bi}]`, text)
                        }
                        onBulletAdd={(afterIdx) =>
                          onBulletAdd(`education[${i}].details`, afterIdx)
                        }
                        onBulletRemove={(bi) =>
                          onBulletRemove(`education[${i}].details`, bi)
                        }
                        onInput={onInput}
                        readOnly={readOnly}
                      />
                    )}
                  </div>
                </EntryWrapper>
              </React.Fragment>
            );
          }
          // Simple layout: no GPA, no details
          return (
            <React.Fragment key={edu.id}>
              {!readOnly && entryDrag && entryDrag.dropIndex === i && entryDrag.dragFromIndex !== i && <DropLine />}
              <EntryWrapper
                entryIndex={i}
                dragHandlers={entryDrag}
                isDragSource={!readOnly && entryDrag ? entryDrag.dragFromIndex === i : false}
                showGrip={entries.length > 1}
                onDelete={() => onRemoveEntry('education', i)}
                requireConfirm={true}
                confirmMessage={`Delete "${edu.school || 'this education entry'}"?`}
                readOnly={readOnly}
              >
                <div className={styles.educationSimple}>
                  <div className={styles.subsectionLine1}>
                    <EditableField
                      value={edu.school}
                      fieldPath={`education[${i}].school`}
                      onFieldChange={onFieldChange}
                      placeholder="University Name"
                      className={styles.bold}
                      onInput={onInput}
                      readOnly={readOnly}
                    />
                    {renderDateRange(
                      edu.startDate,
                      edu.endDate,
                      `education[${i}].startDate`,
                      `education[${i}].endDate`,
                      'Start',
                      'End'
                    )}
                  </div>
                  <div className={styles.subsectionLine2}>
                    <EditableField
                      value={edu.degree}
                      fieldPath={`education[${i}].degree`}
                      onFieldChange={onFieldChange}
                      placeholder="Degree and Major"
                      className={styles.italic}
                      onInput={onInput}
                      readOnly={readOnly}
                    />
                    <EditableField
                      value={edu.location}
                      fieldPath={`education[${i}].location`}
                      onFieldChange={onFieldChange}
                      placeholder="Location"
                      className={styles.italic}
                      onInput={onInput}
                      readOnly={readOnly}
                    />
                  </div>
                </div>
              </EntryWrapper>
            </React.Fragment>
          );
        })}
        {!readOnly && entryDrag && (
          <>
            <DropZoneTail entryCount={entries.length} entryDrag={entryDrag} />
            {entryDrag.dropIndex === entries.length && <DropLine />}
          </>
        )}
      </>
    );

    return (
      <SectionWrapper
        key="education"
        sectionKey="education"
        sectionIndex={sectionIdx}
        dragHandlers={sectionDrag}
        isDragSource={sectionDrag.dragFromIndex === sectionIdx}
        title="Education"
        isHidden={hiddenSections.has('education')}
        isEmpty={entries.length === 0}
        onToggleVisibility={() => onToggleSection('education')}
        onAddEntry={() => onAddEntry('education')}
        addLabel="+ Add education"
        headerClassName={styles.sectionHeader}
        readOnly={readOnly}
      >
        {readOnly ? (
          renderEduEntries()
        ) : (
          <EntryDragContainer onReorder={(from, to) => onReorderEntries('education', from, to)}>
            {(entryDrag) => renderEduEntries(entryDrag)}
          </EntryDragContainer>
        )}
      </SectionWrapper>
    );
  };

  const renderSkillsSection = (categories: SkillCategory[], sectionIdx: number) => {
    const renderSkillEntries = (entryDrag?: ReturnType<typeof useEntryDrag>) => (
      <>
        {categories.map((cat, i) => (
          <React.Fragment key={cat.id}>
            {!readOnly && entryDrag && entryDrag.dropIndex === i && entryDrag.dragFromIndex !== i && (
              <div style={{ gridColumn: '1 / -1' }}><DropLine /></div>
            )}
            <EntryWrapper
              entryIndex={i}
              dragHandlers={entryDrag}
              isDragSource={!readOnly && entryDrag ? entryDrag.dragFromIndex === i : false}
              showGrip={categories.length > 1}
              onDelete={() => onRemoveEntry('skills', i)}
              requireConfirm={false}
              gridItem
              readOnly={readOnly}
            >
              <SkillCategoryRow
                category={cat}
                index={i}
                onFieldChange={onFieldChange}
                onSkillsTextChange={handleSkillsTextChange}
                onInput={onInput}
                readOnly={readOnly}
              />
            </EntryWrapper>
          </React.Fragment>
        ))}
        {!readOnly && entryDrag && (
          <>
            <div style={{ gridColumn: '1 / -1' }}>
              <DropZoneTail entryCount={categories.length} entryDrag={entryDrag} />
            </div>
            {entryDrag.dropIndex === categories.length && (
              <div style={{ gridColumn: '1 / -1' }}><DropLine /></div>
            )}
          </>
        )}
      </>
    );

    return (
      <SectionWrapper
        key="skills"
        sectionKey="skills"
        sectionIndex={sectionIdx}
        dragHandlers={sectionDrag}
        isDragSource={sectionDrag.dragFromIndex === sectionIdx}
        title="Skills"
        isHidden={hiddenSections.has('skills')}
        isEmpty={categories.length === 0}
        onToggleVisibility={() => onToggleSection('skills')}
        onAddEntry={() => onAddEntry('skills')}
        addLabel="+ Add skill category"
        headerClassName={styles.sectionHeader}
        readOnly={readOnly}
      >
        <div className={styles.skillsGrid}>
          {readOnly ? (
            renderSkillEntries()
          ) : (
            <EntryDragContainer onReorder={(from, to) => onReorderEntries('skills', from, to)}>
              {(entryDrag) => renderSkillEntries(entryDrag)}
            </EntryDragContainer>
          )}
        </div>
      </SectionWrapper>
    );
  };

  const renderProjectsSection = (entries: Project[], sectionIdx: number) => {
    const renderProjEntries = (entryDrag?: ReturnType<typeof useEntryDrag>) => (
      <>
        {entries.map((proj, i) => (
          <React.Fragment key={proj.id}>
            {!readOnly && entryDrag && entryDrag.dropIndex === i && entryDrag.dragFromIndex !== i && <DropLine />}
            <EntryWrapper
              entryIndex={i}
              dragHandlers={entryDrag}
              isDragSource={!readOnly && entryDrag ? entryDrag.dragFromIndex === i : false}
              showGrip={entries.length > 1}
              onDelete={() => onRemoveEntry('projects', i)}
              requireConfirm={true}
              confirmMessage={`Delete "${proj.name || 'this project'}"?`}
              readOnly={readOnly}
            >
              <div className={styles.projectEntry}>
                <div className={styles.projectHeader}>
                  <EditableField
                    value={proj.name}
                    fieldPath={`projects[${i}].name`}
                    onFieldChange={onFieldChange}
                    placeholder="Project Name"
                    className={styles.bold}
                    onInput={onInput}
                    readOnly={readOnly}
                  />
                  {proj.year !== undefined && (
                    <EditableField
                      value={proj.year}
                      fieldPath={`projects[${i}].year`}
                      onFieldChange={onFieldChange}
                      placeholder="Year"
                      onInput={onInput}
                      readOnly={readOnly}
                    />
                  )}
                </div>
                <EditableField
                  value={proj.description}
                  fieldPath={`projects[${i}].description`}
                  onFieldChange={onFieldChange}
                  placeholder="Brief project description..."
                  tag="div"
                  onInput={onInput}
                  readOnly={readOnly}
                />
                {proj.technologies && (
                  <EditableField
                    value={proj.technologies}
                    fieldPath={`projects[${i}].technologies`}
                    onFieldChange={onFieldChange}
                    placeholder="Technologies used"
                    tag="div"
                    className={styles.italic}
                    onInput={onInput}
                    readOnly={readOnly}
                  />
                )}
                {proj.bullets && proj.bullets.length > 0 && (
                  <EditableBulletList
                    bullets={proj.bullets}
                    basePath={`projects[${i}].bullets`}
                    onBulletChange={(bi, text) =>
                      onFieldChange(`projects[${i}].bullets[${bi}]`, text)
                    }
                    onBulletAdd={(afterIdx) =>
                      onBulletAdd(`projects[${i}].bullets`, afterIdx)
                    }
                    onBulletRemove={(bi) =>
                      onBulletRemove(`projects[${i}].bullets`, bi)
                    }
                    onInput={onInput}
                    readOnly={readOnly}
                  />
                )}
              </div>
            </EntryWrapper>
          </React.Fragment>
        ))}
        {!readOnly && entryDrag && (
          <>
            <DropZoneTail entryCount={entries.length} entryDrag={entryDrag} />
            {entryDrag.dropIndex === entries.length && <DropLine />}
          </>
        )}
      </>
    );

    return (
      <SectionWrapper
        key="projects"
        sectionKey="projects"
        sectionIndex={sectionIdx}
        dragHandlers={sectionDrag}
        isDragSource={sectionDrag.dragFromIndex === sectionIdx}
        title="Projects"
        isHidden={hiddenSections.has('projects')}
        isEmpty={entries.length === 0}
        onToggleVisibility={() => onToggleSection('projects')}
        onAddEntry={() => onAddEntry('projects')}
        addLabel="+ Add project"
        headerClassName={styles.sectionHeader}
        readOnly={readOnly}
      >
        {readOnly ? (
          renderProjEntries()
        ) : (
          <EntryDragContainer onReorder={(from, to) => onReorderEntries('projects', from, to)}>
            {(entryDrag) => renderProjEntries(entryDrag)}
          </EntryDragContainer>
        )}
      </SectionWrapper>
    );
  };

  const renderAwardsSection = (entries: Award[], sectionIdx: number) => {
    const renderAwardEntries = (entryDrag?: ReturnType<typeof useEntryDrag>) => (
      <>
        {entries.map((award, i) => (
          <React.Fragment key={award.id}>
            {!readOnly && entryDrag && entryDrag.dropIndex === i && entryDrag.dragFromIndex !== i && (
              <div style={{ gridColumn: '1 / -1' }}><DropLine /></div>
            )}
            <EntryWrapper
              entryIndex={i}
              dragHandlers={entryDrag}
              isDragSource={!readOnly && entryDrag ? entryDrag.dragFromIndex === i : false}
              showGrip={entries.length > 1}
              onDelete={() => onRemoveEntry('awards', i)}
              requireConfirm={true}
              confirmMessage={`Delete "${award.title || 'this award'}"?`}
              gridItem
              readOnly={readOnly}
            >
              <AwardRow
                award={award}
                index={i}
                onFieldChange={onFieldChange}
                onInput={onInput}
                readOnly={readOnly}
              />
            </EntryWrapper>
          </React.Fragment>
        ))}
        {!readOnly && entryDrag && (
          <>
            <div style={{ gridColumn: '1 / -1' }}>
              <DropZoneTail entryCount={entries.length} entryDrag={entryDrag} />
            </div>
            {entryDrag.dropIndex === entries.length && (
              <div style={{ gridColumn: '1 / -1' }}><DropLine /></div>
            )}
          </>
        )}
      </>
    );

    return (
      <SectionWrapper
        key="awards"
        sectionKey="awards"
        sectionIndex={sectionIdx}
        dragHandlers={sectionDrag}
        isDragSource={sectionDrag.dragFromIndex === sectionIdx}
        title="Awards"
        isHidden={hiddenSections.has('awards')}
        isEmpty={entries.length === 0}
        onToggleVisibility={() => onToggleSection('awards')}
        onAddEntry={() => onAddEntry('awards')}
        addLabel="+ Add award"
        headerClassName={styles.sectionHeader}
        readOnly={readOnly}
      >
        <div className={styles.awardsGrid}>
          {readOnly ? (
            renderAwardEntries()
          ) : (
            <EntryDragContainer onReorder={(from, to) => onReorderEntries('awards', from, to)}>
              {(entryDrag) => renderAwardEntries(entryDrag)}
            </EntryDragContainer>
          )}
        </div>
      </SectionWrapper>
    );
  };

  const renderAdditionalSection = (asec: AdditionalSection, additionalIdx: number, sectionIdx: number) => {
    const sectionKey = `additional-${additionalIdx}`;

    const renderAdditionalEntries = (entryDrag?: ReturnType<typeof useEntryDrag>) => (
      <>
        {asec.entries.map((entry, entryIdx) => {
          const hasItems = !!(entry.bullets.length > 0 || entry.description);
          if (hasItems) {
            return (
              <React.Fragment key={entry.id}>
                {!readOnly && entryDrag && entryDrag.dropIndex === entryIdx && entryDrag.dragFromIndex !== entryIdx && <DropLine />}
                <EntryWrapper
                  entryIndex={entryIdx}
                  dragHandlers={entryDrag}
                  isDragSource={!readOnly && entryDrag ? entryDrag.dragFromIndex === entryIdx : false}
                  showGrip={asec.entries.length > 1}
                  onDelete={() => onRemoveEntry(sectionKey, entryIdx)}
                  requireConfirm={true}
                  confirmMessage={`Delete "${entry.title || 'this entry'}"?`}
                  readOnly={readOnly}
                >
                  <div className={styles.subsection}>
                    <div className={styles.subsectionLine1}>
                      <EditableField
                        value={entry.title}
                        fieldPath={`additionalSections[${additionalIdx}].entries[${entryIdx}].title`}
                        onFieldChange={onFieldChange}
                        placeholder="Entry Title"
                        className={styles.bold}
                        onInput={onInput}
                        readOnly={readOnly}
                      />
                      {(entry.startDate !== undefined || entry.endDate !== undefined) &&
                        renderDateRange(
                          entry.startDate ?? '',
                          entry.endDate ?? '',
                          `additionalSections[${additionalIdx}].entries[${entryIdx}].startDate`,
                          `additionalSections[${additionalIdx}].entries[${entryIdx}].endDate`
                        )
                      }
                    </div>
                    <div className={styles.subsectionLine2}>
                      {entry.subtitle !== undefined && (
                        <EditableField
                          value={entry.subtitle ?? ''}
                          fieldPath={`additionalSections[${additionalIdx}].entries[${entryIdx}].subtitle`}
                          onFieldChange={onFieldChange}
                          placeholder="Subtitle"
                          className={styles.italic}
                          onInput={onInput}
                          readOnly={readOnly}
                        />
                      )}
                      {entry.location !== undefined && (
                        <EditableField
                          value={entry.location ?? ''}
                          fieldPath={`additionalSections[${additionalIdx}].entries[${entryIdx}].location`}
                          onFieldChange={onFieldChange}
                          placeholder="Location"
                          className={styles.italic}
                          onInput={onInput}
                          readOnly={readOnly}
                        />
                      )}
                    </div>
                    {entry.description && (
                      <EditableField
                        value={entry.description}
                        fieldPath={`additionalSections[${additionalIdx}].entries[${entryIdx}].description`}
                        onFieldChange={onFieldChange}
                        placeholder="Description..."
                        tag="div"
                        onInput={onInput}
                        readOnly={readOnly}
                      />
                    )}
                    {entry.bullets.length > 0 && (
                      <EditableBulletList
                        bullets={entry.bullets}
                        basePath={`additionalSections[${additionalIdx}].entries[${entryIdx}].bullets`}
                        onBulletChange={(bi, text) =>
                          onFieldChange(
                            `additionalSections[${additionalIdx}].entries[${entryIdx}].bullets[${bi}]`,
                            text
                          )
                        }
                        onBulletAdd={(afterIdx) =>
                          onBulletAdd(
                            `additionalSections[${additionalIdx}].entries[${entryIdx}].bullets`,
                            afterIdx
                          )
                        }
                        onBulletRemove={(bi) =>
                          onBulletRemove(
                            `additionalSections[${additionalIdx}].entries[${entryIdx}].bullets`,
                            bi
                          )
                        }
                        onInput={onInput}
                        readOnly={readOnly}
                      />
                    )}
                  </div>
                </EntryWrapper>
              </React.Fragment>
            );
          }
          // Simple layout: no bullets, no description
          return (
            <React.Fragment key={entry.id}>
              {!readOnly && entryDrag && entryDrag.dropIndex === entryIdx && entryDrag.dragFromIndex !== entryIdx && <DropLine />}
              <EntryWrapper
                entryIndex={entryIdx}
                dragHandlers={entryDrag}
                isDragSource={!readOnly && entryDrag ? entryDrag.dragFromIndex === entryIdx : false}
                showGrip={asec.entries.length > 1}
                onDelete={() => onRemoveEntry(sectionKey, entryIdx)}
                requireConfirm={true}
                confirmMessage={`Delete "${entry.title || 'this entry'}"?`}
                readOnly={readOnly}
              >
                <div className={styles.additionalSimple}>
                  <div className={styles.subsectionLine1}>
                    <EditableField
                      value={entry.title}
                      fieldPath={`additionalSections[${additionalIdx}].entries[${entryIdx}].title`}
                      onFieldChange={onFieldChange}
                      placeholder="Entry Title"
                      className={styles.bold}
                      onInput={onInput}
                      readOnly={readOnly}
                    />
                    {(entry.startDate !== undefined || entry.endDate !== undefined) &&
                      renderDateRange(
                        entry.startDate ?? '',
                        entry.endDate ?? '',
                        `additionalSections[${additionalIdx}].entries[${entryIdx}].startDate`,
                        `additionalSections[${additionalIdx}].entries[${entryIdx}].endDate`
                      )
                    }
                  </div>
                  <div className={styles.subsectionLine2}>
                    {entry.subtitle !== undefined && (
                      <EditableField
                        value={entry.subtitle ?? ''}
                        fieldPath={`additionalSections[${additionalIdx}].entries[${entryIdx}].subtitle`}
                        onFieldChange={onFieldChange}
                        placeholder="Subtitle"
                        className={styles.italic}
                        onInput={onInput}
                        readOnly={readOnly}
                      />
                    )}
                    {entry.location !== undefined && (
                      <EditableField
                        value={entry.location ?? ''}
                        fieldPath={`additionalSections[${additionalIdx}].entries[${entryIdx}].location`}
                        onFieldChange={onFieldChange}
                        placeholder="Location"
                        className={styles.italic}
                        onInput={onInput}
                        readOnly={readOnly}
                      />
                    )}
                  </div>
                </div>
              </EntryWrapper>
            </React.Fragment>
          );
        })}
        {!readOnly && entryDrag && (
          <>
            <DropZoneTail entryCount={asec.entries.length} entryDrag={entryDrag} />
            {entryDrag.dropIndex === asec.entries.length && <DropLine />}
          </>
        )}
      </>
    );

    return (
      <SectionWrapper
        key={sectionKey}
        sectionKey={sectionKey}
        sectionIndex={sectionIdx}
        dragHandlers={sectionDrag}
        isDragSource={sectionDrag.dragFromIndex === sectionIdx}
        title={asec.title || 'Additional Section'}
        isHidden={hiddenSections.has(sectionKey)}
        isEmpty={asec.entries.length === 0}
        onToggleVisibility={() => onToggleSection(sectionKey)}
        onAddEntry={() => onAddEntry(sectionKey)}
        addLabel="+ Add entry"
        renderHeader={() => (
          <EditableField
            value={asec.title}
            fieldPath={`additionalSections[${additionalIdx}].title`}
            onFieldChange={onFieldChange}
            placeholder="Section Title"
            tag="div"
            className={styles.sectionHeader}
            onInput={onInput}
            readOnly={readOnly}
          />
        )}
        readOnly={readOnly}
      >
        {readOnly ? (
          renderAdditionalEntries()
        ) : (
          <EntryDragContainer onReorder={(from, to) => onReorderEntries(sectionKey, from, to)}>
            {(entryDrag) => renderAdditionalEntries(entryDrag)}
          </EntryDragContainer>
        )}
      </SectionWrapper>
    );
  };

  // --- Section loop (mirrors tex.j2 section_order loop) ---

  const renderSection = (sec: string, sectionIdx: number) => {
    if (sec === 'work') {
      return renderWorkSection(formData.workExperience, sectionIdx);
    }
    if (sec === 'education') {
      return renderEducationSection(formData.education, sectionIdx);
    }
    if (sec === 'skills') {
      return renderSkillsSection(formData.skills, sectionIdx);
    }
    if (sec === 'projects') {
      return renderProjectsSection(formData.projects ?? [], sectionIdx);
    }
    if (sec === 'awards') {
      return renderAwardsSection(formData.awards ?? [], sectionIdx);
    }
    if (sec.startsWith('additional-')) {
      const idx = parseInt(sec.split('-')[1], 10);
      const additionalSections = formData.additionalSections ?? [];
      if (idx < additionalSections.length) {
        return renderAdditionalSection(additionalSections[idx], idx, sectionIdx);
      }
    }
    return null;
  };

  /**
   * Allow drops on the template container itself so that releasing the mouse
   * between sections still fires the drop event (Bug 2 fix). Without this,
   * the browser uses the default "no drop" behavior and the drop event never
   * fires, leaving the drag in a stuck state.
   */
  const handleContainerDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div className={styles.template} onDragOver={readOnly ? undefined : handleContainerDragOver}>
      {/* Personal Info Header */}
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
        {renderInfoBarItems()}
      </div>

      {/* Summary (if present or always with placeholder) */}
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

      {/* Section loop with DropLine between sections */}
      {sectionOrder.map((sec, sectionIdx) => (
        <React.Fragment key={sec}>
          {!readOnly && sectionDrag.dropIndex === sectionIdx && sectionDrag.dragFromIndex !== sectionIdx && (
            <DropLine />
          )}
          {renderSection(sec, sectionIdx)}
        </React.Fragment>
      ))}
      {!readOnly && sectionDrag.dropIndex === sectionOrder.length && (
        <DropLine />
      )}
    </div>
  );
}

// --- Sub-components for grid layouts ---

/**
 * SkillCategoryRow -- Renders a single skill category as two grid cells:
 * bold category label on the left, comma-separated skills text on the right.
 */
function SkillCategoryRow({
  category,
  index,
  onFieldChange,
  onSkillsTextChange,
  onInput,
  readOnly,
}: {
  category: SkillCategory;
  index: number;
  onFieldChange: (path: string, value: string | SkillItem[]) => void;
  onSkillsTextChange: (
    skillIndex: number,
    currentSkills: SkillItem[],
    path: string,
    value: string
  ) => void;
  onInput?: () => void;
  readOnly?: boolean;
}) {
  const skillsText = category.skills.map(s => s.text).join(', ');

  const handleSkillsBlur = useCallback(
    (path: string, value: string) => {
      onSkillsTextChange(index, category.skills, path, value);
    },
    [index, category.skills, onSkillsTextChange]
  );

  return (
    <>
      <EditableField
        value={category.category}
        fieldPath={`skills[${index}].category`}
        onFieldChange={onFieldChange}
        placeholder="Category"
        className={styles.skillCategoryLabel}
        onInput={onInput}
        readOnly={readOnly}
      />
      <EditableField
        value={skillsText}
        fieldPath={`skills[${index}].skillsText`}
        onFieldChange={handleSkillsBlur}
        placeholder="Skill 1, Skill 2, Skill 3"
        className={styles.skillValues}
        onInput={onInput}
        readOnly={readOnly}
      />
    </>
  );
}

/**
 * AwardRow -- Renders a single award as two grid cells:
 * year on the left, title + description on the right.
 */
function AwardRow({
  award,
  index,
  onFieldChange,
  onInput,
  readOnly,
}: {
  award: Award;
  index: number;
  onFieldChange: (path: string, value: string | SkillItem[]) => void;
  onInput?: () => void;
  readOnly?: boolean;
}) {
  return (
    <>
      <EditableField
        value={award.year}
        fieldPath={`awards[${index}].year`}
        onFieldChange={onFieldChange}
        placeholder="Year"
        onInput={onInput}
        readOnly={readOnly}
      />
      <span>
        <EditableField
          value={award.title}
          fieldPath={`awards[${index}].title`}
          onFieldChange={onFieldChange}
          placeholder="Award Title"
          onInput={onInput}
          readOnly={readOnly}
        />
        {award.description !== undefined && award.description !== '' && (
          <>
            <span>: </span>
            <EditableField
              value={award.description ?? ''}
              fieldPath={`awards[${index}].description`}
              onFieldChange={onFieldChange}
              placeholder="Brief description"
              onInput={onInput}
              readOnly={readOnly}
            />
          </>
        )}
      </span>
    </>
  );
}
