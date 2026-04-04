/**
 * MedLengthTemplate -- Web rendering of the med-length-proff-cv template.
 *
 * Renders the entire CV document with EditableField elements for every text field
 * and EditableBulletList for bullet arrays. CSS matches resume.cls + med-length-proff-cv.tex.j2
 * at ~95% visual fidelity (EDIT-02).
 *
 * Section order follows formData.sectionOrder (or DEFAULT_SECTION_ORDER fallback).
 * Each section is wrapped in SectionWrapper (hover-reveal add button + toggle).
 * Each entry is wrapped in EntryWrapper (hover-reveal delete + optional confirm).
 *
 * Phase 3: SectionWrapper/EntryWrapper integration for CONT-01 through CONT-04.
 */
import { useCallback } from 'react';
import { EditableField } from './EditableField';
import { EditableBulletList } from './EditableBulletList';
import { SectionWrapper } from './SectionWrapper';
import { EntryWrapper } from './EntryWrapper';
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
  onFieldChange: (path: string, value: string | SkillItem[]) => void;
  onBulletAdd: (basePath: string, afterIndex: number) => void;
  onBulletRemove: (basePath: string, index: number) => void;
  onAddEntry: (sectionKey: string) => void;
  onRemoveEntry: (sectionKey: string, index: number) => void;
  onToggleSection: (sectionKey: string) => void;
  hiddenSections: Set<string>;
  onInput?: () => void;
}

export function MedLengthTemplate({
  formData,
  onFieldChange,
  onBulletAdd,
  onBulletRemove,
  onAddEntry,
  onRemoveEntry,
  onToggleSection,
  hiddenSections,
  onInput,
}: MedLengthTemplateProps) {
  const { personalInfo } = formData;
  const sectionOrder = formData.sectionOrder ?? DEFAULT_SECTION_ORDER;

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
      />
      <span className={styles.dateSeparator}>{'\u2013'}</span>
      <EditableField
        value={endDate}
        fieldPath={endPath}
        onFieldChange={onFieldChange}
        placeholder={endPlaceholder}
        className={styles.bold}
        onInput={onInput}
      />
    </span>
  );

  const renderWorkSection = (entries: WorkEntry[]) => {
    return (
      <SectionWrapper
        key="work"
        sectionKey="work"
        title="Experience"
        isHidden={hiddenSections.has('work')}
        isEmpty={entries.length === 0}
        onToggleVisibility={() => onToggleSection('work')}
        onAddEntry={() => onAddEntry('work')}
        addLabel="+ Add work entry"
        headerClassName={styles.sectionHeader}
      >
        {entries.map((job, i) => (
          <EntryWrapper
            key={job.id}
            onDelete={() => onRemoveEntry('work', i)}
            requireConfirm={true}
            confirmMessage={`Delete "${job.company || 'this work entry'}"?`}
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
                />
                <EditableField
                  value={job.location}
                  fieldPath={`workExperience[${i}].location`}
                  onFieldChange={onFieldChange}
                  placeholder="Location"
                  className={styles.italic}
                  onInput={onInput}
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
              />
            </div>
          </EntryWrapper>
        ))}
      </SectionWrapper>
    );
  };

  const renderEducationSection = (entries: EducationEntry[]) => {
    return (
      <SectionWrapper
        key="education"
        sectionKey="education"
        title="Education"
        isHidden={hiddenSections.has('education')}
        isEmpty={entries.length === 0}
        onToggleVisibility={() => onToggleSection('education')}
        onAddEntry={() => onAddEntry('education')}
        addLabel="+ Add education"
        headerClassName={styles.sectionHeader}
      >
        {entries.map((edu, i) => {
          const hasItems = !!(edu.gpa || edu.details.length > 0);
          if (hasItems) {
            return (
              <EntryWrapper
                key={edu.id}
                onDelete={() => onRemoveEntry('education', i)}
                requireConfirm={true}
                confirmMessage={`Delete "${edu.school || 'this education entry'}"?`}
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
                    />
                    <EditableField
                      value={edu.location}
                      fieldPath={`education[${i}].location`}
                      onFieldChange={onFieldChange}
                      placeholder="Location"
                      className={styles.italic}
                      onInput={onInput}
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
                    />
                  )}
                </div>
              </EntryWrapper>
            );
          }
          // Simple layout: no GPA, no details
          return (
            <EntryWrapper
              key={edu.id}
              onDelete={() => onRemoveEntry('education', i)}
              requireConfirm={true}
              confirmMessage={`Delete "${edu.school || 'this education entry'}"?`}
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
                  />
                  <EditableField
                    value={edu.location}
                    fieldPath={`education[${i}].location`}
                    onFieldChange={onFieldChange}
                    placeholder="Location"
                    className={styles.italic}
                    onInput={onInput}
                  />
                </div>
              </div>
            </EntryWrapper>
          );
        })}
      </SectionWrapper>
    );
  };

  const renderSkillsSection = (categories: SkillCategory[]) => {
    return (
      <SectionWrapper
        key="skills"
        sectionKey="skills"
        title="Skills"
        isHidden={hiddenSections.has('skills')}
        isEmpty={categories.length === 0}
        onToggleVisibility={() => onToggleSection('skills')}
        onAddEntry={() => onAddEntry('skills')}
        addLabel="+ Add skill category"
        headerClassName={styles.sectionHeader}
      >
        <div className={styles.skillsGrid}>
          {categories.map((cat, i) => (
            <EntryWrapper
              key={cat.id}
              onDelete={() => onRemoveEntry('skills', i)}
              requireConfirm={false}
              gridItem
            >
              <SkillCategoryRow
                category={cat}
                index={i}
                onFieldChange={onFieldChange}
                onSkillsTextChange={handleSkillsTextChange}
                onInput={onInput}
              />
            </EntryWrapper>
          ))}
        </div>
      </SectionWrapper>
    );
  };

  const renderProjectsSection = (entries: Project[]) => {
    return (
      <SectionWrapper
        key="projects"
        sectionKey="projects"
        title="Projects"
        isHidden={hiddenSections.has('projects')}
        isEmpty={entries.length === 0}
        onToggleVisibility={() => onToggleSection('projects')}
        onAddEntry={() => onAddEntry('projects')}
        addLabel="+ Add project"
        headerClassName={styles.sectionHeader}
      >
        {entries.map((proj, i) => (
          <EntryWrapper
            key={proj.id}
            onDelete={() => onRemoveEntry('projects', i)}
            requireConfirm={true}
            confirmMessage={`Delete "${proj.name || 'this project'}"?`}
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
                />
                {proj.year !== undefined && (
                  <EditableField
                    value={proj.year}
                    fieldPath={`projects[${i}].year`}
                    onFieldChange={onFieldChange}
                    placeholder="Year"
                    onInput={onInput}
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
                />
              )}
            </div>
          </EntryWrapper>
        ))}
      </SectionWrapper>
    );
  };

  const renderAwardsSection = (entries: Award[]) => {
    return (
      <SectionWrapper
        key="awards"
        sectionKey="awards"
        title="Awards"
        isHidden={hiddenSections.has('awards')}
        isEmpty={entries.length === 0}
        onToggleVisibility={() => onToggleSection('awards')}
        onAddEntry={() => onAddEntry('awards')}
        addLabel="+ Add award"
        headerClassName={styles.sectionHeader}
      >
        <div className={styles.awardsGrid}>
          {entries.map((award, i) => (
            <EntryWrapper
              key={award.id}
              onDelete={() => onRemoveEntry('awards', i)}
              requireConfirm={true}
              confirmMessage={`Delete "${award.title || 'this award'}"?`}
              gridItem
            >
              <AwardRow
                award={award}
                index={i}
                onFieldChange={onFieldChange}
                onInput={onInput}
              />
            </EntryWrapper>
          ))}
        </div>
      </SectionWrapper>
    );
  };

  const renderAdditionalSection = (asec: AdditionalSection, sectionIdx: number) => {
    const sectionKey = `additional-${sectionIdx}`;
    return (
      <SectionWrapper
        key={sectionKey}
        sectionKey={sectionKey}
        title={asec.title || 'Additional Section'}
        isHidden={hiddenSections.has(sectionKey)}
        isEmpty={asec.entries.length === 0}
        onToggleVisibility={() => onToggleSection(sectionKey)}
        onAddEntry={() => onAddEntry(sectionKey)}
        addLabel="+ Add entry"
        renderHeader={() => (
          <EditableField
            value={asec.title}
            fieldPath={`additionalSections[${sectionIdx}].title`}
            onFieldChange={onFieldChange}
            placeholder="Section Title"
            tag="div"
            className={styles.sectionHeader}
            onInput={onInput}
          />
        )}
      >
        {asec.entries.map((entry, entryIdx) => {
          const hasItems = !!(entry.bullets.length > 0 || entry.description);
          if (hasItems) {
            return (
              <EntryWrapper
                key={entry.id}
                onDelete={() => onRemoveEntry(sectionKey, entryIdx)}
                requireConfirm={true}
                confirmMessage={`Delete "${entry.title || 'this entry'}"?`}
              >
                <div className={styles.subsection}>
                  <div className={styles.subsectionLine1}>
                    <EditableField
                      value={entry.title}
                      fieldPath={`additionalSections[${sectionIdx}].entries[${entryIdx}].title`}
                      onFieldChange={onFieldChange}
                      placeholder="Entry Title"
                      className={styles.bold}
                      onInput={onInput}
                    />
                    {(entry.startDate !== undefined || entry.endDate !== undefined) &&
                      renderDateRange(
                        entry.startDate ?? '',
                        entry.endDate ?? '',
                        `additionalSections[${sectionIdx}].entries[${entryIdx}].startDate`,
                        `additionalSections[${sectionIdx}].entries[${entryIdx}].endDate`
                      )
                    }
                  </div>
                  <div className={styles.subsectionLine2}>
                    {entry.subtitle !== undefined && (
                      <EditableField
                        value={entry.subtitle ?? ''}
                        fieldPath={`additionalSections[${sectionIdx}].entries[${entryIdx}].subtitle`}
                        onFieldChange={onFieldChange}
                        placeholder="Subtitle"
                        className={styles.italic}
                        onInput={onInput}
                      />
                    )}
                    {entry.location !== undefined && (
                      <EditableField
                        value={entry.location ?? ''}
                        fieldPath={`additionalSections[${sectionIdx}].entries[${entryIdx}].location`}
                        onFieldChange={onFieldChange}
                        placeholder="Location"
                        className={styles.italic}
                        onInput={onInput}
                      />
                    )}
                  </div>
                  {entry.description && (
                    <EditableField
                      value={entry.description}
                      fieldPath={`additionalSections[${sectionIdx}].entries[${entryIdx}].description`}
                      onFieldChange={onFieldChange}
                      placeholder="Description..."
                      tag="div"
                      onInput={onInput}
                    />
                  )}
                  {entry.bullets.length > 0 && (
                    <EditableBulletList
                      bullets={entry.bullets}
                      basePath={`additionalSections[${sectionIdx}].entries[${entryIdx}].bullets`}
                      onBulletChange={(bi, text) =>
                        onFieldChange(
                          `additionalSections[${sectionIdx}].entries[${entryIdx}].bullets[${bi}]`,
                          text
                        )
                      }
                      onBulletAdd={(afterIdx) =>
                        onBulletAdd(
                          `additionalSections[${sectionIdx}].entries[${entryIdx}].bullets`,
                          afterIdx
                        )
                      }
                      onBulletRemove={(bi) =>
                        onBulletRemove(
                          `additionalSections[${sectionIdx}].entries[${entryIdx}].bullets`,
                          bi
                        )
                      }
                      onInput={onInput}
                    />
                  )}
                </div>
              </EntryWrapper>
            );
          }
          // Simple layout: no bullets, no description
          return (
            <EntryWrapper
              key={entry.id}
              onDelete={() => onRemoveEntry(sectionKey, entryIdx)}
              requireConfirm={true}
              confirmMessage={`Delete "${entry.title || 'this entry'}"?`}
            >
              <div className={styles.additionalSimple}>
                <div className={styles.subsectionLine1}>
                  <EditableField
                    value={entry.title}
                    fieldPath={`additionalSections[${sectionIdx}].entries[${entryIdx}].title`}
                    onFieldChange={onFieldChange}
                    placeholder="Entry Title"
                    className={styles.bold}
                    onInput={onInput}
                  />
                  {(entry.startDate !== undefined || entry.endDate !== undefined) &&
                    renderDateRange(
                      entry.startDate ?? '',
                      entry.endDate ?? '',
                      `additionalSections[${sectionIdx}].entries[${entryIdx}].startDate`,
                      `additionalSections[${sectionIdx}].entries[${entryIdx}].endDate`
                    )
                  }
                </div>
                <div className={styles.subsectionLine2}>
                  {entry.subtitle !== undefined && (
                    <EditableField
                      value={entry.subtitle ?? ''}
                      fieldPath={`additionalSections[${sectionIdx}].entries[${entryIdx}].subtitle`}
                      onFieldChange={onFieldChange}
                      placeholder="Subtitle"
                      className={styles.italic}
                      onInput={onInput}
                    />
                  )}
                  {entry.location !== undefined && (
                    <EditableField
                      value={entry.location ?? ''}
                      fieldPath={`additionalSections[${sectionIdx}].entries[${entryIdx}].location`}
                      onFieldChange={onFieldChange}
                      placeholder="Location"
                      className={styles.italic}
                      onInput={onInput}
                    />
                  )}
                </div>
              </div>
            </EntryWrapper>
          );
        })}
      </SectionWrapper>
    );
  };

  // --- Section loop (mirrors tex.j2 section_order loop) ---

  const renderSection = (sec: string) => {
    if (sec === 'work') {
      return renderWorkSection(formData.workExperience);
    }
    if (sec === 'education') {
      return renderEducationSection(formData.education);
    }
    if (sec === 'skills') {
      return renderSkillsSection(formData.skills);
    }
    if (sec === 'projects') {
      return renderProjectsSection(formData.projects ?? []);
    }
    if (sec === 'awards') {
      return renderAwardsSection(formData.awards ?? []);
    }
    if (sec.startsWith('additional-')) {
      const idx = parseInt(sec.split('-')[1], 10);
      const additionalSections = formData.additionalSections ?? [];
      if (idx < additionalSections.length) {
        return renderAdditionalSection(additionalSections[idx], idx);
      }
    }
    return null;
  };

  return (
    <div className={styles.template}>
      {/* Personal Info Header */}
      <EditableField
        value={personalInfo.fullName}
        fieldPath="personalInfo.fullName"
        onFieldChange={onFieldChange}
        tag="h1"
        className={styles.name}
        placeholder="Your Name"
        onInput={onInput}
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
        />
      )}

      {/* Section loop */}
      {sectionOrder.map(renderSection)}
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
      />
      <EditableField
        value={skillsText}
        fieldPath={`skills[${index}].skillsText`}
        onFieldChange={handleSkillsBlur}
        placeholder="Skill 1, Skill 2, Skill 3"
        className={styles.skillValues}
        onInput={onInput}
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
}: {
  award: Award;
  index: number;
  onFieldChange: (path: string, value: string | SkillItem[]) => void;
  onInput?: () => void;
}) {
  return (
    <>
      <EditableField
        value={award.year}
        fieldPath={`awards[${index}].year`}
        onFieldChange={onFieldChange}
        placeholder="Year"
        onInput={onInput}
      />
      <span>
        <EditableField
          value={award.title}
          fieldPath={`awards[${index}].title`}
          onFieldChange={onFieldChange}
          placeholder="Award Title"
          onInput={onInput}
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
            />
          </>
        )}
      </span>
    </>
  );
}
