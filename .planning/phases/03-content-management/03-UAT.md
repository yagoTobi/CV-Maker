---
status: diagnosed
phase: 03-content-management
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md]
started: 2026-04-04T12:00:00Z
updated: 2026-04-04T12:15:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Hover to reveal section controls
expected: On the direct-edit page, hover over any section header (e.g., Work Experience, Education). An "add entry" button and a "hide/show" toggle icon appear near the section header.
result: issue
reported: "Controls appear on hover but are tiny and greyed out, barely visible. Also clicking/editing in the skills section causes a crash: category.skills.map is not a function"
severity: blocker

### 2. Add a new entry via the add button
expected: Click the "add" button revealed on a section (e.g., Work Experience). A new blank entry appears in that section with editable fields (company, title, dates, bullets). The new entry is ready for inline editing.
result: issue
reported: "Entry does appear but date placeholders are joined together with no space: 'StartPresent' for work, 'StartEnd' for education, 'YearAward' for awards. Skills section uses a confusing two-column layout where new categories land in unpredictable columns."
severity: major

### 3. Add a new bullet point within an entry
expected: Click into an existing bullet point text and press Enter. A new empty bullet point appears directly below. There is a clear visual affordance indicating you can add bullets (e.g., a placeholder, icon, or visual cue).
result: issue
reported: "Adding bullets via Enter works, but there is no visual affordance or hint that Enter adds a new bullet. Not obvious compared to the add buttons on other sections."
severity: minor

### 4. Delete a major entry (with confirmation)
expected: Hover over a work experience, education, or project entry. A delete (X) button appears. Click it. An inline confirmation dialog appears near the button asking to confirm deletion. Click "Delete" to remove the entry.
result: issue
reported: "Confirmation dialog appears and deletion works, but the dialog is visually jarring — overlaps content, sticks out like a sore thumb. Needs visual polish to feel integrated with the CV layout."
severity: cosmetic

### 5. Delete a skills category (no confirmation)
expected: Hover over a skills category entry. A delete button appears. Click it. The skills category is removed immediately without a confirmation dialog.
result: issue
reported: "Delete button appears and works with no confirmation (correct), but the two-column skills layout breaks catastrophically after deletion. Deleting a left-column category causes the right column to collapse to single-character-wide vertical text, making the entire skills section unusable."
severity: blocker

### 6. Toggle section visibility
expected: Click the eye icon on a section header. The section's content (all entries) collapses/hides. The icon changes to indicate the section is hidden. Click again to restore visibility.
result: pass

### 7. Empty section shows add button without hover
expected: If a section has no entries (or all entries were deleted), the "add entry" button is visible at full opacity without needing to hover.
result: pass

### 8. Control size and discoverability
expected: The add, delete, and toggle controls are appropriately sized and positioned — clearly visible when revealed by hover, not tiny or hard to click. Controls feel intuitive to discover and use.
result: issue
reported: "Controls are intuitive once you see them, and well-integrated with the CV's Garamond aesthetic. But everything is so small and subtle that new users would struggle to discover the controls exist at all. Discoverability-vs-integration tradeoff leans too far toward invisible."
severity: minor

## Summary

total: 8
passed: 2
issues: 6
pending: 0
skipped: 0

## Gaps

- truth: "Skills section should be editable without crash errors"
  status: failed
  reason: "User reported: Clicking/editing in skills section crashes with category.skills.map is not a function"
  severity: blocker
  test: 1
  root_cause: "handleSkillsTextChange in MedLengthTemplate.tsx line 76 wraps updatedSkills in JSON.stringify() before passing to onFieldChange. setAtPath stores the string instead of the array. On next render, category.skills is a string, not an array, so .map() crashes."
  artifacts:
    - path: "frontend/src/features/direct-edit/components/MedLengthTemplate.tsx"
      issue: "JSON.stringify(updatedSkills) on line 76 — should pass raw array"
    - path: "frontend/src/utils/formDataPatch.ts"
      issue: "setAtPath accepts unknown but skills path needs array value support (already works if string removed)"
  missing:
    - "Remove JSON.stringify() wrapper so onFieldChange receives actual SkillItem[] array"
  debug_session: .planning/debug/skills-crash-on-edit.md

- truth: "Skills section layout should remain stable after deleting a category"
  status: failed
  reason: "User reported: Two-column skills layout breaks catastrophically after deletion — right column collapses to single-character-wide vertical text"
  severity: blocker
  test: 5
  root_cause: "EntryWrapper inserts a <div class='entryWrap'> around each SkillCategoryRow, breaking the CSS grid cell pattern. .skillsGrid expects direct children to be alternating label/value cells (grid-template-columns: auto 1fr), but EntryWrapper wraps both into one div. When categories are deleted, remaining cells redistribute incorrectly, causing auto column to consume all width and 1fr to collapse."
  artifacts:
    - path: "frontend/src/features/direct-edit/components/MedLengthTemplate.tsx"
      issue: "Lines 421-439: EntryWrapper wrapping SkillCategoryRow inside skillsGrid breaks grid children"
    - path: "frontend/src/features/direct-edit/components/MedLengthTemplate.module.css"
      issue: "Lines 126-131: skillsGrid expects flat cell children, gets wrapper divs"
    - path: "frontend/src/features/direct-edit/components/EntryWrapper.tsx"
      issue: "Line 47: wrapping div breaks grid cell expectations"
  missing:
    - "Make EntryWrapper grid-transparent (display: contents) or restructure skills to use per-row sub-grids"
    - "Same fix needed for awardsGrid which has identical structural bug"
  debug_session: .planning/debug/skills-layout-break.md

- truth: "New entries should have properly spaced date placeholders"
  status: failed
  reason: "User reported: Date placeholders joined — StartPresent, StartEnd, YearAward with no separator"
  severity: major
  test: 2
  root_cause: "Two causes: (1) renderDateRange conditionally renders en-dash separator with (startDate || endDate) — both empty strings are falsy, so separator never renders for new entries. (2) Awards: EntryWrapper wraps AwardRow fragment in a div, breaking awardsGrid cell layout so year and title have no grid gap between them."
  artifacts:
    - path: "frontend/src/features/direct-edit/components/MedLengthTemplate.tsx"
      issue: "Line 173: (startDate || endDate) conditional hides separator for empty dates"
    - path: "frontend/src/features/direct-edit/components/MedLengthTemplate.module.css"
      issue: "Line 106: .dateRange has no fallback spacing when separator absent"
    - path: "frontend/src/features/direct-edit/components/EntryWrapper.tsx"
      issue: "Wrapper div breaks grid layout for awards (same as skills issue)"
  missing:
    - "Always render date separator regardless of field values, or add CSS gap to .dateRange"
    - "Fix EntryWrapper grid transparency for awardsGrid"
  debug_session: .planning/debug/date-placeholder-spacing.md

- truth: "There should be a visual affordance indicating that pressing Enter adds a new bullet point"
  status: failed
  reason: "User reported: No visual hint for Enter-to-add-bullet"
  severity: minor
  test: 3
  root_cause: "No hint mechanism exists. EditableBulletList.tsx handles Enter on line 55 but renders no tooltip, title attribute, or footer hint. Placeholder reads 'Describe an achievement...' with no keyboard shortcut indication. Missing feature, not a styling bug."
  artifacts:
    - path: "frontend/src/features/direct-edit/components/EditableBulletList.tsx"
      issue: "No hint/tooltip for Enter-to-add behavior"
    - path: "frontend/src/features/direct-edit/components/EditableBulletList.module.css"
      issue: "No hint styles exist"
  missing:
    - "Add subtle hint below last bullet (e.g., muted text 'Press Enter to add' on focus)"
  debug_session: .planning/debug/ux-discoverability.md

- truth: "Confirmation dialog should feel visually integrated with the CV layout"
  status: failed
  reason: "User reported: Dialog is visually jarring, overlaps content, sticks out"
  severity: cosmetic
  test: 4
  root_cause: "ConfirmDialog uses position: absolute; top: 0; right: -20px anchored to EntryWrapper's relative container, overlapping CV content. Shadow is minimal (shadow-sm), no backdrop/overlay, IBM Plex Sans 13px clashes with EB Garamond, no entrance animation."
  artifacts:
    - path: "frontend/src/features/direct-edit/components/ConfirmDialog.module.css"
      issue: "Absolute positioning overlaps content, minimal shadow, no backdrop"
    - path: "frontend/src/features/direct-edit/components/ConfirmDialog.tsx"
      issue: "No backdrop element, no entrance animation"
  missing:
    - "Restyle dialog: stronger shadow, backdrop, entrance animation, better positioning"
  debug_session: .planning/debug/ux-discoverability.md

- truth: "Controls should be discoverable by new users"
  status: failed
  reason: "User reported: Controls too small and subtle for new users to discover despite being well-integrated"
  severity: minor
  test: 8
  root_cause: "All hover-reveal controls share undersized styling: SVG icons 14-16px, color var(--text-muted) = #94A3B8 (lightest text color), no background/border, minimal 2-4px padding, hit targets ~18px. opacity 0->1 transition reveals controls that are already barely visible."
  artifacts:
    - path: "frontend/src/features/direct-edit/components/SectionWrapper.module.css"
      issue: ".toggleButton 16px icon, #94A3B8, 2px padding; .addButton 11pt, opacity 0"
    - path: "frontend/src/features/direct-edit/components/EntryWrapper.module.css"
      issue: ".deleteButton 14px icon, #94A3B8, 2px padding"
  missing:
    - "Increase icon sizes to 18-20px, use --text-secondary instead of --text-muted, add subtle background on hover, increase padding"
  debug_session: .planning/debug/ux-discoverability.md
