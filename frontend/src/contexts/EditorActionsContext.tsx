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
