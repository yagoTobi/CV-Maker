/**
 * WorkingLayout -- Layout route wrapper for all non-landing pages.
 *
 * Renders NavBar above the routed content (Outlet). Wraps children in
 * EditorActionsProvider so the editor action context is scoped to the layout.
 */
import { Outlet } from 'react-router-dom';
import { EditorActionsProvider } from '../contexts/EditorActionsContext';
import { NavBar } from './NavBar';
import styles from './WorkingLayout.module.css';

export default function WorkingLayout() {
  return (
    <EditorActionsProvider>
      <div className={styles.shell}>
        <NavBar />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </EditorActionsProvider>
  );
}
