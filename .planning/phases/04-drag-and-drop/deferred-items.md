# Deferred Items -- Phase 04

## Pre-existing Test Failures (out of scope)

- **useImport.test.ts**: 3 failing tests in "Test 4: JSON Import Link Label Derivation" -- link label derivation logic produces branded names (e.g., "LinkedIn", "ResearchGate") instead of raw URLs. Pre-existing issue confirmed by running tests on prior commit (763457e). Not related to drag-and-drop work.
- **import-flow-state.test.tsx**: 1 failing test -- landing screen render issue in test environment. Pre-existing, confirmed by running on stashed changes (b612d72). Not related to drag-and-drop work.

## User-Requested Features (future phase)

- **Backspace-to-delete for sub-section entries**: User wants pressing Backspace on an empty entry to delete it (similar to backspace-to-merge in bullet lists) instead of having to click the X button. Applies to work entries, education entries, project entries, etc. Would need to add onKeyDown handler to EntryWrapper that detects Backspace when the entry's content is empty, and triggers the delete flow (with confirmation for major entries). Discovered during 04-02 visual verification.
