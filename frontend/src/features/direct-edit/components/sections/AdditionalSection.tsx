import React, { memo } from 'react';
import { EditableField } from '../EditableField';
import { EditableBulletList } from '../EditableBulletList';
import { SectionWrapper } from '../SectionWrapper';
import { EntryWrapper } from '../EntryWrapper';
import { DropLine } from '../DropLine';
import { EntryDragContainer } from './EntryDragContainer';
import { DropZoneTail } from './DropZoneTail';
import { DateRange } from './DateRange';
import type { AdditionalSection as AdditionalSectionType } from '../../../../types';
import type { SharedSectionProps } from './sectionTypes';
import type { useEntryDrag } from '../../hooks/useEntryDrag';
import styles from '../MedLengthTemplate.module.css';

interface AdditionalSectionProps extends SharedSectionProps {
  asec: AdditionalSectionType;
  additionalIdx: number;
}

export const AdditionalSection = memo(function AdditionalSection({
  asec,
  additionalIdx,
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
}: AdditionalSectionProps) {
  const sectionKey = `additional-${additionalIdx}`;

  const renderEntries = (entryDrag?: ReturnType<typeof useEntryDrag>) => (
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
                    {(entry.startDate !== undefined || entry.endDate !== undefined) && (
                      <DateRange
                        startDate={entry.startDate ?? ''}
                        endDate={entry.endDate ?? ''}
                        startPath={`additionalSections[${additionalIdx}].entries[${entryIdx}].startDate`}
                        endPath={`additionalSections[${additionalIdx}].entries[${entryIdx}].endDate`}
                        onFieldChange={onFieldChange}
                        onInput={onInput}
                        readOnly={readOnly}
                      />
                    )}
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
                        onFieldChange(`additionalSections[${additionalIdx}].entries[${entryIdx}].bullets[${bi}]`, text)
                      }
                      onBulletAdd={(afterIdx) =>
                        onBulletAdd(`additionalSections[${additionalIdx}].entries[${entryIdx}].bullets`, afterIdx)
                      }
                      onBulletRemove={(bi) =>
                        onBulletRemove(`additionalSections[${additionalIdx}].entries[${entryIdx}].bullets`, bi)
                      }
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
                  {(entry.startDate !== undefined || entry.endDate !== undefined) && (
                    <DateRange
                      startDate={entry.startDate ?? ''}
                      endDate={entry.endDate ?? ''}
                      startPath={`additionalSections[${additionalIdx}].entries[${entryIdx}].startDate`}
                      endPath={`additionalSections[${additionalIdx}].entries[${entryIdx}].endDate`}
                      onFieldChange={onFieldChange}
                      onInput={onInput}
                      readOnly={readOnly}
                    />
                  )}
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
      sectionIndex={sectionIndex}
      dragHandlers={sectionDrag}
      isDragSource={sectionDrag.dragFromIndex === sectionIndex}
      title={asec.title || 'Additional Section'}
      isHidden={hiddenSections.has(sectionKey)}
      isEmpty={asec.entries.length === 0}
      onToggleVisibility={() => onToggleSection(sectionKey)}
      onAddEntry={() => onAddEntry(sectionKey)}
      addLabel="+ Add entry"
      onRemoveSection={readOnly ? undefined : () => onRemoveSection?.(sectionKey)}
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
        renderEntries()
      ) : (
        <EntryDragContainer onReorder={(from, to) => onReorderEntries(sectionKey, from, to)}>
          {(entryDrag) => renderEntries(entryDrag)}
        </EntryDragContainer>
      )}
    </SectionWrapper>
  );
});
