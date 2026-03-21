import React from "react";
import { useDrag } from "../components/useDrag";
import { GripIcon } from "../components/GripIcon";
import { Field } from "../components/Field";
import type { FB } from "../types";
import styles from "../CVFormBuilder.module.css";

export const AwardsSection = React.memo(function AwardsSection({ fb }: { fb: FB }) {
  const drag = useDrag(fb.reorderAwards);
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Awards & Achievements</h3>
        <button className={styles.addBtn} onClick={fb.addAward}>
          + Add Award
        </button>
      </div>
      {(fb.formData.awards || []).length === 0 && (
        <p className={styles.emptyState}>No awards added yet.</p>
      )}
      {(fb.formData.awards || []).map((award, i) => (
        <div
          key={i}
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
              value={award.title}
              onChange={(e) => fb.updateAward(i, { title: e.target.value })}
              placeholder={`Award ${i + 1}`}
            />
            <button
              className={styles.removeBtn}
              onClick={() => fb.removeAward(i)}
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
          <div className={styles.formGrid}>
            <Field label="Year">
              <input
                className={styles.input}
                value={award.year}
                onChange={(e) => fb.updateAward(i, { year: e.target.value })}
                placeholder="2023"
              />
            </Field>
            <Field label="Description">
              <input
                className={styles.input}
                value={award.description || ""}
                onChange={(e) =>
                  fb.updateAward(i, { description: e.target.value })
                }
                placeholder="Brief description (optional)"
              />
            </Field>
          </div>
        </div>
      ))}
    </section>
  );
});
