import React from 'react'
import ReactDOM from 'react-dom/client'
import { ErrorBoundary } from '@components/ErrorBoundary'
import App from './App'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Failed to find the root element')

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary label="LumaWall">
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
