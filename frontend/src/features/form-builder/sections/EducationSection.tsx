import React from "react";
import type { CVFormData } from "../../../types";
import { useDrag } from "../components/useDrag";
import { GripIcon } from "../components/GripIcon";
import { Field } from "../components/Field";
import type { FB, ImportCtx } from "../types";
import styles from "../CVFormBuilder.module.css";

// ─── EducationEntryCard Component ───────────────────────────────────────────
interface EducationEntryCardProps {
  edu: CVFormData["education"][0];
  index: number;
  total: number;
  fb: FB;
  dragState: ReturnType<typeof useDrag>;
  importCtx?: ImportCtx;
}

function EducationEntryCard({
  edu,
  index: i,
  total,
  fb,
  dragState: drag,
  importCtx,
}: EducationEntryCardProps) {
  const gc = importCtx?.getConfidence;
  const mr = importCtx?.markReviewed;
  const detailDrag = useDrag((from, to) => fb.reorderEduDetails(i, from, to));

  return (
    <div
      className={`${styles.card} ${drag.dragOver === i ? styles.cardDragOver : ""}`}
      data-drag-card
      onDragStart={(e) => drag.onDragStart(e, i)}
      onDragEnter={(e) => drag.onDragEnter(e, i)}
      onDragOver={drag.onDragOver}
      onDrop={(e) => drag.onDrop(e, i)}
      onDragEnd={drag.onDragEnd}
    >
      <div className={styles.cardHeader}>
        <span
          className={styles.cardDragHandle}
          onMouseDown={drag.onHandleMouseDown}
        >
          <GripIcon />
        </span>
        <input
          className={`${styles.input} ${styles.cardLabelInput}`}
          value={edu.school}
          onChange={(e) => {
            fb.updateEducationEntry(i, { school: e.target.value });
            mr?.(`education[${i}].school`);
          }}
          placeholder={`Institution ${i + 1}`}
        />
        {total > 1 && (
          <button
            className={styles.removeBtn}
            onClick={() => fb.removeEducationEntry(i)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
      <div className={styles.formGrid}>
        <Field label="Degree" required confidence={gc?.(`education[${i}].degree`)}>
          <input
            className={styles.input}
            value={edu.degree}
            onChange={(e) => {
              fb.updateEducationEntry(i, { degree: e.target.value });
              mr?.(`education[${i}].degree`);
            }}
            placeholder="BSc Computer Science"
          />
        </Field>
        <Field label="GPA" confidence={gc?.(`education[${i}].gpa`)}>
          <input
            className={styles.input}
            value={edu.gpa || ""}
            onChange={(e) => {
              fb.updateEducationEntry(i, { gpa: e.target.value });
              mr?.(`education[${i}].gpa`);
            }}
            placeholder="3.8 / 4.0"
          />
        </Field>
        <Field label="Start Date" confidence={gc?.(`education[${i}].startDate`)}>
          <input
            className={styles.input}
            value={edu.startDate}
            onChange={(e) => {
              fb.updateEducationEntry(i, { startDate: e.target.value });
              mr?.(`education[${i}].startDate`);
            }}
            placeholder="Sep 2019"
          />
        </Field>
        <Field label="End Date" confidence={gc?.(`education[${i}].endDate`)}>
          <input
            className={styles.input}
            value={edu.endDate}
            onChange={(e) => {
              fb.updateEducationEntry(i, { endDate: e.target.value });
              mr?.(`education[${i}].endDate`);
            }}
            placeholder="Jun 2023"
          />
        </Field>
        <Field label="Location" confidence={gc?.(`education[${i}].location`)}>
          <input
            className={styles.input}
            value={edu.location}
            onChange={(e) => {
              fb.updateEducationEntry(i, { location: e.target.value });
              mr?.(`education[${i}].location`);
            }}
            placeholder="Oxford, UK"
          />
        </Field>
      </div>
      <div className={styles.bulletsSection}>
        <div className={styles.subSectionHeader}>
          <h4>Notable Details</h4>
          <button className={styles.addBtn} onClick={() => fb.addEduDetail(i)}>
            + Add
          </button>
        </div>
        {edu.details.map((detail, di) => (
          <div
            key={di}
            className={`${styles.bulletRow} ${detailDrag.dragOver === di ? styles.bulletRowDragOver : ""}`}
            data-drag-card
            onDragStart={(e) => detailDrag.onDragStart(e, di)}
            onDragEnter={(e) => detailDrag.onDragEnter(e, di)}
            onDragOver={detailDrag.onDragOver}
            onDrop={(e) => detailDrag.onDrop(e, di)}
            onDragEnd={detailDrag.onDragEnd}
          >
            <span
              className={styles.bulletDragHandle}
              onMouseDown={detailDrag.onHandleMouseDown}
              aria-label="Drag to reorder"
            >
              <GripIcon />
            </span>
            <input
              className={styles.input}
              value={detail}
              onChange={(e) => fb.updateEduDetail(i, di, e.target.value)}
              placeholder="Thesis, honours, coursework..."
            />
            <button
              className={styles.removeBtn}
              onClick={() => fb.removeEduDetail(i, di)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── EducationSection Component ─────────────────────────────────────────────
function EducationSectionRaw({ fb, importCtx }: { fb: FB; importCtx?: ImportCtx }) {
  const drag = useDrag(fb.reorderEducationEntries);
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Education</h3>
        <button className={styles.addBtn} onClick={fb.addEducationEntry}>
          + Add Entry
        </button>
      </div>
      {fb.formData.education.map((edu, i) => (
        <EducationEntryCard
          key={i}
          edu={edu}
          index={i}
          total={fb.formData.education.length}
          fb={fb}
          dragState={drag}
          importCtx={importCtx}
        />
      ))}
    </section>
  );
}

export const EducationSection = React.memo(EducationSectionRaw);
