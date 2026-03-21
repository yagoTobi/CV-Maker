import React from "react";
import type { CVFormData } from "../../../types";
import { useDrag } from "../components/useDrag";
import { GripIcon } from "../components/GripIcon";
import { Field } from "../components/Field";
import type { FB, ImportCtx } from "../types";
import styles from "../CVFormBuilder.module.css";

// ─── WorkEntryCard Component ────────────────────────────────────────────────
interface WorkEntryCardProps {
  job: CVFormData["workExperience"][0];
  index: number;
  total: number;
  fb: FB;
  dragState: ReturnType<typeof useDrag>;
  importCtx?: ImportCtx;
}

function WorkEntryCard({
  job,
  index: i,
  total,
  fb,
  dragState: drag,
  importCtx,
}: WorkEntryCardProps) {
  const gc = importCtx?.getConfidence;
  const mr = importCtx?.markReviewed;
  const bulletDrag = useDrag((from, to) => fb.reorderBullets(i, from, to));

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
          value={job.company}
          onChange={(e) => {
            fb.updateWorkEntry(i, { company: e.target.value });
            mr?.(`workExperience[${i}].company`);
          }}
          placeholder={`Company ${i + 1}`}
        />
        {total > 1 && (
          <button
            className={styles.removeBtn}
            onClick={() => fb.removeWorkEntry(i)}
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
        <Field label="Title" required confidence={gc?.(`workExperience[${i}].title`)}>
          <input
            className={styles.input}
            value={job.title}
            onChange={(e) => {
              fb.updateWorkEntry(i, { title: e.target.value });
              mr?.(`workExperience[${i}].title`);
            }}
            placeholder="Software Engineer"
          />
        </Field>
        <Field label="Location" confidence={gc?.(`workExperience[${i}].location`)}>
          <input
            className={styles.input}
            value={job.location}
            onChange={(e) => {
              fb.updateWorkEntry(i, { location: e.target.value });
              mr?.(`workExperience[${i}].location`);
            }}
            placeholder="London, UK"
          />
        </Field>
        <Field label="Start Date" confidence={gc?.(`workExperience[${i}].startDate`)}>
          <input
            className={styles.input}
            value={job.startDate}
            onChange={(e) => {
              fb.updateWorkEntry(i, { startDate: e.target.value });
              mr?.(`workExperience[${i}].startDate`);
            }}
            placeholder="Jan 2022"
          />
        </Field>
        <Field label="End Date" confidence={gc?.(`workExperience[${i}].endDate`)}>
          <input
            className={styles.input}
            value={job.endDate}
            onChange={(e) => {
              fb.updateWorkEntry(i, { endDate: e.target.value });
              mr?.(`workExperience[${i}].endDate`);
            }}
            placeholder="Present"
          />
        </Field>
      </div>
      <div className={styles.bulletsSection}>
        <div className={styles.subSectionHeader}>
          <h4>Bullet Points</h4>
          <button className={styles.addBtn} onClick={() => fb.addBullet(i)}>
            + Add
          </button>
        </div>
        {job.bullets.map((bullet, bi) => (
          <div
            key={bi}
            className={`${styles.bulletRow} ${bulletDrag.dragOver === bi ? styles.bulletRowDragOver : ""}`}
            data-drag-card
            onDragStart={(e) => bulletDrag.onDragStart(e, bi)}
            onDragEnter={(e) => bulletDrag.onDragEnter(e, bi)}
            onDragOver={bulletDrag.onDragOver}
            onDrop={(e) => bulletDrag.onDrop(e, bi)}
            onDragEnd={bulletDrag.onDragEnd}
          >
            <span
              className={styles.bulletDragHandle}
              onMouseDown={bulletDrag.onHandleMouseDown}
              aria-label="Drag to reorder"
            >
              <GripIcon />
            </span>
            <textarea
              className={`${styles.input} ${styles.bulletInput}`}
              value={bullet}
              onChange={(e) => fb.updateBullet(i, bi, e.target.value)}
              placeholder="Describe an achievement or responsibility..."
              rows={2}
            />
            {job.bullets.length > 1 && (
              <button
                className={styles.removeBtn}
                onClick={() => fb.removeBullet(i, bi)}
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
        ))}
      </div>
    </div>
  );
}

// ─── WorkSection Component ──────────────────────────────────────────────────
function WorkSectionRaw({ fb, importCtx }: { fb: FB; importCtx?: ImportCtx }) {
  const drag = useDrag(fb.reorderWorkEntries);
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Work Experience</h3>
        <button className={styles.addBtn} onClick={fb.addWorkEntry}>
          + Add Position
        </button>
      </div>
      {fb.formData.workExperience.map((job, i) => (
        <WorkEntryCard
          key={i}
          job={job}
          index={i}
          total={fb.formData.workExperience.length}
          fb={fb}
          dragState={drag}
          importCtx={importCtx}
        />
      ))}
    </section>
  );
}

export const WorkSection = React.memo(WorkSectionRaw);
