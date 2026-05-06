import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { seedExerciseLibraryIfEmpty } from './data/seedExerciseLibrary'

// Fire-and-forget: populates Dexie `exerciseLibrary` on first load.
void seedExerciseLibraryIfEmpty()

// Service-worker auto-update. With clientsClaim + skipWaiting in the workbox
// config, the new SW takes over on detection. Polling every 60s means
// returning users (e.g. PWA pinned to home screen) pick up deploys without
// having to manually clear cache — they'll just get the new bundle the
// next time they come back to the tab.
const updateSW = registerSW({
  onNeedRefresh() {
    // Auto-accept the update. The new SW installs in the background; on
    // next navigation/click the page will reload to its assets.
    void updateSW()
  },
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      setInterval(() => {
        registration.update().catch(() => { /* offline / aborted is fine */ })
      }, 60_000)
    }
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
