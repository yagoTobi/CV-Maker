# LaTeX-Jinja2 Template Agent Memory

## Critical Edge Cases

### Empty Arrays/Lists
- **Empty bullets**: Guard with `(% if job.bullets %)` to avoid empty itemize blocks
- **Empty contact info**: Guard `\address{}` and `\contacts{}` with existence checks
- **Empty sections**: Handled by section-level guards like `(% if work %)`

### Contact Line Separators (Deedy)
Build array first, then join to avoid leading/trailing separators:
```jinja2
(% set contact_parts = [] -%)
(% if field -%)(% set _ = contact_parts.append(value) -%)(% endif -%)
(( contact_parts | join('\,|\,') ))
```

## URL Escaping in LaTeX Templates

### latex_url_escape Filter
- **Purpose**: Escape URLs for `\href{}` commands in LaTeX
- **Location**: Defined in `backend/routes/generate_latex.py`
- **Escapes**: Only `%` → `\%` and `#` → `\#` (lighter than full latex_escape)
- **Why minimal**: hyperref package handles most special characters natively
- **Applied to**: First argument of all `\href{}` commands across templates

### Template Usage Pattern
```latex
\href{(( url | latex_url_escape ))}{(( display_text | latex_escape ))}
```
- URL gets `latex_url_escape` (light escaping for % and #)
- Display text gets `latex_escape` (full escaping)

### Templates Using \href
- **med-length-proff-cv.tex.j2**: Line 28 - personal contact items with URLs
- **deedy-resume.tex.j2**: Lines 16-18 - email mailto and link URLs
- **mcdowell-cv.tex.j2**: No \href usage (plain text contacts)

## Custom Jinja2 Delimiters
- Variables: `(( variable ))` NOT `{{ }}`
- Blocks: `(% block %)` NOT `{% %}`
- Comments: `(# comment #)` NOT `{# #}`
- **Never use default Jinja2 syntax** - conflicts with LaTeX braces

## Key Files
- `backend/routes/generate_latex.py` - Jinja2 env setup, filters, form-to-LaTeX logic
- `backend/latex_templates/*.tex.j2` - 3 templates (med-length, deedy, mcdowell)
- `backend/config/templates.py` - Template configs with engine requirements
