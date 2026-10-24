import { confirmAction } from '../../lib/feedback'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatTimeInZone, getZonedDateTimeParts } from '../../dateTime'
import { ProductDate } from '../../components/ProductDate'
import { api } from '../../api'
import type { SessionUser } from '../../types'
import './staff-area.css'
import { useSupportNotifications } from '../support/useSupportNotifications'
import { staffDayRange } from './staffDayRange'

type Appointment = { id: string; startsAt: string; endsAt: string; status: string; serviceName: string; clientName: string | null }
const localDay = () => {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

export function StaffArea() {
  const navigate = useNavigate()
  const [user, setUser] = useState<SessionUser | null>(null)
  const supportUnread = useSupportNotifications(user)
  const [timeZone,setTimeZone]=useState<string|null>(null)
  const [timeZoneRevision,setTimeZoneRevision]=useState(0)
  const [day, setDay] = useState(localDay)
  const [name, setName] = useState('')
  const [profileName,setProfileName]=useState('')
  const [nickname,setNickname]=useState('')
  const [savingProfile,setSavingProfile]=useState(false)
  useEffect(()=>{void api<{professional:{name:string;nickname?:string|null}}>('/api/staff/profile').then(result=>{if(result.ok){setProfileName(result.data.professional.name);setNickname(result.data.professional.nickname??'')}})},[])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<{ user: SessionUser | null }>('/api/auth/me').then(result => {
      if (!result.ok || !result.data.user) { navigate('/login', { replace: true }); return }
      setUser(result.data.user)
      if (result.data.user.role !== 'STAFF') navigate('/', { replace: true })
    })
  }, [navigate])

  useEffect(()=>{
    if(user?.role!=='STAFF')return
    const c=new AbortController()
    void api<{timezone:string}>('/api/public/booking',{signal:c.signal}).then(res=>{
      if(c.signal.aborted)return
      if(!res.ok){setError('Não foi possível consultar o fuso do espaço. Tente novamente.');setLoading(false);return}
      setTimeZone(res.data.timezone);setDay(getZonedDateTimeParts(new Date(),res.data.timezone)?.ymd ?? localDay());setError('')
    })
    return()=>c.abort()
  },[user,timeZoneRevision])

  useEffect(() => {
    if (user?.role !== 'STAFF' || !timeZone) return
    const range = staffDayRange(day,timeZone)
    if (!range) {
      setAppointments([])
      setError('Escolha uma data válida para consultar sua agenda.')
      setLoading(false)
      return
    }
    const controller = new AbortController()
    let current = true
    setLoading(true)
    setError('')
    setAppointments([])
    api<{ professional: { name: string }; appointments: Appointment[] }>(`/api/staff/appointments?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`, { signal: controller.signal })
      .then(result => {
        if (!current) return
        if (result.ok) { setName(result.data.professional.name); setAppointments(result.data.appointments); setError('') }
        else setError(result.error.message)
        setLoading(false)
      })
    return () => { current = false; controller.abort() }
  }, [day, user,timeZone])

  return <main className="staff-area">
    <header className="staff-area-header"><div><span>MEU ESPAÇO</span><strong>{user?.tenantSlug ?? 'NaRégua'}</strong></div><button type="button" onClick={() => navigate('/suporte')}>Suporte{supportUnread ? ` (${supportUnread} nova${supportUnread === 1 ? '' : 's'})` : ''}</button><button type="button" onClick={async () => { await api('/api/auth/logout', { method: 'POST' }); window.location.assign('/login') }}>Sair</button></header>
    <div className="staff-area-content">
      <span className="staff-area-kicker">Agenda individual</span>
      <h1>Olá, {name || 'profissional'}.</h1>
      <p>Veja seus atendimentos no espaço. Os horários e dados de outras profissionais ficam fora da sua conta.</p>
      <div className="staff-area-toolbar"><ProductDate label="Escolha o dia" value={day} onChange={setDay} today={timeZone?getZonedDateTimeParts(new Date(),timeZone)?.ymd ?? localDay():localDay()} disabled={!timeZone}/><button type="button" onClick={() => setDay(timeZone?getZonedDateTimeParts(new Date(),timeZone)?.ymd ?? localDay():localDay())}>Hoje</button></div>
      {error ? <div role="alert" className="staff-area-error">{error}{!timeZone?<button type="button" className="btn" onClick={()=>setTimeZoneRevision(v=>v+1)}>Tentar novamente</button>:null}</div> : loading ? <div className="staff-area-empty">Carregando agenda…</div> : appointments.length === 0 ? <div className="staff-area-empty">Nenhum atendimento para este dia.</div> :
        <ol className="staff-area-list">{appointments.map(item => <li key={item.id}>
          <time>{formatTimeInZone(item.startsAt,timeZone ?? 'America/Sao_Paulo')}</time>
          <div><strong>{item.serviceName}</strong><span>{item.clientName ?? 'Cliente'} · até {formatTimeInZone(item.endsAt,timeZone ?? 'America/Sao_Paulo')}</span></div>
          {item.status !== 'CANCELLED' ? <div className="staff-appointment-actions">{(['CONFIRMED','CANCELLED'] as const).filter(status=>status!==item.status).map(status=><button type="button" key={status} onClick={async()=>{if(status==='CANCELLED' && !(await confirmAction({title:'Cancelar agendamento?',message:'O horário será liberado e as automações interrompidas.',confirmLabel:'Cancelar agendamento',danger:true}))) return;const result=await api(`/api/staff/appointments/${item.id}`,{method:'PATCH',body:JSON.stringify({status})});if(result.ok)setAppointments(items=>items.map(row=>row.id===item.id?{...row,status}:row));else setError(result.error.message)}}>{status==='CONFIRMED'?'Confirmar':'Cancelar'}</button>)}</div> : null}
          <small>{item.status === 'CANCELLED' ? 'Cancelado' : item.status === 'CONFIRMED' ? 'Confirmado' : 'Pendente'}</small>
        </li>)}</ol>}
      <details className="staff-profile"><summary>Meu perfil</summary><form onSubmit={async event=>{event.preventDefault();setSavingProfile(true);const result=await api('/api/staff/profile',{method:'PATCH',body:JSON.stringify({name:profileName,nickname:nickname||null})});setSavingProfile(false);if(!result.ok)setError(result.error.message);else setName(profileName)}}><label>Nome<input value={profileName} onChange={event=>setProfileName(event.target.value)} minLength={2} maxLength={120} required /></label><label>Apelido<input value={nickname} onChange={event=>setNickname(event.target.value)} maxLength={80}/></label><button className="btn btnPrimary" disabled={savingProfile}>Salvar perfil</button></form></details>
      <footer>Para ajustar serviços, folgas ou horários, fale com a administração do espaço.</footer>
    </div>
  </main>
}
