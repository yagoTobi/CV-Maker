import React from "react";
import { useDrag } from "../components/useDrag";
import { GripIcon } from "../components/GripIcon";
import { Field } from "../components/Field";
import type { FB } from "../types";
import styles from "../CVFormBuilder.module.css";

function SkillsSectionRaw({ fb }: { fb: FB }) {
  const drag = useDrag(fb.reorderSkillCategories);
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Skills</h3>
        <button className={styles.addBtn} onClick={fb.addSkillCategory}>
          + Add Category
        </button>
      </div>
      <p className={styles.hint}>
        Enter skills as a comma-separated list within each category.
      </p>
      {fb.formData.skills.map((cat, i) => (
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
              value={cat.category}
              onChange={(e) =>
                fb.updateSkillCategory(i, { category: e.target.value })
              }
              placeholder={`Category ${i + 1}`}
            />
            {fb.formData.skills.length > 1 && (
              <button
                className={styles.removeBtn}
                onClick={() => fb.removeSkillCategory(i)}
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
          <Field label="Skills (comma-separated)">
            <input
              className={styles.input}
              value={cat.skills.join(", ")}
              onChange={(e) => fb.updateSkillsText(i, e.target.value)}
              placeholder="Python, TypeScript, Go"
            />
          </Field>
        </div>
      ))}
    </section>
  );
}

export const SkillsSection = React.memo(SkillsSectionRaw);
