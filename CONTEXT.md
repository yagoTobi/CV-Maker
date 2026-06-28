# CV-Maker — Domain Language

Shared vocabulary for CV-Maker, with emphasis on the **Tune** workflow (adapting a CV to a specific job). Captured during design grilling — keep it tight and opinionated. Architectural decisions live in `docs/DECISIONS.md` (ADRs); this file is domain terms only.

## Language

### Core CV hierarchy (ADR-016)

**Base CV**:
A job-agnostic CV the user maintains as the starting point for tailoring (`parentVersionId = null`).
_Avoid_: master CV, original, template.

**Job Application**:
A saved CV derived from a Base CV for one specific job posting (`parentVersionId = <base-cv-id>`; carries company/role).
_Avoid_: child version, copy.

**Tailored Version**:
The tuned CV content produced by running Tune on a Base CV against a job description; once saved it becomes a Job Application.
_Avoid_: variant, draft.

**Tune** (verb):
The user-facing action of adapting a Base CV to a specific job description via AI suggestions. Output is a Tailored Version.
_Avoid_: optimise; and reserve "tailor" for code/API names only (see Flagged ambiguities).

### Tune workflow

**Gap Prompt**:
The step after match analysis that **surfaces** the job's unmet requirements as fillable-but-optional chips so the user can add supporting detail before Tune runs. It surfaces gaps; it does not interview the user.
_Avoid_: questionnaire, interview, gap interview.

**Clarification** (`userClarifications`):
A piece of supporting detail the user adds to a Gap Prompt chip, passed to Tune as user-confirmed truth — kept separate from the job description.
_Avoid_: answer, note.

**Inline Review**:
The review surface where AI suggestions appear as highlights directly on the CV, each accepted or skipped via a per-change popover.
_Avoid_: change panel, review panel, side panel.

**Suggestion**:
A single AI-proposed, field-scoped change to the CV produced by Tune; carries the current value, 2–3 **Alternatives**, and a change type (modify / add / remove). At most one Suggestion exists per CV field.
_Avoid_: change, recommendation, fix. (Code type: `TailorChange`.)

**Alternative**:
One of the 2–3 candidate rewrites offered for a Suggestion. The user picks one, or authors their own — an edit becomes a user-authored Alternative rather than mutating the AI's.
_Avoid_: option, variant.

**Tune Rail**:
The fixed-width right-hand column that hosts the Tune workflow. Its content switches step by step (Setup → Gap Prompt → Review) beneath a persistent **Step Strip**; it never resizes and never stacks the steps as an accordion.
_Avoid_: tune panel, side panel, drawer.

**Step Strip**:
The persistent horizontal indicator at the top of the Tune Rail (`Setup · Gap · Review`). Clicking a step switches the Rail's content to it — non-destructive (CV highlights persist), never forks the UI.
_Avoid_: tabs, tiers, breadcrumb.

### Analysis & scoring

**Match Score**:
How well a CV covers a specific job's requirements, from match analysis (requirements evidenced vs missing). Shown to the user as a **Fit Band**; the 0–100 number is kept internal for deltas and version sorting.
_Avoid_: match likelihood, keyword match — it is requirement coverage, not literal keyword overlap.

**Fit Band**:
The named band a Match Score falls into — Weak / Partial / Good / Strong / Excellent (`cv_agent.py` scoring guidelines). The headline signal shown to the user, in place of a bare percentage.
_Avoid_: score label, grade.

## Relationships

- A **Base CV** has zero or more **Job Applications** (`parentVersionId`).
- **Tune** consumes a **Base CV** + a job description and produces a **Tailored Version**, saved as a **Job Application**.
- The **Gap Prompt** runs between match analysis and Tune; its **Clarifications** feed Tune.
- **Inline Review** is how the user accepts or skips the suggestions Tune produces.
- **Tune** produces zero or more **Suggestions**; **at most one Suggestion per CV field**, so each Suggestion stays self-contained.
- Each **Suggestion** offers 2–3 **Alternatives**; editing a Suggestion adds a user-authored Alternative.
- **Match analysis** grades a CV against a job's requirements, surfaced as a **Match Score** / **Fit Band**; its `missing[]` requirements seed the **Gap Prompt**.
- The **Tune Rail** shows one step at a time under the **Step Strip**; switching steps swaps Rail content only — the CV and its highlights are unaffected.
- During Review the **Fit Band** (+ delta and `n of m reviewed`) is docked in the **Tune Rail** header — not floated on the CV.

## Example dialogue

> **Dev:** "When the user opens Tune on a Base CV, does the Gap Prompt ask them questions about what's missing?"
> **Domain expert:** "No — the Gap Prompt *surfaces* the gaps as chips. The user can click one and add a Clarification, or ignore it and run Tune. We never march them through an interview."
> **Dev:** "And when they accept changes in Inline Review and save, that saved CV is…?"
> **Domain expert:** "A Job Application — a Tailored Version of that Base CV, tagged with the company and role."

## Flagged ambiguities

- **Gap Prompt = surface, not interview.** Revert note `13-04-UX-GAPS.md` (G1) was read as "user wants an interview." Resolved: the real complaint was that the gap list was *inert*. The Gap Prompt surfaces fillable-but-optional chips (Phase 13 D-05); it does not interrogate.
- **"Tailored Version" vs "Job Application"** are used near-interchangeably. Working resolution: *Tailored Version* = the tuned content; *Job Application* = that content once saved as a child of its Base CV. Revisit if the distinction proves unnecessary.
- **"Tune" (domain) vs "tailor" (code).** The user-facing action is **Tune**; the code/API uses "tailor" (`suggestTailorChanges`, `TailorChange`, `useTailor`). Keep the split rather than renaming either.
- **One Suggestion per field (invariant).** Tune may not surface two Suggestions for the same field; duplicates are dropped on load, keeping the highest-priority one. Rationale: each Suggestion stays self-contained (clean accept / skip / edit) and the user isn't overwhelmed. Candidate for ADR-020.
- **"Sentiment by industry" → the field-adaptive Match Score.** A CV has no meaningful sentiment polarity; "industry fit" is already covered because match analysis scores by the candidate's professional field (`cv_agent.py:188`). A separate register/voice **Tone Fit** read is *parked* as a distinct future feature, not bundled into the Tune redesign.
- **Tune Rail does not resize (supersedes Phase 13 D-09/D-10).** Phase 13 specified a rail that shrinks to a thin sidebar during review (D-09) and re-expands via chevron (D-10). Superseded: the Rail is a fixed-width switch-column stepper. Accepted trade-off — a constant moderate rail width leaves the CV slightly tighter during review than the thin-rail ideal, in exchange for a consistent, non-forking interface. Candidate for an ADR.
- **Score docked in the Rail (supersedes Phase 13 D-21).** D-21 floated a score card on the CV because the old rail shrank away during review; the switch-column Rail is always present, so the score lives in its Review header and the CV canvas stays uncluttered.
