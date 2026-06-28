import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import './amplifyConfig'
import './styles/variables.css'
import App from './App.tsx'
import { ErrorBoundary } from './features/shared'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Authenticator.Provider>
      <BrowserRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </Authenticator.Provider>
  </StrictMode>,
)
