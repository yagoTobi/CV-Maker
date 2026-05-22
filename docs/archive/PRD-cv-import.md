# Product Requirements Document: CV Import

**Author**: Yago
**Date**: March 2026
**Status**: Draft
**Feature area**: Onboarding / Acquisition

---

## 1. Executive Summary

New users arriving at CV-Maker face a cold start: they must rebuild their entire work history from scratch inside the form builder before they see any value. CV Import eliminates this barrier by letting users upload their existing CV (PDF or DOCX), extracting the content via AI, and pre-populating the form automatically. The user shows up with what they already have and leaves with something better — without a blank page in between.

---

## 2. Background & Context

### The problem

The form builder is the primary interface for CV-Maker. It's the right model — users fill in structured fields, the app generates a beautiful LaTeX PDF behind the scenes. But it assumes users are starting from zero, and almost nobody is. Every job seeker already has a CV. Asking them to manually re-enter years of work history is the single largest adoption barrier in the product.

This isn't a quality problem. It's a friction problem. The product is good enough once someone is inside it — the issue is getting them there.

### Why this matters now

CV Import is the acquisition hook. It turns the onboarding experience from "rebuild everything" to "bring what you have, get something better." That's a fundamentally different pitch, and it removes the most cited reason people don't switch away from Word or Google Docs: switching cost.

### Current state

There is no import functionality. Users must manually fill in every field in the form builder. There is no way to carry an existing CV into the product.

### Relevant prior art

Tools like LinkedIn's profile import, Resumake, and Reactive Resume have attempted document parsing with varying quality. The common failure mode is treating extraction as a one-shot operation — extract everything, dump it in, done — with no review step for the user. When the extraction is 90% right, the 10% that's wrong erodes trust in the whole result. The UX around verification is what separates a feature that feels like magic from one that feels broken.

---

## 3. Objectives & Success Metrics

### Goals

1. Remove the cold-start barrier for new users by giving them a faster, lower-friction path to their first CV inside the product.
2. Achieve extraction quality high enough that users spend less time correcting the import than they would have spent typing from scratch.
3. Make CV-Maker the obvious next step for anyone who already has a CV they want to improve.

### Non-Goals

1. **LinkedIn import** — valuable, but a separate surface requiring OAuth and a different extraction approach. Out of scope for this phase.
2. **Image-based PDF support** — scanned PDFs with no embedded text require OCR, which adds complexity and cost. Out of scope for v1; flag clearly to users.
3. **Preserving original CV formatting** — we are extracting content, not converting the document. The output is always one of our LaTeX templates, not a facsimile of the original.
4. **Bulk import / multi-CV upload** — single file, single import per session.
5. **Automatic template selection based on imported content** — interesting future idea, out of scope here.

### Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| % of new users who complete form and generate first PDF | Baseline TBD | +25% relative improvement | Session funnel |
| Time from landing to first PDF export | Baseline TBD | ≤3 minutes via import path | Session timing |
| Import-to-completion rate | N/A | ≥70% of users who start an import finish it | Funnel events |
| Post-import edit rate | N/A | ≤30% of fields edited after import | Field change tracking |
| User-reported extraction accuracy | N/A | ≥4/5 average rating on post-import prompt | In-product micro-survey |

---

## 4. Target Users & Segments

### Primary: The job seeker with an existing CV

Already has a CV — likely in Word or PDF. Wants better output quality without starting over. Not technically skilled; doesn't know what LaTeX is and doesn't need to. Their mental model is "upload my CV, get a nicer version of it." This is the mainstream user the product is trying to reach.

**Current workaround**: Stay in Word. Accept lower quality output. Or spend 45+ minutes rebuilding everything in the form builder and potentially drop off halfway through.

### Secondary: The returning user with a new role to apply for

Has already used CV-Maker and has a PDF export from a previous session. Wants to import that export into a new template without re-entering data. This is a re-engagement use case — the import feature doubles as a template-switching mechanism for users who've already committed to the product.

### Out of scope for this PRD

Enterprise users, recruiters, users managing CVs on behalf of others.

---

## 5. User Stories & Requirements

### P0 — Must Have

| # | User Story | Acceptance Criteria |
|---|-----------|---------------------|
| 1 | As a new user, I want to upload my existing CV so that I don't have to re-enter all my information manually. | Upload UI accepts PDF and DOCX. File size limit clearly communicated (suggested: 10MB). Unsupported file types are rejected with a clear message. |
| 2 | As a user, I want to see what was extracted from my CV before it's applied to the form, so I can catch errors before they become my working document. | Extraction results are presented in a structured review screen, section by section. User can see what was found and confirm before populating the form. |
| 3 | As a user, I want to edit any incorrectly extracted field during the review step, so that errors don't make it into my CV. | Every extracted field is editable inline in the review screen. Changes in review are reflected when the form is populated. |
| 4 | As a user, I want to be told if my PDF can't be parsed properly, so I'm not left wondering why the extraction failed or came back empty. | Image-based/scanned PDFs are detected and the user is shown a clear message explaining the limitation and offering to proceed manually instead. |
| 5 | As a user, I want to choose which template my imported CV is rendered in, so I can see the upgrade in quality immediately. | After confirming extraction, user is directed to template selection before the form is populated. Standard template selection flow applies. |

### P1 — Should Have

| # | User Story | Acceptance Criteria |
|---|-----------|---------------------|
| 6 | As a user, I want the extraction to correctly identify and map my work experience entries, so that my job history doesn't need to be manually rebuilt. | Each work experience entry maps correctly to: company, title, start date, end date, location, bullet points. Partial data (e.g. missing end date for current role) handled gracefully with empty field rather than error. |
| 7 | As a user, I want the extraction to handle multiple date formats, so that "Jan 2021 – Present", "01/2021 – current", and "2021–now" all parse correctly. | Extraction normalises common date format variations. Unrecognised formats are left blank with a flag for user review rather than silently wrong. |
| 8 | As a user, I want to be told roughly how complete my extraction was, so I have a realistic expectation of how much manual correction is needed. | Post-extraction, a simple summary is shown: e.g. "We found 3 work entries, 2 education entries, 4 skills categories. Some fields may need review." |
| 9 | As a user uploading a DOCX, I want better extraction accuracy than with PDF, since Word documents have cleaner structure. | DOCX files are parsed using document structure (headings, paragraphs) where available. PDF files fall back to text extraction. Both use AI for semantic field mapping. |

### P2 — Nice to Have / Future

| # | User Story | Acceptance Criteria |
|---|-----------|---------------------|
| 10 | As a returning user, I want to import a CV I previously exported from CV-Maker, so I can switch to a different template without re-entering data. | PDFs generated by CV-Maker (identifiable by structure or metadata) produce high-quality extraction results with minimal correction needed. |
| 11 | As a user, I want to import just one section (e.g. only my work history) into an existing CV I'm already editing, so I can update incrementally. | Section-level import available as an option in addition to full document import. User selects which sections to extract and merge. |
| 12 | As a user, I want the AI to flag inconsistencies it notices during extraction (e.g. a gap in employment), so I'm aware of things I might want to address. | Extraction review screen surfaces flagged observations (gaps, unusual formatting, potential errors) as non-blocking informational notices. |

---

## 6. Solution Overview

### High-level flow

```
Upload file → Parse file → AI extraction → Review screen → Confirm → Template selection → Form populated → Generate PDF
```

### Parsing layer

Two separate parsers based on file type:

**DOCX**: Use `python-docx` to extract structured content — paragraphs, headings, tables. The document structure provides semantic hints (e.g. a heading followed by date-formatted text is likely a work experience entry) that improve extraction accuracy before the AI layer even runs.

**PDF**: Use `pdfplumber` to extract raw text with positional data. Less structured than DOCX but sufficient for most modern CVs. Image-based PDFs (no embedded text) should be detected early and handled with a graceful fallback message.

### AI extraction layer

Pass the extracted text to Claude (already integrated via Bedrock) with a structured prompt that maps content to the existing JSON schema:

```json
{
  "personalInfo": { "fullName", "email", "phone", "location", "links", "summary" },
  "workExperience": [{ "company", "title", "startDate", "endDate", "location", "bullets" }],
  "education": [{ "school", "degree", "startDate", "endDate", "location", "gpa", "details" }],
  "skills": [{ "category", "skills" }],
  "projects": [{ "name", "year", "description", "technologies" }],
  "awards": [{ "year", "title", "description" }]
}
```

The prompt should instruct the model to: return structured JSON only, leave fields empty rather than guessing, normalise date formats to `MMM YYYY`, and flag fields it was uncertain about with a `_confidence: "low"` annotation (used to highlight fields for review in the UI).

### Review screen

A dedicated step between extraction and form population. Presents extracted data section by section with:
- Pre-filled fields showing extracted values
- Low-confidence fields visually flagged (e.g. yellow highlight)
- Inline editing for any field
- A "looks good" confirmation per section, or "edit" to modify
- A summary count at the top ("Found: 3 roles, 2 education entries, 5 skill categories")

The review screen is non-negotiable. It's what makes the difference between a feature that feels trustworthy and one that silently introduces errors the user doesn't catch until much later.

### Form population

On confirmation, extracted and corrected data is written to the form builder state using the existing data model. No new schema required — this is an alternative input path to the same structure that manual entry produces. The rest of the product (LaTeX generation, match analysis, version saving) is unaffected.

### Error handling

| Scenario | Handling |
|----------|----------|
| Image-based PDF (no text) | Detect early, show clear message, offer manual entry |
| Corrupt or unreadable file | File validation on upload, reject with message |
| Extraction returns empty or near-empty result | Show partial results + message explaining quality may be low, offer manual entry |
| File too large | Reject at upload with size limit message |
| AI extraction timeout | Show error, offer retry or manual entry |

---

## 7. Open Questions

| Question | Owner | Notes |
|----------|-------|-------|
| What file size limit is appropriate? | Yago | 10MB suggested as starting point — most CVs are well under 1MB, so this gives headroom without being permissive |
| Should extraction run server-side synchronously or as a background job? | Engineering | For v1, synchronous is simpler. If extraction takes >5s consistently, move to async with a loading state |
| How do we handle multi-language CVs? | Yago | Claude handles multilingual text well, but date parsing and field labelling may need prompt tuning for non-English CVs. Flag as known limitation for v1 |
| Do we store the uploaded file after extraction? | Yago | Recommended: no. Extract, use, discard. Reduces storage cost and privacy surface area |
| Should we attempt OCR for image-based PDFs in v2? | Yago | Worth evaluating — AWS Textract integrates with existing Bedrock setup. Defer to a future phase |

---

## 8. Timeline & Phasing

### Phase 1 — Core Import (This PRD)

Scope: PDF and DOCX upload → AI extraction → review screen → form population → template selection → PDF generation.

Suggested milestone breakdown:

| Milestone | Scope |
|-----------|-------|
| M1 | File upload UI + server-side file parsing (PDF + DOCX). No AI yet — raw extracted text returned. |
| M2 | AI extraction layer. Prompt engineering to map text → JSON schema. Review screen with pre-filled fields. |
| M3 | Inline editing in review screen. Confidence flagging. Error handling for all failure scenarios. |
| M4 | End-to-end testing across a range of real CV formats. Polish, edge cases, accuracy tuning. |

### Phase 2 — Quality & Edge Cases (Future)

- OCR support for scanned/image PDFs via AWS Textract
- Improved accuracy for non-English CVs
- Section-level import (merge into existing CV rather than replace)

### Phase 3 — Extended Import Sources (Future)

- LinkedIn profile import
- Import from previously exported CV-Maker PDF (high-fidelity round-trip)

---

*This PRD covers Phase 1 only. Phases 2 and 3 are documented for sequencing context and will be specced separately.*
