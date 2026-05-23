import type { ReactNode } from 'react';
import { JobProvider } from './JobContext';
import { CVProvider } from './CVContext';
import { ToolsProvider } from './ToolsContext';

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <JobProvider>
      <CVProvider>
        <ToolsProvider>
          {children}
        </ToolsProvider>
      </CVProvider>
    </JobProvider>
  );
}
