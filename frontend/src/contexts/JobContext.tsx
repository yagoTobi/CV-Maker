import { createContext, useContext, useState, useMemo } from 'react';
import type { ReactNode } from 'react';

interface JobContextValue {
  companyName: string;
  setCompanyName: (name: string) => void;
  roleName: string;
  setRoleName: (name: string) => void;
  jobDescription: string;
  setJobDescription: (desc: string) => void;
}

const JobContext = createContext<JobContextValue | null>(null);

export function useJobContext() {
  const context = useContext(JobContext);
  if (!context) {
    throw new Error('useJobContext must be used within JobProvider');
  }
  return context;
}

export function JobProvider({ children }: { children: ReactNode }) {
  const [companyName, setCompanyName] = useState('');
  const [roleName, setRoleName] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  const value = useMemo(() => ({
    companyName,
    setCompanyName,
    roleName,
    setRoleName,
    jobDescription,
    setJobDescription,
  }), [companyName, roleName, jobDescription]);

  return <JobContext.Provider value={value}>{children}</JobContext.Provider>;
}
