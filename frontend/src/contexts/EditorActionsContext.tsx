/**
 * EditorActionsContext -- Lightweight context for DirectEditPage to pass
 * toolbar actions up to NavBar.
 *
 * The editor page needs Download PDF and save status in the NavBar.
 * When the editor is mounted, it registers its actions via useSetEditorActions().
 * When unmounted, it clears them (sets null). NavBar reads via useEditorActions().
 */
import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { SaveStatus } from '../features/direct-edit/hooks/useAutoSave';

interface EditorActions {
  onDownload: () => void;
  onTuneForJob: () => void;
  saveStatus: SaveStatus;
  isDownloading: boolean;
  isTuning: boolean;
  isTunedVersion: boolean;  // true when activeVersion has a parentVersionId (job-specific CV)
  cvName: string;           // parent name when tuned, else activeVersion.name (set by DirectEditPage)
  tuneCompanyName: string;  // TunePanel Tier 2 companyName (set by DirectEditPage)
  tuneRole: string;         // TunePanel Tier 2 roleName (set by DirectEditPage)
  // Plan 13-04 (D-22) — review-mode CTA swap. Optional with safe defaults so
  // legacy callers (existing tests, pre-Plan-04 EditorActions producers)
  // continue to compile without churn. NavBar reads with `?? false / ?? 0`.
  isReviewing?: boolean;          // tailor.tailorResponse !== null && total > 0
  acceptedCount?: number;         // tailor.appliedChanges.size
  totalChanges?: number;          // tailor.tailorResponse.changes.length
  onSaveTailored?: (() => void) | null;  // null until review state engaged
}

interface EditorActionsContextValue {
  actions: EditorActions | null;
  setActions: (actions: EditorActions | null) => void;
}

const EditorActionsContext = createContext<EditorActionsContextValue>({
  actions: null,
  setActions: () => {},
});

export function EditorActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<EditorActions | null>(null);
  return (
    <EditorActionsContext.Provider value={{ actions, setActions }}>
      {children}
    </EditorActionsContext.Provider>
  );
}

export function useEditorActions() {
  return useContext(EditorActionsContext).actions;
}

export function useSetEditorActions() {
  return useContext(EditorActionsContext).setActions;
}
