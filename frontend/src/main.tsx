import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import { App } from './App'
import Login from './pages/login'
import Espace from './pages/espace'

function Root() {
  const path = window.location.pathname
  if (path === '/login') return <Login />
  if (path === '/espace') return <Espace />
  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
)
