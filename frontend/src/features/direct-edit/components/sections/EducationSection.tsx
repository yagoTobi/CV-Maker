import React, { memo } from 'react';
import { EditableField } from '../editor-primitives/EditableField';
import { EditableBulletList } from '../editor-primitives/EditableBulletList';
import { SectionWrapper } from '../editor-primitives/SectionWrapper';
import { EntryWrapper } from '../editor-primitives/EntryWrapper';
import { DropLine } from '../editor-primitives/DropLine';
import { EntryDragContainer } from './EntryDragContainer';
import { DropZoneTail } from './DropZoneTail';
import { DateRange } from './DateRange';
import type { EducationEntry } from '../../../../types';
import type { SharedSectionProps } from './sectionTypes';
import type { useEntryDrag } from '../../hooks/useEntryDrag';
import styles from '../MedLengthTemplate.module.css';

interface EducationSectionProps extends SharedSectionProps {
  entries: EducationEntry[];
  /** User-overridden section heading; falls back to 'Education'. */
  labelOverride?: string;
}

export const EducationSection = memo(function EducationSection({
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
}: EducationSectionProps) {
  const displayLabel = labelOverride ?? 'Education';

  const renderEntries = (entryDrag?: ReturnType<typeof useEntryDrag>) => (
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
                    <DateRange
                      startDate={edu.startDate}
                      endDate={edu.endDate}
                      startPath={`education[${i}].startDate`}
                      endPath={`education[${i}].endDate`}
                      endPlaceholder="End"
                      onFieldChange={onFieldChange}
                      onInput={onInput}
                      readOnly={readOnly}
                    />
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
                  {(edu.details.length > 0 || !readOnly) && (
                    <EditableBulletList
                      bullets={edu.details}
                      basePath={`education[${i}].details`}
                      onBulletChange={(bi, text) => onFieldChange(`education[${i}].details[${bi}]`, text)}
                      onBulletAdd={(afterIdx) => onBulletAdd(`education[${i}].details`, afterIdx)}
                      onBulletRemove={(bi) => onBulletRemove(`education[${i}].details`, bi)}
                      onInput={onInput}
                      readOnly={readOnly}
                      rich={true}
                    />
                  )}
                </div>
              </EntryWrapper>
            </React.Fragment>
          );
        }
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
                  <DateRange
                    startDate={edu.startDate}
                    endDate={edu.endDate}
                    startPath={`education[${i}].startDate`}
                    endPath={`education[${i}].endDate`}
                    endPlaceholder="End"
                    onFieldChange={onFieldChange}
                    onInput={onInput}
                    readOnly={readOnly}
                  />
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
                {!readOnly && (
                  <EditableBulletList
                    bullets={edu.details}
                    basePath={`education[${i}].details`}
                    onBulletChange={(bi, text) => onFieldChange(`education[${i}].details[${bi}]`, text)}
                    onBulletAdd={(afterIdx) => onBulletAdd(`education[${i}].details`, afterIdx)}
                    onBulletRemove={(bi) => onBulletRemove(`education[${i}].details`, bi)}
                    onInput={onInput}
                    readOnly={readOnly}
                    rich={true}
                  />
                )}
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
      sectionIndex={sectionIndex}
      dragHandlers={sectionDrag}
      isDragSource={sectionDrag.dragFromIndex === sectionIndex}
      title={displayLabel}
      isHidden={hiddenSections.has('education')}
      isEmpty={entries.length === 0}
      onToggleVisibility={() => onToggleSection('education')}
      onAddEntry={() => onAddEntry('education')}
      addLabel="+ Add education"
      readOnly={readOnly}
      onRemoveSection={readOnly ? undefined : () => onRemoveSection?.('education')}
      renderHeader={readOnly ? undefined : () => (
        <EditableField
          value={displayLabel}
          fieldPath="sectionLabels.education"
          onFieldChange={onFieldChange}
          placeholder="Education"
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
        <EntryDragContainer onReorder={(from, to) => onReorderEntries('education', from, to)}>
          {(entryDrag) => renderEntries(entryDrag)}
        </EntryDragContainer>
      )}
    </SectionWrapper>
  );
});
