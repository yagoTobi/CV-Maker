1. CTAN downloads can fail silently - Always verify downloaded .sty files aren't HTML error pages
2. tlmgr is reliable - For missing LaTeX packages, sudo tlmgr install is the safest approach
3. React hooks must be consistent - Never define hooks after conditional returns
4. XeLaTeX templates need fonts bundled - fontspec errors usually mean missing font files
5. Error context matters - Showing lines around errors helps debug LaTeX failures
6. Hardcoded URLs block deployment - Always use environment variables (VITE_API_URL, CORS_ORIGINS)
7. Duplicate config drifts apart - Centralize configuration in a single source of truth (e.g., config/templates.py)
8. Dead code accumulates silently - Regularly audit for unused imports, endpoints, and UI fields
9. Error boundaries prevent full crashes - Add React ErrorBoundary early, not after users report crashes
10. CORS wildcards are lazy - Specify exact methods/headers needed (GET, POST vs "*")
11. Sanitize user input before LaTeX compilation - Block \write18, \openin, \catcode and similar shell-escape commands
12. Use Literal types for enums in Pydantic - Literal["user", "assistant"] catches invalid values at validation time
13. Large CSS files become unmaintainable - Split into component CSS (see TemplateSelector.css pattern) or use CSS Modules
14. Custom hooks reduce component complexity - Extract related state into useTemplates, useCompiler, useChat patterns
15. Hook return objects cause infinite loops - useApi() returns new object each render; remove from useEffect deps or use useMemo
16. Sequential string replacement breaks LaTeX escaping - Replacing `\` first then `{` re-escapes the `{` in `\textbackslash{}`. Use a single-pass regex (`re.compile` + `re.sub` with a dict lookup) to escape all special chars in one pass.
17. useRef mirrors state for stable event listeners - `addEventListener` callbacks capture the value at registration time (stale closure). Mirror state with a `useRef` (update both in setState calls) so the callback reads `ref.current` which is always fresh. Pattern: `const widthRef = useRef(initial); setWidth(n => { widthRef.current = n; return n; })`.
18. onDragEnter not onDragOver for drop-target state - `onDragOver` fires every frame (up to 60fps) while dragging; use `onDragEnter` (fires once per element boundary crossing) to update `dragOver` state. Always call `e.preventDefault()` in `onDragOver` to allow dropping.
19. Jinja2 custom delimiters avoid LaTeX brace conflicts - Default `{{ }}` / `{% %}` clash with LaTeX `{}`. Configure `Environment(variable_start_string='(( ', variable_end_string=' ))', block_start_string='(% ', block_end_string=' %)')` to use `(( var ))` / `(% block %)` syntax.
20. isDirty tracking via useEffect + ref - To know if data changed since last action (e.g., last compile), store `lastRef.current = data` on action completion and track changes with `useEffect(() => { if (lastRef.current !== null) setIsDirty(true); }, [data])`. Cleaner than threading a dirty flag through every mutation handler.
21. draggable={true} in JSX breaks cursor positioning in child inputs - The browser modifies mouse event handling for all descendants of a draggable element, not just for drag events. Even if you cancel `dragstart` with `e.preventDefault()`, subsequent clicks to reposition the text cursor in inputs inside the card fail. Fix: omit `draggable` from JSX entirely. In the grip handle's `onMouseDown`, imperatively set `el.draggable = true` via `closest('[data-drag-card]')`. Reset to `false` in `onDragEnd`. The element is only draggable during the brief drag gesture.
22. \enspace followed by a letter creates an undefined command - In LaTeX, `\enspace` is a control word. Control words end at the first non-letter, so `\enspaceLondon` is parsed as the command `\enspaceLondon` (undefined). Always terminate `\enspace` (and any control word that should not absorb the following letter) with `{}`: write `\enspace{}` before text content. `{` is not a letter so it ends the command name without producing output.
