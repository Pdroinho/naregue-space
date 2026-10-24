import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { api } from '../api'
import type { TenantPublic } from '../types'
import { ArrowRight, Lock, Scissors, XCircle } from './Icons'
import { PasswordChecklist } from './PasswordChecklist'

type InvitePreview = {
  email: string
  expiresAt: string
  professional: { name: string; nickname: string | null; photoUrl: string | null; color: string }
  tenant: Pick<TenantPublic, 'name' | 'slug' | 'logoUrl' | 'primaryColor'>
}

function tokenFromHash() {
  if (typeof window === 'undefined') return ''
  const raw = window.location.hash.replace(/^#/, '')
  const params = new URLSearchParams(raw)
  return params.get('token') ?? (raw.includes('=') ? '' : decodeURIComponent(raw))
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return `${words[0]?.[0] ?? 'P'}${words.length > 1 ? words.at(-1)?.[0] ?? '' : words[0]?.[1] ?? ''}`.toUpperCase()
}

export function TeamInvitePage({ tenant }: { tenant: TenantPublic }) {
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [token] = useState(tokenFromHash)

  useEffect(() => {
    let mounted = true
    if (token && window.location.hash) {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`)
    }
    if (!token) {
      setError('Este convite não possui um código de acesso válido.')
      setLoading(false)
      return () => { mounted = false }
    }
    api<{ invite: InvitePreview }>('/api/public/team-invite/inspect', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }).then((result) => {
      if (!mounted) return
      if (!result.ok) setError(result.error.message)
      else setPreview(result.data.invite)
      setLoading(false)
    })
    return () => { mounted = false }
  }, [token])

  async function accept(event: FormEvent) {
    event.preventDefault()
    if (!preview || submitting) return
    if (password.length < 8) { setError('Crie uma senha com pelo menos 8 caracteres.'); return }
    if (password !== passwordConfirm) { setError('As senhas não coincidem.'); return }
    setSubmitting(true)
    setError(null)
    const result = await api<{ user: { role: string } }>('/api/public/team-invite/accept', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    })
    setSubmitting(false)
    if (!result.ok) { setError(result.error.message); return }
    window.location.replace('/profissional')
  }

  const displayName = preview?.professional.nickname || preview?.professional.name || 'Profissional'

  return <main className="nr-team-invite" style={{ '--invite-accent': preview?.professional.color || tenant.primaryColor } as CSSProperties}>
    <section className="nr-team-invite-card">
      <header className="nr-team-invite-brand">
        <img src={tenant.logoUrl || '/brand/logo-symbol-approved-web.png'} alt="" />
        <span><strong>{tenant.name}</strong><small>Convite para a equipe</small></span>
      </header>

      {loading ? <div className="nr-team-invite-loading" aria-label="Carregando convite"><div className="skeleton skeleton-card" /></div> : error && !preview ? <div className="nr-team-invite-invalid">
        <span aria-hidden="true"><XCircle size={24} /></span>
        <p>Convite indisponível</p>
        <h1>Este acesso não pode mais ser usado.</h1>
        <p>{error}</p>
        <a className="btn" href="/login">Ir para o acesso</a>
      </div> : preview ? <>
        <div className="nr-team-invite-person">
          <div className="nr-team-invite-avatar">{preview.professional.photoUrl ? <img src={preview.professional.photoUrl} alt="" /> : initials(preview.professional.name)}</div>
          <div><span>Seu espaço de trabalho</span><h1>Olá, {displayName}.</h1><p>{preview.professional.name} foi convidado para atender no {preview.tenant.name}.</p></div>
        </div>

        <div className="nr-team-invite-scope">
          <Scissors size={18} />
          <div><strong>Um acesso só para a sua rotina</strong><span>Você verá sua agenda, seus clientes vinculados aos atendimentos e o seu próprio perfil. Gestão, caixa e dados dos outros profissionais ficam com o responsável pelo espaço.</span></div>
        </div>

        <form className="nr-team-invite-form" onSubmit={accept}>
          <label><span>E-mail de acesso</span><input className="input" value={preview.email} readOnly /></label>
          <label><span>Crie sua senha</span><div className="nr-team-invite-password"><Lock size={16} aria-hidden="true" /><input className="input" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></div></label>
          <PasswordChecklist password={password} />
          <label><span>Repita a senha</span><input className="input" type="password" autoComplete="new-password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} /></label>
          {error ? <div className="nr-form-error" role="alert">{error}</div> : null}
          <button type="submit" className="btn btnPrimary nr-team-invite-submit" disabled={submitting}>{submitting ? 'Criando acesso…' : <>Entrar para a equipe <ArrowRight size={17} /></>}</button>
        </form>
      </> : null}
    </section>
    <aside className="nr-team-invite-aside" aria-hidden="true">
      <div className="nr-team-invite-day"><span>Hoje</span><strong>Minha agenda</strong></div>
      <div className="nr-team-invite-slot is-now"><time>09:00</time><span><b>Corte + barba</b><small>Primeiro atendimento</small></span></div>
      <div className="nr-team-invite-slot"><time>10:20</time><span><b>Agenda individual</b><small>Somente seus horários</small></span></div>
      <div className="nr-team-invite-slot"><time>14:00</time><span><b>Seu perfil</b><small>Foto, nome e WhatsApp</small></span></div>
    </aside>
  </main>
}
