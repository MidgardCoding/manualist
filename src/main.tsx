import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Force light mode and clean up any leftover dark mode state
document.documentElement.setAttribute('data-theme', 'light')
localStorage.removeItem('theme')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
