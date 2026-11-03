import './i18n'  // ← DEVE essere prima riga
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { togliStatico } from './lib/statico'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Rete di sicurezza: se una pagina non toglie il testo già pronto (vedi lib/statico.js), lo si toglie qui.
// Più lunga che in Italia: qui le traduzioni arrivano dalla rete.
setTimeout(togliStatico, 6000)
