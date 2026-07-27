import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import branding from './config/branding'

import { BrowserRouter } from 'react-router-dom'

// Inject brand-identity colors as CSS custom properties
const root = document.documentElement
root.style.setProperty('--brand-primary', branding.primaryColor)
root.style.setProperty('--brand-accent', branding.accentColor)
root.style.setProperty('--brand-dark', branding.themeColorHex)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister())
  })
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed:', error)
    })
  })
}
