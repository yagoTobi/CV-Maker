---
status: partial
phase: 06-route-integration
source: [06-VERIFICATION.md]
started: 2026-04-06T13:00:00Z
updated: 2026-04-06T13:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Complete build flow end-to-end
expected: Landing -> Build Choice -> Template Select -> Web CV Editor -> edit text -> Download PDF works
result: [pending]

### 2. NavBar visibility on working pages
expected: NavBar appears on /dashboard, /build/start, /build, /build/form, /apply but NOT on /
result: [pending]

### 3. NavBar context-specific actions
expected: Editor pages show Import CV + Download PDF + save status; non-editor pages show "+ New CV"
result: [pending]

### 4. Template selector disabled state
expected: Two disabled cards with "Coming soon" badge, one clickable card (med-length-proff-cv)
result: [pending]

### 5. Dashboard Tune for a Job navigation
expected: Clicking "Tune for a Job" navigates to /apply (not /build/form)
result: [pending]

### 6. Dead routes return 404
expected: Visiting /direct-edit or /import shows 404 page
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
