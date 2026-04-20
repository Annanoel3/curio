import { applyTheme, THEME_KEY } from '@/pages/Settings';
applyTheme(localStorage.getItem(THEME_KEY) || "system");
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)