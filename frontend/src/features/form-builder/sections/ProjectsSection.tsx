import React from "react";
import { useDrag } from "../components/useDrag";
import { GripIcon } from "../components/GripIcon";
import { Field } from "../components/Field";
import type { FB } from "../types";
import type { CVFormData } from "../../../types";
import styles from "../CVFormBuilder.module.css";

interface ProjectEntryCardProps {
  proj: NonNullable<CVFormData["projects"]>[0];
  index: number;
  fb: FB;
  dragState: ReturnType<typeof useDrag>;
}

function ProjectEntryCard({
  proj,
  index: i,
  fb,
  dragState: drag,
}: ProjectEntryCardProps) {
  const bulletDrag = useDrag((from, to) =>
    fb.reorderProjectBullets(i, from, to),
  );

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
          value={proj.name}
          onChange={(e) => fb.updateProject(i, { name: e.target.value })}
          placeholder={`Project ${i + 1}`}
        />
        <button
          className={styles.removeBtn}
          onClick={() => fb.removeProject(i)}
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
            value={proj.year}
            onChange={(e) => fb.updateProject(i, { year: e.target.value })}
            placeholder="2024"
          />
        </Field>
        <Field label="Technologies">
          <input
            className={styles.input}
            value={proj.technologies || ""}
            onChange={(e) =>
              fb.updateProject(i, { technologies: e.target.value })
            }
            placeholder="React, Python, PostgreSQL"
          />
        </Field>
      </div>
      <Field label="Description">
        <textarea
          className={`${styles.input} ${styles.textarea}`}
          value={proj.description}
          onChange={(e) => fb.updateProject(i, { description: e.target.value })}
          placeholder="Describe what you built and its impact..."
          rows={3}
        />
      </Field>

      {/* Project bullets */}
      {proj.bullets && proj.bullets.length > 0 && (
        <div className={styles.bulletsSection}>
          <div className={styles.subSectionHeader}>
            <h4>Bullet Points</h4>
            <button
              className={styles.addBtn}
              onClick={() => fb.addProjectBullet(i)}
            >
              + Add
            </button>
          </div>
          {proj.bullets.map((bullet, bi) => (
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
                onChange={(e) => fb.updateProjectBullet(i, bi, e.target.value)}
                placeholder="Describe an achievement or key feature..."
                rows={2}
              />
              {proj.bullets!.length > 1 && (
                <button
                  className={styles.removeBtn}
                  onClick={() => fb.removeProjectBullet(i, bi)}
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
      )}
      {(!proj.bullets || proj.bullets.length === 0) && (
        <button
          className={styles.addBtn}
          onClick={() => fb.addProjectBullet(i)}
          style={{ marginTop: "0.75rem" }}
        >
          + Add Bullet Points
        </button>
      )}
    </div>
  );
}

export const ProjectsSection = React.memo(function ProjectsSection({ fb }: { fb: FB }) {
  const drag = useDrag(fb.reorderProjects);
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Projects</h3>
        <button className={styles.addBtn} onClick={fb.addProject}>
          + Add Project
        </button>
      </div>
      {(fb.formData.projects || []).length === 0 && (
        <p className={styles.emptyState}>
          No projects added yet. Click "Add Project" to get started.
        </p>
      )}
      {(fb.formData.projects || []).map((proj, i) => (
        <ProjectEntryCard
          key={i}
          proj={proj}
          index={i}
          fb={fb}
          dragState={drag}
        />
      ))}
    </section>
  );
});
