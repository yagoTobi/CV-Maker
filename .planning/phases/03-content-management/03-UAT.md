---
status: complete
phase: 03-content-management
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md]
started: 2026-04-04T12:00:00Z
updated: 2026-04-04T12:08:00Z
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

- truth: "Controls should be clearly visible on hover and skills section should be editable without errors"
  status: failed
  reason: "User reported: Controls appear on hover but are tiny and greyed out, barely visible. Clicking/editing in skills section crashes with category.skills.map is not a function"
  severity: blocker
  test: 1
  artifacts: []
  missing: []

- truth: "New entries should have properly spaced date placeholders and skills layout should be single-column and predictable"
  status: failed
  reason: "User reported: Date placeholders joined together (StartPresent, StartEnd, YearAward). Skills section uses confusing two-column layout with unpredictable category placement."
  severity: major
  test: 2
  artifacts: []
  missing: []

- truth: "There should be a visual affordance indicating that pressing Enter adds a new bullet point"
  status: failed
  reason: "User reported: Adding bullets via Enter works but there is no visual hint. Not obvious compared to add buttons on other sections."
  severity: minor
  test: 3
  artifacts: []
  missing: []

- truth: "Confirmation dialog should feel visually integrated with the CV layout, not jarring or overlapping content"
  status: failed
  reason: "User reported: Dialog appears and works but is visually jarring, overlaps content, sticks out like a sore thumb."
  severity: cosmetic
  test: 4
  artifacts: []
  missing: []

- truth: "Skills section layout should remain stable after deleting a category — no column collapse or text wrapping breakage"
  status: failed
  reason: "User reported: Two-column skills layout breaks catastrophically after deletion. Deleting a left-column category causes right column to collapse to single-character-wide vertical text, making the entire skills section unusable."
  severity: blocker
  test: 5
  artifacts: []
  missing: []

- truth: "Controls should be discoverable by new users — the integration with the CV aesthetic shouldn't make them invisible"
  status: failed
  reason: "User reported: Controls are intuitive once seen and well-integrated with Garamond aesthetic, but too small and subtle for new users to discover. Discoverability leans too far toward invisible."
  severity: minor
  test: 8
  artifacts: []
  missing: []
