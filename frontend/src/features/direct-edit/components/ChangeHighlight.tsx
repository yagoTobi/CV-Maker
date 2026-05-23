/**
 * ChangeHighlight — purely presentational <span> wrapper that renders the
 * severity-tier squiggle underline (and active tint when isActive=true).
 *
 * Implements D-13 / D-14 from .planning/phases/13.../13-CONTEXT.md.
 *
 * No state, no effects. The popover anchors via DOM Range from
 * useChangeHighlights.getRangeForChange (Plan 02 hook), so this component
 * does not compute layout offsets.
 */
import type React from 'react';
import type { Severity } from '../utils/severity';
import styles from './ChangeHighlight.module.css';

export interface ChangeHighlightProps {
  changeId: string;
  severity: Severity;
  isActive: boolean;
  children: React.ReactNode;
  onClick?: (changeId: string) => void;
}

function tierClassName(severity: Severity): string {
  // 'strong' → 'tierStrong', 'minor' → 'tierMinor', etc.
  const capitalised = severity[0].toUpperCase() + severity.slice(1);
  return styles[`tier${capitalised}`] ?? '';
}

export function ChangeHighlight({
  changeId,
  severity,
  isActive,
  children,
  onClick,
}: ChangeHighlightProps): React.JSX.Element {
  const classes = [styles.highlight, tierClassName(severity), isActive ? styles.active : '']
    .filter(Boolean)
    .join(' ');

  const handleClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    onClick?.(changeId);
  };

  return (
    <span
      className={classes}
      data-change-id={changeId}
      data-severity={severity}
      onClick={handleClick}
    >
      {children}
    </span>
  );
}
