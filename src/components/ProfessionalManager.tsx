import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { api } from '../api'
import { optimizeImageFile } from '../imageProcessing'
import { formatBrazilPhoneInput, normalizeBrazilPhone } from '../phone'
import type { Professional } from '../types'
import { Clock, Copy, Edit2, Link2, Plus, Scissors, Users, X } from './Icons'
import { ModalRoot } from './ModalRoot'
import { confirmAction, notify } from './FeedbackCenter'

type Service = { id: string; name: string; durationMinutes: number; priceCents: number }
type BusinessHour = { id: string; weekday: number; startMinute: number; endMinute: number }
type ScheduleRange = { startMinute: number; endMinute: number }
type DaySchedule = { enabled: boolean; ranges: ScheduleRange[] }
type InviteResult = { professional: Professional; url: string; email: string; expiresAt: string }

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const emptySchedule = (): DaySchedule[] => DAY_NAMES.map(() => ({ enabled: false, ranges: [{ startMinute: 540, endMinute: 1080 }] }))

function rangesToDays(ranges: Array<{ weekday: number; startMinute: number; endMinute: number }>) {
  const days = emptySchedule()
  for (let weekday = 0; weekday < 7; weekday += 1) {
    const dayRanges = ranges
      .filter((range) => range.weekday === weekday)
      .sort((a, b) => a.startMinute - b.startMinute)
      .map(({ startMinute, endMinute }) => ({ startMinute, endMinute }))
    if (!dayRanges.length) continue
    days[weekday] = { enabled: true, ranges: dayRanges }
  }
  return days
}

function minuteToTime(value: number) { return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}` }
function timeToMinute(value: string) { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute }
function initials(name: string) { const words = name.trim().split(/\s+/).filter(Boolean); return `${words[0]?.[0] ?? 'P'}${words.length > 1 ? words.at(-1)?.[0] ?? '' : words[0]?.[1] ?? ''}`.toUpperCase() }

async function copyText(value: string) {
  try { await navigator.clipboard.writeText(value); return true } catch {
    const area = document.createElement('textarea')
    area.value = value
    area.style.position = 'fixed'; area.style.opacity = '0'
    document.body.appendChild(area); area.select()
    const copied = document.execCommand('copy')
    area.remove()
    return copied
  }
}

function accessCopy(professional: Professional) {
  if (professional.accessStatus === 'OWNER') return { label: 'Responsável', detail: 'Acesso completo ao espaço', tone: 'owner' }
  if (professional.accessStatus === 'ACTIVE') return { label: 'Acesso individual', detail: 'Enxerga somente a própria rotina', tone: 'active' }
  if (professional.accessStatus === 'INVITED') return { label: 'Convite pendente', detail: 'Link aguardando aceite', tone: 'invited' }
  return { label: 'Sem acesso', detail: 'Perfil gerenciado pelo responsável', tone: 'none' }
}

export function ProfessionalManager({ onChanged }: { onChanged?: (professionals: Professional[]) => void }) {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [generalHours, setGeneralHours] = useState<BusinessHour[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Professional | null | 'new'>(null)
  const [invite, setInvite] = useState<InviteResult | null>(null)
  const [invitingId, setInvitingId] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const [professionalsResult, servicesResult, hoursResult] = await Promise.all([
      api<{ professionals: Professional[] }>('/api/admin/professionals'),
      api<{ services: Service[] }>('/api/admin/services'),
      api<{ businessHours: BusinessHour[] }>('/api/admin/business-hours'),
    ])
    if (!professionalsResult.ok) notify(professionalsResult.error.message, 'error')
    if (professionalsResult.ok) { setProfessionals(professionalsResult.data.professionals); onChanged?.(professionalsResult.data.professionals) }
    if (servicesResult.ok) setServices(servicesResult.data.services)
    if (hoursResult.ok) setGeneralHours(hoursResult.data.businessHours)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const active = professionals.filter((professional) => professional.active)
  const withAccess = professionals.filter((professional) => professional.accessStatus === 'ACTIVE' || professional.accessStatus === 'OWNER').length
  const coveredServices = new Set(active.flatMap((professional) => professional.serviceIds)).size

  async function createInvite(professional: Professional) {
    if (!professional.email) { setEditing(professional); notify('Cadastre o e-mail do profissional antes de gerar o acesso.', 'warning'); return }
    setInvitingId(professional.id)
    const result = await api<{ invite: { token: string; email: string; expiresAt: string; professionalName: string } }>(`/api/admin/professionals/${professional.id}/invite`, { method: 'POST' })
    setInvitingId(null)
    if (!result.ok) { notify(result.error.message, 'error'); return }
    const url = `${window.location.origin}/convite/equipe#token=${encodeURIComponent(result.data.invite.token)}`
    setInvite({ professional, url, email: result.data.invite.email, expiresAt: result.data.invite.expiresAt })
    await load()
  }

  async function revokeAccess(professional: Professional) {
    const accepted = await confirmAction({
      title: 'Remover acesso individual?',
      message: `${professional.nickname || professional.name} deixará de conseguir entrar na área profissional. A agenda e o perfil continuam no espaço.`,
      confirmLabel: 'Remover acesso',
      danger: true,
    })
    if (!accepted) return
    setRevokingId(professional.id)
    const result = await api<{ ok: true }>(`/api/admin/professionals/${professional.id}/access`, { method: 'DELETE' })
    setRevokingId(null)
    if (!result.ok) { notify(result.error.message, 'error'); return }
    notify('Acesso individual removido.', 'success')
    await load()
  }

  return <div className="nr-professionals">
    <section className="nr-professionals-intro">
      <div className="nr-professionals-intro-copy">
        <span>Equipe</span>
        <h2>Cada cadeira com sua própria rotina.</h2>
        <p>Cadastre quem atende, defina serviços e horários e entregue acesso individual sem abrir caixa, clientes ou agenda dos colegas.</p>
      </div>
      <button type="button" className="btn btnPrimary" onClick={() => setEditing('new')}><Plus size={16} /> Adicionar profissional</button>
    </section>

    <div className="nr-professionals-capacity" aria-label="Capacidade da equipe">
      <div><span>Atendendo agora</span><strong>{active.length}</strong><small>profissionais ativos</small></div>
      <div><span>Acesso próprio</span><strong>{withAccess}</strong><small>contas individuais</small></div>
      <div><span>Cobertura</span><strong>{coveredServices}</strong><small>serviços distribuídos</small></div>
      <p><Users size={16} /> O responsável continua vendo a operação completa; cada profissional entra em uma área isolada da própria agenda.</p>
    </div>

    {loading ? <div className="nr-professionals-grid"><div className="skeleton skeleton-card nr-professional-skeleton" /><div className="skeleton skeleton-card nr-professional-skeleton" /></div> : <div className="nr-professionals-grid">
      {professionals.map((professional) => {
        const assigned = services.filter((service) => professional.serviceIds.includes(service.id))
        const scheduleLabel = professional.inheritsHours ? 'Segue o horário do espaço' : `${new Set(professional.hours.map((range) => range.weekday)).size} dias próprios`
        const access = accessCopy(professional)
        return <article className={`nr-professional-card${professional.active ? '' : ' is-inactive'}`} key={professional.id} style={{ '--professional-color': professional.color } as CSSProperties}>
          <header>
            <div className="nr-professional-avatar">{professional.photoUrl ? <img src={professional.photoUrl} alt="" /> : initials(professional.name)}</div>
            <div className="nr-professional-identity"><strong>{professional.nickname || professional.name}</strong>{professional.nickname ? <span>{professional.name}</span> : <span>{professional.email || 'Sem e-mail de acesso'}</span>}</div>
            <button type="button" className="icon-btn" onClick={() => setEditing(professional)} aria-label={`Editar ${professional.name}`}><Edit2 size={16} /></button>
          </header>

          <div className="nr-professional-operating-row">
            <span className={professional.active ? 'is-active' : 'is-inactive'}>{professional.active ? 'Recebendo agendamentos' : 'Agenda pausada'}</span>
            <small><Clock size={13} /> {scheduleLabel}</small>
          </div>

          <div className={`nr-professional-access is-${access.tone}`}>
            <div><strong>{access.label}</strong><span>{access.detail}</span></div>
            {professional.accessStatus === 'NONE' || professional.accessStatus === 'INVITED' ? <button type="button" className="btn nr-professional-invite" disabled={invitingId === professional.id} onClick={() => void createInvite(professional)}><Link2 size={14} /> {invitingId === professional.id ? 'Gerando…' : professional.accessStatus === 'INVITED' ? 'Gerar novo link' : 'Criar acesso'}</button> : professional.accessStatus === 'ACTIVE' ? <button type="button" className="btn nr-professional-invite" disabled={revokingId === professional.id} onClick={() => void revokeAccess(professional)}>{revokingId === professional.id ? 'Removendo…' : 'Remover acesso'}</button> : null}
          </div>

          <div className="nr-professional-services">
            {assigned.slice(0, 4).map((service) => <span key={service.id}>{service.name}</span>)}
            {assigned.length > 4 ? <span>+{assigned.length - 4}</span> : null}
            {!assigned.length ? <em>Nenhum serviço atribuído</em> : null}
          </div>
        </article>
      })}
    </div>}

    {editing ? <ProfessionalEditor professional={editing === 'new' ? null : editing} services={services} generalHours={generalHours} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load() }} /> : null}
    {invite ? <InviteDialog invite={invite} onClose={() => setInvite(null)} /> : null}
  </div>
}

function InviteDialog({ invite, onClose }: { invite: InviteResult; onClose: () => void }) {
  const expires = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(invite.expiresAt))
  async function copy() {
    const copied = await copyText(invite.url)
    notify(copied ? 'Link de acesso copiado.' : 'Não foi possível copiar o link.', copied ? 'success' : 'error')
  }
  return <ModalRoot onClick={onClose}>
    <section className="nr-dialog nr-team-access-dialog" role="dialog" aria-modal="true" aria-labelledby="team-access-title" onClick={(event) => event.stopPropagation()}>
      <header className="nr-dialog-header"><div><span>Acesso individual</span><h3 id="team-access-title">Convite para {invite.professional.nickname || invite.professional.name}</h3></div><button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={18} /></button></header>
      <div className="nr-dialog-body nr-team-access-body">
        <div className="nr-team-access-person"><div className="nr-professional-avatar" style={{ '--professional-color': invite.professional.color } as CSSProperties}>{invite.professional.photoUrl ? <img src={invite.professional.photoUrl} alt="" /> : initials(invite.professional.name)}</div><div><strong>O link cria uma conta limitada à própria agenda.</strong><span>{invite.email} · válido até {expires}</span></div></div>
        <div className="nr-team-access-url"><code>{invite.url}</code><button type="button" className="btn btnPrimary" onClick={() => void copy()}><Copy size={15} /> Copiar link</button></div>
        <p>Envie este link somente para o profissional. O código fica no fragmento da URL e não é gravado nos logs de acesso do servidor.</p>
      </div>
    </section>
  </ModalRoot>
}

function ProfessionalEditor({ professional, services, generalHours, onClose, onSaved }: { professional: Professional | null; services: Service[]; generalHours: BusinessHour[]; onClose: () => void; onSaved: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({ name: professional?.name ?? '', nickname: professional?.nickname ?? '', phone: professional?.phone ? formatBrazilPhoneInput(professional.phone) : '', email: professional?.email ?? '', color: professional?.color ?? '#347a8a', photoUrl: professional?.photoUrl ?? '', active: professional?.active ?? true, inheritsHours: professional?.inheritsHours ?? true, serviceIds: professional?.serviceIds ?? services.map((service) => service.id) })
  const [schedule, setSchedule] = useState(() => rangesToDays(professional && !professional.inheritsHours ? professional.hours : generalHours))
  const [saving, setSaving] = useState(false)
  const [imageBusy, setImageBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const activeDays = useMemo(() => schedule.filter((day) => day.enabled).length, [schedule])

  async function handleImage(file: File) {
    if (!file.type.startsWith('image/')) { setError('Escolha uma imagem válida.'); return }
    setImageBusy(true); setError(null)
    try {
      const photoUrl = await optimizeImageFile(file, { maxBytes: 220_000, maxDimension: 640, quality: .84 })
      setForm((current) => ({ ...current, photoUrl }))
    }
    catch { setError('Não foi possível processar esta foto.') }
    finally { setImageBusy(false) }
  }
  function toggleService(serviceId: string) { setForm((current) => ({ ...current, serviceIds: current.serviceIds.includes(serviceId) ? current.serviceIds.filter((id) => id !== serviceId) : [...current.serviceIds, serviceId] })) }

  async function save() {
    const name = form.name.trim()
    if (name.length < 2) { setError('Informe o nome do profissional.'); return }
    const phone = form.phone.trim() ? normalizeBrazilPhone(form.phone) : null
    if (form.phone.trim() && !phone) { setError('Informe um WhatsApp válido, com DDD.'); return }
    if (!form.inheritsHours && activeDays === 0) { setError('Ative ao menos um dia de trabalho.'); return }
    for (const day of schedule) {
      if (!day.enabled) continue
      const ranges = [...day.ranges].sort((a, b) => a.startMinute - b.startMinute)
      for (let index = 0; index < ranges.length; index += 1) {
        const range = ranges[index]
        if (range.endMinute <= range.startMinute) { setError('O fim de cada intervalo precisa ser posterior ao início.'); return }
        const previous = ranges[index - 1]
        if (previous && previous.endMinute > range.startMinute) { setError('Há intervalos de trabalho sobrepostos.'); return }
      }
    }
    setSaving(true); setError(null)
    const hours = schedule.flatMap((day, weekday) => day.enabled ? day.ranges.map((range) => ({ weekday, ...range })) : [])
    const payload = { name, nickname: form.nickname.trim() || null, phone, email: form.email.trim() || null, color: form.color, photoUrl: form.photoUrl || null, active: form.active, serviceIds: form.serviceIds, schedule: { inheritsHours: form.inheritsHours, hours } }
    const result = professional ? await api<{ professional: Professional }>(`/api/admin/professionals/${professional.id}`, { method: 'PATCH', body: JSON.stringify(payload) }) : await api<{ professional: Professional }>('/api/admin/professionals', { method: 'POST', body: JSON.stringify(payload) })
    setSaving(false)
    if (!result.ok || !result.data.professional) { setError(result.ok ? 'Não foi possível salvar o profissional.' : result.error.message); return }
    notify(professional ? 'Profissional atualizado.' : 'Profissional adicionado à equipe.', 'success')
    onSaved()
  }

  return <ModalRoot onClick={saving ? undefined : onClose}>
    <section className="nr-dialog nr-professional-dialog" role="dialog" aria-modal="true" aria-labelledby="professional-editor-title" onClick={(event) => event.stopPropagation()}>
      <header className="nr-dialog-header"><div><span>Equipe</span><h3 id="professional-editor-title">{professional ? `Editar ${professional.nickname || professional.name}` : 'Adicionar profissional'}</h3><p>{professional ? 'Perfil, agenda e serviços em um só lugar.' : 'Cadastre primeiro o perfil. O acesso individual pode ser enviado depois.'}</p></div><button type="button" className="icon-btn" onClick={onClose} disabled={saving} aria-label="Fechar"><X size={18} /></button></header>
      <div className="nr-dialog-body nr-professional-dialog-body">
        <div className="nr-professional-profile-form">
          <button type="button" className="nr-professional-photo-editor" onClick={() => fileRef.current?.click()} disabled={imageBusy} style={{ '--professional-color': form.color } as CSSProperties}>{form.photoUrl ? <img src={form.photoUrl} alt="" /> : <span>{initials(form.name || 'Profissional')}</span>}<small>{imageBusy ? 'Processando…' : 'Trocar foto'}</small></button>
          <input ref={fileRef} type="file" accept="image/*" className="visually-hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleImage(file) }} />
          <div className="nr-professional-fields">
            <label><span>Nome completo</span><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoFocus /></label>
            <label><span>Nome na agenda <small>(opcional)</small></span><input className="input" value={form.nickname} onChange={(event) => setForm({ ...form, nickname: event.target.value })} placeholder="Ex.: Rafa" /></label>
            <label><span>WhatsApp <small>(opcional)</small></span><input className="input" value={form.phone} onChange={(event) => setForm({ ...form, phone: formatBrazilPhoneInput(event.target.value) })} inputMode="tel" /></label>
            <label><span>E-mail {professional?.accessStatus === 'ACTIVE' ? <small>(acesso)</small> : <small>(para convite)</small>}</span><input className="input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          </div>
        </div>

        <div className="nr-professional-setting-row"><div><strong>Cor na agenda</strong><span>Uma referência visual para localizar rapidamente a cadeira.</span></div><label className="nr-professional-color"><input type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} /><span>{form.color}</span></label></div>

        <section className="nr-professional-services-editor"><header><div><strong>Serviços realizados</strong><span>O profissional só aparece no booking dos serviços selecionados.</span></div><small>{form.serviceIds.length} selecionados</small></header><div>{services.map((service) => <button type="button" key={service.id} className={form.serviceIds.includes(service.id) ? 'is-selected' : ''} aria-pressed={form.serviceIds.includes(service.id)} onClick={() => toggleService(service.id)}><span aria-hidden="true" /><strong>{service.name}</strong><small>{service.durationMinutes} min</small></button>)}</div></section>

        <section className="nr-professional-schedule-editor"><header><div><strong>Horário de trabalho</strong><span>Use o expediente do espaço ou uma rotina própria para esta cadeira.</span></div><button type="button" role="switch" aria-checked={form.inheritsHours} className={`nr-professional-hours-switch${form.inheritsHours ? ' is-on' : ''}`} onClick={() => { const inheritsHours = !form.inheritsHours; setForm({ ...form, inheritsHours }); if (!inheritsHours) setSchedule(rangesToDays(generalHours)) }}><i /><span>{form.inheritsHours ? 'Horário geral' : 'Personalizado'}</span></button></header>{!form.inheritsHours ? <div className="nr-professional-days">{schedule.map((day, weekday) => <div className={day.enabled ? 'is-enabled' : ''} key={DAY_NAMES[weekday]}><button type="button" className="nr-professional-day-toggle" aria-pressed={day.enabled} onClick={() => setSchedule((current) => current.map((item, index) => index === weekday ? { ...item, enabled: !item.enabled } : item))}><i />{DAY_NAMES[weekday]}</button><div className="nr-professional-day-ranges">{day.ranges.map((range, rangeIndex) => <div className="nr-professional-day-range" key={`${weekday}-${rangeIndex}`}><input type="time" aria-label={`${DAY_NAMES[weekday]} início ${rangeIndex + 1}`} value={minuteToTime(range.startMinute)} disabled={!day.enabled} onChange={(event) => setSchedule((current) => current.map((item, index) => index === weekday ? { ...item, ranges: item.ranges.map((currentRange, currentIndex) => currentIndex === rangeIndex ? { ...currentRange, startMinute: timeToMinute(event.target.value) } : currentRange) } : item))} /><span>até</span><input type="time" aria-label={`${DAY_NAMES[weekday]} fim ${rangeIndex + 1}`} value={minuteToTime(range.endMinute)} disabled={!day.enabled} onChange={(event) => setSchedule((current) => current.map((item, index) => index === weekday ? { ...item, ranges: item.ranges.map((currentRange, currentIndex) => currentIndex === rangeIndex ? { ...currentRange, endMinute: timeToMinute(event.target.value) } : currentRange) } : item))} />{day.ranges.length > 1 ? <button type="button" className="nr-professional-range-remove" disabled={!day.enabled} aria-label={`Remover intervalo ${rangeIndex + 1} de ${DAY_NAMES[weekday]}`} onClick={() => setSchedule((current) => current.map((item, index) => index === weekday ? { ...item, ranges: item.ranges.filter((_, currentIndex) => currentIndex !== rangeIndex) } : item))}><X size={13} /></button> : null}</div>)}{day.enabled ? <button type="button" className="nr-professional-range-add" onClick={() => setSchedule((current) => current.map((item, index) => { if (index !== weekday) return item; const last = item.ranges.at(-1) ?? { startMinute: 540, endMinute: 1080 }; const startMinute = Math.min(last.endMinute + 30, 1380); const endMinute = Math.min(startMinute + 120, 1440); return { ...item, ranges: [...item.ranges, { startMinute, endMinute }] } }))}><Plus size={13} /> Adicionar intervalo</button> : null}</div></div>)}</div> : <p>Alterações em Agenda → Horários serão aplicadas automaticamente.</p>}</section>

        {professional ? <div className="nr-professional-setting-row is-status"><div><strong>Receber novos agendamentos</strong><span>Pausar não remove os horários que já estão registrados.</span></div><button type="button" role="switch" aria-checked={form.active} className={`nr-professional-hours-switch${form.active ? ' is-on' : ''}`} onClick={() => setForm({ ...form, active: !form.active })}><i /><span>{form.active ? 'Disponível' : 'Pausado'}</span></button></div> : null}
        {error ? <div className="nr-form-error" role="alert">{error}</div> : null}
      </div>
      <footer className="nr-dialog-footer"><button type="button" className="btn" onClick={onClose} disabled={saving}>Cancelar</button><button type="button" className="btn btnPrimary" onClick={() => void save()} disabled={saving || imageBusy}>{saving ? 'Salvando…' : 'Salvar profissional'}</button></footer>
    </section>
  </ModalRoot>
}
