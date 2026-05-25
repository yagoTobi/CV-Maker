import React, { memo } from 'react';
import { EditableField } from '../editor-primitives/EditableField';
import { SectionWrapper } from '../editor-primitives/SectionWrapper';
import { EntryWrapper } from '../editor-primitives/EntryWrapper';
import { DropLine } from '../editor-primitives/DropLine';
import { EntryDragContainer } from './EntryDragContainer';
import { DropZoneTail } from './DropZoneTail';
import type { Award, SkillItem } from '../../../../types';
import type { SharedSectionProps } from './sectionTypes';
import type { useEntryDrag } from '../../hooks/useEntryDrag';
import styles from '../MedLengthTemplate.module.css';

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

interface AwardsSectionProps extends SharedSectionProps {
  entries: Award[];
  /** User-overridden section heading; falls back to 'Awards'. */
  labelOverride?: string;
}

export const AwardsSection = memo(function AwardsSection({
  entries,
  labelOverride,
  readOnly,
  onFieldChange,
  onAddEntry,
  onRemoveEntry,
  onToggleSection,
  hiddenSections,
  onReorderEntries,
  onInput,
  onRemoveSection,
  sectionDrag,
  sectionIndex,
}: AwardsSectionProps) {
  const displayLabel = labelOverride ?? 'Awards';

  const renderEntries = (entryDrag?: ReturnType<typeof useEntryDrag>) => (
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
      sectionIndex={sectionIndex}
      dragHandlers={sectionDrag}
      isDragSource={sectionDrag.dragFromIndex === sectionIndex}
      title={displayLabel}
      isHidden={hiddenSections.has('awards')}
      isEmpty={entries.length === 0}
      onToggleVisibility={() => onToggleSection('awards')}
      onAddEntry={() => onAddEntry('awards')}
      addLabel="+ Add award"
      readOnly={readOnly}
      onRemoveSection={readOnly ? undefined : () => onRemoveSection?.('awards')}
      renderHeader={readOnly ? undefined : () => (
        <EditableField
          value={displayLabel}
          fieldPath="sectionLabels.awards"
          onFieldChange={onFieldChange}
          placeholder="Awards"
          tag="div"
          className={styles.sectionHeader}
          onInput={onInput}
          readOnly={readOnly}
        />
      )}
    >
      <div className={styles.awardsGrid}>
        {readOnly ? (
          renderEntries()
        ) : (
          <EntryDragContainer onReorder={(from, to) => onReorderEntries('awards', from, to)}>
            {(entryDrag) => renderEntries(entryDrag)}
          </EntryDragContainer>
        )}
      </div>
    </SectionWrapper>
  );
});
