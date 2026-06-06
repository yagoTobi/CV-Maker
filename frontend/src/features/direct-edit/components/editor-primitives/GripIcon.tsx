/**
 * GripIcon -- 6-dot SVG grip icon for drag handles.
 * Used at both section-level and entry-level drag grips.
 * Standalone component -- does NOT import from form-builder.
 */
export function GripIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="5" r="1.5" />
      <circle cx="15" cy="5" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="15" cy="19" r="1.5" />
    </svg>
  );
}
