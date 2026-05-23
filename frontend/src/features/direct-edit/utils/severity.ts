/**
 * Severity tier for inline change highlights (D-12, D-13, D-14, D-18).
 *
 * NOTE: this file is co-created by Plan 02 (which adds the `inferSeverity`
 * implementation). Plan 03 only consumes the `Severity` type. The merge
 * between Plan 02 and Plan 03 worktrees will combine the type alias here
 * with Plan 02's `inferSeverity` function.
 */
export type Severity = 'strong' | 'minor' | 'add' | 'delete';
