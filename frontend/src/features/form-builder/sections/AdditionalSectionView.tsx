import React from "react";
import { useDrag } from "../components/useDrag";
import { GripIcon } from "../components/GripIcon";
import { Field } from "../components/Field";
import type { FB } from "../types";
import type { CVFormData } from "../../../types";
import styles from "../CVFormBuilder.module.css";

interface AdditionalEntryCardProps {
  entry: NonNullable<CVFormData["additionalSections"]>[0]["entries"][0];
  sectionIndex: number;
  entryIndex: number;
  fb: FB;
}

function AdditionalEntryCard({
  entry,
  sectionIndex,
  entryIndex: ei,
  fb,
}: AdditionalEntryCardProps) {
  const bulletDrag = useDrag((from, to) =>
    fb.reorderAdditionalEntryBullets(sectionIndex, ei, from, to),
  );

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <input
          className={`${styles.input} ${styles.cardLabelInput}`}
          value={entry.title}
          onChange={(e) =>
            fb.updateAdditionalEntry(sectionIndex, ei, {
              title: e.target.value,
            })
          }
          placeholder={`Entry ${ei + 1}`}
        />
        <button
          className={styles.removeBtn}
          onClick={() => fb.removeAdditionalEntry(sectionIndex, ei)}
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
        <Field label="Subtitle">
          <input
            className={styles.input}
            value={entry.subtitle || ""}
            onChange={(e) =>
              fb.updateAdditionalEntry(sectionIndex, ei, {
                subtitle: e.target.value,
              })
            }
            placeholder="Subtitle (optional)"
          />
        </Field>
        <Field label="Start Date">
          <input
            className={styles.input}
            value={entry.startDate || ""}
            onChange={(e) =>
              fb.updateAdditionalEntry(sectionIndex, ei, {
                startDate: e.target.value,
              })
            }
            placeholder="Jan 2022"
          />
        </Field>
        <Field label="End Date">
          <input
            className={styles.input}
            value={entry.endDate || ""}
            onChange={(e) =>
              fb.updateAdditionalEntry(sectionIndex, ei, {
                endDate: e.target.value,
              })
            }
            placeholder="Dec 2023"
          />
        </Field>
        <Field label="Location">
          <input
            className={styles.input}
            value={entry.location || ""}
            onChange={(e) =>
              fb.updateAdditionalEntry(sectionIndex, ei, {
                location: e.target.value,
              })
            }
            placeholder="Location"
          />
        </Field>
      </div>

      <Field label="Description">
        <textarea
          className={`${styles.input} ${styles.textarea}`}
          value={entry.description || ""}
          onChange={(e) =>
            fb.updateAdditionalEntry(sectionIndex, ei, {
              description: e.target.value,
            })
          }
          placeholder="Description (optional)"
          rows={2}
        />
      </Field>

      <div className={styles.bulletsSection}>
        <div className={styles.subSectionHeader}>
          <h4>Bullet Points</h4>
          <button
            className={styles.addBtn}
            onClick={() => fb.addAdditionalEntryBullet(sectionIndex, ei)}
          >
            + Add
          </button>
        </div>
        {entry.bullets.map((bullet, bi) => (
          <div
            key={bullet.id}
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
              value={bullet.text}
              onChange={(e) =>
                fb.updateAdditionalEntryBullet(
                  sectionIndex,
                  ei,
                  bi,
                  e.target.value,
                )
              }
              placeholder="Describe an achievement or detail..."
              rows={2}
            />
            {entry.bullets.length > 1 && (
              <button
                className={styles.removeBtn}
                onClick={() =>
                  fb.removeAdditionalEntryBullet(sectionIndex, ei, bi)
                }
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

export const AdditionalSectionView = React.memo(function AdditionalSectionView({
  fb,
  sectionIndex,
}: {
  fb: FB;
  sectionIndex: number;
}) {
  const section = fb.formData.additionalSections?.[sectionIndex];

  if (!section) return null;

  // Drag-and-drop for entries not yet implemented
  // const drag = useDrag((from, to) => {
  //   // Reorder entries within this section
  // });

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.additionalSectionTitleWrapper}>
          <input
            className={`${styles.input} ${styles.additionalSectionTitleInput}`}
            value={section.title}
            onChange={(e) =>
              fb.updateAdditionalSectionTitle(sectionIndex, e.target.value)
            }
            placeholder="Section Title"
          />
        </div>
        <button
          className={styles.removeSectionBtn}
          onClick={() => fb.removeAdditionalSection(sectionIndex)}
        >
          Remove Section
        </button>
      </div>

      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
          Entries
        </h3>
        <button
          className={styles.addBtn}
          onClick={() => fb.addAdditionalEntry(sectionIndex)}
        >
          + Add Entry
        </button>
      </div>

      {section.entries.length === 0 && (
        <p className={styles.emptyState}>
          No entries yet. Click "Add Entry" to get started.
        </p>
      )}

      {section.entries.map((entry, ei) => (
        <AdditionalEntryCard
          key={ei}
          entry={entry}
          sectionIndex={sectionIndex}
          entryIndex={ei}
          fb={fb}
        />
      ))}
    </section>
  );
});
