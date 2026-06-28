import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// --- Amplify global mocks -------------------------------------------------
// Keep the test suite offline and stop the real `amplifyConfig` side-effect
// (which imports the generated `amplify_outputs.json`) from ever running.
vi.mock('aws-amplify');
vi.mock('aws-amplify/auth');

vi.mock('@aws-amplify/ui-react', () => {
  const Passthrough = ({ children }: { children?: unknown }) =>
    typeof children === 'function' ? (children as () => unknown)() : children;
  return {
    Authenticator: Object.assign(Passthrough, { Provider: Passthrough }),
    ThemeProvider: Passthrough,
    useAuthenticator: () => ({ authStatus: 'authenticated', user: undefined, signOut: vi.fn() }),
  };
});

// `./amplifyConfig` resolves to `src/amplifyConfig` — the exact specifier
// `main.tsx` imports — so the real `Amplify.configure()` never runs in tests.
vi.mock('./amplifyConfig');
