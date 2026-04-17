# Deferred Items — Phase 11

## Pre-existing Test Failures (Out of Scope for 11-03)

Discovered during `npx vitest run` as part of plan 11-03 verification. These failures exist on the base branch and are unrelated to useAutoSave changes.

| File | Test | Nature |
|------|------|--------|
| `src/__tests__/SectionWrapper.test.tsx` | clicking remove button applies sectionConfirming class | Pre-existing |
| `src/__tests__/entryFactories.test.ts` | emptyEducationEntry returns EducationEntry with empty strings and empty details array | Pre-existing |
| `src/__tests__/useDirectEditor.test.ts` | removeBullet on last remaining bullet does nothing (minimum 1 bullet) | Pre-existing |
| `src/__tests__/useImport.test.ts` | Test 4: JSON Import Link Label Derivation (3 tests) | Pre-existing |

These should be fixed in a separate plan/task unrelated to CV save identity work.
