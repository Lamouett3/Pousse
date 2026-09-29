import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/nunito'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/fraunces/wght-italic.css'
import '@tabler/icons-webfont/dist/tabler-icons.min.css'
import App from './App.jsx'
import './theme/global.css'
import { themeCss } from './theme/tokens'
import { ThemeProvider, applyTheme, readStoredTheme } from './theme/useTheme'

// Variables CSS des thèmes jour / nuit (générées depuis tokens.js)
const themeStyle = document.createElement('style')
themeStyle.id = 'pousse-theme'
themeStyle.textContent = themeCss()
document.head.appendChild(themeStyle)
// Applique le thème mémorisé avant le premier rendu (évite un flash clair la nuit)
applyTheme(readStoredTheme())

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
)
