import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
// Landnam's own global styles, as its layout loads them, so its scenes (mining,
// chips, help sheets) look exactly as they do in Landnam. Minimal's come after.
import '@landnam/app/globals.css'
import '@landnam/app/loop-screens.css'
import '@landnam/app/base-scene.css'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
