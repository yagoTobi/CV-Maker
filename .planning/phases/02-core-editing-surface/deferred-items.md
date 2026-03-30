# Deferred Items -- Phase 02

## Pre-existing Test Failures

- `src/__tests__/useImport.test.ts`: 4 failures in "Test 4: JSON Import Link Label Derivation" -- tests expect link labels to retain URL-like text but the derivation function now resolves them to platform names (e.g., "LinkedIn" instead of "linkedin.com/in/testuser"). Not related to Phase 02 changes.
