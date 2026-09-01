import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initVersionChecker } from './services/versionChecker'

// Initialize Auto-Update version detection
initVersionChecker();

// Register Service Worker with dynamic base path for GitHub Pages / custom domains
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base = (import.meta as any).env?.BASE_URL || './';
    const swUrl = `${base}sw.js`;
    navigator.serviceWorker.register(swUrl).catch((err) => {
      console.log('SW registration note:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
