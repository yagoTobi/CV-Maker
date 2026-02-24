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
