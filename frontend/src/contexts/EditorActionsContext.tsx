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
  onExportJson: () => void;
  onTuneForJob: () => void;
  saveStatus: SaveStatus;
  isDownloading: boolean;
  isTuning: boolean;
  isTunedVersion: boolean;  // true when activeVersion has a parentVersionId (job-specific CV)
  cvName: string;           // parent name when tuned, else activeVersion.name (set by DirectEditPage)
  tuneCompanyName: string;  // TunePanel Tier 2 companyName (set by DirectEditPage)
  tuneRole: string;         // TunePanel Tier 2 roleName (set by DirectEditPage)
  pageCount: number | null;     // true page count from the last compile (null = unknown)
  isCheckingPageCount: boolean; // a page-count compile is in flight
  onRetrySave: () => void;
  overflowWarning: string | null;
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
