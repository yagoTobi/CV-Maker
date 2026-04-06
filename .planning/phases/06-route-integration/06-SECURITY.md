---
phase: 06
slug: route-integration
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-06
---

# Phase 06 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| N/A | No new trust boundaries introduced. Phase 6 is purely frontend route restructuring and dead code removal. No new API endpoints, no new user inputs, no new data flows. | N/A |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-06-01 | Spoofing | NavBar navigation links | accept | NavBar uses react-router navigate() — client-side only, no server-side redirect injection possible. Low risk. | closed |
| T-06-02 | Information Disclosure | Dead routes returning 404 | accept | Removed routes (/direct-edit, /import) now 404 via NotFound component — no information leakage. Standard behavior. | closed |
| T-06-03 | Tampering | SUPPORTED_TEMPLATES set | accept | Client-side guard only. Even if bypassed via DevTools, the backend generates LaTeX for any template ID — no security issue, just a UX guard for templates without web rendering. | closed |
| T-06-04 | Spoofing | Dashboard navigate state | accept | baseVersionId is passed via React Router state (in-memory, not URL). ApplyToJobScreen fetches and validates the version from API before use. | closed |
| T-06-05 | Denial of Service | Dead code removal | accept | Deletion reduces attack surface by removing unused code paths. No risk introduced. | closed |

*Status: open / closed*
*Disposition: mitigate (implementation required) / accept (documented risk) / transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-06-01 | T-06-01 | Client-side navigation only, no redirect injection vector | GSD orchestrator | 2026-04-06 |
| AR-06-02 | T-06-02 | Standard 404 behavior, no information leakage | GSD orchestrator | 2026-04-06 |
| AR-06-03 | T-06-03 | UX guard only, backend validates independently | GSD orchestrator | 2026-04-06 |
| AR-06-04 | T-06-04 | In-memory state, API validates before use | GSD orchestrator | 2026-04-06 |
| AR-06-05 | T-06-05 | Dead code removal reduces attack surface | GSD orchestrator | 2026-04-06 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-06 | 5 | 5 | 0 | GSD orchestrator (auto) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-06
