/**
 * ToastContext -- global, in-house toast notification surface.
 *
 * Exposes a memoized `toast` API (error / warning / success) via `useToast()`.
 * The provider renders <ToastViewport> inside itself, so the viewport is always
 * present wherever the context is available. Mounted as the OUTERMOST provider
 * inside AppProvider (see AppContext.tsx) so every screen can raise a toast.
 *
 * Conventions: no external dependency, CSS Modules for chrome styling,
 * `import type` for type-only imports (verbatimModuleSyntax), relative paths.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { generateId } from '../utils/idHelpers';
import { ToastViewport } from '../components/toast/ToastViewport';

/** Maximum number of toasts shown at once; a 4th drops the oldest. */
const MAX_VISIBLE = 3;

/** Default auto-dismiss durations (ms) per variant. */
const DEFAULT_DURATION: Record<ToastVariant, number> = {
  error: 8000,
  warning: 6000,
  success: 3500,
};

export type ToastVariant = 'error' | 'warning' | 'success';
export type ToastRole = 'alert' | 'status';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  action?: ToastAction;
  duration?: number;
}

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  role: ToastRole;
  duration: number;
  action?: ToastAction;
}

export interface ToastApi {
  error: (message: string, opts?: ToastOptions) => void;
  warning: (message: string, opts?: ToastOptions) => void;
  success: (message: string, opts?: ToastOptions) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/**
 * Access the toast API. Throws (naming ToastProvider) when used outside the
 * provider so misuse is caught immediately rather than silently no-op'ing.
 */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (ctx === null) {
    throw new Error(
      'useToast() must be used within a <ToastProvider>. ' +
        'ToastProvider is mounted inside <AppProvider>; render your component under it.',
    );
  }
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (variant: ToastVariant, role: ToastRole, message: string, opts?: ToastOptions) => {
      const id = generateId();
      const duration = opts?.duration ?? DEFAULT_DURATION[variant];
      const item: ToastItem = { id, message, variant, role, duration, action: opts?.action };
      // Append, then keep only the newest MAX_VISIBLE (drops the oldest).
      setToasts((prev) => [...prev, item].slice(-MAX_VISIBLE));
      if (duration > 0) {
        timers.current.set(id, setTimeout(() => dismiss(id), duration));
      }
    },
    [dismiss],
  );

  const error = useCallback(
    (message: string, opts?: ToastOptions) => push('error', 'alert', message, opts),
    [push],
  );
  const warning = useCallback(
    (message: string, opts?: ToastOptions) => push('warning', 'status', message, opts),
    [push],
  );
  const success = useCallback(
    (message: string, opts?: ToastOptions) => push('success', 'status', message, opts),
    [push],
  );

  const toast = useMemo<ToastApi>(() => ({ error, warning, success }), [error, warning, success]);

  // Clear any pending timers on unmount.
  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const timer of map.values()) clearTimeout(timer);
      map.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
