# Architectural Decision Records (ADRs)

This document captures key architectural decisions made during development.

---

## ADR-001: LaTeX for CV Format

**Date:** 2026-02-21

**Status:** Accepted

**Context:**
Need to decide on the CV format. Options considered:
- HTML/CSS (web-native)
- Markdown (simple)
- LaTeX (professional typesetting)
- Word documents (widely used)

**Decision:**
Use LaTeX as the primary CV format.

**Rationale:**
- Professional typesetting quality
- Precise control over layout
- Standard in academia and tech
- Easy to version control (plain text)
- Can compile to PDF reliably

**Consequences:**
- Users need basic LaTeX knowledge to make manual edits
- Requires LaTeX distribution on the server
- Compilation adds latency to preview

---

## ADR-002: React + Vite for Frontend

**Date:** 2026-02-21

**Status:** Accepted

**Context:**
Choosing a frontend framework and build tool.

**Decision:**
Use React 19 with Vite for the frontend.

**Rationale:**
- React's component model fits the editor UI well
- Vite provides fast HMR during development
- TypeScript support out of the box
- Large ecosystem for editor components (CodeMirror)

**Consequences:**
- React 19 is relatively new; some libraries may lag
- Need to manage React's state for complex interactions

---

## ADR-003: FastAPI for Backend

**Date:** 2026-02-21

**Status:** Accepted

**Context:**
Need a backend framework that supports async operations and streaming.

**Decision:**
Use Python with FastAPI.

**Rationale:**
- Native async support
- Built-in streaming response support (for AI chat)
- Automatic API documentation
- Type hints align with TypeScript frontend

**Consequences:**
- Python ecosystem for LaTeX is limited (shell out to pdflatex)
- Need to manage Python virtual environment

---

## ADR-004: AWS Bedrock for AI

**Date:** 2026-02-21

**Status:** Accepted

**Context:**
Need an AI service for CV analysis and suggestions.

**Decision:**
Use AWS Bedrock with Claude models.

**Rationale:**
- Access to Claude models (strong at analysis and writing)
- Streaming support for real-time responses
- Enterprise-grade security and compliance
- Pay-per-use pricing

**Consequences:**
- Requires AWS account and configuration
- Adds external dependency and potential cost
- Need to handle API rate limits

---

## ADR-005: Local JSON for User Data

**Date:** 2026-02-21

**Status:** Accepted (temporary)

**Context:**
Need to store user profile data.

**Decision:**
Store user data in local JSON files.

**Rationale:**
- Simple to implement for MVP
- No database setup required
- Easy to inspect and debug

**Consequences:**
- Not suitable for multi-user production
- No data persistence across deployments
- Will need to migrate to proper database later

**Future consideration:** Replace with PostgreSQL or MongoDB when implementing user authentication.

---

## ADR-006: Server-side LaTeX Compilation

**Date:** 2026-02-21

**Status:** Accepted

**Context:**
Decide where to compile LaTeX to PDF.

**Decision:**
Compile LaTeX on the backend server.

**Rationale:**
- Users don't need LaTeX installed locally
- Consistent compilation environment
- Can cache or optimize compilation

**Consequences:**
- Server needs LaTeX distribution installed
- Compilation adds latency
- Need to handle compilation errors gracefully
- Security considerations with arbitrary LaTeX code

---

## ADR-007: Inline Edit Suggestions Format

**Date:** 2026-02-22

**Status:** Accepted

**Context:**
How should AI communicate suggested edits to the frontend?

**Decision:**
Use structured JSON blocks within AI responses with `find` and `replace` fields.

**Rationale:**
- Enables one-click apply functionality
- Clear delineation of what changes
- Easy to parse and apply
- Supports undo by storing previous state

**Consequences:**
- Need to train AI to output consistent format
- Frontend needs to parse and render edit blocks
- Edge cases when "find" text doesn't match exactly

---

## Template for New Decisions

```markdown
## ADR-XXX: [Title]

**Date:** YYYY-MM-DD

**Status:** Proposed | Accepted | Deprecated | Superseded

**Context:**
What is the issue that we're seeing that motivates this decision?

**Decision:**
What is the change that we're proposing and/or doing?

**Rationale:**
Why is this the best choice among the alternatives?

**Consequences:**
What are the resulting context and trade-offs?
```
