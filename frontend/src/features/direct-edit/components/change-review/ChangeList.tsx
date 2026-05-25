/**
 * ChangeList -- Pure list renderer for AI tailor change cards.
 *
 * Renders change cards grouped by CV section, an Accept All Remaining
 * button, and an optional Genuine Gaps section.
 *
 * No score header, no panel chrome, no toggle. Used by:
 *   - ChangePanel (standalone panel) — wraps this + ScoreHeader + toggle
 *   - Tier3Review (embedded in TunePanel) — composing ChangeList directly
 */
import { useMemo } from 'react';
import type { TailorChange, MatchAnalysis } from '../../../../types';
import { fieldPathToSection } from '../../../../utils/formDataPatch';
import { ChangeCard } from './ChangeCard';
import styles from './ChangeList.module.css';

interface SectionGroup {
  sectionKey: string;
  sectionLabel: string;
  changes: TailorChange[];
}

interface ChangeListProps {
  changes: TailorChange[];
  appliedChanges: Set<string>;
  skippedChanges: Set<string>;
  selectedAlternatives: Map<string, number>;
  isApplying: boolean;
  pendingCount: number;
  onAccept: (changeId: string) => Promise<void>;
  onSkip: (changeId: string) => void;
  onUndo: (changeId: string) => Promise<void>;
  onAcceptAll: () => Promise<void>;
  onSelectAlternative: (changeId: string, index: number) => void;
  onEditValue: (changeId: string, newValue: string | string[]) => void;
  /** When true, renders the Accept All button + genuine gaps section. */
  showFooter?: boolean;
  matchAnalysis?: MatchAnalysis | null;
}

export function ChangeList({
  changes,
  appliedChanges,
  skippedChanges,
  selectedAlternatives,
  isApplying,
  pendingCount,
  onAccept,
  onSkip,
  onUndo,
  onAcceptAll,
  onSelectAlternative,
  onEditValue,
  showFooter = true,
  matchAnalysis,
}: ChangeListProps) {
  const groups: SectionGroup[] = useMemo(() => {
    const map = new Map<string, SectionGroup>();
    for (const change of changes) {
      const key = fieldPathToSection(change.fieldPath);
      if (!map.has(key)) {
        map.set(key, { sectionKey: key, sectionLabel: change.section, changes: [] });
      }
      map.get(key)!.changes.push(change);
    }
    return Array.from(map.values());
  }, [changes]);

  return (
    <>
      {groups.map((group) => (
        <div key={group.sectionKey} className={styles.sectionGroup}>
          <div className={styles.sectionGroupLabel}>{group.sectionLabel}</div>
          {group.changes.map((change) => (
            <ChangeCard
              key={change.id}
              change={change}
              isApplied={appliedChanges.has(change.id)}
              isSkipped={skippedChanges.has(change.id)}
              selectedAltIndex={selectedAlternatives.get(change.id) ?? 0}
              isApplying={isApplying}
              onAccept={() => onAccept(change.id)}
              onSkip={() => onSkip(change.id)}
              onUndo={() => onUndo(change.id)}
              onSelectAlternative={(index) => onSelectAlternative(change.id, index)}
              onEditValue={(value) => onEditValue(change.id, value)}
            />
          ))}
        </div>
      ))}

      {showFooter && (
        <>
          <button
            className={styles.acceptAllBtn}
            onClick={onAcceptAll}
            disabled={pendingCount === 0 || isApplying}
            type="button"
          >
            Accept All Remaining
          </button>

          {matchAnalysis && matchAnalysis.missing.length > 0 && (
            <details className={styles.gapsSection}>
              <summary className={styles.gapsSummary}>
                Genuine gaps &#8212; AI can&#8217;t address these ({matchAnalysis.missing.length})
              </summary>
              <ul className={styles.gapsList}>
                {matchAnalysis.missing.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              {matchAnalysis.suggestions.length > 0 && (
                <>
                  <div className={styles.suggestionsHeading}>What you could do</div>
                  <ol className={styles.suggestionsList}>
                    {matchAnalysis.suggestions.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ol>
                </>
              )}
            </details>
          )}
        </>
      )}
    </>
  );
}
