# Phase 13: Inline Tune Highlights — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-22
**Phase:** 13-inline-tune-highlights-grammarly-style-review-with-gap-promp
**Areas discussed:** JD intake + rail behavior, Gap Prompt midpoint, Highlight visual language, Popover content + nav, Persistent UI (score, save, dismiss)

---

## Area 1 — JD Intake + Rail Behavior

### Q1.1: Where do Tune setup inputs (company, role, JD paste) live?

| Option | Description | Selected |
|--------|-------------|----------|
| Floating modal/dialog on click | Centered modal opens on click, submit closes, AI runs | |
| Slim right rail (panel slides in) | Right side panel slides in. JD inputs at top. Closes/collapses after submit | ✓ |
| Top dropdown / sheet from NavBar | Sheet from top with inputs | |
| Inline overlay on the CV itself | Inputs render as a card overlaying the CV | |

**User's choice:** Slim right rail.

### Q1.2: After JD submitted, what does the right rail do?

| Option | Description | Selected |
|--------|-------------|----------|
| Collapses fully — CV gets full width | Rail slides away, all controls move to top toolbar | |
| Shrinks to thin sidebar with score+nav | Narrow strip with score, counter, prev/next, save | ✓ (deferred — see Q1.3) |
| Stays full-width with summary content | Keeps showing JD summary (collapsed), score, gap chips | |

**User's response:** "I think that it should shrink, but if we do the follow up questions after the JD has essentially been scanned, then surely it would be benefitial for it to stay, if we can ask follow-up questions for chips? to answer? So if for example, the JD asks something about speaking languages, and the user hasn't included it, that could be asked there, before providing a recommendation. Right?"
**Resolved:** Rail STAYS full during Gap Prompt step (between JD-submit and AI-tune). Shrinks only AFTER AI returns suggestions and review begins.

### Q1.3: During highlight-review phase, what does the rail do?

| Option | Description | Selected |
|--------|-------------|----------|
| Shrinks to thin sidebar | ~80-120px strip; popover anchors to highlights | ✓ |
| Stays full — rail = command center | Persistent home for score, gap chips, dismiss list | |
| Closes entirely | All controls in NavBar/floating; most Grammarly-like | |

**User's choice:** "You decide :) I'm leaning towards shrinking, but whatever is best." → Shrinks (best of both: persistent score/nav/save without crowding CV).

### Q1.4: Can shrunk rail re-expand?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — click to re-expand | Chevron, can edit gap chips and re-run tune | ✓ |
| No — one-shot until close+reopen | Simpler state | |

**User's choice:** Yes — click to re-expand.

### Q1.5: What happens to accepted/skipped on re-tune?

| Option | Description | Selected |
|--------|-------------|----------|
| Wipe all — fresh suggestion set | Cleanest, user loses progress | |
| Confirm dialog before re-run | "Re-running will discard X accepted changes" | ✓ |
| Keep accepted, refresh remaining | Complex but preserves work | |

**User's choice:** Confirm dialog before re-run.

---

## Area 2 — Gap Prompt Midpoint

### Q2.1: What populates Gap Prompt chips?

| Option | Description | Selected |
|--------|-------------|----------|
| AI-prefilled from JD analysis | Backend scans JD, returns gap topics | |
| Match-analysis 'missing' list as chips | Reuse existing `missing[]` array | ✓ |
| Blank — user types freely | Empty input, freeform | |
| Hybrid: missing[] chips + freeform | missing[] chips + 'Add anything else?' below | |

**User's choice:** Match-analysis missing[] as chips. Reasoning: "less necessary code, right? It just allows us to improve the feedback we're going to include in the error corrections."

### Q2.2: Per-chip interaction?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes/No tri-state (default Skip) | Explicit truth signal | |
| Click chip to expand input field | Click → inline input opens for detail | ✓ |
| Checkbox + textarea for detail | Most form-like | |

**User's choice:** Click chip to expand input field.

### Q2.3: Skip allowed?

| Option | Description | Selected |
|--------|-------------|----------|
| Skip allowed — 'Run tune' always enabled | Gap Prompt purely additive | ✓ |
| Soft skip — two CTAs | "Skip and tune" + "Submit gaps and tune" | |
| Forced engagement — must click each | Highest data quality, highest friction | |

**User's choice:** Skip allowed — 'Run tune' always enabled.

### Q2.4: How do gap data flow into AI tune call?

| Option | Description | Selected |
|--------|-------------|----------|
| Append to JD as 'Additional context' | Frontend concatenates into jobDescription | |
| New optional `userClarifications` field | New Pydantic field, prompt explicitly references | ✓ |
| Inject into CVFormData additionalSections | Treat as virtual CV content | |

**User's response:** "Yes, but why would we concatenate it, into the JD? If the additional comparison comes from the user. Surely it would be included in the userClarifications? I'm not really sure what the optimal path is to do this, since idk how the comparison is actually directly invoked."
**Claude clarification:** match-analysis vs tailor are separate endpoints. Cleanest: separate `userClarifications` field on `/tailor/suggest-changes`. Prompt updated to treat them as user-confirmed truth.
**User's choice:** New optional `userClarifications` field.

### Q2.5: Re-run match-analysis with clarifications?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — separate field, update prompt | Cleanest separation | ✓ |
| Yes — but ALSO re-run match-analysis | More accurate score, double work | |

**User's response:** "Yes, but wouldn't it make sense for the chips to appear first, then have the user decide, and then apply the comparison clarification?"
**Resolved:** Pipeline confirmed: match-analysis runs ONCE on JD submit (gives baseline + chips). Then user fills chips. Then suggest-changes runs with clarifications. No re-run of match-analysis.

---

## Area 3 — Highlight Visual Language

### Q3.1: How are severity tiers determined?

| Option | Description | Selected |
|--------|-------------|----------|
| AI returns severity per change | New `severity` field, prompt change | |
| Inferred from changeType + size | Frontend computes from diff size | ✓ |
| Inferred from match-analysis overlap | Strong if addresses missing[] | |

**User's choice:** Inferred from changeType + size.

### Q3.2: Inline visual encoding?

| Option | Description | Selected |
|--------|-------------|----------|
| Squiggle underlines per type, color-coded | Strong: red squiggle. Minor: blue squiggle. Add: green [+] icon. Delete: red strikethrough. Active = solid bg tint. | ✓ |
| Solid background tint, opacity by severity | Heavier visually | |
| Underline only, color-coded | Cleanest but less distinguishable | |

**User's choice:** Squiggle underlines per type, color-coded.

### Q3.3: Edit during review?

| Option | Description | Selected |
|--------|-------------|----------|
| Lock highlighted regions — read-only | Simplest, prevents conflicts | |
| Editable but typing dismisses highlight | First keystroke auto-dismisses (skips) | ✓ |
| Editable + highlight tracks edits | Most flexible, hardest to implement | |

**User's choice:** Editable but typing dismisses highlight.

### Q3.4: How does Add render?

| Option | Description | Selected |
|--------|-------------|----------|
| Ghost-text placeholder | Greyed italic ghost text inline | ✓ |
| Insertion marker icon only | Small green [+] only | |
| Inserted as faint full content | Pre-rendered with opacity 0.5 | |

**User's choice:** Ghost-text placeholder.

---

## Area 4 — Popover Content + Nav

### Q4.1: Popover anchoring?

| Option | Description | Selected |
|--------|-------------|----------|
| Floating below/above (auto-flip) | Anchored to highlight, auto-flip | ✓ |
| Fixed floating card top-right | Less context, no overlap | |
| Inline expansion below the line | Causes layout shift | |

**User's choice:** Floating below/above (auto-flip).

### Q4.2: Popover contents?

| Option | Description | Selected |
|--------|-------------|----------|
| Section badge + Before/After + Accept/Skip + Prev/Next | Standard expanded | |
| Above + alternatives chip row | Includes alt chips | |
| Compact: short rationale + buttons | Smallest popover | (chosen for minor only) |

**User's response:** "I think that most of them should be compact, unless they require a big change, or there would be a large benefit from removing or swapping out a section."
**Resolved:** Severity drives variant — compact for minor, expanded (with alt chips when present) for strong/add/delete.

### Q4.3: Confirm severity-driven layout?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — severity drives popover variant | Two layouts, PopoverCompact + PopoverExpanded | ✓ |
| Always expanded — consistency wins | Uniform but heavier | |

**User's choice:** Severity drives popover variant.

### Q4.4: Navigation?

| Option | Description | Selected |
|--------|-------------|----------|
| Click-only — click highlight to open | Simplest | |
| Click + keyboard arrows | Power user friendly | ✓ |
| Auto-scroll on Prev/Next | Most guided | |

**User's choice:** Click + keyboard arrows.

### Q4.5: Per-highlight popover or persistent wizard?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-highlight tooltip (one open at a time) | Classic Grammarly | ✓ |
| Single persistent popover wizard | Always visible, more wizard-like | |

**User's response:** "but isn't there just one popover, per highlight of text? that we show one at a time, when clicking there?"
**User's choice:** Per-highlight tooltip.

### Q4.6: After Accept/Skip — auto-advance?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-close — user picks next | Less momentum, more control | |
| Auto-advance — close current, open next | Continuous flow, scrolls CV smoothly | ✓ |
| Stay open with applied state + manual Next | Explicit step | |

**User's choice:** Auto-advance — close current, open next.

---

## Area 5 — Persistent UI (Score, Save, Dismiss)

### Q5.1: Score circle + change counter location?

| Option | Description | Selected |
|--------|-------------|----------|
| Top of shrunk rail | Everything in one place | |
| NavBar pill | Score in nav next to CV name | |
| Floating score card top-right | Independent of rail, always visible | ✓ |

**User's choice:** Floating score card top-right.

### Q5.2: Save Tailored CV CTA location?

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom of shrunk rail | Sticky button | |
| Inside floating score card | One persistent floating UI | |
| NavBar primary action | Replace "Tune for Job" during review | ✓ |

**User's choice:** NavBar primary action.

### Q5.3: Section-level dismiss control?

| Option | Description | Selected |
|--------|-------------|----------|
| Section header chevron during review | Contextual on section | |
| Right-click highlight → 'Skip all in section' | Discoverable via interaction | |
| Section list in shrunk rail | Compact list with skip per section | ✓ (Claude's call) |

**User's response:** "You decide the most intuitive version."
**Claude's reasoning:** Section list in rail is most discoverable, gives overview, lets user skip a section before reviewing any of its highlights.

### Q5.4: Post-save UX?

| Option | Description | Selected |
|--------|-------------|----------|
| Carry Phase 12 D-12 — 2-button prompt | View Dashboard / Keep Editing | |
| Auto-dismiss highlights, stay on editor | Toast + clear, no prompt | |
| Auto-navigate to scoped Dashboard | Phase 8 original | |

**User's response:** "It would be cool, to have it either be to tune for a different JD, or take them to the original CV, or to the dashboard. Bear in mind, that after editing the tuned CV, there might be some changes they might want to apply to the original CV."
**Resolved:** 3-option prompt — "Tune for another job" / "Back to original CV" / "View in Dashboard". Promote-tuned-changes-to-base captured in deferred.

### Q5.5: Confirm 3-option + defer promote-to-base?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — 3 options + defer promote-to-base | Captured in deferred | ✓ |
| Add promote-to-base now | More complex, needs picker UI | |

**User's choice:** Yes — 3 options + defer promote-to-base.

---

## Claude's Discretion

- Floating-ui library choice for popover positioning.
- Squiggle underline rendering technique (SVG vs CSS wavy vs background gradient).
- Ghost-text placeholder rendering inside contentEditable.
- Section list layout in shrunk rail (vertical vs grouped).
- Re-run-tune confirm dialog wording.
- Severity-diff threshold tuning (50% starting point).
- Animation/transition timings for rail shrink, popover open/close, auto-advance scroll.
- Score card placement details (offset, z-index, mobile fallback).
- Where the post-save 3-option prompt renders (modal vs inline banner).
- Whether to keep `useScrollSync` hook (likely removable).

## Deferred Ideas

- **Promote tuned changes back to base CV.** Future capability — needs UI to pick promotable changes, conflict resolution vs base CV, separate API path.
- **AI-driven severity labeling.** Severity field on `TailorChange` populated by AI for higher accuracy. Gated on whether client-side inference proves wrong often enough.
- **Re-run match-analysis with userClarifications.** More accurate post-clarification baseline. Gated on whether locked baseline confuses users.
- **Highlight support for additional templates.** med-length-proff-cv only in Phase 13. deedy-resume + mcdowell-cv in a future template-expansion phase.
