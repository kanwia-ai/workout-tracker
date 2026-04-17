import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { seedExerciseLibraryIfEmpty } from './data/seedExerciseLibrary'

// Fire-and-forget: populates Dexie `exerciseLibrary` on first load.
void seedExerciseLibraryIfEmpty()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
