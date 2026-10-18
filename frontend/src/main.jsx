import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'

if (typeof window !== 'undefined') {
  window.React = React
}

// Garde-fou DOM permanent contre les erreurs "insertBefore" / "removeChild"
if (typeof Node === 'function' && Node.prototype && !Node.prototype.__livefxPatched) {
  Node.prototype.__livefxPatched = true
  const originalRemoveChild = Node.prototype.removeChild
  Node.prototype.removeChild = function (child) {
    if (child && child.parentNode !== this) {
      if (child.parentNode) {
        try {
          return originalRemoveChild.call(child.parentNode, child)
        } catch (_) {}
      }
      return child
    }
    try {
      return originalRemoveChild.apply(this, arguments)
    } catch (_) {
      return child
    }
  }

  const originalInsertBefore = Node.prototype.insertBefore
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      try {
        return this.appendChild(newNode)
      } catch (_) {
        return newNode
      }
    }
    try {
      return originalInsertBefore.apply(this, arguments)
    } catch (_) {
      try {
        return this.appendChild(newNode)
      } catch (_e) {
        return newNode
      }
    }
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
)
