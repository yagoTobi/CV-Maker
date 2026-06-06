# Deferred Items - Phase 06 Route Integration

## Pre-existing Test Failures

**useImport.test.ts** - 4 failing tests in "Test 4: JSON Import Link Label Derivation"
- `derives labels for links matching derivation criteria in scenario #4 test JSON` - expects `linkedin.com/in/testuser` but gets `LinkedIn`
- `preserves label "researchgate.net/profile/user" because it lacks protocol prefix` - expects raw URL but gets `ResearchGate`
- These failures exist on the clean branch prior to any Phase 06 changes
- Root cause: `deriveLinkLabel` logic changed (likely in Phase 05) but tests were not updated
- **Action needed:** Update test expectations or fix deriveLinkLabel behavior
