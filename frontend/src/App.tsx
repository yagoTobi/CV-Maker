import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { FeatureErrorBoundary } from './components/FeatureErrorBoundary';

const LandingScreen = lazy(() => import('./features/landing/LandingScreen'));
const Dashboard = lazy(() => import('./features/dashboard/Dashboard'));
const BuildChoiceScreen = lazy(() => import('./features/build-choice/BuildChoiceScreen'));
const TemplateSelector = lazy(() => import('./features/template-selection/TemplateSelector').then(m => ({ default: m.TemplateSelector })));
const CVFormBuilder = lazy(() => import('./features/form-builder/CVFormBuilder'));
const CVImportUpload = lazy(() => import('./features/cv-import/CVImportUpload'));
const ApplyToJobScreen = lazy(() => import('./features/apply-to-job/ApplyToJobScreen'));

function App() {
  return (
    <AppProvider>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<LandingScreen />} />
          <Route path="/dashboard" element={<FeatureErrorBoundary><Dashboard /></FeatureErrorBoundary>} />
          <Route path="/build/start" element={<FeatureErrorBoundary><BuildChoiceScreen /></FeatureErrorBoundary>} />
          <Route path="/build" element={<TemplateSelector />} />
          <Route path="/build/form" element={<FeatureErrorBoundary><CVFormBuilder /></FeatureErrorBoundary>} />
          <Route path="/import" element={<FeatureErrorBoundary><CVImportUpload /></FeatureErrorBoundary>} />
          <Route path="/apply" element={<FeatureErrorBoundary><ApplyToJobScreen /></FeatureErrorBoundary>} />
        </Routes>
      </Suspense>
    </AppProvider>
  );
}

export default App;
