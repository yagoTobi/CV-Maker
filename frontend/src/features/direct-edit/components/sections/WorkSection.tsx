import React from 'react';
import { EditableField } from '../EditableField';
import { EditableBulletList } from '../EditableBulletList';
import { SectionWrapper } from '../SectionWrapper';
import { EntryWrapper } from '../EntryWrapper';
import { DropLine } from '../DropLine';
import { EntryDragContainer } from './EntryDragContainer';
import { DropZoneTail } from './DropZoneTail';
import { DateRange } from './DateRange';
import type { WorkEntry } from '../../../../types';
import type { SharedSectionProps } from './sectionTypes';
import type { useEntryDrag } from '../../hooks/useEntryDrag';
import styles from '../MedLengthTemplate.module.css';

interface WorkSectionProps extends SharedSectionProps {
  entries: WorkEntry[];
}

export function WorkSection({
  entries,
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
}: WorkSectionProps) {
  const renderEntries = (entryDrag?: ReturnType<typeof useEntryDrag>) => (
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
                <DateRange
                  startDate={job.startDate}
                  endDate={job.endDate}
                  startPath={`workExperience[${i}].startDate`}
                  endPath={`workExperience[${i}].endDate`}
                  onFieldChange={onFieldChange}
                  onInput={onInput}
                  readOnly={readOnly}
                />
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
                onBulletChange={(bi, text) => onFieldChange(`workExperience[${i}].bullets[${bi}]`, text)}
                onBulletAdd={(afterIdx) => onBulletAdd(`workExperience[${i}].bullets`, afterIdx)}
                onBulletRemove={(bi) => onBulletRemove(`workExperience[${i}].bullets`, bi)}
                onInput={onInput}
                readOnly={readOnly}
                rich={true}
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
      sectionIndex={sectionIndex}
      dragHandlers={sectionDrag}
      isDragSource={sectionDrag.dragFromIndex === sectionIndex}
      title="Experience"
      isHidden={hiddenSections.has('work')}
      isEmpty={entries.length === 0}
      onToggleVisibility={() => onToggleSection('work')}
      onAddEntry={() => onAddEntry('work')}
      addLabel="+ Add work entry"
      headerClassName={styles.sectionHeader}
      readOnly={readOnly}
      onRemoveSection={readOnly ? undefined : () => onRemoveSection?.('work')}
    >
      {readOnly ? (
        renderEntries()
      ) : (
        <EntryDragContainer onReorder={(from, to) => onReorderEntries('work', from, to)}>
          {(entryDrag) => renderEntries(entryDrag)}
        </EntryDragContainer>
      )}
    </SectionWrapper>
  );
}
