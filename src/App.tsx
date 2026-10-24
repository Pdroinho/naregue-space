import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { cloneElement, isValidElement, lazy, useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent, type MouseEvent as ReactMouseEvent, type ReactElement, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { api } from './api'
import type { SessionUser, TenantDev, TenantPublic, CalendarEvent, AppointmentConfirmationStatus, Professional, PublicProfessional } from './types'
import { applyTenantTheme, getDevTheme, getTheme, initDevTheme, setAppMode, toggleDevTheme, toggleTheme, type DevThemeMode, type ThemeMode, getDevPrimaryColor, setDevPrimaryColor } from './theme'
import { ColorPicker } from './components/ColorPicker'
import { ProductTour, shouldAutoStartTour, type ProductTourStep } from './components/ProductTour'
import { ProductSelect } from './components/ProductSelect'
import { PasswordChecklist } from './components/PasswordChecklist'
import { optimizeImageFile } from './imageProcessing'
import { formatBrazilPhoneInput, normalizeBrazilPhone } from './phone'
import { readStorage, removeStorage, writeStorage } from './storage'
import { confirmAction, notify } from './components/FeedbackCenter'
import { ModalRoot } from './components/ModalRoot'
import {
  addDaysToYmd,
  formatDateInZone,
  formatDateTimeInZone,
  formatTimeInZone,
  formatYmdPtBr,
  localDateToYmd,
  minutesInTimeZone,
  weekdayIndexForYmd,
  ymdInTimeZone,
  zonedDateTimeToUtc,
} from './dateTime'
import {
  Calendar,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Sparkles,
  Users,
  Wallet,
  Settings,
  Bell,
  Search,
  Plus,
  Clock,
  X,
  XCircle,
  MoreHorizontal,
  Edit2,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Image as ImageIcon,
  Scissors,
  Trash2,
  ShieldCheck,
  Eye,
  EyeOff,
  Smartphone,
  Copy,
  Moon,
  Sun,
  Palette,
  Globe,
  Webhook,
  BellRing,
  CreditCard,
  MessageSquare,
  Lock,
  Database,
  Compass,
  HeartHandshake,
  SidebarSimple,
  Download,
  BarChart3,
} from './components/Icons'

const BillingCenter = lazy(() => import('./components/BillingCenter').then((module) => ({ default: module.BillingCenter })))
const BusinessAssistant = lazy(() => import('./components/BusinessAssistant').then((module) => ({ default: module.BusinessAssistant })))
const ReferralCenter = lazy(() => import('./components/ReferralCenter').then((module) => ({ default: module.ReferralCenter })))
const DevReferrals = lazy(() => import('./components/DevReferrals').then((module) => ({ default: module.DevReferrals })))
const AssistantChatLauncher = lazy(() => import('./components/AssistantChatLauncher').then((module) => ({ default: module.AssistantChatLauncher })))
const WorkspaceSetup = lazy(() => import('./components/WorkspaceSetup').then((module) => ({ default: module.WorkspaceSetup })))
const WhatsAppCenter = lazy(() => import('./components/WhatsAppCenter').then((module) => ({ default: module.WhatsAppCenter })))
const FinanceFlowChart = lazy(() => import('./components/FinanceFlowChart').then((module) => ({ default: module.FinanceFlowChart })))
const ProfessionalManager = lazy(() => import('./components/ProfessionalManager').then((module) => ({ default: module.ProfessionalManager })))
const CustomDomainsSettings = lazy(() => import('./components/CustomDomainsSettings').then((module) => ({ default: module.CustomDomainsSettings })))
const LandingPage = lazy(() => import('./LandingPage').then((module) => ({ default: module.LandingPage })))
const WorkspaceAccessPage = lazy(() => import('./LandingPage').then((module) => ({ default: module.WorkspaceAccessPage })))
const LegalPage = lazy(() => import('./LegalPage').then((module) => ({ default: module.LegalPage })))
const ProfessionalPortal = lazy(() => import('./components/ProfessionalPortal').then((module) => ({ default: module.ProfessionalPortal })))
const TeamInvitePage = lazy(() => import('./components/TeamInvitePage').then((module) => ({ default: module.TeamInvitePage })))

function configuredPlatformBaseUrl() {
  const raw = String(import.meta.env.VITE_APP_BASE_URL ?? '').trim()
  if (!raw) return null
  try {
    return new URL(raw)
  } catch {
    return null
  }
}

function configuredPlatformHostname() {
  return configuredPlatformBaseUrl()?.hostname ?? 'seu-dominio.com.br'
}

async function copyTextToClipboard(value: string) {
  if (!value) return false
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = value
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const copied = document.execCommand('copy')
      area.remove()
      return copied
    } catch {
      return false
    }
  }
}

function configuredExternalLink(raw: unknown) {
  const value = String(raw ?? '').trim()
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

type MenuTriggerProps = {
    onClick?: (event: ReactMouseEvent<HTMLElement>) => void
    'aria-expanded'?: boolean
    'aria-haspopup'?: 'menu' | 'true'
}

function PortalMenu({
    trigger,
    children
}: {
    trigger: (isOpen: boolean) => ReactElement<MenuTriggerProps>,
    children: (close: () => void) => ReactNode
}) {
    const [isOpen, setIsOpen] = useState(false)
    const triggerRef = useRef<HTMLSpanElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const [pos, setPos] = useState({ top: 0, left: 0 })

    const toggle = (e: ReactMouseEvent<HTMLElement>) => {
        e.stopPropagation()
        if (!isOpen) {
            const rect = triggerRef.current?.getBoundingClientRect()
            if (rect) {
                setPos({
                    top: rect.bottom + window.scrollY + 4,
                    left: rect.right + window.scrollX
                })
            }
            setIsOpen(true)
        } else {
            setIsOpen(false)
        }
    }

    useEffect(() => {
        if (!isOpen) return

        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current?.contains(event.target as Node)) return
            if (triggerRef.current?.contains(event.target as Node)) return
            setIsOpen(false)
        }

        function updatePos() {
             const rect = triggerRef.current?.getBoundingClientRect()
             if (rect) {
                 setPos({
                     top: rect.bottom + window.scrollY + 4,
                     left: rect.right + window.scrollX
                 })
             } else {
                 setIsOpen(false)
             }
        }

        document.addEventListener('mousedown', handleClickOutside)
        window.addEventListener('resize', updatePos)
        window.addEventListener('scroll', updatePos, true)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            window.removeEventListener('resize', updatePos)
            window.removeEventListener('scroll', updatePos, true)
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                setIsOpen(false)
            }
        }
        document.addEventListener('keydown', closeOnEscape)
        window.requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>('button:not([disabled])')?.focus())
        return () => document.removeEventListener('keydown', closeOnEscape)
    }, [isOpen])

    const triggerElement = trigger(isOpen)

    return (
        <>
            <span ref={triggerRef} className="nr-menu-trigger">
                {cloneElement(triggerElement, {
                    onClick: (event: ReactMouseEvent<HTMLElement>) => {
                        triggerElement.props.onClick?.(event)
                        toggle(event)
                    },
                    'aria-expanded': isOpen,
                    'aria-haspopup': 'menu',
                })}
            </span>
            {isOpen && createPortal(
                <div
                    ref={menuRef}
                    onClick={e => e.stopPropagation()}
                    className="portal-menu-content"
                    role="group"
                    aria-label="Ações do agendamento"
                    style={{
                        top: pos.top,
                        left: pos.left,
                        transform: 'translateX(-100%)'
                    }}
                >
                    {children(() => setIsOpen(false))}
                </div>,
                document.body
            )}
        </>
    )
}

function withBasePath(basePath: string, path: string) {
  const p = path.startsWith('/') ? path : `/${path}`
  if (!basePath) return p
  return `${basePath}${p}`
}

async function fileToOptimizedDataUrl(file: File) {
  return optimizeImageFile(file, { maxBytes: 255_000, maxDimension: 768, quality: .84 })
}

const bundledServiceCovers = {
  tradicional: '/naregua/services/traditional.webp',
  fade: '/naregua/services/fade.webp',
  barba: '/naregua/services/beard.webp',
  combo: '/naregua/services/combo.webp',
  barboterapia: '/naregua/services/barbotherapy.webp',
  acabamento: '/naregua/services/finish.webp',
  infantil: '/naregua/services/kids.webp',
} as const

function bundledServiceCover(name: string) {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (normalized.includes('infantil') || normalized.includes('crianca')) return bundledServiceCovers.infantil
  if (normalized.includes('barboterapia') || normalized.includes('toalha')) return bundledServiceCovers.barboterapia
  if (normalized.includes('pezinho') || normalized.includes('acabamento') || normalized.includes('contorno')) return bundledServiceCovers.acabamento
  if (normalized.includes('corte + barba') || normalized.includes('combo')) return bundledServiceCovers.combo
  if (normalized.includes('barba')) return bundledServiceCovers.barba
  if (normalized.includes('degrade') || normalized.includes('fade')) return bundledServiceCovers.fade
  return bundledServiceCovers.tradicional
}

function EmptyState(props: { icon: ReactNode; title: string; description?: string; compact?: boolean }) {
  return (
    <div className={`empty-state ${props.compact ? 'compact' : ''}`}>
      <span className="empty-state-icon" aria-hidden="true">{props.icon}</span>
      <strong>{props.title}</strong>
      {props.description ? <span>{props.description}</span> : null}
    </div>
  )
}

type CssVarStyle = CSSProperties & { ['--auth-accent']?: string }

type AdminStats = {
  timeZone?: string
  publicBaseUrl?: string | null
  today?: { appointmentsCount?: number; expectedRevenueCents?: number }
  newClients30d?: number
  pendingAppointments?: number
  confirmationSummary?: { confirmed: number; awaiting: number; noResponse: number; deliveryFailed: number; declined: number; notRequested: number }
  confirmationAttention?: Array<{
    id: string
    startsAt: string
    status: string
    confirmationStatus: AppointmentConfirmationStatus
    confirmationSentAt?: string | null
    serviceName: string
    clientName: string | null
    clientPhone: string | null
    professionalId: string
    professionalName: string
    professionalColor: string
  }>
  upcoming?: Array<{
    id: string
    startsAt: string
    status: string
    confirmationStatus?: AppointmentConfirmationStatus
    confirmationSentAt?: string | null
    confirmationRespondedAt?: string | null
    serviceName: string
    priceCents: number
    clientEmail: string
    clientName: string | null
    clientPhone?: string | null
    professionalId: string
    professionalName: string
    professionalColor: string
    professionalPhotoUrl?: string | null
  }>
  recentActivity?: Array<{
    kind: string
    at: string
    clientName: string | null
    clientEmail: string | null
    serviceName: string | null
    priceCents: number | null
    amountCents: number | null
    note: string | null
  }>
}

type AdminService = {
  id: string
  name: string
  durationMinutes: number
  priceCents: number
  coverUrl?: string | null
}

type AdminAppointment = {
  id: string
  serviceId: string
  startsAt: string
  endsAt: string
  status: string
  confirmationStatus?: AppointmentConfirmationStatus
  confirmationSentAt?: string | null
  confirmationReminderSentAt?: string | null
  confirmationRespondedAt?: string | null
  appointmentReminderSentAt?: string | null
  clientEmail: string
  clientName: string | null
  clientPhone: string | null
  serviceName: string
  priceCents: number
  professionalId: string
  professionalName: string
  professionalColor: string
  professionalPhotoUrl: string | null
}

function appointmentPresenceMeta(rawStatus: string, confirmationStatus?: AppointmentConfirmationStatus) {
  if (rawStatus.trim().toUpperCase() === 'CANCELLED') return { label: 'Cancelado', className: 'status-warning', color: 'var(--status-neutral-bg)', textColor: 'var(--status-neutral-ink)' }
  if (confirmationStatus === 'CONFIRMED' || confirmationStatus === 'MANUALLY_CONFIRMED') return { label: 'Presença confirmada', className: 'status-success', color: 'var(--status-success-bg)', textColor: 'var(--status-success-ink)' }
  if (confirmationStatus === 'AWAITING_CONFIRMATION') return { label: 'Aguardando resposta', className: 'status-pending', color: 'var(--status-warning-bg)', textColor: 'var(--status-warning-ink)' }
  if (confirmationStatus === 'NO_RESPONSE') return { label: 'Sem resposta', className: 'status-warning', color: 'var(--status-warning-bg)', textColor: 'var(--status-warning-ink)' }
  if (confirmationStatus === 'DELIVERY_FAILED') return { label: 'Falha no envio', className: 'status-warning', color: 'var(--status-danger-bg)', textColor: 'var(--status-danger-ink)' }
  if (confirmationStatus === 'DECLINED') return { label: 'Não poderá ir', className: 'status-warning', color: 'var(--status-danger-bg)', textColor: 'var(--status-danger-ink)' }
  return { label: 'Agendado', className: 'status-info', color: 'var(--status-info-bg)', textColor: 'var(--status-info-ink)' }
}

type AdminClientRow = {
  id: string
  name: string
  phone: string | null
  marketingWhatsappOptIn: number | boolean
  email: string
  totalSpentCents: number
  lastVisitAt: string | null
  appointmentsCount: number
}

type FinanceMonthSnapshot = {
  ym: string
  serviceEntriesCents: number
  manualIncomeCents: number
  entriesCents: number
  expensesCents: number
  balanceCents: number
  confirmedAppointments: number
}

type AdminFinanceData = {
  timeZone: string
  todayYmd: string
  currentMonthYm: string
  currentMonth: FinanceMonthSnapshot
  previousMonth: FinanceMonthSnapshot
  totals: {
    entriesCents: number
    expensesCents: number
    profitCents: number
  }
  goals: {
    revenueCents: number
    newClients: number
    currentRevenueCents: number
    currentNewClients: number
  }
  expenseCategories: Array<{ label: string; amountCents: number; transactions: number }>
  lastCashTransactions: Array<{ id: string; type: 'INCOME' | 'EXPENSE'; amountCents: number; method: string; note: string | null; createdAt: string; professionalId: string | null; professionalName: string | null }>
  lastEntries: Array<{ id: string; startsAt: string; status: string; serviceName: string; priceCents: number; clientEmail: string; clientName: string | null; professionalId: string; professionalName?: string }>
  monthly: FinanceMonthSnapshot[]
}

type ProfessionalScope = 'all' | string

function scopedApiPath(path: string, professionalId: ProfessionalScope) {
  if (professionalId === 'all') return path
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}professionalId=${encodeURIComponent(professionalId)}`
}

function TeamScopeSelect({ professionals, value, onChange }: { professionals: Professional[]; value: ProfessionalScope; onChange: (value: ProfessionalScope) => void }) {
  return <div className="nr-team-scope" data-tour="team-scope">
    <span className="nr-team-scope-label">Agenda de</span>
    <ProductSelect
      value={value}
      onChange={onChange}
      size="compact"
      className="nr-team-scope-select"
      ariaLabel="Selecionar visão da equipe"
      options={[
        { value: 'all', label: 'Toda a equipe', description: 'Visão geral do espaço', leading: <span className="nr-team-scope-all"><Users size={13} /></span> },
        ...professionals.filter((professional) => professional.active).map((professional) => ({
          value: professional.id,
          label: professional.nickname || professional.name,
          description: 'Agenda individual',
          leading: professional.photoUrl
            ? <img className="nr-team-scope-photo" src={professional.photoUrl} alt="" />
            : <span className="nr-team-scope-initials" style={{ '--scope-color': professional.color } as CSSProperties}>{(professional.nickname || professional.name).trim().slice(0, 2).toUpperCase()}</span>,
        })),
      ]}
    />
  </div>
}

const FINANCE_MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const financeMonthLabel = (ym: string) => {
  const month = Number(ym.split('-')[1])
  return Number.isInteger(month) && month >= 1 && month <= 12 ? FINANCE_MONTH_LABELS[month - 1] : ym
}

function formatBRL(n: number) {
  return 'R$' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

type ClientAppointment = {
  id: string
  serviceName: string
  startsAt: string
  status: string
  confirmationStatus?: AppointmentConfirmationStatus
  confirmationSentAt?: string | null
  confirmationRespondedAt?: string | null
  professionalId: string
  professionalName: string
  professionalColor: string
  professionalPhotoUrl?: string | null
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <label className="switch-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch-toggle-slider" />
    </label>
  )
}

function SidebarItem(props: { active?: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  const icon = isValidElement(props.icon)
    ? cloneElement(props.icon as ReactElement<{ weight?: 'regular' | 'duotone' }>, { weight: props.active ? 'duotone' : 'regular' })
    : props.icon

  return (
    <button
      type="button"
      className={`nr-nav-item ${props.active ? 'is-active' : ''}`}
      onClick={props.onClick}
      aria-current={props.active ? 'page' : undefined}
      aria-label={props.label}
      title={props.label}
      data-label={props.label}
    >
      <span className="nr-nav-icon" aria-hidden="true">{icon}</span>
      <span className="nr-nav-text">{props.label}</span>
    </button>
  )
}

function NotificationsModal({ isOpen, onClose, role }: { isOpen: boolean; onClose: () => void; role?: SessionUser['role'] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [notifications, setNotifications] = useState<Array<{id: string; title: string; desc: string; time: string; type: string}>>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)

    const load = async () => {
      if (role === 'DEV') {
        const res = await api<{notifications: Array<{id: string; title: string; desc: string; time: string; type: string}>}>('/api/dev/notifications')
        if (res.ok) setNotifications(res.data.notifications)
        return
      }
      if (role === 'ADMIN') {
        const res = await api<AdminStats>('/api/admin/dashboard')
        if (res.ok) {
          const items = (res.data.upcoming ?? []).slice(0, 5).map((item) => {
            const presence = appointmentPresenceMeta(item.status, item.confirmationStatus)
            return {
              id: item.id,
              title: item.status === 'CANCELLED' ? 'Agendamento cancelado' : presence.label,
              desc: `${item.clientName ?? item.clientEmail} • ${item.serviceName}`,
              time: item.startsAt,
              type: item.status === 'CANCELLED' || ['DECLINED','NO_RESPONSE','DELIVERY_FAILED'].includes(item.confirmationStatus ?? '') ? 'fail' : ['CONFIRMED','MANUALLY_CONFIRMED'].includes(item.confirmationStatus ?? '') ? 'approved' : 'message',
            }
          })
          setNotifications(items)
        }
        return
      }
      if (role === 'CLIENT') {
        const res = await api<{ appointments: ClientAppointment[] }>('/api/client/appointments')
        if (res.ok) {
          setNotifications(res.data.appointments.slice(0, 5).map((item) => {
            const presence = appointmentPresenceMeta(item.status, item.confirmationStatus)
            return {
              id: item.id,
              title: item.status === 'CANCELLED' ? 'Agendamento cancelado' : presence.label,
              desc: item.serviceName,
              time: item.startsAt,
              type: item.status === 'CANCELLED' || item.confirmationStatus === 'DECLINED' ? 'fail' : ['CONFIRMED','MANUALLY_CONFIRMED'].includes(item.confirmationStatus ?? '') ? 'approved' : 'message',
            }
          }))
        }
      }
    }

    void load().finally(() => setLoading(false))
  }, [isOpen, role])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    if (isOpen) document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const getIcon = (type: string) => {
      const t = type.toLowerCase()
      if (t.includes('payment') || t.includes('approved')) return <CreditCard size={16}/>
      if (t.includes('message')) return <MessageSquare size={16}/>
      if (t.includes('fail') || t.includes('refused')) return <XCircle size={16}/>
      return <BellRing size={16}/>
  }

  const getTone = (type: string) => {
      const t = type.toLowerCase()
      if (t.includes('payment') || t.includes('approved')) return 'success'
      if (t.includes('message')) return 'info'
      if (t.includes('fail') || t.includes('refused')) return 'danger'
      return 'neutral'
  }

  const relativeTime = (iso: string) => {
      try {
          const date = new Date(iso)
          if (isNaN(date.getTime())) return iso
          const diff = Date.now() - date.getTime()
          if (diff < 0) {
            return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
          }
          const mins = Math.floor(diff / 60000)
          if (mins < 1) return 'Agora'
          if (mins < 60) return `Há ${mins} min`
          const hours = Math.floor(mins / 60)
          if (hours < 24) return `Há ${hours} h`
          return date.toLocaleDateString('pt-BR')
      } catch {
          return iso
      }
  }

  return (
    <div
      ref={ref}
      className="notifications-popover"
      role="dialog"
      aria-label="Notificações"
    >
        <div className="notifications-header">
            <h3>Notificações</h3>
            <button type="button" className="notifications-clear" onClick={() => setNotifications([])} disabled={notifications.length === 0}>Marcar como lidas</button>
        </div>
        <div className="notifications-body">
            {loading ? (
                <div className="notifications-loading" aria-label="Carregando notificações">
                    <div>
                        <div className="skeleton skeleton-card" />
                        <div className="skeleton skeleton-card" />
                        <div className="skeleton skeleton-card" />
                    </div>
                </div>
            ) : notifications.length === 0 ? (
                <div className="notifications-empty">Nenhuma notificação recente.</div>
            ) : (
                notifications.map(n => {
                    const tone = getTone(n.type)
                    return (
                        <div key={n.id} className="notification-item">
                            <div className={`notification-mark ${tone}`} aria-hidden="true">
                                {getIcon(n.type)}
                            </div>
                            <div className="notification-copy">
                                <strong>{n.title}</strong>
                                <span>{n.desc}</span>
                                <time dateTime={n.time}>{relativeTime(n.time)}</time>
                            </div>
                        </div>
                    )
                })
            )}
        </div>
    </div>
  )
}

type ShellNavItem = {
  key: string
  label: string
  icon: ReactNode
  active?: boolean
  onClick: () => void
}

function Shell(props: {
  title: string
  subtitle: string
  badge?: ReactNode
  sidebar: ReactNode
  children: ReactNode
  user?: SessionUser | null
  actions?: ReactNode
  onSearch?: (query: string) => void
  searchValue?: string
  isTestMode?: boolean
  tourKey?: string
  tourSteps?: ProductTourStep[]
  tourEnabled?: boolean
  autoStartTour?: boolean
  bottomNav?: ShellNavItem[]
  brand?: Pick<TenantPublic, 'name' | 'logoUrl'> | null
  mobileNav?: Array<{ key: string; label: string; icon: ReactNode; active: boolean; onClick: () => void }>
  mobileMoreActive?: boolean
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)
  const mobileToggleRef = useRef<HTMLButtonElement>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getTheme())
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return readStorage('naregua:sidebar-collapsed') === 'true'
  })

  const tourEnabled = props.tourEnabled !== false && Boolean(props.tourKey && props.tourSteps?.length)

  const openTour = () => {
    const blockingOverlay = document.querySelector('.nr-overlay, [data-blocking-overlay="true"], dialog[open]')
    if (blockingOverlay) return
    setShowNotifications(false)
    setMobileOpen(false)
    setShowTour(true)
  }

  useEffect(() => {
    setShowTour(false)
    if (!tourEnabled || !props.autoStartTour || !props.tourKey || !shouldAutoStartTour(props.tourKey)) return
    const timer = window.setTimeout(() => {
      const blockingOverlay = document.querySelector('.nr-overlay, [data-blocking-overlay="true"], dialog[open], [role="dialog"][aria-modal="true"]:not(.nr-tour-card)')
      if (!blockingOverlay) setShowTour(true)
    }, 900)
    return () => window.clearTimeout(timer)
  }, [props.autoStartTour, props.tourKey, tourEnabled])

  useEffect(() => {
    if (showNotifications || mobileOpen) setShowTour(false)
  }, [mobileOpen, showNotifications])

  useEffect(() => {
    if (!mobileOpen) return
    const sidebar = sidebarRef.current
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : mobileToggleRef.current
    const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const focusFirst = () => sidebar?.querySelector<HTMLElement>(focusableSelector)?.focus({ preventScroll: true })
    const frame = window.requestAnimationFrame(focusFirst)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMobileOpen(false)
        return
      }
      if (event.key !== 'Tab' || !sidebar) return
      const focusable = [...sidebar.querySelectorAll<HTMLElement>(focusableSelector)].filter((element) => element.offsetParent !== null)
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.body.classList.add('nav-open')
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.cancelAnimationFrame(frame)
      document.body.classList.remove('nav-open')
      window.removeEventListener('keydown', onKeyDown, true)
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [mobileOpen])

  useEffect(() => {
    writeStorage('naregua:sidebar-collapsed', String(sidebarCollapsed))
  }, [sidebarCollapsed])

  return (
    <div className={`nr-shell ${sidebarCollapsed ? 'is-sidebar-collapsed' : ''} ${props.mobileNav?.length ? 'has-mobile-tabbar' : ''} ${props.brand ? 'has-tenant-brand' : ''}`}>
      <aside ref={sidebarRef} className={`nr-sidebar ${mobileOpen ? 'is-open' : ''}`} data-tour="sidebar" aria-label="Navegação principal" onClick={(event) => { if ((event.target as HTMLElement).closest('.nr-nav-item')) setMobileOpen(false) }}>
        <div className="nr-sidebar-brand" data-tour="brand">
          <img decoding="async" className={`logo-icon ${props.brand?.logoUrl ? 'is-tenant-logo' : ''}`} src={props.brand?.logoUrl || '/brand/logo-symbol-approved-web.png'} alt="" aria-hidden="true" />
          {!props.brand ? <img decoding="async" className="nr-sidebar-wordmark" src="/brand/logo-wordmark-approved-inverse.png" alt="NaRégua" /> : null}
          {props.brand ? <span className="nr-sidebar-brand-copy"><strong>{props.brand.name}</strong><small>Gestão do espaço</small></span> : null}
          <button type="button" className="nr-sidebar-mobile-close" onClick={() => setMobileOpen(false)} aria-label="Fechar menu lateral">
            <X size={18} />
          </button>
          <button
            type="button"
            className="nr-sidebar-collapse"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            aria-label={sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            <SidebarSimple size={18} weight="regular" />
          </button>
        </div>

        <div className="nr-sidebar-nav">
          {props.sidebar}
        </div>

        <div className="nr-sidebar-account">
          <div className="user-avatar-mini nr-sidebar-account-avatar" style={props.user?.professionalColor ? { '--account-accent': props.user.professionalColor } as CSSProperties : undefined}>
            {props.user?.photoUrl ? <img src={props.user.photoUrl} alt="" /> : (props.user?.name || props.user?.email || 'U')[0].toUpperCase()}
          </div>
          <div className="nr-sidebar-account-copy">
            <div className="nr-sidebar-account-primary">
              {props.user?.name || props.user?.email || 'Usuário'}
            </div>
            <div className="nr-sidebar-account-role">
              {props.user?.role === 'ADMIN' ? 'Responsável pelo espaço' : props.user?.role === 'DEV' ? 'Developer' : props.user?.role === 'PROFESSIONAL' ? 'Profissional' : 'Cliente'}
            </div>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="nr-mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Fechar menu lateral"
        />
      )}

      <main className="nr-main">
        <header className="nr-topbar" data-tour="header">
          <div className="nr-topbar-left">
            {props.mobileNav?.length ? (
              <img className={`nr-mobile-topbar-brand ${props.brand?.logoUrl ? 'is-tenant-logo' : ''}`} src={props.brand?.logoUrl || '/brand/logo-symbol-approved-web.png'} alt="" aria-hidden="true" />
            ) : (
              <img className="nr-mobile-brandmark" src="/brand/logo-symbol-approved-web.png" alt="" aria-hidden="true" />
            )}
            <div className="nr-page-heading">
              <div className="nr-breadcrumb" aria-hidden="true">
                <span className="nr-breadcrumb-root">NaRégua</span>
                <ChevronRight size={12} className="nr-breadcrumb-separator"/>
                <span className="nr-breadcrumb-current">{props.title}</span>
              </div>
              <h1 className="nr-page-title">{props.title}</h1>
              <p className="nr-page-subtitle">{props.subtitle}</p>
            </div>
          </div>

          <div className="nr-topbar-actions">
            {props.actions}

            {props.user?.role !== 'DEV' ? (
              <button
                type="button"
                className="icon-btn nr-theme-toggle"
                onClick={() => setThemeMode(toggleTheme())}
                title={themeMode === 'dark' ? 'Usar modo claro' : 'Usar modo escuro'}
                aria-label={themeMode === 'dark' ? 'Usar modo claro' : 'Usar modo escuro'}
              >
                {themeMode === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
              </button>
            ) : null}

            {tourEnabled ? (
              <button type="button"
                className="icon-btn tour-launcher"
                onClick={openTour}
                title="Abrir tour guiado"
                aria-label="Abrir tour guiado"
              >
                <Compass size={20} weight="regular" />
              </button>
            ) : null}

            {props.onSearch ? (
              <label className="search-trigger" data-tour="search">
                <Search size={14} />
                <input
                  className="search-input"
                  placeholder="Buscar..."
                  value={props.searchValue ?? ''}
                  onChange={(event) => props.onSearch?.(event.target.value)}
                  autoComplete="off"
                  name="search_query"
                  type="search"
                />
              </label>
            ) : null}

            <button type="button" className="icon-btn nr-notification-trigger" data-tour="notifications" onClick={() => setShowNotifications(!showNotifications)} aria-label="Abrir notificações" aria-expanded={showNotifications}>
              <Bell size={20} />
            </button>

            <button
              type="button"
              ref={mobileToggleRef}
              className="icon-btn nr-mobile-menu-button"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu lateral"
              aria-expanded={mobileOpen}
            >
              <Menu size={20} />
            </button>

            <NotificationsModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} role={props.user?.role} />

            <div className="nr-topbar-divider" aria-hidden="true" />

            <div className="user-avatar-mini nr-topbar-avatar">
                {props.user?.email?.[0].toUpperCase() ?? 'U'}
            </div>
          </div>
        </header>

        <div id="main-content" className="nr-page" tabIndex={-1}>
          <div className="nr-page-inner" data-tour="content">{props.children}</div>
        </div>
      </main>

      {props.mobileNav?.length ? (
        <nav className="nr-mobile-tabbar" aria-label="Navegação principal mobile">
          {props.mobileNav.slice(0, 4).map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nr-mobile-tabbar-item ${item.active ? 'is-active' : ''}`}
              onClick={() => { setShowNotifications(false); setMobileOpen(false); item.onClick() }}
              aria-current={item.active ? 'page' : undefined}
            >
              <span className="nr-mobile-tabbar-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
          <button
            type="button"
            className={`nr-mobile-tabbar-item ${props.mobileMoreActive ? 'is-active' : ''}`}
            onClick={() => { setShowNotifications(false); setMobileOpen(true) }}
            aria-label="Abrir mais áreas"
            aria-expanded={mobileOpen}
          >
            <span className="nr-mobile-tabbar-icon" aria-hidden="true"><MoreHorizontal size={21} /></span>
            <span>Mais</span>
          </button>
        </nav>
      ) : null}

      {props.bottomNav?.length ? (
        <nav className="nr-mobile-dock" aria-label="Atalhos principais">
          {props.bottomNav.map((item) => {
            const icon = isValidElement(item.icon)
              ? cloneElement(item.icon as ReactElement<{ weight?: 'regular' | 'duotone' }>, { weight: item.active ? 'duotone' : 'regular' })
              : item.icon
            return (
              <button
                key={item.key}
                type="button"
                className={`nr-mobile-dock-item ${item.active ? 'is-active' : ''}`}
                onClick={item.onClick}
                aria-current={item.active ? 'page' : undefined}
                aria-label={item.label}
                title={item.label}
              >
                <span className="nr-mobile-dock-icon" aria-hidden="true">{icon}</span>
                <span className="nr-mobile-dock-label">{item.label}</span>
              </button>
            )
          })}
          <button type="button" className="nr-mobile-dock-item" onClick={() => setMobileOpen(true)} aria-label="Abrir mais opções" title="Mais">
            <span className="nr-mobile-dock-icon" aria-hidden="true"><Menu size={20} /></span>
            <span className="nr-mobile-dock-label">Mais</span>
          </button>
        </nav>
      ) : null}

      {tourEnabled ? (
        <ProductTour
          open={showTour}
          tourKey={props.tourKey ?? 'disabled-tour'}
          steps={props.tourSteps ?? []}
          enabled={tourEnabled}
          onClose={() => setShowTour(false)}
        />
      ) : null}
    </div>
  )
}

const shellTourSteps = (area: 'admin' | 'dev' | 'client', screen: string): ProductTourStep[] => {
  const audience = area === 'dev' ? 'plataforma' : area === 'client' ? 'sua área' : 'seu negócio'
  const screenLabels: Record<string, string> = {
    dashboard: 'visão geral',
    calendar: 'agenda',
    clients: 'clientes',
    services: 'serviços',
    finance: 'financeiro',
    professionals: 'profissionais',
    evolution: 'WhatsApp',
    settings: 'configurações',
    tenants: 'espaços',
    integrations: 'integrações',
    backups: 'backups',
    appointments: 'agendamentos',
  }
  const screenDescriptions: Record<string, string> = {
    dashboard: 'Acompanhe agenda, faturamento previsto, clientes e atividades recentes sem precisar montar relatórios manualmente.',
    calendar: 'Crie, confirme, reagende e acompanhe os atendimentos em uma visão organizada por data.',
    clients: 'Consulte o histórico das clientes e identifique relacionamento, retorno e valor gerado.',
    services: 'Mantenha catálogo, duração, preço, imagem e disponibilidade dos serviços sempre atualizados.',
    finance: 'Acompanhe entradas, despesas, metas e evolução mensal do espaço.',
    professionals: 'Organize a equipe, os serviços realizados e os horários individuais de cada profissional.',
    evolution: 'Configure automações e mensagens do WhatsApp com atenção às credenciais e ao consentimento das clientes.',
    settings: 'Personalize a marca, gerencie assinatura, segurança e os domínios conectados ao espaço.',
    tenants: 'Gerencie os espaços cadastrados, assinaturas e acessos da plataforma em um só lugar.',
    integrations: 'Revise integrações externas, credenciais e estado operacional dos provedores.',
    backups: 'Exporte e restaure cópias de segurança com um fluxo administrativo controlado.',
    appointments: 'Veja seus próximos atendimentos e o status de cada solicitação.',
  }

  const steps: ProductTourStep[] = [
    {
      selector: '[data-tour="brand"]',
      eyebrow: 'Bem-vinda',
      title: `Seu centro de controle de ${audience}`,
      description: 'A interface foi organizada para deixar as ações mais importantes acessíveis e reduzir o tempo gasto com tarefas repetitivas.',
    },
    {
      selector: '[data-tour="sidebar"]',
      title: 'Navegação por contexto',
      description: 'Use o menu lateral para alternar entre as áreas. No celular, ele fica disponível pelo botão de menu no topo.',
    },
    {
      selector: '[data-tour="content"]',
      title: `Tela de ${screenLabels[screen] ?? screen}`,
      description: screenDescriptions[screen] ?? 'Aqui ficam as informações e ações principais desta tela.',
    },
    {
      selector: '[data-tour="search"]',
      title: 'Encontre mais rápido',
      description: 'Pesquise espaços pelo nome ou identificador sem percorrer toda a lista.',
    },
    {
      selector: '[data-tour="notifications"]',
      title: 'Atualizações importantes',
      description: 'Consulte alertas operacionais e financeiros sem interromper o fluxo de trabalho.',
    },
  ]
  const filtered = area === 'dev' && screen === 'tenants' ? steps : steps.filter((step) => step.selector !== '[data-tour="search"]')
  if (area === 'admin' && screen === 'settings') {
    filtered.splice(3, 0, {
      selector: '[data-tour="custom-domains"]',
      title: 'Seu endereço profissional',
      description: 'Conecte um domínio próprio com verificação DNS e HTTPS automático. O painel mostra cada registro e o estado da propagação.',
    })
  }
  return filtered
}

// --- Admin Components ---

function AdminDashboard({ me, stats, selectedProfessional, onRefresh, onOpenAgenda }: { me: SessionUser | null; stats: AdminStats | null; selectedProfessional: Professional | null; onRefresh?: () => void; onOpenAgenda: () => void }) {
  const [updating, setUpdating] = useState(false)

  async function handleStatusChange(id: string, status: string) {
    if (updating) return
    setUpdating(true)
    await api(`/api/admin/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })
    setUpdating(false)
    if (onRefresh) onRefresh()
  }

  async function handlePresenceAction(id: string, action: 'manual' | 'resend') {
    if (updating) return
    setUpdating(true)
    const res = await api(`/api/admin/appointments/${id}/confirmation/${action}`, { method: 'POST' })
    setUpdating(false)
    if (!res.ok) notify(res.error.message, 'error')
    else notify(action === 'manual' ? 'Presença confirmada manualmente.' : 'Confirmação enviada pelo WhatsApp.', 'success')
    if (onRefresh) onRefresh()
  }

  const dashboardTimeZone = stats?.timeZone ?? 'America/Sao_Paulo'
  const greeting = useMemo(() => {
    const hour = Math.floor((minutesInTimeZone(new Date(), dashboardTimeZone) ?? 0) / 60)
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }, [dashboardTimeZone])

  const bookingBaseUrl = stats?.publicBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  const bookingLink = bookingBaseUrl ? `${bookingBaseUrl.replace(/\/$/, '')}/agendar` : ''
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    const didCopy = await copyTextToClipboard(bookingLink)
    if (!didCopy) {
      notify('Não foi possível copiar o link neste navegador.', 'error')
      return
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const palette = [
    { bg: undefined as string | undefined, fg: undefined as string | undefined },
    { bg: 'var(--status-info-bg)', fg: 'var(--status-info-ink)' },
    { bg: 'var(--status-warning-bg)', fg: 'var(--status-warning-ink)' },
    { bg: 'var(--brand-soft)', fg: 'var(--brand-action-hover)' },
    { bg: 'var(--status-success-bg)', fg: 'var(--status-success-ink)' },
  ]

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    const a = parts[0]?.[0] ?? 'U'
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : (parts[0]?.[1] ?? '')
    return (a + b).toUpperCase()
  }

  const colorFor = (name: string) => {
    let h = 0
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
    return palette[h % palette.length]
  }

  const fmtTime = (iso: string) => formatTimeInZone(iso, dashboardTimeZone)

  const relative = (iso: string) => {
    const now = Date.now()
    const t = new Date(iso).getTime()
    if (!Number.isFinite(t)) return '—'
    const diffMs = Math.max(0, now - t)
    const mins = Math.floor(diffMs / 60_000)
    if (mins <= 0) return 'Agora'
    if (mins < 60) return `Há ${mins} min`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `Há ${hrs} h`
    const days = Math.floor(hrs / 24)
    return `Há ${days} d`
  }

  const upcoming = (stats?.upcoming ?? []).slice(0, 12).map((a) => {
    const displayName = (a.clientName ?? a.clientEmail).trim() || 'Cliente'
    const col = colorFor(displayName)
    const st = appointmentPresenceMeta(a.status, a.confirmationStatus)
    return {
      id: a.id,
      name: displayName,
      avatar: initials(displayName),
      avatarBg: col.bg,
      avatarColor: col.fg,
      service: a.serviceName,
      time: fmtTime(a.startsAt),
      status: st.label,
      statusClass: st.className,
      rawStatus: a.status,
      confirmationStatus: a.confirmationStatus,
      clientPhone: a.clientPhone,
      professionalName: a.professionalName,
      professionalColor: a.professionalColor,
      professionalPhotoUrl: a.professionalPhotoUrl,
    }
  })

  const activity = (stats?.recentActivity ?? []).slice(0, 10).map((a) => {
    const kind = (a.kind || '').trim().toUpperCase()
    if (kind === 'APPOINTMENT_CREATED') {
      const who = (a.clientName ?? a.clientEmail ?? 'Cliente').trim() || 'Cliente'
      const svc = a.serviceName ?? 'serviço'
      return {
        key: `${a.at}_${kind}_${who}`,
        dot: 'var(--primary)',
        title: 'Novo agendamento',
        desc: `${who} agendou ${svc}`,
        when: relative(a.at),
      }
    }
    if (kind === 'EXPENSE_CREATED') {
      const note = a.note?.trim() ? a.note.trim() : 'Despesa'
      const amount = typeof a.amountCents === 'number' ? formatBRL(a.amountCents / 100) : ''
      const desc = amount ? `${note} (${amount})` : note
      return {
        key: `${a.at}_${kind}_${note}`,
        dot: 'var(--danger)',
        title: 'Despesa lançada',
        desc,
        when: relative(a.at),
      }
    }
    return {
      key: `${a.at}_${kind}`,
      dot: 'var(--gray-400)',
      title: kind || 'Atividade',
      desc: '—',
      when: relative(a.at),
    }
  })

  const ownerName = selectedProfessional?.nickname || selectedProfessional?.name || me?.name || (me?.email?.split('@')[0] || 'profissional').replace(/[._-]+/g, ' ')
  const nextAppointment = upcoming[0] ?? null
  const attentionCount = (stats?.confirmationSummary?.noResponse ?? 0) + (stats?.confirmationSummary?.deliveryFailed ?? 0) + (stats?.confirmationSummary?.declined ?? 0)
  const todayLabel = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: dashboardTimeZone }).format(new Date())

  return (
    <div className="nr-dashboard-page">
      <section className="nr-mobile-dashboard-stage" aria-label="Resumo do dia">
        <header className="nr-mobile-dashboard-intro">
          <div>
            <span>{todayLabel}</span>
            <h1>{greeting}, <em>{ownerName}</em>.</h1>
            <p>{stats?.today?.appointmentsCount ? `Você tem ${stats.today.appointmentsCount} atendimento${stats.today.appointmentsCount === 1 ? '' : 's'} hoje.` : 'Sua agenda está livre por enquanto.'}</p>
          </div>
          <button type="button" onClick={onOpenAgenda} aria-label="Abrir agenda"><Calendar size={20} /></button>
        </header>

        <button type="button" className={`nr-mobile-next-card ${nextAppointment ? 'has-appointment' : 'is-empty'}`} onClick={onOpenAgenda}>
          <span className="nr-mobile-next-card-media" aria-hidden="true"><img src="/naregua/hero.webp" alt="" /></span>
          <span className="nr-mobile-next-card-content">
            <small>{nextAppointment ? 'Próximo cliente' : 'Sua próxima janela'}</small>
            <strong className="nr-mobile-next-time">{nextAppointment?.time || 'Livre'}</strong>
            <span className="nr-mobile-next-person">{nextAppointment?.name || 'Nenhum atendimento próximo'}</span>
            <span className="nr-mobile-next-service">{nextAppointment?.service || 'Um bom momento para organizar o dia'}</span>
          </span>
          <span className="nr-mobile-next-card-action"><ArrowRight size={17} /></span>
        </button>

        <section className="nr-mobile-business-pulse" aria-label="Pulso do negócio">
          <div className="nr-mobile-business-pulse-main">
            <span>Previsão de hoje</span>
            <strong>{formatBRL((stats?.today?.expectedRevenueCents ?? 0) / 100)}</strong>
          </div>
          <div className="nr-mobile-business-pulse-meta">
            <span><b>{stats?.newClients30d ?? 0}</b><small>novos clientes<br />em 30 dias</small></span>
            <span><b>{stats?.confirmationSummary?.confirmed ?? 0}</b><small>presenças<br />confirmadas</small></span>
            <span className={attentionCount ? 'has-attention' : ''}><b>{attentionCount}</b><small>pedem sua<br />atenção</small></span>
          </div>
        </section>
      </section>

      <section className="nr-dashboard-command" aria-label="Comando do dia">
        <div className="nr-dashboard-command-main">
          <div className="nr-dashboard-command-date"><span>Hoje</span><strong>{todayLabel}</strong></div>
          <div className="nr-dashboard-command-copy">
            <span className="eyebrow">{selectedProfessional ? 'Agenda individual' : 'Operação da equipe'}</span>
            <h2>{greeting}, {ownerName}.</h2>
            <p>{stats?.today?.appointmentsCount ? <><strong>{stats.today.appointmentsCount} atendimento{stats.today.appointmentsCount === 1 ? '' : 's'}</strong> no radar de hoje.</> : <>Nenhum atendimento marcado para hoje.</>} {attentionCount ? `${attentionCount} confirmação${attentionCount === 1 ? '' : 'ões'} pede atenção.` : 'As confirmações estão sob controle.'}</p>
          </div>
          <button type="button" className="btn btnPrimary" onClick={onOpenAgenda}><Calendar size={17} /> Abrir agenda</button>
        </div>
        <aside className={`nr-dashboard-next${nextAppointment ? '' : ' is-empty'}`}>
          <span className="nr-dashboard-next-kicker">{nextAppointment ? 'Próximo atendimento' : 'Próxima janela'}</span>
          <strong>{nextAppointment?.time || 'Agenda livre'}</strong>
          <div><b>{nextAppointment?.name || 'Sem cliente aguardando'}</b><span>{nextAppointment?.service || 'Use este tempo para organizar o salão.'}</span></div>
          {nextAppointment && !selectedProfessional ? <small><i style={{ background: nextAppointment.professionalColor }} />{nextAppointment.professionalName}</small> : null}
          <button type="button" onClick={onOpenAgenda}>Ver agenda <ArrowRight size={15} /></button>
        </aside>
      </section>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><Calendar size={24} /></div>
          <div className="stat-info">
            <h4>Agendamentos Hoje</h4>
            <div className="value">{stats?.today?.appointmentsCount ?? 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Wallet size={24} /></div>
          <div className="stat-info">
            <h4>Faturamento Estimado</h4>
            <div className="value">R$ {(((stats?.today?.expectedRevenueCents ?? 0) / 100).toFixed(2) ?? '0,00')}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Users size={24} /></div>
          <div className="stat-info">
            <h4>Novos Clientes</h4>
            <div className="value">{stats?.newClients30d ?? 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Clock size={24} /></div>
          <div className="stat-info">
            <h4>Precisam de atenção</h4>
            <div className="value">{(stats?.confirmationSummary?.noResponse ?? 0) + (stats?.confirmationSummary?.deliveryFailed ?? 0) + (stats?.confirmationSummary?.declined ?? 0)}</div>
          </div>
        </div>
      </div>

      <section className="appointment-confirmation-overview">
        <div className="appointment-confirmation-overview__copy">
          <span className="eyebrow">Confirmações de hoje</span>
          <strong>O fluxo normal acontece sozinho. Você entra apenas quando alguém não responde ou informa que não poderá ir.</strong>
        </div>
        <div className="appointment-confirmation-overview__metrics">
          <span><i className="is-confirmed" /><strong>{stats?.confirmationSummary?.confirmed ?? 0}</strong> confirmados</span>
          <span><i className="is-awaiting" /><strong>{stats?.confirmationSummary?.awaiting ?? 0}</strong> aguardando</span>
          <span><i className="is-attention" /><strong>{(stats?.confirmationSummary?.noResponse ?? 0) + (stats?.confirmationSummary?.deliveryFailed ?? 0) + (stats?.confirmationSummary?.declined ?? 0)}</strong> atenção</span>
        </div>
      </section>

      {(stats?.confirmationAttention?.length ?? 0) > 0 ? (
        <section className="appointment-attention-panel">
          <div className="appointment-attention-panel__head">
            <div><span className="eyebrow">Exceções</span><h3>Confirmações não resolvidas</h3></div>
            <button type="button" className="btn btn-ghost" onClick={onOpenAgenda}>Abrir agenda</button>
          </div>
          <div className="appointment-attention-list">
            {(stats?.confirmationAttention ?? []).map((item) => {
              const presence = appointmentPresenceMeta(item.status, item.confirmationStatus)
              return <div className="appointment-attention-row" key={item.id}>
                <div className="appointment-attention-row__main"><strong>{item.clientName || 'Cliente'}</strong><span>{item.serviceName}{!selectedProfessional ? ` · ${item.professionalName}` : ''} · {formatDateInZone(item.startsAt, dashboardTimeZone)} às {fmtTime(item.startsAt)}</span></div>
                <span className={`status-badge ${presence.className}`}>{presence.label}</span>
                <div className="appointment-attention-row__actions">
                  {(item.confirmationStatus === 'NO_RESPONSE' || item.confirmationStatus === 'DELIVERY_FAILED') && item.clientPhone ? <button type="button" className="btn btn-ghost" disabled={updating} onClick={() => void handlePresenceAction(item.id, 'resend')}>Reenviar</button> : null}
                  <button type="button" className="btn btnPrimary" disabled={updating} onClick={() => void handlePresenceAction(item.id, 'manual')}>Confirmar manualmente</button>
                </div>
              </div>
            })}
          </div>
        </section>
      ) : null}

      <div className="grid grid-2-1">
        <div className="column nr-dashboard-main-column">
        <div className="card nr-dashboard-upcoming">
          <div className="cardHeader">
            <h3 className="cardTitle">Próximos Agendamentos</h3>
            <button type="button" className="btn btn-ghost nr-dashboard-see-all" onClick={onOpenAgenda}>Ver todos</button>
          </div>

          {/* Desktop Table View */}
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Serviço</th>
                  {!selectedProfessional ? <th>Profissional</th> : null}
                  <th>Horário</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map(appt => (
                    <tr key={appt.id}>
                    <td>
                        <div className="nr-dashboard-client">
                        <div className="user-avatar-mini nr-dashboard-avatar" style={{background: appt.avatarBg, color: appt.avatarColor}}>{appt.avatar}</div>
                        <span>{appt.name}</span>
                        </div>
                    </td>
                    <td>{appt.service}</td>
                    {!selectedProfessional ? <td><span className="nr-professional-inline"><i style={{ background: appt.professionalColor }} />{appt.professionalName}</span></td> : null}
                    <td>{appt.time}</td>
                    <td><span className={`status-badge ${appt.statusClass}`}>{appt.status}</span></td>
                    <td>
                        <PortalMenu
                            trigger={(isOpen) => (
                                <button type="button" className={`icon-btn nr-dashboard-row-menu${isOpen ? ' is-open' : ''}`} aria-label="Abrir ações do agendamento" aria-haspopup="menu" aria-expanded={isOpen}>
                                    <MoreHorizontal size={16}/>
                                </button>
                            )}
                        >
                            {(close) => (
                                <>
                                    {appt.rawStatus !== 'CANCELLED' && appt.confirmationStatus !== 'CONFIRMED' && appt.confirmationStatus !== 'MANUALLY_CONFIRMED' ? (
                                        <button type="button" className="btn-menu-item" onClick={() => { void handlePresenceAction(appt.id, 'manual'); close() }}>Confirmar presença</button>
                                    ) : null}
                                    {appt.rawStatus !== 'CANCELLED' && appt.clientPhone ? (
                                        <button type="button" className="btn-menu-item" onClick={() => { void handlePresenceAction(appt.id, 'resend'); close() }}>{appt.confirmationStatus === 'NOT_REQUESTED' ? 'Enviar confirmação' : 'Reenviar confirmação'}</button>
                                    ) : null}
                                    {appt.rawStatus !== 'CANCELLED' && (
                                        <button type="button"
                                            className="btn-menu-item danger"
                                            onClick={() => { handleStatusChange(appt.id, 'CANCELLED'); close() }}
                                        >
                                            Cancelar
                                        </button>
                                    )}
                                </>
                            )}
                        </PortalMenu>
                    </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-appointment-list nr-dashboard-mobile-list">
            {upcoming.map(appt => (
                <div className="mobile-appointment-card" key={appt.id}>
                    <div className="mobile-appointment-header">
                        <div className="nr-dashboard-client nr-dashboard-client-mobile">
                            <div className="user-avatar-mini nr-dashboard-avatar" style={{background: appt.avatarBg, color: appt.avatarColor}}>{appt.avatar}</div>
                            <div className="nr-dashboard-client-copy">
                                <strong>{appt.name}</strong>
                                <span>{appt.service}{!selectedProfessional ? ` · ${appt.professionalName}` : ''}</span>
                            </div>
                        </div>
                        <PortalMenu
                            trigger={(isOpen) => (
                                <button type="button" className={`icon-btn nr-dashboard-row-menu${isOpen ? ' is-open' : ''}`} aria-label="Abrir ações do agendamento" aria-haspopup="menu" aria-expanded={isOpen}>
                                    <MoreHorizontal size={16}/>
                                </button>
                            )}
                        >
                            {(close) => (
                                <>
                                    {appt.rawStatus !== 'CANCELLED' && appt.confirmationStatus !== 'CONFIRMED' && appt.confirmationStatus !== 'MANUALLY_CONFIRMED' ? (
                                        <button type="button" className="btn-menu-item" onClick={() => { void handlePresenceAction(appt.id, 'manual'); close() }}>Confirmar presença</button>
                                    ) : null}
                                    {appt.rawStatus !== 'CANCELLED' && appt.clientPhone ? (
                                        <button type="button" className="btn-menu-item" onClick={() => { void handlePresenceAction(appt.id, 'resend'); close() }}>{appt.confirmationStatus === 'NOT_REQUESTED' ? 'Enviar confirmação' : 'Reenviar confirmação'}</button>
                                    ) : null}
                                    {appt.rawStatus !== 'CANCELLED' && (
                                        <button type="button"
                                            className="btn-menu-item danger"
                                            onClick={() => { handleStatusChange(appt.id, 'CANCELLED'); close() }}
                                        >
                                            Cancelar
                                        </button>
                                    )}
                                </>
                            )}
                        </PortalMenu>
                    </div>
                    <div className="mobile-appointment-row">
                        <div className="nr-dashboard-appointment-time">
                            <Clock size={14} />
                            {appt.time}
                        </div>
                        <span className={`status-badge ${appt.statusClass}`}>{appt.status}</span>
                    </div>
                </div>
            ))}
          </div>
        </div>

        <div className="card nr-dashboard-booking-link">
            <div className="cardHeader">
                <h3 className="cardTitle">Link de agendamento</h3>
            </div>
            <div className="cardBody">
                <p className="nr-dashboard-booking-copy">
                    Envie este link para seus clientes agendarem:
                </p>
                <div className="nr-dashboard-booking-url">
                    <span>{bookingLink}</span>
                    <button type="button" onClick={() => void copyLink()} aria-label={copied ? 'Link copiado' : 'Copiar link de agendamento'}>
                        <Copy size={16} />
                    </button>
                </div>
                <div className="nr-dashboard-booking-actions">
                    <button type="button" className="btn w-full" onClick={() => void copyLink()}>
                        {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                    <button type="button" className="btn btnPrimary w-full" onClick={() => window.open(bookingLink, '_blank', 'noopener,noreferrer')}>
                        Abrir link
                    </button>
                </div>
            </div>
        </div>
        </div>

        <div className="column nr-dashboard-side-column">
            <div className="card nr-dashboard-activity">
            <div className="cardHeader">
                <h3 className="cardTitle">Atividade recente</h3>
            </div>
            <div className="cardBody">
                {activity.map((a) => (
                    <div className="nr-dashboard-activity-row" key={a.key} style={{ '--activity-dot': a.dot } as CSSProperties}>
                        <i aria-hidden="true" />
                        <div className="nr-dashboard-activity-copy">
                            <strong>{a.title}</strong>
                            <span>{a.desc}</span>
                            <time>{a.when}</time>
                        </div>
                    </div>
                ))}
                {activity.length === 0 ? (
                    <div className="nr-dashboard-activity-empty">Sem atividade recente.</div>
                ) : null}
            </div>
            </div>
        </div>
      </div>
    </div>
  )
}

function AdminServices() {
    const [services, setServices] = useState<AdminService[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [newService, setNewService] = useState({ name: '', duration: 60, price: 0, coverUrl: '' })
    const [saving, setSaving] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    const coverFileInputRef = useRef<HTMLInputElement | null>(null)
    const [coverBusy, setCoverBusy] = useState(false)
    const [, setCoverFileName] = useState<string | null>(null)
    const [coverError, setCoverError] = useState<string | null>(null)
    const [coverDragOver, setCoverDragOver] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    useEffect(() => {
        load()
    }, [])

    async function load() {
        setLoading(true)
        const res = await api<{services: AdminService[]}>('/api/admin/services')
        if(res.ok) setServices(res.data.services)
        else notify(res.error.message, 'error')
        setLoading(false)
    }

    function openCreateModal() {
        setCoverBusy(false)
        setCoverFileName(null)
        setCoverError(null)
        setSaveError(null)
        setEditingId(null)
        setNewService({ name: '', duration: 60, price: 0, coverUrl: '' })
        if (coverFileInputRef.current) coverFileInputRef.current.value = ''
        setModalOpen(true)
    }

    function openEditModal(s: AdminService) {
        setCoverBusy(false)
        setCoverFileName(null)
        setCoverError(null)
        setSaveError(null)
        setEditingId(s.id)
        setNewService({
            name: s.name,
            duration: s.durationMinutes,
            price: s.priceCents / 100,
            coverUrl: s.coverUrl || ''
        })
        if (coverFileInputRef.current) coverFileInputRef.current.value = ''
        setModalOpen(true)
    }

    async function handleDelete() {
        if (!editingId || !(await confirmAction({ title: 'Excluir serviço', message: 'Este serviço deixará de aparecer em novos agendamentos. Os horários já marcados serão preservados.', confirmLabel: 'Excluir serviço', danger: true }))) return
        setSaving(true)
        setSaveError(null)
        const result = await api(`/api/admin/services/${editingId}`, { method: 'DELETE' })
        setSaving(false)
        if (!result.ok) {
            setSaveError(result.error.message)
            return
        }
        setModalOpen(false)
        void load()
    }

    async function fileToOptimizedDataUrl(file: File) {
        return optimizeImageFile(file, { maxBytes: 255_000, maxDimension: 768, quality: .84 })
    }

    async function handleCoverFile(file: File) {
        setCoverBusy(true)
        setCoverError(null)
        try {
            if (!file.type.startsWith('image/')) {
                setCoverError('Arquivo inválido (envie uma imagem)')
                return
            }
            const dataUrl = await fileToOptimizedDataUrl(file)
            if (!dataUrl.startsWith('data:image/')) {
                setCoverError('Falha ao processar a imagem')
                return
            }
            if (dataUrl.length > 350_000) {
                setCoverError('Imagem muito grande. Use uma menor.')
                return
            }
            setCoverFileName(file.name)
            setNewService((s) => ({ ...s, coverUrl: dataUrl }))
        } catch {
            setCoverError('Falha ao processar a imagem')
        } finally {
            setCoverBusy(false)
        }
    }

    async function handleSave() {
        if (!newService.name.trim() || newService.duration < 1 || newService.price < 0) {
            setSaveError('Revise o nome, a duração e o preço do serviço.')
            return
        }
        setSaving(true)
        setSaveError(null)
        const payload: { name: string; durationMinutes: number; priceCents: number; coverUrl?: string | null } = {
            name: newService.name.trim(),
            durationMinutes: Number(newService.duration),
            priceCents: Math.round(Number(newService.price) * 100)
        }
        if (newService.coverUrl) payload.coverUrl = newService.coverUrl
        else if (editingId && !newService.coverUrl) payload.coverUrl = null

        const result = editingId
            ? await api(`/api/admin/services/${editingId}`, {
                method: 'PATCH',
                body: JSON.stringify(payload)
            })
            : await api('/api/admin/services', {
                method: 'POST',
                body: JSON.stringify(payload)
            })

        setSaving(false)
        if (!result.ok) {
            setSaveError(result.error.message)
            return
        }
        setModalOpen(false)
        void load()
    }

    return (
        <>
            <div className="card service-admin-page">
                <div className="cardHeader service-admin-header">
                    <div>
                        <h2 className="cardTitle">Serviços</h2>
                        <p className="cardDesc">Gerencie os serviços oferecidos no seu espaço.</p>
                    </div>
                    <button type="button" className="btn btnPrimary service-create-button" onClick={openCreateModal}>
                        <Plus size={16} /> Novo serviço
                    </button>
                </div>

                {loading ? (
                    <div className="service-loading">
                        <div className="skeleton skeleton-card" />
                    </div>
                ) : (
                    <div className="table-scroll service-desktop-table">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Capa</th>
                                    <th>Nome</th>
                                    <th>Duração</th>
                                    <th>Preço</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {services.map(s => (
                                    <tr key={s.id}>
                                        <td>
                                            <img decoding="async"
                                                className="service-cover-thumb"
                                                src={s.coverUrl || bundledServiceCover(s.name)}
                                                alt=""
                                                loading="lazy"
                                                onError={(event) => { event.currentTarget.src = '/naregua/services/traditional.webp' }}
                                            />
                                        </td>
                                        <td className="service-name-cell">{s.name}</td>
                                        <td><span className="pill service-duration-pill">{s.durationMinutes} min</span></td>
                                        <td className="service-price-cell">R$ {(s.priceCents/100).toFixed(2)}</td>
                                        <td>
                                            <button type="button" className="icon-btn service-edit-button" onClick={() => openEditModal(s)} aria-label={`Editar serviço ${s.name}`}><Edit2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                                {services.length === 0 && (
                                    <tr><td colSpan={5}><EmptyState compact icon={<Scissors size={24}/>} title="Nenhum serviço cadastrado" description="Crie o primeiro serviço e escolha uma das capas incluídas no kit visual." /></td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                {!loading ? <div className="service-mobile-list" aria-label="Serviços cadastrados">
                    {services.map((service) => <article className="service-mobile-card" key={`mobile-${service.id}`}>
                        <img decoding="async" src={service.coverUrl || bundledServiceCover(service.name)} alt="" loading="lazy" onError={(event) => { event.currentTarget.src = '/naregua/services/traditional.webp' }} />
                        <div className="service-mobile-copy"><strong>{service.name}</strong><div className="service-mobile-meta"><span>{service.durationMinutes} min</span><b>R$ {(service.priceCents / 100).toFixed(2)}</b></div></div>
                        <button type="button" className="icon-btn service-mobile-edit" onClick={() => openEditModal(service)} aria-label={`Editar serviço ${service.name}`}><Edit2 size={17}/></button>
                    </article>)}
                    {services.length === 0 ? <EmptyState compact icon={<Scissors size={24}/>} title="Nenhum serviço cadastrado" description="Crie o primeiro serviço para começar a receber horários." /> : null}
                </div> : null}
            </div>

            {modalOpen && (
                <ModalRoot onClick={() => setModalOpen(false)}>
                    <div className="nr-dialog service-editor-dialog" role="dialog" aria-modal="true" aria-labelledby="service-dialog-title" onClick={e => e.stopPropagation()}>
                        <div className="cardHeader">
                            <h3 id="service-dialog-title" className="cardTitle">{editingId ? 'Editar serviço' : 'Novo serviço'}</h3>
                            <button type="button" className="icon-btn" onClick={() => setModalOpen(false)} aria-label="Fechar edição de serviço">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="cardBody">
                            <div className="form-stack">
                                <div className="input-group">
                                    <div className="label">Capa do serviço (opcional)</div>
                                    <div
                                        className={`cover-uploader ${coverDragOver ? 'dragover' : ''}`}
                                        onDragOver={(e) => { e.preventDefault(); setCoverDragOver(true) }}
                                        onDragLeave={() => setCoverDragOver(false)}
                                        onDrop={(e) => {
                                            e.preventDefault()
                                            setCoverDragOver(false)
                                            const f = e.dataTransfer.files?.[0]
                                            if (f) handleCoverFile(f)
                                        }}
                                        data-dragging={coverDragOver ? 'true' : 'false'}
                                        data-busy={coverBusy ? 'true' : 'false'}
                                        onClick={() => !coverBusy && coverFileInputRef.current?.click()}
                                        onKeyDown={(event) => {
                                            if (!coverBusy && (event.key === 'Enter' || event.key === ' ')) {
                                                event.preventDefault()
                                                coverFileInputRef.current?.click()
                                            }
                                        }}
                                        role="button"
                                        tabIndex={coverBusy ? -1 : 0}
                                        aria-disabled={coverBusy}
                                        aria-label="Selecionar capa do serviço"
                                    >
                                        {coverBusy && (
                                            <div className="cover-uploader-busy">
                                                <div className="spinner" />
                                            </div>
                                        )}

                                        {newService.coverUrl ? (
                                            <>
                                                <img decoding="async"
                                                    src={newService.coverUrl}
                                                    alt="Capa do serviço"
                                                    className="cover-uploader-image"
                                                    onError={() => setCoverError('Imagem inválida')}
                                                />
                                                <div className="cover-actions-overlay">
                                                    <button
                                                        type="button"
                                                        className="btn cover-action"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            coverFileInputRef.current?.click()
                                                        }}
                                                    >
                                                        Trocar imagem
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn cover-action cover-action-danger"
                                                        aria-label="Remover capa do serviço"
                                                        title="Remover capa"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setCoverError(null)
                                                            setCoverFileName(null)
                                                            setNewService((s) => ({ ...s, coverUrl: '' }))
                                                            if (coverFileInputRef.current) coverFileInputRef.current.value = ''
                                                        }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="cover-uploader-empty">
                                                <div className="cover-uploader-mark">
                                                    <ImageIcon size={24} />
                                                </div>
                                                <strong>Adicionar capa</strong>
                                                <span>Arraste ou clique para enviar</span>
                                            </div>
                                        )}

                                        <input
                                            ref={coverFileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="visually-hidden"
                                            onChange={(e) => {
                                                const f = e.target.files?.[0]
                                                if (!f) return
                                                handleCoverFile(f)
                                            }}
                                        />
                                    </div>
                                    {coverError && <div className="form-error">{coverError}</div>}
                                </div>

                                <div className="input-group">
                                    <label className="label" htmlFor="service-name">Nome do serviço</label>
                                    <div className="input-wrapper">
                                        <input
                                            id="service-name"
                                            className="input"
                                            value={newService.name}
                                            onChange={e => setNewService({...newService, name: e.target.value})}
                                            placeholder="Ex: Corte degradê + barba"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="row">
                                    <div className="input-group">
                                        <label className="label" htmlFor="service-duration">Duração (min)</label>
                                        <div className="input-wrapper">
                                            <input
                                                id="service-duration"
                                                className="input"
                                                type="number"
                                                value={newService.duration}
                                                onChange={e => setNewService({...newService, duration: Number(e.target.value)})}
                                                min={1}
                                            />
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label className="label" htmlFor="service-price">Preço (R$)</label>
                                        <div className="input-wrapper">
                                            <input
                                                id="service-price"
                                                className="input"
                                                type="text"
                                                inputMode="decimal"
                                                autoComplete="off"
                                                placeholder="R$0,00"
                                                value={formatBRL(newService.price)}
                                                onChange={e => {
                                                    const digits = e.target.value.replace(/\D/g, '')
                                                    const units = digits ? parseInt(digits, 10) / 100 : 0
                                                    setNewService({ ...newService, price: units })
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {saveError ? <div className="nr-form-error" role="alert">{saveError}</div> : null}

                                <div className="row service-editor-actions">
                                    {editingId && (
                                        <button type="button" className="btn btn-danger-quiet service-editor-delete" aria-label="Excluir serviço" title="Excluir serviço" onClick={handleDelete} disabled={saving}>
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                    <button type="button" className="btn" data-modal-close onClick={() => setModalOpen(false)}>Cancelar</button>
                                    <button type="button" className="btn btnPrimary" onClick={handleSave} disabled={saving || !newService.name.trim() || newService.duration < 1 || newService.price < 0}>
                                        {saving ? 'Salvando...' : (editingId ? 'Salvar alterações' : 'Criar')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalRoot>
            )}
        </>
    )
}

function ProductSelectField({
    value,
    onChange,
    options,
    placeholder
}: {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string; subLabel?: string }[];
    placeholder?: string;
}) {
    return (
        <ProductSelect
            value={value}
            onChange={onChange}
            options={options.map((option) => ({
                value: option.value,
                label: option.label,
                description: option.subLabel,
            }))}
            placeholder={placeholder}
        />
    )
}

function NewAppointmentModal({
    isOpen,
    onClose,
    onSuccess,
    initialDate,
    timeZone,
    professionals,
    initialProfessionalId,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (event: CalendarEvent) => void;
    initialDate: Date;
    timeZone: string;
    professionals: Professional[];
    initialProfessionalId: ProfessionalScope;
}) {
    const [clientName, setClientName] = useState('')
    const [clientPhone, setClientPhone] = useState('')
    const [serviceId, setServiceId] = useState('')
    const [date, setDate] = useState('')
    const [time, setTime] = useState('09:00')
    const [loading, setLoading] = useState(false)
    const [services, setServices] = useState<AdminService[]>([])
    const [error, setError] = useState<string | null>(null)
    const [professionalId, setProfessionalId] = useState(initialProfessionalId === 'all' ? 'auto' : initialProfessionalId)

    useEffect(() => {
        if(isOpen) {
            setDate(localDateToYmd(initialDate))
            setClientName('')
            setClientPhone('')
            setTime('09:00')
            setError(null)
            setProfessionalId(initialProfessionalId === 'all' ? 'auto' : initialProfessionalId)
            void loadServices()
        }
    }, [isOpen, initialDate, timeZone, initialProfessionalId])

    async function loadServices() {
        const res = await api<{services: AdminService[]}>('/api/admin/services')
        if(res.ok) {
            setServices(res.data.services)
            setServiceId((current) => res.data.services.some((service) => service.id === current) ? current : (res.data.services[0]?.id ?? ''))
        } else {
            setError(res.error.message)
        }
    }

    const eligibleProfessionals = professionals.filter((professional) => professional.active && (!serviceId || professional.serviceIds.includes(serviceId)))

    useEffect(() => {
        if (professionalId !== 'auto' && !eligibleProfessionals.some((professional) => professional.id === professionalId)) setProfessionalId('auto')
    }, [serviceId, professionals, professionalId])

    const handleSubmit = async () => {
        if(!clientName || !serviceId || !date || !time) {
            setError('Preencha todos os campos')
            return
        }
        const normalizedClientPhone = clientPhone.trim() ? normalizeBrazilPhone(clientPhone) : null
        if (clientPhone.trim() && !normalizedClientPhone) {
            setError('Informe um WhatsApp válido, com DDD.')
            return
        }

        setLoading(true)
        setError(null)

        // Find selected service to get duration/name
        const service = services.find(s => s.id === serviceId)
        if(!service) {
            setError('Serviço inválido')
            setLoading(false)
            return
        }

        const startDateTime = zonedDateTimeToUtc(date, time, timeZone)
        if (!startDateTime) {
            setError('Data ou horário inválido para o fuso do espaço')
            setLoading(false)
            return
        }

        const res = await api<{ appointment: AdminAppointment }>('/api/admin/appointments', {
            method: 'POST',
            body: JSON.stringify({
                clientName: clientName.trim(),
                clientPhone: normalizedClientPhone ?? undefined,
                serviceId,
                professionalId: professionalId === 'auto' ? undefined : professionalId,
                startsAt: startDateTime.toISOString(),
                status: 'CONFIRMED',
            }),
        })

        if (!res.ok) {
            setError(res.error.message)
            setLoading(false)
            return
        }

        const a = res.data.appointment
        const status = a.status === 'CONFIRMED' ? 'confirmed' : a.status === 'PENDING' ? 'pending' : 'cancelled'
        const presence = appointmentPresenceMeta(a.status, a.confirmationStatus)

        onSuccess({
            id: a.id,
            clientName: a.clientName ?? clientName,
            title: a.serviceName,
            start: a.startsAt,
            end: a.endsAt,
            status,
            confirmationStatus: a.confirmationStatus,
            confirmationSentAt: a.confirmationSentAt,
            confirmationRespondedAt: a.confirmationRespondedAt,
            appointmentReminderSentAt: a.appointmentReminderSentAt,
            clientPhone: a.clientPhone,
            color: a.professionalColor ? `color-mix(in srgb, ${a.professionalColor} 14%, var(--surface-raised))` : presence.color,
            textColor: a.professionalColor || presence.textColor,
            professionalId: a.professionalId,
            professionalName: a.professionalName,
            professionalColor: a.professionalColor,
            professionalPhotoUrl: a.professionalPhotoUrl,
        })

        onClose()
        setLoading(false)

        // Reset form
        setClientName('')
        setClientPhone('')
        setTime('09:00')
    }

    if (!isOpen) return null

    return (
        <ModalRoot onClick={loading ? undefined : onClose}>
            <div className="nr-dialog appointment-create-dialog" role="dialog" aria-modal="true" aria-labelledby="appointment-create-title" onClick={e => e.stopPropagation()}>
                <div className="cardHeader">
                    <h3 id="appointment-create-title" className="cardTitle">Novo agendamento</h3>
                    <button type="button" className="icon-btn modal-close" data-modal-close onClick={onClose} disabled={loading} aria-label="Fechar janela">
                        <X size={18} />
                    </button>
                </div>
                <div className="cardBody">
                    <div className="form-stack">
                        <div className="input-group">
                            <label className="label" htmlFor="appointment-client-name">Cliente</label>
                            <div className="input-wrapper">
                                <input
                                    id="appointment-client-name"
                                    className="input"
                                    value={clientName}
                                    onChange={e => setClientName(e.target.value)}
                                    placeholder="Nome do cliente"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="label" htmlFor="appointment-client-phone">WhatsApp do cliente <span className="text-muted">(opcional)</span></label>
                            <div className="input-wrapper">
                                <input
                                    id="appointment-client-phone"
                                    className="input"
                                    value={clientPhone}
                                    onChange={(e) => setClientPhone(formatBrazilPhoneInput(e.target.value))}
                                    placeholder="(11) 99999-9999"
                                    inputMode="tel"
                                    autoComplete="tel"
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="label">Serviço</label>
                            <ProductSelectField
                                value={serviceId}
                                onChange={setServiceId}
                                options={services.map(s => ({
                                    value: s.id,
                                    label: s.name,
                                    subLabel: `${s.durationMinutes} min · R$ ${(s.priceCents/100).toFixed(2)}`
                                }))}
                                placeholder="Selecione um serviço"
                            />
                        </div>

                        <div className="input-group">
                            <span className="label">Profissional</span>
                            <ProductSelect
                                value={professionalId}
                                onChange={setProfessionalId}
                                ariaLabel="Profissional do agendamento"
                                options={[
                                    { value: 'auto', label: 'Próximo disponível', description: 'O NaRégua escolhe uma agenda compatível' },
                                    ...eligibleProfessionals.map((professional) => ({
                                        value: professional.id,
                                        label: professional.nickname || professional.name,
                                        description: professional.inheritsHours ? 'Horário geral do espaço' : 'Horário individual',
                                        leading: <span className="nr-team-scope-dot" style={{ background: professional.color }} />,
                                    })),
                                ]}
                            />
                        </div>

                        <div className="row">
                            <div className="input-group">
                                <label className="label" htmlFor="appointment-date">Data</label>
                                <input
                                    id="appointment-date"
                                    type="date"
                                    className="input"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                />
                            </div>
                            <div className="input-group">
                                <label className="label" htmlFor="appointment-time">Horário</label>
                                <div className="input-wrapper">
                                    <input
                                        id="appointment-time"
                                        type="time"
                                        className="input"
                                        value={time}
                                        onChange={e => setTime(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="nr-form-error" role="alert">
                                {error}
                            </div>
                        )}

                        <div className="row appointment-create-actions">
                            <button type="button" className="btn w-full" data-modal-close onClick={onClose} disabled={loading}>Cancelar</button>
                            <button type="button" className="btn btnPrimary w-full" onClick={handleSubmit} disabled={loading || !clientName.trim() || !serviceId || !date || !time}>
                                {loading ? 'Salvando...' : 'Agendar'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ModalRoot>
    )
}

function AppointmentDetailsModal({
    isOpen,
    onClose,
    event,
    onDelete,
    onChanged,
    timeZone,
}: {
    isOpen: boolean;
    onClose: () => void;
    event: CalendarEvent | null;
    onDelete: (id: string) => Promise<void>;
    onChanged: () => Promise<void>;
    timeZone: string;
}) {
    const [actionBusy, setActionBusy] = useState(false)
    if (!isOpen || !event) return null

    const presence = appointmentPresenceMeta(event.status.toUpperCase(), event.confirmationStatus)
    const presenceResolved = event.confirmationStatus === 'CONFIRMED' || event.confirmationStatus === 'MANUALLY_CONFIRMED'
    const rawCancelled = event.status === 'cancelled'

    async function runPresenceAction(action: 'manual' | 'resend') {
        if (!event || actionBusy) return
        setActionBusy(true)
        const res = await api(`/api/admin/appointments/${event.id}/confirmation/${action}`, { method: 'POST' })
        setActionBusy(false)
        if (!res.ok) {
            notify(res.error.message, 'error')
            return
        }
        notify(action === 'manual' ? 'Presença confirmada manualmente.' : 'Confirmação enviada pelo WhatsApp.', 'success')
        await onChanged()
        onClose()
    }

    async function cancelAppointment() {
        if (!event || actionBusy) return
        if (!(await confirmAction({ title: 'Cancelar agendamento', message: 'O horário será marcado como cancelado e as automações de confirmação serão interrompidas.', confirmLabel: 'Cancelar agendamento', danger: true }))) return
        setActionBusy(true)
        const res = await api(`/api/admin/appointments/${event.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) })
        setActionBusy(false)
        if (!res.ok) return notify(res.error.message, 'error')
        notify('Agendamento cancelado.', 'success')
        await onChanged()
        onClose()
    }

    return (
        <ModalRoot onClick={onClose}>
            <div className="nr-dialog appointment-details-dialog" role="dialog" aria-modal="true" aria-labelledby="appointment-details-title" onClick={e => e.stopPropagation()}>
                <div className="cardHeader appointment-details-head">
                    <div><span className="eyebrow">Agenda</span><h3 id="appointment-details-title" className="cardTitle">{event.clientName}</h3></div>
                    <button type="button" className="icon-btn modal-close" data-modal-close onClick={onClose} aria-label="Fechar janela"><X size={18} /></button>
                </div>
                <div className="cardBody appointment-details-body">
                    <section className="appointment-details-summary">
                        <div><span>Serviço</span><strong>{event.title}</strong></div>
                        <div><span>Profissional</span><strong>{event.professionalName || 'Equipe'}</strong></div>
                        <div><span>Quando</span><strong>{formatDateInZone(event.start, timeZone)} · {formatTimeInZone(event.start, timeZone)}</strong></div>
                        <div><span>Horário</span><strong>{rawCancelled ? 'Cancelado' : 'Reservado'}</strong></div>
                    </section>

                    <section className="appointment-presence-card">
                        <div className="appointment-presence-card__top">
                            <div><span className="eyebrow">Confirmação de presença</span><strong>{presence.label}</strong></div>
                            <span className={`status-badge ${presence.className}`}>{presence.label}</span>
                        </div>
                        <div className="appointment-presence-card__meta">
                            {event.confirmationSentAt ? <span>Solicitada em {formatDateTimeInZone(event.confirmationSentAt, timeZone)}</span> : <span>A confirmação automática ainda não foi enviada.</span>}
                            {event.confirmationRespondedAt ? <span>Resposta em {formatDateTimeInZone(event.confirmationRespondedAt, timeZone)}</span> : null}
                            {!event.clientPhone ? <span>Sem WhatsApp cadastrado para envio automático.</span> : null}
                        </div>
                        {!rawCancelled ? <div className="appointment-presence-card__actions">
                            {!presenceResolved ? <button type="button" className="btn btnPrimary" onClick={() => void runPresenceAction('manual')} disabled={actionBusy}>Confirmar manualmente</button> : null}
                            {event.clientPhone ? <button type="button" className="btn btn-ghost" onClick={() => void runPresenceAction('resend')} disabled={actionBusy}>{event.confirmationStatus === 'NOT_REQUESTED' ? 'Enviar confirmação' : 'Reenviar WhatsApp'}</button> : null}
                        </div> : null}
                    </section>

                    <div className="appointment-details-actions">
                        {!rawCancelled ? <button type="button" className="btn appointment-cancel-btn" onClick={() => void cancelAppointment()} disabled={actionBusy}>Cancelar agendamento</button> : null}
                        <button type="button" className="btn btn-ghost appointment-delete-btn" onClick={async () => {
                            if (await confirmAction({ title: 'Excluir registro', message: 'Use esta ação apenas para corrigir um registro criado por engano. Para um cancelamento normal, prefira Cancelar agendamento.', confirmLabel: 'Excluir registro', danger: true })) {
                                await onDelete(event.id)
                                onClose()
                            }
                        }}>Excluir registro</button>
                    </div>
                </div>
            </div>
        </ModalRoot>
    )
}

function AdminCalendar({ professionalId, professionals, onOpenProfessionals }: { professionalId: ProfessionalScope; professionals: Professional[]; onOpenProfessionals: () => void }) {
    const [view, setView] = useState<'week' | 'month'>('week')
    const [currentDate, setCurrentDate] = useState(new Date())
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [loading, setLoading] = useState(false)
    const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

    type AdminBusinessHour = { id: string; weekday: number; startMinute: number; endMinute: number }
    type AdminTimeOff = { id: string; startsAt: string; endsAt: string; reason: string | null; professionalId: string | null; createdAt: string }

    const [agendaTab, setAgendaTab] = useState<'appointments' | 'hours' | 'blocks'>('appointments')

    const [tenantTimeZone, setTenantTimeZone] = useState('America/Sao_Paulo')
    const [businessHours, setBusinessHours] = useState<AdminBusinessHour[]>([])
    const [businessHoursLoading, setBusinessHoursLoading] = useState(false)
    const [businessHoursError, setBusinessHoursError] = useState<string | null>(null)
    const [businessHoursEdits, setBusinessHoursEdits] = useState<Record<number, { startTime: string; endTime: string; lunchEnabled: boolean; lunchStart: string; lunchEnd: string }>>({})

    const [timeOff, setTimeOff] = useState<AdminTimeOff[]>([])
    const [timeOffLoading, setTimeOffLoading] = useState(false)
    const [timeOffError, setTimeOffError] = useState<string | null>(null)
    const [timeOffAdd, setTimeOffAdd] = useState<{ startsLocal: string; endsLocal: string; reason: string }>(() => {
        const now = new Date()
        const pad = (v: number) => String(v).padStart(2, '0')
        const y = String(now.getFullYear())
        const m = pad(now.getMonth() + 1)
        const d = pad(now.getDate())
        return { startsLocal: `${y}-${m}-${d}T09:00`, endsLocal: `${y}-${m}-${d}T18:00`, reason: '' }
    })

    // Responsive Days Logic
    const [daysToShow, setDaysToShow] = useState(7)
    const agendaRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const host = agendaRef.current
        if (!host) return
        const update = () => {
            const width = host.getBoundingClientRect().width
            if (width < 520) setDaysToShow(1)
            else if (width < 920) setDaysToShow(3)
            else setDaysToShow(7)
        }
        const observer = new ResizeObserver(update)
        observer.observe(host)
        update()
        return () => observer.disconnect()
    }, [])

    // Helpers for Date Manipulation
    const getWeekDays = (date: Date) => {
        const start = new Date(date)

        if (daysToShow === 7) {
            // Standard week view (Sunday to Saturday)
            const day = start.getDay()
            const diff = start.getDate() - day
            start.setDate(diff)
        } else {
            // Rolling view (starts from current date)
            // No adjustment needed, start from 'date'
        }
        start.setHours(0,0,0,0)

        return Array.from({ length: daysToShow }, (_, i) => {
            const d = new Date(start)
            d.setDate(start.getDate() + i)
            return d
        })
    }

    const getMonthDays = (date: Date) => {
        const year = date.getFullYear()
        const month = date.getMonth()

        const firstDayOfMonth = new Date(year, month, 1)
        const startDay = firstDayOfMonth.getDay() // 0 (Sun) to 6 (Sat)

        // Start date of the grid (previous month padding)
        const start = new Date(firstDayOfMonth)
        start.setDate(1 - startDay)
        start.setHours(0,0,0,0)

        // Generate 42 days (6 weeks) to ensure full month coverage
        return Array.from({ length: 42 }, (_, i) => {
            const d = new Date(start)
            d.setDate(start.getDate() + i)
            return d
        })
    }

    const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate, daysToShow])
    const monthDays = useMemo(() => getMonthDays(currentDate), [currentDate])

    useEffect(() => {
        let mounted = true
        api<{ timezone: string }>('/api/public/booking').then((res) => {
            if (!mounted) return
            if (res.ok && res.data?.timezone) setTenantTimeZone(res.data.timezone)
        })
        return () => {
            mounted = false
        }
    }, [])

    const weekdayNamesFull = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    const weekdayNamesShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

    const minuteToTime = (minute: number) => {
        const m = Math.max(0, Math.min(1440, Math.floor(minute)))
        const hh = String(Math.floor(m / 60)).padStart(2, '0')
        const mm = String(m % 60).padStart(2, '0')
        return `${hh}:${mm}`
    }

    const timeToMinute = (t: string) => {
        const m = /^([0-9]{2}):([0-9]{2})$/.exec(t)
        if (!m) return null
        const hh = Number(m[1])
        const mm = Number(m[2])
        if (![hh, mm].every(Number.isFinite)) return null
        if (hh < 0 || hh > 23) return null
        if (mm < 0 || mm > 59) return null
        return hh * 60 + mm
    }

    const timeOptions = useMemo(() => {
        const opts: string[] = []
        for (let i = 0; i < 24 * 60; i += 15) {
            const h = Math.floor(i / 60).toString().padStart(2, '0')
            const m = (i % 60).toString().padStart(2, '0')
            opts.push(`${h}:${m}`)
        }
        // Add end of day if needed, usually business hours go up to a certain point.
        // But 23:45 is the last 15m slot start.
        return opts
    }, [])

    const TimeSelect = ({ value, onChange, disabled }: { value: string, onChange: (val: string) => void, disabled?: boolean }) => (
        <ProductSelect
            value={value}
            onChange={onChange}
            disabled={disabled}
            ariaLabel="Selecionar horário"
            size="compact"
            options={timeOptions.map((time) => ({ value: time, label: time }))}
        />
    )

    const sortBusinessHours = (list: AdminBusinessHour[]) => {
        return [...list].sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute)
    }

    const suggestLunch = (startMinute: number, endMinute: number) => {
        const span = endMinute - startMinute
        const base = Math.max(startMinute + 60, startMinute + Math.floor(span / 2) - 30)
        const lunchStart = Math.min(endMinute - 90, base)
        const lunchEnd = Math.min(endMinute - 30, lunchStart + 60)
        return { lunchStart, lunchEnd }
    }

    const buildDayEditState = (ranges: AdminBusinessHour[]) => {
        if (ranges.length === 0) {
            return { startTime: '09:00', endTime: '18:00', lunchEnabled: false, lunchStart: '12:00', lunchEnd: '13:00' }
        }
        if (ranges.length === 1) {
            const r = ranges[0]
            const lunch = suggestLunch(r.startMinute, r.endMinute)
            return {
                startTime: minuteToTime(r.startMinute),
                endTime: minuteToTime(r.endMinute),
                lunchEnabled: false,
                lunchStart: minuteToTime(lunch.lunchStart),
                lunchEnd: minuteToTime(lunch.lunchEnd),
            }
        }
        const r1 = ranges[0]
        const r2 = ranges[1]
        return {
            startTime: minuteToTime(r1.startMinute),
            endTime: minuteToTime(r2.endMinute),
            lunchEnabled: true,
            lunchStart: minuteToTime(r1.endMinute),
            lunchEnd: minuteToTime(r2.startMinute),
        }
    }

    const syncDayRanges = async (weekday: number, nextState: { startTime: string; endTime: string; lunchEnabled: boolean; lunchStart: string; lunchEnd: string }) => {
        const dayRanges = sortBusinessHours(businessHours.filter((b) => b.weekday === weekday))
        const startMinute = timeToMinute(nextState.startTime)
        const endMinute = timeToMinute(nextState.endTime)
        if (startMinute === null || endMinute === null) return
        if (endMinute <= startMinute) {
            setBusinessHoursError('Intervalo inválido')
            return
        }

        const upsert = (bh: AdminBusinessHour) => {
            setBusinessHours((prev) => {
                const exists = prev.some((p) => p.id === bh.id)
                const next = exists ? prev.map((p) => (p.id === bh.id ? bh : p)) : [...prev, bh]
                return sortBusinessHours(next)
            })
        }

        const createRange = async (start: number, end: number) => {
            const res = await api<{ businessHour: AdminBusinessHour }>('/api/admin/business-hours', {
                method: 'POST',
                body: JSON.stringify({ weekday, startMinute: start, endMinute: end }),
            })
            if (res.ok) upsert(res.data.businessHour)
        }

        const patchRange = async (id: string, start: number, end: number) => {
            const res = await api<{ businessHour: AdminBusinessHour }>(`/api/admin/business-hours/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ weekday, startMinute: start, endMinute: end }),
            })
            if (res.ok) upsert(res.data.businessHour)
        }

        const deleteRange = async (id: string) => {
            const res = await api<{ ok: true }>(`/api/admin/business-hours/${id}`, { method: 'DELETE' })
            if (res.ok) setBusinessHours((prev) => prev.filter((p) => p.id !== id))
        }

        if (!nextState.lunchEnabled) {
            if (dayRanges.length === 0) {
                await createRange(startMinute, endMinute)
            } else {
                await patchRange(dayRanges[0].id, startMinute, endMinute)
                for (const r of dayRanges.slice(1)) await deleteRange(r.id)
            }
            return
        }

        const lunchStart = timeToMinute(nextState.lunchStart)
        const lunchEnd = timeToMinute(nextState.lunchEnd)
        if (lunchStart === null || lunchEnd === null) return
        if (!(startMinute < lunchStart && lunchStart < lunchEnd && lunchEnd < endMinute)) {
            setBusinessHoursError('Intervalo de almoço inválido')
            return
        }

        const morningStart = startMinute
        const morningEnd = lunchStart
        const afternoonStart = lunchEnd
        const afternoonEnd = endMinute

        if (morningEnd <= morningStart || afternoonEnd <= afternoonStart) {
            setBusinessHoursError('Intervalo inválido')
            return
        }

        if (dayRanges.length === 0) {
            await createRange(morningStart, morningEnd)
            await createRange(afternoonStart, afternoonEnd)
            return
        }

        if (dayRanges.length === 1) {
            await patchRange(dayRanges[0].id, morningStart, morningEnd)
            await createRange(afternoonStart, afternoonEnd)
            return
        }

        await patchRange(dayRanges[0].id, morningStart, morningEnd)
        await patchRange(dayRanges[1].id, afternoonStart, afternoonEnd)
        for (const r of dayRanges.slice(2)) await deleteRange(r.id)
    }

    const parseLocalDateTimeInputToUtc = (value: string, timeZone: string) => {
        const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(value)
        if (!match) return null
        return zonedDateTimeToUtc(match[1], match[2], timeZone)
    }

    const nextPeriod = () => {
        const d = new Date(currentDate)
        if (view === 'week') d.setDate(d.getDate() + daysToShow)
        else d.setMonth(d.getMonth() + 1)
        setCurrentDate(d)
    }

    const prevPeriod = () => {
        const d = new Date(currentDate)
        if (view === 'week') d.setDate(d.getDate() - daysToShow)
        else d.setMonth(d.getMonth() - 1)
        setCurrentDate(d)
    }

    const handleNewEvent = (newEvent: CalendarEvent) => {
        setEvents(prev => [...prev, newEvent].sort((a, b) => a.start.localeCompare(b.start)))
    }

    useEffect(() => {
        if (agendaTab !== 'appointments') return
        fetchEvents()
    }, [currentDate, view, agendaTab, professionalId])

    useEffect(() => {
        if (agendaTab !== 'hours') return
        fetchBusinessHours()
    }, [agendaTab])

    useEffect(() => {
        if (agendaTab !== 'blocks') return
        fetchTimeOff()
    }, [agendaTab, tenantTimeZone, professionalId])

    async function fetchBusinessHours() {
        setBusinessHoursLoading(true)
        setBusinessHoursError(null)
        const res = await api<{ businessHours: AdminBusinessHour[] }>('/api/admin/business-hours')
        if (!res.ok) {
            setBusinessHoursError(res.error.message)
            setBusinessHoursLoading(false)
            return
        }
        const list = res.data.businessHours ?? []
        setBusinessHours(list)
        setBusinessHoursEdits(() => {
            const next: Record<number, { startTime: string; endTime: string; lunchEnabled: boolean; lunchStart: string; lunchEnd: string }> = {}
            for (let weekday = 0; weekday <= 6; weekday += 1) {
                const ranges = sortBusinessHours(list.filter((h) => h.weekday === weekday))
                next[weekday] = buildDayEditState(ranges)
            }
            return next
        })
        setBusinessHoursLoading(false)
    }

    async function fetchTimeOff() {
        setTimeOffLoading(true)
        setTimeOffError(null)

        const todayYmd = ymdInTimeZone(new Date(), tenantTimeZone)
        const startYmd = addDaysToYmd(todayYmd, -7)
        const endYmd = addDaysToYmd(todayYmd, 121)
        const start = startYmd ? zonedDateTimeToUtc(startYmd, '00:00', tenantTimeZone) : null
        const end = endYmd ? zonedDateTimeToUtc(endYmd, '00:00', tenantTimeZone) : null
        if (!start || !end) {
            setTimeOffError('Não foi possível calcular o período no fuso do espaço.')
            setTimeOffLoading(false)
            return
        }

        const qs = new URLSearchParams({ start: start.toISOString(), end: end.toISOString(), limit: '800' })
        if (professionalId !== 'all') qs.set('professionalId', professionalId)
        const res = await api<{ timeOff: AdminTimeOff[] }>(`/api/admin/time-off?${qs.toString()}`)
        if (!res.ok) {
            setTimeOffError(res.error.message)
            setTimeOffLoading(false)
            return
        }
        const list = res.data.timeOff ?? []
        setTimeOff(list)
        setTimeOffLoading(false)
    }

    async function fetchEvents() {
        setLoading(true)
        const rangeStart = view === 'week' ? weekDays[0] : monthDays[0]
        const rangeEnd = view === 'week' ? weekDays[weekDays.length - 1] : monthDays[monthDays.length - 1]

        const startYmd = localDateToYmd(rangeStart)
        const endYmd = addDaysToYmd(localDateToYmd(rangeEnd), 1)
        const start = zonedDateTimeToUtc(startYmd, '00:00', tenantTimeZone)
        const end = endYmd ? zonedDateTimeToUtc(endYmd, '00:00', tenantTimeZone) : null
        if (!start || !end) {
            setLoading(false)
            return
        }

        const qs = new URLSearchParams({ start: start.toISOString(), end: end.toISOString(), limit: '800' })
        if (professionalId !== 'all') qs.set('professionalId', professionalId)
        const res = await api<{ appointments: AdminAppointment[] }>(`/api/admin/appointments?${qs.toString()}`)

        if (res.ok) {
            const mapped: CalendarEvent[] = res.data.appointments.map(a => {
                const status = a.status === 'CONFIRMED' ? 'confirmed' : a.status === 'PENDING' ? 'pending' : 'cancelled'
                const presence = appointmentPresenceMeta(a.status, a.confirmationStatus)
                return {
                    id: a.id,
                    title: a.serviceName,
                    clientName: a.clientName ?? a.clientEmail,
                    start: a.startsAt,
                    end: a.endsAt,
                    status,
                    confirmationStatus: a.confirmationStatus,
                    confirmationSentAt: a.confirmationSentAt,
                    confirmationRespondedAt: a.confirmationRespondedAt,
                    appointmentReminderSentAt: a.appointmentReminderSentAt,
                    clientPhone: a.clientPhone,
                    color: a.professionalColor ? `color-mix(in srgb, ${a.professionalColor} 14%, var(--surface-raised))` : presence.color,
                    textColor: a.professionalColor || presence.textColor,
                    professionalId: a.professionalId,
                    professionalName: a.professionalName,
                    professionalColor: a.professionalColor,
                    professionalPhotoUrl: a.professionalPhotoUrl,
                }
            })
            setEvents(mapped)
        }
        setLoading(false)
    }

    async function handleDeleteEvent(id: string) {
        const res = await api<{ ok: true }>(`/api/admin/appointments/${id}`, { method: 'DELETE' })
        if (res.ok) {
            setEvents(prev => prev.filter(e => e.id !== id))
        } else {
            notify('Erro ao excluir agendamento: ' + res.error.message, 'error')
        }
    }

    const [currentTimeMinutes, setCurrentTimeMinutes] = useState(() =>
        minutesInTimeZone(new Date(), tenantTimeZone) ?? 0,
    )

    useEffect(() => {
        const update = () => setCurrentTimeMinutes(minutesInTimeZone(new Date(), tenantTimeZone) ?? 0)
        update()
        const interval = setInterval(update, 60000)
        return () => clearInterval(interval)
    }, [tenantTimeZone])

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    const weekDayNames = weekdayNamesShort
    // Hours from 08:00 to 23:00 (16 hours total) to fill the screen better
    const hours = Array.from({ length: 16 }, (_, i) => i + 8)
    const mobileAgendaDays = Array.from({ length: 7 }, (_, index) => {
        const day = new Date(currentDate)
        day.setDate(currentDate.getDate() + index - 2)
        day.setHours(0, 0, 0, 0)
        return day
    })
    const selectedAgendaYmd = localDateToYmd(currentDate)
    const mobileDayEvents = events
        .filter((event) => ymdInTimeZone(event.start, tenantTimeZone) === selectedAgendaYmd)
        .sort((a, b) => a.start.localeCompare(b.start))
    const selectedAgendaLabel = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(currentDate)
    const scopedProfessional = professionalId === 'all' ? null : professionals.find((professional) => professional.id === professionalId) ?? null

    return (
        <div ref={agendaRef} className="nr-agenda">
            <div className="nr-agenda-tabs" role="tablist" aria-label="Seções da agenda">
                <button type="button"
                    className={`nr-agenda-tab ${agendaTab === 'appointments' ? 'is-active' : ''}`} role="tab" aria-selected={agendaTab === 'appointments'}
                    onClick={() => setAgendaTab('appointments')}
                >
                    <Calendar size={15} /><span>Calendário</span>
                </button>
                <button type="button"
                    className={`nr-agenda-tab ${agendaTab === 'hours' ? 'is-active' : ''}`} role="tab" aria-selected={agendaTab === 'hours'}
                    onClick={() => setAgendaTab('hours')}
                >
                    <Clock size={15} /><span>Horários</span>
                </button>
                <button type="button"
                    className={`nr-agenda-tab ${agendaTab === 'blocks' ? 'is-active' : ''}`} role="tab" aria-selected={agendaTab === 'blocks'}
                    onClick={() => setAgendaTab('blocks')}
                >
                    <XCircle size={15} /><span>Bloqueios</span>
                </button>
            </div>
            <div className={`nr-agenda-scope-note${agendaTab === 'blocks' ? ' is-critical-context' : ''}`}>
                <span><i style={{ background: scopedProfessional?.color || 'var(--brand-action)' }} />{scopedProfessional ? `Agenda de ${scopedProfessional.nickname || scopedProfessional.name}` : 'Agenda consolidada da equipe'}</span>
                <small>{agendaTab === 'blocks' ? (scopedProfessional ? 'O bloqueio afetará apenas esta agenda.' : 'O bloqueio afetará toda a equipe.') : 'Troque a visão pelo seletor no topo.'}</small>
            </div>

            {agendaTab === 'appointments' && (
                <>
                <section className="nr-mobile-agenda-view" aria-label="Agenda do dia">
                    <header className="nr-mobile-agenda-head">
                        <div>
                            <span>Agenda</span>
                            <h2>{monthNames[currentDate.getMonth()]} <em>{currentDate.getFullYear()}</em></h2>
                        </div>
                        <div className="nr-mobile-agenda-head-actions">
                            <button type="button" onClick={() => setCurrentDate(new Date())}>Hoje</button>
                            <button type="button" className="nr-mobile-agenda-add" onClick={() => setIsNewAppointmentOpen(true)} aria-label="Novo agendamento"><Plus size={17} /><span>Novo</span></button>
                        </div>
                    </header>

                    <div className="nr-mobile-day-rail" aria-label="Escolher dia">
                        {mobileAgendaDays.map((date) => {
                            const dateYmd = localDateToYmd(date)
                            const selected = dateYmd === selectedAgendaYmd
                            const today = dateYmd === ymdInTimeZone(new Date(), tenantTimeZone)
                            return <button type="button" key={dateYmd} className={`${selected ? 'is-selected' : ''} ${today ? 'is-today' : ''}`} aria-pressed={selected} onClick={() => setCurrentDate(date)}>
                                <span>{weekdayNamesShort[date.getDay()]}</span>
                                <strong>{date.getDate()}</strong>
                                <i aria-hidden="true" />
                            </button>
                        })}
                    </div>

                    <div className="nr-mobile-agenda-summary">
                        <div><span>{selectedAgendaLabel}</span><strong>{mobileDayEvents.length} {mobileDayEvents.length === 1 ? 'atendimento' : 'atendimentos'}</strong></div>
                        <div className="nr-mobile-agenda-nav"><button type="button" onClick={prevPeriod} aria-label="Dia anterior"><ChevronLeft size={17} /></button><button type="button" onClick={nextPeriod} aria-label="Próximo dia"><ChevronRight size={17} /></button></div>
                    </div>

                    <div className="nr-mobile-agenda-timeline">
                        {loading ? <div className="nr-mobile-agenda-loading"><span className="spinner" /><small>Atualizando agenda…</small></div> : null}
                        {!loading && mobileDayEvents.map((event, index) => {
                            const presence = appointmentPresenceMeta(event.status, event.confirmationStatus)
                            return <button type="button" className="nr-mobile-agenda-event" key={event.id} onClick={() => setSelectedEvent(event)} style={{ '--agenda-event-ink': event.textColor } as CSSProperties}>
                                <span className="nr-mobile-agenda-time"><strong>{formatTimeInZone(event.start, tenantTimeZone)}</strong><small>{index === 0 ? 'próximo' : ''}</small></span>
                                <span className="nr-mobile-agenda-line"><i /></span>
                                <span className="nr-mobile-agenda-event-body">
                                    <span className="nr-mobile-agenda-event-top"><strong>{event.clientName}</strong><em className={`status-badge ${presence.className}`}>{presence.label}</em></span>
                                    <span>{event.title}</span>
                                    <small>{formatTimeInZone(event.start, tenantTimeZone)} — {formatTimeInZone(event.end, tenantTimeZone)}{professionalId === 'all' && event.professionalName ? ` · ${event.professionalName}` : ''}</small>
                                </span>
                            </button>
                        })}
                        {!loading && mobileDayEvents.length === 0 ? <div className="nr-mobile-agenda-empty"><span><Calendar size={22} /></span><strong>Um dia com espaço para respirar.</strong><p>Nenhum atendimento marcado para esta data.</p><button type="button" onClick={() => setIsNewAppointmentOpen(true)}>Criar agendamento <ArrowRight size={15} /></button></div> : null}
                    </div>
                </section>
                <div className="nr-calendar">
                    <div className="nr-calendar-toolbar">
                        <div className="nr-calendar-period">
                            <div className="nr-calendar-arrows">
                                <button type="button" className="calendar-nav-btn" onClick={prevPeriod} aria-label="Período anterior"><ChevronLeft size={20}/></button>
                                <button type="button" className="calendar-nav-btn" onClick={nextPeriod} aria-label="Próximo período"><ChevronRight size={20}/></button>
                            </div>
                            <h2 className="nr-calendar-title">
                                {monthNames[currentDate.getMonth()]}, {currentDate.getFullYear()}
                            </h2>
                        </div>

                        <div className="nr-calendar-actions">
                            <div className="calendar-view-toggle">
                                <button type="button"
                                    className={`view-btn ${view === 'week' ? 'active' : ''}`}
                                    onClick={() => setView('week')}
                                >
                                    Semana
                                </button>
                                <button type="button"
                                    className={`view-btn ${view === 'month' ? 'active' : ''}`}
                                    onClick={() => setView('month')}
                                >
                                    Mês
                                </button>
                            </div>
                            <button type="button" className="btn btnPrimary" onClick={() => setIsNewAppointmentOpen(true)}>
                                <Plus size={16} /> <span className="desktop-only">Novo agendamento</span>
                            </button>
                        </div>
                    </div>

                    <div className="appointment-presence-legend" aria-label="Legenda de confirmação de presença">
                        <span><i className="is-scheduled" />Agendado</span><span><i className="is-awaiting" />Aguardando resposta</span><span><i className="is-confirmed" />Confirmado</span><span><i className="is-attention" />Atenção</span>
                    </div>

                    <div className="nr-calendar-scroll" data-view={view} data-loading={loading ? "true" : "false"}>
                        {view === 'week' ? (
                            <div className="nr-calendar-week" style={{ '--visible-days': daysToShow } as CSSProperties}>
                                <div className="calendar-days-header nr-calendar-week-header">
                                    <div className="calendar-header-cell empty"></div>
                                    {weekDays.map((date) => {
                                        const isToday = ymdInTimeZone(new Date(), tenantTimeZone) === localDateToYmd(date)
                                        return (
                                            <div key={date.toISOString()} className="calendar-header-cell">
                                                <div className="calendar-day-name">{weekDayNames[date.getDay()]}</div>
                                                <div className={`calendar-day-number ${isToday ? 'today' : ''}`}>{date.getDate()}</div>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="nr-calendar-week-body">
                                    <div className="calendar-time-column">
                                        {hours.map(h => (
                                            <div key={h} className="calendar-time-slot">
                                                {h}:00
                                            </div>
                                        ))}
                                    </div>

                                    {weekDays.map((date) => {
                                        const isToday = ymdInTimeZone(new Date(), tenantTimeZone) === localDateToYmd(date)

                                        return (
                                            <div key={date.toISOString()} className={`calendar-day-column ${isToday ? 'is-today' : ''}`}>
                                                {hours.map(h => (
                                                    <div key={h} className="calendar-grid-cell"></div>
                                                ))}

                                                {isToday && currentTimeMinutes >= 8 * 60 && currentTimeMinutes < 24 * 60 && (
                                                    <div
                                                        className="current-time-line"
                                                        style={{ '--current-time-top': `${((currentTimeMinutes - (8 * 60)) / 60) * 58}px` } as CSSProperties}
                                                    >
                                                        <div className="current-time-dot" />
                                                    </div>
                                                )}

                                                {events.filter(ev => {
                                                    return ymdInTimeZone(ev.start, tenantTimeZone) === localDateToYmd(date)
                                                }).map(ev => {
                                                    const startMinutes = minutesInTimeZone(ev.start, tenantTimeZone) ?? 0
                                                    const endMinutes = minutesInTimeZone(ev.end, tenantTimeZone) ?? startMinutes
                                                    const visibleStart = Math.max(8 * 60, startMinutes)
                                                    const visibleEnd = Math.min(24 * 60, endMinutes)
                                                    if (visibleEnd <= visibleStart) return null
                                                    const top = ((visibleStart - (8 * 60)) / 60) * 58
                                                    const height = Math.max(((visibleEnd - visibleStart) / 60) * 58, 24)

                                                    return (
                                                            <button
                                                                type="button"
                                                                key={ev.id}
                                                                className="calendar-event"
                                                                aria-label={`${ev.title}, ${formatTimeInZone(ev.start, tenantTimeZone)}, ${ev.clientName}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setSelectedEvent(ev)
                                                                }}
                                                                style={{
                                                                    '--calendar-event-top': `${top}px`,
                                                                    '--calendar-event-height': `${height}px`,
                                                                    '--calendar-event-bg': ev.color,
                                                                    '--calendar-event-ink': ev.textColor,
                                                                } as CSSProperties}
                                                            >
                                                                <span className="event-title">{ev.title}</span>
                                                                <span className="event-time">
                                                                    {formatTimeInZone(ev.start, tenantTimeZone)} · {ev.clientName}{professionalId === 'all' && ev.professionalName ? ` · ${ev.professionalName}` : ''}
                                                                </span>
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                        ) : (
                            <>
                                <div className="calendar-days-header calendar-month-header">
                                    {weekDayNames.map((name) => (
                                        <div key={name} className="calendar-header-cell">
                                            <div className="calendar-day-name">{name}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="calendar-month-grid">
                                    {monthDays.map((date) => {
                                        const isToday = ymdInTimeZone(new Date(), tenantTimeZone) === localDateToYmd(date)
                                        const isCurrentMonth = date.getMonth() === currentDate.getMonth()

                                        return (
                                            <div key={date.toISOString()} className={`calendar-month-cell ${!isCurrentMonth ? 'different-month' : ''} ${isToday ? 'is-today' : ''}`}>
                                                <div className="calendar-month-cell-head">
                                                    <div className={`calendar-month-day-number ${isToday ? 'today' : ''}`}>
                                                        {date.getDate()}
                                                    </div>
                                                </div>
                                                {events.filter(ev => {
                                                    return ymdInTimeZone(ev.start, tenantTimeZone) === localDateToYmd(date)
                                                }).map(ev => (
                                                    <button
                                                        type="button"
                                                        key={ev.id}
                                                        className="calendar-month-event"
                                                        aria-label={`${ev.title}, ${formatTimeInZone(ev.start, tenantTimeZone)}, ${ev.clientName}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setSelectedEvent(ev)
                                                        }}
                                                        style={{ '--calendar-event-bg': ev.color, '--calendar-event-ink': ev.textColor } as CSSProperties}
                                                    >
                                                        {formatTimeInZone(ev.start, tenantTimeZone)} {ev.clientName}{professionalId === 'all' && ev.professionalName ? ` · ${ev.professionalName}` : ''}
                                                    </button>
                                                ))}
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>
                </>
            )}

            {agendaTab === 'hours' && scopedProfessional ? (
                <section className="nr-agenda-professional-hours">
                    <div className="nr-professional-avatar" style={{ '--professional-color': scopedProfessional.color } as CSSProperties}>{scopedProfessional.photoUrl ? <img src={scopedProfessional.photoUrl} alt="" /> : (scopedProfessional.nickname || scopedProfessional.name).slice(0, 2).toUpperCase()}</div>
                    <div><span>Rotina individual</span><h3>Horários de {scopedProfessional.nickname || scopedProfessional.name}</h3><p>{scopedProfessional.inheritsHours ? 'Este profissional acompanha o expediente geral do espaço.' : `${new Set(scopedProfessional.hours.map((range) => range.weekday)).size} dias possuem horários próprios.`}</p></div>
                    <button type="button" className="btn btnPrimary" onClick={onOpenProfessionals}>Editar na equipe</button>
                </section>
            ) : null}

            {agendaTab === 'hours' && !scopedProfessional && (
                <div className="animate-entry">
                    {businessHoursLoading && (
                        <div
                            className="pill skeleton skeleton-pill nr-agenda-feedback"
                        />
                    )}
                    {businessHoursError && (
                        <div className="nr-form-error nr-agenda-feedback" role="alert">
                            {businessHoursError}
                        </div>
                    )}
                    <div className="schedule-grid">
                        {weekdayNamesFull.map((dayName, idx) => {
                        const dayRanges = sortBusinessHours(businessHours.filter(b => b.weekday === idx))
                        const isOpen = dayRanges.length > 0
                        const editState = businessHoursEdits[idx] ?? buildDayEditState(dayRanges)
                        const startTime = editState.startTime
                        const endTime = editState.endTime
                        const lunchEnabled = editState.lunchEnabled
                        const lunchStart = editState.lunchStart
                        const lunchEnd = editState.lunchEnd

                        return (
                            <div key={dayName} className={`schedule-day-card ${!isOpen ? 'closed' : ''}`}>
                                <div className="schedule-day-header">
                                    <div className="schedule-day-title">
                                        {dayName}
                                    </div>
                                    <button
                                        type="button"
                                        className={`toggle-switch ${isOpen ? 'checked' : ''}`}
                                        role="switch"
                                        aria-checked={isOpen}
                                        aria-label={`${isOpen ? 'Fechar' : 'Abrir'} ${dayName}`}
                                        onClick={async () => {
                                            setBusinessHoursError(null)
                                            if (isOpen) {
                                                if (!(await confirmAction({ title: `Fechar ${dayName}`, message: `Todos os horários configurados para ${dayName} serão removidos.`, confirmLabel: 'Fechar o dia', danger: true }))) return
                                                for (const r of dayRanges) {
                                                    const res = await api<{ ok: true }>(`/api/admin/business-hours/${r.id}`, { method: 'DELETE' })
                                                    if (res.ok) setBusinessHours(prev => prev.filter(x => x.id !== r.id))
                                                }
                                                return
                                            }
                                            await syncDayRanges(idx, editState)
                                        }}
                                    >
                                        <span className="toggle-thumb" />
                                    </button>
                                </div>

                                <div className={`schedule-time-row${isOpen ? '' : ' is-disabled'}`}>
                                    <div className="schedule-time-select-field">
                                        <TimeSelect
                                            value={startTime}
                                            onChange={async (newTime) => {
                                                setBusinessHoursEdits(prev => ({
                                                    ...prev,
                                                    [idx]: { ...editState, startTime: newTime }
                                                }))
                                                if (!isOpen) return
                                                await syncDayRanges(idx, { ...editState, startTime: newTime })
                                            }}
                                        />
                                    </div>
                                    <span className="schedule-time-separator">—</span>
                                    <div className="schedule-time-select-field">
                                        <TimeSelect
                                            value={endTime}
                                            onChange={async (newTime) => {
                                                setBusinessHoursEdits(prev => ({
                                                    ...prev,
                                                    [idx]: { ...editState, endTime: newTime }
                                                }))
                                                if (!isOpen) return
                                                await syncDayRanges(idx, { ...editState, endTime: newTime })
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className={`schedule-lunch-row${isOpen ? '' : ' is-disabled'}`}>
                                    <div className="schedule-lunch-toggle">
                                        <div>
                                            <button
                                                type="button"
                                                className={`checkbox-circle ${lunchEnabled ? 'checked' : ''}`}
                                                role="checkbox"
                                                aria-checked={lunchEnabled}
                                                aria-label={`Ativar intervalo de almoço em ${dayName}`}
                                                onClick={async () => {
                                                    const next = { ...editState, lunchEnabled: !lunchEnabled }
                                                    setBusinessHoursEdits(prev => ({ ...prev, [idx]: next }))
                                                    if (!isOpen) return
                                                    await syncDayRanges(idx, next)
                                                }}
                                            >
                                                {lunchEnabled ? <i className="nr-checkbox-selected-mark" aria-hidden="true" /> : null}
                                            </button>
                                            <div className="schedule-lunch-label">Intervalo</div>
                                        </div>
                                    </div>

                                    {lunchEnabled && (
                                        <div className="schedule-lunch-times">
                                            <div className="schedule-time-select-field is-compact">
                                                <TimeSelect
                                                    value={lunchStart}
                                                    onChange={async (newTime) => {
                                                        const next = { ...editState, lunchStart: newTime }
                                                        setBusinessHoursEdits(prev => ({ ...prev, [idx]: next }))
                                                        if (!isOpen || !next.lunchEnabled) return
                                                        await syncDayRanges(idx, next)
                                                    }}
                                                />
                                            </div>
                                            <span className="schedule-time-separator">—</span>
                                            <div className="schedule-time-select-field is-compact">
                                                <TimeSelect
                                                    value={lunchEnd}
                                                    onChange={async (newTime) => {
                                                        const next = { ...editState, lunchEnd: newTime }
                                                        setBusinessHoursEdits(prev => ({ ...prev, [idx]: next }))
                                                        if (!isOpen || !next.lunchEnabled) return
                                                        await syncDayRanges(idx, next)
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className={`schedule-day-status ${isOpen ? 'status-open' : 'status-closed'}`}>
                                    {isOpen ? 'Aberto' : 'Fechado'}
                                </div>
                            </div>
                        )
                    })}
                    </div>
                </div>
            )}

            {agendaTab === 'blocks' && (
                <div className="animate-entry">
                     <div className="blocks-list">
                        <div className="card nr-agenda-block-form">
                            <h4>Novo bloqueio</h4>
                            <div className="grid grid-3">
                                <div className="agenda-input-group">
                                    <label className="agenda-label" htmlFor="time-off-start">Início</label>
                                    <div className="time-input-wrapper">
                                        <input
                                            id="time-off-start"
                                            type="datetime-local"
                                            className="time-input"
                                            value={timeOffAdd.startsLocal}
                                            onChange={(e) => setTimeOffAdd(prev => ({ ...prev, startsLocal: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className="agenda-input-group">
                                    <label className="agenda-label" htmlFor="time-off-end">Fim</label>
                                    <div className="time-input-wrapper">
                                        <input
                                            id="time-off-end"
                                            type="datetime-local"
                                            className="time-input"
                                            value={timeOffAdd.endsLocal}
                                            onChange={(e) => setTimeOffAdd(prev => ({ ...prev, endsLocal: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className="agenda-input-group">
                                    <label className="agenda-label" htmlFor="time-off-reason">Motivo</label>
                                    <div className="time-input-wrapper">
                                        <input
                                            id="time-off-reason"
                                            className="time-input"
                                            value={timeOffAdd.reason}
                                            onChange={(e) => setTimeOffAdd(prev => ({ ...prev, reason: e.target.value }))}
                                            placeholder="Ex: Feriado"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="nr-agenda-block-form-actions">
                                <button type="button"
                                    className="btn btnPrimary"
                                    onClick={async () => {
                                        setTimeOffError(null)
                                        const s = parseLocalDateTimeInputToUtc(timeOffAdd.startsLocal, tenantTimeZone)
                                        const e = parseLocalDateTimeInputToUtc(timeOffAdd.endsLocal, tenantTimeZone)
                                        if (!s || !e) {
                                            setTimeOffError('Data inválida')
                                            return
                                        }
                                        if (e.getTime() <= s.getTime()) {
                                            setTimeOffError('O fim do bloqueio precisa ser posterior ao início.')
                                            return
                                        }
                                        const res = await api<{ timeOff: AdminTimeOff }>('/api/admin/time-off', {
                                            method: 'POST',
                                            body: JSON.stringify({ startsAt: s.toISOString(), endsAt: e.toISOString(), reason: timeOffAdd.reason.trim() || null, professionalId: professionalId === 'all' ? null : professionalId }),
                                        })
                                        if (!res.ok) {
                                            setTimeOffError(res.error.message)
                                            return
                                        }
                                        const created = res.data.timeOff
                                        setTimeOff(prev => [...prev, created].sort((a, b) => a.startsAt.localeCompare(b.startsAt)))
                                    }}
                                    disabled={timeOffLoading}
                                >
                                    Adicionar bloqueio
                                </button>
                            </div>
                            {timeOffError && <div className="nr-form-error nr-agenda-block-error" role="alert">{timeOffError}</div>}
                        </div>

                        {timeOff.map((b) => {
                             const dateObj = new Date(b.startsAt)
                             const dateParts = new Intl.DateTimeFormat('pt-BR', { timeZone: tenantTimeZone, day: '2-digit', month: 'short' }).formatToParts(dateObj)
                             const monthShort = (dateParts.find((part) => part.type === 'month')?.value ?? '').toUpperCase().replace('.', '')
                             const dayNum = dateParts.find((part) => part.type === 'day')?.value ?? ''

                             return (
                                <div key={b.id} className="block-card">
                                    <div className="block-date-badge">
                                        <span>{monthShort}</span>
                                        <strong>{dayNum}</strong>
                                    </div>
                                    <div className="block-info">
                                        <div className="block-title">{b.reason || 'Bloqueio de agenda'}</div>
                                        <div className="block-meta">
                                            <Clock size={14} />
                                            {formatTimeInZone(b.startsAt, tenantTimeZone)} — {formatTimeInZone(b.endsAt, tenantTimeZone)}
                                            <span className="block-meta-separator">•</span>
                                            {formatDateInZone(b.endsAt, tenantTimeZone) !== formatDateInZone(b.startsAt, tenantTimeZone) ? `Até ${formatDateInZone(b.endsAt, tenantTimeZone)}` : 'Mesmo dia'}
                                        </div>
                                    </div>
                                    <button type="button"
                                        className="icon-btn nr-agenda-block-delete"
                                        aria-label={`Remover bloqueio de ${formatDateInZone(b.startsAt, tenantTimeZone)}`}
                                        onClick={async () => {
                                            if (!(await confirmAction({ title: 'Remover bloqueio', message: 'O período voltará a ficar disponível para agendamentos, conforme os horários de atendimento.', confirmLabel: 'Remover bloqueio', danger: true }))) return
                                            const res = await api<{ ok: true }>(`/api/admin/time-off/${b.id}`, { method: 'DELETE' })
                                            if(res.ok) {
                                                setTimeOff(prev => prev.filter(x => x.id !== b.id))
                                            } else {
                                                notify(res.error.message, 'error')
                                            }
                                        }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                             )
                        })}
                     </div>
                </div>
            )}

            <NewAppointmentModal
                isOpen={isNewAppointmentOpen}
                onClose={() => setIsNewAppointmentOpen(false)}
                onSuccess={handleNewEvent}
                initialDate={currentDate}
                timeZone={tenantTimeZone}
                professionals={professionals}
                initialProfessionalId={professionalId}
            />

            <AppointmentDetailsModal
                isOpen={!!selectedEvent}
                event={selectedEvent}
                onClose={() => setSelectedEvent(null)}
                onDelete={handleDeleteEvent}
                onChanged={fetchEvents}
                timeZone={tenantTimeZone}
            />
        </div>
    )
}

function AdminClients({ professionalId }: { professionalId: ProfessionalScope }) {
    const [clients, setClients] = useState<AdminClientRow[]>([])
    const [loading, setLoading] = useState(true)
    const [query, setQuery] = useState('')
    const [segment, setSegment] = useState<'all' | 'returning' | 'recent' | 'marketing' | 'inactive'>('all')

    useEffect(() => {
        let mounted = true
        setLoading(true)
        api<{ clients: AdminClientRow[] }>(scopedApiPath('/api/admin/clients', professionalId)).then(res => {
            if (!mounted) return
            if (res.ok) setClients(res.data.clients)
            else notify(res.error.message, 'error')
            setLoading(false)
        })
        return () => {
            mounted = false
        }
    }, [professionalId])

    const palette = [
        { bg: 'var(--surface-soft)', fg: 'var(--ink-body)' },
        { bg: 'var(--status-info-bg)', fg: 'var(--status-info-ink)' },
        { bg: 'var(--status-warning-bg)', fg: 'var(--status-warning-ink)' },
        { bg: 'var(--brand-soft)', fg: 'var(--brand-action-hover)' },
        { bg: 'var(--status-success-bg)', fg: 'var(--status-success-ink)' },
    ]

    const initials = (name: string) => {
        const parts = name.trim().split(/\s+/).filter(Boolean)
        const a = parts[0]?.[0] ?? 'U'
        const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : (parts[0]?.[1] ?? '')
        return (a + b).toUpperCase()
    }

    const colorFor = (name: string) => {
        let h = 0
        for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
        return palette[h % palette.length]
    }

    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
    const recentCutoff = Date.now() - 30 * 24 * 60 * 60_000
    const filteredClients = clients.filter((client) => {
        const matchesQuery = !normalizedQuery || [client.name, client.phone ?? '', client.email].some((value) => value.toLocaleLowerCase('pt-BR').includes(normalizedQuery))
        if (!matchesQuery) return false
        if (segment === 'returning') return client.appointmentsCount >= 2
        if (segment === 'recent') return Boolean(client.lastVisitAt && new Date(client.lastVisitAt).getTime() >= recentCutoff)
        if (segment === 'marketing') return Boolean(client.marketingWhatsappOptIn)
        if (segment === 'inactive') return !client.lastVisitAt || new Date(client.lastVisitAt).getTime() < recentCutoff
        return true
    })
    const topClient = clients.reduce<AdminClientRow | null>((best, client) => !best || client.totalSpentCents > best.totalSpentCents ? client : best, null)
    const visitedClients = clients.filter((client) => Boolean(client.lastVisitAt)).length

    return (
        <div className="card client-admin-page">
            <section className="client-mobile-overview" aria-label="Resumo da base de clientes">
                <div className="client-mobile-overview-copy"><span>Sua comunidade</span><strong>{clients.length}</strong><p>{visitedClients} {visitedClients === 1 ? 'cliente tem visita registrada' : 'clientes têm visita registrada'}.</p></div>
                {topClient ? (() => { const col = colorFor(topClient.name); return <div className="client-mobile-highlight" style={{ '--client-accent': col.bg || 'var(--brand-soft)' } as CSSProperties}>
                    <div className="user-avatar-mini" style={{ background: col.bg, color: col.fg }}>{initials(topClient.name)}</div>
                    <span><small>Maior valor acumulado</small><strong>{topClient.name}</strong><em>{formatBRL(topClient.totalSpentCents / 100)}</em></span>
                </div> })() : <div className="client-mobile-highlight is-empty"><span><small>Primeiros vínculos</small><strong>Sua base começa aqui.</strong></span></div>}
            </section>
            <div className="cardHeader client-admin-header">
                <div>
                    <h2 className="cardTitle">Clientes</h2>
                    <p className="cardDesc">Base de clientes do seu espaço.</p>
                </div>
                <span className="client-count-badge">{clients.length}</span>
            </div>
            <div className="client-filter-toolbar">
                <label className="client-search" aria-label="Buscar clientes">
                    <Search size={18} />
                    <input type="search" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, telefone ou e-mail" />
                    {query ? <button type="button" onClick={() => setQuery('')} aria-label="Limpar busca"><X size={15} /></button> : null}
                </label>
                <div className="client-segment-filters" aria-label="Filtrar clientes">
                    {([
                        ['all', 'Todos'],
                        ['returning', 'Recorrentes'],
                        ['recent', 'Visita recente'],
                        ['marketing', 'Aceitam campanhas'],
                        ['inactive', 'Sem visita recente'],
                    ] as const).map(([value, label]) => <button type="button" key={value} className={segment === value ? 'is-active' : ''} aria-pressed={segment === value} onClick={() => setSegment(value)}>{label}</button>)}
                </div>
            </div>
            {loading ? (
                <div className="client-loading">
                    <div className="spinner" />
                </div>
            ) : (
                <div className="table-scroll client-desktop-table">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Telefone</th>
                                <th>Promoções</th>
                                <th>Última visita</th>
                                <th>Total gasto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClients.map(c => {
                                const col = colorFor(c.name)
                                return (
                                    <tr key={c.id}>
                                        <td>
                                            <div className="client-table-identity">
                                                <div
                                                    className="user-avatar-mini client-table-avatar"
                                                    style={{
                                                        background: col.bg,
                                                        color: col.fg,
                                                    }}
                                                >
                                                    {initials(c.name)}
                                                </div>
                                                <strong>{c.name}</strong>
                                            </div>
                                        </td>
                                        <td className="client-contact-cell">{c.phone || '—'}</td>
                                        <td>{c.marketingWhatsappOptIn ? <span className="status-badge status-success">Autorizado</span> : <span className="client-empty-value">—</span>}</td>
                                        <td>
                                            {c.lastVisitAt ? (
                                                <span className="pill">{new Date(c.lastVisitAt).toLocaleDateString('pt-BR')}</span>
                                            ) : (
                                                <span className="client-empty-value">—</span>
                                            )}
                                        </td>
                                        <td className="client-value-cell">{formatBRL(c.totalSpentCents / 100)}</td>
                                    </tr>
                                )
                            })}
                            {filteredClients.length === 0 ? (
                                <tr>
                                    <td colSpan={5}>
                                        <EmptyState compact icon={<Users size={24}/>} title={query || segment !== 'all' ? 'Nenhum cliente neste filtro' : 'Nenhum cliente ainda'} description={query || segment !== 'all' ? 'Ajuste a busca ou escolha outro segmento.' : 'Os novos contatos aparecerão aqui após o primeiro agendamento.'} />
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            )}
            {!loading ? <div className="client-mobile-list" aria-label="Clientes cadastrados">
                {filteredClients.map((client) => {
                    const col = colorFor(client.name)
                    return <article className="client-mobile-card" key={`mobile-${client.id}`} style={{ '--client-accent': col.bg || 'var(--brand-soft)' } as CSSProperties}>
                        <div className="user-avatar-mini client-mobile-avatar" style={{ background: col.bg, color: col.fg }}>{initials(client.name)}</div>
                        <div className="client-mobile-main">
                            <strong>{client.name}</strong>
                            <span>{client.phone || client.email || 'Sem contato informado'}</span>
                            <div className="client-mobile-tags">
                                {client.marketingWhatsappOptIn ? <em className="is-ok">Promoções autorizadas</em> : <em>Sem promoções</em>}
                                {client.lastVisitAt ? <em>Última visita {new Date(client.lastVisitAt).toLocaleDateString('pt-BR')}</em> : <em>Primeira visita pendente</em>}
                            </div>
                        </div>
                        <div className="client-mobile-value"><small>Total</small><strong>{formatBRL(client.totalSpentCents / 100)}</strong></div>
                    </article>
                })}
                {filteredClients.length === 0 ? <EmptyState compact icon={<Users size={24}/>} title={query || segment !== 'all' ? 'Nenhum cliente neste filtro' : 'Nenhum cliente ainda'} description={query || segment !== 'all' ? 'Ajuste a busca ou escolha outro segmento.' : 'Os novos contatos aparecerão aqui após o primeiro agendamento.'} /> : null}
            </div> : null}
        </div>
    )
}

function AdminEvolutionAPI() {
    return <WhatsAppCenter />
}

type SecurityDevice = {
    id: string
    label: string
    createdAt: string
    lastUsedAt: string
    expiresAt: string
    current?: boolean
}

type SecuritySession = {
    id: string
    trustedDeviceId: string | null
    persistent: number | boolean
    createdAt: string
    lastSeenAt: string
    expiresAt: string
    userAgent: string | null
    current?: boolean
}

type SecurityState = {
    phone: string | null
    whatsappMfaReady: boolean
    devices: SecurityDevice[]
    sessions: SecuritySession[]
}

type LegalPreferencesState = {
    whatsappPromotions: boolean
    marketingConsentText: string
    currentDocuments: { termsVersion: string; privacyVersion: string; bundleHash: string }
    latestAcceptance: { termsVersion: string; privacyVersion: string; bundleHash: string; acceptedAt: string } | null
}

function SecuritySettingsCard({ title = 'Segurança da conta' }: { title?: string }) {
    const [state, setState] = useState<SecurityState | null>(null)
    const [loading, setLoading] = useState(true)
    const [busyDevice, setBusyDevice] = useState<string | null>(null)
    const [busySession, setBusySession] = useState<string | null>(null)
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [savingPassword, setSavingPassword] = useState(false)
    const [passwordError, setPasswordError] = useState<string | null>(null)
    const [securityPhone, setSecurityPhone] = useState('')
    const [phonePassword, setPhonePassword] = useState('')
    const [phoneBusy, setPhoneBusy] = useState(false)
    const [phoneError, setPhoneError] = useState<string | null>(null)
    const [legalPreferences, setLegalPreferences] = useState<LegalPreferencesState | null>(null)
    const [legalPreferencesBusy, setLegalPreferencesBusy] = useState(false)

    async function loadSecurityState() {
        setLoading(true)
        const res = await api<SecurityState>('/api/auth/security')
        if (res.ok) {
            setState(res.data)
            setSecurityPhone(res.data.phone ? formatBrazilPhoneInput(res.data.phone) : '')
        } else notify(res.error.message, 'error')
        setLoading(false)
    }

    async function loadLegalPreferences() {
        const res = await api<LegalPreferencesState>('/api/auth/legal-preferences')
        if (res.ok) setLegalPreferences(res.data)
    }

    useEffect(() => {
        void loadSecurityState()
        void loadLegalPreferences()
    }, [])

    async function updatePlatformMarketingPreference(next: boolean) {
        if (!legalPreferences || legalPreferencesBusy) return
        setLegalPreferencesBusy(true)
        const res = await api<{ ok: boolean; whatsappPromotions: boolean }>('/api/auth/legal-preferences', {
            method: 'PUT',
            body: JSON.stringify({ whatsappPromotions: next }),
        })
        setLegalPreferencesBusy(false)
        if (!res.ok) {
            notify(res.error.message, 'error')
            return
        }
        setLegalPreferences((current) => current ? { ...current, whatsappPromotions: res.data.whatsappPromotions } : current)
        notify(next ? 'Comunicações promocionais ativadas.' : 'Comunicações promocionais desativadas.', 'success')
    }

    async function changePassword() {
        setPasswordError(null)
        if (newPassword.length < 8) {
            setPasswordError('A nova senha precisa ter pelo menos 8 caracteres.')
            return
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('A confirmação não corresponde à nova senha.')
            return
        }
        setSavingPassword(true)
        const res = await api<{ ok: boolean }>('/api/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword }),
        })
        setSavingPassword(false)
        if (!res.ok) {
            setPasswordError(res.error.message)
            return
        }
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        notify('Senha alterada. As outras sessões foram encerradas.', 'success')
        void loadSecurityState()
    }

    async function saveSecurityPhone() {
        setPhoneError(null)
        const normalizedPhone = normalizeBrazilPhone(securityPhone)
        if (!normalizedPhone) {
            setPhoneError('Informe um WhatsApp brasileiro válido, com DDD.')
            return
        }
        if (!phonePassword) {
            setPhoneError('Informe sua senha atual para alterar o WhatsApp de segurança.')
            return
        }
        setPhoneBusy(true)
        const res = await api<{ phone: string }>('/api/auth/security/phone', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword: phonePassword, phone: normalizedPhone }),
        })
        setPhoneBusy(false)
        if (!res.ok) {
            setPhoneError(res.error.message)
            return
        }
        setPhonePassword('')
        setSecurityPhone(formatBrazilPhoneInput(res.data.phone))
        setState(current => current ? { ...current, phone: res.data.phone, whatsappMfaReady: true } : current)
        notify('WhatsApp de segurança atualizado.', 'success')
    }

    async function revokeDevice(device: SecurityDevice) {
        if (!(await confirmAction({ title: 'Remover dispositivo confiável', message: `Remover ${device.current ? 'este dispositivo confiável' : `o dispositivo “${device.label}”`}?`, confirmLabel: 'Remover', danger: true }))) return
        setBusyDevice(device.id)
        const res = await api<{ ok: boolean; currentSessionRevoked?: boolean }>(`/api/auth/security/devices/${encodeURIComponent(device.id)}`, { method: 'DELETE' })
        setBusyDevice(null)
        if (!res.ok) {
            notify(res.error.message, 'error')
            return
        }
        if (res.data.currentSessionRevoked) {
            window.location.href = '/'
            return
        }
        notify('Dispositivo removido.', 'success')
        void loadSecurityState()
    }

    async function revokeAllDevices() {
        if (!(await confirmAction({ title: 'Remover dispositivos confiáveis', message: 'Remover todos os dispositivos confiáveis? Os acessos vinculados serão encerrados.', confirmLabel: 'Remover todos', danger: true }))) return
        setBusyDevice('all')
        const res = await api<{ ok: boolean }>('/api/auth/security/devices/revoke-all', { method: 'POST' })
        setBusyDevice(null)
        if (!res.ok) {
            notify(res.error.message, 'error')
            return
        }
        notify('Todos os dispositivos confiáveis foram removidos.', 'success')
        void loadSecurityState()
    }

    async function revokeSessionItem(session: SecuritySession) {
        if (!(await confirmAction({ title: 'Encerrar sessão', message: session.current ? 'Encerrar esta sessão agora?' : 'Encerrar esta sessão ativa?', confirmLabel: 'Encerrar sessão', danger: true }))) return
        setBusySession(session.id)
        const res = await api<{ ok: boolean; currentSessionRevoked?: boolean }>(`/api/auth/security/sessions/${encodeURIComponent(session.id)}`, { method: 'DELETE' })
        setBusySession(null)
        if (!res.ok) {
            notify(res.error.message, 'error')
            return
        }
        if (res.data.currentSessionRevoked) {
            window.location.href = '/'
            return
        }
        notify('Sessão encerrada.', 'success')
        void loadSecurityState()
    }

    async function revokeAllSessions() {
        if (!(await confirmAction({ title: 'Encerrar todas as sessões', message: 'Encerrar todas as sessões desta conta? Você precisará entrar novamente.', confirmLabel: 'Encerrar todas', danger: true }))) return
        setBusySession('all')
        const res = await api<{ ok: boolean }>('/api/auth/logout-all', { method: 'POST' })
        setBusySession(null)
        if (!res.ok) {
            notify(res.error.message, 'error')
            return
        }
        window.location.href = '/'
    }

    const activeSessions = state?.sessions.length ?? 0

    return (
        <div className="card security-settings-card">
            <div className="cardHeader settings-card-header">
                <div>
                    <h2 className="cardTitle">{title}</h2>
                    <p className="cardDesc">Senha, verificação pelo WhatsApp, dispositivos e sessões autorizadas.</p>
                </div>
                <span className={`status-badge ${state?.whatsappMfaReady ? 'status-success' : 'status-warning'}`}>
                    {loading ? 'Verificando…' : state?.whatsappMfaReady ? 'WhatsApp configurado' : 'WhatsApp pendente'}
                </span>
            </div>
            <div className="cardBody security-settings-body">
                <section className="security-settings-section" aria-labelledby="security-password-title">
                    <div className="security-settings-section-head">
                        <div className="security-settings-icon"><Lock size={18} aria-hidden="true" /></div>
                        <div><strong id="security-password-title">Alterar senha</strong><span>Ao trocar, as outras sessões são encerradas.</span></div>
                    </div>
                    <div className="form-stack security-password-form">
                        <div className="input-group"><label className="label" htmlFor="security-current-password">Senha atual</label><input id="security-current-password" className="input" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></div>
                        <div className="security-password-grid">
                            <div className="input-group"><label className="label" htmlFor="security-new-password">Nova senha</label><input id="security-new-password" className="input" type="password" autoComplete="new-password" minLength={8} aria-describedby="security-password-requirements" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
                            <div className="input-group"><label className="label" htmlFor="security-confirm-password">Confirmar nova senha</label><input id="security-confirm-password" className="input" type="password" autoComplete="new-password" minLength={8} aria-describedby="security-password-requirements" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
                        </div>
                        <PasswordChecklist id="security-password-requirements" password={newPassword} confirmation={confirmPassword} />
                        {passwordError ? <p className="form-error" role="alert">{passwordError}</p> : null}
                        <div className="form-actions"><button type="button" className="btn btnPrimary" onClick={changePassword} disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}>{savingPassword ? 'Alterando…' : 'Alterar senha'}</button></div>
                    </div>
                </section>

                <section className="security-settings-section" aria-labelledby="security-mfa-title">
                    <div className="security-settings-section-head">
                        <div className="security-settings-icon"><ShieldCheck size={18} aria-hidden="true" /></div>
                        <div><strong id="security-mfa-title">Verificação pelo WhatsApp</strong><span>Em um dispositivo novo, enviaremos um código de 6 dígitos para este número.</span></div>
                    </div>
                    <div className="form-stack security-password-form">
                        <div className="security-password-grid">
                            <div className="input-group">
                                <label className="label" htmlFor="security-phone">WhatsApp de segurança</label>
                                <input id="security-phone" className="input" inputMode="tel" autoComplete="tel" value={securityPhone} onChange={(e) => setSecurityPhone(formatBrazilPhoneInput(e.target.value))} placeholder="(11) 99999-9999" aria-invalid={Boolean(securityPhone && !normalizeBrazilPhone(securityPhone))} />
                            </div>
                            <div className="input-group">
                                <label className="label" htmlFor="security-phone-password">Senha atual</label>
                                <input id="security-phone-password" className="input" type="password" autoComplete="current-password" value={phonePassword} onChange={(e) => setPhonePassword(e.target.value)} />
                            </div>
                        </div>
                        {phoneError ? <p className="form-error" role="alert">{phoneError}</p> : null}
                        <div className="form-actions"><button type="button" className="btn" onClick={saveSecurityPhone} disabled={phoneBusy || !normalizeBrazilPhone(securityPhone) || !phonePassword}>{phoneBusy ? 'Salvando…' : state?.phone ? 'Alterar WhatsApp' : 'Cadastrar WhatsApp'}</button></div>
                        <div className="form-hint">O WhatsApp é usado somente como segundo fator de acesso profissional. Dispositivos confiáveis continuam dispensando o código por até 365 dias.</div>
                    </div>
                </section>

                <section className="security-settings-section" aria-labelledby="trusted-devices-title">
                    <div className="security-settings-section-head security-settings-section-head--split">
                        <div className="security-settings-heading">
                            <div className="security-settings-icon"><Smartphone size={18} aria-hidden="true" /></div>
                            <div><strong id="trusted-devices-title">Dispositivos confiáveis</strong><span>{activeSessions} {activeSessions === 1 ? 'sessão ativa' : 'sessões ativas'} nesta conta.</span></div>
                        </div>
                        {(state?.devices.length ?? 0) > 1 ? <button type="button" className="btn security-revoke-all" onClick={revokeAllDevices} disabled={busyDevice === 'all'}>{busyDevice === 'all' ? 'Removendo…' : 'Remover todos'}</button> : null}
                    </div>

                    {loading ? <div className="security-device-empty">Carregando dispositivos…</div> : state?.devices.length ? (
                        <div className="security-device-list">
                            {state.devices.map((device) => (
                                <div className="security-device-row" key={device.id}>
                                    <div className="security-device-copy">
                                        <div className="security-device-title"><strong>{device.label}</strong>{device.current ? <span className="status-badge status-success">Este dispositivo</span> : null}</div>
                                        <span>Último acesso: {new Date(device.lastUsedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · confiável até {new Date(device.expiresAt).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <button type="button" className="btn" onClick={() => revokeDevice(device)} disabled={busyDevice === device.id}>{busyDevice === device.id ? 'Removendo…' : 'Remover'}</button>
                                </div>
                            ))}
                        </div>
                    ) : <div className="security-device-empty">Nenhum dispositivo está marcado como confiável. Um novo login profissional exigirá um código pelo WhatsApp.</div>}
                </section>

                <section className="security-settings-section" aria-labelledby="active-sessions-title">
                    <div className="security-settings-section-head security-settings-section-head--split">
                        <div className="security-settings-heading">
                            <div className="security-settings-icon"><ShieldCheck size={18} aria-hidden="true" /></div>
                            <div><strong id="active-sessions-title">Sessões ativas</strong><span>Encerre acessos individualmente ou invalide todos de uma vez.</span></div>
                        </div>
                        {(state?.sessions.length ?? 0) > 1 ? <button type="button" className="btn security-revoke-all" onClick={revokeAllSessions} disabled={busySession === 'all'}>{busySession === 'all' ? 'Encerrando…' : 'Encerrar todas'}</button> : null}
                    </div>
                    {loading ? <div className="security-device-empty">Carregando sessões…</div> : state?.sessions.length ? (
                        <div className="security-device-list">
                            {state.sessions.map((session) => (
                                <div className="security-device-row" key={session.id}>
                                    <div className="security-device-copy">
                                        <div className="security-device-title"><strong>{session.current ? 'Sessão atual' : session.trustedDeviceId ? 'Sessão em dispositivo confiável' : 'Sessão autenticada'}</strong>{session.current ? <span className="status-badge status-success">Esta sessão</span> : null}</div>
                                        <span>Última atividade: {new Date(session.lastSeenAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · expira em {new Date(session.expiresAt).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <button type="button" className="btn" onClick={() => revokeSessionItem(session)} disabled={busySession === session.id}>{busySession === session.id ? 'Encerrando…' : 'Encerrar'}</button>
                                </div>
                            ))}
                        </div>
                    ) : <div className="security-device-empty">Nenhuma sessão ativa.</div>}
                </section>

                <section className="security-settings-section" aria-labelledby="legal-communications-title">
                    <div className="security-settings-section-head security-settings-section-head--split">
                        <div className="security-settings-heading">
                            <div className="security-settings-icon"><BellRing size={18} aria-hidden="true" /></div>
                            <div><strong id="legal-communications-title">Comunicações do NaRégua</strong><span>Novidades, recursos e ofertas da própria plataforma. Essa autorização é opcional e não interfere no uso do produto.</span></div>
                        </div>
                        {legalPreferences ? <button type="button" className={`btn ${legalPreferences.whatsappPromotions ? '' : 'btnPrimary'}`} onClick={() => void updatePlatformMarketingPreference(!legalPreferences.whatsappPromotions)} disabled={legalPreferencesBusy}>{legalPreferencesBusy ? 'Salvando…' : legalPreferences.whatsappPromotions ? 'Desativar promoções' : 'Quero receber'}</button> : null}
                    </div>
                    <div className="legal-settings-meta">
                        <p>{legalPreferences?.marketingConsentText ?? 'Carregando preferência…'}</p>
                        <div><a href="/termos" target="_blank" rel="noopener noreferrer">Termos de Uso</a><a href="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade</a></div>
                        {legalPreferences?.latestAcceptance ? <>
                            <small>Último aceite registrado em {new Date(legalPreferences.latestAcceptance.acceptedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · Termos {legalPreferences.latestAcceptance.termsVersion} · Privacidade {legalPreferences.latestAcceptance.privacyVersion}</small>
                            <div className="legal-settings-proof-links"><a href={`/termos?accepted=${encodeURIComponent(legalPreferences.latestAcceptance.bundleHash)}`} target="_blank" rel="noopener noreferrer">Ver Termos aceitos</a><a href={`/privacidade?accepted=${encodeURIComponent(legalPreferences.latestAcceptance.bundleHash)}`} target="_blank" rel="noopener noreferrer">Ver Privacidade aceita</a></div>
                        </> : <small>O aceite contratual é registrado no fluxo de contratação.</small>}
                    </div>
                </section>
            </div>
        </div>
    )
}

function AdminSettings({ tenant, onUpdate }: { tenant: TenantPublic | null; onUpdate?: (tenant: TenantPublic) => void }) {
    const [name, setName] = useState(tenant?.name ?? '')
    const [primaryColor, setPrimaryColor] = useState(tenant?.primaryColor ?? '#d7784a')
    const [logoUrl, setLogoUrl] = useState(tenant?.logoUrl ?? '')
    const [saving, setSaving] = useState(false)
    const [settingsError, setSettingsError] = useState<string | null>(null)

    // Logo state
    const [logoBusy, setLogoBusy] = useState(false)
    const [logoError, setLogoError] = useState<string | null>(null)
    const logoInputRef = useRef<HTMLInputElement>(null)

    const [billingLoading, setBillingLoading] = useState(true)
    type BillingOrder = {
        orderNsu: string
        amountCents: number
        status: string
        receiptUrl: string | null
        createdAt: string
        paidAt: string | null
    }
    const [billingOrders, setBillingOrders] = useState<BillingOrder[]>([])
    const [subscription, setSubscription] = useState<
        | null
        | {
              id: string
              externalId: string | null
              status: string
              currentPeriodEnd: string | null
              createdAt: string
              updatedAt: string
          }
    >(null)

    // Update state when tenant changes
    useEffect(() => {
        if(tenant) {
            setName(tenant.name)
            setPrimaryColor(tenant.primaryColor)
            setLogoUrl(tenant.logoUrl || '')
        }
    }, [tenant])

    useEffect(() => {
        let mounted = true
        setBillingLoading(true)
        api<{ subscription: typeof subscription; orders: BillingOrder[] }>('/api/admin/billing/overview').then((res) => {
            if (!mounted) return
            if (res.ok) {
                setSubscription(res.data.subscription)
                setBillingOrders(res.data.orders ?? [])
            } else notify(res.error.message, 'error')
            setBillingLoading(false)
        })
        return () => {
            mounted = false
        }
    }, [])

    async function handleLogoFile(file: File) {
        setLogoBusy(true)
        setLogoError(null)
        try {
            if (!file.type.startsWith('image/')) {
                setLogoError('Arquivo inválido (envie uma imagem)')
                return
            }
            const dataUrl = await fileToOptimizedDataUrl(file)
            setLogoUrl(dataUrl)
        } catch {
            setLogoError('Falha ao processar a imagem')
        } finally {
            setLogoBusy(false)
        }
    }

    async function handleSave() {
        setSaving(true)
        setSettingsError(null)
        try {
            const nextName = name.trim()
            const nextPrimaryColor = primaryColor.trim()
            const nextLogo = logoUrl.trim()
            const payload: Record<string, unknown> = {}

            if (!tenant || nextName !== tenant.name) payload.name = nextName
            if (!tenant || nextPrimaryColor !== tenant.primaryColor) payload.primaryColor = nextPrimaryColor
            const currentLogo = (tenant?.logoUrl ?? '') || ''
            if (!tenant || nextLogo !== currentLogo) payload.logoUrl = nextLogo ? nextLogo : null

            if (Object.keys(payload).length === 0) return

            const res = await api<{ tenant: TenantPublic }>('/api/admin/tenant', {
                method: 'PATCH',
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                setSettingsError(res.error.message)
                return
            }

            applyTenantTheme(res.data.tenant)
            onUpdate?.(res.data.tenant)
            notify('Configurações salvas.', 'success')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="settings-page">
            <CustomDomainsSettings />
            <div className="settings-grid">
            <div className="settings-column">
                <div className="card">
                    <div className="cardHeader settings-card-header">
                        <div><h2 className="cardTitle">Identidade visual</h2><p className="cardDesc">Personalize a aparência do seu espaço.</p></div>
                    </div>
                    <div className="cardBody">
                        <div className="form-stack">
                            <div className="input-group">
                                <label className="label" htmlFor="settings-business-name">Nome do espaço</label>
                                <input id="settings-business-name" className="input" value={name} onChange={e => setName(e.target.value)} />
                            </div>

                            <div className="input-group">
                                <div className="label">Logo</div>
                                <div className="settings-logo-field">
                                    <div className="settings-logo-preview">
                                        {logoUrl ? (
                                            <img decoding="async" src={logoUrl} alt="Logo atual do espaço" />
                                        ) : (
                                            <ImageIcon size={24} aria-hidden="true" />
                                        )}
                                        {logoBusy && <div className="spinner settings-logo-spinner" />}
                                    </div>
                                    <div className="settings-logo-controls">
                                        <div className="settings-logo-actions">
                                            <button type="button" className="btn" onClick={() => logoInputRef.current?.click()} disabled={logoBusy}>Trocar logo</button>
                                            {logoUrl && <button type="button" className="icon-btn domain-delete" onClick={() => setLogoUrl('')} aria-label="Remover logo"><Trash2 size={16} /></button>}
                                        </div>
                                        <p className="form-help">PNG, JPG ou WebP. A imagem é redimensionada e comprimida antes do envio.</p>
                                        {logoError && <p className="form-error" role="alert">{logoError}</p>}
                                    </div>
                                    <input type="file" ref={logoInputRef} className="visually-hidden" accept="image/png,image/jpeg,image/webp" onChange={e => { const f = e.target.files?.[0]; if(f) void handleLogoFile(f); e.currentTarget.value = '' }} />
                                </div>
                            </div>

                            <div className="input-group">
                                <div className="label">Cor principal</div>
                                <ColorPicker
                                    value={primaryColor}
                                    onChange={setPrimaryColor}
                                />
                            </div>

                            <div className="form-actions">
                                {settingsError ? <p className="form-error" role="alert">{settingsError}</p> : null}
                                <button type="button" className="btn btnPrimary" onClick={handleSave} disabled={saving || !name.trim()}>
                                    {saving ? 'Salvando...' : 'Salvar alterações'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="settings-column">
                <SecuritySettingsCard />
                <div className="card">
                    <div className="cardHeader">
                        <h2 className="cardTitle">Assinatura</h2>
                        {billingLoading ? (
                            <span className="status-badge skeleton skeleton-pill settings-status-skeleton" />
                        ) : subscription?.status?.toUpperCase?.() === 'ACTIVE' ? (
                            <span className="status-badge status-success">Ativa</span>
                        ) : subscription ? (
                            <span className="status-badge status-warning">{subscription.status}</span>
                        ) : (
                            <span className="status-badge status-warning">Sem assinatura</span>
                        )}
                    </div>
                    <div className="cardBody">
                        <div className="settings-subscription-summary">
                            <div className="settings-subscription-head"><div><span>Plano atual</span><strong>{subscription ? 'Assinatura' : '—'}</strong><small>{subscription ? `Status: ${subscription.status}` : 'Nenhuma assinatura encontrada para este espaço.'}</small></div><span className="billing-plan-mark">ANUAL</span></div>
                            <p>Acesso válido até: <strong>{subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR') : '—'}</strong></p>
                        </div>
                        <p className="billing-note">O plano é anual e a renovação acontece por um novo checkout. Nenhuma cobrança recorrente é iniciada por esta tela.</p>
                    </div>
                </div>

                <div className="card">
                    <div className="cardHeader">
                        <h2 className="cardTitle">Histórico de faturas</h2>
                    </div>
                    <div className="table-scroll">
                        <table className="data-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Valor</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {billingOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={4}>
                                        <EmptyState compact icon={<Wallet size={24}/>} title="Nenhum pagamento registrado" description="Os pedidos e comprovantes aparecerão aqui depois do primeiro checkout." />
                                    </td>
                                </tr>
                            ) : billingOrders.map((order) => {
                                const receiptUrl = configuredExternalLink(order.receiptUrl)
                                const status = order.status.toUpperCase()
                                const statusLabel = status === 'PAID' ? 'Pago' : status === 'PENDING' ? 'Pendente' : status === 'FAILED' ? 'Falhou' : order.status
                                const statusClass = status === 'PAID' ? 'status-success' : status === 'PENDING' ? 'status-pending' : 'status-warning'
                                return (
                                    <tr key={order.orderNsu}>
                                        <td>{new Date(order.paidAt || order.createdAt).toLocaleDateString('pt-BR')}</td>
                                        <td>{formatBRL(order.amountCents / 100)}</td>
                                        <td><span className={`status-badge ${statusClass}`}>{statusLabel}</span></td>
                                        <td>{receiptUrl ? <a className="table-link" href={receiptUrl} target="_blank" rel="noopener noreferrer">Comprovante</a> : '—'}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        </div>
    )
}

function AdminFinance({ professionalId, professionals }: { professionalId: ProfessionalScope; professionals: Professional[] }) {
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')
    const [finance, setFinance] = useState<AdminFinanceData | null>(null)
    const [showTransactionModal, setShowTransactionModal] = useState(false)
    const [showExtractModal, setShowExtractModal] = useState(false)
    const [showGoalsModal, setShowGoalsModal] = useState(false)
    const filters = ['all', 'income', 'expense'] as const

    const loadData = () => {
        setLoading(true)
        api<AdminFinanceData>(scopedApiPath('/api/admin/finance', professionalId)).then(res => {
            if (res.ok) setFinance(res.data)
            setLoading(false)
        })
    }

    useEffect(() => {
        loadData()
    }, [professionalId])

    if (loading && !finance) {
        return (
            <div className="nr-finance-loading">
                <div className="spinner" />
            </div>
        )
    }

    if (!finance) {
        return <EmptyState icon={<Wallet size={24}/>} title="Financeiro indisponível" description="Não foi possível carregar os dados financeiros agora." />
    }

    const current = finance.currentMonth
    const previous = finance.previousMonth
    const growth = previous.entriesCents > 0
        ? Number((((current.entriesCents - previous.entriesCents) / previous.entriesCents) * 100).toFixed(1))
        : current.entriesCents > 0 ? 100 : 0
    const expenseRatio = current.entriesCents > 0 ? (current.expensesCents / current.entriesCents) * 100 : 0
    const averageTicket = current.confirmedAppointments > 0 ? current.serviceEntriesCents / current.confirmedAppointments : 0
    const revenueGoalPercent = Math.min(100, (finance.goals.currentRevenueCents / Math.max(1, finance.goals.revenueCents)) * 100)
    const clientGoalPercent = Math.min(100, (finance.goals.currentNewClients / Math.max(1, finance.goals.newClients)) * 100)
    const activeMonthLabel = financeMonthLabel(finance.currentMonthYm)
    const selectedProfessional = professionalId === 'all' ? null : professionals.find((professional) => professional.id === professionalId) ?? null
    const monthlyFlow = finance.monthly.map((month) => ({
        ...month,
        label: financeMonthLabel(month.ym),
    }))

    const formatFinanceDate = (value: string) => {
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return value
        return new Intl.DateTimeFormat('pt-BR', {
            timeZone: finance.timeZone,
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date).replace('.', '')
    }

    const transactions = [
        ...finance.lastEntries.map(a => ({
            id: `in_${a.id}`,
            title: a.clientName ?? a.clientEmail,
            subtitle: `${a.serviceName}${!selectedProfessional && a.professionalName ? ` · ${a.professionalName}` : ''}`,
            type: 'income' as const,
            amount: a.priceCents,
            at: a.startsAt,
            dateText: formatFinanceDate(a.startsAt),
            category: 'Serviço',
        })),
        ...finance.lastCashTransactions.map(e => ({
            id: `cash_${e.id}`,
            title: e.note?.trim() ? e.note.trim() : (e.type === 'INCOME' ? 'Entrada manual' : 'Saída manual'),
            subtitle: `${e.type === 'INCOME' ? 'Movimentação adicionada' : 'Despesa registrada'}${!selectedProfessional ? ` · ${e.professionalName || 'Caixa geral'}` : ''}`,
            type: e.type.toLowerCase() as 'income' | 'expense',
            amount: e.amountCents,
            at: e.createdAt,
            dateText: formatFinanceDate(e.createdAt),
            category: e.method || 'Manual',
        })),
    ].sort((a, b) => b.at.localeCompare(a.at))

    const filteredTransactions = transactions.filter(t => filter === 'all' || t.type === filter).slice(0, 20)

    const handleDeleteTransaction = async (id: string) => {
        if (!id.startsWith('cash_')) return
        if (!(await confirmAction({ title: 'Excluir movimentação', message: 'A movimentação será removida do financeiro e dos totais apresentados.', confirmLabel: 'Excluir movimentação', danger: true }))) return
        const rawId = id.replace('cash_', '')
        const res = await api<{ ok: true }>(`/api/admin/finance/transactions/${rawId}`, { method: 'DELETE' })
        if (res.ok) loadData()
        else notify('Erro ao excluir: ' + (res.error?.message || 'Desconhecido'), 'error')
    }

    const askAssistant = (prompt: string) => {
        window.dispatchEvent(new CustomEvent('naregua:assistant-open', { detail: { prompt } }))
    }

    return (
        <div className="nr-finance">
            <section className="nr-finance-hero">
                <div className="nr-finance-hero-copy">
                    <span className="nr-finance-eyebrow">{selectedProfessional ? `Produção individual · ${activeMonthLabel}` : `Caixa do salão · ${activeMonthLabel}`}</span>
                    <h2>{selectedProfessional ? `Números de ${selectedProfessional.nickname || selectedProfessional.name}, sem misturar agendas.` : 'O caixa, explicado pelo que aconteceu.'}</h2>
                    <p>{selectedProfessional ? 'Serviços e movimentações atribuídas a este profissional, com a mesma leitura usada no consolidado.' : 'Entradas, saídas e serviços confirmados em uma visão direta, rastreável e pronta para decisão.'}</p>
                </div>
                <div className="nr-finance-actions">
                    <button type="button" className="nr-finance-btn is-primary" onClick={() => setShowTransactionModal(true)}>
                        <Plus size={16} /> Nova movimentação
                    </button>
                    <button type="button" className="nr-finance-btn" onClick={() => setShowExtractModal(true)}>
                        <Download size={16} /> Extrato
                    </button>
                    <button type="button" className="nr-finance-btn is-assistant" onClick={() => askAssistant('Analise meu financeiro deste mês. Compare com o mês anterior, destaque o que merece atenção e me dê no máximo 3 próximos passos práticos.')}>
                        <Sparkles size={16} /> Analisar com Mestre AI
                    </button>
                </div>
            </section>

            <section className="nr-finance-kpis" aria-label="Resumo financeiro do mês">
                <article className="nr-finance-kpi is-income">
                    <span>Entradas do mês</span>
                    <strong>{formatBRL(current.entriesCents / 100)}</strong>
                    <small className={growth >= 0 ? 'is-positive' : 'is-negative'}>{growth >= 0 ? '+' : ''}{growth}% vs. {financeMonthLabel(previous.ym)}</small>
                </article>
                <article className="nr-finance-kpi is-expense">
                    <span>Saídas do mês</span>
                    <strong>{formatBRL(current.expensesCents / 100)}</strong>
                    <small>{expenseRatio.toFixed(1).replace('.', ',')}% das entradas registradas</small>
                </article>
                <article className="nr-finance-kpi is-balance">
                    <span>Saldo do mês</span>
                    <strong>{formatBRL(current.balanceCents / 100)}</strong>
                    <small>Entradas registradas − saídas registradas</small>
                </article>
                <article className="nr-finance-kpi is-goal">
                    <span>{selectedProfessional ? 'Atendimentos confirmados' : 'Meta de faturamento'}</span>
                    <strong>{selectedProfessional ? current.confirmedAppointments : `${Math.round(revenueGoalPercent)}%`}</strong>
                    {selectedProfessional ? null : <div className="nr-finance-mini-progress"><i style={{ width: `${revenueGoalPercent}%` }} /></div>}
                    <small>{selectedProfessional ? `Ticket médio de ${formatBRL(averageTicket / 100)}` : `${formatBRL(finance.goals.currentRevenueCents / 100)} de ${formatBRL(finance.goals.revenueCents / 100)}`}</small>
                </article>
            </section>

            <div className="nr-finance-primary-grid">
                <section className="nr-finance-panel nr-finance-flow-panel">
                    <header className="nr-finance-panel-head">
                        <div>
                            <span className="nr-finance-panel-kicker">Últimos 6 meses</span>
                            <h3>Entradas x saídas</h3>
                        </div>
                        <div className="nr-finance-legend" aria-label="Legenda do gráfico">
                            <span><i className="is-entry" />Entradas</span>
                            <span><i className="is-expense" />Saídas</span>
                            <span><i className="is-balance" />Saldo</span>
                        </div>
                    </header>
                    <FinanceFlowChart
                        data={monthlyFlow}
                        currentMonthYm={finance.currentMonthYm}
                        formatCurrency={formatBRL}
                    />
                </section>

                <aside className="nr-finance-panel nr-finance-reading">
                    <header className="nr-finance-panel-head">
                        <div>
                            <span className="nr-finance-panel-kicker">Leitura do mês</span>
                            <h3>De onde o número vem</h3>
                        </div>
                        <BarChart3 size={19} />
                    </header>
                    <div className="nr-finance-reading-list">
                        <div><span>Serviços confirmados</span><strong>{formatBRL(current.serviceEntriesCents / 100)}</strong></div>
                        <div><span>Entradas manuais</span><strong>{formatBRL(current.manualIncomeCents / 100)}</strong></div>
                        <div><span>Ticket médio dos serviços</span><strong>{formatBRL(averageTicket / 100)}</strong></div>
                        <div><span>Agendamentos confirmados</span><strong>{current.confirmedAppointments}</strong></div>
                    </div>
                    <button type="button" className="nr-finance-assistant-card" onClick={() => askAssistant('Explique de forma simples a composição do meu financeiro deste mês: serviços confirmados, entradas manuais, despesas e saldo. Aponte qualquer sinal fora do normal.') }>
                        <span><Sparkles size={16} /> Perguntar ao Mestre sobre estes números</span>
                        <ArrowRight size={15} />
                    </button>
                    <p className="nr-finance-definition">Saldo não é lucro contábil: ele representa as entradas e saídas que estão registradas no NaRégua.</p>
                </aside>
            </div>

            <div className="nr-finance-secondary-grid">
                <section className="nr-finance-panel nr-finance-transactions">
                    <header className="nr-finance-panel-head nr-finance-transactions-head">
                        <div>
                            <span className="nr-finance-panel-kicker">Movimentação</span>
                            <h3>Últimos registros</h3>
                        </div>
                        <div className="nr-finance-filter-group">
                            {filters.map(f => (
                                <button type="button" key={f} onClick={() => setFilter(f)} className={filter === f ? 'is-active' : ''}>
                                    {f === 'all' ? 'Tudo' : f === 'income' ? 'Entradas' : 'Saídas'}
                                </button>
                            ))}
                        </div>
                    </header>
                    <div className="nr-finance-transaction-list">
                        {filteredTransactions.length === 0 ? (
                            <EmptyState compact icon={<Wallet size={24}/>} title="Nada por aqui ainda" description="Os registros financeiros do período aparecerão nesta lista." />
                        ) : filteredTransactions.map((transaction) => (
                            <article className="nr-finance-transaction" key={transaction.id}>
                                <div className={`nr-finance-transaction-sign ${transaction.type}`} aria-hidden="true">{transaction.type === 'income' ? '+' : '−'}</div>
                                <div className="nr-finance-transaction-copy">
                                    <strong>{transaction.title}</strong>
                                    <span>{transaction.subtitle} · {transaction.category}</span>
                                </div>
                                <time>{transaction.dateText}</time>
                                <strong className={`nr-finance-transaction-value ${transaction.type}`}>{transaction.type === 'income' ? '+' : '−'}{formatBRL(transaction.amount / 100)}</strong>
                                {transaction.id.startsWith('cash_') ? (
                                    <button type="button" className="nr-finance-delete" onClick={() => handleDeleteTransaction(transaction.id)} aria-label="Excluir movimentação" title="Excluir movimentação">
                                        <Trash2 size={15} />
                                    </button>
                                ) : <span className="nr-finance-delete-placeholder" />}
                            </article>
                        ))}
                    </div>
                    <button type="button" className="nr-finance-inline-action" onClick={() => setShowExtractModal(true)}>Abrir extrato completo <ArrowRight size={14} /></button>
                </section>

                <aside className="nr-finance-side-stack">
                    <section className="nr-finance-panel nr-finance-goals">
                        <header className="nr-finance-panel-head">
                            <div>
                                <span className="nr-finance-panel-kicker">{selectedProfessional ? 'Produção' : 'Metas'}</span>
                                <h3>{selectedProfessional ? 'Ritmo individual' : 'Ritmo do mês'}</h3>
                            </div>
                            {!selectedProfessional ? <button type="button" className="nr-finance-icon-btn" onClick={() => setShowGoalsModal(true)} aria-label="Editar metas"><Edit2 size={15} /></button> : null}
                        </header>
                        {selectedProfessional ? <div className="nr-finance-scope-summary">
                            <div><span>Serviços confirmados</span><strong>{current.confirmedAppointments}</strong></div>
                            <div><span>Ticket médio</span><strong>{formatBRL(averageTicket / 100)}</strong></div>
                            <div><span>Saldo atribuído</span><strong>{formatBRL(current.balanceCents / 100)}</strong></div>
                        </div> : <><div className="nr-finance-goal">
                            <div><span>Faturamento</span><strong>{Math.round(revenueGoalPercent)}%</strong></div>
                            <div className="nr-finance-progress"><i style={{ width: `${revenueGoalPercent}%` }} /></div>
                            <small>{formatBRL(finance.goals.currentRevenueCents / 100)} de {formatBRL(finance.goals.revenueCents / 100)}</small>
                        </div>
                        <div className="nr-finance-goal is-client">
                            <div><span>Novos clientes</span><strong>{Math.round(clientGoalPercent)}%</strong></div>
                            <div className="nr-finance-progress"><i style={{ width: `${clientGoalPercent}%` }} /></div>
                            <small>{finance.goals.currentNewClients} de {finance.goals.newClients} clientes</small>
                        </div>
                        <button type="button" className="nr-finance-inline-action" onClick={() => askAssistant('Com base no meu financeiro atual e nas minhas metas deste mês, o que eu deveria priorizar para chegar mais perto da meta sem depender de descontos?')}>Como chegar na meta? <Sparkles size={14} /></button></>}
                    </section>

                    <section className="nr-finance-panel nr-finance-expenses">
                        <header className="nr-finance-panel-head">
                            <div>
                                <span className="nr-finance-panel-kicker">Saídas</span>
                                <h3>Principais categorias</h3>
                            </div>
                            <Wallet size={18} />
                        </header>
                        {finance.expenseCategories.length ? (
                            <div className="nr-finance-expense-list">
                                {finance.expenseCategories.map((category) => {
                                    const pct = current.expensesCents > 0 ? (category.amountCents / current.expensesCents) * 100 : 0
                                    return (
                                        <div key={category.label}>
                                            <div><span>{category.label}</span><strong>{formatBRL(category.amountCents / 100)}</strong></div>
                                            <div className="nr-finance-expense-track"><i style={{ width: `${Math.min(100, pct)}%` }} /></div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="nr-finance-empty-copy">Nenhuma saída manual foi registrada em {activeMonthLabel}.</p>
                        )}
                    </section>
                </aside>
            </div>

            {showTransactionModal && <NewTransactionModal isOpen={true} onClose={() => setShowTransactionModal(false)} onSuccess={loadData} todayYmd={finance.todayYmd} professionalId={professionalId} professionals={professionals} />}
            {showExtractModal && <ExtractModal isOpen={true} onClose={() => setShowExtractModal(false)} todayYmd={finance.todayYmd} currentMonthYm={finance.currentMonthYm} timeZone={finance.timeZone} professionalId={professionalId} />}
            {showGoalsModal && !selectedProfessional && (
                <GoalsModal
                    isOpen={true}
                    onClose={() => setShowGoalsModal(false)}
                    onSuccess={loadData}
                    initialRevenue={finance.goals.revenueCents}
                    initialNewClients={finance.goals.newClients}
                />
            )}
        </div>
    )
}

function LegalAcceptanceGate({ documents, onAccepted }: { documents: { termsVersion: string; privacyVersion: string; bundleHash: string }; onAccepted: () => void }) {
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function acceptCurrentDocuments() {
    if (!checked || busy) return
    setBusy(true)
    setError(null)
    const res = await api<{ ok: true }>('/api/auth/legal-acceptance', {
      method: 'POST',
      body: JSON.stringify({ accepted: true, termsVersion: documents.termsVersion, privacyVersion: documents.privacyVersion, bundleHash: documents.bundleHash }),
    })
    setBusy(false)
    if (!res.ok) { setError(res.error.message); return }
    onAccepted()
  }

  return <main className="legal-acceptance-screen">
    <section className="legal-acceptance-card" aria-labelledby="legal-acceptance-title">
      <div className="security-settings-icon"><ShieldCheck size={20} aria-hidden="true" /></div>
      <span>Documentos da plataforma</span>
      <h1 id="legal-acceptance-title">Revise a versão vigente antes de continuar.</h1>
      <p>Os Termos de Uso ou a Política de Privacidade desta conta precisam de aceite na versão atual. Marketing permanece uma escolha separada.</p>
      <div className="legal-acceptance-links"><a href="/termos" target="_blank" rel="noopener noreferrer">Ler Termos de Uso</a><a href="/privacidade" target="_blank" rel="noopener noreferrer">Ler Política de Privacidade</a></div>
      <label className="legal-acceptance-check"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /><span>Li e aceito os Termos de Uso e declaro ciência da Política de Privacidade vigentes.</span></label>
      <small>Termos {documents.termsVersion} · Privacidade {documents.privacyVersion}</small>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button type="button" className="btn btnPrimary" onClick={() => void acceptCurrentDocuments()} disabled={!checked || busy}>{busy ? 'Registrando aceite…' : 'Aceitar e continuar'}</button>
    </section>
  </main>
}

type AdminTab = 'dashboard' | 'calendar' | 'services' | 'professionals' | 'clients' | 'finance' | 'settings' | 'evolution' | 'billing' | 'assistant' | 'referrals'

const ADMIN_TAB_PATH: Record<AdminTab, string> = {
  dashboard: '/admin',
  calendar: '/admin/agenda',
  services: '/admin/servicos',
  professionals: '/admin/equipe',
  clients: '/admin/clientes',
  finance: '/admin/caixa',
  settings: '/admin/configuracoes',
  evolution: '/admin/whatsapp',
  billing: '/admin/assinatura',
  assistant: '/admin/mestre',
  referrals: '/admin/indicacoes',
}

function adminTabFromPath(pathname: string): AdminTab {
  const normalized = pathname.replace(/\/+$/, '') || '/admin'
  const match = (Object.entries(ADMIN_TAB_PATH) as Array<[AdminTab, string]>).find(([, path]) => path === normalized)
  return match?.[0] ?? 'dashboard'
}

function Admin(props: { tenant?: TenantPublic; tenantSlug?: string; basePath?: string } = {}) {
  const nav = useNavigate()
  const location = useLocation()
  const tab = adminTabFromPath(location.pathname)
  const openTab = (nextTab: AdminTab, options?: { replace?: boolean; search?: string }) => {
    nav(`${ADMIN_TAB_PATH[nextTab]}${options?.search ?? ''}`, { replace: options?.replace })
  }
  const [me, setMe] = useState<SessionUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [legalGateLoading, setLegalGateLoading] = useState(true)
  const [adminLegalPreferences, setAdminLegalPreferences] = useState<LegalPreferencesState | null>(null)
  const [legalGateError, setLegalGateError] = useState<string | null>(null)
  const [tenant, setTenant] = useState<TenantPublic | null>(null)
  const [isTestMode, setIsTestMode] = useState(() => {
    if (typeof window !== 'undefined') return readStorage('naregua:test-mode') === 'true'
    return false
  })
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<ProfessionalScope>('all')
  const adminTourSteps = useMemo(() => shellTourSteps('admin', tab), [tab])

  function loadStats() {
    api<AdminStats>(scopedApiPath('/api/admin/dashboard', selectedProfessionalId)).then(res => {
        if(res.ok) setStats(res.data)
    })
  }

  function loadProfessionals() {
    api<{ professionals: Professional[] }>('/api/admin/professionals').then((res) => {
      if (!res.ok) return
      setProfessionals(res.data.professionals)
      if (selectedProfessionalId !== 'all' && !res.data.professionals.some((professional) => professional.id === selectedProfessionalId && professional.active)) setSelectedProfessionalId('all')
    })
  }

  async function loadAdminLegalPreferences() {
    setLegalGateLoading(true)
    setLegalGateError(null)
    const res = await api<LegalPreferencesState>('/api/auth/legal-preferences')
    if (res.ok) setAdminLegalPreferences(res.data)
    else {
      setAdminLegalPreferences(null)
      setLegalGateError(res.error.message)
    }
    setLegalGateLoading(false)
  }

  useEffect(() => {
    setAppMode('admin')
    if(props.tenant) {
        setTenant(props.tenant)
        applyTenantTheme(props.tenant)
    }
    api<{ user: SessionUser | null; isTestMode?: boolean }>('/api/auth/me').then(res => {
        if(res.ok) {
            setMe(res.data.user)
            if (res.data.user?.role === 'ADMIN') void loadAdminLegalPreferences()
            else setLegalGateLoading(false)
            if (typeof res.data.isTestMode === 'boolean') {
                const serverMode = res.data.isTestMode
                setIsTestMode(serverMode)
                writeStorage('naregua:test-mode', String(serverMode))
            }
        }
        else {
             // Redirect immediately if not logged in to avoid hanging state
             setLegalGateLoading(false)
             nav('/login')
             return
        }
        setAuthLoading(false)
    })

    loadProfessionals()
  }, [])

  useEffect(() => {
    loadStats()
  }, [selectedProfessionalId])

  useEffect(() => {
    if (authLoading || !me || me.role !== 'ADMIN' || typeof window === 'undefined') return
    const params = new URLSearchParams(location.search)
    if (params.get('assistantCredits') !== 'return') return
    if (tab !== 'assistant') {
      openTab('assistant', { replace: true, search: location.search })
      return
    }
    const orderNsu = readStorage('naregua:pending-assistant-credit-order')
    if (!orderNsu) return
    api<{ order: { status: string; credits: number }; balance: number }>(`/api/admin/assistant/credits/order-status?orderNsu=${encodeURIComponent(orderNsu)}`).then((result) => {
      if (!result.ok) return
      if (result.data.order.status === 'PAID') {
        removeStorage('naregua:pending-assistant-credit-order')
        notify(`${result.data.order.credits} créditos do Mestre AI adicionados. Saldo extra: ${result.data.balance}.`, 'success')
      } else {
        notify('Pagamento recebido. Os créditos serão liberados assim que a InfinitePay confirmar a transação.', 'info')
      }
    })
  }, [authLoading, me, location.search, tab])

  const subscriptionActive = Boolean(me && (String(me.subscriptionStatus ?? '').toUpperCase() === 'ACTIVE' || isTestMode))
  const subscriptionInactive = Boolean(me?.role === 'ADMIN' && !subscriptionActive)

  useEffect(() => {
    if (subscriptionInactive && tab !== 'billing') openTab('billing', { replace: true })
  }, [subscriptionInactive, tab])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia('(max-width: 900px)').matches) return
    document.getElementById('main-content')?.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [tab])

  if (authLoading) {
      return (
        <Shell
          title="Visão Geral"
          subtitle="Gestão do Espaço"
          user={me}
          brand={tenant}
          isTestMode={isTestMode}
          sidebar={
            <div className="nr-nav-group">
              <div className="nr-nav-section">Principal</div>
              <SidebarItem active icon={<LayoutDashboard size={18}/>} label="Dashboard" onClick={() => {}} />
              <SidebarItem icon={<Calendar size={18}/>} label="Agenda" onClick={() => {}} />
              <SidebarItem icon={<Users size={18}/>} label="Clientes" onClick={() => {}} />
            </div>
          }
        >
          <div className="nr-shell-loading-grid">
            <div className="card skeleton-card skeleton" />
            <div className="card skeleton-card skeleton" />
            <div className="card skeleton-card skeleton" />
          </div>
        </Shell>
      )
  }

  if (!me || me.role !== 'ADMIN') {
      return (
          <div className="nr-auth-loading">
              <div className="nr-auth-loading-card">
                  <div className="text-center">
                      <h1 className="nr-auth-title">Acesso negado</h1>
                      <p className="nr-auth-subtitle">Área restrita para administradores.</p>
                      <button type="button" className="btn btnPrimary w-full" onClick={() => nav('/login')}>Ir para login</button>
                  </div>
              </div>
          </div>
      )
  }

  const legalAcceptanceCurrent = Boolean(adminLegalPreferences?.latestAcceptance
    && adminLegalPreferences.latestAcceptance.termsVersion === adminLegalPreferences.currentDocuments.termsVersion
    && adminLegalPreferences.latestAcceptance.privacyVersion === adminLegalPreferences.currentDocuments.privacyVersion
    && adminLegalPreferences.latestAcceptance.bundleHash === adminLegalPreferences.currentDocuments.bundleHash)

  if (legalGateLoading) {
    return <div className="nr-auth-loading"><div className="nr-auth-loading-card skeleton skeleton-card nr-auth-loading-skeleton" /></div>
  }

  if (legalGateError || !adminLegalPreferences) {
    return <main className="legal-acceptance-screen"><section className="legal-acceptance-card"><div className="security-settings-icon"><ShieldCheck size={20} aria-hidden="true" /></div><span>Verificação necessária</span><h1>Não foi possível validar os documentos da conta.</h1><p>{legalGateError ?? 'Tente novamente antes de acessar o painel.'}</p><button type="button" className="btn btnPrimary" onClick={() => void loadAdminLegalPreferences()}>Tentar novamente</button></section></main>
  }

  if (!legalAcceptanceCurrent) {
    return <LegalAcceptanceGate documents={adminLegalPreferences.currentDocuments} onAccepted={() => void loadAdminLegalPreferences()} />
  }

  return (
    <Shell
        title={subscriptionInactive ? 'Assinatura' : ({dashboard: 'Visão geral', calendar: 'Agenda', services: 'Cortes & serviços', professionals: 'Profissionais', clients: 'Clientes', finance: 'Caixa', settings: 'Configurações', evolution: 'WhatsApp', billing: 'Assinatura', assistant: 'Mestre AI', referrals: 'Indicações'} as const)[tab]}
        subtitle="Gestão da barbearia"
        user={me}
        brand={tenant}
        isTestMode={isTestMode}
        tourKey={`admin-${tab}`}
        tourSteps={adminTourSteps}
        tourEnabled={!subscriptionInactive && tab !== 'billing'}
        autoStartTour={!subscriptionInactive && tab === 'dashboard'}
        actions={!subscriptionInactive && ['dashboard', 'calendar', 'clients', 'finance'].includes(tab) ? <TeamScopeSelect professionals={professionals} value={selectedProfessionalId} onChange={setSelectedProfessionalId} /> : undefined}
        mobileNav={subscriptionInactive ? undefined : [
          { key: 'dashboard', label: 'Início', icon: <LayoutDashboard size={21}/>, active: tab === 'dashboard', onClick: () => openTab('dashboard') },
          { key: 'calendar', label: 'Agenda', icon: <Calendar size={21}/>, active: tab === 'calendar', onClick: () => openTab('calendar') },
          { key: 'clients', label: 'Clientes', icon: <Users size={21}/>, active: tab === 'clients', onClick: () => openTab('clients') },
          { key: 'evolution', label: 'WhatsApp', icon: <MessageSquare size={21}/>, active: tab === 'evolution', onClick: () => openTab('evolution') },
        ]}
        mobileMoreActive={!subscriptionInactive && !['dashboard', 'calendar', 'clients', 'evolution'].includes(tab)}
        sidebar={
            <div className="nr-nav-group">
                {subscriptionInactive ? (
                  <>
                    <div className="nr-nav-section">Conta</div>
                    <SidebarItem active icon={<CreditCard size={18}/>} label="Ativar assinatura" onClick={() => openTab('billing')} />
                  </>
                ) : (
                  <>
                    <div className="nr-nav-section">Principal</div>
                    <SidebarItem active={tab === 'dashboard'} icon={<LayoutDashboard size={18}/>} label="Visão geral" onClick={() => openTab('dashboard')} />
                    <SidebarItem active={tab === 'calendar'} icon={<Calendar size={18}/>} label="Agenda" onClick={() => openTab('calendar')} />
                    <SidebarItem active={tab === 'clients'} icon={<Users size={18}/>} label="Clientes" onClick={() => openTab('clients')} />
                    <div className="nr-nav-section nr-nav-section--spaced">Gestão</div>
                    <SidebarItem active={tab === 'services'} icon={<Scissors size={18}/>} label="Cortes & serviços" onClick={() => openTab('services')} />
                    <SidebarItem active={tab === 'professionals'} icon={<Users size={18}/>} label="Profissionais" onClick={() => openTab('professionals')} />
                    <SidebarItem active={tab === 'finance'} icon={<Wallet size={18}/>} label="Caixa" onClick={() => openTab('finance')} />
                    <SidebarItem active={tab === 'evolution'} icon={<MessageSquare size={18}/>} label="WhatsApp" onClick={() => openTab('evolution')} />
                    <SidebarItem active={tab === 'assistant'} icon={<Sparkles size={18}/>} label="Mestre AI" onClick={() => openTab('assistant')} />
                    <div className="nr-nav-section nr-nav-section--spaced">Sistema</div>
                    <SidebarItem active={tab === 'referrals'} icon={<HeartHandshake size={18}/>} label="Indicações" onClick={() => openTab('referrals')} />
                    <SidebarItem active={tab === 'billing'} icon={<CreditCard size={18}/>} label="Assinatura" onClick={() => openTab('billing')} />
                    <SidebarItem active={tab === 'settings'} icon={<Settings size={18}/>} label="Configurações" onClick={() => openTab('settings')} />
                  </>
                )}
                <SidebarItem icon={<LogOut size={18}/>} label="Sair" onClick={async () => {
                     await api('/api/auth/logout', {method: 'POST'})
                     window.location.href = '/'
                }} />
            </div>
        }
    >
        {subscriptionInactive ? (
            <BillingCenter locked />
        ) : (
            <>
                {['dashboard', 'calendar', 'clients', 'finance'].includes(tab) ? <div className="nr-mobile-team-scope"><TeamScopeSelect professionals={professionals} value={selectedProfessionalId} onChange={setSelectedProfessionalId} /></div> : null}
                {tab === 'dashboard' ? <AdminDashboard me={me} stats={stats} selectedProfessional={selectedProfessionalId === 'all' ? null : professionals.find((professional) => professional.id === selectedProfessionalId) ?? null} onRefresh={loadStats} onOpenAgenda={() => openTab('calendar')} /> : null}

                {tab === 'services' ? <AdminServices /> : null}

                {tab === 'professionals' ? <ProfessionalManager onChanged={(nextProfessionals) => {
                  setProfessionals(nextProfessionals)
                  const ownProfile = me ? nextProfessionals.find((professional) => professional.userId === me.id) : null
                  if (ownProfile) setMe((current) => current ? { ...current, name: ownProfile.nickname || ownProfile.name, photoUrl: ownProfile.photoUrl, professionalColor: ownProfile.color, professionalId: ownProfile.id } : current)
                  if (selectedProfessionalId !== 'all' && !nextProfessionals.some((professional) => professional.id === selectedProfessionalId && professional.active)) setSelectedProfessionalId('all')
                }} /> : null}

                {tab === 'clients' ? <AdminClients professionalId={selectedProfessionalId} /> : null}

                {tab === 'finance' ? <AdminFinance professionalId={selectedProfessionalId} professionals={professionals} /> : null}

                {tab === 'calendar' ? <AdminCalendar professionalId={selectedProfessionalId} professionals={professionals} onOpenProfessionals={() => openTab('professionals')} /> : null}

                {tab === 'evolution' ? <AdminEvolutionAPI /> : null}

                {tab === 'assistant' ? <BusinessAssistant /> : null}

                {tab === 'referrals' ? <ReferralCenter /> : null}

                {tab === 'billing' ? <BillingCenter /> : null}

                {tab === 'settings' ? (
                    <AdminSettings tenant={tenant} onUpdate={(updatedTenant) => {
                        setTenant(updatedTenant)
                        applyTenantTheme(updatedTenant)
                    }} />
                ) : null}
                <WorkspaceSetup tenant={tenant} onComplete={(updatedTenant) => {
                  if (updatedTenant) {
                    setTenant(updatedTenant)
                    applyTenantTheme(updatedTenant)
                  }
                  loadStats()
                }} />
                {tab !== 'assistant' && tab !== 'evolution' ? <AssistantChatLauncher /> : null}
            </>
        )}
    </Shell>
  )
}

function NewTenantModal({
    isOpen,
    onClose,
    onSuccess
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [submitError, setSubmitError] = useState<string | null>(null)
    const [logoError, setLogoError] = useState<string | null>(null)
    const [logoBusy, setLogoBusy] = useState(false)
    const [logoMode, setLogoMode] = useState<'upload' | 'url'>('upload')
    const [logoFileName, setLogoFileName] = useState<string | null>(null)
    const logoFileInputRef = useRef<HTMLInputElement | null>(null)
    const [data, setData] = useState({
        name: '',
        slug: '',
        adminEmail: '',
        adminPhone: '',
        adminPassword: '',
        primaryColor: '#d7784a', // NaRégua default
        logoUrl: ''
    })

    useEffect(() => {
        if (isOpen) return
        setStep(1)
        setLoading(false)
        setSubmitError(null)
        setLogoError(null)
        setLogoBusy(false)
        setLogoMode('upload')
        setLogoFileName(null)
        setData({ name: '', slug: '', adminEmail: '', adminPhone: '', adminPassword: '', primaryColor: '#d7784a', logoUrl: '' })
        if (logoFileInputRef.current) logoFileInputRef.current.value = ''
    }, [isOpen])

    if (!isOpen) return null

    async function fileToOptimizedDataUrl(file: File) {
        return optimizeImageFile(file, { maxBytes: 180_000, maxDimension: 512, quality: .82 })
    }

    async function handleLogoFile(file: File) {
        setLogoBusy(true)
        setLogoError(null)
        setSubmitError(null)
        try {
            if (!file.type.startsWith('image/')) {
                setLogoError('Arquivo inválido (envie uma imagem)')
                return
            }
            const dataUrl = await fileToOptimizedDataUrl(file)
            if (!dataUrl.startsWith('data:image/')) {
                setLogoError('Falha ao processar a imagem')
                return
            }
            if (dataUrl.length > 250_000) {
                setLogoError('Imagem muito grande. Use uma menor.')
                return
            }
            setLogoFileName(file.name)
            setData((d) => ({ ...d, logoUrl: dataUrl }))
        } catch {
            setLogoError('Falha ao processar a imagem')
        } finally {
            setLogoBusy(false)
        }
    }

    async function handleSubmit() {
        setLoading(true)
        setSubmitError(null)
        try {
            const res = await api<{ tenant: TenantPublic } | { tenant: TenantDev }>('/api/dev/tenants', {
                method: 'POST',
                body: JSON.stringify({
                    name: data.name,
                    slug: data.slug,
                    adminEmail: data.adminEmail,
                    adminPhone: data.adminPhone,
                    adminPassword: data.adminPassword,
                    primaryColor: data.primaryColor,
                    logoUrl: data.logoUrl
                })
            })

            if (!res.ok) {
                setSubmitError(res.error.message)
                return
            }
            onSuccess()
            onClose()
        } catch {
            setSubmitError('Erro ao criar espaço')
        } finally {
            setLoading(false)
        }
    }

    return (
        <ModalRoot onClick={loading ? undefined : onClose}>
            <div className="nr-dialog nr-dialog--tenant" role="dialog" aria-modal="true" aria-labelledby="new-tenant-title" onClick={e => e.stopPropagation()}>
                <header className="nr-dialog-header tenant-create-header">
                    <div className="tenant-create-heading">
                        <h3 id="new-tenant-title" className="cardTitle">Novo espaço</h3>
                        <div className="modal-heading-actions"><div className="pill tenant-step-pill">Passo {step} de 2</div><button type="button" className="icon-btn modal-close" onClick={onClose} aria-label="Fechar" disabled={loading}><X size={18}/></button></div>
                    </div>
                    <p className="tenant-create-subtitle">
                        {step === 1 ? 'Informações básicas e acesso' : 'Personalização da marca'}
                    </p>
                </header>

                <div className="nr-dialog-body tenant-create-body">
                    {step === 1 ? (
                        <div className="form-stack">
                            <div className="input-group">
                                <label className="label" htmlFor="new-tenant-name">Nome do espaço</label>
                                <div className="input-wrapper">
                                    <input
                                        id="new-tenant-name"
                                        className="input"
                                        value={data.name}
                                        onChange={e => setData({...data, name: e.target.value})}
                                        placeholder="Ex: Barbearia Central"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label className="label" htmlFor="new-tenant-slug">Endereço do espaço</label>
                                <div className="tenant-slug-field">
                                    <input id="new-tenant-slug" className="input" value={data.slug} onChange={e => setData({...data, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} placeholder="barbearia-central" />
                                    <span aria-label="Domínio final">.{configuredPlatformHostname()}</span>
                                </div>
                            </div>

                            <div className="tenant-access-grid">
                                <div className="input-group">
                                    <label className="label" htmlFor="new-tenant-email">Email administrativo</label>
                                    <input id="new-tenant-email" className="input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={data.adminEmail} onChange={e => setData({...data, adminEmail: e.target.value})} />
                                </div>
                                <div className="input-group">
                                    <label className="label" htmlFor="new-tenant-phone">WhatsApp administrativo</label>
                                    <input id="new-tenant-phone" className="input" inputMode="tel" autoComplete="tel" value={data.adminPhone} onChange={e => setData({...data, adminPhone: formatBrazilPhoneInput(e.target.value)})} placeholder="(11) 99999-9999" aria-invalid={Boolean(data.adminPhone && !normalizeBrazilPhone(data.adminPhone))} />
                                </div>
                                <div className="input-group">
                                    <label className="label" htmlFor="new-tenant-password">Senha administrativa</label>
                                    <input id="new-tenant-password" className="input" type="password" autoComplete="new-password" minLength={8} aria-describedby="tenant-admin-password-requirements" value={data.adminPassword} onChange={e => setData({...data, adminPassword: e.target.value})} />
                                    <PasswordChecklist id="tenant-admin-password-requirements" password={data.adminPassword} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="form-stack">
                            <div className="input-group">
                                <div className="label">Cor principal</div>
                                <ColorPicker
                                    value={data.primaryColor}
                                    onChange={(c) => setData({...data, primaryColor: c})}
                                />
                            </div>

                            <div className="input-group">
                                <div className="label">Logo (opcional)</div>
                                <div className="tenant-logo-mode-actions">
                                    <button
                                        type="button"
                                        className={`btn${logoMode === 'upload' ? ' is-selected' : ''}`}
                                        onClick={() => {
                                            setLogoMode('upload')
                                            setLogoError(null)
                                        }}
                                        aria-pressed={logoMode === 'upload'}
                                    >
                                        Enviar arquivo
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn${logoMode === 'url' ? ' is-selected' : ''}`}
                                        onClick={() => {
                                            setLogoMode('url')
                                            setLogoError(null)
                                        }}
                                        aria-pressed={logoMode === 'url'}
                                    >
                                        Usar URL
                                    </button>
                                    {(data.logoUrl || logoFileName) && (
                                        <button
                                            type="button"
                                            className="btn"
                                            onClick={() => {
                                                setLogoError(null)
                                                setLogoFileName(null)
                                                setData((d) => ({ ...d, logoUrl: '' }))
                                                if (logoFileInputRef.current) logoFileInputRef.current.value = ''
                                            }}
                                        >
                                            Remover
                                        </button>
                                    )}
                                </div>

                                {logoMode === 'upload' ? (
                                    <div className="tenant-logo-source">
                                        <div className="tenant-logo-upload-row">
                                            <button
                                                type="button"
                                                className="btn"
                                                disabled={logoBusy}
                                                onClick={() => logoFileInputRef.current?.click()}
                                            >
                                                {logoBusy ? 'Processando...' : 'Escolher imagem'}
                                            </button>
                                            <div className="tenant-logo-file-name">
                                                {logoFileName ? logoFileName : data.logoUrl?.startsWith('data:image/') ? 'Imagem carregada' : 'PNG/JPG/WebP'}
                                            </div>
                                        </div>
                                        <input
                                            ref={logoFileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="visually-hidden"
                                            onChange={(e) => {
                                                const f = e.target.files?.[0]
                                                if (!f) return
                                                handleLogoFile(f)
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="tenant-logo-source">
                                        <div className="input-wrapper">
                                            <input
                                                className="input"
                                                type="url"
                                                inputMode="url"
                                                aria-label="URL da logo"
                                                value={data.logoUrl}
                                                onChange={(e) => {
                                                    setLogoError(null)
                                                    setLogoFileName(null)
                                                    setData({ ...data, logoUrl: e.target.value })
                                                }}
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>
                                )}

                                {logoError && (
                                    <div className="nr-form-error tenant-logo-error" role="alert">{logoError}</div>
                                )}
                            </div>

                            <div className="tenant-brand-preview" style={{ '--tenant-preview-accent': data.primaryColor } as CSSProperties}>
                                <div className="tenant-brand-preview-label">Prévia</div>
                                <div className="tenant-brand-preview-row">
                                    <div className="tenant-brand-preview-logo">
                                        {data.logoUrl ? (
                                            <img decoding="async"
                                                src={data.logoUrl}
                                                alt="Logo"
                                                className="tenant-brand-preview-image"
                                                onError={() => setLogoError('Logo inválida (URL ou imagem)')}
                                            />
                                        ) : (
                                            <ImageIcon size={18} />
                                        )}
                                    </div>
                                    <div className="tenant-brand-preview-copy">
                                        <strong>{data.name || 'Seu espaço'}</strong>
                                        <span>{data.slug ? `${data.slug}.${configuredPlatformHostname()}` : `espaco.${configuredPlatformHostname()}`}</span>
                                    </div>
                                </div>
                                <span className="btn tenant-brand-preview-button" aria-hidden="true">Botão principal</span>
                            </div>
                        </div>
                    )}

                    {submitError && (
                        <div className="nr-form-error tenant-submit-error" role="alert">
                            {submitError}
                        </div>
                    )}
                </div>

                <footer className="nr-dialog-footer tenant-create-footer">
                    {step === 2 ? (
                        <button type="button" className="btn" onClick={() => setStep(1)} disabled={loading}>Voltar</button>
                    ) : (
                        <button type="button" className="btn" data-modal-close onClick={onClose} disabled={loading}>Cancelar</button>
                    )}

                    {step === 1 ? (
                        <button type="button" className="btn btnPrimary" onClick={() => setStep(2)} disabled={!data.name || !data.slug || !data.adminEmail || !normalizeBrazilPhone(data.adminPhone) || data.adminPassword.length < 8}>
                            Próximo <ChevronRight size={16}/>
                        </button>
                    ) : (
                        <button type="button" className="btn btnPrimary" onClick={handleSubmit} disabled={loading}>
                            {loading ? 'Criando...' : 'Criar espaço'}
                        </button>
                    )}
                </footer>
            </div>
        </ModalRoot>
    )
}

function DevUsers() {
    const [users, setUsers] = useState<{id: string, email: string, phone: string | null, createdAt: string}[]>([])
    const [loading, setLoading] = useState(true)
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        load()
    }, [])

    async function load() {
        setLoading(true)
        const res = await api<{users: {id: string, email: string, phone: string | null, createdAt: string}[]}>('/api/dev/users')
        if(res.ok) setUsers(res.data.users)
        setLoading(false)
    }

    async function create() {
        if(!email || !normalizeBrazilPhone(phone) || !password) return
        setCreating(true)
        setError(null)
        const res = await api<{user: {id: string, email: string, phone: string, createdAt: string}}>('/api/dev/users', {
            method: 'POST',
            body: JSON.stringify({ email, phone, password })
        })
        if(res.ok) {
            setUsers(prev => [res.data.user, ...prev])
            setEmail('')
            setPhone('')
            setPassword('')
        } else {
            setError(res.error.message)
        }
        setCreating(false)
    }

    async function remove(id: string) {
        if (!(await confirmAction({ title: 'Remover usuário DEV', message: 'O acesso será revogado imediatamente e não poderá ser recuperado.', confirmLabel: 'Remover usuário', danger: true }))) return
        const res = await api<{ok: boolean}>(`/api/dev/users/${id}`, { method: 'DELETE' })
        if(res.ok) {
            setUsers(prev => prev.filter(u => u.id !== id))
        } else {
            notify(res.error.message, 'error')
        }
    }

    return (
        <div className="nr-dev-panel-layout">
            <div className="card">
                <div className="cardHeader">
                    <h2 className="cardTitle">Usuários do sistema</h2>
                </div>
                <div className="cardBody">
                    <div className="form-stack nr-dev-user-form">
                        <div className="row">
                            <div className="input-group">
                                <label className="label" htmlFor="dev-user-email">Novo usuário (email)</label>
                                <input id="dev-user-email" className="input" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
                            </div>
                            <div className="input-group">
                                <label className="label" htmlFor="dev-user-phone">WhatsApp</label>
                                <input id="dev-user-phone" className="input" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(formatBrazilPhoneInput(e.target.value))} placeholder="(11) 99999-9999" aria-invalid={Boolean(phone && !normalizeBrazilPhone(phone))} />
                            </div>
                            <div className="input-group">
                                <label className="label" htmlFor="dev-user-password">Senha</label>
                                <input id="dev-user-password" className="input" type="password" autoComplete="new-password" minLength={8} aria-describedby="dev-user-password-requirements" value={password} onChange={e => setPassword(e.target.value)} placeholder="Crie uma senha" />
                                <PasswordChecklist id="dev-user-password-requirements" password={password} />
                            </div>
                        </div>
                        {error && <div className="nr-form-error" role="alert">{error}</div>}
                        <button type="button" className="btn btnPrimary nr-dev-user-submit" onClick={create} disabled={creating || !email || !normalizeBrazilPhone(phone) || password.length < 8}>
                            {creating ? 'Criando...' : 'Adicionar usuário'}
                        </button>
                    </div>

                    <div className="table-scroll nr-dev-users-table">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>WhatsApp</th>
                                    <th>Criado em</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="nr-table-loading-cell">
                                            <div className="skeleton skeleton-text" />
                                        </td>
                                    </tr>
                                ) : users.map(u => (
                                    <tr key={u.id}>
                                        <td>{u.email}</td>
                                        <td>{u.phone ? formatBrazilPhoneInput(u.phone) : '—'}</td>
                                        <td>{new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
                                        <td className="nr-table-actions-cell">
                                            <button type="button" className="icon-btn nr-danger-icon-button" onClick={() => remove(u.id)} aria-label={`Remover usuário ${u.email}`}>
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}

function DevIntegrations() {
    const [settings, setSettings] = useState({ url: '', apiKey: '' })
    const [hasApiKey, setHasApiKey] = useState(false)
    const [instanceName, setInstanceName] = useState('naregua-global')
    const [connectionState, setConnectionState] = useState('UNKNOWN')
    const [qrCode, setQrCode] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [connectionBusy, setConnectionBusy] = useState(false)

    async function loadEvolution() {
        setLoading(true)
        const [configRes, statusRes] = await Promise.all([
            api<{ config: { url: string; instanceName: string; hasApiKey: boolean } }>('/api/dev/evolution/config'),
            api<{ state: string; instanceName: string }>('/api/dev/evolution/status'),
        ])
        if (configRes.ok) {
            setSettings({ url: configRes.data.config.url, apiKey: '' })
            setHasApiKey(configRes.data.config.hasApiKey)
            setInstanceName(configRes.data.config.instanceName)
        } else notify(configRes.error.message, 'error')
        if (statusRes.ok) {
            setConnectionState(statusRes.data.state)
            setInstanceName(statusRes.data.instanceName)
        }
        setLoading(false)
    }

    useEffect(() => { void loadEvolution() }, [])

    async function saveEvolution() {
        setSaving(true)
        const res = await api<{ ok: true }>('/api/dev/evolution/config', {
            method: 'PUT',
            body: JSON.stringify({
                ...(settings.url.trim() ? { url: settings.url.trim() } : {}),
                ...(settings.apiKey.trim() ? { apiKey: settings.apiKey.trim() } : {}),
            }),
        })
        setSaving(false)
        if (!res.ok) {
            notify(res.error.message, 'error')
            return
        }
        if (settings.apiKey.trim()) setHasApiKey(true)
        setSettings(current => ({ ...current, apiKey: '' }))
        notify('Evolution API Global atualizada.', 'success')
        void refreshEvolutionStatus()
    }

    async function refreshEvolutionStatus() {
        const res = await api<{ state: string; instanceName: string }>('/api/dev/evolution/status')
        if (!res.ok) {
            notify(res.error.message, 'error')
            return
        }
        setConnectionState(res.data.state)
        setInstanceName(res.data.instanceName)
        if (res.data.state === 'OPEN' || res.data.state === 'CONNECTED') setQrCode(null)
    }

    async function connectEvolution() {
        setConnectionBusy(true)
        const res = await api<{ state: string; qrCode: string | null; instanceName: string }>('/api/dev/evolution/connect', { method: 'POST' })
        setConnectionBusy(false)
        if (!res.ok) {
            notify(res.error.message, 'error')
            return
        }
        setConnectionState(res.data.state)
        setInstanceName(res.data.instanceName)
        setQrCode(res.data.qrCode)
        if (!res.data.qrCode) window.setTimeout(() => void refreshEvolutionStatus(), 1200)
    }

    async function disconnectEvolution() {
        if (!(await confirmAction({ title: 'Desconectar Evolution API Global', message: 'O MFA por WhatsApp ficará indisponível até a instância global ser reconectada.', confirmLabel: 'Desconectar', danger: true }))) return
        setConnectionBusy(true)
        const res = await api<{ ok: true; state: string }>('/api/dev/evolution/disconnect', { method: 'DELETE' })
        setConnectionBusy(false)
        if (!res.ok) {
            notify(res.error.message, 'error')
            return
        }
        setConnectionState(res.data.state)
        setQrCode(null)
        notify('Instância global desconectada.', 'success')
    }

    const connected = ['OPEN', 'CONNECTED'].includes(connectionState.toUpperCase())
    const statusLabel = connectionState === 'NOT_CONFIGURED' ? 'Não configurada' : connected ? 'Online' : connectionState === 'QR_SCAN' ? 'Aguardando QR Code' : connectionState === 'OFFLINE' || connectionState === 'DISCONNECTED' ? 'Offline' : connectionState

    if (loading) {
        return (
            <div className="nr-dev-panel-layout">
                <div className="card skeleton skeleton-card nr-dev-panel-skeleton" />
            </div>
        )
    }

    return (
        <div className="nr-dev-panel-layout">
            <div className="card">
                <div className="cardHeader">
                    <div>
                        <h2 className="cardTitle">Integrações Globais</h2>
                        <p className="cardDesc">Serviços compartilhados pela plataforma e infraestrutura de autenticação.</p>
                    </div>
                </div>
                <div className="cardBody">
                    <h4 className="nr-settings-section-title nr-integration-title">InfinitePay</h4>
                    <div className="integration-note">
                        O checkout usa o catálogo oficial definido no servidor e a configuração da InfinitePay. Valores e chaves não são aceitos do navegador.
                    </div>

                    <div className="nr-settings-divider" />

                    <div className="settings-card-header">
                        <div>
                            <h4 className="nr-settings-section-title nr-integration-title">Evolution API global</h4>
                            <p className="cardDesc nr-integration-copy">Usada pelo MFA administrativo e como credencial global da plataforma. Cada espaço mantém sua própria instância de WhatsApp para preservar o isolamento das conversas.</p>
                        </div>
                        <span className={`status-badge ${connected ? 'status-success' : connectionState === 'NOT_CONFIGURED' ? 'status-warning' : 'status-danger'}`}>{statusLabel}</span>
                    </div>

                    <div className="form-stack nr-integration-form">
                        <div className="input-group">
                            <label className="label" htmlFor="dev-evolution-url">Base URL</label>
                            <input id="dev-evolution-url" className="input" value={settings.url} onChange={e => setSettings(current => ({ ...current, url: e.target.value }))} placeholder="https://api.evolution.exemplo.com" />
                        </div>
                        <div className="input-group">
                            <label className="label" htmlFor="dev-evolution-key">Global API Key</label>
                            <input id="dev-evolution-key" className="input" type="password" value={settings.apiKey} onChange={e => setSettings(current => ({ ...current, apiKey: e.target.value }))} placeholder={hasApiKey ? 'Chave configurada — digite somente para substituir' : 'Cole uma chave com pelo menos 16 caracteres'} autoComplete="new-password" />
                            <div className="form-hint">A API Key é criptografada no banco e nunca é retornada pela API.</div>
                        </div>
                        <div className="integration-note">Instância global: <code>{instanceName}</code>. Para o primeiro deploy, <code>EVOLUTION_API_URL</code> e <code>EVOLUTION_API_KEY</code> podem servir como fallback de bootstrap até a configuração ser salva aqui.</div>
                    </div>

                    <div className="form-actions nr-integration-actions">
                        <button type="button" className="btn btnPrimary" onClick={saveEvolution} disabled={saving || (!settings.url.trim() && !settings.apiKey.trim())}>{saving ? 'Salvando…' : 'Salvar configuração'}</button>
                        <button type="button" className="btn" onClick={connectEvolution} disabled={connectionBusy || !settings.url.trim() || !hasApiKey}>{connectionBusy ? 'Processando…' : connected ? 'Reconectar' : 'Conectar / mostrar QR'}</button>
                        <button type="button" className="btn" onClick={() => void refreshEvolutionStatus()} disabled={connectionBusy}>Atualizar status</button>
                        {connected || connectionState === 'QR_SCAN' ? <button type="button" className="btn" onClick={disconnectEvolution} disabled={connectionBusy}>Desconectar</button> : null}
                    </div>

                    {qrCode ? (
                        <div className="integration-note dev-evolution-qr">
                            <strong>Leia no WhatsApp da plataforma</strong>
                            <img className="dev-evolution-qr-image" src={qrCode} alt="QR Code para conectar a Evolution API Global" />
                            <span>Use o aparelho que enviará os códigos de verificação do NaRégua.</span>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    )
}

function DevBackup() {
    const handleExport = () => {
        const link = document.createElement('a')
        link.href = '/api/dev/backup/export'
        link.setAttribute('download', 'naregua-backup.db')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="nr-dev-panel-layout nr-dev-panel-layout-wide">
            <div className="card">
                <div className="cardHeader">
                    <h2 className="cardTitle">Backup e recuperação</h2>
                    <p className="cardDesc">Exporte uma cópia consistente e siga o procedimento operacional para qualquer restauração.</p>
                </div>
                <div className="cardBody">
                    <div className="grid grid-2 backup-grid">
                        <div className="backup-operation-card">
                            <div>
                                <div className="backup-operation-icon"><Database size={24} /></div>
                                <h3>Exportação manual</h3>
                                <p>Gera uma cópia consistente do SQLite usando a API de backup do banco. Guarde o arquivo em local criptografado e fora da VPS.</p>
                            </div>
                            <button type="button" className="btn btnPrimary" onClick={handleExport}>
                                Baixar backup (.db)
                            </button>
                        </div>

                        <div className="backup-operation-card">
                            <div>
                                <div className="backup-operation-icon"><ShieldCheck size={24} /></div>
                                <h3>Restauração no Docker</h3>
                                <p>Pare o app e execute o restaurador em um container efêmero. O script valida checksum e integridade antes de substituir o SQLite.</p>
                            </div>
                            <div className="integration-note backup-command">
                                <pre><code>{`docker compose stop app
docker compose run --rm --no-deps \
  -e DATABASE_PATH=/data/app.db \
  --entrypoint /app/deploy/restore-container.sh \
  app /backups/naregua-AAAA-MM-DD.sqlite.gz
docker compose start app`}</code></pre>
                            </div>
                        </div>
                    </div>

                    <div className="backup-warning">
                        <ShieldCheck size={20} />
                        <div>
                            <strong>Persistência não é backup</strong>
                            <span>Os volumes Docker protegem contra recriação do container, não contra perda da VPS. Agende o comando de backup pelo host e copie os arquivos de /backups para outro provedor ou região.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function Dev() {
    const nav = useNavigate()
    const testModeAvailable = !import.meta.env.PROD
    const [me, setMe] = useState<SessionUser | null>(null)
    const [tenants, setTenants] = useState<TenantDev[]>([])
    const [loading, setLoading] = useState(true)
    const [testMode, setTestMode] = useState(() => {
        if (testModeAvailable && typeof window !== 'undefined') return readStorage('naregua:test-mode') === 'true'
        return false
    })
    const [showNew, setShowNew] = useState(false)
    const [tab, setTab] = useState<'tenants' | 'settings' | 'integrations' | 'backups' | 'referrals'>('tenants')
    const [editingTenantId, setEditingTenantId] = useState<string | null>(null)
    const [devTheme, setDevTheme] = useState<DevThemeMode>(() => getDevTheme())
    const [devColor, setDevColor] = useState<string>(() => getDevPrimaryColor() ?? '#d7784a')
    const [searchTerm, setSearchTerm] = useState('')
    const [tenantStatusFilter, setTenantStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
    const [tenantBillingFilter, setTenantBillingFilter] = useState<'all' | 'active' | 'attention' | 'none'>('all')
    const [platformOverview, setPlatformOverview] = useState<{ totals: { total: number; active: number; disabled: number }; activeSubscriptions: number; pendingOrders: number; ai30d: { requests: number; tokens: number } } | null>(null)
    const devTourSteps = useMemo(() => shellTourSteps('dev', tab), [tab])

    useEffect(() => {
        setAppMode('dev')
        initDevTheme('light')
        setDevTheme(getDevTheme())
        api<{user: SessionUser | null; isTestMode?: boolean}>('/api/auth/me').then(res => {
            if(res.ok && res.data.user?.role === 'DEV') {
                setMe(res.data.user)
                if (testModeAvailable && typeof res.data.isTestMode === 'boolean') {
                    const serverMode = res.data.isTestMode
                    setTestMode(serverMode)
                    writeStorage('naregua:test-mode', String(serverMode))
                } else {
                    setTestMode(false)
                    removeStorage('naregua:test-mode')
                }
            }
            else nav('/login')
        })
        api<{ settings: Record<string, string> }>('/api/dev/settings').then(res => {
            if (res.ok) {
                const color = res.data.settings['dev_primary_color']
                if (typeof color === 'string' && color.trim()) {
                    setDevColor(color)
                    setDevPrimaryColor(color)
                }
            }
        })
        loadTenants()
        api<{ totals: { total: number; active: number; disabled: number }; activeSubscriptions: number; pendingOrders: number; ai30d: { requests: number; tokens: number } }>('/api/dev/platform-overview').then((res) => { if (res.ok) setPlatformOverview(res.data) })
    }, [])

    async function loadTenants() {
        setLoading(true)
        const res = await api<{tenants: TenantDev[]}>('/api/dev/tenants')
        if(res.ok) setTenants(res.data.tenants)
        setLoading(false)
    }

    const tenantWorkspaceUrl = (slug: string) => {
        if (typeof window === 'undefined') return `http://${slug}.localhost:5173`
        const { hostname, port, protocol } = window.location
        const rootHost = hostname.toLowerCase().startsWith('dev.') ? hostname.slice(4) : hostname
        return `${protocol}//${slug}.${rootHost}${port ? `:${port}` : ''}`
    }

    const subscriptionMeta = (t: TenantDev) => {
        const raw = (t.subscriptionStatus ?? '').trim()
        if (!raw) {
            return {
                label: 'Sem assinatura',
                className: 'status-muted'
            }
        }

        const v = raw.toUpperCase()
        const isActive = ['ACTIVE', 'PAID', 'TRIAL', 'TRIALING', 'APPROVED'].some((k) => v.includes(k))
        const isPastDue = ['PAST_DUE', 'OVERDUE', 'LATE'].some((k) => v.includes(k))
        const isInactive = ['CANCELLED', 'CANCELED', 'EXPIRED', 'INACTIVE'].some((k) => v.includes(k))
        const isTrial = ['TRIAL', 'TRIALING'].some((k) => v.includes(k))

        const endIso = (t.subscriptionPeriodEnd ?? '').trim()
        const endDate = endIso ? new Date(endIso) : null
        const endText = endDate && Number.isFinite(endDate.getTime()) ? ` até ${endDate.toLocaleDateString('pt-BR')}` : ''

        if (isTrial) {
            return {
                label: `Teste${endText}`,
                className: 'status-info'
            }
        }
        if (isActive) {
            return {
                label: `Ativa${endText}`,
                className: 'status-success'
            }
        }
        if (isPastDue) {
            return {
                label: `Atrasada`,
                className: 'status-warning'
            }
        }
        if (isInactive) {
            return {
                label: `Cancelada`,
                className: 'status-danger'
            }
        }
        return {
            label: `${raw || 'Sem plano'}`,
            className: 'status-muted'
        }
    }

    const filteredTenants = useMemo(() => {
        const lower = searchTerm.trim().toLocaleLowerCase('pt-BR')
        return tenants.filter((tenant) => {
            const matchesSearch = !lower || tenant.name.toLocaleLowerCase('pt-BR').includes(lower) || tenant.slug.toLocaleLowerCase('pt-BR').includes(lower) || Boolean(tenant.adminEmail?.toLocaleLowerCase('pt-BR').includes(lower))
            const active = tenant.status === 'ACTIVE'
            const matchesStatus = tenantStatusFilter === 'all' || (tenantStatusFilter === 'active' ? active : !active)
            const billing = String(tenant.subscriptionStatus ?? '').toUpperCase()
            const hasActiveBilling = ['ACTIVE', 'PAID', 'TRIAL', 'TRIALING', 'APPROVED'].some((value) => billing.includes(value))
            const needsBillingAttention = ['PAST_DUE', 'OVERDUE', 'LATE', 'PENDING'].some((value) => billing.includes(value))
            const matchesBilling = tenantBillingFilter === 'all' || (tenantBillingFilter === 'active' ? hasActiveBilling : tenantBillingFilter === 'attention' ? needsBillingAttention : !billing)
            return matchesSearch && matchesStatus && matchesBilling
        })
    }, [tenants, searchTerm, tenantStatusFilter, tenantBillingFilter])

    const loadingDev = !me

    return (
        <Shell
            title="Central NaRégua"
            subtitle="Operação da plataforma"
            user={me}
            isTestMode={testMode}
            tourKey={`dev-${tab}`}
            tourSteps={devTourSteps}
            autoStartTour={tab === 'tenants'}
            actions={
                <div className="nr-dev-actions">
                    {testModeAvailable ? (
                        <>
                            <label className={`test-mode-toggle${testMode ? ' is-active' : ''}`}>
                                <div className="test-mode-label">
                                    Modo de teste
                                </div>
                                <Switch
                                    checked={testMode}
                                    onChange={(val) => {
                                        setTestMode(val)
                                        writeStorage('naregua:test-mode', String(val))
                                        api('/api/dev/test-mode', {
                                            method: 'POST',
                                            body: JSON.stringify({ enabled: val })
                                        }).then(res => {
                                            if (!res.ok) {
                                                setTestMode(!val)
                                                writeStorage('naregua:test-mode', String(!val))
                                                notify('Erro ao atualizar modo de teste no servidor', 'error')
                                            }
                                        })
                                    }}
                                />
                            </label>
                            <div className="nr-dev-actions-divider" />
                        </>
                    ) : null}

                    <button type="button"
                        className="icon-btn nr-dev-theme-button"
                        onClick={() => {
                            const next = toggleDevTheme()
                            setDevTheme(next)
                        }}
                        title={devTheme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
                        aria-label={devTheme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
                    >
                        {devTheme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                    </button>
                </div>
            }
            sidebar={
                <div className="nr-nav-group">
                    <SidebarItem active={tab === 'tenants'} icon={<LayoutDashboard size={18}/>} label="Espaços" onClick={() => setTab('tenants')} />
                    <SidebarItem active={tab === 'referrals'} icon={<HeartHandshake size={18}/>} label="Indicações" onClick={() => setTab('referrals')} />
                    <SidebarItem active={tab === 'integrations'} icon={<Webhook size={18}/>} label="Integrações" onClick={() => setTab('integrations')} />
                    <SidebarItem active={tab === 'backups'} icon={<Database size={18}/>} label="Backups" onClick={() => setTab('backups')} />
                    <SidebarItem active={tab === 'settings'} icon={<Settings size={18}/>} label="Configurações" onClick={() => setTab('settings')} />
                    <div className="navDivider" />
                    <SidebarItem icon={<LogOut size={18}/>} label="Sair" onClick={async () => {
                         await api('/api/auth/logout', {method: 'POST'})
                         window.location.href = '/'
                    }} />
                </div>
            }
        >
            {tab === 'tenants' ? (
                <>
                    <section className="nr-dev-command">
                        <div className="nr-dev-command-copy">
                            <span className="eyebrow">Central operacional</span>
                            <h1>Decida pelo que mudou.</h1>
                            <p>Espaços, cobrança e consumo organizados por exceção — sem indicadores soltos e sem painel decorativo.</p>
                        </div>
                        <div className="nr-dev-command-signals" aria-label="Estado atual da plataforma">
                            <article><i className="is-online" /><span>Plataforma</span><strong>Operação online</strong></article>
                            <article><i /><span>Base ativa</span><strong>{platformOverview?.totals.active ?? tenants.filter((tenant) => tenant.status === 'ACTIVE').length} espaços</strong></article>
                            <article className={(platformOverview?.pendingOrders ?? 0) > 0 ? 'has-attention' : ''}><i /><span>Cobrança</span><strong>{platformOverview?.pendingOrders ?? 0} pendências</strong></article>
                        </div>
                    </section>

                    <div className="platform-metrics" aria-label="Resumo da plataforma">
                      <article><span className="platform-metric-icon" aria-hidden="true"><LayoutDashboard size={18} /></span><div><span>Espaços ativos</span><strong>{platformOverview?.totals.active ?? tenants.filter((tenant) => tenant.status === 'ACTIVE').length}</strong><small>de {platformOverview?.totals.total ?? tenants.length} cadastrados</small></div></article>
                      <article><span className="platform-metric-icon" aria-hidden="true"><CreditCard size={18} /></span><div><span>Assinaturas ativas</span><strong>{platformOverview?.activeSubscriptions ?? 0}</strong><small>acesso vigente</small></div></article>
                      <article><span className="platform-metric-icon" aria-hidden="true"><Clock size={18} /></span><div><span>Pagamentos pendentes</span><strong>{platformOverview?.pendingOrders ?? 0}</strong><small>aguardando confirmação</small></div></article>
                      <article><span className="platform-metric-icon" aria-hidden="true"><Sparkles size={18} /></span><div><span>Mestre AI · 30 dias</span><strong>{platformOverview?.ai30d.requests ?? 0}</strong><small>{platformOverview?.ai30d.tokens?.toLocaleString('pt-BR') ?? 0} tokens</small></div></article>
                    </div>

                    <div className="card tenant-directory">
                        <div className="cardHeader tenant-directory-header">
                            <div>
                                <h2 className="cardTitle">Espaços cadastrados</h2>
                                <p className="cardDesc">{filteredTenants.length} de {tenants.length} espaços nesta visão.</p>
                            </div>
                            <button type="button" className="btn btnPrimary tenant-create-button" onClick={() => setShowNew(true)}>
                                <Plus size={16}/> Novo espaço
                            </button>
                        </div>

                        <div className="tenant-filter-toolbar" data-tour="search">
                            <label className="tenant-search-wrapper">
                                <Search size={16} />
                                <input className="search-input" type="search" autoComplete="off" placeholder="Nome, domínio ou administrador" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
                                {searchTerm ? <button type="button" onClick={() => setSearchTerm('')} aria-label="Limpar busca"><X size={14} /></button> : null}
                            </label>
                            <ProductSelect value={tenantStatusFilter} onChange={(value) => setTenantStatusFilter(value as typeof tenantStatusFilter)} size="compact" ariaLabel="Filtrar por estado do espaço" options={[{ value: 'all', label: 'Todos os estados' }, { value: 'active', label: 'Espaços ativos' }, { value: 'inactive', label: 'Pausados ou desativados' }]} />
                            <ProductSelect value={tenantBillingFilter} onChange={(value) => setTenantBillingFilter(value as typeof tenantBillingFilter)} size="compact" ariaLabel="Filtrar por cobrança" options={[{ value: 'all', label: 'Toda cobrança' }, { value: 'active', label: 'Assinatura ativa' }, { value: 'attention', label: 'Requer atenção' }, { value: 'none', label: 'Sem assinatura' }]} />
                        </div>

                        {loadingDev || loading ? (
                            <div className="tenant-directory-loading">
                                <div className="skeleton skeleton-text" />
                                <div className="skeleton skeleton-card" />
                            </div>
                        ) : (
                            <>
                            <div className="table-scroll desktop-only">
                                <table className="data-table">
                                <thead>
                                    <tr>
                                        <th className="tenant-cell-main">Espaço</th>
                                        <th>Acesso</th>
                                        <th>Assinatura</th>
                                        <th className="tenant-cell-actions">Gerenciar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTenants.map(t => (
                                        <tr key={t.id}>
                                            <td className="tenant-cell-main">
                                                <div className="tenant-identity">
                                                    <div className="user-avatar-mini tenant-avatar">
                                                        {t.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="tenant-identity-copy">
                                                        <strong>{t.name}</strong>
                                                        {t.adminEmail && (
                                                            <span>{t.adminEmail}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <a
                                                    href={tenantWorkspaceUrl(t.slug)}
                                                    target="_blank"
                                                    className="tenant-workspace-link"
                                                    rel="noopener noreferrer"
                                                >
                                                    <Globe size={14} />
                                                    {t.slug}.{configuredPlatformHostname()}
                                                </a>
                                            </td>
                                            <td>
                                                {(() => {
                                                    const m = subscriptionMeta(t)
                                                    return <span className={`status-badge ${m.className}`}>{m.label}</span>
                                                })()}
                                            </td>
                                            <td className="tenant-cell-actions">
                                                <button type="button" className="icon-btn tenant-settings-button" onClick={() => setEditingTenantId(t.id)} aria-label={`Configurar ${t.name}`}>
                                                    <Settings size={18}/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredTenants.length === 0 ? <tr><td colSpan={4}><EmptyState compact icon={<Search size={22} />} title="Nenhum espaço neste filtro" description="Ajuste a busca, o estado ou a situação da cobrança." /></td></tr> : null}
                                </tbody>
                                </table>
                            </div>

                            <div className="mobile-tenant-list">
                                {filteredTenants.map(t => (
                                    <div key={t.id} className="mobile-tenant-card">
                                        <div className="tenant-identity tenant-identity-mobile">
                                            <div className="user-avatar-mini tenant-avatar">
                                                {t.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="tenant-identity-copy">
                                                <strong>{t.name}</strong>
                                                <a
                                                    href={tenantWorkspaceUrl(t.slug)}
                                                    target="_blank"
                                                    className="tenant-workspace-link tenant-workspace-link-mobile"
                                                    rel="noopener noreferrer"
                                                >
                                                    <Globe size={10} />
                                                    {t.slug}.{configuredPlatformHostname()}
                                                </a>
                                            </div>
                                        </div>

                                        <div className="tenant-mobile-actions">
                                             {(() => {
                                                const m = subscriptionMeta(t)
                                                return <span className={`status-badge tenant-mobile-status ${m.className}`}>{m.label.split(' ')[0]}</span>
                                            })()}
                                            <button type="button" className="icon-btn tenant-settings-button" onClick={() => setEditingTenantId(t.id)} aria-label={`Configurar ${t.name}`}>
                                                <Settings size={16} color="var(--text-muted)"/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {filteredTenants.length === 0 ? <EmptyState compact icon={<Search size={22} />} title="Nenhum espaço neste filtro" description="Ajuste os filtros para ampliar a busca." /> : null}
                            </div>
                            </>
                        )}
                    </div>

                    <NewTenantModal
                        isOpen={showNew}
                        onClose={() => setShowNew(false)}
                        onSuccess={() => {
                            loadTenants()
                        }}
                    />
                </>
            ) : tab === 'referrals' ? (
                <DevReferrals />
            ) : tab === 'integrations' ? (
                <DevIntegrations />
            ) : tab === 'backups' ? (
                <DevBackup />
            ) : (
                <div className="nr-dev-settings-layout">
                    <DevUsers />
                    <div className="card">
                        <div className="cardHeader">
                            <div>
                                <h2 className="cardTitle">Configurações</h2>
                                <p className="cardDesc">Personalize sua experiência no painel de desenvolvedor.</p>
                            </div>
                        </div>

                        <div className="cardBody">
                            <h4 className="nr-settings-section-title">Aparência</h4>

                            <div className="nr-settings-option">
                                <div className="nr-settings-option-copy">
                                    <div className="nr-settings-option-icon">
                                        {devTheme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                                    </div>
                                    <div>
                                        <strong>Modo escuro</strong>
                                        <span>
                                            {devTheme === 'dark' ? 'Ativado' : 'Desativado'}
                                        </span>
                                    </div>
                                </div>
                                <Switch
                                    checked={devTheme === 'dark'}
                                    onChange={() => {
                                        const next = toggleDevTheme()
                                        setDevTheme(next)
                                    }}
                                />
                            </div>

                            <div className="nr-settings-color">
                                <div className="nr-settings-option-copy">
                                        <div className="nr-settings-option-icon">
                                            <Palette size={20} />
                                        </div>
                                        <div>
                                            <strong>Cor de destaque</strong>
                                            <span>
                                                Escolha a cor principal para o painel administrativo.
                                            </span>
                                        </div>
                                </div>
                                    <div className="nr-settings-color-picker">
                                        <ColorPicker
                                            value={devColor}
                                            onChange={(c) => {
                                                setDevColor(c)
                                                setDevPrimaryColor(c)
                                                api<{ ok: boolean }>('/api/dev/settings', {
                                                    method: 'POST',
                                                    body: JSON.stringify({ dev_primary_color: c })
                                                }).then(res => {
                                                    if (!res.ok) {
                                                        console.error('Falha ao salvar cor global do painel admin/dev', res.error)
                                                    }
                                                })
                                            }}
                                        />
                                    </div>
                            </div>

                            <div className="nr-settings-divider" />

                            <h4 className="nr-settings-section-title">Sistema</h4>

                            <div className="nr-settings-security-note">
                                <div>
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <strong>Ambiente protegido</strong>
                                    <p>
                                        Você está no ambiente de desenvolvimento. O acesso administrativo é restrito ao subdomínio <code>dev.</code> para garantir a segurança da plataforma.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <SecuritySettingsCard title="Segurança da conta DEV" />
                </div>
            )}

            <TenantEditModal
                tenantId={editingTenantId}
                isOpen={!!editingTenantId}
                onClose={() => setEditingTenantId(null)}
                onUpdated={() => loadTenants()}
            />
        </Shell>
    )
}

function ConfirmModal({
    isOpen,
    title,
    description,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    variant = 'danger',
    loading = false
}: {
    isOpen: boolean
    title: string
    description: ReactNode
    confirmText?: string
    cancelText?: string
    onConfirm: () => void
    onCancel: () => void
    variant?: 'danger' | 'primary'
    loading?: boolean
}) {
    if (!isOpen) return null
    return (
        <ModalRoot onMouseDown={loading ? undefined : (event) => {
            if (event.target === event.currentTarget) onCancel()
        }}>
            <section className="nr-dialog nr-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirmation-dialog-title" onMouseDown={event => event.stopPropagation()}>
                <div className={`nr-confirm-tone ${variant === 'danger' ? 'danger' : 'neutral'}`} aria-hidden="true">
                    {variant === 'danger' ? 'Atenção' : 'Confirmação'}
                </div>
                <div className="nr-confirm-copy">
                    <h2 id="confirmation-dialog-title">{title}</h2>
                    <div className="nr-confirm-description">{description}</div>
                </div>
                <div className="nr-confirm-actions">
                    <button type="button" className="btn" data-modal-close onClick={onCancel} disabled={loading}>{cancelText}</button>
                    <button type="button" className={`btn ${variant === 'danger' ? 'btn-danger' : 'btnPrimary'}`} onClick={onConfirm} disabled={loading}>
                        {loading ? 'Processando...' : confirmText}
                    </button>
                </div>
            </section>
        </ModalRoot>
    )
}

function TenantEditModal({
    tenantId,
    isOpen,
    onClose,
    onUpdated
}: {
    tenantId: string | null
    isOpen: boolean
    onClose: () => void
    onUpdated: () => void
}) {
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [showConfirmDelete, setShowConfirmDelete] = useState(false)
    const [showPermanentDelete, setShowPermanentDelete] = useState(false)
    const [permanentConfirmation, setPermanentConfirmation] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState({
        name: '',
        slug: '',
        status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED' | 'DISABLED',
        primaryColor: '#d7784a',
        logoUrl: ''
    })

    useEffect(() => {
        if (!isOpen || !tenantId) return
        setError(null)
        setLoading(true)
        api<{
            tenant: {
                id: string
                slug: string
                name: string
                primaryColor: string
                logoUrl: string | null
                status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED'
            }
        }>(`/api/dev/tenants/${encodeURIComponent(tenantId)}`).then((res) => {
            if (!res.ok) {
                setError(res.error.message)
                return
            }
            setForm({
                name: res.data.tenant.name,
                slug: res.data.tenant.slug,
                status: res.data.tenant.status,
                primaryColor: res.data.tenant.primaryColor,
                logoUrl: res.data.tenant.logoUrl ?? ''
            })
        }).finally(() => {
            setLoading(false)
        })
    }, [isOpen, tenantId])

    async function save() {
        if (!tenantId) return
        setSaving(true)
        setError(null)
        try {
            const res = await api<{ tenant: TenantDev }>(`/api/dev/tenants/${encodeURIComponent(tenantId)}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    name: form.name.trim(),
                    slug: form.slug.trim().toLowerCase(),
                    status: form.status,
                    primaryColor: form.primaryColor.trim(),
                    logoUrl: form.logoUrl.trim() ? form.logoUrl.trim() : null
                })
            })
            if (!res.ok) {
                setError(res.error.message)
                return
            }
            onUpdated()
            onClose()
        } catch {
            setError('Falha ao salvar tenant')
        } finally {
            setSaving(false)
        }
    }

    async function permanentDelete() {
        if (!tenantId) return
        setDeleting(true)
        setError(null)
        try {
            const res = await api<{ ok: true }>(`/api/dev/tenants/${encodeURIComponent(tenantId)}/permanent-delete`, {
                method: 'POST',
                body: JSON.stringify({ confirmation: permanentConfirmation, acknowledgeBackup: true })
            })
            if (!res.ok) { setError(res.error.message); return }
            onUpdated()
            onClose()
        } catch { setError('Falha ao excluir o espaço definitivamente') }
        finally { setDeleting(false); setShowPermanentDelete(false); setPermanentConfirmation('') }
    }

    async function remove() {
        if (!tenantId) return
        setDeleting(true)
        setError(null)
        try {
            const res = await api<{ ok: true }>(`/api/dev/tenants/${encodeURIComponent(tenantId)}`, { method: 'DELETE' })
            if (!res.ok) {
                setError(res.error.message)
                return
            }
            onUpdated()
            onClose()
        } catch {
            setError('Falha ao desativar o espaço')
        } finally {
            setDeleting(false)
            setShowConfirmDelete(false)
        }
    }

    if (!isOpen) return null

    return (
        <>
        <ModalRoot onClick={onClose}>
            <div className="nr-dialog nr-dialog--tenant-settings" role="dialog" aria-modal="true" aria-labelledby="tenant-settings-title" onClick={(e) => e.stopPropagation()}>
                <div className="nr-dialog-header">
                    <div>
                        <h2 id="tenant-settings-title" className="cardTitle">Configurar espaço</h2>
                        <div className="nr-dialog-context">{tenantId}</div>
                    </div>
                    <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
                </div>
                <div className="nr-dialog-body">
                    {loading ? (
                        <div className="form-stack tenant-dialog-loading">
                            <div className="skeleton skeleton-text" />
                            <div className="row">
                                <div className="skeleton skeleton-card" />
                                <div className="skeleton skeleton-card" />
                            </div>
                        </div>
                    ) : (
                        <div className="form-stack">
                            <div className="row">
                                <div className="input-group">
                                    <label className="label" htmlFor="tenant-settings-name">Nome</label>
                                    <input id="tenant-settings-name" className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                                </div>
                                <div className="input-group">
                                    <label className="label">Status</label>
                                    <ProductSelect
                                        value={form.status}
                                        onChange={(next) => setForm((f) => ({ ...f, status: next as 'ACTIVE' | 'SUSPENDED' | 'DISABLED' }))}
                                        ariaLabel="Status do espaço"
                                        options={[
                                            { value: 'ACTIVE', label: 'Ativo' },
                                            { value: 'SUSPENDED', label: 'Suspenso' },
                                            { value: 'DISABLED', label: 'Desativado' },
                                        ]}
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label className="label" htmlFor="tenant-settings-slug">Endereço do espaço</label>
                                <div className="input-wrapper">
                                    <input id="tenant-settings-slug" className="input" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} />
                                </div>
                            </div>

                            <div className="row">
                                <div className="input-group">
                                    <label className="label">Cor primária</label>
                                    <ColorPicker
                                        value={form.primaryColor}
                                        onChange={(c) => setForm({...form, primaryColor: c})}
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label className="label" htmlFor="tenant-settings-logo">Logo (URL)</label>
                                <div className="input-wrapper">
                                    <input id="tenant-settings-logo" className="input" type="url" inputMode="url" autoComplete="url" value={form.logoUrl} onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))} placeholder="https://..." />
                                </div>
                            </div>

                            {error && <div className="nr-form-error" role="alert">{error}</div>}
                        </div>
                    )}
                </div>
                <div className="nr-dialog-footer tenant-dialog-footer">
                    <div className="tenant-danger-actions">
                      <button type="button" className="btn btn-danger-quiet" onClick={() => setShowConfirmDelete(true)} disabled={loading || saving || deleting}>Desativar</button>
                      {form.status === 'DISABLED' ? <button type="button" className="btn btn-danger-quiet" onClick={() => setShowPermanentDelete(true)} disabled={loading || saving || deleting}>Excluir definitivamente</button> : null}
                    </div>
                    <div className="tenant-dialog-actions">
                        <button type="button" className="btn" data-modal-close onClick={onClose} disabled={saving || deleting}>Cancelar</button>
                        <button type="button" className="btn btnPrimary" onClick={save} disabled={loading || saving || deleting || !form.name.trim() || !form.slug.trim()}>
                            {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </div>
            </div>
        </ModalRoot>

        <ConfirmModal
            isOpen={showConfirmDelete}
            title="Desativar espaço?"
            description="O acesso será bloqueado, as sessões serão revogadas e os domínios serão desativados. Os dados ficam preservados e o espaço pode ser reativado pelo status."
            confirmText="Sim, desativar espaço"
            onConfirm={remove}
            onCancel={() => setShowConfirmDelete(false)}
            loading={deleting}
            variant="danger"
        />
        {showPermanentDelete ? <ModalRoot onClick={() => setShowPermanentDelete(false)}>
          <div className="nr-dialog nr-dialog--destructive" role="dialog" aria-modal="true" aria-labelledby="permanent-delete-title" onClick={(event) => event.stopPropagation()}>
            <div><div><span className="eyebrow">Zona de risco</span><h2 id="permanent-delete-title">Excluir este espaço definitivamente?</h2><p>Esta ação remove agenda, clientes, usuários, domínios, financeiro e configurações. Ela não pode ser desfeita pelo painel.</p></div><button type="button" className="icon-btn modal-close" onClick={() => setShowPermanentDelete(false)} aria-label="Fechar"><X size={18}/></button></div>
            <div><label className="label" htmlFor="permanent-confirmation">Digite <strong>EXCLUIR {form.slug}</strong> para confirmar</label><input id="permanent-confirmation" className="input" value={permanentConfirmation} onChange={(event) => setPermanentConfirmation(event.target.value)} autoComplete="off"/><p className="danger-note">Confirme que existe um backup válido antes de continuar.</p></div>
            <div><button type="button" className="btn" data-modal-close onClick={() => setShowPermanentDelete(false)}>Cancelar</button><button type="button" className="btn btn-danger" onClick={permanentDelete} disabled={deleting || permanentConfirmation !== `EXCLUIR ${form.slug}`}>{deleting ? 'Excluindo…' : 'Excluir definitivamente'}</button></div>
          </div>
        </ModalRoot> : null}

        </>
    )
}

function UnifiedLogin(props: { hostTenant?: TenantPublic | null; isDevHost?: boolean } = {}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [keepSigned, setKeepSigned] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loginSuccess, setLoginSuccess] = useState(false)
  const [authStep, setAuthStep] = useState<'PASSWORD' | 'PHONE_SETUP' | 'WHATSAPP_OTP'>('PASSWORD')
  const [otpCode, setOtpCode] = useState('')
  const [mfaPhone, setMfaPhone] = useState('')
  const [phoneMasked, setPhoneMasked] = useState('')
  const [trustDevice, setTrustDevice] = useState(true)

  const [allowDevBootstrap, setAllowDevBootstrap] = useState(false)
  const [bootstrapEmail, setBootstrapEmail] = useState('')
  const [bootstrapPhone, setBootstrapPhone] = useState('')
  const [bootstrapPassword, setBootstrapPassword] = useState('')
  const [bootstrapSecret, setBootstrapSecret] = useState('')
  const [bootstrapRequiresSecret, setBootstrapRequiresSecret] = useState(false)
  const [bootstrapError, setBootstrapError] = useState<string | null>(null)
  const [bootstrapLoading, setBootstrapLoading] = useState(false)
  const [bootstrapSuccess, setBootstrapSuccess] = useState(false)

  const isTenant = !!props.hostTenant
  const accent = props.hostTenant?.primaryColor ?? 'var(--primary-600)'
  const brandName = props.hostTenant?.name ?? 'NaRégua'
  const brandHandle = props.hostTenant?.slug ? `@${props.hostTenant.slug}` : 'Seu cliente agenda. Você continua atendendo.'
  const pageStyle: CssVarStyle = { '--auth-accent': accent }
  const supportUrl = configuredExternalLink(import.meta.env.VITE_SUPPORT_URL)
  const privacyUrl = configuredExternalLink(import.meta.env.VITE_PRIVACY_URL) ?? '/privacidade'
  const termsUrl = configuredExternalLink(import.meta.env.VITE_TERMS_URL) ?? '/termos'

  useEffect(() => {
    if (props.isDevHost) {
        setAppMode('dev')
        api<{ primaryColor: string | null }>('/api/public/dev-theme').then((res) => {
          if (!res.ok) return
          const color = res.data.primaryColor
          if (typeof color === 'string' && color.trim()) {
            setDevPrimaryColor(color)
          }
        })
    } else {
        setAppMode(isTenant ? 'tenant' : 'public')
        if (props.hostTenant) applyTenantTheme(props.hostTenant)
    }
  }, [props.hostTenant, props.isDevHost])

  useEffect(() => {
    if (isTenant) return
    let mounted = true
    api<{ user: SessionUser | null; allowDevBootstrap?: boolean; bootstrapRequiresSecret?: boolean }>('/api/auth/me').then((res) => {
      if (!mounted) return
      if (!res.ok) return
      setAllowDevBootstrap(Boolean(res.data.allowDevBootstrap))
      setBootstrapRequiresSecret(Boolean(res.data.bootstrapRequiresSecret))
    })
    return () => {
      mounted = false
    }
  }, [isTenant])

  function finishProfessionalLogin(user: SessionUser) {
    setLoginSuccess(true)
    setTimeout(() => {
      if (user.role === 'DEV') {
        window.location.href = '/'
        return
      }
      if (user.role === 'ADMIN') {
        window.location.href = '/admin'
        return
      }
      if (user.role === 'PROFESSIONAL') {
        window.location.href = '/profissional'
        return
      }
      if (user.role === 'CLIENT') window.location.href = '/cliente'
    }, 800)
  }

  async function handleLogin() {
    setLoading(true)
    setError(null)
    const res = await api<{
      user?: SessionUser
      whatsappOtpRequired?: boolean
      phoneEnrollmentRequired?: boolean
      phoneMasked?: string
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, keepSigned }),
    })
    setLoading(false)
    if (!res.ok) {
      setError(res.error.message)
      return
    }

    if (res.data.phoneEnrollmentRequired) {
      setMfaPhone('')
      setOtpCode('')
      setPhoneMasked('')
      setAuthStep('PHONE_SETUP')
      return
    }
    if (res.data.whatsappOtpRequired) {
      setOtpCode('')
      setPhoneMasked(res.data.phoneMasked ?? '')
      setAuthStep('WHATSAPP_OTP')
      return
    }
    if (res.data.user) finishProfessionalLogin(res.data.user)
  }

  async function sendWhatsappOtp(phone?: string) {
    setLoading(true)
    setError(null)
    const normalizedPhone = phone ? normalizeBrazilPhone(phone) : null
    if (phone && !normalizedPhone) {
      setLoading(false)
      setError('Informe um WhatsApp brasileiro válido, com DDD.')
      return
    }
    const res = await api<{ sent: true; phoneMasked: string }>('/api/auth/whatsapp-otp/send', {
      method: 'POST',
      body: JSON.stringify(normalizedPhone ? { phone: normalizedPhone } : {}),
    })
    setLoading(false)
    if (!res.ok) {
      setError(res.error.message)
      return
    }
    setOtpCode('')
    setPhoneMasked(res.data.phoneMasked)
    setAuthStep('WHATSAPP_OTP')
  }

  async function verifyWhatsappOtp() {
    setLoading(true)
    setError(null)
    const res = await api<{ user: SessionUser }>('/api/auth/whatsapp-otp/verify', {
      method: 'POST',
      body: JSON.stringify({ code: otpCode.trim(), trustDevice }),
    })
    setLoading(false)
    if (!res.ok) {
      setError(res.error.message)
      return
    }
    finishProfessionalLogin(res.data.user)
  }

  async function handleBootstrap() {
    setBootstrapLoading(true)
    setBootstrapError(null)
    setBootstrapSuccess(false)
    try {
      const res = await api<{ ok: true }>('/api/dev/bootstrap', {
        method: 'POST',
        body: JSON.stringify({ email: bootstrapEmail, phone: normalizeBrazilPhone(bootstrapPhone), password: bootstrapPassword, bootstrapSecret }),
      })
      if (!res.ok) {
        setBootstrapError(res.error.message)
        return
      }
      setBootstrapSuccess(true)
      setAllowDevBootstrap(false)
      setEmail(bootstrapEmail)
      setPassword(bootstrapPassword)
      setBootstrapSecret('')
    } catch {
      setBootstrapError('Erro ao criar usuário DEV')
    } finally {
      setBootstrapLoading(false)
    }
  }

  return (
    <div className="nr-auth" style={pageStyle}>
      <div className="nr-auth-shell">
        <div className="nr-auth-story">
          <div className="nr-auth-brand">
            <div className="nr-auth-mark">
              {props.hostTenant?.logoUrl ? (
                <img decoding="async" className="nr-auth-logo" src={props.hostTenant.logoUrl} alt={brandName} />
              ) : (
                <img decoding="async" className="nr-auth-logo-default" src="/brand/logo-symbol-approved-web.png" alt="" aria-hidden="true" />
              )}
            </div>
            <div className="nr-auth-brand-copy">
              <div className="nr-auth-brand-name">{brandName}</div>
              <div className="nr-auth-brand-subtitle">{brandHandle}</div>
            </div>
          </div>

          <div className="nr-auth-quote">
            <div className="nr-auth-quote-text">“Menos mensagens perguntando por horário. Mais tempo para atender.”</div>
            <div className="nr-auth-quote-meta">
              <div className="nr-auth-quote-name">NaRégua</div>
              <div className="nr-auth-quote-role">Gestão completa para barbearias</div>
            </div>
          </div>
        </div>

        <div className="nr-auth-panel">
          <div className="nr-auth-content">
            {loginSuccess ? (
              <div className="nr-auth-success">
                <div className="nr-auth-success-icon">
                  <ShieldCheck size={32} />
                </div>
                <h2 className="nr-auth-success-title">Login realizado!</h2>
                <p className="nr-auth-success-copy">Redirecionando você...</p>
              </div>
            ) : authStep !== 'PASSWORD' ? (
              <div className="nr-auth-security">
                <span className="eyebrow">Verificação em duas etapas</span>
                <h1 className="nr-auth-title">{authStep === 'PHONE_SETUP' ? 'Cadastre seu WhatsApp' : 'Digite o código recebido'}</h1>
                <p className="nr-auth-subtitle">
                  {authStep === 'PHONE_SETUP'
                    ? 'Este número será usado para confirmar novos dispositivos antes de liberar o acesso.'
                    : `Enviamos um código de 6 dígitos pelo WhatsApp${phoneMasked ? ` para ${phoneMasked}` : ''}.`}
                </p>

                <div className="nr-auth-form">
                  {authStep === 'PHONE_SETUP' ? (
                    <label className="nr-auth-field">
                      <span className="nr-auth-label">WhatsApp com DDD</span>
                      <input className="nr-auth-input" value={mfaPhone} onChange={(event) => setMfaPhone(formatBrazilPhoneInput(event.target.value))} autoFocus inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" />
                    </label>
                  ) : (
                    <label className="nr-auth-field">
                      <span className="nr-auth-label">Código de 6 dígitos</span>
                      <input className="nr-auth-input" value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus inputMode="numeric" autoComplete="one-time-code" placeholder="000000" />
                    </label>
                  )}

                  {authStep === 'WHATSAPP_OTP' ? (
                    <label className="nr-auth-checkbox">
                      <input type="checkbox" checked={trustDevice} onChange={(event) => setTrustDevice(event.target.checked)} />
                      <span>Confiar neste dispositivo por 365 dias</span>
                    </label>
                  ) : null}

                  {error ? <div className="nr-auth-error"><XCircle size={16} /><span>{error}</span></div> : null}

                  <button
                    type="button"
                    className="nr-auth-primary"
                    onClick={authStep === 'PHONE_SETUP' ? () => void sendWhatsappOtp(mfaPhone) : verifyWhatsappOtp}
                    disabled={loading || (authStep === 'PHONE_SETUP' ? !normalizeBrazilPhone(mfaPhone) : otpCode.length !== 6)}
                  >
                    {loading ? 'Processando...' : authStep === 'PHONE_SETUP' ? 'Enviar código' : 'Verificar e entrar'}
                  </button>

                  {authStep === 'WHATSAPP_OTP' ? <button type="button" className="nr-auth-secondary-action" onClick={() => void sendWhatsappOtp()} disabled={loading}>Reenviar código</button> : null}
                  <button type="button" className="nr-auth-secondary-action" onClick={() => { setError(null); setOtpCode(''); setAuthStep('PASSWORD') }}>Voltar ao login</button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="nr-auth-title">{allowDevBootstrap ? 'Configurar acesso técnico' : 'Entrar na sua conta'}</h1>
            <p className="nr-auth-subtitle">{allowDevBootstrap ? 'Primeiro deploy: crie o único acesso DEV inicial antes de entrar no console.' : 'Acesse o painel e continue de onde parou.'}</p>

            {allowDevBootstrap ? (
              <section className="nr-auth-bootstrap" aria-labelledby="auth-bootstrap-title">
                <div className="nr-auth-bootstrap-header">
                  <span className="nr-auth-bootstrap-step">Configuração inicial</span>
                  <h2 className="nr-auth-bootstrap-title" id="auth-bootstrap-title">Criar usuário DEV</h2>
                  <p>Esse formulário aparece somente enquanto nenhum usuário técnico existe.</p>
                </div>
                <div className="nr-auth-bootstrap-fields">
                  <label className="nr-auth-field">
                    <span className="nr-auth-label">Email técnico</span>
                    <input
                      className="nr-auth-input"
                      value={bootstrapEmail}
                      onChange={(e) => setBootstrapEmail(e.target.value)}
                      placeholder="dev@seu-dominio.com"
                      inputMode="email"
                      autoComplete="email"
                    />
                  </label>
                  <label className="nr-auth-field">
                    <span className="nr-auth-label">WhatsApp com DDD</span>
                    <input
                      className="nr-auth-input"
                      value={bootstrapPhone}
                      onChange={(e) => setBootstrapPhone(formatBrazilPhoneInput(e.target.value))}
                      placeholder="(11) 99999-9999"
                      inputMode="tel"
                      autoComplete="tel"
                    />
                  </label>
                  <label className="nr-auth-field">
                    <span className="nr-auth-label">Senha inicial</span>
                    <input
                      className="nr-auth-input"
                      type={showPassword ? 'text' : 'password'}
                      value={bootstrapPassword}
                      onChange={(e) => setBootstrapPassword(e.target.value)}
                      placeholder="Crie uma senha segura"
                      autoComplete="new-password"
                      minLength={8}
                      aria-describedby="bootstrap-password-requirements"
                    />
                  </label>
                  <PasswordChecklist id="bootstrap-password-requirements" password={bootstrapPassword} />
                  {bootstrapRequiresSecret ? (
                    <label className="nr-auth-field">
                      <span className="nr-auth-label">Código de bootstrap</span>
                      <input
                        className="nr-auth-input"
                        type="password"
                        value={bootstrapSecret}
                        onChange={(e) => setBootstrapSecret(e.target.value)}
                        placeholder="DEV_BOOTSTRAP_SECRET"
                        autoComplete="off"
                      />
                    </label>
                  ) : null}
                  {bootstrapError ? (
                    <div className="nr-auth-error">
                      <XCircle size={16} />
                      <span>{bootstrapError}</span>
                    </div>
                  ) : null}
                  <button
                    className="nr-auth-primary"
                    type="button"
                    onClick={handleBootstrap}
                    disabled={bootstrapLoading || !bootstrapEmail || !normalizeBrazilPhone(bootstrapPhone) || bootstrapPassword.length < 8 || (bootstrapRequiresSecret && !bootstrapSecret.trim())}
                  >
                    {bootstrapLoading ? 'Criando...' : 'Criar DEV'}
                  </button>
                </div>
              </section>
            ) : null}

            {!allowDevBootstrap ? <div className="nr-auth-form">
              {bootstrapSuccess ? (
                <div className="nr-auth-notice nr-auth-notice-success" role="status">
                  <ShieldCheck size={16} />
                  <span>Usuário DEV criado. Entre com as credenciais que você acabou de definir.</span>
                </div>
              ) : null}
              <label className="nr-auth-field">
                <span className="nr-auth-label">Email</span>
                <input
                  className="nr-auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoFocus
                  inputMode="email"
                  autoComplete="email"
                />
              </label>

              <label className="nr-auth-field">
                <span className="nr-auth-label">Senha</span>
                <div className="nr-auth-input-wrap">
                  <input
                    className="nr-auth-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="nr-auth-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              <label className="nr-auth-checkbox">
                <input
                  type="checkbox"
                  checked={keepSigned}
                  onChange={(e) => setKeepSigned(e.target.checked)}
                />
                <span>Continuar conectado</span>
              </label>

              {error && (
                <div className="nr-auth-error">
                  <XCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <button type="button" className="nr-auth-primary" onClick={handleLogin} disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>

              <div className="nr-auth-footer nr-auth-account-help">
                {isTenant ? (
                  <span>Ainda não tem conta? Ela é criada ao concluir seu primeiro agendamento.</span>
                ) : props.isDevHost ? (
                  <span>Acesso restrito à equipe técnica da plataforma.</span>
                ) : (
                  <span>Entre pelo endereço do seu espaço para acessar a conta.</span>
                )}
                {supportUrl ? (
                  <a className="nr-auth-link" href={supportUrl} target="_blank" rel="noopener noreferrer">
                    Falar com suporte
                  </a>
                ) : null}
              </div>

              {(privacyUrl || termsUrl) ? (
                <nav className="nr-auth-legal" aria-label="Documentos legais">
                  {privacyUrl ? <a href={privacyUrl} target="_blank" rel="noopener noreferrer">Privacidade</a> : null}
                  {termsUrl ? <a href={termsUrl} target="_blank" rel="noopener noreferrer">Termos de uso</a> : null}
                </nav>
              ) : null}
            </div> : null}
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DateScroller({
  value,
  onChange,
  min,
  max,
  getDateStatus,
}: {
  value: string;
  onChange: (val: string) => void;
  min: string;
  max: string;
  getDateStatus?: (ymd: string) => { disabled: boolean; label?: string };
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState({ left: false, right: false })

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const handleScroll = () => {
      setScrollState({
        left: el.scrollLeft > 2,
        right: el.scrollLeft < el.scrollWidth - el.clientWidth - 2,
      })
    }

    el.addEventListener('scroll', handleScroll)
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleScroll) : null
    resizeObserver?.observe(el)
    handleScroll()

    return () => {
      el.removeEventListener('scroll', handleScroll)
      resizeObserver?.disconnect()
    }
  }, [min, max])

  const dates = useMemo(() => {
    const arr = []
    const [minY, minM, minD] = min.split('-').map(Number)
    const [maxY, maxM, maxD] = max.split('-').map(Number)

    const curr = new Date(minY, minM - 1, minD)
    const end = new Date(maxY, maxM - 1, maxD)

    while (curr <= end) {
      arr.push(new Date(curr))
      curr.setDate(curr.getDate() + 1)
    }
    return arr
  }, [min, max])

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = 200
      scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
    }
  }

  const getWeekDay = (d: Date) => {
    const s = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(d).replace('.', '')
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
  const getMonth = (d: Date) => {
    const s = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(d).replace('.', '')
    return s.charAt(0).toUpperCase() + s.slice(1)
  }

  return (
    <div className="dateScrollerWrapper">
      <button type="button"
        className={`dateScrollBtn left${scrollState.left ? ' is-visible' : ''}`}
        onClick={() => scroll('left')}
        aria-label="Ver datas anteriores"
        disabled={!scrollState.left}
      >
        <ChevronLeft size={20} />
      </button>

      <div className="dateScrollerContainer" ref={scrollRef}>
        {dates.map(d => {
          const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          const isSelected = value === dStr
          const isToday = min === dStr
          const status = getDateStatus ? getDateStatus(dStr) : { disabled: false }

          return (
            <button
              type="button"
              key={dStr}
              className={`dateCard ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${status.disabled ? 'disabled' : ''}`}
              aria-pressed={isSelected}
              disabled={status.disabled}
              aria-label={`${formatYmdPtBr(dStr)}${status.disabled ? `, ${status.label ?? 'fechado'}` : ''}`}
              onClick={() => {
                if (!status.disabled) onChange(dStr)
              }}
            >
              <span className="dateCardWeek">{getWeekDay(d)}</span>
              <span className="dateCardDay">{d.getDate()}</span>
              <span className="dateCardMonth">{getMonth(d)}</span>
              {status.disabled && <span className="dateCardStatus">{status.label ?? 'Fechado'}</span>}
            </button>
          )
        })}
      </div>

      <button type="button"
        className={`dateScrollBtn right${scrollState.right ? ' is-visible' : ''}`}
        onClick={() => scroll('right')}
        aria-label="Ver próximas datas"
        disabled={!scrollState.right}
      >
        <ChevronRight size={20} />
      </button>

      <div className={`dateScrollerBlur left${scrollState.left ? ' is-visible' : ''}`} />
      <div className={`dateScrollerBlur right${scrollState.right ? ' is-visible' : ''}`} />
    </div>
  )
}

function BookingPage(props: { tenant?: TenantPublic; tenantSlug?: string; basePath?: string } = {}) {
  const { tenantSlug } = useParams()
  const nav = useNavigate()
  const slug = (props.tenantSlug ?? tenantSlug ?? '').trim().toLowerCase()
  const basePath = props.basePath ?? (slug ? `/${slug}` : '')

  useEffect(() => { setAppMode('tenant') }, [])

  const [tenant, setTenant] = useState<TenantPublic | null>(props.tenant ?? null)
  const [services, setServices] = useState<Array<{ id: string; name: string; durationMinutes: number; priceCents: number; coverUrl?: string | null }>>([])
  const [booking, setBooking] = useState<{
    timezone: string
    currency: string
    bookingRules: { minNoticeMinutes: number; maxFutureDays: number; slotStepMinutes: number }
    professionals: PublicProfessional[]
    professionalHours: Array<{ professionalId: string; weekday: number; startMinute: number; endMinute: number }>
  } | null>(null)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [availabilityRequestKey, setAvailabilityRequestKey] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1)
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null)
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<'any' | string>('any')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [marketingDetailsOpen, setMarketingDetailsOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmedAppointment, setConfirmedAppointment] = useState<{ id: string; status: string; professionalId?: string; professionalName?: string } | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setLoadError(null)
    const tenantPromise = props.tenant
      ? Promise.resolve({ ok: true as const, data: { tenant: props.tenant } })
      : api<{ tenant: TenantPublic }>(slug ? `/api/public/tenant/${encodeURIComponent(slug)}` : '/api/public/tenant')
    const servicesPromise = api<{ services: typeof services }>(slug ? `/api/public/tenant/${encodeURIComponent(slug)}/services` : '/api/public/services')
    const bookingPromise = api<typeof booking>(slug ? `/api/public/tenant/${encodeURIComponent(slug)}/booking` : '/api/public/booking')
    Promise.all([tenantPromise, servicesPromise, bookingPromise]).then(([tenantRes, servicesRes, bookingRes]) => {
      if (!mounted) return
      if (!tenantRes.ok) { setLoadError(tenantRes.error.message); return }
      setTenant(tenantRes.data.tenant)
      applyTenantTheme(tenantRes.data.tenant)
      if (!servicesRes.ok) { setLoadError(servicesRes.error.message); return }
      if (!bookingRes.ok) { setLoadError(bookingRes.error.message); return }
      setServices(servicesRes.data.services)
      setBooking(bookingRes.data)
    }).finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [slug, props.tenant])

  useEffect(() => {
    if (!selectedDate || !selectedServiceId) { setAvailableSlots([]); setAvailabilityError(null); setAvailabilityLoading(false); return }
    let mounted = true
    const controller = new AbortController()
    setAvailabilityLoading(true)
    setAvailabilityError(null)
    const params = new URLSearchParams({ date: selectedDate, serviceId: selectedServiceId })
    if (selectedProfessionalId !== 'any') params.set('professionalId', selectedProfessionalId)
    params.set('_', String(Date.now()))
    const url = slug
      ? `/api/public/tenant/${encodeURIComponent(slug)}/availability?${params.toString()}`
      : `/api/public/availability?${params.toString()}`
    api<{ slots: string[] }>(url, { signal: controller.signal }).then((res) => {
      if (!mounted) return
      if (res.ok) setAvailableSlots(res.data.slots)
      else if (res.error.code !== 'REQUEST_ABORTED') { setAvailableSlots([]); setAvailabilityError(res.error.message) }
    }).finally(() => { if (mounted) setAvailabilityLoading(false) })
    return () => { mounted = false; controller.abort() }
  }, [slug, selectedDate, selectedServiceId, selectedProfessionalId, availabilityRequestKey])

  const selectedService = useMemo(() => services.find((s) => s.id === selectedServiceId) ?? null, [services, selectedServiceId])
  const eligibleProfessionals = useMemo(() => (booking?.professionals ?? []).filter((professional) => !selectedServiceId || professional.serviceIds.includes(selectedServiceId)), [booking, selectedServiceId])
  const selectedProfessional = selectedProfessionalId === 'any' ? null : eligibleProfessionals.find((professional) => professional.id === selectedProfessionalId) ?? null
  const professionalsInScope = selectedProfessional ? [selectedProfessional] : eligibleProfessionals
  const dateLimits = useMemo(() => {
    const timeZone = booking?.timezone ?? 'America/Sao_Paulo'
    const min = ymdInTimeZone(new Date(), timeZone)
    const max = addDaysToYmd(min, booking?.bookingRules.maxFutureDays ?? 60) ?? min
    return { min, max }
  }, [booking])
  const dateStatusFor = useMemo(() => {
    if (!booking) return () => ({ disabled: false, label: undefined as string | undefined })
    return (ymd: string) => {
      const day = weekdayIndexForYmd(ymd, booking.timezone)
      if (day === null) return { disabled: true, label: 'Indisponível' }
      const eligibleIds = new Set(professionalsInScope.map((professional) => professional.id))
      const ranges = booking.professionalHours.filter((h) => eligibleIds.has(h.professionalId) && h.weekday === day)
      return ranges.length === 0 ? { disabled: true, label: 'Fechado' } : { disabled: false, label: undefined }
    }
  }, [booking, professionalsInScope])

  const availableTimeSlots = useMemo(() => availableSlots.map((time) => ({ time })), [availableSlots])

  const money = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`
  const progress = Math.min(step, 5)

  async function confirmBooking() {
    if (!selectedService || !selectedTime || !selectedDate) return
    const name = clientName.trim()
    const phone = normalizeBrazilPhone(clientPhone)
    if (name.length < 2) { setActionError('Como podemos chamar você?'); return }
    if (!phone) { setActionError('Informe um WhatsApp brasileiro válido, com DDD.'); return }
    const startsAt = zonedDateTimeToUtc(selectedDate, selectedTime, booking?.timezone ?? 'America/Sao_Paulo')
    if (!startsAt) { setActionError('Não conseguimos validar este horário. Escolha novamente.'); return }
    setSaving(true); setActionError(null)
    const endpoint = slug ? `/api/public/tenant/${encodeURIComponent(slug)}/appointments` : '/api/public/appointments'
    const res = await api<{ appointment: { id: string; status: string; professionalId?: string; professionalName?: string } }>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ serviceId: selectedService.id, professionalId: selectedProfessionalId === 'any' ? null : selectedProfessionalId, startsAt: startsAt.toISOString(), name, phone, marketingConsent: marketingOptIn }),
    })
    setSaving(false)
    if (!res.ok) { setActionError(res.error.message); return }
    setConfirmedAppointment(res.data.appointment)
  }

  function resetBooking() {
    setConfirmedAppointment(null); setStep(1); setSelectedServiceId(null); setSelectedProfessionalId('any'); setSelectedDate(''); setSelectedTime(null); setClientName(''); setClientPhone(''); setMarketingOptIn(false); setMarketingDetailsOpen(false); setActionError(null)
  }

  if (loading) return <div className="nr-booking-access nr-booking-access-loading"><div className="nr-booking-access-skeleton" /></div>
  if (loadError) return <div className="nr-booking-access"><div className="nr-booking-access-error"><strong>Não conseguimos abrir esta agenda.</strong><span>{loadError}</span></div></div>

  const summary = [
    selectedService ? { label: 'Serviço', value: selectedService.name } : null,
    selectedService ? { label: 'Profissional', value: selectedProfessional ? selectedProfessional.nickname || selectedProfessional.name : 'Próximo disponível' } : null,
    selectedDate ? { label: 'Data', value: formatYmdPtBr(selectedDate) } : null,
    selectedTime ? { label: 'Horário', value: selectedTime } : null,
  ].filter(Boolean) as Array<{label:string; value:string}>

  const stepLabels = ['Serviço', 'Profissional', 'Data', 'Horário', 'Confirmar']
  const stepLabel = stepLabels[progress - 1]
  const sideImage = selectedService?.coverUrl || bundledServiceCover(selectedService?.name || '') || '/naregua/services/traditional.webp'
  const mobileTimeGroups = [
    { label: 'Manhã', hint: 'até 11:59', slots: availableTimeSlots.filter((slot) => Number(slot.time.slice(0, 2)) < 12) },
    { label: 'Tarde', hint: '12:00 — 17:59', slots: availableTimeSlots.filter((slot) => { const hour = Number(slot.time.slice(0, 2)); return hour >= 12 && hour < 18 }) },
    { label: 'Noite', hint: 'a partir das 18:00', slots: availableTimeSlots.filter((slot) => Number(slot.time.slice(0, 2)) >= 18) },
  ].filter((group) => group.slots.length)
  const canVisitStep = (target: number) => {
    if (target <= 1) return true
    if (target === 2) return Boolean(selectedService)
    if (target === 3) return Boolean(selectedService && professionalsInScope.length)
    if (target === 4) return Boolean(selectedService && selectedDate)
    return Boolean(selectedService && selectedDate && selectedTime)
  }

  return <main className="nr-booking">
    <div className="nr-booking-shell">
      <header className="nr-booking-topbar">
        <button type="button" className="nr-booking-brand" onClick={() => nav(withBasePath(basePath, '/'))} aria-label={`Voltar para ${tenant?.name || 'o espaço'}`}>
          {tenant?.logoUrl ? <img src={tenant.logoUrl} alt="" /> : <img src="/brand/logo-symbol-approved-web.png" alt="" />}
          <span><strong>{tenant?.name}</strong><small>Agendamento online</small></span>
        </button>

        {!confirmedAppointment ? <nav className="nr-booking-steps" aria-label="Etapas do agendamento">
          {stepLabels.map((label, index) => {
            const number = index + 1
            const available = canVisitStep(number)
            return <button
              type="button"
              key={label}
              className={`${number === progress ? 'is-current' : ''} ${number < progress ? 'is-complete' : ''}`}
              disabled={!available}
              aria-current={number === progress ? 'step' : undefined}
              aria-label={`${number}. ${label}`}
              onClick={() => available && setStep(number)}
            >
              <span>{String(number).padStart(2, '0')}</span>
              <strong>{label}</strong>
            </button>
          })}
        </nav> : <span className="nr-booking-complete-label">Reserva concluída</span>}

      </header>

      {!confirmedAppointment ? <div className="nr-booking-body">
        <section className="nr-booking-workspace">
          <div className="nr-booking-kicker"><span>{stepLabel}</span><i /></div>
          <div className="nr-booking-heading">
            <h1>{step === 1 ? 'Qual cuidado você quer hoje?' : step === 2 ? 'Com quem você prefere?' : step === 3 ? 'Quando fica melhor para você?' : step === 4 ? 'Escolha o seu horário.' : 'Últimos detalhes.'}</h1>
            <p>{step === 1 ? 'Escolha o atendimento e veja os horários disponíveis.' : step === 2 ? 'Escolha alguém da equipe ou deixe a agenda encontrar o próximo horário.' : step === 3 ? 'Selecione um dia disponível na agenda.' : step === 4 ? 'Estes horários estão livres agora.' : 'Seu nome e WhatsApp bastam para reservar.'}</p>
          </div>

          {step < 5 && summary.length ? <div className="nr-booking-mobile-summary">
            {summary.map((item) => <span key={item.label}><small>{item.label}</small><strong>{item.value}</strong></span>)}
          </div> : null}

          <div className="nr-booking-content">
            {step === 1 ? <div className="nr-booking-services">
              {services.map((service, index) => <button type="button" key={service.id} className="nr-booking-service" onClick={() => { setSelectedServiceId(service.id); setSelectedProfessionalId('any'); setSelectedDate(''); setSelectedTime(null); setStep(2) }}>
                <div className="nr-booking-service-photo"><img src={service.coverUrl || bundledServiceCover(service.name)} alt="" onError={(e) => { e.currentTarget.src = '/naregua/services/traditional.webp' }} /><span className="nr-booking-service-index">{String(index + 1).padStart(2, '0')}</span></div>
                <div className="nr-booking-service-copy"><strong>{service.name}</strong><span>{service.durationMinutes} min</span></div>
                <div className="nr-booking-service-price"><strong>{money(service.priceCents)}</strong><span aria-hidden="true">↗</span></div>
              </button>)}
              {!services.length ? <EmptyState icon={<Scissors size={24}/>} title="Nenhum serviço disponível" description="Este espaço ainda não publicou serviços para agendamento." /> : null}
            </div> : null}

            {step === 2 ? <div className="nr-booking-professionals">
              <button type="button" className={`nr-booking-professional is-any${selectedProfessionalId === 'any' ? ' is-selected' : ''}`} onClick={() => { setSelectedProfessionalId('any'); setSelectedDate(''); setSelectedTime(null); setStep(3) }}>
                <span className="nr-booking-professional-avatar"><Users size={23} /></span>
                <span className="nr-booking-professional-copy"><strong>Próximo disponível</strong><small>Mais opções de horário</small></span>
                <span className="nr-booking-professional-action"><ArrowRight size={15} /></span>
              </button>
              {eligibleProfessionals.map((professional) => <button type="button" key={professional.id} className={`nr-booking-professional${selectedProfessionalId === professional.id ? ' is-selected' : ''}`} style={{ '--professional-color': professional.color } as CSSProperties} onClick={() => { setSelectedProfessionalId(professional.id); setSelectedDate(''); setSelectedTime(null); setStep(3) }}>
                <span className="nr-booking-professional-avatar">{professional.photoUrl ? <img src={professional.photoUrl} alt="" /> : (professional.nickname || professional.name).slice(0, 2).toUpperCase()}</span>
                <span className="nr-booking-professional-copy"><strong>{professional.nickname || professional.name}</strong><small>{professional.inheritsHours ? 'Agenda do espaço' : 'Horários próprios'}</small></span>
                <span className="nr-booking-professional-action"><ArrowRight size={15} /></span>
              </button>)}
              {!eligibleProfessionals.length ? <EmptyState icon={<Users size={24}/>} title="Equipe indisponível" description="Nenhum profissional está habilitado para este serviço no momento." /> : null}
            </div> : null}

            {step === 3 ? <div className="nr-booking-date"><DateScroller value={selectedDate} min={dateLimits.min} max={dateLimits.max} onChange={(value) => { setSelectedDate(value); setSelectedTime(null); setStep(4) }} getDateStatus={dateStatusFor} /></div> : null}

            {step === 4 ? <div className="nr-booking-times">
              {availabilityLoading ? <div className="nr-booking-time-loading" role="status"><span className="spinner" /><strong>Consultando a agenda…</strong></div> : availabilityError ? <div className="nr-booking-empty-time" role="alert"><Clock size={22} /><strong>Não conseguimos consultar os horários.</strong><p>{availabilityError}</p><button type="button" onClick={() => setAvailabilityRequestKey((key) => key + 1)}>Tentar novamente</button></div> : availableTimeSlots.length ? <>
                <div className="nr-booking-time-grid nr-booking-time-grid-desktop">{availableTimeSlots.map((slot) => <button type="button" key={slot.time} onClick={() => { setSelectedTime(slot.time); setStep(5) }}><span>{slot.time}</span><small>disponível</small></button>)}</div>
                <div className="nr-booking-mobile-time-groups">{mobileTimeGroups.map((group) => <section key={group.label}><header><strong>{group.label}</strong><span>{group.hint}</span></header><div>{group.slots.map((slot) => <button type="button" key={slot.time} onClick={() => { setSelectedTime(slot.time); setStep(5) }}>{slot.time}<ArrowRight size={14} /></button>)}</div></section>)}</div>
              </> : <div className="nr-booking-empty-time"><Clock size={22} /><strong>Nenhum horário livre por aqui.</strong><p>Escolha outro dia e continuamos.</p><button type="button" onClick={() => setStep(3)}>Trocar a data</button></div>}
            </div> : null}

            {step === 5 ? <div className="nr-booking-confirm">
              <div className="nr-booking-mobile-review">
                <img src={sideImage} alt="" onError={(e) => { e.currentTarget.src = '/naregua/services/traditional.webp' }} />
                <div><small>Seu horário</small><strong>{selectedService?.name}</strong><span>{selectedDate ? formatYmdPtBr(selectedDate) : ''} · {selectedTime}{selectedProfessional ? ` · ${selectedProfessional.nickname || selectedProfessional.name}` : ''}</span></div>
                <b>{selectedService ? money(selectedService.priceCents) : ''}</b>
              </div>

              <div className="nr-booking-fields">
                <label><span>Seu nome</span><input value={clientName} onChange={(e) => { setClientName(e.target.value); setActionError(null) }} placeholder="Como podemos chamar você?" autoComplete="name" /></label>
                <label><span>WhatsApp</span><input value={clientPhone} onChange={(e) => { setClientPhone(formatBrazilPhoneInput(e.target.value)); setActionError(null) }} placeholder="(11) 99999-9999" inputMode="tel" autoComplete="tel" maxLength={20} /></label>
              </div>

              <div className="nr-booking-meta-row">
                <p className="nr-booking-privacy"><ShieldCheck size={15} /> Número usado para identificar e confirmar a reserva.</p>
                <div className={`nr-booking-consent ${marketingOptIn ? 'is-checked' : ''}`}>
                  <label>
                    <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} />
                    <span>Receber novidades, horários especiais e ofertas</span>
                  </label>
                  <button type="button" aria-expanded={marketingDetailsOpen} onClick={() => setMarketingDetailsOpen((value) => !value)}>{marketingDetailsOpen ? 'Fechar' : 'Ler mais'}</button>
                </div>
              </div>
              {marketingDetailsOpen ? <p className="nr-booking-consent-detail">Opcional. Você autoriza este espaço a enviar promoções pelo WhatsApp. Isso não muda seu agendamento e pode ser desativado a qualquer momento em Meus horários ou respondendo SAIR. Consulte a <a href="/privacidade#marketing-whatsapp" target="_blank" rel="noopener noreferrer">Política de Privacidade</a>.</p> : null}

              {actionError ? <div className="nr-booking-action-error">{actionError}</div> : null}
              <button type="button" className="nr-booking-confirm-button" onClick={confirmBooking} disabled={saving}>
                <span>{saving ? 'Reservando…' : `Reservar${selectedTime ? ` às ${selectedTime}` : ''}`}</span>
                <i><ArrowRight size={17} /></i>
              </button>
            </div> : null}
          </div>
        </section>

        <aside className="nr-booking-dossier" aria-label="Resumo da reserva">
          <div className="nr-booking-dossier-head"><span>Sua reserva</span><small>{progress < 5 ? 'Atualiza enquanto você escolhe' : 'Confira antes de reservar'}</small></div>
          <div className={`nr-booking-dossier-photo ${selectedService ? 'has-service' : ''}`}>
            <img src={sideImage} alt="" aria-hidden="true" onError={(e) => { e.currentTarget.src = '/naregua/services/traditional.webp' }} />
            <div><small>{selectedService ? 'Serviço escolhido' : 'Seu momento'}</small><strong>{selectedService?.name || 'Um horário só seu.'}</strong></div>
          </div>
          <dl className="nr-booking-dossier-list">
            <div><dt>Serviço</dt><dd>{selectedService?.name || <em>A escolher</em>}</dd></div>
            <div><dt>Profissional</dt><dd>{selectedService ? (selectedProfessional ? selectedProfessional.nickname || selectedProfessional.name : 'Próximo disponível') : <em>A escolher</em>}</dd></div>
            <div><dt>Data</dt><dd>{selectedDate ? formatYmdPtBr(selectedDate) : <em>A escolher</em>}</dd></div>
            <div><dt>Horário</dt><dd>{selectedTime || <em>A escolher</em>}</dd></div>
            {selectedService ? <div className="is-total"><dt>Valor</dt><dd>{money(selectedService.priceCents)}</dd></div> : null}
          </dl>
          <div className="nr-booking-dossier-note"><span aria-hidden="true">✦</span><p><strong>Sem senha e sem cadastro complicado.</strong><br />Seu WhatsApp dá acesso aos seus horários.</p></div>
        </aside>
      </div> : <div className="nr-booking-success">
        <div className="nr-booking-success-copy">
          <span>Agendamento realizado</span>
          <h1>Seu horário está reservado, {clientName.split(' ')[0] || 'pronto'}.</h1>
          <p>{selectedService?.name} · {confirmedAppointment.professionalName || selectedProfessional?.nickname || selectedProfessional?.name || 'Equipe'} · {selectedDate ? formatYmdPtBr(selectedDate) : ''} · {selectedTime}</p>
          <small className="nr-booking-success-confirmation">Mais perto do atendimento, você recebe a confirmação pelo WhatsApp e responde por lá.</small>
          <div><button type="button" onClick={() => nav(withBasePath(basePath, '/cliente'))}>Ver meus horários <ArrowRight size={16} /></button><button type="button" onClick={resetBooking}>Fazer outra reserva</button></div>
        </div>
        <figure className="nr-booking-success-photo"><img src={sideImage} alt="" /></figure>
      </div>}

      {!confirmedAppointment ? <footer className="nr-booking-footer">
        <button type="button" onClick={() => step === 1 ? nav(withBasePath(basePath, '/')) : setStep((value) => Math.max(1, value - 1))}><ChevronLeft size={16} /> {step === 1 ? 'Voltar ao espaço' : 'Voltar'}</button>
        <span>Reserva online · atendimento continua humano</span>
      </footer> : null}
    </div>
  </main>

}

function ClientPortal(props: { tenant?: TenantPublic; tenantSlug?: string; basePath?: string } = {}) {
    const { tenantSlug } = useParams()
    const nav = useNavigate()
    const slug = (props.tenantSlug ?? tenantSlug ?? '').trim().toLowerCase()
    const basePath = props.basePath ?? (slug ? `/${slug}` : '')
    const [me, setMe] = useState<SessionUser | null>(null)
    const [authLoading, setAuthLoading] = useState(true)
    const [appointments, setAppointments] = useState<ClientAppointment[]>([])
    const [appointmentsLoading, setAppointmentsLoading] = useState(true)
    const [tenantTimeZone, setTenantTimeZone] = useState('America/Sao_Paulo')
    const [accessPhone, setAccessPhone] = useState('')
    const [accessCode, setAccessCode] = useState('')
    const [accessStage, setAccessStage] = useState<'phone' | 'code'>('phone')
    const [accessBusy, setAccessBusy] = useState(false)
    const [accessError, setAccessError] = useState<string | null>(null)
    const [marketingPreferences, setMarketingPreferences] = useState<{ whatsappPromotions: boolean } | null>(null)
    const [marketingBusy, setMarketingBusy] = useState(false)
    const [marketingError, setMarketingError] = useState<string | null>(null)
    const clientTourSteps = useMemo(() => shellTourSteps('client', 'appointments'), [])

    useEffect(() => {
        setAppMode('tenant')
        if (props.tenant) applyTenantTheme(props.tenant)
        api<{ user: SessionUser | null }>('/api/auth/me').then(res => {
            if(res.ok) setMe(res.data.user)
            setAuthLoading(false)
        })
    }, [])

    useEffect(() => {
        if (props.tenant) return
        api<{ tenant: TenantPublic }>(slug ? `/api/public/tenant/${encodeURIComponent(slug)}` : '/api/public/tenant').then((res) => {
            if (!res.ok) return
            applyTenantTheme(res.data.tenant)
        })
        api<{ timezone: string }>(slug ? `/api/public/tenant/${encodeURIComponent(slug)}/booking` : '/api/public/booking').then((res) => {
            if (res.ok && res.data?.timezone) setTenantTimeZone(res.data.timezone)
        })
    }, [slug, props.tenant])

    useEffect(() => {
        if (!me) return
        setAppointmentsLoading(true)
        api<{appointments: ClientAppointment[]}>('/api/client/appointments').then(res => {
            if(res.ok) setAppointments(res.data.appointments)
            else notify(res.error.message, 'error')
            setAppointmentsLoading(false)
        })
        api<{preferences: { whatsappPromotions: boolean }}>('/api/client/marketing-preferences').then(res => {
            if(res.ok) setMarketingPreferences(res.data.preferences)
            else notify(res.error.message, 'error')
        })
    }, [me])

    async function updateMarketingPreference(nextValue: boolean) {
        if (marketingBusy) return
        setMarketingBusy(true)
        setMarketingError(null)
        const res = await api<{ preferences: { whatsappPromotions: boolean } }>('/api/client/marketing-preferences', {
            method: 'PUT',
            body: JSON.stringify({ whatsappPromotions: nextValue }),
        })
        setMarketingBusy(false)
        if (!res.ok) { setMarketingError(res.error.message); return }
        setMarketingPreferences(res.data.preferences)
    }

  if (authLoading) {
        return (
            <Shell title="Minha área" subtitle="Carregando..." sidebar={<div className="nav" />}>
                <div className="client-portal-loading">
                    <div className="card skeleton skeleton-card" />
                </div>
            </Shell>
        )
    }

    if (!me || me.role !== 'CLIENT') {
        async function requestAccess() {
            if (!normalizeBrazilPhone(accessPhone)) { setAccessError('Informe um WhatsApp brasileiro válido, com DDD.'); return }
            setAccessBusy(true); setAccessError(null)
            const res = await api<{ sent: true }>('/api/public/client-access/request', { method: 'POST', body: JSON.stringify({ tenantSlug: slug, phone: normalizeBrazilPhone(accessPhone) ?? accessPhone }) })
            setAccessBusy(false)
            if (!res.ok) { setAccessError(res.error.message); return }
            setAccessStage('code')
        }
        async function verifyAccess() {
            if (!/^\d{6}$/.test(accessCode.trim())) { setAccessError('Digite o código de 6 números enviado no WhatsApp.'); return }
            setAccessBusy(true); setAccessError(null)
            const res = await api<{ user: SessionUser }>('/api/public/client-access/verify', { method: 'POST', body: JSON.stringify({ tenantSlug: slug, phone: normalizeBrazilPhone(accessPhone) ?? accessPhone, code: accessCode.trim() }) })
            setAccessBusy(false)
            if (!res.ok) { setAccessError(res.error.message); return }
            setMe(res.data.user)
        }
        return (
            <main className="nr-client-access-access">
              <section className="nr-client-access-access-card">
                <button type="button" className="nr-client-access-back" onClick={() => nav(withBasePath(basePath, '/'))}><ChevronLeft size={17}/> Voltar</button>
                <div className="nr-client-access-access-brand"><span><Smartphone size={20}/></span><div><strong>Meus horários</strong><small>{props.tenant?.name ?? 'NaRégua'}</small></div></div>
                <div className="nr-client-access-access-copy"><span>Acesso simples</span><h1>{accessStage === 'phone' ? 'Entre com seu WhatsApp.' : 'Confira seu WhatsApp.'}</h1><p>{accessStage === 'phone' ? 'Sem e-mail e sem senha. Em um aparelho novo, confirmamos que o número é seu.' : 'Enviamos um código de 6 números. Ele expira em poucos minutos.'}</p></div>
                {accessStage === 'phone' ? <label className="nr-client-access-field"><span>WhatsApp com DDD</span><input value={accessPhone} onChange={(e) => { setAccessPhone(formatBrazilPhoneInput(e.target.value)); setAccessError(null) }} placeholder="(11) 99999-9999 ou +55…" inputMode="tel" autoComplete="tel" maxLength={20} autoFocus /></label> : <label className="nr-client-access-field"><span>Código de acesso</span><input value={accessCode} onChange={(e) => { setAccessCode(e.target.value.replace(/\D/g,'').slice(0,6)); setAccessError(null) }} placeholder="000000" inputMode="numeric" autoComplete="one-time-code" autoFocus /></label>}
                {accessError ? <div className="nr-client-access-access-error">{accessError}</div> : null}
                <button type="button" className="nr-client-access-access-submit" disabled={accessBusy} onClick={accessStage === 'phone' ? requestAccess : verifyAccess}>{accessBusy ? 'Aguarde…' : accessStage === 'phone' ? 'Continuar pelo WhatsApp' : 'Entrar nos meus horários'} <ArrowRight size={17}/></button>
                {accessStage === 'code' ? <div className="nr-client-access-access-secondary"><button type="button" className="nr-client-access-change-phone" disabled={accessBusy} onClick={requestAccess}>Reenviar código</button><span aria-hidden="true">·</span><button type="button" className="nr-client-access-change-phone" onClick={() => { setAccessStage('phone'); setAccessCode(''); setAccessError(null) }}>Usar outro número</button></div> : null}
                <small className="nr-client-access-access-note"><ShieldCheck size={14}/> Neste navegador, sua sessão fica lembrada. Novo dispositivo pede confirmação novamente.</small>
              </section>
            </main>
        )
    }

    return (
        <Shell
            title="Minha área"
            subtitle="Seus horários"
            user={me}
            tourKey="client-appointments"
            tourSteps={clientTourSteps}
            autoStartTour
            bottomNav={[
              { key: 'appointments', label: 'Horários', icon: <ClipboardList size={18}/>, active: true, onClick: () => {} },
              { key: 'schedule', label: 'Agendar', icon: <Calendar size={18}/>, active: false, onClick: () => nav(withBasePath(basePath, '/agendar')) },
            ]}
            sidebar={
                <div className="nr-nav-group">
                    <SidebarItem icon={<Calendar size={18}/>} label="Novo agendamento" onClick={() => nav(withBasePath(basePath, '/agendar'))} />
                    <SidebarItem active icon={<ClipboardList size={18}/>} label="Meus agendamentos" onClick={() => {}} />
                    <div className="navDivider" />
                    <SidebarItem icon={<LogOut size={18}/>} label="Sair" onClick={async () => {
                        await api('/api/auth/logout', {method: 'POST'})
                        nav(withBasePath(basePath, '/'))
                    }} />
                </div>
            }
        >
            <div className="column client-portal-layout">
            <div className="card">
                <div className="cardHeader"><h2 className="cardTitle">Meus agendamentos</h2></div>

                <div className="table-scroll">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th className="client-portal-service-cell">Serviço</th>
                                <th>Profissional</th>
                                <th>Data e horário</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {appointmentsLoading ? (
                                <tr><td colSpan={4} className="nr-table-loading-cell"><div className="skeleton skeleton-text" /></td></tr>
                            ) : appointments.length === 0 ? (
                                <tr><td colSpan={4}><EmptyState compact icon={<Calendar size={24}/>} title="Nenhum agendamento encontrado" /></td></tr>
                            ) : (
                                appointments.map(a => {
                                    const meta = appointmentPresenceMeta(a.status, a.confirmationStatus)
                                    const statusLabel = meta.label
                                    const statusClass = meta.className

                                    return (
                                        <tr key={a.id}>
                                            <td className="client-portal-service-cell">{a.serviceName}</td>
                                            <td><span className="nr-professional-inline"><i style={{ background: a.professionalColor }} />{a.professionalName}</span></td>
                                            <td>{formatDateTimeInZone(a.startsAt, tenantTimeZone)}</td>
                                            <td><span className={`status-badge ${statusClass}`}>{statusLabel}</span></td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mobile-appointment-list client-portal-mobile-list">
                    {appointmentsLoading ? <div className="skeleton skeleton-card client-portal-mobile-skeleton" /> : null}
                    {!appointmentsLoading && appointments.length === 0 ? <EmptyState icon={<Calendar size={24}/>} title="Nenhum agendamento" description="Seus próximos horários aparecerão aqui." /> : null}
                    {!appointmentsLoading && appointments.map(a => {
                            const meta = appointmentPresenceMeta(a.status, a.confirmationStatus)
                            const statusLabel = meta.label
                            const statusClass = meta.className

                            return (
                                <div className="mobile-appointment-card" key={a.id}>
                                    <div className="mobile-appointment-header">
                                        <strong className="client-portal-mobile-service">{a.serviceName}</strong>
                                        <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
                                    </div>
                                    <div className="mobile-appointment-row">
                                        <div className="client-portal-mobile-time">
                                            <Clock size={14} />
                                            {formatDateTimeInZone(a.startsAt, tenantTimeZone)}
                                        </div>
                                        <span className="nr-professional-inline"><i style={{ background: a.professionalColor }} />{a.professionalName}</span>
                                    </div>
                                </div>
                            )
                    })}
                </div>
            </div>
            {marketingPreferences ? <section className="client27-comms" aria-label="Preferências de comunicação">
                <div><span>Comunicação</span><strong>Novidades no WhatsApp</strong><small>{marketingPreferences.whatsappPromotions ? 'Você autorizou ofertas e novidades.' : 'Promoções desativadas.'}</small></div>
                <button type="button" disabled={marketingBusy} onClick={() => void updateMarketingPreference(!marketingPreferences.whatsappPromotions)}>{marketingBusy ? 'Salvando…' : marketingPreferences.whatsappPromotions ? 'Desativar' : 'Ativar'}</button>
                {marketingError ? <p role="alert">{marketingError}</p> : null}
            </section> : null}
            </div>
        </Shell>
    )
}

function SlugToSubdomainRedirect() {
  const params = useParams()
  const loc = useLocation()
  const slug = String(params.tenantSlug ?? '').trim().toLowerCase()
  const rest = String((params as Record<string, unknown>)['*'] ?? '').trim()
  const [redirectError, setRedirectError] = useState('')

  useEffect(() => {
    setRedirectError('')
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      setRedirectError('Este endereço de espaço não é válido.')
      return
    }
    let target = configuredPlatformBaseUrl()
    if (!target && import.meta.env.DEV && typeof window !== 'undefined') {
      target = new URL(window.location.origin)
    }
    if (!target) {
      setRedirectError('O endereço principal da plataforma ainda não foi configurado.')
      return
    }

    const rootHost = target.hostname.toLowerCase().startsWith('www.') ? target.hostname.slice(4) : target.hostname
    const port = target.port ? `:${target.port}` : ''
    const path = rest ? `/${rest}` : '/'
    window.location.assign(`${target.protocol}//${slug}.${rootHost}${port}${path}${loc.search}${loc.hash}`)
  }, [slug, rest, loc.search, loc.hash])

  return (
    <main className="nr-route-state" aria-live="polite">
      {redirectError ? (
        <section className="nr-route-state-card" role="alert">
          <span className="nr-route-state-mark"><Globe size={22} /></span>
          <p className="nr-route-state-kicker">Endereço indisponível</p>
          <h1>Não foi possível abrir este espaço.</h1>
          <p>{redirectError}</p>
          <a className="btn btn-primary" href="/">Voltar ao início</a>
        </section>
      ) : (
        <div className="nr-route-redirect"><span className="spinner" /><strong>Redirecionando para o espaço…</strong></div>
      )}
    </main>
  )
}

function RootEntry(props: {
  hostTenant?: TenantPublic | null
  renderWhenAuthenticated?: (user: SessionUser) => ReactNode
  loginElement: ReactNode
}) {
  const [checking, setChecking] = useState(true)
  const [me, setMe] = useState<SessionUser | null>(null)

  useEffect(() => {
    let mounted = true
    api<{ user: SessionUser | null }>('/api/auth/me').then((res) => {
      if (!mounted) return
      if (res.ok) setMe(res.data.user)
      setChecking(false)
    })
    return () => {
      mounted = false
    }
  }, [])

  if (checking) {
    return (
      <div className="nr-auth-loading">
        <div className="nr-auth-loading-card nr-auth-loading-skeleton skeleton skeleton-card" />
      </div>
    )
  }

  if (!me) return props.loginElement

  if (props.renderWhenAuthenticated) {
    return <>{props.renderWhenAuthenticated(me)}</>
  }

  const next = me.role === 'CLIENT' ? '/cliente' : me.role === 'PROFESSIONAL' ? '/profissional' : '/admin'
  return <Navigate to={next} replace />
}

function NewTransactionModal({ isOpen, onClose, onSuccess, todayYmd, professionalId, professionals }: { isOpen: boolean; onClose: () => void; onSuccess: () => void; todayYmd: string; professionalId: ProfessionalScope; professionals: Professional[] }) {
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayYmd)
  const [assignedProfessionalId, setAssignedProfessionalId] = useState(professionalId === 'all' ? 'general' : professionalId)


  useEffect(() => {
    if (!isOpen) return
    setType('EXPENSE')
    setAmount('')
    setMethod('')
    setNote('')
    setDate(todayYmd)
    setAssignedProfessionalId(professionalId === 'all' ? 'general' : professionalId)
  }, [isOpen, todayYmd, professionalId])


  function handleAmountChange(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, '')
    if (!value) {
      setAmount('')
      return
    }
    const numberValue = Number(value) / 100
    setAmount(numberValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const parsedAmount = Math.round(Number(amount.replace(/\./g, '').replace(',', '.')) * 100)
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        notify('Informe um valor maior que zero.', 'warning')
        setLoading(false)
        return
      }

      const res = await api('/api/admin/finance/transactions', {
        method: 'POST',
        body: JSON.stringify({
          type,
          amountCents: parsedAmount,
          method: method.trim() || undefined,
          note: note.trim() || undefined,
          date,
          professionalId: assignedProfessionalId === 'general' ? null : assignedProfessionalId,
        })
      })

      if (!res.ok) {
        throw new Error(res.error?.message || 'Erro ao salvar')
      }

      onSuccess()
      onClose()
      // Reset form
      setAmount('')
      setMethod('')
      setNote('')
      setDate(todayYmd)
    } catch (err) {
      console.error(err)
      notify('Erro ao salvar movimentação: ' + (err as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <ModalRoot onClick={loading ? undefined : onClose}>
      <div className="nr-dialog nr-finance-dialog nr-finance-entry-transaction-dialog" role="dialog" aria-modal="true" aria-labelledby="transaction-dialog-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="nr-finance-entry-dialog-kicker">Financeiro</span>
            <h3 id="transaction-dialog-title" className="modal-title">Nova movimentação</h3>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar janela" disabled={loading}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body nr-finance-entry-transaction-form">
            <div className="nr-finance-entry-form-stack">
                <div className="nr-finance-entry-form-grid">
                    <div className="input-group">
                        <span className="label">Tipo</span>
                        <ProductSelect
                            value={type}
                            onChange={(next) => setType(next as 'INCOME' | 'EXPENSE')}
                            ariaLabel="Tipo da movimentação"
                            options={[
                                { value: 'INCOME', label: 'Receita (Entrada)' },
                                { value: 'EXPENSE', label: 'Despesa (Saída)' },
                            ]}
                        />
                    </div>
                    <div className="input-group">
                        <label className="label" htmlFor="transaction-date">Data</label>
                        <input
                            id="transaction-date"
                            className="input nr-finance-entry-control"
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            required
                            lang="pt-BR"
                        />
                    </div>
                </div>
                <div className="input-group">
                    <label className="label" htmlFor="transaction-amount">Valor (R$)</label>
                    <input id="transaction-amount" className="input nr-finance-entry-control" inputMode="decimal" autoComplete="off" value={amount} onChange={handleAmountChange} placeholder="0,00" required />
                </div>
                <div className="input-group">
                    <span className="label">Atribuir a</span>
                    <ProductSelect
                        value={assignedProfessionalId}
                        onChange={setAssignedProfessionalId}
                        ariaLabel="Atribuir movimentação"
                        options={[
                            { value: 'general', label: 'Geral do salão', description: 'Não atribuir a uma agenda individual' },
                            ...professionals.filter((professional) => professional.active).map((professional) => ({ value: professional.id, label: professional.nickname || professional.name, description: 'Movimentação individual' })),
                        ]}
                    />
                </div>
                <div className="input-group">
                    <label className="label" htmlFor="transaction-method">Categoria ou método</label>
                    <input id="transaction-method" className="input nr-finance-entry-control" value={method} onChange={e => setMethod(e.target.value)} placeholder="Ex.: Pix, aluguel, produtos" />
                </div>
                <div className="input-group">
                    <label className="label" htmlFor="transaction-note">Descrição <span className="text-muted">(opcional)</span></label>
                    <textarea id="transaction-note" className="input nr-finance-entry-control nr-finance-entry-textarea" value={note} onChange={e => setNote(e.target.value)} placeholder="Detalhes da movimentação" rows={3} />
                </div>
            </div>
            <div className="modal-footer nr-finance-entry-dialog-footer">
                <button type="button" className="btn" data-modal-close onClick={onClose} disabled={loading}>Cancelar</button>
                <button type="submit" className="btn btnPrimary" disabled={loading}>
                    {loading ? 'Salvando…' : 'Salvar movimentação'}
                </button>
            </div>
        </form>
      </div>
    </ModalRoot>
  )
}

function ExtractModal({ isOpen, onClose, todayYmd, currentMonthYm, timeZone, professionalId }: { isOpen: boolean; onClose: () => void; todayYmd: string; currentMonthYm: string; timeZone: string; professionalId: ProfessionalScope }) {
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const loadRequest = useRef(0)
  type FinanceTransactionRow = {
    id: string
    date: string
    description: string | null
    category: string | null
    type: 'INCOME' | 'EXPENSE'
    amountCents: number
    status: string
  }
  const [transactions, setTransactions] = useState<FinanceTransactionRow[]>([])
  const [start, setStart] = useState(() => `${currentMonthYm}-01`)
  const [end, setEnd] = useState(todayYmd)
  const [type, setType] = useState('all')

  useEffect(() => {
      if (!isOpen) return
      setStart(`${currentMonthYm}-01`)
      setEnd(todayYmd)
      setLoadError('')
  }, [isOpen, currentMonthYm, todayYmd])

  useEffect(() => {
      if (isOpen) load()
  }, [isOpen, start, end, type, professionalId])

  async function load() {
      const requestId = loadRequest.current + 1
      loadRequest.current = requestId
      setLoading(true)
      setLoadError('')
      try {
          const res = await api<{ transactions: FinanceTransactionRow[] }>(
            scopedApiPath(`/api/admin/finance/extract?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}&type=${encodeURIComponent(type)}`, professionalId),
          )
          if (requestId !== loadRequest.current) return
          if (!res.ok) throw new Error(res.error.message)
          setTransactions(res.data.transactions)
      } catch (err) {
          if (requestId !== loadRequest.current) return
          setTransactions([])
          setLoadError((err as Error).message || 'Não foi possível carregar o extrato.')
      } finally {
          if (requestId === loadRequest.current) setLoading(false)
      }
  }

  function handleExport() {
      if (transactions.length === 0) return

      const csvCell = (value: unknown) => {
          let text = String(value ?? '')
          if (/^[=+\-@]/.test(text)) text = `'${text}`
          return `"${text.replace(/"/g, '""')}"`
      }

      const csvContent = [
          ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Status'],
          ...transactions.map(t => [
              new Intl.DateTimeFormat('pt-BR', { timeZone, dateStyle: 'short', timeStyle: 'short' }).format(new Date(t.date)),
              t.description || '-',
              t.category || '-',
              t.type === 'INCOME' ? 'Entrada' : 'Saída',
              (t.amountCents / 100).toFixed(2).replace('.', ','),
              t.status
          ])
      ].map(row => row.map(csvCell).join(';')).join('\n')

      const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `extrato_${start}_${end}.csv`
      link.click()
      URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <ModalRoot onClick={onClose}>
      <div className="nr-dialog nr-finance-dialog nr-finance-dialog-wide nr-finance-entry-extract-dialog" role="dialog" aria-modal="true" aria-labelledby="statement-dialog-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div><span className="nr-finance-entry-dialog-kicker">Financeiro</span><h3 id="statement-dialog-title" className="modal-title">Extrato financeiro</h3></div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar janela"><X size={20} /></button>
        </div>
        <div className="modal-body">
            <div className="nr-finance-entry-extract-filters">
                <div className="input-group">
                    <label className="label" htmlFor="statement-start">Início</label>
                    <input id="statement-start" className="input nr-finance-entry-control is-compact" type="date" value={start} onChange={e => setStart(e.target.value)} />
                </div>
                <div className="input-group">
                    <label className="label" htmlFor="statement-end">Fim</label>
                    <input id="statement-end" className="input nr-finance-entry-control is-compact" type="date" value={end} onChange={e => setEnd(e.target.value)} />
                </div>
                <div className="input-group">
                    <label className="label">Tipo</label>
                    <ProductSelect
                        value={type}
                        onChange={setType}
                        ariaLabel="Filtrar extrato por tipo"
                        size="compact"
                        options={[
                            { value: 'all', label: 'Todos' },
                            { value: 'income', label: 'Entradas' },
                            { value: 'expense', label: 'Saídas' },
                        ]}
                    />
                </div>
                <button type="button" className="btn nr-finance-entry-export-btn" onClick={handleExport} disabled={transactions.length === 0}>
                    <Download size={15} /> Exportar CSV
                </button>
            </div>

            {loadError ? (
              <div className="nr-form-error" role="alert">
                <span>{loadError}</span>
                <button type="button" className="btn" onClick={() => void load()}>Tentar novamente</button>
              </div>
            ) : null}

            <div className="table-scroll nr-finance-entry-extract-table">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Descrição</th>
                            <th>Categoria</th>
                            <th className="nr-finance-entry-align-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="nr-finance-entry-loading-cell">
                                    <div className="skeleton skeleton-text nr-finance-entry-loading-line" />
                                </td>
                            </tr>
                        ) : transactions.length === 0 ? (
                            <tr><td colSpan={4}><EmptyState compact icon={<Wallet size={24}/>} title="Nenhum registro financeiro" /></td></tr>
                        ) : transactions.map(t => (
                            <tr key={t.id}>
                                <td className="nr-finance-entry-date-cell">{new Date(t.date).toLocaleDateString('pt-BR')} <span>{new Date(t.date).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span></td>
                                <td className="nr-finance-entry-description-cell">{t.description || 'Sem descrição'}</td>
                                <td><span className="pill">{t.category || '—'}</span></td>
                                <td className={`nr-finance-entry-value-cell ${t.type === 'INCOME' ? 'is-income' : 'is-expense'}`}>
                                    {t.type === 'INCOME' ? '+' : '-'}{formatBRL(t.amountCents / 100)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </ModalRoot>
  )
}

function GoalsModal({ isOpen, onClose, onSuccess, initialRevenue, initialNewClients }: { isOpen: boolean; onClose: () => void; onSuccess: () => void; initialRevenue: number; initialNewClients: number }) {
    const [loading, setLoading] = useState(false)
    const [revenue, setRevenue] = useState(String(initialRevenue / 100))
    const [newClients, setNewClients] = useState(String(initialNewClients))

    useEffect(() => {
        if (!isOpen) return
        setRevenue(String(initialRevenue / 100))
        setNewClients(String(initialNewClients))
    }, [isOpen, initialRevenue, initialNewClients])

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setLoading(true)
        try {
            const revenueGoalCents = Math.round(Number(revenue.replace(',', '.')) * 100)
            const newClientsGoal = Number(newClients)
            if (!Number.isFinite(revenueGoalCents) || revenueGoalCents < 0 || !Number.isInteger(newClientsGoal) || newClientsGoal < 0) {
                throw new Error('Informe metas válidas e não negativas.')
            }
            const res = await api('/api/admin/finance/goals', {
                method: 'PATCH',
                body: JSON.stringify({ revenueGoalCents, newClientsGoal })
            })
            if (!res.ok) throw new Error(res.error?.message || 'Não foi possível salvar as metas.')
            onSuccess()
            onClose()
        } catch (err) {
            console.error(err)
            notify((err as Error).message || 'Erro ao salvar metas', 'error')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <ModalRoot onClick={loading ? undefined : onClose}>
            <div className="nr-dialog nr-finance-dialog nr-finance-goals-dialog" role="dialog" aria-modal="true" aria-labelledby="goals-dialog-title" onClick={(event) => event.stopPropagation()}>
                <div className="modal-header">
                    <h3 id="goals-dialog-title" className="modal-title">Metas do mês</h3>
                    <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar janela" disabled={loading}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-stack">
                        <div className="input-group">
                            <label className="label" htmlFor="goal-revenue">Meta de faturamento (R$)</label>
                            <input id="goal-revenue" className="input" inputMode="decimal" autoComplete="off" value={revenue} onChange={e => setRevenue(e.target.value)} required />
                        </div>
                        <div className="input-group">
                            <label className="label" htmlFor="goal-clients">Meta de novos clientes</label>
                            <input id="goal-clients" className="input" type="number" inputMode="numeric" min="0" step="1" value={newClients} onChange={e => setNewClients(e.target.value)} required />
                        </div>
                    </div>
                    <div className="modal-footer nr-finance-goals-footer">
                        <button type="button" className="btn" data-modal-close onClick={onClose} disabled={loading}>Cancelar</button>
                        <button type="submit" className="btn btnPrimary" disabled={loading}>
                            {loading ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </ModalRoot>
    )
}

export default function App() {
  const location = useLocation()
  const host = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : ''
  const configuredDevHost = String(import.meta.env.VITE_DEV_HOST ?? '').trim().toLowerCase()
  const configuredRootHost = configuredPlatformBaseUrl()?.hostname.toLowerCase() ?? ''
  const isLocalDevelopment = import.meta.env.DEV && (host === 'localhost' || host === '127.0.0.1' || host === '::1')
  const isDevHost = isLocalDevelopment || Boolean(configuredDevHost && host === configuredDevHost)
  const isPlatformRootHost = Boolean(configuredRootHost && host.replace(/^www\./, '') === configuredRootHost.replace(/^www\./, ''))
  const [hostTenant, setHostTenant] = useState<TenantPublic | null | undefined>(() => (isDevHost || isPlatformRootHost ? null : undefined))

  useEffect(() => {
    if (typeof document === 'undefined') return
    const isPublicBooking = Boolean(hostTenant) && location.pathname === '/agendar'
    const isMarketingLanding = !isDevHost && hostTenant === null && location.pathname === '/'
    const titleByPath = isDevHost
      ? 'NaRégua — Console DEV'
      : isMarketingLanding
        ? 'NaRégua — Gestão para barbearias que querem crescer'
        : location.pathname.startsWith('/admin')
          ? `${hostTenant?.name ?? 'NaRégua'} — Painel`
          : location.pathname.startsWith('/cliente')
            ? `${hostTenant?.name ?? 'NaRégua'} — Minha área`
            : location.pathname.startsWith('/profissional')
              ? `${hostTenant?.name ?? 'NaRégua'} — Minha agenda`
              : location.pathname === '/convite/equipe'
                ? `${hostTenant?.name ?? 'NaRégua'} — Convite para a equipe`
                : location.pathname === '/agendar'
              ? `Agende seu horário — ${hostTenant?.name ?? 'NaRégua'}`
              : `${hostTenant?.name ?? 'NaRégua'} — Acesso`
    document.title = titleByPath

    const marketingDescription = 'Agenda online, clientes, caixa, WhatsApp e marca própria para barbearias que querem crescer com método.'
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!description) {
      description = document.createElement('meta')
      description.name = 'description'
      document.head.appendChild(description)
    }
    description.content = isMarketingLanding
      ? marketingDescription
      : isPublicBooking
        ? `Agende seu atendimento com ${hostTenant?.name ?? 'NaRégua'}.`
        : 'Área segura do NaRégua.'

    for (const [property, content] of [
      ['og:title', titleByPath],
      ['og:description', isMarketingLanding ? marketingDescription : description.content],
      ['og:image', '/og-cover.jpg'],
    ] as const) {
      let meta = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('property', property)
        document.head.appendChild(meta)
      }
      meta.content = content
    }

    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (!robots) {
      robots = document.createElement('meta')
      robots.name = 'robots'
      document.head.appendChild(robots)
    }
    robots.content = isPublicBooking || isMarketingLanding ? 'index,follow' : 'noindex,nofollow'

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (isPublicBooking || isMarketingLanding) {
      if (!canonical) {
        canonical = document.createElement('link')
        canonical.rel = 'canonical'
        document.head.appendChild(canonical)
      }
      canonical.href = isPublicBooking
        ? `${(hostTenant?.publicBaseUrl || window.location.origin).replace(/\/$/, '')}/agendar`
        : window.location.origin
    } else {
      canonical?.remove()
    }
  }, [hostTenant, isDevHost, location.pathname])

  useEffect(() => {
    if (isDevHost || isPlatformRootHost) return
    let mounted = true
    api<{ tenant: TenantPublic }>('/api/public/tenant').then((res) => {
      if (!mounted) return
      if (!res.ok) {
        setHostTenant(null)
        return
      }
      setHostTenant(res.data.tenant)
    })
    return () => {
      mounted = false
    }
  }, [isDevHost, isPlatformRootHost])

  if (isDevHost) {
    return (
      <Routes>
        <Route path="/" element={<RootEntry loginElement={<UnifiedLogin isDevHost />} renderWhenAuthenticated={() => <Dev />} />} />
        <Route path="/dev" element={<Dev />} />
        <Route path="/login" element={<UnifiedLogin isDevHost />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/termos" element={<LegalPage kind="terms" />} />
        <Route path="/privacidade" element={<LegalPage kind="privacy" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  if (hostTenant === undefined) {
    return (
      <div className="nr-route-state" aria-label="Carregando espaço">
        <div className="nr-route-state-loading skeleton skeleton-card" />
      </div>
    )
  }

  if (hostTenant === null) {
      const host = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : ''
      const configuredRootHost = configuredPlatformBaseUrl()?.hostname.toLowerCase().replace(/^www\./, '')
      const normalizedHost = host.replace(/^www\./, '')
      const isPlatformRoot = Boolean(configuredRootHost && normalizedHost === configuredRootHost)
      const isSubdomain = !isPlatformRoot
          && host.split('.').length > (host.includes('localhost') ? 1 : 2)
          && !host.startsWith('www.')
          && !host.startsWith('dev.')

      if (isSubdomain) {
          return (
              <main className="nr-route-state">
                <section className="nr-route-state-card">
                  <span className="nr-route-state-mark" aria-hidden="true"><Globe size={24} /></span>
                  <p className="nr-route-state-kicker">Endereço indisponível</p>
                  <h1>Espaço não encontrado</h1>
                  <p>Não encontramos um espaço cadastrado em <strong>{host}</strong>.</p>
                  <button type="button" className="btn btnPrimary" onClick={() => {
                      const platformUrl = configuredPlatformBaseUrl()
                      window.location.assign(platformUrl?.toString() ?? '/')
                  }}>Ir para o NaRégua</button>
                </section>
              </main>
          )
      }
  }

  return (
    <Routes>
      <Route
        path="/"
        element={hostTenant
          ? <RootEntry hostTenant={hostTenant} loginElement={<UnifiedLogin hostTenant={hostTenant} />} />
          : <LandingPage />}
      />
      <Route path="/login" element={hostTenant ? <UnifiedLogin hostTenant={hostTenant} /> : <WorkspaceAccessPage />} />
      <Route path="/termos" element={<LegalPage kind="terms" />} />
      <Route path="/privacidade" element={<LegalPage kind="privacy" />} />

      {hostTenant ? (
        <>
          <Route path="/agendar" element={<BookingPage tenant={hostTenant} tenantSlug={hostTenant.slug} basePath="" />} />
          <Route path="/convite/equipe" element={<TeamInvitePage tenant={hostTenant} />} />
          <Route path="/admin/*" element={<Admin tenant={hostTenant} tenantSlug={hostTenant.slug} basePath="" />} />
          <Route path="/profissional/*" element={<ProfessionalPortal tenant={hostTenant} />} />
          <Route path="/cliente" element={<ClientPortal tenant={hostTenant} tenantSlug={hostTenant.slug} basePath="" />} />
          <Route path="/cliente/entrar" element={<Navigate to="/" replace />} />
          <Route path="/cliente/cadastro" element={<Navigate to="/" replace />} />
        </>
      ) : (
        <Route path="/:tenantSlug/*" element={<SlugToSubdomainRedirect />} />
      )}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
