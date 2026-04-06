/**
 * WorkingLayout -- Layout route wrapper for all non-landing pages.
 *
 * Renders NavBar above the routed content (Outlet). Wraps children in
 * EditorActionsProvider so the editor action context is scoped to the layout.
 */
import { Outlet } from 'react-router-dom';
import { EditorActionsProvider } from '../contexts/EditorActionsContext';
import { NavBar } from './NavBar';

export default function WorkingLayout() {
  return (
    <EditorActionsProvider>
      <NavBar />
      <Outlet />
    </EditorActionsProvider>
  );
}
