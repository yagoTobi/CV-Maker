import React from 'react';
import { EditableField } from '../EditableField';
import { SectionWrapper } from '../SectionWrapper';
import { EntryWrapper } from '../EntryWrapper';
import { DropLine } from '../DropLine';
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
}

export function AwardsSection({
  entries,
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
      title="Awards"
      isHidden={hiddenSections.has('awards')}
      isEmpty={entries.length === 0}
      onToggleVisibility={() => onToggleSection('awards')}
      onAddEntry={() => onAddEntry('awards')}
      addLabel="+ Add award"
      headerClassName={styles.sectionHeader}
      readOnly={readOnly}
      onRemoveSection={readOnly ? undefined : () => onRemoveSection?.('awards')}
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
}
