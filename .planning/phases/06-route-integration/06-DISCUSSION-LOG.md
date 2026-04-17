# Phase 6: Route Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 06-route-integration
**Areas discussed:** Route URL structure, Persistent nav bar, Non-supported templates, Dead code cleanup

---

## Route URL Structure

### Editor URL
| Option | Description | Selected |
|--------|-------------|----------|
| Replace /build/form (Recommended) | DirectEditPage takes over /build/form. All existing links just work without URL changes. /direct-edit removed. | ✓ |
| New URL like /edit | New clean URL for the editor. All navigation updated. | |
| Keep /direct-edit | Current URL stays. All navigation points to /direct-edit. | |

**User's choice:** Replace /build/form
**Notes:** Clean transition — all existing links (Dashboard Open, Template Select) work without changes.

### Build Flow
| Option | Description | Selected |
|--------|-------------|----------|
| Skip template selector (Recommended) | Landing → /build/start → web CV editor directly. Template auto-set. | |
| Keep template selector | Keep 3-step flow. Other templates shown as "Coming soon". | ✓ |
| Merge into one step | Landing → single page combining import/scratch + template. | |

**User's choice:** Keep template selector
**Notes:** Future-proofing. Shows other templates as disabled when ready.

### Non-supported Templates in Selector
| Option | Description | Selected |
|--------|-------------|----------|
| Disabled with "Coming soon" badge (Recommended) | Cards visible but grayed out with label. Only med-length-proff-cv clickable. | ✓ |
| Hidden entirely | Only show med-length-proff-cv. | |
| Clickable but warn | Click any template, get warning. Fallback to form builder. | |

**User's choice:** Disabled with "Coming soon" badge

### Import Route
| Option | Description | Selected |
|--------|-------------|----------|
| Remove /import route (Recommended) | Import only through BuildChoiceScreen or EditorToolbar. /import returns 404. | ✓ |
| Redirect /import to /build/start | Keep as redirect for bookmarked links. | |
| Keep /import as-is | Standalone import page stays. Two ways to import. | |

**User's choice:** Remove /import route

## Persistent Nav Bar

### Research Conducted
Before presenting options, researched UX patterns across CV builders (Canva, FlowCV, Resumake, Reactive Resume) and document editors (Google Docs, Notion, Craft, Overleaf). Key findings:
- Best-in-class use minimal top bar + full-bleed editing surface (5-10% chrome)
- Anti-pattern: persistent sidebar or redundant toolbars
- Single-purpose screens with contextual actions > visible-at-all-times chrome
- Resumake: literally zero chrome beyond editor + Download button

### Editor Chrome Layout
| Option | Description | Selected |
|--------|-------------|----------|
| Single merged bar (Recommended) | One slim bar: logo/nav left, page-specific actions right. Google Docs style. | ✓ |
| Two bars (nav + toolbar) | Separate global nav and page-specific toolbar. More structured but two rows of chrome. | |
| Minimal (no nav bar) | Just EditorToolbar with Back link. Most immersive. Like Resumake. | |

**User's choice:** Single merged bar
**Notes:** User liked the Google Docs-style approach. Wants "focused MS Word for CVs" feel.

### Landing Page Nav Bar
| Option | Description | Selected |
|--------|-------------|----------|
| Landing keeps standalone look (Recommended) | Nav bar only appears after user starts working. Landing has its own branding. | ✓ |
| Nav bar everywhere including landing | Consistent nav on every page including landing. | |

**User's choice:** Landing keeps standalone look

## Non-supported Templates

### Start State for New CV
| Option | Description | Selected |
|--------|-------------|----------|
| Placeholder content (Recommended) | Realistic placeholder text showing template shape. User replaces inline. | ✓ |
| Empty with hints | Empty CV with gray placeholder text per field. | |
| You decide | Claude's discretion. | |

**User's choice:** Placeholder content

## Dead Code Cleanup

### User Clarification
Before answering, user asked three clarifying questions:
1. "Compilation and templating still conserved right?" — Yes, backend untouched.
2. "Liked the original visual theme, is scraping it all good?" — Visual design system stays; only the form-builder UI components are removed.
3. "What about adding custom sections for teachers?" — Already accounted for via additionalSections (Phase 3).

### Removal Approach
| Option | Description | Selected |
|--------|-------------|----------|
| Remove replaced UI code (Recommended) | Delete CVFormBuilder, old editor/ folder, CVImportUpload. Design system and backend untouched. Git history preserves all. | ✓ |
| Keep files, remove routes only | Can't navigate to old UI but files stay (~50K unused). | |
| You decide | Claude's discretion on borderline cases. | |

**User's choice:** Remove replaced UI code

## Additional Navigation Decisions

### New CV Button Destination
| Option | Description | Selected |
|--------|-------------|----------|
| To /build/start (Recommended) | BuildChoiceScreen (import or scratch). Consistent entry point. | ✓ |
| Directly to template selector | Skip choice screen. Faster for scratch users. | |
| Directly to editor (empty CV) | Skip everything. Most aggressive shortcut. | |

**User's choice:** To /build/start

### Tune for a Job Flow
| Option | Description | Selected |
|--------|-------------|----------|
| Go to /apply directly (Recommended) | Dashboard "Tune for a Job" loads base CV and navigates to /apply (3-step flow). | ✓ |
| Go to editor in tune mode | Opens web CV editor with job description sidebar. | |

**User's choice:** Go to /apply directly

## Claude's Discretion
- Nav bar height, spacing, responsive behavior
- "Coming soon" badge visual design
- Nav bar context-switch animation
- Placeholder content text choices
- BuildChoiceScreen import simplification
- Dead code removal ordering
- editor/ barrel export reference cleanup

## Deferred Ideas
- Web templates for deedy-resume and mcdowell-cv — future release
- Per-field AI writing assist — v2
- Undo/redo — v2
- Mobile optimization — out of scope
