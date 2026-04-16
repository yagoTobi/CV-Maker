import { lazy, Suspense } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { FeatureErrorBoundary } from './components/FeatureErrorBoundary';

const LandingScreen = lazy(() => import('./features/landing/LandingScreen'));
const Dashboard = lazy(() => import('./features/dashboard/Dashboard'));
const TemplateSelector = lazy(() => import('./features/template-selection/TemplateSelector').then(m => ({ default: m.TemplateSelector })));

const DirectEditPage = lazy(() => import('./features/direct-edit/DirectEditPage'));
const WorkingLayout = lazy(() => import('./components/WorkingLayout'));

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
          <Route element={<WorkingLayout />}>
            <Route path="/dashboard" element={<FeatureErrorBoundary><Dashboard /></FeatureErrorBoundary>} />
            <Route path="/build" element={<FeatureErrorBoundary><TemplateSelector /></FeatureErrorBoundary>} />
            <Route path="/build/form" element={<FeatureErrorBoundary><DirectEditPage /></FeatureErrorBoundary>} />
            <Route path="/apply" element={<Navigate to="/build/form" state={{ tune: true }} replace />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppProvider>
  );
}

export default App;
