import React, { memo } from 'react';
import { EditableField } from '../EditableField';
import { EditableBulletList } from '../EditableBulletList';
import { SectionWrapper } from '../SectionWrapper';
import { EntryWrapper } from '../EntryWrapper';
import { DropLine } from '../DropLine';
import { EntryDragContainer } from './EntryDragContainer';
import { DropZoneTail } from './DropZoneTail';
import type { Project } from '../../../../types';
import type { SharedSectionProps } from './sectionTypes';
import type { useEntryDrag } from '../../hooks/useEntryDrag';
import styles from '../MedLengthTemplate.module.css';

interface ProjectsSectionProps extends SharedSectionProps {
  entries: Project[];
  /** User-overridden section heading; falls back to 'Projects'. */
  labelOverride?: string;
}

export const ProjectsSection = memo(function ProjectsSection({
  entries,
  labelOverride,
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
  sectionIndex,
}: ProjectsSectionProps) {
  const displayLabel = labelOverride ?? 'Projects';

  const renderEntries = (entryDrag?: ReturnType<typeof useEntryDrag>) => (
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
                  onBulletChange={(bi, text) => onFieldChange(`projects[${i}].bullets[${bi}]`, text)}
                  onBulletAdd={(afterIdx) => onBulletAdd(`projects[${i}].bullets`, afterIdx)}
                  onBulletRemove={(bi) => onBulletRemove(`projects[${i}].bullets`, bi)}
                  onInput={onInput}
                  readOnly={readOnly}
                  rich={true}
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
      sectionIndex={sectionIndex}
      dragHandlers={sectionDrag}
      isDragSource={sectionDrag.dragFromIndex === sectionIndex}
      title={displayLabel}
      isHidden={hiddenSections.has('projects')}
      isEmpty={entries.length === 0}
      onToggleVisibility={() => onToggleSection('projects')}
      onAddEntry={() => onAddEntry('projects')}
      addLabel="+ Add project"
      readOnly={readOnly}
      onRemoveSection={readOnly ? undefined : () => onRemoveSection?.('projects')}
      renderHeader={readOnly ? undefined : () => (
        <EditableField
          value={displayLabel}
          fieldPath="sectionLabels.projects"
          onFieldChange={onFieldChange}
          placeholder="Projects"
          tag="div"
          className={styles.sectionHeader}
          onInput={onInput}
          readOnly={readOnly}
        />
      )}
    >
      {readOnly ? (
        renderEntries()
      ) : (
        <EntryDragContainer onReorder={(from, to) => onReorderEntries('projects', from, to)}>
          {(entryDrag) => renderEntries(entryDrag)}
        </EntryDragContainer>
      )}
    </SectionWrapper>
  );
});
