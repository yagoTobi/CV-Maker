# CV-Maker — Product Strategy

*Last updated: March 2026*

---

## Vision

Democratize access to professional-quality CVs. Anyone — regardless of technical ability — should be able to produce a CV that looks like it was designed by an expert, tailored to the job they actually want.

---

## The Core Problem

Most job seekers produce CVs in Word or Google Docs. The output is functional but rarely exceptional. LaTeX produces significantly better results — precise typography, consistent layout, professional templates — but it's locked behind a technical wall that eliminates the vast majority of job seekers before they've even started.

At the same time, a generic CV is a losing CV. Every job posting is different. Skills get buried, irrelevant experience crowds out relevant experience, and keyword gaps get people filtered out before a human ever reads their application.

CV-Maker solves both problems: get the output quality of LaTeX without needing to know LaTeX, and get AI-powered tailoring so the CV you send is actually the right one for the role.

---

## What We're Building

A form-driven CV builder where users fill in structured fields — personal info, work experience, education, skills, projects — and the application generates a beautifully typeset LaTeX PDF behind the scenes. Users never touch LaTeX unless they want to.

On top of that foundation, AI assists in two ways: analyzing how well a given CV matches a specific job description, and generating targeted suggestions to improve that match.

The product ends at export. The CV is the deliverable. We are not building an application tracker, an email client, or a job board. We do one thing and we do it better than anything else on the market.

---

## What We're Not Building (Right Now)

**Application tracking.** The instinct is right — it would be useful — but the only version worth building is passive and automated (email parsing, calendar sync, etc.), which is a materially different product surface. Manual tracking doesn't get used. Parking this, not deleting it.

**Enterprise features.** Team accounts, custom branding, API access — these are real opportunities but they come after the core product is solid.

**Job board integration.** Same logic. One thing first.

---

## The Core Product Loop

```
Fill in form → Generate LaTeX PDF → Paste job description → AI analyzes match → Apply suggestions → Save version → Repeat for next role
```

Every feature decision should reinforce this loop. If a feature doesn't make one of these steps faster, smarter, or more trustworthy, it's a distraction.

---

## Differentiation

| What others do | What we do |
|---|---|
| Word/Docs templates (limited quality) | LaTeX output via form input (no LaTeX required) |
| Static CV storage | AI-powered tailoring per job description |
| Generic advice ("use action verbs") | Specific, inline suggestions tied to the actual JD |
| Single CV, used everywhere | Version management — right CV for each role |

The combination of form-simplicity + LaTeX-quality + AI-tailoring is not available in a single tool today. That's the gap.

---

## Phased Roadmap

### Phase 1 — Nail the Creation Loop *(current focus)*

The goal is a seamless, trustworthy path from "I have a job to apply for" to "I have a CV I'm proud to send." Every rough edge in this path is a priority.

- **Form builder as the primary interface.** The LaTeX editor remains available as an advanced/power-user mode, but the form is the front door. The two must share a clear source of truth — form data drives the LaTeX, and direct LaTeX edits should not silently break the form state.
- **Auto-save.** Losing work kills trust. This is not a nice-to-have.
- **ATS optimization feedback** built into match analysis by default. Most users don't know their CV is being filtered by software before any human reads it. Surfacing this — and helping them address it — is a genuine value-add that competitors mostly ignore.
- **Template quality and variety.** The three current templates are a start. Each one should be production-ready with no rough edges before new ones are added.
- **Onboarding clarity.** The path from landing → form → first PDF should require zero instruction.

### Phase 2 — Sharpen the AI Layer *(~2–4 months out)*

Once creation is solid, make the AI genuinely better than a human reviewer.

- **One-click tailored version generation.** Instead of suggesting edits, generate a role-specific version of the CV automatically. User keeps their base CV intact; tailored versions are saved separately.
- **Skills gap analysis.** "This role requires X. Your CV doesn't mention it. Here's where you might address it, or here's why it may not be worth forcing."
- **Section-by-section feedback.** Not just a match score — specific, ranked feedback per section with clear reasoning.
- **Cover letter generation** tied to both the specific JD and the specific CV version being used.
- **Industry-specific coaching.** Suggestions calibrated to the norms of the role's industry (tech vs. finance vs. creative, etc.).

### Phase 3 — Version Intelligence *(~4–6 months out)*

As users accumulate versions, the product should get smarter about the relationship between them.

- **Version comparison.** Side-by-side diff of two CV versions to understand what changed and why.
- **Version tagging.** Attach a role, company, or JD to a saved version for context.
- **Lightweight application log** — not a full tracker, just a note attached to a version: "sent to Spotify, 14 Mar." No status tracking, no follow-up. Just a breadcrumb. This bridges the gap between "useful" and "overwhelming."

### Phase 4 — Platform & Growth *(6+ months)*

- User authentication and cloud storage
- Import from LinkedIn or existing PDF/Word CVs
- Shareable review links (send your CV to a trusted person for feedback within the tool)
- Application tracking — revisit once the core is proven and if user demand is clear
- Enterprise / team accounts

---

## Key Architectural Decisions to Resolve

**Form ↔ LaTeX source of truth.** This is the single most important technical question for Phase 1. The form and the LaTeX editor can't both be editable without a clear rule about which one wins. The recommended approach: form data is the source of truth, LaTeX is generated from it, and the advanced editor is a read-and-modify escape hatch with a clear warning that changes there may not sync back to the form. Decide this explicitly and document it.

**Template engine.** Each template has different LaTeX structure. The form-to-LaTeX generation logic needs to be template-aware. As templates are added, this complexity grows — worth building a clean abstraction layer now rather than n separate code paths.

---

## Success Metrics

- **Time to first PDF** — how long from arriving at the product to having a compiled CV in hand. Target: under 5 minutes for a returning user.
- **Match score improvement** — average delta between initial match analysis and post-suggestion match score. Are suggestions actually helping?
- **Versions created per user** — a proxy for ongoing engagement. If users come back and create role-specific versions, the product is working.
- **Export rate** — percentage of sessions that result in a PDF download. Measures whether people actually finish.

---

## The Product Boundary

We help people get to a great CV faster than anything else available, tailored to the role they want. When they click export, our job is done — and done well. Everything else is a future conversation.
