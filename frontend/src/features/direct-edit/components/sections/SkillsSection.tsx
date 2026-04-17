import React, { useCallback, memo } from 'react';
import { EditableField } from '../EditableField';
import { SectionWrapper } from '../SectionWrapper';
import { EntryWrapper } from '../EntryWrapper';
import { DropLine } from '../DropLine';
import { EntryDragContainer } from './EntryDragContainer';
import { DropZoneTail } from './DropZoneTail';
import { generateId } from '../../../../utils/idHelpers';
import type { SkillCategory, SkillItem } from '../../../../types';
import type { SharedSectionProps } from './sectionTypes';
import type { useEntryDrag } from '../../hooks/useEntryDrag';
import styles from '../MedLengthTemplate.module.css';

interface SkillsSectionProps extends SharedSectionProps {
  categories: SkillCategory[];
  /** User-overridden section heading; falls back to 'Skills'. */
  labelOverride?: string;
}

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
  onSkillsTextChange: (skillIndex: number, currentSkills: SkillItem[], path: string, value: string) => void;
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

export const SkillsSection = memo(function SkillsSection({
  categories,
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
}: SkillsSectionProps) {
  const displayLabel = labelOverride ?? 'Skills';

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

  const renderEntries = (entryDrag?: ReturnType<typeof useEntryDrag>) => (
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
      sectionIndex={sectionIndex}
      dragHandlers={sectionDrag}
      isDragSource={sectionDrag.dragFromIndex === sectionIndex}
      title={displayLabel}
      isHidden={hiddenSections.has('skills')}
      isEmpty={categories.length === 0}
      onToggleVisibility={() => onToggleSection('skills')}
      onAddEntry={() => onAddEntry('skills')}
      addLabel="+ Add skill category"
      readOnly={readOnly}
      onRemoveSection={readOnly ? undefined : () => onRemoveSection?.('skills')}
      renderHeader={readOnly ? undefined : () => (
        <EditableField
          value={displayLabel}
          fieldPath="sectionLabels.skills"
          onFieldChange={onFieldChange}
          placeholder="Skills"
          tag="div"
          className={styles.sectionHeader}
          onInput={onInput}
          readOnly={readOnly}
        />
      )}
    >
      <div className={styles.skillsGrid}>
        {readOnly ? (
          renderEntries()
        ) : (
          <EntryDragContainer onReorder={(from, to) => onReorderEntries('skills', from, to)}>
            {(entryDrag) => renderEntries(entryDrag)}
          </EntryDragContainer>
        )}
      </div>
    </SectionWrapper>
  );
});
