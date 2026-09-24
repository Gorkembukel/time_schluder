import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { App } from './app/App'
import { AuthGate } from './app/AuthGate'
import './styles/globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AuthGate>{(user) => <App uid={user.uid} />}</AuthGate>
    </HashRouter>
  </StrictMode>,
)
