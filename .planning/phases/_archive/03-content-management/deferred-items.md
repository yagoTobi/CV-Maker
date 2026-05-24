# Deferred Items -- Phase 03

## Pre-existing Test Failures (out of scope)

1. **useImport.test.ts** -- 3 failures in "Test 4: JSON Import Link Label Derivation"
   - Tests expect `deriveLinkLabel` to preserve labels without http(s):// prefix, but implementation derives labels for known domains regardless of protocol prefix
   - Files: `frontend/src/__tests__/useImport.test.ts` (lines 188, 256, 340)
   - Not caused by Phase 03 changes

2. **LandingScreen.test.tsx** -- 1 failure
   - Test expects "Build my CV" text but landing screen text may have changed
   - File: `frontend/src/__tests__/LandingScreen.test.tsx`
   - Not caused by Phase 03 changes
