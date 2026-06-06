# Phase 13: Inline Tune Highlights — Grammarly-style review with gap prompt midpoint - Context

**Gathered:** 2026-05-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the side-panel TunePanel/ChangePanel/ChangeCard review UI with a Grammarly-style inline experience: tune setup happens in a slide-in right rail, a midpoint **Gap Prompt** lets the user clarify missing skills/experiences before the AI runs tune, and AI-suggested changes render as inline highlights directly on the CV. The user reviews changes via per-highlight popovers (Before/After + Accept/Skip + auto-advance), navigates with click + keyboard arrows, and can dismiss entire sections at once. Save Tailored CV becomes a NavBar action enabled when ≥1 change is accepted.

This phase does NOT include: promoting tuned changes back to the base CV, multi-template support for highlights (med-length-proff-cv only), AI-driven severity labeling (severity inferred client-side).

</domain>

<decisions>
## Implementation Decisions

### Tune Setup Surface (replaces TunePanel)

- **D-01:** Click "Tune for Job" → slim **right rail slides in**. Rail holds JD setup inputs (company, role, JD textarea) at the top during the entire pre-tune flow. TunePanel.tsx, ChangePanel.tsx, ChangeCard.tsx are removed.
- **D-02:** Save-as-base gate from Phase 11 carries forward. If `activeVersion` is null when Tune is opened, the rail prompts "Save as Base CV" first — same gate logic as Phase 8 Tier 1, just rendered in this rail. Then JD inputs.
- **D-03:** Rail width remains **full during JD input AND Gap Prompt steps** so the user can fill chips without crowding. Only after AI returns suggestions does the rail shrink.

### Gap Prompt (midpoint between JD submit and AI tune)

- **D-04:** Gap Prompt source = **match-analysis `missing[]` array**. Reuses existing `POST /chat/match-analysis` data — no new endpoint, no new prompt for chip generation. Each missing requirement renders as a chip.
- **D-05:** Chip UX: **click chip → inline input field expands** below it. User types detail (e.g., chip "Spanish fluency" → user types "Native, lived in Madrid 3 years"). Chips with input become `userClarifications`. Untouched chips are ignored.
- **D-06:** Skip allowed: **'Run tune' is always enabled** — Gap Prompt is purely additive. Power users can submit JD and immediately run tune.
- **D-07:** Wiring: add new optional `userClarifications: List[str]` field to `POST /tailor/suggest-changes` request model. NOT concatenated into JD — clean separation between "what the job wants" (jobDescription) and "what the user has confirmed" (userClarifications). Backend prompt (`TAILOR_SUGGEST_PROMPT`) updated to treat clarifications as user-confirmed truth and prefer "add" changes for them.
- **D-08:** Pipeline ordering:
  1. User submits JD → frontend calls `match-analysis` → returns `match_score` (baseline) + `missing[]` (chip seeds)
  2. Rail renders chips. User fills/skips.
  3. User clicks "Run tune" → frontend calls `tailor/suggest-changes` with `userClarifications`
  4. AI returns `changes[]` → highlights render on CV
  5. **No re-run of match-analysis with clarifications.** Baseline score is locked at JD-submit time.

### Rail Behavior During Review

- **D-09:** Once AI returns suggestions and the first highlight is rendered, the rail **shrinks to a thin sidebar** (~100-140px). Shrunk rail contents: section list with per-section change counts and skip buttons (`Work (3) [skip]`, `Skills (2) [skip]`), prev/next nav, change counter (`3 of 12 reviewed`).
- **D-10:** Shrunk rail is **re-expandable via chevron**. Re-expanding reveals JD summary, Gap Prompt chips (still editable), and a "Re-run tune" button.
- **D-11:** **Re-running tune mid-review** triggers a confirm dialog: "Re-running will discard your X accepted changes. Continue?" — only proceeds on confirm.

### Highlight Visual Language (inline on CV)

- **D-12:** **Severity is inferred client-side** from `changeType` + text-diff size. Rules: `add` and `remove` → **strong**; `modify` with >50% character-level diff → **strong**; `modify` with ≤50% diff → **minor**. No backend prompt change. No new field on `TailorChange`. Severity computed on-the-fly in the highlight renderer.
- **D-13:** Inline rendering uses **squiggle underlines, color-coded** per type:
  - Strong-modify: red squiggle
  - Minor-modify: blue squiggle
  - Add: small green `[+]` icon at insertion point + ghost-text preview (D-15)
  - Delete: red strikethrough on the doomed text
- **D-14:** Active highlight (popover open) gets a **solid tinted background** over the change region, in addition to the squiggle. Idle (non-active) highlights show the squiggle only — never a tinted background.
- **D-15:** Add-type changes render as **ghost-text placeholder**: greyed-out italic ghost text inline at the insertion point showing the proposed addition. Click ghost → popover with Accept/Skip. Accept = ghost solidifies into real CV content. Skip = ghost dismissed, no CV change.
- **D-16:** **Editable during review with auto-dismiss**: CV stays contentEditable. First keystroke inside a highlighted region **auto-dismisses (skips) that highlight** and restores normal text. This is the manual-override path — user can always reject AI by typing through it.

### Popover (per-highlight tooltip)

- **D-17:** **Per-highlight popover pattern** (Grammarly classic). One popover instance, anchored to the active highlight via floating-ui auto-flip (below preferred, flips above near viewport bottom). Pointer arrow points to highlight. Clicking another highlight closes current and opens new.
- **D-18:** **Popover layout adapts to severity**:
  - **Minor severity** → **compact popover**: section badge + one-line description + inline diff (red strike + green new on a single line) + `[Skip] [Accept] [Next]` row.
  - **Strong, add, delete** → **expanded popover**: section badge + description + alternatives chip row (when `TailorChange.alternatives.length > 0`) + Before block (red-tinted) + After block (green-tinted) + `[Skip] [Accept] [← →]` row.
- **D-19:** **Navigation**: click any highlight to open. When popover is open, **Left/Right arrow keys** = Prev/Next, **Esc** = close, **Enter** = Accept. Mouse: Prev/Next buttons in footer.
- **D-20:** **Auto-advance after Accept/Skip**: action applies, current popover closes, smoothly auto-scrolls CV to next highlight in document order, opens popover there. Continuous review flow. Reaching the last change → popover stays closed; user gets feedback in floating score card (D-21).

### Persistent UI During Review

- **D-21:** **Floating score card** anchored top-right of CV viewport. Independent of rail. Contents: score circle (`72%`), delta line (`↑ +8 pts est.`), change counter (`3 of 12 reviewed`). Always visible during review.
- **D-22:** **Save Tailored CV is a NavBar primary action**. During review, the NavBar's "Tune for Job" button is replaced by "Save Tailored CV" with accept count: `Save Tailored CV (3 accepted)`. Disabled when 0 accepted; enabled at ≥1 accepted (Phase 13 success criterion 6).
- **D-23:** **Section-level dismiss = section list in shrunk rail** (D-09). Most discoverable: visible without hovering, gives overview of where changes live, lets user skip a section before reviewing any of its highlights. Header-chevron version is invisible until hover and clutters CV; right-click is undiscoverable.
- **D-24:** **All-reviewed state**: when `pendingCount === 0` (all changes accepted or skipped), the floating score card adds a small banner row: "All N changes reviewed. Save tailored CV to lock it in." Reuses Phase 12 D-13 concept, relocated from rail to floating card.

### Post-Save Flow

- **D-25:** On successful Save Tailored CV, show **prompt with 3 options**: "Tune for another job" (resets rail to JD intake on the SAME base CV — keeps user in editor), "Back to original CV" (loads `parentVersionId` base CV in editor), "View in Dashboard" (navigate to /dashboard scoped to the base CV group, like Phase 8 D-12 originally). Replaces Phase 12's 2-option prompt.

### Carry-Forward Decisions (locked from prior phases)

- **D-26 (from Phase 11 D-07):** NavBar breadcrumb during tune: `[base CV name] / [company]`. Preserved unchanged. Once `companyName` is filled in JD inputs, breadcrumb updates live.
- **D-27 (from Phase 11 D-01-D-04):** Name-on-create + auto-save in-place is a hard prerequisite — `activeVersion` non-null is required before tune setup completes. Tune flow does NOT bypass the name prompt.
- **D-28 (from Phase 12 D-01-D-04):** Match score fix (`setBaselineScore` exposure on `useTailor`) carries forward. Score in floating card uses the fixed pipeline. `useTailor` hook is preserved — only the rendering layer (TunePanel/ChangePanel/ChangeCard) is replaced.

### Claude's Discretion

- Floating-ui library choice for popover positioning (`@floating-ui/react` or hand-rolled).
- Squiggle underline rendering technique: SVG sprite, CSS `text-decoration: wavy`, or background-image gradient. Whichever gives best fidelity across browsers.
- Ghost-text placeholder rendering: contentEditable-safe span vs absolutely-positioned overlay.
- Section list layout in shrunk rail (vertical stack vs grouped by status).
- Re-run-tune confirm dialog wording.
- Exact severity-diff threshold (50% is starting point; tune for usability).
- Animation/transition timings for rail shrink, popover open/close, auto-advance scroll.
- Score card placement details (offset from edge, z-index, mobile fallback if any).
- Where the post-save 3-option prompt renders (modal vs inline banner over score card).
- Whether to keep `useScrollSync` hook (was for ChangePanel sync — likely removable).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Components being replaced (delete after migration)
- `frontend/src/features/direct-edit/components/TunePanel.tsx` — current 3-tier panel; replaced by right-rail TuneRail
- `frontend/src/features/direct-edit/components/TunePanel.module.css`
- `frontend/src/features/direct-edit/components/ChangePanel.tsx` — current side panel; replaced by inline highlights + popover
- `frontend/src/features/direct-edit/components/ChangePanel.module.css`
- `frontend/src/features/direct-edit/components/ChangeCard.tsx` — current card UI; replaced by ChangePopover
- `frontend/src/features/direct-edit/components/ChangeCard.module.css`

### Components extending (modify)
- `frontend/src/features/direct-edit/components/MedLengthTemplate.tsx` — add highlight rendering layer wrapping EditableField/EditableBulletList output
- `frontend/src/features/direct-edit/components/EditableField.tsx` — accept optional `highlightSpans` prop for squiggle overlay
- `frontend/src/features/direct-edit/components/EditableBulletList.tsx` — same; plus support add-type ghost bullets and delete-type strikethrough
- `frontend/src/components/NavBar.tsx` — swap "Tune for Job" button for "Save Tailored CV" during review; preserve breadcrumb (Phase 11 D-07)
- `frontend/src/contexts/EditorActionsContext.tsx` — extend with tune review state (`isReviewing`, `acceptedCount`, `onSaveTailored`)
- `frontend/src/hooks/useTailor.ts` — preserve state machine; expose helpers needed for inline highlight rendering (already has `setBaselineScore` from Phase 12)
- `frontend/src/utils/formDataPatch.ts` — `applyTailorChanges`, `fieldPathToSection` reused as-is

### Backend (modify)
- `backend/routes/tailor.py` — add `userClarifications: Optional[List[str]] = None` to request Pydantic model
- `backend/prompts/cv_agent.py` — `TAILOR_SUGGEST_PROMPT`: add section explaining `userClarifications` are user-confirmed truth, prefer `add` changes that surface them
- `backend/routes/chat.py` — `/match-analysis` is unchanged; consumers shift but endpoint signature stays the same

### Frontend services
- `frontend/src/services/api.ts` — `suggestTailorChanges` signature gains optional `userClarifications: string[]` param

### New components (create)
- `frontend/src/features/direct-edit/components/TuneRail.tsx` — slim slide-in right rail (replaces TunePanel)
- `frontend/src/features/direct-edit/components/TuneRail.module.css`
- `frontend/src/features/direct-edit/components/GapPromptChips.tsx` — chip list with click-to-expand input
- `frontend/src/features/direct-edit/components/ChangeHighlight.tsx` — inline highlight wrapper (squiggle + active tint)
- `frontend/src/features/direct-edit/components/ChangePopover.tsx` — per-highlight popover (compact + expanded variants)
- `frontend/src/features/direct-edit/components/ScoreCard.tsx` — floating top-right score card
- `frontend/src/features/direct-edit/components/PostSavePrompt.tsx` — 3-option post-save prompt
- `frontend/src/features/direct-edit/hooks/useChangeHighlights.ts` — maps `TailorChange[]` to DOM ranges + tracks active change ID

### Types
- `frontend/src/types/index.ts` §145-164 — `TailorChange`, `TailorAlternative`, `TailorResponse` (no schema change required for severity since inferred client-side; may add `userClarifications` to `TailorRequest` if/when typed)

### Design system
- `frontend/src/styles/variables.css` — `--error-light`, `--success-light`, `--accent`, severity-tier color tokens may need additions

### Prior context (carry-forward locks)
- `.planning/phases/11-cv-save-identity-name-on-create-iterate-in-place/11-CONTEXT.md` — name-on-create gate, NavBar breadcrumb (D-07)
- `.planning/phases/12-refine-tuning-ux-fix-match-score-redesign-change-cards-simpl/12-CONTEXT.md` — match score fix (D-01), Before/After block visual language (D-05/D-06)
- `.planning/phases/08-streamlined-tune-flow-save-as-base-prompt-inline-tune-panel-/08-CONTEXT.md` — original 3-tier inline tune semantics, save-as-base gating

### Codebase maps
- `docs/ARCHITECTURE.md` — context split, EditorActionsContext, direct-edit feature dir
- `CLAUDE.md` — CSS Modules + variable system, useCallback/useMemo patterns
- `docs/ARCHITECTURE.md` § "Direct-Edit Feature Directory" — direct-edit components co-location

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useTailor` hook (`frontend/src/hooks/useTailor.ts`): state machine for accept/skip/undo/applyAll/baselineScore is fully reusable. Phase 12 already exposed `setBaselineScore`. Only the rendering layer changes.
- `applyTailorChanges` + `fieldPathToSection` (`frontend/src/utils/formDataPatch.ts`): path resolution and section mapping unchanged — feeds both highlight placement and section list.
- `MatchAnalysis.missing[]` returned by `/chat/match-analysis`: existing array of missing-from-CV requirements. Becomes the Gap Prompt chip seed source — no new backend work for chip generation.
- `EditorActionsContext`: already carries `isTuning`, `saveStatus`, breadcrumb props. Extending it for `isReviewing`/`acceptedCount`/`onSaveTailored` follows the same pattern.
- `NamePromptDialog` (Phase 11 component): may be reused for the "Save as Base CV" gate inside the rail, OR the rail can render an equivalent inline form. Pick whichever fits rail width.
- `TailorChange.alternatives[]` and `selectedAlternatives` from useTailor: already wired. Render in expanded popover only when `alternatives.length > 0`.
- CSS variables `--error-light`/`--success-light` already used in Phase 12: ready for the Before/After tinted blocks in expanded popover.

### Established Patterns
- CSS Modules + design tokens, no inline styles.
- `useCallback` for all hook returns; `useMemo` for derived values; pure-renderer components fed via props.
- Component-per-file with co-located `.module.css`.
- Floating UI / popover pattern is NEW to the codebase — no existing dropdown component to reuse for popover positioning. Choose `@floating-ui/react` (small, well-maintained) or hand-roll.
- Drag-and-drop pattern (Phase 4) shows how to add overlay/handle elements without breaking contentEditable. Highlight overlay layer should follow similar non-intrusive positioning rules.

### Integration Points
- `MedLengthTemplate` is the single CV template that rendering hooks attach to. Highlight layer wraps the existing EditableField/EditableBulletList children rather than replacing them.
- `useAutoSave` (Phase 11): unchanged. Auto-save still PATCHes the active version while user accepts/skips changes inline.
- `TunePanel`'s navigation/state side-effects (set `isTuning`, surface `companyName`/`role` for breadcrumb) move to `TuneRail`. NavBar breadcrumb subscription via EditorActionsContext stays the same.
- `ApplyToJobScreen` was deleted in Phase 8 D-08 — no /apply route work needed beyond the existing redirect to /build/form.
- Match-analysis is called by `useTailor`'s consumer (currently TunePanel.handleAnalyze). The new TuneRail.handleAnalyze becomes the caller. Pre-fetch behavior at the JD-submit boundary is the same.

### Risks / things to validate during planning
- Inline ghost-text inside contentEditable: cursor/selection edge cases. May need a non-editable span with carefully managed boundaries.
- Squiggle underline rendering across line wraps: `text-decoration: wavy` works for single-color underlines but each color tier may need an SVG fallback for fidelity.
- Auto-advance scroll + popover close+reopen: the active highlight may be in a different section. Smooth scroll + popover reposition timing matters for perceived continuity.
- `userClarifications` prompt impact on tailor latency: clarifications add tokens; verify Haiku 4.5 still hits the sub-2s target from Phase 5 AI-06.
- Severity inference (>50% diff threshold) is a guess — usability test in plan-phase visual checkpoint.

</code_context>

<specifics>
## Specific Ideas

- User reasoning on rail-stays-then-shrinks: "if we do follow-up questions after the JD has been scanned... could be asked there, before providing a recommendation. Right? — for example, the JD asks something about speaking languages, and the user hasn't included it." Captured in D-04..D-07 as the `userClarifications` flow seeded from `missing[]`.
- User reasoning on userClarifications field: "why would we concatenate it into the JD? If the additional comparison comes from the user. Surely it would be included in the userClarifications?" — captured in D-07 (separate field, not JD concatenation).
- User reasoning on chip ordering: "wouldn't it make sense for the chips to appear first, then have the user decide, and then apply the comparison clarification?" — captured in D-08 pipeline ordering.
- User reasoning on popover variants: "most of them should be compact, unless they require a big change, or there would be a large benefit from removing or swapping out a section" — captured in D-12 (severity inference) + D-18 (compact for minor, expanded for strong/add/delete).
- User reasoning on post-save: "either to tune for a different JD, or take them to the original CV, or to the dashboard. Bear in mind, that after editing the tuned CV, there might be some changes they might want to apply to the original CV." — captured in D-25 (3 options) + Deferred (promote-to-base).

</specifics>

<deferred>
## Deferred Ideas

- **Promote tuned changes back to base CV**: user noted "after editing the tuned CV, there might be some changes they might want to apply to the original CV." Belongs in a future phase — needs UI to pick which accepted changes get promoted, conflict-resolution logic vs current base CV, and a separate API path. Not in Phase 13 scope.
- **AI-driven severity labeling**: D-12 infers severity client-side from changeType + diff size. A future phase could add a `severity` field on `TailorChange` populated by the AI itself for higher accuracy — when match-analysis quality data shows the inference is wrong often enough.
- **Re-run match-analysis with userClarifications**: D-08 locks the baseline score at JD-submit. A future phase could refine the baseline post-clarification (more accurate "before" score) — gated on whether users find the locked baseline confusing.
- **Highlight support for additional templates**: med-length-proff-cv only in Phase 13. deedy-resume and mcdowell-cv highlight rendering belongs in a future template-expansion phase.
- **Substring-level highlight offsets**: D-13 mandates inline severity highlights; Phase 13 MVP wraps the entire field (whole `EditableField` / `EditableBulletList` item gets the squiggle/tint). Pixel-precise substring offsets (Grammarly-style mid-sentence underline that targets only the changed words) deferred to a future phase pending UX validation of field-level granularity. Rationale: keeps `useChangeHighlights` consumer logic simple, lets the visual-checkpoint validate whether field-level granularity reads correctly across the four severity tiers before investing in substring rendering.

</deferred>

---

*Phase: 13-inline-tune-highlights-grammarly-style-review-with-gap-promp*
*Context gathered: 2026-05-22*
