import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const isLocalDemo = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true';
if (isLocalDemo) document.title = 'Hope Clinic · Local demo';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isLocalDemo && <div className="clinic-navigation bg-amber-100 text-amber-950 text-center text-sm p-2">Local demo — synthetic records only. Changes stay on this computer.</div>}
    <App />
  </StrictMode>,
)
