import { lazy, Suspense } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Authenticator, ThemeProvider } from '@aws-amplify/ui-react';
import { AppProvider } from './contexts/AppContext';
import { FeatureErrorBoundary } from './components/FeatureErrorBoundary';
import { authTheme } from './styles/authTheme';
import '@aws-amplify/ui-react/styles.css';
import './components/auth/authenticator.module.css';

const LandingScreen = lazy(() => import('./features/landing/LandingScreen'));
const Dashboard = lazy(() => import('./features/dashboard/Dashboard'));
const TemplateSelector = lazy(() => import('./features/template-selection/TemplateSelector').then(m => ({ default: m.TemplateSelector })));

const DirectEditPage = lazy(() => import('./features/direct-edit/DirectEditPage'));
const WorkingLayout = lazy(() => import('./components/WorkingLayout'));

function AuthHeader() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '1.5rem 0 0.5rem',
      gap: '0.625rem',
    }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
      <span style={{
        fontSize: '1.125rem',
        fontWeight: 600,
        color: '#1E293B',
        letterSpacing: '-0.02em',
        fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}>
        CV Maker
      </span>
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const isAuthDisabled = import.meta.env.VITE_DISABLE_AUTH === 'true';

  if (isAuthDisabled) {
    return <>{children}</>;
  }

  return (
    <ThemeProvider theme={authTheme}>
      <Authenticator
        loginMechanisms={['email']}
        components={{ Header: AuthHeader }}
      >
        {() => <>{children}</>}
      </Authenticator>
    </ThemeProvider>
  );
}

function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'var(--font-family-sans)', color: 'var(--color-text-primary)' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>404 - Page not found</h1>
      <Link to="/" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>Go to home</Link>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<LandingScreen />} />
          <Route element={<AuthGate><WorkingLayout /></AuthGate>}>
            <Route path="/dashboard" element={<FeatureErrorBoundary><Dashboard /></FeatureErrorBoundary>} />
            <Route path="/build" element={<FeatureErrorBoundary><TemplateSelector /></FeatureErrorBoundary>} />
            <Route path="/build/form" element={<FeatureErrorBoundary><DirectEditPage /></FeatureErrorBoundary>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppProvider>
  );
}

export default App;
