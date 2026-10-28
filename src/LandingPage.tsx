import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, ShieldCheck } from './components/Icons'
import { workspaceLoginUrl } from './features/marketing/landingLinks'
import './landing.css'
import './naregua-landing.css'
import './features/marketing/landing-entry.css'
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

  return <main className="landing-access-page access-renewed">
    <div className="landing-access-background" />
    <section className="landing-access-card">
      <aside className="landing-access-aside">
        <a href="/" aria-label="Voltar para NaRégua"><BrandWordmark /></a>
        <div><h2>Seu espaço.<br/>Sua rotina.<br/>Tudo na régua.</h2></div>
        <img src="/landing/art-v2/chair.webp" alt="Cadeira de barbeiro ilustrada em petróleo e cobre" />
      </aside>
      <div className="landing-access-content">
        <a href="/" className="landing-access-mobile-brand"><BrandWordmark /></a>
        <h1>Bom ter você<br/>de volta.</h1>
        <p>Qual é o endereço da sua barbearia? Vamos levar você até o seu painel.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="workspace-slug">Seu endereço</label>
          <div className="landing-access-slug"><input id="workspace-slug" value={slug} onChange={(event) => { setSlug(event.target.value); setError('') }} placeholder="central-barber" autoComplete="organization" autoCapitalize="none" spellCheck={false} aria-invalid={Boolean(error)} aria-describedby={error ? 'access-error' : 'access-example'} autoFocus /><span>.{workspaceDomain}</span></div>
          <small id="access-example" className="access-example">Use o nome que aparece antes de .{workspaceDomain}</small>
          {error ? <div id="access-error" role="alert" className="landing-access-error">{error}</div> : null}
          <button className="landing-access-submit" type="submit">Acessar meu espaço <ArrowRight size={16} /></button>
        </form>
        <div className="landing-access-help"><ShieldCheck size={18} /><span>Você vai entrar com seu e-mail e senha na próxima tela.</span></div>
        <a href="/" className="access-home">← Voltar ao site</a>
        {supportUrl ? <a className="landing-access-support" href={supportUrl}>Esqueci meu endereço — falar com o suporte</a> : null}
      </div>
    </section>
  </main>
}
