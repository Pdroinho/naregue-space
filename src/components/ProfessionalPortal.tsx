import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { addDaysToYmd, formatTimeInZone, getZonedDateTimeParts, ymdInTimeZone, zonedDateTimeToUtc } from '../dateTime'
import { optimizeImageFile } from '../imageProcessing'
import { formatBrazilPhoneInput, normalizeBrazilPhone } from '../phone'
import type { SessionUser, TenantPublic } from '../types'
import { ArrowRight, Calendar, Clock, Edit2, LogOut, Scissors, Users } from './Icons'
import { notify } from './FeedbackCenter'

type ProfessionalSelfProfile = {
  id: string
  name: string
  nickname: string | null
  phone: string | null
  color: string
  photoUrl: string | null
  active: boolean
}

type ProfessionalAppointment = {
  id: string
  startsAt: string
  endsAt: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED'
  clientName: string | null
  clientPhone: string | null
  serviceName: string
  priceCents: number
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return `${words[0]?.[0] ?? 'P'}${words.length > 1 ? words.at(-1)?.[0] ?? '' : words[0]?.[1] ?? ''}`.toUpperCase()
}

function money(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

function dayLabel(ymd: string) {
  const [year, month, day] = ymd.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(new Date(Date.UTC(year, month - 1, day, 12))).replace('.', '')
}

function dateNumber(ymd: string) {
  return Number(ymd.slice(-2))
}

export function ProfessionalPortal({ tenant }: { tenant: TenantPublic }) {
  const nav = useNavigate()
  const location = useLocation()
  const fileRef = useRef<HTMLInputElement>(null)
  const isProfile = location.pathname.endsWith('/perfil')
  const [me, setMe] = useState<SessionUser | null>(null)
  const [professional, setProfessional] = useState<ProfessionalSelfProfile | null>(null)
  const [timeZone, setTimeZone] = useState('America/Sao_Paulo')
  const [appointments, setAppointments] = useState<ProfessionalAppointment[]>([])
  const [selectedDay, setSelectedDay] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [imageBusy, setImageBusy] = useState(false)
  const [form, setForm] = useState({ name: '', nickname: '', phone: '', photoUrl: '' })

  const today = getZonedDateTimeParts(new Date(), timeZone)?.ymd ?? ''
  const days = useMemo(() => {
    if (!today) return []
    return Array.from({ length: 7 }, (_, index) => addDaysToYmd(today, index)).filter((value): value is string => Boolean(value))
  }, [today])

  async function loadAppointments(zone: string) {
    const startYmd = getZonedDateTimeParts(new Date(), zone)?.ymd
    if (!startYmd) return
    const endYmd = addDaysToYmd(startYmd, 7)
    const start = zonedDateTimeToUtc(startYmd, '00:00', zone)
    const end = endYmd ? zonedDateTimeToUtc(endYmd, '00:00', zone) : null
    if (!start || !end) return
    const result = await api<{ appointments: ProfessionalAppointment[] }>(`/api/professional/appointments?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`)
    if (result.ok) setAppointments(result.data.appointments)
  }

  async function load() {
    setLoading(true)
    const [meResult, profileResult] = await Promise.all([
      api<{ user: SessionUser | null }>('/api/auth/me'),
      api<{ professional: ProfessionalSelfProfile; timeZone: string }>('/api/professional/profile'),
    ])
    if (!meResult.ok || !meResult.data.user || meResult.data.user.role !== 'PROFESSIONAL') {
      nav('/login', { replace: true })
      return
    }
    if (!profileResult.ok) {
      notify(profileResult.error.message, 'error')
      setLoading(false)
      return
    }
    const next = profileResult.data.professional
    const zone = profileResult.data.timeZone || 'America/Sao_Paulo'
    setMe(meResult.data.user)
    setProfessional(next)
    setTimeZone(zone)
    setForm({ name: next.name, nickname: next.nickname ?? '', phone: next.phone ? formatBrazilPhoneInput(next.phone) : '', photoUrl: next.photoUrl ?? '' })
    const nextToday = getZonedDateTimeParts(new Date(), zone)?.ymd ?? ''
    setSelectedDay((current) => current || nextToday)
    await loadAppointments(zone)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const dayAppointments = useMemo(() => appointments.filter((item) => ymdInTimeZone(item.startsAt, timeZone) === selectedDay), [appointments, selectedDay, timeZone])
  const nextAppointment = appointments.find((item) => item.status !== 'CANCELLED' && new Date(item.startsAt).getTime() >= Date.now()) ?? null
  const confirmedCount = appointments.filter((item) => item.status === 'CONFIRMED').length
  const weekRevenue = appointments.filter((item) => item.status === 'CONFIRMED').reduce((sum, item) => sum + item.priceCents, 0)

  async function updateStatus(id: string, status: 'CONFIRMED' | 'CANCELLED') {
    const result = await api<{ ok: true }>(`/api/professional/appointments/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
    if (!result.ok) { notify(result.error.message, 'error'); return }
    setAppointments((current) => current.map((item) => item.id === id ? { ...item, status } : item))
    notify(status === 'CONFIRMED' ? 'Atendimento confirmado.' : 'Atendimento cancelado.', status === 'CONFIRMED' ? 'success' : 'info')
  }

  async function handleImage(file: File) {
    if (!file.type.startsWith('image/')) { notify('Escolha uma imagem válida.', 'error'); return }
    setImageBusy(true)
    try {
      const photoUrl = await optimizeImageFile(file, { maxBytes: 220_000, maxDimension: 640, quality: .84 })
      setForm((current) => ({ ...current, photoUrl }))
    } catch {
      notify('Não foi possível processar esta foto.', 'error')
    } finally {
      setImageBusy(false)
    }
  }

  async function saveProfile() {
    if (form.name.trim().length < 2) { notify('Informe seu nome.', 'warning'); return }
    const phone = form.phone.trim() ? normalizeBrazilPhone(form.phone) : null
    if (form.phone.trim() && !phone) { notify('Informe um WhatsApp válido, com DDD.', 'warning'); return }
    setSaving(true)
    const result = await api<{ professional: ProfessionalSelfProfile }>('/api/professional/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name: form.name.trim(), nickname: form.nickname.trim() || null, phone, photoUrl: form.photoUrl || null }),
    })
    setSaving(false)
    if (!result.ok) { notify(result.error.message, 'error'); return }
    setProfessional(result.data.professional)
    notify('Seu perfil foi atualizado.', 'success')
  }

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const displayName = professional?.nickname || professional?.name || me?.name || 'Profissional'

  if (loading) return <main className="nr-pro-boot"><div className="nr-pro-boot-card skeleton skeleton-card" /></main>
  if (!professional || !me) return <main className="nr-pro-boot"><section className="nr-route-state-card"><h1>Perfil indisponível</h1><p>Peça ao responsável pelo espaço para revisar seu acesso.</p></section></main>

  return <div className="nr-pro-shell" style={{ '--pro-accent': professional.color || tenant.primaryColor } as CSSProperties}>
    <aside className="nr-pro-sidebar">
      <div className="nr-pro-brand">
        <img src={tenant.logoUrl || '/brand/logo-symbol-approved-web.png'} alt="" />
        <span><strong>{tenant.name}</strong><small>Área profissional</small></span>
      </div>
      <nav aria-label="Área profissional">
        <button type="button" className={!isProfile ? 'is-active' : ''} onClick={() => nav('/profissional')}><Calendar size={18} /><span>Minha agenda</span></button>
        <button type="button" className={isProfile ? 'is-active' : ''} onClick={() => nav('/profissional/perfil')}><Edit2 size={18} /><span>Meu perfil</span></button>
      </nav>
      <div className="nr-pro-account">
        <div className="nr-pro-account-avatar">{professional.photoUrl ? <img src={professional.photoUrl} alt="" /> : initials(professional.name)}</div>
        <span><strong>{displayName}</strong><small>{me.email}</small></span>
        <button type="button" onClick={() => void logout()} aria-label="Sair"><LogOut size={17} /></button>
      </div>
    </aside>

    <main className="nr-pro-main">
      <header className="nr-pro-topbar">
        <div><span>{tenant.name}</span><strong>{isProfile ? 'Seu perfil' : 'Sua semana de atendimento'}</strong></div>
        <button type="button" className="nr-pro-logout-mobile" onClick={() => void logout()}><LogOut size={17} /> Sair</button>
      </header>

      {!isProfile ? <div className="nr-pro-agenda-page">
        <section className="nr-pro-agenda-hero">
          <div className="nr-pro-agenda-copy">
            <span>Minha cadeira</span>
            <h1>{nextAppointment ? <>Próximo atendimento às <em>{formatTimeInZone(nextAppointment.startsAt, timeZone)}</em>.</> : <>Agenda aberta para o próximo cliente.</>}</h1>
            <p>{nextAppointment ? `${nextAppointment.clientName || 'Cliente'} · ${nextAppointment.serviceName}` : 'Use esta visão para acompanhar somente os seus horários e clientes.'}</p>
          </div>
          <div className="nr-pro-week-pulse" aria-label="Resumo da semana">
            <div><span>Confirmados</span><strong>{confirmedCount}</strong></div>
            <div><span>Produção confirmada</span><strong>{money(weekRevenue)}</strong></div>
          </div>
        </section>

        <section className="nr-pro-week-strip" aria-label="Escolha o dia">
          {days.map((day) => {
            const count = appointments.filter((item) => item.status !== 'CANCELLED' && ymdInTimeZone(item.startsAt, timeZone) === day).length
            return <button type="button" key={day} className={selectedDay === day ? 'is-selected' : ''} onClick={() => setSelectedDay(day)} aria-pressed={selectedDay === day}>
              <span>{dayLabel(day)}</span><strong>{dateNumber(day)}</strong><small>{count ? `${count} ${count === 1 ? 'horário' : 'horários'}` : 'Livre'}</small><i />
            </button>
          })}
        </section>

        <section className="nr-pro-day-panel">
          <header>
            <div><span>Agenda do dia</span><h2>{selectedDay === today ? 'Hoje' : new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(new Date(`${selectedDay}T12:00:00`))}</h2></div>
            <strong>{dayAppointments.length} {dayAppointments.length === 1 ? 'atendimento' : 'atendimentos'}</strong>
          </header>
          <div className="nr-pro-timeline">
            {dayAppointments.length ? dayAppointments.map((item) => {
              const client = item.clientName || 'Cliente'
              const phoneDigits = item.clientPhone?.replace(/\D/g, '')
              return <article className={`nr-pro-appointment is-${item.status.toLowerCase()}`} key={item.id}>
                <time>{formatTimeInZone(item.startsAt, timeZone)}</time>
                <span className="nr-pro-appointment-line" aria-hidden="true"><i /></span>
                <div className="nr-pro-appointment-card">
                  <div className="nr-pro-appointment-main">
                    <span className="nr-pro-client-avatar">{initials(client)}</span>
                    <div><strong>{client}</strong><span>{item.serviceName} · {money(item.priceCents)}</span></div>
                  </div>
                  <div className="nr-pro-appointment-meta"><span>{item.status === 'CONFIRMED' ? 'Confirmado' : item.status === 'CANCELLED' ? 'Cancelado' : 'A confirmar'}</span><small><Clock size={13} /> {formatTimeInZone(item.startsAt, timeZone)}–{formatTimeInZone(item.endsAt, timeZone)}</small></div>
                  <div className="nr-pro-appointment-actions">
                    {phoneDigits ? <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer">WhatsApp <ArrowRight size={13} /></a> : null}
                    {item.status === 'PENDING' ? <button type="button" onClick={() => void updateStatus(item.id, 'CONFIRMED')}>Confirmar</button> : null}
                    {item.status !== 'CANCELLED' ? <button type="button" className="is-danger" onClick={() => void updateStatus(item.id, 'CANCELLED')}>Cancelar</button> : null}
                  </div>
                </div>
              </article>
            }) : <div className="nr-pro-empty-day"><Scissors size={22} /><div><strong>Nenhum atendimento neste dia.</strong><span>Quando um cliente reservar com você, o horário aparece aqui.</span></div></div>}
          </div>
        </section>
      </div> : <div className="nr-pro-profile-page">
        <section className="nr-pro-profile-intro"><span>Identidade profissional</span><h1>O que o cliente vê começa aqui.</h1><p>Nome, foto e WhatsApp são seus. Serviços, horários e permissões continuam sob gestão do responsável pelo espaço.</p></section>
        <section className="nr-pro-profile-card">
          <div className="nr-pro-profile-media">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={imageBusy}>
              {form.photoUrl ? <img src={form.photoUrl} alt="" /> : <span>{initials(form.name || professional.name)}</span>}
              <small>{imageBusy ? 'Processando…' : 'Trocar foto'}</small>
            </button>
            <input ref={fileRef} className="visually-hidden" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleImage(file) }} />
            <div><strong>{form.nickname || form.name || professional.name}</strong><span>{me.email}</span><small>Acesso individual · somente seus dados</small></div>
          </div>
          <div className="nr-pro-profile-fields">
            <label><span>Nome completo</span><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label><span>Nome exibido</span><input className="input" value={form.nickname} onChange={(event) => setForm({ ...form, nickname: event.target.value })} placeholder="Como clientes chamam você" /></label>
            <label><span>WhatsApp</span><input className="input" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: formatBrazilPhoneInput(event.target.value) })} /></label>
            <label className="is-readonly"><span>E-mail de acesso</span><input className="input" value={me.email} readOnly /><small>Peça ao responsável para alterar o e-mail de login.</small></label>
          </div>
          <footer><div><Users size={17} /><span>Seu acesso não mostra caixa, clientes de outros profissionais, configurações ou dados da equipe.</span></div><button type="button" className="btn btnPrimary" disabled={saving || imageBusy} onClick={() => void saveProfile()}>{saving ? 'Salvando…' : 'Salvar perfil'}</button></footer>
        </section>
      </div>}
    </main>
  </div>
}
