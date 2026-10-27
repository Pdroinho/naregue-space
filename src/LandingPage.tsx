import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, ShieldCheck } from './components/Icons'
import { workspaceLoginUrl } from './features/marketing/landingLinks'
import './landing.css'
import './naregua-landing.css'
export { LandingExperience as LandingPage } from './features/marketing/LandingExperience'

function BrandWordmark({ inverse = false }: { inverse?: boolean }) {
  return <img className="nr-brand-logo" src={inverse ? '/brand/logo-wordmark-approved-inverse.png' : '/brand/logo-wordmark-approved-web.png'} alt="NaRégua" />
}


export function WorkspaceAccessPage() {
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')
  const supportUrl = String(import.meta.env.VITE_SUPPORT_URL ?? import.meta.env.VITE_SALES_URL ?? '').trim()
  const workspaceDomain = (() => {
    const configured = String(import.meta.env.VITE_APP_BASE_URL ?? '').trim()
    try { return new URL(configured || window.location.origin).hostname.replace(/^www\./, '') }
    catch { return 'naregua.app' }
  })()

  useEffect(() => {
    document.body.classList.add('landing-body')
    document.title = 'Acessar meu espaço — NaRégua'
    return () => document.body.classList.remove('landing-body')
  }, [])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const normalized = slug.trim().toLowerCase().replace(/^https?:\/\//, '').split(/[./]/)[0]
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(normalized)) {
      setError('Digite somente o endereço curto da sua barbearia, por exemplo: central-barber.')
      return
    }
    window.location.assign(workspaceLoginUrl(normalized))
  }

  return <main className="landing-access-page">
    <div className="landing-access-background" />
    <section className="landing-access-card">
      <aside className="landing-access-aside">
        <a href="/" aria-label="Voltar para NaRégua"><BrandWordmark inverse /></a>
        <div><span>Sua barbearia continua aqui</span><h2>Agenda, clientes e caixa no mesmo lugar.</h2><p>Entre no endereço exclusivo da sua marca para continuar.</p></div>
        <img src="/landing/product/real/dashboard.webp" alt="Visão real do painel NaRégua" />
      </aside>
      <div className="landing-access-content">
        <a href="/" className="landing-access-mobile-brand"><BrandWordmark /></a>
        <span className="landing-kicker">Área da barbearia</span>
        <h1>Entre na sua operação.</h1>
        <p>Informe o endereço curto que você escolheu ao criar sua conta.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="workspace-slug">Seu endereço</label>
          <div className="landing-access-slug"><input id="workspace-slug" value={slug} onChange={(event) => { setSlug(event.target.value); setError('') }} placeholder="central-barber" autoComplete="organization" autoFocus /><span>.{workspaceDomain}</span></div>
          {error ? <div className="landing-access-error">{error}</div> : null}
          <button className="landing-access-submit" type="submit">Acessar meu espaço <ArrowRight size={16} /></button>
        </form>
        <div className="landing-access-help"><ShieldCheck size={18} /><span><strong>Ambiente exclusivo e seguro</strong><small>Cada negócio acessa seus dados em um endereço separado.</small></span></div>
        {supportUrl ? <a className="landing-access-support" href={supportUrl}>Esqueci meu endereço — falar com o suporte</a> : null}
      </div>
    </section>
  </main>
}
