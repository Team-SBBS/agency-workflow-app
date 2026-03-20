import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '../agency-workflow-os-v3.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
