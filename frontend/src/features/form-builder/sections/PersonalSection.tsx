import React from "react";
import { DEFAULT_PERSONAL_ORDER } from "../../../hooks/useFormBuilder";
import { deriveLinkLabel } from "../../../utils/deriveLinkLabel";
import { useDrag } from "../components/useDrag";
import { GripIcon } from "../components/GripIcon";
import { Field } from "../components/Field";
import type { FB, ImportCtx } from "../types";
import styles from "../CVFormBuilder.module.css";

const PERSONAL_FIELD_META: Record<string, { label: string }> = {
  phone: { label: "Phone" },
  email: { label: "Email" },
  location: { label: "Location" },
  links: { label: "Links" },
};
function PersonalSectionRaw({ fb, importCtx }: { fb: FB; importCtx?: ImportCtx }) {
  const p = fb.formData.personalInfo;
  const personalOrder = (p.personalOrder ?? DEFAULT_PERSONAL_ORDER) as string[];
  const headerDrag = useDrag(fb.reorderPersonalFields);

  const gc = importCtx?.getConfidence;
  const mr = importCtx?.markReviewed;

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Personal Information</h3>
      <div className={styles.formGrid}>
        <Field label="Full Name" required confidence={gc?.("personalInfo.fullName")}>
          <input
            className={styles.input}
            value={p.fullName}
            onChange={(e) => {
              fb.updatePersonalInfo({ fullName: e.target.value });
              mr?.("personalInfo.fullName");
            }}
            placeholder="Jane Smith"
          />
        </Field>
        <Field label="Email" required confidence={gc?.("personalInfo.email")}>
          <input
            className={styles.input}
            type="email"
            value={p.email}
            onChange={(e) => {
              fb.updatePersonalInfo({ email: e.target.value });
              mr?.("personalInfo.email");
            }}
            placeholder="jane@example.com"
          />
        </Field>
        <Field label="Phone" confidence={gc?.("personalInfo.phone")}>
          <input
            className={styles.input}
            value={p.phone}
            onChange={(e) => {
              fb.updatePersonalInfo({ phone: e.target.value });
              mr?.("personalInfo.phone");
            }}
            placeholder="+44 7700 000000"
          />
        </Field>
        <Field label="Location" confidence={gc?.("personalInfo.location")}>
          <input
            className={styles.input}
            value={p.location}
            onChange={(e) => {
              fb.updatePersonalInfo({ location: e.target.value });
              mr?.("personalInfo.location");
            }}
            placeholder="London, UK"
          />
        </Field>
      </div>

      {/* Summary / intro paragraph */}
      <div className={styles.summaryField}>
        <Field label="Summary">
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            value={p.summary || ""}
            onChange={(e) => fb.updatePersonalInfo({ summary: e.target.value })}
            placeholder="Motivated software engineer with 5+ years of experience..."
            rows={3}
          />
        </Field>
      </div>

      {/* Header line order */}
      <div className={styles.headerOrderSection}>
        <div className={styles.subSectionHeader}>
          <h4>Header Line Order</h4>
        </div>
        <p className={styles.hint}>
          Drag to reorder how items appear on your CV header.
        </p>
        <div className={styles.headerOrderChips}>
          {personalOrder.map((fieldKey, i) => {
            const meta = PERSONAL_FIELD_META[fieldKey];
            if (!meta) return null;
            const hasValue =
              fieldKey === "links"
                ? p.links.length > 0
                : fieldKey === "phone"
                  ? !!p.phone
                  : fieldKey === "email"
                    ? !!p.email
                    : !!p.location;
            return (
              <div
                key={fieldKey}
                className={`${styles.headerChip} ${!hasValue ? styles.headerChipEmpty : ""} ${headerDrag.dragOver === i ? styles.headerChipDragOver : ""}`}
                data-drag-card
                onMouseDown={headerDrag.onHandleMouseDown}
                onDragStart={(e) => headerDrag.onDragStart(e, i)}
                onDragEnter={(e) => headerDrag.onDragEnter(e, i)}
                onDragOver={headerDrag.onDragOver}
                onDrop={(e) => headerDrag.onDrop(e, i)}
                onDragEnd={headerDrag.onDragEnd}
              >
                <GripIcon />
                <span>{meta.label}</span>
                {fieldKey === "links" && p.links.length > 0 && (
                  <span className={styles.chipCount}>{p.links.length}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Links — URL only, label auto-derived */}
      <div className={styles.subSection}>
        <div className={styles.subSectionHeader}>
          <h4>Links</h4>
          <button className={styles.addBtn} onClick={fb.addLink}>
            + Add Link
          </button>
        </div>
        {p.links.map((link, i) => (
          <div key={i} className={styles.linkItem}>
            <input
              className={styles.input}
              value={link.url}
              onChange={(e) => {
                const url = e.target.value;
                fb.updateLink(i, "url", url);
                fb.updateLink(i, "label", deriveLinkLabel(url));
              }}
              placeholder="https://github.com/username"
            />
            <span className={styles.linkLabelBadge}>
              {deriveLinkLabel(link.url)}
            </span>
            <button
              className={styles.removeBtn}
              onClick={() => fb.removeLink(i)}
              title="Remove link"
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
    </section>
  );
}

export const PersonalSection = React.memo(PersonalSectionRaw);

