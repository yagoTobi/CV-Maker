# Deferred Items - Phase 01

## Pre-existing Test Failures (Out of Scope)

1. **useImport.test.ts** - 3 failures in "Test 4: JSON Import Link Label Derivation"
   - Tests expect labels like `linkedin.com/in/testuser` but deriveLinkLabel now returns `LinkedIn`
   - Likely a test-vs-code drift from a prior deriveLinkLabel change
   - Files: `frontend/src/__tests__/useImport.test.ts`

2. **import-flow-state.test.tsx** - 1 failure
   - Module resolution issue (test cannot find module)
   - File: `frontend/src/__tests__/import-flow-state.test.tsx`

3. **resize-handle.test.tsx** - Pre-existing failure
   - File: `frontend/src/__tests__/resize-handle.test.tsx`
