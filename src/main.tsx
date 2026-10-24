import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './application.css'
import './responsive.css'
import './design-system.css'
import './select.css'
import './setup.css'
import './foundation.css'
import './shell.css'
import './overlays.css'
import './tour.css'
import './forms.css'
import './services.css'
import './professionals.css'
import './professional-portal.css'
import './team-invite.css'
import './whatsapp.css'
import './agenda.css'
import './dashboard.css'
import './finance.css'
import './billing.css'
import './referrals.css'
import './assistant.css'
import './booking.css'
import './appointment-lifecycle.css'
import './typography.css'
import './auth.css'
import './client-access.css'
import './mobile-shell.css'
import './mobile-product.css'
import './mobile-public.css'
import './mobile.css'
import './brand.css'
import { initTheme } from './theme'
import { FeedbackCenter } from './components/FeedbackCenter'
import { OverlayCoordinator } from './components/OverlayCoordinator'

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[UI] erro não tratado', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="fatal-error-page">
          <div className="fatal-error-card">
            <div className="fatal-error-mark">NR</div>
            <h1>Não foi possível carregar esta tela</h1>
            <p>Atualize a página. Caso o problema continue, envie o horário do erro para o suporte.</p>
            <button type="button" className="btn btnPrimary" onClick={() => window.location.reload()}>Recarregar página</button>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}

initTheme()

const root = document.getElementById('root')
if (!root) throw new Error('Elemento #root não encontrado')

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <React.Suspense fallback={<div className="nr-route-state" role="status" aria-label="Carregando tela"><div className="nr-route-state-loading skeleton skeleton-card" /></div>}>
          <App />
          <OverlayCoordinator />
          <FeedbackCenter />
        </React.Suspense>
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>,
)
