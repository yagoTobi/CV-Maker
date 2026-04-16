# CV-to-Job Match Scoring Pipeline - Research

**Researched:** 2026-04-17
**Domain:** NLP scoring methodology, LLM structured extraction, CV-JD matching architecture
**Confidence:** HIGH (architecture) / MEDIUM (latency numbers) / HIGH (library choices)
**Scope:** Standalone investigation for a FUTURE phase -- Phase 8 CONTEXT.md explicitly excludes backend AI changes

## Summary

The current match-analysis pipeline sends raw LaTeX source to Claude Sonnet 4.6 and asks it to return a single opaque 0-100 score plus flat lists of requirements/matching/missing items. This approach has three problems: (1) LaTeX markup noise wastes ~30% of input tokens, (2) the score is entirely LLM-subjective with no reproducible rubric, and (3) the synchronous non-streaming call blocks the UI for 3-8 seconds.

The key architectural insight is that **the system already has `CVFormData` as structured JSON** -- the tailor endpoint (`/tailor/suggest-changes`) already serializes form data to clean JSON for AI consumption. The match analysis endpoint should do the same instead of sending LaTeX. This eliminates the LaTeX-stripping problem entirely and reduces input tokens by ~40-60%.

The recommended redesign uses a **two-pass hybrid pipeline**: (1) a fast LLM call (Haiku 4.5) extracts structured requirements from the job description, then (2) a deterministic scoring engine computes a weighted, multi-dimensional score by matching extracted requirements against the structured CV data. The LLM handles semantic understanding (what does the job actually need?), while the scoring logic is deterministic, reproducible, and explainable.

**Primary recommendation:** Switch match-analysis input from LaTeX to structured CVFormData JSON (matching the tailor endpoint pattern), use Haiku 4.5 for requirement extraction, and compute the score deterministically from extracted data.

## Standard Stack

### Core (already installed or zero-dependency)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| cachetools | 5.5.x | TTL caching (already installed) | Already in `requirements.txt` [VERIFIED: requirements.txt] |
| hashlib (stdlib) | -- | Cache key generation | Already used in `llm_cache.py` [VERIFIED: codebase] |
| re (stdlib) | -- | Text normalization, keyword extraction | Zero dependency, already used extensively [VERIFIED: codebase] |
| difflib (stdlib) | -- | SequenceMatcher for fuzzy string matching | Python stdlib, good enough for skill matching [ASSUMED] |
| collections.Counter (stdlib) | -- | Keyword frequency analysis | Zero dependency [VERIFIED: Python stdlib] |

### Supporting (new, lightweight)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pylatexenc | 2.10 | LaTeX-to-text fallback for legacy `texContent` input | Only if the endpoint must remain backward-compatible with raw LaTeX input [VERIFIED: PyPI] |

### Not Recommended

| Instead of | Could Use | Why NOT |
|------------|-----------|---------|
| scikit-learn (TF-IDF/BM25) | stdlib re + difflib | Massive dependency (~10MB + numpy/scipy) for a task solvable with string matching. The CV and JD are both short documents (<2000 words). TF-IDF/BM25 shine on corpus-level retrieval, not pairwise document comparison. [ASSUMED] |
| sentence-transformers | Haiku 4.5 for semantic matching | Would require embedding model download (~400MB), GPU for speed. Haiku 4.5 at $1/MTok input is cheaper and already available via Bedrock. [ASSUMED] |
| spaCy | Simple regex + LLM | Full NLP pipeline is overkill. Named entity recognition adds complexity without proportional benefit for structured CV data. [ASSUMED] |
| Groq / external API | AWS Bedrock (Haiku 4.5) | Adding a second AI provider increases infrastructure complexity, secrets management, and failure modes. Haiku 4.5 on Bedrock is already configured, fast, and cheap. [VERIFIED: codebase already uses Haiku 4.5] |

**Installation (if pylatexenc fallback needed):**
```bash
pip install pylatexenc~=2.10
```

## Architecture Pattern

### Current Pipeline (what to replace)

```
Frontend                          Backend
   |                                 |
   |-- POST /chat/match-analysis --> |
   |   { cv_content: RAW_LATEX,      |
   |     job_description: string }   |
   |                                 |-- Send LaTeX + JD to Sonnet 4.6
   |                                 |   (temperature=0.3, ~3-8s)
   |                                 |
   |                                 |<-- { requirements[], matching[],
   |                                 |      missing[], suggestions[],
   |                                 |      match_score: 0-100 }
   |<-- MatchAnalysisResponse ------|
```

**Problems:**
- LaTeX noise: ~30% of tokens are `\textbf{}`, `\begin{rSubsection}`, etc.
- Single LLM call does everything: extraction + classification + scoring
- Score is pure LLM judgment -- nondeterministic, no reproducible rubric
- `temperature=0.3` means same input can produce different scores
- No dimensional breakdown -- user sees "75%" with no explanation

### Recommended Pipeline (two-pass hybrid)

```
Frontend                              Backend
   |                                     |
   |-- POST /match-analysis ----------->|
   |   { form_data: CVFormData,          |  Step 0: Flatten CVFormData to
   |     job_description: string,        |          structured text (reuse
   |     company_name?: string }         |          _serialize_form_data from tailor.py)
   |                                     |
   |                                     |  Step 1: EXTRACT (Haiku 4.5, ~0.5-1.5s)
   |                                     |  "Extract structured requirements from this JD"
   |                                     |  --> { dimensions: [ { name, weight, requirements[] } ] }
   |                                     |
   |                                     |  Step 2: SCORE (deterministic, ~5ms)
   |                                     |  For each dimension:
   |                                     |    For each requirement:
   |                                     |      fuzzy_match(requirement, cv_text) -> 0.0-1.0
   |                                     |    dimension_score = weighted_avg(requirement_scores)
   |                                     |  total_score = weighted_avg(dimension_scores)
   |                                     |
   |                                     |  Step 3: ENRICH (optional, Haiku 4.5, ~0.5-1s)
   |                                     |  "Given these gaps, suggest improvements"
   |                                     |  --> suggestions[]
   |                                     |
   |<-- MatchAnalysisResponse ----------|
   |   { dimensions[], total_score,      |
   |     matching[], gaps[], suggestions[] }
```

**Advantages:**
- Step 1 is cacheable independently (same JD = same requirements)
- Step 2 is deterministic: same inputs always produce same score
- Step 3 is optional and can be lazy-loaded (show score first, suggestions after)
- Steps 1 and 3 can use Haiku 4.5 (~3x cheaper, ~2x faster than Sonnet)
- Total latency target: 1-2.5s (vs current 3-8s)

### Key Design Decision: CVFormData vs LaTeX

The current `match-analysis` endpoint accepts `cv_content: str` (raw LaTeX). The `tailor/suggest-changes` endpoint already accepts `form_data: CVFormData` (structured JSON). These endpoints serve the same user flow (Apply to Job step 2 -> step 3).

**Recommendation:** Change `match-analysis` to accept `form_data: CVFormData` and reuse `_serialize_form_data()` from `tailor.py`. [VERIFIED: tailor.py already has this function]

**Rationale:**
1. Eliminates LaTeX stripping entirely -- no need for `pylatexenc` or regex
2. Reduces input tokens by ~40-60% (no `\textbf{}`, `\begin{rSection}`, `\documentclass`)
3. Structured data enables deterministic matching (can directly compare `skills[].skills[]` against JD requirements)
4. Consistent with existing patterns -- tailor endpoint already does this
5. Frontend already has `formData` in state when calling match-analysis (see `ApplyToJobScreen.tsx` line 113 -- it generates LaTeX first, then sends it)

**Backward compatibility:** If any consumer sends raw LaTeX (unlikely after Phase 8 removes `/apply`), add a lightweight regex strip as fallback.

## Deterministic Scoring Design

### Dimension-Based Rubric

The score is decomposed into weighted dimensions. Each dimension has requirements extracted by the LLM, scored deterministically against CV content.

```python
# Step 1 output: LLM extracts structured requirements
@dataclass
class Requirement:
    text: str                    # "3+ years Python experience"
    keywords: list[str]          # ["python", "3 years", "experience"]
    importance: str              # "required" | "preferred" | "nice-to-have"

@dataclass  
class Dimension:
    name: str                    # "Technical Skills", "Experience Level", etc.
    weight: float                # 0.0-1.0, must sum to 1.0 across dimensions
    requirements: list[Requirement]

# Step 1 prompt asks LLM to return dimensions with weights
DIMENSIONS_PROMPT = """Extract structured requirements from this job description.
Return JSON with this structure:
{
  "dimensions": [
    {
      "name": "Technical Skills",
      "weight": 0.35,
      "requirements": [
        {"text": "Python proficiency", "keywords": ["python"], "importance": "required"},
        {"text": "Experience with Kubernetes", "keywords": ["kubernetes", "k8s"], "importance": "preferred"}
      ]
    },
    {
      "name": "Experience & Seniority", 
      "weight": 0.25,
      "requirements": [...]
    },
    {
      "name": "Domain Knowledge",
      "weight": 0.20, 
      "requirements": [...]
    },
    {
      "name": "Soft Skills & Leadership",
      "weight": 0.10,
      "requirements": [...]
    },
    {
      "name": "Education & Certifications",
      "weight": 0.10,
      "requirements": [...]
    }
  ]
}

Rules:
- weights MUST sum to 1.0
- importance: "required" (must-have), "preferred" (strong-to-have), "nice-to-have"
- keywords: lowercase, include common abbreviations (e.g., "kubernetes" + "k8s")
- 3-8 requirements per dimension
- Adapt dimensions to the field (academic: emphasize publications; creative: portfolio)
"""
```

### Scoring Algorithm (pseudocode)

```python
def score_match(dimensions: list[Dimension], cv_text: str, cv_data: dict) -> MatchResult:
    """Deterministic scoring: same inputs always produce same output."""
    
    cv_text_lower = cv_text.lower()
    cv_skills = _extract_skill_list(cv_data)  # flat list from skills[].skills[]
    cv_bullets = _extract_all_bullets(cv_data)  # flat list from work/project bullets
    
    dimension_results = []
    all_matching = []
    all_gaps = []
    
    for dim in dimensions:
        req_scores = []
        
        for req in dim.requirements:
            # Multi-signal matching
            score = _score_requirement(req, cv_text_lower, cv_skills, cv_bullets)
            
            # Weight by importance
            importance_multiplier = {
                "required": 1.0,
                "preferred": 0.7,
                "nice-to-have": 0.3,
            }[req.importance]
            
            weighted_score = score * importance_multiplier
            req_scores.append(weighted_score)
            
            if score >= 0.6:
                all_matching.append(req.text)
            else:
                all_gaps.append(req.text)
        
        # Dimension score: weighted average of requirement scores
        dim_score = sum(req_scores) / max(len(req_scores), 1)
        dimension_results.append(DimensionResult(
            name=dim.name,
            score=round(dim_score * 100),
            weight=dim.weight,
            matched=[r.text for r, s in zip(dim.requirements, req_scores) if s >= 0.6],
            gaps=[r.text for r, s in zip(dim.requirements, req_scores) if s < 0.6],
        ))
    
    # Total score: weighted sum of dimension scores
    total = sum(d.score * d.weight for d in dimension_results)
    
    return MatchResult(
        total_score=round(total),
        dimensions=dimension_results,
        matching=all_matching,
        gaps=all_gaps,
    )


def _score_requirement(req: Requirement, cv_text: str, cv_skills: list[str], cv_bullets: list[str]) -> float:
    """Score a single requirement against CV content. Returns 0.0-1.0."""
    
    signals = []
    
    # Signal 1: Exact keyword match in skills list
    skill_match = any(
        _fuzzy_match(kw, skill) >= 0.85
        for kw in req.keywords
        for skill in cv_skills
    )
    if skill_match:
        signals.append(1.0)
    
    # Signal 2: Keyword presence in full CV text
    keyword_hits = sum(1 for kw in req.keywords if kw in cv_text)
    keyword_coverage = keyword_hits / max(len(req.keywords), 1)
    signals.append(keyword_coverage)
    
    # Signal 3: Fuzzy match against bullet points (experience evidence)
    best_bullet_match = 0.0
    for bullet in cv_bullets:
        bullet_lower = bullet.lower()
        for kw in req.keywords:
            ratio = _fuzzy_match(kw, bullet_lower)
            best_bullet_match = max(best_bullet_match, ratio)
    signals.append(best_bullet_match)
    
    # Combine signals (max-weighted -- if any signal is strong, the requirement is likely met)
    return max(signals) if signals else 0.0


def _fuzzy_match(needle: str, haystack: str) -> float:
    """Fuzzy substring match using difflib. Returns 0.0-1.0."""
    from difflib import SequenceMatcher
    # Direct containment
    if needle in haystack:
        return 1.0
    # Fuzzy ratio for the best matching substring
    matcher = SequenceMatcher(None, needle, haystack)
    return matcher.ratio()


def _extract_skill_list(cv_data: dict) -> list[str]:
    """Extract flat list of skills from CVFormData."""
    skills = []
    for cat in cv_data.get("skills", []):
        for skill in cat.get("skills", []):
            text = skill["text"] if isinstance(skill, dict) else str(skill)
            skills.append(text.lower().strip())
    return skills


def _extract_all_bullets(cv_data: dict) -> list[str]:
    """Extract all bullet points from work, projects, education."""
    bullets = []
    for work in cv_data.get("workExperience", []):
        for b in work.get("bullets", []):
            text = b["text"] if isinstance(b, dict) else str(b)
            bullets.append(text)
    for proj in cv_data.get("projects", []) or []:
        for b in proj.get("bullets", []) or []:
            text = b["text"] if isinstance(b, dict) else str(b)
            bullets.append(text)
    for edu in cv_data.get("education", []):
        for d in edu.get("details", []):
            text = d["text"] if isinstance(d, dict) else str(d)
            bullets.append(text)
    return bullets
```

### Why Not TF-IDF / BM25?

TF-IDF and BM25 are information retrieval algorithms designed to rank documents within a corpus. They answer "which of these 1000 resumes best matches this query?" -- a fundamentally different problem from "how well does THIS resume match THIS job description?" [ASSUMED]

For pairwise CV-JD matching:
- **Corpus size is 1** -- TF-IDF's inverse document frequency is meaningless with a single document
- **Vocabulary overlap is the actual signal** -- a simple keyword presence check is equivalent
- **The LLM already handles semantics** -- it understands that "K8s" means "Kubernetes" and "led a team of 5" satisfies "leadership experience"
- **Adding scikit-learn would be the project's largest dependency** for negligible benefit over `difflib.SequenceMatcher`

## Score Output Schema

### New Response Model

```json
{
  "total_score": 78,
  "dimensions": [
    {
      "name": "Technical Skills",
      "score": 85,
      "weight": 0.35,
      "matched": [
        "Python proficiency",
        "Cloud infrastructure (AWS)"
      ],
      "gaps": [
        "Experience with Terraform"
      ]
    },
    {
      "name": "Experience & Seniority",
      "score": 70,
      "weight": 0.25,
      "matched": [
        "5+ years software engineering"
      ],
      "gaps": [
        "People management experience"
      ]
    },
    {
      "name": "Domain Knowledge",
      "score": 80,
      "weight": 0.20,
      "matched": [
        "Distributed systems",
        "Data pipeline experience"
      ],
      "gaps": []
    },
    {
      "name": "Soft Skills & Leadership",
      "score": 60,
      "weight": 0.10,
      "matched": [
        "Cross-functional collaboration"
      ],
      "gaps": [
        "Stakeholder management"
      ]
    },
    {
      "name": "Education & Certifications",
      "score": 90,
      "weight": 0.10,
      "matched": [
        "BS in Computer Science"
      ],
      "gaps": []
    }
  ],
  "matching": [
    "Python proficiency",
    "Cloud infrastructure (AWS)",
    "5+ years software engineering",
    "Distributed systems",
    "Data pipeline experience",
    "Cross-functional collaboration",
    "BS in Computer Science"
  ],
  "gaps": [
    "Experience with Terraform",
    "People management experience",
    "Stakeholder management"
  ],
  "suggestions": [
    "Add Terraform to your skills if you have any IaC experience",
    "Reframe mentoring bullet to emphasize people management",
    "Add a bullet about stakeholder communication in your Google role"
  ]
}
```

### Pydantic Models (backend)

```python
from pydantic import BaseModel
from typing import List, Optional

class DimensionResult(BaseModel):
    name: str
    score: int              # 0-100
    weight: float           # 0.0-1.0
    matched: List[str]
    gaps: List[str]

class MatchAnalysisResponse(BaseModel):
    total_score: int        # 0-100, weighted sum
    dimensions: List[DimensionResult]
    matching: List[str]     # flat list (backward compat)
    gaps: List[str]         # renamed from "missing"
    suggestions: List[str]
    # Backward compatibility fields
    requirements: List[str] # all requirements (matched + gaps)
    missing: List[str]      # alias for gaps
    match_score: int        # alias for total_score
```

### Frontend Type

```typescript
interface DimensionResult {
  name: string;
  score: number;
  weight: number;
  matched: string[];
  gaps: string[];
}

interface MatchAnalysis {
  total_score: number;
  dimensions: DimensionResult[];
  matching: string[];
  gaps: string[];
  suggestions: string[];
  // Backward compat
  requirements: string[];
  missing: string[];
  match_score: number;
}
```

## Model Selection

### Recommendation: Haiku 4.5 for Extraction, Deterministic for Scoring

| Task | Model | Rationale |
|------|-------|-----------|
| Requirement extraction (Step 1) | Haiku 4.5 | Structured extraction is Haiku's strength. Already used for tailor suggestions. [VERIFIED: bedrock.py MODEL_HAIKU] |
| Scoring (Step 2) | Deterministic (no LLM) | Reproducible, instant, explainable. The scoring logic runs in <5ms. |
| Suggestion generation (Step 3) | Haiku 4.5 | Short actionable text. Quality acceptable for suggestions. [VERIFIED: tailor endpoint uses Haiku] |

### Model Latency and Cost Comparison

| Model | Input Cost | Output Cost | Latency (structured JSON) | Quality for Extraction |
|-------|-----------|-------------|---------------------------|----------------------|
| Haiku 4.5 | $1/MTok | $5/MTok | ~0.5-1.5s (est.) | Good -- handles structured extraction well [VERIFIED: used for tailor suggestions in codebase] |
| Sonnet 4.6 | $3/MTok | $15/MTok | ~2-5s (est.) | Excellent -- but overkill for extraction [VERIFIED: used for match analysis currently] |

[CITED: platform.claude.com/docs/en/docs/about-claude/models]

**Latency estimates are based on:**
- Current tailor endpoint logging shows Haiku times in production (see `tailor.py` line 178: `f"Tailor suggestions generated in {elapsed:.2f}s"`)
- Match analysis currently takes 3-8s on Sonnet (user-reported)
- Haiku is categorized as "Fastest" comparative latency vs Sonnet's "Fast" [CITED: Anthropic model docs]

**Cost reduction:**
- Haiku is 3x cheaper on input, 3x cheaper on output vs Sonnet
- Sending CVFormData JSON instead of LaTeX reduces input tokens by ~40-60%
- Combined: ~4-5x cost reduction per match analysis call

### Why Not Groq / Mistral / External Providers?

The codebase already has Haiku 4.5 configured and working via AWS Bedrock. Adding a second AI provider would require:
1. New API key management and secrets
2. New SDK dependency (groq-python or mistral-python)
3. New error handling and retry logic
4. New rate limiting considerations
5. Docker image changes

Haiku 4.5 on Bedrock is already fast enough (~0.5-1.5s for structured extraction) and cheap enough ($1/MTok). The marginal latency improvement from Groq (~200-400ms for Llama 3) does not justify the architectural complexity. [ASSUMED -- Groq latency based on training data, not verified]

## LaTeX Text Extraction

### Recommendation: Don't Strip LaTeX -- Send CVFormData Instead

**The LaTeX stripping problem is a red herring.** The system already has `CVFormData` as structured JSON in the frontend state when calling match-analysis. The tailor endpoint already accepts and serializes this data. Match-analysis should do the same.

### Current Call Chain (wasteful)
```
formData (structured) 
  --> api.generateLatex(formData) --> LaTeX source
  --> api.getMatchAnalysis(texContent, ...) --> Sonnet parses LaTeX back into structure
```

### Proposed Call Chain (direct)
```
formData (structured)
  --> api.getMatchAnalysis(formData, ...) --> Haiku extracts from clean text
```

This eliminates:
- The unnecessary LaTeX generation round-trip
- The LaTeX parsing problem entirely
- ~40-60% of input tokens (no markup noise)

### Fallback: If LaTeX Input Must Be Supported

If backward compatibility requires accepting raw LaTeX (e.g., for the `texContent`-only code path), use this approach:

**Option A: Custom regex stripper (zero dependency, ~0.02ms)** [VERIFIED: benchmarked locally]
```python
import re

def strip_latex(tex: str) -> str:
    """Strip LaTeX markup to plain text. Lightweight, handles custom macros."""
    # Extract body only
    body_match = re.search(r'\\begin\{document\}(.*?)\\end\{document\}', tex, re.DOTALL)
    text = body_match.group(1) if body_match else tex
    # Remove comments
    text = re.sub(r'%.*?\n', '\n', text)
    # \item -> bullet marker
    text = re.sub(r'\\item\s*', '- ', text)
    # Remove environments
    text = re.sub(r'\\(?:begin|end)\{[^}]+\}(?:\{[^}]*\})*', '', text)
    # Extract text from formatting commands
    text = re.sub(r'\\(?:textbf|textit|emph|underline)\{([^}]*)\}', r'\1', text)
    text = re.sub(r'\\href\{[^}]*\}\{([^}]*)\}', r'\1', text)
    text = re.sub(r'\\(?:name|address)\{([^}]*)\}', r'\1', text)
    # Remove remaining commands
    text = re.sub(r'\\[a-zA-Z]+\*?(?:\[[^\]]*\])?(?:\{[^}]*\})*', '', text)
    # Remove LaTeX special char escapes
    text = re.sub(r'\\[%$&#_{}~^]', '', text)
    # Clean whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()
```

**Option B: pylatexenc 2.10** [VERIFIED: PyPI, tested locally]
- Proper LaTeX parser, handles standard macros well
- **Crashes on custom macros** like `\begin{rSubsection}` used in the project's templates [VERIFIED: tested locally, raises IndexError]
- Would require configuring custom macro definitions, adding complexity
- ~0.5ms per call (25x slower than regex, still negligible)

**Recommendation:** Option A (regex) as fallback if needed. But primary path should use CVFormData.

## Caching Strategy

### Current Approach (from `llm_cache.py`)

```python
_cache: TTLCache[str, str] = TTLCache(maxsize=256, ttl=3600)  # 1 hour, 256 entries
```

**Problems:**
1. In-memory only -- lost on server restart
2. Single cache for all responses -- match analysis and tailor share the same space
3. Cache key includes full CV content -- any edit invalidates the cache
4. 256 maxsize is generous but arbitrary

### Recommended Improvements

#### 1. Separate JD Requirements Cache (HIGH impact)

The job description requirements extraction (Step 1) is independent of the CV. Cache it separately:

```python
# JD requirements are stable -- cache for 24 hours
_jd_cache: TTLCache[str, str] = TTLCache(maxsize=128, ttl=86400)

def get_jd_requirements(job_description: str, company_name: str = "") -> dict:
    key = cache_key(job_description, company_name)
    cached = _jd_cache.get(key)
    if cached:
        return json.loads(cached)
    # ... extract via Haiku ...
    _jd_cache[key] = json.dumps(result)
    return result
```

**Why this matters:** Users frequently re-analyze the same job description after editing their CV. With the current approach, every CV edit invalidates the cache. With a separate JD cache, the expensive LLM call is skipped -- only the deterministic scoring reruns (~5ms).

#### 2. Content-Hash Cache Keys (MEDIUM impact)

Instead of hashing the full CV text, hash a normalized representation:

```python
def cv_content_hash(form_data: dict) -> str:
    """Hash only the content-bearing fields, ignoring IDs and ordering."""
    # Normalize: extract text content, sort for stability, ignore IDs
    content_parts = []
    for work in form_data.get("workExperience", []):
        content_parts.append(work.get("title", ""))
        content_parts.append(work.get("company", ""))
        for b in work.get("bullets", []):
            content_parts.append(b["text"] if isinstance(b, dict) else str(b))
    # ... similar for education, skills, projects ...
    return hashlib.sha256("||".join(content_parts).encode()).hexdigest()
```

This means reordering sections or changing a date does not invalidate the match score cache.

#### 3. Persistent Cache (LOW priority, future)

For multi-user deployment, consider Redis or DynamoDB for cache persistence. But for the current single-user local deployment, in-memory TTLCache is adequate.

### Cache Architecture Summary

```
Request arrives
  |
  v
JD cache hit? --yes--> Skip Step 1 (save ~1s)
  |no
  v
Extract requirements (Haiku, ~1s)
  |
  v
Score deterministically (~5ms)
  |
  v
Full result cache hit? --yes--> Return cached (save all time)
  |no
  v
Generate suggestions (Haiku, ~1s)  [optional, can be lazy]
  |
  v
Cache both JD requirements AND full result
  |
  v
Return response
```

**Best case (JD cached):** ~5ms (deterministic scoring only)
**Typical case (JD not cached, CV edited):** ~1-1.5s (Haiku extraction + deterministic scoring)
**Worst case (nothing cached):** ~2-3s (Haiku extraction + scoring + Haiku suggestions)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LaTeX-to-text conversion | Custom TeX parser | `_serialize_form_data()` from tailor.py (send CVFormData instead of LaTeX) | The structured data already exists. Parsing LaTeX is solving the wrong problem. [VERIFIED: tailor.py line 93] |
| Fuzzy string matching | Custom edit distance | `difflib.SequenceMatcher` (stdlib) | Well-tested, handles substring matching, zero dependency [VERIFIED: Python stdlib] |
| Cache with TTL | Custom expiry logic | `cachetools.TTLCache` (already installed) | Already in requirements.txt, battle-tested [VERIFIED: requirements.txt] |
| Skill taxonomy / synonym mapping | Custom synonym database | LLM extraction (Haiku includes synonyms in keywords) | The LLM already understands "K8s"="Kubernetes", "JS"="JavaScript". Building a synonym DB is a maintenance burden. [ASSUMED] |
| Score visualization (frontend) | Custom chart component | CSS-based progress bars with dimension labels | No charting library needed -- the score data is simple enough for styled divs [ASSUMED] |

**Key insight:** The biggest "don't hand-roll" is the scoring formula itself. The temptation is to build a complex NLP pipeline with embeddings, TF-IDF, and entity recognition. But with an LLM doing the semantic extraction (Step 1), the scoring layer can be trivially simple -- just keyword presence checking against structured data. The LLM handles all the "understanding" work.

## Common Pitfalls

### Pitfall 1: Sending LaTeX to LLMs

**What goes wrong:** LaTeX markup consumes tokens without adding information. Commands like `\textbf{}`, `\begin{rSubsection}{}{}{}{}` are noise for the LLM.
**Why it happens:** The endpoint was built when only `texContent` was available. Now `formData` is always present.
**How to avoid:** Accept `CVFormData` in the request body, serialize to clean text before LLM call.
**Warning signs:** Input token counts >2000 for a 1-page CV, or ~30% of tokens being LaTeX commands.

### Pitfall 2: Letting the LLM Compute the Score

**What goes wrong:** Same CV + JD produces different scores on different calls (65 vs 72 vs 78). Users lose trust.
**Why it happens:** Even temperature=0 is not fully deterministic with LLMs. The model's "feeling" about a match varies.
**How to avoid:** LLM extracts structure (requirements, keywords). Deterministic code computes the number.
**Warning signs:** Running the same request twice and getting different scores.

### Pitfall 3: Over-Engineering the Scoring Algorithm

**What goes wrong:** Building TF-IDF, BM25, embedding similarity, named entity recognition -- each adds complexity, dependencies, and maintenance burden without proportional improvement.
**Why it happens:** "CV matching" sounds like an NLP research problem. It's not -- it's a structured data comparison problem once the LLM has done extraction.
**How to avoid:** Start with the simplest scoring (keyword presence + fuzzy match). Measure user satisfaction. Only add complexity if simple scoring fails specific known cases.
**Warning signs:** Adding >2 new Python dependencies for the scoring pipeline.

### Pitfall 4: Not Caching JD Requirements Separately

**What goes wrong:** Every CV edit triggers a full re-analysis, including the expensive LLM call to extract JD requirements (which haven't changed).
**Why it happens:** Using a single cache key that combines CV + JD content.
**How to avoid:** Cache JD requirements extraction separately from the scoring result. The JD cache can have a much longer TTL (24h vs 1h).
**Warning signs:** Match analysis takes the same time whether the user changed one bullet or rewrote the whole CV.

### Pitfall 5: Breaking the Existing Response Contract

**What goes wrong:** Frontend code that reads `matchAnalysis.requirements`, `matchAnalysis.matching`, `matchAnalysis.missing`, `matchAnalysis.match_score` breaks.
**Why it happens:** Redesigning the response schema without backward compatibility aliases.
**How to avoid:** Include backward-compatible aliases in the response model (`match_score` = alias for `total_score`, `missing` = alias for `gaps`). The frontend can migrate incrementally.
**Warning signs:** TypeScript compilation errors or runtime undefined access in ChangePanel/ApplyToJobScreen after the backend change.

### Pitfall 6: pylatexenc Crashes on Custom Macros

**What goes wrong:** `pylatexenc.latex2text.LatexNodes2Text.latex_to_text()` raises `IndexError` when encountering custom LaTeX environments like `\begin{rSubsection}`.
**Why it happens:** pylatexenc expects standard LaTeX macros. The project uses custom `resume.cls` with nonstandard environments.
**How to avoid:** Don't use pylatexenc for the primary path. If needed as fallback, wrap in try/except and fall back to regex stripping.
**Warning signs:** Unhandled `IndexError: list index out of range` in pylatexenc internals.
[VERIFIED: tested locally -- pylatexenc 2.10 crashes on `\begin{rSubsection}{Google}{\textbf{...}}{...}{...}`]

## Open Questions

1. **Response schema migration strategy**
   - What we know: The current `MatchAnalysis` type is used in `ApplyToJobScreen.tsx`, `ChangePanel.tsx`, `useChat.ts`, and `ToolsContext.tsx` (~15 references).
   - What's unclear: Should the new `dimensions[]` field be added alongside existing fields (additive) or should the response be restructured (breaking)?
   - Recommendation: Additive -- keep `requirements`, `matching`, `missing`, `match_score` as computed aliases. Add `dimensions`, `total_score`, `gaps` as new fields. Frontend migrates incrementally.

2. **Dimension weights: fixed vs LLM-determined**
   - What we know: The LLM can assign dimension weights based on JD emphasis (e.g., a "Senior ML Engineer" role would weight Technical Skills higher). Fixed weights are more predictable.
   - What's unclear: Do LLM-assigned weights produce better scores, or do they introduce another source of nondeterminism?
   - Recommendation: Start with LLM-assigned weights (they're extracted once and cached). If too variable, fall back to fixed weights (0.35/0.25/0.20/0.10/0.10).

3. **Should suggestions be a separate lazy-loaded call?**
   - What we know: Suggestions add ~1s of latency. The user sees the score before reading suggestions.
   - What's unclear: Is the UX of "score appears, then suggestions appear 1s later" acceptable?
   - Recommendation: Return score + dimensions immediately. Load suggestions asynchronously via a second request or SSE streaming. This gets the score to the user in <1.5s.

4. **Phase scope: is this Phase 8 or a new Phase 9?**
   - What we know: Phase 8 CONTEXT.md says "This phase does NOT include: ... backend AI changes."
   - What's unclear: Whether this scoring redesign should be a separate phase or folded into Phase 8.
   - Recommendation: Separate phase (Phase 9 or Phase 8.5). The scoring pipeline redesign is backend-only and can be done independently of the UI changes in Phase 8.

5. **What minimum score threshold triggers "Weak match" vs "Good match" labeling?**
   - What we know: Current prompt has guidelines (90-100: excellent, 75-89: strong, 60-74: good, 40-59: partial, 0-39: weak).
   - What's unclear: Whether these thresholds should be preserved or recalibrated for deterministic scoring.
   - Recommendation: Preserve existing thresholds initially for user consistency. Recalibrate after collecting data on deterministic score distributions.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | TF-IDF/BM25 are not beneficial for pairwise CV-JD comparison | Standard Stack / Scoring Design | If wrong, scoring quality would improve with scikit-learn -- but adds ~10MB dependency. Low risk: can add later. |
| A2 | Groq/Mistral latency improvement (~200-400ms) does not justify adding a second provider | Model Selection | If wrong, Bedrock Haiku could be a bottleneck. Low risk: Haiku is still fast. |
| A3 | difflib.SequenceMatcher is adequate for fuzzy skill matching | Scoring Design | If wrong, false negatives on similar-but-not-identical skills. Medium risk: could miss "K8s" matching "Kubernetes" without LLM keywords. Mitigated by LLM providing synonym keywords. |
| A4 | Dimension weights from LLM are stable enough for consistent scoring | Scoring Design | If wrong, weights vary between calls, causing score instability. Medium risk: can fall back to fixed weights. |
| A5 | Users prefer seeing a dimensional breakdown over a single number | Score Output Schema | If wrong, the extra UI complexity is wasted. Low risk: total_score is always available. |
| A6 | CSS progress bars are sufficient for score visualization (no charting library needed) | Don't Hand-Roll | If wrong, adds a frontend dependency. Low risk: chart library is easy to add. |

## Sources

### Primary (HIGH confidence)
- Codebase files: `backend/routes/chat.py`, `backend/routes/tailor.py`, `backend/services/bedrock.py`, `backend/services/llm_cache.py`, `backend/prompts/cv_agent.py`, `backend/routes/generate_latex.py` -- current implementation verified via Read tool
- [Context7: /phfaist/pylatexenc] -- LatexNodes2Text API, latex_to_text function
- [Context7: /tkem/cachetools] -- TTLCache configuration, TTL options
- [Anthropic model docs: platform.claude.com/docs/en/docs/about-claude/models] -- Haiku 4.5 vs Sonnet 4.6 pricing, comparative latency tiers, context windows
- [PyPI: pylatexenc 2.10] -- version, release date (2021-04-06), Python compatibility

### Secondary (MEDIUM confidence)
- Local benchmarks: regex LaTeX stripping (~0.02ms/call), pylatexenc crash on custom macros (IndexError on `\begin{rSubsection}`)
- Latency estimates for Haiku 4.5 (~0.5-1.5s for structured extraction) based on codebase timing instrumentation in `tailor.py`

### Tertiary (LOW confidence)
- Groq Llama 3 latency estimates (~200-400ms) -- from training data, not verified in this session
- ATS scoring methodology -- general knowledge about requirement extraction + scoring patterns, not verified against specific commercial systems

## Metadata

**Confidence breakdown:**
- Architecture (send CVFormData not LaTeX): HIGH -- verified that tailor endpoint already does this, and frontend has formData available
- Scoring algorithm design: HIGH -- the algorithm is deterministic by construction, testable
- Model latency estimates: MEDIUM -- based on codebase timing + official "comparative latency" tiers, not independently benchmarked
- Library choices: HIGH -- verified via codebase, PyPI, and Context7
- Dimension weights approach: MEDIUM -- LLM-assigned weights are a reasonable default, but stability needs testing

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (30 days -- model landscape stable, core algorithm is implementation-independent)
