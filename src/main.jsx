import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Pick My Teacher render error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#090e19', color: '#edf2ff', fontFamily: 'Inter, system-ui, sans-serif' }}>
          <section style={{ width: 'min(100%, 620px)', padding: 28, border: '1px solid #293b58', borderRadius: 18, background: '#121e31' }}>
            <p style={{ color: '#65d5cc', fontWeight: 700, letterSpacing: 1 }}>PICK MY TEACHER</p>
            <h1 style={{ margin: '12px 0', fontSize: 24 }}>We hit a loading problem</h1>
            <p style={{ color: '#b8c5d9', lineHeight: 1.6 }}>The page could not finish loading. The error details below will help us fix it.</p>
            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', marginTop: 18, padding: 14, borderRadius: 10, background: '#090e19', color: '#ffb4bd', fontSize: 13 }}>{String(this.state.error?.message || this.state.error)}</pre>
            <button onClick={() => window.location.reload()} style={{ marginTop: 18, padding: '11px 16px', border: 0, borderRadius: 10, background: '#8998ff', color: '#090e19', fontWeight: 700, cursor: 'pointer' }}>Reload page</button>
          </section>
        </main>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
