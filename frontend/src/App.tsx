import { Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import { LandingScreen } from './features/landing';
import { Dashboard } from './features/dashboard';
import { BuildChoiceScreen } from './features/build-choice';
import { TemplateSelector } from './features/template-selection';
import { CVFormBuilder } from './features/form-builder';
import { CVImportUpload, CVImportReview } from './features/cv-import';
import { EditorScreen } from './features/editor';

function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<LandingScreen />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/build/start" element={<BuildChoiceScreen />} />
        <Route path="/build" element={<TemplateSelector />} />
        <Route path="/build/form" element={<CVFormBuilder />} />
        <Route path="/import" element={<CVImportUpload />} />
        <Route path="/import/review" element={<CVImportReview />} />
        <Route path="/editor" element={<EditorScreen />} />
      </Routes>
    </AppProvider>
  );
}

export default App;
