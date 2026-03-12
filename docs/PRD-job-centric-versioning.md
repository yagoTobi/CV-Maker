# PRD: Job-Centric Version Management

**Status:** Design Complete, Implementation Pending
**Owner:** Product
**Date:** 2026-03-11
**Related:** ADR-016, ROADMAP.md

---

## Problem Statement

Users are confused by the current versioning workflow:

1. **Versioning is hidden** — tiny dashboard icon in editor header, easy to miss
2. **No clear mental model** — flat list of "saved CVs" with no relationship context
3. **Disconnected from workflow** — users create base templates (Creative CV, Consulting CV) and tailor them for specific jobs, but the system treats all versions equally
4. **Poor discoverability** — "My Saved CVs" only appears when versions exist; dashboard is buried

**User Research Finding:**
Most users create **1-2 base CVs** (template per role type) and then **tailor them for specific job applications**. The mental model is:

```
Base CV (Creative) → Spotify Product Designer → tailored version
                   → Adobe Senior Designer → tailored version
                   → Figma Design Lead → tailored version

Base CV (Consulting) → McKinsey Consultant → tailored version
                     → Bain Associate → tailored version
```

The current flat list doesn't reflect this hierarchy.

---

## Goals

1. **Make versioning first-class** — prominently featured, not hidden
2. **Match user mental model** — base CVs as parents, job applications as children
3. **Improve discoverability** — dashboard always accessible, recent applications on landing page
4. **Workflow-aligned naming** — use job details (company, role) instead of "Version 5"
5. **Flexible structure** — support hierarchy but don't force it (allow ungrouped versions)
6. **Intelligent organization** — AI suggestions to help users group versions

---

## Solution Overview

### Hierarchical Version Model

**Data Model:**
- Add `parentVersionId: string | null` to `CVVersion`
- Add `role: string` for job title (used in display names)
- **Base CV**: `parentVersionId = null`, no job details (e.g., "Creative CV")
- **Job Application**: `parentVersionId = <base-id>`, has company/role/job description

**Dashboard Structure:**
```
📁 Creative CV (3 applications)    [+ New]
   ├─ Spotify Product Designer
   │   92% • Mar 10
   ├─ Adobe Senior Designer
   │   88% • Mar 9
   └─ Figma Design Lead
       85% • Mar 8

📁 Consulting CV (2 applications)  [+ New]
   ├─ McKinsey Consultant
   │   94% • Mar 11
   └─ Bain Associate
       89% • Mar 10

📂 Ungrouped (1)
   └─ Application Mar 5
       💡 Suggested: Group with Creative CV (78% similar)
       [Move to Creative CV] [Keep ungrouped]
```

**Key Features:**
- Base CVs are expandable/collapsible (default: expanded)
- Job applications display: **role/company, match %, date** (NO template name — that's not relevant to users)
- `[+ New]` button per base CV = quick shortcut to create job application from that base
- `[Move...]` action on job apps = re-parent to different base CV
- Ungrouped section for orphaned versions (collapsed if empty)
- AI similarity hints for ungrouped versions

---

## User Flows

### 1. Create Base CV (New User)

```
Landing → "Build my CV" → Template Select → Form Builder → Generate → Editor
                                                                        ↓
                                              [Save Version] button clicked
                                                                        ↓
                                            ┌──────────────────────────┐
                                            │ What type of CV is this? │
                                            │ ● Base CV                │
                                            │ ○ Job Application        │
                                            │                          │
                                            │ Name: [Creative CV]      │
                                            │                          │
                                            │      [Save Base CV]      │
                                            └──────────────────────────┘
```

### 2. Create Job Application from Base CV

**Option A: From Dashboard**
```
Landing → "My CVs & Applications" → Dashboard
                                       ↓
                        Click [+ New] on "Creative CV"
                                       ↓
                            Editor opens (Creative CV loaded)
                            Job panel visible on left
                            Breadcrumb: "New application from Creative CV"
                                       ↓
                            User fills job details + tailors CV
                                       ↓
                            [Save Version] → auto-names "Spotify Product Designer"
```

**Option B: From "Tune for a Job"**
```
Landing → "Tune for a job"
              ↓
    ┌────────────────────────────────────┐
    │ Which base CV to start from?       │
    │ ○ Creative CV (3 applications)     │
    │ ○ Consulting CV (2 applications)   │
    │ ○ Start from scratch               │
    │                                    │
    │         [Continue]                 │
    └────────────────────────────────────┘
              ↓
    Editor opens with selected base CV + job panel visible
```

### 3. Organize Ungrouped Version

```
Dashboard → Ungrouped section
              ↓
    Application Mar 5
    💡 Suggested: Group with Creative CV (78% similar)
    [Move to Creative CV] [Create new base] [Keep ungrouped]
              ↓
    Click [Move to Creative CV]
              ↓
    Application moves to Creative CV group
    Auto-renames based on job details (if present)
```

### 4. Re-parent Job Application

```
Dashboard → Creative CV → Spotify Product Designer
              ↓
    [Open] [Move...] [Delete]
              ↓
    Click [Move...] → dropdown of base CVs
              ↓
    Select "Consulting CV"
              ↓
    Spotify Product Designer moves to Consulting CV group
```

---

## Detailed Design

### Save Modal (Redesigned)

**When clicking "Save Version" in editor:**

```
┌────────────────────────────────────────┐
│ Save CV                                │
├────────────────────────────────────────┤
│ What type of CV is this?               │
│                                        │
│ ○ Base CV                              │
│   A template to tailor for jobs       │
│                                        │
│ ● Job Application                      │
│   Tailored for a specific role        │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ Version name (optional)            │ │
│ │ e.g., "Spotify Designer"           │ │
│ └────────────────────────────────────┘ │
│                                        │
│ Based on:                              │
│ ┌────────────────────────────────────┐ │
│ │ [Select base CV]                   │ │
│ │ ▾ Creative CV                      │ │
│ └────────────────────────────────────┘ │
│                                        │
│ Company (optional):                    │
│ ┌────────────────────────────────────┐ │
│ │ Spotify                            │ │
│ └────────────────────────────────────┘ │
│                                        │
│ Role (optional):                       │
│ ┌────────────────────────────────────┐ │
│ │ Senior Product Designer            │ │
│ └────────────────────────────────────┘ │
│                                        │
│        [Cancel]  [Save Application]    │
└────────────────────────────────────────┘
```

**Logic:**
- If "Base CV" selected → hide company/role/parent picker fields
- If "Job Application" selected → show all fields
- Base CV picker dropdown:
  - Lists all existing base CVs
  - Option: "None (create new base from this)"
- Auto-populate company/role from job panel if already filled
- If editing existing version, preserve parent relationship unless changed
- Auto-naming (if version name left empty):
  - `{company} {role}` → "Spotify Senior Product Designer"
  - `{company}` only → "Spotify Application"
  - `{role}` only → "Senior Product Designer"
  - Neither → "Application Mar 11"

---

### Dashboard UI Specification

**Header:**
```
┌─────────────────────────────────────────────┐
│ [← Home]  My CVs & Applications             │
│           2 base CVs • 5 job applications   │
└─────────────────────────────────────────────┘
```

**Base CV Group (Expanded):**
```
┌─────────────────────────────────────────────┐
│ ▼ 📁 Creative CV (3 applications)  [+ New]  │
├─────────────────────────────────────────────┤
│    Spotify Product Designer                 │
│    92% • Mar 10                             │
│    [Open] [Move...] [Delete]                │
├─────────────────────────────────────────────┤
│    Adobe Senior Designer                    │
│    88% • Mar 9                              │
│    [Open] [Move...] [Delete]                │
├─────────────────────────────────────────────┤
│    Figma Design Lead                        │
│    85% • Mar 8                              │
│    [Open] [Move...] [Delete]                │
└─────────────────────────────────────────────┘
```

**Base CV Group (Collapsed):**
```
┌─────────────────────────────────────────────┐
│ ▶ 📁 Consulting CV (2 applications) [+ New] │
└─────────────────────────────────────────────┘
```

**Ungrouped Section:**
```
┌─────────────────────────────────────────────┐
│ ▼ 📂 Ungrouped (1)                          │
├─────────────────────────────────────────────┤
│    Application Mar 5                        │
│    (no match score)                         │
│    💡 Suggested: Group with Creative CV     │
│       (78% similar)                         │
│    [Move to Creative CV] [Create new base]  │
│    [Keep ungrouped]                         │
│    [Open] [Delete]                          │
└─────────────────────────────────────────────┘
```

**Empty State:**
```
┌─────────────────────────────────────────────┐
│           📄 No saved CVs yet               │
│                                             │
│   Create your first CV in the editor.      │
│   Saved versions will appear here.         │
│                                             │
│           [Get started]                     │
└─────────────────────────────────────────────┘
```

---

### Landing Page Integration

**Current State:**
```
┌──────────────────┬──────────────────┐
│  Branding        │  Actions         │
│                  │  - Build my CV   │
│                  │  - Tune for job  │
│                  │  - Import CV     │
│                  │  - My Saved CVs  │ (only if versions exist)
└──────────────────┴──────────────────┘
```

**New Design:**
```
┌──────────────────┬──────────────────────────┐
│  Branding        │  Actions                 │
│                  │  - Build my CV           │
│                  │  - Tune for job          │
│                  │  - Import CV             │
├──────────────────┴──────────────────────────┤
│  My CVs & Applications                      │
│                                             │
│  From Creative CV:                          │
│  [Spotify Designer] [Adobe Designer]        │
│  92% • Mar 10       88% • Mar 9             │
│                                             │
│  From Consulting CV:                        │
│  [McKinsey Consultant]                      │
│  94% • Mar 11                               │
│                                             │
│  → View all CVs & applications              │
└─────────────────────────────────────────────┘
```

**Logic:**
- Always show "My CVs & Applications" section (even if empty)
- If no versions: show empty state inline
- If versions exist: show up to 3 most recent job applications, grouped by base CV
- "View all" button goes to full dashboard

---

### Editor Context Display

**In editor header, show current version context:**

**Job Application:**
```
┌──────────────────────────────────────────────────┐
│ [← Home]  Spotify Designer (from Creative CV)   │
└──────────────────────────────────────────────────┘
```

**Base CV:**
```
┌──────────────────────────────────────────────────┐
│ [← Home]  Creative CV (Base)                     │
└──────────────────────────────────────────────────┘
```

**Unsaved/New:**
```
┌──────────────────────────────────────────────────┐
│ [← Home]  Unsaved CV                             │
└──────────────────────────────────────────────────┘
```

---

## AI Grouping Suggestions

**Goal:** Help users organize ungrouped versions without forcing structure.

**Approach:** Manual grouping with AI hints (Option B from design discussion)

**Implementation:**
1. When listing versions, detect ungrouped ones (`parentVersionId = null` AND no explicit base CV marker)
2. For each ungrouped version, call Bedrock to compute similarity to existing base CVs
3. Return top suggestion with similarity score (0-100%)
4. Display hint inline: "💡 Suggested: Group with Creative CV (78% similar)"
5. Provide actions:
   - `[Move to <suggested-base>]` — re-parent immediately
   - `[Create new base]` — mark this as a new base CV
   - `[Keep ungrouped]` — dismiss suggestion (don't show again)

**Similarity Analysis Prompt (Bedrock):**
```
Compare the following CV with existing base CVs and determine which base CV it's most similar to.

Target CV:
[texContent of ungrouped version]

Base CVs:
1. Creative CV:
   [texContent of base CV 1]
2. Consulting CV:
   [texContent of base CV 2]

Return JSON:
{
  "mostSimilar": "Creative CV",
  "similarityScore": 78,
  "reasoning": "Both emphasize design skills, project portfolio, and creative tools"
}
```

**Performance:**
- Run analysis on-demand (when user opens dashboard), not on every save
- Cache results for 24 hours
- Batch API calls if multiple ungrouped versions exist
- Show loading spinner during analysis

---

## API Changes

### New Fields

**CVVersion Schema (Backend Pydantic Model):**
```python
class CVVersion(BaseModel):
    id: str
    name: str
    templateId: str
    texContent: str
    formData: Optional[CVFormData] = None
    jobDescription: Optional[str] = None
    companyName: Optional[str] = None
    role: Optional[str] = None  # NEW
    matchScore: Optional[float] = None
    parentVersionId: Optional[str] = None  # NEW
    createdAt: str  # ISO-8601
```

### New Endpoints

**PATCH /api/cv-versions/{id}** — Move/re-parent version
```json
Request:
{
  "parentVersionId": "base-cv-uuid"  // or null to ungroup
}

Response:
{
  "id": "version-uuid",
  "parentVersionId": "base-cv-uuid",
  "message": "Version moved successfully"
}
```

**POST /api/cv-versions/suggest-grouping** — Get AI grouping suggestion
```json
Request:
{
  "versionId": "ungrouped-version-uuid"
}

Response:
{
  "suggestedParentId": "base-cv-uuid",
  "suggestedParentName": "Creative CV",
  "similarityScore": 78,
  "reasoning": "Both emphasize design skills..."
}
```

### Modified Endpoints

**GET /api/cv-versions** — Return hierarchical structure
```json
Response:
{
  "versions": [
    {
      "id": "base-1",
      "name": "Creative CV",
      "parentVersionId": null,
      "children": [
        {
          "id": "app-1",
          "name": "Spotify Product Designer",
          "role": "Product Designer",
          "companyName": "Spotify",
          "parentVersionId": "base-1",
          "matchScore": 92,
          "createdAt": "2026-03-10T14:30:00Z"
        }
      ]
    }
  ],
  "ungrouped": [
    {
      "id": "orphan-1",
      "name": "Application Mar 5",
      "parentVersionId": null,
      "createdAt": "2026-03-05T10:15:00Z"
    }
  ]
}
```

---

## Implementation Plan

### Phase 1: Backend Data Model + API (2-3 hours)

**Tasks:**
- [ ] Add `parentVersionId` and `role` fields to `CVVersion` Pydantic model
- [ ] Update version save endpoint to accept new fields
- [ ] Add PATCH endpoint for re-parenting (`/api/cv-versions/{id}`)
- [ ] Update list endpoint to return hierarchical structure (grouped by parent)
- [ ] Add validation: prevent circular parent references
- [ ] Migration: existing versions default to `parentVersionId = null`
- [ ] Test: CRUD operations with parent relationships

**Files to Modify:**
- `backend/routes/cv_versions.py`
- `backend/tests/test_cv_versions.py` (add tests for re-parenting)

---

### Phase 2: Dashboard Hierarchical UI (4-5 hours)

**Tasks:**
- [ ] Update Dashboard component to render hierarchical structure
- [ ] Add expand/collapse state for base CV groups (default: expanded)
- [ ] Render job applications nested under base CVs
- [ ] Add `[+ New]` button on each base CV group
- [ ] Add `[Move...]` action on job applications (dropdown of base CVs)
- [ ] Add Ungrouped section (collapsed if empty)
- [ ] Update card display: role/company, match %, date (remove template name)
- [ ] Add empty state for no versions
- [ ] Test: expand/collapse, move actions, open/delete

**Files to Modify:**
- `frontend/src/features/dashboard/Dashboard.tsx`
- `frontend/src/features/dashboard/Dashboard.module.css`
- `frontend/src/services/api.ts` (add move endpoint call)
- `frontend/src/types/index.ts` (update CVVersion type)

---

### Phase 3: Save Modal Redesign (3-4 hours)

**Tasks:**
- [ ] Redesign save modal with "Base CV" vs "Job Application" radio buttons
- [ ] Add base CV picker dropdown (shows existing bases + "None")
- [ ] Add company and role input fields (optional)
- [ ] Show/hide fields based on radio selection
- [ ] Auto-populate company/role from job panel if filled
- [ ] Implement auto-naming logic: `{company} {role}` → fallback to date
- [ ] Update VersionSwitcher component to open new modal
- [ ] Test: save as base, save as job app, auto-naming, validation

**Files to Modify:**
- `frontend/src/features/dashboard/VersionSwitcher.tsx`
- `frontend/src/features/dashboard/VersionSwitcher.module.css`
- `frontend/src/App.tsx` (pass base CVs list to VersionSwitcher)

---

### Phase 4: "Tune for a Job" Flow Enhancement (2-3 hours)

**Tasks:**
- [ ] Add base CV picker modal before entering Tune flow
- [ ] Show list of existing base CVs with application count
- [ ] Add "Start from scratch" option (Professional CV)
- [ ] Load selected base CV into editor when continuing
- [ ] Show job panel on left (already visible in Tune flow)
- [ ] Add breadcrumb in editor header: "From: Creative CV"
- [ ] Test: pick base CV, start from scratch, breadcrumb display

**Files to Modify:**
- `frontend/src/App.tsx` (add base CV picker step before Tune flow)
- `frontend/src/features/editor/LatexEditor.tsx` (add breadcrumb UI)
- `frontend/src/features/editor/LatexEditor.module.css`

---

### Phase 5: AI Grouping Suggestions (3-4 hours)

**Tasks:**
- [ ] Add backend endpoint: `POST /api/cv-versions/suggest-grouping`
- [ ] Implement Bedrock similarity analysis (compare ungrouped vs base CVs)
- [ ] Cache suggestions for 24 hours (in-memory or Redis)
- [ ] Update Dashboard to fetch suggestions for ungrouped versions
- [ ] Display suggestion inline: "💡 Suggested: Group with Creative CV (78% similar)"
- [ ] Add actions: `[Move to <base>]` `[Create new base]` `[Keep ungrouped]`
- [ ] Test: suggestion accuracy, one-click move, dismiss

**Files to Modify:**
- `backend/routes/cv_versions.py` (add suggest-grouping endpoint)
- `backend/services/cv_analyzer.py` (add similarity analysis function)
- `frontend/src/features/dashboard/Dashboard.tsx` (fetch and display suggestions)
- `frontend/src/services/api.ts` (add API call)

---

### Phase 6: Landing Page Quick Access (1-2 hours)

**Tasks:**
- [ ] Update LandingScreen to always show "My CVs & Applications" section
- [ ] Fetch recent job applications (3 most recent)
- [ ] Group by base CV: "From Creative CV: [cards]"
- [ ] Show role, match %, date on each card
- [ ] Add "View all CVs & applications" link to dashboard
- [ ] Handle empty state: show message if no versions exist
- [ ] Test: recent applications display, grouping, navigation

**Files to Modify:**
- `frontend/src/features/landing/LandingScreen.tsx`
- `frontend/src/features/landing/LandingScreen.module.css`
- `frontend/src/App.tsx` (pass recent versions to LandingScreen)

---

## Testing Strategy

### Unit Tests
- Backend: version CRUD with parent relationships
- Backend: re-parenting validation (prevent circular refs)
- Backend: auto-naming logic
- Backend: hierarchical list endpoint
- Frontend: save modal field visibility logic
- Frontend: auto-naming display

### Integration Tests
- Save base CV → create job application → verify parent relationship
- Move job application between bases → verify re-parenting
- AI suggestion → accept → verify grouping
- "Tune for a job" → pick base CV → verify editor loads correctly

### Manual Testing
- Create 2 base CVs (Creative, Consulting)
- Create 3 job applications from Creative CV
- Create 2 job applications from Consulting CV
- Verify dashboard hierarchy displays correctly
- Move a job application from Creative to Consulting
- Create ungrouped version → verify AI suggestion appears
- Accept AI suggestion → verify version moves to suggested base
- Navigate between landing → dashboard → editor → verify context breadcrumbs

---

## Edge Cases & Error Handling

### Circular Parent References
**Problem:** User tries to set parent of base CV A to be job app B, which is already a child of A.

**Solution:** Backend validation on PATCH endpoint:
```python
def validate_no_circular_reference(version_id: str, new_parent_id: str):
    # Walk up parent chain from new_parent_id
    # If we encounter version_id, reject the move
    current = get_version(new_parent_id)
    while current and current.parentVersionId:
        if current.parentVersionId == version_id:
            raise HTTPException(400, "Circular parent reference detected")
        current = get_version(current.parentVersionId)
```

### Orphaned Chains
**Problem:** Base CV B is a child of base CV A. User deletes A. What happens to B?

**Solution:** On delete, set all children's `parentVersionId` to `null` (move to ungrouped).

### Empty Job Details
**Problem:** User saves as "Job Application" but doesn't fill company or role.

**Solution:** Auto-generate name: "Application Mar 11". Allow it — user might fill details later.

### Multiple Base CVs with Same Name
**Problem:** User creates two base CVs both named "Creative CV".

**Solution:** Allow it. Display with createdAt date to disambiguate in picker: "Creative CV (Mar 10)" vs "Creative CV (Mar 8)".

### AI Suggestion Failure
**Problem:** Bedrock API call fails or times out.

**Solution:** Fail gracefully — don't show suggestion, log error. User can still manually group via `[Move...]` action.

### Re-parenting to Self
**Problem:** User tries to set parentVersionId = own ID.

**Solution:** Backend validation rejects with 400 error.

---

## Success Metrics

**Adoption:**
- % of users who create at least 1 base CV (target: 80%)
- % of job applications that are grouped under base CVs (target: 70%)
- Avg number of job applications per base CV (target: 3+)

**Usability:**
- Time to create first job application from base CV (target: <2 min)
- % of users who use `[+ New]` button vs full flow (measure shortcut adoption)
- % of users who accept AI grouping suggestions (target: 60%)

**Engagement:**
- % increase in saved versions per user (expect 2x due to lower friction)
- % reduction in abandoned save flows (measure modal completion rate)

---

## Future Enhancements (Post-MVP)

### Version Comparison
Side-by-side diff of two CV versions (e.g., base vs job application).

### Bulk Actions
- "Create 5 job applications from this base CV" (batch mode)
- "Delete all ungrouped versions"
- "Merge two base CVs"

### Version Tags
Add tags to versions (e.g., "design", "consulting", "remote-only") for filtering.

### Export Base CV as Template
Package a base CV (LaTeX + formData) as a shareable template file.

### Advanced AI Features
- Auto-detect when a job application has diverged significantly from its base CV
- Suggest: "This application is 85% different from Creative CV. Create a new base?"

---

## Open Questions (Resolved)

1. **Naming:** "Applications" vs "Versions"?
   → **Resolved:** "My CVs & Applications" (covers both base CVs and job applications)

2. **Required fields:** Company/role required or optional?
   → **Resolved:** Optional. Auto-generate name if empty.

3. **Dashboard grouping:** Separate sections or just filterable?
   → **Resolved:** Hierarchical grouping (base CVs with nested job apps). Ungrouped section at bottom.

4. **Version history:** Show which base CV a job app was derived from?
   → **Resolved:** Yes. Display as breadcrumb in editor + inline text in dashboard.

5. **PDF thumbnails:** Show preview images?
   → **Resolved:** No. Text metadata (role, company, match %, date) is more informative.

6. **Duplicate button:** On base CVs to quickly create job apps?
   → **Resolved:** Yes. `[+ New]` button on each base CV group.

7. **Orphaned versions:** Force base CV selection or allow ungrouped?
   → **Resolved:** Allow ungrouped. AI suggests grouping with similarity hints.

---

## Appendix: User Scenarios

### Scenario 1: New User — First CV
1. Click "Build my CV"
2. Select Professional CV template
3. Fill form with personal info, work experience, skills
4. Click "Generate CV" → opens editor with PDF preview
5. Click "Save Version"
6. Modal: select "Base CV", name it "Creative CV"
7. Save → dashboard now shows 1 base CV, 0 applications

### Scenario 2: Tailoring for First Job
1. From landing, click "Tune for a job"
2. Modal: "Which base CV to start from?" → select "Creative CV"
3. Editor opens with Creative CV loaded, job panel visible
4. Paste job description for Spotify Product Designer
5. Click "Analyze" → match score: 72%
6. Chat with AI to tailor bullets, add relevant projects
7. Click "Save Version"
8. Modal: "Job Application" pre-selected, company/role auto-filled from job panel
9. Name auto-generated: "Spotify Product Designer"
10. Save → dashboard now shows Creative CV (1 application)

### Scenario 3: Bulk Job Applications
1. From dashboard, expand "Creative CV" group
2. Click `[+ New]` button
3. Editor opens with Creative CV, job panel visible, breadcrumb: "From: Creative CV"
4. Fill job details for Adobe Senior Designer
5. Tailor CV, save → auto-grouped under Creative CV
6. Repeat for Figma Design Lead
7. Dashboard now shows Creative CV (3 applications)

### Scenario 4: Organizing Ungrouped Version
1. User saved a quick version without selecting base CV
2. Dashboard shows "Ungrouped (1)"
3. Expand Ungrouped section
4. See: "Application Mar 5" with AI hint: "💡 Suggested: Group with Creative CV (78% similar)"
5. Click `[Move to Creative CV]`
6. Version moves to Creative CV group, auto-renamed based on job details

### Scenario 5: Re-parenting Job Application
1. User realizes "Spotify Product Designer" was saved under wrong base CV
2. Go to dashboard, expand "Consulting CV" group
3. Find "Spotify Product Designer" (mistakenly grouped here)
4. Click `[Move...]` → dropdown shows all base CVs
5. Select "Creative CV"
6. Version moves to Creative CV group

---

## Conclusion

This job-centric versioning redesign transforms CV-Maker from a simple editor into a **workflow-aligned application management system**. By matching the user's mental model (base templates → job applications), we make versioning intuitive, discoverable, and valuable. The hierarchical dashboard becomes the central hub for managing all CV variations, with intelligent AI assistance to reduce manual organization work.

**Next Step:** Begin Phase 1 implementation (backend data model + API changes).
