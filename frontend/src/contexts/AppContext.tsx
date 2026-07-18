import type { ReactNode } from 'react';
import { ToastProvider } from './ToastContext';
import { JobProvider } from './JobContext';
import { CVProvider } from './CVContext';
import { ToolsProvider } from './ToolsContext';

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <JobProvider>
        <CVProvider>
          <ToolsProvider>
            {children}
          </ToolsProvider>
        </CVProvider>
      </JobProvider>
    </ToastProvider>
  );
}
